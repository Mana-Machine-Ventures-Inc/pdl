# Components and frames

## Declaration (World A)

```pdl
component Button(
  label: String = "Continue",
  emphasis: Emphasis = .primary,
) layout {
  direction = .row
  padding = 12

  let Label = Text(content: label, color: color.text.primary)

  if emphasis == .primary {
    background = color.surface.brand
  } else {
    background = color.surface.subtle
  }

  children = [Label]
}
```

- Root kind is `layout` / `text` / `icon` / `media`.  
- Nested frames use **`let Name = Layout(…)` / `Text` / `Icon` / `Media`**. Classic `let Id: text = { … }` is removed.  
- Mount with `children = […]` (frame ids, instances, `Spacer()`).  

## Properties

Property tables are generated from `shared/frame-props.json`:

- [Layout](../reference/symbols/frames/layout.md)  
- [Text](../reference/symbols/frames/text.md)  
- [Icon](../reference/symbols/frames/icon.md)  
- [Media](../reference/symbols/frames/media.md)  

Child-flex props (`alignSelf`, `grow`, `shrink`, `position`, `inset`) apply when the parent is a `layout`.

## Name collisions to remember

| Spell | Meaning |
|-------|---------|
| `Icon(…)` | Frame ctor |
| `IconRef(…)` | Asset value → type `Icon` |
| `Media(…)` | Frame ctor |
| `MediaLayer(…)` | Layer fill → type `Media` |
| `MediaSource(…)` | Asset ref type |

See [relationships](../reference/symbols/relationships.md).

## See also

- [Variants and parameters](./variants-and-parameters.md)  
- [Composition and overrides](./composition-and-overrides.md)  
- Normative: [`full-spec.md` §5](../full-spec.md#5--components-frames-and-properties)  
