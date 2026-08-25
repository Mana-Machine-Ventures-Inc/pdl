# `pdl-core`

Rust **portable PDL core** (lex → parse → merge → validate → bake → catalogue / graph).

**Status:** the **only** implementation of the language. Protocols, slots, injection packs, emits / inline interaction, `ForEach`, host environment, and state choreography all live here; `src/` is a host (HTML, motion, rules, manifest) that reads this crate's JSON and never parses `.pdl`.

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
| `lexer` / `parser` / `ast` | `grammar/pdl.ebnf` parse (`enum` ≡ `variant` closed sets) |
| `design` | Import graph + merge → `DesignDefinition` |
| `validate` | Merged-design checks |
| `evaluate` | Token map / value eval |
| `resolve` | Component tree materialization |
| `bake` | `bakedDesign` JSON documents |
| `graph_serialize` | `ValueExpr` / `ConditionExpr` serialisation + token refs (host contract: `src/valueJson.ts`) |
| `rules_json` | `Rule(…)` query canonical JSON (host reader: `src/rulesJson.ts`) |
| `catalogue` | `componentCatalogue` document (`graphSystem`; host contract: `src/catalogue.ts`) |
| `resolve_bundle` | `resolvedComponent` document (`graphComponent`) |
| `stable_json` | Deterministic stringify for goldens |
| `error` | `PdlError` |

Goldens (`tests/golden/`) are frozen IR snapshots — first cut from the retired
TypeScript reference, now refreshed with this crate's CLI when a change is intended:
- `*.bake.json` — `bakeSystem`
- `*.catalogue.json` — `graphSystem`
- `*.<Component>.resolved.json` — `graphComponent`

Diagnostics live in `tests/error_fixtures.rs`, which walks `test-fixtures/pdl/errors`
and asserts the code each filename names.

## Next

- **A5** — C ABI (later)  
- **B6** — `ForEach` chrome (`before` / `between` / `after`)  
- Host emit dispatch / prototype runtime
