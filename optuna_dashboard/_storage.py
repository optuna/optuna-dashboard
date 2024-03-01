from __future__ import annotations

from datetime import datetime
from datetime import timedelta
import threading

from optuna.storages import BaseStorage
from optuna.storages import RDBStorage
from optuna.study import StudyDirection
from optuna.study._frozen import FrozenStudy
from optuna.trial import FrozenTrial


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


def get_studies(storage: BaseStorage) -> list[FrozenStudy]:
    frozen_studies = storage.get_all_studies()
    if isinstance(storage, RDBStorage):
        frozen_studies = sorted(frozen_studies, key=lambda s: s._study_id)
    return frozen_studies


def get_study(storage: BaseStorage, study_id: int) -> FrozenStudy | None:
    studies = get_studies(storage)
    for s in studies:
        if s._study_id != study_id:
            continue
        return s
    return None


def create_new_study(
    storage: BaseStorage, study_name: str, directions: list[StudyDirection]
) -> int:
    study_id = storage.create_new_study(directions, study_name=study_name)
    return study_id
