import io
from unittest import TestCase

import boto3
from moto import mock_s3
from optuna_dashboard.artifact.boto3 import Boto3Backend


@mock_s3
class Boto3BackendTestCase(TestCase):
    def setUp(self) -> None:
        self.s3_client = boto3.resource("s3")
        self.bucket = self.s3_client.create_bucket(Bucket="moto-bucket")

    def tearDown(self) -> None:
        self.bucket.objects.all().delete()
        self.bucket.delete()

    def test_upload_download(self) -> None:
        artifact_id = "dummy-uuid"
        dummy_content = b"Hello World"

        backend = Boto3Backend(self.bucket.name)
        backend.write(artifact_id, io.BytesIO(dummy_content))

        objects = [obj for obj in self.bucket.objects.all() if obj.key == artifact_id]
        assert len(objects) == 1
        assert objects[0].get()["Body"].read() == dummy_content

        with backend.open(artifact_id) as f:
            actual = f.read()
        self.assertEqual(actual, dummy_content)

    def test_remove(self) -> None:
        artifact_id = "dummy-uuid"
        backend = Boto3Backend(self.bucket.name)
        backend.write(artifact_id, io.BytesIO(b"Hello"))
        assert len([obj for obj in self.bucket.objects.all() if obj.key == artifact_id]) == 1

        backend.remove(artifact_id)
        assert len([obj for obj in self.bucket.objects.all() if obj.key == artifact_id]) == 0
