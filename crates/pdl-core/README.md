# `pdl-core`

Rust **portable PDL core** (lex → parse → merge → validate → bake → catalogue / graph).

**Status:** **A4** — load / validate / evaluate / resolve / **bake** / **catalogue** / **resolved-component** with byte-for-byte parity against the TS goldens, plus the **`pdl`** Rust CLI (`crates/pdl-cli`). TypeScript in `src/` remains the reference oracle.

## Develop

```bash
cargo test -p pdl-core
cargo build -p pdl-core
cargo run -q -p pdl-cli -- bakeSystem path/to/entry.pdl
```

```rust
use pdl_core::design::load_design;
use pdl_core::bake::build_baked_design_system;
use pdl_core::{build_component_catalogue, build_resolved_component_document};
use serde_json::Map;

let design = load_design("test-fixtures/pdl/integration/greeting.pdl")?;

// bakedDesign (fully evaluated draw tree)
let baked = build_baked_design_system(&design, None, None)?;

// componentCatalogue (graphSystem: token layers + per-component rows)
let catalogue = build_component_catalogue(&design, None, &[], None)?;

// resolvedComponent (graphComponent: closure rows + trimmed `system` bundle)
let resolved =
    build_resolved_component_document(&design, "Greeting", &Map::new(), None, &[], None)?;
```

## Layout

| Module | Role |
|--------|------|
| `lexer` / `parser` / `ast` | §20–§21 parse |
| `design` | Import graph + merge → `DesignDefinition` |
| `validate` | Merged-design checks |
| `evaluate` | Token map / value eval |
| `resolve` | Component tree materialization |
| `bake` | `bakedDesign` JSON documents |
| `graph_serialize` | `ValueExpr` / `ConditionExpr` serialisation + token refs (`src/graph.ts`, `src/valueExprRefs.ts`) |
| `rules_json` | `Rule(…)` query canonical JSON (`src/rulesJson.ts`) |
| `catalogue` | `componentCatalogue` document (`graphSystem` / `src/catalogue.ts`) |
| `resolve_bundle` | `resolvedComponent` document (`graphComponent` / `src/resolveBundle.ts`) |
| `stable_json` | Deterministic stringify for goldens |
| `error` | `PdlError` |

Goldens (`tests/golden/`):
- `*.bake.json` — TS `bakeSystem`
- `*.catalogue.json` — TS `graphSystem`
- `*.<Component>.resolved.json` — TS `graphComponent`

## Next

- **A5** — C ABI (later)  
- **B1+** — proposal language (protocols, `[T]`, emits, …)  
- Dual-run CI job comparing TS vs Rust CLI JSON (strip `generatedAt` / normalize paths)
