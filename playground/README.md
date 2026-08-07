# PDL Playground

**Phase P3–P5** demo lab: **file-selected canvas**, teaching **Add property**, **hover/press** host, **variant grid/pick**.

Not PDL Studio. Not `npm run preview` (disk-watch eng harness).

| Surface | Role |
|---------|------|
| **PDL Playground** (`npm run playground`) | Pack + file tabs + editor + HTML preview |
| **`npm run preview`** | Edit on disk; watch → bake → livereload |
| **PDL Studio** (future) | Long-term DS maintenance product |

Proposal: [`docs/PROPOSAL_PDL_PLAYGROUND.md`](../docs/PROPOSAL_PDL_PLAYGROUND.md).

## Run

```bash
npm install && npm run build
cargo build -p pdl-cli
cd playground && npm install && npm run build
npm run playground
```

## Canvas model (P3)

- The **active file tab** fills the preview.
- Components declared in that file are baked (gallery).
- Import-only files (e.g. `design.pdl`) expand imports and show those components.
- Token-only files show a token list preview.
- **Add property** inserts layout/text/icon snippets at the cursor (kind-aware).

## Interaction (P4)

- Components with `interactionState` (rest/hovered) dual-bake; iframe swaps on hover.
- Click posts `pressEnd` to the parent status line (`allow-scripts` sandbox).

## Variants (P5)

- **Single** — defaults / param knobs / fixtures.
- **Grid** — cartesian product of variant params (capped at 16).
- **Pick** — knobs for variant-typed params only.
