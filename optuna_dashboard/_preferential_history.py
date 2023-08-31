from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import json
from typing import Any
from typing import Literal
from typing import TYPE_CHECKING
import uuid

from optuna.storages import BaseStorage

from .preferential._system_attrs import _SYSTEM_ATTR_PREFIX_PREFERENCE
from .preferential._system_attrs import report_preferences


_SYSTEM_ATTR_PREFIX_HISTORY = "preference:history"

if TYPE_CHECKING:
    from typing import TypedDict

    NewChooseWorstHistoryJSON = TypedDict(
        "NewChooseWorstHistoryJSON",
        {
            "mode": Literal["ChooseWorst"],
            "candidates": list[int],
            "clicked": int,
        },
    )

    NewHistoryJSON = NewChooseWorstHistoryJSON


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

    def to_response(self, system_attrs: dict[str, Any]) -> dict[str, Any]:
        return {
            "uuid": self.uuid,
            "preferences": system_attrs.get(
                _SYSTEM_ATTR_PREFIX_PREFERENCE + self.preference_uuid, []
            ),
            "timestamp": self.timestamp.isoformat(),
            "candidates": self.candidates,
            "clicked": self.clicked,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> ChooseWorstHistory:
        return ChooseWorstHistory(
            mode="ChooseWorst",
            uuid=d["uuid"],
            preference_uuid=d["preference_uuid"],
            timestamp=datetime.fromisoformat(d["timestamp"]),
            candidates=d["candidates"],
            clicked=d["clicked"],
        )

    @classmethod
    def create(cls, study_id: int, storage: BaseStorage, d: NewHistoryJSON) -> ChooseWorstHistory:
        preferences = [(best, d["clicked"]) for best in d["candidates"] if best != d["clicked"]]
        preference_uuid = report_preferences(
            study_id=study_id,
            storage=storage,
            preferences=preferences,
        )
        return ChooseWorstHistory(
            mode="ChooseWorst",
            uuid=str(uuid.uuid4()),
            preference_uuid=preference_uuid,
            timestamp=datetime.now(),
            candidates=d["candidates"],
            clicked=d["clicked"],
        )


History = ChooseWorstHistory


def report_history(
    study_id: int,
    storage: BaseStorage,
    history: History,
) -> None:
    key = _SYSTEM_ATTR_PREFIX_HISTORY + history.uuid
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
            histories.append(ChooseWorstHistory.from_dict(choice))
        else:
            assert False

    histories.sort(key=lambda c: c.timestamp)
    return [history.to_response(system_attrs) for history in histories]
