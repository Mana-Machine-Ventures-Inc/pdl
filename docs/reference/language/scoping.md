# Scoping

## Namespaces

Roughly separate spaces for: tokens, type styles, variants, protocols, components, samples banks. Duplicate within a space → **PDL-E003**.

## Inside a component

| Name | Resolves to |
|------|-------------|
| Bare param | Component parameter |
| `self` | Enclosing component instance |
| `self.param` | Param when a nested binder shadows the bare name (esp. `ForEach`) |
| `self.prop = value` | Root frame property assign |
| `self.channel = { … }` | Host inbound handler |
| `let` frame id | Nested frame |
| Token idents | Design tokens (params shadow tokens — **PDL-W001**) |

Rules-query `self` is **rules-scoped**, not the component instance.

## Handlers

Handler bodies assign **params** (and `emit`) only — not nested frame props.

## ForEach binder

```pdl
ForEach(chips) { chip in
  chip.selected = self.currentFilter == chip.filter_id
  chip.select(filter_id: FilterId) = { currentFilter = filter_id }
}
```

`chip` scopes the current element; list-param emit capture is illegal (**PDL-E036**).

Normative: [`full-spec.md` §22](../../full-spec.md#22--namespace-and-scoping-rules).
