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

## Serialised `ValueExpr` slices (`SerialisedValueExpr`)

- **§16b** in **`full-spec.md`** documents the JSON shape of embedded **`ValueExpr`** / **`ConditionExpr`** fragments used inside **Component Catalogue** and **`resolvedComponent.system`** (`serialiseValueExpr` / `serialiseConditionExpr` in **`src/graph.ts`**). There is no standalone merged-AST JSON CLI output.

## Graph and bake CLI (`graphSystem`, `graphComponent`, `bakeSystem`, `bakeComponent`)

- **§16c–§16d** document **`pdl graph*`** (catalogue / **`resolvedComponent`**) and **`pdl bake*`** (**`bakedDesign`** — literal trees only). Implementation: **`src/cli.ts`**, **`src/bakeDesign.ts`**.
- **`graphComponent` / `resolve` (default):** **`buildResolvedComponentDocument`** emits one catalogue row via **`buildCatalogueComponentRow`** plus a trimmed **`system`** — it does **not** build the full multi-component catalogue (see **`src/resolveBundle.ts`**). **`graphSystem` / `catalogue`** still use **`buildComponentCatalogue`** for the whole design.

## Component Catalogue

- **`variantTypes` / `components`:** emitted as **name-keyed objects** (not arrays) so emitters can use `catalogue.variantTypes["MyVariant"]` and `catalogue.components["Button"]`. The same pattern applies to **`resolvedComponent.system`** (`primitives`, `semantics`, `themes`, `typeStyles`, `variantTypes`).
- **`hidden` on `layout` frames:** `hidden = true | false | .true | .false | <variant condition>` hides the frame from catalogue **`children`** / variant **`children`** overrides and prunes it from nested **`childNodes`** trees, while every declared Root-level **`children = […]`** id remains a **`childNodes`** entry (subtree chosen from a scan where that node is visible when possible). **`pdl resolve --tree-only`** still returns the **full** materialised tree (including hidden nodes in **`children`** arrays) for debugging.
- **Variant metadata:** top-level **`variantTypes`** plus per-param **`variantTypeName`** carry PDL **`variant`** type names for emitters (e.g. Figma); **`type`** stays **`"variant"`** as the JSON discriminator.
- **External refs in trees:** catalogue trees use **`primitive:`** / **`semantic:`** string markers for frame properties whose RHS is a bare `primitive` / `semantic` identifier (see §16 §2.3); composite RHS values are still fully resolved in v1.
- **CLI `modifiers`:** the catalogue’s **`primitives` / `semantics` / `themes` / `typeStyles`** graph is **not** modifier-aware; if **`buildComponentCatalogue`** is called with non-empty **`modifiers`**, **tree** resolution still uses **`buildResolvedTokenMap`** with those modifiers. Emitters that replay themes from JSON alone cannot reproduce modifier-specific trees unless they mirror that resolution path.
- **Variant deltas:** only **single-parameter** axes are expanded automatically against the default instance. Combined variant rows (e.g. `emphasis` + `size` interaction) must be authored explicitly per **§16**; not generated yet.
- **`$ref` in `children`:** structural variant entries in the spec use `{ "$ref": "Label" }` for reuse. The current diff emits full child trees; emitters can still consume them, but JSON may be larger than the spec’s examples.
- **`expose`:** if no `expose` block exists for a component, the catalogue lists **all** parameter names as `expose` for ergonomics. The spec emphasises explicit `expose`; confirm product expectations.

## Language surface not implemented (parse or execute)

- `interaction`, `fixtures`, `usage`, `rules`, `extend` (and full **§12–§15** companion / motion / layer depth).
- **Fat manifest** fields (resolved `tokens` on manifest, `interactions`, `fixtures`, `rules` on manifest) described historically in §17 — **not** emitted; v1 manifest is thin only (`src/manifest.ts`).

## Other minor notes

- **§21** `param-decl` EBNF shows a required `default-value`; prose **§4** also shows defaults for all illustrated parameters. Optional parameters without defaults are not implemented.
- **Theme `theme Name : Base`** optional second identifier is parsed (`baseTheme`) but not used for resolution (spec de-emphasises OO theme inheritance).
