# Spec notes and implementation gaps

This document records ambiguities between the **lock files** (`shared/*.json`, `grammar/pdl.ebnf`, `shared/schema/*.json`) and the TypeScript oracle (`src/`), plus intentional v1 limits. The public site (Guide, Language objects, Diagnostics) is the human spec.

## Retirement checklist (`docs/full-spec.md`)

Former chapters → lock file or dropped. All rows green; the markdown spec is deleted.

| Former chapter | Destination |
|----------------|-------------|
| §1 Overview | Guide (`website/src/index.md`) · dropped mental-model essay |
| §2 Files, imports, entry | `shared/language-objects.json` `files` + `syntax` |
| §3 Tokens, themes, typeStyle | `tokenTypes` · `theme` · `typeStyle` |
| §4 Variants / parameters | `variants` · `parameters` |
| §4a / §4a′ Protocols + host prelude | `protocols` · `hostPrelude` · `test-fixtures/pdl/stdlib/host_protocols.pdl` |
| §4b Array children | `arrayChildren` |
| §4c Injection packs | `shared/schema/injection-pack.json` |
| §4d Emits | `emits` · `eventDirections` |
| §4e ForEach | `forEach` (B6 reserved / PDL-E026) |
| §5 Frames / let / properties | `frameKinds` · `lets` · `shared/frame-props.json` |
| §6 Values / null / conditions | constructors · `null` · `conditions` · `syntax` |
| §7 Conditionals | `conditionals` |
| §8 Handlers / self | `self` · `eventDirections` · `motion` |
| §9 CLI | root `README.md` · Guide |
| §10 Cheat sheet | dropped — Language objects page |
| §11 / §11a Fixtures / samples | `companions` · `samples` |
| §12 Usage / extend | `companions` |
| §13 Rules | `ruleQuery` |
| §14 Layers / motion tokens | `layers` · `motion` · token types |
| §15 Best practices | dropped / Guide |
| §16 Catalogue / bake / resolved | `shared/schema/*.json` |
| §17 Manifest | README (thin registry only) |
| §18 Process / regen | `docs/IMPLEMENTATION_PLAN.md` |
| §19 Conformance | tests + fixtures |
| §20 Keywords | `shared/keywords.json` |
| §21 Grammar | `grammar/pdl.ebnf` |
| §22 Namespace / self | `files` · `self` · `lets` |
| §23 Type checks | `shared/frame-props.json` |
| §24 Diagnostics | `shared/diagnostics.json` |

## Locked language decisions (2026-08-06)

Documented in lock files + Language objects:

1. **`expose` removed** — all params public; **`emits`** is output API (inline / companion / protocol).
2. **`self` / `self.param`** = enclosing component instance (rules-query `self` stays rules-scoped).
3. **Selection Pattern A** — parent owns id/enum SoT; ForEach derives Bool (`chip.selected = …`).
4. **Handler assignment** — declared emits: `item.channel(…) = { … }` in layout / ForEach; host inbound: `self.channel = { … }` in the kind body (PDL-E028 / E029 / E030). Layout keyword `on` and `interaction` blocks are hard errors (**PDL-E001**).

**Additive (2026-08-07):** **`enum` is a surface alias for `variant`** (same AST/IR). Prefer `variant` for design-axis combinators and `enum` for domain/state sets; keywords may diverge later (associated values, matrix defaults). No `extend Type` — only **`extend Component`** for companions (§11).

**Additive (2026-08-07):** Protocol **host roles** — prelude stubs in `test-fixtures/pdl/stdlib/host_protocols.pdl` (`PointerInput`, `EditableText`); API `requires PointerInput`; **PDL-E030** without effective host conformance; **PDL-E031** host-as-slot. See [`PROPOSAL_PROTOCOL_CAPABILITIES.md`](./PROPOSAL_PROTOCOL_CAPABILITIES.md).

**Additive (slot compose):** Single-slot dotted overrides (`simple.content = …` / `simple.title = …`) classify param vs root-frame prop (§4b). `ForEach` is binder overrides / emit capture only — lists mount via `children = [list]` (**PDL-E035**); array dotted overrides are **PDL-E034**.

**Additive (2026-08-09):** Frame **`overflow`** is **`.visible` | `.scroll` | `.clip`** only (no **`.hidden`** / **`.auto`**). Hard crop without scroll = **`.clip`**. See `shared/frame-props.json` `enumOverflow`.

Rust B4b/B5 + host-protocol validation + `self.<channel> = { … }` parse landed; `interaction` keyword rejected. TS oracle still has legacy `expose` and lags some protocols/emits/ForEach (Playground uses Rust bake).

## Accepted proposals (status)

| Proposal | Status | Notes |
|----------|--------|--------|
| [`PROPOSAL_PORTABLE_CORE.md`](./PROPOSAL_PORTABLE_CORE.md) | **Accepted** 2026-08-05 | Rust portable core; TS oracle until bake parity |
| [`PROPOSAL_SLOTS_PROTOCOLS_FIXTURES.md`](./PROPOSAL_SLOTS_PROTOCOLS_FIXTURES.md) | **Accepted** 2026-08-05 | **B1–B5** in Rust + §4a–§4e; B6 chrome deferred; **B7a–c shipped** (presenter pins + click verbs + ancestor climb); TS oracle not yet for B1–B5 |
| [`PROPOSAL_PROTOCOL_CAPABILITIES.md`](./PROPOSAL_PROTOCOL_CAPABILITIES.md) | **Accepted** 2026-08-07 | Host vs API protocol roles; E030/E031; EditableText D3; D5 compat matrix later |
| [`PROPOSAL_QUICK_PREVIEW.md`](./PROPOSAL_QUICK_PREVIEW.md) | **Proposed** | Disk-watch `preview` harness; amended by Playground proposal §7 |
| [`PROPOSAL_PDL_PLAYGROUND.md`](./PROPOSAL_PDL_PLAYGROUND.md) | **Accepted** — P0–P5 shipped | Demo/lab vs Studio; file canvas, interactive HTML, variants. Overview: [`PLAYGROUND_OVERVIEW.md`](./PLAYGROUND_OVERVIEW.md) |
| [`PROPOSAL_TYPED_SAMPLES.md`](./PROPOSAL_TYPED_SAMPLES.md) | **Accepted** 2026-08-12 | Folded into `shared/language-objects.json` `samples` + `shared/schema/component-catalogue.json`. Rust bake + TS oracle; playlist-composer-lite + `lab/samples-tracks.pdl`. Open follow-ups below. |
| [`PROPOSAL_LANGUAGE_SITE.md`](./PROPOSAL_LANGUAGE_SITE.md) | **Accepted** 2026-08-12 | Public VitePress site (`website/`) **is** the human spec. Lock files in `shared/*` + `grammar/pdl.ebnf`. |
| [`PROPOSAL_MOTION_PLAY.md`](./PROPOSAL_MOTION_PLAY.md) | **Accepted** — **P** + **M0–M3** shipped | Play / keys / frame `animate` / HTML WAAPI. **M5** breaking rename `Transition` → `Timing`, `Easing` → `Ease` (before M4 tokens and N8). Plan: [`IMPLEMENTATION_PLAN_MOTION_NAMING.md`](./IMPLEMENTATION_PLAN_MOTION_NAMING.md). |
| [`PROPOSAL_FRAME_BLUR.md`](./PROPOSAL_FRAME_BLUR.md) | **Accepted** — **E0** + **E2** + E3 lab shipped | Frame `effect` / `blur =`. **E1** `Blur()` alias window; leftover E3 `material.sheet`; **E4** `.glass` reserved. |
| [`PROPOSAL_MOTION_TEXT_STAGGER.md`](./PROPOSAL_MOTION_TEXT_STAGGER.md) | **Proposed** | `Stagger.unit` / text split. Do not start until M3 is stable. |
| [`PROPOSAL_ADAPTIVE_LAYOUT.md`](./PROPOSAL_ADAPTIVE_LAYOUT.md) | **Superseded** by Host Environment | Opt-in size-class idea; taxonomy/policy live on pack `host` + `<Host>` (not prelude `SizeClass` / `hostSchema`) |
| [`PROPOSAL_HOST_ENVIRONMENT.md`](./PROPOSAL_HOST_ENVIRONMENT.md) | **Accepted** 2026-08-16 — **H0–H5 shipped** | Unified `host(params) [mount]`, `<Host>`, `host["k"] as? T ?? …`; `theme` vs `catalog`. Locked in `shared/language-objects.json` (`host`, `catalog`, prelude `Host`). Plan: [`IMPLEMENTATION_PLAN_HOST_ENVIRONMENT.md`](./IMPLEMENTATION_PLAN_HOST_ENVIRONMENT.md). Playground variant-param chrome pins facts keys that match a host param after `mount`. |
| [`PROPOSAL_ROUTING_PAGES_SCREENS.md`](./PROPOSAL_ROUTING_PAGES_SCREENS.md) | **Proposed** 2026-08-16 — **N0–N5 + B7a–c shipped**; **N6–N9 proposed** | Shipped: `page` / `screen`; `Presenter` + live pins. Proposed: `appear` / `disappear`; `PresentationMotion`; `present(retainPrior:)` / `swap` / `replace`; `dismiss()` pops; many retained layers; per-tab Presenters. Plan: [`IMPLEMENTATION_PLAN_ROUTING_PAGES_SCREENS.md`](./IMPLEMENTATION_PLAN_ROUTING_PAGES_SCREENS.md). Keyed pair paths: [`IMPLEMENTATION_PLAN_PRESENTATION_MOTION_KEYS.md`](./IMPLEMENTATION_PLAN_PRESENTATION_MOTION_KEYS.md). |
| [`PROPOSAL_SPEC_STORIES.md`](./PROPOSAL_SPEC_STORIES.md) | **Proposed** 2026-08-17 | Eng Spec storytelling: inferred component wiki vs authored `spec` / `story` / `point`; don’ts from rules; spec-scoped `if` tree; viewer iterate + de-dupe. Not locked — do not treat syntax as normative. |
| [`PROPOSAL_REPEAT_NUMBER_BOUNDS.md`](./PROPOSAL_REPEAT_NUMBER_BOUNDS.md) | **Locked** 2026-08-18 | `Repeat(count:, begin: = 1)` bake mount (nested OK); `Number(min:, max:)` + `type Name = Number(…)`; page control = count + currentPage. Ceilings 32 / 64. Errors PDL-E057…E060. Interactive list + emit: see **Map** proposal. |
| [`PROPOSAL_MAP_LIST.md`](./PROPOSAL_MAP_LIST.md) | **Locked** 2026-08-19 | `Map(1...n) { i in }` → typed list (compactMap omit); `ForEach` wires; `children` mounts. G0–G3 shipped. G4 (Repeat deprecate) open. |
| [`PROPOSAL_LAYOUT_TWEEN.md`](./PROPOSAL_LAYOUT_TWEEN.md) | **Proposed** 2026-08-19 | FLIP engine + `match:` identity for in-place rebake and Presenter crossings. **Author surface amended by** [`PROPOSAL_STATE_CHOREOGRAPHY.md`](./PROPOSAL_STATE_CHOREOGRAPHY.md) — no author `.paint` / `.match` enum; land via `.nextRest`. Not locked. |
| [`PROPOSAL_STATE_CHOREOGRAPHY.md`](./PROPOSAL_STATE_CHOREOGRAPHY.md) | **Proposed** 2026-08-19 | Fun poses → land on post-mutation still (`.nextRest`). Host triage paint/FLIP. Amends layout-tween author model. Motivating: page dots, toggle. Not locked. |

**Follow-up — `children` list spelling (2026-08-12):** Bare `children = tracks` / `Frame.children = Tracks.focus.tracks` reads as **replace** with a list; `children = [Header, tracks, Footer]` reads as **compose** (lists splice). Solo `children = [tracks]` is legal sugar (bare ≡ brackets) but feels like “array-in-array.” Guidance lives in `shared/language-objects.json` `arrayChildren`; later lints may prefer bare for pure replace. Do not ban `[list]` in v1.

**Follow-up — samples SoT vs ForEach (Q2):** `ForEach(tracks)` still binds the **param**; a branch that only remounts `List.children = Tracks.focus.tracks` can desync painted rows from selection overlays. Prefer one SoT in examples; ForEach over path/let is deferred.

**Follow-up — sample paths in emit-assign:** not required for v1 mount stories; track when capture RHS evaluation grows.

**Coverage matrix:** [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) — *Language & host coverage*.  
**Roadmap:** same file. Crate: **`crates/pdl-core`**.

Until a feature is locked in **`shared/*.json`** / **`grammar/pdl.ebnf`**, tooling **must not** treat proposal-only syntax as normative. **ForEach** is implemented in **Rust** (bake expand + emit capture validate); TypeScript oracle still lags. **Typed samples** are locked in `language-objects.json` (proposal retained as history).

---

## EBNF catch-up (B1–B4 + B5)

`grammar/pdl.ebnf` includes `protocol`, array/`[T]` params, instance literals, `emits`, host inbound `self.<channel> = { … }`, `emit`, and `ForEach` / handler assignment. Rust implements these; TS oracle lags.

## Lexer: frame kind keywords vs `icon` / `media` property names

- **`shared/keywords.json`** lists `layout`, `text`, `icon`, `media` as reserved words. Those spellings are also **frame kind keywords** and, for `icon` / `media`, **property names** on the same kinds (`icon = "…"`, `media { source = … }`).
- This implementation lexes `layout`, `text`, `icon`, and `media` as ordinary **`IDENT`** tokens; the parser only treats them as frame kinds in **`component … () <kind>`** and **`let` `:` `<kind>`** positions. That avoids `icon =` being tokenised as a useless `icon` keyword at the start of a property assignment.
- Parameter types such as **`Icon`** remain lexer keywords so `primitive … : Icon` keeps working; **`consumeParamTypeName()`** also accepts those keywords in the parameter list so `glyph: Icon = "dot"` parses.

## Lexer: dotted identifiers vs member access

- **`shared/keywords.json` / lexer:** a dot inside an identifier is part of one token (e.g. `color.surface.primary`).
- **`grammar/pdl.ebnf`** `deferred-children-assignment` uses `IDENT '.' 'children'`, e.g. `Row.children = […]`, which requires a standalone `.` token.

**Resolution implemented:** identifier segments are letters/digits/underscore only; `.` is its own token when it follows an identifier or number character. **Leading-dot enums** (`.row`, `.warning`) are recognised only when the `.` is **not** immediately preceded by `[A-Za-z0-9_]`, matching common “member access vs enum” disambiguation.

## Serialised `ValueExpr` slices (`SerialisedValueExpr`)

- Embedded **`ValueExpr`** / **`ConditionExpr`** fragments inside **Component Catalogue** and **`resolvedComponent.system`** are produced by `serialiseValueExpr` / `serialiseConditionExpr` in **`src/graph.ts`**. There is no standalone merged-AST JSON CLI output. Shapes are implied by catalogue/resolved schemas.

## Graph and bake CLI (`graphSystem`, `graphComponent`, `bakeSystem`, `bakeComponent`)

- **`shared/schema/*.json`** document **`pdl graph*`** (catalogue / **`resolvedComponent`**) and **`pdl bake*`** (**`bakedDesign`** — literal trees only). Implementation: **`src/cli.ts`**, **`src/bakeDesign.ts`**.
- **`graphComponent` / `resolve` (default):** **`buildResolvedComponentDocument`** emits a catalogue row for the **primary** component and **each** transitive **`requiredComponents`** dependency, plus **`primaryComponent`** and a trimmed **`system`** — it does **not** build the full multi-component catalogue (see **`src/resolveBundle.ts`**). **`graphSystem` / `catalogue`** still use **`buildComponentCatalogue`** for the whole design.

## Component Catalogue

- **`variantTypes` / `components`:** emitted as **name-keyed objects** (not arrays) so emitters can use `catalogue.variantTypes["MyVariant"]` and `catalogue.components["Button"]`. The same pattern applies to **`resolvedComponent.system`** (`primitives`, `semantics`, `themes`, `typeStyles`, `variantTypes`).
- **`hidden` on `layout` frames:** `hidden = true | false | .true | .false | <variant condition>` hides the frame from catalogue **`children`** / variant **`children`** overrides and prunes it from nested **`childNodes`** trees, while every declared Root-level **`children = […]`** id remains a **`childNodes`** entry (subtree chosen from a scan where that node is visible when possible). **`pdl resolve --tree-only`** still returns the **full** materialised tree (including hidden nodes in **`children`** arrays) for debugging.
- **Variant / enum metadata:** top-level **`variantTypes`** plus per-param **`variantTypeName`** carry closed-set type names (declared with **`variant`** or **`enum`**) for emitters (e.g. Figma); catalogue JSON **`type`** stays **`"variant"`** as the discriminator (keyword-agnostic wire format).
- **External refs in trees:** catalogue trees use **`primitive:`** / **`semantic:`** string markers for frame properties whose RHS is a bare `primitive` / `semantic` identifier; composite RHS values are still fully resolved in v1.
- **CLI `modifiers`:** the catalogue’s **`primitives` / `semantics` / `themes` / `typeStyles`** graph is **not** modifier-aware; if **`buildComponentCatalogue`** is called with non-empty **`modifiers`**, **tree** resolution still uses **`buildResolvedTokenMap`** with those modifiers. Emitters that replay themes from JSON alone cannot reproduce modifier-specific trees unless they mirror that resolution path.
- **Variant deltas:** only **single-parameter** axes are expanded automatically against the default instance. Combined variant rows (e.g. `emphasis` + `size` interaction) must be authored explicitly; not generated yet.
- **`$ref` in `children`:** structural variant entries in the spec use `{ "$ref": "Label" }` for reuse. The current diff emits full child trees; emitters can still consume them, but JSON may be larger than the spec’s examples.
- **`expose` removed (language):** Rust rejects `expose` blocks. Catalogue may still emit transitional `expose: [all params]`. Prefer reading `params` / `emits`. TS oracle may still parse legacy `expose` until ported.
- **`rules` tags:** only **top-level** `tags =` / `tags.add` inside `rules C { … }` feed **`components[C].rules.tags`** today; tag lines inside nested `rules if { … }` arms are not merged into that array (see TODO in **`src/catalogue.ts`**).

## Companion blocks, typed samples, and `rules` / queries — implemented

**`fixtures`**, **`usage`**, **`rules`**, **`extend`**, and **`interaction`** are parsed in TS; Rust rejects **`expose`** (**`src/parser.ts`**), merged into **`DesignDefinition`** (**`src/loadDesign.ts`**), validated (**`src/validateDesign.ts`**), and emitted on **Component Catalogue** component rows (**`src/catalogue.ts`**: **`fixtures`**, **`usage`** / **`usageByKey`**, flattened **`rules`**, **`interactions`**). **`pdl graphSystem`**, **`catalogue`**, and **`graphComponent`** / **`resolve`** surfaces include this metadata where applicable.

**`samples`** banks are design-global (not per-component companions): merge/replace by bank name, paths `Bank.entry.field` in value / children / defaults / fixture bodies, catalogue root **`samples`**, empty arrays preserved under omitEmpty, unknown paths **PDL-E041**. See `shared/language-objects.json` `samples`.

Motion (play / keys / frame `animate`) and frame `effect` are locked in `language-objects.json` and implemented in both compilers. Layer `Blur()` remains an alias window (E1). Composite-token edges may still outpace the reference compiler in spots — see the gap notes below.

## Design manifest — thin only

The reference **`pdl manifest`** command emits the **thin** **`designManifest`** registry only (**`src/manifest.ts`**). A heavier “fat manifest” is **not** emitted; consume **`usage`**, **`fixtures`**, **`rules`**, and **`interactions`** from **Component Catalogue** JSON when you need them.

## Other minor notes

- **`grammar/pdl.ebnf`** `param-decl` shows a required `default-value`; `parameters` in language-objects also shows defaults for all illustrated parameters. Optional parameters without defaults are not implemented.
- **Theme `theme Name : Base`** optional second identifier is parsed (`baseTheme`) but not used for resolution (spec de-emphasises OO theme inheritance).

## Exploratory — Figma ↔ PDL round-trip

Property-level deltas for a possible Figma import/export bridge (colors, type styles, freeform vs auto-layout frames, sidecar ids). **Not** a language proposal and **not** tooling in-tree. See [`NOTES_FIGMA_PDL_ROUNDTRIP.md`](./NOTES_FIGMA_PDL_ROUNDTRIP.md).
