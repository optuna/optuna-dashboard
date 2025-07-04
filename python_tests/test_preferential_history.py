from __future__ import annotations

import json
import sys
from typing import Callable
from typing import TYPE_CHECKING

import optuna
from optuna.storages import BaseStorage
from optuna_dashboard._preferential_history import _SYSTEM_ATTR_PREFIX_HISTORY
from optuna_dashboard._preferential_history import NewHistory
from optuna_dashboard._preferential_history import remove_history
from optuna_dashboard._preferential_history import report_history
from optuna_dashboard._preferential_history import restore_history
from optuna_dashboard._serializer import serialize_preference_history
from packaging import version
import pytest

import importlib.util

if importlib.util.find_spec("botorch") is None:
    pytest.skip("PyTorch/BoTorch is not installed", allow_module_level=True)

from optuna_dashboard.preferential import create_study
from optuna_dashboard.preferential._system_attrs import _SYSTEM_ATTR_PREFIX_PREFERENCE

from .storage_supplier import parametrize_storages
from .storage_supplier import StorageSupplier


if TYPE_CHECKING:
    from optuna_dashboard._preferential_history import History


if version.parse(optuna.__version__) < version.parse("3.4.0"):
    pytest.skip("Preferential optimization is introduced at v3.4.0", allow_module_level=True)


if sys.version_info < (3, 8):
    pytest.skip("BoTorch dropped Python3.7 support", allow_module_level=True)


@parametrize_storages
def test_report_and_get_choices(storage_supplier: Callable[[], StorageSupplier]) -> None:
    with storage_supplier() as storage:
        study = create_study(storage=storage, n_generate=5)
        for _ in range(5):
            trial = study.ask()
            trial.suggest_float("x", 0, 1)

        study_id = study._study._study_id

        report_history(
            study_id=study_id,
            storage=storage,
            input_data=NewHistory(mode="ChooseWorst", candidates=[0, 1, 2], clicked=1),
        )
        report_history(
            study_id=study_id,
            storage=storage,
            input_data=NewHistory(mode="ChooseWorst", candidates=[0, 2, 3, 4], clicked=0),
        )
        history = serialize_preference_history(storage.get_study_system_attrs(study_id))
        sys_attrs = storage.get_study_system_attrs(study_id)
        assert len(history) == 2
        assert history[0]["history"]["candidates"] == [0, 1, 2]
        assert history[0]["history"]["clicked"] == 1
        preferences = sys_attrs[_SYSTEM_ATTR_PREFIX_PREFERENCE + history[0]["history"]["id"]]
        assert len(preferences) == 2
        for i, (best, worst) in enumerate([(0, 1), (2, 1)]):
            assert len(preferences[i]) == 2
            assert preferences[i][0] == best
            assert preferences[i][1] == worst
        assert history[1]["history"]["candidates"] == [0, 2, 3, 4]
        assert history[1]["history"]["clicked"] == 0
        preferences = sys_attrs[_SYSTEM_ATTR_PREFIX_PREFERENCE + history[1]["history"]["id"]]
        assert len(preferences) == 3
        for i, (best, worst) in enumerate([(2, 0), (3, 0), (4, 0)]):
            assert len(preferences[i]) == 2
            assert preferences[i][0] == best
            assert preferences[i][1] == worst


def get_preferences_history(
    study_id: int,
    storage: BaseStorage,
    history_id: str,
) -> tuple[list[tuple[int, int]], History]:
    system_attrs = storage.get_study_system_attrs(study_id)
    history: History = json.loads(system_attrs.get(_SYSTEM_ATTR_PREFIX_HISTORY + history_id, ""))
    preference: list[tuple[int, int]] = system_attrs.get(
        _SYSTEM_ATTR_PREFIX_PREFERENCE + history_id, []
    )
    return preference, history


@parametrize_storages
def test_remove_history(storage_supplier: Callable[[], StorageSupplier]) -> None:
    with storage_supplier() as storage:
        study = create_study(storage=storage, n_generate=5)
        for _ in range(5):
            trial = study.ask()
            trial.suggest_float("x", 0, 1)
        study_id = study._study._study_id

        history_id = report_history(
            study_id=study_id,
            storage=storage,
            input_data=NewHistory(mode="ChooseWorst", candidates=[0, 1, 2], clicked=1),
        )
        remove_history(study_id, storage, history_id)
        preference, history = get_preferences_history(study_id, storage, history_id)
        assert history["mode"] == "ChooseWorst"
        assert history["candidates"] == [0, 1, 2]
        assert history["clicked"] == 1
        assert len(preference) == 0

        remove_history(study_id, storage, history_id)
        preference, history = get_preferences_history(study_id, storage, history_id)
        assert len(preference) == 0


@parametrize_storages
def test_restore_history(storage_supplier: Callable[[], StorageSupplier]) -> None:
    with storage_supplier() as storage:
        study = create_study(storage=storage, n_generate=5)
        for _ in range(5):
            trial = study.ask()
            trial.suggest_float("x", 0, 1)
        study_id = study._study._study_id

        history_id = report_history(
            study_id=study_id,
            storage=storage,
            input_data=NewHistory(mode="ChooseWorst", candidates=[0, 1, 2], clicked=1),
        )
        remove_history(study_id, storage, history_id)
        preference, history = get_preferences_history(study_id, storage, history_id)
        assert len(preference) == 0

        restore_history(study_id, storage, history_id)
        preference, history = get_preferences_history(study_id, storage, history_id)
        assert history["mode"] == "ChooseWorst"
        assert history["candidates"] == [0, 1, 2]
        assert history["clicked"] == 1
        assert len(preference) == 2
        for i, (best, worst) in enumerate([(0, 1), (2, 1)]):
            assert len(preference[i]) == 2
            assert preference[i][0] == best
            assert preference[i][1] == worst

        restore_history(study_id, storage, history_id)
        preference, history = get_preferences_history(study_id, storage, history_id)
        assert len(preference) == 2
