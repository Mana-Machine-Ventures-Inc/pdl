# `pdl-core`

Rust **portable PDL core** (lex → parse → merge → validate → bake).

**Status:** **A1** — lexer + parser + AST for the current language (`docs/full-spec.md`). TypeScript in `src/` remains the bake/catalogue oracle until **A2** parity.

## Develop

```bash
cargo test -p pdl-core
cargo build -p pdl-core
```

Parse a module:

```rust
use pdl_core::parser::parse_module_source;
let module = parse_module_source(source, "design.pdl")?;
```

## Layout

| Module | Role |
|--------|------|
| `lexer` | §20 tokenize |
| `parser` | §21 module AST |
| `ast` | Declaration / value / frame trees |
| `error` | `PdlError` (`PDL-E00x`) |

## Next (A2)

1. `loadDesign` / merge / validate  
2. `bake_component` parity vs `npm run bakeComponent`  
3. Goldens for atoms / molecules / integration `design.pdl`
