import threading
from typing import Dict
from typing import List

from optuna.trial import FrozenTrial
from optuna.trial import TrialState


# In-memory cache
intermediate_values_cache_lock = threading.Lock()
intermediate_values_cache: Dict[int, "_IntermediateValues"] = {}
states_of_interest = [TrialState.COMPLETE, TrialState.PRUNED]


def has_intermediate_values(study_id: int, trials: List[FrozenTrial]) -> bool:
    with intermediate_values_cache_lock:
        intermediate_values = intermediate_values_cache.get(study_id, None)
        if intermediate_values is None:
            intermediate_values = _IntermediateValues()
        intermediate_values.update(trials)
        intermediate_values_cache[study_id] = intermediate_values
        return intermediate_values.has_intermediate_values


class _IntermediateValues:
    def __init__(self) -> None:
        self._cursor: int = -1
        self.has_intermediate_values: bool = False

    def update(self, trials: List[FrozenTrial]) -> None:
        if self.has_intermediate_values:
            return

        next_cursor = self._cursor
        for trial in reversed(trials):
            if self._cursor > trial.number:
                break

            if not trial.state.is_finished():
                next_cursor = trial.number

            if trial.state not in states_of_interest:
                continue

            current = len(trial.intermediate_values) > 0
            if current:
                self.has_intermediate_values = True
                return
        self._cursor = next_cursor
