# `pdl-core`

Rust **portable PDL core** (lex → parse → merge → validate → bake).

**Status:** skeleton (step **A0** in [`docs/IMPLEMENTATION_PLAN.md`](../../docs/IMPLEMENTATION_PLAN.md)).

The TypeScript toolchain in `src/` is the **conformance oracle** until this crate matches bake/catalogue goldens.

## Develop

```bash
cargo test -p pdl-core
cargo build -p pdl-core
```

## Next

1. Lexer / parser / AST for current `docs/full-spec.md` language  
2. `bake_component` parity vs `npm run bakeComponent`  
3. Then proposal language slices (protocols, `[T]`, emits, …)
