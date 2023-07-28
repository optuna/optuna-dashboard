from __future__ import annotations

from unittest import TestCase
from unittest.mock import patch

import optuna
from optuna_dashboard import _note as note
from optuna_dashboard import get_note
from optuna_dashboard import save_note


class NoteTestCase(TestCase):
    @patch("optuna_dashboard._note.SYSTEM_ATTR_MAX_LENGTH", 5)
    def test_split_and_concat_note_body(self) -> None:
        for dummy_body_str, attr_len in [
            ("012", 1),
            ("01234", 1),
            ("012345", 2),
        ]:
            with self.subTest(f"with_{dummy_body_str}_{attr_len}"):
                attrs = note.split_body(dummy_body_str, None)
                self.assertEqual(len(attrs), attr_len)
                actual = note.concat_body(attrs, None)
                self.assertEqual(actual, dummy_body_str)

    def test_save_and_get_study_note(self) -> None:
        study = optuna.create_study()

        for body, expected_ver in [("version 1", 1), ("version 2", 2)]:
            with self.subTest(body):
                save_note(study, body)
                system_attrs = study._storage.get_study_system_attrs(study._study_id)

                actual = get_note(study)
                self.assertEqual(actual, body)

                note_dict = note.get_note_from_system_attrs(system_attrs, None)
                self.assertEqual(note_dict["body"], body)
                self.assertEqual(note_dict["version"], expected_ver)

    def test_save_and_get_trial_note(self) -> None:
        study = optuna.create_study()
        trial = study.ask({"x1": optuna.distributions.FloatDistribution(0, 10)})

        for body, expected_ver in [("version 1", 1), ("version 2", 2)]:
            with self.subTest(body):
                save_note(trial, body)
                system_attrs = study._storage.get_study_system_attrs(study._study_id)

                actual = get_note(trial)
                self.assertEqual(actual, body)

                note_dict = note.get_note_from_system_attrs(system_attrs, trial._trial_id)
                self.assertEqual(note_dict["body"], body)
                self.assertEqual(note_dict["version"], expected_ver)
