import optuna
from playwright.sync_api import Page
import pytest


@pytest.mark.parametrize("study_id", range(10))
def test_study_list(
    study_id: int,
    page: Page,
    dummy_storage: optuna.storages.InMemoryStorage,
    port: int,
    server: None,
) -> None:
    page.set_viewport_size({"width": 1000, "height": 3000})
    url = f"http://localhost:{port}/dashboard/"

    summaries = optuna.get_all_study_summaries(dummy_storage)
    study_ids = {s._study_id: s.study_name for s in summaries}

    study_name = study_ids[study_id]
    page.goto(url)
    page.click(f"a[href='/dashboard/studies/{study_id}']")

    element = page.query_selector(".MuiTypography-body1")
    assert element is not None

    title = element.text_content()
    assert title is not None
    assert study_name in title
