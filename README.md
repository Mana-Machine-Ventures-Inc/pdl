# Compilers for **PDL** (Programmatic Design Language).

**New to the language?** [Public docs](https://mana-machine-ventures-inc.github.io/pdl/) (`npm run docs:dev` locally): guide, language objects, diagnostics. Binding lock files: **`shared/*.json`**, **`grammar/pdl.ebnf`**, and fixtures. This README is the **compiler repo**.

- **Rust** (`crates/pdl-core`, `crates/pdl-cli`, `crates/pdl-wasm`) — **the compiler**: lexer, parser, merge, validate, resolve, bake, catalogue (`cargo test -p pdl-core`, `cargo run -q -p pdl-cli -- …`); see **`docs/IMPLEMENTATION_PLAN.md`**
- **TypeScript** (`src/`) — **the host**: HTML emitter, motion/choreography runtime, rules evaluation, manifest. It consumes bake / catalogue / tokens JSON and never parses `.pdl` (`npm test`)

The TypeScript parser (the “oracle” the Rust port was checked against) is retired: Rust is the only implementation of the language.

## Commands

Compile with the Rust CLI, then render its JSON with the TypeScript host.

### Compile (Rust)

`cargo run -q -p pdl-cli -- <cmd>` — or `npm run pdl:rust -- <cmd>`, or `./target/debug/pdl` after `npm run build:rust`.

| Command | Description |
|---------|-------------|
| `bakeSystem <entry.pdl> [--theme Name] [--host Name] [--hostFacts json] [--out f.json]` | **Baked system** — every component at default params, literal trees only (`shared/schema/baked-design.json`). |
| `bakeComponent <entry.pdl> <Component> [--theme Name] [--presenterPins json] [--out f.json] [key=value …]` | **Baked instance** — one component, optional param overrides. |
| `bakePack <entry.pdl> <pack.json> [--out f.json]` | Baked **injection pack** (protocols). `validatePack` checks one without baking. |
| `catalogue <entry.pdl> [--theme Name] [--out f.json]` | **Component Catalogue** — tokens, themes, `typeStyle`s, variants, params, `usage` / `fixtures` / `rules` / `interactions` / `emitCaptures` (`shared/schema/component-catalogue.json`). |
| `tokens <entry.pdl> [--theme Name] [--out f.json]` | **Resolved token map** + module paths + preview background. |
| `graphSystem <entry.pdl>` / `graphComponent <entry.pdl> <Component>` | Pointer-form graph slices (`shared/schema/resolved-component.json`). |
| `resolve <entry.pdl> <Component> [--tree-only] [--theme Name]` | Legacy `resolvedComponent` / bare `CatalFrame`. Prefer `bakeComponent`. |

### Render (TypeScript host)

Each npm script runs **`tsc`** first so **`dist/`** matches **`src/`** (run **`npm run build`** yourself before calling **`node dist/cli.js …`** directly). Inputs are the JSON above — the host does not read `.pdl`.

| Command | Description |
|---------|-------------|
| `npm run renderHtmlFromBake --silent -- <baked.json> [--catalogue cat.json] [--component Name] [--out f.html]` | **HTML5 from bake JSON**. With `--catalogue`, adds usage / rules / interactions to the page. |
| `npm run renderCatalogueHtml --silent -- --from-bake <baked.json> --catalogue <cat.json> [--out f.html]` | **Catalogue reference page** (`src/renderCatalogueHtml.ts`). |
| `npm run manifest --silent -- --catalogue <cat.json> [--tokens tokens.json] [--out f.json]` | Thin **design manifest** JSON (registry only — not a catalogue substitute). |
| `npm run preview --silent -- <entry.pdl> <Component> [opts]` | **Live watch → Rust bake → HTML** with livereload (`scripts/preview-server.mjs`). Eng stress harness — edit in your IDE. |
| `npm run playground` | **PDL Playground** — file canvas + editor + HTML preview (`playground/`). Demo/lab, not Studio. |
| `npm run studio` | **PDL Studio** (S1) — project open/save, System\|Files nav, World panel, WASM→HTML preview, export (`apps/studio/`). |

`npm test` builds `dist/` **and** the Rust CLI, then runs Vitest: host tests take their bake / catalogue JSON from `pdl`. `npm run test:rust` runs `cargo test -p pdl-core` (language semantics and diagnostics live there).

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

Artifacts: `.tmp/preview.bake.json`, `.tmp/preview.html`.

### PDL Playground (demo / language lab)

In-browser **pack → edit PDL → Rust bake → HTML** loop for demonstrating the language. Not long-term DS maintenance (that’s **PDL Studio**).

```bash
npm run playground
# → http://127.0.0.1:3847  (Molecules + MoleculeButtonRowDemo by default)
```

See `playground/README.md`, `docs/PLAYGROUND_OVERVIEW.md`, and `docs/PROPOSAL_PDL_PLAYGROUND.md`.

### PDL Studio (project authoring)

Open a folder, edit `.pdl`, preview via the same bake → HTML host, save, and export.

```bash
npm install --prefix apps/studio
npm run studio
# → http://127.0.0.1:3857 (falls back to 3858–3866 if busy)
# After language / WASM changes: npm run studio:fresh
```

See `apps/studio/README.md` and `docs/PROPOSAL_PDL_STUDIO.md`.

### End-to-end: Rust bake → HTML preview (one-shot)

```bash
# 1) Bake with Rust (protocols / packs work here)
cargo run -q -p pdl-cli -- bakePack \
  test-fixtures/pdl/protocols/design.pdl \
  test-fixtures/pdl/protocols/packs/modal_confirm.json \
  --out /tmp/modal.bake.json

# 2) Render that artifact with the TypeScript host
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
- **`test-fixtures/pdl/errors/`** — invalid PDL oracles (e.g. **`e041-unknown-sample-path.pdl`**); `crates/pdl-core/tests/error_fixtures.rs` asserts the code each filename names, so a new fixture is a new diagnostics test.

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
