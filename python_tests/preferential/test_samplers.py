from __future__ import annotations

from collections.abc import Callable

import optuna
from optuna import create_trial
from optuna.distributions import CategoricalDistribution
from optuna.distributions import FloatDistribution
from optuna.distributions import IntDistribution
from optuna.samplers import BaseSampler
from optuna.trial import TrialState
from optuna_dashboard.preferential import create_study
from optuna_dashboard.preferential.samplers.gp import PreferentialGPSampler
import pytest


parametrize_sampler = pytest.mark.parametrize(
    "sampler_class", [optuna.samplers.RandomSampler, PreferentialGPSampler]
)


@parametrize_sampler
def test_sample_float(sampler_class: Callable[[], BaseSampler]) -> None:
    study = create_study(n_generate=4, sampler=sampler_class())

    for i in range(5):
        past_trial = create_trial(
            state=TrialState.RUNNING,
            params={"x": 1.0},
            distributions={"x": FloatDistribution(0, 10)},
        )
        study.add_trial(past_trial)
    study.report_preference(study.trials[:-1], study.trials[-1])

    trial = study.ask()
    trial.suggest_float("x", 0, 10)


@parametrize_sampler
def test_sample_int(sampler_class: Callable[[], BaseSampler]) -> None:
    study = create_study(n_generate=4, sampler=sampler_class())

    for i in range(5):
        past_trial = create_trial(
            state=TrialState.RUNNING,
            params={"x": 1},
            distributions={"x": IntDistribution(0, 10)},
        )
        study.add_trial(past_trial)
    study.report_preference(study.trials[:-1], study.trials[-1])

    trial = study.ask()
    trial.suggest_int("x", 0, 10)


@parametrize_sampler
def test_sample_categorical(sampler_class: Callable[[], BaseSampler]) -> None:
    study = create_study(n_generate=4, sampler=sampler_class())

    for i in range(5):
        past_trial = create_trial(
            state=TrialState.RUNNING,
            params={"x": "A"},
            distributions={"x": CategoricalDistribution(["A", "B", "C"])},
        )
        study.add_trial(past_trial)
    study.report_preference(study.trials[:-1], study.trials[-1])

    trial = study.ask()
    trial.suggest_categorical("x", ["A", "B", "C"])


@parametrize_sampler
def test_sample_mixed(sampler_class: Callable[[], BaseSampler]) -> None:
    study = create_study(n_generate=4, sampler=sampler_class())

    for i in range(5):
        past_trial = create_trial(
            state=TrialState.RUNNING,
            params={"x": 1.0, "y": 1, "z": "A"},
            distributions={
                "x": FloatDistribution(0, 10),
                "y": IntDistribution(0, 10),
                "z": CategoricalDistribution(["A", "B", "C"]),
            },
        )
        study.add_trial(past_trial)
    study.report_preference(study.trials[:-1], study.trials[-1])

    trial = study.ask()
    trial.suggest_float("x", 0, 10)
    trial.suggest_int("y", 0, 10)
    trial.suggest_categorical("z", ["A", "B", "C"])


@parametrize_sampler
def test_sample_first_trial(sampler_class: Callable[[], BaseSampler]) -> None:
    study = create_study(n_generate=4, sampler=sampler_class())
    trial = study.ask()
    trial.suggest_float("x", 0, 10)


@parametrize_sampler
def test_sample_dynamic_search_space(sampler_class: Callable[[], BaseSampler]) -> None:
    study = create_study(n_generate=4, sampler=sampler_class())

    for i in range(5):
        past_trial = create_trial(
            state=TrialState.RUNNING,
            params={"x": 1.0},
            distributions={"x": FloatDistribution(0, 10)},
        )
        study.add_trial(past_trial)
    study.report_preference(study.trials[:-1], study.trials[-1])

    trial = study.ask()
    trial.suggest_float("x", -100, 100)
