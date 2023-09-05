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

    FeedbackMode = Literal["ChooseWorst"]
    if TYPE_CHECKING:
        from typing import TypedDict

        NewHistoryJSON = TypedDict(
            "NewHistoryJSON",
            {
                "mode": FeedbackMode,
                "candidates": list[int],
                "clicked": int,
            },
        )


@dataclass(frozen=True)
class ChooseWorstHistory:
    mode: Literal["ChooseWorst"]
    id: str
    preference_id: str  # making it possible to remove the preference
    timestamp: datetime
    candidates: list[int]  # a list of trial number
    clicked: int  # The worst trial number in the candidates.

    def to_dict(self) -> dict[str, Any]:
        return {
            "mode": self.mode,
            "id": self.id,
            "preference_id": self.preference_id,
            "timestamp": self.timestamp.isoformat(),
            "candidates": self.candidates,
            "clicked": self.clicked,
        }


History = ChooseWorstHistory


def report_history(
    study_id: int,
    storage: BaseStorage,
    input_data: NewHistoryJSON,
) -> None:
    preferences = []
    if input_data["mode"] == "ChooseWorst":
        preferences = [
            (best, input_data["clicked"])
            for best in input_data["candidates"]
            if best != input_data["clicked"]
        ]
    else:
        assert False, f"Unknown mode: {input_data['mode']}"

    preference_id = report_preferences(
        study_id=study_id,
        storage=storage,
        preferences=preferences,
    )
    history_id = str(uuid.uuid4())

    if input_data["mode"] == "ChooseWorst":
        history = ChooseWorstHistory(
            mode="ChooseWorst",
            id=history_id,
            preference_id=preference_id,
            timestamp=datetime.now(),
            candidates=input_data["candidates"],
            clicked=input_data["clicked"],
        )

    key = _SYSTEM_ATTR_PREFIX_HISTORY + history_id
    storage.set_study_system_attr(
        study_id=study_id,
        key=key,
        value=json.dumps(history.to_dict()),
    )


def serialize_preference_history(
    system_attrs: dict[str, Any],
) -> list[dict[str, Any]]:
    histories: list[History] = []
    for k, v in system_attrs.items():
        if not k.startswith(_SYSTEM_ATTR_PREFIX_HISTORY):
            continue
        choice: dict[str, Any] = json.loads(v)
        if choice["mode"] == "ChooseWorst":
            histories.append(
                ChooseWorstHistory(
                    mode="ChooseWorst",
                    id=choice["id"],
                    preference_id=choice["preference_id"],
                    timestamp=datetime.fromisoformat(choice["timestamp"]),
                    candidates=choice["candidates"],
                    clicked=choice["clicked"],
                )
            )

    histories.sort(key=lambda c: c.timestamp)
    return [history.to_dict() for history in histories]
