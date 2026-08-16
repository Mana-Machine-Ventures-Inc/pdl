# Proposal: Host environment (unified `host`, facts bag, `<Host>`, `catalog`)

**Status:** proposed (2026-08-16); revised same day — unified `host` params; **`theme` vs `catalog`**; **`host["k"] as? T ?? …` coalesce** in `mount`  
**Depends on:** `docs/PROPOSAL_PROTOCOL_CAPABILITIES.md`; bake API / portable core (`docs/PROPOSAL_PORTABLE_CORE.md`); themes (`shared/language-objects.json` `theme`)  
**Revises:** `docs/PROPOSAL_ADAPTIVE_LAYOUT.md` — size taxonomy / measure→case on `host` params + `mount`, not a language-fixed `SizeClass`  
**Related:** Playground vs future Studio; `previewBackground`; fixtures / bake knobs  

Until this is locked in `shared/*.json` / `grammar/pdl.ebnf`, tooling must not treat the syntax as normative.

---

## 1. Problem

Design systems need to talk to **host environments** (PDL Playground, future PDL Studio, Meta RN runtimes, visionOS apps, CI screenshot hosts) without:

1. Sprinkling magic ambient params through every molecule (`width`, `platform`, `watchOS`, …).
2. Hardcoding one OS’s size-class POV in the language (Apple `.compact` / `.regular`).
3. Coupling `.pdl` packs to a named product (`hostInputs Studio { … }`).
4. Misusing **`theme`** for platform asset catalogs (icons) — themes are user-toggleable color/a11y modes; Studio should not offer AppleIcons next to Dark.
5. A separate `hostSchema` that must stay hand-synced with named host profiles.

Today the bake boundary is already clean JSON (`sources + theme + kv → bake IR`). Hosts do not yet pass an opaque **facts bag**, and packs have nowhere honest to declare **environment params** or **host-applied remaps**.

---

## 2. Goals

| Goal | Meaning |
|------|---------|
| **One `host` construct** | Params + defaults + optional `mount` (no `hostSchema`) |
| **Component-like** | Same param model as `component`; different lifecycle / injection |
| **`<Host>` opt-in** | Components read resolved host params only |
| **Same shape across hosts** | Mismatch → error; optional pack `protocol … : host` |
| **Host-agnostic packs** | Probe facts bag by key; no Studio-specific input schemas |
| **Soft bag reads** | `host["k"] as? T ?? host["alias"] as? T ?? default` — long `??` chains in `mount` |
| **`theme` vs `catalog`** | Same remap merge; different **roles** for Studio / bake selection |
| **Pack-owned size taxonomy** | Variant + policy on the host, not the language |

### Non-goals (v1)

- `theme Name for Host.…` auto-binding (host applies catalogs explicitly).
- Equating frame-prop `null` with missing bag keys.
- Multi-protocol component headers (`<Host, PointerInput>`).
- CSS `@media` in bake / `.pdl`.
- Requiring every runtime to send every key.

---

## 3. Preferred metaphor

**`host` ≈ component** for params; **`mount`** refines from the runtime bag; language injects via **`<Host>`**.

**`theme` and `catalog` ≈ same remap object**, different audience:

| | `theme` | `catalog` |
|--|---------|-----------|
| **IR** | Named token remap bundle | Same |
| **Means** | User / a11y mode (Light, Dark, ReducedMotion) | Host / environment assets (AppleIcons, MaterialIcons) |
| **Studio** | Show in theme picker / toggles | **Do not** list as user themes |
| **Applied by** | Bake `--theme` / user choice (and optionally `use theme` if needed) | **`use catalog` inside `mount` only** |

Authors’ gloss:

> *“Themes are what a person flips. Catalogs are what the host picks from the device bag. Both rewrite tokens the same way.”*

```text
Host app → hostFactsJson
     ↓
Evaluate host defaults → mount { host["…"]; use catalog …; self.param = … }
     ↓
Token map += bake theme(s) + catalogs used in mount
     ↓
Inject host params into <Host> → resolve / bake tree
```

---

## 4. Language

### 4.1 Unified `host`

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
  // §5–§6
}

host CI(
  sizeClass: WindowSize = .medium,
  surface: AppSurface = .mobile,
  previewBackground: Color = color.white
)  // mount optional — defaults alone bake
```

- Param list **is** the contract `<Host>` exposes.
- Every `host` in the design shares the same param **names and types** (defaults may differ) → else error.
- Optional `protocol AppHost: host { … }` + `host Default <AppHost>(…)` to name that shape.

### 4.2 `<Host>`

```pdl
protocol Host {
  host
  // Injected = resolved params of the active host profile
}

component Shell <Host>() layout {
  if sizeClass == .compact { direction = .column }
  if surface == .watch { /* … */ }
}
```

### 4.3 `theme` vs `catalog`

```pdl
theme Dark {
  color.surface = color.ink
  color.text = color.white
}

theme ReducedMotion {
  motion.appear = motion.instant
}

catalog AppleIcons {
  icon.action.favorite = IconRef(system: .sfSymbols, name: "heart.fill")
  icon.nav.back = IconRef(system: .sfSymbols, name: "chevron.left")
}

catalog MaterialIcons {
  icon.action.favorite = IconRef(system: .materialSymbols, name: "favorite")
  icon.nav.back = IconRef(system: .materialSymbols, name: "arrow_back")
}
```

**Merge rules:** identical to today’s theme override (whole-token replace, stack order defined by bake).  
**Metadata / catalogue:** each bundle carries `role: user | host` (`theme` → user, `catalog` → host).  
**Selection:**

- User themes: existing bake / Playground theme knob (modifiers as today).
- Catalogs: only `use catalog Name` in `mount` (error if used as `--theme` or in a user theme picker API).

```pdl
host Default(
  sizeClass: WindowSize = .medium,
  surface: AppSurface = .mobile,
  previewBackground: Color = color.surface
) mount {
  let width: Distance =
    host["view.width"] as? Distance
    ?? host["canvas.width"] as? Distance
    ?? host["visionos.realitykit.width"] as? Distance
    ?? 400

  let platformTag: String =
    host["studio.platform"] as? String
    ?? host["runtime.kind"] as? String
    ?? host["react-native.platform"] as? String
    ?? "unknown"

  if platformTag == "ios" || platformTag == "iosNative" || platformTag == "watchOS" {
    use catalog AppleIcons
  } else if platformTag == "android" {
    use catalog MaterialIcons
  }

  if platformTag == "watchOS" {
    self.surface = .watch
  } else if platformTag == "web" || platformTag == "react-native-web" {
    self.surface = .web
  } else {
    self.surface = .mobile
  }

  if width < 600 {
    self.sizeClass = .compact
  } else if width < 1024 {
    self.sizeClass = .medium
  } else {
    self.sizeClass = .expanded
  }

  if self.surface == .watch {
    self.previewBackground = color.black
  } else if self.surface == .web {
    self.previewBackground = color.canvasWeb
  } else {
    self.previewBackground = color.surface
  }
}
```

Small one-offs may assign tokens directly in `mount` (`icon.action.favorite = …`) without a named catalog.

**Not proposed:** `theme WatchIcons for Host.surface == .watch`.

---

## 5. Facts bag probes

### 5.1 `host["key"] as? T ?? …` (v1 lean)

Inside `mount` only. Soft read + coalesce is the default style — verbose but clear, fine for now.

| Expression | Meaning |
|------------|---------|
| `host["k"] as? Distance` | Missing or not convertible → none |
| `a ?? b ?? c` | First present non-none wins |
| `host["k"] as Distance` | Strict — missing/wrong → bake diagnostic (rare; prefer `??` defaults) |

```pdl
let width: Distance =
  host["view.width"] as? Distance
  ?? host["canvas.width"] as? Distance
  ?? host["visionos.realitykit.width"] as? Distance
  ?? 400

let platformTag: String =
  host["studio.platform"] as? String
  ?? host["runtime.kind"] as? String
  ?? "unknown"
```

Unread keys are ignored. Alternate spelling `hostInput("view.width")` ≡ `host["view.width"]`.

### 5.2 Deferred

`.isNumber` / `.isString`, fail-fast bare compares, and full `if let` / `guard` — **not** required for v1 if `as?` + `??` covers host mounts. Revisit when another domain needs them.

---

## 6. Worked example (Studio + watchOS)

Facts bag:

```json
{
  "view.width": 198,
  "view.height": 242,
  "studio.platform": "watchOS"
}
```

`mount` selects `AppleIcons`, sets `surface = .watch`, `sizeClass = .compact`.  
User may still pick `theme Dark` in Studio. Dark is a **theme**; AppleIcons is a **catalog** — same merge, different picker.

---

## 7. Well-known conventions

| Kind | Name | Role |
|------|------|------|
| Host param | `sizeClass` | Pack variant; on `<Host>` |
| Host param | `previewBackground` | Canvas chrome (migrate bare `previewBackground` decl here) |
| Facts key | `view.width` / `view.height` | Common measure (documented, not required) |
| Facts key | `studio.platform` / `runtime.kind` | Example runtime tags |

---

## 8. Bake / core API

```text
bake_component_sources(
  filesJson, entry, component,
  theme?,              // user theme (+ modifiers) only — catalogs rejected here
  kvJson?,
  host?,
  hostFactsJson?
)
```

Core order:

1. Validate hosts share param shape.
2. Start active host at defaults; run `mount` (bag probes, `use catalog`, param assigns).
3. Build token map: base + **user theme stack** + **catalogs used in mount** (stack order TBD: lean catalogs after user themes so assets win, or before — **Q8**).
4. Inject host params into `<Host>`; resolve / bake.

Fixtures may set `host`, `hostFacts`, and user `theme` separately.

---

## 9. Relationship to Adaptive Layout

Pack `sizeClass` on `host` + `<Host>` replaces prelude-fixed `SizeClass` / `<AdaptiveLayout>`. Product rule unchanged: only structural parents opt in.

---

## 10. Diagnostics

| Concern | Direction |
|---------|-----------|
| Hosts with different param shapes | Error |
| `host["…"]` / `use catalog` outside `mount` | Error |
| Strict `as Type` conversion failure | Error at bake |
| Soft `as?` miss | Falls through `??` — not an error |
| `use theme CatalogName` when Name is a catalog (or `--theme` a catalog) | Error — wrong role |
| `use catalog ThemeName` when Name is a theme | Error — wrong role |
| Component reads host param without `<Host>` | Error |
| Unknown host profile name | Error |

---

## 11. Suggested slices

| Slice | Deliverable |
|-------|-------------|
| **H0** | Grammar: `host`, `catalog`, `use catalog`, `host["k"] as? T`, `??` |
| **H1** | Host defaults + `<Host>` inject + same-shape check |
| **H2** | `mount` + soft bag reads + `??` chains |
| **H3** | `catalog` merge + `use catalog` + role metadata (theme picker excludes catalogs) |
| **H4** | Playground `view.*` facts; migrate `previewBackground` |
| **Later** | Pack `protocol … : host`; nested measure; `.isNumber` / `if let` if needed |

---

## 12. Open questions

| # | Question | Lean |
|---|----------|------|
| **Q1** | Protocol name | **`Host`** |
| **Q2** | Body keyword | **`mount`** |
| **Q3** | `self.param` vs bare in `mount` | **`self.`** |
| **Q4** | `host["k"]` vs `hostInput("k")` | Either; examples use **`host["…"]`** |
| **Q5** | Inject `previewBackground` onto `<Host>`? | Yes by default; chrome marker later if noisy |
| **Q6** | Default host name | `Default`, else sole host |
| **Q7** | JSON number → Distance | Accept number |
| **Q8** | Token stack: theme then catalog, or catalog then theme? | **Theme then catalog** (host assets win on icon keys) |
| **Q9** | May `mount` `use theme Dark`? | **No** in v1 — user themes stay bake/UI selected |

---

## 13. Decision lean (one paragraph)

**`host Name(params = defaults) [mount { }]`** is the environment contract; **`<Host>`** exposes those params to opt-in components. **`mount`** probes an opaque facts bag with **`host["key"] as? T ?? …` coalesce chains**, sets params, and **`use catalog`** for environment asset remaps. **`theme`** and **`catalog`** share remap merge semantics but different **system roles**: themes are user-toggleable (Studio picker); catalogs are host-applied only. No `hostSchema`, no `theme … for Host.…`, no magic width on molecules.
