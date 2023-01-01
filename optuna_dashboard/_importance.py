from __future__ import annotations

import threading
from typing import TYPE_CHECKING
import warnings

from optuna.importance import BaseImportanceEvaluator
from optuna.importance import FanovaImportanceEvaluator
from optuna.importance import get_param_importances
from optuna.storages import BaseStorage
from optuna.study import Study
from optuna.trial import FrozenTrial
from optuna.trial import TrialState


try:
    from optuna_fast_fanova import FanovaImportanceEvaluator as FastFanovaImportanceEvaluator
except ModuleNotFoundError:
    FastFanovaImportanceEvaluator = None  # type: ignore
except Exception as e:
    warnings.warn(f"Failed to import optuna-fast-fanova: {e}")
    FastFanovaImportanceEvaluator = None  # type: ignore


if TYPE_CHECKING:
    from typing import TypedDict

    ImportanceType = TypedDict(
        "ImportanceType",
        {
            "name": str,
            "importance": float,
            "distribution": str,
        },
    )

param_importance_cache_lock = threading.Lock()
# { "{study_id}:{objective_id}" : (n_completed_trials, importance) }
param_importance_cache: dict[str, tuple[int, list[ImportanceType]]] = {}


class StudyWrapper(Study):
    def __init__(
        self, storage: BaseStorage, study_id: int, cached_trials: list[FrozenTrial]
    ) -> None:
        study_name = storage.get_study_name_from_id(study_id)
        super().__init__(study_name=study_name, storage=storage)
        self._cached_trials = cached_trials

    @property
    def trials(self) -> list[FrozenTrial]:
        return self._cached_trials


def get_param_importance_from_trials_cache(
    storage: BaseStorage, study_id: int, objective_id: int, trials: list[FrozenTrial]
) -> list[ImportanceType]:
    completed_trials = [t for t in trials if t.state == TrialState.COMPLETE]
    n_completed_trials = len(completed_trials)
    if n_completed_trials == 0:
        return []

    cache_key = f"{study_id}:{objective_id}"
    with param_importance_cache_lock:
        cache_n_trial, cache_importance = param_importance_cache.get(cache_key, (0, []))
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
    importance: dict[str, float], trials: list[FrozenTrial]
) -> list[ImportanceType]:
    return [
        {
            "name": name,
            "importance": importance,
            "distribution": get_distribution_name(name, trials),
        }
        for name, importance in importance.items()
    ]


def get_distribution_name(param_name: str, trials: list[FrozenTrial]) -> str:
    for trial in trials:
        if param_name in trial.distributions:
            return trial.distributions[param_name].__class__.__name__
    assert False, "Must not reach here."
