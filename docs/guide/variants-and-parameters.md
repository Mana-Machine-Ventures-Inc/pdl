# Variants and parameters

## Variants / enums

```pdl
variant Emphasis {
  case primary
  case secondary
}

enum FilterId {   // surface alias of variant in v1
  case all
  case podcasts
}
```

Cases in expressions use a leading dot: `.primary`, or qualified `Emphasis.primary`.

Built-in host enums (`Direction`, `Overflow`, …) live in the [enums index](../reference/symbols/README.md#enums).

## Parameters

All component params are **public** (`expose` was removed). Types may be:

- Built-in scalars (`String`, `Number`, `Bool`)  
- Token types (`Color`, `Distance`, …)  
- Variants / host enums  
- Components or API protocols (slots)  
- Arrays `[T]`  

```pdl
component Chip(
  title: String,
  selected: Bool = false,
  filter: FilterId = .all,
) layout { /* … */ }
```

Use **`Bool`**, never `Boolean` (PDL-E039).

## Defaults

Defaults are concrete: literals, token refs, `.case`, instance constructors, sample paths. Inside **fixtures**, other component params are **not** in scope.

## See also

- [Protocols and emits](./protocols-and-emits.md)  
- Normative: [`full-spec.md` §4](../full-spec.md#4--variants-and-component-parameters)  
