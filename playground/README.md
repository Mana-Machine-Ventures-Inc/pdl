# PDL Playground

**Phase P3–P5** demo lab: **file-selected canvas**, teaching **Add property**, **hover/press** host, **variant grid/pick**.

Not PDL Studio. Not `npm run preview` (disk-watch eng harness).

| Surface | Role |
|---------|------|
| **PDL Playground** (`npm run playground`) | Pack + file tabs + editor + HTML preview |
| **`npm run preview`** | Edit on disk; watch → bake → livereload |
| **PDL Studio** (future) | Long-term DS maintenance product |

Proposal: [`docs/PROPOSAL_PDL_PLAYGROUND.md`](../docs/PROPOSAL_PDL_PLAYGROUND.md).  
Overview: [`docs/PLAYGROUND_OVERVIEW.md`](../docs/PLAYGROUND_OVERVIEW.md).

## Run

```bash
npm install && npm run build
cargo build -p pdl-cli
npm run build:wasm
cd playground && npm install && npm run build
npm run playground
```

**Default bake engine is Rust WASM** (in-browser, ~ms). Prefer it for interactive preview; **Rust CLI** spawns `pdl` each tick and feels much slower. Rebuild WASM after language changes: `npm run build:wasm`.

## Session drafts

Edits autosave in the browser (`localStorage`) so a reload restores files, entry, pack, and param knobs. Use **Reload from disk** to discard the draft and reopen the selected pack. Switching packs also reloads from disk.

**Scratch project** is a separate browser workspace (Project → Scratch, or Workspace → Scratch). Dropping a folder/files **replaces** that scratch — it never merges into Airbnb or other disk packs. Toggling back to a disk pack keeps a scratch snapshot so you can return without losing it; **Reset scratch** starts over with `lab.pdl`.

## WASM bake (disk workspace)

WASM only sees an in-memory map, so in disk mode the Playground calls **`POST /api/disk-sources`** to load the import closure (then overlays editor edits) before baking — matching CLI disk semantics.

## Canvas model (P3)

- The **active file tab** fills the preview.
- Components declared in that file are baked (gallery).
- Import-only files (e.g. `design.pdl`) expand imports and show those components.
- Token-only files show a token list preview.
- **Add property** inserts layout/text/icon snippets at the cursor (kind-aware).

## Interaction (P4)

- Author host inbound in the kind body: `[self.]pressEnd = { … }` (`self.` optional). Compilers lift these into catalogue `interactions[]` (name `default`). The `interaction` keyword is **removed**.
- HTML host applies those handlers on pointer events (mirrors `applyInteractionEvent`), then swaps pre-baked `interactionState` trees when available.
- Host posts `pdl-interaction` with `{ event, params, emits, previewHandled }` so Playground syncs knobs from real handler results.
- Airbnb-lite opens on **`AbnPointerLab`** for a full pointer-cycle demo.
- Protocols opens on **`LibrarySubnav`**: nested FilterChip host handlers (hover/press) + `emit select` → parent `ForEach` capture rebinds `currentFilter` → rebake (Pattern A). Enrichment merges Rust catalogue `emitCaptures` (TS still skims ForEach).
- Insert templates cover Button host handlers, EditableText SearchField, and a FilterBar (emits + ForEach).

## Variants (P5)

- **Single** — defaults / param knobs / fixtures.
- **Grid** — cartesian product of variant params (capped at 16).
- **Pick** — knobs for variant-typed params only.
