# Tokens and themes

## Primitives vs semantics

```pdl
primitive color.primitive.blue.500: Color = #3B82F6
semantic color.text.primary: Color = color.primitive.blue.500
```

- **Primitive** — palette / raw values (literal RHS).  
- **Semantic** — intent names components should reference so themes can remap.  

Prefer **Opacity** tokens on `@` (e.g. `color.surface @ opacity.scrim`) over raw `0.75` in libraries.

## Token types

Built-in types (`Color`, `Distance`, `Shadow`, `Background`, …) are listed in the [types index](../reference/symbols.md#types). Each page documents allowed RHS shapes.

## Themes

```pdl
theme Dark {
  color.text.primary = color.primitive.gray.100
}
```

Themes are **override bundles**, not an OO hierarchy. At resolve time a primary `theme` plus ordered **modifiers** are applied in sequence (e.g. Dark + ReducedMotion).

## Type styles

```pdl
typeStyle Body {
  fontFamily = "Inter"
  fontSize = 16
  fontWeight = 400
  lineHeight = 1.5
}

component Title() layout {
  let Heading = Text(content: "Hi", style: Body)
  children = [Heading]
}
```

Only valid **text** frame properties belong in a `typeStyle`. Bake expands the preset into literals; catalogue keeps a `typeStyle:` pointer.

## See also

- [Color](../reference/symbols/types/color.md), [Opacity](../reference/symbols/types/opacity.md), [Shadow](../reference/symbols/types/shadow.md)  
- Normative: [`full-spec.md` §3](../full-spec.md#3--tokens-themes-and-type-styles)  
