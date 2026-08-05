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
| **A1** | Lexer + parser + AST for *current* PDL | Parse `test-fixtures/pdl/**/*.pdl` (excl. intentional errors) |
| **A2** | load / merge / validate / **bakeComponent** | Golden parity vs TS on a starter set |
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

1. Generate or check in **bake JSON goldens** under e.g. `test-fixtures/goldens/` (exact layout TBD in A2).  
2. CI: `npm test` (TS) + `cargo test -p pdl-core`.  
3. Dual-bake compare job once A2 exists.  
4. Error fixtures in `test-fixtures/pdl/errors/` remain the validate/parse oracle.

---

## Decisions still needed (block grammar, not A0–A1)

See questions for the owner in the PR / chat. Until answered, implementers **must not** invent dialect beyond the proposal’s sketches.

| ID | Topic | Options (summary) |
|----|--------|-------------------|
| Q1 | Single slot vs always array | `content: ModalContent` **or** only `[ModalContent]` |
| Q2 | Bad injection pack items | Soft skip/placeholder vs hard fail (proto vs prod) |
| Q3 | Inline + named `interaction` merge | Inline = default bundle; named replace/append rules |
| Q4 | First golden set | Which entries (`atoms/design`, `molecules/design`, one integration)? |
| Q5 | `schemaVersion` bump | When B1 ships — minor vs stay `1.0.0-beta` with capability flags |

---

## Near-term checklist

- [x] Accept both proposals  
- [x] Scaffold `crates/pdl-core`  
- [ ] Record owner answers to Q1–Q5  
- [ ] A1 lexer/parser  
- [ ] A2 bake goldens + parity  
- [ ] First `full-spec` patch with B1  

Progress and intentional gaps also tracked in **`docs/SPEC_GAPS.md`**.
