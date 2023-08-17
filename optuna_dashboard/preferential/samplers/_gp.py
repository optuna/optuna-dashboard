from __future__ import annotations

import math
from math import erfc
from typing import Any

from botorch.acquisition.analytic import LogExpectedImprovement
from botorch.models.gpytorch import GPyTorchModel
from botorch.optim import optimize_acqf
import gpytorch.constraints
import gpytorch.kernels
import gpytorch.likelihoods.gaussian_likelihood
from gpytorch.likelihoods.gaussian_likelihood import GaussianLikelihood
from gpytorch.likelihoods.gaussian_likelihood import Interval
from gpytorch.likelihoods.gaussian_likelihood import Prior
from gpytorch.models.exact_gp import ExactGP
import gpytorch.module
from linear_operator.operators import DiagLinearOperator
from linear_operator.operators import LinearOperator
import numpy as np
import optuna
from optuna import distributions
from optuna import Study
from optuna._transform import _SearchSpaceTransform
from optuna.distributions import BaseDistribution
from optuna.search_space import IntersectionSearchSpace
from optuna.trial import FrozenTrial
import pyro
import pyro.infer.autoguide
import pyro.infer.mcmc
from scipy.special import erfcinv
import torch
from torch import Tensor

from .._system_attrs import get_preferences


class _WeightedGaussianLikelihood(GaussianLikelihood):
    def __init__(
        self,
        weights: torch.Tensor | None = None,
        noise_prior: Prior | None = None,
        noise_constraint: Interval | None = None,
        batch_shape: torch.Size = torch.Size(),
        **kwargs: Any,
    ) -> None:
        super().__init__(
            noise_prior=noise_prior,
            noise_constraint=noise_constraint,
            batch_shape=batch_shape,
            **kwargs,
        )
        self.weights = weights

    def _shaped_noise_covar(
        self, base_shape: torch.Size, *params: Any, **kwargs: Any
    ) -> Tensor | LinearOperator:
        assert self.weights is not None
        assert base_shape[-1] == self.weights.shape[-1]
        return DiagLinearOperator(1.0 / self.weights) * super()._shaped_noise_covar(
            base_shape, *params, **kwargs
        )


def _sample_y(
    preferences: np.ndarray,
    cov_X_X: np.ndarray,
    obs_noise_var: float,
    cycles: int,
    initial_sample: np.ndarray,
    rng: np.random.RandomState
) -> np.ndarray:
    # TODO: Refactor and write tests for this function.

    N = cov_X_X.shape[0]
    M = len(preferences)
    cov_X_X = cov_X_X + np.eye(N) * 1e-6  # Add jitter
    cov_X_X_chol = np.linalg.cholesky(cov_X_X)
    cov_X_X_inv = np.linalg.inv(cov_X_X)

    # (sI + A K A^T)^-1 = s^-1 I - s^-2 A(K^-1 + s^-1 A^T A)^-1 A^T

    schur = cov_X_X_inv.copy()
    np.add.at(schur, (preferences[:, 0], preferences[:, 0]), 1.0 / (2 * obs_noise_var))
    np.add.at(schur, (preferences[:, 1], preferences[:, 1]), 1.0 / (2 * obs_noise_var))
    np.add.at(schur, (preferences[:, 0], preferences[:, 1]), -1.0 / (2 * obs_noise_var))
    np.add.at(schur, (preferences[:, 1], preferences[:, 0]), -1.0 / (2 * obs_noise_var))
    idx_M = np.arange(M)

    schur_inv = np.linalg.inv(schur)

    cov_diff_inv = schur_inv[:, preferences[:, 0]] - schur_inv[:, preferences[:, 1]]
    cov_diff_inv = cov_diff_inv[preferences[:, 0], :] - cov_diff_inv[preferences[:, 1], :]
    cov_diff_inv *= -1 / (2 * obs_noise_var) ** 2
    cov_diff_inv[idx_M, idx_M] += 1.0 / (2 * obs_noise_var)

    diffs = _orthants_MVN_Gibbs_sampling(
        cov_diff_inv,
        cycles=cycles,
        initial_sample=initial_sample[:, 0] - initial_sample[:, 1],
        rng=rng,
    )[-1]

    random_ys = (cov_X_X_chol @ rng.randn(N))[preferences] + np.sqrt(
        obs_noise_var
    ) * rng.randn(M, 2)
    errors = diffs - (random_ys[:, 0] - random_ys[:, 1])
    cov_diff_inv_errors = cov_diff_inv @ errors

    AT_cov_diff_inv_errors = np.zeros((N,))
    np.add.at(AT_cov_diff_inv_errors, preferences[:, 0], cov_diff_inv_errors)
    np.add.at(AT_cov_diff_inv_errors, preferences[:, 1], -cov_diff_inv_errors)

    return (
        random_ys
        + (cov_X_X @ AT_cov_diff_inv_errors)[preferences]
        + obs_noise_var * np.array([[1, -1]]) * cov_diff_inv_errors[:, None]
    )


_SQRT2 = math.sqrt(2)


def _orthants_MVN_Gibbs_sampling(
    cov_inv: np.ndarray,
    cycles: int,
    initial_sample: np.ndarray,
    rng: np.random.RandomState,
) -> np.ndarray:
    dim = cov_inv.shape[0]
    assert cov_inv.shape == (dim, dim)

    if initial_sample is None:
        sample_chain = np.zeros(dim)
    else:
        sample_chain = initial_sample

    conditional_std = 1 / np.sqrt(np.diag(cov_inv))

    scaled_cov_inv = cov_inv / np.c_[np.diag(cov_inv)]

    out = np.empty((cycles + 1, dim))
    out[0, :] = sample_chain

    for i in range(cycles):
        for j in range(dim):
            conditional_mean = sample_chain[j] - scaled_cov_inv[j] @ sample_chain
            sample_chain[j] = (
                _one_side_trunc_norm_sampling(lower=-conditional_mean / conditional_std[j], rng=rng)
                * conditional_std[j]
                + conditional_mean
            )
        out[i + 1, :] = sample_chain

    return out


def _one_side_trunc_norm_sampling(lower: float, rng: np.random.RandomState) -> float:
    return erfcinv(rng.rand() * erfc(lower / _SQRT2)) * _SQRT2


class _PreferentialGP(GPyTorchModel, ExactGP):
    _num_outputs = 1

    def __init__(
        self,
        kernel: gpytorch.kernels.Kernel,
        noise_prior: Prior | None = None,
        noise_constraint: Interval | None = None,
    ) -> None:
        GPyTorchModel.__init__(self)
        likelihood = _WeightedGaussianLikelihood(
            noise_prior=noise_prior, noise_constraint=noise_constraint
        )
        ExactGP.__init__(self, train_inputs=None, train_targets=None, likelihood=likelihood)
        self.covar_module = kernel

        self._last_params: dict[str, torch.Tensor] | None = None
        self._last_mcmc_step_size: float | None = None

    def _pyro_model(self, train_x: torch.Tensor, train_y: torch.Tensor) -> None:
        # with gpytorch.settings.fast_computations(False, False, False):
        sampled_model = self.pyro_sample_from_prior()
        ys = sampled_model.likelihood(sampled_model.forward(train_x))
        pyro.sample("y", ys, obs=train_y)

    def fit_mcmc(self, X: torch.Tensor, preferences: torch.Tensor, cycles: int, rng: np.random.RandomState) -> None:
        if len(preferences) == 0:
            # Skip actual MCMC computation
            self.set_train_data(
                inputs=torch.empty((0, X.shape[-1])),
                targets=torch.empty((0,)),
                strict=False,
            )
            self.likelihood.weights = torch.empty((0,))
        else:
            dtype = torch.float64

            cnt = torch.bincount(preferences.reshape(-1))
            mask = cnt > 0
            train_x = X[mask]
            weights = cnt[mask]

            assert isinstance(self.likelihood, _WeightedGaussianLikelihood)
            self.likelihood.weights = weights

            preferences_np = preferences.detach().numpy()

            all_ys_np = np.zeros((len(preferences), 2))
            train_y = torch.zeros(
                (
                    len(
                        train_x,
                    )
                ),
                dtype=dtype,
            )

            nuts = pyro.infer.mcmc.NUTS(
                model=self._pyro_model,
                init_strategy=pyro.infer.autoguide.init_to_sample,
                step_size=self._last_mcmc_step_size or 1.0,
            )
            warmup_steps = max(0, cycles - 2)
            nuts.setup(warmup_steps=warmup_steps, train_x=train_x, train_y=train_y)

            raw_params = self._last_params or nuts.initial_params
            for i in range(cycles):
                params = {
                    name: nuts.transforms[name].inv(value) for name, value in raw_params.items()
                }
                _set_params(self, params)
                self.set_train_data(train_x, train_y, strict=False)
                all_ys_np = _sample_y(
                    preferences=preferences_np,
                    cov_X_X=self.covar_module(train_x).detach().numpy(),
                    obs_noise_var=float(self.likelihood.noise_covar.noise),
                    cycles=10,
                    initial_sample=all_ys_np,
                    rng=rng,
                )
                ys_sum_np = np.zeros((len(X),))
                np.add.at(ys_sum_np, preferences_np.reshape(-1), all_ys_np.reshape(-1))
                ys_sum = torch.from_numpy(ys_sum_np)
                train_y[:] = ys_sum[mask] / cnt[mask]
                nuts.clear_cache()
                raw_params = nuts.sample(raw_params)

            params = {name: nuts.transforms[name].inv(value) for name, value in raw_params.items()}
            self.set_train_data(train_x, train_y, strict=False)
            _set_params(self, params)

            self._last_params = raw_params
            self._last_mcmc_step_size = nuts.step_size
            nuts.cleanup()

    def forward(self, x: torch.Tensor) -> gpytorch.distributions.MultivariateNormal:
        mean_module = gpytorch.means.ZeroMean()
        return gpytorch.distributions.MultivariateNormal(
            mean_module(x),
            self.covar_module(x),
        )


def _set_params(
    module: gpytorch.Module,
    params_dict: dict[str, torch.Tensor],
    memo: set | None = None,
    prefix: str = "",
) -> None:
    if memo is None:
        memo = set()
    if hasattr(module, "_priors"):
        for name, (prior, closure, setting_closure) in module._priors.items():
            if prior is not None and prior not in memo:
                memo.add(prior)
                setting_closure(module, params_dict[prefix + ("." if prefix else "") + name])

    for mname, module_ in module.named_children():
        submodule_prefix = prefix + ("." if prefix else "") + mname
        _set_params(module_, params_dict, memo=memo, prefix=submodule_prefix)


class PreferentialGPSampler(optuna.samplers.BaseSampler):
    def __init__(
        self,
        *,
        kernel: gpytorch.kernels.Kernel | None = None,
        noise_prior: Prior | None = None,
        independent_sampler: optuna.samplers.BaseSampler | None = None,
        seed: int | None = None,
        device: torch.device | None = None,
    ) -> None:
        self._rng = np.random.RandomState(seed)
        self._search_space = IntersectionSearchSpace()

        self.kernel = kernel
        self.noise_prior = noise_prior
        self.independent_sampler = independent_sampler or optuna.samplers.RandomSampler(
            seed=self._rng.randint(2**32),
        )
        self.device = device or torch.device("cpu")

        self._gp: _PreferentialGP | None = None


    def reseed_rng(self) -> None:
        self.independent_sampler.reseed_rng()
        self._rng = np.random.RandomState()

    def infer_relative_search_space(
        self, study: Study, trial: FrozenTrial
    ) -> dict[str, BaseDistribution]:
        return self._search_space.calculate(study)

    def sample_relative(
        self,
        study: Study,
        trial: FrozenTrial,
        search_space: dict[str, BaseDistribution],
    ) -> dict[str, Any]:
        with torch.random.fork_rng():
            torch.manual_seed(self._rng.randint(2 ** 32))
            pyro.set_rng_seed(self._rng.randint(2 ** 32))
        
            if len(search_space) == 0:
                return {}
            
            preferences = get_preferences(study, deepcopy=False)
            if len(preferences) == 0:
                return {}

            trans = _SearchSpaceTransform(
                search_space, transform_log=True, transform_step=True, transform_0_1=True
            )
            dims = len(trans.bounds)
            self._gp = self._gp or _PreferentialGP(
                kernel=self.kernel
                or gpytorch.kernels.MaternKernel(
                    nu=2.5,
                    ard_num_dims=dims,
                    lengthscale_prior=gpytorch.priors.GammaPrior(3.0, 6.0),
                    lengthscale_constraint=gpytorch.constraints.Positive(),
                ),
                noise_prior=self.noise_prior or gpytorch.priors.GammaPrior(1.1, 2.0),
                noise_constraint=gpytorch.constraints.Positive(),
            )

            ids: dict[int, int] = {}
            params: list[torch.Tensor] = []
            pref_ids: list[tuple[int, int]] = []

            for better, worse in preferences:
                for t in (better, worse):
                    if t.number not in ids:
                        ids[t.number] = len(ids)
                        params.append(trans.transform(t.params))
                pref_ids.append((ids[better.number], ids[worse.number]))
            dtype = torch.float64

            params_torch = torch.tensor(np.array(params), dtype=dtype, device=self.device)
            pref_ids_torch = torch.tensor(
                np.array(pref_ids),
                dtype=torch.int32,
                device=self.device,
            )
            self._gp.fit_mcmc(params_torch, pref_ids_torch, cycles=10, rng=self._rng)
            self._gp.eval()
            scores = self._gp(params_torch).mean

            best_f = torch.max(scores)

            acqf = LogExpectedImprovement(
                model=self._gp,
                best_f=best_f,
            )

            # TODO: Make it possible to apply it on categorical variables
            candidates, _ = optimize_acqf(
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
        study: Study,
        trial: FrozenTrial,
        param_name: str,
        param_distribution: distributions.BaseDistribution,
    ) -> Any:
        return self.independent_sampler.sample_independent(
            study, trial, param_name, param_distribution
        )
