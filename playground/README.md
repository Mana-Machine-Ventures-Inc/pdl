# PDL Playground

**Phase P2** demo / language lab: veracity packs, fixtures, param knobs, **compose → PDL**, **Rust CLI or WASM bake → HTML**.

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
./scripts/build-pdl-wasm.sh   # optional; enables Advanced → Rust WASM
cd playground && npm install && npm run build
```

## Run

```bash
npm run playground
```

Defaults: **Airbnb-lite** · **AbnFormActionsDemo** · Rust CLI · component mode.

## Packs

| Pack | Entry |
|------|--------|
| **Airbnb-lite** | `test-fixtures/pdl/systems/airbnb-lite/` |
| Molecules / Integration / Protocols / Atoms | existing fixtures |

## P2 features

- **WASM bake** (Advanced → Rust WASM): browser `pdl-wasm` → bake JSON → `/api/render-from-bake` HTML
- **Compose**: + Button / Chip / Field rewrites `compose.pdl` (`PlaygroundCompose`)
- **CI**: `systems_packs` tests + bake of airbnb-lite

## P1 features (still)

- Fixture example chips, param knobs, pack-aware completions, multi-line errors
