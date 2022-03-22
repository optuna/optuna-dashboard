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
IMG_DIR = os.path.join(BASE_DIR, "img")

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


def create_app(storage: BaseStorage, debug: bool = False) -> Bottle:
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
        return static_file("index.html", BASE_DIR, mimetype="text/html")

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

    @app.get("/favicon.ico")
    def favicon() -> BottleViewReturn:
        use_gzip = "gzip" in request.headers["Accept-Encoding"]
        filename = "favicon.ico.gz" if use_gzip else "favicon.ico"
        return static_file(filename, IMG_DIR)

    @app.get("/static/<filename:path>")
    def send_static(filename: str) -> BottleViewReturn:
        if not debug and "gzip" in request.headers["Accept-Encoding"]:
            gz_filename = filename.strip("/\\") + ".gz"
            if os.path.exists(os.path.join(STATIC_DIR, gz_filename)):
                filename = gz_filename
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
