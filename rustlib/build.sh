#!/bin/bash

DIR=$(cd $(dirname $0); pwd)
OUTPUT_DIR=${DIR}/pkg

set -ex

pushd ${DIR}
cargo build --target wasm32-unknown-unknown --release
wasm-bindgen ./target/wasm32-unknown-unknown/release/optuna_wasm.wasm --out-dir ${OUTPUT_DIR} --target web
wasm-opt -Oz -o pkg/optuna_wasm_bg.wasm pkg/optuna_wasm_bg.wasm
cat << 'EOF' > pkg/package.json
{
  "name": "optuna-wasm",
  "version": "0.1.0",
  "files": [
    "optuna_wasm_bg.wasm",
    "optuna_wasm.js",
    "optuna_wasm.d.ts"
  ],
  "module": "optuna_wasm.js",
  "types": "optuna_wasm.d.ts"
}
EOF
popd
