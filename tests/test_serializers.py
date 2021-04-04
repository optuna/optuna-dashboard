from unittest import TestCase
from optuna_dashboard.serializer import serialize_attrs


class SerializeAttrsTestCase(TestCase):
    def test_serialize_bytes(self) -> None:
        serialized = serialize_attrs({"bytes": b"This is a bytes object."})
        self.assertEqual(serialized[0]["value"], "<binary object>")

    def test_serialize_string(self) -> None:
        for length in [100, 128, 150]:
            with self.subTest(f"length: {length}"):
                value = "a" * length
                serialized = serialize_attrs({
                    "key": value,
                })
                self.assertLessEqual(len(serialized[0]["value"]), 128)
