import argparse
from bottle import run

from .app import create_app


def main():
    parser = argparse.ArgumentParser(description="A third-party dashboard for optuna.")
    parser.add_argument("storage", help="Optuna Storage URL", type=str)
    parser.add_argument(
        "--port", help="port number (default: 8080)", type=int, default=8080
    )
    parser.add_argument(
        "--host", help="hostname (default: 'localhost')", default="localhost"
    )
    parser.add_argument("--quiet", help="quiet", action="store_true")
    args = parser.parse_args()

    app = create_app(args.storage)
    run(app, host=args.host, port=args.port, quiet=args.quiet)


if __name__ == "__main__":
    main()
