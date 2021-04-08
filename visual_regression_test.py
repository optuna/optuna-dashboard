import asyncio
import threading
import time
import optuna
import os

from optuna_dashboard.app import create_app
from pyppeteer import launch
from typing import List, Tuple
from wsgiref.simple_server import make_server

host = "127.0.0.1"
port = 8080
output_dir = "tmp"


def create_optuna_storage() -> optuna.storages.InMemoryStorage:
    storage = optuna.storages.InMemoryStorage()

    # Single-objective study
    study = optuna.create_study(study_name="single-objective", storage=storage)

    def objective_single(trial: optuna.Trial) -> float:
        x1 = trial.suggest_float("x1", 0, 10)
        x2 = trial.suggest_float("x2", 0, 10)
        return (x1 - 2) ** 2 + (x2 - 5) ** 2

    study.optimize(objective_single, n_trials=100)

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

    # Pruning with no intermediate values
    study = optuna.create_study(
        study_name="binh-korn-function-with-constraints", storage=storage
    )

    def objective_prune_with_no_trials(trial: optuna.Trial) -> float:
        x = trial.suggest_float("x", -15, 30)
        y = trial.suggest_float("y", -15, 30)
        v = x ** 2 + y ** 2
        if v > 100:
            raise optuna.TrialPruned()
        return v

    study.optimize(objective_prune_with_no_trials, n_trials=100)

    # No trials
    optuna.create_study(study_name="no trials", storage=storage)
    return storage


async def take_screenshots(study_ids: List[int]) -> None:
    browser = await launch()
    page = await browser.newPage()
    await page.setViewport({"width": 1200, "height": 3000})

    await page.goto(f"http://{host}:{port}/dashboard/")
    time.sleep(1)
    await page.screenshot({"path": os.path.join(output_dir, "study-list.png")})

    for study_id in study_ids:
        await page.goto(f"http://{host}:{port}/dashboard/studies/{study_id}")
        time.sleep(5)
        await page.screenshot(
            {"path": os.path.join(output_dir, f"study-{study_id}.png")}
        )
    await browser.close()


def main() -> None:
    os.makedirs(output_dir, exist_ok=True)

    storage = create_optuna_storage()
    app = create_app(storage)
    httpd = make_server(host, port, app)
    thread = threading.Thread(target=httpd.serve_forever)
    thread.start()

    study_ids = [s._study_id for s in storage.get_all_study_summaries()]
    loop = asyncio.get_event_loop()
    loop.run_until_complete(take_screenshots(study_ids))

    httpd.shutdown()
    httpd.server_close()
    thread.join()


if __name__ == "__main__":
    main()
