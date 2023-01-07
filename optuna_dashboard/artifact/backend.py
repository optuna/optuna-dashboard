from __future__ import annotations

from typing import BinaryIO


try:
    from typing import Protocol
except ImportError:
    from typing_extensions import Protocol  # type: ignore


class ArtifactBackend(Protocol):
    def open(self, artifact_id: str) -> BinaryIO:
        ...

    def write(self, artifact_id: str, content_body: BinaryIO) -> None:
        ...

    def remove(self, artifact_id: str) -> None:
        ...
