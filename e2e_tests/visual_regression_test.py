import optuna
from playwright.sync_api import Page
import pytest

from .test_server import make_test_server


study_names = [
    "single",
    "single-trial",
    "single-1-param",
    "single-dynamic",
    "single-inf",
    "multi-objective",
    "multi-dynamic",
    "single-pruned-without-report",
    "single-inf-report",
    "issue-410",
    "single-no-trials",
    "multi-no-trials",
]


def make_test_storage(study_name: str) -> optuna.storages.InMemoryStorage:
    storage = optuna.storages.InMemoryStorage()
    sampler = optuna.samplers.RandomSampler(seed=0)

    # Sinble objective study
    if study_name == "single":
        study = optuna.create_study(study_name=study_name, storage=storage, sampler=sampler)

        def objective_single(trial: optuna.Trial) -> float:
            x1 = trial.suggest_float("x1", 0, 10)
            x2 = trial.suggest_float("x2", 0, 10)
            return (x1 - 2) ** 2 + (x2 - 5) ** 2

        study.optimize(objective_single, n_trials=50)

    # A single objective study with a single trial
    # Refs: https://github.com/optuna/optuna-dashboard/issues/401
    elif study_name == "single-trial":
        study = optuna.create_study(study_name=study_name, storage=storage, sampler=sampler)

        def objective_single(trial: optuna.Trial) -> float:
            x1 = trial.suggest_float("x1", 0, 10)
            x2 = trial.suggest_float("x2", 0, 10)
            return (x1 - 2) ** 2 + (x2 - 5) ** 2

        study.optimize(objective_single, n_trials=1)

    # Single-objective study with 1 parameter
    elif study_name == "single-1-param":
        study = optuna.create_study(
            study_name=study_name, storage=storage, direction="maximize", sampler=sampler
        )

        def objective_single_with_1param(trial: optuna.Trial) -> float:
            x1 = trial.suggest_float("x1", 0, 10)
            return -((x1 - 2) ** 2)

        study.optimize(objective_single_with_1param, n_trials=50)

    # Single-objective study with dynamic search space
    elif study_name == "single-dynamic":
        study = optuna.create_study(
            study_name=study_name, storage=storage, direction="maximize", sampler=sampler
        )

        def objective_single_dynamic(trial: optuna.Trial) -> float:
            category = trial.suggest_categorical("category", ["foo", "bar"])
            if category == "foo":
                return (trial.suggest_float("x1", 0, 10) - 2) ** 2
            else:
                return -((trial.suggest_float("x2", -10, 0) + 5) ** 2)

        study.optimize(objective_single_dynamic, n_trials=50)

    # Single objective study with 'inf', '-inf', or 'nan' value
    elif study_name == "single-inf":
        study = optuna.create_study(study_name=study_name, storage=storage, sampler=sampler)

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
    elif study_name == "multi-objective":
        study = optuna.create_study(
            study_name=study_name,
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
    elif study_name == "multi-dynamic":
        study = optuna.create_study(
            study_name=study_name,
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
    elif study_name == "single-pruned-without-report":
        study = optuna.create_study(study_name=study_name, storage=storage, sampler=sampler)

        def objective_prune_without_report(trial: optuna.Trial) -> float:
            x = trial.suggest_float("x", -15, 30)
            y = trial.suggest_float("y", -15, 30)
            v = x**2 + y**2
            if v > 100:
                raise optuna.TrialPruned()
            return v

        study.optimize(objective_prune_without_report, n_trials=100)

    # Single objective pruned after reported 'inf', '-inf', or 'nan'
    elif study_name == "single-inf-report":
        study = optuna.create_study(study_name=study_name, storage=storage, sampler=sampler)

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
    elif study_name == "issue-410":
        study = optuna.create_study(study_name=study_name, storage=storage, sampler=sampler)

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
    elif study_name == "single-no-trials":
        optuna.create_study(study_name=study_name, storage=storage, sampler=sampler)

    # No trials multi-objective study
    elif study_name == "multi-no-trials":
        optuna.create_study(
            study_name=study_name,
            storage=storage,
            directions=["minimize", "maximize"],
            sampler=sampler,
        )
    else:
        assert False, f"No study configuration of {study_name} in conftest.py"

    return storage


@pytest.fixture(params=study_names)
def storage(request: pytest.FixtureRequest) -> optuna.storages.InMemoryStorage:
    study_name = request.param
    storage = make_test_storage(study_name)
    return storage


@pytest.fixture(params=study_names)
def server_url(request: pytest.FixtureRequest, storage: optuna.storages.InMemoryStorage) -> str:
    return make_test_server(request, storage)


def test_study_list(
    page: Page,
    storage: optuna.storages.InMemoryStorage,
    server_url: str,
) -> None:
    summaries = optuna.get_all_study_summaries(storage)
    study_id = summaries[0]._study_id
    study_name = summaries[0].study_name

    page.goto(server_url)
    page.click(f"a[href='/dashboard/studies/{study_id}']")

    element = page.query_selector(".MuiTypography-body1")
    assert element is not None

    title = element.text_content()
    assert title is not None
    assert study_name in title


def test_study_analytics(
    page: Page,
    storage: optuna.storages.InMemoryStorage,
    server_url: str,
) -> None:
    summaries = optuna.get_all_study_summaries(storage)
    study_id = summaries[0]._study_id
    study_name = summaries[0].study_name
    url = f"{server_url}/studies/{study_id}"

    page.goto(url)
    page.click(f"a[href='/dashboard/studies/{study_id}/analytics']")

    element = page.query_selector(".MuiTypography-body1")
    assert element is not None

    title = element.text_content()
    assert title is not None
    assert study_name in title


def test_trial_list(
    page: Page,
    storage: optuna.storages.InMemoryStorage,
    server_url: str,
) -> None:
    summaries = optuna.get_all_study_summaries(storage)
    study_id = summaries[0]._study_id
    study_name = summaries[0].study_name
    url = f"{server_url}/studies/{study_id}"

    page.goto(url)
    page.click(f"a[href='/dashboard/studies/{study_id}/trials']")

    element = page.query_selector(".MuiTypography-body1")
    assert element is not None

    title = element.text_content()
    assert title is not None
    assert study_name in title


def test_trial_table(
    page: Page,
    storage: optuna.storages.InMemoryStorage,
    server_url: str,
) -> None:
    summaries = optuna.get_all_study_summaries(storage)
    study_id = summaries[0]._study_id
    study_name = summaries[0].study_name
    url = f"{server_url}/studies/{study_id}"

    page.goto(url)
    page.click(f"a[href='/dashboard/studies/{study_id}/trialTable']")

    element = page.query_selector(".MuiTypography-body1")
    assert element is not None

    title = element.text_content()
    assert title is not None
    assert study_name in title


def test_trial_note(
    page: Page,
    storage: optuna.storages.InMemoryStorage,
    server_url: str,
) -> None:
    summaries = optuna.get_all_study_summaries(storage)
    study_id = summaries[0]._study_id
    study_name = summaries[0].study_name
    url = f"{server_url}/studies/{study_id}"

    page.goto(url)
    page.click(f"a[href='/dashboard/studies/{study_id}/note']")

    element = page.query_selector(".MuiTypography-body1")
    assert element is not None

    title = element.text_content()
    assert title is not None
    assert study_name in title
