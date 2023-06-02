import io
from unittest import TestCase
from unittest.mock import MagicMock
from unittest.mock import patch

import boto3
from moto import mock_s3
from optuna_dashboard.artifact.boto3 import Boto3Backend
from optuna_dashboard.artifact.exceptions import ArtifactNotFound


@mock_s3
class Boto3BackendTestCase(TestCase):
    def setUp(self) -> None:
        self.s3_client = boto3.client("s3")
        self.bucket_name = "moto-bucket"
        self.s3_client.create_bucket(Bucket=self.bucket_name)

    def tearDown(self) -> None:
        objects = self.s3_client.list_objects(Bucket=self.bucket_name).get("Contents", [])
        if objects:
            self.s3_client.delete_objects(
                Bucket=self.bucket_name,
                Delete={"Objects": [{"Key": obj["Key"] for obj in objects}], "Quiet": True},
            )
        self.s3_client.delete_bucket(Bucket=self.bucket_name)

    def test_upload_download(self) -> None:
        artifact_id = "dummy-uuid"
        dummy_content = b"Hello World"

        backend = Boto3Backend(self.bucket_name)
        backend.write(artifact_id, io.BytesIO(dummy_content))
        assert len(self.s3_client.list_objects(Bucket=self.bucket_name)["Contents"]) == 1
        obj = self.s3_client.get_object(Bucket=self.bucket_name, Key=artifact_id)
        assert obj["Body"].read() == dummy_content

        with backend.open(artifact_id) as f:
            actual = f.read()
        self.assertEqual(actual, dummy_content)

    @patch("optuna_dashboard.artifact.boto3._is_file_like_obj")
    def test_upload_download_non_file_like(self, mock_is_file_like_obj: MagicMock) -> None:
        mock_is_file_like_obj.side_effect = lambda o: False

        artifact_id = "dummy-uuid"
        dummy_content = b"Hello World"
        backend = Boto3Backend(self.bucket_name)
        backend.write(artifact_id, io.BytesIO(dummy_content))
        assert len(self.s3_client.list_objects(Bucket=self.bucket_name)["Contents"]) == 1
        obj = self.s3_client.get_object(Bucket=self.bucket_name, Key=artifact_id)
        assert obj["Body"].read() == dummy_content
        with backend.open(artifact_id) as f:
            actual = f.read()
        self.assertEqual(actual, dummy_content)

    def test_remove(self) -> None:
        artifact_id = "dummy-uuid"
        backend = Boto3Backend(self.bucket_name)
        backend.write(artifact_id, io.BytesIO(b"Hello"))
        objects = self.s3_client.list_objects(Bucket=self.bucket_name)["Contents"]
        assert len([obj for obj in objects if obj["Key"] == artifact_id]) == 1

        backend.remove(artifact_id)
        objects = self.s3_client.list_objects(Bucket=self.bucket_name).get("Contents", [])
        assert len([obj for obj in objects if obj["Key"] == artifact_id]) == 0

    def test_file_not_found_exception(self) -> None:
        backend = Boto3Backend(self.bucket_name)
        with self.assertRaises(ArtifactNotFound):
            backend.open("not-found-id")
