# Proposal: PDL Studio (authoring product)

**Status:** proposed (2026-08-25)  
**Related:** [`PROPOSAL_PDL_PLAYGROUND.md`](./PROPOSAL_PDL_PLAYGROUND.md), [`PLAYGROUND_OVERVIEW.md`](./PLAYGROUND_OVERVIEW.md), [`PROPOSAL_HOST_ENVIRONMENT.md`](./PROPOSAL_HOST_ENVIRONMENT.md), [`PROPOSAL_ROUTING_PAGES_SCREENS.md`](./PROPOSAL_ROUTING_PAGES_SCREENS.md), [`PROPOSAL_TYPED_SAMPLES.md`](./PROPOSAL_TYPED_SAMPLES.md), [`PROPOSAL_PORTABLE_CORE.md`](./PROPOSAL_PORTABLE_CORE.md)  
**Placement:** new app shell (`apps/studio/` or extract later); **not** a Playground rewrite  
**Non-goals (v1):** Figma parity, spatial-only authoring, multiplayer, governance pipelines, native codegen as primary SoT

---

## 1. Problem

People want to **maintain real design systems in PDL**, not only demo packs. Playground already proves the fidelity loop (Rust/WASM bake → HTML), but it is the wrong product for that job:

| Need | Playground today | Gap |
|------|------------------|-----|
| **Persistence** | `localStorage` drafts; flush only under `test-fixtures/` | Real projects on disk, save, reopen |
| **Structure** | File tabs + pack switcher | Role-aware navigation as packs grow |
| **Authoring** | Text + teaching inserts | Guided surfaces that teach without hiding `.pdl` |
| **Review** | Preview + rule banners | Stakeholder-ready worlds, export, diagnostics |
| **Export** | CLI only | In-app bake / HTML / catalogue download |

PDL **gets complicated quickly**. A pack can mix tokens, themes, catalogs, hosts, components, pages, screens, Presenters, fixtures, samples, usage, and rules — across many files. Authors fail less from missing features than from **unclear mental models** and **too many ways to change what they see**.

Studio’s job is not “more panels.” It is **progressive disclosure around named concepts** the language already has.

---

## 2. Decision

**Ship PDL Studio** as a **project-oriented authoring app** that reuses Playground’s **render stack** and **stable IR contracts**, with a new shell designed for long sessions.

```text
Project (.pdl on disk)
  → Studio shell (navigator · world · preview · source)
  → pdl-wasm / pdl-cli  (same compiler as Playground)
  → bake JSON
  → renderHtml + bakeReconcile  (same HTML host)
```

**Hard rules (inherited from Playground):**

1. **No parallel display model.** Preview always comes from bake IR → HTML host.
2. **SoT is `.pdl`.** Structured UI writes source (or explicit bake param overrides for ephemeral preview), never a second design graph.
3. **Depend on contracts**, not Playground `main.js`: bake schema, WASM APIs, `renderHtml` / reconcile, catalogue enrich.
4. **Keep Playground** as the public language lab. Do not merge products.

---

## 3. Goals

| Goal | Meaning |
|------|---------|
| **Project lifecycle** | Open folder, edit, save, reopen; git-friendly on disk |
| **Demystify PDL** | UI names the hard concepts (world, sample bank, prototype root, theme vs catalog) |
| **Calm chrome** | One primary job per mode; bury eng bake/engine controls |
| **Structure before spatial** | Role navigator + companion dock before drag-drop canvas |
| **Review + export** | Fixture worlds, diagnostics, download bake/HTML/catalogue |
| **Reuse fidelity** | Same Rust bake + HTML host that Playground already trusts |

### Non-goals (Studio v1)

- Figma-like freeform vectors / multiplayer / unconstrained auto-layout.
- Governance (ownership workflows, lint-pack publish pipelines) — Phase S2+.
- Replacing VS Code/Cursor for compiler eng work.
- SwiftUI/Compose codegen as the live SoT (optional export later).
- Cloud sync / accounts (local projects first).

---

## 4. Why PDL feels hard (product implications)

Ranked cognitive load — Studio must address these **by name**, not bury them in Advanced:

| Rank | Confusion | Studio answer |
|------|-----------|---------------|
| 1 | **Fixtures vs samples vs knobs vs live clicks** — four ways to change “what you see” | Single **World** panel; samples linked as “data used by this world” |
| 2 | **Host inbound / emit / Host env** event triad | Interaction legend on selected component |
| 3 | **File tab = canvas** (import expansion blast radius) | Preview **symbol** (component/page/screen), not “whatever file is open” |
| 4 | **component / page / screen / Presenter** roles | Role-filtered navigator + Prototype mode |
| 5 | **theme vs catalog vs host** | Theme modes in chrome; catalogs under Environment (never theme list) |
| 6 | Multi-file packs; companions far from components | **Companion dock** reunites fixtures/usage/rules with the symbol |
| 7 | children / ForEach / Map·Repeat / samples | Guided inserts + Samples table editor |
| 8 | Lab chrome (WASM vs CLI, scratch, JSON overrides) | Not in author chrome |

**Six mental models Studio should teach explicitly** (status bar, empty states, onboarding):

1. A **pack** is a design-system repo; imports **merge** into one design.
2. **Source is SoT**; preview is a bake snapshot; clicks assign params and rebake.
3. Layers: **tokens → components → companions → samples → screens**.
4. A **fixture** is a **world** (scenario param bag); a **sample** is a reusable **data bank**.
5. A **screen** is a prototype root; a **page** is a destination; **Presenter** is the hole.
6. **Themes** are modes people pick; **catalogs** are what the device injects.

---

## 5. Product modes

One shell, three modes. Mode switch is the primary progressive-disclosure control — not a dozen permanent panels.

```text
[ Design ]  [ Prototype ]  [ Review ]
```

| Mode | Job | Default selection | Primary panels |
|------|-----|-------------------|----------------|
| **Design** | Author DS atoms & tokens | Component or foundation symbol | Navigator · Source/Inspector · Preview · World |
| **Prototype** | Run shells & navigation | Default `screen` if present | Navigator (pages/screens) · Preview (device) · World · Stack |
| **Review** | Stakeholder walk + export | Same as Prototype, chrome quieter | Preview · World chips · Diagnostics · Export |

Switching modes never loses unsaved work. It changes **which roles are promoted** and which chrome appears.

---

## 6. Ideal layout

### 6.1 Design mode (default)

```text
┌─ Project ──────────────────────────────────────────────────────────────┐
│  Pack name · Save · Export ▾                              [Design|Proto|Review]
├────────────┬───────────────────────────────┬───────────────────────────┤
│ NAVIGATOR  │  WORK SURFACE                 │  PREVIEW                  │
│            │                               │                           │
│ Foundations│  Symbol header                │  Device / canvas          │
│  Tokens    │  AbnButton · c_button.pdl     │  ┌─────────────────────┐  │
│  Type      │                               │  │                     │  │
│  Themes    │  [ Source | Structure ]       │  │   live HTML host    │  │
│            │                               │  │                     │  │
│ Components │  CodeMirror  or  param/frame  │  └─────────────────────┘  │
│  Button    │  inspector that writes PDL    │  Fixture · Reset · Theme  │
│  Field     │                               │  Usage · Rules banners    │
│            │                               │                           │
│ Samples *  │───────────────────────────────│                           │
│ Companions*│  WORLD                        │                           │
│            │  Fixture worlds for selection │                           │
│            │  Samples used → link          │                           │
│            │  Param knobs (ephemeral)      │                           │
└────────────┴───────────────────────────────┴───────────────────────────┘
* Samples / Companions sections collapse when empty
```

**First viewport discipline:** brand/product name is the project title; one clear mode; no eng status soup. Status (bake ms, live apply) lives in a quiet footer.

### 6.2 Prototype mode

```text
┌─ NAV (Pages · Screens) ─┬─ PREVIEW (device frame) ─┬─ WORLD / STACK ─┐
│ Screens                  │  IosPhone                 │ Fixture world   │
│  ● IosPhone (root)       │  [Presenter content]      │ Presenter stack │
│ Pages                    │  tab bar / chrome         │ Reset           │
│  Home · Episode · …      │                           │ Host size       │
└──────────────────────────┴───────────────────────────┴─────────────────┘
```

Source editor slides to a drawer (still one click away). Interaction focuses on **fixture-pinned stacks** and live Presenter verbs already in the HTML host.

### 6.3 Review mode

Quieter chrome: large preview, world chips, rule/usage callouts, **Export** primary. Source hidden unless Diagnostics jumps to a line.

---

## 7. Key surfaces (demystify complexity)

### 7.1 Role-filtered navigator

Catalogue-driven tree, not only file names:

| Section | Shows | Empty state |
|---------|-------|-------------|
| **Foundations** | primitives, semantics, typeStyles, enums/variants, themes | “Add foundation…” template |
| **Components** | `component` roles | Insert Button / Field ladder |
| **Pages** | `page` roles | Hidden until pack has pages |
| **Screens** | `screen` roles (prototype roots) | Hidden until present |
| **Samples** | typed banks | Link to Typed Samples docs |
| **Files** | raw tree (escape hatch) | Always available under a disclosure |

Selecting a **symbol** sets the preview root. Opening its file is secondary (“Reveal in source”). This fixes Playground’s “`design.pdl` gallery blast” confusion.

### 7.2 World panel (fixtures + samples together)

Rename UX copy from “Fixture” to **World** in Studio (language keyword stays `fixtures`).

For the selected symbol:

1. List authored worlds (`example "Empty" { … }`).
2. Show **Samples used** chips when a world references `Bank.entry.field` (e.g. playlist `Tracks.kite.tracks`).
3. Clicking a chip opens the Samples table focused on that entry.
4. Param knobs remain **ephemeral preview overrides** — clearly labeled “Preview only · not saved to world” unless the author clicks **Save as world**.

This collapses confusion #1 into one panel.

### 7.3 Samples as a data table

Authors should not need bank syntax to start:

| Entry | Field | Edit UI | Writes |
|-------|-------|---------|--------|
| `library` | `tracks` | Row list / instance editor | `samples Tracks { … }` PDL |

Advanced users can flip to source. Studio never stores samples only in JSON outside `.pdl`.

### 7.4 Companion dock

When a component is selected, show **Fixtures / Usage / Rules / Extend** even if authored in `companions.pdl`. Dock edits jump to the companion declaration (or offer “Detach companions file”).

AirBnB-lite and ios26-lite already use this file split; Studio should make it feel local.

### 7.5 Theme vs Environment

| Control | Lists | Never lists |
|---------|-------|-------------|
| **Theme** (chrome) | User `theme` modes | catalogs |
| **Environment** (disclosure) | Host profile params (`WindowSize`, …); read-only catalogs applied by `mount` | themes as “modes” |

Matches `PROPOSAL_HOST_ENVIRONMENT.md` and `language-objects.json` picker policy.

### 7.6 Interaction legend

When the selection conforms to host or API protocols, show a small legend:

| Kind | Example | Meaning |
|------|---------|---------|
| Host event | `pressEnd` | Runtime → this component |
| Emit | `emits <ShowEpisode>` | Child → parent / ancestors |
| Nav | Presenter verbs | Screen handles climb |
| Env | `<Host>` | Pack environment bag |

Copy can cite the glossary one-liners from the public site — not eng protocol IDs.

### 7.7 Structure view (optional inspector)

Beside Source: a read-only **frame tree** of the baked selection (lets, children, `if` branches) with click-to-source. Not a second editor — a map for deep components (ios26 screens, playlist composer).

v1 can ship Source-only and add Structure once reconcile/instance-resolve paint is stable.

### 7.8 Diagnostics

| Surface | Behavior |
|---------|----------|
| Inline gutter | `PDL-E*` on ranges |
| Problems panel | Code + gloss from `shared/diagnostics.json` + language-objects |
| Preview banners | Keep usage / rules (must/should) from HTML host |
| Stale-engine | Detect WASM/CLI skew; one-line “Rebuild toolchain” — never ask authors to rename labels |

---

## 8. Persistence & projects

### 8.1 Project model

A Studio **project** is a folder with an entry `.pdl` (usually `design.pdl`) and imports.

| Action | Behavior |
|--------|----------|
| **Open folder** | Arbitrary path (not fixture-scoped) |
| **Save / Save all** | Write dirty buffers; optimistic concurrency optional |
| **Autosave** | Debounced to disk (configurable); not `localStorage`-only |
| **Recent projects** | Paths + last symbol / mode |
| **New project** | Template ladder: Hello → Tokens+Component → Pack skeleton (foundation / `c_*` / design) |

Git remains version history for MVP. No cloud DB required.

### 8.2 Implementation sketch

Local **Node project server** (generalize `playground/server/playground-server.mjs`):

- `POST /api/open-project` — any root
- `POST /api/read` / `write` — project-relative paths
- Existing enrich / render-from-bake routes
- Optional later: Tauri/Electron wrapper for a desktop feel

Browser **File System Access API** is a stretch path; prefer server FS for multi-file packs.

---

## 9. Export (MVP)

Wire existing CLI into an **Export** menu — no new IR:

| Action | Backend |
|--------|---------|
| Bake JSON (system) | `bakeSystem` |
| HTML (component) | `renderHtml` |
| HTML (system gallery) | `renderHtml --system` |
| Catalogue JSON / HTML | `catalogue` / `renderCatalogueHtml` |
| Copy preview link | Local URL to Review mode + world query (stretch) |

Codegen exporters stay out of MVP (portable-core Phase 6).

---

## 10. Authoring aids (friendly ≠ hiding PDL)

Keep Playground’s teaching tools; reframe them as a **checklist**, not a flat select:

1. Button (layout + text)
2. Host handlers (`pressEnd`)
3. Field + EditableText
4. FilterBar + ForEach Pattern A
5. Fixtures (worlds)
6. Usage / rules
7. Extend companions
8. Page / screen / Presenter (Prototype mode)

**Add property** stays kind-aware for frames. Studio adds **Add param**, **Add world**, **Add sample entry** that emit correct PDL.

Spatial drag-drop compose is **Phase S2** and must still write `.pdl` (Playground already rejected Compose-as-SoT).

---

## 11. Architecture

```text
apps/studio/                         # new product shell
  src/shell/                         # modes, project chrome, export
  src/navigator/                     # role tree from catalogue
  src/world/                         # fixtures + samples link
  src/editor/                        # CodeMirror modules (from playground/)
  src/preview/                       # iframe + reconcile apply
  server/                            # project FS + bake APIs

Shared (do not fork):
  crates/pdl-core, pdl-wasm, pdl-cli
  src/renderHtml.ts, bakeReconcile.ts, applyMotion.ts, …
  scripts/lib/bake-pipeline.mjs
  shared/schema/*, shared/language-objects.json, shared/diagnostics.json
```

**Reuse heavily:** WASM bake, HTML host, incremental apply, completions, templates, file→symbol helpers, host chrome, variant grid, phone `/device` patterns.

**Do not reuse as-is:** fixture-only write roots, pack catalog hard-coded to `test-fixtures`, bake-engine switcher in author chrome, scratch-vs-disk product split as the primary model.

Playground may later import shared `packages/studio-preview/` extractions; extraction is a refactor when Studio lands, not a prerequisite essay.

---

## 12. Phased delivery

### Phase S0 — Boundaries

- Document contracts (this proposal).
- Optionally extract shared preview/editor modules behind a clean import path.
- Playground remains green.

### Phase S1 — MVP Studio (“Project Playground”)

Must ship:

1. Open/save arbitrary project folder  
2. Role navigator + symbol preview (not file-canvas-only)  
3. Source editor + World panel (fixtures + samples link)  
4. Theme picker + host Environment disclosure  
5. Same interactive HTML preview (WASM + reconcile)  
6. Diagnostics list with goto  
7. Export bake JSON + HTML  

Success metric: an author can maintain **airbnb-lite** and **playlist-composer-lite** as real projects without touching Playground lab chrome.

### Phase S2 — Structure & prototypes

- Companion dock  
- Samples table editor  
- Prototype mode (screens / pages / Presenter stack UI)  
- Structure (bake tree) inspector  
- Review mode + quieter export walkthrough  
- New-project template ladder  

### Phase S3 — Product depth

- Desktop shell (Tauri)  
- Spatial compose that emits PDL  
- Governance / lint packs / publish  
- Optional cloud projects  
- Codegen export tabs  

---

## 13. Relationship to other surfaces

| Surface | Remains | Studio relationship |
|---------|---------|---------------------|
| **Playground** | Language demo / CI veracity | Separate; may share preview packages |
| **`npm run preview`** | Eng disk-watch stress | Untouched |
| **VS Code TextMate** | Highlighting | Studio uses CodeMirror; LSP later |
| **Public site** | Human language spec | Studio deep-links glossary / diagnostics |
| **CLI** | Headless bake/render | Studio Export invokes same commands |

---

## 14. Open questions

1. **Monorepo `apps/studio` vs separate repo** — prefer monorepo until release train diverges (same as Playground proposal).  
2. **Default preview root** — prefer pack’s sole/ default `screen`, else documented default component, else first component in entry.  
3. **“Save as world” from knobs** — write `fixtures` companion vs inline; need safe merge UX.  
4. **Multi-root galleries** — Design mode shows one primary symbol; “Gallery of file” is an explicit toggle, not the default.  
5. **Brand / visual system for Studio chrome** — distinct from Playground lab; follow product design rules when UI is built (expressive type, atmospheric background, not dashboard soup).

---

## 15. Summary

PDL Studio MVP is **not** a smaller Figma. It is a **calm project app** that:

- reuses the **Playground render engine** (WASM bake → bake JSON → HTML),
- adds **real persistence** and **export**,
- and spends its UX budget on **naming and separating** the concepts that make PDL hard — worlds, samples, roles, themes, environment — instead of exposing every lab switch at once.
