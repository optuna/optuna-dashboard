from __future__ import annotations

from unittest import TestCase
from unittest.mock import patch

from optuna_dashboard import _note as note


class NoteTestCase(TestCase):
    @patch("optuna_dashboard._note.SYSTEM_ATTR_MAX_LENGTH", 5)
    def test_split_and_concat_note_body(self) -> None:
        for dummy_body_str, attr_len in [
            ("012", 1),
            ("01234", 1),
            ("012345", 2),
        ]:
            with self.subTest(f"with_{dummy_body_str}_{attr_len}"):
                attrs = note.split_body(dummy_body_str)
                assert len(attrs) == attr_len
                actual = note.concat_body(attrs)
                assert dummy_body_str == actual
