# Spec walk — blank-canvas coverage checklist

**Goal:** From an empty `.pdl` file, author the language **bottom-up** and **see** each spec surface paint correctly (Rust bake → HTML). Closely tracks [`full-spec.md`](./full-spec.md) §§1–8, 14–15 (layers).

**Setup**

1. Playground → Advanced → **Scratch upload** (or start a new file in a disposable pack).
2. One entry file, e.g. `lab.pdl`. Keep everything in this file until Phase 7 (multi-file) if you want.
3. Engine: **Rust CLI**. After each tick: preview must match the expectation in *See*.
4. When something fails, note **bake** vs **HTML** in your bug log.

**How to use:** Author the snippet for the step (or the delta on the previous step). Tick only when you *see* the expected result. Do not jump ahead using fixture packs.

**Pass:** Analyze OK · preview shows the described effect · no silent wrongness.

---

## Progress

| Phase | Spec | Focus | Done |
|-------|------|--------|------|
| 0 | §2–3 | Minimal tokens + entry | [ ] |
| 1 | §5 text, §6 | Single `text` root — all props | [ ] |
| 2 | §3 typeStyle | Typography presets | [ ] |
| 3 | §3 themes | Semantic + theme remap on text | [ ] |
| 4 | §5 layout, §6 sizing | Single `layout` root — all props | [ ] |
| 5 | §5 icon / media | Other leaf kinds | [ ] |
| 6 | §5–7 | Composition: `let`, children, spacer | [ ] |
| 7 | §4, §7 | Params, variants, conditionals | [ ] |
| 8 | §5 instances | Multi-component + scoping | [ ] |
| 9 | §15 / §14 | Layers & materials | [ ] |
| 10 | §8, §4d–4e | Interaction, emits, ForEach | [ ] |
| 11 | §4a–4b | Protocols & slots | [ ] |

---

## Phase 0 — Blank file + token spine

**Spec:** §2 (entry), §3 (primitive / semantic).

Start `lab.pdl` with only tokens (no component yet — Tokens canvas is OK). Then add the smallest component when Phase 1 starts.

### 0.1 Primitives you will need

- [ ] `Color` — unquoted `#RGB` / `#RRGGBB` / `#RRGGBBAA`  
  *See:* tokens list / later text color uses them. **Quoted `"#…"` must fail.**
- [ ] `Opacity` — `0…1`  
  *See:* usable later with `@` and `opacity =`.
- [ ] `Distance` — spacing numbers  
  *See:* later `gap` / `padding` via token ref.
- [ ] `Radius` — number and `Corner(tl:…, tr:…, br:…, bl:…)`  
  *See:* later corners.
- [ ] `Shadow` — CSS box-shadow string  
  *See:* later drop shadow on layout.
- [ ] `FontFamily` / `Size` / `Weight`  
  *See:* later text props via token.
- [ ] `Sizing` token (optional) — `.hug` / `.fill` / `.fixed` / `.flex`  
  *See:* resolves when referenced.

### 0.2 Semantics (intent names)

- [ ] `semantic color.text.primary: Color = <primitive>`  
  *See:* components will reference **semantic**, not primitive.
- [ ] `semantic color.surface.canvas: Color = …`
- [ ] `semantic spacing.md: Distance = …`
- [ ] Prefer `color… @ opacity…` over raw `@ 0.75` once layers start (§3 opacity rule).

### 0.3 Entry hygiene

- [ ] `previewBackground = color.surface.canvas` (or hex)  
  *See:* iframe page background.
- [ ] Line comments `//` ignored.

---

## Phase 1 — Single `text` object (all permutations)

**Spec:** §5 `text` table, §6 colors / sizing / EdgeInsets.

Root a **text-only** component (no layout yet):

```pdl
component LabText() text {
  content = "Hello"
}
```

Tick each property by changing **one thing at a time** (or a tiny controlled set) and confirming the paint.

### 1.1 Content & color

- [ ] `content = "Hello"` — string shows  
- [ ] `color = #RRGGBB` — hex color  
- [ ] `color = color.text.primary` — **semantic token** (inheritance / resolve)  
- [ ] Change the semantic’s RHS primitive → text color updates without editing the component

### 1.2 Local typography (no typeStyle yet)

- [ ] `fontFamily = "…"`  
- [ ] `fontSize = 16` (and a second size, e.g. 28)  
- [ ] `fontWeight = 400` vs `700`  
- [ ] `lineHeight = 1.0` vs `1.5` (**unitless ratio** × fontSize)  
- [ ] `letterSpacing = 0` vs `0.05` (**em** units)

### 1.3 Box metrics on text

- [ ] `width = .hug` vs `.fill` vs `.fixed(200)` vs scalar `width = 200` (§6 sugar)  
- [ ] `height = .hug` vs `.fixed(48)`  
- [ ] `padding = 12` (uniform sugar)  
- [ ] `padding = EdgeInsets(x: 16, y: 8)`  
- [ ] `padding = EdgeInsets(top:…, right:…, bottom:…, left:…)`  
- [ ] `margin = 8` (when later inside a layout — note for Phase 6; on root may be subtle)

### 1.4 Alignment inside the text box

- [ ] `justify = .start` / `.center` / `.end` (main axis in text box)  
  *Need a wider `width` than the string to see this.*
- [ ] `align = .start` / `.center` / `.end` (cross axis)  
  *Need taller `height` than one line.*

### 1.5 Overflow & clamp

- [ ] Long `content` + `width = .fixed(120)` + `overflow = .hidden`  
- [ ] `textOverflow = .ellipsis` + `lineClamp = 1`  
- [ ] `lineClamp = 2` with multi-line string  
- [ ] `textOverflow = .clip` (no ellipsis)

### 1.6 Chrome on text

- [ ] `background = color.surface…` (solid behind glyphs)  
- [ ] `opacity = 0.5` on the text frame  
- [ ] `foreground = …` overlay (if visible — often a tint layer)

### 1.7 Opacity token on frame

- [ ] `opacity = opacity.…` (token, not bare literal)

**Phase 1 gate:** You can point at every row of the §5 `text` property table (except child-only flex props) and say you’ve seen it on a lone text root.

---

## Phase 2 — `typeStyle` presets

**Spec:** §3 Type styles; `style = Name` on text.

```pdl
typeStyle Body {
  fontFamily = "…"
  fontSize = 16
  fontWeight = 400
  lineHeight = 1.5
  letterSpacing = 0
}

typeStyle Title {
  fontFamily = "…"
  fontSize = 28
  fontWeight = 700
  lineHeight = 1.2
}
```

- [ ] `style = Body` alone sets the bundle  
- [ ] `style = Title` switches look without rewriting each prop  
- [ ] **Override after style:** `style = Body` + `fontSize = 20` → local wins  
- [ ] Override `color` while keeping `style`  
- [ ] Case-sensitive name: wrong case fails validate  
- [ ] Only valid **text** property names allowed inside `typeStyle { }`

**Phase 2 gate:** Typography comes from named presets; locals can override.

---

## Phase 3 — Token inheritance via themes

**Spec:** §3 Themes; resolve with Playground theme knob / bake `--theme`.

```pdl
theme Light {
  color.text.primary = color.primitive.gray.900
  color.surface.canvas = color.primitive.gray.050
}

theme Dark {
  color.text.primary = color.primitive.gray.050
  color.surface.canvas = color.primitive.gray.900
}
```

- [ ] Component uses **only semantics** (`color.text.primary`)  
- [ ] Theme **Light** — expected light text/surface  
- [ ] Theme **Dark** — same component, remapped colors (**no component edit**)  
- [ ] `previewBackground` follows surface semantic when themed  
- [ ] Theme may override a structured token wholly (optional: swap a `Background` semantic later in Phase 9)

**Phase 3 gate:** Changing theme remaps paint without editing the text component.

---

## Phase 4 — Single `layout` object (all permutations)

**Spec:** §5 `layout` table, §6 sizing / EdgeInsets / enums.

```pdl
component LabLayout() layout {
  direction = .column
  // put a known child text once you need content — or use background-only first
}
```

For empty shells, set explicit `width`/`height` + `background` so you can **see** the box. Then add one `let Label: text` child when testing gap/align.

### 4.1 Direction & axes

- [ ] `direction = .column`  
- [ ] `direction = .row`  
- [ ] `direction = .rowReverse`  
- [ ] `direction = .columnReverse`  
- [ ] `direction = .stack` — children overlap; **later child on top**

### 4.2 Align & justify

With **two+ children** of unequal size:

- [ ] `align = .start` / `.center` / `.end` / `.stretch`  
- [ ] `justify = .start` / `.center` / `.end`  
- [ ] `justify = .spaceBetween`  
- [ ] `justify = .spaceAround`  
- [ ] `justify = .stretch` (platform may approximate — note what HTML does)

### 4.3 Wrap & gaps

- [ ] `wrap = .nowrap` vs `.wrap` (enough children to wrap)  
- [ ] `gap = 8` (uniform)  
- [ ] `gap = spacing.md` (Distance token)  
- [ ] `columnGap` + `rowGap` with `wrap = .wrap` — per-axis spacing visible

### 4.4 Padding / margin / size

- [ ] `padding` sugar + `EdgeInsets` forms (same as text)  
- [ ] `margin` on an inner layout (parent must exist — nest or wait for Phase 6)  
- [ ] `width` / `height`: `.hug`, `.fill`, `.fixed(n)`, scalar sugar  
- [ ] `.flex(min:…)` / `.flex(min:…, max:…)` / `.flex(min:…, preferred:…, max:…)`

### 4.5 Visual chrome

- [ ] `background` solid color / semantic  
- [ ] `cornerRadius = 8`  
- [ ] `cornerRadius = Corner(tl:…, tr:…, br:…, bl:…)` or Radius token  
- [ ] `shadow = shadow.…` (or literal string)  
- [ ] `borderWidth` + `borderColor`  
- [ ] `borderPosition = .inside` / `.outside` — **note if HTML ignores** (known gap)  
- [ ] `opacity` literal + Opacity token  
- [ ] `overflow = .visible` / `.hidden` / `.scroll` / `.auto` / `.clip`  
  *Use oversized child to see clipping/scroll.*

### 4.6 Child-only props (need parent layout + child)

Put LabLayout as parent; child `let Box: layout` or text:

- [ ] `alignSelf = .start` / `.center` / `.end` / `.stretch` / `.auto`  
- [ ] `grow = 1` (row with sibling)  
- [ ] `shrink = 1` (constrained width)  
- [ ] `position = .absolute` + `inset = 8` (or EdgeInsets)  
- [ ] `position = .flow` default

**Phase 4 gate:** Every §5 `layout` property has been observed at least once (borderPosition may be HTML-noop — still author it).

---

## Phase 5 — `icon` and `media` leaves

**Spec:** §5 `icon`, `media`.

### 5.1 Icon

```pdl
component LabIcon() icon {
  icon = "star"
  size = 24
  color = color.text.primary
}
```

- [ ] `icon` + `size` + `color` bake  
- [ ] Sizing `width`/`height` if used  
- [ ] `opacity`  
- [ ] **HTML expectation:** tinted placeholder square is OK — you are testing bake + box, not glyph fonts

### 5.2 Media

```pdl
component LabMedia() media {
  source = "https://…"   // or a MediaSource token
  width = .fixed(240)
  aspectRatio = 1.5
  contentMode = .cover
}
```

- [ ] Raster URL shows `<img>`  
- [ ] `contentMode = .cover` / `.contain` / `.fill` / `.scaleDown` — visible difference  
- [ ] `aspectRatio` holds box shape  
- [ ] `objectPosition` variants — **note HTML fidelity**  
- [ ] `cornerRadius` / `opacity` / background under media  
- [ ] Bad/missing source → placeholder, not crash

**Phase 5 gate:** All four frame kinds have been rooted alone.

---

## Phase 6 — Composition (`let`, children, spacer)

**Spec:** §5 nested frames, children array; §7 composition; smallest example §1.

```pdl
component LabCard(title: String = "Title") layout {
  direction = .column
  gap = 8
  padding = 16
  background = color.surface.canvas
  cornerRadius = 12

  let Title: text = {
    content = title
    style = Title
    color = color.text.primary
  }

  children = [Title]
}
```

### 6.1 Structure

- [ ] Nested `let …: text` inside layout  
- [ ] Nested `let …: layout` with its own children  
- [ ] `children = [A, B]` order matches paint order  
- [ ] Deferred: `Row.children = [A, B]` after `let Row`  
- [ ] Unique `let` ids (duplicate id → error)

### 6.2 Spacer & instances-as-children (still one file)

- [ ] `children = [Left, .spacer, Right]` — Right pushed to trailing edge in a row  
- [ ] Child component instance later (Phase 8); for now two text lets + spacer

### 6.3 Text / layout props as children

- [ ] Text `alignSelf` / `grow` inside parent row  
- [ ] Nested padding + gap accumulate visibly

**Phase 6 gate:** A small card of layout + text (+ spacer) matches hand expectation.

---

## Phase 7 — Parameters, variants, conditionals

**Spec:** §4 variants & params; §7 `if` / `else`.

```pdl
variant Tone { case primary, secondary, danger }

component LabButton(
  label: String = "Button",
  tone: Tone = .primary,
  selected: Boolean = false
) layout {
  direction = .row
  padding = EdgeInsets(x: 16, y: 10)
  cornerRadius = 8

  if tone == .primary {
    background = color.…brand
  } else if tone == .secondary {
    background = color.…muted
  } else {
    background = color.…danger
  }

  if selected {
    // e.g. stronger border or foreground
  }

  let Label: text = {
    content = label
    color = color.…
    style = Body
  }

  children = [Label]
}
```

### 7.1 Params

- [ ] `String` param → `content = label`  
- [ ] `Boolean` param  
- [ ] Number param (e.g. padding scale) if you use one  
- [ ] Default applies when knobs empty  
- [ ] Playground param controls change bake

### 7.2 Variants / enums

- [ ] `variant` + `case` as param type  
- [ ] `enum` + `case` (alias — same behavior as `variant`)  
- [ ] Default `.case`  
- [ ] Knob / fixture switches case → conditional branch paints  
- [ ] Variants → **Grid** shows combinations (single axis auto; multi-axis OK if you authored few cases)

### 7.3 Conditions

- [ ] `if tone == .primary`  
- [ ] `else if` / `else`  
- [ ] Bare `if selected { }` (Boolean)  
- [ ] `!=`  
- [ ] `&&` / `||` (no illegal mixed ops)  
- [ ] `self.param` when a bind name collides (optional)

**Phase 7 gate:** One control expresses variant + boolean selection with visible branches.

---

## Phase 8 — Multi-component + instance scoping

**Spec:** §5 instances; locked decision on sibling scoping.

```pdl
component LabRow() layout {
  direction = .row
  gap = 12

  let Cancel = LabButton(label: "Cancel", tone: .secondary)
  let Save = LabButton(label: "Save", tone: .primary)

  children = [Cancel, Save]
}
```

- [ ] Two instances, **different** labels both correct  
- [ ] Different tones both correct  
- [ ] Changing knobs / interaction on one instance must **not** rewrite the sibling’s params  
- [ ] Nested instance kwargs: `LabButton(label: title)` where `title` is parent param  
- [ ] (Optional) second file + `import "./buttons.pdl"` merge — same canvas

**Phase 8 gate:** Multi-instance demo is trustworthy (Cancel ≠ Save).

---

## Phase 9 — Layers & materials

**Spec:** §15 / §14 layers; §3 `Background` / `Foreground` / Blur / Ramp / Vibrancy.

Build on `LabCard` / `LabButton`:

- [ ] Scalar `background = color…`  
- [ ] Array: `background = [color… @ opacity…]`  
- [ ] `Blur(blur: …)` layer under content  
- [ ] `Ramp(…)` → gradient-like fade  
- [ ] Vibrancy in layer — **author it; HTML may skip** (note)  
- [ ] `foreground = [color… @ opacity.state.hover]` over children  
- [ ] Named `semantic material.sheet: Background = […]` used as `background = material.sheet`  
- [ ] Theme swaps `material.sheet` wholly

**Phase 9 gate:** You can see under-content vs over-content stacks, not only flat fills.

---

## Phase 10 — Interaction, emits, ForEach

**Spec:** §8 interactions; §4a′ host prelude; §4d emits; §4e ForEach + handler assignment.  
**Host:** Playground HTML interactive host.

### 10.1 Host inbound (single component)

```pdl
component LabPress <PointerInput>(
  interactionState: LabState = .idle
) layout {
  // … chrome …
  let Label: text = { content = "Press me" }
  children = [Label]
  self.hoverStart = { interactionState = .hovered }
  self.hoverEnd = { interactionState = .idle }
  self.pressStart = { interactionState = .pressed }
  self.pressEnd = { interactionState = .hovered }
  self.pressCancel = { interactionState = .idle }
}
```

(Use your real param/variant names for idle/hovered/pressed — pattern from Airbnb / FilterChip.)

- [ ] Hover changes paint (state tree swap or rebake)  
- [ ] Press changes paint  
- [ ] Release / cancel restores  

### 10.2 Emit + parent capture

Parent owns SoT; child emits; ForEach derives Bool (**locked Pattern A**):

- [ ] Child `emits { select(filter: FilterId) }` (or your id type)  
- [ ] Child `self.pressEnd = { emit select(filter) }`  
- [ ] Parent `ForEach(chips) { chip in …; chip.select(id: FilterId) = { currentFilter = id } }`  
- [ ] `chip.selected = self.currentFilter == filter` bind into child  
- [ ] Child `if selected { … }` presentation only  
- [ ] Click updates SoT and **stays** after rebake  
- [ ] Nested hover on items still redraws

### 10.3 Host events that may be unwired

- [ ] `focusStart` / `focusEnd` — try; note if no host  
- [ ] `activate` — try; note if no host  
- [ ] `appear` / `dismiss` / `animate` — **tokens OK; no motion runtime expected**

**Phase 10 gate:** Pointer states + one selection list work end-to-end in the iframe.

---

## Phase 11 — Protocols & slots

**Spec:** §4a protocols; §4b array / slot expansion.

- [ ] `protocol P { …; emits { … } }`  
- [ ] `component Body <P>(…) layout { … }` conforms  
- [ ] Host component takes `[P]` or slot array param  
- [ ] `children = [Header, slots]` expands injected bodies  
- [ ] Soft-fail / pack injection only if you care (CLI); not required for visual walk

**Phase 11 gate:** A modal-like shell shows injected protocol bodies.

---

## Suggested one-sitting path (still blank canvas)

If you only have one session, author in this order and stop when time runs out:

1. Phase 0 tokens + Phase 1.1–1.5 (text color, type, align, ellipsis)  
2. Phase 2 typeStyle + Phase 3 one Dark theme  
3. Phase 4.1–4.5 layout box + gap/align with two text children  
4. Phase 6 card  
5. Phase 7 button with tone + selected  
6. Phase 8 Cancel/Save row  
7. Phase 10.1 hover/press on the button  
8. Phase 10.2 mini chip list (even 3 hard-coded items in ForEach)

Backfill Phase 5 (icon/media), 9 (layers), 11 (protocols) next.

---

## Deferred — do not block the walk

| Spec item | Expectation |
|-----------|-------------|
| B6 ForEach `before` / `between` / `after` | Deferred |
| Motion runtime (`animate`, stagger) | Tokens only |
| Real icon glyphs | HTML placeholder |
| Vibrancy paint | May skip in HTML |
| `borderPosition` | May no-op in HTML |
| TS bake for protocols/ForEach | Use Rust |
| `expose`, theme OO `theme : Base` | Removed / unused |

---

## Bug log

```text
Phase / checkbox:
Snippet (minimal):
See (expected):
Got:
Layer: parse | validate | bake | renderHtml | host
```

---

## Appendix — `renderHtml` readiness

Updated **2026-08-07** after emitter fixes. Remaining caveats only.

| Area | Status |
|------|--------|
| `previewBackground` | **Fixed** — bake resolves CSS color; HTML sets `--pdl-preview-background` on body |
| Text `align` / `justify` | **Fixed** — flex column shell + `text-align` (line-clamp still uses `-webkit-box`) |
| `borderPosition` inside/outside | **Fixed** — outside = CSS border; inside = inset `box-shadow` |
| `aspectRatio` / `objectPosition` | **Fixed** on media (+ layer images) |
| `justify = .stretch` | **Fixed** → `justify-content: stretch` |
| Layout `position: relative` | **Fixed** — absolute children resolve correctly |
| Vibrancy layers | **Fixed** (approx) — `backdrop-filter: saturate() brightness()`; still needs backdrop content |
| Icon glyphs | **Improved** — color swatch + icon name label (still not a font glyph set) |
| `enum` / `variant` keyword | **N/A in HTML** — bake IR is keyword-agnostic (`"type": "variant"`); both spellings bake/render identically |
| Stack + `spaceBetween` | **Inherent limit** — overlapping stack cannot distribute; maps to `start` |
| Blur without backdrop | **WEAK** — `backdrop-filter` no-ops over empty page chrome |
| focus / activate / motion runtime | Still **HOST / deferred** |
| Phases 10–11 live interaction | Still need Playground `interactiveHost` path |
