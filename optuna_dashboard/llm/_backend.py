from __future__ import annotations

from typing import TYPE_CHECKING

from bottle import Bottle
from bottle import request
from bottle import response
from .._bottle_util import json_api_view
from ._prompt_templates import TRIAL_FILTERING_FAILURE_MESSAGE_TEMPLATE
from ._prompt_templates import TRIAL_FILTERING_PROMPT

if TYPE_CHECKING:
    from typing import Any, TypedDict

    from .llm.provider import LLMProvider

    class TrialFilteringFuncResponse(TypedDict):
        func_str: str
        error_message: str


def register_llm_route(app: Bottle, llm_provider: LLMProvider | None) -> None:
    @app.get("/api/llm/trial_filter_query")
    @json_api_view
    def get_trial_filtering_func_str() -> dict[str, str] | bytes:
        if llm_provider is None:
            response.status = 400  # Bad Request
            return b"Cannot access to the LLM provider."

        user_query = request.json.get("user_query", "")
        if not user_query:
            response.status = 400  # Bad Request
            return b"No user query provided."

        res: TrialFilteringFuncResponse | None = request.json.get(
            "filtering_result", None
        )
        if res is None:
            trial_filtering_failure_message = ""
        else:
            trial_filtering_failure_message = (
                TRIAL_FILTERING_FAILURE_MESSAGE_TEMPLATE.format(
                    last_trial_filtering_func_str=res.get("func_str", ""),
                    trial_flitering_error_message=res.get("error_message", ""),
                )
            )

        prompt = TRIAL_FILTERING_PROMPT.format(
            user_query=user_query,
            trial_filtering_failure_message=trial_filtering_failure_message,
        )
        try:
            trial_filtering_func_str = llm_provider.call(prompt)
        except Exception as e:
            response.status = 500
            return {"reason": str(e)}

        response.status = 200
        return {"trial_filtering_func_str": trial_filtering_func_str}
