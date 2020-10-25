from datetime import datetime, timedelta
import functools
import json
import logging
import os
import threading
import traceback
from typing import Union, Dict, List

from bottle import Bottle, redirect, request, response, static_file
from optuna.storages import BaseStorage, get_storage
from optuna.trial import FrozenTrial
from optuna.study import StudyDirection, StudySummary

from . import serializer

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


def handle_json_api_exception(view):
    @functools.wraps(view)
    def decorated(*args, **kwargs):
        try:
            response_body = view(*args, **kwargs)
            return response_body
        except Exception as e:
            response.status = 500
            response.content_type = "application/json"
            stacktrace = "\n".join(traceback.format_tb(e.__traceback__))
            logger.error(f"Exception: {e}\n{stacktrace}")
            return json.dumps({"reason": "internal server error"})

    return decorated


def get_study_summary(storage: BaseStorage, study_id: int) -> StudySummary:
    summaries = storage.get_all_study_summaries()
    for summary in summaries:
        if summary._study_id != study_id:
            continue
        return summary


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

    @app.get("/")
    def index():
        return redirect("/dashboard", 302)  # Status Found

    # Accept any following paths for client-side routing
    @app.get("/dashboard<:re:(/.*)?>")
    def dashboard():
        response.content_type = "text/html"
        return INDEX_HTML

    @app.get("/api/studies")
    @handle_json_api_exception
    def list_study_summaries():
        response.content_type = "application/json"
        summaries = [
            serializer.serialize_study_summary(summary)
            for summary in storage.get_all_study_summaries()
        ]
        return json.dumps(
            {
                "study_summaries": summaries,
            }
        )

    @app.post("/api/studies")
    @handle_json_api_exception
    def create_study():
        response.content_type = "application/json"

        study_name = request.json.get("study_name", None)
        direction = request.json.get("direction", None)
        if study_name is None or direction not in ("minimize", "maximize"):
            response.status = 400  # Bad request
            return {"reason": "You need to set study_name and direction"}

        study_id = storage.create_new_study(study_name)
        if direction.lower() == "maximize":
            storage.set_study_direction(study_id, StudyDirection.MAXIMIZE)
        else:
            storage.set_study_direction(study_id, StudyDirection.MINIMIZE)

        summary = get_study_summary(storage, study_id)
        response.status = 201  # Created
        return json.dumps(
            {"study_summary": serializer.serialize_study_summary(summary)}
        )

    @app.delete("/api/studies/<study_id:int>")
    @handle_json_api_exception
    def delete_study(study_id: int):
        response.content_type = "application/json"

        storage.delete_study(study_id)
        response.status = 204  # No content
        return ""

    @app.get("/api/studies/<study_id:int>")
    @handle_json_api_exception
    def get_study_detail(study_id: int):
        response.content_type = "application/json"
        summary = get_study_summary(storage, study_id)
        trials = get_trials(storage, study_id)
        return json.dumps(serializer.serialize_study_detail(summary, trials))

    @app.get("/static/<filename:path>")
    def send_static(filename):
        return static_file(filename, root=STATIC_DIR)

    return app
