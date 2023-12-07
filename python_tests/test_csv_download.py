from typing import Any

import optuna
from optuna.trial import TrialState
from optuna_dashboard._app import create_app
import pytest

from .wsgi_client import send_request


def _validate_output(
    storage: optuna.storages.BaseStorage,
    correct_status: int,
    study_id: int,
) -> None:
    app = create_app(storage)
    status, _, _ = send_request(
        app,
        f"/csv/{study_id}",
        "GET",
        content_type="application/json",
    )
    assert status == correct_status


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
    _validate_output(storage, 404 if study_id != 0 else 200, study_id)


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
    _validate_output(storage, 200, 0)


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
    _validate_output(storage, 200, 0)
