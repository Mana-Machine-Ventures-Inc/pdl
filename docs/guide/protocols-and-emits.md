# Protocols and emits

## Two protocol roles

| Role | Syntax | Purpose |
|------|--------|---------|
| **API** | `protocol P: component { … }` | Shared params / emits for slots |
| **Host** | `protocol P { host … }` | Environment → component inbound channels (+ verbs) |

Prelude hosts (always in scope): [PointerInput](../reference/symbols/protocols/pointer-input.md), [EditableText](../reference/symbols/protocols/editable-text.md).

```pdl
component Button() <PointerInput> layout {
  pressEnd = {
    // assign params only
  }
  /* … */
}
```

Using a host channel without effective conformance is **PDL-E030**. Host protocols cannot be slot types (**PDL-E031**).

## Emits (child → parent)

```pdl
component FilterChip(
  filter_id: FilterId,
) layout {
  /* … */
} emits {
  select(filter_id: FilterId)
}
```

Parents capture with handler assignment on the **item binder** or single slot — not on a list param (`chips.select` → **PDL-E036**):

```pdl
ForEach(chips) { chip in
  chip.select(filter_id: FilterId) = {
    currentFilter = filter_id
  }
}
children = [chips]
```

`ForEach` overlays binds/handlers only; the list must still be **mounted** via `children` (**PDL-E035**).

## Selection pattern

Parent owns id/enum source of truth; ForEach derives Bool presentation (`chip.selected = self.currentFilter == filter`).

## See also

- [Composition and overrides](./composition-and-overrides.md)  
- Normative: [`full-spec.md` §4a–§4e](../full-spec.md#4a--protocols-b1)  
