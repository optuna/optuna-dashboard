from enum import Enum
from datetime import datetime
import uuid
import json
from dataclasses import dataclass, asdict
from typing import Any
from json import JSONEncoder

from optuna.storages import BaseStorage

from ._system_attrs import report_preferences
from .._storage import get_study_summary


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
    def default(self, o):
        if isinstance(o, FeedbackMode):
            return o.name
        if isinstance(o, Choice):
            return asdict(o)
        if isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)


def report_choice(
    study_id: int,
    storage: BaseStorage,
    candidate_trials: list[int],
    preferences: list[tuple[int, int]],
    feedback_mode: FeedbackMode,
    timestamp: datetime,
):
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
