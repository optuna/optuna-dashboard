from __future__ import annotations

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
from typing import Optional
from typing import TypeVar
from typing import Union

from bottle import BaseResponse
from bottle import Bottle
from bottle import redirect
from bottle import request
from bottle import response
from bottle import run
from bottle import SimpleTemplate
from bottle import static_file
from optuna.exceptions import DuplicatedStudyError
from optuna.storages import BaseStorage
from optuna.storages import RDBStorage
from optuna.study import StudyDirection
from optuna.study import StudySummary
from optuna.trial import FrozenTrial
from optuna.version import __version__ as optuna_ver
from packaging import version

from . import _note as note
from ._cached_extra_study_property import get_cached_extra_study_property
from ._importance import get_param_importance_from_trials_cache
from ._pareto_front import get_pareto_front_trials
from ._serializer import serialize_study_detail
from ._serializer import serialize_study_summary


if typing.TYPE_CHECKING:
    from _typeshed.wsgi import WSGIApplication

    try:
        from optuna.study._frozen import FrozenStudy
    except ImportError:
        FrozenStudy = None  # type: ignore

BottleViewReturn = Union[str, bytes, Dict[str, Any], BaseResponse]
BottleView = TypeVar("BottleView", bound=Callable[..., BottleViewReturn])

logger = logging.getLogger(__name__)

# Static files
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "public")
IMG_DIR = os.path.join(BASE_DIR, "img")
cached_path_exists = functools.lru_cache(maxsize=10)(os.path.exists)

# In-memory trials cache
trials_cache_lock = threading.Lock()
trials_cache: dict[int, list[FrozenTrial]] = {}
trials_last_fetched_at: dict[int, datetime] = {}

# RDB schema migration check
rdb_schema_migrate_lock = threading.Lock()
rdb_schema_needs_migrate = False
rdb_schema_unsupported = False
rdb_schema_template = SimpleTemplate(
    """<!DOCTYPE html>
<html lang="en">
<head>
<title>Incompatible RDB Schema Error - Optuna Dashboard</title>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
body {
    padding: 0;
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}
.wrapper {
    padding: 64px;
    width: 600px;
    background-color: rgb(255, 255, 255);
    box-shadow: rgba(0, 0, 0, 0.08) 0 8px 24px;
    margin: 0px auto;
    border-radius: 8px;
}
</style>
</head>
<body>
    <div class="wrapper">
    <h1>Error: Incompatible RDB Schema</h1>
% if rdb_schema_unsupported:
    <p>Your Optuna version {{ optuna_ver }} seems outdated against the storage version. Please try updating optuna to the latest version by `$ pip install -U optuna`.</p>
% elif rdb_schema_needs_migrate:
    <p>The runtime optuna version {{ optuna_ver }} is no longer compatible with the table schema. Please execute `$ optuna storage upgrade --storage $STORAGE_URL` or press the following button for upgrading the storage.</p>
    <form action="/incompatible-rdb-schema" method="post">
    <button>Migrate</button>
    </form>
% end
    </div>
</body>
</html>"""  # noqa: E501
)


def update_schema_compatibility_flags(storage: BaseStorage) -> None:
    global rdb_schema_needs_migrate, rdb_schema_unsupported
    if not isinstance(storage, RDBStorage):
        return

    with rdb_schema_migrate_lock:
        current_version = storage.get_current_version()
        head_version = storage.get_head_version()
        rdb_schema_needs_migrate = current_version != head_version
        rdb_schema_unsupported = current_version not in storage.get_all_versions()


def json_api_view(view: BottleView) -> BottleView:
    @functools.wraps(view)
    def decorated(*args: list[Any], **kwargs: dict[str, Any]) -> BottleViewReturn:
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


def get_study_summaries(storage: BaseStorage) -> list[StudySummary]:
    if version.parse(optuna_ver) >= version.Version("3.0.0rc0.dev"):
        frozen_studies = storage.get_all_studies()  # type: ignore
        return [_frozen_study_to_study_summary(s) for s in frozen_studies]
    elif version.parse(optuna_ver) >= version.Version("3.0.0b0.dev"):
        return storage.get_all_study_summaries(include_best_trial=False)  # type: ignore
    else:
        return storage.get_all_study_summaries()  # type: ignore


def get_study_summary(storage: BaseStorage, study_id: int) -> Optional[StudySummary]:
    summaries = get_study_summaries(storage)
    for summary in summaries:
        if summary._study_id != study_id:
            continue
        return summary
    return None


def create_new_study(
    storage: BaseStorage, study_name: str, directions: list[StudyDirection]
) -> int:
    if version.parse(optuna_ver) >= version.Version("3.1.0.dev") and version.parse(
        optuna_ver
    ) != version.Version("3.1.0b0"):
        study_id = storage.create_new_study(directions, study_name=study_name)  # type: ignore
    else:
        study_id = storage.create_new_study(study_name)  # type: ignore
        storage.set_study_directions(study_id, directions)  # type: ignore
    return study_id


def get_trials(storage: BaseStorage, study_id: int, ttl_seconds: int = 10) -> list[FrozenTrial]:
    with trials_cache_lock:
        trials = trials_cache.get(study_id, None)
        last_fetched_at = trials_last_fetched_at.get(study_id, None)
        if (
            trials is not None
            and last_fetched_at is not None
            and datetime.now() - last_fetched_at < timedelta(seconds=ttl_seconds)
        ):
            return trials
    trials = storage.get_all_trials(study_id, deepcopy=False)

    if (
        # See https://github.com/optuna/optuna/pull/3702
        version.parse(optuna_ver) <= version.Version("3.0.0rc0.dev")
        and isinstance(storage, RDBStorage)
        and storage.url.startswith("postgresql")
    ):
        trials = sorted(trials, key=lambda t: t.number)

    with trials_cache_lock:
        trials_last_fetched_at[study_id] = datetime.now()
        trials_cache[study_id] = trials
    return trials


def create_app(storage: BaseStorage, debug: bool = False) -> Bottle:
    app = Bottle()
    update_schema_compatibility_flags(storage)

    @app.hook("before_request")
    def remove_trailing_slashes_hook() -> None:
        request.environ["PATH_INFO"] = request.environ["PATH_INFO"].rstrip("/")

    @app.get("/")
    def index() -> BottleViewReturn:
        update_schema_compatibility_flags(storage)
        if rdb_schema_needs_migrate or rdb_schema_unsupported:
            return redirect("/incompatible-rdb-schema", 302)
        return redirect("/dashboard", 302)  # Status Found

    # Accept any following paths for client-side routing
    @app.get("/dashboard<:re:(/.*)?>")
    def dashboard() -> BottleViewReturn:
        if rdb_schema_needs_migrate or rdb_schema_unsupported:
            return redirect("/incompatible-rdb-schema", 302)
        return static_file("index.html", BASE_DIR, mimetype="text/html")

    @app.get("/incompatible-rdb-schema")
    def get_incompatible_rdb_schema() -> BottleViewReturn:
        if not rdb_schema_needs_migrate and not rdb_schema_unsupported:
            return redirect("/dashboard", 302)
        assert isinstance(storage, RDBStorage)
        return rdb_schema_template.render(
            rdb_schema_needs_migrate=rdb_schema_needs_migrate,
            rdb_schema_unsupported=rdb_schema_unsupported,
            optuna_ver=optuna_ver,
        )

    @app.post("/incompatible-rdb-schema")
    def post_incompatible_rdb_schema() -> BottleViewReturn:
        global rdb_schema_needs_migrate
        assert isinstance(storage, RDBStorage)
        assert not rdb_schema_unsupported
        with rdb_schema_migrate_lock:
            storage.upgrade()
            rdb_schema_needs_migrate = False
        return redirect("/dashboard", 302)

    @app.get("/api/studies")
    @json_api_view
    def list_study_summaries() -> BottleViewReturn:
        summaries = get_study_summaries(storage)
        serialized = [serialize_study_summary(summary) for summary in summaries]
        return {
            "study_summaries": serialized,
        }

    @app.post("/api/studies")
    @json_api_view
    def create_study() -> BottleViewReturn:
        study_name = request.json.get("study_name", None)
        request_directions = [d.lower() for d in request.json.get("directions", [])]
        if (
            study_name is None
            or len(request_directions) == 0
            or not all([d in ("minimize", "maximize") for d in request_directions])
        ):
            response.status = 400  # Bad request
            return {"reason": "You need to set study_name and direction"}

        directions = [
            StudyDirection.MAXIMIZE if d == "maximize" else StudyDirection.MINIMIZE
            for d in request_directions
        ]
        try:
            study_id = create_new_study(storage, study_name, directions)
        except DuplicatedStudyError:
            response.status = 400  # Bad request
            return {"reason": f"'{study_name}' already exists"}

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

        # TODO(c-bata): Cache best_trials
        if summary.directions == 1:
            best_trials = [storage.get_best_trial(study_id)]
        else:
            best_trials = get_pareto_front_trials(trials=trials, directions=summary.directions)
        (
            # TODO: intersection_search_space and union_search_space look more clear since now we
            # have union_user_attrs.
            intersection,
            union,
            union_user_attrs,
            has_intermediate_values,
        ) = get_cached_extra_study_property(study_id, trials)
        return serialize_study_detail(
            summary,
            best_trials,
            trials[after:],
            intersection,
            union,
            union_user_attrs,
            has_intermediate_values,
        )

    @app.get("/api/studies/<study_id:int>/param_importances")
    @json_api_view
    def get_param_importances(study_id: int) -> BottleViewReturn:
        try:
            n_directions = len(storage.get_study_directions(study_id))
        except KeyError:
            response.status = 404  # Study is not found
            return {"reason": f"study_id={study_id} is not found"}

        trials = get_trials(storage, study_id)
        try:
            importances = [
                get_param_importance_from_trials_cache(storage, study_id, objective_id, trials)
                for objective_id in range(n_directions)
            ]
            return {"param_importances": importances}
        except ValueError as e:
            response.status = 400  # Bad request
            return {"reason": str(e)}

    @app.put("/api/studies/<study_id:int>/note")
    @json_api_view
    def save_study_note(study_id: int) -> BottleViewReturn:
        req_note_ver = request.json.get("version", None)
        req_note_body = request.json.get("body", None)
        if req_note_ver is None or req_note_body is None:
            response.status = 400  # Bad request
            return {"reason": "Invalid request."}

        system_attrs = storage.get_study_system_attrs(study_id)
        if not note.version_is_incremented(system_attrs, None, req_note_ver):
            response.status = 409  # Conflict
            return {
                "reason": "The text you are editing has changed. "
                "Please copy your edits and refresh the page.",
                "note": note.get_note_from_system_attrs(system_attrs, None),
            }

        note.save_note(storage, study_id, None, req_note_ver, req_note_body)
        response.status = 204  # No content
        return {}

    @app.put("/api/studies/<study_id:int>/<trial_id:int>/note")
    @json_api_view
    def save_trial_note(study_id: int, trial_id: int) -> BottleViewReturn:
        req_note_ver = request.json.get("version", None)
        req_note_body = request.json.get("body", None)
        if req_note_ver is None or req_note_body is None:
            response.status = 400  # Bad request
            return {"reason": "Invalid request."}

        # Store note content in study system attrs since it's always updatable.
        system_attrs = storage.get_study_system_attrs(study_id=study_id)
        if not note.version_is_incremented(system_attrs, trial_id, req_note_ver):
            response.status = 409  # Conflict
            return {
                "reason": "The text you are editing has changed. "
                "Please copy your edits and refresh the page.",
                "note": note.get_note_from_system_attrs(system_attrs, trial_id),
            }

        note.save_note(storage, study_id, trial_id, req_note_ver, req_note_body)
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
            if cached_path_exists(os.path.join(STATIC_DIR, gz_filename)):
                filename = gz_filename
        return static_file(filename, root=STATIC_DIR)

    return app


# TODO(c-bata): Remove type:ignore after released Optuna v3.0.0rc0.
def _frozen_study_to_study_summary(frozen_study: "FrozenStudy") -> StudySummary:  # type: ignore
    is_single = len(frozen_study.directions) == 1
    return StudySummary(
        study_name=frozen_study.study_name,
        study_id=frozen_study._study_id,
        direction=frozen_study.direction if is_single else None,
        directions=frozen_study.directions if not is_single else None,
        user_attrs=frozen_study.user_attrs,
        system_attrs=frozen_study.system_attrs,
        best_trial=None,
        n_trials=-1,  # This field isn't used by Dashboard.
        datetime_start=None,
    )


def get_storage(storage: Union[str, BaseStorage]) -> BaseStorage:
    if isinstance(storage, str):
        if storage.startswith("redis"):
            raise ValueError(
                "RedisStorage is unsupported from Optuna v3.1 or Optuna Dashboard v0.8.0"
            )
        elif version.parse(optuna_ver) >= version.Version("v3.0.0"):
            return RDBStorage(storage, skip_compatibility_check=True, skip_table_creation=True)
        else:
            return RDBStorage(storage, skip_compatibility_check=True)
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


def wsgi(storage: Union[str, BaseStorage]) -> WSGIApplication:
    """This function exposes WSGI interface for people who want to run on the
    production-class WSGI servers like Gunicorn or uWSGI.
    """
    return create_app(get_storage(storage))
