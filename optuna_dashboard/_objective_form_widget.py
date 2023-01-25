from __future__ import annotations

from dataclasses import dataclass
import json
from typing import TYPE_CHECKING
from typing import Union

import optuna


if TYPE_CHECKING:
    from typing import Any
    from typing import Literal
    from typing import Optional
    from typing import TypedDict

    ChoiceWidgetJSON = TypedDict(
        "ChoiceWidgetJSON",
        {
            "type": Literal["choice"],
            "objective_name": str,
            "description": Optional[str],
            "choices": list[str],
            "values": list[float],
        },
    )
    SliderWidgetLabels = TypedDict(
        "SliderWidgetLabels",
        {"value": float, "label": str},
    )
    SliderWidgetJSON = TypedDict(
        "SliderWidgetJSON",
        {
            "type": Literal["slider"],
            "objective_name": str,
            "description": Optional[str],
            "min": float,
            "max": float,
            "step": Optional[float],
            "labels": Optional[list[SliderWidgetLabels]],
        },
    )
    TextInputWidgetJSON = TypedDict(
        "TextInputWidgetJSON",
        {"type": Literal["text"], "objective_name": str, "description": Optional[str]},
    )
    UserAttrRefJSON = TypedDict("UserAttrRefJSON", {"type": Literal["user_attr"], "key": str})


@dataclass
class ChoiceWidget:
    objective_name: str
    choices: list[str]
    values: list[float]
    description: Optional[str] = None

    def to_dict(self) -> ChoiceWidgetJSON:
        return {
            "type": "choice",
            "objective_name": self.objective_name,
            "description": self.description,
            "choices": self.choices,
            "values": self.values,
        }


@dataclass
class SliderWidget:
    objective_name: str
    min: float
    max: float
    step: Optional[float]
    labels: Optional[list[tuple[float, str]]]
    description: Optional[str] = None

    def to_dict(self) -> SliderWidgetJSON:
        return {
            "type": "slider",
            "objective_name": self.objective_name,
            "description": self.description,
            "min": self.min,
            "max": self.max,
            "step": self.step,
            "labels": self.labels,
        }


@dataclass
class TextInputWidget:
    objective_name: str
    description: Optional[str] = None

    def to_dict(self) -> TextInputWidgetJSON:
        return {
            "type": "text",
            "objective_name": self.objective_name,
            "description": self.description,
        }


@dataclass
class UserAttrRef:
    key: str

    def to_dict(self) -> UserAttrRefJSON:
        return {
            "type": "user_attr",
            "key": self.key,
        }


ObjectiveWidget = Union[ChoiceWidget, SliderWidget, TextInputWidget, UserAttrRef]
SYSTEM_ATTR_KEY = "dashboard:user_action"


def register_objective_form_widgets(study: optuna.Study, actions: list[ObjectiveWidget]):
    if len(study.directions) != len(actions):
        raise ValueError("The length of actions must be the same with the number of objectives.")
    study._storage.set_study_system_attr(study._study_id, SYSTEM_ATTR_KEY, json.dumps(actions))


def get_objective_form_widgets(
    study_system_attr: dict[str, Any]
) -> Optional[list[ObjectiveWidget]]:
    actions_json = study_system_attr.get(SYSTEM_ATTR_KEY)
    if actions_json is not None:
        return json.loads(actions_json)
