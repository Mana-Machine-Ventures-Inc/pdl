# Syntax

## Conventions

- **Identifiers** — `MyComponent`, `color.text.primary`; letters, digits, `_`, `.` where grammar allows.  
- **Dot enums** — `.row`, `.primary`, or `Direction.row`.  
- **Comments** — `//` line and `/* … */` block (non-nesting).  
- **Strings** — double quotes with escapes.  
- **Colors** — unquoted hex (`#RRGGBB`); quoted hex is **PDL-E017**.  
- **Numbers** — integer or decimal where allowed.  

## Top-level declarations

`import`, `previewBackground`, `primitive`, `semantic`, `theme`, `typeStyle`, `variant` / `enum`, `protocol`, `component`, companion blocks (`emits`, `fixtures`, `samples`, `usage`, `rules`, `extend`).

Removed / rejected: `expose`, `interaction` keyword, classic `let Id: text = { … }` (**PDL-E001**).

## Frame constructors

Frame trees use expression constructors:

```pdl
let Title = Text(content: "Hi", style: Body)
let Row = Layout(direction: .row, gap: 8)
```

Asset / layer ctors: `IconRef`, `MediaSource`, `MediaLayer`, `Blur`, `Ramp`, … — see [constructors](../symbols/README.md#constructors).

## Cheat sheet

Author-facing quick reference: [`full-spec.md` §10](../../full-spec.md#10--quick-reference-syntax-cheat-sheet).

## See also

- [Grammar](./grammar.md)  
- [Errors](./errors.md)  
