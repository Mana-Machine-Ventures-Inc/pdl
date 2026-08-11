# PDL stdlib

## Host protocols (language prelude)

**Canonical source file:** [`host_protocols.pdl`](./host_protocols.pdl)

| Protocol | Role |
|----------|------|
| **`PointerInput`** | Pointer / focus / lifecycle **inbound** channels (`pressEnd`, `hoverStart`, …) |
| **`EditableText`** | Soft-keyboard inbound + host verbs (`beginEditing`, …) |

These are **always in scope** — no import. Compilers inject the same contracts into every design merge (`crates/pdl-core` `HOST_PROTOCOL_PRELUDE`). Normative prose: [`docs/full-spec.md`](../../../docs/full-spec.md) **§4a′**.

They are **not** child→parent `emits`. Host protocols declare:

- **inbound channels** — environment → component (`self.pressEnd = { … }`)
- **host verbs** — component → environment (`beginEditing(value)` inside handlers)

Authors opt in with `component C <PointerInput>` or an API protocol with `requires PointerInput` (**PDL-E030**). Restating `host_protocols.pdl` in a pack is documentation only; redefining a prelude name as an API protocol is **PDL-E032**.

```pdl
component Chip <PointerInput>(…) layout {
  self.pressEnd = { emit select(filter) }
}
```

The `interaction` keyword is removed (**PDL-E001**).
