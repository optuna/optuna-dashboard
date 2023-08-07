from __future__ import annotations

import io
import json
import mimetypes
import os.path
from typing import TYPE_CHECKING
import uuid
import warnings

from bottle import BaseRequest
from bottle import Bottle
from bottle import HTTPResponse
from bottle import request
from bottle import response
import optuna
from optuna.trial import FrozenTrial

from .._bottle_util import json_api_view
from .._bottle_util import parse_data_uri


if TYPE_CHECKING:
    from typing import Any
    from typing import Optional
    from typing import TypedDict

    from optuna.artifacts._protocol import ArtifactStore
    from optuna.storages import BaseStorage

    from .protocol import ArtifactBackend

    ArtifactMeta = TypedDict(
        "ArtifactMeta",
        {
            "artifact_id": str,
            "filename": str,
            "mimetype": str,
            "encoding": Optional[str],
        },
    )


ARTIFACTS_ATTR_PREFIX = "dashboard:artifacts:"
DEFAULT_MIME_TYPE = "application/octet-stream"
BaseRequest.MEMFILE_MAX = int(
    os.environ.get("OPTUNA_DASHBOARD_MEMFILE_MAX", 1024 * 1024 * 128)
)  # 128MB


def get_artifact_path(
    trial: optuna.Trial,
    artifact_id: str,
) -> str:
    """Get the URL path for a given artifact ID."""
    study_id = trial.study._study_id
    trial_id = trial._trial_id
    return f"/artifacts/{study_id}/{trial_id}/{artifact_id}"


def register_artifact_route(
    app: Bottle, storage: BaseStorage, artifact_store: Optional[ArtifactStore]
) -> None:
    @app.get("/artifacts/<study_id:int>/<trial_id:int>/<artifact_id:re:[0-9a-fA-F-]+>")
    def proxy_artifact(study_id: int, trial_id: int, artifact_id: str) -> HTTPResponse | bytes:
        if artifact_store is None:
            response.status = 400  # Bad Request
            return b"Cannot access to the artifacts."
        artifact_dict = get_artifact_meta(storage, study_id, trial_id, artifact_id)
        if artifact_dict is None:
            response.status = 404
            return b"Not Found"
        headers = {"Content-Type": artifact_dict["mimetype"]}
        encoding = artifact_dict.get("encoding")
        if encoding:
            headers["Content-Encodings"] = encoding

        fp = artifact_store.open_reader(artifact_id)
        return HTTPResponse(fp, headers=headers)

    @app.post("/api/artifacts/<study_id:int>/<trial_id:int>")
    @json_api_view
    def upload_artifact_api(study_id: int, trial_id: int) -> dict[str, Any]:
        # TODO(c-bata): Use optuna.artifacts.upload_artifact()
        if artifact_store is None:
            response.status = 400  # Bad Request
            return {"reason": "Cannot access to the artifacts."}
        file = request.json.get("file")
        if file is None:
            response.status = 400
            return {"reason": "Please specify the 'file' key."}

        _, data = parse_data_uri(file)
        filename = request.json.get("filename", "")
        artifact_id = str(uuid.uuid4())
        artifact_store.write(artifact_id, io.BytesIO(data))

        mimetype, encoding = mimetypes.guess_type(filename)
        artifact = {
            "artifact_id": artifact_id,
            "filename": filename,
            "mimetype": mimetype or DEFAULT_MIME_TYPE,
            "encoding": encoding,
        }
        attr_key = _artifact_prefix(trial_id=trial_id) + artifact_id
        storage.set_study_system_attr(study_id, attr_key, json.dumps(artifact))
        response.status = 201

        trial = storage.get_trial(trial_id)
        if trial is None:
            response.status = 400
            return {"reason": "Invalid study_id or trial_id"}
        return {
            "artifact_id": artifact_id,
            "artifacts": list_trial_artifacts(storage.get_study_system_attrs(study_id), trial),
        }

    @app.delete("/api/artifacts/<study_id:int>/<trial_id:int>/<artifact_id:re:[0-9a-fA-F-]+>")
    @json_api_view
    def delete_artifact(study_id: int, trial_id: int, artifact_id: str) -> dict[str, Any]:
        if artifact_store is None:
            response.status = 400  # Bad Request
            return {"reason": "Cannot access to the artifacts."}
        artifact_store.remove(artifact_id)

        attr_key = _artifact_prefix(trial_id) + artifact_id
        storage.set_study_system_attr(study_id, attr_key, json.dumps(None))
        response.status = 204
        return {}


def upload_artifact(
    backend: ArtifactBackend,
    trial: optuna.Trial,
    file_path: str,
    *,
    mimetype: Optional[str] = None,
    encoding: Optional[str] = None,
) -> str:
    """Upload an artifact (files), which is associated with the trial.

    .. warning::

       This function is deprecated. Please use `optuna.artifacts.upload_artifact
       <https://optuna.readthedocs.io/en/latest/reference/generated/optuna.artifacts.
       upload_artifact.html>`_ instead.

    Example:
       .. code-block:: python

          import optuna
          from optuna_dashboard.artifact import upload_artifact
          from optuna_dashboard.artifact.file_system import FileSystemBackend

          artifact_backend = FileSystemBackend("./tmp/")

          def objective(trial: optuna.Trial) -> float:
              ... = trial.suggest_float("x", -10, 10)
              file_path = generate_example_png(...)
              upload_artifact(artifact_backend, trial, file_path)
              return ...
    """
    warnings.warn(
        "This function is deprecated. Please use optuna.artifacts.upload_artifact() instead.\n"
        "See https://optuna.readthedocs.io/en/latest/reference/generated/"
        "optuna.artifacts.upload_artifact.html",
        DeprecationWarning,
    )

    filename = os.path.basename(file_path)
    storage = trial.storage
    trial_id = trial._trial_id
    study_id = trial.study._study_id
    artifact_id = str(uuid.uuid4())
    guess_mimetype, guess_encoding = mimetypes.guess_type(filename)
    artifact: ArtifactMeta = {
        "artifact_id": artifact_id,
        "mimetype": mimetype or guess_mimetype or DEFAULT_MIME_TYPE,
        "encoding": encoding or guess_encoding,
        "filename": filename,
    }
    attr_key = _artifact_prefix(trial_id=trial_id) + artifact_id
    storage.set_study_system_attr(study_id, attr_key, json.dumps(artifact))

    with open(file_path, "rb") as f:
        backend.write(artifact_id, f)
    return artifact_id


def _artifact_prefix(trial_id: int) -> str:
    return ARTIFACTS_ATTR_PREFIX + f"{trial_id}:"


def get_artifact_meta(
    storage: BaseStorage, study_id: int, trial_id: int, artifact_id: str
) -> Optional[ArtifactMeta]:
    study_system_attr = storage.get_study_system_attrs(study_id)
    attr_key = _artifact_prefix(trial_id=trial_id) + artifact_id
    artifact_meta = study_system_attr.get(attr_key)
    if artifact_meta is not None:
        return json.loads(artifact_meta)

    # See https://github.com/optuna/optuna/blob/f827582a8/optuna/artifacts/_upload.py#L71
    trial_system_attrs = storage.get_trial_system_attrs(trial_id)
    value = trial_system_attrs.get("artifacts:" + artifact_id)
    if value is not None:
        return json.loads(value)
    return None


def delete_all_artifacts(
    backend: ArtifactBackend, storage: BaseStorage, study_id: int
) -> None:
    artifact_metas = []
    study_system_attrs = storage.get_study_system_attrs(study_id)
    for trial in storage.get_all_trials(study_id):
        trial_artifacts = list_trial_artifacts(study_system_attrs, trial)
        artifact_metas.extend(trial_artifacts)

    for meta in artifact_metas:
        backend.remove(meta["artifact_id"])


def list_trial_artifacts(
    study_system_attrs: dict[str, Any], trial: FrozenTrial
) -> list[ArtifactMeta]:
    dashboard_artifact_metas = [
        json.loads(value)
        for key, value in study_system_attrs.items()
        if key.startswith(_artifact_prefix(trial._trial_id))
    ]

    # See https://github.com/optuna/optuna/blob/f827582a8/optuna/artifacts/_upload.py#L16
    optuna_artifact_metas = [
        json.loads(value)
        for key, value in trial.system_attrs.items()
        if key.startswith("artifacts:")
    ]

    artifact_metas = dashboard_artifact_metas + optuna_artifact_metas
    return [a for a in artifact_metas if a is not None]
