# Developers Guide

Thank you for your interest in contributing to the Optuna Dashboard project!
This document will provide you with an overview of the repository structure and instructions on how to build optuna-dashboard.

## Repository Structure

The repository is organized as follows:

```
.
├── optuna_dashboard/   # The Python package.
│   └── ts/             # TypeScript code for the Python package.
├── standalone_app/     # Standalone application that can be run in browser or within the WebView of the VS Code extension.
│   ├── browser_app_entry.tsx   # Entry point for browser app, hosted on GitHub pages.
│   └── vscode_entry.tsx        # Entry point for VS Code app, output placed under `vscode/assets`.
├── vscode/             # The VS Code extension.
├── rustlib/            # Rust library exporting Wasm functions.
│   └── pkg/            # Output directory for rustlib, installed from package.json via `"./rustlib/pkg"`.
└── tslib/              # TypeScript library shared for common use.
    ├── react/                  # Common React components.
    ├── storage/                # Common code for handling storage.
    └── types/                  # Common TypeScript types.
```

## Python package

#### Building TypeScript packages

```
$ make tslib
```

#### Compiling TypeScript files

Node.js v16 is required to compile TypeScript files.

```
$ cd optuna_dashboard/
$ npm install
$ npm run build:dev
```

<details>
<summary>Watch for files changes</summary>

```
$ cd optuna_dashboard/
$ npm run watch
```

</details>

<details>
<summary>Production builds</summary>

```
$ cd optuna_dashboard/
$ npm run build:prd
```

</details>

#### Building a Docker image

```
$ docker build -t optuna-dashboard .
```

When failed above command due to the out of heap memory error (Exit code: 137), please check "Resources" tab on your Docker engine's preference since it requires a lot of memory to compile TypeScript files.
You can use the Docker image like below:

```
# SQLite3
$ docker run -it --rm -p 8080:8080 -v `pwd`:/app -w /app optuna-dashboard sqlite:///db.sqlite3
```

#### Running dashboard server

```
$ pip install -e .
$ OPTUNA_DASHBOARD_DEBUG=1 optuna-dashboard sqlite:///db.sqlite3
```

Note that `OPTUNA_DASHBOARD_DEBUG=1` makes the server will automatically restart when the source codes are changed.

### Running tests, lint checks and formatters

#### Running unit tests for `tslib/`

```
$ make tslib-test
```

#### Running unit tests for `python_tests/`

```
$ pytest python_tests/
```

#### Running e2e tests using pytest playwright

```
$ pip install -r requirements.txt
$ playwright install
$ pytest e2e_tests
```

If you want to create a screenshot for each test, please run a following command, then check screenshots in `tmp/` directory.

```
$ pytest e2e_tests --screenshot on --output tmp
```

If you want to generate a locator in each webpage, please use the playwright codegen. See [this page](https://playwright.dev/python/docs/codegen-intro) for more details.


For more detail options, you can check [this page](https://playwright.dev/python/docs/test-runners).

#### Linters (flake8, black and mypy)

```
$ pip install -r requirements.txt
$ flake8
$ black --check .
$ isort . --check
$ mypy optuna_dashboard python_tests
```

#### Auto-formatting Python and TypeScript files

```
$ make fmt
```


### Release the new version

The release process(compiling TypeScript files, packaging Python distributions and uploading to PyPI) is fully automated by GitHub Actions.

1. Replace `optuna_dashboard.__version__` to the next version (e.g. 0.8.0).
2. Create a git tag (e.g. v0.8.0) and push it to GitHub. If succeeded, GitHub Action will build sdist/wheel packages and create a draft GitHub release.
3. Edit a GitHub release, generate release note, write highlights of this release if needed, and mark "Create [a discussion](https://github.com/optuna/optuna-dashboard/discussions/categories/announcements) for this release" checkbox. Then make it publish. GitHub Action will release the new version to PyPI.


## Standalone Single-page Application

### Compiling Rust library and TypeScript files

Please install [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/) and execute the following command.

```
$ make serve-browser-app
```

Open http://localhost:5173/


## VS Code Extension

```
$ npm i -g vsce
$ make vscode-extension
```
