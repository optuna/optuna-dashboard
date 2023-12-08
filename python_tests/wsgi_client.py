from __future__ import annotations

import io
import typing
from typing import Optional
from typing import Union

from bottle import Bottle
from optuna_dashboard._storage import trials_cache
from optuna_dashboard._storage import trials_cache_lock


if typing.TYPE_CHECKING:
    from _typeshed.wsgi import WSGIEnvironment


def clear_inmemory_cache() -> None:
    with trials_cache_lock:
        trials_cache.clear()


def create_wsgi_env(
    path: str,
    method: str,
    content_type: str,
    body: bytes,
    queries: dict[str, str],
    headers: dict[str, str],
) -> "WSGIEnvironment":
    # 'key1=value1&key2=value2'
    query_string = "&".join([f"{k}={v}" for k, v in queries.items()])

    # See https://www.python.org/dev/peps/pep-3333/#environ-variables
    env = {
        "PATH_INFO": path,
        "REQUEST_METHOD": method.upper(),
        "SCRIPT_NAME": "",
        "QUERY_STRING": query_string,
        "CONTENT_TYPE": content_type,
        "CONTENT_LENGTH": len(body),
        "SERVER_PROTOCOL": "http",
        "SERVER_NAME": "localhost",
        "wsgi.input": io.BytesIO(body),
        "wsgi.version": (1, 0),
        "wsgi.errors": io.StringIO(""),
        "wsgi.multithread": True,
        "wsgi.multiprocess": True,
        "wsgi.run_once": False,
    }
    for k, v in headers.items():
        env[f"HTTP_{k.upper()}"] = v
    return env


def send_request(
    app: Bottle,
    path: str,
    method: str,
    body: Union[str, bytes] = b"",
    queries: Optional[dict[str, str]] = None,
    headers: Optional[dict[str, str]] = None,
    content_type: str = "text/plain; charset=utf-8",
) -> tuple[int, list[tuple[str, str]], bytes]:
    status: str = ""
    response_headers: list[tuple[str, str]] = []

    def start_response(status_: str, headers_: list[tuple[str, str]]) -> None:
        nonlocal status, response_headers
        status = status_
        response_headers = headers_

    bytes_body = body if isinstance(body, bytes) else body.encode("utf-8")
    headers = headers or {}
    queries = queries or {}
    env = create_wsgi_env(path, method, content_type, bytes_body, queries, headers)

    clear_inmemory_cache()
    response_body = b""
    iterable_body = app(env, start_response)
    for b in iterable_body:
        response_body += b

    status_code = int(status.split()[0])
    return status_code, response_headers, response_body
