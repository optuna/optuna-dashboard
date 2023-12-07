import optuna
from playwright.sync_api import Page
import pytest

from ...test_server import make_test_server
from ...utils import clear_inmemory_cache


def make_test_storage() -> optuna.storages.InMemoryStorage:
    storage = optuna.storages.InMemoryStorage()
    sampler = optuna.samplers.RandomSampler(seed=0)

    study = optuna.create_study(study_name="single", storage=storage, sampler=sampler)

    def objective_single(trial: optuna.Trial) -> float:
        x1 = trial.suggest_float("x1", 0, 10)
        x2 = trial.suggest_float("x2", 0, 10)
        return (x1 - 2) ** 2 + (x2 - 5) ** 2

    study.optimize(objective_single, n_trials=50)

    return storage


@pytest.fixture
def storage() -> optuna.storages.InMemoryStorage:
    clear_inmemory_cache()
    storage = make_test_storage()
    return storage


@pytest.fixture
def server_url(request: pytest.FixtureRequest, storage: optuna.storages.InMemoryStorage) -> str:
    return make_test_server(request, storage)


def test_history_xaxis_click(
    page: Page,
    storage: optuna.storages.InMemoryStorage,
    server_url: str,
) -> None:
    summaries = optuna.get_all_study_summaries(storage)
    study_id = summaries[0]._study_id
    study_name = summaries[0].study_name
    url = f"{server_url}/studies/{study_id}"

    page.goto(url)

    page.get_by_label("Datetime start").check()
    element = page.query_selector(".MuiTypography-body1")
    assert element is not None
    title = element.text_content()
    assert title is not None
    assert study_name in title

    page.get_by_label("Datetime complete").check()
    element = page.query_selector(".MuiTypography-body1")
    assert element is not None
    title = element.text_content()
    assert title is not None
    assert study_name in title

    page.get_by_label("Number").check()
    element = page.query_selector(".MuiTypography-body1")
    assert element is not None
    title = element.text_content()
    assert title is not None
    assert study_name in title
