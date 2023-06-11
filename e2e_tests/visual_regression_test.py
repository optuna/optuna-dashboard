import os

import optuna
from playwright.sync_api import Browser


output_dir = "tmp"
width = 1000
height = 3000


def test_take_screenshots_study_list(
    server: None,
    browser: Browser,
    port: int,
) -> None:
    url = f"http://localhost:{port}/dashboard/"
    page = browser.new_page(viewport={"width": width, "height": height})
    page.goto(url)
    page.screenshot(path=os.path.join(output_dir, "study-list.png"))


def test_take_screenshots_studies(
    dummy_storage: optuna.storages.InMemoryStorage,
    server: None,
    browser: Browser,
    port: int,
) -> None:
    summaries = optuna.get_all_study_summaries(dummy_storage)
    study_ids = {s._study_id: s.study_name for s in summaries}
    for study_id, study_name in study_ids.items():
        url = f"http://localhost:{port}/dashboard/studies/{study_id}"
        page = browser.new_page(viewport={"width": width, "height": height})
        page.goto(url)
        page.screenshot(path=os.path.join(output_dir, f"study-{study_name}.png"))
