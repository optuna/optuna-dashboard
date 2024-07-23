from __future__ import annotations

import io
import uuid

from optuna_dashboard.artifact.backoff import Backoff

from .stubs import FailBackend
from .stubs import InMemoryBackend


def test_backoff_time() -> None:
    backend = Backoff(
        backend=FailBackend(),
        min_delay=0.1,
        multiplier=10,
        max_delay=10,
    )
    assert backend._get_sleep_secs(0) == 0.1
    assert backend._get_sleep_secs(1) == 1
    assert backend._get_sleep_secs(2) == 10


def test_read_and_write() -> None:
    artifact_id = f"test-{uuid.uuid4()}"
    dummy_content = b"Hello World"

    backend = Backoff(
        backend=InMemoryBackend(),
        min_delay=0.1,
        multiplier=10,
        max_delay=10,
    )
    backend.write(artifact_id, io.BytesIO(dummy_content))
    with backend.open(artifact_id) as f:
        actual = f.read()
    assert actual == dummy_content
