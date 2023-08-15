from __future__ import annotations

import uuid

import optuna
from optuna.trial import FrozenTrial
from optuna.trial import TrialState
from optuna.storages import BaseStorage
from .._storage import get_study_summary

_SYSTEM_ATTR_PREFIX_PREFERENCE = "preference:values"


def report_preferences(
    study_id: int,
    storage: BaseStorage,
    preferences: list[tuple[int, int]], # element is number of trail
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
    for better, worse in preferences:
        for number in (better, worse):
            trial_id = trials[number]._trial_id
            if storage.check_trial_is_updatable(trial_id, trials[number].state):
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
