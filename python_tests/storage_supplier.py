from __future__ import annotations

import tempfile
from types import TracebackType
from typing import Any
from typing import IO

import optuna
from optuna.version import __version__ as optuna_ver
from packaging import version
import pytest


parametrize_storages = pytest.mark.parametrize(
    "storage_supplier",
    [
        lambda: StorageSupplier("inmemory"),
        lambda: StorageSupplier("sqlite"),
        lambda: StorageSupplier("cached_sqlite"),
        # TODO(c-bata): Support "JournalRedisStorage"
        pytest.param(
            lambda: StorageSupplier("journal"),
            marks=pytest.mark.skipif(
                version.parse(optuna_ver) < version.Version("3.1.0"),
                reason="Artifact is not implemented yet in Optuna",
            ),
        ),
    ],
)
SQLITE3_TIMEOUT = 300


class StorageSupplier:
    def __init__(self, storage_specifier: str, **kwargs: Any) -> None:
        self.storage_specifier = storage_specifier
        self.extra_args = kwargs
        self.tempfile: IO[Any] | None = None

    def __enter__(
        self,
    ) -> (
        optuna.storages.InMemoryStorage
        | optuna.storages._CachedStorage
        | optuna.storages.RDBStorage
        | optuna.storages.JournalStorage
    ):
        if self.storage_specifier == "inmemory":
            if len(self.extra_args) > 0:
                raise ValueError("InMemoryStorage does not accept any arguments!")
            return optuna.storages.InMemoryStorage()
        elif "sqlite" in self.storage_specifier:
            self.tempfile = tempfile.NamedTemporaryFile(**self.extra_args)
            url = "sqlite:///{}".format(self.tempfile.name)
            rdb_storage = optuna.storages.RDBStorage(
                url,
                engine_kwargs={"connect_args": {"timeout": SQLITE3_TIMEOUT}},
                **self.extra_args,
            )
            return (
                optuna.storages._CachedStorage(rdb_storage)
                if "cached" in self.storage_specifier
                else rdb_storage
            )
        elif "journal" in self.storage_specifier:
            self.tempfile = tempfile.NamedTemporaryFile(**self.extra_args)
            file_storage = optuna.storages.JournalFileStorage(self.tempfile.name)
            return optuna.storages.JournalStorage(file_storage)
        else:
            assert False, "Must not reach here"

    def __exit__(
        self, exc_type: type[BaseException], exc_val: BaseException, exc_tb: TracebackType
    ) -> None:
        if self.tempfile:
            self.tempfile.close()
