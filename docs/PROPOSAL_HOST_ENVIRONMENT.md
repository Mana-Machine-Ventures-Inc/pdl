# Proposal: Host environment (`hostSchema`, named `host`, facts bag, `HostPlatform`)

**Status:** proposed (2026-08-16)  
**Depends on:** `docs/PROPOSAL_PROTOCOL_CAPABILITIES.md`; bake API / portable core (`docs/PROPOSAL_PORTABLE_CORE.md`); themes (`shared/language-objects.json` `theme`)  
**Revises:** `docs/PROPOSAL_ADAPTIVE_LAYOUT.md` — size class remains an injectable fact, but **taxonomy and width→case policy live in the pack** (`hostSchema` / `host`), not a language-fixed `SizeClass { compact, regular }`  
**Related:** Playground vs future Studio; `previewBackground`; theme modifiers; fixtures / bake knobs  

Until this is locked in `shared/*.json` / `grammar/pdl.ebnf`, tooling must not treat the syntax as normative.

---

## 1. Problem

Design systems need to talk to **host environments** (PDL Playground, future PDL Studio, Meta RN runtimes, visionOS apps, CI screenshot hosts) without:

1. Sprinkling magic ambient params through every molecule (`width`, `platform`, `watchOS`, …).
2. Hardcoding one OS’s size-class POV in the language (Apple `.compact` / `.regular`).
3. Coupling `.pdl` packs to a named product (`hostInputs Studio { … }`).
4. Treating icon catalogs / preview chrome / size policy as unrelated knobs that “happen” to agree.

Today the bake boundary is already clean JSON:

```text
sources + theme + component kv  →  portable core  →  bake IR
```

Hosts already pass **theme** and **param overrides**. They do **not** yet pass a structured **environment facts bag**, and packs have nowhere honest to declare **what components may see** of that environment versus what stays private host-policy math.

`previewBackground` is a lonely top-level declaration — proof that host chrome settings exist, but not a general pattern.

---

## 2. Goals

| Goal | Meaning |
|------|---------|
| **Pack ↔ host channel** | One place (`host` / `hostSchema`) for design-system POV toward runtimes |
| **Host-agnostic packs** | Same `.pdl` bakes in Playground, Studio, RN, CI — no `hostInputs Studio` catalogs in source |
| **Explicit component surface** | Components opt into `<HostPlatform>` and only see **schema outputs** |
| **Private ambient math** | Raw measure / runtime tags exist only while evaluating `host` bodies |
| **Pack-owned size taxonomy** | Variant + thresholds/policy authored by the DS, not the language |
| **Theme binding** | `theme Name for HostPlatform.<fact> == .case` auto-applies remaps (icons, density) |
| **Typed missing values** | Foreign bag reads use `T?`, `as?`, `if let`, `??` — same shape as Swift / Kotlin / Rust |
| **Same bake API family** | Host facts are another JSON argument alongside `theme` / component `kv` |

### Non-goals (v1)

- Free-form `expr as? Type` on every typed PDL value (casts stay at the **host-bag boundary**).
- Equating frame-prop `null` (unset) with `T?` (missing foreign value).
- Multi-protocol headers (`<HostPlatform, PointerInput>`) — still single `<P>` until a follow-up.
- CSS `@media` / container queries in bake IR or `.pdl`.
- Requiring every host runtime to implement every key — unread keys are ignored; missing keys are pack policy (`??` / `if let` / defaults).

---

## 3. Three layers

| Layer | Job | Example |
|-------|-----|---------|
| **Host facts bag** | Opaque JSON the **runtime** sends into bake | `"view.width": 390`, `"studio.platform": "watchOS"` |
| **`hostSchema` + named `host`** | Pack contract + profiles that **map bag → outputs** | `sizeClass`, `surface`, `previewBackground` |
| **`<HostPlatform>` + themes `for`** | What **components / themes** may read | `if sizeClass == .compact`, `theme X for HostPlatform.surface == .watch` |

Authors’ gloss:

> *“The host sends a bag of keys. My `host` body turns that into my product’s enums. Molecules only see those enums if they opt into `HostPlatform`. Width and `watchOS` strings never appear in the button library.”*

```text
┌─────────────────────────────────────────────────────────────┐
│  HOST APP (Playground / Studio / RN / …)                    │
│  measure, chrome, device pickers → hostFactsJson              │
└─────────────────────────────┬───────────────────────────────┘
                              │ bake(sources, theme, kv, host, hostFacts)
┌─────────────────────────────▼───────────────────────────────┐
│  PORTABLE CORE                                              │
│  evaluate active `host` profile with hostInput(…)           │
│  → hostSchema outputs → inject HostPlatform                 │
│  → resolve / bake component tree                            │
└─────────────────────────────┬───────────────────────────────┘
                              │ bake IR
┌─────────────────────────────▼───────────────────────────────┐
│  VIEW RUNTIME (HTML / SwiftUI / …)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Language

### 4.1 `hostSchema` — project contract

Exactly one `hostSchema` per merged design (import conflict → error). It lists **outputs** every named `host` must supply (required fields). Types are ordinary PDL types (usually pack variants + `Color`).

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
  // deliberately no TV — pack POV, not language ambient
}

hostSchema {
  sizeClass: WindowSize
  surface: AppSurface
  previewBackground: Color
}
```

**Rules:**

- Every `host Name` must assign every **required** schema field (same types). Payloads may differ; shape may not.
- Optional schema fields (spelling TBD, e.g. `previewBackground: Color?` or a `optional` marker) may be omitted on some profiles (e.g. Production with no canvas chrome).
- Schema field names that conforming hosts honor by convention (`sizeClass`, `previewBackground`) are **documented sockets**, not an open junk drawer — see §7.
- **Components never read the facts bag.** Only schema outputs appear on `HostPlatform`.

### 4.2 Named `host` profiles

Reusable environment profiles — many declared, **one active** per bake (like themes).

```pdl
host Preview layout {
  // §5 — probe bag, assign self.<schemaField>
}

host Production layout { … }

host Test layout { … }
```

Select via Playground / Studio / CLI (`--host Preview`) or fixtures (`host = Preview`).  
`layout { }` here means **the same declarative body shape as a frame** (`let`, `if`, assignments) — not a draw-tree root.

### 4.3 `HostPlatform` — component opt-in

Prelude host protocol (same family as `PointerInput` / `EditableText`):

```pdl
protocol HostPlatform {
  host
  // Well-known state = hostSchema outputs for this design
  // (injected — not protocol `params`, PDL-E032)
}
```

```pdl
component Shell <HostPlatform>() layout {
  direction = .row
  if sizeClass == .compact {
    direction = .column
  }
  if surface == .watch {
    // watch structure — pack enum only
  }
  // …
}
```

- Opt-in highlights what actually differs.
- No `<HostPlatform>` → cannot name `sizeClass` / `surface` (unknown name / E030-style rule as appropriate).
- Does **not** expose raw `view.width` or `studio.platform`.

### 4.4 Themes bind to exposed facts

```pdl
theme AppleIcons for HostPlatform.platform == .ios {
  // only if `platform` was a schema output — see §4.5
}

theme WatchIcons for HostPlatform.surface == .watch {
  icon.action.favorite = IconRef(file: "icons/watch-heart.svg")
}

theme CompactSpacing for HostPlatform.sizeClass == .compact {
  space.stack = 8
}

theme Dark {
  color.surface = color.ink
}
```

Bake applies: active theme(s) / modifiers **plus** every `for` clause whose condition matches resolved `HostPlatform` outputs. Icon libraries stay token remaps; structure stays `if` on schema enums.

### 4.5 Do not passthrough language ambient enums

Runtimes may send rich tags (`watchOS`, future TV, visionOS). Those strings/`Platform` values are **not** automatically on `HostPlatform`.

The pack maps them to **its** variants inside `host`:

```pdl
self.surface =
  if tag == "watchOS" { .watch }
  else if tag == "web" { .web }
  else { .mobile }
```

If the product does not support TV, TV never appears in component code.

---

## 5. Host body: facts bag probes

### 5.1 `hostInput`

Inside `host … layout { }` only:

```pdl
hostInput("view.width")           // → foreign value, typed via `as` / `as?`
```

- Keys are strings (wire-friendly). Packs do **not** declare `hostInputs Studio`.
- Hosts document which keys they send; packs probe generically and with specialist aliases.
- Unread keys are ignored (Studio can send extras forever).

### 5.2 Optionals at the boundary (`T?`, `as?`, `if let`, `??`)

Foreign bags are the first place values are not already language-typed. Align with Swift / Kotlin / Rust rather than a one-off soft-assign operator.

| Form | Meaning |
|------|---------|
| `hostInput("k") as? Distance` | Missing or not convertible → `Distance?` / `.none` |
| `hostInput("k") as Distance` | Missing or not convertible → diagnostic |
| `if let x = … as? T { … }` | Unwrap; `x` is non-optional inside |
| `a ?? b ?? c` | First present non-none wins |

**v1 scope:** APIs that return `T?` are listed (start with `hostInput` + `as?`). Ordinary params and frame props stay non-optional. Frame-prop **`null`** remains “unset property,” not `T?`.

Do **not** add a general `expr as? Type` on already-typed PDL expressions in v1.

### 5.3 Preferred authoring shape

Default, then optional overlays (last successful write wins), then ordinary policy:

```pdl
host Default layout {
  var width: Distance = 400
  var height: Distance = 800
  var runtimeTag: String = "unknown"

  if let w = hostInput("view.width") as? Distance { width = w }
  if let w = hostInput("canvas.width") as? Distance { width = w }
  if let w = hostInput("visionos.realitykit.width") as? Distance { width = w }

  if let h = hostInput("view.height") as? Distance { height = h }
  if let h = hostInput("canvas.height") as? Distance { height = h }

  if let t = hostInput("runtime.kind") as? String { runtimeTag = t }
  if let t = hostInput("react-native.platform") as? String { runtimeTag = t }
  if let t = hostInput("studio.platform") as? String { runtimeTag = t }

  // Equivalent coalesce form also legal:
  // let width = hostInput("view.width") as? Distance
  //   ?? hostInput("canvas.width") as? Distance
  //   ?? 400

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

  self.previewBackground =
    if self.surface == .watch { color.black } else { color.surface }
}
```

Empty bag → defaults → still bakes anywhere. Rich runtimes light up more overlays. Meta can prefer RN keys by ordering (`if let` lines later override earlier).

### 5.4 `guard let`

Optional in v1 if host bodies gain clear early-exit semantics; otherwise **`if let` / `else` + `??` are enough**. Do not block the proposal on `guard`.

---

## 6. Worked example (Studio invents watchOS)

**Studio** sends:

```json
{
  "view.width": 198,
  "view.height": 242,
  "studio.platform": "watchOS"
}
```

**Pack** never mentions Studio by name. Its `host Default` maps `studio.platform` → `AppSurface.watch` when present.

**Component** only sees:

```pdl
if surface == .watch { … }
```

**Playground** may omit `studio.platform`; pack falls through to `.mobile` / `.web` from other tags or defaults. Same sources, different bags.

---

## 7. Well-known schema sockets (conventions)

`hostSchema` is declarative; runtimes **opt into** keys they understand by **name + type**:

| Schema field | Typical type | Honored by |
|--------------|--------------|------------|
| `sizeClass` | Pack variant | Any host that measures and wants adaptive structure; core injects onto `HostPlatform` |
| `previewBackground` | `Color` | Canvas hosts (Playground / Studio preview); production app hosts may ignore |
| Pack-specific (`surface`, …) | Pack variants | Injected for components/themes; chrome hosts ignore unless they have UI for them |

A future Studio may honor additional schema fields its runtime knows (`gridGuides: Bool`). Unknown fields to a given runtime are ignored after bake has already consumed them for `HostPlatform` / themes.

Language documents the **recommended** sockets; packs choose which to list. Extensibility is “new schema fields + runtimes that learn them,” not magic ambient `self.width` on components.

Migrate today’s top-level `previewBackground color.surface` into `hostSchema` + `host` assignment (keep bare form as temporary sugar if needed).

---

## 8. Bake / core API

Extend the existing bake surface (WASM / CLI / future C ABI) — same family as today’s `theme` + `kvJson`:

```text
bake_component_sources(
  filesJson,
  entry,
  component,
  theme?,
  kvJson?,          // component params
  host?,            // profile name; default host if omitted
  hostFactsJson?    // opaque key → JSON value
)
```

Core:

1. Load / merge / validate design (including one `hostSchema`, named hosts).
2. Evaluate active `host` with `hostFactsJson` → schema outputs.
3. Apply themes + matching `theme … for HostPlatform.…`.
4. Inject outputs into conforming components’ effective params.
5. Resolve / bake as today → bake IR (+ optional resolved host outputs in debug metadata).

Fixtures may set bag keys and `host =` for review without live measure:

```pdl
fixtures for Shell {
  Watch {
    host = Default
    // fixture sugar for facts bag — spelling TBD
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

| Adaptive Layout proposal (2026-08-15) | This proposal |
|---------------------------------------|---------------|
| Language prelude `SizeClass { compact, regular }` | Pack variant in `hostSchema` (any cases) |
| `<AdaptiveLayout>` injects `sizeClass` | `<HostPlatform>` injects all schema outputs (including size class) |
| Host maps width→class via token / hardcoded cut | Pack `host` body maps `hostInput` widths→case |
| Opt-in for measure | Measure stays in the **runtime**; classification policy in **`host`**; components opt into **reading** outputs |

**Lean:** supersede the *fixed enum + AdaptiveLayout-only* framing with `HostPlatform` + pack `sizeClass`. Keep the product rule: only structural parents opt in; leaves fill the slot. Nested mount measure can still override facts for a child bake/instance resolve in a later slice — same outputs type from `hostSchema`.

---

## 10. Diagnostics (when accepted)

| Concern | Direction |
|---------|-----------|
| Missing `hostSchema` but `host` exists | Error |
| Two `hostSchema` after merge | Error |
| `host` missing required schema field | Error |
| Schema type mismatch across hosts | Error |
| `hostInput` / `as?` / `if let` / `??` outside `host` body | Error |
| `as Type` conversion failure | Error at bake |
| Component reads schema field without `HostPlatform` | Unknown name / host-conformance diagnostic |
| `theme … for HostPlatform.x` when `x` not in schema | Error |
| Cycle in host-body assignments | Error |

---

## 11. Suggested slices

| Slice | Deliverable | Done when |
|-------|-------------|-----------|
| **H0** | Spec lock sketch: `hostSchema`, `host`, `HostPlatform` stub, grammar notes | Docs + ebnf draft; no runtime |
| **H1** | Evaluate `host` with `hostFactsJson`; inject schema outputs; fixtures | Compact/Regular (pack-defined) flip without live measure |
| **H2** | `T?`, `as?`, `if let`, `??` for `hostInput` only | Default+overlay packs bake on empty and rich bags |
| **H3** | `theme … for HostPlatform.…` | Icon / spacing remaps follow surface/sizeClass |
| **H4** | Playground: send `view.width` / `view.height`; honor `previewBackground` from host outputs | Resize crossing cuts rebakes once |
| **H5** | Migrate / deprecate top-level `previewBackground` decl | One host settings path |
| **Later** | Nested measure; `guard let`; multi-protocol headers; formal host capability registry outside `.pdl` | As packs demand |

---

## 12. Open questions

| # | Question | Lean |
|---|----------|------|
| **Q1** | Protocol name `HostPlatform` vs `HostEnvironment` | **`HostPlatform`** for short headers; rename if “platform” confuses with OS |
| **Q2** | `var` vs reassignable `let` in host bodies | Allow reassignment in `host` bodies only for overlay pattern, or use `var` |
| **Q3** | Optional schema fields spelling | `Color?` in schema vs separate `optional` keyword |
| **Q4** | Fixture `hostFacts` syntax | Small map literal vs parallel top-level keys |
| **Q5** | Default host when `--host` omitted | Lexically first / name `Default` / sole host |
| **Q6** | Should `previewBackground` be readable on `<HostPlatform>`? | **No** by default — chrome only; omit from component injection even if in schema, **or** mark chrome-only fields in schema |
| **Q7** | JSON number → `Distance` coercion rules | Accept number in bag; reject stringly units in v1 |

---

## 13. Decision lean (one paragraph)

Introduce **`hostSchema`** (project outputs), named **`host` profiles** (layout-like bodies that probe an opaque **facts bag** via **`hostInput` + `as?` / `if let` / `??`**), and **`<HostPlatform>`** so components/themes only see pack-defined enums and colors. Runtimes talk to PDL through the existing bake JSON boundary (`hostFactsJson`), not magic ambient component params. Size class, surface, and preview chrome are pack policy; Swift-style optionals appear only at the foreign-bag boundary so we do not reinvent unwrap later. Icon and density differences stay **`theme … for HostPlatform.…`**, not `if` on every glyph.
