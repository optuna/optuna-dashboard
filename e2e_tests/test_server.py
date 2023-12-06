import http.server
import socket
import socketserver
import threading
from wsgiref.simple_server import make_server

import optuna
from optuna_dashboard import wsgi
import pytest


def get_free_port() -> int:
    tcp = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    tcp.bind(("", 0))
    _, port = tcp.getsockname()
    tcp.close()
    return port


def make_test_server(
    request: pytest.FixtureRequest, storage: optuna.storages.InMemoryStorage
) -> str:
    addr = "127.0.0.1"
    port = get_free_port()
    app = wsgi(storage)
    httpd = make_server(addr, port, app)
    thread = threading.Thread(target=httpd.serve_forever)
    thread.start()

    def stop_server() -> None:
        httpd.shutdown()
        httpd.server_close()
        thread.join()

    request.addfinalizer(stop_server)

    return f"http://{addr}:{port}/dashboard"


def make_standalone_server(request: pytest.FixtureRequest) -> str:
    addr = "127.0.0.1"
    port = get_free_port()
    directory = "./standalone_app/"

    Handler = http.server.SimpleHTTPRequestHandler
    httpd = socketserver.TCPServer(
        ("", port), lambda *args, **kwargs: Handler(*args, directory=directory, **kwargs)
    )

    def serve_httpd():
        httpd.serve_forever()

    thread = threading.Thread(target=serve_httpd)
    thread.start()

    def stop_server() -> None:
        httpd.shutdown()
        httpd.server_close()
        thread.join()

    request.addfinalizer(stop_server)

    return f"http://{addr}:{port}"
