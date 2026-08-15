# Proposal: Frame `effect` (blur self / blur behind / glass)

**Status:** accepted — E0 + E2 + E3 lab / `effect.frost` shipped (2026-08-14; third revision — Effect on the frame, not in the fill list)  
**Depends on:** frame `opacity`; today’s `Blur()` layer; `Pose.blur` (Track M)  
**Not Track M.** Paint. Do not fold into motion play/keys.

---

## 1. Problem

PDL has two blurs in two different places. That is the smell.

| Today | Where | What it blurs |
|-------|--------|----------------|
| `Blur(radius:)` | `background` / `foreground` **fill list** | What’s behind the frame |
| `Pose(blur:)` | Motion overlay | This node’s pixels, only while playing |

A standing “soften this photo” has nowhere honest to live. Putting it next to Color in `background` is wrong — Color paints; blur does not. Putting only the *behind* case in the fill list, and the *self* case on the frame, is the same kind of thing split across two slots.

Figma already treats them as one family: **Effects** on the layer — Layer blur, Background blur, Glass. Not fills. Not children.

---

## 2. Preferred metaphor

An **Effect** is a paint-time distortion on a frame. It is not a fill, not a child, not a Motion.

The first argument is **what is sampled**:

| Case | Samples | Figma | CSS |
|------|---------|-------|-----|
| `.blurSelf` | This frame’s own pixels | Layer blur | `filter: blur()` |
| `.blurBehind` | What’s behind this frame | Background blur | `backdrop-filter` |
| `.glass` | What’s behind + lighting / refraction | Glass | host glass (later) |

```pdl
photo.effect = Effect(.blurSelf, radius: 8)

sheet.effect = Effect(.blurBehind, radius: 16)
sheet.background = color.surface @ 0.7

panel.effect = Effect(.glass)
```

`background` / `foreground` stay **paints** (Color, Ramp, Media). Effect comes off that list.

Site line:

> `opacity` fades the node. An **Effect** distorts. `.blurSelf` softens the node. `.blurBehind` and `.glass` are panes over what’s behind.

---

## 3. Why not a child, why not a fill

**Not a child.** `children` are frames (size, position, kind). An Effect has no box of its own. Figma does not put “Background blur” in the layer list as a sibling; it hangs the effect on the selected layer.

A frosted strip over part of a card is still a **child layout** that *wears* the effect:

```pdl
let pane = Layout(
  width: .fill,
  height: 48,
  position: .absolute,
  background: #FFFFFF @ 0.4
)
pane.effect = Effect(.blurBehind, radius: 16)
children = [body, pane]
```

**Not a fill.** Color / Ramp / Media draw. `.blurBehind` and `.glass` sample. Mixing them in one array made `Blur()` look like a tint. Tint stays a Color beside the frame; the pane is `effect`.

**Not `VisualEffect` / `Filter` / `Backdrop`.** Effect matches Figma’s umbrella and scales to glass. Filter means content pixels only. Backdrop names only the behind case.

---

## 4. Type

```pdl
enum EffectKind {
  case blurSelf
  case blurBehind
  case glass      // later; lighting fields TBD
}

Effect(
  .blurSelf | .blurBehind | .glass,
  radius: Radius,           // required on blur cases; glass may use its own fields
  vibrancy: Vibrancy?       // optional; stays on the Effect, not a sibling fill
)
```

**Frame property `effect`**

- Legal on: `layout`, `text`, `icon`, `media` (same kinds as `opacity`)
- Type: `Effect` (or an Effect token)
- Omit / `null`: no effect
- `if` omit: same as frame `animate` — condition false → field absent

**Sugar:** `blur = 8` is `effect = Effect(.blurSelf, radius: 8)`. Keep the short spelling for the common content case. `blur =` and `effect = Effect(.blurSelf, …)` together are E005 (one slot).

**How many:** v1 is **one `effect` per frame** (like one `animate`). Figma allows layer blur *and* background blur together; if we need both, the next cut is `effects = […]` with at most one self-channel and one behind-channel (`.blurBehind` and `.glass` share the behind slot — Figma’s rule).

```pdl
primitive effect.frost: Effect = Effect(.blurBehind, radius: 20)

component Hero(locked: Bool = false) layout {
  let photo = Media(source: hero, width: .fill, height: 180)
  children = [photo]
  if locked {
    photo.effect = Effect(.blurSelf, radius: 10)
    // or: photo.blur = 10
  }
}

component Sheet() layout {
  background = color.surface @ 0.65
  effect = effect.frost
  children = [title, body]
}
```

World A: `Layout(effect: Effect(.blurBehind, radius: 16), background: #FFF @ 0.5, children: […])`.

---

## 5. Rest vs overlay (Pose)

`Pose.blur` is the motion overlay on the **self** channel only. It does not drive `.blurBehind` / `.glass`.

| | Rest (bake) | Overlay (Motion) |
|--|-------------|------------------|
| Self blur | `effect` if `.blurSelf`, else `blur = n`, else 0 | `Pose.blur` |
| Behind / glass | `effect` if `.blurBehind` / `.glass` | none in v1 |

Appear from `Pose(blur: 18)` on a node with `blur = 4` (or `Effect(.blurSelf, radius: 4)`) plays **18 → 4**.

`.blurBehind` is paint, not a pose field. Do not add `Pose.backdropBlur`.

---

## 6. What it is not

| Idea | Why not |
|------|---------|
| `Effect` in `children` | Not a frame. Wear it on a child layout. |
| `Effect` in `background` / `foreground` | Fills paint; effects distort. `Blur()` leaves that list. |
| `blur = 12` as the *only* API | Covers self, not behind / glass. |
| `background = [Blur(…)]` forever | Same asymmetry this revision fixes. |
| `Filter` / `VisualEffect` / `Backdrop` as the type | Effect is the umbrella; cases name the sample. |
| `effects =` in v1 | One `effect` first. List when self+behind must coexist. |
| Standing blur only via Motion | Forces a playhead for a rest look. |

---

## 7. Host

| Case | HTML | SwiftUI (later) |
|------|------|-----------------|
| `.blurSelf` | `filter: blur(Npx)` | `blur(radius:)` |
| `.blurBehind` | `backdrop-filter: blur(Npx)` | material / `background { … }` |
| `.glass` | later | `glassEffect` |
| `Pose.blur` | WAAPI `filter` → rest self blur | overlay |

Reduced motion: Effect is paint. Do not strip it.

---

## 8. Invalid

```pdl
background = [Effect(.blurBehind, radius: 16)]   // E006 — Effect is not a layer
children = [Effect(.blurSelf, radius: 8)]        // E001 — not a frame
photo.blur = 8
photo.effect = Effect(.blurSelf, radius: 8)      // E005 — one slot
photo.effect = Effect(.blurSelf, radius: 8)
photo.effect = Effect(.blurBehind, radius: 16)   // last write wins in v1; use effects: later
Blur(radius: 16)                                 // gone after alias window — write Effect(.blurBehind, …)
```

---

## 9. Implementation (after accept; after M4)

| Step | Deliverable |
|------|-------------|
| **E0** | Type `Effect` + `EffectKind`; frame prop `effect`; sugar `blur = n` → `.blurSelf` — **shipped** |
| **E1** | Migrate `Blur()` layer → `Effect(.blurBehind, radius:)`; alias then E005 — **alias window open** (`Blur()` still legal in a fill list) |
| **E2** | HTML: self `filter`, behind `backdrop-filter`; Pose rest = baked self blur — **shipped** |
| **E3** | Tokens / teaching: `effect.frost` lab shipped; `material.sheet` = Color tint **plus** `effect` on the frame still later |
| **E4** | `.glass` when the host can draw it — parse + **E005** until then |

`material.sheet` today is a Background token (`[blur, color]`). After this cut it becomes a frame recipe: fill + `effect`, not a single Background value. That token migration is E3, not E0.

---

## 10. Locked decisions (if accepted)

| Topic | Decision |
|-------|----------|
| Type | `Effect` on the frame (`effect =`) |
| Cases | `.blurSelf`, `.blurBehind`, later `.glass` |
| Fills | Color / Ramp / Media only — no Effect in the layer list |
| Children | Frames only — no Effect child |
| Sugar | `blur = n` → `.blurSelf` |
| v1 arity | One `effect` per frame |
| Behind slot | `.blurBehind` and `.glass` exclusive (Figma) |
| `Blur()` | Alias to `.blurBehind`, then remove |
| Pose.blur | Self channel only; rest = baked self blur |

---

## 11. Pursuit notes

Likely files: `shared/frame-props.json`, `shared/language-objects.json`, `shared/keywords.json`, `grammar/pdl.ebnf`, layer validate (reject `Blur` / `Effect` as a fill), `src/renderHtml.ts` (move backdrop off the layer band and onto the frame), `crates/pdl-core/src/frame_props.rs`.

Risk: today’s HTML paints `Blur()` as a **layer band** (`backdrop-filter` on a sibling). Frame `effect` paints on the frame box instead. Same look for a full-bleed sheet; different stacking if someone stuffed `Blur()` between two fills. E1 goldens must pin that.
