# This module provides the mock utilities for openai library.
#
# To mock the API response, here we use the method described in the below.
# https://github.com/openai/openai-python/issues/398#issuecomment-1742862473
from datetime import datetime
import httpx
from respx import MockRouter

from openai.types.responses import Response
from openai.types.responses import ResponseOutputMessage
from openai.types.responses import ResponseOutputText
from openai.types.chat import ChatCompletionMessage
from openai.types.chat.chat_completion import ChatCompletion, Choice


dummy_model_id = "gpt-4.1"


def mock_responses_api(
    respx_mock: MockRouter,
    status_code: int,
    response_content: str,
) -> None:
    response = Response(
        id="foo",
        model=dummy_model_id,
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
    respx_mock.post("/v1/responses").mock(
        return_value=httpx.Response(status_code, json=response.model_dump(mode="json"))
    )


def mock_chat_completions_api(
    respx_mock: MockRouter,
    status_code: int,
    response_content: str,
) -> None:
    completion = ChatCompletion(
        id="foo",
        model=dummy_model_id,
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
    respx_mock.post("/v1/chat/completions").mock(
        return_value=httpx.Response(status_code, json=completion.model_dump(mode="json"))
    )
