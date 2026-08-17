# Implementation plan — Presenter pair transitions (M5 → Playground)

**Goal:** A Playground lab where tapping a row **slides** Episode in and Home out (and Back reverses), using `PresentationMotion`.  
**Depends on:** N0–N5 + B7 shipped.  
**Plans:** [`IMPLEMENTATION_PLAN_MOTION_NAMING.md`](./IMPLEMENTATION_PLAN_MOTION_NAMING.md) (M5 detail), [`IMPLEMENTATION_PLAN_ROUTING_PAGES_SCREENS.md`](./IMPLEMENTATION_PLAN_ROUTING_PAGES_SCREENS.md) (N6–N9).

WIP language: **no dual names**. `Transition` / `Easing` / `transition:` / `easing:` become errors.

---

## Phases

```text
0   This file — sequence + Playground done-when
1   M5   Timing / Ease rename (lock → parse → IR → host → fixtures)
2   N8a  PresentationMotion type + present/push(move:, dismissMove:)
3   N8b  Catalogue / pins carry the evaluated move
4   N8c  HTML two-node lane (keep outgoing, play both, commit)
5   Demo n8_slide.pdl + pack entry + rebuild backends
```

N6 (`disappear` inbound rename) and N7 (cover `appear` wait) are **not** required for the pair-slide demo. They stay on the routing plan. Cover stays instant (N5). This cut is **hide-prior push/pop**.

---

## Phase 1 — M5 clock rename

See motion-naming plan. Done when:

- `Timing` / `Ease` parse; `Transition` / `Easing` / `transition:` / `easing:` error
- `Motion(timing:)` or flattened `duration:` / `ease:` / `delay:`
- Bake/catalogue IR uses `timing` / `ease`
- Labs `tokens_motion.pdl`, `lab/motion`, e005 fixtures rewritten
- HTML WAAPI still receives a CSS easing string at the host edge
- `npm test` motion + parse fixtures green

**Ease:** `.linear` `.in` `.out`; `Ease.bezier(x1, y1, x2, y2)`. x1/x2 must be 0…1. Not CSS strings.

---

## Phase 2 — N8a language

```pdl
PresentationMotion(
  incoming: Motion | Pose,
  outgoing: Motion | Pose,
  duration: Duration?,
  ease: Ease?,
  delay: Duration?,
  front: Front = .incoming,
  promoteAt: Number?
)
```

- Lexer/keyword `PresentationMotion`
- AST + parse + evaluate (`kind: "presentationMotion"`)
- `.reversed` swaps sides, flips `front`, and time-reverses `ease` (`.in`↔`.out`; bezier inverts). `delay` stays.
- `Presenter(root:, move:, dismissMove:)`
- Verb args: `move:` / `dismissMove:` (ValueExpr). `push(page, move:, dismissMove:)` legal
- `present` still accepts `style: .cover` (N5). `move:` on `present` is hide-prior pair clip when no cover style — **v1 demo uses `push(..., move:)`** so N5 cover stays untouched
- Validate: `dismissMove` illegal on `swap`/`replace` (those verbs not in this cut)
- Error: unknown presenter arg

---

## Phase 3 — N8b catalogue + pins

- Capture body serialises evaluated `move` / `dismissMove` on `presenterVerb`
- Host click has the spec without re-evaluating PDL
- Pins unchanged (stack/cover). Move is on the **op**, not the pin bag
- Hole default `Presenter.move` used when the verb omits `move:`

---

## Phase 4 — N8c two-node lane

On `push`/`pop` with a move spec:

1. Snapshot outgoing presenter child DOM
2. Apply pins + bake incoming IR
3. Reconcile: **do not drop** outgoing; mount incoming in the same grid cell
4. Incoming starts at incoming pose; outgoing animates to outgoing pose
5. Play both WAAPI (per-side duration if Motion slots)
6. `front: .incoming` → incoming z above; `.outgoing` → outgoing above. Omit `front`: `move` defaults incoming, `dismissMove` defaults outgoing. `promoteAt` flips at that progress
7. On both finished (safety timeout = pair duration + delay + 100ms): remove outgoing, clear overlays
8. Interrupt: if another nav arrives, cancel and commit/restore (v1: cancel + snap commit)

`pop` uses the entry’s `dismissMove` or the same `move` (not auto-reverse). Authors pass `.reversed`.

Fixture chips still snap (no pair clip).

---

## Phase 5 — Playground demo

New `test-fixtures/pdl/lab/nav/n8_slide.pdl`:

- `motion.navPush` token
- `showEpisode` → `presenter.push(Episode(…), move: motion.navPush, dismissMove: motion.navPush.reversed)`
- `back` → `presenter.pop()`
- Phone 390×760 so `translateX: 390` matches the hole

Pack **Nav (Presenter)** entry switches to `n8_slide.pdl` (or add a second pack). Hard-refresh required.

**Done when:** In Playground, tap Morning Cup → Episode slides in from the right, Home eases left and dims; tap Back → the reverse. No snap.

---

## Backends

After parse/catalogue/bake/WASM:

```bash
CARGO_TARGET_DIR="$PWD/target" cargo build -p pdl-cli
npm run build
npm run build:wasm
```

`npm run playground:fresh` if WASM changed.

---

## Out of this cut

- N6 `self.disappear` rename
- N7 cover appear/disappear wait
- N9 `retainPrior` / `swap` / wipe-`replace` / many retained layers
- Hole-relative Pose, RTL invert, copy-override
- Gesture dismiss
