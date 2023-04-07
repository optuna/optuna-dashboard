from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from optuna.storages import BaseStorage


if TYPE_CHECKING:
    from typing import Any
    from typing import Container
    from typing import Optional
    from typing import Sequence

    from optuna.distributions import BaseDistribution
    from optuna.study import StudyDirection
    from optuna.study._frozen import FrozenStudy
    from optuna.trial import FrozenTrial
    from optuna.trial import TrialState


_logger = logging.getLogger(__name__)


def _get_study_system_attr_key_to_values(trial_id: int) -> str:
    return f"objective_values:{trial_id}"


class EditableObjectiveValueStorage(BaseStorage):
    """A storage middleware that allows for updating the objective values of finished trials.

    This class extends a given `backend` storage object and adds the capability to update the
    objective values of finished trials via the `set_trial_state_values` method.

    Args:
        backend: The backend BaseStorage object.
    """

    def __init__(self, backend: BaseStorage) -> None:
        self._backend = backend
        self._trial_id_to_study_id = {}

    def create_new_study(
        self, directions: Sequence[StudyDirection], study_name: Optional[str] = None
    ) -> int:
        return self._backend.create_new_study(directions, study_name=study_name)

    def delete_study(self, study_id: int) -> None:
        return self._backend.delete_study(study_id)

    def set_study_user_attr(self, study_id: int, key: str, value: Any) -> None:
        return self._backend.set_study_user_attr(study_id, key, value)

    def set_study_system_attr(self, study_id: int, key: str, value: Any) -> None:
        return self._backend.set_study_system_attr(study_id, key, value)

    def get_study_id_from_name(self, study_name: str) -> int:
        return self._backend.get_study_id_from_name(study_name)

    def get_study_name_from_id(self, study_id: int) -> str:
        return self._backend.get_study_name_from_id(study_id)

    def get_study_directions(self, study_id: int) -> list[StudyDirection]:
        return self._backend.get_study_directions(study_id)

    def get_study_user_attrs(self, study_id: int) -> dict[str, Any]:
        return self._backend.get_study_user_attrs(study_id)

    def get_study_system_attrs(self, study_id: int) -> dict[str, Any]:
        return self._backend.get_study_system_attrs(study_id)

    def get_all_studies(self) -> list[FrozenStudy]:
        return self._backend.get_all_studies()

    def create_new_trial(self, study_id: int, template_trial: Optional[FrozenTrial] = None) -> int:
        trial_id = self._backend.create_new_trial(study_id, template_trial=template_trial)
        self._trial_id_to_study_id[trial_id] = study_id
        return trial_id

    def set_trial_param(
        self,
        trial_id: int,
        param_name: str,
        param_value_internal: float,
        distribution: BaseDistribution,
    ) -> None:
        return self._backend.set_trial_param(
            trial_id, param_name, param_value_internal, distribution
        )

    def set_trial_state_values(
        self, trial_id: int, state: TrialState, values: Optional[Sequence[float]] = None
    ) -> bool:
        try:
            return self._backend.set_trial_state_values(trial_id, state, values)
        except RuntimeError:
            if trial_id in self._trial_id_to_study_id:
                study_id = self._trial_id_to_study_id[trial_id]
                self._set_trial_values_in_study_system_attrs(study_id, trial_id, list(values))
                _logger.debug(f"Update objective values of a finished trial(trial_id={trial_id})")
                return False
            else:
                raise

    def set_trial_intermediate_value(
        self, trial_id: int, step: int, intermediate_value: float
    ) -> None:
        return self._backend.set_trial_intermediate_value(trial_id, step, intermediate_value)

    def set_trial_user_attr(self, trial_id: int, key: str, value: Any) -> None:
        return self._backend.set_trial_user_attr(trial_id, key, value)

    def set_trial_system_attr(self, trial_id: int, key: str, value: Any) -> None:
        return self._backend.set_trial_system_attr(trial_id, key, value)

    def get_trial(self, trial_id: int) -> FrozenTrial:
        trial = self._backend.get_trial(trial_id)

        if trial.state.is_finished() and trial_id in self._trial_id_to_study_id:
            study_id = self._trial_id_to_study_id[trial_id]
            study_system_attrs = self._backend.get_study_system_attrs(study_id)
            self._update_objective_value(trial, study_system_attrs)
        return trial

    def get_all_trials(
        self, study_id: int, deepcopy: bool = True, states: Optional[Container[TrialState]] = None
    ) -> list[FrozenTrial]:
        study_system_attrs = self._backend.get_study_system_attrs(study_id)

        # Here, we can set deepcopy=True although self._update_objective_value() updates
        # trial.values.
        trials = self._backend.get_all_trials(study_id, deepcopy=deepcopy, states=states)
        for trial in trials:
            self._trial_id_to_study_id[trial._trial_id] = study_id
            self._update_objective_value(trial, study_system_attrs)
        return trials

    def _set_trial_values_in_study_system_attrs(
        self, study_id: int, trial_id: int, values: list[float]
    ) -> None:
        key = _get_study_system_attr_key_to_values(trial_id)
        self._backend.set_study_system_attr(study_id, key=key, value=values)

    def _update_objective_value(
        self, trial: FrozenTrial, study_system_attrs: dict[str, Any]
    ) -> None:
        if not trial.state.is_finished():
            return

        key = _get_study_system_attr_key_to_values(trial._trial_id)
        values = study_system_attrs.get(key)
        if values:
            trial.values = values
