from datetime import datetime, timedelta
import functools
import json
import logging
import os
import threading
from typing import Union, Dict, List, Optional, TypeVar, Callable, Any, cast

from bottle import (
    Bottle,
    BaseResponse,
    HTTPError,
    redirect,
    request,
    response,
    static_file,
)
from optuna.exceptions import DuplicatedStudyError
from optuna.storages import BaseStorage, get_storage
from optuna.trial import FrozenTrial
from optuna.study import StudyDirection, StudySummary

from . import serializer

BottleViewReturn = Union[str, bytes, Dict[str, Any], BaseResponse]
BottleView = TypeVar("BottleView", bound=Callable[..., BottleViewReturn])

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "public")
INDEX_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Optuna Dashboard</title>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
    body {
        min-height: 100vh;
        margin: 0;
        padding: 0;
    }
    </style>
    <script defer src="/static/bundle.js"></script>
</head>
<body>
    <div id="dashboard">
         <p>Now loading...</p>
    </div>
</body>
</html>
"""
# In-memory trials cache
trials_cache_lock = threading.Lock()
trials_cache: Dict[int, List[FrozenTrial]] = {}
trials_last_fetched_at: Dict[int, datetime] = {}


class JSONError(HTTPError):
    default_content_type = "application/json"

    def __init__(self, reason: str, status: int = 500) -> None:
        body = json.dumps({"reason": reason})
        super().__init__(body=body, status=status)


def handle_json_api_exception(view: BottleView) -> BottleView:
    @functools.wraps(view)
    def decorated(*args: List[Any], **kwargs: Dict[str, Any]) -> BottleViewReturn:
        try:
            response_body = view(*args, **kwargs)
            return response_body
        except Exception as e:
            raise JSONError("internal server error") from e

    return cast(BottleView, decorated)


def get_study_summary(storage: BaseStorage, study_id: int) -> Optional[StudySummary]:
    summaries = storage.get_all_study_summaries()
    for summary in summaries:
        if summary._study_id != study_id:
            continue
        return summary
    return None


def get_trials(
    storage: BaseStorage, study_id: int, ttl_seconds: int = 10
) -> List[FrozenTrial]:
    with trials_cache_lock:
        trials = trials_cache.get(study_id, None)
        last_fetched_at = trials_last_fetched_at.get(study_id, None)
        if (
            trials is not None
            and last_fetched_at is not None
            and datetime.now() - last_fetched_at < timedelta(ttl_seconds)
        ):
            return trials
    trials = storage.get_all_trials(study_id)
    with trials_cache_lock:
        trials_last_fetched_at[study_id] = datetime.now()
        trials_cache[study_id] = trials
    return trials


def create_app(storage_or_url: Union[str, BaseStorage]) -> Bottle:
    app = Bottle()
    storage = get_storage(storage_or_url)

    @app.hook("before_request")
    def remove_trailing_slashes_hook() -> None:
        request.environ["PATH_INFO"] = request.environ["PATH_INFO"].rstrip("/")

    @app.get("/")
    def index() -> BottleViewReturn:
        return redirect("/dashboard", 302)  # Status Found

    # Accept any following paths for client-side routing
    @app.get("/dashboard<:re:(/.*)?>")
    def dashboard() -> BottleViewReturn:
        response.content_type = "text/html"
        return INDEX_HTML

    @app.get("/api/studies")
    @handle_json_api_exception
    def list_study_summaries() -> BottleViewReturn:
        response.content_type = "application/json"
        summaries = [
            serializer.serialize_study_summary(summary)
            for summary in storage.get_all_study_summaries()
        ]
        return {
            "study_summaries": summaries,
        }

    @app.post("/api/studies")
    @handle_json_api_exception
    def create_study() -> BottleViewReturn:
        response.content_type = "application/json"

        study_name = request.json.get("study_name", None)
        direction = request.json.get("direction", None)
        if study_name is None or direction not in ("minimize", "maximize"):
            return JSONError("You need to set study_name and direction", status=400)

        try:
            study_id = storage.create_new_study(study_name)
        except DuplicatedStudyError:
            return JSONError(f"'{study_name}' is already exists", status=400)
        if direction.lower() == "maximize":
            storage.set_study_direction(study_id, StudyDirection.MAXIMIZE)
        else:
            storage.set_study_direction(study_id, StudyDirection.MINIMIZE)

        summary = get_study_summary(storage, study_id)
        if summary is None:
            return JSONError(f"Failed to create a study ({study_name})", status=500)
        response.status = 201  # Created
        return {"study_summary": serializer.serialize_study_summary(summary)}

    @app.delete("/api/studies/<study_id:int>")
    @handle_json_api_exception
    def delete_study(study_id: int) -> BottleViewReturn:
        response.content_type = "application/json"

        try:
            storage.delete_study(study_id)
        except KeyError:
            return JSONError(f"study_id={study_id} is not found", status=404)
        response.status = 204  # No content
        return ""

    @app.get("/api/studies/<study_id:int>")
    @handle_json_api_exception
    def get_study_detail(study_id: int) -> BottleViewReturn:
        response.content_type = "application/json"
        summary = get_study_summary(storage, study_id)
        if summary is None:
            return JSONError(f"study_id={study_id} is not found", status=404)
        trials = get_trials(storage, study_id)
        return serializer.serialize_study_detail(summary, trials)

    @app.get("/static/<filename:path>")
    def send_static(filename: str) -> BottleViewReturn:
        return static_file(filename, root=STATIC_DIR)

    return app
