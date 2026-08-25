# Proposal: State choreography — land on `.rest`

**Status:** accepted (2026-08-19) — **S0–S3 shipping**; **parallel tracks** (2026-08-20); S4 (Presenter match) deferred  
**Motivating cases:** page-dot color flip; `IosToggle` move + color; any fun press that ends in a new param still  
**Depends on:** Animation / Pose / Motion ([`PROPOSAL_MOTION_PLAY.md`](./PROPOSAL_MOTION_PLAY.md) hard cut); rebake identity + FLIP triage ([`PROPOSAL_LAYOUT_TWEEN.md`](./PROPOSAL_LAYOUT_TWEEN.md))  
**Amends:** [`PROPOSAL_LAYOUT_TWEEN.md`](./PROPOSAL_LAYOUT_TWEEN.md) author surface — drop `.paint` / `.match` as something authors choose; unify land on **`.rest`**  
**Not a runtime.** Bake stays at rest. The host plays a clip, then the still after the handler is the truth.

Normative teaching: `shared/language-objects.json` `motion`. Clock-only `animate = Motion(duration:, ease:)` is locked land sugar.

**Parallel tracks (2026-08-20):** every `animate =` that fires in the same interaction turn is an independent track. Tracks **start together**. Within one Animation / pose list, keys stay sequential. Paint/FLIP land is **not** delayed by another clip’s flourish. Intentional sequencing via completion handlers is deferred.

---

## 1. Goal

Make **interesting transitions between states** easy. Authors should think about **what they see and how the clip unfolds**, not about paint vs match vs pose machines.

**Ideal reading:**

```pdl
self.pressEnd = {
  animate = [
    Pose(scale: 1.12),
    Pose(scale: 0.96),
    .rest                      // land on the still after this handler
  ]
  selected = !selected
}
```

Meaning:

1. Temporarily take this object through these poses (fun / dynamic beats).
2. **Land on `.rest`** — the bake that is true when this handler finishes (new fill / layout / position if params flipped; same chrome if not).
3. The host decides whether that landing needs paint tween, FLIP, or both. The author does not name those.

Page dots (color only), toggles (move + color), hover settle (no flip), and appear all share **one land token**.

---

## 2. Why today’s split feels wrong

| Today | Author pain |
|-------|-------------|
| Pose / keys → `.rest` | Taught as “clear overlay on the **current** bake” — awkward when the handler also flips state |
| Fake opacity pulse for color | Instant snap underneath; fails for red→blue |
| `layout: .paint \| .match` | Forces authors to classify the change |

Authors do not want three APIs or two land tokens (`.rest` vs `.nextRest`). They want: **beats → rest**.

---

## 3. Site line

> **`.rest` = the bake that is true when this clip’s handler finishes.** Middle Poses are temporary. Host triage (paint / FLIP) under the land is invisible. No second land spelling.

---

## 4. Semantics

### 4.1 One land token

| Situation | What `.rest` means |
|-----------|-------------------|
| Handler writes params / emit causes rebake | Arrive at **bake B** (post-mutation still) |
| Flourish only (hover, press squash, no write) | Arrive at **bake A** (same still; clear the overlay) |
| `appear` | Arrive at the **current** bake (nothing flipped) |

Host always: First → (apply handler effects) → Last → land. If First ≡ Last, landing is “drop pose overlay.” If paint/rects differ, tween / FLIP as needed.

**Do not add `.nextRest`.** One word; triage decides whether the still moved.

### 4.2 Handler order (canonical)

```pdl
self.pressEnd = {
  animate = [ Pose(…), Pose(…), .rest ]
  selected = !selected          // or emit that causes the same rebake
}
```

**Host contract:**

1. **Capture First** — current DOM (rects + paint) for this target (and identified descendants).
2. **Apply mutation** — run param writes / emit capture effects (may be a no-op).
3. **Measure Last** — bake after step 2.
4. **Start every track** — each `animate =` that fired in this turn (this handler, emit captures, targeted lets) begins at the same wall-clock zero.
5. **Within a track** — middle Poses play as overlay (sequential keys); that track’s `.rest` land (paint / FLIP) also starts at t=0 (plus any authored `delay:` on the land Motion). Land is **not** gated on flourish completion.
6. Drop overlays when clocks finish; Last is truth.

Authors may write the mutation above `animate =`; same handler = one track. Prefer mutation **after** `animate =` in examples so the file reads “clip, then new state.”

### 4.2b Parallel tracks

```pdl
// child
self.pressEnd = {
  animate = [ Pose(scale: 1.2), Pose(scale: 0.92), .rest ]
  emit select(page)
}

// parent capture
dot.select(page: Number) = {
  animate = Motion(duration: 500, ease: .linear)
  currentPage = page
}
```

Two tracks, one First/Last for the rebake:

| Track | Starts at t=0 |
|-------|----------------|
| Child flourish (scale beats on the pressed dot) | yes |
| Capture land (500ms paint/FLIP on the whole control) | yes |

Add a list chorus with `dots.animate` (array param or Map let):

```pdl
dot.select(page: Number) = {
  dots.animate = [ Pose(scale: 0.85), .rest ]  // every sibling mount
  animate = Motion(duration: 500, ease: .linear)
  currentPage = page
}
```

The host expands `dots` to one flourish track per ForEach mount, **skipping the pressed child** so its press animate owns the solo. Sibling dots begin their color land **and** chorus scale immediately; the pressed dot scales with its own clip.

Several `animate =` in one handler (e.g. `box.animate` / `label.animate`) are the same rule: concurrent tracks, independent clocks. Completion-based sequencing (“when this finishes, then …”) is deferred.

### 4.3 Clock-only form (no fun beats)

```pdl
self.pressEnd = {
  animate = Motion(duration: 200, ease: .out)   // sugar: land `.rest` with this clock
  selected = !selected
}
```

Same landing triage; no middle Poses. Replaces author-facing `layout: .paint` / `.match`.

### 4.4 Host triage (invisible)

| Observation First → Last | Landing does |
|--------------------------|--------------|
| Paint differs (fill, opacity, …) | CSS / WAAPI paint tween |
| Identified box rect differs | FLIP (translate + scale) |
| Both | Both, same clock |
| Neither | Clear overlay / snap |

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

Same token. No mutation → Last ≡ First → land clears the flourish on the current still.

### 4.6 Emit + parent rebake (page dots)

```pdl
// child
self.pressEnd = {
  animate = [ Pose(scale: 1.15), .rest ]
  emit select(page)
}

// parent ForEach
dot.select(page: Number) = { currentPage = page }
```

Child’s `.rest` and the parent capture’s land are **parallel tracks** on the same First→Last rebake. The child’s beats play on the pressed node while the capture clock tweens every sibling’s paint — both from t=0. v1 lean: put the flourish on the actor; put the group land on the capture.

### 4.7 Breaking teaching note (vs shipped Motion)

Shipped docs treat `.rest` as “identity overlay / clear pose.” This proposal **redefines** the land meaning to **handler-finished bake**, which subsumes today’s flourish settle when there is no mutation. Implementation must stop treating land as “always snap overlay to identity on pre-handler bake” when the handler rebakes.

---

## 5. Syntax (lean)

### 5.1 Preferred teaching form

```pdl
animate = [
  Pose(scale: 1.12),
  Pose(scale: 0.96, rotate: -4),
  .rest
]
```

Desugars to one `Animation` whose last segment’s destination is `.rest`, with a shared default clock or per-beat Motion wrappers as needed.

### 5.2 Explicit clocks on beats

```pdl
animate = Animation(
  keys: [
    Motion(duration: 90, ease: .out, pose: Pose(scale: 1.12)),
    Motion(duration: 140, ease: .out, pose: Pose(scale: 0.96)),
    Motion(duration: 200, ease: .out, pose: .rest)
  ]
)
```

### 5.3 Reject / avoid

| Form | Why |
|------|-----|
| `.nextRest` / `.newRest` | One land token — `.rest` |
| Author `layout: .paint \| .match` | Triage belongs in the host |
| Standing / forever `animate` ending in state-land semantics | Forever loops stay pose-track; no rebake land |

---

## 6. Relation to layout-tween proposal

| [`PROPOSAL_LAYOUT_TWEEN.md`](./PROPOSAL_LAYOUT_TWEEN.md) | This proposal |
|---------------------------------------------------------|---------------|
| Families A–E and FLIP player | **Keep** (host machinery) |
| Author picks `layout: .match` | **Drop** — triage under `.rest` / clock-only Motion |
| `match:` stamps / let identity | **Keep** (who can FLIP) |
| Toggle / photo labs | **Keep** as proving grounds; rewrite author lines to choreography form |

Layout-tween becomes an **implementation chapter** of this goal, not a second mental model for authors.

---

## 7. Non-goals

| Allowed | Not in v1 |
|---------|-----------|
| Fun beats then `.rest` | Springs, motion paths, 3D |
| Host paint + FLIP triage | Author “Smart Animate everything” |
| `.rest` land on handler clips | Rebake-land on standing forever loops |
| In-place param + emit-driven rebake | Implicit morph across unrelated Presenter pages without `match:` |
| Interrupt = next First from live overlay | Parallel competing lands on the same node (one land clock per rebake owns paint/FLIP) |
| Parallel tracks from one turn | Completion / “after animate” sequencing (deferred) |

---

## 8. Diagnostics (sketch)

| Code | Intent |
|------|--------|
| reuse / amend | Clarify host: land `.rest` uses post-handler bake when writes/emits present |
| layout-tween checks | Duplicate `match:`; 1:N match at crossing |
| optional lint | Clock-only Motion in a handler with neither write nor emit — OK (flourish clock); no error |

---

## 9. Implementation slices

| Slice | Deliverable |
|-------|-------------|
| **S0** | Lock teaching: `.rest` = handler-finished bake; amend layout-tween (no author `layout:` enum); language-objects site lines |
| **S1** | Host: First → mutate → Last → land clock-only (paint + FLIP-if-needed). **Lab: page dots color** + **IosToggle** |
| **S2** | Middle Pose beats before `.rest` (list sugar or Animation keys). **Lab: bounce then land** |
| **S3** | Emit → parent → child rebake as mutation for child-owned clips |
| **S3b** | **Parallel tracks** — each firing `animate =` starts at t=0; land not delayed by foreign flourish |
| **S3c** | **List chorus** — `dots.animate = …` in emit captures → flourish on every ForEach mount (skip pressed) |
| **S4** | Presenter crossing: keep `PresentationMotion` + `match:` from layout-tween L3–L4 (pair clips, not this land model) |

**Do not** ship Pose-list sugar (S2) before S1 landing works — otherwise authors decorate a snap.

**Do not** reintroduce author-facing `.paint` / `.match` or a second land token.

---

## 10. Open questions

| # | Question | Lean |
|---|----------|------|
| **Q1** | ~~`.nextRest` vs `.rest`~~ | **Resolved — only `.rest`** |
| **Q2** | Bare `[Pose, Pose, .rest]` vs require `Animation(keys:)`? | Allow list sugar that desugars; keep Animation as full form |
| **Q3** | Default duration when list omits clocks? | Pack / prelude `timing.ui` (e.g. 200ms `.out`); override per Motion |
| **Q4** | Mutation before or after `animate =` in source? | Same handler = one clip; examples put animate first |
| **Q5** | Reduced motion | Skip middle beats; land with 0s or opacity-only fade token |
| **Q6** | Can `.rest` target a child (`dot.animate = […, .rest]`) while mutation is on `self`? | Yes — First/Last for that let’s box + paint |

---

## 11. Summary

- **One author story:** fun poses, then **`.rest`**.
- **`.rest` = bake after this handler** — same still if nothing flipped; new still if params/emit rebaked.
- **No `.nextRest`.** Paint vs FLIP = host triage under that land.
- **Parallel tracks:** every `animate =` in the turn starts together; within a clip, keys stay sequential.
- **Clock-only** Motion is the no-flourish form of the same idea.
- Layout-tween FLIP + `match:` stay as **engine**; this proposal is the **steering wheel**.
