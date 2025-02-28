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
	cd rustlib && wasm-pack build --target web

vscode/assets/bundle.js: $(RUSTLIB_OUT) $(STANDALONE_SRC) tslib
	cd standalone_app && npm install && npm run build:vscode

$(DASHBOARD_TS_OUT): $(DASHBOARD_TS_SRC) tslib
	cd optuna_dashboard && npm install && npm run build:$(MODE)

.PHONY: tslib
tslib:
	cd tslib/types && npm i && npm run build
	cd tslib/storage && npm i && npm run build
	cd tslib/react && npm i && npm run build

.PHONY: tslib-test
tslib-test: tslib
	cd tslib/react/test && python generate_assets.py && npm run test
	cd tslib/storage/test && python generate_assets.py && npm run test

.PHONY: serve-browser-app
serve-browser-app: tslib $(RUSTLIB_OUT)
	cd standalone_app && npm i && npm run watch

.PHONY: vscode-extension
vscode-extension: vscode/assets/bundle.js
	cd vscode && npm i && npm run vscode:prepublish && vsce package

.PHONY: jupyterlab-extension
jupyterlab-extension: tslib
	cd optuna_dashboard && npm install && npm run build:pkg
	rm -rf jupyterlab/jupyterlab_optuna/vendor/
	mkdir -p jupyterlab/jupyterlab_optuna/vendor/
	cp -r optuna_dashboard jupyterlab/jupyterlab_optuna/vendor/optuna_dashboard
	rm -rf jupyterlab/jupyterlab_optuna/vendor/optuna_dashboard/node_modules
	cd jupyterlab && jlpm install && jlpm run build && python -m build --wheel

.PHONY: python-package
python-package: pyproject.toml tslib
	cd optuna_dashboard && npm i && npm run build:prd
	python -m build --sdist --wheel

.PHONY: docs
docs: docs/conf.py $(RST_FILES)
	cd docs && make html

.PHONY: fmt
fmt:
	npm run fmt
	black ./optuna_dashboard/ ./python_tests/ ./e2e_tests/ ./jupyterlab/
	isort .

.PHONY: clean
clean:
	rm -rf tslib/types/pkg tslib/storage/pkg tslib/react/pkg tslib/react/types
	rm -rf optuna_dashboard/public/ doc/_build/
	rm -rf rustlib/pkg vscode/assets/ vscode/*.vsix
