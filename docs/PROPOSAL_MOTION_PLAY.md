# Proposal: Motion play modes, keys, and frame `animate`

**Status:** accepted — **P** + **M0–M3** shipped (2026-08-14; second revision — locks play/repeat, token override, appear+standing, interrupt reverse). Next **M4** tokens + teaching.  
**Depends on:** v1 handler motion (`Motion` / `Pose` / `Stagger` / `Transition`); HTML host overlay in `src/renderHtml.ts` + `src/applyMotion.ts` / `src/motionProps.ts`; Rust `crates/pdl-core/src/motion.rs`; Playground live catalogue push  
**Related:** `website` objects — Handler motion; lab `test-fixtures/pdl/lab/motion/`  
**Plan:** Track M in `docs/IMPLEMENTATION_PLAN.md`  
**Supersedes (authoring):** earlier draft that introduced a separate `Cycle` type  
**Does not change:** bake-at-rest; hover **without** a pose still implicit-tweens assigns

**P** + **M0–M3** shipped: `Play` / `Key` / frame `animate` / HTML key WAAPI + standing start/stop. Transition-only hover stays a tree tween. Bake stays at rest; the host plays a CSS overlay. **M4** is teaching tokens (`motion.spin` / `pulse` / `hoverPop` / `shake`), not a second motion system.

---

## 1. Problem

v1 `animate =` is already one object. The host infers from→to from the **event name**:

| Site | Implied playhead |
|------|------------------|
| `appear` | from pose → rest |
| `dismiss` | from current → pose |
| `hoverStart` / `hoverEnd` | no pose — tween bake A → bake B |

That inference is right for the defaults and wrong as the *only* rule. Designers also need:

- A **standing** overlay while a condition holds (spinner, pulse, sheen)
- An explicit **playhead** they can override (`hoverEnd` that is not dismiss)
- **More than one pose** on the path (hover: pose 1 → pose 2 → rest)
- **Rest** as a named waypoint, not a hidden special case

A new `Cycle` type, a `Shine` layer, or `from { }` blocks would multiply vocabulary. The missing pieces are **play mode**, **keys**, and **`animate` as a frame property**.

---

## 2. Preferred metaphor

`Motion` is the only motion value. It is a curve, an optional path of poses, optional stagger, optional finite repeat, and a **play mode**.

- Handlers assign `animate =` for an **event** (today).
- Any frame may hold `animate =` for a **while** (`if isLoading { icon.animate = motion.spin }`).
- The **host protocol** picks a default `play` from the site when the Motion value omits `play`. The author may override.

```pdl
enum Play {
  case toRest    // run the path, finish on identity
  case toPose    // run the path, finish on the last key
  case loop      // keep walking the path until the spec leaves
}
```

`.loop` **is** forever. Do not also write a repeat. `repeat` is only a finite count on `.toRest` / `.toPose`.

Authors’ gloss:

> *Every frame can have `animate`. It is a Motion. Handlers set it for an event. `if` sets it for a while. `play` is the playhead. `keys` are the path. `.rest` is a pose.*

No `tick`. No author clock. Themes replace a Motion wholly. A use-site constructor may copy a token and override fields (`Motion(motion.hoverPop, play: .toRest)`).

---

## 3. Two machines, one curve

`Transition` is shared. What it drives is not:

| Machine | Ends | When |
|---------|------|------|
| **Tree tween** | previous bake → next bake | Handler `animate` **without** pose/keys (hover color, press fill) |
| **Pose track** | overlay poles (`.rest` and authored `Pose`s) | Handler or frame `animate` **with** pose/keys |

Do not put a pose on a hover handler unless you want the pose track (lift / flourish). A Transition-only hover stays a tree tween. Pose on hover is **no longer banned** — it means “run this overlay path,” not “tween my background.” Both may run in the same handler (assign `interactionState` **and** a Motion with keys).

---

## 4. Type: `Motion` (extended)

Category: motion. Used on: handler `animate =`, frame `animate`.

```pdl
Motion(
  transition: Transition,     // required (token or tuple); Duration + Easing + delay
  play: Play = <site default>,
  pose: Pose,                 // sugar — see keys
  keys: [Key, …],             // path; optional if `pose:` is set
  stagger: Stagger,
  repeat: Number              // finite count; omit = 1; illegal with .loop
)
```

A bare `Transition` remains sugar for `Motion(transition: …)` — tree tween, no pose track.

```pdl
Key(pose: Pose | .rest, at: Number, easing: Easing?)
```

`Repeat(count: n)` is the typed form of `repeat: n`. Prefer the number sugar (`repeat: 3`), same as `duration: 800`. There is no `repeat: .once` or `repeat: .forever`.

- `at` is **0…1** of `transition.duration` (CSS / WAAPI offset). Required on each `Key`. First key may be `at: 0`.
- `easing` on a key overrides the Motion curve for that segment only.
- `.rest` is the identity overlay (current bake; no translate / scale / blur / rotate). Empty `Pose()` stays illegal.
- `pose: Pose(…)` on Motion is sugar for `keys: [Key(pose: that, at: 1)]`.
- `pose:` and `keys:` together are PDL-E005.
- `keys` with no pose track (empty / missing) + no `pose:` = tree tween.
- `stagger` without a pose track is still rejected.
- `play: .loop` implies forever. `repeat` on `.loop` is PDL-E005.
- `repeat` on a tree tween (no pose/keys) is PDL-E005.
- `repeat` must be an integer ≥ 1. `repeat: 1` equals omit.
- Unknown labels are PDL-E005.

**Copy + override** (locked for M1):

```pdl
Motion(motion.hoverPop, play: .toRest)
```

First positional operand is a Motion token (or value). Labeled fields replace those fields on a shallow copy. This is a constructor, not theme merge. Required so a token that *does* set `play` can still flip at a use site.

**Reusable tokens should omit `play`** so the site default applies. Put `play` on a token only when every use should share that playhead.

**Single-pose v1 remains valid:**

```pdl
self.appear = {
  animate = Motion(
    transition: motion.appear,
    pose: Pose(opacity: 0, scale: 0.95, translateY: 8)
  )
}
```

That is `play: .toRest` (appear default) and one key at `at: 1`.

---

## 5. Play mode defaults (overridable)

Site default fills `play` only when the Motion value omitted it.

| Site | Default `play` | From → to |
|------|----------------|-----------|
| `appear` | `.toRest` | first pole → `.rest` (today: authored pose → rest) |
| `dismiss` | `.toPose` | current → last key |
| `hoverStart` + pose/keys | `.toPose` | current → last key |
| `hoverEnd` + pose/keys | `.toRest` | reverse the **same** keys from **current progress** (§6) |
| `pressStart` + pose/keys | `.toPose` | |
| `pressEnd` / `pressCancel` + pose/keys | `.toRest` | reverse from current progress |
| Pointer handler, Transition only | *(tree tween)* | bake A → bake B |
| Frame `animate` (no `.loop`) | `.toRest` | play once when the spec **appears** on the node |
| Frame `animate` + `play: .loop` | `.loop` | walk keys until the spec leaves |

Override a site default or a token that set `play`:

```pdl
hoverEnd = { animate = Motion(motion.hoverPop, play: .toRest) }
```

`.loop` period = time through the key list once.

---

## 6. Keys and `.rest`

Rest is a pose in the list, not a hidden endpoint.

**Flourish, then sit on the real tree** (hover that pops and settles):

```pdl
hoverStart = {
  animate = Motion(
    transition: (duration: 400, easing: "ease-out"),
    play: .toRest,
    keys: [
      Key(pose: Pose(scale: 1.16, translateY: -4), at: 0.35),
      Key(pose: Pose(scale: 0.98), at: 0.7),
      Key(pose: .rest, at: 1)
    ]
  )
  interactionState = .hovered
}
```

**Hold a lifted pole; return on hoverEnd** — one token, site default flips play:

```pdl
semantic motion.hoverPop: Motion = Motion(
  transition: (duration: 280, easing: "ease-out"),
  keys: [
    Key(pose: Pose(scale: 1.12), at: 0.4),
    Key(pose: Pose(scale: 1.04), at: 1)
  ]
)

hoverStart = { animate = motion.hoverPop; interactionState = .hovered }
hoverEnd = { animate = motion.hoverPop; interactionState = .rest }
```

`hoverPop` omits `play`. `hoverStart` defaults `.toPose`; `hoverEnd` defaults `.toRest` and **reverses the same keys from current overlay progress** (not from the last key, not a restart). Authors write a second list only when the return path is actually different. If they stored `play: .toPose` on the token, hoverEnd must write `Motion(motion.hoverPop, play: .toRest)`.

**Interrupt:** if hover ends mid-flourish, reverse from the live snapshot. Reuse the existing overlay playhead (same machine as appear/dismiss cancel). Do not invent a second interpolator.

**Loop through rest** (pulse):

```pdl
semantic motion.pulse: Motion = Motion(
  transition: (duration: 900, easing: "ease-in-out"),
  play: .loop,
  keys: [
    Key(pose: Pose(opacity: 0.45, scale: 0.96), at: 0.5),
    Key(pose: .rest, at: 1)
  ]
)
```

**Spin** (needs `Pose.rotate`, §9):

```pdl
semantic motion.spin: Motion = Motion(
  transition: (duration: 800, easing: "linear"),
  play: .loop,
  pose: Pose(rotate: 360)
)
```

`pose: Pose(rotate: 360)` is sugar for one key at `at: 1`. Linear + `.loop` must be **continuous** (no 360→0 snap). That is an M3 host test, not a comment.

---

## 7. Frame `animate` (standing overlay)

`animate` is a frame property, same type as handler `animate =`. Gate with `if`. Bake either carries the spec or not. Reconcile starts or stops the host overlay.

```pdl
component SaveBtn(isLoading: Bool = false) layout {
  let icon = Icon(icon: IconRef(system: .sfSymbols, name: "arrow.clockwise"))
  children = [icon]

  if isLoading {
    icon.animate = motion.spin
  }
}
```

**One standing spec per node.** Handler `animate` is a separate **event shot**. `if isLoading { icon.animate = … }` does not replace appear on that node.

- Later `if` / override wins for the standing spec.
- Condition false → omit field → host **cancels** the standing overlay.
- Legal on any frame, including `self.animate` (root spinners).
- Stagger on a frame Motion offsets the **same** path across direct visible children (appear lists and spinning rows use one rule).

**Appear + standing on the same node**

They may both be declared. They must not write the overlay at the same time.

1. If appear is armed or playing, **hold standing** until appear `finished` (rest committed).
2. Then start standing.
3. If appear is absent or already finished, standing starts when the spec appears on the node.
4. Shared channels: standing takes over after appear. Put standing on a child if it must run during appear.
5. Dismiss cancels standing with the node.

Shake-on-error: `if invalid { row.animate = motion.shake }` with `repeat: 3`, `play: .toRest` (or site default).

**Invalid**

```pdl
self.tick = { … }                 // no clock inbound
hoverStart = { cycle = motion.spin }  // no Cycle
icon.animate = motion.spin
  repeat: .forever                // gone — write play: .loop
```

---

## 8. What the pose track may move

Same overlay channels as Pose, plus `rotate` when that field lands:

`opacity` · `scale` · `scaleX` · `scaleY` · `translateX` · `translateY` · `blur` · `rotate`

Optional companion (same cut as `rotate`): `originX` / `originY`.

| Intent | Path | Extra paint |
|--------|------|-------------|
| Spinner | `pose: Pose(rotate: 360)`, `.loop` | — |
| Pulse | keys through `.rest`, `.loop` | — |
| Shake | small `translateX`, finite `repeat` | — |
| Shine / sweep | `translateX` on a stacked / absolute child, `.loop` | Child `Ramp` on `foreground` / `background` |
| Hover flourish | keys ending `.rest`, `.toRest` | Optional tree tween for fill |

Not the pose track: layout, `Ramp` stop interpolation, 3D, springs, motion paths.

A `Shine(offset:)` layer is an optional later mapping of progress. It is not the language feature.

---

## 9. Pose.rotate (prerequisite, small)

Degrees, overlay-only, rest = 0. Unknown today → PDL-E005.

Ship `rotate` (and preferably origin) **before or with** keys / frame `animate`. Appear/dismiss get tilt-in; `.loop` gets spin.

`snapshotToCss` adds `rotate(Ndeg)` on the transform list (after translate, before scale — lock in P). Linear + `.loop` + `rotate: 360` is continuous; add a host test in M3 that sampled progress at t=0.99 and t=1.01 does not jump.

---

## 10. Host contract

Bake stays at rest. Frame IR grows optional `animate` (full Motion JSON: transition, play, keys, stagger, repeat). Handler `animate` stays on the catalogue interaction row (today).

| Host | Pose track | Tree tween | Stop standing |
|------|------------|------------|---------------|
| HTML | WAAPI / CSS along keys; `play` sets direction / iteration | Existing implicit transition on assigns | Reconcile omits `animate` |
| SwiftUI (later) | Same IR | Implicit animation | Condition false |

Reuse `snapshotToCss`. Interpolate each overlay channel between adjacent keys. `.rest` is identity. Do **not** invent a second renderer.

Finite `repeat` ends on `.rest` unless `play: .toPose` (hold last key). `.loop` runs until the spec leaves the tree.

**Interrupt / reverse** uses the live overlay snapshot as the next `from`. Cancel the in-flight WAAPI, then play the remaining reversed keys. Same helper as appear cancel → dismiss.

Playground already pushes a live catalogue on source ticks — handler play/keys ride that path. Frame `animate` rides bake IR reconcile (M2/M3).

---

## 11. Implementation slices

Lock files (`shared/*.json`, `grammar/pdl.ebnf`) update per slice. Proposal text is intent until locked.

| Slice | Deliverable | Done when |
|-------|-------------|-----------|
| **P** | `rotate` (+ origin) on Pose | Grammar + TS/Rust `MOTION_PROP_NAMES` + `snapshotToCss` (`translate` → `rotate` → `scale`); appear tilt lab; unknown field still E005 |
| **M0** | `Play`, `Key`, `.rest`, finite `repeat` parse + validate | Fixtures; E005 on `pose`+`keys`, `.loop`+`repeat`, `repeat` without path, `at` out of range; no `Cycle` / `.forever` |
| **M1** | Site default `play` + `Motion(token, field:)` override | Appear/dismiss unchanged visually; hover+keys lab; token-without-play flips on hoverEnd; override spelling golden |
| **M2** | Frame `animate` on bake IR | Golden; `if` omits the field; any frame including `self` |
| **M3** | HTML start/stop + key WAAPI | Lab: spinner, pulse, sheen child, hover flourish; **continuous rotate loop**; **interrupt reverse-from-current**; **appear-then-standing** on shared opacity |
| **M4** | Tokens + Motion lab | `motion.spin` / `motion.pulse` / `motion.hoverPop` / `motion.shake`; Language objects + site teaching line |

Do not start M3 until M2 frame `animate` is on bake IR. M3 is the only slice that can surprise (WAAPI wrap, appear+standing, interrupt reverse). Everything before that is grammar + IR.

---

## 12. Rejected

| Idea | Why |
|------|-----|
| Separate `Cycle` type | Same object as Motion; play + repeat suffice |
| `repeat: .forever` alongside `.loop` | Same knob twice; `.loop` is forever |
| First-class `Shine` as the feature | Child `Ramp` + `translateX` keys |
| `tick` / `self.loop` inbound | Author clock; fights bake-at-rest |
| `from { }` blocks | Path is `keys`; `.rest` is a waypoint |
| Per-key `duration` in v1 | Use `at:` on one `transition.duration`; duration sugar later |
| Ban pose on hover forever | Pose track on hover is a flourish / lift; tree tween stays Transition-only |
| Infer from→to only from event names | Defaults yes; override is the point |
| Interpolate gradient stops | Fragile in CSS |
| Springs / 3D / clip wipes | Later chapters |
| Simultaneous appear + standing on the same channels | Standing waits for appear `finished` |

---

## 13. Teaching

1. **Curve** — `animate =` a `Transition` (tree tween).
2. **Path** — add `pose:` or `keys:` (pose track). `.rest` is a stop.
3. **Playhead** — `play: .toRest` / `.toPose` / `.loop` (site default when omitted, overridable).
4. **While** — `if condition { node.animate = motion.spin }`.

Lab additions: `MotionSpinner`, `MotionPulse`, `MotionSheen`, `MotionHoverFlourish` (keys → `.rest`), `MotionShake`.

Site line (Language objects / Guide):

> Every frame can have `animate`. It is a Motion. Handlers set it for an event. `if` sets it for a while. `play` is the playhead. `keys` are the path. `.rest` is a pose.

---

## 14. Locked decisions

Former open locks — decided 2026-08-14:

| Topic | Decision |
|-------|----------|
| Finite repeat spelling | `repeat: 3` sugar; `Repeat(count: 3)` if a type is needed. No `.once` / `.forever`. |
| Token + field override | `Motion(motion.hoverPop, play: .toRest)` — shallow copy. Ship in M1. |
| Token `play` vs site default | Site default fills only when `play` is omitted. Reusable tokens omit `play`. |
| `hoverEnd` / `pressEnd` return | Reverse the same keys **from current progress**. |
| `.loop` period | Time through the key list once. |
| `self.animate` | Any frame, including root. |
| `rotate: 360` wrap | Continuous for linear + `.loop`. M3 test. |
| Appear + standing | One standing spec per node; event shots are separate; standing waits for appear `finished`. |

---

## 15. Pursuit notes

**Order:** P → M0 → M1 → M2 → M3 → M4. No parallel language slices that touch `motion-literal` / Pose fields.

**Likely files (per slice, not all at once):**

- Lock: `grammar/pdl.ebnf`, `shared/language-objects.json`, `shared/diagnostics.json`, `shared/frame-props.json` (frame `animate`)
- Rust-first parse/validate: `crates/pdl-core/src/motion.rs`, parser / catalogue / bake
- TS mirror: `src/motionProps.ts`, `src/applyMotion.ts`, catalogue / bake
- Host: `src/renderHtml.ts` (WAAPI keys, standing start/stop, interrupt reverse)
- Playground: live catalogue already pushes handler motion; frame `animate` needs IR reconcile
- Fixtures: `test-fixtures/pdl/lab/motion/`, `test-fixtures/pdl/errors/`

**Risks (M3):** WAAPI `rotate` iteration snap; appear hold vs `data-pdl-appear-armed`; reverse-from-current when fill is `both`; standing cancel on incremental IR omit.
