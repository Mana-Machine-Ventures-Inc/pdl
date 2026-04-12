# PDL toolchain

TypeScript compiler for **PDL** (Programmatic Design Language) as described in `full-spec.md`.

## Commands

After `npm install`, use the npm scripts below (each runs **`tsc`** first so **`dist/`** matches **`src/`**). To call **`node dist/cli.js …`** directly, run **`npm run build`** (or **`tsc`**) whenever TypeScript sources change.

| Command | Description |
|---------|-------------|
| `npm run graphSystem --silent -- <entry.pdl> [--out file.json]` | **Full design graph** — **Component Catalogue** with **`primitives`**, **`semantics`**, per-**`theme`** **`overrides`** (pointer-style RHS), components, etc. (`full-spec.md` §16). Entry only; **no** `--theme`. |
| `npm run graphComponent --silent -- <entry.pdl> <Component> [--theme Name] [--out file.json] [key=value …]` | **Component slice** — **`resolvedComponent`** JSON (`full-spec.md` §16c / §16 §2.5): trimmed **`system`** + one catalogue row. |
| `npm run bakeSystem --silent -- <entry.pdl> [--theme Name] [--out file.json]` | **Baked system** — every component at default params, literal trees only (`full-spec.md` §16d **`bakedDesign`**). |
| `npm run bakeComponent --silent -- <entry.pdl> <Component> [--theme Name] [--out file.json] [key=value …]` | **Baked instance** — one component, optional param overrides (`full-spec.md` §16d). |
| `npm run manifest --silent -- <entry.pdl> [--out file.json]` | Thin **design manifest** JSON (`full-spec.md` §17 §3). |
| `npm run catalogue --silent -- <entry.pdl> [--theme Name] [--out file.json]` | Same JSON shape as **graphSystem**, but allows **`--theme`** for **tree** resolution (§16). |
| `npm run resolve --silent -- <entry.pdl> <Component> [--tree-only] [--theme Name] [key=value …]` | Legacy: **`resolvedComponent`** (default) or bare **`CatalFrame`** with **`--tree-only`**. Prefer **graphComponent** / **bakeComponent** for new tooling. |

`npm test` runs the Vitest suite.

## Test fixtures

- **`test-fixtures/pdl/atoms/`** — one module per language surface (token types, themes, `typeStyle`, variants, layout/text/icon/media, `expose`, etc.); **`atoms/design.pdl`** imports them all.
- **`test-fixtures/pdl/molecules/`** — **`molecules/design.pdl`** aggregates feature modules; **`m_companions.pdl`** (imported last) holds **`usage`**, **`fixtures`**, **`rules`**, and **`interaction`** examples for **`MoleculeTextButton`**, **`MoleculeCardArticle`**, and **`MoleculeFieldBlock`**.
- **`test-fixtures/pdl/integration/`** — end-to-end and scenario entries: **`integration/design.pdl`** (atoms + molecules + merge chain), **`themed.pdl`**, **`greeting.pdl`**, **`merge_*.pdl`**, **`rules_tags_when.pdl`**, **`companion_*.pdl`**, **`status_banner.pdl`**, etc.
- **`test-fixtures/pdl/errors/`** — invalid PDL (parse, validate, catalogue, token graph). **`errors/legacy/`** holds the older **`e07` / `e10` / `e12`** cases; **`tests/invalid-pdl.test.ts`** covers **`errors/`** and **`errors/legacy/`**.

## Documentation

- Normative language: `full-spec.md`
- Known spec/tooling gaps: `docs/SPEC_GAPS.md`
