from __future__ import annotations

from typing import BinaryIO
from typing import Protocol
from typing import TYPE_CHECKING


if TYPE_CHECKING:
    from _typeshed import SupportsRead


class ArtifactBackend(Protocol):
    def open(self, artifact_id: str) -> BinaryIO:
        ...

    def write(self, artifact_id: str, content_body: SupportsRead[bytes]) -> None:
        ...

    def remove(self, artifact_id: str) -> None:
        ...
