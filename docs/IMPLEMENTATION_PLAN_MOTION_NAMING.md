# Implementation plan — Motion naming (Timing / Ease)

**Proposal:** [`PROPOSAL_MOTION_PLAY.md`](./PROPOSAL_MOTION_PLAY.md) (accepted play/keys; this slice **breaks** clock names). Presenter pair clips: [`PROPOSAL_ROUTING_PAGES_SCREENS.md`](./PROPOSAL_ROUTING_PAGES_SCREENS.md) §16–§17.  
**Track:** **M5** in [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md). **N8** (`PresentationMotion`) **depends on M5**.  
**Binding:** WIP language — no dual-name period. Old `Transition` / `Easing` / `transition:` / `easing:` are errors that point at the new spelling.

Until M5 locks `shared/*.json` / `grammar/pdl.ebnf`, tooling must not treat `Timing` / `Ease` as normative.

---

## Why

`Transition` is a **clock** (duration + ease + delay) that borrowed the word for a **change**. Presenter crossings are the change. `Easing` is a CSS string, not a value.

| Old (shipped) | New |
|---------------|-----|
| `Easing` | **`Ease`** — `.linear` / `.in` / `.out` / `.inOut` / `Ease.cubic(…)` |
| `easing:` | **`ease:`** |
| `Transition` tuple / token | **`Timing`** — `(duration:, ease: [, delay:])` |
| `Motion(transition: …)` | **`Motion(timing: …)`** or flattened `duration:` / `ease:` / `delay:` |
| `Key(…, easing:)` | **`Key(…, ease:)`** |
| Bare Transition as `animate =` | Bare **`Timing`** as `animate =` (tree tween, unchanged machine) |
| — | **`PresentationMotion`** (routing N8; not a `Motion`) |

Do not add an `Animation` type. CSS `transition:` on HTML nodes is host paint, not this type.

---

## Target authoring

```pdl
primitive motion.duration.standard: Duration = 250
primitive motion.ease.standard: Ease = Ease.cubic(0.2, 0, 0, 1)

semantic motion.appear: Timing = (duration: motion.duration.standard, ease: motion.ease.standard)
semantic motion.instant: Timing = (duration: 0, ease: Ease.linear)

self.appear = {
  animate = Motion(timing: motion.appear, pose: Pose(opacity: 0, translateY: 8))
  // or flattened:
  // animate = Motion(duration: 250, ease: Ease.out, pose: Pose(opacity: 0))
}

hoverStart = {
  animate = motion.appear   // Timing sugar → tree tween
}
```

**Ease spelling (lock in M5a if the constructor form is awkward):** named cases plus `Ease.cubic(x1, y1, x2, y2)`. Quoted CSS (`"ease-out"`, `"cubic-bezier(…)"`) remains **sugar that types as `Ease`**, so labs can be rewritten mechanically. Reject the type name `Easing`.

**Motion fields:** `timing:` **or** flattened `duration:` / `ease:` / `delay:` — not both for the same clock (E005). `pose:` / `keys:` / `play:` / `stagger:` / `repeat:` unchanged. Copy-override stays `Motion(token, field:)`.

---

## Slices

### M5a — Lock files + grammar + proposal prose

| Done when | Evidence |
|-----------|----------|
| Keywords `Timing` / `Ease`; drop `Transition` / `Easing` | `shared/keywords.json`; `grammar/pdl.ebnf`; `lexer.rs` / `src/lexer.ts` |
| `Timing` tuple `(duration:, ease: [, delay:])` | ebnf `timing-literal` (was `transition-literal`) |
| `Motion` args: `timing:` / `duration:` / `ease:` / `delay:` — no `transition:` | ebnf `motion-arg` |
| `Key` arg `ease:` — no `easing:` | ebnf `key-literal` |
| Language objects + frame-props `tokenTypes` | `shared/language-objects.json`; `shared/frame-props.json` (`animate` → Motion, Timing) |
| Rewrite motion-play proposal examples | `docs/PROPOSAL_MOTION_PLAY.md` |
| Routing cover examples use `Motion(duration:, ease:, pose:)` | `docs/PROPOSAL_ROUTING_PAGES_SCREENS.md` §15 |
| `npm run docs:gen` | `website/src/generated/*` |

**Ease cases** live as a prelude enum or language-object enum (same pattern as `Play`). Unknown case → E005.

### M5b — Parse / validate / evaluate (Rust-first, TS parity)

| Done when | Evidence |
|-----------|----------|
| AST: `Timing`, `Ease` (not Transition/Easing) | `crates/pdl-core/src/ast.rs`; `src/ast.ts` |
| Parse new literals; reject old field/type names with “write Timing / Ease” | Error fixtures (reuse E005 or next free) |
| Evaluate tokens `motion.appear: Timing`, `motion.ease.standard: Ease` | `evaluate.rs` / `evaluate.ts` |
| `Motion(timing:)` and flattened clock | Goldens |
| `timing:` + flattened clock together → E005 | Error fixture |
| Catalogue `tokenType`: `Timing` / `Ease` | Schema + goldens |

### M5c — Bake IR + HTML host

Bake JSON that today nests `transition: { duration, easing, delay }` becomes **`timing: { duration, ease, delay }`** (or flattened on the Motion spec). Same break in WASM / Playground.

| Done when | Evidence |
|-----------|----------|
| Bake / graph serialize new field names | `graph_serialize.rs`; `src/graph.ts`; bake schema if present |
| `applyMotion.ts` / `renderHtml.ts` read `timing` / `ease` | WAAPI still gets a CSS easing string at the host edge |
| Implicit tree tween still works from a bare Timing | `tests/apply-motion.test.ts`; `tests/motion-preview.test.ts` |
| Rebuild WASM if bake IR changed | `npm run build:wasm` + `CARGO_TARGET_DIR="$PWD/target" cargo build -p pdl-cli` |

Host CSS `transition:` (implicit color tween) is **not** renamed.

### M5d — Fixtures, labs, templates, editors

Rewrite every author-facing `Transition` / `Easing` / `transition:` / `easing:`.

| Area | Paths |
|------|--------|
| Motion tokens | `test-fixtures/pdl/atoms/tokens_motion.pdl` (`transition.quick` → `timing.quick`; `Easing` → `Ease`) |
| Motion lab | `test-fixtures/pdl/lab/motion/design.pdl` + README |
| Effect lab if it uses Motion | `test-fixtures/pdl/lab/effect/design.pdl` |
| Error fixtures | `test-fixtures/pdl/errors/e005-motion-*.pdl` |
| Stdlib / integration packs that declare motion tokens | `test-fixtures/pdl/stdlib/`; atoms / integration designs |
| Goldens | `crates/pdl-core/tests/golden/*motion*`; `atoms_design_pdl`; `integration_design_pdl` |
| Playground template | `playground/src/pdl-templates.js` (`MotionCard` snippet still has `transition:` / `self.dismiss`) |
| VS Code grammar | `editors/vscode-pdl/syntaxes/pdl.tmLanguage.json` |
| Tests | `tests/parser.test.ts`; `tests/bake-design.test.ts`; `crates/pdl-core/tests/parse_fixtures.rs` |
| Host env example | `docs/PROPOSAL_HOST_ENVIRONMENT.md` (`motion.appear = motion.instant` still valid if types match) |
| Website generated | `npm run docs:gen` after lock files |

Add **one** error fixture: `transition:` on Motion → write `timing:` (or flattened fields).

### M5e — Teaching tokens (was M4, after names)

M4 teaching tokens (`motion.spin` / `pulse` / `hoverPop` / `shake`) **wait for M5** so they are not born with `transition:`.

| Done when | Evidence |
|-----------|----------|
| Tokens authored as `Motion` / `Timing` / `Ease` | Language objects + lab |
| Guide line from the motion proposal | website objects |

---

## File map (checklist)

Mark done in the PR, not here.

**Lock / grammar**

- [ ] `shared/keywords.json`
- [ ] `shared/language-objects.json`
- [ ] `shared/frame-props.json`
- [ ] `shared/diagnostics.json` (message text if it names Transition)
- [ ] `grammar/pdl.ebnf`
- [ ] `website/src/generated/*` via `docs:gen`

**Core**

- [ ] `crates/pdl-core/src/lexer.rs`
- [ ] `crates/pdl-core/src/parser.rs`
- [ ] `crates/pdl-core/src/ast.rs`
- [ ] `crates/pdl-core/src/evaluate.rs`
- [ ] `crates/pdl-core/src/validate.rs`
- [ ] `crates/pdl-core/src/param_types.rs`
- [ ] `crates/pdl-core/src/param_bindings.rs`
- [ ] `crates/pdl-core/src/graph_serialize.rs`
- [ ] `crates/pdl-core/src/frame_props.rs`
- [ ] `src/lexer.ts` / `parser.ts` / `ast.ts` / `evaluate.ts` / `validateDesign.ts` / `paramTypes.ts` / `paramBindings.ts` / `catalogue.ts` / `graph.ts` / `motionProps.ts` / `applyMotion.ts` / `renderHtml.ts`

**Fixtures / goldens / labs**

- [ ] `test-fixtures/pdl/atoms/tokens_motion.pdl`
- [ ] `test-fixtures/pdl/lab/motion/`
- [ ] `test-fixtures/pdl/lab/effect/design.pdl` (if Motion)
- [ ] `test-fixtures/pdl/errors/e005-motion-*.pdl`
- [ ] `test-fixtures/pdl/errors/` — new “write Timing / Ease”
- [ ] `crates/pdl-core/tests/golden/`
- [ ] `tests/parser.test.ts` / `bake-design.test.ts` / `apply-motion.test.ts` / `motion-preview.test.ts`

**Tooling / docs**

- [ ] `playground/src/pdl-templates.js`
- [ ] `editors/vscode-pdl/syntaxes/pdl.tmLanguage.json`
- [ ] `docs/PROPOSAL_MOTION_PLAY.md` examples
- [ ] `docs/PROPOSAL_ROUTING_PAGES_SCREENS.md` §15
- [ ] `docs/PROPOSAL_HOST_ENVIRONMENT.md` if types are named
- [ ] `docs/SPEC_GAPS.md` / this plan / master Track M

**Backends** (after IR or CLI change)

```bash
CARGO_TARGET_DIR="$PWD/target" cargo build -p pdl-cli
npm run build
npm run build:wasm   # if bake IR field names changed
```

---

## Order

```text
M5a  lock files + grammar + proposal prose
M5b  parse / validate / evaluate
M5c  bake IR + HTML host
M5d  rewrite every fixture / lab / template / golden
M5e  M4 teaching tokens in the new names
N8   PresentationMotion (needs M5a–c at least; labs may use M5e tokens)
```

Do not start N8 until Motion goldens use `timing:` / `ease:` and `Transition` is an error.

---

## Diagnostics

| Concern | Direction |
|---------|-----------|
| Type name `Transition` / `Easing` | Error — write `Timing` / `Ease` |
| Field `transition:` / `easing:` | Error — write `timing:` / `ease:` (or flattened `duration` / `ease`) |
| `timing:` + flattened clock | E005 |
| Unknown `Ease` case | E005 |
| Quoted CSS that is not a known ease / bezier | Existing unknown-value path |

---

## Near-term checklist

- [ ] M5a lock + grammar
- [ ] M5b Rust + TS parse/validate
- [ ] M5c bake IR + host
- [ ] M5d all author-facing rewrites + goldens
- [ ] M5e teaching tokens
- [ ] N8 unblocked
