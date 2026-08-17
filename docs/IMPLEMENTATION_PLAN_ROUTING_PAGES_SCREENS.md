# Implementation plan — Pages, screens, Presenter

**Proposal:** [`PROPOSAL_ROUTING_PAGES_SCREENS.md`](./PROPOSAL_ROUTING_PAGES_SCREENS.md) (proposed 2026-08-16)  
**Revises:** [`PROPOSAL_SLOTS_PROTOCOLS_FIXTURES.md`](./PROPOSAL_SLOTS_PROTOCOLS_FIXTURES.md) §8.5 — stack lives on `Presenter`, not a host blob  
**Binding:** lock files + goldens per slice. Proposal text is intent until `shared/*.json` / `grammar/pdl.ebnf` change.  
**Core:** Rust-first (`crates/pdl-core`). WASM / Playground consume bake. TS oracle does not need a parallel port.

Until a slice is locked, tooling must not treat `page` / `screen` / `Presenter` / `emits(propagation:)` / bare ancestor capture as normative.

---

## Principles

1. **The screen is the parent.** Ancestor capture is bare `channel(…) =` on the screen (or any ancestor), and the sink lists the protocol in receive `<>` (`screen Phone <ShowEpisode>`). Not `Protocol.channel`, not `presenter.channel`.
2. **`Presenter` is a mounted frame.** Chrome is a sibling (`children = [presenter, tabBar]`). Pages are values you hand it. A component never replaces itself.
3. **Emitters send the protocol.** `EpisodeRow <PointerInput> emits <ShowEpisode>` fires. The screen receives. Pack names are not reserved.
4. **Bake is a snapshot.** IR paints the walk (§14.1). N5 still paints stack top + optional cover. Under-top / hidden entries exist as pins, not IR. Pair transitions are a host lane over two nodes, not a bake of the whole stack.
5. **Host environment stays out.** `<Host>` / catalogs are size and assets. `view.width` does not present.
6. **No router DSL.** Handler constructs the instance (`presenter.present(Episode(id:))`). No route-enum lookup in v1.
7. **Rust-first vertical slices.** Grammar/lock → parse/validate → bake golden → lab fixture. No double TS implementation.
8. **Live click is B7a–c (shipped).** Fixture pins paint the hole; `presenterVerb` on emit applies session pins; nearest bare ancestor capture wins.

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
| **Q9** | Screen conformance | Screen **receives** the emit protocol (`<ShowEpisode>`) and writes the bare handler. Emitters write `emits <ShowEpisode>` |
| **Q10** | Hole | Prelude `Presenter` frame, not `path: [Page]` on the screen |
| **Q11** | `dismiss` at lone root | No-op in v1 |
| **Q12** | Vacant overlay | N5: omit `props.cover`. N9: no vacant slot — a retained entry is on the stack. No `T?` |
| **Q13** | Lifecycle protocol? | No. `appear` / `disappear` on any instance root |
| **Q14** | Hide-prior ⇒ `disappear` on A? | No. Discard only |
| **Q15** | Omit `dismissMove` | Same `move`, not reverse |
| **Q16** | Hole-relative Pose | v1 is authored CSS px. Later Pose unit, not N8 |
| **Q17** | `let.appear` | No in v1 |
| **Q18** | Many retained layers | Yes. `retainPrior: true` is chainable. N5 is one cover field until N9 |
| **Q19** | Retained stack per tab | One `Presenter` per tab. Not `replace` on a shared hole |
| **Q20** | `present` / `swap` / `replace` | `present` appends (`retainPrior` is the paint flag). `swap` changes the top slot. `replace` wipes to `[page]`. At one entry, `swap` ≡ `replace` |
| **Q21** | Default `retainPrior` | `false` |
| **Q22** | Crossing front | On `PresentationMotion` (`front` / `promoteAt`). Not `present(z:)`. Not on `Pose` |
| **Q23** | `dismissMove` on `swap` / `replace` | Illegal. Optional `move` only |
| **Q24** | N3 `replace` (shipped) | Becomes `swap` in N9. New `replace` is full-stack wipe |
| **Q25** | `replace` with several painted layers | Snap; `disappear` on each discarded painted instance |
| **Q26** | `appear` vs pair timing | Fire `appear` when incoming is mounted for the move |
| **Q27** | RTL | No silent invert in v1. Second token or later Pose unit |
| **Q28** | `PresentationMotion(token, field:)` | Not in v1. Literal + `.reversed` only |
| **Q29** | Mid-clip front flip | `promoteAt: Number?`. No associated enum values in v1 |
| **Q30** | Timing / Ease rename | M5 breaking slice. N8 depends on it. [`IMPLEMENTATION_PLAN_MOTION_NAMING.md`](./IMPLEMENTATION_PLAN_MOTION_NAMING.md) |
| **Q31** | Per-side clocks | Allowed. Interrupt is per playhead |
| **D1** | Verbs where | Capture bodies only |
| **D2** | Painted children | Walk from top: while `retainPrior`, keep walking; stop at first `false` (N9). N5: top + one cover field |
| **D5** | `appear` / `disappear` | Instance-root lifecycle. Not PointerInput. `disappear` = discarded only |
| **D6** | `PresentationMotion` | `incoming` / `outgoing` (Motion \| Pose); play implied by slot. `front` / `promoteAt`. Omit `dismissMove` = same `move`. Reverse is `.reversed` (swap sides + flip front). Hide-prior `present` only in v1 |
| **D7** | Three verbs | `present(retainPrior:)` appends; `swap` changes top; `replace` wipes stack. No `.push` / `.cover` / `.root` styles. No `z:` on the call |
| **D8** | Tabs + retained stacks | One `Presenter` per tab. Not `replace` on a shared hole |
| **D9** | Front | On `PresentationMotion`, not on the verb |
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

Capture bodies that call `presenter.present` / `swap` / `replace` / `dismiss` (and today’s `push` / `pop` / `replace`) are **validated** in N3+ and **run** on click (B7b) or when a fixture already holds the resulting stack (B7a).

---

## Track N — slices

### N0 — `page` / `screen` roles

**Shipped.** Parse and catalogue. Same body machine as `component`. No `Presenter` yet.

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
| Screen **must** list `<ShowEpisode>` and write `showEpisode(…) =` | Lab: `screen Phone <ShowEpisode>` |
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

**Shipped.** Stack on the Presenter (`root` + pushed pages). Bake paints the top. Fixture `presenter = [Home(), Episode()]` pins a deep stack. `pop` at `root` is a no-op.

| Done when | Evidence |
|-----------|----------|
| Presenter state is a stack (`root` + pushed pages) | AST / bake IR |
| `presenter.push(page)` appends; bake paints the top | Golden: Home → Episode |
| `presenter.pop()` removes last; at `root` no-op | Golden + no error |
| Fixture can pin a deep stack for review | Catalogue / fixture example |
| Lab: `showEpisode` → `push`; `back` → `pop` | `lab/nav/` |

**Not in N4:** cover / `present`. Live click is B7 (shipped).

---

### N5 — `present` / `dismiss` (full-screen cover)

**Shipped.** Cover is a second hole on the same Presenter. Bake paints the cover when set; stack is unchanged. Vacant cover is omitted (no `T?`). `.sheet` is E055.

| Done when | Evidence |
|-----------|----------|
| `presenter.present(Settings(), style: .cover)` | Capture body only |
| Bake paints cover **above** the stack top when set | Golden |
| `dismiss()` clears cover; stack unchanged | Golden |
| Vacant cover without `T?` | Variant or internal empty; do not add general optionals |
| Lab: settings cover over Episode | `lab/nav/` |

**Not in N5:** `.sheet` chrome, per-channel propagation, `prototype` maps.

---

### B7 — Live Presenter navigation in HTML

**Shipped.** Session state is presenter pins (not Phone params). Catalogue already serializes `presenterVerb` and `capture: "ancestor"`.

| Done when | Evidence |
|-----------|----------|
| B7a: fixture chips Episode / Settings paint the hole | WASM `pinsJson`; Playground strips `presenter` / `presenter.cover` from kv; pack **Nav (Presenter)** |
| B7b: click push / pop / present / dismiss on `n5_cover.pdl` | HTML `presenterVerb` → `apply_presenter_pins` → Phone rebake. `pop` at root / vacant `dismiss` no-op |
| B7c: nearest bare ancestor capture wins | Nested page with its own Presenter swallows `showEpisode`; Phone stack unchanged |

**Not in B7:** `.sheet`, URL/router, `prototype { start }`, B6 ForEach chrome, renaming host inbound `dismiss` (that rename is **N6**).

---

### N6 — `appear` / `disappear` (lifecycle)

**Not shipped.** Detach from PointerInput. Rename inbound `dismiss` → `disappear`. `presenter.dismiss()` unchanged.

| Done when | Evidence |
|-----------|----------|
| `self.appear` / `self.disappear` legal on any `component` / `page` / `screen` without `<>` | Parse + validate; no E030 |
| `self.dismiss =` rejected → write `self.disappear` | Error fixture |
| PointerInput inbound list drops `dismiss` (keeps pointer/focus) | Prelude + language-objects |
| Site default `disappear` → `.toPose`; clip rack **Disappear** | Motion goldens / lab |
| Labs / templates / `language-objects` examples updated | `lab/motion/`, Playground template |

**Not in N6:** host sequencing for Presenter (N7); `PresentationMotion` (N8); `let.appear` on a raw Layout.

---

### N7 — Retained-layer lifecycle in the HTML host

**Not shipped.** Live `present(retainPrior: true)` / `dismiss` play instance clips. Until N9 this is the N5 cover field.

| Done when | Evidence |
|-----------|----------|
| Retained mount plays `appear` on that subtree only | Click Settings; not the whole Phone `appear-armed` |
| `presenter.dismiss()` plays `disappear`, waits `finished`, then pops | Close does not snap-remove |
| No clip → today’s immediate unmount | Golden / test |
| Appear in flight + dismiss → reverse from live overlay | Interrupt test |
| Timeout if WAAPI never finishes | Host constant |

**Not in N7:** stdlib `Cover` / `Dim` (labs may teach them); `.sheet`; `PresentationMotion`.

---

### N8 — `PresentationMotion` + two-node lane

**Not shipped.** Pair clip on hide-prior `present`.

| Done when | Evidence |
|-----------|----------|
| Type `PresentationMotion(incoming:, outgoing:, duration?, ease?, delay?, front?, promoteAt?)` | Grammar + lock files |
| Slot is `Motion` or `Pose`; play implied (incoming `.toRest`, outgoing `.toPose`) | Parse + evaluate |
| `Presenter(root:, move:, dismissMove:)` | Parse |
| `present(page, move:, dismissMove:)` in a capture body; stored on the entry | AST + pins JSON |
| `dismiss()` uses the entry’s `dismissMove` or the same `move` (not reverse) | Golden |
| `motion.navPush.reversed` swaps sides and flips `front` | Parse + evaluate |
| Both omitted → snap (or Presenter default) | Golden |
| Host keeps outgoing + incoming, honors `front` / `promoteAt`, then commits | n4/n5 lab with `move:` |
| `swap` / `replace` take optional `move` only; `dismissMove` on them is an error | Validate |
| `retainPrior: true` does not take a `PresentationMotion` | Validate |
| No `z:` on the verb | Validate |

**Not in N8:** hole-relative units; interactive pop; keep-alive stack; `Reverse()` call sugar (`.reversed` only); many retained layers / `swap` vs wipe-`replace` (N9). **Needs M5** (Timing / Ease) first.

---

### N9 — `present` / `swap` / `replace` on one stack

**Not shipped.** Fold N5’s cover field into stack entries with `retainPrior`. `dismiss()` pops.

| Done when | Evidence |
|-----------|----------|
| Entry `{ page, retainPrior, move?, dismissMove? }` | Pins JSON |
| Paint walk: while `retainPrior`, keep walking; stop at first `false` | Bake golden: two retained layers over Episode |
| `present(page, retainPrior:, move:, dismissMove:)`; `push` sugar for hide-prior | Parse |
| `swap(page, move:)` changes the top slot; inherits `retainPrior` | Golden |
| `replace(page, move:)` wipes to `[page]`; N3 top-only `replace` becomes `swap` | Golden + lab migrate |
| `dismiss()` pops last; no-op on lone root | Golden |
| `replace` discards the previous stack | Golden + `disappear` on painted victims |
| Fixture pin a retained chain | Catalogue |
| Lab: per-tab Presenters (optional teaching) | `lab/nav/` note, not a new pack |

**Not in N9:** Presenter-of-Presenters; gesture pop; `.sheet`. Multi-layer `replace` is Q25 (snap + per-instance `disappear`).

---

## Later (not this track)

| Item | Why later |
|------|-----------|
| Emit dispatch / click-to-push in Playground | **B7a–c shipped** |
| `prototype { start = Phone() }` | Discovery hints, not the bus |
| Per-channel `dismiss(propagation: .ancestors)` | Whole-block policy is enough |
| Protocol-wide `propagation =` sugar | Q1 |
| `.sheet` chrome | E055 — author a hugging `Cover` until then |
| Hole-relative Pose (incoming translate = hole width) | Q16 |
| RTL / writing-direction invert | Q27 |
| `PresentationMotion(token, field:)` copy-override | Q28 |
| Timing / Ease rename (`Transition` → `Timing`, `Easing` → `Ease`) | **M5** — do this, do not defer. [`IMPLEMENTATION_PLAN_MOTION_NAMING.md`](./IMPLEMENTATION_PLAN_MOTION_NAMING.md) |
| `replace` clip when several layers are painted | Q25 |
| Keep-alive under-top pages | Splits mount vs became top |
| Interactive / gesture pop | Reverse from progress on `PresentationMotion` |
| `let.appear` on a raw Layout | Q17 — instance roots only |
| `T?` optionals | Q12 |
| Route-enum lookup / URL router | Non-goal |
| `on showEpisode` keyword | Bare `channel(…) =` is enough |
| Lint `dismiss` at root / nav on generic `Button` | After labs exist |
| Host-blob stack (old §8.5) | Superseded by `Presenter` |
| Presenter-of-Presenters | Later |

---

## Diagnostics (allocate in `shared/diagnostics.json`)

Reuse existing codes where the case already exists (unknown name, unhandled `.parent` emit). New codes for:

| Concern | Slice |
|---------|-------|
| Unknown `propagation` case | N1 |
| `.ancestors` unhandled through root | N2 |
| `Protocol.channel =` / child-like capture of a protocol name | N2 |
| `present` / `swap` / `replace` / `dismiss` outside a capture body | N3 / N4 / N5 / N9 |
| `Presenter` missing `root` | N3 |
| `self.dismiss` (inbound) | N6 — write `self.disappear` |
| Unknown `PresentationMotion` field / `present` arg | N8 |
| `dismissMove` on `swap` / `replace` | N8 / N9 |

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

screen Phone <ShowEpisode, AppNav>() layout {
  let home = Home()
  let presenter = Presenter(root: home)
  children = [presenter]
  showEpisode(id: EpisodeId) = {
    presenter.present(Episode(episodeId: id))
  }
  back() = { presenter.dismiss() }
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
B7  live emit dispatch               (B7a pins / B7b verbs / B7c climb — shipped)
N6  appear / disappear lifecycle     (can overlap N7)
N7  retained-layer appear + disappear-then-dismiss  (needs N5, B7, N6)
N8  PresentationMotion + two-node lane (needs N4, B7, **M5**; N6 for appear-during-move)
N9  present / swap / replace + paint walk  (needs N5; N8 if labs use move:)
```

Do not start N3 until N2 goldens reject `Protocol.channel =`. Do not start N4 until replace-only bake is boring. Do not call N3 `back → Home()` a stack.

---

## Near-term checklist

- [x] N0 `page` / `screen` + catalogue role + prelude `Page`
- [x] N1 `emits(propagation:)`
- [x] N2 bare ancestor capture; unhandled `.ancestors` error
- [x] N3 `Presenter(root:)` + `replace` + lab
- [x] N4 `push` / `pop` + pinned-stack fixture
- [x] N5 `present(.cover)` / `dismiss` + cover fixture pin
- [x] B7a presenter pins through WASM/Playground bake; nav pack fixture chips
- [x] B7b `presenterVerb` on emit; session apply + Phone rebake
- [x] B7c nearest bare ancestor capture wins
- [ ] M5 Timing / Ease rename (blocks N8) — [`IMPLEMENTATION_PLAN_MOTION_NAMING.md`](./IMPLEMENTATION_PLAN_MOTION_NAMING.md)
- [ ] N6 `appear` / `disappear` (rename + detach from PointerInput)
- [ ] N7 retained-layer host sequencing
- [ ] N8 `PresentationMotion` + `present(move:, dismissMove:)` + `.reversed`
- [ ] N9 `present(retainPrior:)` / `swap` / `replace`; paint walk; N3 `replace` → `swap`
- [ ] Language objects / Guide / `SPEC_GAPS` status when each slice locks
- [ ] Do **not** implement a reserved `Routing` protocol or Studio singleton sink

Progress also tracked in [`SPEC_GAPS.md`](./SPEC_GAPS.md) and the master [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md).
