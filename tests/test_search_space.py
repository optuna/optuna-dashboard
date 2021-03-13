import warnings
from unittest import TestCase

import optuna
from optuna import create_trial
from optuna.distributions import UniformDistribution
from optuna.exceptions import ExperimentalWarning
from optuna.trial import TrialState

from optuna_dashboard.search_space import _SearchSpace


class SearchSpaceTestCase(TestCase):
    def setUp(self) -> None:
        optuna.logging.set_verbosity(optuna.logging.ERROR)
        warnings.simplefilter("ignore", category=ExperimentalWarning)

    def test_same_distributions(self) -> None:
        study = optuna.create_study()
        distributions = [
            {
                "x0": UniformDistribution(low=0, high=10),
                "x1": UniformDistribution(low=0, high=10),
            },
            {
                "x0": UniformDistribution(low=0, high=10),
                "x1": UniformDistribution(low=0, high=10),
            },
        ]
        params = [
            {
                "x0": 0.5,
                "x1": 0.5,
            },
            {
                "x0": 0.5,
                "x1": 0.5,
            },
        ]
        trials = [
            create_trial(state=TrialState.COMPLETE, value=0, distributions=d, params=p)
            for d, p in zip(distributions, params)
        ]
        study.add_trials(trials=trials)

        search_space = _SearchSpace()
        search_space.update(study)

        self.assertEqual(len(search_space.intersection), 2)
        self.assertEqual(len(search_space.union), 2)

    def test_different_distributions(self) -> None:
        study = optuna.create_study()
        distributions = [
            {
                "x0": UniformDistribution(low=0, high=10),
                "x1": UniformDistribution(low=0, high=10),
            },
            {
                "x0": UniformDistribution(low=0, high=5),
                "x1": UniformDistribution(low=0, high=10),
            },
        ]
        params = [
            {
                "x0": 0.5,
                "x1": 0.5,
            },
            {
                "x0": 0.5,
                "x1": 0.5,
            },
        ]
        trials = [
            create_trial(state=TrialState.COMPLETE, value=0, distributions=d, params=p)
            for d, p in zip(distributions, params)
        ]
        study.add_trials(trials=trials)

        search_space = _SearchSpace()
        search_space.update(study)

        self.assertEqual(len(search_space.intersection), 1)
        self.assertEqual(len(search_space.union), 3)

    def test_dynamic_search_space(self) -> None:
        study = optuna.create_study()
        distributions = [
            {
                "x0": UniformDistribution(low=0, high=10),
                "x1": UniformDistribution(low=0, high=10),
            },
            {
                "x0": UniformDistribution(low=0, high=5),
            },
            {
                "x0": UniformDistribution(low=0, high=10),
                "x1": UniformDistribution(low=0, high=10),
            },
        ]
        params = [
            {
                "x0": 0.5,
                "x1": 0.5,
            },
            {
                "x0": 0.5,
            },
            {
                "x0": 0.5,
                "x1": 0.5,
            },
        ]
        trials = [
            create_trial(state=TrialState.COMPLETE, value=0, distributions=d, params=p)
            for d, p in zip(distributions, params)
        ]
        study.add_trials(trials=trials)

        search_space = _SearchSpace()
        search_space.update(study)

        self.assertEqual(len(search_space.intersection), 0)
        self.assertEqual(len(search_space.union), 3)
