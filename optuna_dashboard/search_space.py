import copy
import threading
from typing import Dict, List, Optional, Set, Tuple

from optuna.distributions import BaseDistribution
from optuna.study import BaseStudy
from optuna.trial import TrialState

SearchSpaceSetT = Set[Tuple[str, BaseDistribution]]
SearchSpaceListT = List[Tuple[str, BaseDistribution]]

# In-memory search space cache
search_space_cache_lock = threading.Lock()
search_space_cache: Dict[int, "_SearchSpace"] = {}

states_of_interest = [TrialState.COMPLETE, TrialState.PRUNED]


def get_search_space(study: BaseStudy) -> Tuple[SearchSpaceListT, SearchSpaceListT]:
    with search_space_cache_lock:
        search_space = search_space_cache.get(study._study_id, None)
        if search_space is None:
            search_space = _SearchSpace()
        search_space.update(study)
        search_space_cache[study._study_id] = search_space
        return search_space.intersection, search_space.union


class _SearchSpace:
    def __init__(self) -> None:
        self._cursor: int = -1
        self._intersection: Optional[SearchSpaceSetT] = None
        self._union: SearchSpaceSetT = set()

    @property
    def intersection(self) -> SearchSpaceListT:
        if self._intersection is None:
            return []
        intersection = list(self._intersection)
        intersection.sort(key=lambda x: x[0])
        return intersection

    @property
    def union(self) -> SearchSpaceListT:
        union = list(self._union)
        union.sort(key=lambda x: x[0])
        return union

    def update(self, study: BaseStudy) -> None:
        next_cursor = self._cursor
        for trial in reversed(study.get_trials(deepcopy=False)):
            if self._cursor > trial.number:
                break

            if not trial.state.is_finished():
                next_cursor = trial.number

            if trial.state not in states_of_interest:
                continue

            current = set([(n, d) for n, d in trial.distributions.items()])
            self._union = self._union.union(current)

            if self._intersection is None:
                self._intersection = copy.copy(current)
            else:
                self._intersection = self._intersection.intersection(current)
        self._cursor = next_cursor
