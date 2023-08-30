#%%
from __future__ import annotations

import math
from typing import Any, Callable

import botorch.acquisition.analytic
import botorch.models.model
import botorch.optim
import botorch.posteriors.gpytorch
import gpytorch.kernels
import gpytorch.constraints
from gpytorch.likelihoods.gaussian_likelihood import Prior
import numpy as np
import optuna
import optuna._transform
import pyro.infer.mcmc
import torch

from .._system_attrs import get_preferences

def _orthants_MVN_Gibbs_sampling(
    cov_inv: torch.Tensor,
    cycles: int,
    initial_sample: torch.Tensor,
) -> torch.Tensor:
    dim = cov_inv.shape[0]
    assert cov_inv.shape == (dim, dim)

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
                    lower=-conditional_mean / conditional_std[j]
                )
                * conditional_std[j]
                + conditional_mean
            )
        out[i + 1, :] = sample_chain

    return out

def _one_side_trunc_norm_sampling(lower: torch.Tensor) -> torch.Tensor:
    if lower > 4.0:
        r = torch.max(torch.tensor(1e-300), torch.rand(torch.Size(()), dtype=torch.float64))
        return (lower * lower - 2 * r.log()).sqrt()
    else:
        SQRT2 = math.sqrt(2)
        r = torch.rand(torch.Size(()), dtype=torch.float64) * torch.erfc(lower / SQRT2)
        while 1 - r == 1:
            r = torch.rand(torch.Size(()), dtype=torch.float64) * torch.erfc(lower / SQRT2)
        return torch.erfinv(1 - r) * SQRT2


_orthants_MVN_Gibbs_sampling_jit = torch.jit.script(_orthants_MVN_Gibbs_sampling)
    
def _compute_cov_diff_diff_inv_and_logdet(
    preferences: torch.Tensor,
    cov_x_x: torch.Tensor,
    obs_noise_var: torch.Tensor,
) -> tuple[torch.Tensor, torch.Tensor]:
    N = cov_x_x.shape[0]
    M = preferences.shape[0]

    # (sI + A K A^T)^-1 = s^-1 I - s^-2 A(K^-1 + s^-1 A^T A)^-1 A^T
    # (K^-1 + s^-1 A^T A)^-1 = K (I + s^-1 A^T A K)^-1  (To avoid computing K^-1)

    # det(sI + A K A^T) = s^N det(I + s^-1 A K A^T) = s^N det(I + s^-1 A^T A K)

    I_plus_sinv_AT_A_K = torch.eye(N, dtype=torch.float64)
    A_K = cov_x_x[preferences[:, 0], :] - cov_x_x[preferences[:, 1], :]
    I_plus_sinv_AT_A_K.index_add_(0, preferences[:, 0], A_K * (1 / obs_noise_var))
    I_plus_sinv_AT_A_K.index_add_(0, preferences[:, 1], A_K * (-1 / obs_noise_var))
    lu, piv = torch.linalg.lu_factor(I_plus_sinv_AT_A_K)

    logdet = -(lu.diagonal().abs() * obs_noise_var).log().sum()

    schur_inv: torch.Tensor = torch.linalg.lu_solve(lu, piv, cov_x_x, left=False)
    cov_diff_diff_inv = schur_inv[:, preferences[:, 0]] - schur_inv[:, preferences[:, 1]]
    cov_diff_diff_inv = (
        cov_diff_diff_inv[preferences[:, 0], :] - cov_diff_diff_inv[preferences[:, 1], :]
    )
    cov_diff_diff_inv *= -1 / obs_noise_var ** 2
    idx_M = torch.arange(M)
    cov_diff_diff_inv[idx_M, idx_M] += 1.0 / obs_noise_var

    return cov_diff_diff_inv, logdet

class _SampledGP(botorch.models.model.Model):
    def __init__(
        self,
        kernel_func: Callable[[torch.Tensor, torch.Tensor], torch.Tensor],
        x: torch.Tensor,
        preferences: torch.Tensor,
        obs_noise_var: torch.Tensor,
        diff: torch.Tensor,
    ) -> None:
        super().__init__()
        self.kernel_func = kernel_func
        self.x = x
        self.preferences = preferences
        self.diff = diff
        self.obs_noise_var = obs_noise_var
        self._cov_diff_diff_inv, _ = _compute_cov_diff_diff_inv_and_logdet(
            preferences=preferences,
            cov_x_x=self.kernel_func(x, x),
            obs_noise_var=float(obs_noise_var),
        )

    def posterior(
        self,
        X: torch.Tensor,
        output_indices: list[int] | None = None,
        observation_noise: bool = False,
        posterior_transform: Any | None = None,
        **kwargs: Any,
    ) -> botorch.posteriors.gpytorch.GPyTorchPosterior:
        assert posterior_transform is None
        assert output_indices is None
        assert self.x.shape[-1] == X.shape[-1]

        x_expanded = self.x.expand(X.shape[:-2] + (self.x.shape[-2], X.shape[-1]))

        cov_X_x = self.kernel_func(X, x_expanded)
        cov_X_diff = cov_X_x[..., self.preferences[:, 0]] - cov_X_x[..., self.preferences[:, 1]]

        mean = cov_X_diff @ (self._cov_diff_diff_inv @ self.diff)
        cov = self.kernel_func(X, X) - cov_X_diff @ self._cov_diff_diff_inv @ cov_X_diff.transpose(-1, -2)
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
    def _kernel_func(self, x1: torch.Tensor, x2: torch.Tensor, lengthscale: torch.Tensor, nu: float) -> torch.Tensor:    
        x1_ = x1.div(lengthscale)
        x2_ = x2.div(lengthscale)
        distance = torch.cdist(x1_, x2_)
        exp_component = torch.exp(-math.sqrt(nu * 2) * distance)

        if nu == 0.5:
            constant_component = 1
        elif nu == 1.5:
            constant_component = (math.sqrt(3) * distance).add(1)
        elif nu == 2.5:
            constant_component = (math.sqrt(5) * distance).add(1).add(5.0 / 3.0 * distance**2)
        else:
            raise NotImplementedError(f"nu should be 0.5, 1.5 or 2.5")
        return constant_component * exp_component

    def _potential_func(
        self,
        x: torch.Tensor,
        preferences: torch.Tensor,
        diff: torch.Tensor,
        log_lengthscale: torch.Tensor,
        log_noise: torch.Tensor,
    ) -> torch.Tensor:
        lengthscale = torch.exp(log_lengthscale)
        noise = torch.exp(log_noise) + self.minimum_noise

        log_transform_jacobian = torch.sum(log_lengthscale) + log_noise
        log_prior = torch.sum(self.lengthscale_prior.log_prob(lengthscale)) + self.noise_prior.log_prob(noise)
        cov_x_x = self._kernel_func(x, x, lengthscale, 2.5)
        cov_inv, cov_inv_logdet = _compute_cov_diff_diff_inv_and_logdet(
            preferences=preferences,
            cov_x_x=cov_x_x,
            obs_noise_var=noise,
        )

        log_likelihood = -0.5 * diff @ cov_inv @ diff + 0.5 * cov_inv_logdet

        return -(log_prior + log_transform_jacobian + log_likelihood)

    def __init__(
        self,
        lengthscale_prior: Prior,
        noise_prior: Prior,
        minimum_lengthscale: float,
        minimum_noise: float,
        dims: int,
    ) -> None:
        self.lengthscale_prior: Prior = lengthscale_prior.expand((dims,))
        self.noise_prior = noise_prior
        self.minimum_lengthscale = minimum_lengthscale
        self.minimum_noise = minimum_noise
        self.dims = dims

        self._x = torch.empty((0, dims), dtype=torch.float64, requires_grad=False)
        self._preferences = torch.empty((0, 2), dtype=torch.int32, requires_grad=False)
        self._diff = torch.empty((0,), dtype=torch.float64, requires_grad=False)

        initial_raw_params = {
            "log_lengthscale": torch.log(self.lengthscale_prior.sample()),
            "log_noise": torch.log(self.noise_prior.sample()),
        }

        self._potential_func_jit = torch.jit.trace(
            self._potential_func, (self._x, self._preferences, self._diff, initial_raw_params["log_lengthscale"], initial_raw_params["log_noise"]),
            check_trace=False,
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
            ), 
            adapt_step_size=True,
            adapt_mass_matrix=False,
            target_accept_prob=0.5,
            step_size=0.1,
        )

        self._nuts.initial_params = initial_raw_params
        self._nuts.setup(warmup_steps=1e15)  # Use default step size
        self._last_params = initial_raw_params


    def sample_gp(self, x: torch.Tensor, preferences: torch.Tensor, cycles: int) -> _SampledGP:
        if len(preferences) == 0:
            lengthscale = self.lengthscale_prior.sample() + self.minimum_lengthscale
            noise = self.noise_prior.sample() + self.minimum_noise
            return _SampledGP(
                kernel_func=lambda x1, x2: self._kernel_func(x1, x2, lengthscale, 2.5),
                x=x,
                preferences=preferences,
                obs_noise_var=noise,
                diff=torch.empty((0,), dtype=torch.float64),
            )
        else:
            self._x = x
            self._preferences = preferences

            original_diff_size = len(self._diff)
            self._diff.resize_(len(preferences))
            self._diff[original_diff_size:] = 0.0

            self._x.requires_grad_(False)
            self._preferences.requires_grad_(False)
            self._diff.requires_grad_(False)

            for _ in range(cycles):
                with torch.no_grad():
                    cov_diff_diff_inv, _ = _compute_cov_diff_diff_inv_and_logdet(
                        preferences=preferences,
                        cov_x_x=self._kernel_func(x, x, torch.exp(self._last_params["log_lengthscale"]) + self.minimum_lengthscale, nu=2.5),
                        obs_noise_var=torch.exp(self._last_params["log_noise"]) + self.minimum_noise,
                    )

                    self._diff = _orthants_MVN_Gibbs_sampling_jit(
                        cov_inv=cov_diff_diff_inv, initial_sample=self._diff, cycles=10, 
                    )[-1]
                self._nuts.clear_cache()
                self._last_params = self._nuts.sample(self._last_params)
            lengthscale = torch.exp(self._last_params["log_lengthscale"]) + self.minimum_lengthscale
            noise = torch.exp(self._last_params["log_noise"]) + self.minimum_noise
            return _SampledGP(
                kernel_func=lambda x1, x2: self._kernel_func(x1, x2, lengthscale, 2.5),
                x=x,
                preferences=preferences,
                obs_noise_var=noise,
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
        self.lengthscale_prior = lengthscale_prior or gpytorch.priors.GammaPrior(5.0, 10.0)
        self.noise_prior = noise_prior or gpytorch.priors.GammaPrior(5.0, 50.0)
        
        self._rng = np.random.RandomState(seed)
        self.independent_sampler = independent_sampler or optuna.samplers.RandomSampler(
            seed=self._rng.randint(2**32)
        )

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
            np.array([trans.transform(trials[t].params) for t in trials_with_preference]),
            dtype=torch.float64,
        )
        pref_ids = torch.tensor([[ids[b], ids[w]] for b, w in preferences], dtype=torch.int32)
        with torch.random.fork_rng():
            torch.manual_seed(self._rng.randint(2**32))
            pyro.set_rng_seed(self._rng.randint(2**32))

            self._gp = self._gp or _PreferentialGP(
                lengthscale_prior=self.lengthscale_prior,
                minimum_lengthscale=0.1,
                noise_prior=self.noise_prior,
                minimum_noise=1e-6, # To avoid NaN
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
