from __future__ import annotations

from typing import Any
from typing import Optional
import warnings

import optuna


# Should be equivalent to `optuna.study.study._SYSTEM_ATTR_METRIC_NAMES`.
# See https://github.com/optuna/optuna/pull/4383 for details.
SYSTEM_ATTR_METRIC_NAMES = "study:metric_names"

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

    if hasattr(study, "set_metric_names"):
        warnings.warn(
            "`set_objective_names()` function is deprecated."
            " Please use `study.set_metric_names()` instead."
            " See https://optuna-dashboard.readthedocs.io/en/latest/errors.html for details.",
            category=FutureWarning,
        )
        study.set_metric_names(names)
        return

    storage = study._storage
    study_id = study._study_id

    directions = storage.get_study_directions(study_id)
    if len(directions) != len(names):
        raise ValueError("names must be the same length with the number of objectives.")
    storage.set_study_system_attr(study_id, SYSTEM_ATTR_NAME, names)


def get_objective_names(system_attrs: dict[str, Any]) -> Optional[list[str]]:
    if SYSTEM_ATTR_METRIC_NAMES in system_attrs:
        return system_attrs[SYSTEM_ATTR_METRIC_NAMES]
    return system_attrs.get(SYSTEM_ATTR_NAME)
