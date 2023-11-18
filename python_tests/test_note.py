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

    def test_delete_notes_trial(self) -> None:
        study = optuna.create_study()
        trials = [
            study.ask({"x1": optuna.distributions.FloatDistribution(0, 10)}) for _ in range(2)
        ]
        storage = study._storage

        notes = ["trial 0", "trial 1"]
        for trial, body in zip(trials, notes):
            with self.subTest(body):
                save_note(trial, body)

                self.assertEqual(get_note(trial), body)

                note.delete_notes(storage, study._study_id, trial._trial_id)

                self.assertEqual(get_note(trial), "")

    def test_delete_notes_study(self) -> None:
        study = optuna.create_study()
        trials = [
            study.ask({"x1": optuna.distributions.FloatDistribution(0, 10)}) for _ in range(2)
        ]
        storage = study._storage

        notes = ["trial 0", "trial 1"]
        for trial, body in zip(trials, notes):
            with self.subTest(body):
                save_note(trial, body)

                actual = get_note(trial)
                self.assertEqual(actual, body)

        save_note(study, "Study note")
        actual = get_note(study)
        self.assertEqual(actual, "Study note")

        note.delete_study_notes(storage, study._study_id)

        for trial in trials:
            self.assertEqual(get_note(trial), "")
        self.assertEqual(get_note(study), "")

    def test_transfer_notes(self) -> None:
        old_study = optuna.create_study()
        old_trials = [
            old_study.ask({"x1": optuna.distributions.FloatDistribution(0, 10)}) for _ in range(2)
        ]
        storage = old_study._storage

        notes = ["trial 0", "trial 1"]
        for trial, body in zip(old_trials, notes):
            save_note(trial, body)
        save_note(old_study, "Study")

        new_study = optuna.create_study(storage=storage, directions=old_study.directions)
        new_study.add_trials(old_study.get_trials(deepcopy=False))

        note.transfer_notes(storage, old_study, new_study)

        for old_trial in old_trials:
            self.assertEqual(get_note(old_trial), "")
        self.assertEqual(get_note(old_study), "")

        system_attrs = new_study._storage.get_study_system_attrs(new_study._study_id)
        for new_trial, body in zip(new_study.get_trials(), notes):
            actual = note.get_note_from_system_attrs(system_attrs, new_trial._trial_id)
            self.assertEqual(actual["body"], body)
        self.assertEqual(get_note(new_study), "Study")
