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
            "description": Optional[str],
            "choices": list[str],
            "values": list[float],
        },
    )
    SliderWidgetLabel = TypedDict(
        "SliderWidgetLabel",
        {"value": float, "label": str},
    )
    SliderWidgetJSON = TypedDict(
        "SliderWidgetJSON",
        {
            "type": Literal["slider"],
            "description": Optional[str],
            "min": float,
            "max": float,
            "step": Optional[float],
            "labels": Optional[list[SliderWidgetLabel]],
        },
    )
    TextInputWidgetJSON = TypedDict(
        "TextInputWidgetJSON",
        {"type": Literal["text"], "description": Optional[str]},
    )
    UserAttrRefJSON = TypedDict("UserAttrRefJSON", {"type": Literal["user_attr"], "key": str})
    ObjectiveFormWidgetJSON = Union[
        ChoiceWidgetJSON, SliderWidgetJSON, TextInputWidgetJSON, UserAttrRefJSON
    ]


@dataclass
class ObjectiveChoiceWidget:
    choices: list[str]
    values: list[float]
    description: Optional[str] = None

    def to_dict(self) -> ChoiceWidgetJSON:
        return {
            "type": "choice",
            "description": self.description,
            "choices": self.choices,
            "values": self.values,
        }


@dataclass
class ObjectiveSliderWidget:
    min: float
    max: float
    step: Optional[float] = None
    labels: Optional[list[tuple[float, str]]] = None
    description: Optional[str] = None

    def to_dict(self) -> SliderWidgetJSON:
        labels: Optional[list[SliderWidgetLabel]] = None
        if self.labels is not None:
            labels = [{"value": value, "label": label} for value, label in self.labels]
        return {
            "type": "slider",
            "description": self.description,
            "min": self.min,
            "max": self.max,
            "step": self.step,
            "labels": labels,
        }


@dataclass
class ObjectiveTextInputWidget:
    description: Optional[str] = None

    def to_dict(self) -> TextInputWidgetJSON:
        return {
            "type": "text",
            "description": self.description,
        }


@dataclass
class ObjectiveUserAttrRef:
    key: str

    def to_dict(self) -> UserAttrRefJSON:
        return {
            "type": "user_attr",
            "key": self.key,
        }


ObjectiveFormWidget = Union[
    ObjectiveChoiceWidget, ObjectiveSliderWidget, ObjectiveTextInputWidget, ObjectiveUserAttrRef
]
SYSTEM_ATTR_KEY = "dashboard:objective_form_widgets"


def register_objective_form_widgets(
    study: optuna.Study, widgets: list[ObjectiveFormWidget]
) -> None:
    if len(study.directions) != len(widgets):
        raise ValueError("The length of actions must be the same with the number of objectives.")
    widget_dicts = [w.to_dict() for w in widgets]
    study._storage.set_study_system_attr(
        study._study_id, SYSTEM_ATTR_KEY, json.dumps(widget_dicts)
    )


def get_objective_form_widgets_json(
    study_system_attr: dict[str, Any]
) -> Optional[list[ObjectiveFormWidgetJSON]]:
    widgets_json = study_system_attr.get(SYSTEM_ATTR_KEY)
    if widgets_json is None:
        return None
    return json.loads(widgets_json)
