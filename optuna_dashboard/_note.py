from __future__ import annotations

import math
from typing import Any
from typing import TYPE_CHECKING

from optuna.storages import BaseStorage


if TYPE_CHECKING:
    from typing import Optional
    from typing import TypedDict

    NoteType = TypedDict(
        "NoteType",
        {
            "version": int,
            "body": str,
        },
    )

SYSTEM_ATTR_MAX_LENGTH = 2045


def note_ver_key(trial_id: Optional[int]) -> str:
    prefix = "dashboard:note_ver"
    if trial_id is None:
        return prefix
    return f"dashboard:{trial_id}:note_ver"


def note_str_key_prefix(trial_id: Optional[int]) -> str:
    prefix = "dashboard:note_str:"
    if trial_id is None:
        return prefix
    return f"dashboard:{trial_id}:note_str:"


def get_note_from_system_attrs(system_attrs: dict[str, Any], trial_id: Optional[int]) -> NoteType:
    if note_ver_key(trial_id) not in system_attrs:
        return {
            "version": 0,
            "body": "",
        }
    note_ver = int(system_attrs[note_ver_key(trial_id)])
    note_attrs: dict[str, str] = {
        key: value
        for key, value in system_attrs.items()
        if key.startswith(note_str_key_prefix(trial_id))
    }
    return {"version": note_ver, "body": concat_body(note_attrs, trial_id)}


def version_is_incremented(
    system_attrs: dict[str, Any], trial_id: Optional[int], req_note_ver: int
) -> bool:
    db_note_ver = system_attrs.get(note_ver_key(trial_id), 0)
    return req_note_ver == db_note_ver + 1


def save_note(
    storage: BaseStorage, study_id: int, trial_id: Optional[int], ver: int, body: str
) -> None:
    storage.set_study_system_attr(study_id, note_ver_key(trial_id), ver)

    attrs = split_body(body, trial_id)
    for k, v in attrs.items():
        storage.set_study_system_attr(study_id, k, v)

    # Clear previous messages
    all_note_attrs: dict[str, str] = {
        key: value
        for key, value in storage.get_study_system_attrs(study_id).items()
        if key.startswith(note_str_key_prefix(trial_id))
    }
    if len(all_note_attrs) > len(attrs):
        for i in range(len(attrs), len(all_note_attrs)):
            storage.set_study_system_attr(study_id, f"{note_str_key_prefix(trial_id)}{i}", "")


def split_body(note_str: str, trial_id: Optional[int]) -> dict[str, str]:
    note_len = len(note_str)
    attrs = {}
    for i in range(math.ceil(note_len / SYSTEM_ATTR_MAX_LENGTH)):
        start = i * SYSTEM_ATTR_MAX_LENGTH
        end = min((i + 1) * SYSTEM_ATTR_MAX_LENGTH, note_len)
        attrs[f"{note_str_key_prefix(trial_id)}{i}"] = note_str[start:end]
    return attrs


def concat_body(note_attrs: dict[str, str], trial_id: Optional[int]) -> str:
    return "".join(
        note_attrs[f"{note_str_key_prefix(trial_id)}{i}"] for i in range(len(note_attrs))
    )
