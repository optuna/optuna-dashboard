from __future__ import annotations

import argparse
import os
from socketserver import ThreadingMixIn
import sys
from typing import TYPE_CHECKING
from wsgiref.simple_server import make_server
from wsgiref.simple_server import WSGIServer

from bottle import Bottle
from bottle import run
from optuna.storages import BaseStorage
from optuna.storages import RDBStorage

from . import __version__
from ._app import create_app
from ._config import create_artifact_store_from_config
from ._config import create_llm_provider_from_config
from ._config import load_config_from_toml
from ._sql_profiler import register_profiler_view
from ._storage_url import get_storage


if TYPE_CHECKING:
    from typing import Literal

    from optuna.artifacts._protocol import ArtifactStore


DEBUG = os.environ.get("OPTUNA_DASHBOARD_DEBUG") == "1"
SERVER_CHOICES = ["auto", "wsgiref", "gunicorn"]


class ThreadedWSGIServer(ThreadingMixIn, WSGIServer):
    pass


def run_wsgiref(app: Bottle, host: str, port: int, quiet: bool) -> None:
    print(f"Listening on http://{host}:{port}/", file=sys.stderr)
    print("Hit Ctrl-C to quit.\n", file=sys.stderr)
    httpd = make_server(host, port, app, server_class=ThreadedWSGIServer)
    httpd.serve_forever()


def run_gunicorn(app: Bottle, host: str, port: int, quiet: bool) -> None:
    # See https://docs.gunicorn.org/en/latest/custom.html

    from gunicorn.app.base import BaseApplication

    class Application(BaseApplication):
        def load_config(self) -> None:
            self.cfg.set("bind", f"{host}:{port}")
            self.cfg.set("threads", 4)
            if quiet:
                self.cfg.set("loglevel", "error")

        def load(self) -> Bottle:
            return app

    Application().run()


def run_debug_server(app: Bottle, host: str, port: int, quiet: bool) -> None:
    run(
        app,
        host=host,
        port=port,
        server="wsgiref",
        quiet=quiet,
        reloader=DEBUG,
    )


def auto_select_server(
    server_arg: Literal["auto", "gunicorn", "wsgiref"],
) -> Literal["gunicorn", "wsgiref"]:
    if server_arg != "auto":
        return server_arg

    try:
        import gunicorn  # NOQA

        return "gunicorn"
    except ImportError:
        return "wsgiref"


def main() -> None:
    parser = argparse.ArgumentParser(description="Real-time dashboard for Optuna.")
    parser.add_argument(
        "storage",
        help="Storage URL (e.g. sqlite:///example.db)",
        type=str,
        default=None,
        nargs="?",
    )
    parser.add_argument(
        "--storage-class",
        help="Storage class hint (e.g. JournalFileStorage)",
        type=str,
        default=None,
    )
    parser.add_argument(
        "--port", help="port number (default: %(default)s)", type=int, default=8080
    )
    parser.add_argument("--host", help="hostname (default: %(default)s)", default="127.0.0.1")
    parser.add_argument(
        "--server",
        help="server (default: %(default)s)",
        default="auto",
        choices=SERVER_CHOICES,
    )
    parser.add_argument(
        "--artifact-dir",
        help="directory to store artifact files",
        default=None,
    )
    parser.add_argument(
        "--from-config",
        help="configuration file in TOML format",
        type=str,
        default=None,
    )
    parser.add_argument("--version", "-v", action="version", version=__version__)
    parser.add_argument("--quiet", "-q", help="quiet", action="store_true")
    args = parser.parse_args()

    if args.from_config:
        config = load_config_from_toml(args.from_config)
        cli_config = config.get("optuna_dashboard", {})
        args.storage = cli_config.get("storage", args.storage)
        args.storage_class = cli_config.get("storage_class", args.storage_class)
        args.port = cli_config.get("port", args.port)
        args.host = cli_config.get("host", args.host)
        args.server = cli_config.get("server", args.server)
        args.artifact_dir = cli_config.get("artifact_dir", args.artifact_dir)
    else:
        config = {}

    if args.storage is None:
        raise ValueError(
            "Storage URL must be specified as the first argument or via --from-config."
        )

    storage: BaseStorage
    storage = get_storage(args.storage, storage_class=args.storage_class)

    artifact_store: ArtifactStore | None
    if args.artifact_dir is None:
        artifact_store = create_artifact_store_from_config(config)
    else:
        from optuna.artifacts import FileSystemArtifactStore

        artifact_store = FileSystemArtifactStore(args.artifact_dir)

    llm_provider = create_llm_provider_from_config(config)
    app = create_app(
        storage,
        artifact_store=artifact_store,
        llm_provider=llm_provider,
        debug=DEBUG,
    )

    if DEBUG and isinstance(storage, RDBStorage):
        app = register_profiler_view(app, storage)

    server = auto_select_server(args.server)
    if DEBUG:
        run_debug_server(app, args.host, args.port, args.quiet)
    elif server == "wsgiref":
        run_wsgiref(app, args.host, args.port, args.quiet)
    elif server == "gunicorn":
        run_gunicorn(app, args.host, args.port, args.quiet)
    else:
        raise Exception("must not reach here")


if __name__ == "__main__":
    main()
