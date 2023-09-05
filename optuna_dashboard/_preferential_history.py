from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import json
from typing import Any
from typing import TYPE_CHECKING
import uuid

from optuna.storages import BaseStorage

from .preferential._system_attrs import report_preferences


_SYSTEM_ATTR_PREFIX_HISTORY = "preference:history"

if TYPE_CHECKING:
    from typing import Literal
    from typing import TypedDict

    FeedbackMode = Literal["ChooseWorst"]
    ChooseWorstHistory = TypedDict(
        "ChooseWorstHistory",
        {
            "mode": FeedbackMode,
            "id": str,
            "preference_id": str,
            "timestamp": str,
            "candidates": list[int],
            "clicked": int,
        },
    )
    History = ChooseWorstHistory
else:
    ChooseWorstHistory = Any
    History = Any


@dataclass
class NewHistory:
    mode: FeedbackMode
    candidates: list[int]
    clicked: int


def report_history(
    study_id: int,
    storage: BaseStorage,
    input_data: NewHistory,
) -> None:
    preferences = []
    # TODO(moririn): Use TypeGuard after adding other history types.
    if input_data.mode == "ChooseWorst":
        preferences = [
            (best, input_data.clicked)
            for best in input_data.candidates
            if best != input_data.clicked
        ]
    else:
        assert False, f"Unknown data: {input_data}"

    preference_id = report_preferences(
        study_id=study_id,
        storage=storage,
        preferences=preferences,
    )
    history_id = str(uuid.uuid4())

    if input_data.mode == "ChooseWorst":
        history: ChooseWorstHistory = {
            "mode": "ChooseWorst",
            "id": history_id,
            "preference_id": preference_id,
            "timestamp": datetime.now().isoformat(),
            "candidates": input_data.candidates,
            "clicked": input_data.clicked,
        }

    key = _SYSTEM_ATTR_PREFIX_HISTORY + history_id
    storage.set_study_system_attr(
        study_id=study_id,
        key=key,
        value=json.dumps(history),
    )
