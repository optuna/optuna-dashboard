from __future__ import annotations

from unittest import TestCase

from optuna_dashboard._serializer import serialize_attrs


class SerializeAttrsTestCase(TestCase):
    def test_serialize_bytes(self) -> None:
        serialized = serialize_attrs({"bytes": b"This is a bytes object."})
        self.assertEqual(serialized[0]["value"], "<binary object>")

    def test_serialize_dict(self) -> None:
        serialized = serialize_attrs(
            {
                "key": {"foo": "bar"},
            }
        )
        self.assertLessEqual(len(serialized), 1)
