from datetime import datetime
from datetime import timedelta
import functools
import json
import logging
import os
import threading
import traceback
import typing
from typing import Any
from typing import Callable
from typing import cast
from typing import Dict
from typing import List
from typing import Optional
from typing import TypeVar
from typing import Union

from bottle import BaseResponse
from bottle import Bottle
from bottle import redirect
from bottle import request
from bottle import response
from bottle import run
from bottle import static_file
from optuna.exceptions import DuplicatedStudyError
from optuna.storages import BaseStorage
from optuna.storages import RDBStorage
from optuna.storages import RedisStorage
from optuna.study import StudyDirection
from optuna.study import StudySummary
from optuna.trial import FrozenTrial

from . import _note as note
from ._importance import get_param_importance_from_trials_cache
from ._intermediate_values import has_intermediate_values
from ._search_space import get_search_space
from ._serializer import serialize_study_detail
from ._serializer import serialize_study_summary


if typing.TYPE_CHECKING:
    from _typeshed.wsgi import WSGIApplication

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
    <script defer src="/static/bundle.js"></script>
    <style>
        .optuna-loading-wrapper {
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }

        .optuna-loading-message {
            font-weight: 700;
            font-size: 32px;
            color: gray;
        }

        .optuna-animation {
            -webkit-transition-property: -webkit-transform;
            -webkit-transition-duration: 6s;
            -webkit-animation-name: rotate;
            -webkit-animation-iteration-count: infinite;
            -webkit-animation-timing-function: ease;

            -moz-transition-property: -moz-transform;
            -moz-animation-name: rotate;
            -moz-animation-duration: 6s;
            -moz-animation-iteration-count: infinite;
            -moz-animation-timing-function: ease;

            transition-property: transform;
            animation-name: rotate;
            animation-duration: 6s;
            animation-iteration-count: infinite;
            animation-timing-function: ease;
        }

        @-webkit-keyframes rotate {
            from {-webkit-transform: rotate(-1080deg); opacity: 0; }
            50% { -webkit-transform: rotate(0deg); opacity: 1; }
            to {-webkit-transform: rotate(1080deg); opacity: 0;}
        }

        @-moz-keyframes rotate {
            from {-moz-transform: rotate(-1080deg); opacity: 0; }
            50% { -moz-transform: rotate(0deg); opacity: 1; }
            to {-moz-transform: rotate(1080deg); opacity: 0;}
        }

        @keyframes rotate {
            from {transform: rotate(-1080deg); opacity: 0; }
            50% { transform: rotate(0deg); opacity: 1; }
            to {transform: rotate(1080deg); opacity: 0; }
        }
    </style>
</head>
<body>
    <div id="dashboard">
        <span class="optuna-loading-wrapper">
            <svg class="optuna-animation" xmlns="http://www.w3.org/2000/svg" width="294.7" height="280" viewBox="0 0 221 210">
                <path fill="rgb(6, 71, 135)" d="M104.5.6c-31.2 4.6-55 16.5-74.5 37A107.3 107.3 0 0 0 3.2 84.9a78.4 78.4 0 0 0-2.6 24.6c0 12.5.3 16.4 2.2 23.5a114.2 114.2 0 0 0 19.5 38 114 114 0 0 0 103.3 37.5 111.6 111.6 0 0 0 83.1-63.1 100.3 100.3 0 0 0 11-44.9c.4-11.5.1-15.7-1.5-23.5a85.3 85.3 0 0 0-25.1-47.1 98 98 0 0 0-49.4-27c-8-2-31.9-3.4-39.2-2.3zm35.3 16.8A90 90 0 0 1 206.7 80a112 112 0 0 1 0 40.8 103.3 103.3 0 0 1-73.7 72 76.6 76.6 0 0 1-25 2.5 77 77 0 0 1-23.2-2.1 99.6 99.6 0 0 1-68.4-66.7 64 64 0 0 1-2.8-22.5c-.1-11.3.3-14.8 2.2-21.4C25.5 49.2 53.6 25 92.5 16.9a156 156 0 0 1 47.3.5z"/>
                <path fill="rgb(12, 97, 152)" d="M94.6 29.5A88.3 88.3 0 0 0 68 39.1c-17 8.8-30.5 22-38.1 37.4a56.4 56.4 0 0 0-6.7 32c.9 18.9 7.2 32.1 22.7 47.5 13 12.8 25.8 20 44.9 25.2 11 3 31.5 2.9 42.7-.1a85.5 85.5 0 0 0 61.1-60.1c2.3-8.8 2.4-26.3.1-35a78.6 78.6 0 0 0-55.2-54.6 74.9 74.9 0 0 0-23.5-3c-9.9-.2-16.7.1-21.4 1.1zm37.2 11.1a61 61 0 0 1 29.7 17.9 55 55 0 0 1 18.6 43.6c.3 39.1-30.4 68.9-71.1 69.1-16.9 0-30-4.1-42.5-13.4A59.7 59.7 0 0 1 47.1 83c15.6-33 51.5-51 84.7-42.4z"/>
                <path fill="rgb(39, 126, 170)" d="M96 57.6a58.6 58.6 0 0 0-40 35 43 43 0 0 0 1.6 30.4 62.8 62.8 0 0 0 20.2 22.6 70.7 70.7 0 0 0 28.8 10c34.6 3.2 64.7-28.1 58-60.4a50 50 0 0 0-37.3-37.7c-7.2-1.9-24-1.8-31.3.1zm31.9 16.1A32 32 0 0 1 148 93.4c.7 2.4 1.1 6.8.8 11.5a28 28 0 0 1-3.8 13.9 43.4 43.4 0 0 1-18.8 17.9c-5.2 2.5-6.7 2.8-16.7 2.8-9.8 0-11.6-.3-16.7-2.7-17.2-8-24.7-25.5-17.6-41a43.9 43.9 0 0 1 52.7-22.1z"/>
                <path fill="rgb(77, 154, 184)" d="M109.5 86.9c-12.1 3-20.9 13.7-19.1 23.4 2.6 14.1 25 17.3 37.4 5.4 4.5-4.3 6.4-8.1 6.4-13.1.2-11.4-11.6-18.8-24.7-15.7zm7.7 11.8c4.5 4 .5 13.3-5.7 13.3-4.3 0-6.5-2.2-6.5-6.6 0-6.6 7.6-10.9 12.2-6.7z"/>
            </svg>
            <p class="optuna-loading-message">NOW LOADING</p>
        </span>
    </div>
</body>
</html>
"""  # noqa:E501
# In-memory trials cache
trials_cache_lock = threading.Lock()
trials_cache: Dict[int, List[FrozenTrial]] = {}
trials_last_fetched_at: Dict[int, datetime] = {}


def json_api_view(view: BottleView) -> BottleView:
    @functools.wraps(view)
    def decorated(*args: List[Any], **kwargs: Dict[str, Any]) -> BottleViewReturn:
        try:
            response.content_type = "application/json"
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
    @json_api_view
    def list_study_summaries() -> BottleViewReturn:
        summaries = [
            serialize_study_summary(summary)
            for summary in storage.get_all_study_summaries()
        ]
        return {
            "study_summaries": summaries,
        }

    @app.post("/api/studies")
    @json_api_view
    def create_study() -> BottleViewReturn:
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
        return {"study_summary": serialize_study_summary(summary)}

    @app.delete("/api/studies/<study_id:int>")
    @json_api_view
    def delete_study(study_id: int) -> BottleViewReturn:
        try:
            storage.delete_study(study_id)
        except KeyError:
            response.status = 404  # Not found
            return {"reason": f"study_id={study_id} is not found"}
        response.status = 204  # No content
        return ""

    @app.get("/api/studies/<study_id:int>")
    @json_api_view
    def get_study_detail(study_id: int) -> BottleViewReturn:
        try:
            after = int(request.params["after"])
            assert after >= 0
        except AssertionError:
            response.status = 400  # Bad parameter
            return {"reason": "`after` should be larger or equal 0."}
        except KeyError:
            after = 0
        summary = get_study_summary(storage, study_id)
        if summary is None:
            response.status = 404  # Not found
            return {"reason": f"study_id={study_id} is not found"}
        trials = get_trials(storage, study_id)
        intersection, union = get_search_space(study_id, trials)
        return serialize_study_detail(
            summary,
            trials[after:],
            intersection,
            union,
            has_intermediate_values(study_id, trials),
        )

    @app.get("/api/studies/<study_id:int>/param_importances")
    @json_api_view
    def get_param_importances(study_id: int) -> BottleViewReturn:
        # TODO(chenghuzi): add support for selecting params via query parameters.
        objective_id = int(request.params.get("objective_id", 0))
        try:
            n_directions = len(storage.get_study_directions(study_id))
        except KeyError:
            response.status = 404  # Study is not found
            return {"reason": f"study_id={study_id} is not found"}
        if objective_id >= n_directions:
            response.status = 400  # Bad request
            return {
                "reason": f"study_id={study_id} has only {n_directions} direction(s)."
            }

        trials = get_trials(storage, study_id)
        try:
            return get_param_importance_from_trials_cache(
                storage, study_id, objective_id, trials
            )
        except ValueError as e:
            response.status = 400  # Bad request
            return {"reason": str(e)}

    @app.put("/api/studies/<study_id:int>/note")
    @json_api_view
    def save_note(study_id: int) -> BottleViewReturn:
        req_note_ver = request.json.get("version", None)
        req_note_body = request.json.get("body", None)
        if req_note_ver is None or req_note_body is None:
            response.status = 400  # Bad request
            return {"reason": "Invalid request."}

        system_attrs = storage.get_study_system_attrs(study_id)
        if not note.version_is_incremented(system_attrs, req_note_ver):
            response.status = 409  # Conflict
            return {
                "reason": "The text you are editing has changed. "
                "Please copy your edits and refresh the page.",
                "note": note.get_note_from_system_attrs(system_attrs),
            }

        note.save_note(storage, study_id, req_note_ver, req_note_body)
        response.status = 204  # No content
        return {}

    @app.get("/static/<filename:path>")
    def send_static(filename: str) -> BottleViewReturn:
        return static_file(filename, root=STATIC_DIR)

    return app


def get_storage(storage: Union[str, BaseStorage]) -> BaseStorage:
    if isinstance(storage, str):
        if storage.startswith("redis"):
            return RedisStorage(storage)
        else:
            return RDBStorage(storage)
    return storage


def run_server(
    storage: Union[str, BaseStorage], host: str = "localhost", port: int = 8080
) -> None:
    """Start running optuna-dashboard and blocks until the server terminates.
    This function uses wsgiref module which is not intended for the production
    use. If you want to run optuna-dashboard more secure and/or more fast,
    please use WSGI server like Gunicorn or uWSGI via `wsgi()` function.
    """
    app = create_app(get_storage(storage))
    run(app, host=host, port=port)


def wsgi(storage: Union[str, BaseStorage]) -> "WSGIApplication":
    """This function exposes WSGI interface for people who want to run on the
    production-class WSGI servers like Gunicorn or uWSGI.
    """
    return create_app(get_storage(storage))
