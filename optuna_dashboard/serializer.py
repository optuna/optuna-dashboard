import json
from typing import Any, Dict, List

from optuna.study import StudySummary
from optuna.trial import FrozenTrial


def serialize_attrs(attrs: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [{"key": k, "value": json.dumps(v)} for k, v in attrs.items()]


def serialize_intermediate_values(values: Dict[int, float]) -> List[Dict[int, float]]:
    return [{"step": step, "value": value} for step, value in values.items()]


def serialize_trial_params(params: Dict[str, Any]) -> List[Dict[str, str]]:
    return [{"name": name, "value": str(value)} for name, value in params.items()]


def serialize_study_summary(summary: StudySummary) -> Dict[str, Any]:
    serialized = {
        "study_id": summary._study_id,
        "study_name": summary.study_name,
        "direction": summary.direction.name.lower(),
        "user_attrs": serialize_attrs(summary.user_attrs),
        "system_attrs": serialize_attrs(summary.system_attrs),
    }

    if summary.datetime_start is not None:
        serialized["datetime_start"] = (summary.datetime_start.isoformat(),)

    if summary.best_trial:  # Make undefined if None
        serialized["best_trial"] = serialize_frozen_trial(
            summary._study_id, summary.best_trial
        )

    return serialized


def serialize_study_detail(
    summary: StudySummary, trials: List[FrozenTrial]
) -> Dict[str, Any]:
    serialized = {
        "name": summary.study_name,
        "direction": summary.direction.name.lower(),
    }
    if summary.datetime_start is not None:
        serialized["datetime_start"] = summary.datetime_start.isoformat()

    if summary.best_trial is not None:
        serialized["best_trial"] = serialize_frozen_trial(
            summary._study_id, summary.best_trial
        )

    serialized["trials"] = [
        serialize_frozen_trial(summary._study_id, trial) for trial in trials
    ]
    return serialized


def serialize_frozen_trial(study_id: int, trial: FrozenTrial) -> Dict[str, Any]:
    serialized = {
        "trial_id": trial._trial_id,
        "study_id": study_id,
        "number": trial.number,
        "state": trial.state.name.capitalize(),
        "intermediate_values": serialize_intermediate_values(trial.intermediate_values),
        "datetime_start": trial.datetime_start.isoformat(),
        "params": serialize_trial_params(trial.params),
        "user_attrs": serialize_attrs(trial.user_attrs),
        "system_attrs": serialize_attrs(trial.system_attrs),
    }

    if trial.value is not None:  # Make undefined if None
        serialized["value"] = trial.value

    if trial.datetime_complete is not None:  # Make undefined if None
        serialized["datetime_complete"] = trial.datetime_complete.isoformat()

    return serialized
