import functools
import json
import logging
import os
import traceback

from bottle import Bottle, redirect, request, response, static_file
from optuna import storages
from optuna.study import StudyDirection

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
    <noscript>You need to enable JavaScript to run this dashboard.</noscript>
    <div id="dashboard">
         <p>Now loading...</p>
    </div>
</body>
</html>
"""


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


def get_study_summary(storage, study_id):
    summaries = storage.get_all_study_summaries()
    for summary in summaries:
        if summary._study_id != study_id:
            continue
        return summary


def create_app(storage):
    app = Bottle()
    storage = storages.get_storage(storage)

    @app.get("/")
    def index():
        return redirect("/dashboard", 302)  # Found

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
            response.status = 400
            return {"reason": "You need to set study_name and direction"}

        study_id = storage.create_new_study(study_name)
        if direction.lower() == "maximize":
            storage.set_study_direction(study_id, StudyDirection.MAXIMIZE)
        else:
            storage.set_study_direction(study_id, StudyDirection.MINIMIZE)

        summary = get_study_summary(storage, study_id)
        response.status = 201
        return json.dumps(
            {"study_summary": serializer.serialize_study_summary(summary)}
        )

    @app.get("/api/studies/<study_id:int>")
    @handle_json_api_exception
    def get_study_detail(study_id: int):
        response.content_type = "application/json"
        summary = get_study_summary(storage, study_id)
        trials = storage.get_all_trials(study_id)
        return json.dumps(serializer.serialize_study_detail(summary, trials))

    @app.get("/static/<filename:path>")
    def send_static(filename):
        return static_file(filename, root=STATIC_DIR)

    return app
