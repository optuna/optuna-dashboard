#!/bin/sh

make tslib
pushd optuna_dashboard
npm install
popd

pip install -r requirements.txt
