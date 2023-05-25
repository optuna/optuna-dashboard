import sys

import optuna


def objective(trial):
    x = trial.suggest_float("x", -100, 100)
    y = trial.suggest_categorical("y", [-1, 0, 1])
    return x**2 + y


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Invalid args")
        sys.exit(1)

    db_url = sys.argv[1]
    study = optuna.create_study(storage=db_url, study_name="example-study")
    study.optimize(objective, n_trials=10)
