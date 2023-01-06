from __future__ import annotations

import json
from typing import Any
from typing import TYPE_CHECKING
from typing import Union

import numpy as np
from optuna.distributions import BaseDistribution
from optuna.distributions import CategoricalDistribution
from optuna.distributions import FloatDistribution
from optuna.distributions import IntDistribution
from optuna.study import StudySummary
from optuna.trial import FrozenTrial

from . import _note as note
from ._named_objectives import get_objective_names


if TYPE_CHECKING:
    from typing import Literal
    from typing import TypedDict

    Attribute = TypedDict(
        "Attribute",
        {
            "key": str,
            "value": str,
        },
    )
    AttributeSpec = TypedDict(
        "AttributeSpec",
        {
            "key": str,
            "sortable": bool,
        },
    )
    IntermediateValue = TypedDict(
        "IntermediateValue",
        {
            "step": int,
            "value": Union[float, Literal["inf", "-inf", "nan"]],
        },
    )

    FloatDistributionJSON = TypedDict(
        "FloatDistributionJSON",
        {
            "type": Literal["FloatDistribution"],
            "low": float,
            "high": float,
            "step": float,
            "log": bool,
        },
    )
    IntDistributionJSON = TypedDict(
        "IntDistributionJSON",
        {
            "type": Literal["IntDistribution"],
            "low": int,
            "high": int,
            "step": int,
            "log": bool,
        },
    )
    CategoricalDistributionChoiceJSON = TypedDict(
        "CategoricalDistributionChoiceJSON",
        {
            "pytype": str,
            "value": str,
        },
    )
    CategoricalDistributionJSON = TypedDict(
        "CategoricalDistributionJSON",
        {"choices": list[CategoricalDistributionChoiceJSON]},
    )
    DistributionJSON = Union[
        FloatDistributionJSON, IntDistributionJSON, CategoricalDistributionJSON
    ]


MAX_ATTR_LENGTH = 1024


def serialize_attrs(attrs: dict[str, Any]) -> list[Attribute]:
    serialized: list[Attribute] = []
    for k, v in attrs.items():
        value: str
        if isinstance(v, bytes):
            value = "<binary object>"
        else:
            value = json.dumps(v)
            value = value[:MAX_ATTR_LENGTH] if len(value) > MAX_ATTR_LENGTH else value
        serialized.append({"key": k, "value": value})
    return serialized


def serialize_study_summary(summary: StudySummary) -> dict[str, Any]:
    serialized = {
        "study_id": summary._study_id,
        "study_name": summary.study_name,
        "directions": [d.name.lower() for d in summary.directions],
        "user_attrs": serialize_attrs(summary.user_attrs),
        "system_attrs": serialize_attrs(getattr(summary, "system_attrs", {})),
    }

    if summary.datetime_start is not None:
        serialized["datetime_start"] = (summary.datetime_start.isoformat(),)

    return serialized


def serialize_study_detail(
    summary: StudySummary,
    best_trials: list[FrozenTrial],
    trials: list[FrozenTrial],
    intersection: list[tuple[str, BaseDistribution]],
    union: list[tuple[str, BaseDistribution]],
    union_user_attrs: list[tuple[str, bool]],
    has_intermediate_values: bool,
) -> dict[str, Any]:
    serialized: dict[str, Any] = {
        "name": summary.study_name,
        "directions": [d.name.lower() for d in summary.directions],
    }
    system_attrs = getattr(summary, "system_attrs", {})
    if summary.datetime_start is not None:
        serialized["datetime_start"] = summary.datetime_start.isoformat()

    serialized["trials"] = [
        serialize_frozen_trial(summary._study_id, trial, system_attrs) for trial in trials
    ]
    serialized["best_trials"] = [
        serialize_frozen_trial(summary._study_id, trial, system_attrs) for trial in best_trials
    ]
    serialized["intersection_search_space"] = serialize_search_space(intersection)
    serialized["union_search_space"] = serialize_search_space(union)
    serialized["union_user_attrs"] = [{"key": a[0], "sortable": a[1]} for a in union_user_attrs]
    serialized["has_intermediate_values"] = has_intermediate_values
    serialized["note"] = note.get_note_from_system_attrs(system_attrs, None)
    objective_names = get_objective_names(system_attrs)
    if objective_names:
        serialized["objective_names"] = objective_names
    return serialized


def serialize_frozen_trial(
    study_id: int, trial: FrozenTrial, study_system_attrs: dict[str, Any]
) -> dict[str, Any]:
    params = []
    for param_name, param_external_value in trial.params.items():
        distribution = trial.distributions[param_name]
        params.append(
            {
                "name": param_name,
                "param_internal_value": distribution.to_internal_repr(param_external_value),
                "param_external_value": str(param_external_value),
                "param_external_pytyp": str(type(param_external_value)),
                "distribution": serialize_distribution(distribution),
            }
        )
    serialized = {
        "trial_id": trial._trial_id,
        "study_id": study_id,
        "number": trial.number,
        "state": trial.state.name.capitalize(),
        "params": params,
        "user_attrs": serialize_attrs(trial.user_attrs),
        "system_attrs": serialize_attrs(getattr(trial, "_system_attrs", {})),
        "note": note.get_note_from_system_attrs(study_system_attrs, trial._trial_id),
    }

    serialized_intermediate_values: list[IntermediateValue] = []
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
        serialized_values: list[Union[float, Literal["inf", "-inf"]]] = []
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


def serialize_distribution(distribution: BaseDistribution) -> DistributionJSON:
    distribution = normalize_distribution(distribution)
    if isinstance(distribution, FloatDistribution):
        return {
            "type": "FloatDistribution",
            "low": distribution.low,
            "high": distribution.high,
            "step": distribution.step,
            "log": distribution.log,
        }
    if isinstance(distribution, IntDistribution):
        return {
            "type": "IntDistribution",
            "low": distribution.low,
            "high": distribution.high,
            "step": distribution.step,
            "log": distribution.log,
        }
    if isinstance(distribution, CategoricalDistribution):
        return {
            "type": "CategoricalDistribution",
            "choices": [
                {"pytype": str(type(choice)), "value": str(choice)}
                for choice in distribution.choices
            ],
        }
    raise ValueError(f"Unexpected distribution {str(distribution)}")


def normalize_distribution(distribution: BaseDistribution) -> BaseDistribution:
    if distribution.__class__.__name__ == "UniformDistribution":
        return FloatDistribution(
            low=getattr(distribution, "low"),
            high=getattr(distribution, "high"),
        )
    elif distribution.__class__.__name__ == "LogUniformDistribution":
        return FloatDistribution(
            low=getattr(distribution, "low"),
            high=getattr(distribution, "high"),
            log=True,
        )
    elif distribution.__class__.__name__ == "DiscreteUniformDistribution":
        return FloatDistribution(
            low=getattr(distribution, "low"),
            high=getattr(distribution, "high"),
            step=getattr(distribution, "q"),
        )
    elif distribution.__class__.__name__ == "IntUniformDistribution":
        return IntDistribution(
            low=getattr(distribution, "low"),
            high=getattr(distribution, "high"),
            step=getattr(distribution, "step"),
        )
    elif distribution.__class__.__name__ == "IntLogUniformDistribution":
        return IntDistribution(
            low=getattr(distribution, "low"),
            high=getattr(distribution, "high"),
            step=getattr(distribution, "step"),
            log=True,
        )
    else:
        return distribution


def serialize_search_space(
    search_space: list[tuple[str, BaseDistribution]]
) -> list[dict[str, Any]]:
    serialized = []
    for param_name, distribution in search_space:
        serialized.append(
            {
                "name": param_name,
                "distribution": serialize_distribution(distribution),
            }
        )
    return serialized
