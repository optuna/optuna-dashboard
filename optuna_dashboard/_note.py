import math
from typing import Any
from typing import Dict

from optuna.storages import BaseStorage


try:
    from typing import TypedDict
except ImportError:
    from typing_extensions import TypedDict

SYSTEM_ATTR_MAX_LENGTH = 2045
NOTE_VER_KEY = "dashboard:note_ver"
NOTE_STR_KEY_PREFIX = "dashboard:note_str:"

NoteType = TypedDict(
    "NoteType",
    {
        "version": int,
        "body": str,
    },
)


def get_note_from_system_attrs(system_attrs: Dict[str, Any]) -> NoteType:
    if NOTE_VER_KEY not in system_attrs:
        return {
            "version": 0,
            "body": "",
        }
    note_ver = int(system_attrs[NOTE_VER_KEY])
    note_attrs: Dict[str, str] = {
        key: value for key, value in system_attrs.items() if key.startswith(NOTE_STR_KEY_PREFIX)
    }
    return {"version": note_ver, "body": concat_body(note_attrs)}


def version_is_incremented(system_attrs: Dict[str, Any], req_note_ver: int) -> bool:
    db_note_ver = system_attrs.get(NOTE_VER_KEY, 0)
    return req_note_ver == db_note_ver + 1


def save_note(storage: BaseStorage, study_id: int, ver: int, body: str) -> None:
    storage.set_study_system_attr(study_id, NOTE_VER_KEY, ver)

    attrs = split_body(body)
    for k, v in attrs.items():
        storage.set_study_system_attr(study_id, k, v)

    # Clear previous messages
    all_note_attrs: Dict[str, str] = {
        key: value
        for key, value in storage.get_study_system_attrs(study_id).items()
        if key.startswith(NOTE_STR_KEY_PREFIX)
    }
    if len(all_note_attrs) > len(attrs):
        for i in range(len(attrs), len(all_note_attrs)):
            storage.set_study_system_attr(study_id, f"{NOTE_STR_KEY_PREFIX}{i}", "")


def split_body(note_str: str) -> Dict[str, str]:
    note_len = len(note_str)
    attrs = {}
    for i in range(math.ceil(note_len / SYSTEM_ATTR_MAX_LENGTH)):
        start = i * SYSTEM_ATTR_MAX_LENGTH
        end = min((i + 1) * SYSTEM_ATTR_MAX_LENGTH, note_len)
        attrs[f"{NOTE_STR_KEY_PREFIX}{i}"] = note_str[start:end]
    return attrs


def concat_body(note_attrs: Dict[str, str]) -> str:
    return "".join(note_attrs[f"{NOTE_STR_KEY_PREFIX}{i}"] for i in range(len(note_attrs)))
