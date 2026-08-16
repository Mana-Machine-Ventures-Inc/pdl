# Proposal: Pages, screens, and emit propagation

**Status:** proposed (2026-08-16); revised same day — **`emits(propagation:)`** instead of a `routing` / `bubbles` marker  
**Depends on:** `docs/PROPOSAL_PROTOCOL_CAPABILITIES.md` (API vs host protocol roles; emits); `docs/PROPOSAL_SLOTS_PROTOCOLS_FIXTURES.md` §8 (local vs prototype emit lanes); `docs/PROPOSAL_HOST_ENVIRONMENT.md` (environment vs navigation)  
**Related:** Studio prototypes; nav stack / route swapping; fixtures as previewed worlds  

Until this is locked in `shared/*.json` / `grammar/pdl.ebnf`, tooling must not treat the syntax as normative.

---

## 1. Problem

Studio and app hosts need to run **prototypes where a shell swaps destinations** (home → episode → settings). PDL today has only **`component`**. Authors and tools lack:

1. A discoverable split between **reusable parts**, **destinations**, and **device shells**.
2. A typed way for a deep control to **ask for navigation** without prop-drilling a router or naming Studio.
3. Clear rules for **how far an emit travels** when the immediate parent does not handle it.

Protocols already define `emits` and assume delivery to a parent. That assumption is underspecified: most UI channels must stop at the declaring parent; navigation channels need to **climb the ancestor chain** until a shell handles them.

---

## 2. Goals

| Goal | Meaning |
|------|---------|
| **Roles on one machine** | `page` / `screen` are component-like; Studio can filter destinations vs shells |
| **Explicit propagation** | `emits(propagation: …)` states how far unhandled emits travel — not a magic protocol name |
| **Default stays local** | `propagation: .parent` (default) — today’s API emit rules |
| **Nav climbs parents** | `propagation: .ancestors` — pass up until a handler stops the bubble |
| **Screen owns the stack** | Capture + `content` / `route` updates on the shell; atoms stay dumb |
| **Orthogonal to host env** | `<Host>` / catalogs = environment; emit propagation = message delivery |

### Non-goals (v1)

- Full app router DSL, URL parsing, or DB lookups inside PDL.
- Ambient Studio singleton as the primary sink.
- Putting nav conformance on every leaf control.
- Broadcast / “all listeners” propagation (no `.all` in v1).
- CSS / host measure (see Host Environment proposal).

---

## 3. Roles: component, page, screen

| Role | Meaning | Typical params | Studio |
|------|---------|----------------|--------|
| **`component`** | Reusable UI unit | Local look / interaction API | DS catalogue |
| **`page`** | Navigable **destination** | Destination payload (`episodeId`, …) | Route targets |
| **`screen`** | **Shell** the device mounts | `route`, `content` (current page), chrome | Prototype root / device frame |

Under the hood all three bake as component trees. `page` / `screen` are **roles** (discoverability + default rules), not a second type system.

```pdl
component Button <PointerInput>(label: String = "OK") layout { /* atom */ }

page Home() layout { /* destination */ }

screen Phone(
  route: Route = .home,
  content: Page = Home()
) layout { /* shell that swaps pages */ }
```

**Optional:** `protocol Page: component { }` so `content: Page` is a typed slot for any `page` destination.

---

## 4. Emit propagation (the shape)

Protocols define emits and assume they go to a **parent**. Make **how far** an argument of `emits`, defaulting to immediate parent.

### 4.1 Cases

| Propagation | Meaning |
|-------------|---------|
| **`.parent`** (default) | Immediate parent must capture — existing API emit rules |
| **`.ancestors`** | If this parent does not handle it, pass to the **next** parent, until a handler stops it |

```pdl
variant Route {
  case home
  case episode
  case settings
}

// Local UI — default propagation (.parent)
protocol SubnavItem: component {
  selected: Bool
  emits {
    select(filter: FilterId)
  }
}

// Explicit default (same meaning)
protocol SubnavItem: component {
  emits(propagation: .parent) {
    select(filter: FilterId)
  }
}

// Navigation — climb the parent chain
protocol Routing {
  emits(propagation: .ancestors) {
    push(route: Route)
    pushEpisode(id: EpisodeId)
    back()
    dismiss()
  }
}

// Pack-specific name; same propagation — not name-magic
protocol AppNav {
  emits(propagation: .ancestors) {
    openSettings()
  }
}
```

**Alternate spelling (protocol-wide):**

```pdl
protocol Routing {
  propagation = .ancestors
  emits {
    push(route: Route)
    back()
  }
}
```

**Lean for v1:** prefer **`emits(propagation:)`** on the emits block so one protocol could later mix policies per channel if needed. Protocol-wide `propagation =` is sugar.

**`Routing` is not reserved.** Only `propagation: .ancestors` changes delivery.

### 4.2 Per-channel (later)

```pdl
emits {
  select(filter: FilterId)                         // .parent
  dismiss(propagation: .ancestors)
}
```

Not required for v1 if the whole `emits` block shares one propagation.

---

## 5. Bubble semantics (`.ancestors`)

1. Fire from a conforming instance (`emit pushEpisode(id: …)`).
2. Walk **ancestors** toward the root.
3. At each ancestor: if it registers a capture/handler for that channel → **handle and stop**.
4. Else → **continue** to the next parent.
5. If the root is reached with no handler → **diagnostic** (lean).

For **`.parent`**, unhandled at the immediate capturing site remains an error / dead letter per existing emit rules — **no** climb.

### Who should handle

**Lean: the `screen`** conforms to the nav protocol and registers handlers that update `route` / `content`.

Destination `page`s and molecules typically **emit only** and do not capture, so intents climb to the screen.

```text
EpisodeRow  emit pushEpisode(id)
  → Home (page) — no capture → pass up   (.ancestors)
  → Phone (screen) — handler runs
  → content = Episode(episodeId: id), route = .episode
  → rebake
```

Nearest capturing ancestor wins. Do not skip a capturing middle node unless we later add an explicit rethrow.

---

## 6. Context awareness (what conforms)

| Layer | Nav protocol? | Responsibility |
|-------|---------------|----------------|
| Atoms (`Button`, `Icon`) | **No** | Pointer / presentation only |
| Nav molecules (`EpisodeRow`, `BackButton`) | **Yes** (usual) | `emit` on press |
| Destination pages | Optional | One-off CTAs; prefer not to own the stack |
| **Screen** | **Yes** (sink) | Capture + push/replace/pop via params |

**Avoid** routing on generic `Button`. **Prefer** `EpisodeRow <Routing, PointerInput>` (or page-level translation of a dumb button).

---

## 7. Worked stub

```pdl
protocol Routing {
  emits(propagation: .ancestors) {
    push(route: Route)
    pushEpisode(id: EpisodeId)
    back()
  }
}

protocol Page: component { }

component EpisodeRow <Routing, PointerInput>(
  episodeId: EpisodeId = .demo,
  title: String = "Neon Shoulder"
) layout {
  direction = .row
  let label = Text(content: title, style: Body)
  children = [label]
  self.pressEnd = {
    emit pushEpisode(id: episodeId)
  }
}

component BackButton <Routing, PointerInput>(
  label: String = "Back"
) layout {
  let text = Text(content: label, style: Body)
  children = [text]
  self.pressEnd = {
    emit back()
  }
}

page Home() layout {
  direction = .column
  gap = 16
  let row = EpisodeRow(episodeId: .demo)
  children = [row]
  // no capture — .ancestors climbs to screen
}

page Episode(episodeId: EpisodeId = .demo) layout {
  let back = BackButton()
  let title = Text(content: "Episode", style: Title)
  children = [back, title]
}

screen Phone <Routing>(
  route: Route = .home,
  content: Page = Home()
) layout {
  direction = .column
  width = .fill
  height = .fill
  children = [content]

  Routing.pushEpisode(id: EpisodeId) = {
    route = .episode
    content = Episode(episodeId: id)
  }

  Routing.push(route: Route) = {
    self.route = route
    // content resolution — see Q3
  }

  Routing.back() = {
    route = .home
    content = Home()
  }
}
```

### Optional Studio map (hints, not the delivery bus)

```pdl
prototype LibraryDemo {
  start = Phone(route: .home, content: Home())
  route .home = Home()
  route .episode = Episode(episodeId: .demo)
}
```

Delivery is **tree propagation**; prototype helps Studio list starts and default page instances.

---

## 8. Relationship to other proposals

| Proposal | Boundary |
|----------|----------|
| **Host Environment** | Environment params / catalogs — not emit delivery |
| **Protocol capabilities** | Host vs API unchanged; this adds **propagation** on `emits` |
| **Slots / emits** | Same `emit` / capture spelling; `.ancestors` changes unhandled climb |
| **Adaptive layout** | Screens may also `<Host>` for size/surface |

---

## 9. Diagnostics (when accepted)

| Concern | Direction |
|---------|-----------|
| `.ancestors` emit with no handler through root | Error (lean) |
| `.parent` emit unhandled | Existing rules |
| Unknown `propagation` case | Error |
| Atom patterns with nav conformance | Lint later |
| `page` / `screen` before grammar lock | Proposal-only |

---

## 10. Suggested slices

| Slice | Deliverable |
|-------|-------------|
| **N0** | Spec: `page` / `screen`; `emits(propagation: .parent \| .ancestors)` |
| **N1** | Parse + validate propagation; climb vs local unhandled diagnostics |
| **N2** | Catalogue roles for Studio discovery |
| **N3** | Lab: Phone + Home + EpisodeRow → screen handler updates content |
| **N4** | Optional `prototype` metadata |
| **Later** | Per-channel propagation; real stack history; modal layer |

---

## 11. Open questions

| # | Question | Lean |
|---|----------|------|
| **Q1** | `emits(propagation:)` vs protocol-wide `propagation =` | **`emits(propagation:)`** primary; protocol-wide as sugar |
| **Q2** | Sink must be `screen`, or any capturing ancestor? | **Any capturing ancestor**; **recommend screen** |
| **Q3** | Keyword `page` / `screen` vs attribute on `component` | **`page` / `screen` keywords** |
| **Q4** | Resolve `push(route:)` → page instance | Explicit handler / table; prototype as data later |
| **Q5** | Case names `.ancestors` vs `.parents` vs `.up` | **`.ancestors`** |
| **Q6** | Unhandled at root for `.ancestors` | **Hard error** |
| **Q7** | Does `page` auto-conform to `Page` protocol? | **Yes** if keyword lands |

---

## 12. Decision lean (one paragraph)

Introduce **`page`** and **`screen`** as component roles. Give protocol **`emits` a `propagation` argument**: default **`.parent`** (immediate parent, today’s API), **`.ancestors`** (climb until a handler stops — usually the **`screen`**, which owns `route` / `content`). Navigation is not a reserved protocol name and not a Studio singleton; it is ordinary emits with ancestor propagation. Atoms stay local; nav molecules emit; the screen handles the stack. Environment stays on **`host`**.
