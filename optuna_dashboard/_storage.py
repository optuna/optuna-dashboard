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
from optuna.version import __version__ as optuna_ver
from packaging import version


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

    if (
        # See https://github.com/optuna/optuna/pull/3702
        version.parse(optuna_ver) <= version.Version("3.0.0rc0.dev")
        and isinstance(storage, RDBStorage)
        and storage.url.startswith("postgresql")
    ):
        trials = sorted(trials, key=lambda t: t.number)

    with trials_cache_lock:
        trials_last_fetched_at[study_id] = datetime.now()
        trials_cache[study_id] = trials
    return trials


def get_study_summaries(storage: BaseStorage) -> list[StudySummary]:
    if version.parse(optuna_ver) >= version.Version("3.0.0rc0.dev"):
        frozen_studies = storage.get_all_studies()  # type: ignore
        if isinstance(storage, RDBStorage):
            frozen_studies = sorted(frozen_studies, key=lambda s: s._study_id)
        return [_frozen_study_to_study_summary(s) for s in frozen_studies]
    elif version.parse(optuna_ver) >= version.Version("3.0.0b0.dev"):
        return storage.get_all_study_summaries(include_best_trial=False)  # type: ignore
    else:
        return storage.get_all_study_summaries()  # type: ignore


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
    if version.parse(optuna_ver) >= version.Version("3.1.0.dev") and version.parse(
        optuna_ver
    ) != version.Version("3.1.0b0"):
        study_id = storage.create_new_study(directions, study_name=study_name)  # type: ignore
    else:
        study_id = storage.create_new_study(study_name)  # type: ignore
        storage.set_study_directions(study_id, directions)  # type: ignore
    return study_id


# TODO(c-bata): Remove type:ignore after released Optuna v3.0.0rc0.
def _frozen_study_to_study_summary(frozen_study: "FrozenStudy") -> StudySummary:  # type: ignore
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
