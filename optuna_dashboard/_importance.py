import threading
from typing import Dict
from typing import List
from typing import Tuple

from optuna.importance import BaseImportanceEvaluator
from optuna.importance import FanovaImportanceEvaluator
from optuna.importance import get_param_importances
from optuna.storages import BaseStorage
from optuna.study import Study
from optuna.trial import FrozenTrial
from optuna.trial import TrialState


try:
    from typing import TypedDict
except ImportError:
    from typing_extensions import TypedDict

try:
    from optuna_fast_fanova import FanovaImportanceEvaluator as FastFanovaImportanceEvaluator
except ImportError:
    FastFanovaImportanceEvaluator = None  # type: ignore


ImportanceItemType = TypedDict(
    "ImportanceItemType",
    {
        "name": str,
        "importance": float,
        "distribution": str,
    },
)
ImportanceType = TypedDict(
    "ImportanceType",
    {
        "target_name": str,
        "param_importances": List[ImportanceItemType],
    },
)

target_name = "Objective Value"
param_importance_cache_lock = threading.Lock()
# { "{study_id}:{objective_id}" : (n_completed_trials, importance) }
param_importance_cache: Dict[str, Tuple[int, ImportanceType]] = {}


class StudyWrapper(Study):
    def __init__(
        self, storage: BaseStorage, study_id: int, cached_trials: List[FrozenTrial]
    ) -> None:
        study_name = storage.get_study_name_from_id(study_id)
        super().__init__(study_name=study_name, storage=storage)
        self._cached_trials = cached_trials

    @property
    def trials(self) -> List[FrozenTrial]:
        return self._cached_trials


def get_param_importance_from_trials_cache(
    storage: BaseStorage, study_id: int, objective_id: int, trials: List[FrozenTrial]
) -> ImportanceType:
    completed_trials = [t for t in trials if t.state == TrialState.COMPLETE]
    n_completed_trials = len(completed_trials)
    if n_completed_trials == 0:
        return {"target_name": target_name, "param_importances": []}

    cache_key = f"{study_id}:{objective_id}"
    with param_importance_cache_lock:
        cache_n_trial, cache_importance = param_importance_cache.get(
            cache_key, (0, {"target_name": target_name, "param_importances": []})
        )
        if n_completed_trials == cache_n_trial:
            return cache_importance

        study = StudyWrapper(storage, study_id, trials)

        evaluator: BaseImportanceEvaluator
        if FastFanovaImportanceEvaluator is not None:
            evaluator = FastFanovaImportanceEvaluator(completed_trials=completed_trials)
        else:
            evaluator = FanovaImportanceEvaluator()
        importance = get_param_importances(
            study,
            target=lambda t: t.values[objective_id],
            evaluator=evaluator,
        )
        converted = convert_to_importance_type(importance, trials)
        param_importance_cache[cache_key] = (n_completed_trials, converted)
    return converted


def convert_to_importance_type(
    importance: Dict[str, float], trials: List[FrozenTrial]
) -> ImportanceType:
    return {
        "target_name": target_name,
        "param_importances": [
            {
                "name": name,
                "importance": importance,
                "distribution": get_distribution_name(name, trials),
            }
            for name, importance in importance.items()
        ],
    }


def get_distribution_name(param_name: str, trials: List[FrozenTrial]) -> str:
    for trial in trials:
        if param_name in trial.distributions:
            return trial.distributions[param_name].__class__.__name__
    assert False, "Must not reach here."
