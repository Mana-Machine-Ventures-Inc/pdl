# Proposal: Protocols, Slots, Expandable Lists & Dual Fixtures

**Status:** draft  
**Depends on:** `docs/PROPOSAL_PORTABLE_CORE.md` (portable core, bake → native views)  
**Related:** `docs/full-spec.md` §4 (params), §11 (fixtures / expose), §16 (catalogue / bake)

---

## 1. Problem

PDL today models **scalar** component parameters (`String`, variants, …) and **flat** fixtures (one param map per example). That is enough for a button or a single card. It is not enough for:

- Pages and modals with **nested content regions**
- **Lists** of cards fed by APIs or shims
- **Mixed** lists (e.g. host cards and user cards)
- **Reusable shells** (modal, page chrome) that must accept **any** suitable body without endless internal variants

We need a content model that stays **PDL-authored and typed** for design-time truth, yet accepts **external JSON packs** for prototypes driven by real or generated data—without a second display language and without requiring `isType` forests in containers.

---

## 2. Goals

| Goal | Meaning |
|------|---------|
| **Reusable shells** | Containers declare slots/protocols; bodies plug in without editing the shell |
| **List content** | Arrays of instances expand into the tree at bake/interpret time |
| **Dual fixtures** | Strict PDL fixtures **and** malleable injection packs share one shape |
| **Thin happy path** | Placing `slots` in `children` is enough; no mandatory `ForEach` |
| **Optional list chrome** | Expandable `ForEach` with `before` / `between` / `after` when needed |
| **PDL remains SoT** | Visual structure and contracts live in `.pdl`; packs only supply instance data |
| **Validate at the gate** | Unknown names / bad params fail inject or CI—not silent wrong UI |

### Non-goals

- `isType` / runtime type switching inside containers as a primary pattern  
- Making PDL a general programming language (arbitrary loops, maps, network)  
- Hand-editing injection packs as a second authoring format for designers  
- CRDT-merging of fixture trees across peers (whole-file / whole-pack sync is enough)

---

## 3. Concepts at a glance

```text
protocol ModalContent { … }
conform UpsellBody: ModalContent

component Modal(
  title: String = "",
  slots: [ModalContent] = [ExampleBody(…)]
) layout {
  children = [Header, slots]           // expand in place
  // or, when chrome per item is needed:
  // ForEach(slots) { before { … } between { … } after { … } }
}

fixtures Modal { example "…" { … } }   // typed, in .pdl

injection pack (JSON)                  // same tree, from API / shim / file
    → validate vs catalogue
    → bake / expand → frame IR → SwiftUI / HTML
```

---

## 4. Protocols & conformance

### 4.1 Why

Figma-like **instance swap with constraints**: a `Modal` should not enumerate every possible body as variants. It should accept **any component that conforms** to a small contract (e.g. `ModalContent`).

### 4.2 Language sketch

```pdl
protocol ModalContent {
  root = layout
  // v1: keep constraints minimal and checkable
}

component UpsellBody(
  headline: String = "",
  cta: String = "Upgrade"
) layout { … }

conform UpsellBody: ModalContent

component ConfirmBody(
  title: String = "",
  message: String = ""
) layout { … }

conform ConfirmBody: ModalContent
```

### 4.3 Normative intent (v1)

| Rule | Intent |
|------|--------|
| `protocol` names a **design contract** | Not a host-language protocol (Swift/Kotlin) |
| `conform C: P` | Opts `C` into slot/array positions typed as `P` |
| Constraints | Start with **root kind** (and optionally required tags); grow carefully |
| Catalogue | Emit `protocols` + per-component `conformsTo: string[]` for binders |

### 4.4 Closed union vs open protocol

| Use | Form |
|-----|------|
| Known finite mix in one list | Prefer a dedicated protocol adopted only by those cards, **or** a documented closed set in the pack schema |
| Open plug-in bodies | `protocol ModalContent` + any future `conform` |

Avoid encoding diversity as `if kind == …` on the shell.

---

## 5. Array params & slot injection

### 5.1 `[T]` as a foundational param type

`T` is a **component name** or a **protocol name**.

```pdl
component Modal(
  title: String = "",
  slots: [ModalContent] = [ExampleBody(title: "", body: "")]
) layout { … }

component Feed(
  rows: [FeedRow] = []
) layout { … }

component Carousel(
  cards: [ContentCard] = []
) layout { … }
```

- **`[ModalContent]`** — open protocol list (modal bodies, often length 1+).  
- **`[ContentCard]`** — homogeneous list.  
- **`[FeedRow]`** — protocol adopted by `HostCard` and `UserCard` (polymorphic list).

Defaults may use **instance literals**: `Name(param: value, …)`.

### 5.2 Expansion (no `ForEach` required)

A list/protocol param referenced in `children` is an **expandable fragment**:

```pdl
component Modal(
  title: String = "",
  slots: [ModalContent] = [ExampleBody(title: "", body: "")]
) layout {
  let Header: text = {
    content = title
    // …
  }
  children = [Header, slots]
}
```

**Bake / interpret:**

```text
children = [Header, slots]
                ↓
children = [Header, Body0, Body1, …]   // each baked instance root
```

| Rule | Suggestion |
|------|------------|
| Where | `children = […]` and deferred `X.children = […]` |
| Mixed | `[Header, slots, Footer]` — splice in place, preserve order |
| Empty | Splice nothing |
| Depth | Expand one list level at the reference site (v1) |
| Validation | Every element must conform to the array’s bound |

### 5.3 Nested digestion (finite trees)

Parent fixtures/packs may nest instance objects that mirror child `expose`:

```pdl
fixtures UpsellModal {
  example "Pro upgrade" {
    title = "Go Pro"
    body = "Unlimited projects."
    primary = ReusableButton(label: "Upgrade", emphasis: .primary)
    secondary = ReusableButton(label: "Not now", emphasis: .ghost)
  }
}
```

(Or `primary` / `secondary` as **bundle-typed** params matching `ReusableButton`—same idea as length-1 slots.)

Each layer digests its scalars and forwards nested instances to children. **No** stringly `fixture["key"]` in `.pdl` authoring; nesting is structural.

### 5.4 Explicitly out: `isType`

Container logic like `if slot.isType(UpsellBody)` is an **anti-pattern**: it recreates variant explosion inside the shell. Diversity belongs on slotted components. Omit `isType` from v1 (and treat later additions as discouraged escapes).

---

## 6. Optional expandable `ForEach`

### 6.1 When

Only when the **parent** must emit chrome around list items (dividers, spacing frames, first/last ornaments). The happy path remains bare `slots` in `children`.

### 6.2 Sketch

```pdl
ForEach(slots) {
  before {
    let TopRule: layout = { /* … */ }
    children = [TopRule]
  }
  between {
    let Divider: layout = { /* … */ }
    children = [Divider]
  }
  after {
    let BottomPad: layout = { /* … */ }
    children = [BottomPad]
  }
}
```

**Expansion semantics** (conceptual):

```text
slots = [A, B, C]

before + A + between + B + between + C + after
```

- **`before` / `after`**: optional fragments once per list.  
- **`between`**: optional fragment **between** consecutive items (not after the last).  
- Implicit **item body**: mount each baked slot instance (no per-item closure required for v1).  
- If a future per-item wrap is needed, prefer wrapping inside the conformer, or a later explicit item body—**not** `isType`.

### 6.3 v1 recommendation

- Ship **array expansion in `children`** first.  
- Add `ForEach` + `before` / `between` / `after` when a real shell needs it.  
- Do not block protocols/slots on `ForEach`.

---

## 7. Dual fixtures

### 7.1 Same shape, two sources

| Kind | Name | Typed? | Source | When validated |
|------|------|--------|--------|----------------|
| **A. PDL fixtures** | `fixtures Component { example "…" { … } }` | **Strict** (load/merge) | `.pdl` | Compile / catalogue |
| **B. Injection pack** | JSON document | **Malleable in source**, gated at inject | API, shim, file, LAN | Inject / mount time |

Both represent **instance trees**: scalars + nested `{ component, params }` / instance literals.

Designers author **A**. Apps and generators emit **B**. Runtime always consumes a validated instance tree (from either path).

### 7.2 PDL fixtures (strict)

Remain the design-time contract (§11 extended for instances and arrays):

```pdl
fixtures Modal {
  example "Upgrade" {
    title = "Go Pro"
    slots = [
      UpsellBody(headline: "Unlimited projects", cta: "Upgrade")
    ]
  }
}
```

- Unknown params / type mismatches / non-conformers → **hard errors**.  
- Example labels stay display strings for studios and tests.  
- Catalogue continues to serialize fixtures for tooling.

### 7.3 Injection packs (external / runtime)

```json
{
  "schemaVersion": "1.0.0-beta",
  "component": "Modal",
  "theme": "Light",
  "params": {
    "title": "Go Pro",
    "slots": [
      {
        "component": "UpsellBody",
        "params": {
          "headline": "Unlimited projects",
          "cta": "Upgrade"
        }
      }
    ]
  }
}
```

**Properties:**

- Targets **component names** (fragile if renamed—mitigate with catalogue validation + CI for checked-in packs).  
- Can be **generated from APIs** via a normalizer (`Dto → pack`).  
- **Lazy**: parse at mount; do not require Mac-side PDL rewrite.  
- After validation, identical bake path to a resolved fixture example.

**Inject gate:**

1. `schemaVersion` compatible with core.  
2. Root / nested `component` exists in catalogue.  
3. Protocol bounds satisfied (`conformsTo`).  
4. Params ⊆ allowed set (`expose` policy or all declared params).  
5. On failure: reject mount, skip item, or prototype placeholder—**never** silent mis-bind.

### 7.4 Homogeneous vs polymorphic packs

**Uniform list:**

```json
"cards": {
  "items": [
    { "component": "ContentCard", "params": { "title": "…", "imageUrl": "…" } }
  ]
}
```

(Or omit per-item `component` when the param type is a concrete `[ContentCard]`—engine fills it in.)

**Polymorphic / protocol list:**

```json
"rows": [
  { "component": "HostCard", "params": { "title": "Acme", "badge": "Verified" } },
  { "component": "UserCard", "params": { "name": "Alex", "avatarUrl": "…" } }
]
```

Each `component` must conform to the param’s protocol (`FeedRow`, etc.).

### 7.5 Bridge between A and B

- **Export:** catalogue / CLI can emit an injection pack from a named PDL fixture (golden demos, LAN peers).  
- **Import:** checked-in packs validated in CI against the same catalogue.  
- **Normalizer:** only place that knows vendor API shapes.

---

## 8. End-to-end flows

### 8.1 Design-time (typed fixture)

```text
.pdl fixtures
  → loadDesign / validate
  → catalogue.fixtures["Modal"]["Upgrade"]
  → bake(Modal, fixture params)
  → expand [ModalContent] into children
  → view runtime (HTML / SwiftUI)
```

### 8.2 Runtime API (injection pack)

```text
API → normalizer → Injection Pack JSON
  → validate vs catalogue (+ protocols)
  → bake(Modal, pack.params)
  → expand slots
  → view runtime
```

### 8.3 Page of data (home)

- **Chrome** (`title`, `userName`, FAB): scalars on `HomePage` / fixture / pack.  
- **Carousels:** `[ContentCard]` (or section components whose list params expand).  
- **Mixed feed:** `[FeedRow]` protocol + pack items with per-row `component`.  
- Prefer a **canonical PDL fixture** for offline “feels real” demos; swap pack for live/shim data without editing layout.

---

## 9. Catalogue & bake implications

| Addition | Purpose |
|----------|---------|
| `protocols` map | Name → constraints |
| `components[C].conformsTo` | Protocol list |
| Param `type: { kind: "array", element: "ModalContent" }` | Array/protocol params |
| Fixture values | Allow instance literals / arrays in serialized fixtures |
| Bake | Expand list fragments; optional `ForEach` chrome nodes |
| Manifest / host SDK | Document slot params and protocols for binders |

Portable core (Rust, per portable-core proposal) owns expand + validate; platform runtimes only see baked frames (plus optional unresolved repeat IR if live lists are deferred—product choice).

**Recommendation:** for static packs, **expand at bake**. For live-updating lists, either rebake the parent or keep a small repeat IR—document one approach per platform host.

---

## 10. Phased delivery

| Phase | Deliverable |
|-------|-------------|
| **0** | Spec this proposal; extend open items in `SPEC_GAPS` / §19 as needed |
| **1** | Catalogue metadata: protocols + `conformsTo` (even if authored as JSON/sidecar first) |
| **2** | Injection pack schema + validate + bake path (TS reference) |
| **3** | PDL: `protocol` / `conform` / `[T]` params / instance literals in fixtures |
| **4** | Expand list params in `children` |
| **5** | Optional `ForEach` + `before` / `between` / `after` |
| **6** | Host SDK mount(scene, pack); SwiftUI / HTML parity tests |
| **7** | Fixture ↔ pack export in CLI; CI goldens |

---

## 11. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Rename breaks packs | Catalogue gate; codemods; stable aliases later |
| Oversized protocols | Narrow contracts; multiple small protocols |
| `ForEach` complexity early | Ship expand-in-children first |
| Designers editing raw JSON | Studio edits PDL fixtures; packs are eng/API |
| Dual sources drift | Export fixtures → packs; shared validation |
| Layout identity churn | Stable item ids in packs for hot reload |

---

## 12. Success criteria

1. A `Modal` shell accepts any `ModalContent` conformer via `slots: [ModalContent]` without Modal variants per body.  
2. `children = [Header, slots]` expands correctly for empty, one, and many items.  
3. A PDL fixture and an injection pack with the same logical tree bake to equivalent frame IR.  
4. An API normalizer can feed a home feed of mixed `HostCard` / `UserCard` through a protocol list param.  
5. No requirement for `isType` in container layout.  
6. Optional `ForEach` chrome (`before` / `between` / `after`) can be added without changing the pack schema.

---

## 13. Open questions

1. Single protocol slot param (`content: ModalContent`) vs always `[T]` (length 0..n)?  
2. `expose` policy for nested instance params—must nested keys be exposed on the child only?  
3. Item identity field name (`id` vs fixture label) for hot reload.  
4. Soft vs hard failure for bad pack items in prototype vs production hosts.  
5. Whether bake always expands or may emit repeat IR for live lists.  
6. Grammar for instance literals and `ForEach` blocks (formal EBNF in a follow-up spec patch).

---

## 14. Summary

**Protocols** make shells reusable (Figma-like slots with types).  
**`[T]` params** are the content bus for lists and multi-body regions.  
**Expansion in `children`** is the default; **`ForEach` + before/between/after** is optional list chrome.  
**Dual fixtures:** strict PDL examples for authors; JSON injection packs for APIs and runtime—**one tree shape**, catalogue-validated, then bake.

Together with the portable core proposal, this yields prototypes that look real, accept live data, and keep `.pdl` as the only authored visual source of truth.
