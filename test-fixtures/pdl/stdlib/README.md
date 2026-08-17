# PDL stdlib

## Host protocols (language prelude)

**Canonical source file:** [`host_protocols.pdl`](./host_protocols.pdl)

| Protocol | Role |
|----------|------|
| **`PointerInput`** | Pointer / focus / lifecycle **inbound** channels (`pressEnd`, `hoverStart`, …) |
| **`EditableText`** | Text editing session: inbound + verbs + injected **`value` (String)** / facts |
| **`Host`** | Environment params from the active `host` profile (H2 inject). No channels. |

## Presenter (language prelude frame)

`Presenter` is a World A frame constructor (`let presenter = Presenter(root: home)`), not a protocol. `root` is required and must be a `page`. Bake paints the cover if one is up, otherwise the stack top (`root` by default). `presenter.push` / `pop` / `replace` / `present(…, style: .cover)` / `dismiss` are legal only in an ancestor-capture body. Pin a stack with `presenter = [Home(), Episode()]` and a cover with `presenter.cover = Settings()`. Vacant cover is omitted (no `T?`). `.sheet` is not legal yet.

## Page protocol (language prelude)

**Canonical source file:** [`page_protocols.pdl`](./page_protocols.pdl)

| Protocol | Role |
|----------|------|
| **`Page`** | Empty API protocol (`protocol Page: component { }`). A `page` declaration auto-satisfies it so `content: Page = Home()` type-checks. |

These are **always in scope** — no import. Compilers inject the same contracts into every design merge (`crates/pdl-core` `HOST_PROTOCOL_PRELUDE`). Locked meanings: [`shared/language-objects.json`](../../../shared/language-objects.json) host prelude. Proposal: [`docs/PROPOSAL_TEXTFIELD_EDITING_SESSIONS.md`](../../../docs/PROPOSAL_TEXTFIELD_EDITING_SESSIONS.md).

They are **not** child→parent `emits`. Host protocols declare:

- **inbound channels** — environment → component (`self.pressEnd = { … }`, `self.editingFinished = { … }`)
- **host verbs** — component → environment (`beginEditing(startingValue)` inside handlers)
- **well-known state** (EditableText) — injected into conforming components: `value`, `isEditing`, `isEmpty`, `isOverLimit` (not host-protocol `params` — **PDL-E032**)

Authors opt in with `component C <PointerInput>` or an API protocol with `requires PointerInput` (**PDL-E030**). List more than one host protocol when needed: `component C <PointerInput, EditableText>`. Send/slot API protocols use `emits <P>` (**PDL-E044** if they appear in receive `<>`). Restating `host_protocols.pdl` in a pack is documentation only; redefining a prelude name as an API protocol is **PDL-E032**.

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
