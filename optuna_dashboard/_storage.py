from __future__ import annotations

from datetime import datetime
from datetime import timedelta
import threading
import typing

from optuna.storages import BaseStorage
from optuna.storages import RDBStorage
from optuna.study import StudyDirection
from optuna.study import StudySummary
from optuna.trial import FrozenTrial


if typing.TYPE_CHECKING:
    from optuna.study._frozen import FrozenStudy


# In-memory trials cache
trials_cache_lock = threading.Lock()
trials_cache: dict[int, list[FrozenTrial]] = {}
trials_last_fetched_at: dict[int, datetime] = {}


def get_trials(storage: BaseStorage, study_id: int) -> list[FrozenTrial]:
    with trials_cache_lock:
        trials = trials_cache.get(study_id, None)

        # Not a big fan of the heuristic, but I can't think of anything better.
        if trials is None or len(trials) < 100:
            ttl_seconds = 2
        elif len(trials) < 500:
            ttl_seconds = 5
        else:
            ttl_seconds = 10

        last_fetched_at = trials_last_fetched_at.get(study_id, None)
        if (
            trials is not None
            and last_fetched_at is not None
            and datetime.now() - last_fetched_at < timedelta(seconds=ttl_seconds)
        ):
            return trials
    trials = storage.get_all_trials(study_id, deepcopy=False)

    with trials_cache_lock:
        trials_last_fetched_at[study_id] = datetime.now()
        trials_cache[study_id] = trials
    return trials


def get_study_summaries(storage: BaseStorage) -> list[StudySummary]:
    frozen_studies = storage.get_all_studies()
    if isinstance(storage, RDBStorage):
        frozen_studies = sorted(frozen_studies, key=lambda s: s._study_id)
    return [_frozen_study_to_study_summary(s) for s in frozen_studies]


def get_study_summary(storage: BaseStorage, study_id: int) -> StudySummary | None:
    summaries = get_study_summaries(storage)
    for summary in summaries:
        if summary._study_id != study_id:
            continue
        return summary
    return None


def create_new_study(
    storage: BaseStorage, study_name: str, directions: list[StudyDirection]
) -> int:
    study_id = storage.create_new_study(directions, study_name=study_name)
    return study_id


def _frozen_study_to_study_summary(frozen_study: "FrozenStudy") -> StudySummary:
    is_single = len(frozen_study.directions) == 1
    return StudySummary(
        study_name=frozen_study.study_name,
        study_id=frozen_study._study_id,
        direction=frozen_study.direction if is_single else None,
        directions=frozen_study.directions if not is_single else None,
        user_attrs=frozen_study.user_attrs,
        system_attrs=frozen_study.system_attrs,
        best_trial=None,
        n_trials=-1,  # This field isn't used by Dashboard.
        datetime_start=None,
    )
