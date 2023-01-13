from typing import BinaryIO
from typing import Protocol


class ArtifactBackend(Protocol):
    def open(self, artifact_id: str) -> BinaryIO:
        ...

    def write(self, artifact_id: str, content_body: BinaryIO) -> None:
        ...

    def remove(self, artifact_id: str) -> None:
        ...
