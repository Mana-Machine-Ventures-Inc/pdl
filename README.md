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
| `npm run renderHtmlFromBake --silent -- <baked.json> [--component Name] [--out file.html]` | **HTML5 from bake JSON** — use Rust (or TS) `bake*` / `bakePack` output without re-parsing `.pdl`. |
| `npm run preview --silent -- <entry.pdl> <Component> [opts]` | **Live watch → Rust bake → HTML** with livereload (`scripts/preview-server.mjs`). Also `--system`, `--pack <json>`, `--engine rust\|ts`, `--watch-dir`. |
| `npm run playground` | Optional browser editor (`playground/`) on the same bake → HTML pipeline (Rust default). |
| `npm run renderCatalogueHtml --silent -- <entry.pdl> [--theme Name] [--out file.html]` | **Catalogue + bake → HTML5** reference page (`src/renderCatalogueHtml.ts`). |
| `npm run catalogue --silent -- <entry.pdl> [--theme Name] [--out file.json]` | Same JSON shape as **graphSystem**, but allows **`--theme`** for **tree** resolution (`docs/full-spec.md` §16). |
| `npm run resolve --silent -- <entry.pdl> <Component> [--tree-only] [--theme Name] [key=value …]` | Legacy: **`resolvedComponent`** (default) or bare **`CatalFrame`** with **`--tree-only`**. Prefer **graphComponent** / **bakeComponent** for new tooling. |

`npm test` runs the Vitest suite. `npm run test:rust` runs `cargo test -p pdl-core`.  
`npm run pdl:rust -- <cmd> …` runs the Rust `pdl` CLI (same bake/graph/catalogue/resolve shapes as the TS CLI).  
`npm run test:dual` compares TS vs Rust bake/graph JSON (volatiles pinned).

### Live preview (edit → bake → HTML)

Fastest loop for stress-testing the language and **Rust** compiler against on-disk fixtures. Bake JSON stays the IR; HTML is only the C1 host.

```bash
# Watch molecules/ ; open the printed URL; save .pdl files to reload
npm run preview -- test-fixtures/pdl/molecules/design.pdl MoleculeButtonRowDemo

# Wider watch (when entry imports siblings outside its folder)
npm run preview -- test-fixtures/pdl/molecules/design.pdl MoleculeButtonRowDemo \
  --watch-dir test-fixtures/pdl

# Injection pack (protocols)
npm run preview -- test-fixtures/pdl/protocols/design.pdl \
  --pack test-fixtures/pdl/protocols/packs/modal_confirm.json

# Full gallery
npm run preview -- test-fixtures/pdl/molecules/design.pdl --system
```

Artifacts: `.tmp/preview.bake.json`, `.tmp/preview.html`. Compare engines with `--engine ts`.

Browser paste/explore UI (same pipeline): `npm run playground`.

### End-to-end: Rust bake → HTML preview (one-shot)

```bash
# 1) Bake with Rust (protocols / packs work here)
cargo run -q -p pdl-cli -- bakePack \
  test-fixtures/pdl/protocols/design.pdl \
  test-fixtures/pdl/protocols/packs/modal_confirm.json \
  --out /tmp/modal.bake.json

# 2) Render that artifact with the TS HTML emitter
npm run renderHtmlFromBake --silent -- /tmp/modal.bake.json --out /tmp/modal.html
open /tmp/modal.html
```

Same pattern with `bakeSystem` / `bakeComponent` for non-protocol designs.

## Test fixtures

- **`test-fixtures/pdl/atoms/`** — one module per language surface (token types, themes, `typeStyle`, variants, layout/text/icon/media, `expose`, etc.); **`atoms/design.pdl`** imports them all.
- **`test-fixtures/pdl/molecules/`** — **`molecules/design.pdl`** aggregates feature modules; **`m_companions.pdl`** (imported last) holds **`usage`**, **`fixtures`**, **`rules`**, and **`interaction`** examples for **`MoleculeTextButton`**, **`MoleculeCardArticle`**, and **`MoleculeFieldBlock`**.
- **`test-fixtures/pdl/integration/`** — end-to-end and scenario entries: **`integration/design.pdl`** (atoms + molecules + merge chain), **`themed.pdl`**, **`greeting.pdl`**, **`merge_*.pdl`**, **`rules_tags_when.pdl`**, **`companion_*.pdl`**, **`status_banner.pdl`**, etc.
- **`test-fixtures/pdl/protocols/`** — Rust B1–B5 fixtures (`design.pdl` imports modal + FilterChip). **`library_subnav.pdl`** exercises §4e `ForEach` / layout `on` (parses + bakes in Rust; intentionally unimported from `design.pdl`).

## Documentation

- Normative language: **`docs/full-spec.md`** (§4a–§4e protocols / slots / packs / emits / `ForEach` (no `expose`; all params public))
- Coverage & roadmap: **`docs/IMPLEMENTATION_PLAN.md`** (*Language & host coverage*)
- Known spec/tooling gaps: `docs/SPEC_GAPS.md`
- Portable core proposal: `docs/PROPOSAL_PORTABLE_CORE.md`
- Slots / protocols / emits proposal: `docs/PROPOSAL_SLOTS_PROTOCOLS_FIXTURES.md` (B1–B4 shipped Rust; B5 spec’d in §4e)
