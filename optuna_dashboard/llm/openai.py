from __future__ import annotations

import os
import openai
from typing import TYPE_CHECKING

from .provider import LLMProvider
from .provider import RateLimitExceeded


__all__ = ["OpenAI", "AzureOpenAI"]


class OpenAI:
    """An LLMProvider implementation for OpenAI and its compatible APIs.

    Examples:

        To use, please set ``OPENAI_API_KEY`` and ``OPENAI_BASE_URL`` environment variables
        and execute the following code:

        import optuna
        import optuna_dashboard
        from optuna_dashboard.llm.openai import OpenAI

        storage = optuna.storages.InMemoryStorage()
        openai_client = OpenAI.from_env()
        optuna_dashboard.run_server(storage, llm_provider=openai_client)
    """
    def __init__(
        self,
        client: openai.OpenAI,
    ) -> None:
        self.client = client

    @classmethod
    def from_envvar(cls, **kwargs) -> "OpenAI":
        api_key = os.getenv("OPENAI_API_KEY")
        base_url = os.getenv("OPENAI_BASE_URL")
        client = openai.OpenAI(api_key=api_key, base_url=base_url)
        return cls(client)

    def call(self, prompt: str) -> str:
        try:
            response = self.client.invoke(prompt)
        except openai.error.RateLimitError as e:
            raise RateLimitExceeded() from e
        return response


class AzureOpenAI:
    """An LLMProvider implementation for Microsoft Azure OpenAI.

    Examples:

        To use, please set ``AZURE_OPENAI_API_KEY``, ``AZURE_OPENAI_VERSION``,
        and ``AZURE_OPENAI_ENDPOINT`` environment variables and execute the
        following code:

        import optuna
        import optuna_dashboard
        from optuna_dashboard.llm.openai import AzureOpenAI

        storage = optuna.storages.InMemoryStorage()
        openai_client = AzureOpenAI.from_env()
        optuna_dashboard.run_server(storage, llm_provider=openai_client)
    """
    def __init__(
        self,
        client: openai.AzureOpenAI,
    ) -> None:
        self.client = client

    @classmethod
    def from_envvar(
        cls,
    ) -> "OpenAI":
        # See https://github.com/openai/openai-python#microsoft-azure-openai
        api_key = os.getenv("AZURE_OPENAI_API_KEY")
        api_version = os.getenv("AZURE_OPENAI_VERSION")
        azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        azure_ad_token = os.getenv("AZURE_OPENAI_AD_TOKEN")
        client = openai.AzureOpenAI(
            api_key=api_key,
            api_version=api_version,
            azure_endpoint=azure_endpoint,
            azure_ad_token=azure_ad_token,
        )
        return cls(client)

    @classmethod
    def from_arg(
        cls,
        *,
        api_key: str,
        api_version: str,
        azure_endpoint: str,
        azure_ad_token: str,
        **kwargs,
    ) -> "OpenAI":
        client = openai.AzureOpenAI(
            api_key=api_key,
            api_version=api_version,
            azure_endpoint=azure_endpoint,
            azure_ad_token=azure_ad_token,
            **kwargs,
        )
        return cls(client)

    def call(self, prompt: str) -> str:
        try:
            response = self.client.invoke(prompt)
        except openai.error.RateLimitError as e:
            raise RateLimitExceeded() from e
        return response


if TYPE_CHECKING:
    # A mypy-runtime assertion to ensure that OpenAI and AzureOpenAI
    # implement all abstract methods in LLMProvider protocol.
    _type_checking_openai: LLMProvider = OpenAI(openai.OpenAI())
    _type_checking_openai_azure: LLMProvider = AzureOpenAI(openai.AzureOpenAI())
