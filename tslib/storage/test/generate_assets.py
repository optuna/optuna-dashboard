import os.path
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


if __name__ == "__main__":
    remove_assets()
    for storage in [
        JournalStorage(JournalFileStorage(os.path.join(BASE_DIR, "journal.log"))),
        RDBStorage("sqlite:///" + os.path.join(BASE_DIR, "db.sqlite3")),
    ]:
        create_optuna_storage(storage)
