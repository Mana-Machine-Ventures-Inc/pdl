# `pdl-core`

Rust **portable PDL core** (lex → parse → merge → validate → bake).

**Status:** **A2** — load / validate / evaluate / resolve / bake with TS `bakeSystem` golden parity. Catalogue/graph is **A3**. TypeScript in `src/` remains the catalogue oracle until then.

## Develop

```bash
cargo test -p pdl-core
cargo build -p pdl-core
```

```rust
use pdl_core::design::load_design;
use pdl_core::bake::build_baked_design_system;

let design = load_design("test-fixtures/pdl/integration/greeting.pdl")?;
let doc = build_baked_design_system(&design, None, None)?;
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
| `stable_json` | Deterministic stringify for goldens |
| `error` | `PdlError` |

Goldens: `tests/golden/*.bake.json` (from TS `bakeSystem`).

## Next

- **A3** — catalogue / graph exports  
- **B1+** — proposal language (protocols, `[T]`, emits, …)
