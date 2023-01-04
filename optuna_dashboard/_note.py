from __future__ import annotations

import math
from typing import Any
from typing import TYPE_CHECKING

import optuna
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


def save_study_note(study: optuna.Study, body: str) -> None:
    """Save the note (Markdown format) to the Study.

    Example:

       .. code-block:: python

          import optuna
          from optuna_dashboard import save_study_note

          study = optuna.create_study()

          note = textwrap.dedent('''\
          ## Hello

          You can *freely* take a **note** that is associated with the study.
          ''')
          save_study_note(study, note)

    """
    storage = study._storage
    study_id = study._study_id
    system_attrs = storage.get_study_system_attrs(study_id)
    next_ver = system_attrs.get(note_ver_key(None), 0) + 1
    save_note(storage, study_id, None, next_ver, body)


def save_trial_note(trial: optuna.Trial, body: str) -> None:
    """Save the note (Markdown format) to the Trial.

    Example:

       .. code-block:: python

          import optuna
          import textwrap
          from optuna_dashboard import save_trial_note

          def objective_single(trial: optuna.Trial) -> float:
              x1 = trial.suggest_float("x1", 0, 10)
              x2 = trial.suggest_float("x2", 0, 10)

              note = textwrap.dedent(f'''\
              ## Trial {trial._trial_id}

              $$
              y = (x1 - 2)^{{2}} + (x2 - 5)^{{2}} = ({x1} - 2)^{{2}} + ({x2} - 5)^{{2}}
              $$
              ''')
              save_trial_note(trial, note)
              return (x1 - 2) ** 2 + (x2 - 5) ** 2
    """
    storage = trial.storage
    trial_id = trial._trial_id
    study_id = trial.study._study_id

    system_attrs = storage.get_study_system_attrs(study_id)
    next_ver = system_attrs.get(note_ver_key(trial_id), 0) + 1
    save_note(storage, study_id, trial_id, next_ver, body)


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
