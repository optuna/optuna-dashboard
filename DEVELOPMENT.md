# Developers Guide

## How to run

### Compiling TypeScript files

Node.js v14.14.0 is required to compile TypeScript files.

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

### Running dashboard server

```
$ pip install -e .
$ optuna-dashboard sqlite:///db.sqlite3
```

<details>

<summary>Environment variables for development</summary>

If you set `OPTUNA_DASHBOARD_AUTO_RELOAD=1`, the server will automatically restart when the source codes are changed.

```
$ OPTUNA_DASHBOARD_AUTO_RELOAD=1 optuna-dashboard sqlite:///db.sqlite3
```

</details>


## Running tests, lint checks and formatters

### Run all tests and lint checks

```
$ tox -e ALL
```

### Running Python unit tests

```
$ python -m unittest
```

or

```
$ pip install tox
$ tox -e py39
```

### Running visual regression tests using pyppeteer

Please run following commands, then check screenshots in `tmp/` directory.

```
$ pip install -r requirements.txt
$ python visual_regression_test.py --output-dir tmp
```

Note: When you run pyppeteer for the first time, it downloads the latest version of Chromium (~150MB) if it is not found on your system.

### Linters (flake8, black and mypy)

```
$ pip install -r requirements.txt
$ flake8
$ black --check .
$ isort . --check
$ mypy .
```

or

```
$ pip install tox
$ tox -e flake8 -e black -e mypy
```

### Auto-formatting TypeScript files (by prettier)

```
$ npm run fmt
```

### Auto-formatting Python files (by black)

```
$ black .
```


## Release the new version

The release process(compiling TypeScript files, packaging Python distributions and uploading to PyPI) is fully automated by GitHub Actions.

1. Replace `optuna_dashboard.version.__version__` to the next version.
2. Create a git tag and push it to GitHub.

