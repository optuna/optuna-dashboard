import json
import math
from typing import Any
from typing import Dict
from typing import List
from typing import Tuple
from typing import Union

from optuna.distributions import BaseDistribution
from optuna.study import StudySummary
from optuna.trial import FrozenTrial

from . import _note as note


try:
    from typing import TypedDict
except ImportError:
    from typing_extensions import TypedDict


MAX_ATTR_LENGTH = 1024
Attribute = TypedDict(
    "Attribute",
    {
        "key": str,
        "value": str,
    },
)
IntermediateValue = TypedDict(
    "IntermediateValue",
    {
        "step": int,
        "value": Union[float, str],
    },
)
TrialParam = TypedDict(
    "TrialParam",
    {
        "name": str,
        "value": str,
    },
)


def serialize_attrs(attrs: Dict[str, Any]) -> List[Attribute]:
    serialized: List[Attribute] = []
    for k, v in attrs.items():
        value: str
        if isinstance(v, bytes):
            value = "<binary object>"
        else:
            value = json.dumps(v)
            value = value[:MAX_ATTR_LENGTH] if len(value) > MAX_ATTR_LENGTH else value
        serialized.append({"key": k, "value": value})
    return serialized


def serialize_intermediate_values(values: Dict[int, float]) -> List[IntermediateValue]:
    return [
        {"step": step, "value": "inf" if math.isinf(value) else value}
        for step, value in values.items()
    ]


def serialize_trial_params(params: Dict[str, Any]) -> List[TrialParam]:
    return [{"name": name, "value": str(value)} for name, value in params.items()]


def serialize_study_summary(summary: StudySummary) -> Dict[str, Any]:
    serialized = {
        "study_id": summary._study_id,
        "study_name": summary.study_name,
        "directions": [d.name.lower() for d in summary.directions],
        "user_attrs": serialize_attrs(summary.user_attrs),
        "system_attrs": serialize_attrs(summary.system_attrs),
    }

    if summary.datetime_start is not None:
        serialized["datetime_start"] = (summary.datetime_start.isoformat(),)

    if summary.best_trial:
        serialized["best_trial"] = serialize_frozen_trial(
            summary._study_id, summary.best_trial
        )

    return serialized


def serialize_study_detail(
    summary: StudySummary,
    trials: List[FrozenTrial],
    intersection: List[Tuple[str, BaseDistribution]],
    union: List[Tuple[str, BaseDistribution]],
    has_intermediate_values: bool,
) -> Dict[str, Any]:
    serialized: Dict[str, Any] = {
        "name": summary.study_name,
        "directions": [d.name.lower() for d in summary.directions],
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

    serialized["intersection_search_space"] = serialize_search_space(intersection)
    serialized["union_search_space"] = serialize_search_space(union)
    serialized["has_intermediate_values"] = has_intermediate_values
    serialized["note"] = note.get_note_from_system_attrs(summary.system_attrs)
    return serialized


def serialize_frozen_trial(study_id: int, trial: FrozenTrial) -> Dict[str, Any]:
    serialized = {
        "trial_id": trial._trial_id,
        "study_id": study_id,
        "number": trial.number,
        "state": trial.state.name.capitalize(),
        "intermediate_values": serialize_intermediate_values(trial.intermediate_values),
        "params": serialize_trial_params(trial.params),
        "user_attrs": serialize_attrs(trial.user_attrs),
        "system_attrs": serialize_attrs(trial.system_attrs),
    }

    if trial.values is not None:
        serialized["values"] = ["inf" if math.isinf(v) else v for v in trial.values]

    if trial.datetime_start is not None:
        serialized["datetime_start"] = trial.datetime_start.isoformat()

    if trial.datetime_complete is not None:
        serialized["datetime_complete"] = trial.datetime_complete.isoformat()

    return serialized


def serialize_search_space(
    search_space: List[Tuple[str, BaseDistribution]]
) -> List[Dict[str, Any]]:
    serialized = []
    for param_name, distribution in search_space:
        serialized.append(
            {
                "name": param_name,
                "distribution": distribution.__class__.__name__,
                "attributes": distribution._asdict(),
            }
        )
    return serialized
