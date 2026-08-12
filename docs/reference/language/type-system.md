# Type system

## Built-in types

- **Token types** — [types index](../symbols/README.md#types) (`Color`, `Distance`, …)  
- **Param scalars** — `String`, `Number`, `Bool`  
- **Host enums** — [enums index](../symbols/README.md#enums) (`Direction`, `Overflow`, …)  
- **Author variants** — `variant` / `enum` declarations  
- **Slots** — component or API protocol names; arrays `[T]`  

Machine SoT for frame property checks: [`shared/frame-props.json`](../../../shared/frame-props.json). Catalog of docs symbols: [`shared/language-model.json`](../../../shared/language-model.json).

## Checking highlights

| Check | Code |
|-------|------|
| Token RHS vs TokenType | **PDL-E005** |
| Frame / typeStyle prop type | **PDL-E006** |
| Unknown frame property | **PDL-E011** |
| Param / fixture / kwarg mismatch | **PDL-E040** |
| Unknown param type / `Boolean` | **PDL-E039** |
| Sample path | **PDL-E041** |

## Conditions

Variant↔case, Bool truthy, same-type param↔param. No arbitrary string/number comparisons in v1 (**PDL-E010**). Mixed `&&` / `||` without parens → **PDL-E038**.

## See also

- [Errors](./errors.md)  
- Normative: [`full-spec.md` §23](../../full-spec.md#23--type-system-and-name-resolution)  
