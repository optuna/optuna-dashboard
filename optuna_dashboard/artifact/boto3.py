from __future__ import annotations

from typing import TYPE_CHECKING

import boto3


if TYPE_CHECKING:
    from typing import BinaryIO
    from typing import Optional

    from mypy_boto3_s3 import S3Client


class Boto3Backend:
    """An artifact backend for S3.

    Example:
       .. code-block:: python

          import optuna
          from optuna_dashboard.artifact import upload_artifact
          from optuna_dashboard.artifact.boto3 import Boto3Backend

          artifact_backend = Boto3Backend("my-bucket")

          def objective(trial: optuna.Trial) -> float:
              ... = trial.suggest_float("x", -10, 10)
              file_path = generate_example_png(...)
              upload_artifact(artifact_backend, trial, file_path)
              return ...
    """

    def __init__(self, bucket_name: str, client: Optional[S3Client] = None) -> None:
        self.bucket = bucket_name
        self.client = client or boto3.client("s3")

    def open(self, artifact_id: str) -> BinaryIO:
        obj = self.client.get_object(Bucket=self.bucket, Key=artifact_id)
        body = obj.get("Body")
        assert body is not None
        return body  # type: ignore

    def write(self, artifact_id: str, content_body: BinaryIO) -> None:
        self.client.upload_fileobj(content_body, self.bucket, artifact_id)

    def remove(self, artifact_id: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=artifact_id)


if TYPE_CHECKING:
    # A mypy-runtime assertion to ensure that Boto3Backend
    # implements all abstract methods in ArtifactBackendProtocol.
    from .protocol import ArtifactBackend

    _: ArtifactBackend = Boto3Backend("")
