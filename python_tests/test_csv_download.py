from typing import Any

import optuna
from optuna.trial import TrialState
from optuna_dashboard._app import create_app
import pytest

from .wsgi_client import send_request


def test_download_csv_no_trial() -> None:
    def objective(trial: optuna.Trial) -> float:
        x = trial.suggest_float("x", -100, 100)
        y = trial.suggest_categorical("y", [-1, 0, 1])
        return x**2 + y

    storage = optuna.storages.InMemoryStorage()
    study = optuna.create_study(storage=storage)
    study.optimize(objective, n_trials=0)
    app = create_app(storage)
    status, _, _ = send_request(
        app,
        "/csv/0",
        "GET",
        content_type="application/json",
    )
    assert status == 200


def test_download_csv_all_waiting() -> None:
    storage = optuna.storages.InMemoryStorage()
    study = optuna.create_study(storage=storage)
    study.add_trial(optuna.trial.create_trial(state=TrialState.WAITING))
    app = create_app(storage)
    status, _, body = send_request(
        app,
        "/csv/0",
        "GET",
        content_type="application/json",
    )
    assert status == 200


def test_download_csv_all_running() -> None:
    storage = optuna.storages.InMemoryStorage()
    study = optuna.create_study(storage=storage)
    study.add_trial(optuna.trial.create_trial(state=TrialState.RUNNING))
    app = create_app(storage)
    status, _, body = send_request(
        app,
        "/csv/0",
        "GET",
        content_type="application/json",
    )
    assert status == 200


@pytest.mark.parametrize("id", [0, 1])
def test_download_csv_fail(id: int) -> None:
    def objective(trial: optuna.Trial) -> float:
        x = trial.suggest_float("x", -100, 100)
        y = trial.suggest_categorical("y", [-1, 0, 1])
        return x**2 + y

    storage = optuna.storages.InMemoryStorage()
    study = optuna.create_study(storage=storage)
    optuna.logging.set_verbosity(optuna.logging.ERROR)
    study.optimize(objective, n_trials=10)
    app = create_app(storage)
    status, _, body = send_request(
        app,
        f"/csv/{id}",
        "GET",
        content_type="application/json",
    )
    assert status == (404 if id != 0 else 200)


@pytest.mark.parametrize("is_multi_obj", [True, False])
def test_download_csv_multi_obj(is_multi_obj: bool) -> None:
    def objective(trial: optuna.Trial) -> Any:
        x = trial.suggest_float("x", -100, 100)
        y = trial.suggest_categorical("y", [-1, 0, 1])
        if is_multi_obj:
            return x**2, y
        return x**2 + y

    storage = optuna.storages.InMemoryStorage()
    if is_multi_obj:
        study = optuna.create_study(storage=storage, directions=["minimize", "minimize"])
    else:
        study = optuna.create_study(storage=storage)
    optuna.logging.set_verbosity(optuna.logging.ERROR)
    study.optimize(objective, n_trials=10)
    app = create_app(storage)
    status, _, body = send_request(
        app,
        "/csv/0",
        "GET",
        content_type="application/json",
    )
    assert status == 200


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
    app = create_app(storage)
    status, _, body = send_request(
        app,
        "/csv/0",
        "GET",
        content_type="application/json",
    )
    assert status == 200
