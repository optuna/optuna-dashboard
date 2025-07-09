import pytest
from respx import MockRouter
from typing import Callable

import openai

from optuna_dashboard.llm.openai import OpenAI
from optuna_dashboard.llm.openai import AzureOpenAI
from optuna_dashboard.llm.provider import InvalidAuthentication
from optuna_dashboard.llm.provider import RateLimitExceeded
from .mock_openai import mock_responses_api


ProviderFactoryType = Callable[[str], OpenAI | AzureOpenAI]
parametrize_openai_provider = pytest.mark.parametrize(
    "provider_factory",
    [
        lambda model: OpenAI(openai.OpenAI(), model=model),
        lambda model: AzureOpenAI(
            openai.AzureOpenAI(
                api_key="dummy", base_url="http://example.com/", api_version="2023-05-15"
            ),
            model=model,
        ),
    ],
)


@parametrize_openai_provider
@pytest.mark.respx()
def test_openai_responses(respx_mock: MockRouter, provider_factory: ProviderFactoryType) -> None:
    provider = provider_factory("gpt-4.1")
    mock_responses_api(respx_mock, provider, 200, "Hello world!")

    response = provider.call("Hello")
    assert response == "Hello world!"


@parametrize_openai_provider
@pytest.mark.respx()
def test_openai_chat_completions(
    respx_mock: MockRouter, provider_factory: ProviderFactoryType
) -> None:
    provider = provider_factory("gpt-4.1")
    mock_responses_api(respx_mock, provider, 200, "Hello world!")

    response = provider.call("Hello")
    assert response == "Hello world!"


@parametrize_openai_provider
@pytest.mark.respx()
def test_openai_responses_api_rate_limit(
    respx_mock: MockRouter, provider_factory: ProviderFactoryType
) -> None:
    provider = provider_factory("gpt-4.1")
    mock_responses_api(respx_mock, provider, 429, "")

    with pytest.raises(RateLimitExceeded):
        provider.call("Hello")


@parametrize_openai_provider
@pytest.mark.respx()
def test_openai_responses_api_invalid_authentication(
    respx_mock: MockRouter, provider_factory: ProviderFactoryType
) -> None:
    provider = provider_factory("gpt-4.1")
    mock_responses_api(respx_mock, provider, 401, "")

    with pytest.raises(InvalidAuthentication):
        provider.call("Hello")
