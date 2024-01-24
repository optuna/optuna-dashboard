import base64
import json
import tempfile
from unittest.mock import MagicMock

import optuna
from packaging import version
import pytest


if version.parse(optuna.__version__) < version.parse("3.3.0"):
    pytest.skip("optuna.artiracts module is introduced at v3.3.0", allow_module_level=True)

from optuna.artifacts import FileSystemArtifactStore
from optuna.artifacts import upload_artifact
from optuna.storages import BaseStorage
from optuna_dashboard._app import create_app
from optuna_dashboard.artifact import _backend
from optuna_dashboard.artifact import upload_artifact as dashboard_upload_artifact
from optuna_dashboard.artifact._backend_to_store import to_artifact_store
from optuna_dashboard.artifact.file_system import FileSystemBackend

from ..wsgi_client import send_request


def test_get_artifact_path() -> None:
    study = MagicMock(_study_id=0)
    trial = MagicMock(_trial_id=0, study=study)
    assert _backend.get_artifact_path(trial, "id0") == "/artifacts/0/0/id0"


def test_artifact_prefix() -> None:
    actual = _backend._dashboard_artifact_prefix(trial_id=0)
    assert actual == "dashboard:artifacts:0:"


@pytest.fixture()
def init_storage_with_artifact_meta() -> BaseStorage:
    from optuna import create_study
    from optuna.storages import InMemoryStorage

    storage = InMemoryStorage()
    study = create_study(storage=storage)

    study_system_attrs = {
        "dashboard:artifacts:0:id0": '{"artifact_id": "id0", "filename": "foo.txt"}',
        "dashboard:artifacts:0:id1": '{"artifact_id": "id1", "filename": "bar.txt"}',
        "baz": "baz",
    }
    for key, value in study_system_attrs.items():
        study.set_system_attr(key, value)

    trial_system_attrs = {
        "artifacts:id2": '{"artifact_id": "id2", "filename": "baz.txt"}',
        "artifacts:id3": '{"artifact_id": "id3", "filename": "qux.txt"}',
    }
    for key, value in trial_system_attrs.items():
        trial = study.ask()
        trial.set_system_attr(key, value)
        study.tell(trial, 0.0)

    return storage


def test_get_artifact_meta(init_storage_with_artifact_meta: MagicMock) -> None:
    storage = init_storage_with_artifact_meta

    actual = _backend.get_trial_artifact_meta(storage, study_id=0, trial_id=0, artifact_id="id0")
    assert actual == {"artifact_id": "id0", "filename": "foo.txt"}

    actual = _backend.get_trial_artifact_meta(storage, study_id=0, trial_id=1, artifact_id="id3")
    assert actual == {"artifact_id": "id3", "filename": "qux.txt"}

    actual = _backend.get_trial_artifact_meta(storage, study_id=0, trial_id=0, artifact_id="id4")
    assert actual is None


def test_delete_all_artifacts(init_storage_with_artifact_meta: MagicMock) -> None:
    backend = MagicMock()
    storage = init_storage_with_artifact_meta
    _backend.delete_all_artifacts(backend, storage, study_id=0)

    assert backend.remove.call_args_list == [
        (("id0",),),
        (("id1",),),
        (("id2",),),
        (("id3",),),
    ]


def test_list_trial_artifacts(init_storage_with_artifact_meta: MagicMock) -> None:
    storage = init_storage_with_artifact_meta
    trial_system_attrs = storage.get_trial_system_attrs(0)
    trial = MagicMock(_trial_id=0, system_attrs={})

    actual = _backend.list_trial_artifacts(
        storage.get_study_system_attrs(0), trial_system_attrs, trial
    )
    assert actual == [
        {"artifact_id": "id0", "filename": "foo.txt"},
        {"artifact_id": "id1", "filename": "bar.txt"},
        {"artifact_id": "id2", "filename": "baz.txt"},
    ]


def test_study_artifact_store_none() -> None:
    storage = optuna.storages.InMemoryStorage()
    app = create_app(storage)
    status, _, body = send_request(
        app,
        "/artifacts/0/0",
        "GET",
    )
    assert status == 400


def test_study_artifact_not_found() -> None:
    storage = optuna.storages.InMemoryStorage()
    study = optuna.create_study(storage=storage)
    with tempfile.TemporaryDirectory() as tmpdir:
        artifact_store = FileSystemArtifactStore(tmpdir)
        app = create_app(storage, artifact_store)
        status, _, body = send_request(
            app,
            f"/artifacts/{study._study_id}/abc123",
            "GET",
        )
        assert status == 404


def test_successful_study_artifact_retrieval() -> None:
    storage = optuna.storages.InMemoryStorage()
    study = optuna.create_study(storage=storage)
    with tempfile.TemporaryDirectory() as tmpdir:
        artifact_store = FileSystemArtifactStore(tmpdir)
        with tempfile.NamedTemporaryFile() as f:
            f.write(b"dummy_content")
            f.flush()
            artifact_id = upload_artifact(study, f.name, artifact_store=artifact_store)
        app = create_app(storage, artifact_store)
        status, _, body = send_request(
            app,
            f"/artifacts/{study._study_id}/{artifact_id}",
            "GET",
        )
        assert status == 200
        assert body == b"dummy_content"


def test_trial_artifact_store_none() -> None:
    storage = optuna.storages.InMemoryStorage()
    app = create_app(storage)
    status, _, body = send_request(
        app,
        "/artifacts/0/0/0",
        "GET",
    )
    assert status == 400


def test_trial_artifact_not_found() -> None:
    storage = optuna.storages.InMemoryStorage()
    study = optuna.create_study(storage=storage)
    trial = study.ask()
    with tempfile.TemporaryDirectory() as tmpdir:
        artifact_store = FileSystemArtifactStore(tmpdir)
        app = create_app(storage, artifact_store)
        status, _, body = send_request(
            app,
            f"/artifacts/{study._study_id}/{trial._trial_id}/abc123",
            "GET",
        )
        assert status == 404


def test_successful_trial_artifact_retrieval() -> None:
    storage = optuna.storages.InMemoryStorage()
    study = optuna.create_study(storage=storage)
    trial = study.ask()
    with tempfile.TemporaryDirectory() as tmpdir:
        artifact_store = FileSystemArtifactStore(tmpdir)
        with tempfile.NamedTemporaryFile() as f:
            f.write(b"dummy_content")
            f.flush()
            artifact_id = upload_artifact(trial, f.name, artifact_store=artifact_store)
        app = create_app(storage, artifact_store)
        status, _, body = send_request(
            app,
            f"/artifacts/{study._study_id}/{trial._trial_id}/{artifact_id}",
            "GET",
        )
        assert status == 200
        assert body == b"dummy_content"


DUMMY_DATA_URL = (
    f"data:text/plain; charset=utf-8,{base64.b64encode(b'dummy_content').decode('utf-8')}"
)


def test_upload_artifact_invalid_no_trial() -> None:
    storage = optuna.storages.InMemoryStorage()

    with tempfile.TemporaryDirectory() as tmpdir:
        artifact_store = FileSystemArtifactStore(tmpdir)

        app = create_app(storage, artifact_store)
        study = optuna.create_study(storage=storage)

        status, _, body = send_request(
            app,
            f"/api/artifacts/{study._study_id}/0",
            "POST",
            body=json.dumps({"file": DUMMY_DATA_URL}),
            content_type="application/json",
        )
        assert status == 500  # TODO(contramundum53): This should return 400


def test_upload_artifact_invalid_complete_trial() -> None:
    storage = optuna.storages.InMemoryStorage()

    with tempfile.TemporaryDirectory() as tmpdir:
        artifact_store = FileSystemArtifactStore(tmpdir)

        app = create_app(storage, artifact_store)
        study = optuna.create_study(storage=storage)

        study.add_trial(optuna.create_trial(value=1.0, distributions={}, params={}))
        trial = study.trials[-1]
        status, _, body = send_request(
            app,
            f"/api/artifacts/{study._study_id}/{trial._trial_id}",
            "POST",
            body=json.dumps({"file": DUMMY_DATA_URL}),
            content_type="application/json",
        )
        assert status == 400


def test_upload_artifact() -> None:
    storage = optuna.storages.InMemoryStorage()

    study = optuna.create_study(storage=storage)
    with tempfile.TemporaryDirectory() as tmpdir:
        artifact_store = FileSystemArtifactStore(tmpdir)

        app = create_app(storage, artifact_store)

        study.add_trial(optuna.create_trial(state=optuna.trial.TrialState.RUNNING))
        trial = study.trials[-1]
        status, _, body = send_request(
            app,
            f"/api/artifacts/{study._study_id}/{trial._trial_id}",
            "POST",
            body=json.dumps({"file": DUMMY_DATA_URL}),
            content_type="application/json",
        )
        assert status == 201
        res = json.loads(body)
        with open(f"{tmpdir}/{res['artifact_id']}", "r") as f:
            data = f.read()
            assert data == "dummy_content"


def test_delete_study_artifact() -> None:
    storage = optuna.storages.InMemoryStorage()
    study = optuna.create_study(storage=storage)
    with tempfile.TemporaryDirectory() as tmpdir:
        artifact_store = FileSystemArtifactStore(tmpdir)
        with tempfile.NamedTemporaryFile() as f:
            f.write(b"dummy_content")
            f.flush()
            artifact_id = upload_artifact(study, f.name, artifact_store=artifact_store)
        app = create_app(storage, artifact_store)
        status, _, _ = send_request(
            app,
            f"/api/artifacts/{study._study_id}/{artifact_id}",
            "DELETE",
        )
        assert status == 204
        status, _, _ = send_request(
            app,
            f"/api/artifacts/{study._study_id}/{artifact_id}",
            "DELETE",
        )
        assert status == 404


def test_delete_trial_artifact() -> None:
    storage = optuna.storages.InMemoryStorage()
    study = optuna.create_study(storage=storage)
    trial = study.ask()
    with tempfile.TemporaryDirectory() as tmpdir:
        artifact_store = FileSystemArtifactStore(tmpdir)
        with tempfile.NamedTemporaryFile() as f:
            f.write(b"dummy_content")
            f.flush()
            artifact_id = upload_artifact(trial, f.name, artifact_store=artifact_store)
        app = create_app(storage, artifact_store)
        status, _, _ = send_request(
            app,
            f"/api/artifacts/{study._study_id}/{trial._trial_id}/{artifact_id}",
            "DELETE",
        )
        assert status == 204
        status, _, _ = send_request(
            app,
            f"/api/artifacts/{study._study_id}/{trial._trial_id}/{artifact_id}",
            "DELETE",
        )
        assert status == 404


# Check the backward compatibility with the artifact backend.
def test_delete_artifact_with_dashboard_file_system_backend() -> None:
    storage = optuna.storages.InMemoryStorage()
    study = optuna.create_study(storage=storage)
    trial = study.ask()
    with tempfile.TemporaryDirectory() as tmpdir:
        artifact_backend = FileSystemBackend(tmpdir)
        with tempfile.NamedTemporaryFile() as f:
            f.write(b"dummy_content")
            f.flush()
            artifact_id = dashboard_upload_artifact(artifact_backend, trial, f.name)

        artifact_store = to_artifact_store(artifact_backend)
        app = create_app(storage, artifact_store)
        status, _, _ = send_request(
            app,
            f"/api/artifacts/{study._study_id}/{trial._trial_id}/{artifact_id}",
            "DELETE",
        )
        assert status == 204
        status, _, _ = send_request(
            app,
            f"/api/artifacts/{study._study_id}/{trial._trial_id}/{artifact_id}",
            "DELETE",
        )
        assert status == 404
