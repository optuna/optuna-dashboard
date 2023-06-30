import optuna
from playwright.sync_api import Page


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
