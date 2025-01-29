from __future__ import annotations

import copy
from datetime import datetime
from datetime import timedelta
import numbers
import threading
from typing import List
from typing import Optional
from typing import Set
from typing import Tuple
from typing import TYPE_CHECKING

from optuna.distributions import BaseDistribution
from optuna.storages import BaseStorage
from optuna.trial import FrozenTrial
from optuna.trial import TrialState


if TYPE_CHECKING:
    SearchSpaceSetT = Set[Tuple[str, BaseDistribution]]
    SearchSpaceListT = List[Tuple[str, BaseDistribution]]


def get_cached_extra_study_property(
    in_memory_cache: InMemoryCache, study_id: int, trials: list[FrozenTrial]
) -> tuple[SearchSpaceListT, SearchSpaceListT, list[tuple[str, bool]], bool]:
    with in_memory_cache._cached_extra_study_property_cache_lock:
        cached_extra_study_property = in_memory_cache._cached_extra_study_property_cache.get(
            study_id, None
        )
        if cached_extra_study_property is None:
            cached_extra_study_property = _CachedExtraStudyProperty()
        cached_extra_study_property.update(trials)
        in_memory_cache._cached_extra_study_property_cache[study_id] = cached_extra_study_property
        return (
            cached_extra_study_property.intersection_search_space,
            cached_extra_study_property.union_search_space,
            cached_extra_study_property.union_user_attrs,
            cached_extra_study_property.has_intermediate_values,
        )


def get_trials(
    in_memory_cache: InMemoryCache, storage: BaseStorage, study_id: int
) -> list[FrozenTrial]:
    with in_memory_cache._trials_cache_lock:
        trials = in_memory_cache._trials_cache.get(study_id, None)

        # Not a big fan of the heuristic, but I can't think of anything better.
        if trials is None or len(trials) < 100:
            ttl_seconds = 2
        elif len(trials) < 500:
            ttl_seconds = 5
        else:
            ttl_seconds = 10

        last_fetched_at = in_memory_cache._trials_last_fetched_at.get(study_id, None)
        if (
            trials is not None
            and last_fetched_at is not None
            and datetime.now() - last_fetched_at < timedelta(seconds=ttl_seconds)
        ):
            return trials
    trials = storage.get_all_trials(study_id, deepcopy=False)

    with in_memory_cache._trials_cache_lock:
        in_memory_cache._trials_last_fetched_at[study_id] = datetime.now()
        in_memory_cache._trials_cache[study_id] = trials
    return trials


class InMemoryCache:
    def __init__(self) -> None:
        self._cached_extra_study_property_cache: dict[int, "_CachedExtraStudyProperty"] = {}
        self._cached_extra_study_property_cache_lock = threading.Lock()
        self._trials_cache: dict[int, list[FrozenTrial]] = {}
        self._trials_cache_lock = threading.Lock()
        self._trials_last_fetched_at: dict[int, datetime] = {}

    def clear(self) -> None:
        self._cached_extra_study_property_cache.clear()
        self._trials_cache.clear()


class _CachedExtraStudyProperty:
    def __init__(self) -> None:
        self._cursor: int = -1
        self._intersection_search_space: Optional[SearchSpaceSetT] = None
        self._union_search_space: SearchSpaceSetT = set()
        self._union_user_attrs: dict[str, bool] = {}  # attr_name: is_sortable (= is_number)
        self.has_intermediate_values: bool = False

    @property
    def intersection_search_space(self) -> SearchSpaceListT:
        if self._intersection_search_space is None:
            return []
        intersection = list(self._intersection_search_space)
        intersection.sort(key=lambda x: x[0])
        return intersection

    @property
    def union_search_space(self) -> SearchSpaceListT:
        union = list(self._union_search_space)
        union.sort(key=lambda x: x[0])
        return union

    @property
    def union_user_attrs(self) -> list[tuple[str, bool]]:
        union = [(name, is_sortable) for name, is_sortable in self._union_user_attrs.items()]
        sorted(union, key=lambda x: x[0])
        return union

    def update(self, trials: list[FrozenTrial]) -> None:
        next_cursor = self._cursor
        for trial in reversed(trials):
            if self._cursor > trial.number:
                break

            if not trial.state.is_finished():
                next_cursor = trial.number

            self._update_user_attrs(trial)
            if trial.state != TrialState.FAIL:
                self._update_intermediate_values(trial)
                self._update_search_space(trial)

        self._cursor = next_cursor

    def _update_user_attrs(self, trial: FrozenTrial) -> None:
        current_user_attrs = {
            k: not isinstance(v, bool) and isinstance(v, numbers.Real)
            for k, v in trial.user_attrs.items()
        }
        for attr_name, current_is_sortable in current_user_attrs.items():
            is_sortable = self._union_user_attrs.get(attr_name)
            if is_sortable is None:
                self._union_user_attrs[attr_name] = current_is_sortable
            elif is_sortable and not current_is_sortable:
                self._union_user_attrs[attr_name] = False

    def _update_intermediate_values(self, trial: FrozenTrial) -> None:
        if not self.has_intermediate_values and len(trial.intermediate_values) > 0:
            self.has_intermediate_values = True

    def _update_search_space(self, trial: FrozenTrial) -> None:
        current = set([(n, d) for n, d in trial.distributions.items()])
        self._union_search_space = self._union_search_space.union(current)

        if self._intersection_search_space is None:
            self._intersection_search_space = copy.copy(current)
        else:
            self._intersection_search_space = self._intersection_search_space.intersection(current)
