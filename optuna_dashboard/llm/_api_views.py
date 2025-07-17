from __future__ import annotations

from typing import TYPE_CHECKING

from bottle import Bottle
from bottle import request
from bottle import response
from .._bottle_util import json_api_view
from ._prompt_templates import get_trial_filtering_prompt
from .provider import InvalidAuthentication
from .provider import RateLimitExceeded

if TYPE_CHECKING:
    from .llm.provider import LLMProvider


def register_llm_route(app: Bottle, llm_provider: LLMProvider | None) -> None:
    @app.post("/api/llm/trial_filter_query")
    @json_api_view
    def get_trial_filtering_func_str() -> dict[str, str]:
        if llm_provider is None:
            response.status = 400  # Bad Request
            return {"reason": "No access to the LLM provider."}

        user_query = request.json.get("user_query", "")
        if not user_query:
            response.status = 400  # Bad Request
            return {"reason": "No user query provided."}

        func_str = request.json.get("last_response", {}).get("func_str")
        err_msg = request.json.get("last_response", {}).get("error_message")
        prompt = get_trial_filtering_prompt(user_query, func_str, err_msg)

        try:
            trial_filtering_func_str = llm_provider.call(prompt)
        except RateLimitExceeded as e:
            response.status = 429  # Too Many Requests
            reason = f"Rate limit exceeded. Try again later. The actual error: {str(e)}"
            return {"reason": reason}
        except InvalidAuthentication as e:
            response.status = 401  # Unauthorized
            reason = f"Invalid authentication. Check your API key. The actual error: {str(e)}"
            return {"reason": reason}
        except Exception as e:
            response.status = 500
            return {"reason": str(e)}

        response.status = 200
        return {"trial_filtering_func_str": trial_filtering_func_str}
