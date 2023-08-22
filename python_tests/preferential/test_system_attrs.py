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

        study_id = study._study_id
        assert len(get_preferences(study_id, storage)) == 0

        better, worse = study.trials[0], study.trials[1]
        report_preferences(study_id, storage, [(better.number, worse.number)])
        assert len(get_preferences(study_id, storage)) == 1

        actual_better, actual_worse = get_preferences(study_id, storage)[0]
        assert actual_better == better.number
        assert actual_worse == worse.number
