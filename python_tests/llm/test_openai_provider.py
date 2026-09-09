from __future__ import annotations

import pytest
from typing import TYPE_CHECKING

import openai

from optuna_dashboard.llm.openai import OpenAI
from optuna_dashboard.llm.openai import AzureOpenAI
from optuna_dashboard.llm.provider import InvalidAuthentication
from optuna_dashboard.llm.provider import RateLimitExceeded
from .mock_openai import MockOpenAITransport
from .mock_openai import mock_responses_api


@pytest.fixture
def mock_transport() -> MockOpenAITransport:
    return MockOpenAITransport()


if TYPE_CHECKING:
    from typing import Callable

    ProviderFactoryType = Callable[[str, MockOpenAITransport], OpenAI | AzureOpenAI]

parametrize_openai_provider = pytest.mark.parametrize(
    "provider_factory",
    [
        lambda model, mock_transport: OpenAI(
            openai.OpenAI(api_key="dummy", http_client=mock_transport.create_client()),
            model=model,
        ),
        lambda model, mock_transport: AzureOpenAI(
            openai.AzureOpenAI(
                api_key="dummy",
                base_url="http://example.com/",
                api_version="2023-05-15",
                http_client=mock_transport.create_client(),
            ),
            model=model,
        ),
    ],
)


@parametrize_openai_provider
def test_openai_responses(
    provider_factory: ProviderFactoryType, mock_transport: MockOpenAITransport
) -> None:
    provider = provider_factory("gpt-4.1", mock_transport)
    mock_responses_api(mock_transport, provider, 200, "Hello world!")

    response = provider.call("Hello")
    assert response == "Hello world!"


@parametrize_openai_provider
def test_openai_chat_completions(
    provider_factory: ProviderFactoryType, mock_transport: MockOpenAITransport
) -> None:
    provider = provider_factory("gpt-4.1", mock_transport)
    mock_responses_api(mock_transport, provider, 200, "Hello world!")

    response = provider.call("Hello")
    assert response == "Hello world!"


@parametrize_openai_provider
def test_openai_responses_api_rate_limit(
    provider_factory: ProviderFactoryType, mock_transport: MockOpenAITransport
) -> None:
    provider = provider_factory("gpt-4.1", mock_transport)
    mock_responses_api(mock_transport, provider, 429, "")

    with pytest.raises(RateLimitExceeded):
        provider.call("Hello")


@parametrize_openai_provider
def test_openai_responses_api_invalid_authentication(
    provider_factory: ProviderFactoryType, mock_transport: MockOpenAITransport
) -> None:
    provider = provider_factory("gpt-4.1", mock_transport)
    mock_responses_api(mock_transport, provider, 401, "")

    with pytest.raises(InvalidAuthentication):
        provider.call("Hello")
