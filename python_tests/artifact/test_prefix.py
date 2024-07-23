from __future__ import annotations

import io
import uuid

from optuna_dashboard.artifact.prefix import AppendPrefix

from .stubs import InMemoryBackend


def test_read_and_write() -> None:
    artifact_id = str(uuid.uuid4())
    dummy_content = b"Hello World"

    backend = AppendPrefix(backend=InMemoryBackend(), prefix="my-")
    backend.write(artifact_id, io.BytesIO(dummy_content))
    with backend.open(artifact_id) as f:
        actual = f.read()
    assert actual == dummy_content
    backend.remove(artifact_id)


def test_check_prefix() -> None:
    artifact_id = str(uuid.uuid4())
    dummy_content = b"Hello World"

    in_memory = InMemoryBackend()
    backend = AppendPrefix(backend=in_memory, prefix="my-")
    backend.write(artifact_id, io.BytesIO(dummy_content))

    assert len(in_memory._data) == 1
    key = list(in_memory._data.keys())[0]
    assert key.startswith("my-")
