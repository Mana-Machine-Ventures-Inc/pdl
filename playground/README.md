# PDL Playground

**Phase P3–P5** demo lab: **file-selected canvas**, teaching **Add property**, **hover/press** host, **variant grid/pick**.

Not PDL Studio. Not `npm run preview` (disk-watch eng harness).

| Surface | Role |
|---------|------|
| **PDL Playground** (`npm run playground`) | Pack + file tabs + editor + HTML preview |
| **`npm run preview`** | Edit on disk; watch → bake → livereload |
| **PDL Studio** (future) | Long-term DS maintenance product |

Proposal: [`docs/PROPOSAL_PDL_PLAYGROUND.md`](../docs/PROPOSAL_PDL_PLAYGROUND.md).  
Overview: [`docs/PLAYGROUND_OVERVIEW.md`](../docs/PLAYGROUND_OVERVIEW.md).

## Run

```bash
npm install && npm run build
cargo build -p pdl-cli
npm run build:wasm
cd playground && npm install && npm run build
npm run playground
```

**Default bake engine is Rust WASM** (in-browser, ~ms). Prefer it for interactive preview; **Rust CLI** spawns `pdl` each tick and feels much slower. Rebuild WASM after language changes: `npm run build:wasm`.

## Phone / same-network stage

The playground binds on `0.0.0.0` so a phone on the same Wi-Fi can open a device stage (not the three-pane editor).

1. `npm run playground`
2. On the Mac, click **Open on phone** (or copy the `Phone` URL printed in the terminal)
3. On the iPhone, open that URL in Safari — same Wi-Fi, not a guest network. Allow Node in the macOS firewall if prompted.

`/device` shows one component, centered, with pack + component dropdowns. If the component (or a nested instance) registers appear/dismiss motion, a **Replay motion** button sits at the bottom of the stage. Bake, HTML, and IR reconcile all run in Safari. The Mac is only for pack fetch, catalogue enrich (once per pack), and optional Follow. A tap patches the live iframe (`· live apply`); pack/component changes remount. A local interaction that changes parent state (title rename, chip select) leaves Follow so the Mac idle stage cannot snap the phone back.

Hover-only handlers do not run on iPhone — author `pressStart` / `pressEnd` for touch. Lock the server to loopback with `PLAYGROUND_HOST=127.0.0.1` if you do not want LAN access.

**Device stages:**

1. **WASM bake on the phone** — skip the Rust CLI spawn on each tap.
2. **On-device HTML + IR reconcile** (now) — bundle `renderHtml` / reconcile; no LAN HTML hop or `srcdoc` remount on select.
3. **Press chrome without a child rebake** — keep instance-resolve cache warmer; treat hover as desktop-only.
4. **Offline / no Mac** — cache WASM + packs (PWA) so a tap works with the laptop off.

## Session drafts

Edits autosave in the browser (`localStorage`) so a reload restores files, entry, pack, and param knobs. Use **Reload from disk** to discard the draft and reopen the selected pack. Switching packs also reloads from disk.

**Scratch project** is a separate browser workspace (Project → Scratch, or Workspace → Scratch). Dropping a folder/files **replaces** that scratch — it never merges into Airbnb or other disk packs. Toggling back to a disk pack keeps a scratch snapshot so you can return without losing it; **Reset scratch** starts over with `lab.pdl`.

## WASM bake (disk workspace)

WASM only sees an in-memory map, so in disk mode the Playground calls **`POST /api/disk-sources`** to load the import closure (then overlays editor edits) before baking — matching CLI disk semantics.

## Canvas model (P3)

- The **active file tab** fills the preview.
- Components declared in that file are baked (gallery).
- Import-only files (e.g. `design.pdl`) expand imports and show those components.
- Token-only files show a token list preview.
- **Add property** inserts layout/text/icon snippets at the cursor (kind-aware).

## Interaction (P4)

- Author host inbound in the kind body: `[self.]pressEnd = { … }` (`self.` optional). Compilers lift these into catalogue `interactions[]` (name `default`). The `interaction` keyword is **removed**.
- HTML host applies those handlers on pointer events (mirrors `applyInteractionEvent`), then swaps pre-baked `interactionState` trees when available.
- Host posts `pdl-interaction` with `{ event, params, emits, previewHandled }` so Playground syncs knobs from real handler results.
- Airbnb-lite opens on **`AbnPointerLab`** for a full pointer-cycle demo.
- Protocols opens on **`LibrarySubnav`**: nested FilterChip host handlers (hover/press) + `emit select` → parent `ForEach` capture rebinds `currentFilter` → rebake (Pattern A). Enrichment merges Rust catalogue `emitCaptures` (TS still skims ForEach).
- Insert templates cover Button host handlers, EditableText SearchField, a FilterBar (emits + ForEach), and usage / rules scenes (usage note, two primaries, empty card, unlabeled field).
- Pack **Usage & rules** (`test-fixtures/pdl/lab/usage-rules/`) is a gallery of those cases — red `.must` / orange `.should` banners on the HTML preview.
- Pack **Motion** (`test-fixtures/pdl/lab/motion/`) plays appear/dismiss overlays (Replay motion), stagger, and implicit `animate =` on hover. Bake stays at rest pose.

## Variants (P5)

- **Single** — defaults / param knobs / fixtures.
- **Grid** — cartesian product of variant params (capped at 16).
- **Pick** — knobs for variant-typed params only.

## Fixtures (§11) vs samples (§11a)

- **Fixtures** are per-component scenario param bags. Each preview section with declared `fixtures` shows a **Fixture** select under the title (above param knobs). Left-rail chips mirror the **primary** component only — not a global Preview-panel dropdown.
- **Samples** (`samples Tracks { … }`) are design-global typed banks. Reference them in `.pdl` as `Tracks.focus.tracks`; bake mounts them. The Playground does **not** keep a parallel JS catalog (see playlist-composer-lite).
- Lab: `test-fixtures/pdl/lab/samples-tracks.pdl`. Lock: `shared/language-objects.json` `samples` / `companions`.
