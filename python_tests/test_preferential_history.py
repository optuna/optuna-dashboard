from __future__ import annotations

from typing import Callable

from optuna_dashboard._preferential_history import NewHistory
from optuna_dashboard._preferential_history import report_history
from optuna_dashboard._serializer import serialize_preference_history
from optuna_dashboard.preferential import create_study
from optuna_dashboard.preferential._system_attrs import _SYSTEM_ATTR_PREFIX_PREFERENCE

from .storage_supplier import parametrize_storages
from .storage_supplier import StorageSupplier


@parametrize_storages
def test_report_and_get_choices(storage_supplier: Callable[[], StorageSupplier]) -> None:
    with storage_supplier() as storage:
        study = create_study(storage=storage)
        for _ in range(5):
            trial = study.ask()
            trial.suggest_float("x", 0, 1)
            study.mark_comparison_ready(trial)

        study_id = study._study._study_id

        report_history(
            study_id=study_id,
            storage=storage,
            input_data=NewHistory(
                mode="ChooseWorst",
                candidates=[0, 1, 2],
                clicked=1,
            ),
        )
        report_history(
            study_id=study_id,
            storage=storage,
            input_data=NewHistory(
                mode="ChooseWorst",
                candidates=[0, 2, 3, 4],
                clicked=0,
            ),
        )
        history = serialize_preference_history(storage.get_study_system_attrs(study_id))
        sys_attrs = storage.get_study_system_attrs(study_id)
        assert len(history) == 2
        assert history[0]["candidates"] == [0, 1, 2]
        assert history[0]["clicked"] == 1
        preferences = sys_attrs[_SYSTEM_ATTR_PREFIX_PREFERENCE + history[0]["preference_id"]]
        assert len(preferences) == 2
        for i, (best, worst) in enumerate([(0, 1), (2, 1)]):
            assert len(preferences[i]) == 2
            assert preferences[i][0] == best
            assert preferences[i][1] == worst
        assert history[1]["candidates"] == [0, 2, 3, 4]
        assert history[1]["clicked"] == 0
        preferences = sys_attrs[_SYSTEM_ATTR_PREFIX_PREFERENCE + history[1]["preference_id"]]
        assert len(preferences) == 3
        for i, (best, worst) in enumerate([(2, 0), (3, 0), (4, 0)]):
            assert len(preferences[i]) == 2
            assert preferences[i][0] == best
            assert preferences[i][1] == worst
