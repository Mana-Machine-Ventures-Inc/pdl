# pdl-wasm

WASM bindings for `pdl-core` bake (Playground Phase P2 portable path).

## Build

```bash
# From repo root
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.126   # match Cargo.lock / build-pdl-wasm.sh
./scripts/build-pdl-wasm.sh
```

Outputs to `playground/static/wasm/` (`pdl_wasm.js` + `pdl_wasm_bg.wasm`).

Rebuild whenever `pdl-core` language surface changes (e.g. new keywords like `enum`); the Playground loads these committed artifacts, not a live `cargo` build.

## API

| Export | Role |
|--------|------|
| `analyze_sources(filesJson, entry)` | Component / theme names |
| `bake_component_sources(filesJson, entry, component, theme?, kvJson?, host?, hostFactsJson?, pinsJson?)` | Bake JSON |
| `bake_variant_matrix_sources(filesJson, entry, cellsJson, theme?, host?, hostFactsJson?, pinsByComponentJson?)` | Parse once; bake many labeled cells |
| `apply_presenter_pins(pinsJson, opsJson)` | Apply presenter verbs → next pin bag |
| `bake_system_sources(filesJson, entry, theme?, host?, hostFactsJson?)` | Full system bake JSON |

`filesJson` is `{ "/virtual/or/abs/path.pdl": "source…", … }`. HTML still comes from the Playground `/api/render-from-bake` host renderer.
