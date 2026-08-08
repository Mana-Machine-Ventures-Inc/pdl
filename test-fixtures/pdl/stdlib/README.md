# PDL stdlib notes

**Host protocols** (`PointerInput`, `EditableText`) are a **language prelude** — always in scope, no import, no pack file.

Normative stubs (inbound channels + host verbs) live in [`docs/full-spec.md`](../../../docs/full-spec.md) **§4a′ — Host protocol prelude stubs**.

Authors opt in with `component C <PointerInput>` or an API protocol with `requires PointerInput` (**PDL-E030**), then wire handlers in the kind body:

```pdl
self.pressEnd = { … }          // `self.` optional / clarifying
pressEnd = { … }               // equivalent
self.keyboardDismissed = { … }
```

Hosts (Playground / HTML / apps) deliver those inbound channels and implement verbs. The `interaction` keyword is removed (**PDL-E001**).
