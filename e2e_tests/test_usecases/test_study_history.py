import optuna
from playwright.sync_api import Page


def test_history_xaxis_datetime_start_click(
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