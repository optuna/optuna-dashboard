import argparse
import os
import sys
from wsgiref.simple_server import make_server, WSGIServer
from socketserver import ThreadingMixIn

from bottle import Bottle
from bottle import run
from optuna.storages import BaseStorage
from optuna.storages import RDBStorage
from optuna.storages import RedisStorage

from . import __version__
from ._app import create_app
from ._sql_profiler import register_profiler_view


DEBUG = os.environ.get("OPTUNA_DASHBOARD_DEBUG") == "1"
SERVER_CHOICES = ["wsgiref", "gunicorn"]


class ThreadedWSGIServer(ThreadingMixIn, WSGIServer):
    pass


def run_wsgiref(app: Bottle, host: str, port: int, quiet: bool) -> None:
    if DEBUG:
        run(
            app,
            host=host,
            port=port,
            server="wsgiref",
            quiet=quiet,
            reloader=DEBUG,
        )
    else:
        print(f"Listening on http://{host}:{port}/", file=sys.stderr)
        print(f"Hit Ctrl-C to quit.\n", file=sys.stderr)
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


def main() -> None:
    parser = argparse.ArgumentParser(description="Real-time dashboard for Optuna.")
    parser.add_argument("storage", help="DB URL (e.g. sqlite:///example.db)", type=str)
    parser.add_argument(
        "--port", help="port number (default: %(default)s)", type=int, default=8080
    )
    parser.add_argument(
        "--host", help="hostname (default: %(default)s)", default="127.0.0.1"
    )
    parser.add_argument(
        "--server",
        help="server (default: %(default)s)",
        default="wsgiref",
        choices=SERVER_CHOICES,
    )
    parser.add_argument("--version", "-v", action="version", version=__version__)
    parser.add_argument("--quiet", "-q", help="quiet", action="store_true")
    args = parser.parse_args()

    storage: BaseStorage
    if args.storage.startswith("redis"):
        storage = RedisStorage(args.storage)
    else:
        storage = RDBStorage(args.storage, skip_compatibility_check=True)

    app = create_app(storage, debug=DEBUG)

    if DEBUG and isinstance(storage, RDBStorage):
        app = register_profiler_view(app, storage)

    if args.server == "wsgiref":
        run_wsgiref(app, args.host, args.port, args.quiet)
    elif args.server == "gunicorn":
        run_gunicorn(app, args.host, args.port, args.quiet)
    else:
        raise Exception("must not reach here")


if __name__ == "__main__":
    main()
