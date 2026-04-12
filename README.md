# PDL toolchain

TypeScript compiler for **PDL** (Programmatic Design Language) as described in `full-spec.md`.

## Commands

After `npm install`, use the npm scripts below (each runs **`tsc`** first so **`dist/`** matches **`src/`**). To call **`node dist/cli.js …`** directly, run **`npm run build`** (or **`tsc`**) whenever TypeScript sources change.

| Command | Description |
|---------|-------------|
| `npm run graph --silent -- <entry.pdl>` | Emit merged **design graph** JSON (internal AST snapshot; `full-spec.md` §16b). Use **`--silent`** when redirecting to a file so npm does not write the script banner into the JSON. |
| `npm run manifest --silent -- <entry.pdl> [--out file.json]` | Emit thin **design manifest** JSON (`full-spec.md` §17 §3). |
| `npm run resolve --silent -- <entry.pdl> <Component> [--tree-only] [--theme Name] [key=value …]` | Emit **`resolvedComponent`** JSON (`full-spec.md` §16 §2.5): **`components`** map (catalogue rows without **`defaultParams`**) plus **`system`** (**`theme`**, **`themesDeclared`**, trimmed **`primitives` / `semantics`** (definitions only; includes tokens referenced from **`themes[].overrides`**), per-theme **`overrides`** with **`primitive:`** / **`semantic:`** markers, referenced **`typeStyles`**, **`variantTypes`**). No flat **`tokens`**, no materialised tree. **`--tree-only`** = legacy bare **`CatalFrame`**. |
| `npm run catalogue --silent -- <entry.pdl> [--theme Name] [--out file.json]` | Emit **Component Catalogue** JSON (`full-spec.md` §16): **`tokensByTheme`**, name-keyed **`variantTypes`** / **`components`**, **`variantTypeName`** on variant params, trees, deltas. |

Example: `npm run graph --silent -- test-fixtures/pdl/design.pdl > design-graph.json`

`npm test` runs the Vitest suite.

**Atom graph goldens:** each `test-fixtures/pdl/atoms/*.pdl` (including `design.pdl`) has a matching `tests/fixtures/atom-graph-expected/<same-name>.graph.json`. Tests assert the full normalized design graph (no extra top-level keys, no drift in primitives, component bodies, etc.). After intentional compiler or fixture changes, refresh goldens with:

`npm run test:update-atom-graphs`

## Test fixtures

- **`test-fixtures/pdl/atoms/`** — one module per language surface (token types, themes, `typeStyle`, variants, layout/text/icon/media, `expose`, etc.); **`atoms/design.pdl`** imports them all.
- **`test-fixtures/pdl/design.pdl`** — pulls **`atoms/design.pdl`** plus the merge regression chain.
- **`test-fixtures/pdl/molecules/`** — **`molecules/design.pdl`** aggregates feature modules; **`m_companions.pdl`** (imported last) holds **`usage`**, **`fixtures`**, **`rules`**, and **`interaction`** examples for **`MoleculeTextButton`**, **`MoleculeCardArticle`**, and **`MoleculeFieldBlock`**.
- **`test-fixtures/pdl/errors/`** — intentionally invalid PDL modules (parse, validate, catalogue, token graph). Covered by **`tests/invalid-pdl.test.ts`** alongside the legacy **`e07` / `e10` / `e12`** fixtures in **`test-fixtures/pdl/`**.

## Documentation

- Normative language: `full-spec.md`
- Known spec/tooling gaps: `docs/SPEC_GAPS.md`
