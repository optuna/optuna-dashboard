.DEFAULT_GOAL := python-package

PYTHON ?= python3
MODE ?= dev
RST_FILES := $(shell find docs -name '*.rst')
PYTHON_FILES := $(shell find optuna_dashboard/ -name '*.py')
DASHBOARD_TS_SRC := $(shell find ./optuna_dashboard -name '*.ts' -o -name '*.tsx')
DASHBOARD_TS_OUT = optuna_dashboard/public/bundle.js optuna_dashboard/public/favicon.ico
RUSTLIB_OUT = rustlib/pkg/optuna_wasm.js rustlib/pkg/optuna_wasm_bg.wasm rustlib/pkg/package.json
STANDALONE_SRC := $(shell find ./standalone_app/src -name '*.ts' -o -name '*.tsx')

$(RUSTLIB_OUT): rustlib/src/*.rs rustlib/Cargo.toml
	rustlib/build.sh

vscode/assets/bundle.js: $(RUSTLIB_OUT) $(STANDALONE_SRC) tslib
	pnpm install --frozen-lockfile
	pnpm --filter optuna-dashboard-wasm run build:vscode

$(DASHBOARD_TS_OUT): $(DASHBOARD_TS_SRC) tslib
	pnpm install --frozen-lockfile
	pnpm --filter @optuna/optuna-dashboard run build:$(MODE)

.PHONY: tslib
tslib:
	pnpm install --frozen-lockfile
	pnpm --filter @optuna/types run build
	pnpm --filter @optuna/storage run build
	pnpm --filter @optuna/react run build

.PHONY: tslib-test
tslib-test: tslib
	cd tslib/react/test && python generate_assets.py
	pnpm --filter @optuna/react run test
	cd tslib/storage/test && python generate_assets.py
	pnpm --filter @optuna/storage run test

.PHONY: serve-browser-app
serve-browser-app: tslib $(RUSTLIB_OUT)
	pnpm install
	pnpm --filter optuna-dashboard-wasm run watch

.PHONY: vscode-extension
vscode-extension: vscode/assets/bundle.js
	pnpm install --frozen-lockfile
	pnpm --filter optuna-dashboard run vscode:prepublish
	cd vscode && pnpm dlx @vscode/vsce package --no-dependencies

.PHONY: jupyterlab-extension
jupyterlab-extension: tslib
	pnpm install --frozen-lockfile
	pnpm --filter @optuna/optuna-dashboard run build:pkg
	rm -rf jupyterlab/jupyterlab_optuna/vendor/
	mkdir -p jupyterlab/jupyterlab_optuna/vendor/
	rsync -a --exclude=node_modules --exclude=pkg --exclude=ts --exclude=types --exclude=public optuna_dashboard/ jupyterlab/jupyterlab_optuna/vendor/optuna_dashboard/
	cd jupyterlab && uv run jlpm install && uv run jlpm run build:prod && uv run python -m build --wheel

.PHONY: python-package
python-package: pyproject.toml tslib
	pnpm install --frozen-lockfile
	pnpm --filter @optuna/optuna-dashboard run build:prd
	uv build

.PHONY: docs
docs: docs/conf.py $(RST_FILES)
	cd docs && make html

.PHONY: fmt
fmt:
	pnpm run fmt
	uv run ruff format ./optuna_dashboard/ ./python_tests/ ./e2e_tests/ ./jupyterlab/
	uv run ruff check --fix ./optuna_dashboard/ ./python_tests/ ./e2e_tests/ ./jupyterlab/

.PHONY: clean
clean:
	rm -rf tslib/types/pkg tslib/storage/pkg tslib/react/pkg tslib/react/types
	rm -rf optuna_dashboard/public/ doc/_build/
	rm -rf rustlib/pkg vscode/assets/ vscode/*.vsix
