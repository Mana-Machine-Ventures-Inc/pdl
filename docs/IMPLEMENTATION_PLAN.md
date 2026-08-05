# Implementation plan — accepted proposals

**Accepted:** `docs/PROPOSAL_PORTABLE_CORE.md`, `docs/PROPOSAL_SLOTS_PROTOCOLS_FIXTURES.md` (2026-08-05)  
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
| **A3** | Catalogue / graph subset needed by hosts | Selected goldens match |
| **A4** | `pdl` Rust CLI (`bake` first) | CI dual-run TS vs Rust |
| **A5** | C ABI (later) | Swift/Kotlin can `bake` |

Crate path: **`crates/pdl-core`**.

---

## Track B — Language (slots / protocols / emits)

Implement **after A2** unless a spike is explicitly throwaway.

| Step | Feature | Spec + fixtures |
|------|---------|-----------------|
| **B1** | `protocol` / `component C <P>` / shared params | atoms + molecules demo |
| **B2** | `[T]` params, instance literals, expand in `children` | Modal + slots |
| **B3** | Injection pack validate + bake | JSON packs + CI |
| **B4** | `emits` / `emit` + inline `interaction` | FilterChip-style |
| **B5** | Layout `on` capture + `ForEach` derived binds | LibrarySubnav |
| **B6** | `ForEach` before/between/after | optional chrome |
| **B7** | Host emit dispatch + prototype runtime stub | outside core language |

---

## Track C — Hosts

| Step | Deliverable |
|------|-------------|
| **C1** | Keep HTML emitter on bake JSON |
| **C2** | SwiftUI mapper spike on bake IR |
| **C3** | Prototype env (routes / stack / data) after B4–B5 |

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
| **Q3** | Inline + named `interaction` merge | Inline = synthetic name **`default`**; unique names **append**; **same name replaces** |
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
- [ ] A3 catalogue / graph  
- [ ] First `full-spec` patch with B1  
- [ ] Align published `schemaVersion` string to plain **`1.0.0`** when touching normative version prose (drop `-beta` framing; still unreleased)

Progress and intentional gaps also tracked in **`docs/SPEC_GAPS.md`**.
