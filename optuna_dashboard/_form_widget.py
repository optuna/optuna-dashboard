from __future__ import annotations

from dataclasses import dataclass
import json
from typing import TYPE_CHECKING
from typing import Union
import warnings

import optuna
from optuna.version import __version__ as optuna_ver
from packaging import version


if TYPE_CHECKING:
    from typing import Any
    from typing import Literal
    from typing import Optional
    from typing import Sequence
    from typing import TypedDict

    ChoiceWidgetJSON = TypedDict(
        "ChoiceWidgetJSON",
        {
            "type": Literal["choice"],
            "description": Optional[str],
            "choices": list[str],
            "values": list[float],
            "user_attr_key": Optional[str],
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
            "user_attr_key": Optional[str],
        },
    )
    TextInputWidgetJSON = TypedDict(
        "TextInputWidgetJSON",
        {"type": Literal["text"], "description": Optional[str], "user_attr_key": Optional[str]},
    )
    UserAttrRefJSON = TypedDict("UserAttrRefJSON", {"type": Literal["user_attr"], "key": str})
    FormWidgetJSON = TypedDict(
        "FormWidgetJSON",
        {
            "output_type": Literal["objective", "user_attr"],
            "widgets": Sequence[
                Union[ChoiceWidgetJSON, SliderWidgetJSON, TextInputWidgetJSON, UserAttrRefJSON]
            ],
        },
    )


@dataclass
class ChoiceWidget:
    choices: list[str]
    values: list[float]
    description: Optional[str] = None
    user_attr_key: Optional[str] = None

    def to_dict(self) -> ChoiceWidgetJSON:
        return {
            "type": "choice",
            "description": self.description,
            "choices": self.choices,
            "values": self.values,
            "user_attr_key": self.user_attr_key,
        }

    @classmethod
    def _from_dict(cls, d: dict[str, Any]) -> ChoiceWidget:
        assert d.get("type") == "choice"
        return cls(
            description=d.get("description"),
            choices=d["choices"],
            values=d["values"],
            user_attr_key=d.get("user_attr_key"),
        )


@dataclass
class SliderWidget:
    min: float
    max: float
    step: Optional[float] = None
    labels: Optional[list[tuple[float, str]]] = None
    description: Optional[str] = None
    user_attr_key: Optional[str] = None

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
            "user_attr_key": self.user_attr_key,
        }

    @classmethod
    def _from_dict(cls, d: dict[str, Any]) -> SliderWidget:
        assert d.get("type") == "slider"
        labels = d.get("labels")
        if labels is not None:
            labels = [(label["value"], label["label"]) for label in labels]
        return cls(
            description=d.get("description"),
            min=d["min"],
            max=d["max"],
            step=d.get("step"),
            labels=labels,
            user_attr_key=d.get("user_attr_key"),
        )


@dataclass
class TextInputWidget:
    description: Optional[str] = None
    user_attr_key: Optional[str] = None

    def to_dict(self) -> TextInputWidgetJSON:
        return {
            "type": "text",
            "description": self.description,
            "user_attr_key": self.user_attr_key,
        }

    @classmethod
    def _from_dict(cls, d: dict[str, Any]) -> TextInputWidget:
        assert d.get("type") == "text"
        return cls(
            description=d.get("description"),
            user_attr_key=d.get("user_attr_key"),
        )


@dataclass
class ObjectiveUserAttrRef:
    key: str

    def to_dict(self) -> UserAttrRefJSON:
        return {
            "type": "user_attr",
            "key": self.key,
        }

    @classmethod
    def _from_dict(cls, d: dict[str, Any]) -> ObjectiveUserAttrRef:
        assert d.get("type") == "user_attr"
        return cls(
            key=d["key"],
        )


ObjectiveFormWidget = Union[ChoiceWidget, SliderWidget, TextInputWidget, ObjectiveUserAttrRef]
# For backward compatibility.
ObjectiveChoiceWidget = ChoiceWidget
ObjectiveSliderWidget = SliderWidget
ObjectiveTextInputWidget = TextInputWidget
FORM_WIDGETS_KEY = "dashboard:form_widgets:v2"


def dict_to_form_widget(d: dict[str, Any]) -> ObjectiveFormWidget:
    """Restore form widget objects from the dictionary.

    Args:
        d: A dictionary object.

    Returns:
        object: an instance of the restored form widget class.
    """
    widget_type = d.get("type", None)
    if widget_type == "choice":
        return ChoiceWidget._from_dict(d)
    elif widget_type == "slider":
        return SliderWidget._from_dict(d)
    elif widget_type == "text":
        return TextInputWidget._from_dict(d)
    elif widget_type == "user_attr":
        return ObjectiveUserAttrRef._from_dict(d)
    raise ValueError("Unexpected widget type")


def register_objective_form_widgets(
    study: optuna.Study, widgets: list[ObjectiveFormWidget]
) -> None:
    if version.parse(optuna_ver) < version.Version("3.2") and isinstance(
        study._storage, optuna.storages._CachedStorage
    ):
        warnings.warn(
            "Human-in-the-loop optimization will not work with _CachedStorage in Optuna prior"
            " to v3.2. See https://optuna-dashboard.readthedocs.io/en/latest/errors.html"
            " for details."
        )

    if len(study.directions) != len(widgets):
        raise ValueError("The length of actions must be the same with the number of objectives.")
    if any(
        not isinstance(w, ObjectiveUserAttrRef) and w.user_attr_key is not None for w in widgets
    ):
        warnings.warn("`user_attr_key` specified, but it will not be used.")
    form_widgets: FormWidgetJSON = {
        "output_type": "objective",
        "widgets": [w.to_dict() for w in widgets],
    }
    study._storage.set_study_system_attr(study._study_id, FORM_WIDGETS_KEY, form_widgets)


def register_user_attr_form_widgets(
    study: optuna.Study, widgets: list[ObjectiveFormWidget]
) -> None:
    if version.parse(optuna_ver) < version.Version("3.2") and isinstance(
        study._storage, optuna.storages._CachedStorage
    ):
        warnings.warn(
            "Human-in-the-loop optimization will not work with _CachedStorage in Optuna prior"
            " to v3.2. See https://optuna-dashboard.readthedocs.io/en/latest/errors.html"
            " for details."
        )

    user_attr_keys = set()
    widget_dicts: list[Union[ChoiceWidgetJSON, SliderWidgetJSON, TextInputWidgetJSON]] = []
    for w in widgets:
        if isinstance(w, ObjectiveUserAttrRef):
            raise ValueError("ObjectiveUserAttrRef can't be specified.")
        if w.user_attr_key is None:
            raise ValueError("`user_attr_key` is not specified.")
        user_attr_keys.add(w.user_attr_key)
        widget_dicts.append(w.to_dict())

    if len(widget_dicts) != len(user_attr_keys):
        raise ValueError("`user_attr_key` must be unique for each widget.")

    form_widgets: FormWidgetJSON = {
        "output_type": "user_attr",
        "widgets": widget_dicts,
    }
    study._storage.set_study_system_attr(study._study_id, FORM_WIDGETS_KEY, form_widgets)


def get_form_widgets_json(study_system_attr: dict[str, Any]) -> Optional[FormWidgetJSON]:
    if FORM_WIDGETS_KEY in study_system_attr:
        return study_system_attr[FORM_WIDGETS_KEY]

    # For optuna-dashboard v0.9.0 and v0.9.0b6 users
    if "dashboard:objective_form_widgets:v1" in study_system_attr:
        return {
            "output_type": "objective",
            "widgets": study_system_attr["dashboard:objective_form_widgets:v1"],
        }

    # For optuna-dashboard v0.9.0b5 users
    if "dashboard:objective_form_widgets" in study_system_attr:
        return {
            "output_type": "objective",
            "widgets": json.loads(study_system_attr["dashboard:objective_form_widgets"]),
        }
    return None
