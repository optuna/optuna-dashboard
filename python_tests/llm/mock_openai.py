# This module provides the mock utilities for openai library.
#
# To mock the API response, here we use the method described in the below.
# https://github.com/openai/openai-python/issues/398#issuecomment-1742862473
from __future__ import annotations

from typing import Any
from datetime import datetime

import httpx
import openai

from openai.types.responses import Response
from openai.types.responses import ResponseOutputMessage
from openai.types.responses import ResponseOutputText
from openai.types.chat import ChatCompletionMessage
from openai.types.chat.chat_completion import ChatCompletion, Choice

from optuna_dashboard.llm.openai import OpenAI
from optuna_dashboard.llm.openai import AzureOpenAI


class MockOpenAITransport:
    def __init__(self) -> None:
        # OpenAI >= 3 uses httpx2, while older versions use httpx.
        self._httpx = getattr(openai._base_client, "httpx2", httpx)
        self._status_code = 200
        self._response_json: Any = None
        self._expected_url_path: str | None = None

    def set_response(
        self, status_code: int, response_json: Any, expected_url_path: str
    ) -> None:
        self._status_code = status_code
        self._response_json = response_json
        self._expected_url_path = expected_url_path

    def create_client(self) -> Any:
        return self._httpx.Client(
            transport=self._httpx.MockTransport(self._handle_request)
        )

    def _handle_request(self, request: Any) -> Any:
        assert request.url.path == self._expected_url_path
        return self._httpx.Response(
            self._status_code,
            json=self._response_json,
            request=request,
        )


def mock_responses_api(
    mock_transport: MockOpenAITransport,
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
        url_path = "/responses"
    else:
        url_path = "/v1/responses"
    mock_transport.set_response(
        status_code,
        response.model_dump(mode="json"),
        url_path,
    )


def mock_chat_completions_api(
    mock_transport: MockOpenAITransport,
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
    mock_transport.set_response(
        status_code,
        completion.model_dump(mode="json"),
        url_path,
    )
