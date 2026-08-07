# PDL Playground

**Phase P1** demo / language lab: veracity packs, fixture chips, param knobs, **Rust bake → HTML**.

This is **not** PDL Studio (future full authoring). It is **not** `npm run preview` (disk-watch eng harness).

| Surface | Role |
|---------|------|
| **PDL Playground** (`npm run playground`) | Pack + fixtures + editor + HTML preview |
| **`npm run preview`** | Edit in VS Code/Cursor; watch → bake → livereload |
| **PDL Studio** (future) | Long-term DS maintenance product |

Proposal: [`docs/PROPOSAL_PDL_PLAYGROUND.md`](../docs/PROPOSAL_PDL_PLAYGROUND.md).

## Prerequisites

```bash
cd /path/to/pdl
npm install && npm run build
cargo build -p pdl-cli
cd playground && npm install && npm run build
```

## Run

```bash
npm run playground
```

Defaults: **Airbnb-lite** · **AbnFormActionsDemo** (Cancel/Save) · Rust · component mode.

## Packs

| Pack | Entry |
|------|--------|
| **Airbnb-lite** | `test-fixtures/pdl/systems/airbnb-lite/` |
| Molecules / Integration / Protocols / Atoms | existing fixtures |

## P1 features

- Fixture example chips (from `fixtures` blocks)
- Param knobs (string + variant) → bake overrides
- Pack-aware completions (tokens, components, `.cases`)
- Multi-line bake/parse errors in the status panel
