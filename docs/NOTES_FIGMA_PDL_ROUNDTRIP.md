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

Legend: **S** = sidecar/export metadata sufficient · **L?** = possible language / lock-file growth · **N** = intentional non-goal for now · **P** = already proposed / partially shipped

Decision columns to fill when prioritizing: **Address?** (ship language / sidecar-only / drop) · **Host cost** (HTML / native) · **Round-trip need** (identity proof vs DS packs).

### Tokens / themes

| Gap | Tag | Notes |
|-----|-----|--------|
| Token description | S or L? | Figma variable description |
| Variable scopes (fill vs stroke vs effect) | S or L? | Picker scopes only |
| Code syntax (CSS / Swift / Compose) | S | Dev Mode handoff |
| Publish / hidden from library | S | |
| Library remote id + local `figmaId` | S | Required for update-in-place |
| First-class collections | S or L? | vs file/prefix convention |
| N-mode themes beyond base + named `theme` | L? | Multiple themes exist; multi-mode UX |

### Typography

| Gap | Tag | Notes |
|-----|-----|--------|
| Font style name / italic / width axes | S or L? | PDL has numeric `fontWeight` only |
| Line/letter spacing unit provenance | S | px vs % vs em |
| Paragraph spacing / indent | L? | |
| Text decoration / letter case | L? | underline, strikethrough, upper/lower |
| OpenType features / lists | N or L? | |
| Rich text runs in one node | L? | Split nodes or ignore |
| Color inside text style | Policy | Figma omits; PDL allows — don’t export into text styles |

### Layout / scene

| Gap | Tag | Notes |
|-----|-----|--------|
| Orphan frames / pages without `component` | L? / P | `page`/`screen` proposal |
| Explicit `x` / `y` | N or L? | Convert via `position`+`inset` |
| Resize constraints | L? or N | Pin/scale on parent resize |
| Rotation / standing 2D transforms | N or L? | `Pose.rotate` is motion-only today |
| Min/max sizing parity with Figma AL | L? | `.flex(min,preferred,max)` partial |
| Stroke included in layout size | Document | PDL borders do not change layout box |
| Grid layout (Figma layout grid / CSS grid) | N or L? | Flex subset only |
| Baseline alignment | N or L? | |

---

## Primitives punch list (Figma visual model ↔ PDL)

Focus: **paint / geometry / effects / media** — what Figma authors expect on layers vs what lock files express today.

### Already in PDL (good enough for many DS packs)

| Capability | PDL today |
|------------|-----------|
| Solid color (+ alpha hex / `color @ opacity`) | `Color`, `Opacity` |
| Linear-ish ramps | `Ramp` + `GradientStop` (directional; not full CSS/Figma gradient UI) |
| Drop shadow (one) | `shadow = Shadow(x:, y:, blurRadius:, color: [, spread:])` |
| Layer blur / background blur | `effect = Effect(.blurSelf \| .blurBehind, radius:)` (+ `blur = n` sugar) |
| Vibrancy knobs on blur | `Vibrancy(saturation:, brightness:)` on Effect/Blur |
| Corner radius (uniform + per-corner) | `Radius` / `Corner(…)` |
| Border stroke (simple) | `borderWidth` / `borderColor` / `borderPosition` |
| Opacity | frame `opacity` |
| Image/video as media frame or fill | `Media` / `MediaLayer` + `contentMode` |
| Icons as tintable refs | `Icon` / `IconRef` + catalogs |
| Stacked fills | `background` / `foreground` layer lists |

### Effects & materials

| # | Gap | Figma | PDL | Tag | Address? |
|---|-----|-------|-----|-----|----------|
| E1 | **Glass** (light angle/intensity, refraction, depth, dispersion, frost) | Native Glass effect | `EffectKind.glass` **reserved**, not implemented (E4) | P / L? | |
| E2 | **Multiple effects per layer** | Up to 8 drop + 8 inner + blur + noise + texture + glass rules | **One** `effect` + **one** `shadow` | L? | |
| E3 | **Inner shadow** | Native | None (only drop `Shadow`) | L? | |
| E4 | **Noise** | Native effect | None | N or L? | |
| E5 | **Texture** | Native effect | None | N or L? | |
| E6 | Self + behind blur together | Allowed (glass exclusive with bg blur) | One effect slot; behind shared with glass | L? (`effects = […]`) | |
| E7 | Effect blend mode | Per-effect | None | N or L? | |

### Image / media adjustments

| # | Gap | Figma | PDL | Tag | Address? |
|---|-----|-------|-----|-----|----------|
| I1 | **Exposure** | Image fill adjust | None on `Media`/`MediaLayer` | L? or S | |
| I2 | **Contrast** | Image fill adjust | None | L? or S | |
| I3 | **Highlights / shadows** (tonal) | Image fill adjust | None | L? or S | |
| I4 | **Temperature / tint** | Image fill adjust | None | L? or S | |
| I5 | Saturation (image) | Image fill adjust | Only via `Vibrancy` on blur path, not general media | L? | |
| I6 | Image fill modes beyond contentMode | Crop/tile/reposition UI | `contentMode` only (`.cover`/`.contain`/`.fill`/`.scaleDown`) | L? or S | |
| I7 | Image as vector crop / mask | Common | No mask primitive | N or L? | |

*Decision hint:* I1–I5 are strong “Figma mock fidelity” items but weak “design system SoT” items — sidecar or pre-bake adjusted bitmaps may beat first-class language.

### Fills, strokes, geometry

| # | Gap | Figma | PDL | Tag | Address? |
|---|-----|-------|-----|-----|----------|
| G1 | Full gradient stops UI (radial, angular, diamond) | Yes | `Ramp` axis subset | L? or N | |
| G2 | Multi-stop color gradients as first-class | Yes | Via `Ramp`+color stops — verify parity | Document | |
| G3 | Dashed / dotted strokes | Yes | Solid border only | L? | |
| G4 | Stroke dash, cap, join, per-side weights | Yes | Uniform `borderWidth` | L? or N | |
| G5 | Ellipse / polygon / star / boolean ops / pen | Yes | No vector language | N → `Media` | |
| G6 | Masks / alpha masks | Yes | None | N or L? | |
| G7 | Layer blend modes (multiply, screen, …) | Yes | None | N or L? | |
| G8 | Individual stroke vs fill blend | Yes | N/A | N | |

### Transform & spatial (standing, not motion)

| # | Gap | Figma | PDL | Tag | Address? |
|---|-----|-------|-----|-----|----------|
| T1 | Standing rotation | Yes | Only `Pose.rotate` in motion | N or L? | |
| T2 | Standing scale / skew | Yes | Motion pose only / none | N | |
| T3 | Free `x`/`y` | Yes | `inset` only | N or convert | |
| T4 | Constraints | Yes | None | N or L? | |

### Variable / style metadata (primitives-adjacent)

Covered above under Tokens / Typography; include in same prioritization pass as E/I/G when scoping a bridge MVP.

### Suggested triage buckets

1. **Ship for DS round-trip MVP** — anything required for buttons/lists/pages with tokens + AL + variants (mostly already present).  
2. **Language candidates soon** — **E1 glass fields**, **E3 inner shadow**, **E2/E6 multi-effect**, maybe **G3 dashes** if packs need them.  
3. **Sidecar or asset bake** — **I1–I5 image adjusts**, OpenType, scopes, code syntax, figma ids.  
4. **Non-goals unless Studio competes with canvas** — vectors (G5), masks (G7), standing transforms (T*), noise/texture (E4–E5).

Open product calls specifically called out in conversation:

- Image contrast (and siblings) — language on `MediaLayer` vs preprocessed assets?  
- Glass — finish E4 with which Figma-like fields, and HTML/native host fidelity expectations?

---

## Suggested proof order

1. Color variables only (ids + Light/Dark + aliases)  
2. + text styles (core fields; sidecar for units/style name)  
3. + one **auto-layout** frame of rects + text  
4. + freeform frame (absolute dump) as stress / fallback  
5. Named components / variants (catalogue-shaped)  
6. Nested instances  
7. Page / device mock + scroll  
8. Mock data → `samples` banks (+ fixtures for worlds)  

Acceptance: bake HTML smoke + re-exported Figma compared by structure and bound values; id map must allow second-run **update** without duplicating nodes.

---

## Open product questions

1. Is Figma a **migration on-ramp** and review surface, or a permanent dual SoT? (Manifesto prefers PDL as SoT; export fits better than import-as-SoT.)  
2. How much Figma-only metadata belongs in-language vs forever sidecar?  
3. For freeform artboards, do we ever want authored `x`/`y`, or always convert to inset/flex?  
4. Should `page` / `screen` land before any “whole file” importer?  
5. Image adjustments (contrast, exposure, …) — first-class on `MediaLayer`, or bake adjusted assets + sidecar?  
6. Finish `.glass` (E4) with which fields, and what host fidelity is “good enough”?  
7. Multi-effect / inner shadow — required for DS packs, or Figma-polish only?
