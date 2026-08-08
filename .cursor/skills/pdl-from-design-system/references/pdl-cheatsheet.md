# PDL authoring cheatsheet

Author-facing syntax only. Not IR/bake internals. Normative detail: `docs/full-spec.md`.

## Module shape

```pdl
import "foundation.pdl"

variant Tone { case primary case secondary }

primitive color.brand: Color = #2563EB
semantic color.text: Color = #0F172A

typeStyle Body {
  fontSize = 14
  fontWeight = 400
}

component Button(
  label: String = "Button",
  tone: Tone = .primary
) layout {
  // props + lets + if + children
}
```

Entry files only import; keep tokens in `foundation.pdl` (or split token files imported from there).

## Tokens

| Form | Example |
|---|---|
| Primitive | `primitive space.md: Number = 16` |
| Semantic | `semantic color.fg: Color = color.brand` |
| Color literal | `#RRGGBB` / `#RRGGBBAA` |
| Opacity of color | `color.fg @ 0.5` |
| Theme override | `theme Dark { color.fg = #F8FAFC }` |

Common types: `Color`, `Number`, `String`, `Bool`, `MediaSource`, plus sizing/edge helpers in expressions.

## Type styles

```pdl
typeStyle Title {
  fontFamily = "Inter"
  fontSize = 20
  fontWeight = 600
  lineHeight = 1.3
}
// on text frames:
style = Title
```

## Variants & params

```pdl
variant Size { case sm case lg }

component Chip(
  title: String = "All",
  size: Size = .sm
) layout { … }
```

- Cases in expressions: `.sm`
- Conditions: `size == .lg`, `tone != .ghost`
- All params are public (no `expose`)

## Frames

Root kind after `) `: `layout` | `text` | `icon` | `media`.

```pdl
component Row() layout {
  direction = .row
  gap = 8
  padding = EdgeInsets(x: 12, y: 8)

  let Title: text = {
    content = "Hello"
    style = Body
  }

  let Child = OtherComponent(label: "X")

  children = [Title, Child]
}
```

- `let Name: kind = { … }` — nested frame
- `let Name = Comp(…)` — component instance
- Bare `children = […]` attaches to the enclosing frame (nested `let` or root)
- Nested `let` **ids unique within one component** (E021)

## Conditionals

```pdl
if tone == .primary {
  background = color.brand
} else if tone == .secondary {
  background = color.muted
} else {
  opacity = 0.15
}
```

Also valid inside nested `let` bodies.

## Protocols, slots, ForEach (Rust-first)

```pdl
protocol SubnavItem: component {
  requires PointerInput
  title = ""
  filter: FilterId = .all
  emits { select(filter: FilterId) }
}

component FilterChip <SubnavItem>(selected: Boolean = false) layout {
  let Label: text = { content = title }
  children = [Label]
  self.pressEnd = { emit select(filter) }   // host inbound (§4a′)
}

component Nav(
  currentFilter: FilterId = .all,
  chips: [SubnavItem] = [FilterChip(title: "All", filter: .all)]
) layout {
  ForEach(chips) { chip in
    chip.selected = self.currentFilter == filter
    chip.select(filter_id: FilterId) = { currentFilter = filter_id }
  }
  children = chips
}
```

- `self.param` = this component instance’s param
- Selection: parent owns SoT; ForEach derives `chip.selected = …`
- Emit capture: `chip.select(…) = { … }` in ForEach / `Field.change(…) = { … }` on lets
- Host inbound: `[self.]pressEnd = { … }` in the kind body (`self.` optional; prelude stubs in full-spec §4a′)

## Companions (optional)

```pdl
usage Button { … }
fixtures Button {
  example "Primary" { label = "Save" tone = .primary }
}
```

## CLI (Rust)

```bash
cargo build -p pdl-cli
./target/debug/pdl bakeSystem <entry.pdl> --out out.json
./target/debug/pdl bakeComponent <entry.pdl> <Name> --out out.json
npm run preview -- <entry.pdl> --system
```

## Quick property reminders

| Area | Typical props |
|---|---|
| layout | `direction`, `gap`, `align`, `justify`, `padding`, `width`/`height` (`.hug`/`.fill`/`.fixed(n)`), `background`, `cornerRadius`, `borderWidth` |
| text | `content`, `style`, `color`, `fontSize`, `fontWeight` |
| media | `source`, `contentMode`, `aspectRatio` |
| icon | `icon` (token/name) |
