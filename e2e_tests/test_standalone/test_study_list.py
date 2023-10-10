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