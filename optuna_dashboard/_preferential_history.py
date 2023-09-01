from __future__ import annotations

from dataclasses import dataclass
from dataclasses import field
from datetime import datetime
from typing import Any
from typing import Literal
from typing import TYPE_CHECKING
import uuid

from optuna.storages import BaseStorage

from .preferential._system_attrs import _SYSTEM_ATTR_PREFIX_PREFERENCE
from .preferential._system_attrs import get_preference
from .preferential._system_attrs import report_preferences


_SYSTEM_ATTR_PREFIX_HISTORY = "preference:history"

if TYPE_CHECKING:
    from typing import TypedDict

    NewHistoryJSON = TypedDict(
        "NewHistoryJSON",
        {
            "mode": Literal["ChooseWorst"],
            "candidates": list[int],
            "clicked": int,
        },
    )


@dataclass
class ChooseWorstHistory:
    mode: Literal["ChooseWorst"]
    uuid: str
    preference_uuid: str  # making it possible to remove the preference
    timestamp: datetime
    candidates: list[int]  # a list of trial number
    clicked: int  # The worst trial number in the candidates.
    evacuated_preference: list[tuple[int, int]] = field(default_factory=list)
    # When undo the preference, this is used. Otherwise, this must be empty.

    def to_dict(self) -> dict[str, Any]:
        return {
            "mode": self.mode,
            "uuid": self.uuid,
            "preference_uuid": self.preference_uuid,
            "timestamp": self.timestamp.isoformat(),
            "candidates": self.candidates,
            "clicked": self.clicked,
            "enabled": len(self.evacuated_preference) == 0,
            "evacuated_preference": self.evacuated_preference,
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
        value=history.to_dict(),
    )


def _load_preference_history(value: Any) -> History:
    choice: dict[str, Any] = value
    if choice["mode"] == "ChooseWorst":
        return ChooseWorstHistory(
            mode="ChooseWorst",
            uuid=choice["uuid"],
            preference_uuid=choice["preference_uuid"],
            timestamp=datetime.fromisoformat(choice["timestamp"]),
            candidates=choice["candidates"],
            clicked=choice["clicked"],
            evacuated_preference=choice["evacuated_preference"],
        )
    else:
        assert False, f"Unknown mode: {choice['mode']}"


def load_preference_history(
    uuid: str,
    system_attrs: dict[str, Any],
) -> History:
    value = system_attrs.get(_SYSTEM_ATTR_PREFIX_HISTORY + uuid, [])
    return _load_preference_history(value)


def serialize_preference_histories(
    system_attrs: dict[str, Any],
) -> list[dict[str, Any]]:
    histories: list[History] = []
    for k, v in system_attrs.items():
        if not k.startswith(_SYSTEM_ATTR_PREFIX_HISTORY):
            continue
        histories.append(_load_preference_history(v))

    histories.sort(key=lambda c: c.timestamp)
    return [history.to_dict() for history in histories]


def switching_history(study_id: int, storage: BaseStorage, uuid: str, enable: bool) -> None:
    system_attrs = storage.get_study_system_attrs(study_id)
    history = load_preference_history(uuid, system_attrs)
    preference = get_preference(study_id, storage, history.preference_uuid)
    print(history, preference, enable)
    if enable and (len(preference) > 0 or len(history.evacuated_preference) == 0):
        return
    if (not enable) and (len(preference) == 0 or len(history.evacuated_preference) > 0):
        return
    history.evacuated_preference, preference = preference, history.evacuated_preference
    print(history.to_dict(), preference)
    storage.set_study_system_attr(
        study_id=study_id,
        key=_SYSTEM_ATTR_PREFIX_HISTORY + history.uuid,
        value=history.to_dict(),
    )
    storage.set_study_system_attr(
        study_id=study_id,
        key=_SYSTEM_ATTR_PREFIX_PREFERENCE + history.preference_uuid,
        value=preference,
    )
