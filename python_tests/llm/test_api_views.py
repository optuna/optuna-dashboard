from __future__ import annotations

import json
import pytest
from typing import TYPE_CHECKING

import optuna
from optuna_dashboard._app import create_app
from optuna_dashboard.llm.provider import InvalidAuthentication
from optuna_dashboard.llm.provider import RateLimitExceeded

from ..wsgi_client import send_request


if TYPE_CHECKING:
    from typing import Any

    from optuna_dashboard.llm.provider import LLMProvider


class LLMProviderMock:
    def call(self, prompt: str) -> str:
        return "Not Used"


class InvalidAuthenticationLLMProviderMock:
    def call(self, prompt: str) -> str:
        raise InvalidAuthentication


class RateLimitExceededLLMProviderMock:
    def call(self, prompt: str) -> str:
        raise RateLimitExceeded


def send_trial_filter_query_request(
    body_params_to_use: dict[str, Any], llm_provider: LLMProvider | None = None
) -> tuple[int, dict[str, Any]]:
    storage = optuna.storages.InMemoryStorage()
    app = create_app(storage, llm_provider=llm_provider)
    status, _, body = send_request(
        app,
        "/api/llm/trial_filter_query",
        "POST",
        body=json.dumps(body_params_to_use),
        content_type="application/json",
    )
    response = json.loads(body.decode("utf-8"))
    return status, response


def test_get_trial_filtering_func_str_without_user_query() -> None:
    llm_provider = LLMProviderMock()
    status, _ = send_trial_filter_query_request({}, llm_provider=llm_provider)
    assert status == 400


@pytest.mark.parametrize("llm_provider, correct_status", [
    (LLMProviderMock(), 200),
    (InvalidAuthenticationLLMProviderMock(), 401),
    (RateLimitExceededLLMProviderMock(), 429),
    (None, 400),
])
@pytest.mark.parametrize("body_params", [
    {"user_query": "test query"},
    {"user_query": "test query", "last_response": {"func_str": "dummy", "error_message": "error"}},
])
def test_get_trial_filtering_func_str(
    llm_provider: LLMProvider | None,
    correct_status: int,
    body_params: dict[str, str],
) -> None:
    status, response = send_trial_filter_query_request(body_params, llm_provider=llm_provider)
    assert status == correct_status
    if correct_status == 200:
        assert response["trial_filtering_func_str"] == LLMProviderMock().call("")
