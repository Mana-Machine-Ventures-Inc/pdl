# Proposal: State choreography — land on next rest

**Status:** proposed (2026-08-19)  
**Motivating cases:** page-dot color flip; `IosToggle` move + color; any fun press that ends in a new param still  
**Depends on:** Animation / Pose / Motion ([`PROPOSAL_MOTION_PLAY.md`](./PROPOSAL_MOTION_PLAY.md) hard cut); rebake identity + FLIP triage ([`PROPOSAL_LAYOUT_TWEEN.md`](./PROPOSAL_LAYOUT_TWEEN.md))  
**Amends:** [`PROPOSAL_LAYOUT_TWEEN.md`](./PROPOSAL_LAYOUT_TWEEN.md) author surface — drop `.paint` / `.match` as something authors choose  
**Not a runtime.** Bake stays at rest. The host plays a clip, then the new still is the truth.

Until locked in `shared/*.json` / `grammar/pdl.ebnf`, tooling must not treat this syntax as normative.

---

## 1. Goal

Make **interesting transitions between states** easy. Authors should think about **what they see and how the clip unfolds**, not about paint vs match vs pose machines.

**Ideal reading:**

```pdl
self.pressEnd = {
  animate = [
    Pose(scale: 1.12),
    Pose(scale: 0.96),
    .nextRest                 // land on the still after the flip
  ]
  selected = !selected
}
```

Meaning:

1. Temporarily take this object through these poses (fun / dynamic beats).
2. **Land on the new rest** defined by the mutation that follows (or accompanies) the clip — new fill, new layout, new position.
3. The host decides whether that landing needs paint tween, FLIP, or both. The author does not name those.

Page dots (color only), toggles (move + color), and press flourishes that settle into a new chrome share **one story**.

---

## 2. Why today’s split feels wrong

| Today | Author pain |
|-------|-------------|
| Pose / keys → `.rest` | `.rest` = clear overlay on the **current** bake — not “go to the new state” |
| `if selected { background = … }` | Instant snap; Pose opacity pulse is a fake fade and fails for red→blue |
| `layout: .paint \| .match` | Forces authors to classify the change; color is always paint; match is about boxes |

Authors do not want three APIs. They want: **beats → new still**.

---

## 3. Site line

> **`animate = [ …poses…, .nextRest ]` plus a param write** means: play temporary poses, then settle into the post-mutation still. Host triage (paint / FLIP) is invisible. Pose is the middle; **next rest is the destination.**

---

## 4. Semantics

### 4.1 Two destinations (keep them distinct)

| Token | Meaning |
|-------|---------|
| **`.rest`** (today) | Clear the **pose overlay** (identity transform) on whatever bake is showing. Flourish settle without a state change. |
| **`.nextRest`** (this proposal) | **Arrive at the post-mutation still** — paint and layout of bake B after the handler’s param writes. |

Do not overload `.rest` to mean both. Teaching: `.rest` = “drop the flourish”; `.nextRest` = “become the new state.”

### 4.2 Handler order (canonical)

```pdl
self.pressEnd = {
  animate = [ Pose(…), Pose(…), .nextRest ]
  selected = !selected          // or emit that causes the same rebake
}
```

**Host contract:**

1. **Capture First** — current DOM (rects + paint) for this target (and identified descendants).
2. **Apply mutation** — run param writes / emit capture effects so bake B exists (may be sync instance-resolve).
3. **Measure Last** — bake B rects + paint.
4. **Play beats** — authored middle Poses as overlay (or WAAPI keyframes) on the target.
5. **Land `.nextRest`** — interpolate from the last beat (or from First if no middle beats) to Last: paint always where CSS can; FLIP only if an identified box’s rect changed.
6. Drop overlays; bake B is truth.

Authors may write the mutation **above** the `animate =` line; semantics are the same as long as the clip is declared in the same handler body (one choreography). Prefer mutation **after** `animate =` in examples so the file reads “clip, then new state.”

### 4.3 Clock-only form (no fun beats)

```pdl
self.pressEnd = {
  animate = Motion(duration: 200, ease: .out)   // sugar: [.nextRest] with this clock
  selected = !selected
}
```

Same landing triage; no middle Poses. This replaces author-facing `layout: .paint` / `.match`.

### 4.4 Host triage (invisible)

| Observation First → Last | Landing does |
|--------------------------|--------------|
| Paint differs (fill, opacity, …) | CSS / WAAPI paint tween |
| Identified box rect differs | FLIP (translate + scale) |
| Both | Both, same clock |
| Neither | Snap / no-op landing |

**Identity for FLIP:** stable `let` ids in-place; optional `match:` stamps for crossings ([`PROPOSAL_LAYOUT_TWEEN.md`](./PROPOSAL_LAYOUT_TWEEN.md) §5–6). No Smart Animate of unnamed chrome.

### 4.5 Flourish-only (no state change)

```pdl
self.pressEnd = {
  animate = Animation(keys: [
    Motion(duration: 120, ease: .out, pose: Pose(scale: 1.08)),
    Motion(duration: 160, ease: .out, pose: .rest)
  ])
}
```

Unchanged. Ends on **`.rest`**, not `.nextRest`. No mutation → no “new still.”

### 4.6 Emit + parent rebake (page dots)

```pdl
// child
self.pressEnd = {
  animate = [ Pose(scale: 1.15), .nextRest ]
  emit select(page)
}

// parent ForEach
dot.select(page: Number) = { currentPage = page }
```

Child’s `.nextRest` lands on the still after **its** params update (`selected` via parent overlay). Host must treat emit → parent write → child instance-resolve as the mutation for that clip (same First/Last contract). If the landing target is only meaningful on the parent, parent capture may own the `animate =` — v1 lean: **clip on the node that visually changes** (the dot).

---

## 5. Syntax (lean)

### 5.1 Preferred teaching form

Pose list with a final land token:

```pdl
animate = [
  Pose(scale: 1.12),
  Pose(scale: 0.96, rotate: -4),
  .nextRest
]
```

Desugars to one `Animation` whose last segment’s destination is **next rest** (not overlay identity), with a shared default clock or per-beat Motion wrappers as needed.

### 5.2 Explicit clocks on beats

```pdl
animate = Animation(
  keys: [
    Motion(duration: 90, ease: .out, pose: Pose(scale: 1.12)),
    Motion(duration: 140, ease: .out, pose: Pose(scale: 0.96)),
    Motion(duration: 200, ease: .out, pose: .nextRest)
  ]
)
```

### 5.3 Reject / avoid

| Form | Why |
|------|-----|
| `.rest` as “go to selected” | Wrong meaning — keep overlay clear |
| Author `layout: .paint \| .match` | Triage belongs in the host |
| `.nextRest` without a mutation in the same handler (or linked emit) | Nowhere to land — PDL-E00x |
| `.nextRest` + `.rest` as the same token | Teaching collapse |

---

## 6. Relation to layout-tween proposal

| [`PROPOSAL_LAYOUT_TWEEN.md`](./PROPOSAL_LAYOUT_TWEEN.md) | This proposal |
|---------------------------------------------------------|---------------|
| Families A–E and FLIP player | **Keep** (host machinery) |
| Author picks `layout: .match` | **Drop** — triage under `.nextRest` / clock-only Motion |
| `match:` stamps / let identity | **Keep** (who can FLIP) |
| Toggle / photo labs | **Keep** as proving grounds; rewrite author lines to choreography form |

Layout-tween becomes an **implementation chapter** of this goal, not a second mental model for authors.

---

## 7. Non-goals

| Allowed | Not in v1 |
|---------|-----------|
| Fun beats then new still | Springs, motion paths, 3D |
| Host paint + FLIP triage | Author “Smart Animate everything” |
| `.nextRest` on handler clips | `.nextRest` on standing frame `animate` / forever loops |
| In-place param + emit-driven rebake | Implicit morph across unrelated Presenter pages without `match:` |
| Interrupt = next First from live overlay | Parallel competing `.nextRest` on the same node |

---

## 8. Diagnostics (sketch)

| Code | Intent |
|------|--------|
| new | `.nextRest` in a handler with no param write / emit / known rebake effect |
| new | `.nextRest` on `appear` / `dismiss` / standing animate |
| reuse E005 | Mixing unclear land tokens; or pose forever + `.nextRest` |
| layout-tween checks | Duplicate `match:`; 1:N match at crossing |

---

## 9. Implementation slices

| Slice | Deliverable |
|-------|-------------|
| **S0** | Lock vocabulary: `.nextRest` vs `.rest`; amend layout-tween (no author `layout:` enum); language-objects site lines |
| **S1** | Host: First → mutate → Last → land clock-only (paint + FLIP-if-needed). **Lab: page dots color** + **IosToggle** |
| **S2** | Middle Pose beats before `.nextRest` (list sugar or Animation keys). **Lab: bounce then land** |
| **S3** | Emit → parent → child rebake as mutation for child-owned clips |
| **S4** | Presenter crossing: `.nextRest` N/A; keep `PresentationMotion` + `match:` from layout-tween L3–L4 |

**Do not** ship Pose-list sugar (S2) before S1 landing works — otherwise authors decorate a snap.

**Do not** reintroduce author-facing `.paint` / `.match`.

---

## 10. Open questions

| # | Question | Lean |
|---|----------|------|
| **Q1** | Spell land as `.nextRest`, `.newRest`, or `pose: .still`? | **`.nextRest`** — reads as destination after the write |
| **Q2** | Bare `[Pose, Pose, .nextRest]` vs require `Animation(keys:)`? | Allow list sugar that desugars; keep Animation as full form |
| **Q3** | Default duration when list omits clocks? | Pack / prelude `timing.ui` (e.g. 200ms `.out`); override per Motion |
| **Q4** | Mutation before or after `animate =` in source? | Same handler = one clip; examples put animate first |
| **Q5** | Reduced motion | Skip middle beats; land with 0s or opacity-only fade token |
| **Q6** | Can `.nextRest` target a child (`dot.animate = […, .nextRest]`) while mutation is on `self`? | Yes — First/Last for that let’s box + paint |

---

## 11. Summary

- **One author story:** fun poses, then **land on the new still**.
- **`.nextRest`** ≠ today’s **`.rest`** (overlay clear).
- **Paint vs FLIP** = host triage under that landing, not an author enum.
- **Clock-only** Motion is the no-flourish form of the same idea.
- Layout-tween FLIP + `match:` stay as **engine**; this proposal is the **steering wheel**.
