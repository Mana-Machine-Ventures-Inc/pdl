# Proposal: Pages, screens, Presenter, and emit propagation

**Status:** proposed (2026-08-16); revised same day — **`Presenter`** prelude frame; **screen-as-parent** capture (`channel(…) =`), not `Protocol.channel`  
**Depends on:** `docs/PROPOSAL_PROTOCOL_CAPABILITIES.md` (API vs host protocol roles; emits); `docs/PROPOSAL_SLOTS_PROTOCOLS_FIXTURES.md` §8 (local vs prototype emit lanes); `docs/PROPOSAL_HOST_ENVIRONMENT.md` (environment vs navigation)  
**Related:** Studio prototypes; nav stack / modal cover; fixtures as previewed worlds  
**Plan:** [`IMPLEMENTATION_PLAN_ROUTING_PAGES_SCREENS.md`](./IMPLEMENTATION_PLAN_ROUTING_PAGES_SCREENS.md)

Until this is locked in `shared/*.json` / `grammar/pdl.ebnf`, tooling must not treat the syntax as normative.

---

## 1. Problem

Studio and app hosts need to run **prototypes where a shell swaps destinations** (home → episode → settings). PDL today has only **`component`**. Authors and tools lack:

1. A discoverable split between **reusable parts**, **destinations**, and **device shells**.
2. A typed way for a deep control to **ask for navigation** without prop-drilling a router or naming Studio.
3. Clear rules for **how far an emit travels** when the immediate parent does not handle it.
4. A first-class hole that can **replace**, **push**, or **cover** a destination — not a one-cell `content =` assign and a hardcoded `back → Home()`.

Protocols already define `emits` and assume delivery to a parent. That assumption is underspecified: most UI channels must stop at the declaring parent; navigation channels need to **climb the ancestor chain** until a shell handles them. The shell is the **parent**. A local `Presenter` let is the **hole**, not the bus.

---

## 2. Goals

| Goal | Meaning |
|------|---------|
| **Roles on one machine** | `page` / `screen` are component-like; Studio can filter destinations vs shells |
| **`Presenter` in the tree** | A prelude frame the screen mounts next to chrome (`children = [presenter, tabBar]`) |
| **Screen is the parent** | Bare `showEpisode(id:) = { presenter.push(…) }` — not `Protocol.channel`, not `presenter.channel` |
| **Emitters own the protocol** | `EpisodeRow <ShowEpisode, PointerInput>` declares and fires; the screen does **not** conform |
| **Explicit propagation** | `emits(propagation: …)` states how far unhandled emits travel — not a magic protocol name |
| **Default stays local** | `propagation: .parent` (default) — today’s API emit rules |
| **Nav climbs parents** | `propagation: .ancestors` — pass up until a handler stops the bubble |
| **Orthogonal to host env** | `<Host>` / catalogs = environment; emit propagation = message delivery |

### Non-goals (v1)

- Full app router DSL, URL parsing, or DB lookups inside PDL.
- Ambient Studio singleton as the primary sink.
- Putting nav conformance on every leaf control.
- Broadcast / “all listeners” propagation (no `.all` in v1).
- CSS / host measure (see Host Environment proposal).
- `T?` optionals — vacant cover is a later variant (`Cover.none` / `.page`), not a new type.
- Route-enum lookup tables (`push(route: .episode)` → find a page). The handler **constructs** the instance.

---

## 3. Roles: component, page, screen

| Role | Meaning | Typical params | Studio |
|------|---------|----------------|--------|
| **`component`** | Reusable UI unit | Local look / interaction API | DS catalogue |
| **`page`** | Navigable **destination** | Destination payload (`episodeId`, …) | Route targets |
| **`screen`** | **Shell** the device mounts | Chrome + one or more `Presenter` lets | Prototype root / device frame |

Under the hood all three bake as component trees. `page` / `screen` are **roles** (discoverability + default rules), not a second type system.

```pdl
component Button <PointerInput>(label: String = "OK") layout { /* atom */ }

page Home() layout { /* destination */ }

screen Phone() layout {
  let home = Home()
  let presenter = Presenter(root: home)
  let tabBar = TabBar()
  children = [presenter, tabBar]
}
```

**`page` auto-conforms to prelude `protocol Page: component { }`** so a `Presenter` can require `Page` (or a pack protocol) as its destination type.

A `screen` does **not** conform to the row’s emit protocol. It is the ancestor parent that hears the channel.

---

## 4. `Presenter` (the hole)

`Presenter` is a **prelude frame**, like a one-child layout. The screen (or any ancestor) **mounts** it. Pages are values you hand it. A component never replaces itself.

| Piece | Meaning |
|-------|---------|
| **`root`** | First destination. Required. |
| **Painted child** | Always one: the top of the stack, or the cover if one is up |
| **`replace(page)`** | Swap the top. No new history entry |
| **`push(page)`** | Append. Back pops toward `root` |
| **`pop()`** | Remove last. At `root`: no-op (lint later) |
| **`present(page, style: .cover)`** | Full-screen layer above the stack |
| **`dismiss()`** | Clear the cover |

```text
Presenter
  stack: [Home, Episode]     // state
  cover: none | Settings     // state (N5+)
  paints: Episode            // or Settings if covered
```

`push` vs `present` is stack navigation vs full-screen modal. Same object, two holes. Presentation lives on the **presenter**, not on the `page` declaration. The same `Episode` page can be pushed from a row or covered from a peek.

**Rules**

1. A node does not change its own type. `Home` does not become `Episode`. The presenter swaps its painted child.
2. `push` / `pop` / `replace` / `present` / `dismiss` are legal **only in an ancestor-capture body** on a presenter `let` in scope — same “no runtime” fence as today’s emit assigns.
3. `Presenter` is not a `page`. Studio lists `page`s as destinations; the presenter is how a `screen` shows them.
4. Host environment stays out. `view.width` does not push.
5. `root` is not optional. An empty presenter has nothing to paint.
6. A screen may own **more than one** presenter (tabs, split view). Each is a named `let`.

Bake is a snapshot: IR shows the current top (and cover if present). History is presenter state, same as a param. Fixtures may pin a deep stack for review.

---

## 5. Emit propagation (the shape)

Protocols define emits and assume they go to a **parent**. Make **how far** an argument of `emits`, defaulting to immediate parent.

### 5.1 Cases

| Propagation | Meaning |
|-------------|---------|
| **`.parent`** (default) | Immediate parent must capture on a **child let** — existing API emit rules (`row.select = { }`) |
| **`.ancestors`** | If this parent does not handle it, pass to the **next** parent, until a handler stops it |

```pdl
// Local UI — default propagation (.parent)
protocol SubnavItem: component {
  selected: Bool
  emits {
    select(filter: FilterId)
  }
}

// Navigation — climb the parent chain. Pack-owned name.
protocol ShowEpisode: component {
  emits(propagation: .ancestors) {
    showEpisode(id: EpisodeId)
  }
}

protocol AppNav {
  emits(propagation: .ancestors) {
    back()
    showSettings()
  }
}
```

**Lean for v1:** **`emits(propagation:)`** on the emits block. Protocol-wide `propagation =` is sugar, not required. Per-channel `dismiss(propagation: .ancestors)` can wait.

**No reserved protocol name.** `ShowEpisode` / `AppNav` / `Routing` are pack names. Only `propagation: .ancestors` changes delivery.

### 5.2 Who captures (the screen is the parent)

Today’s capture is **child-let**: `row.select(filter_id: FilterId) = { … }`. Nested rows live **inside** the presenter, so the screen has no `row` let.

`.ancestors` therefore needs a second form: **bare channel on the ancestor**.

| Form | Who | Example |
|------|-----|---------|
| **Child-let** | Immediate parent of a named `let` | `row.select(…) = { current = filter_id }` |
| **Host inbound** | This node’s host channels | `self.pressEnd = { emit showEpisode(id) }` |
| **Ancestor capture** | This node, when a bubbled emit arrives | `showEpisode(id: EpisodeId) = { presenter.push(…) }` |

**Not these**

- `ShowEpisode.showEpisode = { }` — treats a protocol like a child let
- `screen Phone <ShowEpisode>` — the screen is not an emitter
- `presenter.showEpisode = { }` — the presenter does not hear emits; it only `push` / `pop` / `present`

The protocol stays on **EpisodeRow**. The screen does not conform to it. It handles a channel that reached it, then commands its presenter.

`on showEpisode` is the same idea; v1 does not add `on`. Bare `channel(…) =` is enough and stays distinct from host `self.…`.

---

## 6. Bubble semantics (`.ancestors`)

1. Fire from a conforming instance (`emit showEpisode(id: …)`).
2. Walk **ancestors** toward the root.
3. At each ancestor: if it registers a **bare** capture for that channel → **handle and stop**.
4. Else → **continue** to the next parent.
5. If the root is reached with no handler → **error**.

For **`.parent`**, unhandled at the immediate child-let site remains an error — **no** climb.

Nearest capturing ancestor wins. A nested page that owns its own `Presenter` and captures `showEpisode` swallows the emit before `Phone` sees it. Do not skip a capturing middle node unless we later add an explicit rethrow.

```text
EpisodeRow  emit showEpisode(id)
  → Home (page) — no bare capture → pass up
  → Phone (screen) — showEpisode(id:) = { presenter.push(Episode(id: id)) }
  → rebake; Presenter paints Episode
```

---

## 7. Context awareness (what conforms)

| Layer | Emit protocol? | Responsibility |
|-------|----------------|----------------|
| Atoms (`Button`, `Icon`) | **No** | Pointer / presentation only |
| Nav molecules (`EpisodeRow`, `BackButton`) | **Yes** | `emit` on press |
| Destination pages | Optional | Usually **no** capture — climb to the screen |
| **`Presenter`** | **No** | Hole: `push` / `pop` / `replace` / `present` / `dismiss` |
| **Screen** | **No** (not an emitter) | Ancestor parent: bare `channel(…) =` + command presenter |

**Avoid** routing on generic `Button`. **Prefer** `EpisodeRow <ShowEpisode, PointerInput>` (or a page-level translation of a dumb button).

---

## 8. Worked stub

```pdl
protocol ShowEpisode: component {
  emits(propagation: .ancestors) {
    showEpisode(id: EpisodeId)
  }
}

protocol AppNav {
  emits(propagation: .ancestors) {
    back()
    showSettings()
  }
}

component EpisodeRow <ShowEpisode, PointerInput>(
  episodeId: EpisodeId = .demo,
  title: String = "Neon Shoulder"
) layout {
  direction = .row
  let label = Text(content: title, style: Body)
  children = [label]
  self.pressEnd = {
    emit showEpisode(id: episodeId)
  }
}

component BackButton <AppNav, PointerInput>(
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
  // no ancestor capture — .ancestors climbs to the screen
}

page Episode(episodeId: EpisodeId = .demo) layout {
  let back = BackButton()
  let title = Text(content: "Episode", style: Title)
  children = [back, title]
}

page Settings() layout {
  let title = Text(content: "Settings", style: Title)
  children = [title]
}

screen Phone() layout {
  direction = .column
  width = .fill
  height = .fill

  let home = Home()
  let presenter = Presenter(root: home)
  let tabBar = TabBar()
  children = [presenter, tabBar]

  showEpisode(id: EpisodeId) = {
    presenter.push(Episode(episodeId: id))
  }

  back() = {
    presenter.pop()
  }

  showSettings() = {
    presenter.present(Settings(), style: .cover)
  }
}
```

### Optional Studio map (hints, not the delivery bus)

```pdl
prototype LibraryDemo {
  start = Phone()
}
```

Delivery is **tree propagation** + presenter methods. A later `prototype` block may list starts; it is not the sink.

---

## 9. Relationship to other proposals

| Proposal | Boundary |
|----------|----------|
| **Host Environment** | Environment params / catalogs — not emit delivery, not the stack |
| **Protocol capabilities** | Host vs API unchanged; this adds **propagation** on `emits` and **ancestor capture** |
| **Slots / emits** | Child-let capture unchanged; `.ancestors` + bare `channel(…) =` is the new parent form. Revises §8.5 (stack is `Presenter`, not a host blob) |
| **Adaptive layout** | Screens may also `<Host>` for size/surface |

---

## 10. Diagnostics (when accepted)

| Concern | Direction |
|---------|-----------|
| `.ancestors` emit with no bare handler through root | Error |
| `.parent` emit unhandled | Existing child-let rules |
| Unknown `propagation` case | Error |
| `Protocol.channel =` / `presenter.channel =` as ancestor capture | Error — wrong form |
| `push` / `present` outside a capture body | Error |
| `Presenter()` without `root` | Error |
| Atom patterns with nav conformance | Lint later |
| `pop` at `root` | No-op in v1; lint later |
| `page` / `screen` / `Presenter` before grammar lock | Proposal-only |

---

## 11. Suggested slices

| Slice | Deliverable |
|-------|-------------|
| **N0** | `page` / `screen` roles (parse + catalogue) |
| **N1** | `emits(propagation: .parent \| .ancestors)` parse + validate |
| **N2** | Ancestor capture: bare `channel(…) =` (not `Protocol.channel`) |
| **N3** | `Presenter(root:)` + `replace` + lab (single child) |
| **N4** | `push` / `pop`; bake paints top; fixture-pinned stack |
| **N5** | `present(…, style: .cover)` / `dismiss` |
| **Later** | Per-channel propagation; `prototype` metadata; `.sheet` chrome |

Live click-to-navigate needs emit dispatch (**B7**). N3–N5 labs can bake a pinned presenter state without B7.

---

## 12. Open questions

| # | Question | Lean |
|---|----------|------|
| **Q1** | `emits(propagation:)` vs protocol-wide `propagation =` | **`emits(propagation:)`** primary; protocol-wide as sugar |
| **Q2** | Sink must be `screen`, or any capturing ancestor? | **Any capturing ancestor**; **recommend screen** |
| **Q3** | Keyword `page` / `screen` vs attribute on `component` | **`page` / `screen` keywords** |
| **Q4** | Resolve `push(route:)` → page instance | **No.** Handler constructs the instance; `presenter.push(Episode(id:))` |
| **Q5** | Case names `.ancestors` vs `.parents` vs `.up` | **`.ancestors`** |
| **Q6** | Unhandled at root for `.ancestors` | **Hard error** |
| **Q7** | Does `page` auto-conform to `Page` protocol? | **Yes** |
| **Q8** | Ancestor capture spelling | **Bare `channel(…) =`** on the parent. Not `Protocol.channel`, not `on`, not `presenter.channel` |
| **Q9** | Does the screen conform to the emit protocol? | **No** |
| **Q10** | Stack as `path: [Page]` param vs `Presenter` frame | **`Presenter`** mounted in `children` |
| **Q11** | `pop` at `root` | **No-op** in v1 |
| **Q12** | Vacant cover type | **Later variant**; do not block N3–N4 on `T?` |

---

## 13. Decision lean (one paragraph)

Introduce **`page`** and **`screen`** as component roles. Mount a prelude **`Presenter(root:)`** in the screen’s `children` next to chrome. Give protocol **`emits` a `propagation` argument**: default **`.parent`** (child-let capture, today’s API), **`.ancestors`** (climb until a **bare `channel(…) =`** on an ancestor stops it — usually the **screen**). The screen is the parent, not a `<Presenting>` sink and not `Protocol.channel`. Nav molecules emit; pages typically do not capture; the screen commands **`presenter.push` / `pop` / `replace` / `present`**. Environment stays on **`host`**.
