from __future__ import annotations

import uuid

from optuna.storages import BaseStorage
from optuna.trial import TrialState

from .._storage import get_study_summary


_SYSTEM_ATTR_PREFIX_PREFERENCE = "preference:values"
_SYSTEM_ATTR_PREFIX_SKIP_TRIAL = "preference:skip_trial:"


def report_preferences(
    study_id: int,
    storage: BaseStorage,
    preferences: list[tuple[int, int]],
) -> None:
    key = _SYSTEM_ATTR_PREFIX_PREFERENCE + str(uuid.uuid4())
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


def get_preferences(
    study_id: int,
    storage: BaseStorage,
) -> list[tuple[int, int]]:
    preferences: list[tuple[int, int]] = []
    summary = get_study_summary(storage, study_id)
    system_attrs = getattr(summary, "system_attrs", {})
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
    trial_number = storage.get_trial(trial_id).number
    storage.set_study_system_attr(
        study_id=study_id,
        key=_SYSTEM_ATTR_PREFIX_SKIP_TRIAL + str(trial_number),
        value=True,
    )


def get_skiped_trials(
    study_id: int,
    storage: BaseStorage,
) -> list[int]:
    """Get trial numbers that have skip flag."""
    skiped_trials: list[int] = []
    summary = get_study_summary(storage, study_id)
    system_attrs = getattr(summary, "system_attrs", {})
    for k, v in system_attrs.items():
        if not k.startswith(_SYSTEM_ATTR_PREFIX_SKIP_TRIAL):
            continue
        skiped_trials.append(int(k.split(":")[-1]))
    return skiped_trials
