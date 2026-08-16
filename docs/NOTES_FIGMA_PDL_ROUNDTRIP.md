# Notes: Figma ↔ PDL round-trip

**Status:** exploratory notes (not a language proposal).  
**Intent:** track property-level deltas and missing elements while evaluating import/export. Language changes, if any, should become real proposals and lock-file updates — not this file.  
**Related:** [`manifesto.md`](./manifesto.md), [`PROPOSAL_PORTABLE_CORE.md`](./PROPOSAL_PORTABLE_CORE.md) (PDL as SoT; optional emitters), catalogue `variantTypes` / `variantTypeName` for future Figma emitters ([`SPEC_GAPS.md`](./SPEC_GAPS.md) Component Catalogue).

There is **no Figma importer or exporter** in this repo today. These notes assume a future bridge:

```text
Figma (link / file)
  → intermediate IR + sidecar (external ids, units, dropped props)
  → .pdl pack (foundation + components)
  → catalogue / bake
  → Figma again (update-by-id when mapped; create when not)
```

**Ideal proof:** provide a Figma link, run through PDL, receive a very similar or identical Figma file. Prefer **structural / near-visual** parity on a curated subset over pixel identity (explicit non-goal in portable-core).

---

## Sidecar and external ids

Keep Figma identities **outside** the language:

| Sidecar field | Why |
|---------------|-----|
| `figmaId` ↔ PDL name | Stable update-in-place and diff against the source file |
| Original path/name | `/` and spaces vs PDL dotted identifiers |
| Units provenance | e.g. line height px vs % before normalizing to PDL ratio |
| Dropped props | Scopes, code syntax, rotation, OpenType, … |
| Font style name | When PDL only stores numeric `fontWeight` |

Without ids, re-export can only match **by name**, which breaks as soon as either side renames.

---

## Slice 1 — Color variables

### Figma COLOR variable properties

Name, type `COLOR`, value per mode (RGBA or alias), collection, modes, description, scopes (frame/shape/text fill, stroke, effect color), code syntax (Web/iOS/Android), hidden-from-publishing, library remote id.

Solid only — gradients live in styles, not color variables.

### PDL targets

```pdl
primitive color.primitive.blue.500: Color = #3B82F6
semantic color.surface: Color = color.primitive.blue.500
theme Dark {
  color.surface = #0F172A
}
background = color.surface @ opacity.surface.tint
```

Literals: `#RGB` / `#RRGGBB` / `#RRGGBBAA`. Aliases via `semantic`. Modes via `theme` (whole-token replace). No token description, scopes, code syntax, collections, or publish flags.

### Round-trip

| Property | Verdict |
|----------|---------|
| Solid RGB(A) | **Clean** (fixed float↔hex encode) |
| Alias | **Clean** if primitive vs semantic roles preserved |
| Light/Dark (2 modes) | **Clean** as base + `theme Dark` |
| 3+ modes / multi-collection | **Structural remap** (multiple themes / conventions) |
| Name path | **Convention** + sidecar |
| Description, scopes, code syntax, publish, library id | **Lost** unless sidecar |
| Alpha model | Baked `#RRGGBBAA` **OK**; separate opacity bindings prefer `color @ opacity` |

**v1 bridge constraint:** one palette collection + one semantic collection; Light/Dark only; solid or alias values; naming map + id sidecar.

---

## Slice 2 — Text styles ↔ `typeStyle`

### Figma text style properties

In style: family + style name, size, line height (PIXEL \| PERCENT), letter spacing (PIXEL \| PERCENT), paragraph spacing/indent, decoration, letter case, OpenType, lists; optional variable bindings on typography fields.

**Not** in Figma text styles: color/fill, alignment, resizing (those stay on the layer).

### PDL `typeStyle`

Named bundle of **text-frame** props: `fontFamily`, `fontSize`, `fontWeight` (number), `lineHeight` (**unitless ratio**), `letterSpacing` (**em**). Applied with `style = Name`. Tokens may back fields. PDL may also put `color` / align / clamp on a typeStyle even though Figma would not.

### Round-trip

| Concern | Verdict |
|---------|---------|
| Family + size + numeric weight | **Clean** if style name ↔ weight mapped |
| Font style name / italic | **Lossy** without sidecar or new prop |
| Line/letter % | **Clean** ↔ ratio / em |
| Line/letter px | Convert via fontSize; **unit lost** unless sidecar |
| Paragraph / decoration / case / OpenType / lists | **Lost** (sidecar or language growth) |
| Color / alignment in style | **Asymmetric** — keep color on layers / Color vars for Figma export |

**v1 bridge constraint:** prefer % leading/tracking in source; roman weights mappable to numbers; drop rich text features or sidecar them; do not round-trip color inside the Figma text style.

---

## Slice 3 — Freeform frame (squares + text, no components)

### Scene

Parent FRAME with absolutely positioned RECTANGLE/TEXT children. No components, variants, or instances — a canvas layer tree.

### PDL reality

No orphan frames: wrap in a synthetic `component … layout`. Placement is flex **flow** or `position = .absolute` + `inset` (no `x` / `y`). Rectangles → `Layout` + fill; text → `Text`.

### Round-trip

| Concern | Verdict |
|---------|---------|
| Solid rect + size + radius + fill | **Good** |
| Plain single-run text | **Good** |
| Freeform x,y | **Usable** via absolute + inset derived from x/y/w/h |
| Z-order | **OK** via `children` order |
| Ellipse / vector / boolean / rotation | **Lost** |
| Constraints (pin/scale on resize) | **Lost** (static inset) |
| Mixed text runs, blend modes | **Lost** / partial |
| Group vs Frame | Flatten to `Layout` |
| Page / artboard | Synthetic component (`page`/`screen` still proposal-only) |

**Two strategies**

1. **Literal absolute dump** — best for “identical looking” proof; poor idiomatic PDL.  
2. **Structure inference** — prefer auto-layout / infer row-column; better PDL, weaker file identity.

---

## Slice 4 — Auto-layout frame (same nodes, AL on)

Same squares + text, but the parent (and maybe nested frames) use Figma **auto layout**. This is the scene that wants to become real PDL.

### Figma auto-layout (typical)

| Figma | Rough meaning |
|-------|----------------|
| `layoutMode` HORIZONTAL / VERTICAL | Main axis |
| `itemSpacing` | Gap between children |
| `padding` (T/R/B/L) | Insets |
| Primary / counter alignment | Justify / align |
| `layoutWrap` | Wrap |
| Primary/counter sizing | Fixed / hug / fill (and min/max) |
| Child `layoutGrow` / `layoutAlign` / absolute escape | Flex grow, cross align, absolute child |
| Strokes included in layout, spacing mode | Box-model nuances |

### PDL layout

| PDL | Notes |
|-----|--------|
| `direction` `.row` / `.column` (+ reverses, `.stack`) | Stack is overlap, not Figma AL |
| `gap` / `columnGap` / `rowGap` | |
| `padding` | `EdgeInsets` |
| `align` / `justify` | Closed enums |
| `wrap` | `.nowrap` / `.wrap` |
| `width` / `height` `.hug` / `.fill` / `.fixed(n)` / `.aspect` | |
| Child `alignSelf`, `grow`, `shrink` | `childFlexProps` |
| Child `position` + `inset` | Absolute escape hatch |

### Round-trip

| Concern | Verdict |
|---------|---------|
| Row/column + gap + padding | **Clean** |
| Hug / fill / fixed | **Clean** for the common triad |
| Align / justify (start/center/end/stretch/space-between) | **Mostly clean**; verify space-around / baseline gaps |
| Wrap | **Clean** for basic wrap |
| Absolute child inside AL | **OK** via `position` + `inset` |
| Min/max size, aspect on AL children | **Partial** (`.aspect` exists; min/max flex not full Figma) |
| `.flex(min, preferred, max)` | Exists in sizing model — map carefully from Figma min/max |
| Counter-axis stretch vs fixed | Usually OK; edge cases with text hug |
| “Space between” + extra Figma spacing modes | Confirm against bake HTML |
| Strokes included in layout size | May **drift** vs PDL border (borders do not change layout box) |
| Nested AL frames | **Good** — nested `Layout` |
| Freeform children mixed into AL | Per-child absolute; parent stays flow |

**Compared to freeform:** auto-layout is the **preferred** import path for packs meant to be maintained as PDL. Use absolute dump only when AL is absent or inference fails.

Example shape after import:

```pdl
component AlRow() layout {
  direction = .row
  gap = 8
  padding = EdgeInsets(x: 16, y: 12)
  align = .center
  justify = .start
  width = .fill
  height = .hug

  let square = Layout(width: 64, height: 64, background: #FF5A5F, cornerRadius: 8)
  let label = Text(content: "Hello", style: Body, color: color.text)
  children = [square, label]
}
```

---

## Cumulative gaps (candidates for sidecar vs language)

Legend: **S** = sidecar/export metadata sufficient · **L?** = possible language / lock-file growth · **N** = intentional non-goal for now

### Tokens / themes

| Gap | Tag |
|-----|-----|
| Token description | S or L? |
| Variable scopes (fill vs stroke vs effect) | S or L? |
| Code syntax (CSS / Swift / Compose) | S |
| Publish / hidden from library | S |
| Library remote id + local `figmaId` | S |
| First-class collections | S or L? |
| N-mode themes beyond base + named `theme` | L? (multiple themes already; UX/docs) |

### Typography

| Gap | Tag |
|-----|-----|
| Font style name / italic / width axes | S or L? |
| Line/letter spacing unit provenance | S |
| Paragraph spacing / indent | L? |
| Text decoration / letter case | L? |
| OpenType features / lists | N or L? |
| Color inside text style (Figma omits; PDL allows) | Policy: don’t mirror into Figma styles |

### Layout / scene

| Gap | Tag |
|-----|-----|
| Orphan frames / pages without `component` | L? (`page`/`screen` proposal) |
| Explicit `x` / `y` (vs inset conversion) | N or L? |
| Resize constraints | L? or N |
| Rotation / 2D transforms | N or L? |
| Vector / ellipse / boolean geometry | N (asset/`Media` fallback) |
| Blend modes | N or L? |
| Rich text runs in one node | L? |
| Stroke-in-layout vs PDL border box | Document / measure |
| Min/max sizing parity with Figma AL | L? (extend sizing) |

---

## Suggested proof order

1. Color variables only (ids + Light/Dark + aliases)  
2. + text styles (core fields; sidecar for units/style name)  
3. + one **auto-layout** frame of rects + text  
4. + freeform frame (absolute dump) as stress / fallback  
5. Named components / variants (catalogue-shaped) later  

Acceptance: bake HTML smoke + re-exported Figma compared by structure and bound values; id map must allow second-run **update** without duplicating nodes.

---

## Open product questions

1. Is Figma a **migration on-ramp** and review surface, or a permanent dual SoT? (Manifesto prefers PDL as SoT; export fits better than import-as-SoT.)  
2. How much Figma-only metadata belongs in-language vs forever sidecar?  
3. For freeform artboards, do we ever want authored `x`/`y`, or always convert to inset/flex?  
4. Should `page` / `screen` land before any “whole file” importer?
