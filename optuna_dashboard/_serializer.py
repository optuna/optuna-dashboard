import json
from typing import Any
from typing import Dict
from typing import List
from typing import Tuple
from typing import Union

import numpy as np
from optuna.distributions import BaseDistribution
from optuna.study import StudySummary
from optuna.trial import FrozenTrial

from . import _note as note


try:
    from typing import Literal
    from typing import TypedDict
except ImportError:
    from typing_extensions import Literal  # type: ignore
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
        "value": Union[float, Literal["inf", "-inf", "nan"]],
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

    serialized["trials"] = [serialize_frozen_trial(summary._study_id, trial) for trial in trials]
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
        "params": [{"name": name, "value": str(value)} for name, value in trial.params.items()],
        "user_attrs": serialize_attrs(trial.user_attrs),
        "system_attrs": serialize_attrs(trial.system_attrs),
    }

    serialized_intermediate_values: List[IntermediateValue] = []
    for step, value in trial.intermediate_values.items():
        serialized_value: Union[float, Literal["nan", "inf", "-inf"]]
        if np.isnan(value):
            serialized_value = "nan"
        elif np.isposinf(value):
            serialized_value = "inf"
        elif np.isneginf(value):
            serialized_value = "-inf"
        else:
            assert np.isfinite(value)
            serialized_value = value
        serialized_intermediate_values.append({"step": step, "value": serialized_value})
    serialized["intermediate_values"] = sorted(
        serialized_intermediate_values, key=lambda v: v["step"]
    )

    if trial.values is not None:
        serialized_values: List[Union[float, Literal["inf", "-inf"]]] = []
        for v in trial.values:
            assert not np.isnan(v), "Should not detect nan value"
            if np.isposinf(v):
                serialized_values.append("inf")
            elif np.isneginf(v):
                serialized_values.append("-inf")
            else:
                serialized_values.append(v)
        serialized["values"] = serialized_values

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
