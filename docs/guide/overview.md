# Overview

PDL is a **text language** for coherent product UI: tokens, themes, type styles, components (frame trees), variants, conditionals, interactions, and companion metadata.

A `.pdl` module is a partial design. An **entry file** plus its `import` graph merge into one design. Tooling then emits:

- **Component Catalogue / graph** — token pointers + structure for emitters  
- **Baked design** — literal frame trees for a theme + params  
- **Hosts** — HTML today; SwiftUI / React / etc. later map the same bake IR  

## Mental model

```text
.pdl sources  →  load / merge / validate  →  catalogue or bake JSON  →  host UI
```

- **Author** in open, diffable files (not a proprietary canvas).  
- **Compose** small components and protocols instead of one-off screens.  
- **Contracts** are explicit: params, emits, tokens, host channels.  

## Core vocabulary

| Concept | Meaning |
|---------|---------|
| Entry file | Root `.pdl` that lists imports |
| Primitive / semantic token | Raw value vs named intent |
| Theme | Named override bundle (composed at resolve time) |
| Type style | Named text property preset |
| Variant / enum | Closed case set for params |
| Component | Params + root frame |
| Frame | `layout` / `text` / `icon` / `media` + properties + children |
| Protocol | Shared API (`: component`) or host capability (`host`) |
| Fixture / samples | Preview data (per-component vs design-global banks) |

## Four frame kinds

| Kind | World A ctor | Role |
|------|--------------|------|
| `layout` | `Layout` | Flex-like container |
| `text` | `Text` | Typography |
| `icon` | `Icon` | Tintable symbol |
| `media` | `Media` | Raster / vector / video box |

See [symbol pages](../reference/symbols/README.md#frame-kinds) and [components and frames](./components-and-frames.md).

## Smallest component

```pdl
component Hello() layout {
  let Label = Text(content: "Hello")
  children = [Label]
}
```

## Next

- [Tokens and themes](./tokens-and-themes.md)  
- [Bake pipeline](./bake-pipeline.md)  
- Manifesto: [docs/manifesto.md](../manifesto.md)  
