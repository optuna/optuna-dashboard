import io
import tempfile
from unittest import TestCase

from optuna_dashboard.artifact.file_system import FileSystemBackend
from optuna_dashboard.artifact.exceptions import ArtifactNotFound


class FileSystemBackendTestCase(TestCase):
    def setUp(self) -> None:
        self.dir = tempfile.TemporaryDirectory()

    def tearDown(self) -> None:
        self.dir.cleanup()

    def test_upload_download(self) -> None:
        artifact_id = "dummy-uuid"
        dummy_content = b"Hello World"
        backend = FileSystemBackend(self.dir.name)
        backend.write(artifact_id, io.BytesIO(dummy_content))
        with backend.open(artifact_id) as f:
            actual = f.read()
        self.assertEqual(actual, dummy_content)

    def test_file_not_found(self) -> None:
        backend = FileSystemBackend(self.dir.name)
        with self.assertRaises(ArtifactNotFound):
            backend.open("not-found-id")
        with self.assertRaises(ArtifactNotFound):
            backend.remove("not-found-id")
