# Proposal: Layout tween (`layout: .match`) + shared `match:` identity

**Status:** proposed (2026-08-19) — **author surface amended** by [`PROPOSAL_STATE_CHOREOGRAPHY.md`](./PROPOSAL_STATE_CHOREOGRAPHY.md) (`.nextRest` + host triage; do not teach authors `.paint` vs `.match`)  
**Motivating packs:** `test-fixtures/pdl/systems/ios26-lite` (`IosToggle` thumb; later photo → detail)  
**Depends on:** tree tween vs pose track ([`PROPOSAL_MOTION_PLAY.md`](./PROPOSAL_MOTION_PLAY.md)); Presenter two-node lane + `PresentationMotion` ([`PROPOSAL_ROUTING_PAGES_SCREENS.md`](./PROPOSAL_ROUTING_PAGES_SCREENS.md) §16, N8)  
**Role after choreography proposal:** this doc is the **FLIP / identity engine**; choreography is how authors steer state transitions.  
**Not a runtime.** Bake stays at rest. The host measures two rest trees and plays an overlay. Do not add an `Animation` type, layout algebra in `.pdl`, or springs.

Until locked in `shared/*.json` / `grammar/pdl.ebnf`, tooling must not treat this syntax as normative.

---

## 1. Problem

PDL already has two honest motion machines and one Presenter pair type:

| Machine | Ends | Path |
|---------|------|------|
| **Tree tween** | bake A → bake B | CSS `transition` on paint the browser can interpolate (fill, opacity) |
| **Pose track** | overlay poles | Author writes `translateX` / `scale` / … |
| **`PresentationMotion`** | incoming vs outgoing **pages** | Author writes pair poses/keys for the hole |

That set cannot **sensibly** move an iOS toggle thumb.

`IosToggle` parks the knob with **`justify = .start | .end`** and **reorders `children`**. That is correct HIG chrome (track color, AX on/off marks). It is also a **layout snap**: CSS will not interpolate `justify-content`, and swapping child order is a new tree, not a moved node.

Authors then reach for `Pose(translateX: 21)` — a **frozen overlay** that duplicates layout, breaks when padding/width change, and teaches “motion is fake numbers next to real layout.”

The same gap shows up one level up: **tap a thumbnail, expand into detail**. `PresentationMotion` can slide whole pages (`translateX: 390`). It cannot send **this** photo’s box to **that** header’s box unless the host **measures** both rest trees.

This proposal is one host idea with two sites, not a third motion value type.

---

## 2. Why this is scary (and why it is still small)

Nervousness is correct: “Smart Animate everything” would make every rebake a geometry morph (lists, Repeat, `nav` → `nav` across unrelated pages). That is Figma-shaped and PDL-hostile.

The **limit** we actually hit is narrower:

> When rest B is a **layout** of the same identity as rest A, Timing should be allowed to play **the measured delta**, not only paint and not only an authored Pose.

That is FLIP (First / Last / Invert / Play): snapshot rects, apply the new bake, invert with `transform`, play to identity on the existing clock (`duration` / `ease`). Bake IR does not learn layout. Pose does not grow `left:` / `justify:`.

**Complexity we refuse:**

| Add | Do not add |
|-----|------------|
| Opt-in layout tween on **tree-tween** Motions | Implicit Smart Animate on every `animate =` |
| Opt-in match lane on **`PresentationMotion`** | Default page turns that morph all same-named lets |
| Optional frame field `match:` (identity stamp) | Matching by `instanceOf`, URL, or let name as the only contract |
| Unique `match:` per tree (bake error) | Runtime id allocation, ticking, Number algebra |

If we cannot explain a clip as “Timing + measured boxes + optional stamps,” it does not belong here.

---

## 3. Taxonomy (so we do not misuse Pose)

| Family | Example | Number / box means | Tool |
|--------|---------|-------------------|------|
| **A. Flourish** | Press shrink, hover lift | Authored overlay | **Pose / keys** |
| **B. Paint change** | Track green ↔ gray, label color | CSS-interpolable props | **Tree tween** (today) |
| **C. Same instance, new layout** | Toggle thumb, chip reorder that keeps lets | Measured rect A → rect B | **`layout: .match`** on handler Motion |
| **D. Two pages, shared element** | Thumb `Media` → detail header | Measured rect on page A → rect on page B | **`PresentationMotion` + `match:`** |
| **E. Whole-page choreography** | Nav push 390px | Authored pair poses | **`PresentationMotion` incoming/outgoing** (unchanged) |

C and D share a **player** (FLIP). They do not share a **site**. C is in-place rebake of one component. D is the N8 two-node hole.

**Pose is the wrong tool for C and D** unless the travel is a flourish on top of layout (a press scale *while* the thumb also FLIPs — v1: pick one overlay per node, see §6).

---

## 4. Preferred metaphor

### 4.1 Bake is still rest

The design file describes **two stills**. The host, given Timing, may **interpolate geometry it can identify**. Authors do not write `1 - value` or `x = width - knob`.

### 4.2 Identity is optional and explicit

**Let names stay local** (`thumb` vs `header`). Connecting two frames across states is a **stamp**, not a naming coincidence.

SwiftUI `matchedGeometryEffect`, Flutter `Hero(tag:)`, CSS `view-transition-name` — not Figma “same layer name.”

The stamp is a **bake-known scalar** (literal, param, Repeat item field). Not the image URL (asset ≠ identity). Not a computed layout expression.

```pdl
// Grid — let name is local
let thumb = Media(source: photo.url, match: photoId)

// Detail — different let, same contract
let header = Media(source: photo.url, match: photoId)
```

Host: `data-pdl-match="{evaluated}"`. Crossing: outgoing `Y` ↔ incoming `Y`.

**URL as id** is allowed (`match: photo.url`) and brittle (crop vs full-res). Prefer a catalog / param id.

### 4.3 Let-name intersect is a fallback, not the contract

Matching every `let nav` across Home and Settings is how Smart Animate surprises people. v1 Presenter match uses **`match:` stamps only**. A later `.lets` fallback can exist for toy frames; packs should not rely on it.

### 4.4 One clock

No new type. `Motion` / `PresentationMotion` already carry Timing. `layout: .match` means “also FLIP identified nodes.” Unidentified nodes keep today’s behavior (paint tween, or incoming/outgoing poses).

---

## 5. Two sites — keep them apart

### 5.1 In-place: handler `Motion` + `layout: .match`

Toggle / any param flip on the **same** component instance:

```pdl
enum LayoutTween {
  case paint   // today — CSS transition; layout snaps
  case match   // FLIP lets that exist in bake A and bake B
}

self.pressEnd = {
  animate = Motion(duration: 200, ease: .out, layout: .match)
  if isOn { isOn = false } else { isOn = true }
}
```

- **Default `layout` is `.paint`.** Existing labs do not change.
- Tokens omit `layout` so the site default applies.
- Identity for C: **stable `let` ids** that exist in both stills (`knob`). Reorder/justify may snap in bake; FLIP still slides `knob` if the node is not destroyed.
- `IosToggle` can keep HIG `justify` + child shuffle **if** `knob` remains a named let in both branches.

Illegal on the **same** Motion: `layout: .match` **and** `pose:` / `keys:` (PDL-E005). Two invert matrices on one node. Flourish on a **child** (`knob.animate = Motion(pose: Pose(scale: 0.96))`) vs parent match is a later compose rule; v1 forbid mixing on one Motion.

Not a site for `appear` / `dismiss` (those already mean pose poles).

### 5.2 Crossing: `PresentationMotion` match lane

Photo expand is **not** 5.1. Source rect is on **page A**, dest rect on **page B**. N8 already: keep outgoing DOM, mount incoming, play, commit.

```pdl
semantic motion.heroPush: PresentationMotion = PresentationMotion(
  incoming: Pose(opacity: 0),      // unmatched incoming chrome
  outgoing: Pose(opacity: 0.4),    // unmatched outgoing chrome
  layout: .match,                  // FLIP `match:` pairs
  front: .incoming
)

openPhoto(photoId: PhotoId) = {
  presenter.push(PhotoDetail(photoId: photoId), move: motion.heroPush)
}
```

- Pair **poses apply to unmatched** page chrome (and page roots that are not a match).
- **Matched nodes opt out of the whole-page `translateX`.** Do not double-transform.
- `front` / `switchAt` unchanged — hero usually `.incoming` so the expanding photo sits above the fading grid.
- `.reversed` for dismiss: swap First/Last (measure incoming as First on the way back). **Do not** reverse authored `keys:` (already the N8 rule).

**Default page turns stay authored poses.** `layout: .match` is opt-in on the token / `move:`.

`retainPrior: true` / cover: out of v1 (same as N8: no pair clip on retain).

---

## 6. `match:` on frames

```pdl
// frame field on Layout, Media, Icon, instance root (World A kwargs / kind body)
match = photoId
match = "knob"
```

| Rule | Choice |
|------|--------|
| Optional | Unmarked nodes never FLIP across pages |
| Unique in one tree | Two `match: Y` on the same component bake → error |
| One pair per crossing | One outgoing `Y` and one incoming `Y`; extra → error |
| Namespace | **This Presenter hole / this rebake**, not the whole pack (two tabs may both use `"hero"`) |
| Repeat | Stamp `match: item.id` (or emit id). Index `Root_Photo_3` is **not** the key |

In-place (5.1) may **omit** `match:` and use let identity (`knob` ↔ `knob`). Cross-page (5.2) **requires** stamps so `thumb` can pair with `header`.

---

## 7. Host contract (FLIP)

1. **First** — snapshot identified nodes: id (`let` and/or `data-pdl-match`) + `getBoundingClientRect()` + paint worth tweening (fill, opacity, image).
2. Apply next bake / pin (layout **jumps** to rest B).
3. **Last** — measure the same ids in the new tree (incoming page may be `opacity: 0` but **must be laid out** in the hole).
4. **Invert** — `transform` from old box to new (translate + scale to reconcile size).
5. **Play** — pair/handler Timing; then drop the overlay. Paint tween can run in parallel (track color).
6. **Unmatched** — `.paint` CSS transition and/or incoming/outgoing poses.
7. **Interrupt** — same as pose cancel: live overlay snapshot is the next `from`.

Reconcile must **not** replace matched DOM nodes (already true for pointer listeners). Identity **is** the feature.

SwiftUI later: `matchedGeometryEffect` is the native cousin — same IR meaning, different player. Do not invent a second renderer in HTML; reuse WAAPI / `snapshotToCss` transform list.

---

## 8. Motivating before / after

**Toggle today (layout snap):**

```pdl
if isOn {
  justify = .end
  children = [axOn, Spacer(), knob]
} else {
  justify = .start
  children = [knob, Spacer(), axOff]
}
self.pressEnd = {
  if isOn { isOn = false } else { isOn = true }
}
```

**Toggle with layout tween (stills unchanged):**

```pdl
// same if / children / justify
self.pressEnd = {
  animate = Motion(duration: 200, ease: .out, layout: .match)
  if isOn { isOn = false } else { isOn = true }
}
```

**Photo → detail (stamps, not shared let names):**

```pdl
component PhotoCell(photo: Photo) layout {
  let thumb = Media(source: photo.url, match: photo.id)
  children = [thumb]
  self.pressEnd = { emit openPhoto(photo.id) }
}

page PhotoDetail(photoId: PhotoId = .none) layout {
  let header = Media(source: photo.url, match: photoId)
  children = [header]
}
```

Grid without a stable `photo.id` on the tapped cell cannot expand “the right” thumbnail. That is identity, not interpolation.

---

## 9. What this does *not* unlock

- Pose fields for layout (`justify`, `left`, `%` of parent) — still Q16 / out of band.
- Silent morph of every tree tween or every `replace`.
- Matching by `component` type or Media URL as the **primary** key.
- Springs, motion paths, 3D, `Choreography` of unnamed clips.
- `layout: .match` as the default `PresentationMotion` (nav push stays 390px poses).
- Repeat-stable identity without author keys / `match:` on the cell.

---

## 10. Validation

| Check | Intent |
|-------|--------|
| `layout: .match` + `pose:` / `keys:` on one Motion | PDL-E005 |
| Duplicate `match:` in one component tree | Bake/load error |
| Two incoming or two outgoing with the same `match:` at a crossing | Host diagnostic; do not morph 1:N |
| `layout: .match` on `appear` / `dismiss` | Reject or ignore (lean: reject) |
| `match:` value not string-like at bake | E040 / unresolved ident |

Playground: reduced motion already replaces `PresentationMotion` tokens wholly — a fade token with `layout: .paint` is the escape hatch.

---

## 11. Lock / implementation sketch (when accepted)

| Slice | Deliverable |
|-------|-------------|
| **L0** | Grammar + `frame-props`: optional `match:`; unique-in-tree; HTML `data-pdl-match` |
| **L1** | Handler `Motion` `layout: .paint \| .match`; E005 vs pose; **lab: `IosToggle`** |
| **L2** | HTML FLIP on in-place rebake (let identity); interrupt/reverse |
| **L3** | `PresentationMotion.layout: .match`; N8 lane + stamps; unmatched poses |
| **L4** | Photo lab: Repeat cell `match: id` + `push(Detail(id), move: heroPush)` + dismiss `.reversed` |

Do **not** start L3 until L1/L2 prove the toggle. If L1 is enough for chrome and L3 stays scary, **stop**. Photo-expand is the justification for stamps + Presenter, not for complicating `Motion` further.

---

## 12. Open questions

| # | Question | Lean |
|---|----------|------|
| **Q1** | Default Presenter match = all `match:` stamps, or require `match: [hero]` list on the Motion? | **All stamps in the hole** (unique-per-tree already limits blast radius) |
| **Q2** | In-place: let identity only, or also `match:`? | **Lets first**; `match:` mainly for L3 |
| **Q3** | Scale in FLIP (size change) vs translate-only? | **Translate + scale** (photo expand); toggle is mostly translate |
| **Q4** | `match` type: `String` only vs variant/Number stringified? | **String + Number + variant case** as stable stringify |
| **Q5** | Mix child pose flourish with parent FLIP in v1? | **No** — one overlay owner per node |
| **Q6** | Let-name fallback `.lets` on PresentationMotion? | **Defer** — teach stamps |
| **Q7** | Field name `match:` vs `identity:` vs `hero:`? | **`match:`** (short; not only heroes) |

---

## 13. Summary

- The toggle reveals a **real limit**: tree tween does not move layout; Pose duplicates layout with magic pixels.
- The fix is **opt-in FLIP** on two rest bakes, same Timing, **not** a new motion type and **not** default Smart Animate.
- **In-place** (`IosToggle`): `animate = Motion(…, layout: .match)` + stable lets.
- **Cross-page** (photo → detail): `PresentationMotion(…, layout: .match)` + optional **`match:`** so frames connect **without** identical let names.
- Identity is a **frozen stamp**, unique per tree, namespaced to the hole. Repeat needs that stamp (or an item id), not `Root_N`.
- Ship toggle first. If that is all we need, **do not take the Presenter slice**.

**Binding:** proposal text is intent until lock files + goldens exist per slice.
