import math
import os.path
import random
import shutil

import optuna
from optuna.storages import BaseStorage
from optuna.storages import JournalFileStorage
from optuna.storages import JournalStorage
from optuna.storages import RDBStorage


optuna.logging.set_verbosity(optuna.logging.WARNING)
BASE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "asset")


def remove_assets() -> None:
    if os.path.exists(BASE_DIR):
        shutil.rmtree(BASE_DIR)
    os.mkdir(BASE_DIR)


def create_optuna_storage(storage: BaseStorage) -> None:
    # Single-objective study
    study = optuna.create_study(
        study_name="single-objective", storage=storage, sampler=optuna.samplers.RandomSampler()
    )
    print(f"Generating {study.study_name} for {type(storage).__name__}...")

    def objective_single(trial: optuna.Trial) -> float:
        x1 = trial.suggest_float("x1", 0, 10)
        x2 = trial.suggest_float("x2", 0, 10)
        trial.suggest_categorical("x3", ["foo", "bar"])
        return (x1 - 2) ** 2 + (x2 - 5) ** 2

    study.optimize(objective_single, n_trials=50)

    # Single-objective study with dynamic search space
    study = optuna.create_study(
        study_name="single-objective-dynamic", storage=storage, direction="maximize"
    )
    print(f"Generating {study.study_name} for {type(storage).__name__}...")

    def objective_single_dynamic(trial: optuna.Trial) -> float:
        category = trial.suggest_categorical("category", ["foo", "bar"])
        if category == "foo":
            return (trial.suggest_float("x1", 0, 10) - 2) ** 2
        else:
            return -((trial.suggest_float("x2", -10, 0) + 5) ** 2)

    study.optimize(objective_single_dynamic, n_trials=50)

    # Single objective study with 'inf', '-inf' value
    study = optuna.create_study(study_name="single-inf", storage=storage)
    print(f"Generating {study.study_name} for {type(storage).__name__}...")

    def objective_single_inf(trial: optuna.Trial) -> float:
        x = trial.suggest_float("x", -10, 10)
        if trial.number % 3 == 0:
            return float("inf")
        elif trial.number % 3 == 1:
            return float("-inf")
        else:
            return x**2

    study.optimize(objective_single_inf, n_trials=50)

    # Single objective with reported nan value
    study = optuna.create_study(study_name="single-nan-report", storage=storage)
    print(f"Generating {study.study_name} for {type(storage).__name__}...")

    def objective_single_nan_report(trial: optuna.Trial) -> float:
        x1 = trial.suggest_float("x1", 0, 10)
        x2 = trial.suggest_float("x2", 0, 10)
        trial.report(0.5, step=0)
        trial.report(math.nan, step=1)
        return (x1 - 2) ** 2 + (x2 - 5) ** 2

    study.optimize(objective_single_nan_report, n_trials=100)

    # Multi-objective study with metric names
    study = optuna.create_study(
        study_name="multi-objective-metric-names",
        storage=storage,
        directions=["minimize", "minimize"],
    )
    print(f"Generating {study.study_name} for {type(storage).__name__}...")
    study.set_metric_names(["value1", "value2"])

    def objective_multi(trial: optuna.Trial) -> tuple[float, float]:
        x = trial.suggest_float("x", 0, 5)
        y = trial.suggest_float("y", 0, 3)
        v0 = 4 * x**2 + 4 * y**2
        v1 = (x - 5) ** 2 + (y - 5) ** 2
        return v0, v1

    study.optimize(objective_multi, n_trials=50)


if __name__ == "__main__":
    remove_assets()
    for storage in [
        JournalStorage(JournalFileStorage(os.path.join(BASE_DIR, "journal.log"))),
        RDBStorage("sqlite:///" + os.path.join(BASE_DIR, "db.sqlite3")),
    ]:
        create_optuna_storage(storage)

    # Make a file including a broken line to the random position to test error handling
    shutil.copyfile(
        os.path.join(BASE_DIR, "journal.log"), os.path.join(BASE_DIR, "journal-broken.log")
    )
    broken_line = (
        '{"op_code": ..., "worker_id": "0000", "study_id": 0,'
        '"datetime_start": "2024-04-01T12:00:00.000000"}\n'
    )
    with open(os.path.join(BASE_DIR, "journal-broken.log"), "r+") as f:
        lines = f.readlines()
        lines.insert(random.randint(0, len(lines)), broken_line)
        f.truncate(0)
        f.seek(0, os.SEEK_SET)
        f.writelines(lines)
