from __future__ import annotations

import json

import optuna
from optuna_dashboard._app import create_app

from ..wsgi_client import send_request


class LLMProviderMock:
    def call(self, prompt: str) -> str:
        return "Not Used"


def test_get_trial_filtering_func_str_without_llm_provider() -> None:
    storage = optuna.storages.InMemoryStorage()
    app = create_app(storage)
    # app = create_app(storage, llm_provider=LLMProviderMock())
    status, _, _ = send_request(app, "/api/llm/trial_filter_query", "POST")
    assert status == 400


def test_get_trial_filtering_func_str_without_user_query() -> None:
    storage = optuna.storages.InMemoryStorage()
    app = create_app(storage, llm_provider=LLMProviderMock())
    status, _, _ = send_request(
        app,
        "/api/llm/trial_filter_query",
        "POST",
        body=json.dumps({}),
        content_type="application/json",
    )
    assert status == 400


def test_get_trial_filtering_func_str_success() -> None:
    storage = optuna.storages.InMemoryStorage()
    app = create_app(storage, llm_provider=LLMProviderMock())
    status, _, body = send_request(
        app,
        "/api/llm/trial_filter_query",
        "POST",
        body=json.dumps({"user_query": "test query"}),
        content_type="application/json",
    )
    assert status == 200
    res = json.loads(body.decode("utf-8"))
    assert res["trial_filtering_func_str"] == LLMProviderMock().call("")


def test_get_trial_filtering_func_str_success_with_last_try() -> None:
    storage = optuna.storages.InMemoryStorage()
    app = create_app(storage, llm_provider=LLMProviderMock())
    last_trial_filtering_response = {
        "func_str": "dummy",
        "error_message": "Some errors",
    }
    status, _, body = send_request(
        app,
        "/api/llm/trial_filter_query",
        "POST",
        body=json.dumps(
            {"user_query": "test query", "filtering_result": last_trial_filtering_response}
        ),
        content_type="application/json",
    )
    assert status == 200
    res = json.loads(body.decode("utf-8"))
    assert res["trial_filtering_func_str"] == LLMProviderMock().call("")
