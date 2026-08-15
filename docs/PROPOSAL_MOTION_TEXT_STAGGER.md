# Proposal: Stagger units — characters, words, sentences

**Status:** draft for decision (2026-08-14)  
**Depends on:** v1 `Stagger` on Motion (direct visible children); HTML host `playMotionTree` / `holdMotionTree` in `src/renderHtml.ts`; Track M (`docs/PROPOSAL_MOTION_PLAY.md`) — especially **M2** frame `animate` and **M3** key WAAPI  
**Related:** language object `Stagger`; lab `test-fixtures/pdl/lab/motion/` (`MotionStaggerList`)  
**Does not change:** bake-at-rest; layout-child stagger; pose track vs tree tween

This is a **host + Stagger-field** cut, not a second motion system. Decide whether it is worth a track before any lock-file work.

---

## 1. Problem

Authors write type-on, word-cascade, and sentence-reveal all the time on the web. PDL already has the delay math (`step` × index, `from: .first | .last`). It does not have units smaller than a frame.

Today:

| What you write | What happens |
|----------------|--------------|
| `stagger:` on a **layout** with frame children | Works. Each `.pdl-frame` / `.pdl-instance` child gets `delay += index * step`. `MotionStaggerList` is this. |
| `stagger:` on a **text** frame (or a root with no frame children) | **Legal. No error.** `directMotionChildren` is empty → host plays the pose on the **whole node**. Letters move together. `step` / `from` are unused. |
| Expect letters to cascade | Silent fallback, not a diagnostic. |

CSS cannot target glyphs in a text node (`::nth-letter` does not exist). Sites that show this effect (React or not) split the string into boxes, then stagger those boxes. PDL would do the same in the HTML host.

---

## 2. Preferred metaphor

`Stagger` stays one object. It answers **who gets the next delay**, not what the path is.

```pdl
enum StaggerUnit {
  case children     // default — today’s rule
  case characters   // grapheme clusters
  case words
  case sentences
}
```

```pdl
Stagger(step: 30, from: .first, unit: .characters)
```

`unit` omitted = `.children`. Existing files keep their meaning.

Authors’ gloss:

> *Stagger offsets the same Motion across siblings. Default siblings are direct visible children. On a text frame you may choose characters, words, or sentences.*

No `Typewriter` type. No per-glyph `Pose`. The path is still `pose:` / `keys:`.

---

## 3. Site rule (locked if we pursue)

**Text units apply only when the motion target is a text frame.**

- Layout + `unit: .children` (or omit) → today’s child list. **Never** walk into a child’s `content` and letter-split it.
- Layout + `unit: .characters` / `.words` / `.sentences` → **PDL-E005**. Do not guess “stagger my title.”
- Text frame + `unit: .children` (or omit) → no frame children → play the whole node (today’s fallback). Optional later: warn, not in v1 of this track.
- Text frame + a text unit → split that frame’s `content` and stagger the pieces.

This keeps `MotionStaggerList` stable and avoids “stagger the card” accidentally cascading every label.

**Useful authoring wants M2.** Handler `self.appear` is on the **component root**. A card whose root is a layout cannot letter-stagger its title from that handler. The natural spelling is frame `animate` on the text let:

```pdl
let title = Text(content: "Save playlist?")
if true {
  title.animate = Motion(
    transition: (duration: 400, easing: "ease-out"),
    pose: Pose(opacity: 0, translateY: 8),
    stagger: Stagger(step: 24, unit: .characters)
  )
}
```

Without M2, the only clean site is a component whose **root is text** (`component Hero <PointerInput>() text { … self.appear = { … } }`). That is a valid lab, a weak product story.

**Do not recurse.** A layout stagger does not also character-stagger text descendants. One Motion, one unit, one target.

---

## 4. Type: `Stagger` (extended)

Category: motion. Used on: `Motion.stagger`.

```pdl
Stagger(
  step: Duration,                 // required; milliseconds
  from: StaggerFrom = .first,     // .first | .last
  unit: StaggerUnit = .children   // new; optional
)
```

- Unknown `unit` → PDL-E005.
- Text unit + no pose/keys → still E005 (stagger already requires a pose track).
- Themes replace a Stagger wholly (no field merge), same as today.
- Copy + override (M1) can replace `stagger:` on a Motion token.

**Unit meaning**

| `unit` | Split | Index 0 |
|--------|--------|---------|
| `.children` | Direct visible frame / instance children (today) | First/last child per `from` |
| `.characters` | Grapheme clusters (`Intl.Segmenter` `granularity: "grapheme"`), not UTF-16 code units | First/last cluster |
| `.words` | `Intl.Segmenter` `granularity: "word"`; **keep** spaces/punctuation as their own pieces so layout does not collapse | First/last word *or* separator (see §6) |
| `.sentences` | `Intl.Segmenter` `granularity: "sentence"` | First/last sentence |

`.last` on a text unit is “cascade from the end” (collapse / reverse type-on), not a different split.

Locale: use the document / design language if we have one later; HTML preview v1 uses the runtime default locale (`Segmenter` without an explicit locale, or `"en"` if we must pin goldens).

---

## 5. What the HTML host must do

Bake stays at rest. Glyph spans are **not** bake IR. The host materializes them for play / hold, then can tear them down.

### 5.1 Split (the actual work)

Text frames are leaves. `content` is one text node, or one inner span (`.pdl-text__inner` / `.pdl-text__clamp`). `directMotionChildren` never sees letters.

At play/hold, if the target is a text frame and `unit` is a text unit:

1. Read the visible string (baked `content`, or the inner node’s `textContent`).
2. Segment it.
3. Replace the text node with sibling spans, e.g. `<span class="pdl-text__unit" data-pdl-stagger-unit="1">S</span>…`.
4. Each unit span is `display: inline-block` (WAAPI `transform` / `opacity` need a box).
5. Run the existing delay loop over those spans instead of `directMotionChildren`.

`staggerDelayMs` / `playMotionOnEl` do not change. Only the **list of elements** changes.

### 5.2 Hold and live ticks

Appear-from hold must hold **each unit** at the pose (same as children today).

`patchTextContentLive` currently assigns `textContent` and **wipes** children. If a split is mounted, a content tick must **rebuild** the unit spans, then re-hold if appear is still armed. Incremental preview is part of the slice, not a follow-on.

### 5.3 Skip / degrade (v1)

| Surface | Behavior |
|---------|----------|
| Plain `.pdl-text` (single text node) | Split + stagger |
| Layered text (`.pdl-text__inner`) | Split the inner only; leave layer bands alone |
| Line-clamp (`.pdl-text__clamp`) | **Degrade:** play the whole node. Clamp + N `inline-block`s fights `-webkit-line-clamp` |
| Editable `<input>` / press-hit that becomes an input | **Degrade:** whole node. Cannot wrap `value` |
| `prefers-reduced-motion` | Duration 0; skip split (or split unused) |
| Empty / whitespace-only | Play whole node |
| Very long strings | Cap (propose **80 units**). Over cap → whole node. Titles yes; paragraphs no |

Degrade is silent (same family as today’s empty-child fallback). A later diagnostic is optional.

### 5.4 Layout cost of `inline-block`

Per-glyph `inline-block` changes wrapping, kerning, and justification. Acceptable for short titles; wrong for body copy. That is why the cap and “text leaf only” exist.

Words / sentences need fewer boxes and keep more typography. Prefer teaching **words** for UI chrome, **characters** for short hero lines, **sentences** for a two-line reveal.

### 5.5 Accessibility

N letter nodes can be announced as individual characters. Host must set a single accessible name on the text frame (`aria-label` = full string) and `aria-hidden="true"` on unit spans (or `role="presentation"`). Screen readers read the sentence; sighted users see the cascade.

Selection / find-in-page will be worse while split is mounted. Acceptable during appear; after appear `finished`, **unwrap** back to a single text node so the rest tree matches bake. Dismiss may re-split.

### 5.6 Other hosts

SwiftUI / etc. would need their own split (`Text` + `HStack` of `Text`, or attributed-string animation). This proposal is **HTML preview first**. Do not block the language field on a second host. A non-HTML host that ignores `unit` and plays the whole node is conforming for v1 (same as ignoring keys before M3).

`sibling-index()` (Chrome/Safari; not Firefox) can CSS-delay sibling boxes. PDL already sets WAAPI `delay`. It does not remove the split. Do not depend on it.

---

## 6. Word and sentence details

**Characters.** Graphemes. Space is a unit (invisible opacity). Newlines: treat as a unit that may be `inline-block` + `width: 100%` or degrade the line to one piece. v1 lab should be **single-line** titles so we do not design wrapping in the first slice.

**Words.** Segmenter word pieces include separators. Two policies:

| Policy | Effect |
|--------|--------|
| **A — animate every piece** | Spaces get a delay slot (usually invisible). Simpler index. |
| **B — delay only “isWordLike” pieces; spaces get the previous word’s delay** | Feels like a word cascade; spaces do not eat the clock. |

Recommend **B** for `.words`. Characters stay A (every cluster). Sentences stay A (each sentence is visible).

**Sentences.** Segmenter is locale-sensitive (`Mr.` vs end of sentence). Good enough for preview; pin locale in goldens if tests assert span counts.

---

## 7. Play / keys / interrupt

Same Motion, same playhead (Track M). Each unit plays the **same** keys with a different delay.

- Appear + `.toRest` + characters → type-on to rest.
- `.loop` + characters → every letter loops, phase-offset. Expensive; allowed; cap still applies.
- M3 interrupt reverse-from-current → each in-flight unit reverses from its own progress (same as children). Do not invent a second interpolator.
- Standing (`if` + frame `animate`) + text unit → same start/stop as M3, on unit spans.

Ship text-unit **play of a single pose** with M3’s child path first. Keys-on-units ride M3; do not fork a typewriter renderer.

---

## 8. Implementation slices (if pursued)

Do **not** start this until M2 is in lock files (authoring site) and M3’s child stagger / key WAAPI is stable (same play helper). Suggested track **T** (text stagger), not a parallel `motion-literal` cut.

| Slice | Deliverable | Done when |
|-------|-------------|-----------|
| **T0** | `Stagger.unit` parse + validate | Grammar + TS/Rust; default `.children`; E005 on unknown unit; E005 text unit on a **layout** motion target; existing labs unchanged |
| **T1** | HTML split + pose play/hold | Lab: text-root or `title.animate` character appear; whole-node degrade on input/clamp; live content rebuild; unwrap after appear `finished` |
| **T2** | `.words` / `.sentences` | Lab cards; word policy B; sentence goldens with pinned locale |
| **T3** | Teaching | Language objects; Guide line; optional `motion.stagger.chars` token in M4-era lab |

T0 is lock-file small. T1 is the risk slice (DOM split, live patch, a11y, unwrap). T2 is Segmenter policy. T3 is docs.

**Likely files:** `grammar/pdl.ebnf`, `shared/language-objects.json`, `src/parser.ts` / `crates/pdl-core/src/parser.rs`, validate both sides, `src/motionProps.ts` + catalogue (pass `unit` through), `src/renderHtml.ts` (split / unwrap / `patchTextContentLive`), `src/applyMotion.ts` (optional helper), `test-fixtures/pdl/lab/motion/`, host tests next to `tests/motion-preview.test.ts`.

---

## 9. Cost and risk

| Risk | Why it matters |
|------|----------------|
| Typography | `inline-block` per glyph ≠ real text run. Short titles only. |
| Live preview | Content ticks destroy a naive split. Must rebuild + re-hold. |
| Clamp / edit | Cannot do honestly. Must degrade, not throw. |
| a11y | Must label the parent and hide units; unwrap at rest. |
| Performance | N WAAPI animations. Cap at ~80. |
| Locale | Word/sentence boundaries differ; goldens need a pinned locale. |
| Scope creep | Line-by-line, RTL visual order, per-glyph color, caret-aware edit. Out of v1. |

**Effort (order of magnitude, one engineer who already knows this host):**

- T0: half day (same shape as `from:`).
- T1: several days (split, hold, live patch, unwrap, degrade, tests, one lab). Larger than `Pose.rotate`; smaller than M3 if we stay single-pose + single-line.
- T2: a day once T1 exists.
- T3: hours.

Not free. Not a rewrite.

---

## 10. Rejected (unless we reopen)

| Idea | Why |
|------|-----|
| Implicit “stagger on text means characters” | Changes no current file, but surprises and blocks a later explicit unit. Prefer `unit:`. |
| Layout stagger also splits descendant text | `MotionStaggerList` would letter-cascade row labels. |
| Bake glyph spans into IR | Fights bake-at-rest; every host must understand fake children. |
| New `Typewriter` / `Reveal` type | Same path as Motion; unit belongs on Stagger. |
| CSS-only (`sibling-index()`, `::first-letter`) | No per-letter selector; `sibling-index` only delays boxes you already made. |
| Character stagger on `<input>` | Not representable. |
| No cap | Paragraphs will hitch the playground. |
| Recurse characters *and* children | Two clocks, unclear `from`. |

---

## 11. Teaching (if we ship)

1. Stagger’s default unit is **children** (lists, rows).
2. On a **text** frame, set `unit: .characters` / `.words` / `.sentences`.
3. Put that Motion **on the text** (`title.animate` / text-root `self.appear`), not on the wrapping card.
4. Keep the string short.

Lab: `MotionTypeOn` (characters), `MotionWordCascade` (words), keep `MotionStaggerList` as the child-unit control.

Site line:

> Stagger offsets the same Motion across siblings. Children are the default. On text, you may stagger characters, words, or sentences.

---

## 12. Open decisions (this draft)

Answer these to accept or drop the track:

| ID | Topic | Options | Recommendation |
|----|--------|---------|----------------|
| **Q1** | Pursue at all? | Ship after M2+M3 / HTML-lab-only with no language field / drop | **Ship after M2+M3** if type-on is a teaching goal; **drop** if lists are enough for v1 |
| **Q2** | Spelling | `Stagger.unit` vs infer from target vs new type | **`unit:`** on Stagger |
| **Q3** | Layout + text unit | E005 / ignore unit / descend into text kids | **E005** |
| **Q4** | Word policy | A every piece / B word-like only | **B** |
| **Q5** | Cap | 80 / 40 / none | **80** units, then whole node |
| **Q6** | After appear | Unwrap / leave spans | **Unwrap** so rest DOM matches bake |
| **Q7** | M2 dependency | Require frame `animate` / allow text-root-only labs first | **Require M2** for the authoring story; text-root lab can prove T1 early |

---

## 13. Verdict for the decision

The delay engine is done. The missing piece is a **host text split** plus a **unit field** so lists stay lists.

Worth it if we want PDL to express the type-on / word-cascade posters people already expect, and we are willing to own split/unwrap/a11y on the HTML preview. Not worth it if v1 motion teaching stops at **child lists + whole-node text**. Nothing in HTML/CSS removes the split; React apps do not have a shortcut we lack.

**Suggested call:** park until M3 is up. If we still want it, accept Q2–Q6 as tabled, add Track T, start T0+T1 on a text-root lab, then hook the real spelling to M2 `title.animate`.
