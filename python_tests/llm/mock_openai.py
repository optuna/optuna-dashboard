# This module provides the mock utilities for openai library.
#
# To mock the API response, here we use the method described in the below.
# https://github.com/openai/openai-python/issues/398#issuecomment-1742862473
from __future__ import annotations

from typing import TYPE_CHECKING
from datetime import datetime
import httpx

from openai.types.responses import Response
from openai.types.responses import ResponseOutputMessage
from openai.types.responses import ResponseOutputText
from openai.types.chat import ChatCompletionMessage
from openai.types.chat.chat_completion import ChatCompletion, Choice

from optuna_dashboard.llm.openai import OpenAI
from optuna_dashboard.llm.openai import AzureOpenAI

if TYPE_CHECKING:
    from respx import MockRouter


def mock_responses_api(
    respx_mock: MockRouter,
    openai_provider: OpenAI | AzureOpenAI,
    status_code: int,
    response_content: str,
) -> None:
    response = Response(
        id="foo",
        model=openai_provider._model,
        object="response",
        output=[
            ResponseOutputMessage(
                id="bar",
                type="message",
                role="assistant",
                status="completed",
                content=[
                    ResponseOutputText(
                        type="output_text",
                        annotations=[],
                        text=response_content,
                    )
                ],
            )
        ],
        created_at=int(datetime.now().timestamp()),
        tools=[],
        tool_choice="none",
        parallel_tool_calls=False,
    )

    if isinstance(openai_provider, AzureOpenAI):
        url_path = f"{openai_provider._client._base_url}/openai/responses"
    else:
        url_path = "/v1/responses"
    respx_mock.post(url_path).mock(
        return_value=httpx.Response(status_code, json=response.model_dump(mode="json"))
    )


def mock_chat_completions_api(
    respx_mock: MockRouter,
    openai_provider: OpenAI | AzureOpenAI,
    status_code: int,
    response_content: str,
) -> None:
    completion = ChatCompletion(
        id="foo",
        model=openai_provider._model,
        object="chat.completion",
        choices=[
            Choice(
                finish_reason="stop",
                index=0,
                message=ChatCompletionMessage(
                    content=response_content,
                    role="assistant",
                ),
            ),
        ],
        created=int(datetime.now().timestamp()),
    )

    if isinstance(openai_provider, AzureOpenAI):
        url_path = f"/deployments/{openai_provider._model}/chat/completions"
    else:
        url_path = "/v1/chat/completions"
    respx_mock.post(url_path).mock(
        return_value=httpx.Response(status_code, json=completion.model_dump(mode="json"))
    )
