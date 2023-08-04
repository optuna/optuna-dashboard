from __future__ import annotations

import tempfile

import optuna
from optuna.version import __version__ as optuna_ver
from optuna_dashboard.artifact._backend import list_trial_artifacts
from packaging import version
import pytest


@pytest.mark.skipif(
    version.parse(optuna_ver) < version.Version("3.3.0"),
    reason="Artifact is not implemented yet in Optuna",
)
def test_list_optuna_artifacts() -> None:
    from optuna.artifacts import FileSystemArtifactStore
    from optuna.artifacts import upload_artifact

    storage = optuna.storages.InMemoryStorage()
    study = optuna.create_study(storage=storage)
    dummy_content = b"dummy content"

    with tempfile.TemporaryDirectory() as tmpdir:
        artifact_store = FileSystemArtifactStore(tmpdir)
        trial = study.ask()

        with tempfile.NamedTemporaryFile() as f:
            f.write(dummy_content)
            f.flush()
            upload_artifact(trial, f.name, artifact_store=artifact_store)

        study.tell(trial, 0.0)

        study_system_attrs = storage.get_study_system_attrs(study._study_id)
        frozen_trial = storage.get_trial(trial._trial_id)
        artifact_meta_list = list_trial_artifacts(study_system_attrs, frozen_trial)
        assert len(artifact_meta_list) == 1

        artifact_id = artifact_meta_list[0]["artifact_id"]
        with artifact_store.open_reader(artifact_id) as reader:
            assert reader.read() == dummy_content
