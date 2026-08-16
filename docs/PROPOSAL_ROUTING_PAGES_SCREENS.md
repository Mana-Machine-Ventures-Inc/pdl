# Proposal: Pages, screens, and routing protocols (emit bubble)

**Status:** proposed (2026-08-16)  
**Depends on:** `docs/PROPOSAL_PROTOCOL_CAPABILITIES.md` (API vs host protocol roles; emits); `docs/PROPOSAL_SLOTS_PROTOCOLS_FIXTURES.md` §8 (local vs prototype emit lanes); `docs/PROPOSAL_HOST_ENVIRONMENT.md` (environment vs navigation)  
**Related:** Studio prototypes; nav stack / route swapping; fixtures as previewed worlds  

Until this is locked in `shared/*.json` / `grammar/pdl.ebnf`, tooling must not treat the syntax as normative.

---

## 1. Problem

Studio and app hosts need to run **prototypes where a shell swaps destinations** (home → episode → settings). PDL today has only **`component`**. Authors and tools lack:

1. A discoverable split between **reusable parts**, **destinations**, and **device shells**.
2. A typed way for a deep control to **ask for navigation** without prop-drilling a router or naming Studio.
3. Clear rules for **who owns the stack** when an emit is not handled by the immediate parent.

The slots proposal already sketches “unhandled emit → prototype runtime.” This proposal makes that lane concrete: **routing protocols bubble up the tree until a routing-capable shell handles them**, and that shell (typically a **screen**) pushes the next view.

---

## 2. Goals

| Goal | Meaning |
|------|---------|
| **Roles on one machine** | `page` / `screen` are component-like (params, layout, fixtures); Studio can filter destinations vs shells |
| **Routing protocol role** | Ordinary `emits`, plus **automatic parent-chain delivery** when unhandled |
| **Not name-magic** | `Routing` is an example name; the **`routing` marker** (spelling TBD) is the special property |
| **Screen owns the stack** | Capture + `content` / `route` updates live on the shell; atoms stay dumb |
| **Context awareness is sparse** | Generic `Button` is not routing-aware; rows / pages *emit*; one outer shell *handles* |
| **Orthogonal to host env** | `<Host>` / catalogs = environment; routing = navigation |

### Non-goals (v1)

- Full app router DSL, URL parsing, or DB lookups inside PDL.
- Ambient Studio singleton as the primary sink (tree bubble to screen is the lean).
- Putting `<Routing>` on every leaf control.
- Multi-protocol component headers beyond what the language already allows when this lands.
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
component Button <PointerInput>(label: String = "OK") layout { /* atom — no routing */ }

page Home() layout { /* destination */ }

screen Phone(
  route: Route = .home,
  content: Page = Home()
) layout { /* shell that swaps pages */ }
```

**Optional:** `protocol Page: component { }` so `content: Page` is a typed slot for any `page` destination.

---

## 4. Protocol roles (add routing)

Extend the protocol-role table:

| Role | Marker | Emit delivery |
|------|--------|---------------|
| **API** | default / `component` | Must be captured by an in-tree parent (existing rules) |
| **Host** | `host` | Environment → component (inbound); not this proposal |
| **Routing** | `routing` (lean name; alternatives: `bubbles`, `nav`) | If parent does not capture → **pass to next parent** until a **Routing-conforming ancestor with a handler** handles it |

```pdl
variant Route {
  case home
  case episode
  case settings
}

protocol Routing {
  routing                    // special property — not the identifier "Routing"
  emits {
    push(route: Route)
    pushEpisode(id: EpisodeId)
    back()
    dismiss()
  }
}

// Equally valid — pack-specific name, same role
protocol AppNav {
  routing
  emits {
    openSettings()
  }
}
```

**`Routing` is not a reserved keyword.** Prelude may ship a suggested `Routing`; packs may define their own `routing` protocols.

---

## 5. Bubble semantics

### 5.1 Rule

For an emit channel declared on a protocol marked **`routing`**:

1. Fire from a conforming instance (`emit pushEpisode(id: …)`).
2. Walk **ancestors** toward the root.
3. At each ancestor: if it registers a capture/handler for that channel → **handle and stop**.
4. Else → **continue** to the next parent (the special ability vs API protocols).
5. If the root is reached with no handler → **diagnostic** (lean) or optional Studio fallback (open question).

For **API** protocol emits, unhandled at the declaring parent remains an error / dead letter per existing emit rules — **no** auto-bubble.

### 5.2 Who should handle

**Lean: the `screen` (nav host)** conforms to the routing protocol and registers handlers that update `route` / `content` (the stack).

Destination `page`s and molecules typically **emit only** and do not capture, so intents climb to the screen.

```text
EpisodeRow  emit pushEpisode(id)
  → Home (page) — no capture → pass up
  → Phone (screen) <Routing> — handler runs
  → content = Episode(episodeId: id), route = .episode
  → rebake
```

Nearest capturing Routing ancestor wins (UIKit-style). Do not skip a capturing middle page unless we later add an explicit rethrow.

---

## 6. Context awareness (what conforms)

| Layer | `<Routing>`? | Responsibility |
|-------|--------------|----------------|
| Atoms (`Button`, `Icon`) | **No** | Pointer / presentation only |
| Nav molecules (`EpisodeRow`, `BackButton`) | **Yes** (usual) | `emit` on press |
| Destination pages | Optional | Emit for one-off CTAs; prefer not to own the stack |
| **Screen** | **Yes** (sink) | Capture + push/replace/pop via params |

**Avoid:**

```pdl
component Button <Routing, PointerInput>(route: Route? = nil)  // pollutes the DS
```

**Prefer:**

```pdl
component EpisodeRow <Routing, PointerInput>(episodeId: EpisodeId = .demo) layout {
  self.pressEnd = { emit pushEpisode(id: episodeId) }
}
```

Or occasional page-level translation of a dumb button’s press into a routing emit.

---

## 7. Worked stub

```pdl
protocol Routing {
  routing
  emits {
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
  // no Routing capture — bubble to screen
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
    // content resolution: explicit cases, or table/helper — see Q4
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

Delivery does **not** require the prototype object to capture emits. The **screen handlers** do. Prototype helps Studio list starts and default page instances per route.

---

## 8. Relationship to other proposals

| Proposal | Boundary |
|----------|----------|
| **Host Environment** | `host` / `<Host>` / catalogs = environment (size, surface, icons). Not navigation. |
| **Protocol capabilities** | Adds a third protocol role alongside API + host. |
| **Slots / emits** | Same `emit` / capture spelling; routing role changes **unhandled** behavior (bubble vs error). |
| **Adaptive layout** | Structure flips on host params; screens may also `<Host>`. |

---

## 9. Diagnostics (when accepted)

| Concern | Direction |
|---------|-----------|
| `routing` emit with no capturing Routing ancestor through root | Error (lean) |
| API emit unhandled | Existing rules (no auto-bubble) |
| Atom recommended patterns with `<Routing>` | Lint / guidance later, not hard error in v1 |
| Capture of routing channel on non-Routing-conforming component | Error |
| `page` / `screen` used but role not locked | Proposal-only until grammar lands |

---

## 10. Suggested slices

| Slice | Deliverable |
|-------|-------------|
| **N0** | Spec: roles `page` / `screen`; protocol marker `routing`; bubble rules |
| **N1** | Parse + validate `routing` protocols; bubble vs API unhandled diagnostics |
| **N2** | Screen/page role in catalogue (Studio discovery) |
| **N3** | Lab: Phone + Home + EpisodeRow emit → screen handler updates content (Playground) |
| **N4** | Optional `prototype` start/route table as catalogue metadata |
| **Later** | Real stack (push/pop history), modal layer, `NavHost` sugar |

---

## 11. Open questions

| # | Question | Lean |
|---|----------|------|
| **Q1** | Marker spelling `routing` vs `bubbles` vs `nav` | **`routing`** |
| **Q2** | Sink must be `screen`, or any Routing-conforming ancestor? | **Any ancestor with handlers**; **recommend screen** as the stack owner |
| **Q3** | Keyword `page` / `screen` vs `component Home page` | **`page` / `screen` keywords** for discovery |
| **Q4** | How screen resolves `push(route:)` → page instance | Explicit `if` / table in handler; prototype route table as data later |
| **Q5** | Multi-protocol headers (`<Routing, PointerInput>`) | Follow language multi-header rules when available; until then pack patterns / requires |
| **Q6** | Unhandled at root | **Hard error** in v1 |
| **Q7** | Does destination `page` auto-conform to `Page` protocol? | **Yes** if `page` keyword lands |

---

## 12. Decision lean (one paragraph)

Introduce **`page`** and **`screen`** as component roles for destinations and device shells. Introduce a **`routing` protocol role**: same emits as API protocols, but **unhandled emits automatically pass to the next parent** until a **Routing-conforming ancestor with a handler** stops the bubble — usually the **`screen`**, which owns `route` / `content` and performs the push. The name `Routing` is not reserved; the marker is. Atoms stay non-routing; nav molecules emit; Studio mounts a screen and rebakes when screen params change. Environment stays on **`host`**; navigation stays on **routing bubble → screen**.
