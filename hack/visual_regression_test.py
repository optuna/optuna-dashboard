from __future__ import annotations

import argparse
import asyncio
import os
import sys
import threading
import time
from wsgiref.simple_server import make_server

import optuna
from optuna import get_all_study_summaries
from optuna_dashboard import wsgi
from pyppeteer import launch
from pyppeteer.page import Page


parser = argparse.ArgumentParser()
parser.add_argument("--port", help="port number (default: %(default)s)", type=int, default=8081)
parser.add_argument("--host", help="hostname (default: %(default)s)", default="127.0.0.1")
parser.add_argument(
    "--sleep",
    help="sleep seconds on each page open (default: %(default)s)",
    type=int,
    default=5,
)
parser.add_argument("--output-dir", help="output directory (default: %(default)s)", default="tmp")
parser.add_argument("--width", help="window width (default: %(default)s)", type=int, default=1000)
parser.add_argument(
    "--height", help="window height (default: %(default)s)", type=int, default=3000
)
parser.add_argument("--storage", help="storage url (default: %(default)s)", default=None)
parser.add_argument("--skip-screenshot", help="skip to take screenshot", action="store_true")
args = parser.parse_args()


def create_dummy_storage() -> optuna.storages.InMemoryStorage:
    storage = optuna.storages.InMemoryStorage()
    sampler = optuna.samplers.RandomSampler(seed=0)

    # Single-objective study
    study = optuna.create_study(study_name="single", storage=storage, sampler=sampler)

    def objective_single(trial: optuna.Trial) -> float:
        x1 = trial.suggest_float("x1", 0, 10)
        x2 = trial.suggest_float("x2", 0, 10)
        return (x1 - 2) ** 2 + (x2 - 5) ** 2

    study.optimize(objective_single, n_trials=50)

    # A single objective study with a single trial
    # Refs: https://github.com/optuna/optuna-dashboard/issues/401
    study = optuna.create_study(study_name="single-trial", storage=storage, sampler=sampler)
    study.optimize(objective_single, n_trials=1)

    # Single-objective study with 1 parameter
    study = optuna.create_study(
        study_name="single-1-param", storage=storage, direction="maximize", sampler=sampler
    )

    def objective_single_with_1param(trial: optuna.Trial) -> float:
        x1 = trial.suggest_float("x1", 0, 10)
        return -((x1 - 2) ** 2)

    study.optimize(objective_single_with_1param, n_trials=50)

    # Single-objective study with dynamic search space
    study = optuna.create_study(
        study_name="single-dynamic", storage=storage, direction="maximize", sampler=sampler
    )

    def objective_single_dynamic(trial: optuna.Trial) -> float:
        category = trial.suggest_categorical("category", ["foo", "bar"])
        if category == "foo":
            return (trial.suggest_float("x1", 0, 10) - 2) ** 2
        else:
            return -((trial.suggest_float("x2", -10, 0) + 5) ** 2)

    study.optimize(objective_single_dynamic, n_trials=50)

    # Single objective study with 'inf', '-inf', or 'nan' value
    study = optuna.create_study(study_name="single-inf", storage=storage, sampler=sampler)

    def objective_single_inf(trial: optuna.Trial) -> float:
        x = trial.suggest_float("x", -10, 10)
        if trial.number % 3 == 0:
            return float("inf")
        elif trial.number % 3 == 1:
            return float("-inf")
        else:
            return x**2

    study.optimize(objective_single_inf, n_trials=50)

    # Multi-objective study
    study = optuna.create_study(
        study_name="multi-objective",
        storage=storage,
        directions=["minimize", "minimize"],
        sampler=sampler,
    )

    def objective_multi(trial: optuna.Trial) -> tuple[float, float]:
        x = trial.suggest_float("x", 0, 5)
        y = trial.suggest_float("y", 0, 3)
        v0 = 4 * x**2 + 4 * y**2
        v1 = (x - 5) ** 2 + (y - 5) ** 2
        return v0, v1

    study.optimize(objective_multi, n_trials=50)

    # Multi-objective study with dynamic search space
    study = optuna.create_study(
        study_name="multi-dynamic",
        storage=storage,
        directions=["minimize", "minimize"],
        sampler=sampler,
    )

    def objective_multi_dynamic(trial: optuna.Trial) -> tuple[float, float]:
        category = trial.suggest_categorical("category", ["foo", "bar"])
        if category == "foo":
            x = trial.suggest_float("x1", 0, 5)
            y = trial.suggest_float("y1", 0, 3)
            v0 = 4 * x**2 + 4 * y**2
            v1 = (x - 5) ** 2 + (y - 5) ** 2
            return v0, v1
        else:
            x = trial.suggest_float("x2", 0, 5)
            y = trial.suggest_float("y2", 0, 3)
            v0 = 2 * x**2 + 2 * y**2
            v1 = (x - 2) ** 2 + (y - 3) ** 2
            return v0, v1

    study.optimize(objective_multi_dynamic, n_trials=50)

    # Pruning with no intermediate values
    study = optuna.create_study(
        study_name="single-pruned-without-report", storage=storage, sampler=sampler
    )

    def objective_prune_without_report(trial: optuna.Trial) -> float:
        x = trial.suggest_float("x", -15, 30)
        y = trial.suggest_float("y", -15, 30)
        v = x**2 + y**2
        if v > 100:
            raise optuna.TrialPruned()
        return v

    study.optimize(objective_prune_without_report, n_trials=100)

    # Single objective pruned after reported 'inf', '-inf', or 'nan'
    study = optuna.create_study(study_name="single-inf-report", storage=storage, sampler=sampler)

    def objective_single_inf_report(trial: optuna.Trial) -> float:
        x = trial.suggest_float("x", -10, 10)
        if trial.number % 3 == 0:
            trial.report(float("inf"), 1)
        elif trial.number % 3 == 1:
            trial.report(float("-inf"), 1)
        else:
            trial.report(float("nan"), 1)

        if x > 0:
            raise optuna.TrialPruned()
        else:
            return x**2

    study.optimize(objective_single_inf_report, n_trials=50)

    # Issue 410
    study = optuna.create_study(study_name="Issue 410", storage=storage, sampler=sampler)

    def objective_issue_410(trial: optuna.Trial) -> float:
        trial.suggest_categorical("resample_rate", ["50ms"])
        trial.suggest_categorical("channels", ["all"])
        trial.suggest_categorical("window_size", [256])
        if trial.number > 15:
            raise Exception("Unexpected error")
        trial.suggest_categorical("cbow", [True])
        trial.suggest_categorical("model", ["m1"])

        trial.set_user_attr("epochs", 0)
        trial.set_user_attr("deterministic", True)
        if trial.number > 10:
            raise Exception("unexpeccted error")
        trial.set_user_attr("folder", "/path/to/folder")
        trial.set_user_attr("resample_type", "foo")
        trial.set_user_attr("run_id", "0001")
        return 1.0

    study.optimize(objective_issue_410, n_trials=20, catch=(Exception,))

    # No trials single-objective study
    optuna.create_study(study_name="single-no-trials", storage=storage, sampler=sampler)

    # No trials multi-objective study
    optuna.create_study(
        study_name="multi-no-trials",
        storage=storage,
        directions=["minimize", "maximize"],
        sampler=sampler,
    )
    return storage


async def contains_study_name(page: Page, study_name: str) -> bool:
    typography_elements = await page.querySelectorAll("div.MuiTypography-root")
    for element in typography_elements:
        title = await page.evaluate("(element) => element.innerText", element)
        if study_name in title:
            return True
    return False


async def take_screenshots(storage: optuna.storages.BaseStorage) -> list[str]:
    validation_errors: list[str] = []

    browser = await launch()
    page = await browser.newPage()
    await page.setViewport({"width": args.width, "height": args.height})

    if not args.skip_screenshot:
        await page.goto(f"http://{args.host}:{args.port}/dashboard/")
        time.sleep(1)
        await page.screenshot({"path": os.path.join(args.output_dir, "study-list.png")})

    summaries = get_all_study_summaries(storage)
    study_ids = {s._study_id: s.study_name for s in summaries}
    for study_id, study_name in study_ids.items():
        # TODO(c-bata): Check "Analysis" tab.
        await page.goto(f"http://{args.host}:{args.port}/dashboard/studies/{study_id}")
        time.sleep(args.sleep)

        if not args.skip_screenshot:
            await page.screenshot(
                {"path": os.path.join(args.output_dir, f"study-{study_name}.png")}
            )

        is_crashed = not await contains_study_name(page, study_name)
        if is_crashed:
            validation_errors.append(
                f"Page is crashed at study_name='{study_name}' (id={study_id})"
            )

    await browser.close()
    return validation_errors


def main() -> None:
    os.makedirs(args.output_dir, exist_ok=True)

    storage: optuna.storages.BaseStorage
    if not args.storage:
        storage = create_dummy_storage()
    else:
        storage = optuna.storages.RDBStorage(args.storage)

    app = wsgi(storage)
    httpd = make_server(args.host, args.port, app)
    thread = threading.Thread(target=httpd.serve_forever)
    thread.start()

    loop = asyncio.new_event_loop()
    error_messages = loop.run_until_complete(take_screenshots(storage))
    for msg in error_messages:
        print(msg)

    httpd.shutdown()
    httpd.server_close()
    thread.join()

    if error_messages:
        sys.exit(1)


if __name__ == "__main__":
    main()
