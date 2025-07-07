from __future__ import annotations

import openai
from typing import TYPE_CHECKING

from .provider import LLMProvider
from .provider import RateLimitExceeded
from .provider import InvalidAuthentication


if TYPE_CHECKING:
    from openai.types.shared import ResponsesModel


__all__ = ["OpenAI", "AzureOpenAI"]


class OpenAI:
    """An LLMProvider implementation for OpenAI and its compatible APIs."""

    def __init__(
        self,
        client: openai.OpenAI,
        *,
        model: ResponsesModel | None = None,
    ) -> None:
        self.client = client
        self.model = model

    def call(self, prompt: str) -> str:
        try:
            if self.model is not None:
                response = self.client.responses.create(input=prompt, model=self.model)
            else:
                response = self.client.responses.create(input=prompt)
        except openai.RateLimitError as e:
            raise RateLimitExceeded() from e
        return response.output_text


class AzureOpenAI:
    """An LLMProvider implementation for Microsoft Azure OpenAI."""

    def __init__(
        self,
        client: openai.AzureOpenAI,
        *,
        model: ResponsesModel | None = None,
    ) -> None:
        self.client = client
        self.model = model

    def call(self, prompt: str) -> str:
        try:
            if self.model is not None:
                response = self.client.responses.create(input=prompt, model=self.model)
            else:
                response = self.client.responses.create(input=prompt)
        except openai.RateLimitError as e:
            raise RateLimitExceeded() from e
        except openai.AuthenticationError as e:
            raise InvalidAuthentication() from e
        return response.output_text


if TYPE_CHECKING:
    # A mypy-runtime assertion to ensure that OpenAI and AzureOpenAI
    # implement all abstract methods in LLMProvider protocol.
    _type_checking_openai: LLMProvider = OpenAI(openai.OpenAI())
    _type_checking_azure: LLMProvider = AzureOpenAI(
        openai.AzureOpenAI(
            api_key="test", api_version="2023-05-15", azure_endpoint="https://test.com"
        )
    )
