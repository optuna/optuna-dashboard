from __future__ import annotations

import functools
import logging
import os
import typing
from typing import Any
from typing import Optional
from typing import Union
import warnings

from bottle import Bottle
from bottle import redirect
from bottle import request
from bottle import response
from bottle import run
from bottle import static_file
import optuna
from optuna.exceptions import DuplicatedStudyError
from optuna.storages import BaseStorage
from optuna.study import StudyDirection
from optuna.trial import TrialState

from . import _note as note
from ._bottle_util import BottleViewReturn
from ._bottle_util import json_api_view
from ._cached_extra_study_property import get_cached_extra_study_property
from ._custom_plot_data import get_plotly_graph_objects
from ._importance import get_param_importance_from_trials_cache
from ._pareto_front import get_pareto_front_trials
from ._preference_setting import _register_preference_feedback_component
from ._preferential_history import NewHistory
from ._preferential_history import PreferenceHistoryNotFound
from ._preferential_history import remove_history
from ._preferential_history import report_history
from ._preferential_history import restore_history
from ._rdb_migration import register_rdb_migration_route
from ._serializer import serialize_study_detail
from ._serializer import serialize_study_summary
from ._storage import create_new_study
from ._storage import get_study_summaries
from ._storage import get_study_summary
from ._storage import get_trials
from ._storage_url import get_storage
from .artifact._backend import delete_all_artifacts
from .artifact._backend import register_artifact_route
from .artifact._backend_to_store import to_artifact_store
from .preferential._study import _SYSTEM_ATTR_PREFERENTIAL_STUDY
from .preferential._study import get_best_trials as get_best_preferential_trials
from .preferential._system_attrs import get_skipped_trial_ids
from .preferential._system_attrs import report_skip


if typing.TYPE_CHECKING:
    from _typeshed.wsgi import WSGIApplication
    from optuna.artifacts._protocol import ArtifactStore
    from optuna_dashboard.artifact.protocol import ArtifactBackend


logger = logging.getLogger(__name__)

# Static files
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "public")
IMG_DIR = os.path.join(BASE_DIR, "img")
cached_path_exists = functools.lru_cache(maxsize=10)(os.path.exists)


def create_app(
    storage: BaseStorage,
    artifact_store: Optional[ArtifactStore] = None,
    debug: bool = False,
) -> Bottle:
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

    @app.get("/api/meta")
    @json_api_view
    def api_meta() -> dict[str, Any]:
        return {
            "artifact_is_available": artifact_store is not None,
        }

    @app.get("/api/studies")
    @json_api_view
    def list_study_summaries() -> dict[str, Any]:
        summaries = get_study_summaries(storage)
        serialized = [serialize_study_summary(summary) for summary in summaries]
        return {
            "study_summaries": serialized,
        }

    @app.post("/api/studies")
    @json_api_view
    def create_study() -> dict[str, Any]:
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

    @app.post("/api/studies/<study_id:int>/rename")
    @json_api_view
    def rename_study(study_id: int) -> dict[str, Any]:
        dst_study_name = request.json.get("study_name", None)
        if dst_study_name is None:
            response.status = 400  # Bad request
            return {"reason": "You need to set study_name and direction"}

        src_study_name = storage.get_study_name_from_id(study_id)
        try:
            src_study = optuna.load_study(storage=storage, study_name=src_study_name)
        except KeyError:
            response.status = 404  # Not found
            return {"reason": f"study_id={study_id} is not found"}

        try:
            dst_study = optuna.create_study(
                storage=storage, study_name=dst_study_name, directions=src_study.directions
            )
            dst_study.add_trials(src_study.get_trials(deepcopy=False))
            note.copy_notes(storage, src_study, dst_study)
        except DuplicatedStudyError:
            response.status = 400  # Bad request
            return {"reason": f"study_name={dst_study_name} is duplicaated"}
        except Exception as e:
            logger.exception("Unexpected error:")
            response.status = 500
            storage.delete_study(dst_study._study_id)
            return {"reason": str(e)}
        new_study_summary = get_study_summary(storage, dst_study._study_id)
        if new_study_summary is None:
            response.status = 500
            return {"reason": "Failed to load the new study"}

        storage.delete_study(src_study._study_id)
        response.status = 201
        return serialize_study_summary(new_study_summary)

    @app.delete("/api/studies/<study_id:int>")
    @json_api_view
    def delete_study(study_id: int) -> dict[str, Any]:
        if artifact_store is not None:
            delete_all_artifacts(artifact_store, storage, study_id)

        try:
            storage.delete_study(study_id)
        except KeyError:
            response.status = 404  # Not found
            return {"reason": f"study_id={study_id} is not found"}
        response.status = 204  # No content
        return {}

    @app.get("/api/studies/<study_id:int>")
    @json_api_view
    def get_study_detail(study_id: int) -> dict[str, Any]:
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

        system_attrs = getattr(summary, "system_attrs", {})
        is_preferential = system_attrs.get(_SYSTEM_ATTR_PREFERENTIAL_STUDY, False)
        # TODO(c-bata): Cache best_trials
        if is_preferential:
            best_trials = get_best_preferential_trials(study_id, storage)
        elif len(summary.directions) == 1:
            if len([t for t in trials if t.state == TrialState.COMPLETE]) == 0:
                best_trials = []
            else:
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

        plotly_graph_objects = get_plotly_graph_objects(system_attrs)
        skipped_trial_ids = get_skipped_trial_ids(system_attrs)
        skipped_trial_numbers = [t.number for t in trials if t._trial_id in skipped_trial_ids]
        return serialize_study_detail(
            summary,
            best_trials,
            trials[after:],
            intersection,
            union,
            union_user_attrs,
            has_intermediate_values,
            plotly_graph_objects,
            skipped_trial_numbers,
        )

    @app.get("/api/studies/<study_id:int>/param_importances")
    @json_api_view
    def get_param_importances(study_id: int) -> dict[str, Any]:
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
    def save_study_note(study_id: int) -> dict[str, Any]:
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

        note.save_note_with_version(storage, study_id, None, req_note_ver, req_note_body)
        response.status = 204  # No content
        return {}

    @app.post("/api/studies/<study_id:int>/preference")
    @json_api_view
    def post_preference(study_id: int) -> dict[str, Any]:
        try:
            mode = request.json.get("mode", "")
            candidates = [int(d) for d in request.json.get("candidates", [])]
            clicked = int(request.json.get("clicked", -1))
        except ValueError:
            response.status = 400
            return {
                "reason": (
                    "`candidates` should be an array of integers and "
                    "`clicked` should be an integer."
                )
            }

        if clicked == -1:
            response.status = 400
            return {"reason": "`clicked` should be specified."}
        if mode != "ChooseWorst":
            response.status = 400
            return {"reason": "`mode` should be 'ChooseWorst'."}

        report_history(
            study_id,
            storage,
            NewHistory(
                mode=mode,
                candidates=candidates,
                clicked=clicked,
            ),
        )

        response.status = 204
        return {}

    @app.put("/api/studies/<study_id:int>/preference_feedback_component")
    @json_api_view
    def put_preference_feedback_component(study_id: int) -> dict[str, Any]:
        try:
            component_type = request.json.get("output_type", "")
            artifact_key = request.json.get("artifact_key", None)
        except ValueError:
            response.status = 400
            return {"reason": "invalid request."}
        if component_type not in ["note", "artifact"]:
            response.status = 400
            return {"reason": "component_type must be either 'note' or 'artifact'."}

        _register_preference_feedback_component(
            study_id=study_id,
            storage=storage,
            component_type=component_type,
            artifact_key=artifact_key,
        )
        response.status = 204
        return {}

    @app.delete("/api/studies/<study_id:int>/preference/<history_id>")
    @json_api_view
    def remove_preference(study_id: int, history_id: str) -> dict[str, Any]:
        try:
            remove_history(study_id, storage, history_id)
        except PreferenceHistoryNotFound:
            response.status = 404
            return {"reason": f"history_id={history_id} is not found"}

        response.status = 204
        return {}

    @app.post("/api/studies/<study_id:int>/preference/<history_id>")
    @json_api_view
    def restore_preference(study_id: int, history_id: str) -> dict[str, Any]:
        try:
            restore_history(study_id, storage, history_id)
        except PreferenceHistoryNotFound:
            response.status = 404
            return {"reason": f"history_id={history_id} is not found"}

        response.status = 204
        return {}

    @app.post("/api/trials/<trial_id:int>/tell")
    @json_api_view
    def tell_trial(trial_id: int) -> dict[str, Any]:
        if "state" not in request.json:
            response.status = 400  # Bad request
            return {"reason": "state must be specified."}

        try:
            state = TrialState[request.json["state"].upper()]
        except Exception:  # To catch KeyError and Exception by non str case.
            response.status = 400  # Bad request
            return {"reason": "state must be either 'Complete' or 'Fail'."}

        if state not in [TrialState.COMPLETE, TrialState.FAIL]:
            response.status = 400  # Bad request
            return {"reason": "state must be either 'Complete' or 'Fail'."}

        values = None
        if state == TrialState.COMPLETE:
            vs = request.json.get("values")
            if vs is None:
                response.status = 400  # Bad request
                return {"reason": "values attribute is required when state is 'Complete'."}
            try:
                values = [float(v) for v in vs]
            except (ValueError, TypeError):
                response.status = 400  # Bad request
                return {"reason": "values attribute must be an array of numbers"}

        storage.set_trial_state_values(trial_id, state, values)

        response.status = 204
        return {}

    @app.post("/api/trials/<trial_id:int>/user-attrs")
    @json_api_view
    def save_trial_user_attrs(trial_id: int) -> dict[str, Any]:
        user_attrs = request.json.get("user_attrs", {})
        if not user_attrs:
            response.status = 400  # Bad request
            return {"reason": "user_attrs must be specified."}

        for key, val in user_attrs.items():
            storage.set_trial_user_attr(trial_id, key, val)

        response.status = 204
        return {}

    @app.post("/api/studies/<study_id:int>/<trial_id:int>/skip")
    @json_api_view
    def skip_trial(study_id: int, trial_id: int) -> dict[str, Any]:
        try:
            system_attrs = storage.get_study_system_attrs(study_id)
        except KeyError:
            response.status = 404  # Not found
            return {"reason": f"study_id={study_id} is not found"}
        is_preferential = system_attrs.get(_SYSTEM_ATTR_PREFERENTIAL_STUDY, False)
        if not is_preferential:
            response.status = 400  # Bad request
            return {"reason": "The study is not preferential."}

        report_skip(study_id, trial_id, storage)
        response.status = 204  # No content
        return {}

    @app.put("/api/studies/<study_id:int>/<trial_id:int>/note")
    @json_api_view
    def save_trial_note(study_id: int, trial_id: int) -> dict[str, Any]:
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

        note.save_note_with_version(storage, study_id, trial_id, req_note_ver, req_note_body)
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

    register_rdb_migration_route(app, storage)
    register_artifact_route(app, storage, artifact_store)
    return app


def run_server(
    storage: Union[str, BaseStorage],
    host: str = "localhost",
    port: int = 8080,
    artifact_store: Optional[ArtifactStore | ArtifactBackend] = None,
    *,
    artifact_backend: Optional[ArtifactBackend] = None,
) -> None:
    """Start running optuna-dashboard and blocks until the server terminates.

    This function uses wsgiref module which is not intended for the production
    use. If you want to run optuna-dashboard more secure and/or more fast,
    please use WSGI server like Gunicorn or uWSGI via :func:`wsgi` function.
    """
    # TODO(c-bata): Remove artifact_backend keyword argument in the future release.
    store: ArtifactStore | None = None
    if artifact_store is not None:
        store = to_artifact_store(artifact_store)
    elif artifact_backend is not None:
        warnings.warn(
            "The `artifact_backend` argument is deprecated. "
            "Please use `artifact_store` instead.",
            DeprecationWarning,
        )
        store = to_artifact_store(artifact_backend)

    app = create_app(get_storage(storage), artifact_store=store)
    run(app, host=host, port=port)


def wsgi(
    storage: Union[str, BaseStorage],
    artifact_store: Optional[ArtifactBackend | ArtifactStore] = None,
    *,
    artifact_backend: Optional[ArtifactBackend] = None,
) -> WSGIApplication:
    """This function exposes WSGI interface for people who want to run on the
    production-class WSGI servers like Gunicorn or uWSGI.
    """
    # TODO(c-bata): Remove artifact_backend keyword argument in the future release.
    store: ArtifactStore | None = None
    if artifact_store is not None:
        store = to_artifact_store(artifact_store)
    elif artifact_backend is not None:
        warnings.warn(
            "The `artifact_backend` argument is deprecated. "
            "Please use `artifact_store` instead.",
            DeprecationWarning,
        )
        store = to_artifact_store(artifact_backend)

    return create_app(get_storage(storage), artifact_store=store)
