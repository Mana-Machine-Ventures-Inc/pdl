# PDL stdlib

## Host protocols (language prelude)

**Canonical source file:** [`host_protocols.pdl`](./host_protocols.pdl)

| Protocol | Role |
|----------|------|
| **`PointerInput`** | Pointer / focus / lifecycle **inbound** channels (`pressEnd`, `hoverStart`, …) |
| **`EditableText`** | Text editing session: inbound + verbs + injected **`value` (String)** / facts |
| **`Host`** | Environment params from the active `host` profile (H2 inject). No channels. |

These are **always in scope** — no import. Compilers inject the same contracts into every design merge (`crates/pdl-core` `HOST_PROTOCOL_PRELUDE`). Locked meanings: [`shared/language-objects.json`](../../../shared/language-objects.json) host prelude. Proposal: [`docs/PROPOSAL_TEXTFIELD_EDITING_SESSIONS.md`](../../../docs/PROPOSAL_TEXTFIELD_EDITING_SESSIONS.md).

They are **not** child→parent `emits`. Host protocols declare:

- **inbound channels** — environment → component (`self.pressEnd = { … }`, `self.editingFinished = { … }`)
- **host verbs** — component → environment (`beginEditing(startingValue)` inside handlers)
- **well-known state** (EditableText) — injected into conforming components: `value`, `isEditing`, `isEmpty`, `isOverLimit` (not host-protocol `params` — **PDL-E032**)

Authors opt in with `component C <PointerInput>` or an API protocol with `requires PointerInput` (**PDL-E030**). List more than one host protocol when needed: `component C <PointerInput, EditableText>`. At most one API protocol in the header (**PDL-E044**). Restating `host_protocols.pdl` in a pack is documentation only; redefining a prelude name as an API protocol is **PDL-E032**.

```pdl
component Chip <PointerInput>(…) layout {
  self.pressEnd = { emit select(filter) }
}

component MyTextField <EditableText>() text {
  content = value
  if isEditing { borderWidth = 2 }
  editingFinished = { finishEditing() }
}
```

The `interaction` keyword is removed (**PDL-E001**).
