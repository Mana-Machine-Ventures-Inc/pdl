# PDL playground

Local-only preview server: paste or drop `.pdl` files (including multi-file designs with `import`), pick a component and theme, and see the same HTML the `pdl renderHtml` CLI would emit.

## Prerequisites

Build the compiler once from the repository root (the playground imports `../dist/*.js`):

```bash
cd /path/to/pdl
npm install
npm run build
```

Install playground UI dependencies (CodeMirror + Vite) once:

```bash
cd playground
npm install
npm run build
```

The editor is bundled to **`static/playground-app.js`**. After changing `playground/src/`, run **`npm run build`** in this folder again (or use **`npm start`**, which runs **`prestart`** to build first).

## Run

From the repository root (after `npm run build` for the compiler and **`npm install` + `npm run build` in `playground/`** at least once):

```bash
npm run playground
```

(`npm run playground` runs the playground Vite build, then starts the server.)

Or from this folder:

```bash
cd playground
npm start
```

Open the URL printed in the terminal (default **http://127.0.0.1:3847**). If that port is busy, the server tries the next few ports automatically unless you set **`PLAYGROUND_PORT`** (then that exact port is used and you get a clear error if it is taken).

The **Tokens & design** tab lists merged **primitives**, **semantics**, **themes** (with overrides), **variants**, **type styles**, and **module** paths — the same structures loaded from your `.pdl` workspace before bake.

## Layout

Everything for this tool lives under **`playground/`** (`server/`, `static/`, `src/` for the bundled editor UI, this README) so the core repo `src/` tree stays focused on the language and CLI.

The source panel uses **CodeMirror 6** (line numbers, history, bracket matching, Tab indent, Ctrl+Space completion). Completions mix PDL keywords (including **`Corner`**, **`EdgeInsets`**, and common labelled-arg names like **`tl`**, **`x`**, **`top`**, …) with symbols from the last successful **Analyze** or **Render** (components, primitives, semantics, themes, variant names and case labels, type styles). On lines like **`cornerRadius =`**, **`padding =`**, **`width =`**, …, context-aware options appear at the top (snippet inserts for **`Corner(…)`** / **`EdgeInsets(…)`**, sizing literals, and boosted token names where names match).

On first load, **`design.pdl`** is pre-filled with a few **color primitives**, one **semantic**, and a **`Button`** component (layout + text label). The playground **analyzes and renders automatically**, defaults to **All components** preview mode, and **re-renders ~500ms after you stop typing** in the editor (theme / param JSON use the same debounce). Use **Render** for an immediate refresh without waiting for the pause.
