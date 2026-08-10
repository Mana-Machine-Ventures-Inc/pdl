# PDL — Programmatic Design Language: Full Specification

> **Single-document reference.** This file consolidates the PDL developer specification (chapters 1–19) plus the formal specification additions (chapters 20–26) into one reviewable document. Navigation links between former chapter files have been removed; use your editor's heading search instead.
>
> **Repository path:** `docs/full-spec.md` (normative copy in this repo).
>
> **Locked language decisions (2026-08-06; selection revised 2026-08-07; host handlers revised 2026-08-07):** (1) **`expose` removed** — all component params are public; **`emits`** is the public **child→parent** output API. (2) **`self` / `self.param`** means the enclosing component instance; bare `self` may be an emit payload. Rules-query `self` is rules-scoped only. (3) **Selection SoT** — parent owns id/enum SoT; ForEach derives Bool presentation (`chip.selected = …`). (4) **Handler assignment is one family** — declared emits: `item.channel(…) = { … }` / `Field.change(…) = { … }` (not list `chips.select`, **PDL-E036**). Host inbound: **`[self.]channel = { … }`** in the component kind body (`self.` optional — kind-body names already mean this instance; `self.` is clarifying). The `interaction` keyword is **removed** (**PDL-E001**). Same `=` / `{ }` shape; **different direction** (parent vs environment). (5) **`ForEach` requires an item binder** — `ForEach(chips) { chip in … }`. (6) **API protocols** — `protocol P: component { … }`. **Host protocols** — `protocol P { host … inbound channels … }` (no `: component`). (7) **`enum` ≡ `variant`** in v1. (8) Prelude hosts **`PointerInput`** / **`EditableText`** are stubbed in §4a (always in scope). Inline `} interaction { on … }` is **transitional** until compilers accept `self.pressEnd = { … }` as the canonical form. **PDL-E030** / **PDL-E031**. See §4a / §8.

---

## Table of Contents

**Language Reference**
1. [Overview & Mental Model](#1-overview--mental-model)
2. [Files, Imports, and Entry](#2-files-imports-and-entry)
3. [Tokens, Themes, and Type Styles](#3-tokens-themes-and-type-styles)
4. [Variants, Enums, and Component Parameters](#4-variants-and-component-parameters)
4a. [Protocols (B1)](#4a--protocols-b1)
4a′. [Host protocol prelude stubs](#4a--host-protocol-prelude-stubs)
4b. [Array params & children expansion (B2)](#4b--array-params--children-expansion-b2)
4c. [Injection packs (B3)](#4c--injection-packs-b3)
4d. [Emits & host inbound (B4)](#4d--emits--host-inbound-b4)
4e. [ForEach & layout emit capture (B5)](#4e--foreach--layout-emit-capture-b5)
5. [Components, Frames, and Properties](#5-components-frames-and-properties)
6. [Values and Expressions](#6-values-and-expressions)
7. [Conditional Overrides, `let`, and Composition](#7-conditional-overrides-let-and-composition)
8. [Interactions](#8-interactions)
9. [Tooling, CLI, and Limits](#9-tooling-cli-and-limits)
10. [Quick Reference (Syntax Cheat Sheet)](#10-quick-reference-syntax-cheat-sheet)
11. [Companion Blocks: `fixtures`, `usage`, `rules`, `extend`](#11-companion-blocks-fixtures-usage-rules-extend)
12. [Rules Query Language](#12-rules-query-language)
13. [Motion Tokens and Interaction Animation](#13-motion-tokens-and-interaction-animation)
14. [Visual Layers: `background`, `foreground`, and Layer Constructors](#14-visual-layers-background-foreground-and-layer-constructors)
15. [Best Practices](#15-best-practices)

**Implementer Reference**
16. [Component Catalogue and Pipeline](#16-component-catalogue-and-pipeline)
16a. [Reference CLI wire JSON (compact serialization)](#16a--reference-cli-wire-json-compact-serialization)
16b. [Serialised ValueExpr JSON (`SerialisedValueExpr`)](#16b-serialised-valueexpr-json-serialisedvalueexpr)
16c. [Graph exports (`graphSystem`, `graphComponent`)](#16c-graph-exports-graphsystem-graphcomponent)
16d. [Baked design JSON (`bakeSystem`, `bakeComponent`)](#16d-baked-design-json-bakesystem-bakecomponent)
17. [Emitters, Compiler Targets, and the Design Manifest](#17-emitters-compiler-targets-and-the-design-manifest)
18. [Regeneration Checklist](#18-regeneration-checklist)
19. [Open Spec Items](#19-open-spec-items)

**Formal Specification**
20. [Lexical Specification](#20-lexical-specification)
21. [Formal Grammar (EBNF)](#21-formal-grammar-ebnf)
22. [Namespace and Scoping Rules](#22-namespace-and-scoping-rules)
23. [Type System and Name Resolution](#23-type-system-and-name-resolution)
24. [Error Catalog](#24-error-catalog)
25. [Conformance Specification](#25-conformance-specification)
26. [Versioning and Stability Contract](#26-versioning-and-stability-contract)

---

## 1 — Overview & Mental Model

## What PDL is

**PDL (Programmatic Design Language)** is a text language for:

- **Design tokens** (primitive and semantic, typed) — including **motion** and **visual effect** types (§3, §14, §15)  
- **Themes** (token overrides per theme; composites such as materials and motion curves)  
- **Typography presets** (`typeStyle`)  
- **Components** built from hierarchical **frames**  
- **Variants** (finite enums for props)  
- **Conditional overrides** (`if` / `else if` / `else` inside frames)  
- **Interactions** (event → parameter updates; preview and optional static hooks) (§8)  
- **Companion metadata** — **`fixtures`**, **`usage`**, **`rules`** (**`tags` / `tags.add` only inside `rules {}`**), **`extend`** (§11)  

A `.pdl` **module** is parsed into a **partial design definition**; the **entry file** and **`import` graph** merge into a single resolved design. The PDL toolchain can serialise this as a **Component Catalogue** — a plain JSON file with a **token graph** (**`primitives` / `semantics` / `themes` / `typeStyles`**: definitions and overrides use **`primitive:`** / **`semantic:`** pointer strings where bare token idents appear in source), **pre-resolved default and variant frame trees** (with the same markers on frame props), and **property deltas** between variant tuples — which emitters consume without parsing PDL or re-implementing merge (§16). Runtime literal values for a skin still come from walking that graph (or from **`bakedDesign`**, §16d).

**Schema version:** The current PDL specification version is **`1.0.0-beta`**. All published catalogue files and design manifests **MUST** carry `"schemaVersion": "1.0.0-beta"` until a stable release is declared. Breaking changes will bump the major version; additive changes bump minor.

---

## Core vocabulary

| Concept | Meaning |
|--------|---------|
| **Entry file** | Root `.pdl` that lists `import` lines; defines merge order (§2). |
| **Primitive token** | Raw value (`Color`, `Distance`, `Blur`, …). |
| **Semantic token** | Named intent; RHS usually references other tokens. |
| **Theme** | Named token override bundles; **combined** at resolve time via primary `theme` + ordered **`modifiers`** (§3, §16). |
| **Type style** | Named bundle of **text** frame properties. |
| **Variant** | Named `case` set; used as a **parameter type**. |
| **Component** | Parameters + **root frame** (`layout`, `text`, `icon`, `media`). |
| **Frame** | Kind + properties + optional **children**. |
| **`let` frame** | Nested named frame in a component. |
| **Fixture (`example`)** | Named **parameter map** for preview/tests/codegen (§12). |
| **Rule** | **Query + strength** constraint on resolved trees (§13). |
| **Emitter / compiler target** | Consumer of resolved output (HTML, manifest, …) (§17). |
| **Design manifest** | Versioned **JSON** summary for tooling and runtimes (§17). |

---

## Syntax conventions

- **Identifiers**: `MyComponent`, `color.text.primary`, `spacing_md` — letters, digits, `_`, `.` where grammar allows.  
- **Dot enums**: Variant cases and many keywords use a leading dot: `.row`, `.primary`, `.cover`.  
- **Comments**: Line (`// …`) and block (`/* … */`) comments  
- **Strings**: Double quotes; escaping (`\"`, `\\`, …). **Hex colors are not strings** — write `#RRGGBB`, not `"#RRGGBB"` (§3, §6).  
- **Numbers**: Integer or decimal where allowed.  

Full cheat sheet: §11.

---

## Frame kinds (four)

| Kind | Role |
|------|------|
| `layout` | Flex-like container: direction, gap, padding, **wrap**, **justify** / **align**, **layers**, sizing (§5). |
| `text` | Typography + optional `typeStyle`. |
| `icon` | Named icon glyph + size/color. |
| `media` | **Media** slot: raster, vector, video, etc. via **`source`** (`MediaSource`) + layout props (§5). |

Every component declares one root kind: `component Name(…) layout { … }` (or `text`, `icon`, `media`).

---

## Separation of concerns (best-practice mental model)

1. **Primitives** — minimal palette and raw motion/blur values.  
2. **Semantics** — stable names consumed by components.  
3. **Themes** — remap semantics (light/dark, **reduced motion**, brand).  
4. **Components** — semantic tokens and variants; avoid ad-hoc literals except demos.  
5. **Type styles** — shared typography.  
6. **Materials** — composite **`Background`** / **`Foreground`** tokens for repeated stacks (§15).  
7. **`emits` + `fixtures`** — output intents and examples for systems that integrate PDL (§4d / §11).  

---

## Example: smallest component

```pdl
component Greeting(title: String = "Hello") layout {
  direction = .column
  padding = EdgeInsets(x: 16, y: 16)

  let Title: text = {
    content = title
  }

  children = [Title]
}
```

---

## Documentation map

Normative chapters **01–18** live in the Table of Contents. **Implementers** rebuilding the pipeline should follow §18.
---

## 2 — Files, Imports, and Entry

## Entry file

The **entry** `.pdl` file (e.g. `design.pdl`) is the root of the **merged** design.

Typical responsibilities:

1. Optional **`previewBackground`** — `Color` token for studio/HTML preview canvas.  
2. **`import "relative/path.pdl"`** — pull in tokens, typography, themes, components, **companion blocks**.  
3. Optional **inline** top-level declarations (less common when splitting by file).

### Example (`design.pdl`)

```pdl
// Merge order: imports first; this file wins on symbol conflicts.

previewBackground color.surface.primary

import "design/tokens.pdl"
import "design/motion.pdl"
import "design/typography.pdl"
import "design/themes.pdl"
import "design/buttons.pdl"
import "design/components.pdl"
```

---

## Top-level declaration kinds

These may appear in any **module** (entry or imported). Order **within** a file is free unless a feature adds forward-reference rules (default: **components and tokens** may reference only **already merged** symbols from the whole import closure after merge).

| Kind | Purpose |
|------|---------|
| `import` | Pull another module |
| `previewBackground` | Preview canvas color |
| `primitive` / `semantic` | Tokens (§3) |
| `theme` | Theme blocks |
| `typeStyle` | Typography presets |
| `variant` / `enum` | Closed finite case sets (same construct today; `enum` is a surface alias) |
| `protocol` | Shared param/emits contract for conforming components (§4a) |
| `component` | UI definition |
| *(removed)* `interaction` | Use `[self.]<channel> = { … }` in the kind body (§4a′ / §8) |
| **`fixtures`** | Example param instances (§12) |
| **`usage`** | Human-readable guidance (§12) |
| **`rules`** | Query constraints (§13) |
| **`extend`** | Augment an existing component (§12) |

---

## Import merge semantics

- Imports resolve **relative to the importing file** (or project root as configured by the loader).  
- The merge product is one resolved design definition.  
- **Tokens** (`primitive` / `semantic`) share one namespace: a second declaration of the same name is **`PDL-E003`** (`Invalid redeclaration of token \`…\``) — including across the import graph (§22).  
- Other top-level kinds (components, themes, …): later definitions **override** earlier ones for the same symbol key today; uniqueness rules for those namespaces are in §22.  
- The **entry file’s** own top-level declarations are merged **last** among its import closure.  

**Companion merge (normative — single policy):**

| Feature | Merge behavior |
|---------|----------------|
| `fixtures` | Merge **by example label** (display string); later block with the same label **replaces** that example's body. |
| `usage` | Per key: **`key =`** replaces; **`key +=`** appends with a **single space** separator. Unknown keys: **later file wins** per key. |
| `rules` | **`tags =`** / **`tags.add`** **only** appear inside **`rules`** blocks (§13). **`tags = […]`** in a later file **replaces** the entire tags array for that component. **`Rule(…)`** lines: **append** to the rule list in merge order. Duplicate **`Rule`** lines (same strength and canonically equal serialized query) **MAY** be collapsed to one entry. |
| Host handlers | Lifted from `[self.]<channel> = { … }` in the kind body into catalogue `interactions[]` (synthetic name **`default`**). Multiple channels append; same channel last-wins. |
| `extend` | Processed in merge order **after** the base `component` exists; each inner section follows the same rules as standalone blocks. **Entry file wins** over imported files for the same component + same fixture label / same `usage` key. |

**Best practice:** comment the intended pipeline in the entry file: tokens → motion → typography → themes → components → **fixtures** / **emits** (or co-locate companions next to components).

---

## `previewBackground`

```pdl
previewBackground color.surface.primary
```

- **Argument:** a **`Color`** token name (semantic or primitive).  
- Used by studio / HTML preview for canvas background.  
- **Bake:** resolvers emit a CSS color string on **`bakedDesign.previewBackground`** (after theme apply). **`renderHtml`** applies it as **`--pdl-preview-background`** on the document chrome.  

---

## Comments

Line and block comments (both treated as whitespace):

```pdl
// line comment
primitive color.brand: Color = #002fff  // inline

/*
  Block comment — may span lines.
  ForEach(chips) { chip in
    chip.title = "A"
  }
  */
```

---

## File organization (recommended)

| File(s) | Contents |
|---------|-----------|
| `tokens.pdl` | `primitive` / `semantic` for color, type, space, effects |
| `motion.pdl` | `Duration`, `Easing`, `Transition` tokens (§14) |
| `materials.pdl` | `Background` / `Foreground` semantic stacks (§15) |
| `typography.pdl` | `typeStyle` |
| `themes.pdl` | `theme` blocks |
| `variants.pdl` | Shared `variant` / `enum` closed sets |
| `*.pdl` features | `component`, host inbound `[self.]<channel> = { … }`, **`emits`**, **`fixtures`**, **`usage`**, **`rules`** |
| `app-extensions.pdl` | **`extend`** for library components |
| `design.pdl` | `import` + `previewBackground` only |

There is no `export` keyword: every merged top-level symbol is visible project-wide. **All component parameters are public**; **`emits`** is the public output API (§4d). There is no separate `expose` filter.

---

## See also

- §16 — merge implementation sketch  
- §18
---

## 3 — Tokens, Themes, and Type Styles

## Primitive tokens

Syntax:

```pdl
primitive <name>: <TokenType> = <value>
```

- **name**: dotted identifiers encouraged, e.g. `color.primitive.blue.500`.  
- **TokenType**: one of the **built-in types** (complete table below).  
- **value (primitive):** a **literal** (or literal composite such as `#RRGGBB @ 0.5` / `#RRGGBB @ opacityToken`). A bare token identifier on a `primitive` RHS is **PDL-E005** — use **`semantic`** to alias or retarget tokens.  
- **value (semantic):** literal, **same-type** token reference, or structured value valid for that type (§23.2).  

---

## Complete token type catalog

| Type | Category | Typical use | RHS notes | Example |
|------|----------|-------------|-----------|---------|
| `Color` | color | Fills, text, borders | Unquoted `#RGB` / `#RRGGBB` / `#RRGGBBAA`, or token ref — **quoted hex is invalid** | `primitive color.primitive.blue.500: Color = #3B82F6` |
| `Opacity` | alpha | **Alpha multipliers (0–1)** — **preferred** wherever a color is tinted (e.g. `@` on a color in a layer, state overlays). Use **named primitives + semantics** so themes can remap scrims and tints without hunting literals. | Number literal or `Opacity` token ref | `primitive opacity.primitive.scrim: Opacity = 0.4` then `semantic opacity.surface.tint: Opacity = opacity.primitive.scrim` |
| `Distance` | spacing | Gaps, padding axes | Non-negative number (px), or (on **`semantic`**) a `Distance` token alias — not a string | `primitive spacing.primitive.md: Distance = 12` |
| `Radius` | shape | Uniform corner radius | Non-negative number, or (on **`semantic`**) a `Radius` token alias — **not** `Corner(…)` | `primitive radius.primitive.md: Radius = 10` |
| `Shadow` | effect | Drop shadows | **`Shadow(x:, y:, blurRadius:, color: [, spread:])`** constructor (§6). Axes are numbers (or numeric token refs); `color` is a `Color` (hex / token / `color @ opacity`). Optional `spread` defaults to `0`. Resolved IR is a JSON object `{ kind: "shadow", x, y, blurRadius, spread, color }` — emitters map fields to the platform (HTML → CSS `box-shadow`). A CSS box-shadow **string** on a `Shadow` token is **PDL-E005**. | `primitive shadow.card: Shadow = Shadow(x: 0, y: 4, blurRadius: 12, color: #000000 @ 0.15)` |
| `Icon` | asset | Glyph id | String | `primitive icon.primitive.star: Icon = "star"` |
| `MediaSource` | asset | **Raster, vector, video, or other media ref** — today often a **string** URL/path (raster); evolves to a tagged union per emitter (§5 §`media`). | `primitive media.hero: MediaSource = "https://example.com/hero.jpg"` |
| `Ratio` | layout | Aspect ratio | Positive number, or **`W:H` sugar** (e.g. `16:9` → `16/9`) | `primitive ratio.video: Ratio = 16:9` |
| `FontFamily` | typography | Font stack | String | `primitive font.body: FontFamily = "Inter, system-ui, sans-serif"` |
| `Size` | typography | Font size (px / design units) | Number | `primitive type.size.body: Size = 16` |
| `Weight` | typography | Font weight | Number | `primitive type.weight.medium: Weight = 500` |
| `LineHeight` | typography | Leading as a **unitless ratio** of `fontSize` (e.g. `1.35`) | Positive number | `primitive type.lineHeight.body: LineHeight = 1.35` |
| `LetterSpacing` | typography | Tracking in **em** units (fraction of `fontSize`; may be negative) | Number | `primitive type.letterSpacing.tight: LetterSpacing = -0.01` |
| `Sizing` | layout | Hug/fill/flex | Sizing literal (rare at token level) | `primitive sizing.sidebar: Sizing = .fill` |
| `Duration` | motion | Animation length | Number (ms) (§14) | `primitive motion.duration.fast: Duration = 150` |
| `Easing` | motion | Curves | String or enum literal (§14) | `primitive motion.easing.standard: Easing = "cubic-bezier(0.2, 0, 0, 1)"` |
| `Transition` | motion | duration + easing + optional delay (defaults to 0) | Tuple literal (§14) | `semantic motion.appear: Transition = (duration: motion.duration.fast, easing: motion.easing.standard)` |
| `Blur` | visual effect | Blur radius | Number (§15) | `primitive blur.standard: Blur = 16` |
| `Vibrancy` | visual effect | Saturation/brightness intent | Tuple (§15) | `primitive vibrancy.sheet: Vibrancy = (saturation: 1.2, brightness: 1.05)` |
| `Ramp` | visual effect | Opacity mask ramp | `direction` + `stops` (§15) | `primitive ramp.fade.bottom: Ramp = (direction: .bottomToTop, stops: [GradientStop(opacity: 1, position: 0.5), GradientStop(opacity: 0, position: 1)])` |
| `Background` | composite | Named layer stack (fills) — **same RHS shape** as **`Foreground`** (scalar color sugar or layer array); composite **under** children (§15); **prefer** `@ opacity…` over raw decimals on colors (§6) | `semantic material.sheet: Background = [Blur(blur: blur.sheet), color.surface.primary @ opacity.surface.tint]` |
| `Foreground` | composite | Named layer stack (over content) — **same RHS** as **`Background`**; composite **over** children (§15) | `semantic effect.hoverTint: Foreground = [color.primitive.black @ opacity.state.hover]` |

Examples:

```pdl
primitive color.primitive.blue.500: Color = #3B82F6
primitive opacity.primitive.scrim: Opacity = 0.4
semantic opacity.surface.tint: Opacity = opacity.primitive.scrim
primitive spacing.primitive.md: Distance = 12
primitive motion.duration.standard: Duration = 250
primitive motion.duration.fast: Duration = 150
primitive motion.easing.standard: Easing = "cubic-bezier(0.2, 0, 0, 1)"
primitive motion.easing.overshoot: Easing = "cubic-bezier(0.34, 1.56, 0.64, 1)"
primitive motion.easing.linear: Easing = "linear"

semantic motion.appear: Transition = (duration: motion.duration.standard, easing: motion.easing.standard)

semantic motion.dismiss: Transition = (duration: motion.duration.fast, easing: motion.easing.standard)

semantic motion.interactive: Transition = (duration: motion.duration.fast, easing: motion.easing.overshoot)

semantic motion.instant: Transition = (duration: 0, easing: motion.easing.linear)
```

> **Color literals:** hex must be **unquoted** (`#RRGGBB`). A quoted string that looks like hex (e.g. `"#FF0000"`) is a **parse error** — the parser rejects it so token and frame color values stay visually distinct from arbitrary strings.

### Opacity tokens (authoring rule)

Declare **reusable alpha** as **`Opacity`** primitives (palette) and **semantic** aliases (intent), e.g. `opacity.primitive.scrim`, then `semantic opacity.state.hover: Opacity = opacity.primitive.scrim` (reference: `opacity.state.hover`). **Do not** embed raw decimals like `0.75` in design-system surfaces when an **`Opacity`** token would communicate intent and participate in theming.

Use those names on the **right-hand side of `@`** after a color (see §6 and §15): **`color.surface.primary @ opacity.surface.tint`** is **preferred** over **`color.surface.primary @ 0.75`**. Numeric literals remain valid for **one-off demos** or generated output.

**Same `Opacity` tokens** apply anywhere an **opacity** is configured: frame **`opacity=`**, layer constructor **`opacity:`** arguments, **`GradientStop(opacity: …)`**, **`from` / `to`** animation blocks, etc. — **number or `Opacity` token** (§6).

---

## Semantic tokens

Syntax:

```pdl
semantic <name>: <TokenType> = <value>
```

Semantic tokens **name intent**. RHS is usually another token:

```pdl
semantic color.surface.card: Color = color.primitive.gray.050
semantic color.text.primary: Color = color.primitive.gray.900
semantic spacing.card.padding: Distance = spacing.primitive.md
semantic material.sheet: Background = [
  Blur(blur: blur.sheet, vibrancy: vibrancy.sheet),
  color.surface.primary @ opacity.surface.tint
]
```

**Rule of thumb:** components depend on **semantic** names so themes can remap surfaces **and materials** without editing component files.

---

## Themes

Syntax:

```pdl
theme ThemeName {
  <tokenName> = <valueExpr>
  …
}
```

- Body lines assign **token names** to **value expressions** (literals or token refs).  
- Used for light/dark/brand and **accessibility** variants.  

### Combinatorial composition (preferred)

Themes are **not** an extensible OO hierarchy. Each `theme { … }` block is a **named override bundle** (remap semantic tokens to other token names per the resolver). **Composition** happens at **resolution time**: **`ThemeContext`** supplies an optional **primary** `theme` and an ordered **`modifiers`** list; each named theme’s overrides are applied in sequence on top of the shared primitive + semantic map (§16, `getResolvedTokens`). Typical pattern: one theme for **appearance** (e.g. Light / Dark) and separate themes for **cross-cutting axes** (e.g. ReducedMotion), combined by choosing **`theme` + `modifiers`**, not by nesting “child extends parent” in source.

### Composite and motion overrides

Themes may override **structured** tokens (`Transition`, `Background`, …) **wholly** — assign a new literal or semantic reference; **partial deep merge** is **not** required unless explicitly specified for a type in a future `schemaVersion`.

```pdl
theme ReducedMotion {
  motion.appear = motion.instant
  motion.dismiss = motion.instant
  motion.interactive = motion.instant
}
```

(See §14 for `motion.instant`.)

---

## Type styles (`typeStyle`)

**Type styles** bundle **text** frame properties.

Syntax:

```pdl
typeStyle Body {
  fontFamily = "Inter"
  fontSize = 16
  fontWeight = 400
  lineHeight = 1.5
  letterSpacing = 0
}
```

Rules:

- Only **valid `text` frame property names** (§5).  
- Each line is `name = value`.  
- Text frames use **`style = TypeStyleName`**.  
- **Catalogue** keeps a **`typeStyle:`** ref (preset props live under **`typeStyles`**). **Bake** / HTML preview **expand** the preset into literal props on the frame (explicit props win).  

### Full example (tokens + type styles + component)

```pdl
primitive color.primitive.slate.800: Color = #1E293B
semantic color.text.default: Color = color.primitive.slate.800

typeStyle Heading {
  fontFamily = "Inter"
  fontSize = 24
  fontWeight = 700
  lineHeight = 1.35
}

component TypographyShowcase() layout {
  direction = .column
  gap = 8

  let HeadingText: text = {
    content = "Heading style sample"
    style = Heading
    color = color.text.default
  }

  children = [HeadingText]
}
```

---

## Cross-reference

- **Layer literals** on tokens and frames: §15  
- **Manifest token export**: §17  
- **Property tables** (where tokens attach to frames): §5
---

## 4 — Variants and Component Parameters

## Variants / enums

*(HTML / bake hosts are keyword-agnostic: both spellings resolve to the same closed-set type in catalogue `variantTypes` and baked param discriminators `"type": "variant"`.)*

A **`variant`** (alias **`enum`**) defines a **finite set of named cases**. These closed sets are used as **types** for component parameters and in conditions.

Syntax (equivalent):

```pdl
variant BannerTone {
  case success
  case warning
  case danger
}

enum FilterId {
  case all
  case podcasts
  case episodes
}
```

- **`enum` is a surface alias for `variant` in v1** — same AST, merge, catalogue, and bake behavior. Prefer **`variant`** when the type is a design-axis combinator (tone × size); prefer **`enum`** for domain ids and interaction/state sets. Tooling may interpret the keywords differently in a future revision (e.g. associated values like `secondary(counter: Int)`, or matrix vs non-matrix defaults).
- **Case names** are identifiers without dots.  
- In expressions, cases are written **`.caseName`** (leading dot).  

---

## 4a — Protocols (B1) + host roles

**Status:** shipped in the **Rust** portable core (`crates/pdl-core`); TypeScript oracle still accepts only pre-protocol grammar until a follow-up port. API/slots: `docs/PROPOSAL_SLOTS_PROTOCOLS_FIXTURES.md` §5. Host powers: `docs/PROPOSAL_PROTOCOL_CAPABILITIES.md` (accepted).

A **`protocol`** is the single conformance mechanism. It may describe:

| Role | Header | Peer | Meaning |
|------|--------|------|---------|
| **API** | `protocol P: component { … }` | Parent in the PDL tree | Shared params + optional **`emits`** (child→parent) for slots / mixed lists |
| **Host** | `protocol P { host … }` | Environment (Playground / app) | **Inbound** channels + host verbs — **no** `: component`; not a slot type |

**Directions (do not conflate):**

| Surface | Direction | Author wires with |
|---------|-----------|-------------------|
| **`emits` / `emit`** | Child → parent | Parent `item.select(…) = { … }` / `Field.change(…) = { … }` |
| **Host inbound** | Environment → component | Conformer `[self.]pressEnd = { … }` in the kind body (`self.` optional) |
| **Host verbs** | Component → environment | Call inside a handler (`beginEditing(value)`) |

Frame **kinds** stay on conforming components, not on the protocol. Host channel names are **not** public `emits` (they do not appear in parent catalogues as child intents).

```pdl
protocol ModalContent: component {
  title = "Modal Title"
  subtitle: String = ""
}

protocol SubnavItem: component {
  requires PointerInput
  title = ""
  filter: FilterId = .all
  emits { select(filter: FilterId) }
}

component UpsellBody <ModalContent>(cta: String = "Upgrade") layout { … }

component FilterChip <SubnavItem>(…) layout {
  …
  self.pressEnd = {
    emit select(filter)
  }
}
```

### Host prelude (always in scope)

Like frame kinds (`layout` / `text` / …), well-known **host** protocols are a **language prelude** — always in scope, **no import**. Normative stubs: **[§4a′](#4a--host-protocol-prelude-stubs)** below. Authors **opt in** with `component C <PointerInput>` or API `requires PointerInput` (**PDL-E030**). Restating a prelude host in a pack is optional documentation only; redefining a prelude name as an API protocol (params / child `emits` / `requires`) is **PDL-E032**.

Catalogue lists a prelude protocol only when a component **`conformsTo`** it or an API protocol **`requires`** it (`protocolRoles` / `hostProtocols`). Hosts (Playground HTML, apps) deliver inbound channels and implement verbs — they key off conformance + this stub, not pack imports.

### Protocol body

| Form | Meaning |
|------|---------|
| `: component` | Required header subject for **API** protocols. |
| `host` | Marks a **host** protocol (no `: component`, no child `emits`, no compositional params). |
| Inbound channel name | On host protocols: bare `pressEnd` (optional typed parens later) — assignable as `[self.]pressEnd = { … }` (`self.` clarifying). |
| Host verb name | On host protocols: documented for callsites inside handlers (`beginEditing`). |
| `requires HostProto` | API protocol pulls in a host (transitive). Targets **must** be host-role. |
| `name = default` / `name: Type = default` | API params only. |
| `emits { … }` | API child→parent channels only. |

### Conformance rules (v1)

| Rule | Intent |
|------|--------|
| API header | `protocol P: component { … }` — missing subject is a hard error. |
| Host header | `protocol P { host … }` — must **not** use `: component`. |
| `component C <P>(…)` | `C` conforms to protocol `P` (single protocol in v1). |
| Effective params of `C` | Protocol params ∪ component-own params; **same name replaces**. |
| Effective host protocols | If `P` is host → `{P}`; if API → transitive `requires` host set. |
| Host handlers | `self.<inbound> = { … }` legal in the component **kind body** when `<inbound>` is on an effective host protocol — else **PDL-E030**. |
| Host as slot type | `[PointerInput]` / `x: EditableText` → **PDL-E031**. |
| Catalogue | Root **`protocols`** (+ **`role`**, **`subject`**, inbound channels when serialised), **`protocolRoles`**, **`conformsTo`**, **`hostProtocols`**. |
| Unknown `P` | `PDL-E022`. |

### Editable text (host)

Stay on kind **`text`**. Opt into prelude **`EditableText`** (direct or via `requires`). Bind with **`editable = value`** (param name). Prefer orthogonal **`editing: Boolean`**. Wire inbound with `self.keyboardDismissed = { … }` / `self.keyboardCancelled = { … }`. Host verbs: see §4a′. Host writes the bound param on commit; `emit change` is optional parent notification.

Array/slot params typed as an **API** protocol (`[ModalContent]`) are **§4b**. Injection packs are **§4c**. Layout emit capture / ForEach are **§4e**.

---

## 4a′ — Host protocol prelude stubs

**Status:** **normative language surface** (this section is the SoT for prelude host contracts). Compilers inject these into every design merge. Packs **must not** redefine them as API protocols (**PDL-E032**). Wire inbound channels with `[self.]<channel> = { … }` in the component kind body (`self.` optional / clarifying). The former `interaction { on … }` / `interaction Name for Component` forms are **removed** (**PDL-E001**).

These stubs use the same keywords as author protocols. Inbound lines are **host channels** (not child `emits`). Verb lines document **host verbs** callable from handler bodies.

```pdl
// ── Language prelude (always in scope) ─────────────────────────────

protocol PointerInput {
  host

  // Inbound — environment → component (wire with self.<name> = { … })
  hoverStart
  hoverEnd
  pressStart
  pressEnd
  pressCancel
  focusStart
  focusEnd
  activate
  appear
  dismiss
}

protocol EditableText {
  host

  // Inbound
  keyboardDismissed
  keyboardCancelled

  // Host verbs (calls inside handler bodies; not assignable channels)
  //   beginEditing(value)   — start session bound to String param `value`
  //   cancelEditing()
  //   commitEditing()
}
```

| Prelude | Inbound channels (`self.<name> = { … }`) | Host verbs | Notes |
|---------|------------------------------------------|------------|--------|
| **`PointerInput`** | `hoverStart`, `hoverEnd`, `pressStart`, `pressEnd`, `pressCancel`, `focusStart`, `focusEnd`, `activate`, `appear`, `dismiss` | — | Pointer / focus / lifecycle. Playground wires hover/press today. |
| **`EditableText`** | `keyboardDismissed`, `keyboardCancelled` | `beginEditing(value)`, `cancelEditing()`, `commitEditing()` | Pair with kind **`text`** + `editable = param`. |

### Host handler assignment (canonical)

Handlers live in the component **kind body** (same enclosure as layout props / `if` / `let`). Bare `pressEnd = { … }` and `self.pressEnd = { … }` are equivalent — names in a kind body already refer to this instance; **`self.` is optional clarifying syntax**. Declared-emit capture keeps parentheses (`item.select(…) = { … }`) so it does not collide with bare host channels:

```pdl
protocol FormField: component {
  requires EditableText
  requires PointerInput
  value: String = ""
  placeholder: String = ""
  emits { change(value: String) }
}

component SearchField <FormField>(
  value: String = "",
  placeholder: String = "Search",
  editing: Boolean = false
) text {
  editable = value
  content = placeholder
  fontSize = 15
  color = #111111

  if editing {
    content = value
    borderColor = #0066FF
    borderWidth = 1
  }

  self.pressEnd = {
    if editing {
      // already editing — host owns the session
    } else {
      editing = true
      beginEditing(value)
    }
  }
  self.keyboardDismissed = {
    editing = false
    emit change(value)
  }
  self.keyboardCancelled = {
    editing = false
    cancelEditing()
  }
}
```

| Rule | Intent |
|------|--------|
| `[self.]<channel> = { … }` | Assign handler for a host inbound channel on an **effective** host protocol. `self.` is optional (kind-body names already refer to this instance). |
| Body | Same statements as today’s interaction handlers: param assigns, `emit`, `if`, host verbs, motion (§14). |
| Coverage | Using a host channel or verb without effective host conformance → **PDL-E030**. |
| Not child emits | Host channels are **not** captured by parents with `item.pressEnd = { … }`. |
| Removed | `interaction { … }` / `interaction Name for C` → **PDL-E001**; use `[self.]<channel> = { … }`. |

---

## Component parameters

Components declare their **parameters** (inbound public API — all of them) in parentheses after the name:

```pdl
component StatusBanner(
  label: String = "Everything is fine",
  tone: BannerTone = .success
) layout {
  …
}
```

### Parameter grammar

```pdl
name: TypeName = default
name: [TypeName] = [Instance(), …]   // array / slot list (§4b)
```

- **`TypeName`**:  
  - **`String`** — text parameters.  
  - **`AnyDeclaredVariant`** — use the variant’s name as the type (`BannerTone`, `M3ButtonForm`, …).  
  - **Protocol or component name** — single slot (`content: ModalContent = UpsellBody()`).  
  - Other identifier types may be accepted by the parser; **string and variant-typed** params are the common, well-supported paths for UI and interactions.  
- **`[TypeName]`** — array of component/protocol instances (see **§4b**).  

### Default values

| Form | Meaning |
|------|---------|
| `"quoted"` | String default |
| `42` | Numeric default |
| `.caseName` | Variant case default |
| `Name()` / `Name(…)` | Component instance literal (slot defaults) |
| `[Name(), …]` / `[]` | Array of instances |

Examples:

```pdl
component Chip(
  label: String = "Chip",
  tone: BannerTone = .success
) layout { … }
```

---

## 4b — Array params & children expansion (B2)

**Status:** shipped in the **Rust** portable core; TypeScript oracle unchanged for this slice. Proposal: `docs/PROPOSAL_SLOTS_PROTOCOLS_FIXTURES.md` §6.

```pdl
component Modal(
  chromeTitle: String = "Dialog",
  slots: [ModalContent] = [UpsellBody()]
) layout {
  let Header: text = { content = chromeTitle }
  children = [Header, slots]
}
```

| Rule | Intent |
|------|--------|
| `[T]` | Param type: array of instances whose concrete component is `T` or conforms to protocol `T` |
| Defaults | Instance literals `Name()` / `Name(param: value, …)`; empty `[]` allowed |
| Expansion | A list/slot param name in `children = […]` (or bare `children = slots`) splices evaluated instances in place (one level) — **only** mount site |
| Bare list sugar | `children = chips` ≡ `children = [chips]` when `chips` is a list/slot / let / instance ref (§4e) |
| Single slot | Non-array `content: ModalContent = UpsellBody()` also expands when referenced in `children` |
| Slot dotted override | `slot.field = value` on a **single** slot/instance param: if `field` is an effective **param** of the concrete component → kwargs before mount; otherwise → **root frame prop** after mount (same sugar as `L.padding = 50`). Array slots cannot use `slots.foo =` (**PDL-E034**) — use `ForEach` |
| Catalogue | Param `type` is `{ "kind": "array", "element": "…" }` for `[T]` |

```pdl
component AbnButton(
  simple: SimpleChip = SimpleChip(title: "Chip")
) layout {
  let L: text = { content = label }
  simple.content = "Override"   // root text prop on mounted SimpleChip
  simple.padding = 50           // root frame prop
  // simple.title = "X"         // would override the title param
  children = [L, simple]
}
```

Injection packs / soft-fail are **§4c**. `ForEach` / emit handler assignment are **§4e** (chrome `before`/`between`/`after` deferred as **B6** under §4e).

---

## 4c — Injection packs (B3)

**Status:** shipped in the **Rust** portable core (`pdl bakePack` / `validatePack`). Proposal: `docs/PROPOSAL_SLOTS_PROTOCOLS_FIXTURES.md` §9.3.

```json
{
  "schemaVersion": "1.0.0-beta",
  "component": "Modal",
  "theme": "Light",
  "params": {
    "chromeTitle": "Confirm",
    "slots": [
      { "component": "ConfirmBody", "params": { "title": "Delete?" } }
    ]
  }
}
```

| Rule | Intent |
|------|--------|
| Gate | `schemaVersion` → component exists → known params → protocol/concrete bounds on slot items |
| Bad list items | Soft skip with warning (do not fail the whole pack); remaining items bake |
| Unknown root param | Hard error (`PDL-E007`) |
| Bake | Same tree path as `bakeComponent`; provenance `bakeProfile` = `injection-pack` |

CLI: `pdl bakePack <entry.pdl> <pack.json>` · `pdl validatePack <entry.pdl> <pack.json>`.

---

## 4d — Emits & host inbound (B4)

**Status:** shipped in the **Rust** portable core (declare + fire; host dispatch is later). Proposal §8.

**Contracts:** every component **parameter** is public inbound surface. **`emits`** is the public **output** API (intents parents may hear). There is **no** `expose` filter and no language-level private params — PDL is not a runtime privacy system.

A component **declares** channels in any of these forms (effective emits = protocol ∪ own):

1. **Inline** after the root frame (preferred when co-located): `component C(…) layout { …; self.pressEnd = { emit select(filter) } } emits { select(filter: FilterId) }` — host handlers in the kind body
2. **Companion** top-level: `emits C { select(filter: FilterId) }`
3. **Protocol** body: `protocol P: component { … emits { select(filter: FilterId) } }` — shared channels for mixed lists

It **fires** them from host handlers with `emit …`, and a **parent** **captures** them in `layout` / `ForEach` with handler assignment (§4e). Component-to-component wiring is **params + `emits` only**.

### Emit signatures and payload types

An emit signature names a **channel** and zero or more **typed payload fields**. Types are **declared on the signature** (same style as component params) so callers and catalogue consumers know the object kind without inferring from other declarations.

```pdl
emits FilterChip {
  select(filter: FilterId)
}
```

| Rule | Intent |
|------|--------|
| `select(filter: FilterId)` | Channel `select` carries one field, `filter`, of type **`FilterId`** |
| Type required | Each payload field **MUST** include `: TypeName`. Allowed kinds: variants, primitives (`String`, …), **protocol** names, and **component** types. |
| Fire site | `emit select(filter)` binds by **name** to a value in scope (typically the component param of the same name); the value **MUST** type-check against the declared payload type. Authors **MAY** pass `self` when the payload type is this component or a protocol it conforms to. |
| Parent capture | `item.select(filter_id: FilterId) = { … }` (ForEach binder) or `Field.change(…) = { … }` (let/slot) **re-declares** typed payload fields and **assigns** the handler body. List-param `chips.select` is **PDL-E036**. |
| Catalogue | Effective emits record `{ name, args: [{ name, type }, …] }` |
| Protocol | Same typed form on protocol `emits { … }`; mixed-list parents rely on that shared typed channel |

Bare `emit select` / `select = { … }` (no payload parens) is allowed only when the declared signature has **no** payload fields; if the signature lists `(filter: FilterId)`, fire sites **MUST** supply `emit select(…)` and parents **MUST** write `select(…: …) = { … }`.

**Richer payloads** — ids/enums are the common case; a child may also emit a protocol-conforming item or itself:

```pdl
emits FeedRow {
  open(item: FeedRow)          // concrete self
  // or: open(item: FeedItem)  // protocol the row conforms to
}

// kind body (host inbound → promote):
self.pressEnd = {
  emit open(self)
}

// parent layout:
open(item: FeedRow) = {
  focused = item
}
```

### Example A — component emits only (no protocol)

One concrete chip type; the parent listens to that type’s channel.

```pdl
enum FilterId {
  case all
  case podcasts
}

component FilterChip(
  title: String = "All",
  filter: FilterId = .all,
  selected: Boolean = false
) layout {
  direction = .row
  if selected { /* selected chrome */ }
  let Label: text = { content = title }
  children = [Label]
  self.pressEnd = { emit select(filter) }
} emits {
  select(filter: FilterId)
}

// Parent: own SoT, mount chips, capture select (§4e handler assignment)
// Pattern A — derive Bool `selected` from SoT vs each chip’s identity
component FilterBar(
  currentFilter: FilterId = .all
) layout {
  direction = .row

  let All = FilterChip(
    title: "All",
    filter: .all,
    selected: currentFilter == .all
  )
  let Podcasts = FilterChip(
    title: "Podcasts",
    filter: .podcasts,
    selected: currentFilter == .podcasts
  )
  children = [All, Podcasts]

  All.select(filter_id: FilterId) = {
    currentFilter = filter_id
  }
  Podcasts.select(filter_id: FilterId) = {
    currentFilter = filter_id
  }
}
```

With a **list** of the same concrete type, prefer one capture next to the list (§4e):

```pdl
component FilterBar(
  currentFilter: FilterId = .all,
  chips: [FilterChip] = [
    FilterChip(title: "All", filter: .all),
    FilterChip(title: "Podcasts", filter: .podcasts)
  ]
) layout {
  direction = .row
  children = [chips]
  ForEach(chips) { chip in
    chip.select(filter_id: FilterId) = {
      currentFilter = filter_id
    }
  }
}
```

### Example B — shared emits on a protocol (mixed list)

When several concrete types appear in one list, put the **shared** channel on the protocol so the parent writes **`chip.select(…) = { … }` once** inside `ForEach`. Each conformer still **fires** `emit select(…)`; a per-component `emits` block is optional if the protocol already declares the channel (effective emits = protocol ∪ own).

```pdl
protocol SubnavItem: component {
  title = ""
  filter: FilterId = .all
  emits {
    select(filter: FilterId)
  }
}

component FilterChip <SubnavItem>(
  selected: Boolean = false
) layout {
  direction = .row
  if selected { /* selected chrome */ }
  let Label: text = { content = title }
  children = [Label]
  self.pressEnd = { emit select(filter) }
}

component IconFilterChip <SubnavItem>(
  glyph: String = "•",
  selected: Boolean = false
) layout {
  direction = .row
  if selected { /* selected chrome */ }
  let Mark: text = { content = glyph }
  let Label: text = { content = title }
  children = [Mark, Label]
  self.pressEnd = { emit select(filter) }
}

// Parent: polymorphic list; one select channel for every SubnavItem
component LibrarySubnav(
  currentFilter: FilterId = .all,
  chips: [SubnavItem] = [
    FilterChip(title: "All", filter: .all),
    IconFilterChip(title: "Podcasts", filter: .podcasts, glyph: "🎧")
  ]
) layout {
  direction = .row

  ForEach(chips) { chip in
    chip.selected = self.currentFilter == filter
    chip.select(filter_id: FilterId) = {
      currentFilter = filter_id
    }
  }
}
```

(`ForEach` / Pattern A Bool `selected` / emit handler assignment are **§4e**.)

| Rule | Intent |
|------|--------|
| `emits C { … }` | Component’s public **output** API (canonical home of emits) |
| Payload fields | Declared as `name: Type` on the signature (not inferred) |
| Protocol `emits { … }` | Optional shared channels for conformers / mixed lists (payloads typed from protocol params) |
| `emit name` / `emit name(args)` | Fire a **declared** channel from host handlers (`self.pressEnd = { … }`) |
| Host inbound | `[self.]<channel> = { … }` in the kind body (§4a′; `self.` optional) |
| Catalogue | `components[C].emits` = **effective** (protocol ∪ own), each channel with typed payloads |
| Parent capture | Handler assignment in **layout** / `ForEach` only (§4e / §8): `item.select(…) = { … }` or let/slot `Field.change(…) = { … }` |
| Inline `emits` | `} emits { … }` after the root frame merges into the component’s own emits (same effective set as companion `emits C`) |

Host dispatch of **unhandled** emits (no layout handler assignment) is **B7** / prototype runtime (§8).

---

## 4e — ForEach & layout emit capture (B5)

**Status:** **normative**; **shipped in Rust** (`crates/pdl-core` — parse, validate E028/E029/E034/E035, bake-apply `ForEach` binds at `children` expand, catalogue `emitCaptures`). TypeScript oracle still lags. Host emit dispatch is **B7** (Playground HTML host applies captures + rebakes). Source: `test-fixtures/pdl/protocols/filter_chip.pdl` (`LibrarySubnav`).

`layout` is the **view body**: it stacks **down** (`children` mounts slots/lists) and **up** (capture of **declared** child emits via **handler assignment**). **`ForEach` does not mount** — it only overlays per-item overrides and emit handlers. Lists **MUST** appear via `children = [chips]` or bare `children = chips` (**PDL-E035** if missing).

### When to use `ForEach`

| Need | Use |
|------|-----|
| Just mount instances | `children = slots` / `children = [slots]` (no `ForEach`) |
| Derive / override child params or root frame props per item | `ForEach` + `children = list` |
| Capture list emits | `item.select(…) = { … }` inside that `ForEach` only (list-param `chips.select` is **PDL-E036**) |
| Dividers / before / after chrome | `ForEach` + `before` / `between` / `after` (**B6** — deferred; see below) |

### Derived bindings + emit handler assignment (normative for B5)

Parent owns **one** source of truth (SoT). Prefer **ids / enums**, not indexes.

**Selection pattern A (canonical):** the parent owns an id/enum SoT (e.g. `currentFilter: FilterId`). Each child keeps its **identity** (`filter`) and takes a **Bool presentation** param (`selected: Boolean`). The parent **derives** that bool in `ForEach` (`chip.selected = self.currentFilter == filter`); the child draws with `if selected`. Mount with `children = [chips]`.

`ForEach` is the list analogue of single-slot dotted overrides (`simple.title = …` / `simple.padding = …`). The **item binder** names the current element explicitly — no implied singular of the list name. Emit capture uses the same `=` family on that binder:

```pdl
component LibrarySubnav(
  currentFilter: FilterId = .all,
  chips: [SubnavItem] = [
    FilterChip(title: "All", filter: .all),
    FilterChip(title: "Podcasts", filter: .podcasts)
  ]
) layout {
  direction = .row

  ForEach(chips) { chip in
    chip.selected = self.currentFilter == filter

    chip.select(filter_id: FilterId) = {
      currentFilter = filter_id
    }
  }

  children = chips
}
```

`self.currentFilter` names the **enclosing component** param (escape hatch when item fields would shadow). On the RHS, bare identifiers resolve **item fields first**, then enclosing params — so `filter` is the chip’s identity. Prefer `self.` for the parent SoT in `ForEach`.

| Rule | Intent |
|------|--------|
| `ForEach(listParam) { item in … }` | Overlay only — **does not** insert children. **`item in` is required** (binder for the current element). `listParam` **MUST** also appear in some `children = […]` / `children = listParam` (**PDL-E035**). |
| Item override | **`item.name = expr`** (binder-qualified). If `name` is an effective **param** of the concrete item → kwargs; else → **root frame prop** after mount (same classify as §4b slot dotted). Bare `name = expr` inside `ForEach` is a hard error. |
| RHS name lookup | Bare identifiers: **item fields first**, then **enclosing component params** (item shadows parent). **`self.param`** always means the enclosing component (§22.2). |
| Emit capture (list) | **`item.select(filter_id: FilterId) = { … }`** inside `ForEach` — binder-qualified; **declared emit channels only** (§8). Catalogue/runtime treat the binder as the enclosing list. |
| Emit capture (single) | **`Field.change(…) = { … }`** / **`All.select(…) = { … }`** on a let instance or single slot — not on array/list params (**PDL-E036**). |
| Ambient ban | Host inbound events (`hoverStart`, `pressEnd`, …) as layout capture channels are **PDL-E028**. Layout **`on`** and the `interaction` keyword are hard parse errors. |
| Payload capture | Typed fields in parens (same grammar as emit-sig). Names are **handler locals**; arity+types **MUST** match by position. Assignments target **enclosing** component params. |
| Unhandled | Emits with no layout handler bubble to the **prototype / host** runtime (B7) — not a language error. |
| Static bake | A conforming bake **MUST** expand `children = [list]` into concrete instance subtrees and **apply** ForEach overlays using the **current** parent param values (snapshot). Live rebind after emit is a **host** concern until B7. |

### B6 — list chrome (deferred)

Grammar is reserved; **first compiler slice need not implement** these arms:

```pdl
ForEach(slots) { slot in
  before { … }
  between { … }
  after { … }
}
```

```text
slots = [A, B, C]
→ before + A + between + B + between + C + after
```

---

## Public API surface

| Surface | What it is |
|---------|------------|
| **Parameters** | All inbound; every name in `component C(…)` is public |
| **`emits`** | All outbound intents parents / hosts may hear (§4d) |
| **Protocols** | Shared param + optional emit contracts for conformers (§4a) |

There is **no** `expose` keyword and no private-param syntax. Studio-only knobs (e.g. `interactionState`) are ordinary params; hosts may ignore them by convention.

---

## Referencing parameters inside frames

Inside the component body, use the parameter name as a **bare identifier** in value positions:

```pdl
let Message: text = {
  content = label
  color = color.status.success
}
```

---

## Variants in conditions

`if` / `else if` branches compare a **variant-typed parameter** to a case:

```pdl
if tone == .warning {
  color = color.status.warning
} else if tone == .danger {
  color = color.status.danger
}
```

See §7 for full override rules.

---

## Worked example

```pdl
variant BannerTone {
  case success
  case warning
  case danger
}

semantic color.status.success: Color = #22C55E
semantic color.status.warning: Color = #F59E0B
semantic color.status.danger: Color = #F43F5E

component StatusBanner(
  label: String = "Everything is fine",
  tone: BannerTone = .success
) layout {
  let Message: text = {
    content = label
    color = color.status.success

    if tone == .warning {
      color = color.status.warning
      content = "Check this warning"
    } else if tone == .danger {
      color = color.status.danger
      content = "Immediate action required"
    }
  }

  children = [Message]
}
```
---

## 5 — Components, Frames, and Properties

This chapter is **normative** for allowed **property names**, **types**, and **enum values** on each **frame kind**. A conforming implementation **must** reject unknown properties at validation time.

**Related:** value literal grammar (§6), **background/foreground layers** (§15), **layout flex extensions** below.

---

## Component declaration

```pdl
component Name(
  param: Type = default,
  …
) <rootKind> {
  // properties on root frame
  // let blocks for nested frames
  // optional: if / else if / else on root or lets
  children = [ … ]
}
```

Optional protocol conformance (see **§4a**):

```pdl
component Name <Protocol>(
  /* additional params */
) <rootKind> { … }
```

**`<rootKind>`** — `layout`, `text`, `icon`, or `media`.

---

## Nested frames: `let`

```pdl
let FrameId: layout = {
  direction = .column
  gap = 8
  children = [ … ]
}

let Label: text = {
  content = "Hello"
  style = Body
}
```

- **`let` id** unique within the component.  
- Kind selects the property table below.  
- **`children`** lists **child entries** ([`children` array](#children-array)).  

---

## Assigning children after declaration

```pdl
let Row: layout = {
  direction = .row
}

Row.children = [IconA, IconB]
```

---

## Property tables

### `layout`

| Property | Type | Enum / notes |
|----------|------|----------------|
| `width` | sizing | **`.hug`**, **`.fill`**, **`.fixed(n)`**, **`.flex(…)`**, or **scalar sugar** — a non-negative **number** means **`.fixed(n)`** (§6 §Sizing) |
| `height` | sizing | same |
| `direction` | enum | `.row`, `.column`, `.rowReverse`, `.columnReverse`, **`.stack`**, **`.reverseStack`** (or `Direction.<case>`) — overlap; `.stack` last-on-top, `.reverseStack` first-on-top |
| **`wrap`** | enum | **`.nowrap`**, **`.wrap`** (or `Wrap.<case>`) — main-axis wrapping |
| `align` | enum | `.start`, `.center`, `.end`, **`.stretch`** (or `Align.<case>`) — cross axis |
| `justify` | enum | `.start`, `.center`, `.end`, **`.stretch`**, **`.spaceBetween`**, **`.spaceAround`** (or `Justify.<case>`) — main axis |
| `gap` | number / `Distance` | Uniform gap applied to both axes; use **`columnGap`** and **`rowGap`** when per-axis control is needed |
| **`columnGap`** | number / `Distance` | Gap on the **cross** axis when wrapping; emitter maps to CSS `column-gap` / `gap` split as appropriate |
| **`rowGap`** | number / `Distance` | Gap between **wrapped lines** on the main axis when `wrap = .wrap`. If omitted, **`gap`** applies to both axes. Emitters **MUST** map this to CSS `row-gap` or the platform equivalent. Parsers **MUST** accept and validate `rowGap` as a first-class property. |
| `padding` | edgeInsets | **`EdgeInsets(…)`** or **scalar sugar** — a non-negative **number** means uniform padding on all sides (§6 §`EdgeInsets`) |
| **`margin`** | edgeInsets | External inset around the frame’s border box in layout flow; **`EdgeInsets(…)`** or **scalar sugar** (same rules as **`padding`**) |
| `background` | color \| layers | Scalar **color**, **layer array**, or **`Background`** token — same grammar as **`foreground`**, composited **under** children (§15) |
| **`foreground`** | color \| layers | Same as **`background`** (color sugar, layers, or **`Foreground`** token); composited **over** children (§15) |
| `cornerRadius` | cornerRadius | number, `Corner(…)`, `Radius` token |
| `opacity` | number \| `Opacity` | **0…1** literal or **`Opacity`** token (§6 §Opacity-valued properties) |
| `overflow` | enum | **`.visible`**, **`.scroll`**, **`.clip`** (or `Overflow.<case>`) — §6 §Overflow; no `.hidden` / `.auto` |
| `shadow` | shadow | `Shadow(…)` constructor, or `Shadow` token |
| `borderWidth` | number | |
| `borderColor` | color | |
| `borderPosition` | enum | `inside`, `outside` |

**`justify = .stretch`:** Emitters map to **`justify-content: stretch`** where the platform supports it; otherwise approximate with **`align-items: stretch`** on the container and **`justify-content: flex-start`**, and document the downgrade.

**Gaps (normative):** **`gap`** is spacing on the **main** axis between in-flow children. **`columnGap`** and **`rowGap`** refine spacing on the **column** vs **row** axes when **`wrap = .wrap`**; if **`rowGap`** is omitted, **`gap`** applies to **both** axes (see **`rowGap`** in the **`layout`** property table above).

**Gap cascade (declaration order):** on a given frame, a later **`gap = …`** **clears** any earlier **`columnGap`** / **`rowGap`** on that frame (uniform gap replaces per-axis overrides). A later **`columnGap`** / **`rowGap`** after **`gap`** still overrides that axis only.

**Child-only properties** (on **`let`** frames that are **children** of a `layout`, or on root when parent is layout — scoping is **parent layout**):

| Property | Type | Notes |
|----------|------|--------|
| **`alignSelf`** | enum | `.start`, `.center`, `.end`, `.stretch`, **`.auto`** |
| **`grow`** | number | Flex grow factor |
| **`shrink`** | number | Flex shrink factor |
| **`position`** | enum | **`.flow`** (default), **`.absolute`** — out-of-flow placement |
| **`inset`** | edgeInsets | Used when **`position = .absolute`**; **`EdgeInsets(…)`** or **scalar sugar** — uniform offsets from the containing layout’s padding box |

**Root frame flex props:** On a **component root** (no enclosing PDL **`layout`** parent), **`grow`**, **`alignSelf`**, **`position`**, and **`inset`** apply as if the root were the sole flex child of an anonymous **`layout`** filling the **preview viewport** supplied by the host. **Static** emitters without a viewport **MAY** ignore these props or emit a **warning**; they **MUST NOT** treat them as a **parse** error.

### `text`

| Property | Type | Enum / notes | Example |
|----------|------|--------------|---------|
| `content` | string | Quoted string body (§6) | `content = "Sign in"` |
| `fontFamily` | string | Often superseded by `style` / `typeStyle` | `fontFamily = "Inter, system-ui, sans-serif"` |
| `fontSize` | `Size` | Non-negative number or **`Size`** token; px or design-unit per emitter | `fontSize = 16` |
| `fontWeight` | `Weight` | Number or **`Weight`** token (e.g. 400, 500, 600) | `fontWeight = 600` |
| `lineHeight` | `LineHeight` | Positive **unitless ratio** (e.g. `1.35` = 135% of font size) or **`LineHeight`** token. Emitters **MUST** treat this as a ratio multiplied by `fontSize`. | `lineHeight = type.lineHeight.body` |
| `letterSpacing` | `LetterSpacing` | Number in **em** units (e.g. `0.01`) or **`LetterSpacing`** token; may be negative. Emitters **MUST** treat this as an em multiplier of `fontSize`. Zero means no extra tracking. | `letterSpacing = 0.01` |
| `color` | color | Token name or unquoted `#RGB` / `#RRGGBB` / `#RRGGBBAA` (§3, §6) | `color = color.text.primary` |
| `style` | styleRef | **`typeStyle`** name: bare identifier, **case-sensitive**, matching the declared `typeStyle` name exactly (e.g. `typeStyle Body { … }` is referenced as `style = Body`). | `style = Body` |
| `width` | sizing | **Sizing literals** (§6 §Sizing) including **scalar number** = **`.fixed(n)`** | `width = .fill`, `width = 200` |
| `height` | sizing | Same set as **`width`** | `height = .hug`, `height = 48` |
| `padding` | edgeInsets | **`EdgeInsets(…)`** or **scalar sugar** (§6 §`EdgeInsets`) | `padding = EdgeInsets(x: 16, y: 12)`, `padding = 12` |
| **`margin`** | edgeInsets | **`EdgeInsets(…)`** or **scalar sugar** | `margin = 8` |
| `justify` | enum | **`.start`**, **`.center`**, **`.end`** only on **`text`** (or `Justify.<case>`) | `justify = .center`, `justify = Justify.center` |
| `align` | enum | **`.start`**, **`.center`**, **`.end`** only on **`text`** (cross-axis) | `align = .start` |
| `background` | color \| layers | Scalar color, layer array, or **`Background`** token (§15) | `background = color.surface.subtle` |
| **`foreground`** | color \| layers | Same grammar as **`background`** + **`Foreground`** token (§15) | `foreground = [color.primitive.black @ opacity.state.hover]` |
| `opacity` | number | **0…1** | `opacity = 0.85` |
| `overflow` | enum | **`.visible`**, **`.scroll`**, **`.clip`** (or `Overflow.<case>`) — §6 §Overflow | `overflow = .clip` |
| `truncateStyle` | enum | **`.clip`** (hard end, no `…`), **`.ellipsis`** (trailing `…`); or `TruncateStyle.<case>` | `truncateStyle = .ellipsis` |
| `lineClamp` | number | Non-negative max lines. With **`truncateStyle = .ellipsis`** → ellipsis clamp; with **`.clip`** → hard cut after N lines (**no** `…`). Omit `truncateStyle` with `lineClamp` → ellipsis (same as `.ellipsis`). Excess lines are **not painted** (independent of frame **`overflow`**). | `lineClamp = 2` |
| `cornerRadius` | cornerRadius | Same as **`layout`** — used for chips, fields, and other text boxes with a painted fill/border | `cornerRadius = 8` |
| `shadow` | shadow | Same as **`layout`** | |
| `borderWidth` | number | Same as **`layout`** — common on editable fields | `borderWidth = 1` |
| `borderColor` | color | Same as **`layout`** | `borderColor = #0066FF` |
| `borderPosition` | enum | Same as **`layout`**: `inside`, `outside` | |
| **`alignSelf`**, **`grow`**, **`shrink`**, **`position`**, **`inset`** | mixed | When this **`text`** frame is a **child of `layout`**: **`alignSelf`** — **`.start`**, **`.center`**, **`.end`**, **`.stretch`**, **`.auto`**; **`position`** — **`.flow`** (default), **`.absolute`**; **`grow`** / **`shrink`** — numbers; **`inset`** — **`EdgeInsets(…)`** or **scalar sugar** when **`position = .absolute`** (same lists as layout **child-only** table above) | `alignSelf = .end`, `grow = 1`, `position = .absolute`, `inset = 8` |

### `icon`

| Property | Type |
|----------|------|
| `icon` | string |
| `size` | number |
| `color` | color |
| `width` | sizing | Same **`sizing`** literals and **scalar sugar** as **`layout`** (§6 §Sizing) |
| `height` | sizing | Same as **`width`** |
| `opacity` | number \| `Opacity` | **0…1** or **`Opacity`** token (§6 §Opacity-valued properties) |
| **`alignSelf`**, **`grow`**, **`shrink`**, **`position`**, **`inset`** | When parent is `layout` |

### `media`

**`media`** is the frame kind for **raster, vector, video, and other drawable sources** in one slot. **`icon`** stays separate: small, often template/tintable symbols with different defaults and semantics (§1).

#### `MediaSource` (what goes in `source`)

Normatively, **`source`** is a **`MediaSource`** value — today often a **quoted string** (URL or path) interpreted as **raster** for emitters that have not yet implemented the full union. The type is **open for evolution**:

| Variant (conceptual) | Role |
|---------------------|------|
| **Raster** | URL, path, or asset key resolving to a bitmap (today’s common case). |
| **Vector** | SVG / PDF page / design-vector asset id (emitter resolves). |
| **Video** | File or stream URL; poster frame, loop, muted, controls — **emitter-defined** optional props in a future `schemaVersion`. |
| **Path / procedural** | Vector path data or shader-backed fill where the platform supports it. |

**`MediaSource` literals (v1):** **`source`** is either a **quoted string** (URI or path, interpreted as **raster** unless the manifest declares broader **`capabilities.media`**) or a reference to a **`MediaSource`** token. **Tagged-union** surface syntax for vector / video **may** be added in a minor revision; until then, those variants are carried by **typed tokens** and **`capabilities.media`** lists what the build supports (`raster`, `vector`, `video`, …).

| Property | Type | Enum / notes |
|----------|------|----------------|
| `source` | `MediaSource` \| string | **Primary media ref** — string treated as **raster** URL/path unless **`capabilities.media`** declares broader support; token typed **`MediaSource`** when declared in the token map (§3). |
| `width` | sizing | Same **`sizing`** literals and **scalar sugar** as **`layout`** (§6 §Sizing) |
| `height` | sizing | Same as **`width`** |
| `aspectRatio` | number | |
| `contentMode` | enum | **`.cover`**, **`.contain`**, **`.fill`**, **`.scaleDown`** — applies to **raster** and **vector** boxes; **video** mapping is **emitter-defined**. |
| `objectPosition` | enum | **`.center`**, **`.top`**, **`.bottom`**, **`.left`**, **`.right`**, **`.topLeft`**, **`.topRight`**, **`.bottomLeft`**, **`.bottomRight`** |
| `background` | color \| layers | Under-content stack (§15). |
| **`foreground`** | color \| layers | Same grammar as `background` (§15). |
| `cornerRadius` | cornerRadius | |
| `opacity` | number \| `Opacity` | **0…1** or **`Opacity`** token (§6 §Opacity-valued properties) |
| **`alignSelf`**, **`grow`**, **`shrink`**, **`position`**, **`inset`** | | When parent is `layout` |


---

## `children` array

Each element is one of:

1. **Frame id** — string matching a `let` in the same component.  
2. **Component instance** — `OtherComponent(arg: value, …)`.  
3. **Spacer** — **`.spacer`** — expands on the **main axis** to fill remaining free space (emitter maps to flex `1 1 auto` or equivalent).  

```pdl
children = [Logo, .spacer, NavItems]
```

**Normative:** `.spacer` is **not** a frame id; it is a reserved **child keyword**.

```pdl
children = [Header, Footer]

let CardA = InfoCard(title: "A", subtitle: "…", ctaText: "Go")
let CardB = InfoCard(title: "B", subtitle: "…", ctaText: "Go")
children = [CardA, CardB]
```

---

## Reference composition

```pdl
component InfoCard(
  title: String = "Card Title",
  subtitle: String = "Secondary line"
) layout {
  direction = .column
  gap = 8

  let Header: layout = {
    direction = .column
    let Title: text = { content = title }
    let Subtitle: text = { content = subtitle }
    children = [Title, Subtitle]
  }

  children = [Header]
}
```

See `test-fixtures/pdl/04_composition_and_nesting.pdl` for larger examples.

---

## Naming

---

## 6 — Values and Expressions

PDL properties accept **literals**, **token references**, or (where grammar allows) **parameters**. Internally the compiler represents these as one of three expression kinds: a literal value, a token reference (resolved at catalogue-generation time), or a parameter reference (passed through as a **`param:name`** string in the catalogue).

---

## Sizing

| Literal | Meaning |
|---------|---------|
| `.hug` | Size to content (where supported). |
| `.fill` | Grow to fill parent axis. |
| `.fixed(n)` | Fixed pixel size. |
| `.flex(min: a, max: b)` | Flexible bounds; `min` / `max` optional. |
| `.flex(min: a, preferred: p, max: b)` | Flexible bounds with a preferred (ideal) size; `min`, `preferred`, and `max` are all optional individually. |

The `preferred` field is the ideal size when free space is available; it has no direct CSS equivalent and emitters **SHOULD** map it to `flex-basis` or the nearest platform concept. `min` and `max` constrain the range. Any combination of the three fields is valid; all omitted is equivalent to `.fill`.

```pdl
width = .fixed(320)
height = .hug
width = .fill
height = .flex(min: 44)
width = .flex(min: 200, max: 400)
width = .flex(min: 120, preferred: 200, max: 480)
```

**Scalar numeric sugar (sizing):** Where a property’s type is **`sizing`**, a **single non-negative number** literal (or any expression that evaluates to a finite non-negative number) is shorthand for **`.fixed(n)`**. The resolver **MUST** rewrite it to the same resolved shape as **`.fixed(n)`** (e.g. `{ fixed: n }` in JSON interchange). **Non-finite** or **negative** numbers **MUST** be rejected with the same severity as invalid explicit sizing. This applies to every **`sizing`** property in §5 (**`layout`**, **`text`**, **`icon`**, **`media`**, **`spacer`**) on **`width`** and **`height`**. It **MUST NOT** apply to **`icon.size`** (already a plain **`number`** meaning the symbol box), **`gap`**, **`aspectRatio`**, or other numeric props whose scalar meaning is not fixed-axis size.

```pdl
width = 200
height = 100
```

## Ratio (`W:H` sugar)

**`Ratio`** tokens and **`aspectRatio`** accept a positive number, or **`W:H`** sugar (`16:9`, `4:3`, …). The parser keeps `{ kind: "ratio", width, height }`; evaluation yields **`W / H`**. Height **MUST** be positive and finite (**PDL-E001** otherwise). Prefer sugar for common media ratios so intent stays readable.

```pdl
primitive atoms.ratio.video: Ratio = 16:9
aspectRatio = 4:3
```

---

## Colors

- **Hex (unquoted only):** `#RGB`, `#RRGGBB`, or `#RRGGBBAA` — must **not** be wrapped in double quotes; `"#1E293B"` is invalid and rejected at parse time.  
- **Token:** `color.surface.primary`.  

```pdl
background = color.surface.card
color = #1E293B
```

---

## Inline opacity on colors (`@`)

In **layer lists** and anywhere the grammar permits, apply alpha to a color token or hex by writing **`@`** followed by either:

1. **Preferred:** an **`Opacity`** token (primitive or semantic), e.g. **`color.surface.primary @ opacity.surface.tint`** — same theming and naming rules as other tokens (§3).  
2. **Allowed (narrow use):** a **numeric literal** in **0…1**, e.g. **`color.surface.primary @ 0.75`** — use for one-offs, generated output, or migration; design-system libraries should **default to (1)**.

```pdl
color.surface.primary @ opacity.surface.tint
color.surface.primary @ 0.75
```

**Semantics:** resolved to a color with multiplied / combined alpha (§15).

---

## Opacity-valued properties (frames, layers, motion)

Any property or constructor argument that controls **alpha** (frame **`opacity=`**, **`GradientStop(opacity: …)`** inside **`Ramp`**, **`Media`** / **`Color`** `opacity` arguments where applicable, **`from` / `to`** animation **`opacity`**, etc.) accepts:

1. A **numeric literal** in **0…1**, or  
2. An **`Opacity`** token reference (primitive or semantic), resolved to **0…1** before emit (§3).

**Prefer (2)** in design systems so themes can retint without hunting literals — same rationale as **`color… @ opacity…`** (§3 §Opacity tokens).

```pdl
opacity = 0.9
opacity = opacity.ui.ghost
Color(color.primitive.white @ opacity.effect.shimmer)
```

---

## Enums (dot syntax)

```pdl
direction = .column
direction = .stack
justify = .spaceBetween
align = .stretch
wrap = .wrap
contentMode = .cover
objectPosition = .center
overflow = .visible
overflow = .scroll
overflow = .clip
truncateStyle = .ellipsis
borderPosition = .outside
position = .absolute

// Optional TypeName.case (same meaning as .case):
direction = Direction.column
justify = Justify.spaceBetween
align = Align.stretch
wrap = Wrap.wrap
contentMode = ContentMode.cover
objectPosition = ObjectPosition.center
overflow = Overflow.clip
truncateStyle = TruncateStyle.ellipsis
borderPosition = BorderPosition.outside
position = Position.absolute
alignSelf = AlignSelf.stretch
```

Allowed values are **per property** (§5). **`TypeName.case`** is optional sugar for the leading-dot form (§20.4 / §22.4). See also **§6 §Overflow**.

---

## `Overflow` (frame)

Frame **`overflow`** is a closed set of **three** cases (SoT: `shared/frame-props.json` → `enumOverflow`):

| Case | Meaning |
|------|---------|
| **`.visible`** / `Overflow.visible` | Content may paint **outside** the frame’s box. |
| **`.scroll`** / `Overflow.scroll` | Overflow is **scrollable** (scroll UI / scroll container). |
| **`.clip`** / `Overflow.clip` | Hard **crop** at the box; **no** scroll mechanism. |

There is **no** **`.hidden`** or **`.auto`**. Authors who want CSS-like “crop without scrollbars” **MUST** use **`.clip`**. Using **`.hidden`** or **`.auto`** is **PDL-E006**.

**`truncateStyle`** is orthogonal to frame **`overflow`**: **`.ellipsis`** paints a trailing `…`; **`.clip`** ends flush with no `…`. Pair with **`overflow = .clip`** (and optional **`lineClamp`**) when truncating.

**HTML preview mapping** (`src/renderHtml.ts`): **`.scroll`** → CSS `overflow: scroll`; **`.clip`** → CSS `overflow: hidden` (Chromium often fails to crop with CSS `overflow: clip` on flex-centered text shells). Native emitters **MAY** map **`.clip`** to a true non-scroll clip.

```pdl
overflow = .visible
overflow = .scroll
overflow = .clip
overflow = Overflow.clip
```

---

## `EdgeInsets`

```pdl
padding = EdgeInsets(x: 16, y: 12)
padding = EdgeInsets(x: spacing.card.padding, y: spacing.card.padding)
padding = EdgeInsets(top: 8, right: 12, bottom: 8, left: 12)
```

Numeric components may be numbers or **`Distance`** token names.

**Scalar numeric sugar (uniform `EdgeInsets`):** On any property whose type is **`edgeInsets`** / **`EdgeInsets(…)`** — today **`padding`**, **`margin`**, and **`inset`** where those names appear in §5 — a **single non-negative number** literal (or expression that evaluates to one) is shorthand for **equal insets on all four sides**, i.e. **`EdgeInsets(top: n, right: n, bottom: n, left: n)`**. The resolver **MUST** emit the same resolved record shape as the explicit constructor. **Non-finite** or **negative** numbers **MUST** be rejected. This **MUST NOT** apply to **`gap`**, **`columnGap`**, **`rowGap`**, **`grow`**, **`shrink`**, or other numeric properties whose meaning is not “four equal edges”.

```pdl
padding = 16
margin = 8
inset = 4
```

---

## `Corner` (asymmetric `cornerRadius` on frames)

`Corner(…)` is a **frame value constructor** for **`cornerRadius`**, not a `Radius` token RHS. `Radius` tokens are **uniform scalars**; compose per-corner values on the component:

```pdl
primitive radius.md: Radius = 12
primitive radius.sm: Radius = 4

// On a layout / media / text frame — not on a token declaration:
cornerRadius = Corner(tl: radius.md, tr: radius.md, br: radius.sm, bl: radius.sm)
```

Axes accept numbers or **`Radius` / `Distance`-compatible** numeric token refs. A `primitive` / `semantic` of type **`Radius = Corner(…)`** is **PDL-E005**.

---

## `Shadow` (drop shadow)

`Shadow(…)` is the normative authoring form for **`Shadow` tokens** and frame **`shadow=`**:

```pdl
primitive shadow.card: Shadow = Shadow(x: 0, y: 4, blurRadius: 12, color: #000000 @ 0.15)
primitive shadow.soft: Shadow = Shadow(x: 0, y: 2, blurRadius: 8, color: color.primitive.black @ opacity.scrim)

// On a layout frame:
shadow = shadow.card
shadow = Shadow(x: 0, y: 1, blurRadius: 3, spread: 0, color: #000000 @ 0.35)
```

| Field | Type | Notes |
|-------|------|--------|
| `x` | number | Horizontal offset (px) |
| `y` | number | Vertical offset (px) |
| `blurRadius` | number | Blur radius (px); non-negative |
| `color` | `Color` | Hex, color token, or `color @ opacity` |
| `spread` | number | Optional; defaults to `0` |

Bake / catalogue resolve to `{ "kind": "shadow", "x", "y", "blurRadius", "spread", "color" }`. HTML preview maps that to CSS `box-shadow: <x>px <y>px <blurRadius>px <spread>px <color>`. A quoted CSS box-shadow string on a `Shadow` token is **PDL-E005**. Non-numeric axis values (e.g. `x: "a"`), axis refs to non-numeric tokens (e.g. `x: red` when `red` is a `Color`), and non-Color `color` values are also **PDL-E005**; `blurRadius` must be non-negative.

---

## Background / foreground layer lists

**`background`** and **`foreground`** use the **same** forms: a **scalar color** (sugar for one solid layer) or an **ordered array** of layer constructors. They differ only in **stacking vs children** (under vs over) at composite time (§15).

A bare **`Opacity`** token is **not** a layer (**PDL-E006** / **PDL-E005** on tokens): apply it with **`color @ opacity…`** or a constructor **`opacity:`** argument.

Examples:

```pdl
background = color.surface.primary
foreground = color.primitive.black @ opacity.state.hover
background = [color.surface.primary]
foreground = [color.primitive.black @ opacity.state.hover]
background = [
  Blur(blur: blur.sheet, vibrancy: vibrancy.sheet),
  color.surface.primary @ opacity.surface.tint
]

foreground = [
  color.primitive.black @ opacity.state.hover
]
```

Full constructor catalog: §15.

---

## Motion literals

**`Transition`** tuple (where token RHS allows):

```pdl
semantic motion.appear: Transition = (duration: motion.duration.standard, easing: motion.easing.standard)
```

See §14.

---

## Strings & icons

```pdl
content = "Hello, world"
icon = "star"
source = mediaSrc
```

---

## Token references

```pdl
background = color.surface.card
gap = spacing.stack.gap
cornerRadius = radius.card
shadow = shadow.md
animate = motion.interactive
background = material.sheet
```

---

## Parameters as values

```pdl
content = title
source = mediaSrc
```

**Fixture bodies** (`fixtures Name { example "…" { … } }`) do **not** have component parameters in scope — see §12.

Variant comparisons use `.case` in `if` (§7).

---

## Numeric properties

```pdl
gap = 12
opacity = 0.9
fontSize = 16
borderWidth = 2
grow = 1
shrink = 0
stagger = 30
```

---

## Spacer pseudo-child

**`.spacer`** appears only inside **`children = [ … ]`** arrays (§5).
---

## 7 — Conditional Overrides, `let`, and Composition

This chapter explains **how one component definition can look different under different inputs** (variants, interaction state, etc.) without copy-pasting whole trees, and **how to assemble UI** from **`layout`**, nested **`let`** frames, **`children`**, and **embedded component instances**.

**You should already be comfortable with:** §4 (declaring parameters and variant types), §5 (frame kinds and property tables), and §6 (literals, token refs, and **condition** syntax like **`param == .case`**).

---

## Conditional overrides (`if` / `else if` / `else`)

### What problem this solves

Often the **same component** should change a handful of properties (colors, copy, an icon tint) when a **variant** or **state parameter** changes. Overrides let you keep **one** component body and declare: “when **`tone`** is **`.warning`**, use these props instead of the defaults.” That is easier to maintain than defining **`WarningBanner`**, **`DangerBanner`**, **`SuccessBanner`** as separate components that only differ by colors and strings.

Overrides are **not** a general-purpose scripting language: each branch is a **flat list of property assignments** (and optional nested chains) evaluated when the component is **resolved** with concrete parameter values (§16).

### Where override chains may appear

**Override chains** live **inside** the **`{ … }`** body of a **frame** that belongs to the component—almost always the **root** frame (`layout { … }`, etc.) or a **`let SomeName: kind = { … }`** block. When the compiler generates the catalogue, it evaluates each branch per variant combination and records only the changed properties as deltas (§16).

### Syntax

```pdl
if <param> == .case {
  prop = value
  …
} else if <param> == .other {
  …
}
```

- **Condition:** typically **`parameterName == .caseName`** where the parameter is **variant-typed** (§4) or another type the grammar allows in comparisons (§6 — **Conditions** / interaction examples).  
- **Branch body:** one **assignment** per line: **`prop = valueExpr`** or **`FrameId.prop = valueExpr`** (see below).  
- **`else`** (optional) has **no** condition — it runs only when no earlier branch matched. Omit it when the frame's existing default properties already express the base state correctly.

### Rules (normative)

1. **First match wins** — for a given `if … else if … else` **chain**, the resolver evaluates conditions **top to bottom** and applies **only** the first matching branch. There is no “fall through” to later branches.  
2. **Several assignments per branch** — a branch can update many properties (and, where allowed, **`children`**) in one go.  
3. **Chains nest with `let`** — a nested **`let StatusIcon: icon = { … }`** may contain its **own** `if` chain that only affects **`StatusIcon`**. Root-level and nested chains are independent.  
4. **Forward visibility** — assignments that target **`FrameId.prop`** require that **`let FrameId`** appears **earlier** in the component body than the `if` block (same rule as elsewhere: you cannot reference a frame before it is declared).

### What each assignment targets

- **Bare `prop = value`** (no frame id) — updates the **frame whose `{ … }` contains this `if` block**. On the **root** `layout { … }`, that is the **root** frame. Inside **`let Message: text = { … }`**, that is **`Message`**.  
- **`SomeFrameId.prop = value`** — updates **`SomeFrameId`** when it is a **`let`** / **`letInstance`** frame id. When **`SomeFrameId`** is a **single slot/instance param**, see §4b (param vs root-frame classify). Array slot dotted overrides are **PDL-E034**.  

- **`self` is not a frame id.** In layout/interaction expressions, `self` / `self.param` means the **enclosing component instance** (§22.2), not the root frame.  
- **`SomeFrameId.children = [ … ]`** — allowed in overrides when the grammar permits; the right-hand side is a **child list** like a normal **`children`** assignment (§5 — **`children` array**).

### Root-level example

The **root** `layout` sets a default **`background`**. The **`if` chain** swaps **`background`** when **`interactionState`** changes; **`Label`** is unchanged structurally—only the chrome around it updates.

```pdl
enum InteractionState {
  case rest
  case hovered
  case pressed
}

component InteractiveChip(
  label: String = "Chip",
  interactionState: InteractionState = .rest
) layout {
  background = color.button.rest

  if interactionState == .hovered {
    background = color.button.hover
  } else if interactionState == .pressed {
    background = color.button.press
  }

  let Label: text = {
    content = label
    color = color.button.text
  }

  children = [Label]
}
```

### Nested `let` example

Here **`StatusIcon`** owns its defaults **and** its own **`if`**: when **`highlighted`** is **`.on`**, only the icon’s **`color`** changes. The parent layout does not need to know about **`highlighted`** at all—**encapsulation** of visual logic on the frame that cares.

*(Fragment shown inside a parent component’s `layout { … }`; see `test-fixtures/pdl/05_icon_and_image_props.pdl` for a full file.)*

```pdl
let StatusIcon: icon = {
  icon = icon.status.default
  color = color.icon.default

  if highlighted == .on {
    color = color.icon.accent
  }
}
```

### Variant-driven copy example

**`Message`** defaults to **`label`** and a success color. **`tone`** selects which branch runs; when neither `.warning` nor `.danger` matches, the frame-level defaults above the `if` already hold — no `else` needed.

*(Same pattern as `StatusBanner` in `test-fixtures/pdl/03_variants_and_overrides.pdl`.)*

```pdl
let Message: text = {
  content = label
  color = color.status.success

  if tone == .warning {
    color = color.status.warning
    content = "Check this warning"
  } else if tone == .danger {
    color = color.status.danger
    content = "Immediate action required"
  }
}
```

*(Full component: `test-fixtures/pdl/03_variants_and_overrides.pdl`.)*

---

## Composition patterns

These are **recipes** for structuring **`children`** and **`layout`** props. They compose with overrides: e.g. a z-stack can still hide **`Overlay`** when a param says “collapsed”.

### 1. Container + named sections

**Idea:** Give each major region a **`let`** name so the root **`children = […]`** reads like a table of contents: **`Header`**, **`Body`**, **`Footer`**.

**Why:** Easier to reason about than one giant anonymous column; **`if`** blocks can target **`Body.padding`** or swap **`Footer`** visibility without touching **`Header`**.

```pdl
let Header: layout = { … }
let Body: layout = { … }
let Footer: layout = { … }
children = [Header, Body, Footer]
```

### 2. Row / column stacks

**Idea:** Use **`direction = .row`** or **`.column`** with **`gap`** and **`padding`** for the majority of flex-like UIs.

**Wrap:** When content should **continue on the next line** instead of overflowing, set **`wrap = .wrap`** and use **`columnGap`** and **`rowGap`** per §5. Emitters map these to CSS flex or platform flex containers.

### 3. Z-stack (overlapping children)

**Idea:** **`direction = .stack`** places children in the **same** layout box; **painter’s order** is the **array order**—first entry at the **back**, last at the **front**.

**`.reverseStack`** is the same overlap model with **reversed** painter’s order—first entry at the **front**, last at the **back** (handy when the “base” plate is authored last).

**Typical use:** background plate, main content, then a dimmed **overlay** or **stroke** on top. Emitters may use absolute positioning or z-index; the **language** guarantee is **declaration order** → z-order per the chosen stack mode.

```pdl
direction = .stack
children = [BackgroundLayer, Content, Overlay]

direction = .reverseStack
children = [Overlay, Content, BackgroundLayer]  // Overlay still on top
```

### 4. Spacer

**Idea:** **`.spacer`** is a **reserved child** (not a frame id) that **absorbs remaining free space** on the parent’s **main axis**—e.g. push **`NavItems`** to the trailing edge after **`Logo`**.

```pdl
children = [Logo, .spacer, NavItems]
```

See §5 for normative rules.

### 5. Component instances as children

**Idea:** **`children`** entries can be **other components** with arguments, not only **`let`** ids. That is how you **nest** design-system building blocks (`InfoCard`, `IconButton`, …) without inlining their full tree.

```pdl
let CardA = InfoCard(title: "Analytics", subtitle: "Weekly trend", ctaText: "Open report")
children = [CardA]
```

**Parameter binding:** each **`Name(arg: value, …)`** supplies that instance’s **param map** for resolution (§16).

### 6. Absolute positioning

**Idea:** A child with **`position = .absolute`** is taken **out of the normal flex flow** of the parent **`layout`**; **`inset`** (or per-side insets, if your emitter supports them) pins it to the **parent’s padding box**.


### 7. Mutating `children` after the fact

**Idea:** **`children = [ … ]`** is a **normal property**. You may assign **`MetaRow.children`** and then assign the **root** **`children`** in two steps—as long as every **id** in each list already exists. That lets you **declare** all **`let`** frames first (with static props), then **wire** inner layouts, then **wire** the root.

**Bare `children`** → the **root** frame’s child list. **`SomeLayoutId.children`** → that **`let`** layout’s list.

```pdl
component ArticleHero() layout {
  direction = .column
  gap = 12

  let HeroImage: media = { source = "https://example.com/hero.jpg" }
  let MetaRow: layout = {
    direction = .row
    gap = 8
  }
  let StatusIcon: icon = { icon = "clock", size = 16 }
  let Caption: text = { content = "Updated today" }

  MetaRow.children = [StatusIcon, Caption]
  children = [HeroImage, MetaRow]
}
```

**Read order:** **`MetaRow`** receives **`StatusIcon`** then **`Caption`** (row order). The **root** column stacks **`HeroImage`** above **`MetaRow`**. Omitting **`MetaRow.children`** leaves the row **empty**; omitting the root **`children`** leaves the component **without** a tree under the root layout.

---

## Targeting summary (overrides + composition)

| You want to… | Mechanism |
|----------------|-----------|
| Change **root** props when a param changes | Root-level **`if`** with bare **`prop = …`** inside **`layout { … }`**. |
| Change **one `let` frame’s** props when a param changes | Put **`if`** **inside** that **`let`** block, or use **`FrameId.prop = …`** from a parent scope when supported. |
| Replace **which frames** sit under a layout | **`children = [ … ]`** or **`FrameId.children = [ … ]`** (and overrides on **`children`** when valid). |
| Reuse a subtree with different data | **Component instance** in **`children`**: **`OtherComp(a: x, …)`**. |

Conditions always resolve against the **component’s parameter values** (and literals / tokens) at resolve time—see §6 and §16.

---

## See also

- §4 — parameters and **`variant`** / **`enum`** types used in **`if`** conditions  
- §5 — authoritative **property** / **`children`** tables  
- §6 — **RHS** grammar and **conditions**  
- §8 — **`on`** handlers (separate from static **`if`**, but often drive the same params)  
- §16 — how overrides become variant deltas in the catalogue  
- §12 — example param bundles for previews  

**Example PDL files:** `test-fixtures/pdl/04_composition_and_nesting.pdl`, `05_icon_and_image_props.pdl`, `03_variants_and_overrides.pdl`

---

## 8 — Interactions

**Host inbound handlers** attach **preview-time behavior** (and optional **motion** hints) to components: when a host channel fires, handlers assign **public component parameters** and may **`emit`** child intents.

**Authoring** is host handler assignment in the kind body (§4a′): `self.pressEnd = { … }`. Compilers lift these into the component’s interaction IR (catalogue `interactions[]`, synthetic name **`default`**). The `interaction` keyword is **removed** (**PDL-E001**).

---

## Declaration

| Form | Status | Notes |
|------|--------|--------|
| `[self.]<hostChannel> = { … }` in kind body | **Normative** | `self.` optional / clarifying. Requires effective host protocol (§4a′). |
| `interaction { … }` / `interaction Name for C` | **Removed** | **PDL-E001** — use `self.<channel> = { … }`. |

```pdl
component InteractiveChip <PointerInput>(…) layout {
  …
  self.hoverStart = { interactionState = .hovered }
  self.pressEnd = { interactionState = .hovered }
}
```

---

## Handler assignment family (host vs emit)

One syntactic family (`… = { … }`), two directions:

| Lane | Where legal | Listens to | Shape |
|------|-------------|------------|--------|
| **Host inbound** | Component **kind body** | Channels declared on effective **host** protocols (§4a′) | `self.pressEnd = { … }` — assign params, `emit`, host verbs |
| **Declared emit** | Parent **layout** / `ForEach` (§4e) | Child **`emits`** | `item.select(…) = { … }` / `Field.change(…) = { … }` |

| Violation | Code |
|-----------|------|
| Host channel used as parent emit capture (no `self.`, treating as child emit) | **PDL-E028** (ambient-as-emit-capture) |
| Declared emit channel used as a host inbound channel name | **PDL-E029** |
| Layout / `ForEach` keyword `on` | **Parse error** — use handler assignment |
| List-param emit capture `chips.select` | **PDL-E036** |

**Primary list emit capture:** `chip.select(…) = { … }` inside `ForEach`.  
**Promote host → parent intent:** `emit select(…)` inside a `self.pressEnd` body (§4d).

---

## Host inbound channels

Authoritative list: **§4a′** prelude stubs. Summary:

| Channel | Protocol | Typical use |
|---------|----------|-------------|
| `hoverStart` / `hoverEnd` | `PointerInput` | Pointer entered / left |
| `pressStart` / `pressEnd` / `pressCancel` | `PointerInput` | Down / up / cancel |
| `focusStart` / `focusEnd` | `PointerInput` | Focus gained / lost |
| `activate` | `PointerInput` | Primary action (`Enter`, etc.) |
| `appear` / `dismiss` | `PointerInput` | Hierarchy visibility (§14) |
| `keyboardDismissed` / `keyboardCancelled` | `EditableText` | Soft-keyboard commit / cancel |

Example (canonical pointer cycle on the component):

```pdl
component InteractiveChip(
  interactionState: ChipInteraction = .rest
) layout {
  …
  self.hoverStart = { interactionState = .hovered }
  self.hoverEnd = { interactionState = .rest }
  self.pressStart = { interactionState = .pressed }
  self.pressEnd = { interactionState = .hovered }
  self.pressCancel = { interactionState = .rest }
}
```

---

## Assignment statements

```pdl
interactionState = .hovered
toneVariant = .active
```

- LHS: a **parameter** of the target component (all params are public).
- RHS: type-checks against param type (variants use **`.case`**; `String` params take a quoted string).

**`self`:**  
- **`self.<hostChannel> = { … }`** — host handler assignment (§4a′).  
- **`self.param`** — enclosing component parameter (optional on LHS: `self.interactionState = .hovered` ≡ `interactionState = .hovered`).  
- Bare **`self`** as a value — enclosing **instance** (valid emit payload when the signature accepts this component or a protocol it conforms to).  
Rules-query `self` is separate (§12).

---

## Motion statements (handlers)

See §14 for normative grammar.

Summary:

- **`animate = <Transition token or tuple>`** — active transition for property changes triggered by this handler.  
- **`from { … }` / `to { … }`** — keyframe-like scalar props on **`appear`** / **`dismiss`**.  
- **`stagger`**, **`staggerFrom`** — list animations on **`appear`**.  

---

## Conditional statements in handlers

```pdl
self.pressEnd = {
  interactionState = .hovered

  if tone == .danger {
    tone = .warning
  } else {
    tone = .danger
  }
}
```

**Normative:** conditions in handlers follow the same `ConditionExpr` grammar as frame overrides (§7) — a **variant-typed parameter** compared to a **`.caseName`**. Only variant equality comparisons are supported in v1; arbitrary string or numeric comparisons in handler `if` conditions are **not** supported.

---

## Component side: state parameter

Pair interactions with a **variant** (or other param) on the component; drive visuals with `if` chains on frames (§7).

---

## Preview vs static export

- **Studio / iframe preview** should run **full** interaction + motion behavior when implemented.  
- **Static HTML** (`renderHtml`, `npm run preview`) draws **bake snapshots** only — it does **not** run ambient handlers or layout emit capture end-to-end (B7).  
- Live rebind after `emit` requires a host runtime (B7 / C3).  
- **`appear` / `dismiss`** may be **no-ops** in static export.  

---

## See also

- §4d — `emits` / `emit` / host inbound  
- §4e — emit handler assignment / `ForEach`  
- §14  
- §16 — `applyInteractionEvent`  
- `test-fixtures/pdl/06_interaction_states.pdl`, `test-fixtures/pdl/protocols/filter_chip.pdl`
---

## 9 — Tooling, CLI, and Limits

## Repository tools

From project root (`package.json` scripts). Each script runs **`tsc`** then **`node dist/cli.js …`** (see **`src/cli.ts`**). After **`npm run build`**, the **`pdl`** **bin** in **`package.json`** also invokes **`dist/cli.js`** with the same verbs.

| Command | Purpose |
|---------|---------|
| `npm run graphSystem -- <entry.pdl>` | Print **full Component Catalogue** JSON (§16c) — entry file only; optional **`--out`**. No **`--theme`**. |
| `npm run graphComponent -- <entry.pdl> <Component>` | Print **`resolvedComponent`** slice JSON (§16c); optional **`--theme`**, **`--out`**, **`param=value`**. |
| `npm run bakeSystem -- <entry.pdl>` | Print **`bakedDesign`** JSON (§16d) — every component, default params; optional **`--theme`**, **`--out`**. |
| `npm run bakeComponent -- <entry.pdl> <Component>` | Print **`bakedDesign`** for one component (§16d); optional **`--theme`**, **`--out`**, **`param=value`**. |
| `npm run renderHtml -- <entry.pdl> <Component>` | **Bake → HTML5**: reference preview document (§16d + HTML emitter); optional **`--theme`**, **`--out`**, **`param=value`**. |
| `npm run renderHtml -- <entry.pdl> --system` | Same pipeline for **every** merged component (gallery layout). Optional **`--theme`**, **`--out`**. |
| `npm run renderHtmlFromBake -- <baked.json>` | HTML from an existing **`bakedDesign`** JSON (Rust or TS bake); optional **`--component`**, **`--out`**. |
| `npm run preview -- <entry.pdl> <Component>` | Live disk watch → bake → HTML livereload (`scripts/preview-server.mjs`); optional **`--system`**, **`--pack`**, **`--engine rust\|ts`**, **`--watch-dir`**. |
| `npm run playground` | Optional browser editor (`playground/`) on the same bake → HTML pipeline (Rust bake default). |
| `npm run renderCatalogueHtml -- <entry.pdl>` | **Catalogue + bake → HTML5**: primitives, semantics, themes, type styles, variant types, then default baked previews (`src/renderCatalogueHtml.ts`). Optional **`--theme`**, **`--out`**. |
| `npm run manifest -- <entry.pdl>` | Print **design manifest** JSON (§17 §3) — thin registry; optional **`--out`**. |
| `npm run catalogue -- <entry.pdl>` | Print **Component Catalogue** JSON (§16); optional **`--theme`** (same shape as **`graphSystem`**, but trees resolve under the chosen theme). |
| `npm run resolve -- <file> <Component> [key=value …]` | Print **`resolvedComponent`** JSON (§16 §2.5) or, with **`--tree-only`**, a bare **`CatalFrame`**. Optional **`--theme`**, **`--out`** is not wired — stdout only. |
| `npm run build` | Compile TypeScript: **`tsc`** → **`dist/`** (required before **`node dist/cli.js`** unless you use an **`npm run graph*`** script, which runs **`tsc`** first). |
| `npm test` | **`npm run build`** then **Vitest** (`tests/`, including JSON contract tests for catalogue / resolve / bake shapes). |

**JSON on disk:** **`graphSystem`**, **`catalogue`**, **`graphComponent`**, **`resolve`**, **`bakeSystem`**, and **`bakeComponent`** write **`stableStringify(..., { omitEmpty: true })`** — compact rules in **§16a**. **`manifest`** uses **`stableStringify`** **without** **`omitEmpty`**. **`renderHtml`** writes **HTML** (not JSON): it runs **`buildBakedDesign*`** in-process then **`renderBakedDesignToHtmlDocument`** (`src/renderHtml.ts`), or loads bake JSON via **`--from-bake`**. **`renderCatalogueHtml`** writes a **reference HTML** page from **`buildComponentCatalogue`** + **`buildBakedDesignSystem`** (`src/renderCatalogueHtml.ts`).

**Live preview:** **`npm run preview`** watches on-disk `.pdl` (and pack JSON), bakes with Rust by default, and serves HTML with SSE livereload — the C1 stress harness on bake IR. **`npm run playground`** is an optional in-browser editor on the same pipeline (`playground/`, Vite-bundled UI). Neither is a full Studio (multi-file IDE / inspector); that remains out of this package’s default surface.

---

## Source layout (engineering)

| Path | Role |
|------|------|
| `src/ast.ts` | AST node types (`ValueExpr`, declarations, …) |
| `src/designModel.ts` | `DesignDefinition` — merged design in memory |
| `src/lexer.ts` / `src/parser.ts` | Tokenise and parse `.pdl` modules |
| `src/loadDesign.ts` | Import closure, merge into `DesignDefinition` |
| `src/validateDesign.ts` | Post-merge validation |
| `src/evaluate.ts` | `buildResolvedTokenMap`, `evaluateValue`, conditions |
| `src/resolveTree.ts` | `resolveComponentTree`; graph vs bake resolve options |
| `src/graph.ts` | `serialiseValueExpr`, `serialiseValueExprWithTokenRefs`, `serialiseConditionExpr` |
| `src/graphJson.ts` | Shared catalogue / resolve JSON row types + `PDL_JSON_SCHEMA_VERSION` |
| `src/valueExprRefs.ts` | `ValueExpr` walk for declared token names (trimmed `system`) |
| `src/catalogue.ts` | `buildComponentCatalogue`, `buildCatalogueComponentRow`, `buildCatalogueTokenLayers` |
| `src/resolveBundle.ts` | `buildResolvedComponentDocument` |
| `src/bakeDesign.ts` | `bakedDesign` builders |
| `src/manifest.ts` | Thin design manifest |
| `src/cli.ts` | `pdl` CLI (`graphSystem`, `graphComponent`, `bake*`, `resolve`, `catalogue`, `manifest`) |
| `src/stableJson.ts` | Deterministic JSON stringify for CLI output (sorted keys; optional **`omitEmpty`** compaction — **§16a**) |
| `src/errors.ts` | `PdlError` and error codes |
| `tests/` | Vitest suites (including JSON shape contracts under `tests/helpers/`) |
| `test-fixtures/pdl/` | Fixture `.pdl` trees |
| `docs/SPEC_GAPS.md` | Known spec ↔ tooling gaps |

---

## Studio features (summary)

This repository is the **compiler and JSON emitters** plus thin **C1 HTML hosts** (`renderHtml`, **`npm run preview`**, optional **`npm run playground`**). A full **studio** (multi-file IDE, inspector, theme matrix, …) is **not** part of the default product surface. Hosts should consume **`loadDesign`**, **`buildComponentCatalogue`**, **`buildResolvedComponentDocument`**, or **`bakedDesign`** JSON from this codebase or from emitted artifacts.

---

## Documentation ↔ code alignment

1. **`docs/full-spec.md`** (this document) is the **normative** language and JSON-contract spec for the PDL compiler in this repository.  
2. **`src/ast.ts`** and **`src/parser.ts`** should stay aligned with §5–§7 (frames, props, values) when the grammar changes.  
3. **`loadDesign`**, **`evaluate`**, **`resolveTree`**, and JSON emitters (**`catalogue`**, **`resolveBundle`**, **`bakeDesign`**, **`manifest`**) should be updated in the **same change** as normative edits here, or the gap recorded in **`docs/SPEC_GAPS.md`** until closed.  
4. Add **`test-fixtures/pdl`** examples for new surface syntax (§15).  
5. **`pdl_spec.html`** (if present) is a **secondary** human-readable view — prefer **`docs/full-spec.md`** for implementers.

### Implementation parity (reference repo)

Companion blocks (**`fixtures`**, **`usage`**, **`rules`**, **`extend`**, **`interaction`**, **`emits`**) and **`pdl manifest`** are implemented on the catalogue / resolve paths. (**`expose` is removed from the language**; compilers may still emit a legacy `expose` array listing all params until the removal slice lands.) The table below tracks **larger** areas where the prose may still describe more than the reference TypeScript guarantees in every tooling path:

| Area | Notes |
|------|--------|
| **§12 Rules** | **`query`** objects are serialised on catalogue rows; full evaluator richness vs studio enforcement may differ. |
| **§13 Motion** | Handler / motion tiers — see §16b TODOs for catalogue-only serialisation. |
| **§14 Visual layers** | Some composite token / layer forms — keep fixtures and tests aligned with claims. |

Track progress by updating rows or **`docs/SPEC_GAPS.md`** when parity improves.

---

## Known limits & sharp edges

1. **Whole-document replace** on some editor paths uses selection mapping — boundary edits need care.  
2. **Static HTML** may not wire full interaction + motion runtimes (§8).  
3. **Import paths** must resolve from the loader root; broken imports fail at load time.  
4. **`test-fixtures/pdl/01_tokens_and_themes.pdl`** may duplicate content — do not use as style guidance; prefer `design/tokens.pdl` patterns.  

---

## VS Code

**VS Code / editor:** a **`vscode-pdl/`** extension (TextMate grammar + formatter) may ship in a separate repo or path; it is **not** required to be present at the root of this package.

---

## See also

- the Table of Contents  
- §18
---

## 10 — Quick Reference (Syntax Cheat Sheet)

## Top-level

```txt
previewBackground <colorToken>
import "path/to/file.pdl"

primitive name: TokenType = value
semantic name: TokenType = value

theme Name { … }
typeStyle StyleName { prop = value … }
variant Tone { case primary case secondary }   // design-axis combinator
enum InteractionState { case rest case hovered case pressed }  // state / domain set (≡ variant in v1)

protocol P: component {
  title = ""
  emits { select(filter: FilterId) }
}

component C <P>(params…) layout|text|icon|media {
  …
  self.pressEnd = { emit select(filter) }   // host inbound (§4a′)
}

emits C { select(filter: FilterId) }

fixtures C {
  example "Label" { param = value … }
}

usage C {
  description = "…"
  description += "…"    // in extend blocks
}

rules C {
  tags = ["a", "b"]
  Rule(.must, …)
  if param == .case { Rule(.mustNot, …) }
}

extend C {
  fixtures { example "…" { … } }
  usage { description += "…" }
}
```

Inside `layout` (see §4b / §4e):

```txt
children = [Header, slots]           // expand list/slot params
ForEach(chips) { chip in             // §4e — Rust bake expands
  chip.selected = self.currentFilter == filter
  chip.select(filter_id: FilterId) = {  // binder-qualified handler
    currentFilter = filter_id
  }
}
```

---

## Token types (names)

`Color`, `Opacity`, `Distance`, `Radius`, `Shadow`, `Icon`, `MediaSource`, `Ratio`, `FontFamily`, `Size`, `Weight`, `LineHeight`, `LetterSpacing`, `Sizing`, `Duration`, `Easing`, `Transition`, `Blur`, `Vibrancy`, `Ramp`, `Background`, `Foreground`

---

## Component header

```txt
name: String = "default"
name: VariantName = .case
```

---

## Common literals

```txt
.hug  .fill  .fixed(120)  .flex(min: 40, max: 200)
Sizing.hug  Sizing.fill  Sizing.fixed(120)  Sizing.flex(min: 40, max: 200)
.row .column .rowReverse .columnReverse .stack .reverseStack
Direction.row  Direction.column  …
.wrap .nowrap
Wrap.wrap  Wrap.nowrap
.start .center .end .stretch
Justify.center  Align.stretch  AlignSelf.end
.spaceBetween .spaceAround
.flow .absolute
Position.flow  Position.absolute
.visible .scroll .clip
Overflow.visible  Overflow.scroll  Overflow.clip
ContentMode.cover  TruncateStyle.ellipsis  TruncateStyle.clip
BorderPosition.inside  ObjectPosition.topLeft
#RRGGBB   (hex never quoted)   "string"   (other string literals)
color.token @ opacity.semantic.name
color.token @ 0.5
EdgeInsets(x: n, y: n)
EdgeInsets(top: …, right: …, bottom: …, left: …)
Corner(tl: n, tr: n, br: n, bl: n)
Shadow(x: n, y: n, blurRadius: n, color: #hex [| @ opacity] [, spread: n])
```

*(Prefer `color… @ opacity…` over a raw `0…1` literal in libraries; literals stay valid for one-offs.)*

---

## Layout child / flex

```txt
alignSelf = .start | .center | .end | .stretch | .auto
grow = 1
shrink = 0
position = .flow | .absolute
inset = EdgeInsets(…)
columnGap = spacing.sm
```

---

## Frames

```txt
let Id: layout = { … }
let Id: text = { … }
let Id: icon = { … }
let Id: media = { … }

children = [A, B, .spacer, C]
A.children = [X, Y]
```

---

## Layers (background / foreground)

Same grammar for both props; **`background`** under children, **`foreground`** over.

```txt
background = color.surface.card
foreground = color.surface.card
background = [ color.surface.card ]
foreground = [ color.primitive.black @ opacity.state.hover ]
background = [
  Blur(blur: blur.sheet, vibrancy: vibrancy.sheet),
  color.surface.primary @ opacity.surface.tint
]
foreground = [ color.primitive.black @ opacity.state.hover ]

// All constructors use keyword arguments (order does not matter)
Color(color: <token or #hex>)
Ramp(direction: .bottomToTop, stops: [ GradientStop(position: 0, opacity: 1) … ])
Blur(blur: blurToken)
Blur(blur: blurToken, vibrancy: vibrancyToken)
Media(source: "url", contentMode: .cover)
Media(source: mediaToken, contentMode: .cover, opacity: opacityToken)
Vibrancy(vibrancy: vibrancyToken)
```

---

## Instances

```txt
let Row = Other(a: "x", v: .primary)
```

---

## Conditions (frames)

```txt
if param == .case { … }
else if param == .other { … }
else { … }
```

---

## Interaction handler

```txt
on hoverStart { state = .hovered }
on appear {
  animate = motion.appear
  from { opacity = 0 scale = 0.95 }
}
on dismiss {
  animate = motion.dismiss
  to { opacity = 0 scale = 0.95 }
}
stagger = 30
staggerFrom = .first | .last
```

---

## Rules (abbreviated)

**`tags =` / `tags.add`:** **only** inside **`rules Name { … }`** — never on frames or in `component` bodies (§13 §2).

```txt
Rule(.must | .mustNot | .should | .shouldNot, <query> [, description: "…"])
ancestors.where(tag: "x").exists
children.where(tag: "tab-item").count.between(2, 5)
siblings.where(tag: "primary-action").count > 0
```

---

## Chapter index

the Table of Contents
---

## 11 — Companion Blocks: `fixtures`, `usage`, `rules`, `extend`

Companion declarations are **top-level** blocks keyed by **component name**. The compiler merges them into the same logical **component record** as `component`, `interaction`, `emits`, and (where applicable) metadata programs.

They exist so that:

- **Preview and codegen** can use **named example parameter maps** (`fixtures`).
- **Authors and LLMs** get human-readable guidance (`usage`).
- **Linters and design QA** get machine-checkable constraints (`rules` — see §12).
- **Consumers of libraries** can add project-local examples and docs without forking (`extend`).

**Removed:** `expose`. All parameters are public; output contracts live in **`emits`** (§4d).

---

## 1. Top-level grammar (summary)

```txt
fixtures <ComponentName> {
  example "<label>" { <param> = <valueExpr> … }
  …
}

usage <ComponentName> {
  description = "<markdown or plain text>"
  …
}

rules <ComponentName> {
  …   // see §12
}

extend <ComponentName> {
  fixtures { … }
  usage { … }
  rules { … }
}
```

**Ordering:** Any top-level block may appear in any order within a file. **Merge order** across files follows §2: later sources override or append per rules below.

---

## 2. `fixtures` — named example instances

**Fixtures** supply **parameter bindings** for preview, documentation, Storybook-like galleries, codegen snapshots, and unit tests.

```pdl
fixtures Button {
  example "Short label" {
    label = "OK"
    emphasis = .primary
  }
  example "Long label" {
    label = "Save and continue to next step"
    emphasis = .secondary
  }
}
```

```pdl
fixtures ListItem {
  example "Full content" {
    title = "Cozy cabin"
    subtitle = "Entire home · 2 beds"
    mediaUrl = "https://example.com/cabin.jpg"
  }
  example "No subtitle" {
    title = "Modern loft"
    mediaUrl = "https://example.com/loft.jpg"
  }
}
```

### Normative rules

1. **`example "<label>"`** — `label` is a **display string** for UI and logs (not an identifier); duplicate labels in one component are **invalid**.
2. Body lines are **`paramName = value`**. Fixture values must be concrete: **literals**, **token references**, and **variant case literals** (`.primary`) are valid. Parameter-referencing values are not allowed in fixture bodies — only concrete values that can be fully resolved at catalogue-generation time.
3. Every **`paramName`** must exist on the target component and the value must be **type-compatible** with that param’s declared type.
4. Fixture keys may name **any** declared parameter on the component (all params are public).

**Cross-defaults (v1):** Fixture bodies **must not** depend on another param’s **default** value unless that default is expressed as a **literal** or **token** visible in the fixture RHS; ordering of param-default evaluation across params is **undefined** for mutual references.

### Cross product with variants

Preview and test runners may render **each fixture × each combination of variant parameters** (or a declared subset). Implementations **must** document explosion limits (e.g. cap grid cells, sample deterministically).

### Merge

- Multiple `fixtures` blocks for the same component: **merge by example label** — later duplicate label **replaces** earlier example.

---

## 3. `usage` — human-readable guidance

```pdl
usage Button {
  description = "Primary actions for forms. Prefer `emphasis = .primary` for one CTA per surface."
}
```

- Intended for **tooltips**, design portals, and **LLM context**.
- May contain **Markdown** in the string body (escaping follows normal PDL string rules).
- **Normative v1:** only `description` is a defined key. Parsers **MUST** accept and preserve unknown keys for forward compatibility but **MUST NOT** rely on them for any normative behavior. The following additional keys are **reserved** for a future minor revision and **SHOULD NOT** be used with other meanings: `do`, `dont`, `seeAlso`, `accessibility`.

### String append in `extend`

```pdl
extend Button {
  usage {
    description += " In this project, always pair with a cancel action."
  }
}
```

**Normative merge for `+=`:** treat `description` as a string; **append** with a **single space** separator (same as §2). **`=`** replaces; **`+=`** appends. Smarter spacing (e.g. newline after sentence-ending **`.`**) is **not** in **v1**.

---

## 4. `rules` — structural constraints

See §13. **Tag strings** (**`tags =`**, **`tags.add`**) are **defined only** inside **`rules { … }`** — not on frames or elsewhere. Top-level:

```pdl
rules Button {
  tags = ["button", "interactive"]
  Rule(.mustNot, …)
}
```

`rules` blocks merge per §2: **`tags =`** is replaced by the later file; **`Rule(…)`** lines append in merge order.

---

## 5. `extend` — augment imported components

Allows a consuming project to attach **fixtures**, **usage**, or **rules** refinements **without** copying the base `component` body.

```pdl
extend Button {
  fixtures {
    example "Project-specific" { label = "Submit request" }
  }
  usage {
    description += " In this project, always pair with a cancel action."
  }
}
```

### Normative rules

1. **`extend` target** must resolve to an existing **component** name after full merge. If the target component does not exist in the merged definition, the parser **MUST** emit an error. Forward declarations are **not** supported in v1 — import ordering must ensure the base `component` appears before any `extend` that targets it.
2. Inner sections use the **same** grammar as standalone `fixtures` / `usage` / `rules` bodies.

### Merge order

Apply **`component`** definitions first, then **`extend`** from files in **merge order** (imports then entry), so **entry project** extensions win over library files.

---

## 6. Companion block inventory (per component)

| Block | Purpose |
|--------|---------|
| `component` | Visual structure, params, frames |
| `emits` | Public output intents (§4d) — inline or companion |
| `interaction` | Ambient host events → params / `emit` (§8) |
| `fixtures` | Example param maps |
| `usage` | Human-readable guidance |
| `rules` | Query-based constraints (§12) |
| `extend` | Library augmentation |

---

## 7. See also

- §4 — parameter typing
- §6 — `valueExpr` in fixtures
- §16 — how companion data appears in the Component Catalogue
---

## 12 — Rules Query Language

**Rules** express **design-time and preview-time constraints** over the **resolved component tree** (and bound parameters). They complement **visual overrides** (`if` inside frames): overrides change appearance; **rules** assert relationships between nodes using **tags** and tree shape ([§2](#2-tags)).

Every rule has the conceptual shape:

```txt
Rule(<strength>, <query> [, description: "<text>"])
```

In PDL:

```pdl
rules Button {
  tags = ["button", "interactive"]

  Rule(.should, ancestors.where(tag: "surface").exists)

  if emphasis == .primary {
    tags.add("primary-action")
    Rule(.mustNot, siblings.where(tag: "primary-action").count > 0,
      description: "Only one primary action per layout.")
  }

  if emphasis == .destructive {
    Rule(.must, siblings.where(tag: "confirm-action").precedes(self),
      description: "Destructive actions need prior confirmation.")
    Rule(.must, ancestors.where(tag: "confirmation-dialog").exists)
  }
}
```

```pdl
rules TabBar {
  tags = ["tab-bar"]
  Rule(.must, children.where(tag: "tab-item").count.between(2, 5))
  Rule(.should, self == parent.children.last)
}
```

---

## 1. Strengths

| Strength | Meaning |
|----------|---------|
| `.must` | Violation is an **error** (fails validation or CI). |
| `.mustNot` | If query matches, **error**. |
| `.should` | Violation is a **warning** (lint / advisory). |
| `.shouldNot` | If query matches, **warning** (advisory inverse of `.should` — the design **should not** satisfy the query). |

---

## 2. Tags (rules-only)

**Normative — definitions:** **`tags = [ … ]`** and **`tags.add("…")`** **MUST** appear **only** inside a **`rules ComponentName { … }`** block. Tag strings **MUST NOT** be declared on **`layout` / `text` / `icon` / `media`** frames, inside raw **`component`** bodies, or as any other top-level or frame property in **v1**.

Use **tags** for roles you need in **`Rule`** queries (e.g. **surface**, **primary-action**, **tab-item**). Tag definitions live only inside **`rules`** blocks in source; they may appear in manifests for tooling consumption.

Inside **`rules ComponentName { … }`**:

- **`tags = [ … ]`** — base tag set for **that** component’s **`rules`** program (after cross-file merge: later file **replaces** the whole array per §2).  
- **`tags.add("x")`** — **Normative:** while evaluating a conditional **`if`** arm inside **`rules`**, append **`x`** to the **effective** tag set **before** subsequent **`Rule`** lines in that arm (**top to bottom**). **`tags.add`** does **not** carry across sibling **`if`** arms.

**Effective tag set** for an instance of **`ComponentName`:** merged **`tags =`**, plus any **`tags.add`** from the arms that are **active** for the current evaluation context (fixture / preview params).

**`where(tag: "foo")`:** Tag membership is **always** from **`rules`** only (definitions above). For evaluation, each **`ResolvedFrame`** **MUST** expose the **effective tag set** of its **`meta.sourceComponent`** instance (merged **`tags =`** plus active **`tags.add`** for that component). **`where(tag: "foo")`** keeps nodes where **`foo`** is in that set. **Navigators:**
- **`self`** — the instance whose **`rules`** block is running (**rules-scoped**; not the same as layout/interaction `self` / `self.param` in §22.2).  
- **`children` / `siblings` / `descendants`** — match **embedded instance roots** (or **`self`**) whose **`sourceComponent`** rules tag set contains **`foo`** (e.g. **`children.where(tag: "tab-item")`** requires each counted child to be a **`TabItem`** instance whose **`rules TabItem`** includes **`tab-item`**).  
- **`ancestors`** — match an ancestor **instance root** whose **own** **`rules`** tag set contains **`foo`** (e.g. **`ancestors.where(tag: "surface")`** on a nested **`Button`** succeeds if an enclosing **`Surface`** instance’s **`rules Surface`** includes **`surface`**).

---

## 3. Query vocabulary

Queries compose **navigators**, **filters**, **aggregates**, and **comparisons**.

### 3.1 Axes (navigators)

Starting from **`self`** (the component instance root, or the frame under inspection — see evaluation root below):

| Navigator | Meaning |
|-----------|---------|
| `self` | Current node. |
| `parent` | Parent frame or containing instance. |
| `ancestors` | Walk upward to root. |
| `descendants` | Depth-first walk of children. |
| `siblings` | Other children of the same parent. |
| `children` | Direct children only. |

Method chaining: `ancestors.where(tag: "surface")` returns a **collection** of matching nodes.

### 3.2 Filters

```txt
.where(tag: "name")
```

- **`tag:`** — the node’s **rules-derived** effective tag set (§2) contains the name.

### 3.3 Aggregates

| Form | Type |
|------|------|
| `.exists` | Boolean — any match. |
| `.count` | Number — size of filtered set. |
| `.first` / `.last` | Optional node — for ordering predicates. |

### 3.4 Comparisons

- **`==`**, **`!=`** — node identity, tag sets, or scalar counts.  
- **`>`, `>=`, `<`, `<=`** — numeric (counts, indices).  
- **`.between(n, m)`** — inclusive range on counts.

### 3.5 Ordering (sibling / list position)

| Form | Meaning |
|------|---------|
| `.precedes(self)` | Some node in the filtered set appears **before** `self` in parent's `children` order. |
| `.follows(self)` | After `self`. |
| `.adjacentTo(self)` | Immediately next to `self`. |

### 3.6 Compound conditions

- Nested **`if`** in the `rules` block mirrors component **variant conditions** (§7); inner **`Rule`** lines apply when the guard holds.  
- **`&&` / `||`** between queries is **not** in **v1** surface syntax; use nested **`if`** in **`rules`**. A future revision **may** add infix boolean composition with explicit precedence.

---

## 4. Evaluation model

### 4.1 Evaluation root

For **`rules ComponentName`** attached to a component:

- **`self`** — the **root `ResolvedFrame`** of that component instance (the node whose `id` is the component’s root frame id after resolution).  
- **`parent`** — the **parent node** of `self` in the **resolved placement tree** (the layout frame or instance that lists this component as a child). If the instance is the **design root** and has no parent, **`parent`** is absent. **Normative:** any navigator or predicate that starts with or traverses `parent` when `parent` is absent **MUST evaluate to `false`** (for boolean predicates like `.exists`) or **empty** (for collection navigators like `siblings`). Implementations **MUST NOT** treat an absent `parent` as an error; it is a valid state for root-level components.

Rules run **per instance** (per fixture, per preview, or per codegen graph).

**Hosts without placement:** If rules run **before** the instance has a **`parent`** in the resolved tree, **`parent`** and **`siblings`** navigators **MUST** yield **empty** / false — the same as the design-root case. Hosts **MAY** inject a synthetic parent to enable richer validation; if they do, they **MUST** document this behavior.

### 4.2 Evaluability tiers

| Tier | When | Requirements |
|------|------|----------------|
| **Compile-time (static)** | After resolution, **without** layout metrics | Tree shape, **tags**, counts, ordering among **sibling** `children`, parent/ancestor presence. |
| **Preview-time** | Studio / browser | May include **approximate** hit-testing if implemented. |
| **Geometry-time** | Full layout engine | Spatial proximity, overlap, alignment in screen space — **optional**; rules depending on geometry **must** declare a **tier** annotation or default to preview/geometry and **no-op** in static emitters. |

Implementations **must** classify each built-in predicate into a tier and document it in the design manifest (§17).

### 4.3 Parametric rules

`if emphasis == .primary { … }` inside `rules` uses the same **condition** surface as frame overrides (§7): variant parameter compared to **`.case`**.

---

## 5. Serialization (normative JSON)

Serialised **`Rule`** values are part of the same JSON document as the root **`schemaVersion`** — each **`Rule`** object does not carry its own version field.

### 5.1 `Rule` object

Each rule is one object:

| Field | Type | Required | Meaning |
|-------|------|----------|---------|
| `strength` | string | **Yes** | **`must`** \| **`mustNot`** \| **`should`** \| **`shouldNot`**. |
| `query` | **`RuleQueryExpr`** | **Yes** | Canonical query AST (§5.2). |
| `description` | string \| null | No | Optional message for diagnostics / manifest. |
| `tier` | string | **Yes** | **`static`** \| **`preview`** \| **`geometry`** ([§4.2](#42-evaluability-tiers)). |

```json
{
  "strength": "must",
  "query": { "kind": "chain", "nav": { "kind": "nav", "axis": "children" }, "filters": [], "terminal": { "kind": "exists" } },
  "description": null,
  "tier": "static"
}
```

### 5.2 `RuleQueryExpr` (v1)

**Union** at the top level of **`query`**:

| `kind` | Meaning |
|--------|---------|
| **`chain`** | Navigator → zero or more filters → terminal predicate. |
| **`nodeEq`** | Structural equality of two **`PathExpr`** values (e.g. **`self`** vs **`parent.children.last`**). |

#### 5.2.1 `chain`

```ts
type ChainQuery = {
  kind: "chain";
  nav: NavigatorExpr;
  filters: WhereTagFilter[];
  terminal: ChainTerminal;
};
```

**`NavigatorExpr`:**

```json
{ "kind": "nav", "axis": "self" | "parent" | "ancestors" | "descendants" | "siblings" | "children" }
```

**`WhereTagFilter`:**

```json
{ "kind": "whereTag", "name": "surface" }
```

**`ChainTerminal`** — **one** of:

| `kind` | Fields | Surface equivalent |
|--------|--------|----------------------|
| **`exists`** | _(none)_ | `.exists` |
| **`aggregateCompare`** | `aggregate`, `op`, numeric bounds | `.count` compared to a number or **`.between`** |

**`aggregate`:**

```json
{ "kind": "count" }
```

(`first` / `last` may be added in a **minor** `schemaVersion` when their surface syntax is locked.)

**`aggregateCompare`** examples:

```json
{ "kind": "aggregateCompare", "aggregate": { "kind": "count" }, "op": "gt", "right": 0 }
```

```json
{ "kind": "aggregateCompare", "aggregate": { "kind": "count" }, "op": "between", "low": 2, "high": 5 }
```

**`op`** for **`aggregateCompare`:** **`eq`** \| **`ne`** \| **`gt`** \| **`gte`** \| **`lt`** \| **`lte`** \| **`between`** (for **`between`**, **`low`** and **`high`** are required instead of **`right`**).

**`ordering`** terminal (sibling / list position):

```json
{ "kind": "ordering", "relation": "precedes" | "follows" | "adjacentTo", "ref": "self" }
```

(`ref` is **`self`** for the surface forms **`.precedes(self)`**, etc.)

#### 5.2.2 `nodeEq`

```json
{
  "kind": "nodeEq",
  "left": { "kind": "path", "steps": [{ "kind": "nav", "axis": "self" }] },
  "right": {
    "kind": "path",
    "steps": [
      { "kind": "nav", "axis": "parent" },
      { "kind": "childrenPick", "index": "last" }
    ]
  }
}
```

**`PathExpr`:** `{ "kind": "path", "steps": Step[] }` where each **`Step`** is:

- **`{ "kind": "nav", "axis": "<same as NavigatorExpr.axis>" }`** — move from the current path end (evaluation starts at **`self`** for each path in **`nodeEq`**).  
- **`{ "kind": "childrenPick", "index": "first" | "last" | <number> }`** — the **`children`** collection of the current node, then pick by index.

**Normative:** **`path.steps` MUST NOT** be empty; the first step **MUST** be **`nav`**.

### 5.3 Examples (from § introduction)

**`Rule(.should, ancestors.where(tag: "surface").exists)`**

```json
{
  "strength": "should",
  "query": {
    "kind": "chain",
    "nav": { "kind": "nav", "axis": "ancestors" },
    "filters": [{ "kind": "whereTag", "name": "surface" }],
    "terminal": { "kind": "exists" }
  },
  "description": null,
  "tier": "static"
}
```

**`Rule(.mustNot, siblings.where(tag: "primary-action").count > 0, …)`**

```json
{
  "strength": "mustNot",
  "query": {
    "kind": "chain",
    "nav": { "kind": "nav", "axis": "siblings" },
    "filters": [{ "kind": "whereTag", "name": "primary-action" }],
    "terminal": {
      "kind": "aggregateCompare",
      "aggregate": { "kind": "count" },
      "op": "gt",
      "right": 0
    }
  },
  "description": "Only one primary action per layout.",
  "tier": "static"
}
```

**`Rule(.must, siblings.where(tag: "confirm-action").precedes(self), …)`**

```json
{
  "strength": "must",
  "query": {
    "kind": "chain",
    "nav": { "kind": "nav", "axis": "siblings" },
    "filters": [{ "kind": "whereTag", "name": "confirm-action" }],
    "terminal": { "kind": "ordering", "relation": "precedes", "ref": "self" }
  },
  "description": "Destructive actions need prior confirmation.",
  "tier": "static"
}
```

**`Rule(.must, ancestors.where(tag: "confirmation-dialog").exists)`** — same shape as the first example with **`strength": "must"`**, **`name": "confirmation-dialog"`**.

**`Rule(.must, children.where(tag: "tab-item").count.between(2, 5))`**

```json
{
  "strength": "must",
  "query": {
    "kind": "chain",
    "nav": { "kind": "nav", "axis": "children" },
    "filters": [{ "kind": "whereTag", "name": "tab-item" }],
    "terminal": {
      "kind": "aggregateCompare",
      "aggregate": { "kind": "count" },
      "op": "between",
      "low": 2,
      "high": 5
    }
  },
  "description": null,
  "tier": "static"
}
```

**`Rule(.should, self == parent.children.last)`**

```json
{
  "strength": "should",
  "query": {
    "kind": "nodeEq",
    "left": { "kind": "path", "steps": [{ "kind": "nav", "axis": "self" }] },
    "right": {
      "kind": "path",
      "steps": [
        { "kind": "nav", "axis": "parent" },
        { "kind": "childrenPick", "index": "last" }
      ]
    }
  },
  "description": null,
  "tier": "static"
}
```

### 5.4 Canonical bytes

For a given **document** **`schemaVersion`**, serializers **MUST** emit **deterministic** JSON for the same logical **`Rule`** (stable key order, no insignificant whitespace differences).

---

## 6. Non-goals (v1)

- Arbitrary user functions inside queries.  
- Regular expressions over text content (unless explicitly added later).  
- Cross-window or cross-document rules.

---

## 7. See also

- §7 — `if` on frames vs `if` in `rules`  
- §16 — `RuleDef` on resolved output; normative JSON policy ((§16))  
- §12
---

## 13 — Motion Tokens and Interaction Animation

Motion is expressed as **typed tokens** (same **primitive / semantic / theme** pattern as color and distance) so emitters can map intent to **CSS**, **SwiftUI**, **Jetpack Compose**, or platform curves consistently.

---

## 1. Token types

### 1.1 `Duration`

Milliseconds (or unit tagged in literal — default **ms** as number).

```pdl
primitive motion.duration.fast: Duration = 150
primitive motion.duration.standard: Duration = 250
primitive motion.duration.slow: Duration = 400
```

### 1.2 `Easing`

A **curve** description. Common forms:

- **CSS cubic-bezier** string: `"cubic-bezier(0.2, 0, 0, 1)"`  
- **Named curves** (optional enum): platform mapping tables live in emitters.

```pdl
primitive motion.easing.linear: Easing = "linear"
primitive motion.easing.standard: Easing = "cubic-bezier(0.2, 0, 0, 1)"
primitive motion.easing.overshoot: Easing = "cubic-bezier(0.34, 1.56, 0.64, 1)"
```

### 1.3 `Transition`

Composite: **duration + easing + optional delay**. All three fields are part of the v1 `Transition` tuple. `delay` defaults to `0` when omitted and is in the same unit as `duration` (milliseconds).

```pdl
semantic motion.appear: Transition = (duration: motion.duration.standard, easing: motion.easing.standard)

semantic motion.dismiss: Transition = (duration: motion.duration.fast, easing: motion.easing.standard)

semantic motion.interactive: Transition = (duration: motion.duration.fast, easing: motion.easing.overshoot)

semantic motion.instant: Transition = (duration: 0, easing: motion.easing.linear)
```

**Theme overrides:**

```pdl
theme ReducedMotion {
  motion.appear = motion.instant
  motion.dismiss = motion.instant
  motion.interactive = motion.instant
}
```

---

## 2. Host handler bodies — animation statements

Host inbound handlers (§8) gain optional **motion** clauses.

### 2.1 `animate`

Selects a **resolved `Transition`** token (or inline tuple if grammar allows):

```pdl
component Button <PointerInput>(…) layout {
  …
  self.hoverStart = {
    interactionState = .hovered
    animate = motion.interactive
  }
}
```

### 2.2 `appear` / `dismiss` events

**Lifecycle** events for enter/exit animations (preview and native emitters map to platform equivalents).

```pdl
component Modal <PointerInput>(…) layout {
  …
  self.appear = {
    animate = motion.appear
    from {
      opacity = 0
      scale = 0.95
    }
  }
  self.dismiss = {
    animate = motion.dismiss
    to {
      opacity = 0
      scale = 0.95
    }
  }
}
```

**`from` / `to` blocks:** contain scalar props interpolated by the preview or animation runtime. The **normative `AnimatableProp` set for v1** is:

| Property | Type | Notes |
|----------|------|-------|
| `opacity` | number (0…1) or `Opacity` token | Alpha |
| `scale` | number | Uniform scale factor (1.0 = no scale) |
| `scaleX` | number | Horizontal scale factor |
| `scaleY` | number | Vertical scale factor |
| `translateX` | number | Horizontal offset in px |
| `translateY` | number | Vertical offset in px |
| `blur` | number | Blur radius in px (applies to the frame, not a background layer) |

Emitters **MUST** support at minimum `opacity`, `scale`, `translateX`, and `translateY`. Support for `scaleX`, `scaleY`, and `blur` is **RECOMMENDED**. Emitters **MUST** document which properties they support in the design manifest `capabilities.animatableProps` field. Unknown properties in a `from`/`to` block **MUST** be silently ignored (not a parse error).

### 2.3 Stagger for lists

```pdl
component List <PointerInput>(…) layout {
  …
  self.appear = {
    animate = motion.appear
    stagger = 30
    staggerFrom = .first
  }
}
```

- **`stagger`**: delay increment in **ms** between consecutive visible children.  
- **`staggerFrom`**: `.first` | `.last` — order of application.

---

## 3. Events table (extended)

| Event | Use |
|-------|-----|
| `hoverStart` / `hoverEnd` | Pointer hover |
| `pressStart` / `pressEnd` / `pressCancel` | Press |
| `focusStart` / `focusEnd` | Focus |
| `activate` | Primary action |
| **`appear`** | Node entered hierarchy / became visible |
| **`dismiss`** | Node exited / hidden |

---

## 4. Resolution order

1. Resolve **tokens** (including `Transition`) with **theme** applied.  
2. Bind **interaction** handler; attach **`animate`** as resolved transition payload on the **interaction definition** (not on `ResolvedFrame` static tree unless inlined by a specialized emitter).  
3. **Preview runtime** applies transitions when applying interaction events.

---

## 5. Emitter mapping (normative intent)

| Target | Responsibility |
|--------|------------------|
| **HTML/CSS** | `transition-*`, `transform`, `opacity`; `@media (prefers-reduced-motion)` should track **ReducedMotion** theme. |
| **SwiftUI** | `animation(_:value:)` / `withAnimation` with mapped curve. |
| **Compose** | `animate*AsState`, `AnimationSpec` from duration + easing. |

**Fidelity:** not all curves map 1:1; emitters **must** document approximation.

---

## 6. See also

- §3 — token type catalog  
- §8  
- §15 — five core layer constructors (**`Color`**, **`Ramp`**, **`Blur`**, **`Media`**, **`Vibrancy`**); motion tokens pair with interaction animation
---

## 14 — Visual Layers: `background`, `foreground`, and Layer Constructors

**`background`** and **`foreground`** use the **same value grammar**: a **scalar `Color`** (token or `#hex`) or an **ordered array** of **layer** constructors, bottom → top. A lone color is **syntactic sugar** for a **one-layer** stack (same rule for both props).

The **only** difference is **where** the resolved stack is composited relative to the frame’s **children**: **`background`** sits **under** child content; **`foreground`** sits **over** child content. How **foreground** relates to **border** / **shadow** within the frame is **emitter-defined** but **must** be documented (typical: … → children → **foreground** → border → shadow).

---

## 1. Frame properties

### 1.1 `background` and `foreground` (shared forms)

```pdl
background = color.surface.primary
foreground = color.primitive.black @ opacity.state.hover
background = [color.surface.primary]
foreground = [color.primitive.black @ opacity.state.hover]
background = [
  Blur(blur: blur.sheet, vibrancy: vibrancy.sheet),
  color.surface.primary @ opacity.surface.tint
]
foreground = [
  color.primitive.black @ opacity.state.hover,
  Color(color.primitive.white @ 0.3)
]
```

- **Scalar color** — one solid layer (sugar).  
- **Array** — ordered layers; last is topmost **within that stack**.  
- **`Background` / `Foreground` tokens** — named stacks; RHS is the same layer-list shape ([§5](#5-composite-token-types)).

### 1.2 Inline opacity (`@`)

```pdl
color.surface.primary @ opacity.surface.tint
color.surface.primary @ 0.75
```

**Meaning:** combine the resolved **color** with an alpha multiplier. The RHS is either a resolved **`Opacity`** token (preferred — name intent, theme overrides) or a **literal** in **0…1** (§3, §6). Emitters produce a concrete color + alpha in **resolved** props.

---

## 2. Core layer constructors (single namespace)

Normative **layer** constructors are **only** these five names. They share a namespace with **token types** of the same names (`Blur`, `Ramp`, `Vibrancy`, …): a **bare token** in a layer slot is still a **Color** layer (sugar); **`Blur(blur: blur.sheet)`** is the **blur layer** constructor taking a **`Blur`** token.

**All constructors use keyword arguments exclusively.** Positional-only forms are not supported. Argument order within a constructor call does not matter.

Valid in **`background`** or **`foreground`** unless noted.

| Constructor | Keyword arguments | Notes |
|-------------|----------------------|--------|
| **`Color`** | `color:` (token or `#hex`) | Solid fill; a bare token / `#hex` in a layer array is **sugar** for `Color(color: …)`. |
| **`Ramp`** | `direction:` (enum), `stops:` (array of `GradientStop`) | Linear or radial ramp. |
| **`Blur`** | `blur:` (`Blur` token), `vibrancy:` (`Vibrancy` token, optional) | Backdrop-style when in **`background`**; content blur when in **`foreground`** — **emitter interprets** position. |
| **`Media`** | `source:` (`MediaSource` or string), `contentMode:` (enum), `opacity:` (number or `Opacity` token, optional) | Raster / vector / video fill. |
| **`Vibrancy`** | `vibrancy:` (`Vibrancy` token) | Saturation / brightness pass **without** blur; compose with **`Blur`** when both apply. |

**Examples (keyword form — normative):**

```pdl
Blur(blur: blur.sheet)
Blur(blur: blur.sheet, vibrancy: vibrancy.sheet)
Ramp(direction: .bottomToTop, stops: [GradientStop(opacity: 1, position: 0), GradientStop(opacity: 0, position: 1)])
Color(color: color.surface.primary)
Media(source: "hero.jpg", contentMode: .cover)
Media(source: media.hero, contentMode: .cover, opacity: opacity.surface.tint)
Vibrancy(vibrancy: vibrancy.sheet)
```

### 2.1 `GradientStop`

`GradientStop` uses keyword arguments. All three fields are optional individually, but at least `position` is required for the stop to have meaning.

| Keyword | Type | Default | Notes |
|---------|------|---------|-------|
| `position:` | number (0…1) | — | Position along the gradient axis. `0` = start, `1` = end. For `.radial`, position is a fraction of the radius from center. **Required.** |
| `opacity:` | number (0…1) or `Opacity` token | `1` | Alpha at this stop. |
| `color:` | color token or `#hex` | inherits from `Ramp` context | Color at this stop. When omitted, the stop only controls opacity (useful for opacity-mask ramps). |

```pdl
// Opacity-only ramp (mask / fade)
GradientStop(opacity: 1, position: 0.5)
GradientStop(opacity: 0, position: 1)

// Color ramp
GradientStop(color: color.brand.primary, opacity: 1, position: 0)
GradientStop(color: color.brand.secondary, opacity: 1, position: 1)
```

Position is **0…1** along the axis for linear gradients. For `.radial`, position is a fraction of the radius from center (**0** = center, **1** = edge).

### 2.2 `Ramp` — `direction`

First argument **`direction`** is a dot-enum (linear unless noted otherwise):

| Value | Meaning |
|-------|---------|
| `.topToBottom` | Linear gradient, start at top edge |
| `.bottomToTop` | Linear gradient, start at bottom edge |
| `.leftToRight` | Linear gradient, start at left edge |
| `.rightToLeft` | Linear gradient, start at right edge |
| `.radial` | Radial gradient from center (stops interpret as radius fractions — **emitter-defined**) |

**Radial ramps:** For **`direction = .radial`**, **`GradientStop.position`** is a **fraction of radius** from the center (**0** = center, **1** = edge) unless an emitter documents a different convention; **constructor** `Ramp(...)` and **`Ramp`** token literals **MUST** use the **same** direction enum set ([§4.3](#43-ramp)).

---

## 3. `Ramp` token vs `Ramp(...)` constructor

A **`Ramp`** **semantic or primitive token** used as a **layer entry** (e.g. `ramp.scrollFade` in a stack) is the **same visual shape** as an inline **`Ramp(direction: …, stops: …)`** constructor: opacity / color ramp along an axis. Prefer **named tokens** for reuse across themes.

**Inner shadow** and **shimmer** effects are **not** separate constructor names in this namespace; express them with **`Color`**, **`Ramp`**, motion on children, or **emitter-documented** extensions until a future `schemaVersion` adds more core constructors.

---

## 4. Token types (visual effects)

These sections define **token** values (numbers, tuples, named primitives/semantics). **§2** defines **layer constructors** that **reuse the same names** (`Blur`, `Ramp`, `Vibrancy`, …) to build entries inside **`background`** / **`foreground`** stacks.

### 4.1 `Blur`

```pdl
primitive blur.subtle: Blur = 8
primitive blur.standard: Blur = 16
primitive blur.heavy: Blur = 32

semantic blur.sheet: Blur = blur.standard
semantic blur.overlay: Blur = blur.heavy
```

Numeric **sigma** (CSS `backdrop-filter` / platform blur radius) unless emitter documents otherwise.

### 4.2 `Vibrancy`

```pdl
primitive vibrancy.standard: Vibrancy = (saturation: 1.4, brightness: 1.1)
primitive vibrancy.subtle: Vibrancy = (saturation: 1.1, brightness: 1.0)

semantic vibrancy.sheet: Vibrancy = vibrancy.standard
```

Emitter maps to platform-specific vibrancy APIs or approximates with saturation/brightness filters.

### 4.3 `Ramp`

Opacity ramp for masks and scroll fades.

```pdl
primitive ramp.fade.soft: Ramp = (direction: .bottomToTop, stops: [
  GradientStop(opacity: 1, position: 0.7),
  GradientStop(opacity: 0, position: 1)
])

semantic ramp.scrollFade: Ramp = ramp.fade.soft
```

---

## 5. Composite token types

Declare **`Opacity`** tokens used by the composites (primitives here; your library may alias them as semantics):

```pdl
primitive opacity.surface.tint: Opacity = 0.75
primitive opacity.overlay.scrim: Opacity = 0.4
primitive opacity.state.hover: Opacity = 0.08
primitive opacity.state.pressed: Opacity = 0.12
primitive opacity.state.disabled: Opacity = 0.38
```

### 5.1 `Background`

Named **material** stacks:

```pdl
semantic material.sheet: Background = [
  Blur(blur: blur.sheet, vibrancy: vibrancy.sheet),
  color.surface.primary @ opacity.surface.tint
]

semantic material.overlay: Background = [
  Blur(blur: blur.overlay),
  color.primitive.black @ opacity.overlay.scrim
]
```

Use on **`layout` / `media` / `text`**: **`background`** accepts **`Background`** token or **color / layer list**; **`foreground`** accepts **`Foreground`** token or the **same** **color / layer list** (each resolved to a layer array before compositing under vs over children).

### 5.2 `Foreground`

**Same underlying shape** as **`Background`** (scalar color sugar or ordered layer list). The type name encodes **author intent** (e.g. state overlays vs sheet materials); resolvers and emitters should treat the **serialized layer list** the same way, then composite **above** children instead of below.

Named **effect** stacks:

```pdl
semantic effect.stateLayer.hover: Foreground = [color.primitive.black @ opacity.state.hover]
semantic effect.stateLayer.pressed: Foreground = [color.primitive.black @ opacity.state.pressed]
semantic effect.stateLayer.disabled: Foreground = [color.surface.primary @ opacity.state.disabled]
semantic effect.shimmer: Foreground = [Color(color.primitive.white @ 0.3)]
semantic effect.scrollFade: Foreground = [ramp.scrollFade]
```

---

## 6. Resolution (normative)

1. **Parse** layer constructors into their AST representation (token refs inside constructors).  
2. **Resolve** each layer after token lookup: output is **JSON-serializable** list of discriminated unions, e.g. `{ "kind": "color", … }`, `{ "kind": "ramp", … }`, `{ "kind": "blur", … }`, `{ "kind": "media", … }`, `{ "kind": "vibrancy", … }`.  
3. **Emitters** map resolved unions to CSS / SwiftUI / Compose; **capability flags** in manifest declare supported layer kinds (aligned with **Color** / **Ramp** / **Blur** / **Media** / **Vibrancy**).

---

## 7. Complete token type list (catalog)

| Token type | Category | Role |
|------------|----------|------|
| `Color` | color | Solid colors |
| `Opacity` | color | Alpha multipliers |
| `Distance` | spacing | Gaps, insets |
| `Radius` | shape | Uniform corner radius (scalar; `Corner(…)` is frame-only) |
| `Shadow` | effect | Drop shadows (`Shadow(…)` constructor) |
| `Icon` | asset | Glyph id |
| `MediaSource` | asset | Raster / vector / video / path ref (§5 §`media`) |
| `Ratio` | layout | Aspect ratio |
| `FontFamily` | typography | Font stack |
| `Size` | typography | Font size |
| `Weight` | typography | Font weight |
| `LineHeight` | typography | Unitless leading ratio |
| `LetterSpacing` | typography | Tracking (em) |
| `Sizing` | layout | Hug/fill/flex literals at token level (rare) |
| `Duration` | motion | Time spans |
| `Easing` | motion | Curves |
| `Transition` | motion | Duration + easing + delay (default 0) |
| `Blur` | visual effect | Blur radius / intensity |
| `Vibrancy` | visual effect | Saturation/brightness intent |
| `Ramp` | visual effect | Opacity / mask ramps |
| `Background` | composite | Named layer stack (same RHS shape as `Foreground`; composite **under** children) |
| `Foreground` | composite | Named layer stack (same RHS shape as `Background`; composite **over** children) |

---

## 8. Property type updates

In §5, **`background`** and **`foreground`** on `layout` / `text` / `media` each accept **`Color` | `Background` / `Foreground` token | layer array literal`** — identical alternatives; only **compositing order** relative to children differs.

---

## 9. See also

---

## 15 — Best Practices

## Tokens

1. **Namespace primitives** — `color.primitive.*`, `spacing.primitive.*`, `motion.duration.*`, `blur.*`, etc.  
2. **Expose semantics for UI** — components consume semantic tokens, not raw palette (except demos).  
3. **Keep semantic names stable** — migrate in one place.  
4. **Use the typed token system** — motion and materials as **`Transition`**, **`Background`**, not untyped strings (§3, §15).  
5. **Model alpha with `Opacity` tokens** — scrims, sheet tints, hover washes: primitives + semantics, then **`color… @ opacity…`** in layers so themes can retint without literals (§3, §6).  

## Themes

1. **Override semantics first** — remap surfaces, not every component.  
2. **Combine themes at resolution** — orthogonal bundles (e.g. Light + ReducedMotion) via **`theme` + `modifiers`**, not nested “theme extends theme” authoring (§3, §16).  
3. **Reduced motion** — override **`Transition`** tokens in a dedicated theme (§14).  
4. **Preview** — use `previewBackground` that works across light/dark where possible.  

## Typography

1. **Prefer `typeStyle`** over repeating font props.  
2. **Pair type styles with semantic text colors.**  
3. **Clamp long copy** — `overflow = .clip` + `truncateStyle = .ellipsis` (+ optional `lineClamp`).  

## Variants / enums

1. **Finite state** — `rest` / `hovered` / `pressed` beats many booleans (`enum InteractionState { … }` is the usual spelling).  
2. **Readable case names** — `.primary`, `.secondary`.  
3. **Safe defaults** — e.g. `interactionState = .rest`.  
4. **Spelling** — use **`variant`** for design-axis combinators (tone × size); **`enum`** for ids and interaction/state (same IR today).  
5. **No `extend Type`** — declare a new closed set (or map exotic host events onto an existing case) rather than OO-extending an enum.  

## Components

1. **Root `layout` + nested frames** for most UIs.  
2. **Order `let` before `children`** when readable; mutate `Frame.children` when order is fixed late.  
3. **Thin parameters** — pass copy as params, not hard-coded strings, unless fixed marketing text.  
4. **Use `.spacer`** instead of empty flex hack divs in hand-authored flex rows (§5).  

## Overrides

1. **Specific → general** branch order.  
2. **Avoid duplicating whole `let` frames** when only props differ.  
3. **Match variant type** in conditions.  

## Interactions

1. **Symmetric events** — pair hover/press/focus start/end (§8).  
2. **Keep handlers thin** — visuals live in component `if` chains; motion via **`animate`** (§14).  

## `emits` and `fixtures`

1. Declare **`emits`** for every intent a parent or host should hear (§4d).  
2. **Fixtures** — short labels, realistic strings, edge cases (long title, missing optional).  
3. **Cap** variant × fixture grids in CI to avoid combinatorial explosion.  

## Rules

1. **Start with static-tier** rules only; add geometry later (§13).  
2. **Prefer `mustNot` + clear description** for one-per-surface constraints.  

## Materials and layers

1. **Name repeated stacks** as **`Background`** / **`Foreground`** semantic tokens (§15).  
2. **Inline layers** only for one-offs; otherwise tokens stay testable.  

## Files & velocity

1. **Entry file** — imports + `previewBackground` when possible.  
2. **One concern per file** — tokens, motion, themes, components.  
3. **`test-fixtures/pdl`** for minimal parser/regression repros.  

## Documentation

When the language changes:

1. Update **`docs/full-spec.md`** (this document) in lockstep with **`src/parser.ts`**, **`src/loadDesign.ts`**, and emitters.  
2. Extend **`test-fixtures/pdl`** and **`tests/`** (Vitest) for new syntax and JSON contracts.  
3. Record intentional gaps in **`docs/SPEC_GAPS.md`** until closed.

---

## 16 — Component Catalogue and Pipeline

This chapter describes how PDL source files become the **Component Catalogue** — the primary handoff format for emitters like Kotlin, SwiftUI, React, and HTML generators. The goal is simple: emitter authors should be able to pick up the catalogue JSON and start writing code without needing to understand PDL syntax, implement a parser, or chase unresolved references.

For the serialised **`ValueExpr`** JSON shapes embedded in catalogue and resolve output, see **§16b**. For **CLI file** compaction (missing keys vs in-process builders), see **§16a**. For the thin **design manifest** (registry of names and APIs without frame trees), see **§17**.

---

## 0. Three JSON serialisation roles

PDL toolchains may emit more than one JSON artefact. They are **layered by purpose**, not three interchangeable “sources of truth”:

| Artefact | Role | Typical consumer |
|----------|------|------------------|
| **Component Catalogue** (this chapter, §2 onward) | **Full design-system graph** (same row shapes as **`resolvedComponent.system`**, untrimmed): **`primitives`**, **`semantics`**, **`themes`** (**`baseTheme`** + **`overrides`**, pointer RHSs), **`typeStyles`** (**`props`** use the same pointer rules as token **`definition`**s), **`variantTypes`**, per-component **`params`**, **`emits`**, **base** / **variant** trees, **`primitive:`** / **`semantic:`** markers on frames (§2.3). (Transitional JSON may still include an **`expose`** array = all param names.) **`bakedDesign`** is the counterpart with **literal** trees only (§16d). Emitted by **`pdl graphSystem`** / **`pdl catalogue`** (§16c). | Code generators, bundlers, optional runtime loaders |
| **`resolvedComponent`** (§16 §2.5, §16c) | **Scoped graph slice**: trimmed **`system`**, **`primaryComponent`**, and **`components`** containing the **primary** catalogue row **plus** transitive **`requiredComponents`** rows (same shapes as §2.2, minus **`defaultParams`**). **`pdl graphComponent`** / legacy **`pdl resolve`** (without **`--tree-only`**). | Scoped emitters, previews, documentation |
| **`bakedDesign`** (§16d) | **Fully denormalised** trees only: **`components`** map of materialised **`root`** frames, literal **`props`**, no token or variant registries. **`pdl bakeSystem`** / **`pdl bakeComponent`**. | Quick draw-only consumers, static snapshots |
| **Design manifest** (§17) | **Small registry**: entry path, module list, theme / variant / typeStyle **names**, per-component param types — **no** resolved frame trees, **no** token value map. | CI, docs, package indexes, sanity checks |

**Guidance:** use **graph** outputs (catalogue / **`resolvedComponent`**) when receivers should follow **`primitive:`** / **`semantic:`** (and the same pointer rules inside **`typeStyles.props`** and token **`definition`**s). Use **bake** when trees must be **fully literal** (no token graph, no variant catalogue). Inline **`SerialisedValueExpr`** fragments (§16b) appear only inside those graph payloads, not inside **`bakedDesign`**.

## 16a — Reference CLI wire JSON (compact serialization)

The reference CLI (`src/cli.ts`) writes **graph** and **bake** JSON with **`stableStringify(value, { omitEmpty: true })`** from **`src/stableJson.ts`** for:

- **`pdl graphSystem`**, **`pdl catalogue`**, **`pdl graphComponent`**, **`pdl resolve`** (default **`resolvedComponent`** or **`--tree-only`** **`CatalFrame`** tree), **`pdl bakeSystem`**, and **`pdl bakeComponent`**.

**`pdl manifest`** uses **`stableStringify`** **without** **`omitEmpty`** (manifest rows stay explicit where the manifest schema expects keys).

**Determinism:** Every **`stableStringify`** pass sorts **object keys** at all depths (lexicographic order of property names) before **`JSON.stringify`**, then appends a single trailing newline. The same logical value and the same **`omitEmpty`** flag **MUST** yield byte-identical output.

**Compact rules** when **`omitEmpty: true`** (implemented by **`omitEmptyDeep`**):

1. **Object keys dropped** when, after recursion, the property value is an **empty array** **`[]`** or **empty object** **`{}`**.
2. **Array elements preserved:** empty **`[]`** / **`{}`** that appear **inside arrays** are **not** removed (only **object properties** whose value becomes an empty container are pruned).
3. **Empty strings:** object properties whose value is **`""`** are dropped **except** while traversing the subtree under a property named **`props`** (frame property bags may intentionally carry **`""`**, e.g. **`text`** **`content`**). Keys named **`props`** at any depth that hold frame property objects enter this “preserve empty string values inside **`props`**” mode for their nested values.

**Consumer contract (parsing CLI files):** Treat **missing** optional keys as their **logical defaults** unless a field is explicitly required:

- Absent map → **`{}`**; absent array → **`[]`** where the logical schema is a list.
- Catalogue / **`resolvedComponent`** component rows: absent **`usage`** → no usage prose; absent **`variants`** → **`[]`**; absent **`expose`** / **`params`** when the design truly has none → **`[]`**; **`childNodes`** registry frames: absent **`children`** → **`[]`** (no in-registry child list); absent **`instanceKwargs`** on an instance → **`{}`**; variant entries: absent **`changes`** → **`[]`**.
- **`resolvedComponent`:** the top-level **`system`** object may be **omitted** when every subsystem would serialize to empty maps and there is no **`theme`** key. Individual **`system.*`** maps (**`primitives`**, **`semantics`**, **`themes`**, **`typeStyles`**, **`variantTypes`**) may each be omitted when that map would be **`{}`** after pruning.
- **Component Catalogue root:** top-level **`primitives`**, **`semantics`**, **`themes`**, **`typeStyles`**, or **`variantTypes`** may be omitted when the corresponding merged map is empty. In-process **`buildComponentCatalogue`** still builds full maps; **on-disk CLI output** may therefore be **sparser** than the illustrative JSON blocks in §2.1 while remaining **logically** the same catalogue.

**Normative for the reference toolchain:** Emitters and tests that consume **CLI-written** JSON **SHOULD** normalise absent optional keys as above before applying the field tables in §2 and §2.5. In-process callers that use **`buildComponentCatalogue`** / **`buildResolvedComponentDocument`** / **`buildBakedDesign*`** directly receive the full in-memory shapes without this pruning step.

---

## 1. The compilation pipeline

PDL compilation has three stages. The first two happen in the PDL toolchain; the third is where emitter authors plug in.

```
┌─────────────────────────────────────┐
│  Phase 1 — Parse & merge            │
│  .pdl files → DesignDefinition      │
│  (in-memory; handles imports,        │
│  merge rules, validation)           │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  Phase 2 — Resolve & serialise      │
│  DesignDefinition → Component        │
│  Catalogue JSON                     │
│                                     │
│  Token graph + pointer trees,       │
│  themes applied, variant deltas.   │
│                                     │
│  Optional `--out` / stdout          │
│  (CLI JSON uses §16a compaction)     │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  Phase 3 — Emit                     │
│  Catalogue JSON → target code       │
│  (Kotlin, SwiftUI, React, HTML, …)  │
│                                     │
│  Emitter reads plain JSON.          │
│  No PDL parser needed.              │
└─────────────────────────────────────┘
```

**Phase 2 is optional for in-process tooling.** Any host that starts from `.pdl` files in-process may call **`buildComponentCatalogue`** (or **`buildResolvedComponentDocument`**) without writing JSON. Emitting JSON to disk is for separate processes, languages, or repos — it insulates consumers from PDL syntax changes and avoids re-implementing parse + merge.

---

## 2. The Component Catalogue format

The catalogue is a single JSON file: the **canonical emitter input** and the **full** design-system graph. Every merged **`primitive`** / **`semantic`** appears **exactly once** under **`primitives` / `semantics`**; every **`typeStyle`** preset appears under **`typeStyles`**. Token **`definition`**s, theme **`overrides`** RHSs, and **`typeStyles[*].props`** all use the **same** serialisation: bare **`primitive` / `semantic`** idents become **`primitive:full.name`** / **`semantic:full.name`** strings; literals and composites remain inline **`ValueExpr`** JSON (**§16b**). Each **`themes[skin]`** row is **`{ baseTheme, overrides }`** where **`baseTheme`** is the parent theme name for inheritance or **`null`**, and **`overrides`** maps LHS token name → serialised RHS (same pointer rules). **`primitive:`** / **`semantic:`** strings on **component trees** (§2.3) name tokens the same way. When the CLI passes **`--theme`**, the catalogue and **`resolvedComponent.system`** include a **`theme`** field for **tree** resolution (matches **`buildResolvedTokenMap`**); when omitted, there is no **`theme`** key. **`resolvedComponent.system`** uses the **identical** JSON shapes for **`primitives`**, **`semantics`**, **`themes`**, and **`typeStyles`**, but **trimmed** to the subset needed for the requested component. **`modifiers`** (when used) can still make the resolved **tree** differ from what a pure walk of **`themes`** alone would imply — treat the compiler’s resolved map as authoritative for those builds.

When the reference CLI writes catalogue JSON to disk, **§16a** (compact keys) may **omit** top-level or nested object keys whose values would serialize to empty **`{}`** / **`[]`**. The field tables in §2.1–§2.4 describe the **logical** shape; parsers **SHOULD** apply the defaults in **§16a** before interpreting “missing” keys as errors.

### 2.1 Top-level shape

```json
{
  "kind": "componentCatalogue",
  "schemaVersion": "1.0.0-beta",
  "generatedAt": "2024-01-15T10:30:00Z",
  "primitives": {
    "color.text.primary": {
      "name": "color.text.primary",
      "tokenType": "Color",
      "definition": { "kind": "hex", "value": "#111111" }
    },
    "spacing.md": {
      "name": "spacing.md",
      "tokenType": "Distance",
      "definition": { "kind": "number", "value": 12 }
    },
    "radius.card": {
      "name": "radius.card",
      "tokenType": "Distance",
      "definition": { "kind": "number", "value": 8 }
    }
  },
  "semantics": {
    "color.surface.card": {
      "name": "color.surface.card",
      "tokenType": "Color",
      "definition": "primitive:color.text.primary"
    }
  },
  "themes": {
    "Dark": {
      "baseTheme": null,
      "overrides": {
        "color.surface.card": { "kind": "hex", "value": "#0A0A0A" }
      }
    },
    "Light": {
      "baseTheme": null,
      "overrides": {}
    }
  },
  "typeStyles": {
    "Body": {
      "name": "Body",
      "props": {
        "fontSize": { "kind": "number", "value": 16 },
        "color": "semantic:color.surface.card"
      }
    }
  },
  "variantTypes": {
    "Emphasis": { "name": "Emphasis", "cases": ["primary", "secondary", "destructive"] },
    "IconVariant": { "name": "IconVariant", "cases": ["none", "leading", "trailing"] }
  },
  "components": {}
}
```

| Field | Description |
|-------|-------------|
| `kind` | Always **`"componentCatalogue"`** when this object is the catalogue root (discriminant when multiple JSON artefacts are stored together). |
| `schemaVersion` | Catalogue schema version. Emitters should check this before parsing. |
| `generatedAt` | ISO 8601 timestamp. Useful for cache invalidation. |
| `theme` | **Optional.** Present only when the catalogue was built with CLI **`--theme`**: the **active** theme label for **tree** resolution (same rule as **`buildResolvedTokenMap`** with that theme). Omitted when no theme is selected. Theme skins are the keys of the logical **`themes`** map (**`Object.keys(themes)`**); when the **`themes`** key itself is absent on CLI output (**§16a**), treat it as **`{}`**. |
| `primitives` | Map **primitive token name** → **`{ name, tokenType, definition }`**. **`definition`** is the **authored** RHS once: bare token idents → **`primitive:`** / **`semantic:`** strings; otherwise **`SerialisedValueExpr`** (§16b). |
| `semantics` | Map **semantic token name** → **`{ name, tokenType, definition }`**. Same shape as **`primitives`**. |
| `themes` | Map **theme name** → **`{ baseTheme, overrides }`**. **`baseTheme`**: parent theme name when the PDL declares **`theme Name: ParentName { … }`**, else **`null`**. Each **`overrides`** entry is **LHS token name** → serialised RHS (same pointer rules as **`definition`**). |
| `typeStyles` | Map **preset name** → **`{ name, props }`**. Each **`props`** value uses the same serialisation as token **`definition`**s (pointers for bare **`primitive` / `semantic`** idents). |
| `variantTypes` | Every merged closed-set type from **`variant`** or **`enum`** (§4; same IR): **name-keyed** object; **`cases`** are case ids **without** a leading dot. Variant-typed **`components[].params`** carry **`variantTypeName`** only (§2.2). Empty object when the design defines no such blocks. |
| `components` | Map **component name** → component entry (§2.2). |

**CLI wire note:** On files emitted with **`stableStringify(..., { omitEmpty: true })`** (**§16a**), any row in the table above whose logical value is an **empty map** may appear as a **missing** key at the catalogue root. Treat absent **`primitives`**, **`semantics`**, **`themes`**, **`typeStyles`**, or **`variantTypes`** as **`{}`**.

### 2.2 Component entry

Each component is one object in the `components` array. The **default** presentation is split so emitters see a small root surface plus every **candidate** direct child of Root, then **variant** overlays:

```json
{
  "name": "Button",
  "params": [
    { "name": "label", "type": "String", "default": "Submit" },
    {
      "name": "emphasis",
      "type": "variant",
      "variantTypeName": "Emphasis",
      "default": "primary"
    },
    {
      "name": "iconVariant",
      "type": "variant",
      "variantTypeName": "IconVariant",
      "default": "none"
    },
    { "name": "iconName", "type": "Icon", "default": "star" }
  ],
  "emits": [],
  "usage": "Primary action button. Use one per surface.",
  "root": {
    "kind": "layout",
    "props": {
      "direction": "row",
      "gap": 8,
      "padding": { "top": 12, "right": 16, "bottom": 12, "left": 16 },
      "background": "semantic:color.surface.card",
      "cornerRadius": 8
    }
  },
  "defaultParams": { "label": "Submit", "emphasis": "primary", "iconVariant": "none", "iconName": "star" },
  "childNodes": {
    "Label": {
      "id": "Label",
      "kind": "text",
      "props": {
        "content": "param:label",
        "fontSize": 16,
        "fontWeight": 600,
        "lineHeight": 1.5,
        "color": "#111111"
      },
      "children": []
    }
  },
  "childHierarchy": {
    "Root": ["Label"]
  },
  "variants": []
}
```

| Field | Description |
|-------|-------------|
| `name` | Component name, unique within the catalogue. |
| `params` | All declared parameters. **`type`** is the catalogue discriminator (`"variant"`, `String`, …). For **`type": "variant"`**, **`variantTypeName`** repeats the PDL **`variant`** type name (matches an entry in top-level **`variantTypes`**); allowed case ids appear **only** on that **`variantTypes`** row’s **`cases`** array (no leading dot). |
| `expose` | **Legacy / transitional:** when present in catalogue JSON, implementations **SHOULD** list **all** param names (the language no longer has an `expose` block). Prefer reading `params` directly. |
| `usage` | Human-readable description from `usage` blocks. Empty string if not declared. |
| `root` | **`{ "kind", "props" }`** for the component **root** frame at the **default** resolution (all variant params at defaults). **`kind`** is **`layout`**, **`text`**, **`icon`**, or **`media`**; **`props`** uses the same key/value rules as frame nodes (§2.3). This is **separate** from top-level catalogue fields (there is **no** row-level **`kind`** / **`props`**). |
| `defaultParams` | String catalogue of **every** component parameter’s default binding (stable for emitters that previously read `base.params`). |
| `childNodes` | **Flat registry:** **frame id → shell** for **every** frame id that can appear in this component’s catalogue materialisation (default + variants), **unioned** across `if` / `else` branches. Each value is **`id`**, **`kind`**, **`props`**, optional **`instanceOf`** / **`instanceKwargs`**, and logically **`children`: `[]`** (in-registry children are always empty; on CLI output the **`children`** key may be omitted — **§16a**) — **no** nested wiring; parent/child order is **`childHierarchy`** only. |
| `childHierarchy` | **Child hierarchy** for the **default** resolution: map **parent frame id** → ordered array of **visible** direct **child** frame ids (includes **`"Root"`**). Root’s ordered direct children are **`childHierarchy["Root"]`** only (there is **no** separate top-level **`children`** field). Adjacency only; payloads live in **`childNodes`**. |
| `requiredComponents` | **Optional.** Sorted list of **other** component names transitively referenced by **`letInstance`** or **`children`** instance entries in this component’s body (union across **`if`** branches), excluding **`name`**. Omitted when empty. |
| `variants` | Entries for non-default **variant tuples** (§2.4): property deltas and/or a differing **`childHierarchy`** map; **`structuralChange`** when the hierarchy map is present on the variant. |

### 2.3 Frame nodes and placeholders

Values inside **`root.props`** and inside each **`childNodes[*].props`** entry use the same rules. Most properties are plain JSON values. Two **placeholder** string forms are used so emitters can wire parameters and semantic tokens without re-parsing PDL:

- **`param:paramName`** — `String`, `Icon`, or `MediaSource` parameters that remain open at catalogue time (protected prefix; not a URL scheme).  
- **`primitive:full.token.name`** / **`semantic:full.token.name`** — the property’s RHS was exactly **one identifier** naming a **declared `primitive` or `semantic` token**; the catalogue discriminator is which map the name lives in. Emitters resolve markers by reading **`primitives` / `semantics`** and applying **`themes[skin].overrides`** (and following **`primitive:`** / **`semantic:`** pointers in override RHSs and in token **`definition`**s) instead of using duplicated flat maps. **Note:** v1 reference tooling does **not** emit these markers for composite expressions (e.g. `color @ opacity`, layer arrays). **`typeStyle:PresetName`** on **`text`** frames (string value of the **`typeStyle`** property) references **`typeStyles[PresetName]`** on the **same** JSON document (**full catalogue** or trimmed **`resolvedComponent.system`**) — preset **`props`** use the same pointer rules; expanded font fields are **not** duplicated on the frame unless the PDL sets them explicitly (overrides).

**Frame node fields** in a **full** resolved `CatalFrame` tree (e.g. CLI **`--tree-only`**): **`id`**, **`kind`**, **`props`**, **`children`** (nested frame objects), optional **`instanceOf`** / **`instanceKwargs`**.

**Catalogue `childNodes` registry entries** use the same **`id`**, **`kind`**, **`props`**, and optional **`instanceOf`** / **`instanceKwargs`**, but **in-registry `children` is always logically `[]`** (the key may be absent on CLI output — **§16a**) — use **`childHierarchy`** (and variant **`childHierarchy`** when present) for wiring.

| Field | Description |
|-------|-------------|
| `id` | Frame identifier, unique within the component. |
| `kind` | One of `layout`, `text`, `icon`, `media`. |
| `props` | All resolved properties as plain JSON values. See §5 for property names per kind. Enum values are plain strings without a leading dot (e.g. `"row"` not `".row"`). |
| `children` | In **`--tree-only`** trees: ordered array of **child frame nodes** (full objects). In catalogue **`childNodes`**: always **`[]`**. |
| `instanceOf` | **Optional.** When this node is the root of an inlined **`letInstance`** or **`Other()`** instance child, the **source component** name (`DeepSlot`, …). |
| `instanceKwargs` | **Optional.** Evaluated explicit **`kwargs`** from the callsite (empty object when none). With **`instanceOf`**, present on graph catalogue output when non-empty; when **`{}`**, the key may be omitted on CLI output (**§16a**). |

**`param:name` markers:** When a property value is a free parameter (a `String` or `Icon` param that can't be pre-baked), the catalogue uses a **`param:name`** string. Emitters wire these through to their generated function parameters. Variant params are fully resolved — only open-ended string/icon/media params use this form.

### 2.4 Variant deltas

The **`variants`** array contains one entry per **non-default Cartesian tuple** of **variant-typed** parameters that changes anything relative to the default resolution (property deltas and/or a different **`childHierarchy`** map). Each entry carries a **full** **`params`** snapshot for every variant-typed parameter on the component (stable emitter matching).

```json
"variants": [
  {
    "params": { "emphasis": "secondary", "iconVariant": "none" },
    "affectedFrames": ["Root"],
    "changes": [
      { "frameId": "Root", "prop": "background", "value": "transparent" },
      { "frameId": "Root", "prop": "borderWidth", "value": 1 },
      { "frameId": "Root", "prop": "borderColor", "value": "#111111" }
    ]
  },
  {
    "params": { "emphasis": "destructive", "iconVariant": "none" },
    "affectedFrames": ["Root", "Label"],
    "changes": [
      { "frameId": "Root", "prop": "background", "value": "#FDE8E8" },
      { "frameId": "Label", "prop": "color", "value": "#8B0000" }
    ]
  },
  {
    "params": { "emphasis": "primary", "iconVariant": "leading" },
    "structuralChange": true,
    "affectedFrames": ["Root", "Label", "LeadingIcon"],
    "childHierarchy": {
      "Root": ["LeadingIcon", "Label"]
    },
    "changes": []
  }
]
```

When the **visible** parent→child map for a permutation differs from the default, the variant entry includes the **full** **`childHierarchy`** object (same shape as the component row). Structural wiring uses **only** that map — the reference implementation does **not** emit variant **`patches`** or a parallel **`children`** array.

**`changes`:** property-only deltas, **id-aligned** per **`frameId`** (never produced by positional pairing of unrelated subtrees). Lines that would only repeat values already present on the catalogue **`childNodes`** shell for that **`frameId`** are omitted. A removed property on the variant side is represented with **`value`: `null`**.

**Variant entry fields:**

| Field | Description |
|-------|-------------|
| `params` | **Full** map of **variant-typed** parameter names → case id (no leading dot) for this permutation. |
| `affectedFrames` | Frame ids touched by **`changes`**, or appearing in any **`childHierarchy`** entry whose child list differs from the default map for that parent (including ids listed in those before/after lists). |
| `changes` | Array of `{ frameId, prop, value }` triples for **non-structural** property overrides on **any** frame (including **`childNodes`** ids). Empty when there are no prop diffs after eliding registry-redundant lines. |
| `childHierarchy` | **Optional.** When this permutation’s **full** parent→visible-child id map differs from the default **`childHierarchy`**, the variant entry repeats the same adjacency shape as the component row (map including **`"Root"`**). Omitted when identical to default. |
| `structuralChange` | `true` when **`childHierarchy`** is present on the variant (structural / embedding diff from default). |

**Multi-param variants:** Every combination of variant cases is explored; one catalogue row is emitted per tuple that produces a non-empty **`changes`** list and/or a differing **`childHierarchy`** relative to defaults.

### 2.5 Resolved component JSON (`pdl resolve`, default)

The reference CLI’s **`pdl resolve <entry> <Component> [key=value …]`** (without **`--tree-only`**) emits a single object with **`schemaKind`: `"resolvedComponent"`**. It splits **layout** from **design-system** data:

**Build path (reference):** **`pdl graphComponent`** and default **`pdl resolve`** build a **catalogue row per component** in the transitive **`letInstance`** / instance-**`children`** closure (**`buildCatalogueComponentRow`** for each), plus a **trimmed** **`system`** (they do **not** run **`buildComponentCatalogue`** for the whole design). **`pdl graphSystem`** / **`pdl catalogue`** still emit the **full** multi-component catalogue.

- **`primaryComponent`** — the component **`name`** passed on the CLI (must be a key of **`components`** and match that row’s **`name`** field).
- **`components`** — object keyed by component **`name`**. Includes the **primary** component and **every** transitive dependency from **`requiredComponents`** (same closure as token collection). Each value matches a catalogue **§2.2** row (**`root`**, **`childNodes`**, **`childHierarchy`**, **`variants`**, **`params`**, **`expose`**, **`usage`**, …) but **omits** catalogue-only **`defaultParams`**.
- **`system`** — optional **`theme`** (when **`--theme`** is set), trimmed **`variantTypes`**, **`primitives`**, **`semantics`**, **`themes`**, and **`typeStyles`** (same JSON shapes as the full catalogue, trimmed to the **union** of token / typeStyle usage across **`components`** in this document; no duplicate flat resolved **`tokens`** map on the document). On CLI output (**§16a**), the entire **`system`** object may be **omitted** when it would serialize to only empty maps and no **`theme`**; individual **`system.*`** maps may likewise be omitted when empty.

Optional **`paramOverrides`** mirrors CLI **`key=value`** arguments; it does **not** rewrite **`components[primaryComponent].childHierarchy`** — emitters still apply **§2.4** variant logic to the primary row. Emitters resolve **`primitive:`** / **`semantic:`** strings on **`components[…]`** using **`system.primitives` / `system.semantics`** (**`definition`** only) and strip the **`typeStyle:`** prefix when reading **`system.typeStyles`**. Per-skin values come from composing **`definition`** with **`system.themes[skin].overrides`** (see below).

| Field | Description |
|-------|-------------|
| `schemaKind` | Always **`"resolvedComponent"`**. |
| `schemaVersion` | Same string as the Component Catalogue (**§2.1**). |
| `generatedAt` | ISO 8601 timestamp when the document was built. |
| `entryPath` | Absolute path to the **entry** `.pdl` used for merge / resolution. |
| `primaryComponent` | The CLI-requested component **`name`**; must equal **`components[primaryComponent].name`**. |
| `paramOverrides` | Present when the CLI passes **`key=value`** overrides; maps param names to values. Does not mutate **`components`** rows. |
| **`components`** | Map **component name → catalogue row** (minus **`defaultParams`**): primary plus transitive **`requiredComponents`** closure. |
| **`system`** | Design-system bundle for this resolve (see below). **May be absent** on CLI output when empty — **§16a**. |

**`system` object:**

| Field | Description |
|-------|-------------|
| `theme` | **Optional.** Active theme label for this resolve when the CLI passed **`--theme`** (mirrors catalogue **`theme`**). |
| `variantTypes` | Only **`variant`** type definitions referenced by **`variantTypeName`** on **`params`** of **any** row in **`components`** (primary + dependencies). |
| **`primitives`** | Subset of catalogue **§2.1** primitives whose **`name`** is in the **collected** set: (a) **`primitive:`** / **`semantic:`** markers anywhere under **each** **`components[*]`** catalogue row (**`root.props`**, **`childNodes[*].props`**, **`variants[].changes`**; **`childHierarchy`** values are frame ids only), (b) **`primitive` / `semantic`** idents in referenced **`typeStyle`** **`ValueExpr`** bodies, (c) **transitive** references inside included token **`definition`** graphs, and (d) any token referenced from **`system.themes[].overrides`**. Each entry is **`{ name, tokenType, definition }`** with the same serialisation as the full catalogue (**`primitive:`** / **`semantic:`** strings for bare token refs; otherwise **`SerialisedValueExpr`**, §16b). |
| **`semantics`** | Same rules as **`primitives`**, for **semantic** tokens. |
| **`themes`** | **Trimmed** to themes that **affect this component**: at least one override **LHS** (token name) intersects the same collected name set as **`primitives` / `semantics`**. Same shape as catalogue **`themes`**: **`baseTheme`** (**`null`** or parent theme name) plus **`overrides`** containing **only** keys in that collected set. RHS serialisation matches the full catalogue. |
| **`typeStyles`** | Only **`typeStyle`** declarations referenced from the resolved component row **or** any row in its transitive **`requiredComponents`** closure (same rules as **`primitives`** / **`semantics`** collection). Same shape as catalogue **`typeStyles`**: each **`props`** value uses the same pointer / **`ValueExpr`** rules as token **`definition`**s. |

**`--tree-only`** emits only the bare **`CatalFrame`** root object (legacy).

---

## 3. What emitters do with the catalogue

A typical emitter pass for a Kotlin / Compose target:

1. **Read `primitives` / `semantics` / `themes`** → build a per-theme resolver (walk definitions, then apply **`themes[skin].overrides`**, following **`primitive:`** / **`semantic:`** strings on override RHSs and inside **definitions**). Theme keys are **`Object.keys(themes)`** after normalising absent maps as **`{}`** per **§16a** when parsing CLI JSON.
2. **For each component:**
   - Use **`root.kind`**, **`root.props`**, and **`childHierarchy`** (including **`childHierarchy["Root"]`**) for the default Root shell and visible child order; use **`childNodes[id]`** for each frame’s **props** shell (registry entries have **no in-registry children**; on CLI output the **`children`** key may be **absent** when **`[]`** — treat as empty list, **§16a**).
   - Walk the **`variants`** array → generate branches keyed by the full **`params`** tuple; apply **`changes`** to **`props`** on the indicated **`frameId`** (use **`"Root"`** with **`root`** for root prop deltas, or a **`childNodes`** id). When a variant supplies **`childHierarchy`**, use that map for the permutation’s visible wiring; otherwise reuse the component default **`childHierarchy`**.
   - Wire **`param:name`** strings to function parameters.
   - Replace **`primitive:`** / **`semantic:`** tree strings with values from your resolver for the target skin.
3. **Use `params`** (all of them) for the inbound function signature; use **`emits`** for the outbound intent signature.
4. **Use `usage`** for KDoc / documentation comments when the catalogue carries usage metadata.

The emitter does **not** need to parse PDL, evaluate **`if`** override chains, or re-walk the import graph. It **does** still interpret **`primitive:`** / **`semantic:`** markers using **`primitives` / `semantics` / `themes`** (or the trimmed **`system.*`** mirror on **`resolvedComponent`**).

---

## 4. Generating the catalogue

The PDL toolchain generates the catalogue via:

```bash
npm run catalogue -- design.pdl
npm run catalogue -- design.pdl --theme Dark
```

A **single** catalogue from **`buildComponentCatalogue`** (in-process or written by the CLI) is the **logical** union of all merged **`primitives`**, **`semantics`**, **`themes`**, and **`typeStyles`** rows (canonical definitions + per-theme override maps). On **CLI-written** files, empty top-level maps may be **omitted** — **§16a** — while the in-memory builder still materialises full objects. The **`--theme`** flag selects which theme context is used to resolve **trees** and literals that are not **`primitive:`** / **`semantic:`** markers (mirrors **`buildResolvedTokenMap`**).

If **`--theme`** appears **more than once** on one invocation, the reference CLI **keeps the last** value (there is no multi-file emit in one process). To emit several themed JSON files, run the command **once per theme** (e.g. a shell loop) or use an external wrapper.

---

## 5. Versioning

The `schemaVersion` field follows the same semantic versioning as the rest of PDL (§26). Emitters should check `schemaVersion` on load and refuse or warn if they encounter a version they were not built against. Adding new optional fields to the catalogue is a minor version bump; changing existing field names or removing fields is a major bump.

---

## 16b — Serialised ValueExpr JSON (`SerialisedValueExpr`)

The reference **PDL** toolchain does **not** emit a standalone merged-design JSON document for end users (historical `kind: "designGraph"` / `pdl graph` was removed). **Component Catalogue** (§16 §2 onward) and **`resolvedComponent.system`** (§16 §2.5) embed fragments of the parsed expression tree as follows:

- **Token graph:** **`serialiseValueExprWithTokenRefs`** (`src/graph.ts`) for **`primitives` / `semantics` / `themes` / `typeStyles`** — bare **`primitive` / `semantic`** idents become **`primitive:`** / **`semantic:`** strings; shared row shapes and **`PDL_JSON_SCHEMA_VERSION`** live in **`src/graphJson.ts`**. Unsupported kinds in this path **throw** (fail-fast).
- **Rules:** **`serialiseConditionExpr`** for flattened rule **`when`** values on catalogue rows.
- **Interactions:** handler **`assign`** / **`animate`** values use **`serialiseValueExpr`** (classic AST **`ident`** nodes, not pointer strings), unless that pipeline is extended.

Emitters should treat these objects as **embedded AST slices** inside catalogue / resolve payloads, not as a separate full-design snapshot format.

---

### 1. ConditionExpr

| `kind` | Fields | Meaning |
|--------|--------|---------|
| **`cmp`** | `param`, `op`, `rhs` | **`param`** is the LHS identifier. **`op`**: **`==`** or **`!=`**. **`rhs`**: the **lexeme** of the dot-enum (reference: includes the **`.`** prefix, e.g. **`".warning"`**). **TODO:** Harmonise with catalogue convention (bare `"warning"` strings) where both appear. |
| **`and`** | `items` | Conjunction of nested `ConditionExpr`. |
| **`or`** | `items` | Disjunction of nested `ConditionExpr`. |
| **`not`** | `expr` | Negation of a nested `ConditionExpr`. |

Mixed `&&` / `||` without parentheses is **PDL-E038** (see §21.6 / §24).

---

### 2. Serialised value expressions (`SerialisedValueExpr`)

Literal and composite RHS values from PDL appear as nested JSON objects. Every node has **`kind`**, except where the **token-graph serialiser** replaces a bare token **`ident`** with a **string** (**`primitive:…`** / **`semantic:…`**) as described in §16 §2 and §16b intro above.

| `kind` | Shape | Notes |
|--------|-------|-------|
| **`hex`** | `{ "kind": "hex", "value": "<#RRGGBB…>" }` | Unquoted hex from source. |
| **`string`** | `{ "kind": "string", "value": "…" }` | |
| **`number`** | `{ "kind": "number", "value": <number> }` | |
| **`boolean`** | `{ "kind": "boolean", "value": true \| false }` | |
| **`condition`** | `{ "kind": "condition", "expr": ConditionExpr }` | Variant / boolean conditions in values. |
| **`ident`** | `{ "kind": "ident", "name": "…" }` | In **`serialiseValueExpr`** output: authored identifier. In **token graph** slots (**`serialiseValueExprWithTokenRefs`**), a bare **`primitive` / `semantic`** token name is **not** emitted as **`ident`** — it becomes a **`primitive:`** / **`semantic:`** string instead; other idents remain as **`ident`** objects. |
| **`dotEnum`** | `{ "kind": "dotEnum", "value": ".caseName" }` | Includes leading `.` in reference output. |
| **`opacityOf`** | `{ "kind": "opacityOf", "base": …, "opacity": … }` | Colour `@` opacity / multiplier. |
| **`edgeInsets`** | `{ "kind": "edgeInsets", "variant": "xy" \| "trbl", "fields": { … } }` | Each field maps to nested `SerialisedValueExpr`. |
| **`corner`** | `{ "kind": "corner", "tl", "tr", "br", "bl" }` | Each corner is a `SerialisedValueExpr`. |
| **`array`** | `{ "kind": "array", "items": [ … ] }` | Layer lists, child literal arrays in values, etc. |
| **`transition`** | `{ "kind": "transition", "duration", "easing", "delay"? }` | **TODO:** Confirm where transitions appear in catalogue-only paths. |
| **`vibrancyTuple`** | `{ "kind": "vibrancyTuple", "saturation": number, "brightness": number }` | Inline vibrancy tuple. |
| **`rampInline`** | `{ "kind": "rampInline", "direction": string, "stops": [ … ] }` | **`direction`** stores the parsed enum lexeme. **TODO:** Normalise to bare string vs dot form. |
| **`sizing`** | `{ "kind": "sizing", "mode": "hug" \| "fill" \| "fixed" \| "flex", "fixed"?, "flexArgs"? }` | For `.fixed(n)`, `fixed` is numeric. For `.flex(…)`, `flexArgs` maps argument labels → `SerialisedValueExpr`. **TODO:** Document full flex argument set (`min`, `max`, `preferred`). |
| **`call`** | `{ "kind": "call", "callee": "Color" \| "Ramp" \| "Blur" \| "Media" \| "Vibrancy", "args": { … } }` | Layer constructors and similar keyword calls; **`args`** values are `SerialisedValueExpr`. |
| **`gradientStop`** | `{ "kind": "gradientStop", "fields": { … } }` | **TODO:** List allowed field keys (`position`, `opacity`, `color`, …) normatively. |
| **`unknown`** | `{ "kind": "unknown" }` | **`serialiseValueExpr`** only: fallback when a **`ValueExpr`** kind is not handled (should be rare). **`serialiseValueExprWithTokenRefs`** does **not** emit this — it **throws** on an unhandled kind so catalogue token graphs cannot silently degrade. |

**TODO:** Provide a JSON Schema for `SerialisedValueExpr` / `ConditionExpr` fragments used in catalogue and resolve output.

---

### 3. Minimal fragment (illustrative)

Token definition value inside **`resolvedComponent.system.primitives["color.bg"].definition`** (shape only; paths are illustrative):

```json
{ "kind": "hex", "value": "#FFFFFF" }
```


## 16c — Graph exports (`graphSystem`, `graphComponent`)

The reference CLI emits **two graph-shaped JSON artefacts** (rich, reference-heavy handoffs — not fully denormalised):

| Command | Arguments | JSON output |
|---------|-----------|-------------|
| **`graphSystem`** (`npm run graphSystem -- …` or **`pdl graphSystem`** after build) | `<entry.pdl>` and optional **`--out`** only | **Full Component Catalogue** (§16 §2 onward): **`kind: "componentCatalogue"`** with **`primitives`**, **`semantics`**, **`themes`**, **`typeStyles`**, **`variantTypes`**, components, companions as implemented. **No `--theme`** flag: tree resolution uses the catalogue default (same as **`catalogue`** without **`--theme`**). |
| **`graphComponent`** (`npm run graphComponent -- …` or **`pdl graphComponent`**) | `<entry.pdl>`, `<ComponentName>`, optional **`--theme`**, optional **`--out`**, optional **`param=value`** overrides | **`resolvedComponent`** document (§16 §2.5): **`primaryComponent`**, **`components`** (primary + transitive **`requiredComponents`** rows), and **`system`**. **`system.primitives` / `semantics` / `themes` / `typeStyles`** use the **same JSON shapes** as the full catalogue, trimmed to the **union** of usage across those rows; **`param=value`** pairs are recorded as **`paramOverrides`** (same semantics as legacy **`pdl resolve`** without **`--tree-only`**). The **`system`** key (and sparse component-row keys) follow **§16a** on disk. |

**Normative JSON kinds:** **`componentCatalogue`** (system) and **`resolvedComponent`** (component slice). The **`graph*`** names refer to the **CLI verbs** only.

**Serialization:** **`graphSystem`**, **`catalogue`**, **`graphComponent`**, default **`resolve`**, **`bakeSystem`**, and **`bakeComponent`** stdout / **`--out`** use **`stableStringify(..., { omitEmpty: true })`** — **§16a**. **`resolve --tree-only`** uses the same compaction path for the bare **`CatalFrame`** tree.

---

## 16d — Baked design JSON (`bakeSystem`, `bakeComponent`)

**Bake** is a **one-way** denormalisation: emitters receive **only** materialised component trees and **literal** frame properties. There is **no** **`variantTypes`**, no catalogue **`primitives` / `semantics` / `themes`** graph, no **`primitive:`** / **`semantic:`** markers, and no catalogue **`variants[]`** deltas. Text **`style = TypeStyleName`** is **expanded** into the preset’s typography props (then the **`typeStyle`** name is dropped); explicit frame props **win** over the preset.

| Command | Arguments | JSON output |
|---------|-----------|-------------|
| **`pdl bakeSystem`** | `<entry.pdl>`, optional **`--theme`**, optional **`--out`** | One **`bakedDesign`** document (below) whose **`components`** map contains **every** merged component, each at **default parameter values**, resolved under the chosen theme (or default token map when **`--theme`** is omitted). |
| **`pdl bakeComponent`** | `<entry.pdl>`, `<ComponentName>`, optional **`--theme`**, optional **`--out`**, optional **`param=value`** | Same **`bakedDesign`** shape with **exactly one** entry in **`components`**. **`param=value`** overrides variant and non-variant params (same parsing rules as **`pdl resolve`**). |
| **`pdl bakePack`** (Rust) | `<entry.pdl>`, `<pack.json>`, optional **`--out`** | Same **`bakedDesign`** shape; params/slots from an injection pack (§4c); **`bakeProfile`** = **`injection-pack`**. |

**Serialization:** **`bakeSystem`** and **`bakeComponent`** use the same **`stableStringify(..., { omitEmpty: true })`** rules as graph output — **§16a** (e.g. **`BakedFrame.children`** may be absent when there are no visible children).

**HTML preview (`pdl renderHtml`):** The reference CLI can turn the same in-memory **`bakedDesign`** into a minimal **HTML5** document for Studio iframes and static reference pages (`src/renderHtml.ts`). When present, root **`previewBackground`** (resolved CSS color from bake) sets document chrome via **`--pdl-preview-background`**. The emitter maps **`layout`** (flex including **`.rowReverse` / `.columnReverse`**, **`.stack` / `.reverseStack`** as overlapping CSS grid cells with matching z-order, **`gap` / `columnGap` / `rowGap`**, **`.flex` sizing** with evaluated **`min` / `max` / `preferred`**, **`alignSelf` / `grow` / `shrink` / `position` + `inset`**, **`justify`** including **`.stretch`**, scalar or first-color **`background`**, **`foreground`** as an inset overlay **`box-shadow`**, **`borderWidth`/`borderColor`** with **`borderPosition`** (**outside** → CSS border; **inside** → inset **`box-shadow`**), **`shadow`**, **`overflow`** (**`.visible`** / **`.scroll`** / **`.clip`**; preview maps **`.clip`** → CSS `overflow: hidden` — §6 §Overflow), asymmetric **`Corner`** radii, approximate **Blur** / **Vibrancy** via **`backdrop-filter`**), **`text`** (typography, **`lineHeight`** ratio, **`letterSpacing`** in px from em×`fontSize`, **`justify`** / **`align`** via a flex column shell + **`text-align`**, clamp / ellipsis / opacity / overflow), **`spacer`**, **`icon`** (color swatch + name label — not a real glyph set), and **`media`** ( **`<img>`** when **`source`** looks like a URL/path; **`contentMode`** → **`object-fit`**; **`aspectRatio`** / **`objectPosition`**) to flexbox- and grid-oriented markup. **Ramp**, full **layer** compositing fidelity, stack+**`spaceBetween`**, custom **`@font-face`** loading, and non-raster **media** remain approximated or omitted. Closed-set params from **`variant`** or **`enum`** are keyword-agnostic (bake IR uses **`"type": "variant"`**). The mapping is **best-effort** and versioned with the toolchain, not part of the **`bakedDesign`** schema contract.

### `bakedDesign` — root document

| Field | Type | Meaning |
|-------|------|---------|
| **`schemaKind`** | string | Always **`"bakedDesign"`**. |
| **`schemaVersion`** | string | Semver for this JSON shape (reference: **`"1.0.0-beta"`** alongside catalogue). |
| **`generatedAt`** | string | ISO-8601 UTC timestamp. |
| **`provenance`** | object | **Audit only** — not a theme system for receivers. |
| **`provenance.entryPath`** | string | Entry **`.pdl`** path used for the bake. |
| **`provenance.bakedTheme`** | string \| **`null`** | Theme **name** passed to **`--theme`**, or **`null`** when omitted. |
| **`provenance.bakeProfile`** | string | **`"system-defaults"`** (**`bakeSystem`**), **`"component-explicit"`** (**`bakeComponent`**), or **`"injection-pack"`** (**`bakePack`**, §4c). |
| **`previewBackground`** | string (optional) | Resolved **CSS color** for the entry **`previewBackground`** token after theme apply (e.g. **`#F7F7F7`**). Omitted when the design has no preview background or the token cannot be resolved to a color. HTML hosts apply this to document chrome; it is **not** the token name. |
| **`components`** | object | Map **component name** → **`BakedComponent`**. |

**Normative:** Sibling keys such as **`primitives`**, **`semantics`**, **`themes`**, **`variantTypes`**, **`rules`**, **`fixtures`**, and **`interactions`** **must not** appear on **`bakedDesign`** (unless a future minor version explicitly extends this contract). **`previewBackground`** (resolved CSS color) is the intentional exception for HTML / studio chrome.

### `BakedComponent`

| Field | Type | Meaning |
|-------|------|---------|
| **`name`** | string | Component name (matches the **`components`** map key). |
| **`rootKind`** | string | Root frame kind (**`layout`**, **`text`**, **`icon`**, **`media`**, …). |
| **`bakedParams`** | object | Final param values used for this bake (strings / numbers / booleans). |
| **`root`** | **`BakedFrame`** | Materialised tree. |

### `BakedFrame` (recursive)

| Field | Type | Meaning |
|-------|------|---------|
| **`id`** | string | Frame id (**`Root`**, **`let`** ids, synthetic ids for spacers / instances). |
| **`kind`** | string | **`layout`**, **`text`**, **`icon`**, **`media`**, **`spacer`**, … |
| **`props`** | object | JSON-serialisable literals after evaluation (including typography from expanded **`typeStyle`** presets). **`hidden`** frames are **omitted** from parent **`children`** lists (they do not appear as nodes in **`bake*`** output). |
| **`children`** | **`BakedFrame[]`** | Ordered visible children. **Optional** on CLI output when the list is empty — omit the key or use **`[]`** per **§16a**; parsers **SHOULD** treat a missing **`children`** property as **`[]`**. |

**Reference implementation:** `buildBakedDesignSystem` / `buildBakedDesignComponent` in **`src/bakeDesign.ts`**, CLI in **`src/cli.ts`**.

---


---

## 17 — Emitters, Compiler Targets, and the Design Manifest

Emitters consume the **Component Catalogue** (§16) or **`resolvedComponent`** slices (§16 §2.5) as their **primary** input for expressive view code: **`primitives`**, **`semantics`**, **`themes`**, per-component trees and variant deltas, and **`primitive:`** / **`semantic:`** / **`param:`** / **`typeStyle:`** markers where applicable (§16 §0, §2.2–§2.4). **Fully literal** pipelines may consume **`bakedDesign`** only (§16d).

The **design manifest** (§3 below) is a **separate, lightweight JSON** file: a registry of names and public APIs **without** frame trees or token values. Use it for CI, documentation, and discovery alongside the **Component Catalogue** (§16 §0) for resolved trees and tokens.

---

## 1. Compiler targets (normative list)

| Target | Output | Typical consumer |
|--------|--------|------------------|
| **HTML** | Single-file or fragment markup + CSS | Studio preview, static preview, design QA |
| **Design manifest** | JSON document (§3 — thin registry) | Tooling, CI, registries, docs |
| **AI system prompt** | Derived text from manifest | LLM context (lossy compression; not round-trip) |
| **CSS** | Custom properties, optional utility classes | Web apps |
| **React** | Component stubs, token imports | App codebases |
| **SwiftUI** | `View` structs + modifiers | Apple platforms |
| **Jetpack Compose** | `@Composable` functions + modifiers | Android |
| **Kotlin JVM / multiplatform** | Domain models + view code (hand-written or generated) | Shared logic, non-UI layers consuming manifest |

Each emitter **must** document:

- Which **manifest `schemaVersion`** it supports.  
- Which **layer kinds**, **motion tiers**, and **layout props** it implements vs **degrades**.

---

## 2. Data inputs per emitter

| Input | Use |
|-------|-----|
| **Component Catalogue** (§16) | Primary input for code-generating emitters. Contains **token graph** maps (**`primitives` / `semantics` / `themes` / `typeStyles`** with pointer serialisation), **resolved default and variant frame trees**, and **variant deltas** — not a legacy flat resolved **`tokens`** map. |
| **Design manifest** | For tooling, CI, and metadata consumers that need component API summaries **without** full trees or resolved tokens (§3). |

---

## 3. Design manifest JSON (reference implementation, v1)

The **design manifest** is intentionally **small**: it lists **what exists** in the merged design (paths, theme names, variant and typeStyle names, component headers and params) so tools can introspect a library **without** loading the **Component Catalogue**.

**CLI (reference):** `pdl manifest <entry.pdl> [--out file.json]` (see §9).

### 3.1 Top-level shape

```json
{
  "kind": "designManifest",
  "schemaVersion": "1.0.0-beta",
  "generatedAt": "2024-01-15T10:30:00Z",
  "entryPath": "/abs/path/design.pdl",
  "modulePaths": ["tokens.pdl", "design.pdl"],
  "previewBackground": null,
  "themes": ["Dark", "Light"],
  "variants": ["Emphasis", "Size"],
  "typeStyles": ["Body", "Title"],
  "components": [
    {
      "name": "Button",
      "rootKind": "layout",
      "params": [{ "name": "label", "type": "String" }]
    }
  ]
}
```

### 3.2 Field definitions (v1)

| Field | Type | Description |
|-------|------|-------------|
| `kind` | string | Always **`"designManifest"`**. |
| `schemaVersion` | string | Semver of this manifest object (reference: **`1.0.0-beta`**). |
| `generatedAt` | string | ISO 8601 timestamp. |
| `entryPath` | string | Absolute path to the entry `.pdl` in the reference implementation. **TODO:** normalise for reproducible CI. |
| `modulePaths` | string[] | Merge order list of module paths (same module closure as the merged design). |
| `previewBackground` | string \| null | `previewBackground` token name when set; else **`null`**. |
| `themes` | string[] | Sorted **`theme`** names. |
| `variants` | string[] | Sorted **`variant`** type names. |
| `typeStyles` | string[] | Sorted **`typeStyle`** names. |
| `components` | array | Sorted by **`name`**. Each entry: **`name`**, **`rootKind`**, **`params`** (`{ name, type }[]`), and optionally a transitional **`expose`** array listing **all** param names (legacy field; prefer `params`). **No** `kind` / `props` / `childNodes` / `children` / `variants` / **`tokens`** — use the **Component Catalogue** (§16) for those. |

**Evolution:** add optional fields in **minor** semver; breaking renames in **major**.

### 3.3 Richer manifest (non-normative sketch)

Earlier drafts of this chapter described a **heavier** manifest (resolved **`tokens`**, **`interactions`**, **`fixtures`**, **`rules`**, **`capabilities`**, …). That shape is **not** emitted by the reference v1 `pdl manifest` command. **TODO:** If a “fat manifest” is still desired, specify it as **`schemaVersion` 2.x** or a separate **`kind`** so it does not collide with the thin registry.

---

## 4. AI-oriented projection

The **AI system prompt** slice is **not** a second source of truth. A practical pipeline:

1. Emit the **thin design manifest** (§3) for **names** and param types (and **`emits`** when present).  
2. Pull **`usage`**, **`fixtures`**, **`rules`**, and **`interactions`** from the **Component Catalogue** JSON when you need prose or constraints beyond the manifest (they are emitted on **`components[name]`** rows today).  
3. Run a **template** (or summarization) over that material.

Goal: **minimize tokens** while preserving **API surface**; heavier constraints remain in the **catalogue** or PDL until a future **fat manifest** (§3.3) is specified.

---

## 5. CLI expectations (reference)

Same verbs as **`src/cli.ts`** after **`npm run build`** (or use **`npm run graph*`** / **`catalogue`** / **`manifest`**, which compile first). Examples:

| Command | Output |
|---------|--------|
| `catalogue -- <entry.pdl>` | **Component Catalogue JSON** to stdout (§16). |
| `catalogue -- <entry.pdl> --theme Dark` | Catalogue with trees resolved under the Dark theme. |
| `manifest -- <entry.pdl>` | **Design manifest JSON** — compact component API summary. |
| `graphSystem -- <entry.pdl>` | Full catalogue; no **`--theme`**. |
| `graphComponent -- <entry.pdl> <Component>` | **`resolvedComponent`** slice (§16c). |
| `renderHtml -- <entry.pdl> <Component>` | **HTML5** preview for one baked component (§16d + HTML emitter); optional **`--theme`**, **`--out`**, **`param=value`**. |
| `renderHtml -- <entry.pdl> --system` | Same for **every** merged component (gallery). |
| `renderCatalogueHtml -- <entry.pdl>` | **HTML5** catalogue page (tokens + baked previews). |

There is **no** separate shorthand named `html`; use **`renderHtml`**, **`renderHtmlFromBake`**, or **`renderCatalogueHtml`** (see **Repository tools** in [§9](#9-tooling-cli-and-limits)). **`npm run preview`** is the disk-watch live harness; **`npm run playground`** serves the optional browser editor (**`playground/`**).

---

## 6. Protected core boundary

**Inside core:** grammar, AST, import merge, type validation, token resolution, override resolution, variant delta computation, **Component Catalogue** serialisation, **design manifest** serialisation, `applyInteractionEvent` parameter simulation.

**Outside core (emitters):** reading the catalogue and generating target code (HTML/CSS/React/SwiftUI/Compose/etc.), asset path rewriting, capability degradation.

---

## 7. See also

- §16  
- §12  
- §18
---

## 18 — Regeneration Checklist

This checklist orders work so a **greenfield implementation** (or a full port to another language) can be validated **chapter by chapter**. Each step has **acceptance**: inputs / outputs you can test without UI.

---

## Phase A — Surface syntax

1. **Lexer** — comments `//`, strings, numbers, identifiers, punctuation (per §1, §11).  
2. **Top-level declarations** — `import`, `previewBackground`, `primitive`, `semantic`, `theme`, `typeStyle`, `variant` / **`enum`** (same closed-set construct), `component`, `interaction`, **`emits`**, **`fixtures`**, **`usage`**, **`rules`**, **`extend`** (§2, §4, §11).  
3. **Component grammar** — header params, root kind block, `let`, `children`, `if` chains (§4, §5, §7).

**Acceptance:** parse golden `.pdl` files to AST without loss; unknown top-level → error.

---

## Phase B — Semantic model

4. **Maps** — tokens, themes, variants, typeStyles, components, interactions, emits; companion maps for **fixtures**, **usage**, **rules**, **extend merge** (§16, §11).  
5. **Value expressions** — literal / token ref / param ref; literals include sizing, insets, corners, **layer arrays**, **motion tuples** (§6, §15).  
6. **Children** — frame id string, component instance, **`.spacer`** (§5).  
7. **Conditions** — variant compare, `and`, `or` (§7).

**Acceptance:** in-memory design definition can be serialised to the Component Catalogue without data loss.

---

## Phase C — Import merge

8. **DFS imports** — cycle detection, relative resolution (§2).  
9. **Merge policy** — later wins for same symbol; **`extend`** applied after base component; **`fixtures`** merge by example label; **`usage.description`** `+=` append (§12).

**Acceptance:** determinism tests — same file order → same merged AST.

---

## Phase D — Token system

10. **All token types** — validate RHS by type (§3, §15 §7).  
11. **Theme resolution** — primary `theme` + **`modifiers`** order, per-theme **overrides**, **composite token** replacement (§3, §16).  
12. **Token resolution** — produce a flat map of resolved token values for a given theme context.

**Acceptance:** theme matrix parity tests (token X under theme Y).

---

## Phase E — Frame validation

13. **Frame property registry** — per-kind allowed props and enum values (§5).  
14. **Layout extensions** — `wrap`, `justify`/`align` extended enums, `columnGap`, `direction = .stack` / `.reverseStack`, flex child props, `position`, `inset` (§5).

**Acceptance:** reject invalid prop on kind with stable error codes.

---

## Phase F — Resolution

15. **Parameter binding** — defaults + call-site overrides.  
16. **Override chains** — first matching branch, frame targeting, **children replacement** in overrides (§7, §16).  
17. **Value resolution** — tokens, params, literals; **layer list** resolution (§6, §15).  
18. **Embedded instances** — recursive resolution of nested component instances.  
19. **`.spacer`** — resolved to a flex-grow marker in the catalogue tree.

**Acceptance:** generated catalogue matches expected golden JSON per fixture.

---

## Phase G — Rules

20. **Parse `rules` blocks** — tags, `Rule`, nested `if` (§13).  
21. **Static tier evaluator** — tree queries without geometry (§13 §4).

**Acceptance:** rule violations return structured diagnostics (path, rule id, message).

---

## Phase H — Interactions

22. **Event dispatch** — full event set including **`appear`**, **`dismiss`** (§8, §14).  
23. **`applyInteractionEvent`** — param mutation; **`animate`**, **`from`/`to`**, **`stagger`** metadata on defs (§14).

**Acceptance:** state machine tests — event sequence → final params.

---

## Phase I — Catalogue generation

24. **Catalogue generation** — component entries with **`root`**, flat-registry **`childNodes`**, **`childHierarchy`** (including **`Root`**’s direct children), **`variants`**, and **`param:`** / **`primitive:`** / **`semantic:`** / **`typeStyle:`** markers per §16.

---

## Phase J — Emitters

25. **HTML** — resolved tree → DOM/CSS; degradation table for unsupported layers (§17).  
26. **Design manifest** — §17 §3 JSON.  
27. **CSS / React / SwiftUI / Compose** — separate packages consuming the Component Catalogue (§16).

**Acceptance:** contract tests on **`schemaVersion`**.

---

## Phase K — Tooling

28. **Studio** — in-memory multi-file, worker compile, preview (§9).  
29. **Regression suite** — parse/resolve/emit for every `test-fixtures/pdl/*.pdl` (§9).

---

## Traceability matrix

| Doc chapter | Primary code artifact |
|-------------|------------------------|
| 02 | Loader / merger |
| 03–04, 06 | Parser + type checker |
| 05 | Frame validator |
| 07–08, 12–15 | Resolver + interaction runtime |
| 13 | Rules engine |
| 15 | Layer resolver |
| 16, 17 | Catalogue generator + manifest emitter |
| 09 | CLI + studio |

When documentation changes, update this matrix if artifact names shift.

---

## Post-check

Review **§19** for optional ecosystem follow-ups (machine grammar, diagnostic codes, …) that sit outside normative **v1** language text.
---

## 19 — Open Spec Items

This chapter lists **optional** follow-ups that are not required for conformance (§25). They are documentation or ecosystem conveniences.

---

## 1. Optional artifacts

| Topic | Notes |
|--------|--------|
| **Formal EBNF / PEG grammar** | The grammar is defined in §21; a standalone `grammar.ebnf` file may be added as a convenience for parser-generator tooling. |
| **Stable diagnostic codes** | Errors are described in prose (§24); keep codes aligned as compilers catch up (E028/E029, retired E015/W008). |
| **JSON Schema files** | The Component Catalogue and Design Manifest shapes are defined in prose (§16, §17); **JSON Schema** files may be added as a machine-readable mirror for validators and editors. |
| **Compiler lag (locked 2026-08-06)** | Spec removed `expose`, added inline `} emits { }`, `self.param`, Pattern A, `on` enclosure errors. Track **B4b** / **B5** in `docs/IMPLEMENTATION_PLAN.md` until Rust/TS match. |

---

## 2. Platform-dependent behavior

Emitters **must** document approximation for:

- **`Blur`** / **`Vibrancy`** layer constructors vs **`Blur`** / **`Vibrancy`** token types on Web vs native.  
- **`Easing`** string → SwiftUI / Compose mapping.  
- **`direction = .stack` / `.reverseStack`** z-order vs CSS stacking contexts.  

---

## See also

- §18  
- the Table of Contents

---

## 20 — Lexical Specification

This section defines the character-level rules that a compliant PDL lexer **MUST** implement. All other syntax is built on these terminals.

---

### 20.1 Source encoding

PDL source files **MUST** be encoded as **UTF-8**. A BOM (U+FEFF) at the start of a file **MUST** be silently consumed and not treated as part of any token.

---

### 20.2 Whitespace

The following characters are **whitespace** and are ignored except where they delimit tokens:

- Space (U+0020)
- Horizontal tab (U+0009)
- Carriage return (U+000D)
- Line feed (U+000A)

Newlines (CR, LF, or CR+LF) are normalized to a single LF for error-reporting purposes but are otherwise insignificant outside string literals.

---

### 20.3 Comments

PDL supports **line comments** and **block comments**. Both are treated as whitespace (they do not produce tokens).

| Form | Rules |
|------|--------|
| Line | Begins with `//` and extends to the end of the current line (up to but not including the newline). |
| Block | Begins with `/*` and extends through the first closing `*/`. May span lines. **Non-nesting** — an inner `/*` does not open a nested comment. An unclosed `/*` is **PDL-E001**. |

```pdl
// This is a comment
primitive color.brand: Color = #002FFF  // inline comment

/*
  ForEach(chips) { chip in
    chip.title = "A"
    chip.selected = self.currentFilter == filter
  }
  */
```

---

### 20.4 Identifiers

An **identifier** is a sequence of one or more of the following characters:

- ASCII letters: `A`–`Z`, `a`–`z`
- ASCII digits: `0`–`9` (not as the first character)
- Underscore: `_`
- Full stop / dot: `.` (used as a namespace separator; see §22)

**First character** must be a letter (`A`–`Z` or `a`–`z`) or underscore (`_`).

A dot (`.`) within an identifier acts as a namespace separator and is part of the identifier token — it is **not** a separate punctuation token in this context. For example, `color.surface.primary` is a single identifier token.

A **leading dot** (`.`) followed by an identifier, e.g. `.row`, `.primary`, is a **dot-enum literal** — a distinct token type representing a variant case or built-in enum value. The dot is part of this token.

**Optional qualified form:** for built-in **frame enums** (and **`Sizing`**), authors **MAY** write **`TypeName.case`** instead of **`.case`**. Both forms are equivalent after parse (same AST / evaluation). Examples: `justify = Justify.center`, `direction = Direction.row`, `width = Sizing.fill`. The type name is the PascalCase name from the frame-prop SoT (`shared/frame-props.json` `typeName`); case names remain case-sensitive. User **`variant`** cases still use leading-dot only in v1 (`param == .primary`).

**Reserved words** (may not be used as user-defined identifiers):

```
primitive  semantic  theme  typeStyle  variant  enum  component
protocol  requires  host  emits  emit  interaction  fixtures  usage  rules  extend
import  previewBackground  let  if  else  on  for  in  ForEach
before  between  after
true  false  self
```

`enum` is a reserved word and a **surface alias** of `variant` (§4). API protocols declare **`protocol P: component`**; **`host`** marks host-role protocols (§4a). `before` / `between` / `after` are reserved for **B6** list chrome inside `ForEach` (§4e). **`in`** introduces the required `ForEach` item binder. Layout emit capture is handler assignment (`chip.select(…) = { … }` / `Field.change(…) = { … }`); list-param `chips.select` is **PDL-E036**. Keyword `on` is **not** used for declared emits. **`expose` is not a keyword** (removed). **`self`** in layout/interaction means the enclosing component instance (§22.2); in `rules` queries it is the rules evaluation root (§12).

---

### 20.5 String literals

A **string literal** is delimited by double-quote characters (`"`). The following escape sequences are supported:

| Escape | Meaning |
|--------|---------|
| `\"` | Double quote |
| `\\` | Backslash |
| `\n` | Line feed (U+000A) |
| `\r` | Carriage return (U+000D) |
| `\t` | Horizontal tab (U+0009) |
| `\uXXXX` | Unicode code point (exactly 4 hex digits) |

Any other character preceded by `\` is a **parse error**. Newlines inside string literals are **not** permitted unless escaped as `\n`. The empty string `""` is valid.

---

### 20.6 Number literals

A **number literal** is either an integer or a decimal:

```
integer   ::= ['-'] digit+
decimal   ::= ['-'] digit+ '.' digit+
```

Where `digit` is `0`–`9`. Scientific notation (`1e5`) is **not** supported in v1. Leading zeros are permitted only for the value `0` itself (i.e. `007` is invalid). Negative numbers use a leading `-` with no space between the sign and the digits.

---

### 20.7 Hex color literals

A **hex color literal** begins with `#` and is followed by exactly 3, 6, or 8 hexadecimal digits (case-insensitive):

```
hex-color ::= '#' ( hex{3} | hex{6} | hex{8} )
hex       ::= [0-9A-Fa-f]
```

| Form | Meaning |
|------|---------|
| `#RGB` | 3-digit shorthand; each digit is doubled (e.g. `#F0A` → `#FF00AA`) |
| `#RRGGBB` | 6-digit RGB |
| `#RRGGBBAA` | 8-digit RGBA; last two digits are alpha (FF = fully opaque) |

Hex color literals **MUST NOT** be wrapped in double quotes. A quoted string that looks like a hex color (e.g. `"#FF0000"`) is a **parse error** at the point of use where a color value is expected.

---

### 20.8 Punctuation tokens

| Token | Characters |
|-------|-----------|
| `{` `}` | Brace open / close |
| `(` `)` | Paren open / close |
| `[` `]` | Bracket open / close |
| `=` | Assignment / equals |
| `==` | Equality comparison (in conditions) |
| `!=` | Inequality comparison |
| `:` | Type annotation separator |
| `,` | Argument / element separator |
| `+=` | Append-assign (usage blocks) |
| `&&` | Logical AND (conditions) |
| `\|\|` | Logical OR (conditions) |
| `>` `>=` `<` `<=` | Numeric comparisons (rules queries); bare **`<` `>`** also delimit protocol conformance on `component C <P>` (§4a) |
| `@` | Inline opacity operator |

The lexer **MUST** distinguish `=` from `==` and `+=` by maximal-munch.

---

## 21 — Formal Grammar (EBNF)

This section defines the complete surface syntax of PDL using Extended Backus-Naur Form (EBNF). The following conventions apply:

- `' '` — literal string
- `[ ]` — zero or one occurrence (optional)
- `{ }` — zero or more occurrences
- `( )` — grouping
- `|` — alternation
- `;` — end of production rule
- Terminal tokens defined in §20 are written in UPPERCASE (`IDENT`, `STRING`, `NUMBER`, `HEX_COLOR`, `DOT_ENUM`)

---

### 21.1 Top-level

```ebnf
module
  ::= { top-level-decl } ;

top-level-decl
  ::= import-decl
    | preview-background-decl
    | primitive-decl
    | semantic-decl
    | theme-decl
    | type-style-decl
    | variant-decl
    | protocol-decl
    | component-decl
    | emits-decl
    | interaction-decl
    | fixtures-decl
    | usage-decl
    | rules-decl
    | extend-decl
    ;

import-decl
  ::= 'import' STRING ;

preview-background-decl
  ::= 'previewBackground' IDENT ;
```

---

### 21.2 Tokens

```ebnf
primitive-decl
  ::= 'primitive' IDENT ':' token-type-name '=' value-expr ;

semantic-decl
  ::= 'semantic' IDENT ':' token-type-name '=' value-expr ;

token-type-name
  ::= 'Color' | 'Opacity' | 'Distance' | 'Radius' | 'Shadow'
    | 'Icon' | 'MediaSource' | 'Ratio' | 'FontFamily' | 'Size'
    | 'Weight' | 'LineHeight' | 'LetterSpacing' | 'Sizing' | 'Duration'
    | 'Easing' | 'Transition'
    | 'Blur' | 'Vibrancy' | 'Ramp' | 'Background' | 'Foreground'
    ;
```

---

### 21.3 Themes and type styles

```ebnf
theme-decl
  ::= 'theme' IDENT [ ':' IDENT ] '{' { theme-override } '}' ;

theme-override
  ::= IDENT '=' value-expr ;

type-style-decl
  ::= 'typeStyle' IDENT '{' { type-style-prop } '}' ;

type-style-prop
  ::= IDENT '=' value-expr ;
```

---

### 21.4 Variants

```ebnf
variant-decl
  ::= ( 'variant' | 'enum' ) IDENT '{' { 'case' IDENT } '}' ;
```

---

### 21.5 Components, protocols, emits, ForEach

```ebnf
protocol-decl
  ::= 'protocol' IDENT ':' 'component' '{' { protocol-body-item } '}'   (* API *)
    | 'protocol' IDENT '{' { protocol-body-item } '}' ;                 (* host — body MUST include `host` *)

protocol-body-item
  ::= 'host'
    | 'requires' IDENT
    | protocol-param
    | protocol-emits-block
    ;

protocol-param
  ::= IDENT '=' default-value
    | IDENT ':' type-name '=' default-value
    ;

protocol-emits-block
  ::= 'emits' '{' { emit-sig } '}' ;

emit-sig
  ::= IDENT [ '(' [ emit-arg { ',' emit-arg } [ ',' ] ] ')' ]
    ;

emit-arg
  ::= IDENT ':' type-name
    ;

emits-decl
  ::= 'emits' IDENT '{' { emit-sig } '}' ;

component-decl
  ::= 'component' IDENT [ '<' IDENT '>' ] '(' [ param-list ] ')' frame-kind
      '{' { component-body-item } '}'
      [ 'emits' '{' { emit-sig } '}' ]
      [ 'interaction' '{' { on-handler } '}' ]
    ;

frame-kind
  ::= 'layout' | 'text' | 'icon' | 'media' ;

param-list
  ::= param-decl { ',' param-decl } [ ',' ] ;

param-decl
  ::= IDENT ':' type-name '=' default-value ;

type-name
  ::= IDENT
    | '[' IDENT ']'
    ;

default-value
  ::= STRING | NUMBER | DOT_ENUM | HEX_COLOR
    | component-instance
    | '[' [ default-value { ',' default-value } [ ',' ] ] ']'
    ;

component-body-item
  ::= prop-assignment
    | let-decl
    | deferred-children-assignment
    | children-assignment
    | foreach-stmt
    | emit-capture-handler
    | if-chain
    ;

prop-assignment
  ::= IDENT '=' value-expr ;

deferred-children-assignment
  ::= IDENT '.' 'children' '=' children-list ;

let-decl
  ::= 'let' IDENT ':' frame-kind '=' '{' { frame-body-item } '}'
    | 'let' IDENT '=' component-instance
    ;

frame-body-item
  ::= prop-assignment
    | let-decl
    | children-assignment
    | foreach-stmt
    | emit-capture-handler
    | if-chain
    ;

foreach-stmt
  ::= 'ForEach' '(' IDENT ')' '{' IDENT 'in' { foreach-body-item } '}' ;

foreach-body-item
  ::= item-override
    | emit-capture-handler
    | foreach-chrome   (* B6 — deferred *)
    ;

item-override
  ::= IDENT '.' IDENT '=' value-expr ;   (* binder.prop — param or root frame prop *)


(* B6 deferred — compilers MAY reject until B6 ships *)
foreach-chrome
  ::= 'before' '{' { component-body-item } '}'
    | 'between' '{' { component-body-item } '}'
    | 'after' '{' { component-body-item } '}'
    ;

(* Declared emit capture — handler assignment; not keyword `on` *)
emit-capture-handler
  ::= emit-channel [ '(' [ emit-arg { ',' emit-arg } [ ',' ] ] ')' ] '=' '{' { handler-statement } '}' ;
    (* payload list reuses emit-arg — same shape as emit-sig; names are handler locals *)

emit-channel
  ::= IDENT
    | IDENT '.' IDENT
    ;

if-chain
  ::= 'if' condition '{' { if-body-item } '}'
    { 'else' 'if' condition '{' { if-body-item } '}' }
    [ 'else' '{' { if-body-item } '}' ]
    ;

if-body-item
  ::= prop-assignment
    | frame-prop-assignment
    | children-assignment
    | if-chain
    ;

frame-prop-assignment
  ::= IDENT '.' IDENT '=' value-expr ;

children-assignment
  ::= 'children' '=' children-rhs
    | IDENT '.' 'children' '=' children-rhs
    ;

children-rhs
  ::= children-list
    | IDENT   (* sugar: `children = chips` ≡ `children = [chips]` *)
    ;

children-list
  ::= '[' [ child-entry { ',' child-entry } [ ',' ] ] ']' ;

child-entry
  ::= IDENT
    | '.spacer'
    | component-instance
    ;

component-instance
  ::= IDENT '(' [ kwarg-list ] ')' ;

kwarg-list
  ::= kwarg { ',' kwarg } [ ',' ] ;

kwarg
  ::= IDENT ':' value-expr ;
```

> **Note:** `ForEach` / emit-capture-handler (with optional typed payload list) are **normative grammar** (§4e). Rust implements them; other compilers **MAY** lag with a clear diagnostic. `foreach-chrome` is **B6**.

---

### 21.6 Conditions

```ebnf
condition
  ::= condition-atom { '&&' condition-atom }
    | condition-atom { '||' condition-atom }
    ;

condition-atom
  ::= IDENT '==' DOT_ENUM
    | IDENT '!=' DOT_ENUM
    | IDENT '==' IDENT          (* e.g. selected == filter — same variant type *)
    | IDENT '!=' IDENT
    | 'self' '.' IDENT '==' DOT_ENUM
    | 'self' '.' IDENT '!=' DOT_ENUM
    | 'self' '.' IDENT '==' IDENT
    | 'self' '.' IDENT '!=' IDENT
    | '(' condition ')'
    ;
```

> **Note:** `&&` and `||` **MUST NOT** be mixed in a single condition expression without explicit parentheses. The parser **MUST** reject `a && b || c` as ambiguous; authors must write `(a && b) || c` or `a && (b || c)`. Param==param comparisons require compatible types (§23).

---

### 21.7 Interactions

```ebnf
interaction-decl
  ::= 'interaction' IDENT 'for' IDENT '{' { on-handler } '}' ;

on-handler
  ::= 'on' event-name '{' { handler-statement } '}' ;

event-name
  ::= 'hoverStart' | 'hoverEnd' | 'pressStart' | 'pressEnd'
    | 'pressCancel' | 'focusStart' | 'focusEnd' | 'activate'
    | 'appear' | 'dismiss'
    ;

handler-statement
  ::= param-assignment
    | emit-statement
    | animate-statement
    | from-block
    | to-block
    | stagger-statement
    | if-chain
    ;

emit-statement
  ::= 'emit' IDENT [ '(' [ value-expr { ',' value-expr } [ ',' ] ] ')' ]
    ;

param-assignment
  ::= IDENT '=' value-expr
    | 'self' '.' IDENT '=' value-expr
    ;

animate-statement
  ::= 'animate' '=' value-expr ;

from-block
  ::= 'from' '{' { animatable-prop-assignment } '}' ;

to-block
  ::= 'to' '{' { animatable-prop-assignment } '}' ;

animatable-prop-assignment
  ::= IDENT '=' value-expr ;

stagger-statement
  ::= 'stagger' '=' NUMBER
    | 'staggerFrom' '=' ( '.first' | '.last' )
    ;
```

---

### 21.8 Companion blocks

```ebnf

fixtures-decl
  ::= 'fixtures' IDENT '{' { example-decl } '}' ;

example-decl
  ::= 'example' STRING '{' { fixture-prop } '}' ;

fixture-prop
  ::= IDENT '=' value-expr ;

usage-decl
  ::= 'usage' IDENT '{' { usage-prop } '}' ;

usage-prop
  ::= IDENT '=' STRING
    | IDENT '+=' STRING
    ;

rules-decl
  ::= 'rules' IDENT '{' { rules-statement } '}' ;

rules-statement
  ::= tags-set
    | tags-add
    | rule-line
    | if-chain
    ;

tags-set
  ::= 'tags' '=' '[' [ STRING { ',' STRING } [ ',' ] ] ']' ;

tags-add
  ::= 'tags' '.' 'add' '(' STRING ')' ;

rule-line
  ::= 'Rule' '(' rule-strength ',' rule-query [ ',' 'description' ':' STRING ] ')' ;

rule-strength
  ::= '.must' | '.mustNot' | '.should' | '.shouldNot' ;

rule-query
  ::= rule-navigator { '.' rule-step } ;

rule-navigator
  ::= 'self' | 'parent' | 'ancestors' | 'descendants' | 'siblings' | 'children' ;

rule-step
  ::= 'where' '(' 'tag' ':' STRING ')'
    | 'exists'
    | 'count'
    | 'first'
    | 'last'
    | 'between' '(' NUMBER ',' NUMBER ')'
    | 'precedes' '(' 'self' ')'
    | 'follows' '(' 'self' ')'
    | 'adjacentTo' '(' 'self' ')'
    | '>' NUMBER
    | '>=' NUMBER
    | '<' NUMBER
    | '<=' NUMBER
    | '==' NUMBER
    | '!=' NUMBER
    ;

extend-decl
  ::= 'extend' IDENT '{' { extend-section } '}' ;

extend-section
  ::= 'fixtures' '{' { example-decl } '}'
    | 'usage' '{' { usage-prop } '}'
    | 'rules' '{' { rules-statement } '}'
    ;
```

---

### 21.9 Value expressions

```ebnf
value-expr
  ::= HEX_COLOR
    | STRING
    | NUMBER
    | ratio-literal
    | 'true'
    | 'false'
    | DOT_ENUM
    | qualified-enum-literal
    | 'self'                      (* enclosing component instance *)
    | 'self' '.' IDENT            (* enclosing component param *)
    | IDENT
    | sizing-literal
    | edge-insets-literal
    | corner-literal
    | shadow-literal
    | transition-literal
    | vibrancy-literal
    | ramp-literal
    | layer-list
    | color-with-opacity
    | layer-constructor
    ;

(* Aspect-ratio sugar for Ratio tokens / aspectRatio — evaluates to W/H. Height MUST be > 0. *)
ratio-literal
  ::= NUMBER ':' NUMBER
    ;

(* Optional TypeName.case → same as DOT_ENUM `.case`. TypeName from frame-props SoT
   (Direction, Wrap, Align, Justify, Overflow, BorderPosition, TruncateStyle,
   ContentMode, ObjectPosition, AlignSelf, Position). Not used for user variants. *)
qualified-enum-literal
  ::= IDENT '.' IDENT
    ;

sizing-literal
  ::= '.hug'
    | '.fill'
    | '.fixed' '(' NUMBER ')'
    | '.flex' '(' [ flex-arg { ',' flex-arg } ] ')'
    | 'Sizing' '.' 'hug'
    | 'Sizing' '.' 'fill'
    | 'Sizing' '.' 'fixed' '(' NUMBER ')'
    | 'Sizing' '.' 'flex' '(' [ flex-arg { ',' flex-arg } ] ')'
    ;

flex-arg
  ::= ( 'min' | 'max' | 'preferred' ) ':' ( NUMBER | IDENT ) ;

edge-insets-literal
  ::= 'EdgeInsets' '(' edge-insets-args ')' ;

edge-insets-args
  ::= 'x' ':' number-or-token ',' 'y' ':' number-or-token
    | 'top' ':' number-or-token ',' 'right' ':' number-or-token
      ',' 'bottom' ':' number-or-token ',' 'left' ':' number-or-token
    ;

corner-literal
  ::= 'Corner' '(' 'tl' ':' number-or-token ',' 'tr' ':' number-or-token
      ',' 'br' ':' number-or-token ',' 'bl' ':' number-or-token ')' ;

shadow-literal
  ::= 'Shadow' '(' shadow-arg { ',' shadow-arg } [ ',' ] ')' ;

shadow-arg
  ::= 'x' ':' number-or-token
    | 'y' ':' number-or-token
    | 'blurRadius' ':' number-or-token
    | 'spread' ':' number-or-token
    | 'color' ':' color-value
    ;

color-value
  ::= HEX_COLOR | IDENT | color-with-opacity ;

number-or-token
  ::= NUMBER | IDENT ;

transition-literal
  ::= '(' 'duration' ':' value-expr ',' 'easing' ':' value-expr
      [ ',' 'delay' ':' value-expr ] ')' ;

vibrancy-literal
  ::= '(' 'saturation' ':' NUMBER ',' 'brightness' ':' NUMBER ')' ;

ramp-literal
  ::= '(' 'direction' ':' DOT_ENUM ',' 'stops' ':' '[' gradient-stop-list ']' ')' ;

gradient-stop-list
  ::= gradient-stop { ',' gradient-stop } [ ',' ] ;

gradient-stop
  ::= 'GradientStop' '(' gradient-stop-args ')' ;

gradient-stop-args
  ::= gradient-stop-arg { ',' gradient-stop-arg } ;

gradient-stop-arg
  ::= 'position' ':' NUMBER
    | 'opacity' ':' ( NUMBER | IDENT )
    | 'color' ':' ( HEX_COLOR | IDENT )
    ;

layer-list
  ::= '[' [ layer-entry { ',' layer-entry } [ ',' ] ] ']' ;

layer-entry
  ::= layer-constructor
    | color-with-opacity
    | IDENT
    | HEX_COLOR
    ;

layer-constructor
  ::= 'Color' '(' 'color' ':' ( HEX_COLOR | IDENT ) ')'
    | 'Ramp' '(' 'direction' ':' DOT_ENUM ',' 'stops' ':' '[' gradient-stop-list ']' ')'
    | 'Blur' '(' 'blur' ':' IDENT [ ',' 'vibrancy' ':' IDENT ] ')'
    | 'Media' '(' media-constructor-args ')'
    | 'Vibrancy' '(' 'vibrancy' ':' IDENT ')'
    ;

media-constructor-args
  ::= media-constructor-arg { ',' media-constructor-arg } ;

media-constructor-arg
  ::= 'source' ':' ( STRING | IDENT )
    | 'contentMode' ':' DOT_ENUM
    | 'opacity' ':' ( NUMBER | IDENT )
    ;

color-with-opacity
  ::= ( HEX_COLOR | IDENT ) '@' ( NUMBER | IDENT ) ;
```

---

## 22 — Namespace and Scoping Rules

### 22.1 Global namespaces

The compiled design has the following **distinct namespaces**. Names within each namespace must be unique after merge; collisions across namespaces are permitted.

| Namespace | Contains | Key type |
|-----------|----------|----------|
| **Tokens** | `primitive` and `semantic` token names | dotted IDENT |
| **Themes** | `theme` block names | bare IDENT |
| **Type styles** | `typeStyle` names | bare IDENT |
| **Variants** | `variant` type names | bare IDENT |
| **Components** | `component` names | bare IDENT |
| **Interactions** | `interaction` names (scoped to component) | IDENT + component name pair |

A component named `Button` and a variant named `Button` **MAY** coexist — they live in separate namespaces. A component named `Button` and a second `component Button` in the same merged definition is a **PDL-E003** error (duplicate component name).

---

### 22.2 Within-component scoping

Inside a `component` body (and its `interaction` / layout emit-capture handlers), the following names are in scope:

1. **Component parameters** — declared in the parameter list; accessible as bare identifiers in value positions.
2. **`self` / `self.param`** — **`self`** is the **enclosing component instance**. Bare `self` is a value (e.g. emit payload). **`self.param`** always names a parameter of that component (escape hatch when a nested scope shadows the bare name — especially inside `ForEach`). Optional on assignment LHS (`self.x =` ≡ `x =`).
3. **Let-frame ids** — declared by `let FrameId: kind = { … }` or `let Name = ComponentInstance(…)`. Accessible as children references and as targets in `FrameId.prop` override assignments. **`self` is not a frame id.**
4. **Global token names** — any token from the merged definition.
5. **Global component names** — for use in `children` component instances.
6. **Global variant case names** — used with the leading dot in conditions.
7. **Handler locals** — layout `select(name: Type) = { … }` payload names; rules-query binders are separate (§12).

**`ForEach` item scope:** inside `ForEach(list) { item in … }`, overrides are **`item.field = …`**. On RHS expressions, bare identifiers resolve to **item fields first**, then enclosing component params. Use **`self.param`** for the enclosing component when needed (§4e).

**Rules-query `self`:** inside `rules` / query expressions, `self` means the **evaluation root node** of that rules block (§12). That is a different namespace from component `self`.

**Shadowing:** A parameter name **MUST NOT** shadow a token name. If a component declares `param title: String` and a token `title: Color` exists, the parser **MUST** emit **PDL-W001** (parameter shadows token). The parameter takes precedence inside the component body. Best practice: use distinct naming conventions (token paths use dots; params use camelCase) to avoid collisions.

**Let-frame scope:** `let` declarations are scoped to the component body in which they appear. A `let` inside a nested `let` block is not accessible from the outer component body.

---

### 22.3 Dotted identifier resolution

Resolution distinguishes **token paths**, **`self.param`**, and **frame property targets**:

1. **`self.IDENT`** — member access on the enclosing component: `IDENT` **MUST** be a parameter of that component (or **PDL-E007**).
2. **`FrameId.IDENT`** in override / assignment position — frame property target (§7); `FrameId` is a `let` id.
3. **Other `a.b.c` forms** — look up the full string as a single **token** name in the merged token namespace. If found, it is a token reference. If not found, **PDL-E007**.
4. There is **no** general field-access operator on arbitrary values in v1 — only `self.param`, frame-prop targets, and token paths.

---

### 22.4 Dot-enum resolution

A dot-enum literal like `.primary` is resolved against the **expected type** at its point of use:

- In a **condition** (`if param == .primary`): resolved against the variant type of `param`. If `param` is not variant-typed, this is **PDL-E010**.
- In a **parameter default** or **fixture value**: resolved against the declared type of that parameter.
- In a **frame property**: resolved against the allowed enum set for that property (§5).
- As a **frame kind** keyword (`layout`, `text`, `icon`, `media`): these are keywords, not dot-enums; they do not carry a leading dot.

**Qualified sugar:** `TypeName.case` for a built-in frame enum (e.g. `Justify.center`) **MUST** parse to the same value as `.case` and then resolve with the same rules. Invalid cases for the property remain **PDL-E006**. `Sizing.*` remains a sizing literal (§6 / §21), not a `dotEnum` AST node.

---

### 22.5 Type style name resolution

`typeStyle` names live in their own namespace and are referenced by bare identifier (e.g. `style = Body`). Resolution is **case-sensitive** — `style = body` when `typeStyle Body` is declared is a **PDL-E008** error (unresolved type style reference).

---

### 22.6 Interaction target resolution

An `interaction` block's `for ComponentName` clause must resolve to an existing component in the merged definition. Resolution is by exact name match. If the component does not exist at merge time, this is **PDL-E009** (unresolved interaction target). Forward references are not permitted in v1.

---

## 23 — Type System and Name Resolution

### 23.1 Type categories

PDL has a **structural type system** used exclusively at validation time. There is no runtime type dispatch — all types are resolved before emit. Types fall into two categories:

**Primitive types** — scalar values:
`Color`, `Opacity`, `Distance`, `Radius`, `Shadow`, `Icon`, `MediaSource`, `Ratio`, `FontFamily`, `Size`, `Weight`, `LineHeight`, `LetterSpacing`, `Duration`, `Easing`, `Boolean`, `String`, `Number`

**Composite types** — structured values:
`Sizing`, `EdgeInsets`, `CornerRadii`, `Transition`, `Vibrancy`, `Ramp`, `Background`, `Foreground`

**User-defined types:**
- Each declared `variant` is a distinct type whose values are its cases.

---

### 23.2 Token type checking

When a token is declared with a `TokenType`, the RHS value **MUST** be compatible with that type. The merged-design validator enforces this as **one TokenType → allowed RHS shape table** (TS `assertTokenRhsCompatible` / Rust `assert_token_rhs_compatible`); mismatched literals are **PDL-E005**.

| TokenType | Valid RHS |
|-----------|-----------|
| `Color` | `#hex` literal, or reference to a `Color` token |
| `Opacity` | `NUMBER` in 0…1, or reference to an `Opacity` token |
| `Distance` | non-negative `NUMBER`, or (on **`semantic`**) a `Distance` token — strings and other literals are **PDL-E005** |
| `Radius` | non-negative `NUMBER`, or (on **`semantic`**) a `Radius` token — **not** `Corner(…)` (that form is frame-only on `cornerRadius`) |
| `Shadow` | `Shadow(x:, y:, blurRadius:, color: [, spread:])` (§6), or (on **`semantic`**) a `Shadow` token — CSS strings are **PDL-E005** |
| `Duration` | non-negative `NUMBER` (ms), or `Duration` token |
| `Easing` | CSS easing `STRING` or `"linear"`, or `Easing` token |
| `Transition` | transition tuple `(duration: …, easing: …)`, or `Transition` token |
| `Blur` | non-negative `NUMBER`, or `Blur` token |
| `Vibrancy` | vibrancy tuple `(saturation: …, brightness: …)`, or `Vibrancy` token |
| `Ramp` | ramp literal `(direction: …, stops: […])`, or `Ramp` token |
| `Background` / `Foreground` | scalar `Color`, layer list `[…]`, or token of the same type |
| `Sizing` | sizing literal (`.hug` / `Sizing.hug`, `.fill` / `Sizing.fill`, `.fixed(n)` / `Sizing.fixed(n)`, `.flex(…)` / `Sizing.flex(…)`) — strings like `".hug"` are **PDL-E005** |
| `FontFamily` / `Icon` / `MediaSource` | `STRING` |
| `Size` / `Weight` | `NUMBER` |
| `LineHeight` | positive `NUMBER` (unitless ratio) |
| `LetterSpacing` | `NUMBER` (em units; may be negative) |
| `Ratio` | positive `NUMBER`, or **`W:H`** sugar (`16:9`) evaluating to `W/H` |

A token referenced on the RHS must have been declared with the **same** `TokenType`. Assigning a `Distance` token to a `Color` declaration is **PDL-E005** (type mismatch). A **`primitive`** whose RHS is a bare token identifier is also **PDL-E005** (primitives are literal leaves; aliases belong on **`semantic`**).

---

### 23.3 Frame property type checking

Frame properties are type-checked against the allowed types in §5. The machine-readable SoT is **`shared/frame-props.json`** (loaded by TS `frameProps.ts` / Rust `frame_props.rs`): each frame kind maps property names to a reusable **value kind** (literal shapes, enum cases, and optional token types). Assigning a value of the wrong type to a property (e.g. `gap = "#FF0000"`) is **PDL-E006** (frame property type mismatch). An unknown property on a frame kind is **PDL-E011**. The same text-frame property set applies to **`typeStyle`** bodies (excluding `style`).

---

### 23.4 Parameter type checking

Component parameters are typed as `String` or a declared variant name. The default value **MUST** be type-compatible:

- `String` parameters: default must be a `STRING` literal.
- Variant parameters: default must be a `.caseName` that is a valid case of that variant.
- Numeric defaults (e.g. `size: Number = 16`) are accepted by the grammar but the type `Number` is not a first-class parameter type in v1. Use `String` or a `variant` for all user-facing parameters; reserve numeric defaults for internal sizing params.

---

### 23.5 Condition type checking

Conditions in `if` chains (both frame overrides and `rules` blocks) **MUST** compare a variant-typed parameter to a dot-enum case of that variant's type. Comparing a `String` parameter using `==` is **PDL-E010** (invalid condition operand). Numeric comparisons in frame `if` conditions are not supported in v1.

---

### 23.6 Fixture value type checking

Values in `fixtures` bodies must be type-compatible with the declared parameter type:

- String params: `STRING` literal only.
- Variant params: `.caseName` literal only (must be a valid case of that variant).
- Token references in fixture bodies are valid **only** for params typed as token-valued types (rare; normally fixtures only bind `String` and `variant` params).

Component parameters are **not** in scope inside fixture bodies — references to other params are **PDL-E012** (param reference in fixture scope).

---

### 23.7 Circular reference detection

**Token self-reference:** A token that references itself on its RHS is **PDL-E013** (circular token reference). Cycles through multiple tokens (A → B → A) are also **PDL-E013**.

**Import cycles:** Circular `import` chains are **PDL-E002** (circular import). The loader detects these during DFS import traversal and halts with the cycle path in the error message.

---

## 24 — Error Catalog

Every diagnostic emitted by a conforming PDL parser or validator **MUST** carry a stable error code from this catalog. Error codes beginning with `PDL-E` are **errors** (halt compilation). Codes beginning with `PDL-W` are **warnings** (compilation proceeds; the output is valid).

Future additions must use codes not in this list. Codes are never reused after retirement.

---

### 24.1 Parse errors (PDL-E0xx)

| Code | Name | Trigger |
|------|------|---------|
| **PDL-E001** | `unexpected-token` | The parser encountered a token it did not expect in the current context. Message MUST include the token and the production rule being parsed. |
| **PDL-E002** | `circular-import` | An `import` chain forms a cycle. Message MUST include the full cycle path. |
| **PDL-E003** | `duplicate-symbol` | Two top-level declarations share the same name within the same namespace (e.g. two `component Button` after merge). |
| **PDL-E004** | `unknown-token-type` | A `primitive` or `semantic` declaration uses a `TokenType` name that is not in the §21.2 list. |
| **PDL-E005** | `token-type-mismatch` | The RHS value of a token declaration is incompatible with the declared `TokenType` (§23.2). |
| **PDL-E006** | `frame-prop-type-mismatch` | A frame property (or `typeStyle` prop) is assigned a value of the wrong type (§23.3 / `shared/frame-props.json`). |
| **PDL-E007** | `unresolved-reference` | A dotted identifier or bare identifier used as a value does not match any token, parameter, or frame id in scope. |
| **PDL-E008** | `unresolved-type-style` | A `style = Name` reference does not match any declared `typeStyle` (case-sensitive). |
| **PDL-E009** | `unresolved-interaction-target` | An `interaction … for ComponentName` block names a component that does not exist in the merged definition. |
| **PDL-E010** | `invalid-condition-operand` | A condition expression compares a non-variant parameter, or uses an operator not supported for its type (§23.5). |
| **PDL-E011** | `unknown-frame-property` | A property name is used on a frame kind (or `typeStyle`) that does not define it (§5 / `shared/frame-props.json`). |
| **PDL-E012** | `param-reference-in-fixture` | A fixture value body contains a `param`-kind reference (§23.6). |
| **PDL-E013** | `circular-token-reference` | A token's RHS resolves to itself directly or through a chain. |
| **PDL-E014** | `duplicate-fixture-label` | Two `example` blocks within the same `fixtures ComponentName { … }` have identical labels. |
| **PDL-E015** | *(retired)* | Formerly `expose-unknown-param`. **`expose` removed** from the language — do not emit. |
| **PDL-E016** | `extend-unknown-target` | An `extend` block names a component that does not exist in the merged definition. |
| **PDL-E017** | `quoted-hex-color` | A string literal is used where a `Color` value is expected and the string content matches the hex color pattern — hex colors must be unquoted. |
| **PDL-E018** | `reserved-word-as-identifier` | A reserved word (§20.4) is used as a user-defined identifier. |
| **PDL-E019** | `invalid-override-target` | An `if` branch assignment targets a frame id (`FrameId.prop`) that has not been declared with `let` earlier in the component body. |
| **PDL-E020** | `missing-required-arg` | A constructor call (e.g. `EdgeInsets`, `GradientStop`, `Blur`) omits a required keyword argument. |
| **PDL-E021** | `duplicate-let-frame-id` | Two **`let`** or **`letInstance`** frames in the same component reuse the same **`id`** (names must be unique across the whole component body, including all **`if`** branches and sibling nested frames). |
| **PDL-E022** | `unknown-protocol` | A `component C <P>` or protocol-typed param references an undeclared protocol `P`. |
| **PDL-E023** | `unknown-foreach-list` | `ForEach(name)` names a parameter that is not an expandable list/slot in the enclosing component (§4e). |
| **PDL-E024** | `unknown-emit-channel` | Layout emit capture or `emit` names a channel not in the effective `emits` set for the relevant component/protocol (§4d–§4e). |
| **PDL-E025** | `invalid-foreach-binding` | A derived bind inside `ForEach` references an unknown parent/item field or fails type rules for the target child param (§4e). |
| **PDL-E026** | `foreach-chrome-unimplemented` | `before` / `between` / `after` appears in `ForEach` before B6 is implemented (implementations **MAY** use this code while rejecting chrome). |
| **PDL-E027** | `emit-payload-mismatch` | Layout `channel(…) = { … }` arity or types do not match the effective emit signature by position, or a fire-site `emit` arg fails the declared payload type (§4d–§4e). |
| **PDL-E028** | `ambient-as-emit-capture` | A host inbound channel name is used as a **child emit capture** (e.g. bare / parent-qualified `pressEnd(…) = { … }` without `self.`) (§4a′ / §8). |
| **PDL-E029** | `declared-as-host-channel` | A declared emit channel name is used as a host inbound channel (`self.select = { … }`) (§8) — use parent layout handler assignment instead. |
| **PDL-E030** | `interaction-missing-host-protocol` | A component wires a host channel / verb (`self.pressEnd`, `beginEditing`, …) without effective host protocol conformance (§4a / §4a′). |
| **PDL-E031** | `host-protocol-as-slot-type` | A host-role protocol is used as a param or `[T]` slot/array element type (§4a). |
| **PDL-E032** | `invalid-protocol-requires` | `requires` targets a non-host protocol, an unknown name, or appears on a host protocol (§4a). |
| **PDL-E033** | `unknown-host-verb` | Interaction body calls an unknown host verb (expected `beginEditing` / `cancelEditing` / `commitEditing`) (§4a). |
| **PDL-E034** | `array-slot-dotted-override` | `slots.field = …` on an **array** slot/list param; use `ForEach(slots) { item in item.field = … }` (§4b / §4e). |
| **PDL-E035** | `foreach-without-mount` | `ForEach(list)` appears but `list` is never referenced in any `children = […]` / `children = list` of the component (§4e). |
| **PDL-E036** | `list-emit-capture` | Emit capture qualifies an **array/list** param (`chips.select(…) = { … }`); use `ForEach(chips) { chip in chip.select(…) = { … } }` (§4e). |
| **PDL-E037** | `unknown-component` | A companion block, instance, bake, or resolve path names a component that does not exist in the merged definition. |
| **PDL-E038** | `mixed-condition-operators` | A condition expression mixes `&&` and `\|\|` at the same precedence level without parentheses (§21.6). |

---

### 24.2 Warnings (PDL-W0xx)

| Code | Name | Trigger |
|------|------|---------|
| **PDL-W001** | `param-shadows-token` | A component parameter name matches an existing token name; the parameter takes precedence inside the component body. |
| **PDL-W002** | `primitive-token-in-component` | A component references a `primitive` token directly instead of a `semantic` token. Advisory only; valid in demos. |
| **PDL-W003** | `literal-opacity-in-library` | A raw `0…1` numeric literal is used where an `Opacity` token would be more appropriate for a design-system library context. |
| **PDL-W004** | `unfixable-schemaVersion` | The `schemaVersion` on a catalogue or manifest input is not a version this toolchain understands; output may be incomplete. |
| **PDL-W005** | `unknown-key-in-usage` | A `usage` block contains a key other than `description`. The key is preserved but has no normative behavior in v1. |
| **PDL-W006** | `empty-component` | A component's root frame has no children and no content properties set. Likely a stub. |
| **PDL-W007** | `unreachable-override-branch` | A branch in an `if` / `else if` / `else` chain can never be reached because an earlier branch covers all cases of the variant. |
| **PDL-W008** | *(retired)* | Formerly `interaction-targets-unexposed-param`. **`expose` removed** — do not emit. |

---

### 24.3 Diagnostic message requirements

Every diagnostic **MUST** include:

1. The error or warning code (e.g. `PDL-E007`).
2. The source file path and line number (and column number where determinable).
3. A human-readable message describing what was found and what was expected.
4. For errors referencing another location (e.g. `PDL-E003` duplicate), the location of the first occurrence.

---

## 25 — Conformance Specification

### 25.1 Conformance classes

PDL defines three conformance classes. A tool may claim conformance to one or more:

---

**Class A — Conforming Parser**

A conforming parser MUST:

1. Accept all syntactically valid PDL source text as defined by the grammar in §21.
2. Reject all syntactically invalid PDL source text with at least one `PDL-E0xx` diagnostic carrying the correct code.
3. Produce an in-memory design definition from which a Component Catalogue can be generated.
4. Implement the import merge semantics of §2 including cycle detection (`PDL-E002`).
5. Implement all token type checks (§23.2) and frame property checks (§23.3), emitting `PDL-E005` and `PDL-E006` respectively on violations.
6. Implement the namespace and scoping rules of §22.
7. Produce deterministic output: the same source files in the same import order **MUST** produce the same **logical** Component Catalogue. When serialised with the reference **`stableStringify`** settings for graph output (**`{ omitEmpty: true }`**, **§16a**), the same inputs **MUST** yield byte-identical JSON.

A conforming parser **MAY** emit additional warnings beyond the `PDL-W0xx` catalog provided they are clearly distinguished from catalog codes.

---

**Class B — Conforming Resolver**

A conforming resolver MUST:

1. Accept a Component Catalogue JSON (§16) or an in-memory design definition as input.
2. Implement `getResolvedTokens` per §16 §7 — applying the primary theme then modifiers in order.
3. Implement catalogue generation per §16 — binding parameters, evaluating override chains (first-match), resolving token and param references, computing variant deltas, expanding embedded instances recursively.
4. Produce a Component Catalogue whose JSON matches the schema in §16.
5. Evaluate `ConditionExpr` nodes with short-circuit `&&` / `||` semantics.
6. Treat absent `parent` in rules evaluation as empty/false per §13.

---

**Class C — Conforming Emitter**

A conforming emitter MUST:

1. Accept a Component Catalogue (§16) as its primary input.
2. Document which frame kinds (`layout`, `text`, `icon`, `media`) it supports.
3. Document which layer constructors (`Color`, `Ramp`, `Blur`, `Media`, `Vibrancy`) it supports.
4. Document which animatable properties (§14) it supports.
5. Emit a `capabilities` block in any design manifest it produces (§17).
6. Degrade gracefully for unsupported features: emit a `PDL-W` diagnostic and render the nearest supported approximation rather than halting.
7. Carry the `schemaVersion` of the catalogue it consumed in any artifact it produces.

---

### 25.2 MUST / SHOULD / MAY summary

The following table summarizes normative requirement levels used throughout this specification. Definitions follow RFC 2119.

| Term | Meaning |
|------|---------|
| **MUST** | Absolute requirement. Violation constitutes non-conformance. |
| **MUST NOT** | Absolute prohibition. Violation constitutes non-conformance. |
| **SHOULD** | Recommended. Valid reasons may exist to deviate, but the full implications must be understood. |
| **SHOULD NOT** | Not recommended. Valid reasons may exist, but implications must be understood. |
| **MAY** | Optional. Permitted but not required. |

---

### 25.3 What is explicitly out of scope for v1

The following are **not** part of the PDL v1 conformance surface. Tools that implement them are encouraged, but no conformance claim can be based on them:

- Geometry-tier rule evaluation (spatial predicates, overlap, alignment in screen space)
- Multi-file hot-reload or incremental re-parse
- IDE language services (autocomplete, go-to-definition, hover types)
- Design token interoperability with W3C Design Tokens format
- CSS Custom Properties output format
- Any output target beyond HTML, manifest JSON, and resolved JSON
- User-defined functions or macros inside PDL source
- Runtime evaluation of PDL in a browser without a build step
- Accessibility auditing beyond what `rules` blocks can express

---

### 25.4 Normative test fixtures

The following fixture files are **normative** — a conforming parser **MUST** accept them without error, and a conforming resolver **MUST** produce output matching the reference resolved JSON:

| Fixture file | Tests |
|-------------|-------|
| `test-fixtures/pdl/01_tokens_and_themes.pdl` | Token declarations, theme overrides, composite tokens |
| `test-fixtures/pdl/02_type_styles.pdl` | `typeStyle` declarations and `style =` references |
| `test-fixtures/pdl/03_variants_and_overrides.pdl` | Variant declarations, `if`/`else if`/`else` chains |
| `test-fixtures/pdl/04_composition_and_nesting.pdl` | `let`, `children`, embedded instances, `.spacer` |
| `test-fixtures/pdl/05_icon_and_image_props.pdl` | `icon` and `media` frame kinds, all property types |
| `test-fixtures/pdl/06_interaction_states.pdl` | `interaction` blocks, all event types, `animate` |
| `test-fixtures/pdl/07_motion_and_layers.pdl` | `Transition` tokens, layer constructors, `from`/`to` |
| `test-fixtures/pdl/08_companion_blocks.pdl` | `fixtures`, `usage`, `rules`, `extend` (legacy `expose` fixtures pending removal) |
| `test-fixtures/pdl/09_error_cases/` | Directory of invalid PDL files; each **MUST** produce the specific `PDL-Exxx` code named in its filename |

Test fixtures for error cases (in `09_error_cases/`) use the naming convention `PDL-E007-unresolved-reference.pdl` — the error code is part of the filename. A conforming parser **MUST** emit exactly that error code (though it may emit additional warnings).

---

## 26 — Versioning and Stability Contract

### 26.1 Current version

The current PDL specification version is **`1.0.0-beta`**. All published catalogue files, design manifests, and any other PDL artifacts **MUST** carry `"schemaVersion": "1.0.0-beta"`. This version is subject to breaking changes before the `1.0.0` stable release.

---

### 26.2 Semantic versioning rules

PDL follows semantic versioning (`MAJOR.MINOR.PATCH`) with the following definitions:

**MAJOR version bump** — breaking change. Any of:
- Removing a token type, frame kind, frame property, or event name
- Changing the meaning of an existing keyword
- Changing the JSON shape of any normative field in the catalogue, manifests, or other published artifacts
- Removing or renaming any `PDL-E` or `PDL-W` error code
- Changing the grammar in a way that makes previously-valid PDL invalid

**MINOR version bump** — backward-compatible addition. Any of:
- Adding a new token type, frame kind, frame property, event name, or layer constructor
- Adding new optional fields to the catalogue, manifests, or other published artifacts
- Adding new `PDL-E` or `PDL-W` codes
- Promoting a `PDL-W` to a `PDL-E`
- Adding new reserved words

**PATCH version bump** — clarification or editorial fix. Any of:
- Fixing incorrect examples in the spec
- Clarifying ambiguous prose without changing the intended behavior
- Fixing a typo in an error message

---

### 26.3 Compatibility guarantees

**Forward compatibility (old parser, new file):** A `1.0.x` parser reading a `1.1.0` file **SHOULD** emit `PDL-W004` and proceed, ignoring unknown fields. It **MUST NOT** crash or emit `PDL-E` errors solely due to unrecognized optional fields.

**Backward compatibility (new parser, old file):** A `1.1.0` parser reading a `1.0.0` file **MUST** produce correct output. Newly required fields absent in older files default to their specified fallback values.

**Beta to stable (`1.0.0-beta` → `1.0.0`):** Breaking changes are permitted during the beta period. After `1.0.0` is declared, the semantic versioning rules above apply strictly.

---

### 26.4 Deprecation policy

A feature targeted for removal **MUST** be:

1. Marked as `@deprecated` in the spec at least one **MINOR** version before removal.
2. Accompanied by a migration path (what to use instead).
3. Retained in the spec (but triggering `PDL-W`) for the duration of the deprecation period.
4. Removed only in a **MAJOR** version bump.


---

### 26.5 Changelog and discovery

- A `CHANGELOG.md` at the repository root **MUST** be updated with every version bump.
- The `schemaVersion` field on catalogues and manifests is the sole authoritative signal of what spec version an artifact targets.
- There is no separate runtime version negotiation mechanism in v1.

