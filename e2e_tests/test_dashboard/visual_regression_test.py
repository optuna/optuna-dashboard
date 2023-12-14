from typing import Callable

import optuna
from playwright.sync_api import Page
import pytest

from ..test_server import make_test_server
from ..utils import clear_inmemory_cache


@pytest.fixture
def storage() -> optuna.storages.InMemoryStorage:
    clear_inmemory_cache()
    storage = optuna.storages.InMemoryStorage()
    return storage


@pytest.fixture
def server_url(request: pytest.FixtureRequest, storage: optuna.storages.InMemoryStorage) -> str:
    return make_test_server(request, storage)


def run_single_objective_study(storage: optuna.storages.InMemoryStorage) -> optuna.Study:
    sampler = optuna.samplers.RandomSampler(seed=0)
    study = optuna.create_study(study_name="single", storage=storage, sampler=sampler)

    def objective(trial: optuna.Trial) -> float:
        x1 = trial.suggest_float("x1", 0, 10)
        x2 = trial.suggest_float("x2", 0, 10)
        return (x1 - 2) ** 2 + (x2 - 5) ** 2

    study.optimize(objective, n_trials=50)
    return study


def run_single_trial_objective_study(storage: optuna.storages.InMemoryStorage) -> optuna.Study:
    # A single objective study with a single trial
    # Refs: https://github.com/optuna/optuna-dashboard/issues/401
    sampler = optuna.samplers.RandomSampler(seed=0)
    study = optuna.create_study(study_name="single-trial", storage=storage, sampler=sampler)

    def objective(trial: optuna.Trial) -> float:
        x1 = trial.suggest_float("x1", 0, 10)
        x2 = trial.suggest_float("x2", 0, 10)
        return (x1 - 2) ** 2 + (x2 - 5) ** 2

    study.optimize(objective, n_trials=1)
    return study


def run_single_1param_objective_study(storage: optuna.storages.InMemoryStorage) -> optuna.Study:
    sampler = optuna.samplers.RandomSampler(seed=0)
    study = optuna.create_study(
        study_name="single-1-param", storage=storage, direction="maximize", sampler=sampler
    )

    def objective(trial: optuna.Trial) -> float:
        x1 = trial.suggest_float("x1", 0, 10)
        return -((x1 - 2) ** 2)

    study.optimize(objective, n_trials=50)
    return study


def run_single_dynamic_objective_study(storage: optuna.storages.InMemoryStorage) -> optuna.Study:
    # Single-objective study with dynamic search space
    sampler = optuna.samplers.RandomSampler(seed=0)
    study = optuna.create_study(
        study_name="single-dynamic", storage=storage, direction="maximize", sampler=sampler
    )

    def objective(trial: optuna.Trial) -> float:
        category = trial.suggest_categorical("category", ["foo", "bar"])
        if category == "foo":
            return (trial.suggest_float("x1", 0, 10) - 2) ** 2
        else:
            return -((trial.suggest_float("x2", -10, 0) + 5) ** 2)

    study.optimize(objective, n_trials=50)
    return study


def run_single_inf_objective_study(storage: optuna.storages.InMemoryStorage) -> optuna.Study:
    # Single objective study with 'inf', '-inf', or 'nan' value
    sampler = optuna.samplers.RandomSampler(seed=0)
    study = optuna.create_study(study_name="single-inf", storage=storage, sampler=sampler)

    def objective(trial: optuna.Trial) -> float:
        x = trial.suggest_float("x", -10, 10)
        if trial.number % 3 == 0:
            return float("inf")
        elif trial.number % 3 == 1:
            return float("-inf")
        else:
            return x**2

    study.optimize(objective, n_trials=50)
    return study


def run_multi_objective_study(storage: optuna.storages.InMemoryStorage) -> optuna.Study:
    # Multi-objective study
    sampler = optuna.samplers.RandomSampler(seed=0)
    study = optuna.create_study(
        study_name="multi-objective",
        storage=storage,
        directions=["minimize", "minimize"],
        sampler=sampler,
    )

    def objective(trial: optuna.Trial) -> tuple[float, float]:
        x = trial.suggest_float("x", 0, 5)
        y = trial.suggest_float("y", 0, 3)
        v0 = 4 * x**2 + 4 * y**2
        v1 = (x - 5) ** 2 + (y - 5) ** 2
        return v0, v1

    study.optimize(objective, n_trials=50)
    return study


def run_multi_dynamic_objective_study(storage: optuna.storages.InMemoryStorage) -> optuna.Study:
    # Multi-objective study with dynamic search space
    sampler = optuna.samplers.RandomSampler(seed=0)
    study = optuna.create_study(
        study_name="multi-dynamic",
        storage=storage,
        directions=["minimize", "minimize"],
        sampler=sampler,
    )

    def objective(trial: optuna.Trial) -> tuple[float, float]:
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

    study.optimize(objective, n_trials=50)
    return study


def run_single_pruned_without_report_objective_study(
    storage: optuna.storages.InMemoryStorage,
) -> optuna.Study:
    # Pruning with no intermediate values
    sampler = optuna.samplers.RandomSampler(seed=0)
    study = optuna.create_study(
        study_name="single-pruned-without-report", storage=storage, sampler=sampler
    )

    def objective(trial: optuna.Trial) -> float:
        x = trial.suggest_float("x", -15, 30)
        y = trial.suggest_float("y", -15, 30)
        v = x**2 + y**2
        if v > 100:
            raise optuna.TrialPruned()
        return v

    study.optimize(objective, n_trials=100)
    return study


def run_single_inf_report_objective_study(
    storage: optuna.storages.InMemoryStorage,
) -> optuna.Study:
    # Single objective pruned after reported 'inf', '-inf', or 'nan'
    sampler = optuna.samplers.RandomSampler(seed=0)
    study = optuna.create_study(study_name="single-inf-report", storage=storage, sampler=sampler)

    def objective(trial: optuna.Trial) -> float:
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

    study.optimize(objective, n_trials=50)
    return study


def run_issue_410_objective_study(storage: optuna.storages.InMemoryStorage) -> optuna.Study:
    # Issue 410
    sampler = optuna.samplers.RandomSampler(seed=0)
    study = optuna.create_study(study_name="issue-410", storage=storage, sampler=sampler)

    def objective(trial: optuna.Trial) -> float:
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

    study.optimize(objective, n_trials=20, catch=(Exception,))
    return study


def run_single_no_trials_objective_study(storage: optuna.storages.InMemoryStorage) -> optuna.Study:
    # No trials single-objective study
    sampler = optuna.samplers.RandomSampler(seed=0)
    study = optuna.create_study(study_name="single-no-trials", storage=storage, sampler=sampler)

    return study


def run_multi_no_trials_objective_study(storage: optuna.storages.InMemoryStorage) -> optuna.Study:
    # No trials multi-objective study
    sampler = optuna.samplers.RandomSampler(seed=0)
    study = optuna.create_study(
        study_name="multi-no-trials",
        storage=storage,
        directions=["minimize", "maximize"],
        sampler=sampler,
    )
    return study


parameterize_studies = pytest.mark.parametrize(
    "run_study",
    [
        run_single_objective_study,
        run_single_trial_objective_study,
        run_single_1param_objective_study,
        run_single_dynamic_objective_study,
        run_single_inf_objective_study,
        run_multi_objective_study,
        run_multi_dynamic_objective_study,
        run_single_pruned_without_report_objective_study,
        run_single_inf_report_objective_study,
        run_issue_410_objective_study,
        run_single_no_trials_objective_study,
        run_multi_no_trials_objective_study,
    ],
)


@parameterize_studies
def test_study_list(
    page: Page,
    storage: optuna.storages.InMemoryStorage,
    server_url: str,
    run_study: Callable[[optuna.storages.InMemoryStorage], optuna.Study],
) -> None:
    study = run_study(storage)

    study_id = study._study_id
    study_name = study.study_name

    page.goto(server_url)
    page.click(f"a[href='/dashboard/studies/{study_id}']")

    element = page.query_selector(".MuiTypography-body1")
    assert element is not None

    title = element.text_content()
    assert title is not None
    assert study_name in title


@parameterize_studies
def test_study_analytics(
    page: Page,
    storage: optuna.storages.InMemoryStorage,
    server_url: str,
    run_study: Callable[[optuna.storages.InMemoryStorage], optuna.Study],
) -> None:
    study = run_study(storage)

    study_id = study._study_id
    study_name = study.study_name
    url = f"{server_url}/studies/{study_id}"

    page.goto(url)
    page.click(f"a[href='/dashboard/studies/{study_id}/analytics']")

    element = page.query_selector(".MuiTypography-body1")
    assert element is not None

    title = element.text_content()
    assert title is not None
    assert study_name in title


@parameterize_studies
def test_trial_list(
    page: Page,
    storage: optuna.storages.InMemoryStorage,
    server_url: str,
    run_study: Callable[[optuna.storages.InMemoryStorage], optuna.Study],
) -> None:
    study = run_study(storage)

    study_id = study._study_id
    study_name = study.study_name
    url = f"{server_url}/studies/{study_id}"

    page.goto(url)
    page.click(f"a[href='/dashboard/studies/{study_id}/trials']")

    element = page.query_selector(".MuiTypography-body1")
    assert element is not None

    title = element.text_content()
    assert title is not None
    assert study_name in title


@parameterize_studies
def test_trial_table(
    page: Page,
    storage: optuna.storages.InMemoryStorage,
    server_url: str,
    run_study: Callable[[optuna.storages.InMemoryStorage], optuna.Study],
) -> None:
    study = run_study(storage)

    study_id = study._study_id
    study_name = study.study_name
    url = f"{server_url}/studies/{study_id}"

    page.goto(url)
    page.click(f"a[href='/dashboard/studies/{study_id}/trialTable']")

    element = page.query_selector(".MuiTypography-body1")
    assert element is not None

    title = element.text_content()
    assert title is not None
    assert study_name in title


@parameterize_studies
def test_trial_note(
    page: Page,
    storage: optuna.storages.InMemoryStorage,
    server_url: str,
    run_study: Callable[[optuna.storages.InMemoryStorage], optuna.Study],
) -> None:
    study = run_study(storage)

    study_id = study._study_id
    study_name = study.study_name
    url = f"{server_url}/studies/{study_id}"

    page.goto(url)
    page.click(f"a[href='/dashboard/studies/{study_id}/note']")

    element = page.query_selector(".MuiTypography-body1")
    assert element is not None

    title = element.text_content()
    assert title is not None
    assert study_name in title
