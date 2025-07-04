#!/bin/sh

uv sync --all-extras --group test --group lint

make tslib
pushd optuna_dashboard
npm install
popd
