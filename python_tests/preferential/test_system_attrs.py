from __future__ import annotations

from typing import Callable

import optuna
from optuna_dashboard.preferential._system_attrs import get_preferences
from optuna_dashboard.preferential._system_attrs import report_preferences

from ..storage_supplier import parametrize_storages
from ..storage_supplier import StorageSupplier


@parametrize_storages
def test_report_and_get_preferences(storage_supplier: Callable[[], StorageSupplier]) -> None:
    with storage_supplier() as storage:
        study = optuna.create_study(storage=storage)
        study.ask()
        study.ask()

        assert len(get_preferences(study)) == 0

        better, worse = study.trials[0], study.trials[1]
        report_preferences(study, [(better, worse)])
        assert len(get_preferences(study)) == 1

        actual_better, actual_worse = get_preferences(study)[0]
        assert actual_better.number == better.number
        assert actual_worse.number == worse.number
