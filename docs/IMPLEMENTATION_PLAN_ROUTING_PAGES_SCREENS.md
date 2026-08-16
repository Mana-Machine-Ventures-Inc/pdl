# Implementation plan — Pages, screens, Presenter

**Proposal:** [`PROPOSAL_ROUTING_PAGES_SCREENS.md`](./PROPOSAL_ROUTING_PAGES_SCREENS.md) (proposed 2026-08-16)  
**Revises:** [`PROPOSAL_SLOTS_PROTOCOLS_FIXTURES.md`](./PROPOSAL_SLOTS_PROTOCOLS_FIXTURES.md) §8.5 — stack lives on `Presenter`, not a host blob  
**Binding:** lock files + goldens per slice. Proposal text is intent until `shared/*.json` / `grammar/pdl.ebnf` change.  
**Core:** Rust-first (`crates/pdl-core`). WASM / Playground consume bake. TS oracle does not need a parallel port.

Until a slice is locked, tooling must not treat `page` / `screen` / `Presenter` / `emits(propagation:)` / bare ancestor capture as normative.

---

## Principles

1. **The screen is the parent.** Ancestor capture is bare `channel(…) =` on the screen (or any ancestor). Not `Protocol.channel`, not `presenter.channel`, not `screen Phone <ShowEpisode>`.
2. **`Presenter` is a mounted frame.** Chrome is a sibling (`children = [presenter, tabBar]`). Pages are values you hand it. A component never replaces itself.
3. **Emitters own the protocol.** `EpisodeRow <ShowEpisode, PointerInput>` declares and fires. Pack names are not reserved.
4. **One bake, one painted child.** IR shows the presenter top (and cover if present). History is presenter state. Crossing a destination is a new bake, not CSS.
5. **Host environment stays out.** `<Host>` / catalogs are size and assets. `view.width` does not push.
6. **No router DSL.** Handler constructs the instance (`presenter.push(Episode(id:))`). No route-enum lookup in v1.
7. **Rust-first vertical slices.** Grammar/lock → parse/validate → bake golden → lab fixture. No double TS implementation.
8. **Live click is B7.** N3–N5 labs bake pinned presenter state. Playground click-to-push waits on emit dispatch.

---

## Locked decisions

| ID | Topic | Decision |
|----|--------|----------|
| **Q1** | Propagation spelling | `emits(propagation:)` on the emits block |
| **Q2** | Who may capture | Any ancestor; recommend `screen` |
| **Q3** | Role spelling | Keywords `page` / `screen` |
| **Q4** | Route → instance | No lookup table. Handler constructs the page |
| **Q5** | Climb case name | `.ancestors` |
| **Q6** | Unhandled `.ancestors` at root | Hard error |
| **Q7** | `page` → `Page` | Auto-conform to prelude `protocol Page: component { }` |
| **Q8** | Ancestor capture | Bare `channel(…) =` |
| **Q9** | Screen conformance | Screen does **not** conform to the emit protocol |
| **Q10** | Hole | Prelude `Presenter` frame, not `path: [Page]` on the screen |
| **Q11** | `pop` at `root` | No-op in v1 |
| **Q12** | Vacant cover | Later; do not block N3–N4 on `T?` |
| **D1** | `push` / `present` where | Capture bodies only |
| **D2** | Painted child | Always one: stack top, or cover if up |
| **D3** | Child-let capture | Unchanged for `.parent` |
| **D4** | Host inbound | Still `self.pressEnd =`. Distinct from ancestor capture |

---

## Bake order (from N3)

```text
load / merge
  → validate page / screen roles + Page auto-conform
  → validate emits(propagation:)
  → validate child-let captures (.parent) and bare ancestor captures (.ancestors)
  → instantiate Presenter(root:) (stack = [root]; cover empty)
  → apply fixture / kv pins onto presenter state if present
  → presenter paints top (or cover)
  → resolve / bake tree
```

Capture bodies that call `presenter.push` are **validated** in N3+. They **run** when emit dispatch exists (B7) or when a fixture already holds the resulting stack.

---

## Track N — slices

### N0 — `page` / `screen` roles

Parse and catalogue. Same body machine as `component`. No `Presenter` yet.

| Done when | Evidence |
|-----------|----------|
| Keywords locked | `shared/keywords.json`; `lexer.rs` |
| `page Name(params) layout { }` / `screen Name(params) layout { }` parse | AST role on the component-like decl |
| Catalogue `role`: `component` \| `page` \| `screen` | `shared/schema/component-catalogue.json`; existing goldens default `component` or omit |
| `page` auto-conforms to prelude `Page` | `test-fixtures/pdl/stdlib/` + `effective` conformance |
| Unknown role / using `page` as a slot type before `Page` exists | Error fixture |
| Existing component goldens unchanged | No bake behavior change |

**Do not** invent `Presenter`, `propagation`, or ancestor capture in this slice.

---

### N1 — `emits(propagation:)`

| Done when | Evidence |
|-----------|----------|
| Grammar `emits(propagation: .parent \| .ancestors)` | `grammar/pdl.ebnf` |
| Default is `.parent` when omitted | Existing emit fixtures still pass |
| Unknown case → error | `test-fixtures/pdl/errors/` |
| Catalogue records propagation per emits block | Schema + golden |
| `.ancestors` without a bare handler (N2) is not diagnosed yet | Parse-only if N2 has not landed; or defer the unhandled-at-root error to N2 |

**Do not** change child-let capture rules in this slice.

---

### N2 — Ancestor capture (bare `channel(…) =`)

The screen is the parent. This is the new form.

| Done when | Evidence |
|-----------|----------|
| Bare `showEpisode(id: EpisodeId) = { … }` parses in `layout` | AST: ancestor capture, not child-let, not `self.` host inbound |
| `Protocol.channel =` / `presenter.channel =` rejected | Error fixtures |
| `.parent` still requires child-let capture | Existing E036 / unhandled rules unchanged |
| `.ancestors` climbs past pages with no bare handler | Validate walk; unhandled at root → error |
| Screen does **not** need `<ShowEpisode>` | Lab: `screen Phone()` with no header |
| Handler body may assign params (today’s capture) | Prep for N3 presenter methods |

**Not in N2:** `Presenter` methods. Handler bodies may no-op or set ordinary params.

---

### N3 — `Presenter(root:)` + `replace`

Single painted child. This is “set a child,” not a stack.

| Done when | Evidence |
|-----------|----------|
| Prelude `Presenter` | `test-fixtures/pdl/stdlib/` (or language-objects built-in frame) |
| `let presenter = Presenter(root: home)` + `children = [presenter, tabBar]` | Parse + bake |
| Bake paints `root` as the presenter’s one child | Golden |
| `presenter.replace(Episode(id:))` legal only in a capture body | Error if in ordinary layout |
| Lab: Phone + Home + EpisodeRow; fixture or kv shows replaced top | `test-fixtures/pdl/lab/nav/` |
| `Presenter()` without `root` → error | Error fixture |

**Not in N3:** `push` / `pop` / cover. `replace` is the only verb. Do not call `back() { replace(Home()) }` a stack.

---

### N4 — `push` / `pop`

| Done when | Evidence |
|-----------|----------|
| Presenter state is a stack (`root` + pushed pages) | AST / bake IR |
| `presenter.push(page)` appends; bake paints the top | Golden: Home → Episode |
| `presenter.pop()` removes last; at `root` no-op | Golden + no error |
| Fixture can pin a deep stack for review | Catalogue / fixture example |
| Lab: `showEpisode` → `push`; `back` → `pop` | `lab/nav/` |

**Not in N4:** cover / `present`. Live click still B7.

---

### N5 — `present` / `dismiss` (full-screen cover)

| Done when | Evidence |
|-----------|----------|
| `presenter.present(Settings(), style: .cover)` | Capture body only |
| Bake paints cover **above** the stack top when set | Golden |
| `dismiss()` clears cover; stack unchanged | Golden |
| Vacant cover without `T?` | Variant or internal empty; do not add general optionals |
| Lab: settings cover over Episode | `lab/nav/` |

**Not in N5:** `.sheet` chrome, per-channel propagation, `prototype` maps.

---

## Later (not this track)

| Item | Why later |
|------|-----------|
| Emit dispatch / click-to-push in Playground | **B7** |
| `prototype { start = Phone() }` | Discovery hints, not the bus |
| Per-channel `dismiss(propagation: .ancestors)` | Whole-block policy is enough |
| Protocol-wide `propagation =` sugar | Q1 |
| `.sheet` vs `.cover` chrome | Same hole, different host chrome |
| `T?` optionals | Q12 |
| Route-enum lookup / URL router | Non-goal |
| `on showEpisode` keyword | Bare `channel(…) =` is enough |
| Lint `pop` at root / nav on generic `Button` | After labs exist |
| Host-blob stack (old §8.5) | Superseded by `Presenter` |

---

## Diagnostics (allocate in `shared/diagnostics.json`)

Reuse existing codes where the case already exists (unknown name, unhandled `.parent` emit). New codes for:

| Concern | Slice |
|---------|-------|
| Unknown `propagation` case | N1 |
| `.ancestors` unhandled through root | N2 |
| `Protocol.channel =` / child-like capture of a protocol name | N2 |
| `push` / `replace` / `present` outside a capture body | N3 / N4 / N5 |
| `Presenter` missing `root` | N3 |

Exact `PDL-E0xx` numbers assigned when the lock file is edited (next free after E050).

---

## Lab pack

`test-fixtures/pdl/lab/nav/` — **not** stdlib. Suggested shape:

```pdl
protocol ShowEpisode: component {
  emits(propagation: .ancestors) {
    showEpisode(id: EpisodeId)
  }
}

page Home() layout { /* EpisodeRow; no capture */ }
page Episode(episodeId: EpisodeId = .demo) layout { /* BackButton */ }

screen Phone() layout {
  let home = Home()
  let presenter = Presenter(root: home)
  children = [presenter]
  showEpisode(id: EpisodeId) = {
    presenter.push(Episode(episodeId: id))
  }
  back() = { presenter.pop() }
}
```

Fixtures: Home (default stack), Episode (pinned stack), Settings cover (N5). Do **not** add this lab to the TS oracle `manifest.txt`.

---

## File map

| Area | Files |
|------|--------|
| Grammar | `grammar/pdl.ebnf` |
| Keywords / objects / diagnostics | `shared/keywords.json`, `shared/language-objects.json`, `shared/diagnostics.json` |
| Catalogue / bake schema | `shared/schema/component-catalogue.json`, `shared/schema/baked-design.json` |
| Prelude | `test-fixtures/pdl/stdlib/` (`Page`, `Presenter`) |
| Lexer / parse / AST | `crates/pdl-core/src/lexer.rs`, `parser.rs`, `ast.rs` |
| Validate / effective conformance | `crates/pdl-core/src/validate.rs`, `design.rs` |
| Bake / presenter paint | `crates/pdl-core/src/bake.rs` |
| WASM / CLI | only if bake args are needed for pinned stacks (prefer fixtures) |
| Labs / errors / goldens | `test-fixtures/pdl/lab/nav/`, `test-fixtures/pdl/errors/`, `crates/pdl-core/tests/golden/` |

---

## Order and dependencies

```text
N0  page / screen roles              (independent of Presenter)
N1  emits(propagation:)              (needs today’s emits)
N2  bare ancestor capture            (needs N1)
N3  Presenter(root:) + replace       (needs N0, N2)
N4  push / pop                       (needs N3)
N5  present(.cover) / dismiss        (needs N3; N4 if cover-over-stack is the lab)
B7  live emit dispatch               (needed for Playground click; not a Track N slice)
```

Do not start N3 until N2 goldens reject `Protocol.channel =`. Do not start N4 until replace-only bake is boring. Do not call N3 `back → Home()` a stack.

---

## Near-term checklist

- [ ] N0 `page` / `screen` + catalogue role + prelude `Page`
- [ ] N1 `emits(propagation:)`
- [ ] N2 bare ancestor capture; unhandled `.ancestors` error
- [ ] N3 `Presenter(root:)` + `replace` + lab
- [ ] N4 `push` / `pop` + pinned-stack fixture
- [ ] N5 `present(.cover)` / `dismiss`
- [ ] Language objects / Guide / `SPEC_GAPS` status when each slice locks
- [ ] Do **not** implement a reserved `Routing` protocol or Studio singleton sink

Progress also tracked in [`SPEC_GAPS.md`](./SPEC_GAPS.md) and the master [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md).
