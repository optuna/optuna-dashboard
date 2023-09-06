from __future__ import annotations

from typing import Any
import uuid

from optuna.storages import BaseStorage
from optuna.trial import TrialState


_SYSTEM_ATTR_PREFIX_PREFERENCE = "preference:values"
_SYSTEM_ATTR_PREFIX_SKIP_TRIAL = "preference:skip_trial:"
_SYSTEM_ATTR_N_GENERATE = "preference:n_generate"


def report_preferences(
    study_id: int,
    storage: BaseStorage,
    preferences: list[tuple[int, int]],
) -> str:
    preference_id = str(uuid.uuid4())
    key = _SYSTEM_ATTR_PREFIX_PREFERENCE + preference_id
    storage.set_study_system_attr(
        study_id=study_id,
        key=key,
        value=preferences,
    )
    trials = storage.get_all_trials(study_id, deepcopy=False)
    directions = storage.get_study_directions(study_id)
    values = [0 for _ in directions]
    updated_trials = {num for tpl in preferences for num in tpl}
    for number in updated_trials:
        trial_id = trials[number]._trial_id
        if trials[number].state != TrialState.COMPLETE:
            storage.set_trial_state_values(trial_id, TrialState.COMPLETE, values)
    return preference_id


def get_preferences(
    study_id: int,
    storage: BaseStorage,
) -> list[tuple[int, int]]:
    preferences: list[tuple[int, int]] = []
    system_attrs = storage.get_study_system_attrs(study_id)
    for k, v in system_attrs.items():
        if not k.startswith(_SYSTEM_ATTR_PREFIX_PREFERENCE):
            continue
        preferences.extend(v)  # type: ignore
    return preferences


def report_skip(
    study_id: int,
    trial_id: int,
    storage: BaseStorage,
) -> None:
    storage.set_study_system_attr(
        study_id=study_id,
        key=_SYSTEM_ATTR_PREFIX_SKIP_TRIAL + str(trial_id),
        value=True,
    )


def is_skipped_trial(trial_id: int, study_system_attrs: dict[str, Any]) -> bool:
    key = _SYSTEM_ATTR_PREFIX_SKIP_TRIAL + str(trial_id)
    return key in study_system_attrs


def get_n_generate(study_system_attrs: dict[str, Any]) -> int:
    return study_system_attrs[_SYSTEM_ATTR_N_GENERATE]


def set_n_generate(study_id: int, storage: BaseStorage, n_generate: int) -> None:
    storage.set_study_system_attr(
        study_id=study_id,
        key=_SYSTEM_ATTR_N_GENERATE,
        value=n_generate,
    )
