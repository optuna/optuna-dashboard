# Developers Guide

## How to run

### Compiling TypeScript files

Node.js v16 is required to compile TypeScript files.

```
$ npm install
$ npm run build:dev
```

<details>
<summary>Watch for files changes</summary>

```
$ npm run watch
```

</details>

<details>
<summary>Production builds</summary>

```
$ npm run build:prd
```

</details>

### Building a Docker image

```
$ docker build -t optuna-dashboard .
```

When failed above command due to the out of heap memory error (Exit code: 137), please check "Resources" tab on your Docker engine's preference since it requires a lot of memory to compile TypeScript files.
You can use the Docker image like below:

```
# SQLite3
$ docker run -it --rm -p 8080:8080 -v `pwd`:/app -w /app optuna-dashboard sqlite:///db.sqlite3
```

### Running dashboard server

```
$ pip install -e .
$ OPTUNA_DASHBOARD_DEBUG=1 optuna-dashboard sqlite:///db.sqlite3
```

Note that `OPTUNA_DASHBOARD_DEBUG=1` makes the server will automatically restart when the source codes are changed.

## Running tests, lint checks and formatters

### Running Python unit tests

```
$ python -m unittest
```

### Running visual regression tests using pyppeteer

Please run following commands, then check screenshots in `tmp/` directory.

```
$ pip install -r requirements.txt
$ python hack/visual_regression_test.py --output-dir tmp
```

Note: When you run pyppeteer for the first time, it downloads the latest version of Chromium (~150MB) if it is not found on your system.

### Linters (flake8, black and mypy)

```
$ pip install -r requirements.txt
$ flake8
$ black --check .
$ isort . --check
$ mypy optuna_dashboard python_tests
```

### Auto-formatting TypeScript files (by prettier)

```
$ npm run fmt
```

### Auto-formatting Python files

```
$ black .
$ isort .
```


## Release the new version

The release process(compiling TypeScript files, packaging Python distributions and uploading to PyPI) is fully automated by GitHub Actions.

1. Replace `optuna_dashboard.__version__` to the next version (e.g. 0.8.0).
2. Create a git tag (e.g. v0.8.0) and push it to GitHub. If succeeded, GitHub Action will build sdist/wheel packages and create a draft GitHub release.
3. Edit a GitHub release, generate release note, write highlights of this release if needed, and mark "Create [a discussion](https://github.com/optuna/optuna-dashboard/discussions/categories/announcements) for this release" checkbox. Then make it publish. GitHub Action will release the new version to PyPI.

