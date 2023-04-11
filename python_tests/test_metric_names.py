from __future__ import annotations

import unittest

import optuna
from optuna.version import __version__ as optuna_ver
from optuna_dashboard._named_objectives import get_objective_names
from packaging import version


class MetricNamesTestCase(unittest.TestCase):
    @unittest.skipIf(
        version.parse(optuna_ver) < version.Version("3.2.0.dev"),
        "study.set_metric_names() is not implemented yet",
    )
    def test_get_metric_names(self) -> None:
        study = optuna.create_study(directions=["minimize", "minimize"])
        # TODO(c-bata): Remove the following `type: ignore` after released Optuna v3.2.
        study.set_metric_names(["val_loss", "flops"])  # type: ignore

        study_system_attrs = study._storage.get_study_system_attrs(study._study_id)
        metric_names = get_objective_names(study_system_attrs)

        assert metric_names == ["val_loss", "flops"]
