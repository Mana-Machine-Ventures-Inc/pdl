# Proposal: Protocols, Slots, Expandable Lists, Emits & Dual Fixtures

**Status:** accepted (2026-08-05) — not yet shipped in `full-spec` / compilers  
**Depends on:** `docs/PROPOSAL_PORTABLE_CORE.md` (portable core, bake → native views)  
**Related:** `docs/full-spec.md` §4 (params), §8 (interactions), §11 (fixtures / expose), §16 (catalogue / bake)  
**Implementation:** `docs/IMPLEMENTATION_PLAN.md`

---

## 1. Problem

PDL today models **scalar** component parameters (`String`, variants, …) and **flat** fixtures (one param map per example). That is enough for a button or a single card. It is not enough for:

- Pages and modals with **nested content regions**
- **Lists** of cards fed by APIs or shims
- **Mixed** lists (e.g. host cards and user cards)
- **Reusable shells** (modal, page chrome) that must accept **any** suitable body without endless internal variants
- **Prototype interaction** where child intents (e.g. filter select, open episode) must reach an owner without indexes or parent pointers

We need a content model that stays **PDL-authored and typed** for design-time truth, yet accepts **external JSON packs** for prototypes driven by real or generated data—without a second display language and without requiring `isType` forests in containers.

---

## 2. Goals

| Goal | Meaning |
|------|---------|
| **Reusable shells** | Containers declare slots/protocols; bodies plug in without editing the shell |
| **List content** | Arrays of instances expand into the tree at bake/interpret time |
| **Dual fixtures** | Strict PDL fixtures **and** malleable injection packs share one shape |
| **Thin happy path** | Placing `slots` in `children` is enough; no mandatory `ForEach` |
| **Optional list chrome / binding** | `ForEach` when the parent needs chrome or **derived child params** |
| **Layout as view body** | Structure **down** and local emit capture **up** live together in `layout` |
| **`interaction` extends the component** | Inline or external; ambient host `on` → params / `emit`; attached per instance |
| **Public contracts outside layout** | `expose` / `emits` / protocols define what **other parents** see |
| **Identity, not indexes** | Intents carry stable ids (`filter`, `episodeId`), not array positions |
| **PDL remains SoT** | Visual structure and contracts live in `.pdl`; packs only supply instance data |
| **Validate at the gate** | Unknown names / bad params fail inject or CI—not silent wrong UI |

### Non-goals

- `isType` / runtime type switching inside containers as a primary pattern  
- Making PDL a general programming language (arbitrary loops, maps, network, DB)  
- Children knowing or calling their parent  
- Foundational `[String]` / `[Bool]` / `[Number]` as expandable layout lists (prefer `[Component]` / `[Protocol]`)  
- Hand-editing injection packs as a second authoring format for designers  
- CRDT-merging of fixture trees across peers (whole-file / whole-pack sync is enough)

---

## 3. Component surfaces (mental model)

A component has these surfaces:

| Surface | Role | Analogy |
|---------|------|---------|
| **`expose` / `emits` / `protocol`** | What **parents** may pass in and hear out | Public API |
| **`layout`** | How **this** component builds its child tree **and** wires those children’s intents | SwiftUI `body` |
| **`interaction`** | How **this** component subscribes to **ambient host events** → param updates and/or `emit` | Event extension of the component |

### 3.1 One `on` shape, two signal kinds

```text
on <signal> { … }   // within this scope, when this fires, do this
```

| Signal kind | Produced by | Handled in | In `emits`? |
|-------------|-------------|------------|-------------|
| **Ambient / host events** | Runtime (`hoverStart`, `pressEnd`, `appear`, …) | That component’s **`interaction`** | No — not a public parent API |
| **Declared emits** | Child (`emit select`) | Parent **`layout`** `on select` / prototype | Yes — catalogued contract |

Same consistency: *when this happens, run this.* Ambient events are like **secret/system inputs** every interactive component instance can receive; `interaction` is how the component **calls those methods**. Declared emits are the **public** upward channel.

### 3.2 `layout` — stack down and stack up

`layout` already does more than spacing: it composes under variants, state, and fixture/pack inputs. It defines the **stack down** (`children`, expandable slots, `ForEach`) and the **stack back up**: capture **child emits** and assign local params.

Sibling companions like `on LibrarySubnav { … }` are **not** preferred for child→parent wiring. Keep contracts (`expose` / `emits`) as companions; keep **composition + emit capture** in `layout`.

### 3.3 `interaction` — component extension (inline or external)

**`interaction` stays the event metaphor** — not a second styling system. It does not draw hover/press; it **feeds params** (and fires `emit`) that `layout` already branches on.

```pdl
// Inline — attached to the component declaration
component FilterChip(
  filter: FilterId = .all,
  selected: Bool = false,
  interactionState: ChipState = .rest
) layout {
  if interactionState == .hovered { … }
  if selected == true { … }
} interaction {
  on hoverStart { interactionState = .hovered }
  on hoverEnd   { interactionState = .rest }
  on pressEnd   { emit select }
}

// External — same semantics (today’s shape, optionally named)
interaction FilterChipTap for FilterChip {
  on hoverStart { interactionState = .hovered }
  on pressEnd   { emit select }
}
```

| Form | When |
|------|------|
| **Inline `} interaction { … }`** | Default for co-located chrome + emit firing |
| **External `interaction … for Component`** | Split files, shared behaviors, or today’s merge style |

Both attach to the **same component record** after merge. **Inline** is a synthetic interaction name **`default`**. Unique names **append**; the **same name replaces** (same as §2 today). That avoids accidental duplicate bundles with one name while still allowing `default` + `Extra`.

**Event dispatch:** if two differently named bundles both define the same ambient `on` (e.g. `hoverStart`), **last wins** — treat as an **override**, not multi-fire.

### 3.4 Instances carry the interaction wrapper

When a parent mounts instances (`ForEach(chips)`, `children = [slots]`, `FilterChip(…)`), each instance **automatically attaches that component type’s `interaction` dispatcher**. The parent does **not** re-wrap `hoverStart` at the call site.

```text
Host hit-test → FilterChip instance
  → runs FilterChip.interaction (ambient ons)
  → maybe emit select
  → parent layout on select { … }
```

| Node | Ambient `interaction`? |
|------|-------------------------|
| Component with `interaction { }` / external block | Yes — type’s handlers on every instance |
| Component with no `interaction` | Host default (none / optional system highlight) |
| Bare `let` `layout` / `text` frames | No component interaction bundle |
| Protocol slot instance | Whatever **concrete** component was mounted |

So: every **interactive component instance** behaves as if it has that wrapper; the wrapper is **defined once on the type**, inherited at instantiate/bake—not authored per use in the parent’s layout.

```text
Parents see:     expose, emits, protocol conformance
This view body:  layout { children / ForEach / on select … }   // declared emits
This events:     interaction { on hoverStart …; emit select } // ambient → params/emit
Instance:        layout tree + attached interaction dispatcher (if any) + emit outlet
```

---

## 4. Concepts at a glance

```text
protocol SubnavItem {
  title = ""
  filter: FilterId = .all
  emits {
    select(filter)
  }
}

component FilterChip <SubnavItem>(
  selected: Bool = false,
  interactionState: ChipState = .rest
) layout {
  if interactionState == .hovered { … }
  if selected == true { … }
} interaction {
  on hoverStart { interactionState = .hovered }
  on hoverEnd   { interactionState = .rest }
  on pressEnd   { emit select }
}

emits FilterChip { select(filter) }   // may be inherited from protocol; see §8

component LibrarySubnav(
  currentFilter: FilterId = .all,
  chips: [SubnavItem] = [
    FilterChip(title: "All", filter: .all),
    FilterChip(title: "Podcasts", filter: .podcasts)
  ]
) layout {
  direction = .row
  ForEach(chips) {
    selected = (currentFilter == filter)
    on select { filter in
      currentFilter = filter
    }
  }
}

fixtures / injection pack → validate → bake / expand → view runtime

unhandled emits (openEpisode, back, …) → prototype runtime (routes, data, nav stack)
```

---

## 5. Protocols & conformance

### 5.1 Why

Figma-like **instance swap with constraints**: a `Modal` should not enumerate every possible body as variants. It should accept **any component that conforms** to a small contract (e.g. `ModalContent`).

Conformance is **declared on the component** (not a separate `conform` statement). The protocol defines the **shared parameter surface** and may declare **shared emits**.

### 5.2 Language sketch

```pdl
protocol ModalContent {
  title = "Modal Title"
  subtitle = ""
}

component UpsellBody <ModalContent>(
  cta: String = "Upgrade"
) layout {
  // may use title, subtitle (from protocol) and cta (own)
  …
}

component ConfirmBody <ModalContent>(
  // no extras — API is exactly protocol params
) layout { … }

component Modal(
  chromeTitle: String = "",
  slots: [ModalContent] = [UpsellBody()]
) layout {
  children = [Header, slots]
}
```

**Header form:**

```txt
component Name <Protocol>( /* additional params */ ) layout|text|icon|media { … }
```

- `<Protocol>` opts the component into slot/array positions typed as that protocol.  
- Multiple protocols later: `component X <A, B>(…)` if needed — **v1 may allow a single protocol**.  
- No separate top-level `conform` declaration.

### 5.3 Protocol body = shared params (+ optional emits)

```pdl
protocol ModalContent {
  title = "Modal Title"
  subtitle = ""
}

protocol SubnavItem {
  title = ""
  filter: FilterId = .all
  emits {
    select(filter)
  }
}
```

| Rule | Intent |
|------|--------|
| Param entries | `name = default` (and optionally `name: Type = default`) |
| Types | Infer from defaults where unambiguous; prefer explicit `: Type` when unclear |
| Inheritance | Conforming components **include** protocol params in their API automatically |
| Override defaults | Conformer **may** redeclare a protocol param with a tighter default; type must stay compatible |
| Extra params | Conformer may add params beyond the protocol |
| **Protocol `emits`** | Shared intent channel for mixed lists; any conformer may fire them |
| Slot binding | `[P]` / `P` positions require protocol fields; extras allowed when concrete type is known |

### 5.4 Normative intent (v1)

| Rule | Intent |
|------|--------|
| `protocol` | Design contract: shared params + defaults (+ optional emits) |
| `component C <P>(…)` | Declares conformance inline; `C` may appear where `P` / `[P]` is expected |
| Effective params of `C` | Protocol params ∪ component-own params |
| Effective emits of `C` | Protocol emits ∪ component `emits` block |
| Catalogue | `protocols[P].params` / `.emits` + `components[C].conformsTo` |
| Host packs | Target concrete component names; validate against protocol bounds |

### 5.5 Closed union vs open protocol

| Use | Form |
|-----|------|
| Known finite mix in one list | One protocol adopted by those cards (`FeedRow` / `SubnavItem`) |
| Open plug-in bodies | `protocol ModalContent` + any `component … <ModalContent>` |

Avoid encoding diversity as `if kind == …` on the shell. Mixed list types share **protocol emits** so the parent listens to one channel (`select`), not each concrete class.

### 5.6 Who is listened to (not layout indexes)

Capture is about **intent channels**, not predeclaring every instance:

- Membership in a list/slot param (`chips`)  
- Whether the item’s type **emits** that intent (often via protocol)  
- “Don’t care” about some on-screen chrome → keep it **out of that list**, or don’t emit  

Layout position alone must not decide capture.

---

## 6. Array params & slot injection

### 6.1 `[T]` as a foundational param type

`T` is a **component name** or a **protocol name**.

```pdl
component Modal(
  title: String = "",
  slots: [ModalContent] = [UpsellBody()]
) layout { … }

component Feed(
  rows: [FeedRow] = []
) layout { … }

component LibrarySubnav(
  chips: [SubnavItem] = []
) layout { … }
```

- **`[ModalContent]`** / **`[SubnavItem]`** — protocol lists; only conformers may appear.  
- **`[ContentCard]`** — homogeneous concrete list.

Defaults may use **instance literals**: `Name(param: value, …)`. Protocol-inherited params may be omitted when defaults suffice (`UpsellBody()`).

**Not foundational for v1:** expandable `[String]` / `[Bool]` / `[Number]`. Lists that become UI should be **instance arrays** (e.g. filter chips with `title`, not raw strings). Opaque primitive arrays as host pass-through may be considered later—they must **not** auto-expand in `children`.

### 6.2 Expansion (no `ForEach` required)

A list/protocol param referenced in `children` is an **expandable fragment**:

```pdl
component Modal(
  title: String = "",
  slots: [ModalContent] = [UpsellBody()]
) layout {
  let Header: text = {
    content = title
  }
  children = [Header, slots]
}
```

```text
children = [Header, slots]
                ↓
children = [Header, Body0, Body1, …]
```

| Rule | Suggestion |
|------|------------|
| Where | `children = […]` and deferred `X.children = […]` |
| Mixed | `[Header, slots, Footer]` — splice in place, preserve order |
| Empty | Splice nothing |
| Depth | Expand one list level at the reference site (v1) |
| Validation | Every element must conform to the array’s bound |

### 6.3 Nested digestion (finite trees)

Parent fixtures/packs may nest instance objects that mirror child contracts:

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

Each layer digests its scalars and forwards nested instances to children. Nesting is structural—**no** stringly `fixture["key"]` in `.pdl` authoring.

### 6.4 Explicitly out: `isType`

Container logic like `if slot.isType(UpsellBody)` is an **anti-pattern**. Omit from v1.

---

## 7. `ForEach` — chrome and derived bindings

### 7.1 When

| Need | Use |
|------|-----|
| Just mount instances | `children = [slots]` (no `ForEach`) |
| Dividers / before / after chrome | `ForEach` + `before` / `between` / `after` |
| Derive child params from parent SoT | `ForEach` + binding (e.g. selection) |
| Capture list emits next to composition | `on select` inside that `ForEach` / beside the list |

### 7.2 List chrome

```pdl
ForEach(slots) {
  before { … }
  between { … }
  after { … }
}
```

```text
slots = [A, B, C]
→ before + A + between + B + between + C + after
```

### 7.3 Derived bindings (filter bar)

Parent owns **one** source of truth; children get a **derived** flag. Prefer **ids/enums**, not indexes:

```pdl
component LibrarySubnav(
  currentFilter: FilterId = .all,
  chips: [SubnavItem] = [ … ]
) layout {
  direction = .row

  ForEach(chips) {
    selected = (currentFilter == filter)

    on select { filter in
      currentFilter = filter
    }
  }
}
```

- `selected = (currentFilter == filter)` is **presentation binding** in the view body.  
- Per-chip `selected: true` in fixtures remains valid as a **baked snapshot**; live prototypes prefer parent SoT + derive.  
- Do **not** require general mutable instance variables or `selectedIndex` for v1.

### 7.4 v1 sequencing

1. Expand list params in `children`.  
2. Add `ForEach` bindings + `on` capture for list SoT (filter-style).  
3. Add `before` / `between` / `after` when shells need chrome.

---

## 8. Emits — declare out, fire, capture in layout

### 8.1 Declare (`emits`) — public output API

Prefer the name **`emits`** (not `functions`): named **intents with param payloads**, not general callable methods.

```pdl
emits FilterChip {
  select(filter)
}

// or on the protocol — mixed types, one channel
protocol SubnavItem {
  title = ""
  filter: FilterId = .all
  emits {
    select(filter)
  }
}
```

Children **never** know their parent. They only declare and fire intents.

### 8.2 Fire — `interaction` as component extension

Keep the **`interaction` metaphor**. It is **part of the component**, not a foreign sidecar:

**Inline** (preferred when co-located):

```pdl
component FilterChip(…) layout {
  if interactionState == .hovered { … }
} interaction {
  on hoverStart { interactionState = .hovered }
  on hoverEnd   { interactionState = .rest }
  on pressEnd   { emit select }
}
```

**External** (allowed; same merge into the component record):

```pdl
interaction FilterChipTap for FilterChip {
  on hoverStart { interactionState = .hovered }
  on pressEnd   { emit select }
}
```

| Rule | Intent |
|------|--------|
| Role | Subscribe to **ambient host events** → **param assignments** and/or **`emit`** |
| Ambient vs public | `hoverStart` etc. are host-synthesized; not listed in `emits` |
| Not responsible for | Drawing hover/press — that stays in `layout` `if` chains |
| Promote | `on pressEnd { emit select }` turns ambient press into a **declared** intent |
| Payload | `emit select` binds fields from instance params (`filter`) |
| Instances | Type’s `interaction` attaches automatically when the component is mounted |
| Preview-only params | Prefer omitting `interactionState` from `expose` |

`on` in `interaction` and `on` in `layout` share syntax; they listen to **different signal namespaces** (ambient events vs declared emits). Parents never re-author the child’s ambient handlers at the call site.

### 8.3 Capture — in `layout` (view body)

```pdl
ForEach(chips) {
  selected = (currentFilter == filter)
  on select { filter in
    currentFilter = filter
  }
}
```

Equivalent list-hole form:

```pdl
children = [chips]
on chips.select { filter in
  currentFilter = filter
}
```

| Rule | Intent |
|------|--------|
| Where | Inside `layout`, next to the children / `ForEach` that introduce the emitters |
| Who | Parent view registers interest; child has no parent pointer |
| Payload | Stable ids / enums from child params |
| Unhandled | Bubble to page / **prototype runtime** |

One handler per list channel is enough; avoid registering N identical per-item handlers unless needed.

### 8.4 Two lanes

| Lane | Captured by | Examples |
|------|-------------|----------|
| **Local** | Parent `layout` `on …` | Filter select → `currentFilter`; simple toggle chrome |
| **Prototype / app** | Prototype runtime | `openEpisode(id)`, `back()`, `dismiss()`, DB/API, nav stack |

```text
emit select(filter)
  → LibrarySubnav on select → currentFilter = filter → rebind selected
  → small redraw

emit openEpisode(id)
  → not handled in layout
  → prototype runtime routes + data lookup
  → push EpisodePage pack
  → big redraw
```

### 8.5 Prototype runtime (out of PDL language core)

A host **environment blob** owns routes, nav stack, id-keyed data, and cross-screen UI state. PDL screens emit intents; the runtime maps them:

```text
openEpisode → push EpisodePage, packFrom data.episodes[id]
back        → pop
dismiss     → dismissModal
```

Optional `prototype { … }` structure may declare routes/handlers for a demo—**not** required inside every component. PDL does not own DB lookups or stack discipline.

---

## 9. Dual fixtures

### 9.1 Same shape, two sources

| Kind | Name | Typed? | Source | When validated |
|------|------|--------|--------|----------------|
| **A. PDL fixtures** | `fixtures Component { example "…" { … } }` | **Strict** (load/merge) | `.pdl` | Compile / catalogue |
| **B. Injection pack** | JSON document | **Malleable in source**, gated at inject | API, shim, file, LAN | Inject / mount time |

Both represent **instance trees**: scalars + nested `{ component, params }` / instance literals.

### 9.2 PDL fixtures (strict)

```pdl
fixtures Modal {
  example "Upgrade" {
    title = "Go Pro"
    slots = [
      UpsellBody(title: "Unlimited projects", cta: "Upgrade")
    ]
  }
}

fixtures LibrarySubnav {
  example "Podcasts selected" {
    currentFilter = .podcasts
    chips = [
      FilterChip(title: "All", filter: .all),
      FilterChip(title: "Podcasts", filter: .podcasts)
    ]
  }
}
```

Unknown params / type mismatches / non-conformers → **hard errors**.

### 9.3 Injection packs (external / runtime)

```json
{
  "schemaVersion": "1.0.0-beta",
  "component": "LibrarySubnav",
  "theme": "Light",
  "params": {
    "currentFilter": "podcasts",
    "chips": [
      { "component": "FilterChip", "params": { "title": "All", "filter": "all" } },
      { "component": "FilterChip", "params": { "title": "Podcasts", "filter": "podcasts" } }
    ]
  }
}
```

- Targets **component names**; catalogue validates.  
- Generable from APIs via normalizer.  
- After validation, same bake path as a fixture.

**Inject gate:** schemaVersion → component exists → protocol bounds → params allowed. Bad items: **soft skip / placeholder with warning** (do not silent-misbind; do not fail the whole mount by default).

### 9.4 Homogeneous vs polymorphic packs

Uniform: all items same `component` (or omitted when param type is concrete `[ContentCard]`).  
Polymorphic: per-item `component` must `conformsTo` the list protocol; shared **protocol emits** keep parent wiring stable.

### 9.5 Bridge

Export fixtures → packs; CI-validate packs; normalizer is the only API-specific layer.

---

## 10. End-to-end flows

### 10.1 Design-time fixture

```text
.pdl fixtures → load / validate → catalogue
  → bake + expand lists → view runtime
```

### 10.2 Injection pack

```text
API → normalizer → pack JSON → validate vs catalogue
  → bake + expand → view runtime
```

### 10.3 Local emit (filter)

```text
press FilterChip → emit select(filter)
  → layout on select → currentFilter = filter
  → ForEach rebinds selected → small refresh
```

### 10.4 Prototype navigation

```text
emit openEpisode(id) → (no local handler)
  → prototype route → push EpisodePage
  → derive pack from data[id] → bake → mount
```

---

## 11. Catalogue & bake implications

| Addition | Purpose |
|----------|---------|
| `protocols` | Params + optional emits |
| `components[C].conformsTo` | Protocol list |
| `components[C].emits` | Output intents |
| Param `type: { kind: "array", element: "…" }` | Array/protocol params |
| Fixture / pack values | Instance literals and arrays |
| Bake | Expand lists; apply ForEach bindings; attach emit handler metadata for hosts |
| Host SDK | Mount packs; dispatch emits (local reduce vs prototype routes) |

**Recommendation:** expand static packs at bake; live lists rebake parent or keep a small repeat IR—document per host.

---

## 12. Phased delivery

| Phase | Deliverable |
|-------|-------------|
| **0** | This proposal; track gaps in `SPEC_GAPS` / §19 |
| **1** | Catalogue: protocols + `conformsTo` (+ emits metadata) |
| **2** | Injection pack schema + validate + bake (TS reference) |
| **3** | PDL: `protocol` / `component C <P>` / `[T]` / instance literals |
| **4** | Expand list params in `children` |
| **5** | `emits` + `emit`; inline and external `interaction`; layout `on` capture |
| **6** | `ForEach` derived bindings (+ optional before/between/after) |
| **7** | Host SDK mount + emit dispatch; prototype runtime (routes/stack) |
| **8** | Fixture ↔ pack export; CI goldens |

---

## 13. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Rename breaks packs | Catalogue gate; aliases later |
| Oversized protocols | Narrow contracts; multiple small protocols |
| Layout becomes a script dump | Limit `on` to simple assignments; navigation stays in prototype |
| Param-name coupling (`chips.select`) | Prefer protocol-shared emits; ForEach-local `on select` sugar |
| Dual sources drift | Export fixtures → packs; shared validation |
| Index-based selection | Forbid as primary pattern; use id params |
| Identity churn on hot reload | Stable item ids in packs |

---

## 14. Success criteria

1. `Modal` accepts any `component … <ModalContent>` via `slots: [ModalContent]`.  
2. Protocol params (and optional protocol emits) appear on conformers’ effective API.  
3. `children = [Header, slots]` expands for empty / one / many.  
4. PDL fixture and injection pack with the same tree bake equivalently.  
5. Mixed `HostCard` / `UserCard` (or filter chip types) work through a protocol list + shared emits.  
6. `LibrarySubnav` can own `currentFilter`, derive `selected` in `ForEach`, and capture `select` **in layout** without indexes.  
7. Unhandled emits can reach a prototype runtime for push/back/dismiss and data lookup.  
8. No `isType` requirement; children never reference parents.

---

## 15. Open questions

1. ~~Single protocol slot (`content: ModalContent`) vs always `[T]`?~~ **Decided: both.**  
2. Does conforming imply protocol params are in `expose` by default?  
3. Item identity field conventions (`id` vs domain keys like `filter` / `episodeId`).
4. ~~Soft vs hard failure for bad pack items~~ **Decided: soft skip/placeholder with warning.**  
5. Bake-always-expand vs repeat IR for live lists.  
6. Formal EBNF for `component C <P>`, inline `interaction`, `emits`, layout `on`, `ForEach`.  
7. Multiple protocols per component (`<A, B>`) in v1?  
8. Protocol-qualified capture sugar (`on SubnavItem.select`) vs slot-qualified only?  
9. ~~Shape of optional `prototype { routes … }` authoring vs host-only JSON.~~  
10. ~~Merge / ambient event override rules for `interaction`.~~ **Decided** (see IMPLEMENTATION_PLAN Q3/Q3b).  
11. ~~`schemaVersion` strategy for B1.~~ **Decided: keep simple `1.0.0` / 1.0 lineage while pre-release — no public version theater yet.**


---

## 16. Summary

**Protocols** declare shared params and optional **emits**; **`component Name <Protocol>(…)`** opts in on the declaration.  
**`[T]` params** are the content bus; they **expand in `children`**.  
**`layout` is the view body**: stack down (children / ForEach) and stack up (local `on` capture of **declared emits**).  
**`interaction` extends the component** (inline or external): **`on` ambient host events** → params / `emit`; attached to every mounted instance of that type.  
**One `on` syntax**, two namespaces: ambient (secret/system) vs `emits` (public).  
**`expose` / `emits`** are what other parents see—not where child wiring lives.  
**`ForEach`** adds chrome and **derived bindings** (`selected = currentFilter == filter`); prefer **ids**, not indexes.  
**Dual fixtures:** strict PDL examples + JSON injection packs, one tree shape, catalogue-gated.  
**Unhandled emits** go to a **prototype runtime** (navigation, data)—not deeper into PDL.

Together with the portable core proposal, this yields prototypes that look real, accept live data, support local selection chrome and multi-screen flows, and keep `.pdl` as the authored visual source of truth.
