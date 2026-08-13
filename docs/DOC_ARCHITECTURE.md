# Documentation architecture

PDL docs are split like a mature language (Swift-style): **Guide** (how to think), **Language reference** (rules), **Symbol reference** (indexable built-ins). The giant [`full-spec.md`](./full-spec.md) remains the **normative single scroll** for implementers until chapters are fully migrated.

## Layout

```text
docs/
  README.md                 ← start here
  manifesto.md
  full-spec.md              ← normative (1.0.0-beta)
  DOC_ARCHITECTURE.md       ← this file
  guide/                    ← conceptual, human-written
  reference/
    language/               ← formal rules (human + generated errors)
    symbols.md              ← GENERATED symbol index (canonical landing page)
    symbols/                ← GENERATED per-symbol pages (+ stub README)
shared/
  frame-props.json          ← compiler SoT: frame props + host enum cases
  language-model.json       ← doc/catalog SoT: types, enums+, ctors, protocols, errors
scripts/
  generate-language-docs.mjs
```

## Sources of truth

| Fact | SoT | Consumed by |
|------|-----|-------------|
| Frame property types / host enum cases | `shared/frame-props.json` | TS `frameProps.ts`, Rust `frame_props.rs`, doc generator |
| Token types, supplemental enums, constructors, protocols, relationships, error index | `shared/language-model.json` | Doc generator (and humans editing catalogs) |
| Full normative prose / EBNF / bake JSON | `docs/full-spec.md` | Implementers, dual-run expectations |
| Host prelude surface | `test-fixtures/pdl/stdlib/host_protocols.pdl` | Compilers + protocol symbol pages |

**Rule:** one fact, one SoT. Guide pages explain; they do not redefine enum cases. Symbol pages are generated — never hand-edit `docs/reference/symbols/**`.

## Generate

```bash
npm run docs:gen          # rewrite symbols + errors.md
npm run docs:gen:check    # CI: fail if generated output is stale
```

After editing `shared/language-model.json` or `shared/frame-props.json`, run `docs:gen` and commit the regenerated Markdown.

## What to edit when

| Change | Edit |
|--------|------|
| New frame property / host enum case | `shared/frame-props.json` → `docs:gen` (+ TS/Rust already load it) |
| New token type, ctor, protocol, error code | `shared/language-model.json` → `docs:gen` (+ update compilers / `full-spec`) |
| Teaching / mental model | `docs/guide/*.md` |
| Scoping / type rules summary | `docs/reference/language/*.md` (keep aligned with `full-spec`) |
| Deep normative detail | `docs/full-spec.md` |
