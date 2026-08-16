# Proposal: Adaptive layout (`sizeClass` host protocol)

**Status:** proposed (2026-08-15) — **size taxonomy / host policy revised by** [`PROPOSAL_HOST_ENVIRONMENT.md`](./PROPOSAL_HOST_ENVIRONMENT.md) (2026-08-16). Prefer pack `hostSchema` + `host` + `<HostPlatform>` over a language-fixed `SizeClass` prelude. This doc remains useful for product rules (opt-in structure flips, no CSS in bake, measure the mount).  
**Depends on:** `docs/PROPOSAL_PROTOCOL_CAPABILITIES.md`; EditableText injected state (`crates/pdl-core/src/design.rs` `editable_text_injected_params`); `test-fixtures/pdl/stdlib/host_protocols.pdl`; bake-as-snapshot (`website/src/index.md`)  
**Not CSS.** Do not put `@media` / container queries in bake JSON or in `.pdl`.  
**Related:** Playground param knobs / fixtures; `/device`; future SwiftUI host (C2); **Host Environment** proposal

Until this is locked in `shared/*.json` / `host_protocols.pdl`, tooling must not treat the syntax as normative.

---

## 1. Problem

Authors already write *one* tree and preview it at one width. Real products need **the same named children** in a row on a regular container (iPad, wide preview) and in a column on a compact container (iPhone, Split View, narrow column).

PDL cannot say that today except as an ordinary author param (`size: MoleculeMatrixSize`) that a human or fixture sets. There is no environment signal for “how wide is *this* mount?”

CSS would do it with `@media (max-width: …)` or `@container`. That is the wrong layer for PDL:

- Bake is a **flattened snapshot**. One bake = one `direction`. A click (or a resize that *matters*) **assigns a parameter** and the compiler **builds a new tree**.
- HTML is one host. SwiftUI already has size classes; it must not read CSS breakpoints out of bake JSON.
- Viewport media queries lie in Split View and in a narrow sidebar on a wide device.

So the language needs a **size class**, and the host needs a **measurement → class** map. The question is who opts in, who is measured, and how coarse the cases are.

---

## 2. Preferred metaphor

A host protocol **capability package**, same family as `PointerInput` and `EditableText`.

| Package piece | `PointerInput` | `EditableText` | Adaptive layout (this) |
|---------------|----------------|----------------|------------------------|
| **Opt-in** | `component C <PointerInput>` | `component C <EditableText>` | `component C <AdaptiveLayout>` |
| **Inbound channels** | `pressStart`, `hoverEnd`, … | `editingBegan`, … | **None** — not a moment |
| **Host verbs** | (none) | `beginEditing`, … | **None** in v1 |
| **Well-known state** | (hover/press live in the host) | `value`, `isEditing`, … | **`sizeClass: SizeClass`** |
| **Who drives it** | Pointer events | Keyboard / focus | **Allocated width of this mount** |

Authors’ gloss:

> *“`emits` talks to my parent. `PointerInput` opts me into clicks. `AdaptiveLayout` opts me into a size class the host measures. Most components should do neither.”*

That last sentence is the product rule. `.fill` / `.hug` already adapt *within* a row. Only pages and a few structural groups should **change structure** (row ↔ column, sidebar on/off). Opt-in keeps that list short.

`sizeClass` is **EditableText-shaped** (injected fact, `if` branches the tree), not PointerInput-shaped (handler on an event).

---

## 3. Language

### 3.1 Prelude variant

```pdl
variant SizeClass {
  case compact
  case regular
}
```

Always in scope (stdlib prelude), like host protocol names. Closed. Write `.compact` / `.regular`.

**v1 is two cases, one axis (horizontal).** That is enough for “stack on phone, row on tablet.” Add `.medium` or `verticalSizeClass` only when a real pack cannot say the layout with two worlds (see §12).

Not device names (`.iPhone`, `.iPad`). An iPad in Split View is compact. A phone in landscape may still be compact horizontally. The class is **how wide this container is**, not which SKU.

### 3.2 Prelude host protocol

```pdl
protocol AdaptiveLayout {
  host
  // No inbound channels. No verbs.
  // Well-known state (injected — not protocol params, PDL-E032):
  //   sizeClass: SizeClass = .regular
}
```

Host protocols stay illegal as slot types (`chips: [AdaptiveLayout]` → **PDL-E031**). An API protocol may `requires AdaptiveLayout` if a page-type contract should force the capability.

### 3.3 Authoring

```pdl
component Pair <AdaptiveLayout>() layout {
  direction = .row
  gap = 16
  width = .fill

  if sizeClass == .compact {
    direction = .column
  }

  let a = Card()
  let b = Card()
  children = [a, b]
}
```

Same lets in both worlds. **PDL-E042** still holds: a let mounts once *per resolved tree*. `if` / `else` may assign different `children` lists in different worlds (hide a sidebar on compact) because only one branch applies.

```pdl
if sizeClass == .compact {
  children = [main]
} else {
  children = [sidebar, main]
}
```

Do **not** remount the same let twice in one world (`children = [card, card]`).

### 3.4 Injected vs author-declared

Same merge rule as EditableText (`effective_params`):

- Conformance **injects** `sizeClass` if the author did not declare it.
- An author/API param of the same name **wins** (default / type). The host may still override it at bake time (fixture, knob, live measure) the way it overrides any param.

Two legal styles:

| Style | Meaning | Host auto-measure? |
|-------|---------|-------------------|
| `<AdaptiveLayout>` only | Injected `sizeClass`; host measures this mount | Yes |
| Author param `sizeClass: SizeClass = .regular` **without** the protocol | Ordinary variant; parent / fixture / knob sets it | No |
| Both | Author default; host measure overrides when the mount is live | Yes |

The middle row is how today’s molecule `size` / `density` labs already work. The protocol is the *environment* hook, not the only way to branch.

Using `if sizeClass == …` when `sizeClass` is neither declared nor injected is an unknown name (existing param / condition diagnostics). No new “you forgot the protocol” error unless we later lint “this looks like SizeClass but you did not opt in.”

---

## 4. Where breakpoints are set

**Not in the component. Not locked as language pixels.**

| Place | Decides |
|-------|---------|
| **Language** | The **cases** (`.compact`, `.regular`) |
| **Host** | How a measured width becomes a case |
| **Optional pack token** | A number the *HTML* host may read, e.g. `semantic layout.compactMax: Distance = 767` |

An iOS / SwiftUI host **ignores** that token and uses the system horizontal size class (including Split View). An HTML host **must** pick a threshold because CSS has no size classes. That threshold is host policy — the same kind of policy as “what counts as a press” or EditableText `activatesOn`.

Do **not** let each component set its own breakpoint. Two Cards in one Pair would disagree. Do not put `@media` in `.pdl`.

Suggested HTML default if no token: one cut, ~768 design units, matching common “phone vs not.” Change it in one place (host or token), not in every `if`.

---

## 5. What is measured

Measure the **allocated width of the conforming mount** (container), not the device and not necessarily the window.

| Mount | Measure |
|-------|---------|
| Root / page that opted in | Preview frame, `/device` viewport, or app window |
| Nested `<AdaptiveLayout>` | That instance’s box (CSS container-query analog) |
| Child **without** the protocol | Nothing. It just sits in the parent’s new `direction`. Parent may *pass* `sizeClass` as a normal kwarg if the child declared the param |

This is why opt-in matters. If every Button were AdaptiveLayout, every resize would instance-resolve every leaf, and a button’s class would follow its own 80px width (always compact). Useless.

**Class changes only.** Resize from 820 to 830 while both are `.regular` is a no-op. Crossing the cut assigns `sizeClass` and rebakes (or instance-resolves) that mount. Debounce the measure; do not bake per pointer-move.

First layout: bake at the injected default (`.regular`) or the last fixture, then measure once and rebake if the class differs. Static CLI bake stays at the default / explicit kwargs — no browser.

---

## 6. Implications

### 6.1 Bake and hosts

Bake JSON stays one tree. Compact and regular are two legal worlds of the same component, like two fixtures or two themes. HTML draws whatever was baked. A future SwiftUI host maps `.compact` / `.regular` to `horizontalSizeClass`.

The HTML host **may** later apply a CSS container query as a *hint* that matches the two baked worlds (zero-rebake live resize). That is host sugar. It must not become the source of truth, and it must not appear in bake IR. If the query and the baked class disagree, rebake wins.

### 6.2 Playground and `/device`

- **Knob / fixture** “Compact” / “Regular” is the review SoT. You can screenshot both without resizing.
- **Live preview frame** (and `/device`) may drive the same param when the root opted in.
- Do not hide the axis only in CSS — authors need to *see* `sizeClass` in the param bag, the way `isEditing` shows up.

`/device` on an iPhone should default compact; desktop Playground defaults regular.

### 6.3 Incremental preview

A `direction` flip is a **prop patch** on the same lets (reconcile, not remount) if `children` is unchanged. Listeners stay. If compact *drops* a sidebar from `children`, that is a child-list change — same as today’s `if editing { children = [Cancel, Done] }`.

Nested AdaptiveLayout mounts reuse **instance resolve** (`pdl-resolve-instance` + child kwargs), keyed by **instance key**, not only `instance-let` (duplicate lets are now illegal; ForEach still needs occurrence identity).

### 6.4 Motion

Appear / dismiss / standing clips live on the same nodes. A class change mid-flight should cancel or finish the clip, then apply the new rest tree. Do not invent a “resize” motion channel in v1. `self.appear` does not re-fire on size class unless we add that later.

### 6.5 Theme, samples, ForEach

Orthogonal. `theme Dark` + `sizeClass == .compact` is a valid world. ForEach still mounts the list once; the *parent* direction can change. Samples stay data.

### 6.6 Rules and usage

Rules see the resolved tree for the baked class. A “must have a sidebar sibling” rule will fail the compact fixture and pass regular — that is correct if the rule is structural. Authors who mean “on regular only” need a condition we do not have yet (rules + sizeClass). **v1: evaluate rules per bake / fixture.** Call that out in the lab; do not block the protocol on rules-query `sizeClass`.

### 6.7 Catalogue

Injected `sizeClass` appears on conforming components like `isEditing` (effective params, fixtures, Playground knobs). Catalogue `hostProtocols` includes `AdaptiveLayout`.

### 6.8 Passing size class down

A page that opted in can pass the value into a child that only declared the param:

```pdl
component Page <AdaptiveLayout>() layout {
  let filters = FilterBar(sizeClass: sizeClass)  // child did not opt in
  let pair = Pair()                              // child opted in — host measures Pair
  children = [filters, pair]
}
```

Two different meanings: **inherit** (FilterBar is as compact as the page) vs **measure-self** (Pair might still be regular if it is a wide hero). Prefer inherit for chrome that should match the page; opt-in only for groups whose *own* slot width should decide structure.

### 6.9 Teaching / culture

Opt-in is the lint. A pack that puts `<AdaptiveLayout>` on every molecule is doing it wrong. Guidance in Language objects: *fill the slot you are given; opt in only when `direction` or `children` must change.* A later warning (not v1) could flag AdaptiveLayout on components that never read `sizeClass`.

---

## 7. Why not the alternatives

| Alternative | Why not (v1) |
|-------------|--------------|
| Implicit `sizeClass` on every component | Rebake storm; leaves measure as compact; fights “pages that matter” |
| `@media` / container queries in bake or `.pdl` | HTML-only; not a snapshot; SwiftUI cannot consume it |
| Device enum (`.phone` / `.tablet`) | Split View and landscape lie |
| `wrap = .wrap` only | Wrap is not a column (`align` / `justify` stay row-axis). Fine for chips, wrong for two cards |
| Per-component breakpoint numbers | Inconsistent; not portable |
| Two unrelated components (`HomePhone` / `HomePad`) | Duplicate lets, duplicate emits, no shared SoT |
| CSS-only live flip without rebake as SoT | Preview knobs, fixtures, and native hosts drift from what you see |

---

## 8. Diagnostics and lock-file work (when accepted)

- Prelude: `SizeClass` variant + `AdaptiveLayout` in `host_protocols.pdl` (and `shared/keywords.json` / language-objects host prelude).
- Inject `sizeClass` in `effective_params` when the component effectively has `AdaptiveLayout` (mirror EditableText).
- **PDL-E031** already rejects host protocols as `[T]`.
- **PDL-E032** still forbids host-protocol `params` — keep `sizeClass` injected, not declared on the protocol.
- No new error for “author param named `sizeClass` without the protocol” — that style stays legal.
- Docs: Language objects `hostPrelude`; Guide sentence that bake is still one tree.
- Lab: `test-fixtures/pdl/lab/adaptive/` (or a Pair on an existing lab) + fixtures Compact / Regular.

---

## 9. Host work (when accepted)

| Host | Job |
|------|-----|
| **Playground** | Knob + fixtures; optional ResizeObserver on conforming roots / instance mounts; assign `sizeClass` only on class change; `/device` defaults `.compact` |
| **HTML emitter** | No `@media` in v1. Draw the baked `direction`. Optional later: container-query hint |
| **CLI bake** | Default `.regular` unless kwargs/fixture say otherwise |
| **SwiftUI (C2)** | Map to `horizontalSizeClass`; ignore HTML tokens |

---

## 10. Suggested slices

| Slice | Deliverable | Done when |
|-------|-------------|-----------|
| **R0** | Lock `SizeClass` + `AdaptiveLayout`; inject `sizeClass`; lab + fixtures; no live measure | Compact/Regular knobs bake two directions; E031 still holds |
| **R1** | Playground / `/device` measure opted-in **roots** | Resize across the HTML cut flips the root once |
| **R2** | Measure opted-in **nested** mounts (instance resolve + instance key) | A Pair in a wide page can stay `.regular` while the page is `.compact` or the reverse |
| **R3** | Optional `layout.compactMax` token for the HTML host | iOS host still uses system classes |
| **R4** | Optional CSS container-query hint (must match bake) | Sugar only; rebake still SoT |
| **Later** | `.medium`; `verticalSizeClass`; rules conditions on `sizeClass`; lint unused AdaptiveLayout | Only with a pack that needs them |

Do not start R1 until R0 is locked. Do not start R4 until R1 is boring.

---

## 11. Non-goals (v1)

- Device detection, orientation enum, safe-area insets, Dynamic Type / content-size category (same *pattern*, different protocols later).
- Fluid type / fluid spacing (that is tokens + host, or a later `SizeClass` token remap — not this protocol).
- Changing `children` identity rules. E042 stays.
- Implicit conformance from `if sizeClass`.
- Vertical size class.
- Putting breakpoints in the grammar.

---

## 12. Open questions

| # | Question | Lean |
|---|----------|------|
| **Q1** | Protocol name `AdaptiveLayout` vs `SizeClass` vs `Adaptive` | **`AdaptiveLayout`** (capability). Variant stays `SizeClass`. |
| **Q2** | Two cases vs three (`.medium`) | **Two** until a pack cannot express the middle without lying. |
| **Q3** | Default injected value `.regular` vs `.compact` | **`.regular`** (desktop Playground / CLI). `/device` overrides. |
| **Q4** | HTML cut: hardcoded vs token | **Token optional** (`layout.compactMax`); host default if absent. |
| **Q5** | May a parent force a child’s class when the child also opted in? | **Measure-self wins** on opted-in children (otherwise the protocol is a lie). Parent passes kwargs only to non-conforming children. |
| **Q6** | Should crossing the cut replay `appear`? | **No** in v1. |
| **Q7** | Rules that should hold only in `.regular` | **Deferred.** Per-fixture bake is enough to see the failure. |

---

## 13. Decision lean (one paragraph)

Grow the host-protocol family with **`AdaptiveLayout`**: opt-in, no channels, injected **`sizeClass`** (`.compact` / `.regular`). Authors change `direction` or `children` in `if sizeClass`. The host maps **this mount’s width** to a case; breakpoints are host (or one HTML token), never per-component and never CSS in bake. Most components stay one tree and just fill their slot. That is the whole point of making it a protocol.
