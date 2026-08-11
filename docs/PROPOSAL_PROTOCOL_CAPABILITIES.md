# Proposal: Protocol roles — API contracts vs host runtime powers

**Status:** accepted / implemented (2026-08-07) in Rust `pdl-core` + Playground/`renderHtml` host  
**Depends on:** `docs/PROPOSAL_SLOTS_PROTOCOLS_FIXTURES.md` (protocols, emits, interaction lanes); `docs/full-spec.md` §4a, **§4a′** (prelude stubs), §5, §8  
**Related:** Playground / `renderHtml` interactive host; editable text / forms; `InteractionState`  
**Implementation:** D0–D4 landed — `requires` / `host` marker, **`PointerInput` + `EditableText` language prelude** (normative stubs in **`full-spec` §4a′**), **PDL-E030**, **PDL-E031**, catalogue `protocolRoles` / `hostProtocols`, `editable` + host verbs + keyboard dismiss in HTML host. Canonical wiring is `self.<channel> = { … }`; `interaction` blocks are rejected (**PDL-E001**). Compat matrix (D5) still future.

---

## 1. Problem

PDL already has three different “opt-in” ideas that authors experience as one fog:

1. **Frame kinds** — `layout` / `text` / `icon` / `media` (what a node is in the draw tree).
2. **API protocols** — e.g. `ModalContent`, `SubnavItem` (shared params + `emits` for slots / mixed lists).
3. **Host-driven interaction** — `self.pressEnd = { … }` (and other prelude inbound channels), `interactionState`, and text editing / keyboard — signals that come from **outside the PDL tree** (Playground, `renderHtml`, app runtime).

Today (2) is spelled `protocol` + `component C <P>`. (3) is ambient magic with no opt-in contract. We need editable fields and richer input without:

- Overloading `text` into a kitchen-sink TextField kind, or  
- Forcing authors to swap idle/editing trees by hand, or  
- Inventing a parallel “capability” keyword unless the grammar truly needs it.

**Decision from design discussion:** keep a **single `protocol` construct**. Protocols may describe **in-tree API** *or* **host runtime powers** (or both, over time). No separate `capability` keyword in v1 of this proposal.

---

## 2. Goals

| Goal | Meaning |
|------|---------|
| **One keyword** | `protocol` covers compositional API *and* host runtime powers |
| **Clear peers** | `emits` = child → parent (in-tree); host protocols = environment → component |
| **Opt-in host powers** | Components declare which outside-tree channels/verbs they accept |
| **Editable text** | `text` kind + host protocol (e.g. `EditableText`) + string SoT — not a fifth frame kind by default |
| **Thin headers** | Prefer `component Name <P> (params) kind { }` — avoid `Kind <…>` capability soup |
| **Explicit host opt-in** | `self.<channel> = { … }` / host verbs **require** conforming to `PointerInput` / `EditableText` (or API `requires …`) — **PDL-E030**; no silent inference that skips the declaration |
| **Catalogue / HTML** | Hosts key wiring off protocol conformance (and/or inferred capabilities), not heuristics alone |
| **Future compat matrix** | Protocols may declare compatible / incompatible sets (e.g. `TouchInput` with `PointerInput`) |

### Non-goals (this proposal)

- Multi-protocol conformance syntax in v1 (`<A, B>`) — still **single `<P>`** until a follow-up  
- Separate `capability` keyword (reserved mental model only; may revisit if slot typing collides)  
- Per-keystroke `on keyboardPressed` as part of text editing v1 (belongs in a game-oriented key protocol later)  
- Full form validation, masks, IME IR, rich text  
- Making frame kinds themselves protocols (`layout` / `text` stay **kinds**)  
- `extend Type` / OO subclassing of protocols beyond what’s sketched under compatibility

---

## 3. Three layers (mental model)

Keep these distinct even though (2) and (3) share the `protocol` keyword:

| Layer | What it is | Peer | Spelling today / proposed |
|-------|------------|------|-----------------------------|
| **Kind** | Draw-tree role; exclusive per frame | Bake / layout / Figma text-or-frame | `) layout\|text\|icon\|media {` |
| **API protocol** | Shared params + component-fired `emits` for slots / lists | **Parent** in the PDL tree | `protocol SubnavItem: component { … emits { … } }` + `component C <SubnavItem>` |
| **Host protocol** | Ambient channels + host verbs + well-known state params | **Environment** outside the tree | Prelude `PointerInput` / `EditableText` + explicit conformance (`<P>` / `requires`) |

**Emits vs host protocols:**

```text
emits (protocol or component)     →  child communicates UP to parent
host protocol channels            →  system (previewHTML / app) delivers IN to component
host protocol verbs               →  component asks system to do something (beginEditing)
```

Authors’ gloss: *“`emits` talks to my parent; host protocols opt me into special messages from outside myself (e.g. Playground).”*

---

## 4. Protocol roles

### 4.1 API / structure protocols (existing)

Unchanged intent: inherit **properties and structure** for composition.

```pdl
protocol SubnavItem: component {
  title: String = ""
  filter: FilterId = .all
  emits {
    select(filter: FilterId)
  }
}

component FilterChip <SubnavItem>(…) layout { … }
```

Valid as slot / array element types: `chips: [SubnavItem]`.

### 4.2 Host / runtime protocols (new role)

Inherit **runtime powers and extra states**: which ambient events exist, which host verbs are legal, which well-known params the host may drive.

```pdl
// Canonical file: test-fixtures/pdl/stdlib/host_protocols.pdl
// Normative prose: docs/full-spec.md §4a′.
// Authors wire inbound with self.<channel> = { … } in the kind body.
protocol PointerInput {
  host
  hoverStart
  hoverEnd
  pressStart
  pressEnd
  // …
}

protocol EditableText {
  host
  keyboardDismissed
  keyboardCancelled
  beginEditing(value)
  cancelEditing()
  commitEditing()
}
```

**Not** valid as `[PointerInput]` / `content: EditableText` slot types unless a future revision explicitly allows “host protocol as slot” (default: **reject** — host protocols are not compositional content types).

### 4.3 Combined / refined protocols

A product protocol may **require** a host protocol (same idea as Swift protocol inheritance), without a second keyword:

```pdl
protocol FormField: component {
  requires PointerInput      // spelling TBD — see §7
  requires EditableText
  value: String = ""
  placeholder: String = ""
  emits {
    change(value: String)
  }
}

component SearchField <FormField>(
  value: String = "",
  placeholder: String = "Search",
  editing: Bool = false
) text {
  editable = value
  // content / placeholder via if editing …
  self.pressEnd = {
    if editing { } else {
      editing = true
      beginEditing(value)
    }
  }
  self.keyboardDismissed = {
    editing = false
    emit change(value)
  }
  self.keyboardCancelled = {
    editing = false
    cancelEditing()
  }
}
```

Header stays: `component Name <Protocol>? (params) Kind { }` — **no** `Kind <Capability>` angle brackets. Canonical host wiring: `self.<channel> = { … }` ([full-spec §4a′](full-spec.md)).

---

## 5. Signal lanes

| Lane | Producer | Handler | In public `emits`? |
|------|----------|---------|---------------------|
| **Declared emits** | Child `emit select(…)` | Parent **layout** / `ForEach` `item.select(…) = { … }` | Yes |
| **Host-inbound** | Runtime (pointer, keyboard dismiss, …) | Component kind body `self.pressEnd = { … }` | No |
| **Host verbs** | Component (`beginEditing`, …) | Host session | No — not parent API |

Do **not** invent `parent.doneButtonPressed`. Cross-child dismiss stays **child `emit` → parent layout handler assignment**.

---

## 6. Editable text (first consumer)

| Choice | Decision |
|--------|----------|
| Kind | Stay on **`text`** |
| Host protocol | **`EditableText`** (name TBD) |
| String SoT | Controlled param (e.g. `value`); frame `editable = value` names the bind target |
| Chrome state | `editing: Bool` and/or extend `InteractionState` — prefer **orthogonal `editing`** if hover+focus must coexist; `.editing` case OK for v1 demos with documented precedence |
| Placeholder | Author `if`s — not a language primitive |
| Tree swap idle↔editing | Escape hatch only — **not** the default |
| Figma / Sketch | Export focused/editing as **variant** + text layer content; binding/session ignored |
| Static bake | `content` after overrides; caret only in interactive host |
| Per-key events | Out of EditableText v1 |

---

## 7. Surface syntax (proposal)

### Normative spine (keep)

```pdl
component Name <ApiOrHostOrCombinedProtocol>?(
  params…
) kind {
  …
} interaction? {
  …
}
```

### Host protocol definitions

Ship as **language prelude** (always in scope — not pack-imported). Spec host matrix in `full-spec` §4a is the shared author/host contract. Exact body grammar for “channels” and “verbs” is an implementation slice; minimum catalogue surface:

```json
"conformsTo": "FormField",
"hostProtocols": ["PointerInput", "EditableText"]
```

(or flatten into `protocols` + `protocolRoles: { "PointerInput": "host", "SubnavItem": "api" }`)

### `requires` (recommended spelling)

```pdl
protocol FormField: component {
  requires EditableText
  requires PointerInput
  value: String = ""
  emits { change(value: String) }
}
```

Alternative if `requires` is too English-keyword-heavy: `protocol FormField: EditableText, PointerInput { … }` (Swift-like). **Pick one in implementation;** prefer `requires` for readability next to existing PDL.

### Explicit host opt-in (normative)

| Evidence in component | Required host protocol |
|----------------------|------------------------|
| `self.pressEnd` / other Pointer inbound | `PointerInput` (direct `<PointerInput>` or API `requires PointerInput`) |
| `self.keyboardDismissed` / verbs `beginEditing` / … | `EditableText` |

Missing coverage → **PDL-E030**. Catalogue records effective `hostProtocols[]` and root `protocolRoles` so hosts do not guess from prop names alone.

### Explicit attach (escape hatch only)

If inference is insufficient (rare):

```pdl
protocol EditableText for SearchField   // or: SearchField conforms host EditableText
```

Avoid bloating the component header with multi-capability lists by default.

---

## 8. Compatibility matrix (future)

v1: single `<P>`; clashes minimal (no multi-conform, no class inheritance).

Later:

| Relation | Example | Meaning |
|----------|---------|---------|
| **Compatible** | `TouchInput` + `PointerInput` | May conform to both; hosts merge event sets |
| **Incompatible** | (TBD) e.g. two exclusive editor sessions | Validate error if both required/conformed |
| **Requires** | `FormField` → `EditableText` | Conforming to API protocol implies host protocol |

Declaration sketch (non-normative until scheduled):

```pdl
protocol TouchInput {
  compatibleWith PointerInput
}

protocol SomeExclusiveEditor {
  incompatibleWith EditableText
}
```

---

## 9. Relationship to frame kinds

**Kinds are not protocols.**  
`layout` / `text` / `icon` / `media` remain exclusive draw roles. Host protocols **refine** kinds (`text` + `EditableText`). No ctor / kind sugar (`TextField()`, `field`, …) — that reads like a parallel object class; authors opt in with `<EditableText>` on ordinary `text` (or layout-shell) components.

---

## 10. Worked end-to-end (target experience)

```pdl
enum InteractionState {
  case rest
  case hovered
  case pressed
}

protocol FormField: component {
  requires EditableText
  requires PointerInput
  value: String = ""
  placeholder: String = ""
  emits { change(value: String) }
}

component SearchField <FormField>(
  value: String = "",
  placeholder: String = "Search",
  interactionState: InteractionState = .rest,
  editing: Bool = false
) text {
  editable = value

  if editing {
    content = value
  } else if value == "" {
    content = placeholder
  } else {
    content = value
  }

  if interactionState == .hovered { opacity = 0.92 }
  if editing { borderColor = #0066FF }

  self.pressEnd = {
    if editing { } else {
      editing = true
      beginEditing(value)
    }
  }
  self.hoverStart = { interactionState = .hovered }
  self.hoverEnd = { interactionState = .rest }
  self.keyboardDismissed = {
    editing = false
    emit change(value)
  }
  self.keyboardCancelled = {
    editing = false
    cancelEditing()
  }
}

component SearchBar(query: String = "") layout {
  let Field = SearchField(value: query)
  children = [Field]
  Field.change(value: String) = {
    query = value
  }
}
```

**Parent** hears `change` via emits. **Host** delivers pointer/keyboard via `EditableText` / `PointerInput`. **Kind** stays `text`.

---

## 11. Implementation slices (suggested)

| Slice | Scope |
|-------|--------|
| **D0 — Spec** | Fold §4a “protocol roles” + host vs API + emits dual into `docs/full-spec.md`; note in `SPEC_GAPS.md` / locked decisions |
| **D1 — Catalogue** | `protocolRoles` or `hostProtocols[]`; reject host protocols as `[T]` slot types |
| **D2 — PointerInput** | Document today’s ambient pointer events as `PointerInput`; infer from `interaction`; Playground already wires — make conformance explicit in catalogue |
| **D3 — EditableText** | Frame prop `editable = param`; verbs `beginEditing` / `cancelEditing`; ambient `keyboardDismissed` / `keyboardCancelled`; Playground `<input>` / contenteditable bind |
| **D4 — FormField stdlib** | Optional prelude protocol + fixture pack |
| **D5 — Compat matrix** | `requires` / `compatibleWith` / `incompatibleWith` when multi-conform lands |

---

## 12. Open questions

1. Exact names: `EditableText` vs `TextInput`; `keyboardCancelled` vs `keyboardExited`.  
2. `editing: Bool` vs `InteractionState.editing` vs both.  
3. Spelling of `requires` vs Swift-like `protocol FormField: EditableText`.  
4. ~~Whether `interaction { }` without host protocol errors~~ → **PDL-E030** (locked).  
5. Multi-field forms: `beginEditing(value)` vs `beginEditing(Field, value)` when several `editable` texts exist.  
6. Commit path: **locked** — host writes the bound param; `emit change` is optional parent notification.  
7. When multi-`<P>` arrives, whether API + host share one list or stay “one API in `<>`, host via `requires` only.”  
8. Orthogonal `editing: Bool` preferred over `InteractionState.editing` (locked for demos).

---

## 13. Acceptance criteria

- Spec states **two protocol roles** (API vs host) under one `protocol` keyword.  
- Spec states **emits = up-tree**, **host protocols = outside-tree**.  
- Host protocols **must not** be usable as slot/array element types (validate error).  
- Editable field story is **`text` + host protocol + string bind**, not idle/editing tree swap by default.  
- Component declaration spine unchanged; no `Kind <Protocol>` capability brackets.  
- Catalogue exposes enough for Playground / `renderHtml` to wire pointer + editing without guessing from prop names alone.  
- Compatibility / incompatibility is reserved language; not required for D0–D3.

---

## 14. Summary for implementers

> Protocols remain the single conformance mechanism. Some protocols are **API contracts** (params + emits for parents). Some are **host runtime powers** (ambient events + verbs + state for Playground/HTML). `emits` still mean child→parent. Editable fields opt into a host protocol on a `text` kind and bind a String param; focus/editing chrome uses ordinary params/`if`. Keep headers thin via `requires` + inference; add a compat matrix later when multiple conformance exists.
