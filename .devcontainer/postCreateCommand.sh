#!/bin/sh

uv sync --all-extras --group test --group lint

make tslib
pnpm --dir optuna_dashboard install --frozen-lockfile
