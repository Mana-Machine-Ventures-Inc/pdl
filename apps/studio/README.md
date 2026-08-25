# PDL Studio

Project-oriented authoring for PDL design systems. Not the Playground language lab.

Proposal: [`docs/PROPOSAL_PDL_STUDIO.md`](../../docs/PROPOSAL_PDL_STUDIO.md)

## Run

From the repo root (after `npm install` in the root and in `apps/studio`):

```bash
npm run studio
# After language / WASM changes:
npm run studio:fresh
```

Open **http://127.0.0.1:3857**.

## What it does (S1+)

- Open any project folder (repo-relative or absolute) with `.pdl` files
- **System | Files** navigator (role tree vs file explorer)
- Selection model: full-file work surface + primary preview root; **Pin preview**; **File gallery** opt-in
- **World | Notes** dock: fixtures + samples-used; usage/rules + open companions/layout
- Insert templates, Add property, pack-aware completions, ⌘-click / F12 go to definition
- **⌘S** save · **⌘O** open · **⌘K** focus navigator search · Reload from disk
- Recent projects on welcome; Problems panel with click-to-goto
- Design / Prototype / Review modes
- Same fidelity path as Playground: **WASM bake → bake JSON → HTML host**
- Export bake JSON / HTML / catalogue

## Layout

```text
[ Design | Prototype | Review ]
Navigator (System|Files) · Work (source + World) · Preview
```
