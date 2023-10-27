import os
import time

from playwright.sync_api import Page
import pytest

from ..test_server import make_standalone_server


@pytest.fixture
def server_url(request: pytest.FixtureRequest) -> str:
    return make_standalone_server(request)


def test_home(
    page: Page,
    server_url: str,
) -> None:
    url = f"{server_url}"
    page.goto(url)
    element = page.get_by_role("heading")
    assert element is not None
    title = element.text_content()
    assert title is not None
    assert title == "Optuna Dashboard (Wasm ver.)"


def test_load_storage(
    page: Page,
    server_url: str,
) -> None:
    test_file = "e2etest.db"

    if os.path.exists(f"./{test_file}"):
        os.remove(f"./{test_file}")

    def create_storage_file():
        import optuna

        storage = optuna.storages.RDBStorage(f"sqlite:///{test_file}")
        study = optuna.create_study(study_name="single-objective", storage=storage)

        def objective(trial: optuna.Trial) -> float:
            x1 = trial.suggest_float("x1", 0, 10)
            x2 = trial.suggest_float("x2", 0, 10)
            x3 = trial.suggest_categorical("x3", ["foo", "bar"])
            return (x1 - 2) ** 2 + (x2 - 5) ** 2

        study.optimize(objective, n_trials=100)

    create_storage_file()

    url = f"{server_url}"
    page.goto(url)
    name = "Load an Optuna Storage Drag your SQLite3 file here or click to browse."
    page.get_by_role("button", name=name).click()

    time.sleep(1)
    page.get_by_role("button", name=name).set_input_files(f"./{test_file}")
    os.remove(f"./{test_file}")
