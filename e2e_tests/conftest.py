import pytest


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args: dict) -> dict:
    return {
        **browser_context_args,
        "viewport": {
            "width": 1000,
            "height": 3000,
        },
    }
