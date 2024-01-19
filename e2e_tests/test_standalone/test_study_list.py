import os
import tempfile

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
    study_name = "single-objective"
    url = f"{server_url}"

    def create_storage_file(filename: str):
        import optuna

        storage = optuna.storages.RDBStorage(f"sqlite:///{filename}")
        study = optuna.create_study(study_name=study_name, storage=storage)

        def objective(trial: optuna.Trial) -> float:
            x1 = trial.suggest_float("x1", 0, 10)
            x2 = trial.suggest_float("x2", 0, 10)
            return (x1 - 2) ** 2 + (x2 - 5) ** 2

        study.optimize(objective, n_trials=100)

    with tempfile.TemporaryDirectory() as dir:
        with tempfile.NamedTemporaryFile() as fp:
            filename = fp.name
            path = os.path.join(dir, filename)
            create_storage_file(filename)
            page.goto(url)
            with page.expect_file_chooser() as fc_info:
                page.get_by_role("button").nth(2).click()
            file_chooser = fc_info.value
            file_chooser.set_files(path)

        page.get_by_role("link", name=study_name).click()

        def count_components(page: Page, component_name: str):
            component_count = page.evaluate(
                f"""() => {{
                const components = document.querySelectorAll('.{component_name}');
                return components.length;
            }}"""
            )
            return component_count

        count = count_components(page, "MuiCard-root")
        assert count == 4
