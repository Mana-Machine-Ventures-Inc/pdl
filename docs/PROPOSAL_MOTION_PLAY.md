# Proposal: Motion play modes, keys, and frame `animate`

**Status:** **superseded (2026-08-19)** by the Animation hard cut — see below.  
**Historical:** accepted P + M0–M3 (2026-08-14). This document described `Play` / `Key(at:)` / site-default play inference.

---

## Supersession (Animation hard cut)

`animate =` is now an **`Animation`**:

```pdl
Animation(
  start: Pose?,                                    // snap if present; else current
  keys: [Motion(duration:, ease:, delay?:, pose:)] // sequential destinations; pose may be .rest
  stagger: Stagger(…)?,
  repeat: Int | .forever?
)
```

- **`Motion`** is only a **segment** (clock + destination), not the animate value.
- **`Play`** (`.toRest` / `.toPose` / `.loop`) and **`Key(at:)`** are removed.
- Rest is an explicit destination: `pose: .rest`.
- Concurrent clocks = different lets (`box.animate` / `label.animate`), or bundle channels in one Pose.
- **`PresentationMotion`** slots are `Animation` (or Pose sugar + pair clock → Animation). `.reversed` swaps sides and inverts Motion eases.

Catalogue / host JSON uses `animation` / `animationTargets` (not `motion` / `play`).

Grammar: `grammar/pdl.ebnf`. Objects: `shared/language-objects.json`. Host: `src/applyMotion.ts` + `src/renderHtml.ts`.
