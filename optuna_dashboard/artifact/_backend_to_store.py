from __future__ import annotations

from typing import TYPE_CHECKING


if TYPE_CHECKING:
    from typing import BinaryIO
    from typing import TypeGuard

    from optuna.artifacts._protocol import ArtifactStore

    from .protocol import ArtifactBackend


def is_artifact_store(store: ArtifactBackend | ArtifactStore) -> TypeGuard[ArtifactStore]:
    return getattr(store, "open_reader") is not None


class ArtifactBackendToStore:
    """Converts a Dashboard's ArtifactBackend to Optuna's ArtifactStore."""

    def __init__(self, artifact_backend: ArtifactBackend) -> None:
        self._backend = artifact_backend

    def open_reader(self, artifact_id: str) -> BinaryIO:
        return self._backend.open(artifact_id)

    def write(self, artifact_id: str, content_body: BinaryIO) -> None:
        self._backend.write(artifact_id, content_body)

    def remove(self, artifact_id: str) -> None:
        self._backend.remove(artifact_id)
