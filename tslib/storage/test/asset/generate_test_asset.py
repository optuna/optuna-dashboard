import os.path
import optuna


BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def objective(trial):
    x = trial.suggest_uniform('x', -10, 10)
    return (x - 2) ** 2


if __name__ == '__main__':
    journal_backend = optuna.storages.JournalFileStorage(os.path.join(BASE_DIR, "journal.log"))
    storage = optuna.storages.JournalStorage(journal_backend)
    study = optuna.create_study(storage=storage)
    study.optimize(objective, n_trials=100)
