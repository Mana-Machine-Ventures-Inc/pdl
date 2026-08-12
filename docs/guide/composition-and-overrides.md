# Composition and overrides

## Nested frames and children

Declare with World A ctors, then mount:

```pdl
component Card(title: String) layout {
  direction = .column
  gap = 8

  let Title = Text(content: title)
  let Body = Layout(direction: .row)

  Body.children = [Title]
  children = [Body]
}
```

Every frame id in `children` must be declared **earlier** (`let`) — forward refs are **PDL-E019**.

## Conditional overrides

```pdl
if state == .hover {
  background = color.surface.hover
} else if state == .pressed {
  background = color.surface.pressed
} else {
  background = color.surface.idle
}
```

Conditions support variant↔case, Bool, and same-type param comparisons. Mixed `&&` / `||` needs parentheses (**PDL-E038**).

## Slots and instances

```pdl
component Modal(content: ModalContent) layout {
  children = [content]
}
```

Single-slot dotted overrides classify as param kwargs vs root-frame props. Array slots use `ForEach` — not `slots.foo =` (**PDL-E034**).

## Handlers stay thin

Host inbound and emit captures assign **component params** (and `emit …`) only. Do not write `Label.content = …` inside handlers (**PDL-E001**); put chrome in layout `if`.

## Samples

Design-global typed banks:

```pdl
samples Tracks {
  focus {
    tracks: [Track] = [ /* … */ ]
  }
}

// mount
children = Tracks.focus.tracks
```

Unknown paths → **PDL-E041**. See [`full-spec.md` §11a](../full-spec.md#11a--typed-samples-samples).

## See also

- [Protocols and emits](./protocols-and-emits.md)  
- Normative: [`full-spec.md` §7](../full-spec.md#7--conditional-overrides-let-and-composition)  
