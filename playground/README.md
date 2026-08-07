# PDL playground

Local-only preview: edit or drop `.pdl` files (or point at a **disk root** under the repo), pick bake engine / mode, and see HTML from the same bake → HTML pipeline as **`npm run preview`**.

Default bake engine is **Rust** (compiler under test). TypeScript oracle remains available for A/B. Pack mode uses Rust `bakePack`.

## Prerequisites

Build the compiler once from the repository root (the playground imports `../dist/*.js` and `scripts/lib/bake-pipeline.mjs`):

```bash
cd /path/to/pdl
npm install
npm run build
cargo build -p pdl-cli   # recommended so Rust bake is fast
```

Install playground UI dependencies (CodeMirror + Vite) once:

```bash
cd playground
npm install
npm run build
```

The editor is bundled to **`static/playground-app.js`**. After changing `playground/src/`, run **`npm run build`** in this folder again (or use **`npm start`**, which runs **`prestart`** to build first).

## Run

From the repository root:

```bash
npm run playground
```

Or from this folder:

```bash
cd playground
npm start
```

Open the URL printed in the terminal (default **http://127.0.0.1:3847**). If that port is busy, the server tries the next few ports automatically unless you set **`PLAYGROUND_PORT`**.

For **on-disk fixtures with livereload** (Cursor edit loop), prefer the repo-root harness instead:

```bash
npm run preview -- test-fixtures/pdl/molecules/design.pdl MoleculeButtonRowDemo
```

## Features

- **Editor** workspace: paste / drop `.pdl` (multi-file `import`) into a temp tree
- **Disk root** workspace: bake a path under the repo (e.g. `test-fixtures/pdl/molecules/design.pdl`) without uploading
- **Engine:** Rust (default) or TypeScript
- **Modes:** single component, all components (`bakeSystem`), pack (`bakePack`, Rust only)
- Debounced re-render ~500ms after typing; **Tokens & design** tab from TS `loadDesign`

## Layout

Everything for this tool lives under **`playground/`**. Shared bake/render lives in **`scripts/lib/bake-pipeline.mjs`** so preview and playground do not fork compile pipelines.
