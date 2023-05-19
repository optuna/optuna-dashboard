from __future__ import annotations

import os.path
import re
from typing import TYPE_CHECKING

from optuna.storages import BaseStorage
from optuna.storages import RDBStorage
from optuna.version import __version__ as optuna_ver
from packaging import version


if TYPE_CHECKING:
    from typing import Optional
    from typing import Union

    from optuna.storages import JournalStorage


# The code to declare `rfc1738_pattern` variable is quoted from the source code
# of SQLAlchemy project (MIT License). See LICENSE file for detials.
# https://github.com/zzzeek/sqlalchemy/blob/c6554ac52/lib/sqlalchemy/engine/url.py#L234-L292
rfc1738_pattern = re.compile(
    r"""
        (?P<name>[\w\+]+)://
        (?:
            (?P<username>[^:/]*)
            (?::(?P<password>.*))?
        @)?
        (?:
            (?:
                \[(?P<ipv6host>[^/]+)\] |
                (?P<ipv4host>[^/:]+)
            )?
            (?::(?P<port>[^/]*))?
        )?
        (?:/(?P<database>.*))?
        """,
    re.X,
)


def get_storage(
    storage: Union[str, BaseStorage], storage_class: Optional[str] = None
) -> BaseStorage:
    if isinstance(storage, BaseStorage):
        return storage

    if storage_class:
        if storage_class == "RDBStorage":
            return get_rdb_storage(storage)
        if storage_class == "JournalRedisStorage":
            return get_journal_redis_storage(storage)
        if storage_class == "JournalFileStorage":
            return get_journal_file_storage(storage)
        raise ValueError("Unexpected storage_class")

    return guess_storage_from_url(storage)


def guess_storage_from_url(storage_url: str) -> BaseStorage:
    if storage_url.startswith("redis"):
        return get_journal_redis_storage(storage_url)

    if os.path.isfile(storage_url):
        return get_journal_file_storage(storage_url)

    if rfc1738_pattern.match(storage_url) is not None:
        return get_rdb_storage(storage_url)

    raise ValueError("Failed to guess storage class from storage_url")


def get_rdb_storage(storage_url: str) -> RDBStorage:
    if version.parse(optuna_ver) >= version.Version("v3.0.0"):
        return RDBStorage(storage_url, skip_compatibility_check=True, skip_table_creation=True)
    else:
        return RDBStorage(storage_url, skip_compatibility_check=True)


def get_journal_file_storage(file_path: str) -> JournalStorage:
    if version.parse(optuna_ver) < version.Version("v3.1.0"):
        raise ValueError("JournalRedisStorage is available from Optuna v3.1.0")

    from optuna.storages import JournalFileStorage
    from optuna.storages import JournalStorage

    return JournalStorage(JournalFileStorage(file_path=file_path))


def get_journal_redis_storage(redis_url: str) -> JournalStorage:
    if version.parse(optuna_ver) < version.Version("v3.1.0"):
        raise ValueError("JournalRedisStorage is available from Optuna v3.1.0")

    from optuna.storages import JournalRedisStorage
    from optuna.storages import JournalStorage

    return JournalStorage(JournalRedisStorage(redis_url))
