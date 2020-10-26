import io
from typing import Dict, Optional, Union


def create_wsgi_env(
    path: str,
    method: str,
    body: Union[str, bytes] = b"",
    queries: Optional[Dict[str, str]] = None,
    headers: Optional[Dict[str, str]] = None,
    content_type: str = "text/plain; charset=utf-8",
):
    request_method = method.upper()
    bytes_body = body if isinstance(body, bytes) else body.encode("utf-8")
    wsgi_input = io.BytesIO(bytes_body)
    content_length = len(body)

    # 'key1=value1&key2=value2'
    query_string = "&".join([f"{k}={v}" for k, v in queries.items()]) if queries else ""
    env = {
        "HTTP_X_FORWARDED_PROTO": "http",
        "HTTP_X_FORWARDED_HOST": "localhost",
        "PATH_INFO": path,
        "REQUEST_METHOD": request_method,
        "QUERY_STRING": query_string,
        "wsgi.input": wsgi_input,
        "CONTENT_TYPE": content_type,
        "CONTENT_LENGTH": content_length,
    }
    headers = headers or {}
    for k, v in headers.items():
        env[f"HTTP_{k.upper()}"] = v
    return env
