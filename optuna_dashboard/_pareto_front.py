# This code is taken from the below to keep support for older versions.
# https://github.com/optuna/optuna/blob/v3.0.5/optuna/study/_multi_objective.py

from __future__ import annotations

from typing import Optional
from typing import Sequence

from optuna.study._study_direction import StudyDirection
from optuna.trial import FrozenTrial
from optuna.trial import TrialState
from optuna_dashboard._serializer import CONSTRAINTS_KEY


def _get_feasible_trials(trials: Sequence[FrozenTrial]) -> List[FrozenTrial]:
    trials = [trial for trial in trials if trial.state == TrialState.COMPLETE]
    feasible_trials = []
    for trial in trials:
        constraints = trial.system_attrs.get(CONSTRAINTS_KEY)
        if constraints is None or all([x <= 0.0 for x in constraints]):
            feasible_trials.append(trial)
    return feasible_trials


def get_pareto_front_trials(
    trials: Sequence[FrozenTrial], directions: Sequence[StudyDirection]
) -> list[FrozenTrial]:
    if len(directions) == 2:
        return _get_pareto_front_trials_2d(trials, directions)  # Log-linear in number of trials.
    return _get_pareto_front_trials_nd(trials, directions)  # Quadratic in number of trials.


def _get_pareto_front_trials_2d(
    trials: Sequence[FrozenTrial], directions: Sequence[StudyDirection]
) -> list[FrozenTrial]:
    trials = _get_feasible_trials(trials)

    n_trials = len(trials)
    if n_trials == 0:
        return []

    trials.sort(
        key=lambda trial: (
            _normalize_value(trial.values[0], directions[0]),
            _normalize_value(trial.values[1], directions[1]),
        ),
    )

    last_nondominated_trial = trials[0]
    pareto_front = [last_nondominated_trial]
    for i in range(1, n_trials):
        trial = trials[i]
        if _dominates(last_nondominated_trial, trial, directions):
            continue
        pareto_front.append(trial)
        last_nondominated_trial = trial

    pareto_front.sort(key=lambda trial: trial.number)
    return pareto_front


def _get_pareto_front_trials_nd(
    trials: Sequence[FrozenTrial], directions: Sequence[StudyDirection]
) -> list[FrozenTrial]:
    pareto_front = []
    trials = _get_feasible_trials(trials)

    # TODO(vincent): Optimize (use the fast non dominated sort defined in the NSGA-II paper).
    for trial in trials:
        dominated = False
        for other in trials:
            if _dominates(other, trial, directions):
                dominated = True
                break

        if not dominated:
            pareto_front.append(trial)

    return pareto_front


def _dominates(
    trial0: FrozenTrial, trial1: FrozenTrial, directions: Sequence[StudyDirection]
) -> bool:
    values0 = trial0.values
    values1 = trial1.values

    assert values0 is not None
    assert values1 is not None

    if len(values0) != len(values1):
        raise ValueError("Trials with different numbers of objectives cannot be compared.")

    if len(values0) != len(directions):
        raise ValueError(
            "The number of the values and the number of the objectives are mismatched."
        )

    if trial0.state != TrialState.COMPLETE:
        return False

    if trial1.state != TrialState.COMPLETE:
        return True

    normalized_values0 = [_normalize_value(v, d) for v, d in zip(values0, directions)]
    normalized_values1 = [_normalize_value(v, d) for v, d in zip(values1, directions)]

    if normalized_values0 == normalized_values1:
        return False

    return all(v0 <= v1 for v0, v1 in zip(normalized_values0, normalized_values1))


def _normalize_value(value: Optional[float], direction: StudyDirection) -> float:
    if value is None:
        value = float("inf")

    if direction is StudyDirection.MAXIMIZE:
        value = -value

    return value
