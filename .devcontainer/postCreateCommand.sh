#!/bin/sh

uv sync --all-extras --group test --group lint

make tslib
cd optuna_dashboard
npm install
cd ..
