from __future__ import annotations

from dataclasses import asdict
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
import json
from json import JSONEncoder
from typing import Any
import uuid

from optuna.storages import BaseStorage

from ._system_attrs import report_preferences


_SYSTEM_ATTR_PREFIX_HISTORY = "preference:history"


class FeedbackMode(Enum):
    CHOOSE_WORST = 0
    AUTO = 10


@dataclass
class Choice:
    uuid: str
    candidate_trials: list[int]
    preference_uuid: str
    feedback_mode: FeedbackMode
    timestamp: datetime


class Encoder(JSONEncoder):
    def default(self, a: Any) -> Any:
        if isinstance(a, FeedbackMode):
            return a.name
        if isinstance(a, Choice):
            return asdict(a)
        if isinstance(a, datetime):
            return a.isoformat()
        return super().default(a)


def report_choice(
    study_id: int,
    storage: BaseStorage,
    candidate_trials: list[int],
    preferences: list[tuple[int, int]],
    feedback_mode: FeedbackMode,
    timestamp: datetime,
) -> None:
    choice = Choice(
        uuid=str(uuid.uuid4()),
        candidate_trials=candidate_trials,
        preference_uuid=report_preferences(study_id, storage, preferences),
        feedback_mode=feedback_mode,
        timestamp=timestamp,
    )
    key = _SYSTEM_ATTR_PREFIX_HISTORY + choice.uuid
    storage.set_study_system_attr(
        study_id=study_id,
        key=key,
        value=json.dumps(choice, cls=Encoder),
    )
