from __future__ import annotations

import tempfile
from unittest import TestCase
import warnings

from optuna.exceptions import ExperimentalWarning
import optuna.storages
from optuna.storages import JournalStorage
from optuna.storages import RDBStorage
from optuna_dashboard._storage_url import get_storage
import sqlalchemy.exc


try:
    from optuna.storages.journal import JournalFileBackend
except ImportError:
    from optuna.storages import JournalFileStorage as JournalFileBackend


class GetStorageTestCase(TestCase):
    def setUp(self) -> None:
        optuna.logging.set_verbosity(optuna.logging.ERROR)
        warnings.simplefilter("ignore", category=ExperimentalWarning)

    def test_get_rdb_storage_valid(self) -> None:
        with tempfile.NamedTemporaryFile() as file:
            sqlite_url = f"sqlite:///{file.name}"
            RDBStorage(sqlite_url)  # Create SQLite3 file

            self.assertIsInstance(get_storage(sqlite_url), RDBStorage)
            self.assertIsInstance(get_storage(sqlite_url, storage_class="RDBStorage"), RDBStorage)

        # Return it when given RDBStorage
        with tempfile.NamedTemporaryFile() as file:
            storage = optuna.storages.RDBStorage(f"sqlite:///{file.name}")
            assert isinstance(get_storage(storage), RDBStorage)

    def test_get_rdb_storage_invalid(self) -> None:
        # Unmatched storage class
        with tempfile.NamedTemporaryFile() as file:
            sqlite_url = f"sqlite:///{file.name}"
            RDBStorage(sqlite_url)  # Create SQLite3 file

            with self.assertRaises(sqlalchemy.exc.ArgumentError):
                get_storage(file.name, storage_class="RDBStorage")

    def test_get_journal_file_storage_valid(self) -> None:
        with tempfile.NamedTemporaryFile() as file:
            storage = get_storage(file.name)
            assert isinstance(storage, JournalStorage)
            self.assertIsInstance(storage._backend, JournalFileBackend)

        with tempfile.NamedTemporaryFile() as file:
            storage = get_storage(file.name, storage_class="JournalFileStorage")
            assert isinstance(storage, JournalStorage)
            self.assertIsInstance(storage._backend, JournalFileBackend)

        with tempfile.NamedTemporaryFile() as file:
            storage = get_storage(file.name, storage_class="JournalFileStorage")
            assert isinstance(storage, JournalStorage)
            self.assertIsInstance(storage._backend, JournalFileBackend)

    def test_get_journal_file_storage_invalid(self) -> None:
        with tempfile.NamedTemporaryFile() as file:
            with self.assertRaises(FileNotFoundError):
                get_storage(f"sqlite:///{file.name}", storage_class="JournalFileStorage")
