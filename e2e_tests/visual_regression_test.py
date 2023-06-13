import optuna
from playwright.sync_api import Browser


output_dir = "tmp"
width = 1000
height = 3000


def test_study_list(
    dummy_storage: optuna.storages.InMemoryStorage,
    server: None,
    browser: Browser,
    port: int,
) -> None:
    url = f"http://localhost:{port}/dashboard/"
    page = browser.new_page(viewport={"width": width, "height": height})

    summaries = optuna.get_all_study_summaries(dummy_storage)
    study_ids = {s._study_id: s.study_name for s in summaries}
    for study_id, study_name in study_ids.items():
        page.goto(url)
        page.click(f"a[href='/dashboard/studies/{study_id}']")

        element = page.query_selector(".MuiTypography-body1")
        assert element is not None

        title = element.text_content()
        assert title is not None
        assert study_name in title
