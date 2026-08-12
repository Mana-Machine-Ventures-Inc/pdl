# PDL Playground — overview

**Status:** shipped through Phase P5 + incremental apply + per-component fixtures / typed samples (2026-08-12)  
**Run:** `npm run playground`  
**Proposal:** [`PROPOSAL_PDL_PLAYGROUND.md`](./PROPOSAL_PDL_PLAYGROUND.md)  
**How-to:** [`playground/README.md`](../playground/README.md)  
**Coverage walk:** [`PLAYGROUND_COVERAGE_CHECKLIST.md`](./PLAYGROUND_COVERAGE_CHECKLIST.md)  
**Language:** fixtures §11 · typed samples §11a (`docs/full-spec.md`)

---

## What it is

PDL Playground is the **language demo and iterative lab** in this monorepo. You open a design-system pack, edit `.pdl` in the browser, and see **Rust bake → HTML** in an iframe.

It is **not**:

| Surface | Role |
|---------|------|
| **PDL Studio** (future) | Full authoring / DS maintenance product |
| **`npm run preview`** | Eng disk-watch stress harness (edit on disk → livereload) |

Fence: Playground never owns a parallel display model. Preview always comes from bake IR through the existing HTML host.

---

## Mental model

```text
Pack (.pdl files)
   → pick a file tab  (that file fills the canvas)
   → edit source / §11 fixtures / params / variants / samples
   → Rust bake (WASM default; CLI optional)
   → bake JSON → HTML iframe
```

**File canvas:** whatever tab is active drives the preview.

- Components declared in that file → gallery of those components  
- Import-only entry (e.g. `design.pdl`) → expand imports and show their components  
- Token/theme/variant-only files → token list preview  

**Fixtures vs samples (do not conflate):**

| | §11 `fixtures` | §11a `samples` |
|--|----------------|----------------|
| What | Scenario **param bags** per component | Design-global typed **data banks** |
| Playground UI | **Per-component** Fixture select under each preview title (+ left-nav chips for the primary) | Authored in `.pdl`; mounted at bake via `Bank.entry.field` — **no** host JS catalog |
| Pack example | Playlist Composer mood / Kite / Empty examples | `samples Tracks { … }` in `c_composer.pdl` |

---

## Shipped phases

| Phase | Delivered |
|-------|-----------|
| **P0** | Fence + skeleton: packs, editor, Rust bake → HTML |
| **P1** | Airbnb-lite pack, fixtures, param knobs, completions, errors |
| **P2** | WASM bake path, pack CI / coverage matrices *(Compose UI later removed)* |
| **P3** | File-selected canvas; remove component picker + Compose; **Add property** teaching menu |
| **P4** | Hover/press host: iframe interactions, click → emit status *(dual-bake was interim)* |
| **P5** | Variant preview: **Single / Grid / Pick** (grid capped at 16 combos) |
| **P6** | Incremental preview apply — param/interaction updates **bake IR → DOM reconcile** (primary); dirty-owner-only on multi-component canvases; HTML morph fallback; cold path still `srcdoc`. **Instance resolve** paints nested pointer/editing chrome (`pdl-resolve-instance` → bake child + IR patch); parent rebake only when parent SoT changes. Dual-bake chrome caches **retired** — single-tree mounts. Status shows `· live apply` / `Instance resolve · …`. See [`PROPOSAL_INCREMENTAL_PREVIEW_APPLY.md`](./PROPOSAL_INCREMENTAL_PREVIEW_APPLY.md). |
| **Fixtures UI** | §11 scenarios live **on each preview section** (Fixture select above param knobs). Left-rail chips still mirror the **primary** component. No global Preview-panel fixture dropdown. |
| **Typed samples** | Packs author `samples` banks; Playground only assigns scalars/variants. Playlist Composer mood/search worlds mount `Tracks.*.tracks` at bake — host JS catalogs removed. |

**Still deferred:** Phase S (Studio) — authoring-first product, governance, possibly separate repo.

---

## Layout

```text
┌────────────┬──────────────────────────┬─────────────────────┐
│ Pack       │  File tabs + PDL editor  │  Preview (HTML)     │
│ Fixtures*  │  Add property            │  per-section:       │
│ Params     │                          │   Fixture · params  │
│ Variants   │                          │  iframe             │
│            │                          │  Tokens tab         │
└────────────┴──────────────────────────┴─────────────────────┘
* left chips = primary component; each gallery section has its own Fixture select
```

---

## Key paths

| Path | Role |
|------|------|
| `playground/` | UI (Vite + CodeMirror) + local server |
| `scripts/lib/bake-pipeline.mjs` | Shared Rust/TS bake → HTML |
| `crates/pdl-core` / `pdl-cli` | Portable compiler |
| `crates/pdl-wasm` | Optional in-browser bake |
| `test-fixtures/pdl/systems/airbnb-lite/` | Flagship veracity pack |
| `test-fixtures/pdl/systems/playlist-composer-lite/` | Samples + ForEach + EditableText pack |
| `test-fixtures/pdl/lab/samples-tracks.pdl` | Minimal typed-samples lab |
| `src/renderHtml.ts` | Bake JSON → HTML (+ interactive host, per-component fixture bars) |

---

## How to use (short)

1. `npm run build && cargo build -p pdl-cli && npm run playground`
2. Default pack: **Airbnb-lite** (or a **browser draft** if you reloaded mid-session)
3. Click file tabs (`c_button.pdl`, `demos.pdl`, `foundation.pdl`, …) — preview follows the file
4. Hover `AbnButton` for press/hover feedback; try **Variants → Grid**
5. Use **Add property** to insert layout/text snippets while learning PDL
6. Open **Playlist Composer** → try each section’s **Fixture** select (mood / Kite / Empty); left chips track the focused component

Edits autosave to a **browser draft** (`localStorage`, ~14 days) so a page reload restores **knobs** (not a stale file bag over disk packs). **Reload from disk** clears dirty buffers + draft and reopens the pack. With **Pack on disk**, Analyze/Render flushes only **dirty** `.pdl` paths and refuses overwrite when disk changed under you (`expectedBaseline`).

**Default bake engine is Rust WASM** (header badge + Pack → Bake engine). Rebuild with `npm run build:wasm` after language changes. Disk workspace WASM bake uses **`/api/disk-sources`** so the import closure matches CLI (in-memory tabs alone are not enough). Use **Rust CLI** only when comparing spawn/path behavior — it is much slower for interaction.

---

## Design rules (keep these)

1. **Rust is the real compiler** on the demo path (TS only for A/B or analyze enrichment where needed).  
2. **HTML is the v1 host** — React/shell UI, not a second frame renderer.  
3. **SoT stays `.pdl`** — knobs may override bake params; teaching inserts write into source.  
4. **Don’t blur into Studio** — no governance, multiplayer, or Figma parity here.

**Language notes:** `enum` and `variant` are the same closed-set construct in v1 (bake → HTML is keyword-agnostic). Prefer `enum` for interaction/domain state and `variant` for design-axis combinators. Typed **`samples`** banks are normative in **`full-spec` §11a** — hosts assign drivers; bake mounts `Bank.entry.field`.
