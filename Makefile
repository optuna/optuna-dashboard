.DEFAULT_GOAL := sdist

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

$(DASHBOARD_TS_OUT): $(DASHBOARD_TS_SRC)
	cd optuna_dashboard && npm install && npm run build:$(MODE)

.PHONY: tstest
tstest: tslib
	cd tslib/react/test && python generate_assets.py && npm run test
	cd tslib/storage/test && python generate_assets.py && npm run test

.PHONY: tslib
tslib:
	cd tslib/types && npm i && npm run build
	cd tslib/storage && npm i && npm run build
	cd tslib/react && npm i && npm run build

.PHONY: serve-browser-app
serve-browser-app: tslib $(RUSTLIB_OUT)
	cd standalone_app && npm run watch

.PHONY: vscode-extension
vscode-extension: vscode/assets/bundle.js
	cd vscode && npm install && npm run vscode:prepublish && vsce package

.PHONY: sdist
sdist: pyproject.toml $(DASHBOARD_TS_OUT)
	python -m build --sdist

.PHONY: wheel
wheel: pyproject.toml $(DASHBOARD_TS_OUT)
	python -m build --wheel

.PHONY: docs
docs: docs/conf.py $(RST_FILES)
	cd docs && make html

.PHONY: fmt
fmt:
	npm run fmt
	black ./optuna_dashboard/ ./python_tests/ ./e2e_tests/
	isort .

.PHONY: clean
clean:
	rm -rf tslib/types/pkg tslib/storage/pkg tslib/react/pkg tslib/react/types
	rm -rf optuna_dashboard/public/ doc/_build/
	rm -rf rustlib/pkg standalone_app/public/ vscode/assets/ vscode/*.vsix
