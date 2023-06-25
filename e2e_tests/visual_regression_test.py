import optuna
from playwright.sync_api import Page


def test_study_list(
    page: Page,
    storage: optuna.storages.InMemoryStorage,
    server_url: str,
) -> None:
    page.set_viewport_size({"width": 1000, "height": 3000})

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
