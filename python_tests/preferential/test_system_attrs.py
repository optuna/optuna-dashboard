from __future__ import annotations

from typing import Callable

import optuna
import pytest
from optuna_dashboard.preferential._system_attrs import get_preferences
from optuna_dashboard.preferential._system_attrs import report_preferences

from ..storage_supplier import parametrize_storages
from ..storage_supplier import StorageSupplier

import importlib.util

if importlib.util.find_spec("torch") is None:
    pytest.skip("PyTorch is not installed", allow_module_level=True)


@parametrize_storages
def test_report_and_get_preferences(storage_supplier: Callable[[], StorageSupplier]) -> None:
    with storage_supplier() as storage:
        study = optuna.create_study(storage=storage)
        study.ask()
        study.ask()

        study_id = study._study_id

        assert len(get_preferences(storage.get_study_system_attrs(study_id))) == 0

        better, worse = study.trials[0], study.trials[1]
        report_preferences(study_id, storage, [(better.number, worse.number)])
        assert len(get_preferences(storage.get_study_system_attrs(study_id))) == 1

        actual_better, actual_worse = get_preferences(storage.get_study_system_attrs(study_id))[0]
        assert actual_better == better.number
        assert actual_worse == worse.number
