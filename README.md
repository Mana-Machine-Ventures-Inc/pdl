# PDL toolchain

Compilers for **PDL** (Programmatic Design Language) as described in **`docs/full-spec.md`**.

- **TypeScript** (`src/`) — current reference CLI / oracle (`npm test`)  
- **Rust** (`crates/pdl-core`, `crates/pdl-cli`) — portable core + JSON CLI (`cargo test -p pdl-core`, `cargo run -q -p pdl-cli -- …`); see **`docs/IMPLEMENTATION_PLAN.md`**

## Commands

After `npm install`, use the npm scripts below (each runs **`tsc`** first so **`dist/`** matches **`src/`**). To call **`node dist/cli.js …`** directly, run **`npm run build`** (or **`tsc`**) whenever TypeScript sources change.

| Command | Description |
|---------|-------------|
| `npm run graphSystem --silent -- <entry.pdl> [--out file.json]` | **Component Catalogue** — same graph shapes as a resolve **`system`** slice (full **`primitives`**, **`semantics`**, **`themes`**, **`typeStyles`**, **`variantTypes`**, components): token **`definition`**s and **`typeStyle`** **`props`** use **`primitive:`** / **`semantic:`** pointers; bake output is the literal-tree counterpart (`docs/full-spec.md` §16). Entry only; **no** `--theme`. |
| `npm run graphComponent --silent -- <entry.pdl> <Component> [--theme Name] [--out file.json] [key=value …]` | **Component slice** — **`resolvedComponent`** JSON (`docs/full-spec.md` §16c / §16 §2.5): trimmed **`system`** + one catalogue row. |
| `npm run bakeSystem --silent -- <entry.pdl> [--theme Name] [--out file.json]` | **Baked system** — every component at default params, literal trees only (`docs/full-spec.md` §16d **`bakedDesign`**). |
| `npm run bakeComponent --silent -- <entry.pdl> <Component> [--theme Name] [--out file.json] [key=value …]` | **Baked instance** — one component, optional param overrides (`docs/full-spec.md` §16d). |
| `npm run manifest --silent -- <entry.pdl> [--out file.json]` | Thin **design manifest** JSON (`docs/full-spec.md` §17 §3). |
| `npm run renderHtml --silent -- <entry.pdl> <Component> [--theme Name] [--out file.html] [key=value …]` | **Bake → HTML5** for one component; optional **`--system`** instead of a component name for a full-library gallery (`docs/full-spec.md` §9). |
| `npm run renderCatalogueHtml --silent -- <entry.pdl> [--theme Name] [--out file.html]` | **Catalogue + bake → HTML5** reference page (`src/renderCatalogueHtml.ts`). |
| `npm run catalogue --silent -- <entry.pdl> [--theme Name] [--out file.json]` | Same JSON shape as **graphSystem**, but allows **`--theme`** for **tree** resolution (`docs/full-spec.md` §16). |
| `npm run resolve --silent -- <entry.pdl> <Component> [--tree-only] [--theme Name] [key=value …]` | Legacy: **`resolvedComponent`** (default) or bare **`CatalFrame`** with **`--tree-only`**. Prefer **graphComponent** / **bakeComponent** for new tooling. |

`npm test` runs the Vitest suite. `npm run test:rust` runs `cargo test -p pdl-core`.  
`npm run pdl:rust -- <cmd> …` runs the Rust `pdl` CLI (same bake/graph/catalogue/resolve shapes as the TS CLI).

## Test fixtures

- **`test-fixtures/pdl/atoms/`** — one module per language surface (token types, themes, `typeStyle`, variants, layout/text/icon/media, `expose`, etc.); **`atoms/design.pdl`** imports them all.
- **`test-fixtures/pdl/molecules/`** — **`molecules/design.pdl`** aggregates feature modules; **`m_companions.pdl`** (imported last) holds **`usage`**, **`fixtures`**, **`rules`**, and **`interaction`** examples for **`MoleculeTextButton`**, **`MoleculeCardArticle`**, and **`MoleculeFieldBlock`**.
- **`test-fixtures/pdl/integration/`** — end-to-end and scenario entries: **`integration/design.pdl`** (atoms + molecules + merge chain), **`themed.pdl`**, **`greeting.pdl`**, **`merge_*.pdl`**, **`rules_tags_when.pdl`**, **`companion_*.pdl`**, **`status_banner.pdl`**, etc.
- **`test-fixtures/pdl/errors/`** — invalid PDL (parse, validate, catalogue, token graph). **`errors/legacy/`** holds the older **`e07` / `e10` / `e12`** cases; **`tests/invalid-pdl.test.ts`** covers **`errors/`** and **`errors/legacy/`**.

## Documentation

- Normative language: **`docs/full-spec.md`**
- Known spec/tooling gaps: `docs/SPEC_GAPS.md`
- Accepted proposals + roadmap: `docs/IMPLEMENTATION_PLAN.md`
- Portable core proposal: `docs/PROPOSAL_PORTABLE_CORE.md`
- Slots / protocols / emits proposal: `docs/PROPOSAL_SLOTS_PROTOCOLS_FIXTURES.md`
