# Proposal: Host environment (unified `host`, facts bag, `<Host>`)

**Status:** proposed (2026-08-16); **revised** same day — unify `hostSchema` into component-like `host` params  
**Depends on:** `docs/PROPOSAL_PROTOCOL_CAPABILITIES.md`; bake API / portable core (`docs/PROPOSAL_PORTABLE_CORE.md`); themes (`shared/language-objects.json` `theme`)  
**Revises:** `docs/PROPOSAL_ADAPTIVE_LAYOUT.md` — size class remains an injectable fact, but **taxonomy and measure→case policy live on `host` params / `mount` body**, not a language-fixed `SizeClass { compact, regular }`  
**Related:** Playground vs future Studio; `previewBackground`; theme modifiers; fixtures / bake knobs  

Until this is locked in `shared/*.json` / `grammar/pdl.ebnf`, tooling must not treat the syntax as normative.

---

## 1. Problem

Design systems need to talk to **host environments** (PDL Playground, future PDL Studio, Meta RN runtimes, visionOS apps, CI screenshot hosts) without:

1. Sprinkling magic ambient params through every molecule (`width`, `platform`, `watchOS`, …).
2. Hardcoding one OS’s size-class POV in the language (Apple `.compact` / `.regular`).
3. Coupling `.pdl` packs to a named product (`hostInputs Studio { … }`).
4. Splitting “what components see” (`hostSchema`) from “how profiles fill it” (`host Name`) into two constructs that must stay in sync by hand.

Today the bake boundary is already clean JSON:

```text
sources + theme + component kv  →  portable core  →  bake IR
```

Hosts already pass **theme** and **param overrides**. They do **not** yet pass a structured **environment facts bag**, and packs have nowhere honest to declare **environment params** the way they declare component params.

`previewBackground` is a lonely top-level declaration — proof that host chrome settings exist, but not a general pattern.

---

## 2. Goals

| Goal | Meaning |
|------|---------|
| **One construct** | `host` carries param shape + defaults + optional `mount` body (no separate `hostSchema`) |
| **Component-like** | Same param mental model as `component`; different lifecycle / injection point |
| **Defaults in one place** | Header defaults bake anywhere; `mount { }` is optional overlays from the facts bag |
| **Same shape across hosts** | Every `host` in a design shares one param signature (or an explicit host protocol); mismatch → error |
| **Host-agnostic packs** | Probe opaque keys via `hostInput`; no `hostInputs Studio` catalogs in source |
| **Explicit component surface** | Components opt into `<Host>` and read those **host params** |
| **Pack-owned size taxonomy** | Variant + policy authored by the DS on the host, not the language |
| **Theme binding** | `theme Name for Host.<param> == .case` |
| **Typed missing values** | `T?`, `as?`, `if let`, `??` at the foreign-bag boundary |
| **Same bake API family** | `hostFactsJson` alongside `theme` / component `kv` |

### Non-goals (v1)

- Free-form `expr as? Type` on every typed PDL value (casts stay at the **host-bag boundary**).
- Equating frame-prop `null` (unset) with `T?` (missing foreign value).
- Multi-protocol headers on components (`<Host, PointerInput>`) — still single `<P>` until a follow-up.
- CSS `@media` / container queries in bake IR or `.pdl`.
- Requiring every runtime to implement every facts-bag key.

---

## 3. Preferred metaphor

A **`host` is almost a component**: named, parameterized, defaulted, with an optional body. It is not drawn as a frame tree. The language mounts it **once per bake** as the environment instance and injects its **resolved params** into components that opt into `<Host>`.

| | `component` | `host` |
|--|-------------|--------|
| **Params + defaults** | Yes | Yes — **this is the public environment surface** |
| **Body** | `layout` / `text` / … draw tree | Optional `mount { }` — probe bag, override params |
| **Lifecycle** | Instanced in the tree | One active profile per bake |
| **Injection** | Parent kwargs / fixtures | Language supplies `<Host>` effective params |
| **Children** | `children = …` | None |

Authors’ gloss:

> *“`host Default(…)` declares what the environment is. The `mount` body may refine it from whatever keys this runtime sent. Buttons that care opt into `<Host>` — same as opting into `PointerInput`, different facts.”*

```text
┌─────────────────────────────────────────────────────────────┐
│  HOST APP (Playground / Studio / RN / …)                    │
│  measure, chrome, device pickers → hostFactsJson            │
└─────────────────────────────┬───────────────────────────────┘
                              │ bake(…, host: Default, hostFacts)
┌─────────────────────────────▼───────────────────────────────┐
│  PORTABLE CORE                                              │
│  start from host param defaults                             │
│  run mount { } with hostInput(…) → override params            │
│  inject resolved host params into <Host> components         │
│  apply theme … for Host.… ; resolve / bake tree             │
└─────────────────────────────┬───────────────────────────────┘
                              │ bake IR
┌─────────────────────────────▼───────────────────────────────┐
│  VIEW RUNTIME (HTML / SwiftUI / …)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Language

### 4.1 Unified `host` (params are the schema)

```pdl
variant WindowSize {
  case compact
  case medium
  case expanded
}

variant AppSurface {
  case mobile
  case web
  case watch
}

host Default(
  sizeClass: WindowSize = .medium,
  surface: AppSurface = .mobile,
  previewBackground: Color = color.surface
) mount {
  // optional — see §5
}

// Body omitted: defaults alone are a valid host (empty facts bag → these values)
host CI(
  sizeClass: WindowSize = .medium,
  surface: AppSurface = .mobile,
  previewBackground: Color = color.white
)
```

**No `hostSchema`.** The param list **is** the contract components will see.

**Rules:**

- Every `host` in the merged design must share the **same param names and types** (defaults may differ). Mismatch → load/bake error.
- Authors who want that shape locked in a named API can factor a host protocol (§4.4).
- Well-known names (`sizeClass`, `previewBackground`) remain **conventions** runtimes may honor (§7) — still just params.
- **Components never read the facts bag.** They only see resolved host params via `<Host>`.

### 4.2 Optional `mount` body

`mount { }` is optional. When present, it may:

- Read `hostInput("…")` with `as?` / `if let` / `??`
- Assign `self.sizeClass = …` (or bare `sizeClass = …` — spelling TBD; lean `self.` for clarity)
- Use ordinary `if` on locals

It does **not** build a draw tree. Keyword `mount` marks lifecycle (environment init), parallel to `layout` on components without implying flex layout.

### 4.3 `<Host>` — language-supplied opt-in

The language provides a host protocol (name lean: **`Host`**) whose injected well-known state is exactly the **active host’s resolved params**:

```pdl
// Prelude (conceptual)
protocol Host {
  host
  // Injected state = params of the active `host` profile for this design
}
```

```pdl
component Shell <Host>() layout {
  direction = .row
  if sizeClass == .compact {
    direction = .column
  }
  if surface == .watch {
    // pack enum only
  }
}
```

- Opt-in highlights what differs.
- Without `<Host>`, `sizeClass` / `surface` are unknown (or E030-style).
- Does **not** expose `view.width` or `studio.platform`.

### 4.4 Optional pack protocol to force shape

If the design system wants an explicit named contract (libraries, multiple packs, stronger errors):

```pdl
protocol AppHost: host {
  sizeClass: WindowSize
  surface: AppSurface
  previewBackground: Color
}

host Default <AppHost>(
  sizeClass: WindowSize = .medium,
  surface: AppSurface = .mobile,
  previewBackground: Color = color.surface
) mount { … }

host Test <AppHost>(
  sizeClass: WindowSize = .compact,
  surface: AppSurface = .mobile,
  previewBackground: Color = color.white
)
```

- Default rule remains: **all hosts in a design share one shape** even without `<AppHost>`.
- `<AppHost>` documents and enforces that shape the way API protocols document slot contracts.
- Spelling of `protocol … : host` vs `protocol … { host … }` TBD; intent is “this protocol is a host param contract,” not a draw component.

Components still opt into language `<Host>` (or, later, `requires Host` / pack alias) to *read* params — they do not each list `AppHost` unless we add that sugar.

### 4.5 Themes bind to host params

```pdl
theme WatchIcons for Host.surface == .watch {
  icon.action.favorite = IconRef(file: "icons/watch-heart.svg")
}

theme CompactSpacing for Host.sizeClass == .compact {
  space.stack = 8
}

theme Dark {
  color.surface = color.ink
}
```

### 4.6 Map rich runtime tags privately

```pdl
host Default(
  sizeClass: WindowSize = .medium,
  surface: AppSurface = .mobile,
  previewBackground: Color = color.surface
) mount {
  var width: Distance = 400
  var runtimeTag: String = "unknown"

  if let w = hostInput("view.width") as? Distance { width = w }
  if let w = hostInput("canvas.width") as? Distance { width = w }
  if let w = hostInput("visionos.realitykit.width") as? Distance { width = w }

  if let t = hostInput("runtime.kind") as? String { runtimeTag = t }
  if let t = hostInput("react-native.platform") as? String { runtimeTag = t }
  if let t = hostInput("studio.platform") as? String { runtimeTag = t }

  if width < 600 {
    self.sizeClass = .compact
  } else if width < 1024 {
    self.sizeClass = .medium
  } else {
    self.sizeClass = .expanded
  }

  if runtimeTag == "watchOS" {
    self.surface = .watch
  } else if runtimeTag == "web" || runtimeTag == "react-native-web" {
    self.surface = .web
  } else {
    self.surface = .mobile
  }

  if self.surface == .watch {
    self.previewBackground = color.black
  }
}
```

Language ambient OS enums are **not** auto-injected onto `<Host>`. Packs publish only their param POV.

---

## 5. Facts bag and optionals

### 5.1 `hostInput`

Legal only inside `host … mount { }`:

```pdl
hostInput("view.width")
```

- No per-product `hostInputs` blocks in `.pdl`.
- Unread keys ignored; missing keys → `as?` / `??` / leave defaults.

### 5.2 `T?`, `as?`, `if let`, `??`

| Form | Meaning |
|------|---------|
| `hostInput("k") as? Distance` | Missing or not convertible → none |
| `hostInput("k") as Distance` | Missing or not convertible → diagnostic |
| `if let x = … as? T { … }` | Unwrap; `x` non-optional inside |
| `a ?? b ?? c` | First present wins |

**v1:** only listed APIs return `T?` (`hostInput` + `as?`). Frame-prop **`null`** stays “unset,” not `T?`. No general cast on already-typed expressions. **`guard let`** optional later if early-exit in `mount` is useful.

### 5.3 Coalesce form

```pdl
let width: Distance =
  hostInput("view.width") as? Distance
  ?? hostInput("canvas.width") as? Distance
  ?? hostInput("visionos.realitykit.width") as? Distance
  ?? 400
```

---

## 6. Worked example (Studio invents watchOS)

Studio sends:

```json
{
  "view.width": 198,
  "view.height": 242,
  "studio.platform": "watchOS"
}
```

Bake selects `host Default`. Defaults apply, then `mount` overlays → `surface = .watch`, `sizeClass = .compact`.  
`Shell <Host>` only sees those params. Playground omitting `studio.platform` still bakes via defaults / other tags.

---

## 7. Well-known param conventions

Runtimes match **param name + type** after host resolution (and may also send facts-bag keys):

| Host param | Typical type | Who cares |
|------------|--------------|-----------|
| `sizeClass` | Pack variant | Adaptive structure; injected on `<Host>` |
| `previewBackground` | `Color` | Canvas hosts for chrome; may be chrome-only (Q5) |
| Pack params (`surface`, …) | Pack variants | Components / `theme … for` |

Migrate top-level `previewBackground color.surface` into a host param (bare decl as temporary sugar if needed).

---

## 8. Bake / core API

```text
bake_component_sources(
  filesJson, entry, component,
  theme?,
  kvJson?,           // component params
  host?,             // profile name; default host if omitted
  hostFactsJson?     // opaque bag for mount { }
)
```

Core:

1. Load / merge / validate — all `host` decls share one param signature (or satisfy the same host protocol).
2. Instantiate active host: start at defaults; run `mount` with facts bag.
3. Apply themes + matching `for Host.…`.
4. Inject resolved host params into `<Host>` effective params.
5. Resolve / bake component tree.

Fixtures:

```pdl
fixtures for Shell {
  Watch {
    host = Default
    hostFacts = {
      "view.width" = 198
      "view.height" = 242
      "studio.platform" = "watchOS"
    }
  }
}
```

---

## 9. Relationship to Adaptive Layout

| Adaptive Layout (2026-08-15) | This proposal |
|------------------------------|---------------|
| Prelude `SizeClass { compact, regular }` | Pack variant on **`host` params** |
| `<AdaptiveLayout>` | `<Host>` (all environment params, including size class) |
| Host/token cut | `mount` body + `hostInput` |
| Separate from preview chrome | Same `host` as `previewBackground` |

Keep the product rule: only structural parents opt into `<Host>`; leaves fill the slot.

---

## 10. Diagnostics (when accepted)

| Concern | Direction |
|---------|-----------|
| Two hosts with different param names/types | Error (unless both conform to same host protocol that explains the shape — still one shape per design) |
| `hostInput` / `as?` / `if let` outside `mount` | Error |
| `as Type` conversion failure | Error at bake |
| Component reads host param without `<Host>` | Unknown name / conformance diagnostic |
| `theme … for Host.x` when `x` not a host param | Error |
| Unknown `--host` / fixture host name | Error |
| Host protocol param missing on conforming `host` | Error (same family as component/protocol params) |

---

## 11. Suggested slices

| Slice | Deliverable | Done when |
|-------|-------------|-----------|
| **H0** | Grammar + docs: `host Name(params) [mount { }]`; prelude `Host` | Draft lock notes; no runtime |
| **H1** | Evaluate host defaults + inject `<Host>`; multi-host same-shape check | Fixtures flip `sizeClass` without facts bag |
| **H2** | `mount` + `hostInput` + `T?` / `as?` / `if let` / `??` | Empty bag and rich bag both bake |
| **H3** | `theme … for Host.…` | Icon / spacing remaps follow host params |
| **H4** | Optional `protocol AppHost: host`; Playground sends `view.*` | Resize rebakes; shape errors on bad second host |
| **H5** | Migrate top-level `previewBackground` | One host settings path |
| **Later** | Nested measure; `guard let`; multi `<P>` on components | As needed |

---

## 12. Open questions

| # | Question | Lean |
|---|----------|------|
| **Q1** | Protocol name `Host` vs `HostPlatform` vs `HostEnvironment` | **`Host`** — short header; params are the platform POV |
| **Q2** | Body keyword `mount` vs `layout` vs bare `{ }` | **`mount`** — avoids implying flex layout |
| **Q3** | Assign with `self.sizeClass` vs bare `sizeClass` in `mount` | **`self.`** for symmetry with handlers |
| **Q4** | `var` vs reassignable `let` in `mount` | `var` or host-local reassignment only |
| **Q5** | Chrome-only params (`previewBackground`) on `<Host>`? | **Inject all host params** by default; optional `chrome` marker later if noisy |
| **Q6** | Default host when omitted | Name `Default`, else sole host, else error |
| **Q7** | JSON number → `Distance` | Accept number; reject unit strings in v1 |
| **Q8** | Can `mount` be empty `mount { }` vs omitted? | Both fine; omit preferred when unused |

---

## 13. Decision lean (one paragraph)

Unify environment configuration into **`host Name(params = defaults) [mount { … }]`** — the param list *is* the schema components will use via language-supplied **`<Host>`**. An optional **`mount`** body probes an opaque **facts bag** with **`hostInput` + `as?` / `if let` / `??`** and overrides those params; with no body, defaults bake everywhere. All hosts in a design share one param shape (or an explicit pack **`protocol … : host`**). Themes bind with **`for Host.<param>`**. Size class, surface, and preview chrome are ordinary host params with pack-owned variants — not magic ambient molecule state and not a separate `hostSchema` keyword.
