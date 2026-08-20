# Proposal: `Map` — typed list from a range (compactMap-shaped)

**Status:** locked (2026-08-19) — G0–G3 shipped (`Map` parse/resolve, ForEach on Map lets, ios26-lite + `labs/map_list.pdl`)  
**Motivating case:** interactive page control — count → typed `[IosPageDot]`, then `ForEach` for emit capture  
**Depends on:** Number bounds ([`PROPOSAL_REPEAT_NUMBER_BOUNDS.md`](./PROPOSAL_REPEAT_NUMBER_BOUNDS.md)); `ForEach` overlay + emit capture (§4e); protocols / `[P]` slots  
**Supersedes for interactive lists:** treating `Repeat` as “mount-only children sugar” (Q7 deferred there).  
**Not a runtime.** Bake expands a range into a list value. No `append`, no `return`, no Number algebra.

Normative surface: `shared/keywords.json`, `shared/language-objects.json`, `grammar/pdl.ebnf`.

---

## 1. Problem

`Repeat` solved **generative mount** from a count (`children = Repeat(count:) { i in Dot(…) }`). It left two gaps:

1. **Mount vs list** — authors experience Repeat as “magically becomes children,” which fights the language rule that only `children =` draws.
2. **Wire** — emit capture lives on named lets / `ForEach` binders. Repeat bodies cannot declare `let`, cannot attach `dot.select = { … }`, and Q7 deferred Repeat emit capture.

Interactive page dots need all three jobs:

| Job | Tool |
|-----|------|
| Generate | range → typed list |
| Mount | `children = dots` |
| Wire | `ForEach(dots) { … emit capture … }` |

Swift’s closest idiom is `(1...n).compactMap { … }` / `.map { … }` — a **list expression**, then use the array. PDL should look like that, not like a for-loop that mutates `[]`.

---

## 2. Preferred shape

```pdl
component IosPageDot <PointerInput>(
  page: Number = 1,
  selected: Bool = false
) layout {
  // chrome…
  self.pressEnd = { emit select(page) }
} emits {
  select(page: Number)
}

component IosPageControl(
  numberOfPages: IosPageCount = 3,
  currentPage: Number(min: 1) = 1
) layout {
  let dots: [IosPageDot] = Map(1...numberOfPages) { i in
    if someGate {
      IosPageDot(page: i)
    }
    // no matching branch / no component expression ⇒ nil (omit from list)
  }

  ForEach(dots) { dot in
    dot.selected = self.currentPage == page
    dot.select(page: Number) = {
      currentPage = page
    }
  }

  children = dots
}
```

**Site line:**

> **`Map(range) { i in … }`** builds a typed list at bake. The body’s **component expression** is the element; fallthrough with no component is **nil** (omit). **`ForEach`** wires that list. **`children`** mounts it.

---

## 3. Semantics

### 3.1 `Map` is a list expression — not a mount

| Form | Meaning |
|------|---------|
| `let dots: [T] = Map(…) { … }` | Typed list value (preferred teaching form) |
| `children = Map(…) { … }` | Sugar: anonymous list, mount only (no ForEach identity) |
| `let dots = Map(…) { … }` | Type inferred from body element type when unambiguous |

`Map` does **not** draw by itself. Same rule as `ForEach` (overlay only) and list params.

### 3.2 Range (not `count:` + `begin:`)

```pdl
Map(1...numberOfPages) { i in … }
Map(0..<numberOfPages) { i in … }   // if half-open is locked
```

| Rule | Choice |
|------|--------|
| Bounds | Bake-known Numbers (literal / param / fixture / kv) |
| Closed `a...b` | Inclusive; length = `b − a + 1` |
| Default page-control domain | `1...numberOfPages` (HIG page 1 of N) |
| Binder `i` | Each integer in the domain — equality OK (`i == currentPage`); no algebra |
| Ceilings | Same spirit as Repeat: per-Map length ≤ 32; nested product ≤ 64 |

**Migration from Repeat:** `Repeat(count: n, begin: 1)` ≡ `Map(1...n)` when `n` is the count. Prefer range in new teaching; keep `Repeat` as deprecated sugar or remove in a breaking slice.

### 3.3 Body = compactMap without `return`

The body is an **expression builder**, not a statement script.

| Body result | List effect |
|-------------|-------------|
| Component ctor (`IosPageDot(…)`) | **Include** that instance |
| `if cond { Ctor(…) } else { OtherCtor(…) }` | Include the matched branch’s instance |
| `if cond { Ctor(…) }` with no else, cond false | **`nil` — omit** (compactMap) |
| Fall off the end with no component expression | **`nil` — omit** |
| `let` / multi-statement blocks | **Illegal** (same as today’s Repeat) — no `append`, no `return` |

Creating a component **is** “yes, save this.” There is no separate yield keyword. Omit is structural (no expression), not `return nil`.

**Not allowed:** imperative accumulation:

```pdl
// Reject
let dots: [IosPageDot] = []
Map(1...n) { i in dots.append(IosPageDot(page: i)) }
```

### 3.4 Element type

```pdl
let dots: [IosPageDot] = Map(…) { … }
let items: [SomeProtocol] = Map(…) { … }   // each yield must satisfy the protocol / slot type
```

- Annotation (or list-param type) is the **contract**.
- Every non-nil yield must be that component type or a type that fills `[SomeProtocol]` / `emits <P>` as required today for list elements.
- Heterogeneous `IosPageDot or Foo` as a union annotation is **out of v1** unless protocol/`[P]` already covers the case — prefer one protocol or one component type.

### 3.5 Identity for emits

Pass the binder into the instance as a param (`page: i`). The child `emit select(page)`; the parent hears it via `ForEach`. Do **not** invent “emit the binder from Map.”

---

## 4. Trio (lock the vocabulary)

| Keyword | Job |
|---------|-----|
| **`Map`** | Range → typed list (may omit slots) |
| **`ForEach`** | Overlay + emit capture on a list you have |
| **`children`** | Mount |

Do **not** overload `ForEach` to generate from a count. Do **not** teach `Map` as children-sugar.

Swift parallel: `(1...n).compactMap { … }` then use the array; SwiftUI `ForEach` for view/identity wiring is a different layer — in PDL that layer is `ForEach` + `children`.

---

## 5. Relation to `Repeat`

| | `Repeat` (locked) | `Map` (this proposal) |
|--|-------------------|------------------------|
| Primary use | Mount N chrome copies | Build typed list for mount **and** ForEach |
| API | `count:` / `begin:` | `a...b` range |
| Omit slots | No (always N children) | Yes (`nil` fallthrough) |
| Emit capture | Deferred (Q7) | Via `ForEach` on the list — no new emit dialect |
| `let x = Repeat; children = x` | Exists | Prefer `let x: [T] = Map; children = x` |

**Recommendation:** implement `Map`; migrate labs/ios page control; deprecate `Repeat` as alias or remove in a named breaking cut. Number bounds (`PDL-E057`…) stay.

---

## 6. Non-goals

| Allowed | Not allowed |
|---------|-------------|
| Omit via missing branch / fallthrough | `return nil` / `return dot` |
| Equality on binder | `i + 1`, `i < n` algebra (unless a later proposal locks compare ops carefully) |
| Protocol / component element type | Ad-hoc `A or B` union types in v1 |
| Nested Map with product ceiling | Open-ended programs, games, live counters in `.pdl` |
| Host/fixture changes `numberOfPages` | Stepper mutates count inside layout |

---

## 7. Diagnostics (sketch)

| Code | Intent |
|------|--------|
| (reuse ceilings) | Map length / nested product over ceiling |
| new | Range bounds not bake-known Numbers / non-integer / empty incoherent domain |
| new | Yield type does not match `[T]` / protocol element |
| new | `let` or statements in Map body |
| new | `ForEach` on a Map let that was never typed as a list (internal) |

---

## 8. Implementation slices (when accepted)

| Slice | Deliverable |
|-------|-------------|
| **G0** | Grammar + language-objects: `Map(a...b) { i in }`; list expression; nil omit; site lines |
| **G1** | Resolve/bake: expand to list IR; typecheck yields; ceilings |
| **G2** | `ForEach` on Map lets (same capture path as list params) |
| **G3** | Page-control lab + ios26-lite interactive dots |
| **G4** | Deprecate / remove `Repeat` or keep as sugar → `Map(begin...(begin+count-1))` |

---

## 9. Open questions

| # | Question | Lean |
|---|----------|------|
| **Q1** | Half-open `..<` in v1? | Optional; closed `...` enough for page control |
| **Q2** | Keep `Repeat` forever as sugar? | Deprecate after Map ships |
| **Q3** | `if` without else always omit, or require explicit empty? | **Omit** (compactMap) — document loudly |
| **Q4** | `map` (always N) vs compactMap name? | Keyword **`Map`**; semantics are compactMap-shaped |
| **Q5** | `IosPageDot or Protocol` union annotations? | Defer; use `[Protocol]` |
| **Q6** | Nested Map inside Map element ctor args? | Same product ceiling as nested Repeat |

---

## 10. Summary

- **`Map(1...n) { i in Expr }`** — bake-time typed list; Expr is the element; no Expr ⇒ nil omit.
- **Explicit mount** — `children = dots`.
- **Explicit wire** — `ForEach(dots)` for selected + emit.
- **No append / return** — yield-by-expression keeps PDL a snapshot language.
- Closes Repeat Q7 without inventing emit-inside-Repeat.
