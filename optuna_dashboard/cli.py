import argparse
from bottle import run

from .app import create_app
from .version import __version__


def main() -> None:
    parser = argparse.ArgumentParser(description="Real-time dashboard for Optuna.")
    parser.add_argument("storage", help="DB URL (e.g. sqlite:///example.db)", type=str)
    parser.add_argument(
        "--port", help="port number (default: %(default)s)", type=int, default=8080
    )
    parser.add_argument(
        "--host", help="hostname (default: %(default)s)", default="127.0.0.1"
    )
    parser.add_argument("--version", "-v", action="version", version=__version__)
    parser.add_argument("--quiet", "-q", help="quiet", action="store_true")
    args = parser.parse_args()

    app = create_app(args.storage)
    run(app, host=args.host, port=args.port, quiet=args.quiet)


if __name__ == "__main__":
    main()
