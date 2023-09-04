from __future__ import annotations

from typing import TYPE_CHECKING

from optuna.storages import BaseStorage

from .preferential._study import PreferentialStudy


if TYPE_CHECKING:
    from typing import Literal

    OUTPUT_COMPONENT_TYPE = Literal["Note", "Artifact"]

_SYSTEM_ATTR_FEEDBACK_COMPONENT_TYPE = "preference:component_type"
_SYSTEM_ATTR_FEEDBACK_ARTIFACT_KEY = "preference:component_artifact_key"


def _register_output_component(
    study_id: int,
    storage: BaseStorage,
    component_type: OUTPUT_COMPONENT_TYPE,
    artifact_key: str | None = None,
) -> None:
    storage.set_study_system_attr(
        study_id=study_id,
        key=_SYSTEM_ATTR_FEEDBACK_COMPONENT_TYPE,
        value=component_type,
    )
    if artifact_key is not None:
        storage.set_study_system_attr(
            study_id=study_id,
            key=_SYSTEM_ATTR_FEEDBACK_ARTIFACT_KEY,
            value=artifact_key,
        )


def register_output_component(
    study: PreferentialStudy,
    component_type: OUTPUT_COMPONENT_TYPE,
    artifact_key: str = "",
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
    _register_output_component(
        study_id=study._study._study_id,
        storage=study._study._storage,
        component_type=component_type,
        artifact_key=artifact_key,
    )
