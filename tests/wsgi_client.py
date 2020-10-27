import io
from typing import Dict, Optional, Union, Any, Tuple, List, Callable, Iterable

WSGIEnv = Dict[str, Any]  # Cannot use TypedDict because of 'HTTP_' variables
StartResponse = Callable[[str, List[Tuple[str, str]]], None]
WSGIApp = Callable[[WSGIEnv, StartResponse], Iterable[bytes]]


def create_wsgi_env(
    path: str,
    method: str,
    content_type: str,
    body: bytes,
    queries: Dict[str, str],
    headers: Dict[str, str],
) -> WSGIEnv:
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
        "wsgi.multitprocess": True,
        "wsgi.run_once": False,
    }
    for k, v in headers.items():
        env[f"HTTP_{k.upper()}"] = v
    return env


def send_request(
    app: WSGIApp,
    path: str,
    method: str,
    body: Union[str, bytes] = b"",
    queries: Optional[Dict[str, str]] = None,
    headers: Optional[Dict[str, str]] = None,
    content_type: str = "text/plain; charset=utf-8",
) -> Tuple[int, List[Tuple[str, str]], bytes]:
    status: str = ""
    response_headers: List[Tuple[str, str]] = []

    def start_response(status_: str, headers_: List[Tuple[str, str]]) -> None:
        nonlocal status, response_headers
        status = status_
        response_headers = headers_

    bytes_body = body if isinstance(body, bytes) else body.encode("utf-8")
    headers = headers or {}
    queries = queries or {}
    env = create_wsgi_env(path, method, content_type, bytes_body, queries, headers)
    body = b""
    iterable_body = app(env, start_response)
    for b in iterable_body:
        body += b

    status_code = int(status.split()[0])
    return status_code, response_headers, body
