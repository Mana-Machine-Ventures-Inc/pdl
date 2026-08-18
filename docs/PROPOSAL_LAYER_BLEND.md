# Proposal: Blend modes on layer paints

**Status:** proposed — 2026-08-18  
**Depends on:** today’s `background` / `foreground` fill lists; `Color()` / `Ramp()` / `MediaLayer()`; HTML layer bands (`isolation: isolate` in `src/renderHtml.ts`)  
**Not Track M.** Paint. Do not fold into motion play/keys.  
**Not Track E.** A blend mode composites a fill; an Effect distorts.  
**Related:** [`PROPOSAL_FRAME_BLUR.md`](./PROPOSAL_FRAME_BLUR.md) (fills paint; effects sample)

Until this is accepted and locked in `shared/*.json` / `grammar/pdl.ebnf`, tooling must not treat the syntax as normative.

---

## 1. Problem

A hero photo with a brand multiply, a soft-light gradient over album art, a screen highlight on a media fill — those are ordinary design-system paints. PDL already has the stack:

```pdl
background = [
  MediaLayer(source: media.hero, contentMode: .cover),
  color.brand @ opacity.tint
]
```

The only compositor is **alpha**. `@` multiplies opacity. There is no way to say “this fill uses multiply against the paints already in this list.”

Workarounds are dishonest:

| Workaround | Why it fails |
|------------|----------------|
| Nested `Media` + `Layout @ 0.4` | Extra frames for a fill; alpha ≠ multiply |
| Pre-baked flattened asset | Not tokenizable; themes cannot remap the tint |
| Frame `opacity` | Fades children and chrome, not one fill |

Figma hangs blend on the fill (and separately on the layer/group). CSS has `mix-blend-mode` on a stacking-context sibling. SwiftUI has `.blendMode()` on a view. PDL needs the **fill** knob first, with a written rule for **who the backdrop is**.

---

## 2. Preferred metaphor

A **blend mode** is an attribute of a **paint**, not a paint, not a child, not an Effect, not a Motion.

Site line:

> `@` fades a fill. `blend:` chooses how that fill combines with paints **already drawn in the same band**. It does not reach up to children, and it does not stain the page behind the frame unless we later add a frame-level blend.

`background` and `foreground` stay ordered fill lists (bottom first). Hex stays source-over. Wrap with `Color(…)` when a solid needs an explicit compositor.

```pdl
background = [
  MediaLayer(source: media.hero, contentMode: .cover),
  Color(color: color.brand @ opacity.tint, blend: .multiply),
  Ramp(
    direction: .bottomToTop,
    stops: [
      GradientStop(color: #000, opacity: 0, position: 0),
      GradientStop(color: #000, opacity: 0.55, position: 1)
    ],
    blend: .softLight
  )
]
```

Opacity and blend stay orthogonal. `@` (or `opacity:` on `MediaLayer`) multiplies alpha; `blend:` picks the mix.

---

## 3. Three bounds (write these in the objects page)

Authors mash “under it” into one idea. The language should name three bounds.

**Paint order of one frame, back to front:**

```text
page / parent / siblings behind this frame
        ↓
background fills     [0] then [1] then [2] …
        ↓
children             title, icon, nested frames
        ↓
foreground fills     scrim, hover tint, …
```

A fill with `.multiply` combines **its own pixels** with the **backdrop** (already painted). It never changes anything painted later.

| Bound | Meaning | v1 |
|-------|---------|----|
| **Backdrop** | Who is already painted? | Earlier fills in the **same** `background` or `foreground` list |
| **Group** | Where does that compositing group stop? | Each band is isolated (Figma group **Normal**, not Pass Through) |
| **Mode** | Which math? | Closed `BlendMode` enum — portable intersection |

So:

| “Under” this fill | Hits with `.multiply`? |
|-------------------|------------------------|
| Earlier fills in the same `background = […]` | **Yes.** This is the feature. |
| Children of this frame | **No.** They paint later. Put the fill in `foreground`, or blend the child. |
| Page / sibling behind this frame | **No** in v1. Isolated band, then source-over onto the page. |
| Later fills in the same list | **No.** Those look *back* at this fill. |

A background tint **does** multiply onto the photo in the same list. It **cannot** darken the title sitting on top. That is paint order, not a missing flag.

### Pass-through (group policy, not a mode)

Figma’s default on a group is **Pass Through**: the group does not flatten; a multiply child can hit the file behind the group.

Figma **Normal** on a group (CSS `isolation: isolate`): flatten first — children only blend with each other — then place the result.

PDL’s HTML host already isolates each layer band. That is **Normal on the fill group**. Keep it.

```text
Isolated (v1)                         Pass-through (not v1)

wallpaper                             wallpaper
   └── [ photo × tint ]  one stamp       ├── photo
                                         └── tint × (photo + wallpaper)
```

Pass-through is **not** a `BlendMode` case. It is whether `background = […]` is a sealed picture or a hole in the page. Do not add `.passThrough`. A later slice may add frame-level isolation / `blendMode` for “this whole card multiplies onto the scene.”

---

## 4. Type

```pdl
enum BlendMode {
  case normal       // omit; source-over
  case multiply
  case screen
  case overlay
  case darken
  case lighten
  case softLight
  case hardLight
}
```

Not a token type in v1. Write `.multiply` at the use site. Themes remapping multiply → screen is not a real DS need.

**Optional labeled field `blend:`** on the layer constructors that paint:

| Constructor | `blend:` | Notes |
|-------------|----------|--------|
| `Color(color:, blend:)` | yes | Hex / Color token stays source-over; wrap to set blend |
| `Ramp(direction:, stops:, blend:)` | yes | Legal on Ramp tokens — Ramp is only a layer |
| `MediaLayer(source:, contentMode:, …, blend:)` | yes | Beside `opacity:` |
| `Blur(…)` / `Vibrancy(…)` | **no** | Sample / alias window, not a color paint |
| `Effect(…)` | **no** | Frame distortion |

Omit `blend:` or write `.normal` — same as today.

```pdl
Color(color: color.brand @ opacity.tint, blend: .multiply)
MediaLayer(source: media.hero, contentMode: .cover, blend: .overlay)
Ramp(direction: .bottomToTop, stops: […], blend: .softLight)
```

**Hex sugar** `#RGB` / `#RRGGBB` / `color.surface` / `color.surface @ opacity.tint` stay source-over. No second postfix.

**`@` is Opacity only.** `color.brand @ .multiply` stays illegal (rhs must be an Opacity token or 0…1).

**Color token vs layer wrapper.** `blend:` is a layer-paint field, not a Color. Reject:

```pdl
primitive color.brand: Color = Color(color: #E11, blend: .multiply)   // E005
text.color = Color(color: #E11, blend: .multiply)                    // E006
borderColor = Color(color: #E11, blend: .multiply)                   // E006
```

Legal token site is a Background / Foreground / Ramp / Media value:

```pdl
primitive color.brand: Color = #E11
semantic material.hero: Background = [
  MediaLayer(source: media.hero, contentMode: .cover),
  Color(color: color.brand @ opacity.tint, blend: .multiply)
]
```

Same Ramp with two blends → two tokens, or write the constructor twice. Same rule as `MediaLayer` already carrying `opacity:`.

---

## 5. Bottom fill and empty backdrop

Inside an isolated group the first fill’s backdrop is transparent. CSS `mix-blend-mode: multiply` against empty is a footgun (the fill can vanish).

**v1 host rule:** the first fill in a band is always drawn as `.normal`, even if `blend:` is set.

Do **not** make that a hard compiler error. Conditional lists and theme replace can make “who is first” unstable. A later lint may warn when a static one-fill list sets a non-normal blend.

---

## 6. Foreground

`foreground` uses the same constructors, so `blend:` comes for free.

Children are **already painted** when the foreground band draws. A multiply scrim *should* be able to hit type — that is the product reason to put blend on `foreground`.

v1 still **isolates the foreground band** (same as today). A fg multiply then only hits other fg fills; the flattened result source-overs onto children. Alpha scrims (`color.ink @ 0.2`) keep working.

**L2** (after L0–L1): if any foreground fill is non-`.normal`, drop `isolation` on that fg band so mix-blend sees children. Do not change the background band. Do not silently change compositing in L0.

Document L0 as: *foreground `blend:` is stacked fg paints only.*

---

## 7. What it is not

| Idea | Why not |
|------|---------|
| `color.brand @ .multiply` | `@` is Opacity (and child-mount opacity). |
| `background = [hero, Blend(.multiply)]` | Not a fill. Same smell as `Effect` in the list. |
| `blendMode = .multiply` on the frame in v1 | Different backdrop — the whole node vs the parent. |
| `.passThrough` as a BlendMode case | Group policy, not mix math. |
| `BlendMode` token type | Inline `.multiply` is enough. |
| `blend:` on `Blur` / `Vibrancy` / `Effect` | They do not paint a color the same way. |
| `Pose.blend` / motion overlay | Rest paint. No playhead. |
| Full Figma / CSS menu in v1 | Hosts disagree; start with the portable eight. |
| Porter-Duff (`destinationOut`, …) | Different family; mask/clip later. |
| Child `Pic @ .multiply` | `@` on a mount is frame opacity, not blend. |

---

## 8. Invalid

```pdl
color.brand @ .multiply
  // E006 / opacity rule — rhs of `@` is Opacity

background = [hero, Blend(mode: .multiply)]
  // E001 — no Blend constructor

background = [Blur(radius: 16, blend: .multiply)]
  // E005 — unknown label on Blur

sheet.blendMode = .multiply
  // E011 — unknown frame property in v1

primitive color.brand: Color = Color(color: #E11, blend: .multiply)
  // E005 — Color tokens do not carry blend

title.color = Color(color: color.ink, blend: .multiply)
  // E006 — `color` is a Color, not a layer list

Effect(.blurSelf, radius: 8, blend: .multiply)
  // E005 — Effect has no blend:
```

Unknown `.case` on `blend:` is the same unknown-enum path as `contentMode: .cover` (PDL-E006 / case list in `shared/frame-props.json` + language-objects).

No new diagnostic family in v1.

---

## 9. Host

| | HTML (C1) | SwiftUI (C2, later) |
|--|-----------|---------------------|
| Isolated band | keep `isolation: isolate` on `.pdl-layer-band` | `compositingGroup()` on the fill stack |
| Per-fill blend | `mix-blend-mode` on that fill’s absolutely positioned div | `.blendMode()` on that fill |
| Omit / `.normal` | no `mix-blend-mode` | no modifier |
| First fill in the band | force source-over | force `.normal` |
| Reduced motion | paint — do not strip | paint |

CSS names (kebab from camel):

| PDL | CSS `mix-blend-mode` |
|-----|----------------------|
| `.normal` | `normal` (omit) |
| `.multiply` | `multiply` |
| `.screen` | `screen` |
| `.overlay` | `overlay` |
| `.darken` | `darken` |
| `.lighten` | `lighten` |
| `.softLight` | `soft-light` |
| `.hardLight` | `hard-light` |

Do **not** use CSS `background-blend-mode` on one element. The host already paints one div per fill; `mix-blend-mode` matches that tree.

Held modes (parse as unknown until a later slice): `.hue` `.saturation` `.color` `.luminosity` `.colorDodge` `.colorBurn` `.plusDarker` `.plusLighter`, and Porter-Duff names.

---

## 10. Bake IR

Bake stays the stability boundary. Additive field only.

Today `Color(color: #E11)` evaluates to a bare hex so goldens stay small. **Keep that** when `blend:` is omitted or `.normal`.

When `blend:` is a non-normal case, emit a structured solid (the HTML flattener already has `kind: "solid"`):

```json
{ "kind": "solid", "color": "#E11D48", "blend": "multiply" }
```

`Ramp` and `MediaLayer` already bake as objects. Add optional `"blend": "softLight"` next to `direction` / `source`. Omit the key when normal.

Hex / `color @ opacity` strings unchanged.

Catalogue trees: same field on resolved layer objects. No new catalogue section.

---

## 11. Implementation (after accept)

Rust-first (A2 parity exists). One slice at a time. Rebuild `pdl-cli` + WASM after each compiler slice (`playground-rebuild` rule).

| Step | Deliverable | Done when |
|------|-------------|-----------|
| **L0** | Language lock + bake | `BlendMode` enum in language-objects + frame-props / ctor arg lists; `grammar/pdl.ebnf` `blend:` on Color / Ramp / MediaLayer; Rust parse + validate (reject on Blur / Vibrancy / Effect / Color token / `color` / `borderColor`); bake optional `blend`; goldens for accept + reject fixtures; TS oracle follows |
| **L1** | HTML + lab | `flattenLayerOps` / `renderLayerOpDiv` set `mix-blend-mode`; first op forced normal; isolation unchanged; `test-fixtures/pdl/lab/blend/` (photo × multiply, ramp soft-light, hex-without-blend control); Playground hard-refresh |
| **L2** | Foreground punch-through | If any fg fill is non-normal, omit `isolation` on the **fg** band only. Lab: multiply scrim over text. Skip until someone needs it. |
| **L3** | Frame `blendMode` | Whole node vs parent. Separate accept. Not L0. |
| **L4** | Wider enum / isolation policy | HSL set, dodge/burn, plus-darker; explicit pass-through / isolate on a band. Not L0. |

**L0 file map**

| Area | Files |
|------|--------|
| Lock | `shared/language-objects.json` (`BlendMode` enum; Color / Ramp / MediaLayer accept + reject; layers intro); `shared/frame-props.json` if ctor args are listed there; `shared/keywords.json` only if `BlendMode` becomes a token type (it should not in L0); `grammar/pdl.ebnf` (`layer-constructor`, `media-constructor-arg`, Color / Ramp args) |
| Docs gen | `npm run docs:gen` — objects + grammar |
| Rust | `crates/pdl-core/src/evaluate.rs` (`Color` → structured solid when blend set; Ramp / MediaLayer pass-through); `validate.rs` / `frame_props.rs` (legal labels + Color-token reject); parser only if ctor kwargs are allow-listed |
| TS oracle | `src/evaluate.ts`, `src/parser.ts` / frame-prop checks — keep bake JSON parity |
| HTML | `src/renderHtml.ts` — `LayerOp` + `mix-blend-mode` |
| Fixtures | `test-fixtures/pdl/atoms/` or `lab/blend/`; `test-fixtures/pdl/errors/` for E005/E006 cases |
| Goldens | `crates/pdl-core/tests/golden/` + TS bake goldens; existing Color()-without-blend goldens must not churn |

**L0 validate rules (normative once locked)**

1. `blend:` label legal only on `Color` / `Ramp` / `MediaLayer` calls.
2. Value is a `BlendMode` `.case` from the v1 list.
3. `Color(…, blend:)` is illegal as a `Color` token RHS and on frame props typed `color` (text `color`, `borderColor`, `Shadow.color`).
4. `blend:` + `opacity:` / `@` on the same `MediaLayer` / `Color` is legal (orthogonal).
5. Do not invent PDL-E020-style “double blend.”

**L1 host rules**

1. Read `op.blend`; skip `normal` / absent.
2. First fill in the band: ignore `blend`.
3. Keep `isolation: isolate` on both bands.

---

## 12. Teaching / lab (L1)

Minimum lab, one file each:

```pdl
// Hero: media + brand multiply (the 80% case)
component BlendHero() layout {
  width = 240
  height = 160
  background = [
    MediaLayer(source: atoms.media.hero, contentMode: .cover),
    Color(color: atoms.color.brand @ atoms.opacity.mid, blend: .multiply)
  ]
  children = []
}

// Control: same stack, alpha only — must not look like multiply
component BlendHeroAlpha() layout {
  width = 240
  height = 160
  background = [
    MediaLayer(source: atoms.media.hero, contentMode: .cover),
    atoms.color.brand @ atoms.opacity.mid
  ]
  children = []
}
```

README: backdrop = earlier fills; group = isolated band; title would *not* darken if mounted as a child.

Do not tell authors to “try the Playground” until L0–L1 are rebuilt into this repo’s `target/` and WASM.

---

## 13. Locked decisions (if accepted)

| Topic | Decision |
|-------|----------|
| Where | Optional `blend:` on `Color()` / `Ramp()` / `MediaLayer()` |
| Type | `BlendMode` enum, not a token type |
| v1 cases | `.normal` `.multiply` `.screen` `.overlay` `.darken` `.lighten` `.softLight` `.hardLight` |
| Default | Omit = `.normal` |
| `@` | Opacity only |
| Hex / Color token | Source-over; wrap `Color(…)` to blend a solid |
| Color token RHS | Must not carry `blend:` |
| Blur / Vibrancy / Effect | No `blend:` |
| Backdrop | Earlier fills in the same band |
| Group | Isolated bands (keep today’s HTML) |
| Pass-through | Not a mode; not v1 |
| First fill | Host treats as `.normal` |
| Foreground vs children | Isolated in L0–L1; L2 may lift fg isolation |
| Frame `blendMode` | L3, separate accept |
| Pose | No blend channel |
| Bake | Additive `blend` key; Color() stays hex unless non-normal blend |

---

## 14. Open questions (do not block L0)

| ID | Topic | Lean |
|----|--------|------|
| **Q1** | L2 fg isolation lift in the same accept, or wait for a real scrim? | Wait. Document L0. |
| **Q2** | Lint when a static first-or-only fill sets non-normal blend? | Later lint, not E00x. |
| **Q3** | `Color()` with `.normal` explicitly — still bake as hex? | Yes. |
| **Q4** | World A `Layout(background: Color(color: #E11, blend: .multiply))` | Same ctor args; no extra work. |

---

## 15. Pursuit notes

Risk: `Color()` today evaluates to a bare hex (`evaluate.rs` `CallCallee::Color => get("color")`). Non-normal `blend:` must switch to `{ kind: "solid", color, blend }` or the host never sees the mode. Omitting blend must not churn existing goldens.

Risk: flattening walks strings and objects. Teach `flattenLayerOps` `kind === "solid"` to read `blend` without treating every object as media.

Risk: dual-run TS vs Rust bake parity. Implement evaluate + validate in both before regenerating goldens.

Not in this proposal: blending a **child frame** into siblings (`Pic` with multiply onto the card photo). That is L3-shaped (frame compositor), not a fill field.
