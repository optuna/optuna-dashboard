import os
import pytest

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
        title = page.query_selector('.MuiTypography-body1').text_content()
        assert study_name in title