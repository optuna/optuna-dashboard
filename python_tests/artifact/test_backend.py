from unittest.mock import MagicMock

from optuna_dashboard.artifact import _backend
import pytest


def test_get_artifact_path() -> None:
    study = MagicMock(_study_id=0)
    trial = MagicMock(_trial_id=0, study=study)
    assert _backend.get_artifact_path(trial=trial, artifact_id="id0") == "/artifacts/0/0/id0"


def test_artifact_prefix() -> None:
    actual = _backend._artifact_prefix(trial_id=0)
    assert actual == "dashboard:artifacts:0:"


@pytest.fixture()
def init_storage_with_artifact_meta() -> MagicMock:
    storage = MagicMock()

    get_study_system_attrs = (
        lambda study_id: {
            "dashboard:artifacts:0:id0": '{"artifact_id": "id0", "filename": "foo.txt"}',
            "dashboard:artifacts:0:id1": '{"artifact_id": "id1", "filename": "bar.txt"}',
            "baz": "baz",
        }
        if study_id == 0
        else {}
    )
    storage.get_study_system_attrs.side_effect = get_study_system_attrs

    trial0_system_attrs = {
        "artifacts:id2": '{"artifact_id": "id2", "filename": "baz.txt"}',
    }
    trial1_system_attrs = {
        "artifacts:id3": '{"artifact_id": "id3", "filename": "qux.txt"}',
    }
    get_trial_system_attrs = (
        lambda trial_id: trial0_system_attrs
        if trial_id == 0
        else trial1_system_attrs
        if trial_id == 1
        else {}
    )
    storage.get_trial_system_attrs.side_effect = get_trial_system_attrs

    get_all_trials = (
        lambda study_id: [
            MagicMock(
                _trial_id=0, study=MagicMock(_study_id=study_id), system_attrs=trial0_system_attrs
            ),
            MagicMock(
                _trial_id=1, study=MagicMock(_study_id=study_id), system_attrs=trial1_system_attrs
            ),
        ]
        if study_id == 0
        else []
    )
    storage.get_all_trials.side_effect = get_all_trials

    return storage


def test_get_artifact_meta(init_storage_with_artifact_meta: MagicMock) -> None:
    storage = init_storage_with_artifact_meta

    actual = _backend.get_artifact_meta(storage, study_id=0, trial_id=0, artifact_id="id0")
    assert actual == {"artifact_id": "id0", "filename": "foo.txt"}

    actual = _backend.get_artifact_meta(storage, study_id=0, trial_id=1, artifact_id="id3")
    assert actual == {"artifact_id": "id3", "filename": "qux.txt"}

    actual = _backend.get_artifact_meta(storage, study_id=0, trial_id=0, artifact_id="id4")
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
