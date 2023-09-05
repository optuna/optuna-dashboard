.DEFAULT_GOAL := sdist

PYTHON ?= python3
MODE ?= dev
RST_FILES := $(shell find docs -name '*.rst')
PYTHON_FILES := $(shell find optuna_dashboard/ -name '*.py')
DASHBOARD_TS_IN := $(shell find ./optuna_dashboard -name '*.ts' -o -name '*.tsx')
DASHBOARD_TS_OUT = optuna_dashboard/public/bundle.js optuna_dashboard/public/favicon.ico
RUSTLIB_OUT = rustlib/pkg/optuna_wasm.js rustlib/pkg/optuna_wasm_bg.wasm rustlib/pkg/package.json
STANDALONE_OUT = standalone_app/public/bundle.js vscode/assets/bundle.js

$(RUSTLIB_OUT): rustlib/src/*.rs rustlib/Cargo.toml
	cd rustlib && wasm-pack build --target web

$(STANDALONE_OUT): $(RUSTLIB_OUT)
	cd standalone_app && npm install && npm run build:$(MODE)

$(DASHBOARD_TS_OUT): $(DASHBOARD_TS_IN)
	npm install && npm run build:$(MODE)

.PHONY: watch-standalone-app
watch-standalone-app: standalone_app/public/bundle.js
	cd standalone_app && npm run watch

.PHONY: serve-browser-app
serve-browser-app: standalone_app/public/bundle.js
	$(PYTHON) -m http.server 9000 --directory ./standalone_app/

.PHONY: vscode-extension
vscode-extension: vscode/assets/bundle.js
	cd vscode && npm install && npm run vscode:prepublish && vsce package

.PHONY: sdist
sdist: pyproject.toml $(DASHBOARD_TS_OUT)
	python setup.py sdist

.PHONY: wheel
wheel: pyproject.toml $(DASHBOARD_TS_OUT)
	python setup.py bdist_wheel

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
	rm -rf optuna_dashboard/public/ doc/_build/
	rm -rf rustlib/pkg standalone_app/public/ vscode/assets/ vscode/*.vsix
