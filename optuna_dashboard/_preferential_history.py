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
    from typing import TypedDict
    from typing import Literal

    NewHistoryJSON = TypedDict(
        "NewHistoryJSON",
        {
            "mode": Literal["ChooseWorst"],
            "candidates": list[int],
            "clicked": int,
        },
    )


@dataclass(frozen=True)
class ChooseWorstHistory:
    mode: Literal["ChooseWorst"]
    uuid: str
    preference_uuid: str  # making it possible to remove the preference
    timestamp: datetime
    candidates: list[int]  # a list of trial number
    clicked: int  # The worst trial number in the candidates.

    def to_dict(self) -> dict[str, Any]:
        return {
            "mode": self.mode,
            "uuid": self.uuid,
            "preference_uuid": self.preference_uuid,
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

    preference_uuid = report_preferences(
        study_id=study_id,
        storage=storage,
        preferences=preferences,
    )
    history_uuid = str(uuid.uuid4())

    if input_data["mode"] == "ChooseWorst":
        history = ChooseWorstHistory(
            mode="ChooseWorst",
            uuid=history_uuid,
            preference_uuid=preference_uuid,
            timestamp=datetime.now(),
            candidates=input_data["candidates"],
            clicked=input_data["clicked"],
        )

    key = _SYSTEM_ATTR_PREFIX_HISTORY + history_uuid
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
                    uuid=choice["uuid"],
                    preference_uuid=choice["preference_uuid"],
                    timestamp=datetime.fromisoformat(choice["timestamp"]),
                    candidates=choice["candidates"],
                    clicked=choice["clicked"],
                )
            )
        else:
            assert False, f"Unknown mode: {choice['mode']}"

    histories.sort(key=lambda c: c.timestamp)
    return [history.to_dict() for history in histories]
