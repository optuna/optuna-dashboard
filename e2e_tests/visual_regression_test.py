import pytest

from playwright.sync_api import expect
from playwright.sync_api import Page

import optuna


def test_first(
    dummy_storage: optuna.storages.InMemoryStorage,
    server,
    browser,
) -> None:
    print(dummy_storage)
    print(id(dummy_storage))

def test_second(
    dummy_storage: optuna.storages.InMemoryStorage,
    server,
    browser,
) -> None:
    page = browser.new_page()
    page.goto("http://localhost:8081")
    print(page.title())

