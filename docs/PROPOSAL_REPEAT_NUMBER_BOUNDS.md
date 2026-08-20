# Proposal: `Repeat` + Number param bounds

**Status:** locked (2026-08-18) — implemented in `pdl-core` (grammar / language-objects / bake / catalogue).  
**Motivating packs:** `test-fixtures/pdl/systems/ios26-lite` (page control); lab `test-fixtures/pdl/labs/repeat_number_bounds.pdl`  
**Depends on:** today’s `Number` param type; `ForEach` as overlay-only (§4e); host / catalog for platform ceilings ([`PROPOSAL_HOST_ENVIRONMENT.md`](./PROPOSAL_HOST_ENVIRONMENT.md))  
**Not a runtime.** Bake expansion + validation. Do not add Number algebra, counters, or generative games in `.pdl`.  
**Follow-on (interactive lists + emit):** [`PROPOSAL_MAP_LIST.md`](./PROPOSAL_MAP_LIST.md) — typed `Map(1...n)` list expression, nil omit, `ForEach` for emit capture (closes Q7 without emit-inside-Repeat).

Locked in `shared/*.json` / `grammar/pdl.ebnf` / Rust validate+resolve. Diagnostics: **PDL-E057** (bounds), **PDL-E058** (Repeat count/ceiling), **PDL-E059** (selection outside index domain), **PDL-E060** (binder shadowing).

---

## 1. Problem

Countable UI (page dots, N tabs, star ratings) and scalar UI (progress, slider) both look like “a number” in Figma. Today’s lite folds use **variants** (`IosPageDotCount.three`, `IosProgressValue.half`) because bake cannot:

1. **Generate N instances** from a count.
2. Express **how many are legal** without inventing an enum per HIG ceiling.

`ForEach` does not help: it **overlays** derived params on a list you already mounted; it does not create rows ([`language-objects.json`](../shared/language-objects.json) `forEach`).

Authors then approximate page controls as `count × selected` variant matrices. That is honest for a lite pack and wrong as a durable API.

---

## 2. Non-goals (keep PDL from becoming a runtime)

| Allowed | Not allowed |
|---------|-------------|
| Declared `count = 3` with min/max on the param | `count = count + 1` in layout |
| `Repeat(count:) { i in … i == currentPage }` | Author `1 - value` / `grow = value` layout math |
| Nested `Repeat` for odd but coherent grids | Open-ended programs, games, ticking counters in `.pdl` |
| Bake error when `count` is out of range | Silent “fix” of bad counts as the default teaching path |
| Host/fixture sets `currentPage` | Stepper owns a live counter in `.pdl` |
| Host/catalog raises or lowers a ceiling | `if platform == .watch { max = 5 }` trees in components |

Padding `8` and `count: 3` are the same kind of thing: **frozen intent at bake**. Live counters and continuous scrubbing belong on the host.

**“We most expect 5 pages in demos”** is a **default or fixture**, not a field on an iteration object.

---

## 3. Taxonomy (so we don’t misuse `Repeat`)

| Family | Examples | Number means | Language tool |
|--------|----------|--------------|---------------|
| **A. Generative count** | Page control, tab count, ratings | How many instances | **`Repeat`** + constrained count |
| **B. Scalar chrome** | Progress fill, slider track | An amount (often 0…1) | Declared `value: Number` for fixtures/hosts; **no** layout algebra in this proposal |
| **C. Fixed chrome + value** | Stepper ± | Value beside fixed structure | Number param; host drives value |

This proposal ships **A** and **Number bounds**. B/C stay “Number as declared value”; fill-from-fraction and stepper mutation are out of scope.

---

## 4. Three concerns — keep them apart

| Concern | Role | Where it lives |
|---------|------|----------------|
| **Coherence bounds** | “I can’t accept 1 and still be a page control” | `numberOfPages: Number(min: 2, max: 10) = 5` |
| **Default scalar** | What bake / Playground shows first | the `= 5` (fixtures may override) |
| **Iteration** | Which binder values get a child | **derived by `Repeat`**, not a separate `Range` value |

Do **not** conflate param min/max (legal knob values) with the set of loop indices. When `numberOfPages` is `3`, you mount **three** dots (`i` in the Repeat domain), not one child per value in `2…10`.

---

## 5. Preferred metaphor

### 5.1 Number stays a number

The bake / host value is always a **scalar**. Constraints hang on the **param (or named type)**, not on a Number object authors pass around.

```pdl
// Preferred — constraints on the param; default is a plain number
numberOfPages: Number(min: 2, max: 10) = 5

// Named type for docs / reuse
type PageCount = Number(min: 2, max: 10)
numberOfPages: PageCount = 5
```

**Sugar (optional, same meaning):**

```pdl
numberOfPages: Number = Number(value: 5, min: 2, max: 10)
```

expands to param constraints `min: 2, max: 10` and default `5`. It is **not** a first-class struct in bake JSON.

| Surface | Meaning |
|---------|---------|
| `count: Number(min: 2, max: 10) = 5` | Normal |
| `= Number(value: 5, min: 2, max: 10)` | Sugar ≡ constraints + default |
| `count = 5` | Value when constraints already on type/param |
| Bake / kv / fixtures | Always `"numberOfPages": 5` (scalar) |

A Number **always has a default** so Playground and fixtures can show a coherent control. min/max teach Studio, diagnostics, and knob ranges — they do not overload Number beyond being a number.

### 5.2 Two params for page chrome (do not bundle)

Tempting but wrong:

```pdl
// Do not — selection is not numberOfPages.value
pageIndicator(numberOfPages = Number(value: 5, min: 2, max: 10))
```

Correct product modeling (matches UIKit / HIG wording):

```pdl
component PageControl(
  numberOfPages: Number(min: 2, max: 10) = 5,
  currentPage: Number(min: 1) = 1
) layout {
  direction = .row
  align = .center
  gap = 8

  children = Repeat(count: numberOfPages) { i in
    if i == currentPage {
      IosPageDot(selected: true)
    } else {
      IosPageDot(selected: false)
    }
  }
}
```

- **`numberOfPages`** — how many dots; min/max are the count **contract** (`1` or `0` is incoherent for a page control).
- **`currentPage`** — which page is selected; separate concern. May fall outside the derived index set if the author builds it wrong — bake can diagnose; selection is not smuggled into the count.
- Do **not** put `max: numberOfPages` on the type (dependent typing). Bake checks `currentPage` ∈ the Repeat index domain when both are known.

### 5.3 `Repeat` — generative mount; range is a function of the call

`ForEach` remains overlay-only. **`Repeat` creates instances at bake.**

The iteration domain is **derived** from the call — not passed in as a `Range(min:, max:)` value (that re-conflates param bounds with loop indices and invites a third “default” field).

```pdl
children = Repeat(count: numberOfPages) { i in
  if i == currentPage { … } else { … }
}
```

| Rule | Choice |
|------|--------|
| **`count`** | Bake-known Number (literal / param / fixture / kv); how many children |
| **`begin`** (optional) | Origin of `i`; **default `1`** (HIG “page 1 of N”) |
| Index domain | **`begin` … `begin + count - 1`** (`count` items) |
| Body | Equality (e.g. `i == currentPage`) — not arithmetic |
| Cap | Hard language ceiling on `count` (e.g. 32) **and** on nested product (see §5.4) |
| Empty / incoherent | `count < 1` for Repeat → bake error; param `min` may be stricter (e.g. ≥ 2) |

**0-based (or other origins)** without author math:

```pdl
Repeat(count: numberOfPages, begin: 0) { i in
  // i ∈ {0, 1, …, numberOfPages - 1}
}
```

Site line:

> `ForEach` writes onto a list you already mounted. **`Repeat` mounts N copies** from a count. The binder runs `begin` … `begin + count - 1` (default `begin` is 1).

**Rejected for v1:** first-class `Range` as Repeat’s argument; `Range(…, default:)`; open `step:`. Year-strip style spans are a later form if needed — they must not drive the page-indicator primitive.

### 5.4 Nested `Repeat`

Nesting is **legal**. Odd, but reasonable for small compositional grids:

```pdl
children = Repeat(count: pages) { page in
  Layout(
    direction: .column,
    children: Repeat(count: rows) { row in
      Cell(page: page, row: row)
    }
  )
}
```

Bake expands outer then inner (cartesian product of domains). Still a **snapshot**, not a runtime loop.

| Guard | Intent |
|-------|--------|
| Hard cap on **each** `count` | Same as flat Repeat |
| Hard cap on **product** of nested counts in one component tree | Stop accidental boards / games (e.g. product ≤ 64 or 128) |
| Distinct binders | Shadowing outer names is an error or a clear diagnostic |
| Equality-only bodies | Nested does not unlock Number algebra |

Depth is not artificially capped at 1; the **product ceiling** is the real brake.

---

## 6. Validation (signals, not math engines)

| Check | Diagnostic intent |
|-------|-------------------|
| Default outside `[min, max]` | Load error — contract broken at authoring |
| Fixture / kv outside range | Bake error (prefer **error** over silent clamp) |
| `currentPage` not in derived index domain | Bake error when both known |
| `Repeat` count not integer / not finite / `< 1` | Bake error |
| `Repeat` count or nested product above hard ceiling | Bake error |
| `0` / `1` as `PageCount` when `min: 2` | Error — incoherent page control count |

Playground steppers for constrained Numbers use min/max for the knob. Selection knobs may UI-clamp using the *current* count — that is host UX, not PDL expressions in the file.

---

## 7. Platform-varying ceilings

Do **not** branch on platform inside the component. Use host / catalog data ([`PROPOSAL_HOST_ENVIRONMENT.md`](./PROPOSAL_HOST_ENVIRONMENT.md)):

**A — host injects a ceiling** (validated at bake against `numberOfPages`):

```pdl
host Phone(pageDotMax: Number = 7) mount {
  pageDotMax = host["hig.pageControl.max"] as? Number ?? 7
}
host Watch(pageDotMax: Number = 5) …
```

Type/param may keep a **union ceiling** (e.g. max 10); the active host’s `pageDotMax` is an additional bake check.

**B — catalog remaps a bound token:**

```pdl
primitive ios.limit.pageDot.max: Number = 7
catalog WatchHIG {
  ios.limit.pageDot.max = 5
}
```

Same component, different bake envelope. Spec docs show host tables — not `if` trees.

---

## 8. What this does *not* unlock yet

- Progress / slider **fill from `value`** via grow/width expressions (Family B) — separate proposal if needed.
- Stepper **increment in layout** (Family C) — host assigns `value`; chrome stays static.
- First-class **`Range`** values or `Repeat(Range(…))`.
- ForEach-style **emit capture** on Repeat binders (defer until a concrete page-dot press story).
- `i < currentPage` for “filled through” ratings (optional later; equality first).

---

## 9. Motivating before / after

**Today (ios26-lite):**

```pdl
variant IosPageDotCount { case two … case five }
variant IosPageDotIndex { case one … case five }
component IosPageControl(count: IosPageDotCount, selected: IosPageDotIndex) …
```

**Target:**

```pdl
type PageCount = Number(min: 2, max: 10)

component IosPageControl(
  numberOfPages: PageCount = 5,
  currentPage: Number(min: 1) = 1
) layout {
  children = Repeat(count: numberOfPages) { i in
    IosPageDot(selected: i == currentPage)
  }
}
```

Playground Grid stays for enums/Bools; continuous Number sampling is not required for constructability.

---

## 10. Lock / implementation sketch (when accepted)

| Slice | Deliverable |
|-------|-------------|
| **R0** | Grammar + `language-objects`: `Number(min:, max:)` on params; named `type Name = Number(…)`; catalogue exposes bounds |
| **R1** | Validate defaults / fixtures / kv against bounds; diagnostics |
| **R2** | `Repeat(count:, begin: = 1) { i in … }` bake expansion; hard cap; `children = Repeat(…)`; nested Repeat + product ceiling |
| **R3** | Cross-param check `currentPage` ∈ derived domain; lab fixture (page control + optional nested lab) |
| **R4** | Optional: host ceiling validation; migrate `ios26-lite` page control off count/index variants |

**Binding:** lock files + goldens per slice. Proposal text is intent until then.

---

## 11. Open questions

| # | Question | Lean |
|---|----------|------|
| **Q1** | Allow `i < currentPage` for “filled through” ratings in v1? | Defer — equality only for R2 |
| **Q2** | Hard per-Repeat `count` ceiling? | **32** |
| **Q3** | Nested product ceiling? | **64** (or 128 if a lab needs it) |
| **Q4** | Clamp-out-of-range as a pack policy vs always error? | **Error** for v1 |
| **Q5** | Sugar `Number(value:min:max)` in R0 or later? | Param form first; sugar optional |
| **Q6** | Keyword `begin:` vs `from:` vs `beginOffset:`? | **`begin:`** |
| **Q7** | Emit capture on Repeat-generated instances? | Defer until a concrete press story |

---

## 12. Summary

- **Number bounds** — `min` / `max` on the **param or named type**; value stays a scalar with a default (coherence + Studio knobs).
- **`Repeat(count:, begin: = 1)`** — bake-time generative mount; index domain is a **function of the call**; equality for selection chrome.
- **Nested `Repeat`** — allowed; product ceiling stops runaway grids.
- **No `Range` arg** — avoids conflating knob bounds with iteration; no `default` on an iteration object.
- **Page control** — `numberOfPages` and `currentPage` stay **two params**.
- **Platform max** — host / catalog data, not layout math.
- **Still not a runtime** — no counters, no Number algebra, no games in design files.
