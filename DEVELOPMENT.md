# Developers Guide

## How to run

### Building TypeScript files

Node.js v14.14.0 is required to build TypeScript files.

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
$ pip install .
$ optuna-dashboard sqlite:///db.sqlite3
```


## Running tests, lint checks and formatters

### Running Python unit tests

```
$ python setup.py test
```

### Linters (flake8, black and mypy)

```
$ pip install .[lint]
$ flake8
$ black --check .
$ mypy .
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

The release process(building TypeScript files, packaging Python distributions and uploading to PyPI) is fully automated by GitHub Actions.

1. Replace `optuna_dashboard.version.__version__` to the next version.
2. Create a git tag and push it to GitHub.

