# Proposal: PDL Playground (demo & language lab)

**Status:** accepted — P0–P2 shipped (2026-08-07)  
**Related:** `docs/manifesto.md`, `docs/PROPOSAL_PORTABLE_CORE.md`, `docs/PROPOSAL_QUICK_PREVIEW.md`, `docs/IMPLEMENTATION_PLAN.md` (C1 / C1a), `playground/`, `scripts/lib/bake-pipeline.mjs`, `crates/pdl-wasm`, `.cursor/skills/pdl-from-design-system/`  
**Amends:** `PROPOSAL_QUICK_PREVIEW.md` §4 (playground policy) — quick preview remains the **disk-watch stress harness**; this proposal defines a separate **Playground** product surface  
**Non-goals:** PDL Studio (full authoring product), Figma parity, React-as-host frame mapper (v1), marketplace distribution

---

## 1. Problem

We need a way for **designers and developers** to see PDL’s value quickly:

1. **Veracity** — real-ish design systems (Material, Airbnb, Apple, …) expressed as `.pdl`, including composition, variants, rules, and interaction where the language supports them.
2. **Editing** — change source (and light controls) and see results immediately.
3. **Fidelity** — output comes from the **Rust portable core** → bake IR → host preview, not a parallel toy renderer.
4. **Scope control** — avoid building “PDL Studio” (long-term DS maintenance IDE) before the language and hosts are proven.

Today we have:

| Tool | Strength | Gap |
|------|----------|-----|
| `npm run preview` | Disk watch → Rust bake → HTML; eng stress loop | No in-app editor; not a demo for packs |
| `playground/` | CodeMirror + bake pipeline | Scratch lab; not pack-centric; unclear vs Studio |
| Fixtures / goldens / semantic tests | Compiler trust | Not a narrative for adoption |
| VS Code TextMate extension | Highlighting in classic IDE | Not a shared demo surface |

Without a named product fence, Playground either dies as “optional scratch” or silently becomes Studio.

---

## 2. Decision

**Ship “PDL Playground”** — a **simple React web app** in this monorepo for **iterative testing and demonstration** of the language.

**Defer “PDL Studio”** — full authoring / DS maintenance product (spatial-first, long sessions, possibly separate app/repo later).

**Keep `npm run preview`** — canonical **headless** edit-on-disk → bake → HTML loop for compiler and host stress (per quick-preview proposal). Playground does not replace it.

```text
systems/* packs (.pdl)          veracity corpus
        ↓
PDL Playground (React shell)    edit + navigate + params
        ↓
Rust pdl-core (CLI now; WASM later)
        ↓
bake JSON  →  HTML host (iframe)   fidelity proof
```

**Hard rule:** Playground never owns a parallel display model. Edits resolve to `.pdl` and/or explicit bake param overrides; preview is always Rust bake → existing HTML renderer.

---

## 3. Goals

| Goal | Meaning |
|------|---------|
| **Demonstrate the language** | Packs show depth: tokens, components, composition, variants, rules, emits/interaction as available |
| **Tight edit loop** | Change PDL (or params) → debounced rebake → HTML or clear error |
| **Rust is the compiler** | Demo path uses `pdl-core` / `pdl-cli` (TS bake only for A/B if needed, never as the “real” story) |
| **HTML is the v1 host** | React is the **studio shell**, not a second frame renderer |
| **Monorepo until Studio** | Playground lives under `pdl`; extract Studio only when it earns its own release train |
| **Honest scope** | Good for demos and language stress — not the system of record for maintaining a production DS |

### Non-goals (Playground v1)

- Full Figma (vectors, multiplayer, unconstrained auto-layout).
- Long-term design-system governance (lint packs, ownership workflows, publish pipelines) — **Studio**.
- React/RN **host** that maps bake frames → React elements (future optional host; not required for Playground).
- Replacing Cursor/VS Code for daily eng editing of the compiler itself.
- Shipping a native desktop shell as v1 (Tauri/Electron optional later as a wrapper).

---

## 4. Product surfaces

### 4.1 Layout (v1)

```text
┌────────────┬──────────────────────────┬─────────────────────┐
│ Pack       │  PDL editor              │  Preview (HTML)     │
│ Component  │  syntax highlight        │  iframe / doc       │
│ Fixtures   │  bake/parse errors       │  Rust · bake → HTML │
│ Params     │                          │                     │
└────────────┴──────────────────────────┴─────────────────────┘
```

Always show **source + preview**. Bake JSON optional behind a toggle (eng).

### 4.2 Must-have

1. **Pack switcher** — load entries under `test-fixtures/pdl/systems/*` (and existing molecules while packs grow).
2. **Component + fixture picker** — defaults and named `fixtures` examples.
3. **PDL editor** — highlight (reuse TextMate grammar / CodeMirror), multi-file tabs or tree for the pack.
4. **Preview** — shared `bake-pipeline` → HTML; debounce; error panel (code, path, line, message).
5. **Rust badge** — UI copy states compiler = Rust.

### 4.3 Should-have (soon after)

6. **Param controls** — knobs that drive `bakeComponent` overrides and/or rewrite source kwargs; SoT remains PDL.
7. **Pack-aware completions** — keywords + tokens / components / typeStyles / variant cases from the **loaded** design (not global list only).
8. **Composition demos** — multi-instance screens (sibling buttons/fields) called out so veracity includes scoping/fidelity.

### 4.4 Later (explicitly deferred)

| Feature | Why later |
|---------|-----------|
| Spatial drag-drop compose | Phase 2; must still emit/edit PDL |
| WASM in-browser bake | “No server” demo; same `pdl-core` |
| Bake JSON inspector | Eng toggle |
| Second host tab (SwiftUI sketch) | After HTML path is boring |
| Live emit / interaction runtime | Needs B7 host dispatch |
| Full LSP | After packs + loop prove value |

---

## 5. Veracity corpus (`systems/*`)

Playground content is **packs**, not empty editors.

| Pack pattern | Intent |
|--------------|--------|
| `systems/<name>-lite/` | Incomplete-on-purpose ports (Material, Airbnb, Apple, …) |
| `foundation.pdl` + `c_*.pdl` + `design.pdl` | Same layout as DS→PDL skill |
| README coverage matrix | Ported / deferred / blocked on language |
| ≥1 multi-instance composition demo | Semantic proof (labels, nesting) |

Authoring aid: `.cursor/skills/pdl-from-design-system/`.  
CI: bake packs + semantic instance-scoping tests where demos mount the same component twice.

---

## 6. Architecture

### 6.1 Placement (monorepo)

```text
pdl/
  playground/          # PDL Playground app (evolve existing folder)
  scripts/lib/bake-pipeline.mjs
  crates/pdl-core/     # portable compiler
  test-fixtures/pdl/systems/
  editors/vscode-pdl/  # highlight grammar (IDE); Playground may share scopes
```

**Fence**

| Surface | Job |
|---------|-----|
| **Playground** | Demo + iterative language testing in-browser |
| **`npm run preview`** | Disk-watch stress; Cursor/VS Code as editor |
| **PDL Studio (future)** | Full authoring; may move to `apps/studio` or another repo |

Playground depends on **stable contracts** (CLI bake flags, bake JSON schema, HTML render entrypoints) — not ad hoc `src/` internals — so Studio extraction stays mechanical.

### 6.2 Compile path

| Phase | How React reaches Rust |
|-------|-------------------------|
| **v1** | Local process: existing bake pipeline / `pdl-cli` (Node server next to Vite, or reuse playground-server) |
| **v1.5** | Optional `pdl-core` → **WASM** for shareable / no-CLI demos |
| **Later** | C ABI / native modules for RN or native hosts (per portable core proposal) |

React Native note: **reuse `pdl-core`**, not the web Playground UI. A React **host** (bake → React/RN views) is a separate Track C deliverable, not Playground v1.

### 6.3 Host path

- **v1 host:** existing HTML renderer over bake JSON (iframe).
- **Not v1:** rewrite frames as React components inside the preview pane.

---

## 7. Relationship to other proposals

| Doc | Relationship |
|-----|----------------|
| **Quick preview** | Remains eng harness; Playground is the **demo shell**. Amend §4: playground is no longer “freeze only” — it becomes this product under a hard fence vs Studio. |
| **Portable core** | Playground is a consumer of Rust bake; WASM/C ABI are packaging steps, not a new language. |
| **Slots / protocols / fixtures** | Packs and Playground fixture picker exercise these features. |
| **Manifesto** | Open SoT, working artifacts, compose — packs + visible PDL + bake preview. |

---

## 8. Phased delivery

### Phase P0 — Fence & skeleton

- Rename/position existing `playground/` as **PDL Playground** in README.
- Document vs `preview` vs future Studio.
- Single pack or molecules entry + component picker + editor + HTML preview on Rust bake.

### Phase P1 — Veracity + controls

- [x] `systems/airbnb-lite` flagship pack
- [x] Fixtures + param override knobs (bake overrides)
- [x] Pack-aware completions (thin)
- [x] Error UX polish (monospace multi-line)

### Phase P2 — Portable demo

- [x] WASM bake path (optional flag).
- [x] Optional spatial compose that **writes PDL**.
- [x] Coverage matrices + CI bake of packs.

### Phase S — Studio (out of scope here)

- Authoring-first UX, governance, possibly native shell / separate repo.
- May absorb Playground patterns; must not block P0–P2.

---

## 9. Done when (Playground v1)

- [x] README describes Playground vs preview vs Studio in one short section. *(P0)*
- [x] App loads a pack, selects a component/fixture, edits PDL, shows HTML from **Rust** bake (or a clear error). *(P0 skeleton)*
- [x] At least one multi-instance composition demo is reachable from the UI. *(MoleculeButtonRowDemo default)*
- [x] No React frame-host rewrite; no claim that Playground is for long-term DS maintenance.
- [x] `npm run preview` still documented as the disk-watch stress path.
- [x] Fixtures chips + param knobs UX polish *(P1)*
- [x] `systems/*-lite` veracity packs *(P1 — Airbnb-lite)*
- [x] Optional WASM bake + compose → PDL + CI pack bake *(P2)*

---

## 10. Open questions (for review)

1. **Evolve `playground/` in place** vs new `apps/playground` directory?
2. **Flagship first pack** — Airbnb-lite (fits current molecule palette) vs Material-lite?
3. **WASM in P1 or P2** — required for external demos, or CLI-only until packs exist?
4. **Param knobs** — bake overrides only vs round-trip rewrite of source (harder, better teaching)?

---

## 11. Summary

**PDL Playground** is a monorepo React app for **demonstrating and stress-testing** the language: design-system packs in, visible PDL editing, Rust bake, HTML fidelity out. It is **not** PDL Studio and **not** a replacement for `npm run preview`. Keep it beside the compiler until Studio deserves its own product boundary; keep HTML as the v1 host and Rust as the only real compiler on the demo path.
