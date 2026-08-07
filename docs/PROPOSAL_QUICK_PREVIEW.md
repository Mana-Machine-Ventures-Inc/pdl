# Proposal: PDL quick preview (anti-IDE)

**Status:** proposed (2026-08-06)  
**Related:** `scripts/preview-server.mjs`, `scripts/lib/bake-pipeline.mjs`, `playground/`, `docs/IMPLEMENTATION_PLAN.md` (C1a)  
**Non-goals:** language server, completions, project index, catalogue UI, in-browser IDE

---

## 1. Problem

We need a **rapid loop**: open a `.pdl` file, see HTML, edit, see the update (or a clear error). Existing tools overlap:

- **`npm run preview`** — disk watch → bake → HTML + livereload (thin)
- **`npm run playground`** — CodeMirror, completions, tokens tab, engine A/B (already thicker)

Without a hard fence, “simple preview” drifts into a full IDE.

---

## 2. Decision

**Canonical quick flow = Cursor (or any editor) + `npm run preview`.**  
Do **not** build a new editor surface. Own only the bake → HTML feedback channel.

```text
Editor (Cursor)  →  edit .pdl on disk
preview-server   →  watch → bake-pipeline (Rust default) → HTML | error page
Browser          →  livereload / SSE refresh
```

---

## 3. Scope fence (must keep)

**In scope**

1. CLI: entry `.pdl` + component (or `--system` / existing pack flags)
2. Live HTML from the **shared** `scripts/lib/bake-pipeline.mjs` path
3. On failure: error HTML with file, line, message (no stack archaeology)
4. Debounced rebuild + livereload (already present)

**Out of scope (refuse by default)**

- In-browser editor / CodeMirror / completions / outline
- Multi-file project browser or “how everything fits” index
- Tokens / catalogue / graph tabs
- Engine A/B UI, fixture galleries, share links, persistence
- VS Code / Cursor extensions or a language server (until language stabilizes)

**Rule:** if a feature needs a UI control that is not path / component / refresh, it does not ship in this tool.

---

## 4. Playground policy

> **Superseded for product direction** by [`PROPOSAL_PDL_PLAYGROUND.md`](./PROPOSAL_PDL_PLAYGROUND.md) (proposed). That doc names **PDL Playground** as the React demo/lab surface and keeps this proposal’s **`npm run preview`** fence intact.

Until the Playground proposal is accepted:

- **`playground/`** may evolve toward that proposal under review.
- Do **not** merge Playground chrome into the quick-preview server.
- Prefer documenting `preview` as “PDL quick look” (disk watch); Playground as “language demo.”

**Still refuse in `preview-server`:** in-browser editor, completions, pack gallery, Studio features.

---

## 5. Implementation (agent checklist)

Small polish only — **no new app**.

1. **Docs (root README + short pointer):** one-command recipe  
   `npm run preview -- <entry.pdl> <ComponentName>`  
   State clearly: editor = your IDE; this command is the viewer + live reload.
2. **Error page:** ensure bake/parse failures surface **code, path, line, message** via existing `errorHtmlPage` (improve only if thin).
3. **Optional status strip** on the preview page (“baking… / ok / error”) via SSE — only if cheap; skip if it sprawls.
4. **Do not** add a third UI, in-browser textarea app, or playground feature work under this proposal.
5. **IMPLEMENTATION_PLAN:** note C1a = accepted quick-preview path; playground is non-canonical for the edit loop.

---

## 6. Done when

- A designer/engineer can open a `.pdl` in Cursor, run one preview command, edit the file, and see HTML or a clear error without touching playground.
- README makes that the recommended loop.
- No new editor dependencies or IDE-shaped surface area landed.

---

## 7. Summary

Use Cursor as the editor and keep **`npm run preview`** as the product: watch the entry `.pdl`, bake through the existing pipeline, show HTML or an error. Do not build an in-browser editor or project UI; freeze playground as optional scratch. If it isn’t path → bake → HTML/error, it doesn’t ship.
