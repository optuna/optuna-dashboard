import io
from unittest import TestCase

import boto3
from optuna_dashboard.artifact.boto3 import Boto3Backend
from optuna_dashboard.artifact.exceptions import ArtifactNotFound


try:
    from moto import mock_aws
except ImportError:
    from moto import mock_s3 as mock_aws


@mock_aws
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
        buf = io.BytesIO(dummy_content)

        backend = Boto3Backend(self.bucket_name)
        backend.write(artifact_id, buf)
        self.assertEqual(len(self.s3_client.list_objects(Bucket=self.bucket_name)["Contents"]), 1)
        obj = self.s3_client.get_object(Bucket=self.bucket_name, Key=artifact_id)
        self.assertEqual(obj["Body"].read(), dummy_content)

        with backend.open(artifact_id) as f:
            actual = f.read()
        self.assertEqual(actual, dummy_content)
        self.assertFalse(buf.closed)

    def test_remove(self) -> None:
        artifact_id = "dummy-uuid"
        backend = Boto3Backend(self.bucket_name)
        backend.write(artifact_id, io.BytesIO(b"Hello"))
        objects = self.s3_client.list_objects(Bucket=self.bucket_name)["Contents"]
        self.assertEqual(len([obj for obj in objects if obj["Key"] == artifact_id]), 1)

        backend.remove(artifact_id)
        objects = self.s3_client.list_objects(Bucket=self.bucket_name).get("Contents", [])
        self.assertEqual(len([obj for obj in objects if obj["Key"] == artifact_id]), 0)

    def test_file_not_found_exception(self) -> None:
        backend = Boto3Backend(self.bucket_name)
        with self.assertRaises(ArtifactNotFound):
            backend.open("not-found-id")
