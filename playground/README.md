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
cd playground && npm install && npm run build
npm run playground
```

## Session drafts

Edits autosave in the browser (`localStorage`) so a reload restores files, entry, pack, and param knobs. Use **Reload from disk** to discard the draft and reopen the selected pack. Switching packs also reloads from disk.

## WASM bake (disk workspace)

Rust bake reads the repo import closure from disk. **WASM** only sees an in-memory map, so in disk mode the Playground calls **`POST /api/disk-sources`** to load that closure (then overlays editor edits) before baking. Rebuild WASM after language changes: `npm run build:wasm`.

## Canvas model (P3)

- The **active file tab** fills the preview.
- Components declared in that file are baked (gallery).
- Import-only files (e.g. `design.pdl`) expand imports and show those components.
- Token-only files show a token list preview.
- **Add property** inserts layout/text/icon snippets at the cursor (kind-aware).

## Interaction (P4)

- Components with catalogue `interaction` handlers: HTML host applies `on hoverStart|pressStart|…` assigns (mirrors `applyInteractionEvent`), then swaps pre-baked `interactionState` trees when available.
- Host posts `pdl-interaction` with `{ event, params, emits, previewHandled }` so Playground syncs knobs from real handler results.
- Airbnb-lite opens on **`AbnPointerLab`** (`self.<channel> = { … }` host handlers) for a full pointer-cycle demo.
- Protocols opens on **`LibrarySubnav`**: nested FilterChip `emit select` → parent `ForEach(chips) { chip in chip.select(…) = { … } }` rebinds `currentFilter` → rebake (Pattern A).

## Variants (P5)

- **Single** — defaults / param knobs / fixtures.
- **Grid** — cartesian product of variant params (capped at 16).
- **Pick** — knobs for variant-typed params only.
