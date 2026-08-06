# `pdl` (Rust CLI)

Rust command-line front-end for **`pdl-core`**. Emits the same bake / catalogue / resolved-component JSON as the TypeScript `src/cli.ts` oracle for the supported commands.

## Build

```bash
cargo build -p pdl-cli --release
./target/release/pdl bakeSystem test-fixtures/pdl/integration/greeting.pdl
```

Or via Cargo:

```bash
cargo run -q -p pdl-cli -- bakeSystem test-fixtures/pdl/integration/greeting.pdl
```

## Commands

| Command | Notes |
|---------|--------|
| `bakeSystem` | Full `bakedDesign` |
| `bakeComponent` | Single-component bake + `key=value` overrides |
| `graphSystem` | `componentCatalogue` (no `--theme`) |
| `graphComponent` | `resolvedComponent` slice |
| `catalogue` | Same shape as `graphSystem`, allows `--theme` |
| `resolve` | `resolvedComponent`, or bare tree with `--tree-only` |

HTML (`renderHtml`, `renderCatalogueHtml`) and `manifest` stay on the TypeScript CLI for now.

## Dual-run

Volatile fields (`generatedAt`, absolute `provenance.entryPath` / `entryPath`) differ per run/host. Compare after pinning those, or use goldens under `crates/pdl-core/tests/golden/`.
