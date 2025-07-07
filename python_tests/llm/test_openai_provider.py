import pytest
from respx import MockRouter

import openai

from optuna_dashboard.llm.openai import OpenAI
from optuna_dashboard.llm.provider import RateLimitExceeded
from .mock_openai import mock_responses_api
from .mock_openai import mock_chat_completions_api


@pytest.mark.respx()
def test_openai_responses(respx_mock: MockRouter) -> None:
    client = openai.OpenAI()

    mock_responses_api(respx_mock, 200, "Hello world!")

    openai_provider = OpenAI(client, model="gpt-4.1")
    response = openai_provider.call("Hello")
    assert response == "Hello world!"


@pytest.mark.respx()
def test_openai_responses_api_rate_limit(respx_mock: MockRouter) -> None:
    client = openai.OpenAI()

    mock_responses_api(respx_mock, 429, "")

    with pytest.raises(RateLimitExceeded):
        OpenAI(client, model="gpt-4.1").call("Hello")


@pytest.mark.respx()
def test_openai_chat_completions(respx_mock: MockRouter) -> None:
    client = openai.OpenAI()

    mock_chat_completions_api(respx_mock, 200, "Hello world!")

    llm_provider = OpenAI(client, model="gpt-4.1", use_chat_completions_api=True)
    response = llm_provider.call("Hello")
    assert response == "Hello world!"
