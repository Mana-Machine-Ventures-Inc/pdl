# Implementation plan — accepted proposals

**Accepted:** `docs/PROPOSAL_PORTABLE_CORE.md`, `docs/PROPOSAL_SLOTS_PROTOCOLS_FIXTURES.md` (2026-08-05); `docs/PROPOSAL_MOTION_PLAY.md` / `docs/PROPOSAL_FRAME_BLUR.md` (2026-08-14)  
**Shipped:** `docs/PROPOSAL_PDL_PLAYGROUND.md` / `docs/PLAYGROUND_OVERVIEW.md` — Playground demo shell (P0–P5) vs `preview` stress harness vs future Studio  
**Binding:** `shared/*.json` + `grammar/pdl.ebnf` + fixtures (`1.0.0-beta`). Proposal features land via **lock-file updates + goldens** per slice.

---

## Principles

1. **TypeScript is the oracle** until Rust bake/catalogue matches goldens.  
2. **New language features prefer Rust** once load→bake parity exists (avoid double implementation).  
3. **Vertical slices** — one feature train at a time, each with fixtures + goldens + lock-file update.  
4. **Bake JSON** is the stability boundary for HTML / future SwiftUI hosts.  
5. Proposal text is **accepted intent**, not grammar law, until locked in `shared/*.json` / `grammar/pdl.ebnf`.

---

## Track A — Portable core (Rust)

| Step | Deliverable | Done when |
|------|-------------|-----------|
| **A0** | `crates/pdl-core` skeleton + workspace | `cargo test` green |
| **A1** | Lexer + parser + AST for *current* PDL | ✅ Parse non-error `test-fixtures/pdl/**/*.pdl` + golden entries |
| **A2** | load / merge / validate / **bake** | ✅ `bakeSystem` byte-parity vs TS goldens (`crates/pdl-core/tests/golden/`) |
| **A3** | Catalogue / graph subset needed by hosts | ✅ `graphSystem` + `graphComponent` byte-parity vs TS goldens (`crates/pdl-core/tests/golden/`) |
| **A4** | `pdl` Rust CLI (`bake` first) | ✅ `crates/pdl-cli`; dual-run script + CI workflow |
| **A5** | C ABI (later) | Swift/Kotlin can `bake` |

Crate path: **`crates/pdl-core`**.

---

## Track B — Language (slots / protocols / emits)

Implement **after A2** unless a spike is explicitly throwaway.

| Step | Feature | Spec + fixtures |
|------|---------|-----------------|
| **B1** | `protocol` / `component C <P>` / shared params | ✅ Rust + §4a + `protocols/` fixtures + bake/catalogue goldens |
| **B2** | `[T]` params, instance literals, expand in `children` | ✅ Rust + §4b; Modal slots |
| **B3** | Injection pack validate + bake | ✅ `pack.rs` + `bakePack`/`validatePack` + soft-skip + §4c |
| **B4** | `emits` / `emit` + `[self.]channel = { … }` host inbound | ✅ Parse/merge/catalogue + FilterChip; `interaction` keyword removed; host dispatch B7 |
| **B4b** | Language cleanup (locked 2026-08-06) | ✅ Rust: reject `expose`; trailing `} emits { }`; `self` / `self.param`; param==param; E028/E029; catalogue `expose` = all params |
| **B5** | Emit handler assignment + `ForEach` derived binds (Pattern A) | ✅ Rust parse + bake expand; emit capture validated (host dispatch B7); `library_subnav.pdl` parses |
| **B6** | `ForEach` before/between/after | Deferred chrome — grammar sketched under §4e; not first compiler slice |
| **B7** | Host emit dispatch + prototype runtime stub | outside core language |

---

## Language & host coverage

| Layer | Covered now | Not covered yet |
|-------|-------------|-----------------|
| Classic PDL → bake / catalogue (TS + Rust parity) | Tokens, themes, variants, components, `if`, companions | — |
| Rust-first language | **B1–B4** (`protocol`, `[T]`, packs, `emits` / host inbound handlers) | TS oracle port of B1–B4 |
| Normative grammar | `grammar/pdl.ebnf` + language-objects; Rust B4b/B5 | **B6** chrome; TS oracle lag; B7 host dispatch |
| Typed samples | `samples` banks + `Bank.entry.field`; Rust + TS; catalogue `samples`; playlist-composer-lite + `lab/samples-tracks.pdl`; **PDL-E041** | ForEach over sample path; sample RHS in emit-assign; lints for bare `children = list` |
| HTML host (C1) | Static draw of bake IR; interactive host; handler + standing motion overlay (appear/dismiss, play / keys, frame `animate`, `rotate`, clip rack); frame `effect` / `blur =` (filter + backdrop-filter) | Emit dispatch (B7); M4 teaching tokens; E1 `Blur()` alias close; E4 `.glass` |
| Native / prototype | — | C2 SwiftUI; C3 / Track N (`Presenter` stack); A5 C ABI |

**Bake JSON** remains the stability boundary. HTML is a static C1 host: it draws whatever bake already flattened. `ForEach` / emit capture become visible in HTML only after Rust expands them at bake. Host prelude stubs: `test-fixtures/pdl/stdlib/host_protocols.pdl`.

---

## Track C — Hosts

| Step | Deliverable |
|------|-------------|
| **C1** | Keep HTML emitter on bake JSON |
| **C1a** | Live stress harness: disk watch → Rust bake → HTML (`npm run preview`); shared `scripts/lib/bake-pipeline.mjs` |
| **C1b** | **PDL Playground** — file canvas + interactive HTML + variant grid (P3–P5); see `PROPOSAL_PDL_PLAYGROUND.md` |
| **C2** | SwiftUI mapper spike on bake IR |
| **C3** | Prototype env — superseded in-language by Track N (`Presenter`); remaining host blob is data / B7 dispatch |

**Fence:** `preview` = eng disk-watch loop; **Playground** = language demo / iterative testing; **Studio** (future) = full authoring — not Track C1b.

---

## Track H — Host environment

**Proposal:** `docs/PROPOSAL_HOST_ENVIRONMENT.md` (accepted — **H0–H5 shipped**). **Plan:** [`IMPLEMENTATION_PLAN_HOST_ENVIRONMENT.md`](./IMPLEMENTATION_PLAN_HOST_ENVIRONMENT.md).

Unified `host Name(params) [mount]`, `<Host>` inject, opaque facts bag, `theme` vs `catalog`. Bake-time only (no nested measure). Multi-protocol headers (`<Host, PointerInput>`) are H0.

| Step | Deliverable |
|------|-------------|
| **H0** | ✅ Multi-protocol component headers |
| **H1** | ✅ Parse `host` / `catalog` / prelude `Host`; same-shape check |
| **H2** | ✅ Host defaults + `<Host>` inject |
| **H3** | ✅ `mount` + `host["k"] as? T` + `??` + `hostFactsJson` |
| **H4** | ✅ `use catalog` + role metadata |
| **H5** | ✅ Playground `view.*` facts; fixture env pins; host `previewBackground` chrome |

---

## Track N — Pages, screens, Presenter

**Proposal:** `docs/PROPOSAL_ROUTING_PAGES_SCREENS.md` (proposed). **Plan:** [`IMPLEMENTATION_PLAN_ROUTING_PAGES_SCREENS.md`](./IMPLEMENTATION_PLAN_ROUTING_PAGES_SCREENS.md).

`page` / `screen` roles, prelude `Presenter(root:)`, `emits(propagation:)`, bare ancestor capture on the screen. Screen is the parent; it does not `<ShowEpisode>`. Live click-to-push waits on B7.

| Step | Deliverable |
|------|-------------|
| **N0** | `page` / `screen` roles + catalogue + prelude `Page` |
| **N1** | `emits(propagation: .parent \| .ancestors)` |
| **N2** | Bare `channel(…) =` ancestor capture |
| **N3** | `Presenter(root:)` + `replace` + lab |
| **N4** | `push` / `pop` + pinned-stack fixture |
| **N5** | `present(.cover)` / `dismiss` |

---

## Track M — Motion play, keys, frame `animate`

**Proposal:** `docs/PROPOSAL_MOTION_PLAY.md` (accepted — **P** + **M0–M3** shipped; **M4** open).  
**Baseline already shipped:** `Motion` / `Pose` / `Stagger` / `Play` / `Key` on handler and frame `animate =`; HTML WAAPI overlay; Playground clip rack + live pose-param updates.  
**Principle:** Rust-first parse/validate (A2 parity exists). One `motion-literal` / Pose-field slice at a time.

| Step | Deliverable | Done when |
|------|-------------|-----------|
| **P** | `Pose.rotate` (+ `originX` / `originY`) | Grammar + TS/Rust `MOTION_PROP_NAMES` + `snapshotToCss` (`translate` → `rotate` → `scale`); appear tilt in `lab/motion`; unknown field still E005 |
| **M0** | `Play`, `Key`, `.rest`, finite `repeat` | Parse/validate fixtures; E005 on `pose`+`keys`, `.loop`+`repeat`, `repeat` without a path, `at` out of range; no `Cycle` / `.forever` |
| **M1** | Site default `play` + `Motion(token, play:)` | Appear/dismiss visually unchanged; hover+keys lab; token that omits `play` flips on `hoverEnd`; override-spelling golden |
| **M2** | Frame `animate` on bake IR | Bake golden; `if` omits the field; legal on any frame including `self` |
| **M3** | HTML key WAAPI + standing start/stop | Labs: spinner, pulse, sheen child, hover flourish; tests: continuous `rotate: 360` loop, interrupt reverse-from-current, appear-then-standing on shared opacity |
| **M4** | Tokens + teaching | `motion.spin` / `pulse` / `hoverPop` / `shake`; Language objects + Guide line from the proposal |

**Locked (do not re-open in implementation):** `.loop` is forever (`repeat` is finite only); reusable tokens omit `play`; `hoverEnd` reverses from current progress; standing waits for appear `finished`; one standing spec per node (handler `animate` is an event shot).

**Risk slice:** M3 only (WAAPI wrap, appear hold vs `data-pdl-appear-armed`, reverse-from-current with `fill: both`, standing cancel on incremental IR omit).

---

## Golden harness (shared)

1. Generate or check in **bake JSON goldens** for:
   - `test-fixtures/pdl/atoms/design.pdl`
   - `test-fixtures/pdl/molecules/design.pdl`
   - `test-fixtures/pdl/integration/design.pdl`  
   (Exact golden directory layout TBD in A2.)
2. CI: `npm test` (TS) + `cargo test -p pdl-core`.
3. Dual-bake compare job once A2 exists.
4. Error fixtures in `test-fixtures/pdl/errors/` remain the validate/parse oracle.
---

## Decisions (owner)

| ID | Topic | Decision |
|----|--------|----------|
| **Q1** | Single slot vs always array | **A** — both `content: ModalContent` and `slots: [ModalContent]` |
| **Q2** | Bad injection pack items | **A** — soft skip/placeholder **with warning**; continue mounting rest |
| **Q3** | Host inbound handlers | Kind-body `[self.]channel = { … }` → catalogue `interactions[]` name **`default`**; `interaction` keyword **removed** |
| **Q3b** | Same ambient event in two bundles | **A** — **last wins** per event (override); no double `hoverStart` |
| **Q4** | First golden set | **A** — `atoms/design.pdl` + `molecules/design.pdl` + `integration/design.pdl` |
| **Q5** | `schemaVersion` when B1 ships | **C** — pre-release: stay on **`1.0.0`** lineage only (no `1.1` / capability-flag scheme). Not publicly released yet; treat versioning as simple **1.0** for now. |

---

## Decisions still open

None from the A0 question set. Further grammar nits can be decided when updating `grammar/pdl.ebnf` / lock files.

---

## Near-term checklist

- [x] Accept both proposals  
- [x] Scaffold `crates/pdl-core`  
- [x] Record owner answers to Q1–Q5  
- [x] A1 lexer/parser *(parses non-error fixtures + golden entries)*  
- [x] A2 bake goldens + parity *(53 TS bakeSystem goldens, byte match)*  
- [x] A3 catalogue / graph *(53 TS `graphSystem` goldens + 4 `graphComponent` goldens, byte match)*  
- [x] A4 Rust CLI (`crates/pdl-cli` / `pdl`) for bake/graph/catalogue/resolve  
- [x] Dual-run CI job (TS vs Rust JSON, volatiles normalized) — `.github/workflows/ci.yml` + `scripts/dual-run-compare.mjs`  
- [x] B1 protocols locked (Rust-first)  
- [x] B2 `[T]` / instance literals / children expand (Rust-first)  
- [x] B3 injection packs (`bakePack` / `validatePack`)  
- [x] B4 emits + host inbound `[self.]channel = { … }` (declare/fire; host dispatch B7)  
- [x] C1a live preview (`npm run preview` + playground Rust bake path)  
- [x] B5 ForEach locked; Rust parse + bake expand shipped (B4b/B5)  
- [x] Typed samples — Rust + TS; catalogue `samples`; playlist-composer-lite + lab; **PDL-E041**; Playground per-component fixtures  
- [x] Public docs site (`website/`) + generated reference (frame props, diagnostics, keywords, bake/catalogue JSON Schema sketches)  
- [ ] Align published `schemaVersion` string to plain **`1.0.0`** when touching normative version prose (drop `-beta` framing; still unreleased)
- [ ] Track M — **P** + **M0** + **M1** + **M2** + **M3** shipped (keys WAAPI + standing); next **M4** tokens + teaching (`docs/PROPOSAL_MOTION_PLAY.md`)
- [ ] Track E — **E0** + **E2** + E3 lab / `effect.frost` shipped (frame `effect` / `blur =` sugar, HTML filter + backdrop-filter, Pose rest = baked self blur); **E1** `Blur()` alias window still open; leftover E3 is `material.sheet` as fill + `effect`; **E4** `.glass` reserved (`docs/PROPOSAL_FRAME_BLUR.md`)
- [x] Track H — Host environment **accepted** — **H0–H5 shipped** (`docs/IMPLEMENTATION_PLAN_HOST_ENVIRONMENT.md`)
- [ ] Track N — Pages / screens / Presenter **proposed** (`docs/IMPLEMENTATION_PLAN_ROUTING_PAGES_SCREENS.md`)

Progress and intentional gaps also tracked in **`docs/SPEC_GAPS.md`**.
