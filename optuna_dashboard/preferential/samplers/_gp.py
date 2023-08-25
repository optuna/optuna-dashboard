from __future__ import annotations

from math import erfc
from math import sqrt
from typing import Any

import botorch.acquisition.analytic
import botorch.models.model
import botorch.optim
import botorch.posteriors.gpytorch
import gpytorch.kernels
from gpytorch.likelihoods.gaussian_likelihood import Prior
import numpy as np
import optuna
import optuna._transform
import pyro.infer.mcmc
from scipy.special import erfcinv
import torch

from .._system_attrs import get_preferences


def _orthants_MVN_Gibbs_sampling(
    cov_inv: torch.Tensor,
    cycles: int,
    initial_sample: torch.Tensor,
) -> torch.Tensor:
    dim = cov_inv.shape[0]
    assert cov_inv.shape == (dim, dim)
    with torch.no_grad():
        sample_chain = initial_sample
        conditional_std = 1 / torch.sqrt(torch.diag(cov_inv))
        scaled_cov_inv = cov_inv / torch.diag(cov_inv)[:, None]

        out = torch.empty((cycles + 1, dim), dtype=torch.float64)
        out[0, :] = sample_chain

        for i in range(cycles):
            for j in range(dim):
                conditional_mean = sample_chain[j] - scaled_cov_inv[j] @ sample_chain
                sample_chain[j] = (
                    _one_side_trunc_norm_sampling(
                        lower=float(-conditional_mean / conditional_std[j])
                    )
                    * conditional_std[j]
                    + conditional_mean
                )
            out[i + 1, :] = sample_chain

        return out


_SQRT2 = sqrt(2)


def _one_side_trunc_norm_sampling(lower: float) -> float:
    return erfcinv(torch.rand() * erfc(lower / _SQRT2)) * _SQRT2


def _compute_cov_diff_diff_inv(
    preferences: torch.Tensor,
    cov_x_x: torch.Tensor,
    obs_noise_var: float,
) -> torch.Tensor:
    N = cov_x_x.shape[0]
    M = preferences.shape[0]

    # (sI + A K A^T)^-1 = s^-1 I - s^-2 A(K^-1 + s^-1 A^T A)^-1 A^T
    # (K^-1 + s^-1 A^T A)^-1 = K (I + s^-1 A^T A K)^-1  (To avoid computing K^-1)

    I_plus_sinv_AT_A_K = torch.eye(N)
    A_K = cov_x_x[preferences[:, 0], :] - cov_x_x[preferences[:, 1], :]
    I_plus_sinv_AT_A_K.index_add_(0, preferences[:, 0], A_K, alpha=1 / obs_noise_var)
    I_plus_sinv_AT_A_K.index_add_(0, preferences[:, 1], A_K, alpha=-1 / obs_noise_var)
    schur_inv: torch.Tensor = torch.linalg.solve(I_plus_sinv_AT_A_K, cov_x_x, left=False)
    cov_diff_diff_inv = schur_inv[:, preferences[:, 0]] - schur_inv[:, preferences[:, 1]]
    cov_diff_diff_inv = (
        cov_diff_diff_inv[preferences[:, 0], :] - cov_diff_diff_inv[preferences[:, 1], :]
    )
    cov_diff_diff_inv *= -1 / (2 * obs_noise_var) ** 2
    idx_M = torch.arange(M)
    cov_diff_diff_inv[idx_M, idx_M] += 1.0 / (2 * obs_noise_var)

    return cov_diff_diff_inv


def _multinormal_logpdf(Sigma_inv: torch.Tensor, x: torch.Tensor):
    return (
        -0.5 * x @ Sigma_inv @ x
        + 0.5 * torch.logdet(Sigma_inv)
        - 0.5 * x.shape[0] * math.log(2 * math.pi)
    )


class _SampledGP(botorch.models.model.Model):
    def __init__(
        self,
        kernel: gpytorch.kernels.Kernel,
        x: torch.Tensor,
        preferences: torch.Tensor,
        obs_noise_var: torch.Tensor,
        diff: torch.Tensor,
    ) -> None:
        self.kernel = kernel
        self.x = x
        self.preferences = preferences
        self.diff = diff
        self.obs_noise_var = obs_noise_var
        self._cov_diff_diff_inv = _compute_cov_diff_diff_inv(
            preferences=preferences,
            cov_x_x=self.kernel(x).to_dense(),
            obs_noise_var=float(obs_noise_var),
        )

    def posterior(
        self,
        x2: torch.Tensor,
        output_indices: list[int] | None = None,
        observation_noise: bool = False,
        posterior_transform: Any | None = None,
        **kwargs: Any,
    ) -> botorch.posteriors.gpytorch.GPyTorchPosterior:
        assert posterior_transform is None
        assert output_indices is None
        assert self.x.shape[-1] == x2.shape[-1]

        x_expanded = self.x.expand(x2.shape[:-2] + (self.x.shape[-2], x2.shape[-1]))

        cov_x2_x: torch.Tensor = self.kernel(x2, x_expanded).to_dense()
        cov_x2_diff: torch.Tensor = (
            cov_x2_x[..., self.preferences[:, 0]] - cov_x2_x[..., self.preferences[:, 1]]
        )

        mean: torch.Tensor = cov_x2_diff @ (self._cov_diff_diff_inv @ self.diff)
        cov: torch.Tensor = self.kernel(
            x2
        ).to_dense() - cov_x2_diff @ self._cov_diff_diff_inv @ cov_x2_diff.transpose(-1, -2)
        if observation_noise:
            idx = torch.arange(cov.shape[-1])
            cov[..., idx, idx] += self.obs_noise_var

        return botorch.posteriors.gpytorch.GPyTorchPosterior(
            distribution=gpytorch.distributions.MultivariateNormal(
                mean=mean,
                covariance_matrix=cov,
            )
        )

    @property
    def batch_shape(self) -> torch.Size:
        return torch.Size()

    @property
    def num_outputs(self) -> int:
        return 1


class _PreferentialGP:
    def _kernel_factory(self, lengthscale: torch.Tensor) -> gpytorch.kernels.Kernel:
        kernel = gpytorch.kernels.MaternKernel(
            nu=2.5,
            ard_num_dims=lengthscale.shape[0],
        )
        kernel.lengthscale = lengthscale
        return kernel

    def _potential_func(
        self,
        x: torch.Tensor,
        preferences: torch.Tensor,
        diff: torch.Tensor,
        log_lengthscale: torch.Tensor,
        log_noise: torch.Tensor,
    ) -> torch.Tensor:
        lengthscale = torch.exp(log_lengthscale)
        noise = torch.exp(log_noise)
        log_transform_jacobian = torch.sum(log_lengthscale) + log_noise
        log_prior = self.lengthscale_prior.log_prob(lengthscale) + self.noise_prior.log_prob(noise)
        cov_inv = _compute_cov_diff_diff_inv(
            preferences=preferences,
            cov_x_x=self._kernel_factory(lengthscale)(x).to_dense(),
            obs_noise_var=noise,
        )
        log_likelihood = _multinormal_logpdf(cov_inv, diff)
        return log_prior + log_likelihood + log_transform_jacobian

    def __init__(
        self,
        lengthscale_prior: Prior,
        noise_prior: Prior,
        dims: int,
    ) -> None:
        self.lengthscale_prior: Prior = lengthscale_prior.expand((dims,))
        self.noise_prior = noise_prior
        self.dims = dims

        self._x = torch.empty((0, dims), dtype=torch.float64)
        self._preferences = torch.empty((0, 2), dtype=torch.float64)
        self._diff = torch.empty((0,), dtype=torch.float64)

        initial_raw_params = {
            "log_lengthscale": torch.log(self.lengthscale_prior.sample()),
            "log_noise": torch.log(self.noise_prior.sample()),
        }

        self._potential_func_jit = torch.jit.trace(
            self._potential_func,
            (
                self._x,
                self._preferences,
                self._diff,
                initial_raw_params["log_lengthscale"],
                initial_raw_params["log_noise"],
            ),
        )

        # HMC-Gibbs workarounds
        # https://github.com/pyro-ppl/pyro/issues/1926

        self._nuts = pyro.infer.mcmc.NUTS(
            potential_fn=lambda z: self._potential_func_jit(
                x=self._x,
                preferences=self._preferences,
                diff=self._diff,
                log_lengthscale=z["log_lengthscale"],
                log_noise=z["log_noise"],
            )
        )

        self._nuts.initial_params = initial_raw_params
        self._nuts.setup(warmup_steps=1e15)  # Infinite warmup
        self._last_params = initial_raw_params

    def sample_gp(self, x: torch.Tensor, preferences: torch.Tensor, cycles: int) -> _SampledGP:
        if len(preferences) == 0:
            return _SampledGP(
                kernel=self._kernel_factory(self.lengthscale_prior.sample()),
                x=x,
                preferences=preferences,
                obs_noise_var=self.noise_prior.sample(),
                diff=torch.empty((0,), dtype=torch.float64),
            )
        else:
            original_diff_size = len(self._diff)
            self._diff.resize_(len(preferences))
            self._diff[original_diff_size:] = 0.0

            for _ in range(cycles):
                kernel = self._kernel_factory(torch.exp(self._last_params["log_lengthscale"]))
                cov_diff_diff_inv = _compute_cov_diff_diff_inv(
                    preferences=preferences,
                    cov_x_x=kernel(x).to_dense(),
                    obs_noise_var=float(torch.exp(self._last_params["log_noise"])),
                )
                self._diff = _orthants_MVN_Gibbs_sampling(
                    cov_inv=cov_diff_diff_inv, cycles=10, initial_sample=self._diff
                )[:-1]

                self._nuts.clear_cache()
                self._last_raw_params = self._nuts.sample(self._last_raw_params)

            return _SampledGP(
                kernel=self._kernel_factory(torch.exp(self._last_params["log_lengthscale"])),
                x=x,
                preferences=preferences,
                obs_noise_var=torch.exp(self._last_params["log_noise"]),
                diff=self._diff,
            )


class PreferentialGPSampler(optuna.samplers.BaseSampler):
    def __init__(
        self,
        *,
        lengthscale_prior: Prior | None = None,
        noise_prior: Prior | None = None,
        independent_sampler: optuna.samplers.BaseSampler | None = None,
        seed: int | None = None,
    ) -> None:
        self.lengthscale_prior = lengthscale_prior or gpytorch.priors.GammaPrior(3.0, 6.0)
        self.noise_prior = noise_prior or gpytorch.priors.GammaPrior(1.1, 10.0)
        self.independent_sampler = independent_sampler or optuna.samplers.RandomSampler(
            seed=self._rng.randint(2**32)
        )

        self._rng = np.random.RandomState(seed)
        self._search_space = optuna.search_space.IntersectionSearchSpace()
        self._gp: _PreferentialGP | None = None

    def reseed_rng(self) -> None:
        self.independent_sampler.reseed_rng()
        self._rng = np.random.RandomState()

    def infer_relative_search_space(
        self, study: optuna.Study, trial: optuna.trial.FrozenTrial
    ) -> dict[str, optuna.distributions.BaseDistribution]:
        return self._search_space.calculate(study)

    def sample_relative(
        self,
        study: optuna.Study,
        trial: optuna.trial.FrozenTrial,
        search_space: dict[str, optuna.distributions.BaseDistribution],
    ) -> dict[str, Any]:
        preferences = get_preferences(study._study_id, study._storage)
        if len(preferences) == 0:
            return {}

        trials = study.get_trials(deepcopy=False)
        trials_with_preference = list({t for (b, w) in preferences for t in (b, w)})
        ids = {t: i for i, t in enumerate(trials_with_preference)}

        trans = optuna._transform._SearchSpaceTransform(
            search_space, transform_log=True, transform_step=True, transform_0_1=True
        )
        params = torch.tensor(
            [trans.transform(trials[t].params) for t in trials_with_preference],
            dtype=torch.float64,
        )
        pref_ids = torch.tensor([[ids[b], ids[w]] for b, w in preferences], dtype=torch.int32)

        with torch.random.fork_rng():
            torch.manual_seed(self._rng.randint(2**32))
            pyro.set_rng_seed(self._rng.randint(2**32))

            self._gp = self._gp or _PreferentialGP(
                lengthscale_prior=self.lengthscale_prior,
                noise_prior=self.noise_prior,
                dims=len(trans.bounds),
            )
            if self._gp.dims != len(trans.bounds):
                raise NotImplementedError(
                    "The search space has changed. "
                    "Dynamic search space is not supported in PreferentialGPSampler."
                )

            sampled_gp = self._gp.sample_gp(params, pref_ids, cycles=10)
            acqf = botorch.acquisition.analytic.LogExpectedImprovement(
                model=sampled_gp,
                best_f=torch.max(sampled_gp.posterior(params[:, None, :]).mean),
            )

            # TODO: Make it possible to apply it on categorical variables
            candidates, _ = botorch.optim.optimize_acqf(
                acq_function=acqf,
                bounds=torch.from_numpy(trans.bounds.T),
                q=1,
                num_restarts=10,
                raw_samples=512,
                options={"batch_limit": 5, "maxiter": 200},
                sequential=True,
            )
            next_x = trans.untransform(candidates[0].detach().numpy())
            return next_x

    def sample_independent(
        self,
        study: optuna.Study,
        trial: optuna.trial.FrozenTrial,
        param_name: str,
        param_distribution: optuna.distributions.BaseDistribution,
    ) -> Any:
        return self.independent_sampler.sample_independent(
            study, trial, param_name, param_distribution
        )
