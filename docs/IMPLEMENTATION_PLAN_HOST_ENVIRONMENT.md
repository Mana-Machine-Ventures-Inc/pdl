# Implementation plan — Host environment

**Proposal:** [`PROPOSAL_HOST_ENVIRONMENT.md`](./PROPOSAL_HOST_ENVIRONMENT.md) (2026-08-16)  
**Revises:** [`PROPOSAL_ADAPTIVE_LAYOUT.md`](./PROPOSAL_ADAPTIVE_LAYOUT.md) — pack `host` + `<Host>` instead of prelude `SizeClass` / `<AdaptiveLayout>`  
**Binding:** lock files + goldens per slice. Proposal text is intent until `shared/*.json` / `grammar/pdl.ebnf` change.  
**Core:** Rust-first (`crates/pdl-core`). WASM / Playground consume the bake API. TS oracle does not need a parallel port.

Until a slice is locked, tooling must not treat `host` / `catalog` / `??` / multi-protocol headers as normative.

---

## Principles

1. **One bake, one environment.** `mount` runs once per bake against `hostFactsJson`. Crossing a breakpoint is a new bake with a new bag — not per-instance measure, not CSS.
2. **Pack owns the taxonomy.** `WindowSize` / `AppSurface` in the proposal are teaching examples. Authors declare their own variants and host params. Language does not ship size-class cases.
3. **Facts bag is opaque.** Recommended keys and tag strings may ship later as conventions. Vendors and authors own the vocabulary. Unknown / missing keys are not errors; they fall through `??`.
4. **`??` is the v1 operator.** Soft `host["k"] as? T` produces the optional that `??` consumes. No `if let` / `guard` / `.isNumber` in v1. Strict `as T` can wait.
5. **Same param shape on every `host` in the design.** Names and types must match; defaults may differ. Extra CI-only params hang on every profile with a dummy default.
6. **Catalog token discipline is an author problem.** Compiler does not restrict which tokens a catalog remaps. Theme then catalog (Q8).
7. **`<Host>` is opt-in.** Only structural parents should read host params. Molecules take ordinary params.
8. **Rust-first vertical slices.** Each slice: grammar/lock → parse/validate → bake golden → lab fixture. No double TS implementation.

---

## Locked decisions

| ID | Topic | Decision |
|----|--------|----------|
| **Q1** | Protocol name | `Host` (prelude stub, like `PointerInput`) |
| **Q2** | Body keyword | `mount` |
| **Q3** | Assign in `mount` | `self.param =` |
| **Q4** | Bag probe | `host["key"]` (`hostInput("key")` not required in v1) |
| **Q5** | `previewBackground` | Host param; inject onto `<Host>` for v1; migrate the bare top-level decl in H5 |
| **Q6** | Default profile | Host named `Default`, else the sole `host` in the design |
| **Q7** | JSON number → Distance | Accept |
| **Q8** | Token stack | Base → user theme(s) → catalogs used in `mount` (catalog wins on shared keys) |
| **Q9** | `use theme` in `mount` | No in v1 |
| **D1** | When environment is read | **Bake time only.** No nested / per-mount measure in v1 |
| **D2** | Size / surface variants | Author-defined. Not prelude |
| **D3** | Standard fact strings | Later conventions, not grammar. Vendors and authors may use other keys/tags |
| **D4** | Coalesce | `??` required. `as?` only as the soft probe |
| **D5** | Multi-protocol headers | **In scope.** `component Shell <Host, PointerInput>()` |
| **D6** | API protocols in a multi header | **At most one API protocol** in v1. Any number of host protocols. Duplicates → error |
| **D7** | `protocol … : host` shape constraint | Later (not H0–H5) |

---

## Bake order (all slices)

```text
load / merge
  → validate host profiles share param shape
  → pick active host (arg / Default / sole)
  → start at that host’s defaults
  → run mount (if any) against hostFactsJson
  → pin host params whose names appear as facts keys (Playground chrome)
  → token map = base + user theme stack + catalogs from mount
  → inject resolved host params into components with effective Host
  → resolve / bake tree
```

WASM / CLI grow two optional args; existing callers stay valid:

```text
bake_component_sources(
  filesJson, entry, component,
  theme?,          // user theme only — catalogs rejected
  kvJson?,
  host?,           // profile name; default Q6
  hostFactsJson?   // opaque object; missing keys ignored; param-name keys pin after mount
)
```

Fixtures may set `host`, `hostFacts`, and user `theme` separately (H4+).

---

## Track H — slices

### H0 — Multi-protocol headers

Prerequisite. Ship before Host injection so `<Host, PointerInput>` is legal when H2 lands. Testable with today’s prelude alone (`<PointerInput, EditableText>`).

| Done when | Evidence |
|-----------|----------|
| Grammar is `component Name <P { ',' P }>()` | `grammar/pdl.ebnf` `component-decl` |
| AST stores a list | `ComponentDecl.conforms_to: Vec<String>` (empty = none) |
| `effective_host_protocols` unions every header name + `requires` | `design.rs`; E030 still fires if a channel is used without effective conformance |
| `effective_params` / `effective_emits` merge from the API protocol in the list (if any) | Same last-wins-on-name as today |
| Catalogue `conformsTo` is a string array | `shared/schema/component-catalogue.json`; existing single-protocol goldens update |
| Duplicate or unknown name → error | New diagnostic + `test-fixtures/pdl/errors/` |
| Two host protocols on one component both inject | Lab: `<PointerInput, EditableText>` still gets `value` / `isEditing` and pointer channels |

**Touch:** `parser.rs` `parse_component`; `ast.rs`; `design.rs` `effective_*`; `catalogue.rs`; `validate.rs` E030 path; TS oracle only if it still parses headers (skip if Rust-only).

**Do not** invent Host, `host`, or `catalog` in this slice.

---

### H1 — Grammar: `host`, `catalog`, prelude `Host`

**Shipped.** Parse and store. Do not evaluate `mount` or inject yet.

| Done when | Evidence |
|-----------|----------|
| Keywords locked | `shared/keywords.json`; `lexer.rs` (`host` already exists as protocol marker — top-level `host Name` is a new decl; `catalog`, `mount`, `use` as needed) |
| `host Name(params) [mount { … }]` parses | AST `HostDecl` (params + optional mount body). Mount body may be stored raw / untyped in H1 |
| `catalog Name { token = … }` parses | Same remap shape as `theme` + `role: host` |
| `theme` stays `role: user` | Catalogue / language-objects metadata |
| Prelude `protocol Host { host }` | `test-fixtures/pdl/stdlib/host_protocols.pdl` |
| Two hosts with different param names/types → error | Validate at merge; fixture in `errors/` |
| Language objects + Guide one-liners | `host`, `catalog`, `Host` vs `theme` |
| Existing goldens unchanged | No bake behavior change |

`WindowSize` is **not** added to stdlib.

---

### H2 — Defaults + `<Host>` inject (no bag)

**Shipped.** Environment is the active host’s **defaults**. Enough to bake Compact/Regular as ordinary kwargs or by picking a host profile that defaults differently (`host CI` vs `host Default`).

| Done when | Evidence |
|-----------|----------|
| Bake / WASM accept optional `host` profile name | Unknown name → error |
| Components with effective `Host` get host params in `effective_params` | Mirror EditableText gap-fill; author param of the same name wins |
| Reading a host param without `<Host>` → error | Same family as unknown-param diagnostics |
| `<Host, PointerInput>` injects both Host params and pointer channels | Depends on H0 |
| Lab pack with author `variant WindowSize` + `host Default` / `host CI` | `test-fixtures/pdl/lab/host/` — Shell branches on `sizeClass`; CI host has a different `previewBackground` default |
| Bake goldens for Default vs CI (no facts) | `crates/pdl-core/tests/golden/` |
| `--theme` / bake `theme` still user-only | No catalogs yet |

**Product rule in the lab:** only `Shell` (or similar) has `<Host>`. Child cards do not.

---

### H3 — `mount` + `host["k"] as? T` + `??`

**Shipped.** Facts bag in, typed host params out. Still one environment per bake.

| Done when | Evidence |
|-----------|----------|
| `host["key"]` and `??` parse **only** in `mount` | Use outside `mount` → error |
| Soft miss / bad convert → none; `??` takes the next arm | Including a final literal default |
| JSON number accepted as `Distance` | Q7 |
| Unread keys ignored | No diagnostic |
| `self.param =` writes the host param bag used for inject | After `mount`, H2 injection sees the refined values |
| `if` on mount locals / `self.param` works | Width cuts and string tag lists in the proposal example |
| Bake / WASM accept `hostFactsJson` | `{}` or omit ≡ defaults only |
| Goldens: watch-sized bag → compact + watch surface (author variants) | Same lab; facts override defaults |
| Goldens: empty bag → host defaults | Coalesce falls through |

**Not in H3:** `use catalog`, Playground ResizeObserver, recommended tag list as enforcement.

---

### H4 — `catalog` + `use catalog` + roles

**Shipped.** Theme then catalog (Q8). `use catalog` and one-off token assigns only in `mount`.

| Done when | Evidence |
|-----------|----------|
| `use catalog Name` only in `mount` | Elsewhere → error |
| `use catalog` on a `theme` name → error; `--theme` / bake theme on a catalog name → error | Role check |
| Token map = base + user theme(s) + catalogs from `mount` | Q8; bake golden: Dark + AppleIcons, icons from catalog, colors from Dark |
| Catalogue lists catalogs separately from themes | Playground / Studio theme picker has no catalog rows |
| Direct token assign in `mount` (`icon.action.favorite = …`) works without a named catalog | Small one-off golden |
| Language objects: themes are what a person flips; catalogs are what the host picks | Guide + `hostPrelude` |

No compiler lint for “catalog remapped `color.surface`.”

---

### H5 — Playground facts + `previewBackground` ✅

| Done when | Evidence |
|-----------|----------|
| Playground passes `view.width` / `view.height` (and a platform tag if it has one) as `hostFactsJson` | Recommended keys, not required |
| Resize that should change an author-defined class **rebakes** with a new bag | Class-change only; debounce. No CSS `@media` in bake IR |
| `/device` can send a narrower width / different tag | Still one bake |
| Bare top-level `previewBackground` still works | Migration: prefer host param; resolve bake chrome from host param when present, else legacy decl |
| Fixture examples can pin `host` + `hostFacts` + `theme` | Review SoT without resizing |
| Theme picker unchanged (user themes only) | Catalogs stay out |

**Not in H5:** nested measure, live CSS container-query hint, shipping a normative string enum.

---

## Later (not this track)

| Item | Why later |
|------|-----------|
| Nested / per-mount measure | D1 — bake-wide class is v1 |
| `protocol AppHost: host` + `host Default <AppHost>` | D7 |
| Recommended fact-key / tag list as published convention | D3 — docs-only when we have two real hosts |
| Strict `as T`, `if let`, `.isNumber` | D4 |
| `hostInput("k")` alias | Q4 |
| CSS container-query hint | Host sugar; rebake remains SoT |
| Prelude `SizeClass` / `<AdaptiveLayout>` | Superseded; do not implement |
| `theme Name for Host.…` | Non-goal |

---

## Diagnostics (allocate in `shared/diagnostics.json`)

Reuse existing codes where the case already exists (unknown name, unknown param, E030/E031/E032). New codes for:

| Concern | Slice |
|---------|-------|
| Host profiles with different param shapes | H1 |
| Duplicate protocol in `<A, A>` | H0 |
| More than one API protocol in a header | H0 / D6 |
| `host["…"]` / `??` / `use catalog` outside `mount` | H3 / H4 |
| Unknown host profile name | H2 |
| `use catalog` / `--theme` role mismatch | H4 |
| Host param read without effective `Host` | H2 |

Exact `PDL-E0xx` numbers assigned when the lock file is edited (next free after E042).

---

## Lab pack (author-owned taxonomy)

`test-fixtures/pdl/lab/host/` — **not** stdlib. Suggested shape (names are pack-local):

```pdl
variant WindowSize { case compact; case medium; case expanded }
variant AppSurface { case mobile; case web; case watch }

catalog AppleIcons { /* icon.* remaps */ }
catalog MaterialIcons { /* icon.* remaps */ }

host Default(
  sizeClass: WindowSize = .medium,
  surface: AppSurface = .mobile,
  previewBackground: Color = color.surface
) mount { /* H3+ probes; H4 use catalog */ }

host CI(
  sizeClass: WindowSize = .medium,
  surface: AppSurface = .mobile,
  previewBackground: Color = color.white
)

component Shell <Host, PointerInput>() layout { /* … */ }
```

Fixtures: Default / CI / “watch facts” / “Dark + watch facts”. Child molecules take `sizeClass` as a normal param if they need it; they do not opt into `<Host>`.

---

## File map

| Area | Files |
|------|--------|
| Grammar | `grammar/pdl.ebnf` |
| Keywords / objects / diagnostics | `shared/keywords.json`, `shared/language-objects.json`, `shared/diagnostics.json` |
| Catalogue / bake schema | `shared/schema/component-catalogue.json`, `shared/schema/baked-design.json` |
| Prelude | `test-fixtures/pdl/stdlib/host_protocols.pdl` |
| Lexer / parse / AST | `crates/pdl-core/src/lexer.rs`, `parser.rs`, `ast.rs` |
| Merge / inject | `crates/pdl-core/src/design.rs` (`effective_params`, `effective_host_protocols`) |
| Mount eval | new or `evaluate.rs` — mount-only expr subset |
| Bake | `crates/pdl-core/src/bake.rs`, `evaluate.rs` `build_resolved_token_map` |
| WASM / CLI | `crates/pdl-wasm/src/lib.rs`, `crates/pdl-cli` |
| Playground | bake-pipeline / WASM call sites; theme picker filter |
| Labs / errors / goldens | `test-fixtures/pdl/lab/host/`, `test-fixtures/pdl/errors/`, `crates/pdl-core/tests/golden/` |

---

## Order and dependencies

```text
H0  multi-protocol headers          (independent; ship first)
H1  parse host / catalog / Host     (no bake change)
H2  defaults + <Host> inject        (needs H0, H1)
H3  mount + as? + ?? + facts        (needs H2)
H4  use catalog + roles             (needs H3)
H5  Playground facts + chrome       (needs H3; H4 if catalogs are in the demo)
```

Do not start H3 until H2 goldens are boring. Do not start H5 until a lab rebakes from a facts JSON without the Playground UI.

---

## Near-term checklist

- [x] H0 multi-protocol headers + catalogue array + error fixtures
- [x] H1 `host` / `catalog` parse, same-shape validate, prelude `Host`
- [x] H2 inject defaults; bake `host` arg; lab Default vs CI
- [x] H3 `mount` + `??` + `hostFactsJson`; watch-bag golden
- [x] H4 `use catalog` + role check; Dark + AppleIcons golden
- [x] H4 catalogs + role errors + theme-then-catalog golden
- [x] H5 Playground `view.*` facts + `previewBackground` migrate
- [x] Language objects / Guide / `SPEC_GAPS` status when each slice locks
- [ ] Do **not** implement Adaptive Layout prelude `SizeClass`

Progress also tracked in [`SPEC_GAPS.md`](./SPEC_GAPS.md) and the master [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md).
