# Proposal: Protocols, Slots, Expandable Lists, Emits & Dual Fixtures

**Status:** accepted (2026-08-05) — **B1–B5** shipped in Rust; **B6** chrome deferred; **B7** host dispatch open. **Superseded as binding spec** by `shared/language-objects.json` + `grammar/pdl.ebnf`.  
**Depends on:** `docs/PROPOSAL_PORTABLE_CORE.md` (portable core, bake → native views)  
**Related:** language-objects (`protocols`, `forEach`, `emits`, `arrayChildren`, `samples`) · `shared/schema/injection-pack.json`  
**See also:** `docs/PROPOSAL_TYPED_SAMPLES.md` (accepted; folded into `samples`)  
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
| **Typed samples (later)** | Design-global `samples` banks (`Bank.entry.field`) for PDL-authored catalogs — see §11a; does **not** replace injection packs |
| **Thin happy path** | Placing `slots` in `children` is enough; no mandatory `ForEach` |
| **Optional list chrome / binding** | `ForEach` when the parent needs chrome or **derived child params** |
| **Layout as view body** | Structure **down** and local emit capture **up** live together in `layout` |
| **Host inbound in the kind body** | `self.pressEnd = { … }` (§4a′); `interaction` keyword removed |
| **Public contracts** | All **params** inbound; **`emits`** / protocols outbound — no `expose` filter |
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
| **`params` / `emits` / `protocol`** | What parents may pass in and hear out | Public API (all params; emits out) |
| **`layout` / kind body** | Child tree **and** emit capture **and** host inbound (`self.pressEnd = { … }`) | SwiftUI `body` + environment handlers |
| **Host inbound** | `self.<channel> = { … }` in the kind body (§4a′) | Catalogue `interactions[]` (name `default`) |

### 3.1 One assignment family, two signal kinds

```text
self.<hostChannel> = { … }     // kind body — environment → this component
item.<emitChannel>(…) = { … }  // parent layout / ForEach — child → parent
```

| Signal kind | Produced by | Handled in | In `emits`? |
|-------------|-------------|------------|-------------|
| **Host inbound** | Runtime (`hoverStart`, `pressEnd`, …) — prelude §4a′ | Kind body `self.<channel> = { … }` | No — not a public parent API |
| **Declared emits** | Child (`emit select(filter)`) | Parent **`layout`** / ForEach `item.select(…) = { … }` | Yes — catalogued contract |

Same consistency: *when this happens, run this.* Host channels are environment inputs; declared emits are the **public** upward channel.

### 3.2 `layout` — stack down and stack up

`layout` already does more than spacing: it composes under variants, state, and fixture/pack inputs. It defines the **stack down** (`children`, expandable slots, `ForEach`) and the **stack back up**: capture **child emits** and assign local params.

Sibling companions like `on LibrarySubnav { … }` are **not** preferred for child→parent wiring. Keep **`emits`** as the output contract (inline or companion); keep **composition + emit capture** in `layout`.

### 3.3 Host inbound — kind body

Host handlers are **not** a second styling system. They **feed params** (and fire `emit`) that the kind body already branches on. Normative channel list: **`full-spec` §4a′**.

```pdl
// Canonical — host inbound in the kind body
component FilterChip(
  filter: FilterId = .all,
  selected: Bool = false,
  interactionState: ChipState = .rest
) layout {
  if interactionState == .hovered { … }
  if selected { … }
  self.hoverStart = { interactionState = .hovered }
  self.hoverEnd = { interactionState = .rest }
  self.pressEnd = { emit select(filter) }
}

```

### 3.4 Instances carry host handlers

When a parent mounts instances (`ForEach(chips)`, `children = [slots]`, `FilterChip(…)`), each instance **automatically attaches that component type’s host-handler dispatcher**. The parent does **not** re-wrap `hoverStart` at the call site.

```text
Host hit-test → FilterChip instance
  → runs FilterChip host handlers (self.pressEnd = …)
  → maybe emit select(filter)
  → parent layout chip.select(filter_id: FilterId) = { … }
```

| Node | Host handlers? |
|------|----------------|
| Component with `self.<channel> = { … }` | Yes — type’s handlers on every instance |
| Component with no host handlers | Host default (none / optional system highlight) |
| Bare `let` `layout` / `text` frames | No host-handler bundle |
| Protocol slot instance | Whatever **concrete** component was mounted |

So: every **interactive component instance** behaves as if it has that dispatcher; handlers are **defined once on the type**, inherited at instantiate/bake—not authored per use in the parent’s layout.

```text
Parents see:     params (all), emits, protocol conformance
This view body:  layout { children / ForEach / item.select(…) = { … } }
This events:     self.hoverStart = { … }; emit select  // host → params/emit
Instance:        layout tree + attached host dispatcher (if any) + emit outlet
```

---

## 4. Concepts at a glance

```text
protocol SubnavItem {
  title = ""
  filter: FilterId = .all
  emits {
    select(filter: FilterId)
  }
}

component FilterChip <SubnavItem>(
  selected: Bool = false,
  interactionState: ChipState = .rest
) layout {
  if interactionState == .hovered { … }
  if selected { … }
  self.hoverStart = { interactionState = .hovered }
  self.hoverEnd = { interactionState = .rest }
  self.pressEnd = { emit select(filter) }
}

emits FilterChip { select(filter: FilterId) }   // may be inherited from protocol; see §8

component LibrarySubnav(
  currentFilter: FilterId = .all,
  chips: [SubnavItem] = [
    FilterChip(title: "All", filter: .all),
    FilterChip(title: "Podcasts", filter: .podcasts)
  ]
) layout {
  direction = .row
  ForEach(chips) {
    selected: self.currentFilter
    select(filter_id: FilterId) = {
      currentFilter = filter_id
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
    select(filter: FilterId)
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
| Capture list emits next to composition | `select(…) = { … }` inside that `ForEach` / beside the list |

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
    selected: self.currentFilter

    select(filter_id: FilterId) = {
      currentFilter = filter_id
    }
  }
}
```

- **Pattern A:** `selected: self.currentFilter` passes the parent **FilterId** SoT (kwarg form; `self.` = enclosing component). The chip compares `selected == filter` locally.  
- Fixtures may still snapshot a concrete `selected: .podcasts`; live prototypes prefer parent SoT + pass-through.  
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
  select(filter: FilterId)
}

// or on the protocol — mixed types, one channel
protocol SubnavItem {
  title = ""
  filter: FilterId = .all
  emits {
    select(filter: FilterId)
  }
}
```

Children **never** know their parent. They only declare and fire intents.

### 8.2 Fire — host inbound → `emit`

Host channels are **part of the component** (kind body), not a foreign sidecar. Prelude list: **`full-spec` §4a′**.

**Canonical** (preferred when co-located):

```pdl
component FilterChip(…) layout {
  if interactionState == .hovered { … }
  self.hoverStart = { interactionState = .hovered }
  self.hoverEnd = { interactionState = .rest }
  self.pressEnd = { emit select(filter) }
}
```

| Rule | Intent |
|------|--------|
| Role | Subscribe to **host inbound** → **param assignments** and/or **`emit`** |
| Host vs public | `pressEnd` etc. are host-synthesized; not listed in `emits` |
| Not responsible for | Drawing hover/press — that stays in kind-body `if` chains |
| Promote | `self.pressEnd = { emit select(filter) }` turns host press into a **declared** intent |
| Payload | Fire args type-check against `emits` / protocol `emits`; may include ids, `self`, or protocol-typed items |
| Instances | Type’s host handlers attach automatically when the component is mounted |
| Studio knobs | Ordinary params (e.g. `interactionState`); hosts may ignore by convention — no `expose` |

Host inbound (`self.…`) and declared-emit capture (`item.…`) share the `= { … }` shape but listen to **different signal namespaces**. Parents never re-author the child’s host handlers at the call site.

### 8.3 Capture — in `layout` (view body)

```pdl
ForEach(chips) { chip in
  chip.selected = self.currentFilter == filter
  chip.select(filter_id: FilterId) = {
    currentFilter = filter_id
  }
}
```

List-param capture `chips.select(…) = { … }` is **rejected** (**PDL-E036**). Capture only via ForEach binder (`chip.select`) or a concrete let/slot (`Field.change`).

| Rule | Intent |
|------|--------|
| Where | Inside `layout`, next to the children / `ForEach` that introduce the emitters |
| Who | Parent view registers interest; child has no parent pointer |
| Payload | Typed fields at capture: `chip.select(filter_id: FilterId) = { … }`; child may also emit `self` / protocol-typed items |
| Unhandled | Bubble to page / **prototype runtime** |

One ForEach binder capture per list channel is enough.

### 8.4 Two lanes

| Lane | Captured by | Examples |
|------|-------------|----------|
| **Local** | Parent `layout` / ForEach handler assignment | Filter select → `currentFilter`; simple toggle chrome |
| **Prototype / app** | Prototype runtime | `openEpisode(id)`, `back()`, `dismiss()`, DB/API, nav stack |

```text
emit select(filter)
  → LibrarySubnav select(filter_id: FilterId) = { … } → currentFilter = filter_id → rebind selected
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

**Follow-on (2026-08-16):** [`PROPOSAL_ROUTING_PAGES_SCREENS.md`](./PROPOSAL_ROUTING_PAGES_SCREENS.md) proposes `page` / `screen` roles and **`emits(propagation: .parent | .ancestors)`** — ancestor climb until a screen (or other capturing ancestor) handles nav emits. Not a reserved protocol name; not a Studio singleton sink.

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
  → layout select(…) = { … } → currentFilter = filter
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
| **5** | `emits` + `emit`; host inbound (`self.…` / transitional `interaction`); layout emit capture |
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
| Param-name coupling (`chips.select`) | Prefer protocol-shared emits; ForEach-local `select(…) = { … }` sugar |
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
2. ~~Does conforming imply protocol params are in `expose` by default?~~ **Resolved:** `expose` removed; all params public.  
3. Item identity field conventions (`id` vs domain keys like `filter` / `episodeId`).
4. ~~Soft vs hard failure for bad pack items~~ **Decided: soft skip/placeholder with warning.**  
5. Bake-always-expand vs repeat IR for live lists.  
6. Formal EBNF for `component C <P>`, host inbound / transitional `interaction`, `emits`, emit capture, `ForEach`.  
7. Multiple protocols per component (`<A, B>`) in v1?  
8. Protocol-qualified capture sugar (`on SubnavItem.select`) vs slot-qualified only?  
9. ~~Shape of optional `prototype { routes … }` authoring vs host-only JSON.~~  
10. ~~Merge / ambient event override rules for `interaction`.~~ **Decided** (see IMPLEMENTATION_PLAN Q3/Q3b).  
11. ~~`schemaVersion` strategy for B1.~~ **Decided: keep simple `1.0.0` / 1.0 lineage while pre-release — no public version theater yet.**


---

## 16. Summary

**Protocols** declare shared params and optional **emits**; **`component Name <Protocol>(…)`** opts in on the declaration.  
**`[T]` params** are the content bus; they **expand in `children`**.  
**`layout` is the view body**: stack down (children / ForEach) and stack up (local `select(filter_id: FilterId) = { … }` capture of **declared emits** only — ambient `on` stays in `interaction`).  
**`interaction` extends the component** (inline or external): **`on` ambient host events** → params / `emit`; attached to every mounted instance of that type.  
**One `on` syntax**, two namespaces: ambient (secret/system) vs `emits` (public).  
**`params` / `emits`** are what other parents see—not where child wiring lives. (`expose` removed.)  
**`ForEach`** adds chrome and **derived bindings** (`selected: self.currentFilter` — Pattern A); prefer **ids**, not indexes.  
**Dual fixtures:** strict PDL examples + JSON injection packs, one tree shape, catalogue-gated.  
**Unhandled emits** go to a **prototype runtime** (navigation, data)—not deeper into PDL.

Together with the portable core proposal, this yields prototypes that look real, accept live data, support local selection chrome and multi-screen flows, and keep `.pdl` as the authored visual source of truth.
