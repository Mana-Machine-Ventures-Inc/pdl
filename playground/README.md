# PDL Playground

**Phase P0** demo / language lab: pick a fixture pack, edit `.pdl`, see **Rust bake → HTML**.

This is **not** PDL Studio (future full authoring). It is **not** `npm run preview` (disk-watch eng harness).

| Surface | Role |
|---------|------|
| **PDL Playground** (`npm run playground`) | In-browser pack + editor + HTML preview |
| **`npm run preview`** | Edit in VS Code/Cursor; watch → bake → livereload |
| **PDL Studio** (future) | Long-term DS maintenance product |

Proposal: [`docs/PROPOSAL_PDL_PLAYGROUND.md`](../docs/PROPOSAL_PDL_PLAYGROUND.md).

## Prerequisites

```bash
cd /path/to/pdl
npm install
npm run build
cargo build -p pdl-cli

cd playground
npm install
npm run build
```

## Run

From repo root:

```bash
npm run playground
```

Open the printed URL (default **http://127.0.0.1:3847**).

Defaults: **Molecules** pack · **MoleculeButtonRowDemo** · Rust · component mode.

## P0 layout

1. **Pack** — catalog (`molecules`, `integration`, `protocols`, `atoms`) + component picker  
2. **PDL** — CodeMirror editor (edits under `test-fixtures/pdl/` flush to disk before bake)  
3. **Preview** — HTML iframe from shared `scripts/lib/bake-pipeline.mjs`

## Notes

- Pack mode / TS engine live under **Advanced**.  
- Scratch upload workspace is still available under Advanced → Workspace.  
- Rebuild UI after `playground/src/` changes: `cd playground && npm run build` (or `npm start` which builds first).
