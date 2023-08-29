from __future__ import annotations

from datetime import datetime
from typing import Callable

from optuna_dashboard._serializer import serialize_preference_history
from optuna_dashboard.preferential import create_study
from optuna_dashboard.preferential._history import FeedbackMode
from optuna_dashboard.preferential._history import report_choice

from ..storage_supplier import parametrize_storages
from ..storage_supplier import StorageSupplier


@parametrize_storages
def test_report_and_get_choices(storage_supplier: Callable[[], StorageSupplier]) -> None:
    with storage_supplier() as storage:
        study = create_study(storage=storage)
        for _ in range(5):
            trial = study.ask()
            trial.suggest_float("x", 0, 1)
            study.mark_comparison_ready(trial)

        study_id = study._study._study_id
        report_choice(
            study_id=study_id,
            storage=storage,
            candidate_trials=[0, 2, 3, 4],
            preferences=[(2, 0), (3, 0), (4, 0)],
            feedback_mode=FeedbackMode.CHOOSE_WORST,
            timestamp=datetime(2020, 1, 1, 10, 0, 1),
        )
        report_choice(
            study_id=study_id,
            storage=storage,
            candidate_trials=[0, 1, 2],
            preferences=[(0, 1), (2, 1)],
            feedback_mode=FeedbackMode.CHOOSE_WORST,
            timestamp=datetime(2020, 1, 1, 10, 0, 0),
        )

        history = serialize_preference_history(storage.get_study_system_attrs(study_id))
        assert len(history) == 2
        assert history[0]["candidate_trials"] == [0, 1, 2]
        assert len(history[0]["preferences"]) == 2
        for i, (best, worst) in enumerate([(0, 1), (2, 1)]):
            assert len(history[0]["preferences"][i]) == 2
            assert history[0]["preferences"][i][0] == best
            assert history[0]["preferences"][i][1] == worst
        assert history[0]["feedback_mode"] == FeedbackMode.CHOOSE_WORST.name
        assert history[0]["timestamp"] == "2020-01-01T10:00:00"
        assert history[1]["candidate_trials"] == [0, 2, 3, 4]
        assert len(history[1]["preferences"]) == 3
        for i, (best, worst) in enumerate([(2, 0), (3, 0), (4, 0)]):
            assert len(history[1]["preferences"][i]) == 2
            assert history[1]["preferences"][i][0] == best
            assert history[1]["preferences"][i][1] == worst
        assert history[1]["feedback_mode"] == FeedbackMode.CHOOSE_WORST.name
        assert history[1]["timestamp"] == "2020-01-01T10:00:01"
