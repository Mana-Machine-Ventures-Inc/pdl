# Implementation plan — accepted proposals

**Accepted:** `docs/PROPOSAL_PORTABLE_CORE.md`, `docs/PROPOSAL_SLOTS_PROTOCOLS_FIXTURES.md` (2026-08-05)  
**Shipped:** `docs/PROPOSAL_PDL_PLAYGROUND.md` / `docs/PLAYGROUND_OVERVIEW.md` — Playground demo shell (P0–P5) vs `preview` stress harness vs future Studio  
**Normative until shipped:** `docs/full-spec.md` (`1.0.0-beta`) remains binding for the **current** language. Proposal features land via **spec patches + goldens** per slice.

---

## Principles

1. **TypeScript is the oracle** until Rust bake/catalogue matches goldens.  
2. **New language features prefer Rust** once load→bake parity exists (avoid double implementation).  
3. **Vertical slices** — one feature train at a time, each with fixtures + goldens + `full-spec` patch.  
4. **Bake JSON** is the stability boundary for HTML / future SwiftUI hosts.  
5. Proposal text is **accepted intent**, not grammar law, until merged into `full-spec.md`.

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
| Normative grammar | §4a–§4e in `full-spec.md`; Rust B4b/B5 | **B6** chrome; TS oracle lag; B7 host dispatch |
| HTML host (C1) | Static draw of bake IR; `npm run preview` / playground | Live interactions; emit dispatch (B7); motion runtime |
| Native / prototype | — | C2 SwiftUI; C3 routes/stack; A5 C ABI |

**Bake JSON** remains the stability boundary. HTML is a static C1 host: it draws whatever bake already flattened. `ForEach` / emit capture become visible in HTML only after Rust expands them at bake (Phase 2 after §4e review). Host prelude stubs: **`full-spec` §4a′**.

---

## Track C — Hosts

| Step | Deliverable |
|------|-------------|
| **C1** | Keep HTML emitter on bake JSON |
| **C1a** | Live stress harness: disk watch → Rust bake → HTML (`npm run preview`); shared `scripts/lib/bake-pipeline.mjs` |
| **C1b** | **PDL Playground** — file canvas + interactive HTML + variant grid (P3–P5); see `PROPOSAL_PDL_PLAYGROUND.md` |
| **C2** | SwiftUI mapper spike on bake IR |
| **C3** | Prototype env (routes / stack / data) after B4–B5 |

**Fence:** `preview` = eng disk-watch loop; **Playground** = language demo / iterative testing; **Studio** (future) = full authoring — not Track C1b.

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

None from the A0 question set. Further grammar nits can be decided when writing `full-spec` patches.

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
- [x] First `full-spec` patch with B1 (§4a protocols; Rust-first)  
- [x] B2 `[T]` / instance literals / children expand (§4b; Rust-first)  
- [x] B3 injection packs (`bakePack` / `validatePack`)  
- [x] B4 emits + host inbound `[self.]channel = { … }` (declare/fire; host dispatch B7)  
- [x] C1a live preview (`npm run preview` + playground Rust bake path)  
- [x] B5 language formalized in `full-spec` §4e; Rust parse + ForEach bake expand shipped (B4b/B5)  
- [ ] Align published `schemaVersion` string to plain **`1.0.0`** when touching normative version prose (drop `-beta` framing; still unreleased)

Progress and intentional gaps also tracked in **`docs/SPEC_GAPS.md`**.
