import argparse
import asyncio
import os
import threading
import time
from typing import Tuple
from wsgiref.simple_server import make_server

import optuna
from pyppeteer import launch

from optuna_dashboard.app import create_app


parser = argparse.ArgumentParser()
parser.add_argument(
    "--port", help="port number (default: %(default)s)", type=int, default=8081
)
parser.add_argument(
    "--host", help="hostname (default: %(default)s)", default="127.0.0.1"
)
parser.add_argument(
    "--sleep",
    help="sleep seconds on each page open (default: %(default)s)",
    type=int,
    default="10",
)
parser.add_argument(
    "--output-dir", help="output directory (default: %(default)s)", default="tmp"
)
parser.add_argument(
    "--width", help="window width (default: %(default)s)", type=int, default=1000
)
parser.add_argument(
    "--height", help="window height (default: %(default)s)", type=int, default=3000
)
parser.add_argument(
    "--storage", help="storage url (default: %(default)s)", default=None
)
args = parser.parse_args()


def create_dummy_storage() -> optuna.storages.InMemoryStorage:
    storage = optuna.storages.InMemoryStorage()

    # Single-objective study
    study = optuna.create_study(study_name="single", storage=storage)

    def objective_single(trial: optuna.Trial) -> float:
        x1 = trial.suggest_float("x1", 0, 10)
        x2 = trial.suggest_float("x2", 0, 10)
        return (x1 - 2) ** 2 + (x2 - 5) ** 2

    study.optimize(objective_single, n_trials=50)

    # Single-objective study with 1 parameter
    study = optuna.create_study(
        study_name="single-1-param", storage=storage, direction="maximize"
    )

    def objective_single_with_1param(trial: optuna.Trial) -> float:
        x1 = trial.suggest_float("x1", 0, 10)
        return -((x1 - 2) ** 2)

    study.optimize(objective_single_with_1param, n_trials=50)

    # Single-objective study with dynamic search space
    study = optuna.create_study(
        study_name="single-dynamic", storage=storage, direction="maximize"
    )

    def objective_single_dynamic(trial: optuna.Trial) -> float:
        category = trial.suggest_categorical("category", ["foo", "bar"])
        if category == "foo":
            return (trial.suggest_float("x1", 0, 10) - 2) ** 2
        else:
            return -((trial.suggest_float("x2", -10, 0) + 5) ** 2)

    study.optimize(objective_single_dynamic, n_trials=50)

    # Multi-objective study
    study = optuna.create_study(
        study_name="multi-objective",
        storage=storage,
        directions=["minimize", "minimize"],
    )

    def objective_multi(trial: optuna.Trial) -> Tuple[float, float]:
        x = trial.suggest_float("x", 0, 5)
        y = trial.suggest_float("y", 0, 3)
        v0 = 4 * x ** 2 + 4 * y ** 2
        v1 = (x - 5) ** 2 + (y - 5) ** 2
        return v0, v1

    study.optimize(objective_multi, n_trials=50)

    # Multi-objective study with dynamic search space
    study = optuna.create_study(
        study_name="multi-dynamic", storage=storage, directions=["minimize", "minimize"]
    )

    def objective_multi_dynamic(trial: optuna.Trial) -> Tuple[float, float]:
        category = trial.suggest_categorical("category", ["foo", "bar"])
        if category == "foo":
            x = trial.suggest_float("x1", 0, 5)
            y = trial.suggest_float("y1", 0, 3)
            v0 = 4 * x ** 2 + 4 * y ** 2
            v1 = (x - 5) ** 2 + (y - 5) ** 2
            return v0, v1
        else:
            x = trial.suggest_float("x2", 0, 5)
            y = trial.suggest_float("y2", 0, 3)
            v0 = 2 * x ** 2 + 2 * y ** 2
            v1 = (x - 2) ** 2 + (y - 3) ** 2
            return v0, v1

    study.optimize(objective_multi_dynamic, n_trials=50)

    # Pruning with no intermediate values
    study = optuna.create_study(
        study_name="single-pruned-without-report", storage=storage
    )

    def objective_prune_without_report(trial: optuna.Trial) -> float:
        x = trial.suggest_float("x", -15, 30)
        y = trial.suggest_float("y", -15, 30)
        v = x ** 2 + y ** 2
        if v > 100:
            raise optuna.TrialPruned()
        return v

    study.optimize(objective_prune_without_report, n_trials=100)

    # No trials single-objective study
    optuna.create_study(study_name="single-no-trials", storage=storage)

    # No trials multi-objective study
    optuna.create_study(
        study_name="multi-no-trials",
        storage=storage,
        directions=["minimize", "maximize"],
    )
    return storage


async def take_screenshots(storage: optuna.storages.BaseStorage) -> None:
    browser = await launch()
    page = await browser.newPage()
    await page.setViewport({"width": args.width, "height": args.height})

    await page.goto(f"http://{args.host}:{args.port}/dashboard/")
    time.sleep(1)
    await page.screenshot({"path": os.path.join(args.output_dir, "study-list.png")})

    study_ids = {s._study_id: s.study_name for s in storage.get_all_study_summaries()}
    for study_id, study_name in study_ids.items():
        await page.goto(f"http://{args.host}:{args.port}/dashboard/studies/{study_id}")
        time.sleep(args.sleep)
        await page.screenshot(
            {"path": os.path.join(args.output_dir, f"study-{study_name}.png")}
        )
    await browser.close()


def main() -> None:
    os.makedirs(args.output_dir, exist_ok=True)
    storage: optuna.storages.BaseStorage
    if args.storage:
        storage = optuna.storages.RDBStorage(args.storage)
    else:
        storage = create_dummy_storage()
    app = create_app(storage)
    httpd = make_server(args.host, args.port, app)
    thread = threading.Thread(target=httpd.serve_forever)
    thread.start()

    loop = asyncio.get_event_loop()
    loop.run_until_complete(take_screenshots(storage))

    httpd.shutdown()
    httpd.server_close()
    thread.join()


if __name__ == "__main__":
    main()
