import tempfile
from unittest.mock import MagicMock

import optuna
from optuna.artifacts import FileSystemArtifactStore
from optuna.artifacts import upload_artifact
from optuna.storages import BaseStorage
from optuna_dashboard._app import create_app
from optuna_dashboard.artifact import _backend
import pytest

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
    trial = MagicMock(_trial_id=0, system_attrs=storage.get_trial_system_attrs(0))

    actual = _backend.list_trial_artifacts(storage.get_study_system_attrs(0), trial)
    assert actual == [
        {"artifact_id": "id0", "filename": "foo.txt"},
        {"artifact_id": "id1", "filename": "bar.txt"},
        {"artifact_id": "id2", "filename": "baz.txt"},
    ]


def test_artifact_store_none() -> None:
    storage = optuna.storages.InMemoryStorage()
    app = create_app(storage)
    status, _, body = send_request(
        app,
        "/artifacts/0/0",
        "GET",
        content_type="application/json",
    )
    assert status == 400


def test_artifact_not_found() -> None:
    storage = optuna.storages.InMemoryStorage()
    study = optuna.create_study(storage=storage)
    with tempfile.TemporaryDirectory() as tmpdir:
        artifact_store = FileSystemArtifactStore(tmpdir)
        app = create_app(storage, artifact_store)
        status, _, body = send_request(
            app,
            f"/artifacts/{study._study_id}/abc123",
            "GET",
            content_type="application/json",
        )
        assert status == 404


def test_successful_artifact_retrieval() -> None:
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
            content_type="application/json",
        )
        assert status == 200
        assert body == b"dummy_content"
