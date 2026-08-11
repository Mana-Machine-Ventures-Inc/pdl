# Proposal: TextField editing sessions (host protocol package)

**Status:** accepted / implementing (2026-08-11; `value` locked — M1–M3 landed: prelude, injected facts, HTML session host, fixture migrate)  
**Depends on:** `docs/full-spec.md` §4a / §4a′ / §5 / §8; `docs/PROPOSAL_PROTOCOL_CAPABILITIES.md`; `test-fixtures/pdl/stdlib/host_protocols.pdl`; World A (`docs/PROPOSAL_WORLD_A_EXPRESSION_TREES.md`)  
**Related:** Playground / `renderHtml` editable host; future value controls (Slider, Picker, …)  
**Supersedes (authoring):** param-live bind `editable = someAuthorParam` + bare `beginEditing(value)` / `keyboardDismissed` as the *primary* field API

---

## 1. Problem

Today’s EditableText surface collapses three concerns into one bind:

```pdl
editable = value
beginEditing(value)
self.keyboardDismissed = { … }
```

That conflates:

1. **Which node** is first responder  
2. **Which string** is the author’s committed SoT  
3. **When** an editing session starts and ends  

Authors reinvent session chrome (`phase: FieldPhase`, checkpoints). Per-key UI lacks closed **facts**. And the surface doesn’t match the reusable pattern we already have for pointer:

> Conforming to **`PointerInput`** opts a component into ambient **inbound channels**, host-driven lifecycle, and handler wiring (`pressEnd = { … }`).

Editing should be the same kind of **host protocol capability package** — not a one-off stdlib widget with private magic.

---

## 2. Preferred metaphor: host protocol = capability package

`PointerInput` already means: *opt in → the runtime attaches a surface*.

| Package piece | `PointerInput` today | Editing (proposed) |
|---------------|----------------------|--------------------|
| **Opt-in** | `component C <PointerInput>` / `requires` | `component C <EditableText>` (name TBD — see §7) |
| **Inbound channels** (env → component) | `pressEnd`, `hoverStart`, … | `editingBegan`, `editingFinished(newValue:)`, `editingCancelled` |
| **Host verbs** (component → env) | (none yet) | `beginEditing(startingValue:)`, `finishEditing()`, `cancelEditing()` |
| **Well-known runtime state** | (implicit: hover/press via host) | Explicit facts / params: `isEditing`, `isEmpty`, `isOverLimit`, `value` (String), limits |
| **Not** child→parent `emits` | Correct — host inbound ≠ emits | Same: session events are **host inbound**. Optional `emit change` remains for parent API |

Authors’ gloss (extended):

> *“`emits` talks to my parent. Host protocols opt me into messages and powers from outside myself — pointer, keyboard session, later drag/picker.”*

**Decision lean:** grow **`EditableText`** into a full host protocol package. The **reusable unit is the protocol** on ordinary `text` (or layout-shell) components — not a special IR control and **not** a `TextField()` ctor sugar (rejected: reads like a parallel object class).

### Why this beats “private buffer outside the language”

A “control owns a secret buffer” story is hard to teach and hard to reuse on non-`text` shells. A protocol that **injects `value` + facts + verbs + inbound** is the same teaching as PointerInput, and closes the loop in the language:

```text
host keystrokes  →  protocol `value` (String — session string the keyboard is editing)
author layout    →  `content = …` (what the user sees — often `self.value`, sometimes masked)
layout `if`      →  protocol facts (`isEditing`, `isEmpty`, `isOverLimit`)
finish/cancel    →  host inbound → author copies `value` into their SoT (or not)
```

**`content` and `value` are different jobs.** `content` is the text frame’s presentation. `value` is the control’s session string (same name as Toggle/Slider `value`, typed String here). Declaring both lets authors map freely (plaintext field, password dots, formatted display).

### Default activation vs PointerInput

Minimal authoring:

```pdl
component MyTextField <EditableText>() text {
  content = value
  editingFinished = { finishEditing() }
}
```

…does **not** declare a hit target or `pressEnd`. That is intentional: **EditableText’s host policy** for a text-root field includes default activation (click/tap/focus → `beginEditing` with current `value`). Preview HTML following that policy is **in-spec**, not a Playground cheat.

| Concern | Owner |
|---------|--------|
| General pointer / hover / press API | **`PointerInput`** — author wires `pressEnd`, etc. |
| “This text field starts a keyboard session when activated” | **`EditableText`** default for text-root leaves |
| Custom start (toolbar Edit, not the glyphs) | Author calls `beginEditing(…)` from a `PointerInput` control |

**Not** the same as silently conforming to PointerInput. Hit-testing stays host-defined for the editable leaf (like a platform `UITextField`).

### `activatesOn` (injected — authorable)

Well-known config on EditableText conformers. Prelude variant **`TextFieldActivation`** is always in scope.

```pdl
enum TextFieldActivation {
  case focus     // default — primary click/tap or focus begins editing
  case press     // begin only on press/click (not bare focus)
  case none      // program-only — beginEditing / isEditing param / host API only
}
```

| Case | Host begins session when… | Typical use |
|------|---------------------------|-------------|
| **`.focus`** ★ default | Click / tap / focus of the editable leaf | Minimal `MyTextField <EditableText>` |
| **`.press`** | Press / click (HTML: not `focus` alone) | Ignore tab-focus; require a real press |
| **`.none`** | Never from leaf hit-testing | Toolbar Edit only; set `isEditing` / call `beginEditing` |

```pdl
component CodeField <EditableText>() text {
  activatesOn = .none
  content = value
}
```

### Session handlers are optional

`editingFinished` / `editingCancelled` / `editingBegan` are **optional hooks** for author side effects (`emit`, status, copying into another SoT). The **host** still runs the session:

| User action | Host does (even with no handlers) |
|-------------|-------------------------------------|
| Activate (per `activatesOn`) | Seed checkpoint, `isEditing = true` |
| Type | Update `value` / `isEmpty` |
| Enter / blur | Keep `value`, `isEditing = false` (successful finish) |
| Esc | Restore checkpoint → `value`, `isEditing = false` |

So this is a complete field:

```pdl
component MyTextField <EditableText>() text {
  content = value
  if isEditing { borderColor = #2563EB; borderWidth = 2 }
  else if isEmpty { content = "Type here…" }
}
```

`finishEditing()` / `cancelEditing()` inside handlers are mostly redundant with that host policy — use handlers when you need extra work on finish/cancel.

---

## 3. Goals

| Goal | Meaning |
|------|---------|
| **Protocol-first** | Editing surface = host protocol package (inbound + verbs + well-known state), peer to PointerInput |
| **No new frame kind** | Keep `layout` / `text` / `icon` / `media`; kind stays orthogonal |
| **Injected `value`** | Conformance adds a host-driven String session value — not `editable = arbitraryAuthorParam` |
| **Protocol implies editable** | Text-root + `EditableText` → compilers inject editable leaf (no author `editable = true`) |
| **`isEditing` ⇒ first responder** | When `isEditing` is true (handler, fixture, or preview param), the host focuses the field and accepts keystrokes — not chrome-only |
| **Default activation (text-root)** | Text-root + `EditableText` ⇒ host begins editing per **`activatesOn`** (default **`.focus`**). No `PointerInput` required. |
| **`content` ≠ `value`** | `content` is what the user sees; `value` is what the session holds (password masking, etc.) |
| **Author SoT on commit** | `editingFinished` / cancel let authors sync (or ignore) into their own params |
| **Closed facts** | Layout may test `isEditing`, `isEmpty`, `isOverLimit` — not open String/length expressions |
| **Limit policy on protocol** | `contentLimit` + `contentLimitStyle` as well-known config |
| **Reusable on more than Text** | Any conforming component can own a keyboard session; paint `content` from `value` however they like |
| **Sibling chrome** | Same-component targeting: `Done.pressEnd = { Field.finishEditing() }` (scope rules in §10) |

### Non-goals (this proposal)

- Fifth IR frame kind (`textField`)  
- General `if contentLength > 6` / String methods on all values  
- Treating host inbound as `emits` (keep the peer distinction)  
- Parent querying arbitrary child-instance protocol facts across mount without lifting  
- Full IME / masks / rich text / multi-line editor IR  
- General frame-prop assigns inside handlers  

---

## 4. Layering

```text
┌─────────────────────────────────────────────────────────┐
│  Host protocol EditableText (capability package)          │
│  value + facts + limits + verbs + session inbound         │
└───────────────────────────┬─────────────────────────────┘
                            │ conform / requires
┌───────────────────────────▼─────────────────────────────┐
│  Component (often kind `text`, sometimes layout shell)    │
│  e.g. `component NoteField <EditableText>() text { … }`   │
│  parent: `let Input = NoteField(…)` + `Input.beginEditing`│
└───────────────────────────┬─────────────────────────────┘
                            │ catalogue + host
┌───────────────────────────▼─────────────────────────────┐
│  Playground / app — first responder, keyboard,            │
│  writes `value`, updates facts, re-resolves               │
└─────────────────────────────────────────────────────────┘
```

| Layer | Responsibility |
|-------|----------------|
| **Kind / `content`** | What is drawn — presentation string on `text` |
| **Host protocol `value`** | Session String the keyboard reads/writes |
| **Author params** | Product SoT (`lastContent`, form model) — synced on finish if desired |
| **API `emits`** | Optional parent notification (`emit change`) — separate from host inbound |

---

## 5. `content` vs `value` vs author SoT

Three strings, three jobs:

| Name | Job | Owner |
|------|-----|-------|
| **`content`** | What the user **sees** (text frame presentation) | Author layout (may assign from `value`, SoT, placeholder, or mask) |
| **`value`** | What the **session** holds (keyboard / IME buffer; String) | Host + EditableText protocol |
| **Author SoT** (e.g. `lastContent`) | What the **product** remembers after commit | Component params |

```pdl
if isEditing {
  borderWidth = 2
  content = self.value    // plaintext field: show what you're typing
}
```

Password-style mapping (same protocol, different presentation):

```pdl
if isEditing {
  // value holds the real password; content is only bullets
  content = /* bullets from self.value length — exact sugar TBD */
}
```

`self.value` is clarifying when a nested scope might shadow; bare `value` is fine in the component body if injected into scope (same story as other protocol facts).

### Naming: why `value`?

**Locked: `value`.** Same control-package name as Toggle / Slider / Stepper; here the type is **String**. `content` remains presentation-only so SecureField can mask without renaming the session buffer.

Rejected alternates: `draft` (session-clear but breaks the shared control vocabulary), `rawText` (masking-biased), `text` (collides with kind / `Text()`).

### Lifecycle

| Phase | `value` | `content` (typical) |
|-------|---------|---------------------|
| **Not editing** | Idle policy TBD (clear vs mirror last commit) | Placeholder or author SoT |
| **Editing** | Host updates each accepted keystroke | Author sets `content = self.value` (or mask) |
| **Finish** | Final string delivered / readable | — |
| **Cancel** | Restored to pre-session snapshot | SoT unchanged |

### Why not only `editable = lastContent`?

That bind makes **author SoT == live buffer**. It works, but:

- Every keystroke mutates product state (undo, fixtures, parent observers get noisy)  
- Cancel needs checkpoints the author reinvents  
- No room for `content ≠ value` (masking, formatting)

Injected **`value`** keeps the PointerInput-shaped story: conformance *adds* state the host drives. Authors **opt into** syncing SoT on finish (or on `editingChanged` if they want live bind).

### Closing the loop — “keyboard on other objects”

```pdl
component TagEditor <EditableText, PointerInput>(
  committed: String = ""
) layout {
  let Label = Text()
  if isEditing {
    Label.content = self.value
  } else {
    Label.content = committed
  }
  …
  pressEnd = { beginEditing(startingValue: committed) }
  editingFinished(newValue: String) = { committed = newValue }
}
```

**Host still needs an insertion surface** (caret / IME): text leaf as first responder, or host overlay. Protocol session ≠ automatic glyphs.

### Live bind as an opt-in, not the default

```pdl
editingChanged(newValue: String) = { committed = newValue }  // live SoT
// vs
editingFinished(newValue: String) = { committed = newValue } // commit on finish
```

Default demos use **finish/cancel**. Live bind remains expressible without `editable = param` magic.

---

## 6. Canonical authoring sketches

### 6.1 Component conformance (PointerInput-shaped)

```pdl
component NoteField <EditableText, PointerInput>(
  lastContent: String = ""
) text {
  fontSize = 16
  contentLimit = 64
  contentLimitStyle = .preventInput

  if isEditing {
    borderWidth = 2
    content = self.value     // show session string; mask here for SecureField
  } else if isEmpty {
    color = color.placeholder
    content = "Click me and type something"
  } else {
    content = lastContent
  }

  pressEnd = {
    beginEditing(startingValue: lastContent)
  }

  editingFinished(newValue: String) = {
    lastContent = newValue   // or lastContent = self.value
  }

  editingCancelled() = {
    // lastContent unchanged; host restored `value`
  }
}
```

### 6.2 Multi-field / toolbar (no ctor sugar)

Authors nest a real EditableText component and target it with let-qualified verbs — **not** a `TextField()` desugar:

```pdl
let Input = NoteField(value: draft, isEditing: editing)
…
Edit.tap() = { Input.beginEditing(draft) }
Done.tap() = { Input.finishEditing() }
Input.change(value: String) = { draft = value }
```

**Rejected:** `let Input = TextField()` (or any World A ctor that implies a parallel “control class”). Kind stays `text` / `layout`; power comes from `<EditableText>`.

### Seed at call site

```pdl
beginEditing(startingValue: lastContent)
```

`editingBegan()` carries **no** starting value — avoids double-seed races.

---

## 7. Protocol surface (normative sketch)

Keep prelude name **`EditableText`**. Do not introduce a `TextField()` ctor; renaming the protocol is a separate open question (§13).

### 7.1 Today → target

```pdl
// today
protocol EditableText {
  host
  keyboardDismissed
  keyboardCancelled
  beginEditing(value)
  cancelEditing()
  commitEditing()
}
```

```pdl
// target sketch — still `host`, still not a slot type (PDL-E031)
protocol EditableText {
  host

  // Well-known state (host-driven / derived)
  value: String           // session String (≠ text `content`; peer to Toggle/Slider value)
  isEditing: Bool         // fact
  isEmpty: Bool           // fact (from value / idle policy)
  isOverLimit: Bool       // fact
  contentLimit: Number?
  contentLimitStyle: ContentLimitStyle
  activatesOn: TextFieldActivation  // default .focus; see §2 — authorable later

  // Inbound (env → component) — wire like PointerInput channels
  editingBegan()
  editingFinished(newValue: String)   // payload = final value; or read `self.value`
  editingCancelled()
  // optional: editingChanged(newValue: String)

  // Verbs (component → env)
  beginEditing(startingValue: String) // seeds `value`
  finishEditing()
  cancelEditing()
}
```

Grammar note: host protocols today list bare inbound names and verb callables — **not** full param declarations. Extending host protocols with **well-known state fields** is a real language increment (catalogue + resolve must understand injected names). That increment is the point of this proposal.

| Today | Target |
|-------|--------|
| `editable = authorParam` | Injected protocol `value` (+ author maps `content = self.value` or mask) |
| `keyboardDismissed` | `editingFinished(newValue:)` |
| `keyboardCancelled` | `editingCancelled()` |
| `commitEditing()` | `finishEditing()` |
| bare verbs | verbs on conforming instance (`self` / let target) |

`PointerInput` stays orthogonal for tap/focus.

### 7.2 `contentLimitStyle`

| Case | Host behavior | `isOverLimit` |
|------|---------------|-----------------|
| `.preventInput` | Reject input past N | Usually false while typing; may be true if seed already exceeds N |
| `.allowAndFlag` | Allow past N | `true` when `value` length > N |
| `.warnAtLimit` | Allow; softer UX | `true` at/over N |

### 7.2b `activatesOn`

See §2. Injected variant param (`TextFieldActivation`, default **`.focus`**). Unknown/missing → `.focus`. HTML host: **`.none` + !`isEditing` → inert text** (no `<input>` / no hit target); session open (`isEditing`) restores the editable leaf.

### 7.3 Facts

| Fact | Meaning |
|------|---------|
| `isEditing` | Session active |
| `isEmpty` | `value` empty (while editing) or idle-empty policy when not |
| `isOverLimit` | Per limit + style |

**Non-goal:** open `value.count > 6` in layout. Length policy stays behind facts + limit config. Masking may need a closed helper later (e.g. bullet string from value length) without opening general String ops.

### 7.4 Naming (no ctor sugar)

| Spelling | Role |
|----------|------|
| `EditableText` | Prelude host protocol (capability package) |
| `SearchField` / `SecureField` | Later **API protocols** with `requires EditableText` (still components, not ctors) |
| ~~`TextField()`~~ | **Rejected** — looks like another object class; authors use `<EditableText>` on `text` |

---

## 8. Handler rules

Handlers stay **outside bake trees**. Same family as PointerInput wiring.

| Allowed in handlers | Forbidden |
|---------------------|-----------|
| Assign **author params** (`lastContent = newValue`) | Arbitrary frame props (`Hint.color = …`) |
| Call **protocol verbs** (`finishEditing()`, `Input.finishEditing()`) | Open methods on any let |
| Wire **host inbound** (`editingFinished(…) = { … }`) | Treating those as child→parent `emits` |
| `emit …` for **API** parent channels | — |
| `if` over author params / injected protocol facts | Open string/length expressions |

### Scope fork (important)

Today PointerInput inbound is **component-scoped** (`self.pressEnd` / bare `pressEnd`).

Editing needs the same for single-field components (§6.1). Multi-field layouts also want **instance-qualified** surface:

```pdl
Done.pressEnd = { Input.finishEditing() }
Input.editingFinished(newValue: String) = { lastContent = newValue }
```

| Approach | Pros | Cons |
|----------|------|------|
| **A. Component-only** (like PointerInput today) | One mental model; no let targeting | Multi-field → nested field components only |
| **B. Let-qualified verbs on nested components** | Sibling Edit/Done/Cancel in one shell | Handlers must name the let (`Input.finishEditing()`) |
| ~~**C. + TextField() sugar**~~ | — | **Rejected** — invents a fake control class |

**Locked: A + B** — conformance stays on real components (`NoteField <EditableText>`); multi-field shells use `let Input = NoteField(…)` and let-qualified host verbs. No ctor sugar.

Cross-component parent wiring still uses **`emits`**, not host inbound.

---

## 9. Bake / host

### 9.1 Resolve

Injected names (`value`, `isEditing`, …) are in scope for conforming components. Host updates them; resolve re-runs for interactive preview. Authors still assign **`content`** explicitly when they want the leaf to show the value (or a mask).

### 9.2 Static bake

- Default: non-editing presentation (`lastContent` / idle `content`).  
- Fixtures may snapshot `isEditing = true` + a `value` for catalog shots.  
- Bake ignores live keystrokes unless a fixture selects an editing snapshot.

### 9.3 Host duties

1. Honor verbs (first responder / session lifecycle)  
2. Write protocol `value` + facts under limit policy  
3. Deliver session inbound  
4. Map caret/IME to a text leaf or overlay; **do not** assume `content == value` (author may mask)  

---

## 10. Same-component vs parent scope

| Context | Protocol facts / `value` |
|---------|---------------------------|
| **Conforming component body** | In scope (`if isEditing`, `content = self.value`) |
| **Sugar let in same component** | Qualified (`if Input.isEditing`, `Input.value`) if approach B/C |
| **Parent of mounted child** | **Not** in v1 — lift via params / `emits` |

---

## 11. Future host packages (same pattern)

```text
author SoT  ←finish/cancel—  protocol value + facts  ←device—  host
                 content ← author maps from value / SoT / mask
```

| Later package | Device | Example injected state |
|---------------|--------|------------------------|
| EditableText / TextField | Keyboard | `value` (String), `isEditing`, `isOverLimit` |
| SearchField / SecureField | Keyboard | same; SecureField sets `content` from masked `value` |
| NumberField | Keyboard | `value` (Number or String), `isInvalid` |
| Slider | Drag | `value` (Number) + `isTracking` |
| Toggle | Tap | `isOn` (often immediate) |
| Picker | Sheet | `selection`, `isPresenting` |

Shared shape: host protocol package = **inbound + verbs + well-known state**. Do **not** multiply frame kinds.

---

## 12. Migration

| Step | Work |
|------|------|
| **M0** | Land protocol-first framing in this proposal |
| **M1** | Spec + `host_protocols.pdl`: well-known state fields; session inbound/verb names |
| **M2** | Catalogue / resolve: inject `value` + facts; host writes them |
| **M3** | Playground session host; deprecate `editable = authorParam` as primary API |
| **M4** | Let-qualified verbs (`Input.beginEditing` / `finishEditing` / `cancelEditing`) ✓ — lab `NoteEditor`. **`TextField()` sugar rejected** |
| **M5** | Authorable `activatesOn` (`.focus` / `.press` / `.none`) — HTML host honors all three ✓ |

---

## 13. Open questions

1. Protocol name: keep **`EditableText`** vs rename to **`TextField`**? (Name only — **no** `TextField()` ctor.)  
2. How are well-known host-protocol **state fields** spelled in `.pdl` (typed fields vs documented synthetic names)?  
3. Idle `value` — clear when not editing, or mirror last commit?  
4. ~~Approach A vs C~~ → **locked A+B** (§8); `TextField()` sugar rejected.  
5. Bullet/mask helper for SecureField without general String ops?  
6. `editingFinished(newValue:)` vs reading `self.value` in a bare inbound handler?  
7. Exact spelling: `activatesOn` vs `activation` / `TextFieldActivation` enum name?

---

## 14. Summary

- **Same metaphor as PointerInput:** host protocol attaches inbound, verbs, and well-known session state (`value` + facts).  
- **`content` is presentation; `value` is the session String** — authors map (`content = self.value` or mask). Same `value` name as Toggle/Slider.  
- **Default activation is in-spec** (text-root → begin on focus/click); **`activatesOn`** reserved for `.none` / `.press` later.  
- **Session events are host inbound, not `emits`.** Parent API stays optional `emit`.  
- **Author SoT syncs on finish** (or live via `editingChanged`).  
- **No fifth frame kind** — kind draws; protocol powers the session.  
- **No `TextField()` ctor** — avoid a parallel “control class”; nest real `<EditableText>` components + let-qualified verbs.  
- **Closed facts + limits** keep layout free of open string expressions.

Canonical sketches: §6. Naming: §5. Activation: §2. Protocol surface: §7. Scope fork: §8.
