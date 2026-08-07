# Proposal: Portable PDL Core & Native Instantiation

**Status:** accepted (2026-08-05) — not yet shipped; TypeScript remains the reference oracle until Rust parity  
**Schema / reference:** `docs/full-spec.md` (`1.0.0-beta`)  
**Related:** `docs/manifesto.md`, current TypeScript toolchain in `src/`  
**Follow-on:** `docs/PROPOSAL_SLOTS_PROTOCOLS_FIXTURES.md` (protocols, `[T]` slots, dual fixtures, emits)  
**Implementation:** `docs/IMPLEMENTATION_PLAN.md`, crate `crates/pdl-core`

---

## 1. Problem

PDL is meant to be the **portable source of truth** for a design system: typed, deeper than markdown, not trapped in Figma/Sketch, and theoretically instantiable on any platform.

Today the reference compiler is **TypeScript** and the primary studio surface is an **HTML instantiator**. That proves the language, but it leaves open:

1. How does a **SwiftUI / Android / TV** client become a first-class host — not a screenshot of HTML?
2. How do we avoid a permanent architecture where a **heavy Mac builder** is required to interpret `.pdl`?
3. What is the **long-term shared interpreter** written in, and where can it run?

This proposal answers those with a layered architecture, a language choice for the portable core, and a concrete end-to-end path from `.pdl` files to a native button.

---

## 2. Goals

| Goal | Meaning |
|------|---------|
| **PDL = only authored SoT** | Humans write `.pdl`. No second node/display language is authored or hand-edited. |
| **Every client can interpret** | iOS, Android, desktop, web, and headless peers can go **sources → bake → UI** without a privileged Mac compiler farm. |
| **Thin interpretation at the pixel edge** | Shared core owns language semantics; platforms only map a closed **frame IR** to views. |
| **Deep prototyping** | Scenes + params + view-model hooks + real/shimmed data — more useful than a Figma prototype. |
| **Fast local iteration** | LAN / peer sync of `.pdl` packages; each device rebuilds (or uses a derived bake cache). |
| **Optional codegen** | Emit platform code for engineers as **export**, not as the live source of truth. |

### Non-goals (for this proposal)

- Pixel-perfect identity with HTML/Figma across all materials (blur, vibrancy, fonts).
- Multiplayer CRDT editing inside `.pdl` ASTs.
- Putting SwiftUI/Compose types inside the shared core.
- Replacing the TypeScript toolchain before a portable core reaches conformance.

---

## 3. Architecture (three layers)

```text
┌─────────────────────────────────────────────────────────────┐
│  3. HOST APP                                                │
│     Scenes, navigation, view-models, networking, shims      │
└───────────────────────────┬─────────────────────────────────┘
                            │ params / events
┌───────────────────────────▼─────────────────────────────────┐
│  2. PLATFORM VIEW RUNTIME                                   │
│     Baked frames → SwiftUI / Compose / HTML / TV views      │
│     (per platform; fidelity matrix documented)              │
└───────────────────────────┬─────────────────────────────────┘
                            │ baked IR / catalogue slice
┌───────────────────────────▼─────────────────────────────────┐
│  1. PORTABLE PDL CORE                                       │
│     lex → parse → merge → validate → resolve/bake/manifest  │
│     Same semantics on every client                          │
└───────────────────────────┬─────────────────────────────────┘
                            │
                     .pdl modules + assets
```

**Layer 1** is shared. **Layer 2** is necessarily per-platform. **Layer 3** is product.

Derived bake/catalogue JSON may fly on the wire for speed, but it is a **cache**, not a second SoT. If sources and cache disagree, **sources win**.

---

## 4. Long-term core language

### Decision

| Role | Language | Notes |
|------|----------|--------|
| **Long-term portable core** | **Rust** | Parse/merge/validate/bake; C ABI for embeddings |
| **Reference / studio / CLI (near term)** | **TypeScript** (this repo) | Conformance oracle until Rust matches goldens |
| **View runtimes** | Swift / Kotlin / TS | Never inside the core |

### Why Rust (not C / C++)

- Workload is a **language toolchain** (AST, graphs, JSON), not a GPU canvas engine.
- Strong fit for evolving grammars and type-safe IR refactors.
- Embeds as a **static library** on iOS/Android and as **WASM** for web.
- Memory safety matters for a long-lived multi-platform binary.

**C** remains attractive for the smallest ABI/runtime, but slows evolution and concentrates UB risk. Prefer Rust with a thin `extern "C"` façade.

**C++** is what **Figma** uses for its document/renderer core (C++ → WASM + TypeScript chrome). That choice is driven by game-engine-scale rendering and huge documents — not a requirement for PDL’s interpreter. Adopt C++ only if we later own an in-process high-performance renderer that demands it.

### Industry context (brief)

- **Figma:** C++ engine + TS/React UI; C++ compiled to WASM for the browser; same C++ for native/server render.
- **Xcode / Swift:** not a portable design-language runtime. The Swift *compiler* is historically C++ and gradually moving pieces to Swift — a poor template for cross-platform PDL.

### Core API surface (C ABI sketch)

Stable, tiny, language-agnostic:

- `pdl_package_open(path_or_bytes) → handle`
- `pdl_bake_component(handle, name, theme, params_json) → bake_json`
- `pdl_catalogue_slice(...)` / `pdl_manifest(...)`
- `pdl_last_error()` / diagnostics buffer
- `schemaVersion` negotiation on open

Swift/Kotlin/JS bind this ABI. No platform UI types cross the boundary.

---

## 5. End-to-end: `.pdl` files → SwiftUI button

This section is normative for the **intended** product path. Near-term boots may skip on-device compile (step B) and inject pre-baked JSON; the **shape** stays the same.

### 5.1 Inputs

A **design package** on device (bundle, zip, or LAN-synced folder), e.g.:

```text
MyDesign/
  design.pdl              # entry: import graph
  tokens_color.pdl
  tokens_typography.pdl
  button.pdl              # component Button { … }
  scenes.pdl              # fixtures / usage for prototypes
  assets/…
```

Example fragment (illustrative):

```pdl
// button.pdl
component Button(
  label: String = "Continue",
  emphasis: Emphasis = .primary,
) layout {
  // background, padding, nested text frame using typeStyle + semantic color
  // if emphasis == .primary { … }
}
```

### 5.2 Pipeline (specific steps)

```text
 A. Package present on device
 B. Portable core: load + merge + validate
 C. Select scene / component + theme + params
 D. Resolve + bake → literal frame tree (IR)
 E. SwiftUI view runtime: IR → View tree
 F. Host: bind view-model ↔ component params; mount on screen
 G. (Optional) hot reload when .pdl changes arrive
```

#### A — Package present

- Host or LAN peer places/updates the design package in an app-accessible store.
- Record `schemaVersion` and content hashes per module for invalidation.

#### B — Load / merge / validate (portable core)

1. Read entry `design.pdl`.
2. Walk `import` graph; merge partial definitions (same rules as `docs/full-spec.md` §2 / TS `loadDesign`).
3. Validate names, types, cycles, companion blocks as implemented by the core.
4. Produce an in-memory **DesignDefinition** (or equivalent).

*Bootstrap phase:* this step may run in TypeScript on a peer and only ship bake JSON. *Target phase:* the **same step runs inside the iOS process** via the Rust static library.

#### C — Intent: what to show

Host chooses, e.g.:

- component: `Button`
- theme: `Light` (+ optional modifiers)
- params: `{ "label": "Save", "emphasis": "primary" }`  
  or a named **fixture** from companion metadata

This intent can be local UI state or a LAN message `{ entry, component, theme, params }`.

#### D — Resolve + bake → IR

Portable core:

1. Apply theme / modifiers to the token graph.
2. Apply component parameters and conditional overrides (`if` / variants).
3. Emit a **baked** tree: frames with **literal** props (colors as resolved values, distances as numbers, etc.) — same contract family as today’s `bakeComponent` / `bakedDesign` (`docs/full-spec.md` §16d).

Example IR shape (conceptual):

```json
{
  "schemaVersion": "1.0.0-beta",
  "component": "Button",
  "tree": {
    "kind": "layout",
    "props": {
      "direction": "row",
      "padding": { "top": 12, "right": 16, "bottom": 12, "left": 16 },
      "background": "#0B6BCB",
      "cornerRadius": 8
    },
    "children": [
      {
        "kind": "text",
        "props": {
          "content": "Save",
          "fontSize": 16,
          "fontWeight": 600,
          "color": "#FFFFFF"
        }
      }
    ]
  }
}
```

No Swift types here — only JSON / in-memory IR the core owns.

#### E — SwiftUI view runtime (platform layer)

A deterministic mapper walks the baked tree:

| PDL frame | SwiftUI (illustrative) |
|-----------|-------------------------|
| `layout` + `direction: row` | `HStack` / custom flex `Layout` |
| `layout` + `direction: column` | `VStack` / custom flex |
| padding / gap / align | `.padding`, spacing, alignment |
| `background` color / layers | `.background`, overlays as documented |
| `cornerRadius` | `.clipShape(RoundedRectangle…)` |
| `text` | `Text` + font mapping from typeStyle literals |
| `icon` / `media` | `Image` / asset resolver via host callback |

**Fidelity:** document approximations (fonts, materials, absolute layout). Prefer a constrained flex subset in v1 over lying about full CSS-flex parity.

Pseudo-flow:

```swift
func view(for frame: BakedFrame) -> some View {
  switch frame.kind {
  case .layout: LayoutView(frame: frame) { frame.children.map(view(for:)) }
  case .text:   TextView(frame: frame)
  case .icon:   IconView(frame: frame, assets: assetResolver)
  case .media:  MediaView(frame: frame, assets: assetResolver)
  }
}
```

#### F — Host mount + view-model hooks

```swift
struct PrototypeScreen: View {
  @StateObject var model: ButtonViewModel  // app / shim data

  var body: some View {
    PDLHost.component(
      "Button",
      theme: "Light",
      params: [
        "label": .string(model.title),
        "emphasis": .enum(model.emphasis)
      ]
    )
    // Optional: map PDL interactions → model intents
  }
}
```

- **Component params** in PDL define the inbound contract the host must satisfy (all params are public; `expose` removed). **`emits`** define outbound intents.
- Networking and business logic stay in the host; PDL stays visual + interaction *skin*.

Result: an **actual SwiftUI button** (native views), driven by the design system, not a WebView of the HTML studio.

#### G — Change propagation

1. Designer edits `button.pdl` on a Mac (or any peer with an editor).
2. Ops log / sync updates the module in the package.
3. Core invalidates dependents via import graph; rebakes `Button`.
4. View runtime hot-swaps the mounted tree (stable ids where possible).

No cloud required. No privileged compiler node required once the portable core ships on device.

---

## 6. Codegen (secondary)

From the **same bake/catalogue IR**, optional emitters can generate SwiftUI/Compose scaffolding for engineering handoff.

Rules:

- Generated code is **export / starting point**, not the live SoT.
- Teams that adopt the **SDK host** should not round-trip hand-edited generated views back into PDL.
- Pixel fidelity guarantees attach to the **runtime mapper**, not to generated code after human edits.

---

## 7. Phased delivery

| Phase | Deliverable | Mac required? |
|-------|-------------|---------------|
| **0** | TS compiler + HTML runtime (today) | For authoring tools only |
| **1** | Freeze IR + golden bake/catalogue fixtures; fidelity matrix template | — |
| **2** | SwiftUI view runtime consuming **bake JSON** (TS or CI produces bake) | Yes for compile; device paints natively |
| **3** | LAN/package sync of `.pdl` + scene intent; peer rebake | Builder peer OK |
| **4** | **Rust core** with C ABI; parity CI vs TS goldens | Optional |
| **5** | Embed Rust core in iOS/Android; on-device `loadDesign` | **No** |
| **6** | WASM core for web studio; optional codegen exporters | No |

Phase 2 unblocks “native button” demos. Phase 5 fulfills “usable without a heavy Mac client.”

---

## 8. Conformance & drift control

- **Golden tests:** `test-fixtures/pdl/**` → expected catalogue/bake JSON; TS and Rust must match.
- **`schemaVersion`:** reject or warn on skew between package and core.
- **Fidelity matrix:** per platform, per feature (`lineClamp`, `vibrancy`, geometry rules, …) → ✅ / ⚠️ / ❌.
- **Host escape hatches:** explicit foreign/platform slots so apps don’t fork the mapper silently.

---

## 9. Risks

| Risk | Mitigation |
|------|------------|
| Layout model ≠ SwiftUI stacks | Custom flex `Layout` or v1 subset; goldens + screenshots |
| Dual compilers drift | Single golden suite; Rust must match TS before cutover |
| On-device binary size | Feature-gate diagnostics; cache bake; ship scene closures |
| Codegen becomes SoT | Product rule: runtime host for live UI; codegen disposable |
| Materials/font drift | Document; don’t block shipping on glass effects |

---

## 10. Success criteria

1. A design package of `.pdl` files can produce a **SwiftUI** `Button` (or equivalent component) via bake → mapper → host, with params from a view-model.
2. Changing a token or component module and rebuilding updates that button without editing Swift by hand.
3. The same package can still render via the HTML path from the same IR family.
4. Roadmap path exists where **iOS embeds the portable core** and no Mac builder is required for interpretation.
5. Manifesto properties preserved: open, diffable, composable, owned files — not a vendor canvas.

---

## 11. Open questions

1. Flex engine in SwiftUI v1: full PDL flex vs documented subset?
2. Design package format: loose folder vs signed zip with lockfile?
3. Interaction runtime tier on device (preview handlers vs production hooks)?
4. When to start Rust relative to SwiftUI mapper maturity?
5. LAN ops-log integration: sync modules only vs modules + bake cache?

---

## 12. Summary

**Write PDL. Share a portable core. Map baked frames to native views. Keep hosts responsible for data.**

TypeScript remains the reference implementation. Rust is the long-term portable interpreter. SwiftUI (and peers) are view runtimes over a closed IR — so a stack of `.pdl` files can become a real native button, on-device, without trapping the design system in a single heavy client.
