# type: ignore
from __future__ import annotations

import json
import os
import threading
from typing import TYPE_CHECKING

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
from optuna_dashboard.artifact._backend_to_store import to_artifact_store
import tornado


try:
    from optuna.artifacts import FileSystemArtifactStore
except ImportError:
    from optuna_dashboard.artifact.file_system import (
        FileSystemBackend as FileSystemArtifactStore,
    )

from optuna_dashboard import wsgi
from optuna_dashboard._app import JupyterLabExtensionContext
from tornado.web import FallbackHandler
from tornado.wsgi import WSGIContainer


if TYPE_CHECKING:
    from _typeshed.wsgi import WSGIApplication


API_NAMESPACE = "jupyterlab-optuna"

_dashboard_app: WSGIApplication | None = None
_is_initialized = False
_base_url = ""
threading_lock = threading.Lock()


def normalize_storage_url(storage_url: str) -> str:
    if not os.path.isfile(storage_url):
        return storage_url

    # Convert ./db.sqlite3 to sqlite:///abs/path/to/db.sqlite3
    sqlite3_header = b"SQLite format 3\x00"
    with open(storage_url, "rb") as f:
        header = f.read(len(sqlite3_header))
    if header != sqlite3_header:
        return storage_url
    return "sqlite:///" + os.path.abspath(storage_url)


class RouteHandler(APIHandler):
    @tornado.web.authenticated
    def post(self):
        global _dashboard_app, _is_initialized

        input_data = self.get_json_body()
        storage_url = input_data.get("storage_url")
        artifact_path = input_data.get("artifact_path")

        if storage_url is None:
            self.set_status(400)
            self.finish(json.dumps({"reason": "storage_url is required"}))
            return

        if artifact_path:
            artifact_store = to_artifact_store(FileSystemArtifactStore(artifact_path))
        else:
            artifact_store = None

        with threading_lock:
            _dashboard_app = wsgi(
                storage=normalize_storage_url(storage_url),
                artifact_store=artifact_store,
                jupyterlab_extension_context=JupyterLabExtensionContext(base_url=_base_url),
            )
            _is_initialized = True
        self.finish(json.dumps({"is_initialized": True}))


class InitializedStateHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        self.finish(json.dumps({
            "is_initialized": _is_initialized,
            "cwd_path": os.getcwd(),
        }))


def dashboard_app(env, start_response):
    # Set Content-Type
    if "/api/" in env["PATH_INFO"]:
        env["CONTENT_TYPE"] = "application/json"
    env["PATH_INFO"] = env["PATH_INFO"].replace(_base_url, "")

    if _dashboard_app is None:
        start_response("400 Bad Request", [{"Content-Type": "application/json"}])
        return [b'{"reason": "app is not initialized"}']

    return _dashboard_app(env, start_response)


def setup_handlers(web_app):
    global _base_url

    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]
    _base_url = url_path_join(base_url, API_NAMESPACE)
    # Prepend the base_url so that it works in a JupyterHub setting
    initialize_route_pattern = url_path_join(base_url, API_NAMESPACE, "api/is_initialized")
    handlers = [(initialize_route_pattern, InitializedStateHandler)]
    web_app.add_handlers(host_pattern, handlers)

    resister_route_pattern = url_path_join(base_url, API_NAMESPACE, "api/register_dashboard_app")
    handlers = [(resister_route_pattern, RouteHandler)]
    web_app.add_handlers(host_pattern, handlers)

    route_pattern = url_path_join(base_url, API_NAMESPACE, r"(.*)")
    handlers = [
        (route_pattern, FallbackHandler, dict(fallback=WSGIContainer(dashboard_app))),
    ]
    web_app.add_handlers(host_pattern, handlers)
