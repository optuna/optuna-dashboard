# Developers Guide

## Building source and running dashboard

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


## Submitting patches

Before you submitting patches, I recommend you to run tests, linters and auto-formatters.

### Running Python tests

```
$ python setup.py test
...

Ran 4 tests in 0.004s

OK
```

### Linters

```
$ flake8
$ black --check .
```

### Auto-formatting TypeScript files (by prettier)

```
$ npm run fmt
```

### Auto-formatting Python files (by black)

```
$ pip install .[lint]
$ black .
```


## How to release the new version

The release process is fully automated by GitHub Actions.
GitHub Actions will be automatically building TypeScript, packaging Python distributions and uploading to PyPI after you push the git tag.

1. Replace 'optuna_dashboard.version.__version__' to the next version.
2. Create a git tag (e.g. `$ git tag v0.X.Y`).
3. Push the tag to GitHub (e.g. `$ git push origin v0.X.Y`)

