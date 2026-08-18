# Implementation plan — Keyed PresentationMotion paths

**Goal:** A pair clip whose slot is a `Motion` with `keys:` plays that path (including per-key `ease:`), so crossings can toss, dip, or bounce — not only Pose → rest / rest → Pose.  
**Depends on:** N8 pair player shipped (`playPresentationMotion`). `Key(pose:, at: [, ease:])` already parses.  
**Plans:** [`IMPLEMENTATION_PLAN_PRESENTER_MOTION.md`](./IMPLEMENTATION_PLAN_PRESENTER_MOTION.md), [`PROPOSAL_ROUTING_PAGES_SCREENS.md`](./PROPOSAL_ROUTING_PAGES_SCREENS.md) §16, [`PROPOSAL_MOTION_PLAY.md`](./PROPOSAL_MOTION_PLAY.md).

WIP language: **no dual names**. `Key.easing:` stays an error. Ease lives on **`Key`**, not on `Pose`.

---

## Why

`PresentationMotion` slots are already `Motion | Pose`. The host ignores `keys:` and only tweens `spec.pose`. A Motion that only has keys therefore **snaps**. Handler / frame `animate =` already plays the same key track via `poseTrackKeyframes` (WAAPI `easing` on the keyframe = curve **from that stop to the next**).

This cut reuses that track on the two-node lane. It does **not** shuffle a stack of five — one pair is still two pages. A cascade is stagger or retained layers (N9).

---

## Locked

| Decision | Rule |
|----------|------|
| Incoming | Play `keys:` **as authored** (author writes a `.toRest` path; last stop is usually `.rest`) |
| Outgoing | Play `keys:` **as authored** (author writes a `.toPose` path; offset 0 is identity if omitted) |
| Pose slot | Unchanged two-point tween (`pose:` sugar = `Key(that, at: 1)`) |
| Motion `ease:` | Default for keys that omit `ease:` |
| `Key.ease` | Optional; already in grammar. Do not move onto `Pose` |
| Start style | Stamp incoming at the first key (or `at: 0`) before WAAPI so the page does not flash at rest |
| Pair `duration` / `ease` | Still apply only to **Pose** slots. A Motion slot keeps its own clock (Q31) |
| `front` / `switchAt` | `switchAt` is milliseconds from play start |
| `.reversed` | **Does not reverse a key list.** Swap sides, invert Motion/pair ease, flip `front` or invert `switchAt` as today. Authors write `dismissMove:` for keyed clips |
| Interrupt | Cancel / reverse the live WAAPI on each lane (same as now) |
| Language | No new types. No `play:` on the slot Motion (slot implies play) |

**Out of this cut:** auto-reverse of `keys:` / `Key.ease` on `.reversed`; per-property tracks; hole-relative Pose; multi-card fan; `retainPrior` pair clips.

---

## Phases

```text
0   This file
1   Host: play keys on pair lanes
2   Unit + evaluate tests
3   Lab + language-objects Key blurb
4   Rebuild playground JS (not WASM unless evaluate changes)
```

---

## Phase 1 — Host player

File: `src/applyMotion.ts` (`playPresentationMotion`, maybe a small helper).

For each lane:

1. `slotMotionSpec` already keeps `keys`. If `spec.keys?.length`, build frames with `poseTrackKeyframes` and `el.animate` those frames (Motion clock). Else keep `snapshotsForMode` + two-point tween.
2. Incoming start overlay: first key pose (or current `snapshotsForMode` from-pose when there are no keys).
3. Outgoing start: rest / identity (keys that begin after `0` already insert identity at `0`).
4. Pair `onDone` timeout stays `max(side duration, pair duration) + delay + 100ms`.
5. `Key.ease` already flows `keyFromUnknown` → `k.easing` on the WAAPI frame. Do not special-case pair vs hover.

Do **not** change parse / evaluate / WASM in this cut.

---

## Phase 2 — Tests

### `tests/apply-motion.test.ts` (extend `playPresentationMotion`)

Use the existing fake lane (`el.animate` records frames + options).

| Case | Expect |
|------|--------|
| 3-key incoming + Pose outgoing | Incoming `animate` gets **3+** offsets (`0`, `0.55`, `1`), not a 2-point tween. Outgoing stays 2-point rest → pose |
| Incoming Motion with **only** `keys:` (no `pose:`) | Incoming **animates** (today it returns no animation) |
| `Key.ease: .out` on the mid key | That frame’s `easing` is `ease-out`; other frames inherit Motion ease / omit |
| Pose-only pair (regression) | Still 2-point; incoming start opacity / transform unchanged |
| First key `opacity: 0` | `el.style.opacity` stamped `"0"` before `animate` |
| `switchAt: 40` + keyed incoming | Front class still flips; keys do not change z-order |
| Dismiss default front | Outgoing still starts in front when `defaultFront: "outgoing"` |
| Side durations 480 vs 320 | Timeout / pair clock uses the max; each `animate` duration matches its slot |

Add a **pure** `poseTrackKeyframes` case if none asserts per-key `easing` yet (hover path, not only pair).

### Evaluate / reverse (no behavior change)

| Case | Expect |
|------|--------|
| `motion.cardToss.reversed` | Sides swap; Motion `ease` flips; **`keys` arrays unchanged** (offsets and poses stay) |
| `switchAt: 144` on a 480ms keyed pair | Becomes `336`; `front` kept |

Fixture: extend `test-fixtures/pdl/lab/nav/reversed_ease.pdl` **or** a token-only `keyed_pair.pdl` used by `tests/presentation-motion-reversed.test.ts` + Rust `parse_fixtures`.

### Parse / validate (already true; one golden)

| Case | Expect |
|------|--------|
| `Key(pose:, at:, ease: .out)` | Parses; evaluated key has `ease: "out"` |
| `Key(…, easing: .out)` | PDL-E001 — write `ease:` |
| `Key` + `pose:` on the same Motion | Still E005 |

No new error codes.

---

## Phase 3 — Lab + docs

New `test-fixtures/pdl/lab/nav/n8_keys.pdl` (or a second pack chip next to `n8_slide.pdl`):

```pdl
semantic motion.cardToss: PresentationMotion = PresentationMotion(
  incoming: Motion(
    duration: 480, ease: .out,
    keys: [
      Key(pose: Pose(translateX: 390, translateY: 24, rotate: 8, opacity: 0), at: 0),
      Key(pose: Pose(translateX: 28, translateY: -18, rotate: -2, scale: 1.02), at: 0.55, ease: .out),
      Key(pose: .rest, at: 1, ease: Ease.bezier(0.2, 1.2, 0.4, 1))
    ]
  ),
  outgoing: Motion(
    duration: 480, ease: .in,
    keys: [
      Key(pose: Pose(translateX: -36, translateY: 12, rotate: -6, scale: 0.96), at: 0.45, ease: .in),
      Key(pose: Pose(translateX: -72, opacity: 0.7), at: 1)
    ]
  ),
  front: .outgoing,
  switchAt: 240
)

semantic motion.cardTossBack: PresentationMotion = PresentationMotion(
  incoming: Motion( /* leave-path reversed by hand */ … ),
  outgoing: Motion( /* enter-path reversed by hand */ … ),
  front: .outgoing,
  switchAt: 240
)
```

`push(…, move: motion.cardToss, dismissMove: motion.cardTossBack)`. Phone 390×760.

Docs:

- `shared/language-objects.json` **Key** blurb: `ease:`, not `easing:`. PresentationMotion meaning: Motion-in-slot with `keys:` plays the path; `.reversed` does not reverse keys.
- `npm run docs:gen`
- One sentence in routing §16 if it still says pair clips are Pose-only.

**Done when:** Playground — tap a row, incoming follows the mid waypoint (not a straight slide); Back uses `cardTossBack` (not a snapped or wrong-direction key path). `n8_slide` Pose-only push/pop still looks the same.

---

## Phase 4 — Backends

Host-only (`applyMotion`, playground `src/`):

```bash
npm run build
npm run build --prefix playground
```

Restart `playground-server` (Node ESM caches `dist/`). Hard-refresh the tab.

Do **not** rebuild WASM unless evaluate / catalogue changes (they should not). If a later cut auto-reverses keys, that **is** `pdl-core` — then `CARGO_TARGET_DIR="$PWD/target"` cli + `npm run build:wasm` per `.cursor/rules/playground-rebuild.mdc`.

---

## Test commands

```bash
npx vitest run tests/apply-motion.test.ts tests/presentation-motion-reversed.test.ts
CARGO_TARGET_DIR="$PWD/target" cargo test -p pdl-core --test parse_fixtures
```

After the lab exists, catalogue/load the fixture once (TS `loadDesign` + Rust `load_design`) so `cardToss` evaluates.

---

## Follow-on (not this cut)

Auto-reverse `keys:` on `.reversed`: reverse the list, `at' = 1 − at`, invert each `Key.ease` like Motion ease. Then `dismissMove: motion.cardToss.reversed` is enough. Do that only after the host plays keys and a lab proves the hand-written back path.
