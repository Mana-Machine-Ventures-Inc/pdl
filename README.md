# Compilers for **PDL** (Programmatic Design Language).

**New to the language?** [Public docs](https://mana-machine-ventures-inc.github.io/pdl/) (`npm run docs:dev` locally): guide, language objects, diagnostics. Binding lock files: **`shared/*.json`**, **`grammar/pdl.ebnf`**, and fixtures. This README is the **compiler repo**.

- **TypeScript** (`src/`) — current reference CLI / oracle (`npm test`)  
- **Rust** (`crates/pdl-core`, `crates/pdl-cli`) — portable core + JSON CLI (`cargo test -p pdl-core`, `cargo run -q -p pdl-cli -- …`); see **`docs/IMPLEMENTATION_PLAN.md`**

## Commands

After `npm install`, use the npm scripts below (each runs **`tsc`** first so **`dist/`** matches **`src/`**). To call **`node dist/cli.js …`** directly, run **`npm run build`** (or **`tsc`**) whenever TypeScript sources change.

| Command | Description |
|---------|-------------|
| `npm run graphSystem --silent -- <entry.pdl> [--out file.json]` | **Component Catalogue** — same graph shapes as a resolve **`system`** slice (full **`primitives`**, **`semantics`**, **`themes`**, **`typeStyles`**, **`variantTypes`**, components): token **`definition`**s and **`typeStyle`** **`props`** use **`primitive:`** / **`semantic:`** pointers; bake output is the literal-tree counterpart (`shared/schema/component-catalogue.json`). Entry only; **no** `--theme`. |
| `npm run graphComponent --silent -- <entry.pdl> <Component> [--theme Name] [--out file.json] [key=value …]` | **Component slice** — **`resolvedComponent`** JSON (`shared/schema/resolved-component.json`): trimmed **`system`** + one catalogue row. |
| `npm run bakeSystem --silent -- <entry.pdl> [--theme Name] [--out file.json]` | **Baked system** — every component at default params, literal trees only (`shared/schema/baked-design.json`). |
| `npm run bakeComponent --silent -- <entry.pdl> <Component> [--theme Name] [--out file.json] [key=value …]` | **Baked instance** — one component, optional param overrides (`shared/schema/baked-design.json`). |
| `npm run manifest --silent -- <entry.pdl> [--out file.json]` | Thin **design manifest** JSON (registry only — not a catalogue substitute). |
| `npm run renderHtml --silent -- <entry.pdl> <Component> [--theme Name] [--out file.html] [key=value …]` | **Bake → HTML5** for one component; optional **`--system`** instead of a component name for a full-library gallery. |
| `npm run renderHtmlFromBake --silent -- <baked.json> [--component Name] [--out file.html]` | **HTML5 from bake JSON** — use Rust (or TS) `bake*` / `bakePack` output without re-parsing `.pdl`. |
| `npm run preview --silent -- <entry.pdl> <Component> [opts]` | **Live watch → Rust bake → HTML** with livereload (`scripts/preview-server.mjs`). Eng stress harness — edit in your IDE. |
| `npm run playground` | **PDL Playground** (P0–P5) — file canvas + editor + HTML preview (`playground/`). Demo/lab, not Studio. |
| `npm run renderCatalogueHtml --silent -- <entry.pdl> [--theme Name] [--out file.html]` | **Catalogue + bake → HTML5** reference page (`src/renderCatalogueHtml.ts`). |
| `npm run catalogue --silent -- <entry.pdl> [--theme Name] [--out file.json]` | Same JSON shape as **graphSystem**, but allows **`--theme`** for **tree** resolution (`shared/schema/component-catalogue.json`). |
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

### PDL Playground (demo / language lab)

In-browser **pack → edit PDL → Rust bake → HTML** loop for demonstrating the language. Not long-term DS maintenance (that’s future **PDL Studio**).

```bash
npm run playground
# → http://127.0.0.1:3847  (Molecules + MoleculeButtonRowDemo by default)
```

See `playground/README.md`, `docs/PLAYGROUND_OVERVIEW.md`, and `docs/PROPOSAL_PDL_PLAYGROUND.md`.

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

- **`test-fixtures/pdl/systems/`** — veracity packs for Playground (`airbnb-lite`, `playlist-composer-lite`, …); see pack READMEs for coverage matrices.
- **`test-fixtures/pdl/lab/`** — focused language labs (e.g. **`samples-tracks.pdl`** for typed samples).
- **`test-fixtures/pdl/atoms/`** — one module per language surface (token types, themes, `typeStyle`, variants, layout/text/icon/media, etc.); **`atoms/design.pdl`** imports them all.
- **`test-fixtures/pdl/molecules/`** — **`molecules/design.pdl`** aggregates feature modules; **`m_companions.pdl`** (imported last) holds **`usage`**, **`fixtures`**, **`rules`**, and **`interaction`** examples for **`MoleculeTextButton`**, **`MoleculeCardArticle`**, and **`MoleculeFieldBlock`**.
- **`test-fixtures/pdl/integration/`** — end-to-end and scenario entries: **`integration/design.pdl`** (atoms + molecules + merge chain), **`themed.pdl`**, **`greeting.pdl`**, **`merge_*.pdl`**, **`rules_tags_when.pdl`**, **`companion_*.pdl`**, **`status_banner.pdl`**, etc.
- **`test-fixtures/pdl/protocols/`** — Rust B1–B5 fixtures (`design.pdl` imports modal + FilterChip). **`library_subnav.pdl`** exercises §4e `ForEach` / layout emit capture (parses + bakes in Rust; intentionally unimported from `design.pdl`).
- **`test-fixtures/pdl/errors/`** — invalid PDL oracles (e.g. **`e041-unknown-sample-path.pdl`**).

## Documentation

Public site (the human spec): **`website/`** — `npm run docs:dev`. Published at **https://mana-machine-ventures-inc.github.io/pdl/** (GitHub Pages). **About**, **Getting Started**, **Language**, and **Diagnostics** are for people writing `.pdl`. `docs/PROPOSAL_*.md` is design history.

- Language lock: **`shared/language-objects.json`** (generated into the site as Language objects)
- Surface grammar: **`grammar/pdl.ebnf`** (edit the file; `npm run docs:gen` wraps it for CI)
- Diagnostics: **`shared/diagnostics.json`** (generated into the site)
- Frame properties: **`shared/frame-props.json`**
- Keywords: **`shared/keywords.json`**
- JSON IR: **`shared/schema/`**
- Playground overview: **`docs/PLAYGROUND_OVERVIEW.md`**
- Playground proposal: **`docs/PROPOSAL_PDL_PLAYGROUND.md`**
- Typed samples (history): **`docs/PROPOSAL_TYPED_SAMPLES.md`**
- Quick preview (disk watch): **`docs/PROPOSAL_QUICK_PREVIEW.md`**
- Portable core: **`docs/PROPOSAL_PORTABLE_CORE.md`**
- Slots / protocols: **`docs/PROPOSAL_SLOTS_PROTOCOLS_FIXTURES.md`**
- Implementation / coverage: **`docs/IMPLEMENTATION_PLAN.md`**
- Spec gaps: **`docs/SPEC_GAPS.md`**
- VS Code TextMate grammar: **`editors/vscode-pdl/`**
