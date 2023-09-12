from __future__ import annotations

from typing import TYPE_CHECKING
from typing import Any

from optuna.storages import BaseStorage

from .preferential._study import PreferentialStudy


if TYPE_CHECKING:
    from typing import Literal

    OUTPUT_COMPONENT_TYPE = Literal["note", "artifact"]

_SYSTEM_ATTR_FEEDBACK_COMPONENT = "preference:component"


def _register_preference_feedback_component_type(
    study_id: int,
    storage: BaseStorage,
    component_type: OUTPUT_COMPONENT_TYPE,
    artifact_key: str | None = None,
) -> None:
    value: dict[str, Any] = {"type": component_type}
    if artifact_key is not None:
        value["artifact_key"] = artifact_key
    storage.set_study_system_attr(
        study_id=study_id,
        key=_SYSTEM_ATTR_FEEDBACK_COMPONENT,
        value=value,
    )


def register_preference_feedback_component_type(
    study: PreferentialStudy,
    component_type: OUTPUT_COMPONENT_TYPE,
    artifact_key: str | None = None,
) -> None:
    """Register output component to the study.

    Args:
        study:
            The study to register the output component.
        component_type:
            The type of the output component.
        artifact_key:
            When the component_type is "Artifact",
            this argument is used as the attribute key of the artifact.
            Each trial displays the artifact whose id is the value of the attribute.
    """
    if component_type == "artifact":
        assert (
            artifact_key is not None
        ), "artifact_key must be specified when component_type is Artifact"

    _register_preference_feedback_component_type(
        study_id=study._study._study_id,
        storage=study._study._storage,
        component_type=component_type,
        artifact_key=artifact_key,
    )
