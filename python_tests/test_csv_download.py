from __future__ import annotations

from typing import Any

import optuna
from optuna.trial import TrialState
from optuna_dashboard._app import create_app
from packaging import version
import pytest

from .wsgi_client import send_request


if version.parse(optuna.__version__) < version.parse("3.2.0"):
    pytest.skip("Study.metrics_name is introduced at v3.2.0", allow_module_level=True)


def _validate_output(
    storage: optuna.storages.BaseStorage,
    correct_status: int,
    study_id: int,
    expect_no_result: bool = False,
    extra_col_names: list[str] | None = None,
) -> None:
    app = create_app(storage)
    status, _, body = send_request(
        app,
        f"/csv/{study_id}",
        "GET",
        content_type="application/json",
    )
    assert status == correct_status
    decoded_csv = str(body.decode("utf-8"))
    if expect_no_result:
        assert "is not found" in decoded_csv
    else:
        col_names = ["Number", "State"] + ([] if extra_col_names is None else extra_col_names)
        assert all(col_name in decoded_csv for col_name in col_names)


def test_download_csv_no_trial() -> None:
    def objective(trial: optuna.Trial) -> float:
        x = trial.suggest_float("x", -100, 100)
        y = trial.suggest_categorical("y", [-1, 0, 1])
        return x**2 + y

    storage = optuna.storages.InMemoryStorage()
    study = optuna.create_study(storage=storage)
    study.optimize(objective, n_trials=0)
    _validate_output(storage, 200, 0)


def test_download_csv_all_waiting() -> None:
    storage = optuna.storages.InMemoryStorage()
    study = optuna.create_study(storage=storage)
    study.add_trial(optuna.trial.create_trial(state=TrialState.WAITING))
    _validate_output(storage, 200, 0)


def test_download_csv_all_running() -> None:
    storage = optuna.storages.InMemoryStorage()
    study = optuna.create_study(storage=storage)
    study.add_trial(optuna.trial.create_trial(state=TrialState.RUNNING))
    _validate_output(storage, 200, 0)


@pytest.mark.parametrize("study_id", [0, 1])
def test_download_csv_fail(study_id: int) -> None:
    def objective(trial: optuna.Trial) -> float:
        x = trial.suggest_float("x", -100, 100)
        y = trial.suggest_categorical("y", [-1, 0, 1])
        return x**2 + y

    storage = optuna.storages.InMemoryStorage()
    study = optuna.create_study(storage=storage)
    optuna.logging.set_verbosity(optuna.logging.ERROR)
    study.optimize(objective, n_trials=10)
    expect_no_result = study_id != 0
    cols = ["Param x", "Param y", "Value"]
    _validate_output(storage, 404 if expect_no_result else 200, study_id, expect_no_result, cols)


@pytest.mark.parametrize("is_multi_obj", [True, False])
def test_download_csv_multi_obj(is_multi_obj: bool) -> None:
    def objective(trial: optuna.Trial) -> Any:
        x = trial.suggest_float("x", -100, 100)
        y = trial.suggest_categorical("y", [-1, 0, 1])
        if is_multi_obj:
            return x**2, y
        return x**2 + y

    storage = optuna.storages.InMemoryStorage()
    directions = ["minimize", "minimize"] if is_multi_obj else ["minimize"]
    study = optuna.create_study(storage=storage, directions=directions)
    optuna.logging.set_verbosity(optuna.logging.ERROR)
    study.optimize(objective, n_trials=10)
    cols = ["Param x", "Param y"]
    cols += ["Objective 0", "Objective 1"] if is_multi_obj else ["Value"]
    _validate_output(storage, 200, 0, extra_col_names=cols)


def test_download_csv_user_attr() -> None:
    def objective(trial: optuna.Trial) -> float:
        x = trial.suggest_float("x", -100, 100)
        y = trial.suggest_categorical("y", [-1, 0, 1])
        trial.set_user_attr("abs_y", abs(y))
        return x**2 + y

    storage = optuna.storages.InMemoryStorage()
    study = optuna.create_study(storage=storage)
    optuna.logging.set_verbosity(optuna.logging.ERROR)
    study.optimize(objective, n_trials=10)
    cols = ["Param x", "Param y", "Value", "UserAttribute abs_y"]
    _validate_output(storage, 200, 0, extra_col_names=cols)
