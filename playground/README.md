# PDL playground

Local-only preview server: paste or drop `.pdl` files (including multi-file designs with `import`), pick a component and theme, and see the same HTML the `pdl renderHtml` CLI would emit.

## Prerequisites

Build the compiler once from the repository root (the playground imports `../dist/*.js`):

```bash
cd /path/to/pdl
npm install
npm run build
```

## Run

From the repository root (after `npm run build`):

```bash
npm run playground
```

Or from this folder:

```bash
cd playground
npm start
```

Open the URL printed in the terminal (default **http://127.0.0.1:3847**). If that port is busy, the server tries the next few ports automatically unless you set **`PLAYGROUND_PORT`** (then that exact port is used and you get a clear error if it is taken).

The **Tokens & design** tab lists merged **primitives**, **semantics**, **themes** (with overrides), **variants**, **type styles**, and **module** paths — the same structures loaded from your `.pdl` workspace before bake.

## Layout

Everything for this tool lives under **`playground/`** (`server/`, `static/`, this README) so the core `src/` tree stays focused on the language and CLI.
