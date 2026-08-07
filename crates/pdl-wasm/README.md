# pdl-wasm

WASM bindings for `pdl-core` bake (Playground Phase P2 portable path).

## Build

```bash
# From repo root
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.100   # match Cargo.lock if needed
./scripts/build-pdl-wasm.sh
```

Outputs to `playground/static/wasm/` (`pdl_wasm.js` + `pdl_wasm_bg.wasm`).

## API

| Export | Role |
|--------|------|
| `analyze_sources(filesJson, entry)` | Component / theme names |
| `bake_component_sources(filesJson, entry, component, theme?, kvJson?)` | Bake JSON |
| `bake_system_sources(filesJson, entry, theme?)` | Full system bake JSON |

`filesJson` is `{ "/virtual/or/abs/path.pdl": "source…", … }`. HTML still comes from the Playground `/api/render-from-bake` host renderer.
