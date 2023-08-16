from __future__ import annotations

from unittest import TestCase

from optuna_dashboard._serializer import serialize_attrs


def test_serialize_bytes() -> None:
    serialized = serialize_attrs({"bytes": b"This is a bytes object."})
    assert serialized[0]["value"] == "<binary object>"


def test_serialize_dict() -> None:
    serialized = serialize_attrs(
        {
            "key": {"foo": "bar"},
        }
    )
    assert len(serialized) <= 1
