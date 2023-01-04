from __future__ import annotations

from typing import Any
from typing import Optional

import optuna


SYSTEM_ATTR_NAME = "dashboard:objective_names"


def set_objective_names(study: optuna.Study, names: list[str]) -> None:
    """Set the names of objectives.

    Example:

       .. code-block:: python

          import optuna
          from optuna_dashboard import set_objective_names

          study = optuna.create_study(directions=["minimize", "minimize"])
          set_objective_names(study, ["val_loss", "flops"])
    """
    storage = study._storage
    study_id = study._study_id

    directions = storage.get_study_directions(study_id)
    if len(directions) != len(names):
        raise ValueError("names must be the same length with the number of objectives.")
    storage.set_study_system_attr(study_id, SYSTEM_ATTR_NAME, names)


def get_objective_names(system_attrs: dict[str, Any]) -> Optional[list[str]]:
    return system_attrs.get(SYSTEM_ATTR_NAME)
