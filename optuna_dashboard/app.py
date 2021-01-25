from datetime import datetime, timedelta
import functools
import json
import logging
import os
import threading
import traceback
from typing import Union, Dict, List, Optional, TypeVar, Callable, Any, cast

from bottle import Bottle, BaseResponse, redirect, request, response, static_file
from optuna.exceptions import DuplicatedStudyError
from optuna.storages import BaseStorage
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


def handle_json_api_exception(view: BottleView) -> BottleView:
    @functools.wraps(view)
    def decorated(*args: List[Any], **kwargs: Dict[str, Any]) -> BottleViewReturn:
        try:
            response_body = view(*args, **kwargs)
            return response_body
        except Exception as e:
            response.status = 500
            response.content_type = "application/json"
            stacktrace = "\n".join(traceback.format_tb(e.__traceback__))
            logger.error(f"Exception: {e}\n{stacktrace}")
            return json.dumps({"reason": "internal server error"})

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
            and datetime.now() - last_fetched_at < timedelta(seconds=ttl_seconds)
        ):
            return trials
    trials = storage.get_all_trials(study_id)
    with trials_cache_lock:
        trials_last_fetched_at[study_id] = datetime.now()
        trials_cache[study_id] = trials
    return trials


def create_app(storage: BaseStorage) -> Bottle:
    app = Bottle()

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
        directions = request.json.get("directions", [])
        if (
            study_name is None
            or len(directions) == 0
            or not all([d in ("minimize", "maximize") for d in directions])
        ):
            response.status = 400  # Bad request
            return {"reason": "You need to set study_name and direction"}

        try:
            study_id = storage.create_new_study(study_name)
        except DuplicatedStudyError:
            response.status = 400  # Bad request
            return {"reason": f"'{study_name}' is already exists"}

        storage.set_study_directions(
            study_id,
            [
                StudyDirection.MAXIMIZE
                if d.lower() == "maximize"
                else StudyDirection.MINIMIZE
                for d in directions
            ],
        )

        summary = get_study_summary(storage, study_id)
        if summary is None:
            response.status = 500  # Internal server error
            return {"reason": "Failed to create study"}
        response.status = 201  # Created
        return {"study_summary": serializer.serialize_study_summary(summary)}

    @app.delete("/api/studies/<study_id:int>")
    @handle_json_api_exception
    def delete_study(study_id: int) -> BottleViewReturn:
        response.content_type = "application/json"

        try:
            storage.delete_study(study_id)
        except KeyError:
            response.status = 404  # Not found
            return {"reason": f"study_id={study_id} is not found"}
        response.status = 204  # No content
        return ""

    @app.get("/api/studies/<study_id:int>")
    @handle_json_api_exception
    def get_study_detail(study_id: int) -> BottleViewReturn:
        response.content_type = "application/json"
        summary = get_study_summary(storage, study_id)
        if summary is None:
            response.status = 404  # Not found
            return {"reason": f"study_id={study_id} is not found"}
        trials = get_trials(storage, study_id)
        return serializer.serialize_study_detail(summary, trials)

    @app.get("/static/<filename:path>")
    def send_static(filename: str) -> BottleViewReturn:
        return static_file(filename, root=STATIC_DIR)

    return app
