# Developers Guide

## Running dashboard server

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

### Running servers

```
$ pip install .
$ optuna-dashboard sqlite:///db.sqlite3
```


## Running tests and formatters

### Auto-formatting TypeScript files

```
$ npm run fmt
```

### Auto-formatting Python files

```
$ pip install .[lint]
$ black .
```

### Running tests

```
$ python setup.py test
...

Ran 4 tests in 0.004s

OK
```


## Release process

The release process is fully automated by GitHub Actions.
GitHub Actions will be automatically building TypeScript, packaging the distributions and uploading to PyPI
after you pushed the new git tag to the GitHub.

1. Replace 'optuna_dashboard.version.__version__' to the next version.
2. Create a git tag (e.g. `$ git tag v0.X.Y`).
3. Push the tag to GitHub (e.g. `$ git push origin v0.X.Y`)

