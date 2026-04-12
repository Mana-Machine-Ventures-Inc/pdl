# Spec notes and implementation gaps

This document records ambiguities between `full-spec.md` and this repository’s first compiler pass, plus intentional v1 limits.

## Lexer: frame kind keywords vs `icon` / `media` property names

- **§20** lists `layout`, `text`, `icon`, `media` as reserved words. Those spellings are also **frame kind keywords** and, for `icon` / `media`, **property names** on the same kinds (`icon = "…"`, `media { source = … }`).
- This implementation lexes `layout`, `text`, `icon`, and `media` as ordinary **`IDENT`** tokens; the parser only treats them as frame kinds in **`component … () <kind>`** and **`let` `:` `<kind>`** positions. That avoids `icon =` being tokenised as a useless `icon` keyword at the start of a property assignment.
- Parameter types such as **`Icon`** remain lexer keywords so `primitive … : Icon` keeps working; **`consumeParamTypeName()`** also accepts those keywords in the parameter list so `glyph: Icon = "dot"` parses.

## Lexer: dotted identifiers vs member access

- **§20.4** states that a dot inside an identifier is part of one token (e.g. `color.surface.primary`).
- **§21** `deferred-children-assignment` uses `IDENT '.' 'children'`, e.g. `Row.children = […]`, which requires a standalone `.` token.

**Resolution implemented:** identifier segments are letters/digits/underscore only; `.` is its own token when it follows an identifier or number character. **Leading-dot enums** (`.row`, `.warning`) are recognised only when the `.` is **not** immediately preceded by `[A-Za-z0-9_]`, matching common “member access vs enum” disambiguation.

## `npm run graph` JSON shape

- Prose for the merged **design graph** JSON lives in **`full-spec.md` §16b** (internal compiler / test snapshot). **§16** documents the **Component Catalogue**; **§17 §3** documents the thin **design manifest** (`npm run manifest`).
- This toolchain emits a stable object with `kind: "designGraph"` and serialised declarations (see `src/graph.ts`). **TODO:** §16b marks open questions if this shape becomes fully normative.

## Component Catalogue

- **Variant metadata:** top-level **`variantTypes`** plus per-param **`variantTypeName`** carry PDL **`variant`** type names for emitters (e.g. Figma); **`type`** stays **`"variant"`** as the JSON discriminator.
- **External refs in trees:** catalogue trees use **`primitive:`** / **`semantic:`** string markers for frame properties whose RHS is a bare `primitive` / `semantic` identifier (see §16 §2.3); composite RHS values are still fully resolved in v1.
- **`tokensByTheme` vs `tokens`:** `tokensByTheme` rows are built **without** CLI **`modifiers`**. If **`buildComponentCatalogue`** is called with non-empty **`modifiers`**, the flat **`tokens`** map (and tree resolution) may differ from every pure-theme slice; receivers that use modifiers should treat **`tokens`** as authoritative for that build.
- **Variant deltas:** only **single-parameter** axes are expanded automatically against the default instance. Combined variant rows (e.g. `emphasis` + `size` interaction) must be authored explicitly per **§16**; not generated yet.
- **`$ref` in `children`:** structural variant entries in the spec use `{ "$ref": "Label" }` for reuse. The current diff emits full child trees; emitters can still consume them, but JSON may be larger than the spec’s examples.
- **`expose`:** if no `expose` block exists for a component, the catalogue lists **all** parameter names as `expose` for ergonomics. The spec emphasises explicit `expose`; confirm product expectations.

## Language surface not implemented (parse or execute)

- `interaction`, `fixtures`, `usage`, `rules`, `extend` (and full **§12–§15** companion / motion / layer depth).
- **Fat manifest** fields (resolved `tokens` on manifest, `interactions`, `fixtures`, `rules` on manifest) described historically in §17 — **not** emitted; v1 manifest is thin only (`src/manifest.ts`).

## Other minor notes

- **§21** `param-decl` EBNF shows a required `default-value`; prose **§4** also shows defaults for all illustrated parameters. Optional parameters without defaults are not implemented.
- **Theme `theme Name : Base`** optional second identifier is parsed (`baseTheme`) but not used for resolution (spec de-emphasises OO theme inheritance).
