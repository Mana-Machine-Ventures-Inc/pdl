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

## What it does (S1)

- Open any project folder (repo-relative or absolute) with `.pdl` files
- **System | Files** navigator (role tree vs file explorer)
- Selection model: full-file work surface + primary preview root; **Pin preview**; **File gallery** opt-in
- **World** panel (fixtures) with samples-used chips and preview-only param knobs
- Design / Prototype / Review modes
- Save dirty files to disk; Export bake JSON / HTML / catalogue
- Same fidelity path as Playground: **WASM bake → bake JSON → HTML host**

## Layout

```text
[ Design | Prototype | Review ]
Navigator (System|Files) · Work (source + World) · Preview
```
