from __future__ import annotations

import copy
import multiprocessing
import pickle
import sys
from typing import Callable
from unittest.mock import patch
import uuid

import optuna
from optuna import copy_study
from optuna import create_trial
from optuna import delete_study
from optuna import distributions
from optuna import Trial
from optuna.exceptions import DuplicatedStudyError
from optuna.trial import TrialState
from optuna_dashboard.preferential import create_study
from optuna_dashboard.preferential import load_study
from packaging import version
import pytest

from ..storage_supplier import parametrize_storages
from ..storage_supplier import StorageSupplier


if version.parse(optuna.__version__) < version.parse("3.4.0"):
    pytest.skip("Preferential optimization is introduced at v3.4.0", allow_module_level=True)

import importlib.util
if importlib.util.find_spec("torch") is None:
    pytest.skip("PyTorch is not installed", allow_module_level=True)


@parametrize_storages
def test_study_set_and_get_user_attrs(storage_supplier: Callable[[], StorageSupplier]) -> None:
    with storage_supplier() as storage:
        study = create_study(n_generate=4, storage=storage)

        study.set_user_attr("dataset", "MNIST")
        assert study.user_attrs["dataset"] == "MNIST"


@parametrize_storages
def test_report_and_get_preferences(storage_supplier: Callable[[], StorageSupplier]) -> None:
    with storage_supplier() as storage:
        study = create_study(n_generate=4, storage=storage)
        assert len(study.preferences) == 0

        for _ in range(2):
            trial = study.ask()
            trial.suggest_float("x", 0, 1)
        better, worse = study.trials
        study.report_preference(better, worse)
        assert len(study.preferences) == 1

        actual_better, actual_worse = study.preferences[0]
        assert actual_better.number == better.number
        assert actual_worse.number == worse.number


# TODO(c-bata): Add support for Python 3.13.
# https://github.com/optuna/optuna-dashboard/pull/985
@pytest.mark.skipif(sys.version_info > (3, 13), reason="With Python 3.13, this test is broken")
def test_study_pickle() -> None:
    study_1 = create_study(
        n_generate=4,
    )
    for _ in range(10):
        study_1.ask()
    assert len(study_1.trials) == 10
    dumped_bytes = pickle.dumps(study_1)

    study_2 = pickle.loads(dumped_bytes)
    assert len(study_2.trials) == 10

    for _ in range(10):
        study_2.ask()
    assert len(study_2.trials) == 20


@parametrize_storages
def test_create_study(storage_supplier: Callable[[], StorageSupplier]) -> None:
    with storage_supplier() as storage:
        # Test creating a new study.
        study = create_study(n_generate=4, storage=storage, load_if_exists=False)

        # Test `load_if_exists=True` with existing study.
        create_study(
            n_generate=4, study_name=study.study_name, storage=storage, load_if_exists=True
        )

        with pytest.raises(DuplicatedStudyError):
            create_study(
                n_generate=4, study_name=study.study_name, storage=storage, load_if_exists=False
            )


@parametrize_storages
def test_load_study(storage_supplier: Callable[[], StorageSupplier]) -> None:
    with storage_supplier() as storage:
        if storage is None:
            # `InMemoryStorage` can not be used with `load_study` function.
            return

        study_name = str(uuid.uuid4())

        with pytest.raises(KeyError):
            # Test loading an unexisting study.
            load_study(study_name=study_name, storage=storage)

        # Create a new study.
        created_study = create_study(n_generate=4, study_name=study_name, storage=storage)

        # Test loading an existing study.
        loaded_study = load_study(study_name=study_name, storage=storage)
        assert created_study.study_name == loaded_study.study_name


@parametrize_storages
def test_load_study_study_name_none(storage_supplier: Callable[[], StorageSupplier]) -> None:
    with storage_supplier() as storage:
        if storage is None:
            # `InMemoryStorage` can not be used with `load_study` function.
            return

        study_name = str(uuid.uuid4())

        _ = create_study(n_generate=4, study_name=study_name, storage=storage)

        loaded_study = load_study(study_name=None, storage=storage)

        assert loaded_study.study_name == study_name

        study_name = str(uuid.uuid4())

        _ = create_study(n_generate=4, study_name=study_name, storage=storage)

        # Ambiguous study.
        with pytest.raises(ValueError):
            load_study(study_name=None, storage=storage)


@parametrize_storages
def test_delete_study(storage_supplier: Callable[[], StorageSupplier]) -> None:
    with storage_supplier() as storage:
        # Test deleting a non-existing study.
        with pytest.raises(KeyError):
            delete_study(study_name="invalid-study-name", storage=storage)

        # Test deleting an existing study.
        study = create_study(n_generate=4, storage=storage, load_if_exists=False)
        delete_study(study_name=study.study_name, storage=storage)

        # Test failed to delete the study which is already deleted.
        with pytest.raises(KeyError):
            delete_study(study_name=study.study_name, storage=storage)


def test_copy_study() -> None:
    with StorageSupplier("sqlite") as from_storage, StorageSupplier("sqlite") as to_storage:
        from_study = create_study(n_generate=4, storage=from_storage)
        from_study.set_user_attr("baz", "qux")
        for _ in range(3):
            trial = from_study.ask()
            trial.suggest_float("x", 0, 1)
        from_study.report_preference(from_study.trials[0], from_study.trials[1])
        from_study.report_preference(from_study.trials[1], from_study.trials[2])

        copy_study(
            from_study_name=from_study.study_name,
            from_storage=from_storage,
            to_storage=to_storage,
        )

        to_study = load_study(study_name=from_study.study_name, storage=to_storage)
        assert to_study.study_name == from_study.study_name
        assert to_study.user_attrs == from_study.user_attrs
        assert len(to_study.trials) == len(from_study.trials)
        assert len(from_study.preferences) == len(to_study.preferences)


def test_copy_study_to_study_name() -> None:
    with StorageSupplier("sqlite") as from_storage, StorageSupplier("sqlite") as to_storage:
        from_study = create_study(n_generate=4, study_name="foo", storage=from_storage)
        _ = create_study(n_generate=4, study_name="foo", storage=to_storage)

        with pytest.raises(DuplicatedStudyError):
            copy_study(
                from_study_name=from_study.study_name,
                from_storage=from_storage,
                to_storage=to_storage,
            )

        copy_study(
            from_study_name=from_study.study_name,
            from_storage=from_storage,
            to_storage=to_storage,
            to_study_name="bar",
        )

        _ = load_study(study_name="bar", storage=to_storage)


@parametrize_storages
def test_add_trial(storage_supplier: Callable[[], StorageSupplier]) -> None:
    with storage_supplier() as storage:
        study = create_study(n_generate=4, storage=storage)
        assert len(study.trials) == 0

        trial = create_trial(value=0)
        study.add_trial(trial)
        assert len(study.trials) == 1
        assert study.trials[0].number == 0


def test_add_trial_invalid_values_length() -> None:
    study = create_study(
        n_generate=4,
    )
    trial = create_trial(values=[0, 0])
    with pytest.raises(ValueError):
        study.add_trial(trial)


@parametrize_storages
def test_add_trials(storage_supplier: Callable[[], StorageSupplier]) -> None:
    with storage_supplier() as storage:
        study = create_study(n_generate=4, storage=storage)
        assert len(study.trials) == 0

        study.add_trials([])
        assert len(study.trials) == 0

        trials = [create_trial(value=i) for i in range(3)]
        study.add_trials(trials)
        assert len(study.trials) == 3
        for i, trial in enumerate(study.trials):
            assert trial.number == i
            assert trial.value == i

        other_study = create_study(n_generate=4, storage=storage)
        other_study.add_trials(study.trials)
        assert len(other_study.trials) == 3
        for i, trial in enumerate(other_study.trials):
            assert trial.number == i
            assert trial.value == i


@parametrize_storages
def test_get_trials(storage_supplier: Callable[[], StorageSupplier]) -> None:
    with storage_supplier() as storage:
        study = create_study(n_generate=4, storage=storage)
        for _ in range(5):
            trial = study.ask()
            trial.suggest_int("x", 1, 5)

        with patch("copy.deepcopy", wraps=copy.deepcopy) as mock_object:
            trials0 = study.get_trials(deepcopy=False)
            assert mock_object.call_count == 0
            assert len(trials0) == 5

            trials1 = study.get_trials(deepcopy=True)
            assert mock_object.call_count > 0
            assert trials0 == trials1

            # `study.trials` is equivalent to `study.get_trials(deepcopy=True)`.
            old_count = mock_object.call_count
            trials2 = study.trials
            assert mock_object.call_count > old_count
            assert trials0 == trials2


@parametrize_storages
def test_get_trials_state_option(storage_supplier: Callable[[], StorageSupplier]) -> None:
    with storage_supplier() as storage:
        study = create_study(n_generate=4, storage=storage)
        for _ in range(3):
            study.ask()
        better, worse = study.trials[:2]
        study.report_preference(better, worse)

        trials = study.get_trials(states=None)
        assert len(trials) == 3

        trials = study.get_trials(states=(TrialState.RUNNING,))
        assert len(trials) == 1
        assert all(t.state == TrialState.RUNNING for t in trials)

        trials = study.get_trials(states=(TrialState.COMPLETE,))
        assert len(trials) == 2
        assert all(t.state == TrialState.COMPLETE for t in trials)

        trials = study.get_trials(states=())
        assert len(trials) == 0

        other_states = [
            s for s in list(TrialState) if s != TrialState.COMPLETE and s != TrialState.RUNNING
        ]
        for s in other_states:
            trials = study.get_trials(states=(s,))
            assert len(trials) == 0


def test_ask() -> None:
    study = create_study(
        n_generate=4,
    )

    trial = study.ask()
    assert isinstance(trial, Trial)


def test_ask_fixed_search_space() -> None:
    fixed_distributions = {
        "x": distributions.FloatDistribution(0, 1),
        "y": distributions.CategoricalDistribution(["bacon", "spam"]),
    }

    study = create_study(
        n_generate=4,
    )
    trial = study.ask(fixed_distributions=fixed_distributions)

    params = trial.params
    assert len(trial.params) == 2
    assert 0 <= params["x"] < 1
    assert params["y"] in ["bacon", "spam"]


def test_report_preferences_from_another_process() -> None:
    pool = multiprocessing.Pool()

    with StorageSupplier("sqlite") as storage:
        # Create a study and ask for a new trial.
        study = create_study(n_generate=4, storage=storage)
        study.ask()
        study.ask()

        # Test normal behaviour.
        better, worse = study.trials
        pool.starmap(study.report_preference, [(better, worse)])

        assert len(study.trials) == 2
        assert study.trials[0].state == TrialState.COMPLETE
        assert study.trials[1].state == TrialState.COMPLETE
        assert len(study.preferences) == 1
