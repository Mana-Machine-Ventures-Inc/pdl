#!/usr/bin/env bash
# Build pdl-wasm → playground/static/wasm for the Playground WASM bake path.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/playground/static/wasm"
TARGET_DIR="${CARGO_TARGET_DIR:-$ROOT/target}"
mkdir -p "$OUT"

rustup target add wasm32-unknown-unknown >/dev/null
cargo build -p pdl-wasm --release --target wasm32-unknown-unknown --manifest-path "$ROOT/Cargo.toml"

WASM_IN="$TARGET_DIR/wasm32-unknown-unknown/release/pdl_wasm.wasm"
if [[ ! -f "$WASM_IN" ]]; then
  echo "missing $WASM_IN" >&2
  exit 1
fi

export PATH="${HOME}/.cargo/bin:${PATH}"
if ! command -v wasm-bindgen >/dev/null 2>&1; then
  echo "Installing wasm-bindgen-cli 0.2.126…"
  cargo install wasm-bindgen-cli --version 0.2.126 --locked
fi

wasm-bindgen "$WASM_IN" --target web --out-dir "$OUT" --out-name pdl_wasm
echo "Wrote $OUT/pdl_wasm.js and $OUT/pdl_wasm_bg.wasm"
