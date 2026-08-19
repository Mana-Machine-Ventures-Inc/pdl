# Proposal: Pages, screens, Presenter, and emit propagation

**Status:** proposed (2026-08-16); revised same day — **`Presenter`** prelude frame; **screen-as-parent** capture. **N0–N5 + B7 shipped.** Revised later that day — **N6–N9 proposed:** `appear` / `disappear`; **`PresentationMotion`**; `present(retainPrior:)` / `swap` / `replace`; `dismiss()` pops; per-tab Presenters for retained stacks.  
**Depends on:** `docs/PROPOSAL_PROTOCOL_CAPABILITIES.md` (API vs host protocol roles; emits); `docs/PROPOSAL_SLOTS_PROTOCOLS_FIXTURES.md` §8 (local vs prototype emit lanes); `docs/PROPOSAL_HOST_ENVIRONMENT.md` (environment vs navigation); `docs/PROPOSAL_MOTION_PLAY.md` (**superseded:** `animate =` is now `Animation(start?, keys: [Motion…])` — not Play/Key)  
**Related:** Studio prototypes; nav stack / modal cover; fixtures as previewed worlds  
**Plan:** [`IMPLEMENTATION_PLAN_ROUTING_PAGES_SCREENS.md`](./IMPLEMENTATION_PLAN_ROUTING_PAGES_SCREENS.md)

Until this is locked in `shared/*.json` / `grammar/pdl.ebnf`, tooling must not treat the syntax as normative.

---

## 1. Problem

Studio and app hosts need to run **prototypes where a shell swaps destinations** (home → episode → settings). PDL today has only **`component`**. Authors and tools lack:

1. A discoverable split between **reusable parts**, **destinations**, and **device shells**.
2. A typed way for a deep control to **ask for navigation** without prop-drilling a router or naming Studio.
3. Clear rules for **how far an emit travels** when the immediate parent does not handle it.
4. A first-class hole that can **present**, **swap**, or **replace** a destination — not a one-cell `content =` assign and a hardcoded `back → Home()`.

Protocols already define `emits` and assume delivery to a parent. That assumption is underspecified: most UI channels must stop at the declaring parent; navigation channels need to **climb the ancestor chain** until a shell handles them. The shell is the **parent**. A local `Presenter` let is the **hole**, not the bus.

---

## 2. Goals

| Goal | Meaning |
|------|---------|
| **Roles on one machine** | `page` / `screen` are component-like; Studio can filter destinations vs shells |
| **`Presenter` in the tree** | A prelude frame the screen mounts next to chrome (`children = [presenter, tabBar]`) |
| **Screen is the parent** | Bare `showEpisode(id:) = { presenter.present(…) }` — not `Protocol.channel`, not `presenter.channel` |
| **Emitters send; screens receive** | `EpisodeRow <PointerInput> emits <ShowEpisode>` fires; `screen Phone <ShowEpisode>` captures |
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
- `T?` optionals — a vacant overlay is “no retained entry above the base,” not a new type.
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

A `screen` that handles a climbed emit **receives** that protocol (`<ShowEpisode>`) and writes the bare handler. Emitters write `emits <ShowEpisode>`.

---

## 4. `Presenter` (the hole)

`Presenter` is a **prelude frame**, like a one-child layout. The screen (or any ancestor) **mounts** it. Pages are values you hand it. A component never replaces itself.

| Verb | Stack | Inverse |
|------|--------|---------|
| **`present(page, retainPrior:, move:, dismissMove:)`** | **Append.** `retainPrior: false` (default) hides prior painted pages after the clip. `true` keeps them on stage (chainable). | `dismiss()` pops this entry |
| **`swap(page, move:)`** | Replace the **top-most** entry only. Inherits that slot’s `retainPrior`. No `dismissMove`. | None for this crossing. `dismiss()` still pops the new top unless it is the lone root |
| **`replace(page, move:)`** | Stack becomes **`[page]`**. Old entries discarded. No `dismissMove` (not poppable). | `dismiss()` no-op until you `present` again |
| **`dismiss()`** | Pop last entry. No-op on a lone root. | — |
| **`root`** | First destination. Required. Stack starts as `[root]` (`retainPrior` irrelevant). | — |

`push(page, …)` may remain sugar for `present(page, retainPrior: false, …)`.

N3 shipped `replace` as **swap top**. N9 splits that: **`swap`** is change-the-top; **`replace`** is wipe-the-stack. At one entry they are the same, and that is OK.

```text
Presenter
  stack: [
    { Home,     retainPrior: false },
    { Episode,  retainPrior: false },
    { Settings, retainPrior: true },
    { Filter,   retainPrior: true }
  ]
  paints: Episode + Settings + Filter    // walk: retain, then stop at !retainPrior
```

One hole, one stack, one inverse (`dismiss`). Chrome (scrim, card) is an authored page. See §14–§16.

**Rules**

1. A node does not change its own type. The presenter changes its **stack**; bake paints the walk (§14.1).
2. `present` / `swap` / `replace` / `dismiss` (and `push` sugar) are legal **only in an ancestor-capture body**.
3. `Presenter` is not a `page`.
4. Host environment stays out. `view.width` does not present.
5. `root` is not optional.
6. A screen may own **more than one** presenter. That is how you retain a nav stack per tab (§14.3). `replace` on a shared hole does **not** keep the previous stack.

Bake is a snapshot: IR shows the paint walk. History is pins. Fixtures may pin a deep stack.

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
| **Ancestor capture** | This node, when a bubbled emit arrives | `showEpisode(id: EpisodeId) = { presenter.present(…) }` |

**Not these**

- `ShowEpisode.showEpisode = { }` — treats a protocol like a child let
- `screen Phone emits <ShowEpisode>` — the screen is a sink, not an emitter
- `presenter.showEpisode = { }` — the presenter does not hear emits; it only `present` / `swap` / `replace` / `dismiss` (`push` / `pop` may stay sugar)

**EpisodeRow** sends (`emits <ShowEpisode>`). **Phone** receives (`<ShowEpisode>`) and writes the bare handler, then commands its presenter.

`on showEpisode` is the same idea; v1 does not add `on`. Bare `channel(…) =` is enough and stays distinct from host `self.…`.

---

## 6. Bubble semantics (`.ancestors`)

1. Fire from a conforming instance (`emit showEpisode(id: …)`).
2. Walk **ancestors** toward the root.
3. At each ancestor: if it both lists the protocol in receive `<>` and registers a **bare** capture for that channel → **handle and stop**.
4. Else → **continue** to the next parent.
5. If the root is reached with no handler → **error**.

For **`.parent`**, unhandled at the immediate child-let site remains an error — **no** climb.

Nearest capturing ancestor wins. A nested page that owns its own `Presenter` and captures `showEpisode` swallows the emit before `Phone` sees it. Do not skip a capturing middle node unless we later add an explicit rethrow.

```text
EpisodeRow  emit showEpisode(id)
  → Home (page) — no bare capture → pass up
  → Phone (screen) — showEpisode(id:) = { presenter.present(Episode(id: id)) }
  → rebake; Presenter paints Episode
```

---

## 7. Context awareness (what conforms)

| Layer | Emit protocol? | Responsibility |
|-------|----------------|----------------|
| Atoms (`Button`, `Icon`) | **No** | Pointer / presentation only |
| Nav molecules (`EpisodeRow`, `BackButton`) | **Send** (`emits <P>`) | `emit` on press |
| Destination pages | Optional receive | Usually **no** capture — climb to the screen |
| **`Presenter`** | **No** | Hole: `present` / `swap` / `replace` / `dismiss` |
| **Screen** | **Receive** (`<P>`) | Ancestor sink: `<ShowEpisode>` + bare `channel(…) =` + command presenter |

**Avoid** routing on generic `Button`. **Prefer** `EpisodeRow <PointerInput> emits <ShowEpisode>` (or a page-level translation of a dumb button).

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
    closeSettings()
  }
}

component EpisodeRow <PointerInput> emits <ShowEpisode>(
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

component BackButton <PointerInput> emits <AppNav>(
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

screen Phone <ShowEpisode, AppNav>() layout {
  direction = .column
  width = .fill
  height = .fill

  let home = Home()
  let presenter = Presenter(root: home)
  let tabBar = TabBar()
  children = [presenter, tabBar]

  showEpisode(id: EpisodeId) = {
    presenter.present(Episode(episodeId: id))   // retainPrior: false
  }

  back() = {
    presenter.dismiss()
  }

  showSettings() = {
    presenter.present(Settings(), retainPrior: true)
  }

  closeSettings() = {
    presenter.dismiss()
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
| **Motion play** | Pose / Motion / play defaults. This proposal adds `disappear` (rename) + **`PresentationMotion`** (Presenter-only; `incoming` / `outgoing` / `front`). Do not put pair crossings on `Motion`. Timing / Ease rename is a motion-track follow-on. |

---

## 10. Diagnostics (when accepted)

| Concern | Direction |
|---------|-----------|
| `.ancestors` emit with no bare handler through root | Error |
| `.parent` emit unhandled | Existing child-let rules |
| Unknown `propagation` case | Error |
| `Protocol.channel =` / `presenter.channel =` as ancestor capture | Error — wrong form |
| `present` / `swap` / `replace` / `dismiss` outside a capture body | Error |
| `Presenter()` without `root` | Error |
| Atom patterns with nav conformance | Lint later |
| `dismiss` at lone root | No-op in v1; lint later |
| `dismissMove` on `swap` / `replace` | Error |
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
| **N5** | `present(…, style: .cover)` / `dismiss` — **shipped** (one cover field) |
| **N6** | `appear` / `disappear` lifecycle (rename PointerInput `dismiss`; detach from PointerInput) |
| **N7** | Host: retained-layer `appear` on mount; `dismiss` waits for `disappear` |
| **N8** | `PresentationMotion` + `move` / `dismissMove` / `.reversed` + two-node lane |
| **N9** | `present(retainPrior:)` / `swap` / `replace`; paint walk; many retained layers |
| **Later** | Per-channel propagation; `prototype` metadata; `.sheet` chrome; keep-alive under-top; interactive pop; Presenter-of-Presenters |

Live click-to-navigate needs emit dispatch (**B7**). N3–N5 labs can bake a pinned presenter state without B7.

---

## 12. Open questions

| # | Question | Lean |
|---|----------|------|
| **Q1** | `emits(propagation:)` vs protocol-wide `propagation =` | **`emits(propagation:)`** primary; protocol-wide as sugar |
| **Q2** | Sink must be `screen`, or any capturing ancestor? | **Any capturing ancestor**; **recommend screen** |
| **Q3** | Keyword `page` / `screen` vs attribute on `component` | **`page` / `screen` keywords** |
| **Q4** | Resolve `push(route:)` → page instance | **No.** Handler constructs the instance; `presenter.present(Episode(id:))` |
| **Q5** | Case names `.ancestors` vs `.parents` vs `.up` | **`.ancestors`** |
| **Q6** | Unhandled at root for `.ancestors` | **Hard error** |
| **Q7** | Does `page` auto-conform to `Page` protocol? | **Yes** |
| **Q8** | Ancestor capture spelling | **Bare `channel(…) =`** on the parent. Not `Protocol.channel`, not `on`, not `presenter.channel` |
| **Q9** | Does the screen conform to the emit protocol? | **No** |
| **Q10** | Stack as `path: [Page]` param vs `Presenter` frame | **`Presenter`** mounted in `children` |
| **Q11** | `dismiss` at lone root | **No-op** in v1 |
| **Q12** | Vacant overlay | **N5:** omit `props.cover`. **N9:** no vacant slot — a retained entry is just on the stack. |
| **Q13** | `appear` / `disappear` on PointerInput? | **No.** Intrinsic on any instance root. |
| **Q14** | Does hide-prior fire `disappear` on the hidden page? | **No.** Hidden, still on the stack. |
| **Q15** | Omit `dismissMove` | **Reuse `move`**. Not reverse. Reverse is `.reversed`. |
| **Q16** | Hole-relative incoming Pose | **v1 is authored CSS px.** Hole-relative (`%` of the hole, `.hole`) is a later Pose unit — not a `PresentationMotion` special case. |
| **Q17** | `let shield.appear` | **No in v1.** Instance roots only. |
| **Q18** | Many retained layers | **Yes.** `retainPrior: true` is chainable. N5 is one cover field until N9. |
| **Q19** | Retained stack per tab | **One Presenter per tab.** Not `replace` on a shared hole. |
| **Q20** | `present` vs `swap` vs `replace` | **`present` appends** (`retainPrior` is the paint flag). **`swap`** changes the top slot (inherits `retainPrior`). **`replace`** wipes the stack to `[page]`. At one entry, `swap` ≡ `replace`. |
| **Q21** | Default `retainPrior` | **`false`** — `present(Episode())` hides the prior page. |
| **Q22** | Crossing front | **On `PresentationMotion`:** `front: .incoming \| .outgoing` (default `.incoming`). Not on `Pose`. Not `present(z:)`. |
| **Q23** | `swap` / `replace` and `dismissMove` | **Illegal.** Not a new poppable crossing. Optional `move` only. |
| **Q24** | N3 `replace` (shipped) | **Becomes `swap`.** New `replace` is full-stack wipe. Labs migrate in N9. |
| **Q25** | `replace` with several painted layers | **Snap the hole.** Play `disappear` on each discarded **painted** instance. Hidden pins die with no clip. No composite outgoing layer in v1. |
| **Q26** | `appear` vs `PresentationMotion` timing | **Fire `appear` when the incoming page is mounted for the move** (CTA can run during the slide), not after commit. |
| **Q27** | RTL / writing direction | **No silent invert in v1.** Authors ship a second token or a later hole-relative Pose unit (Q16). |
| **Q28** | `PresentationMotion(token, field:)` copy-override | **Not in v1.** Literal + `.reversed` only. Copy-override can wait until Motion’s constructor is boring and a lab needs “nav push, this time from behind.” |
| **Q29** | Mid-clip front flip | **`switchAt: Duration?`** (milliseconds from play start). Omit = keep `front` the whole clip. Values in (0, 1) are E005. Not `incomingAfter(t)`. (Renamed from `promoteAt`; was 0…1.) |
| **Q30** | Timing / Ease vs today’s `Transition` / `Easing` | **Consolidate now (M5).** Breaking rename. No dual-name period. N8 depends on M5. Plan: [`IMPLEMENTATION_PLAN_MOTION_NAMING.md`](./IMPLEMENTATION_PLAN_MOTION_NAMING.md). |
| **Q31** | Per-side clocks | **Allowed.** A `Motion` in a slot uses its own duration / ease / delay. Shared `duration` / `ease` apply when a slot is a `Pose`. Interrupt reverses each side from its own progress. |

---

## 13. Decision lean (one paragraph)

Introduce **`page`** and **`screen`** as component roles. Mount a prelude **`Presenter(root:)`** in the screen’s `children` next to chrome. Give protocol **`emits` a `propagation` argument**: default **`.parent`**, **`.ancestors`** until a **bare `channel(…) =`** stops it. The screen commands the hole. **N6–N9:** `present` always **appends** (`retainPrior` is a paint flag, default `false`). `swap` changes the top slot. `replace` wipes the stack to `[page]`. `dismiss()` pops. Pair crossings are **`PresentationMotion`** (`incoming` / `outgoing` / `front` / `switchAt`; `move` / `dismissMove` / `.reversed`). Retained chrome is an authored page with `appear` / `disappear`. Per-tab history is one Presenter per tab.

---

## 14. Present, swap, replace

Do not name use cases (`.push` / `.cover` / `.root`). Three verbs mutate the stack as a list; one flag on `present` says whether the previous painted pages **stay in the tree**.

| Verb | What it does |
|------|----------------|
| **`present`** | Always **push onto the stack**. `retainPrior: false` (default): after the clip, hide everything below this entry. `retainPrior: true`: they stay painted; do it again, get a chain. `dismiss()` pops this entry. |
| **`swap`** | Change the **current top-most** view. Under it is untouched. The new entry **inherits** that slot’s `retainPrior`. No `dismissMove`. At one entry, same effect as `replace`. |
| **`replace`** | Stack = `[page]`. Not poppable. Optional `move`, no `dismissMove`. |

```text
[Home]                         swap(Library)     → [Library]      // ≡ replace
[Home, Episode]                swap(Other)       → [Home, Other]
[Home, Episode]                replace(Other)    → [Other]
[Home, Episode, Settings*]     swap(Confirm)     → [Home, Episode, Confirm*]
                               * retainPrior: true
```

N5’s single `cover` field is the v1 stand-in for one `retainPrior: true` entry. N9 is the stack.

### 14.1 Paint walk

From the **top** downward:

1. Include the top entry.
2. If that entry has `retainPrior: true`, keep walking.
3. If `retainPrior: false` (or it is the lone root), include it and **stop**.

```text
[Home f, Settings t, Episode f]     paints: Episode only
[Home f, Settings t, Filter t]      paints: Home + Settings + Filter
```

Hidden entries still **exist** (params, variants, session). They are not in this bake.

### 14.2 Front (on `PresentationMotion`)

Who is in front is a fact about the **crossing**, not a Pose field and not `present(z:)`.

```pdl
enum Front {
  case incoming    // new view in front (default)
  case outgoing    // new view behind
}
```

`PresentationMotion.front` plus optional `switchAt` (§16). On `retainPrior: false`, front is in-flight only. On `retainPrior: true` (v1: no pair clip), painter’s order is the authored `.stack`.

### 14.3 `dismiss()`

Pop the last entry. Play that entry’s `dismissMove` (or the same `move`, or snap). Then bake.

- Lone root → no-op.
- N5 `dismiss()` cleared a cover field. After N9 it is always “pop last.”
- `swap` / `replace` do not take `dismissMove`.

### 14.4 Tabs and retained stacks

`replace` on **one** Presenter throws the previous stack away. Fine for v1 interrupt / tab-without-history.

A prototype that needs **a nav stack per tab** mounts **one Presenter per tab**:

```pdl
screen Phone() layout {
  let home = Presenter(root: Home())
  let library = Presenter(root: Library())
  let search = Presenter(root: Search())
  children = [home]   // screen chooses which hole is on stage
}
```

Do not invent a Presenter-of-Presenters in this cut.

### 14.5 Lifecycle (`appear` / `disappear`)

Bake IR is **what is on stage**. Pins are **what exists**.

`appear` / `disappear` are **instance-root** host inbounds. Not PointerInput. Not a new protocol. `self.dismiss` is rejected — write `self.disappear`. `presenter.dismiss()` is the stack verb.

| Event | Meaning | Default play |
|-------|---------|----------------|
| **`appear`** | This instance **joined the painted set**. May fire again when a hide-prior entry above is dismissed. | `.toRest` |
| **`disappear`** | This instance is being **discarded** (popped, swapped out, or wiped by `replace`). | `.toPose` |

| Crossing | `appear` | `disappear` |
|----------|----------|-------------|
| `present` B, `retainPrior: false` | B yes | A **no** (hidden) |
| `dismiss` that B | revealed base yes (CTA) | B yes |
| `present` S, `retainPrior: true` | S yes | A **no** (still painted) |
| `dismiss` that S | A **no** | S yes |
| `swap` T | T yes | old top yes (discarded) |
| `replace` L | L yes | currently **painted** old entries yes; hidden pins die without a clip |

**CTA rule:** flash on `self.appear` — first present *and* pop-back. First-time-only is a param.

**Not these:** `disappear` because you were hidden; `disappear` because a retained layer occludes you; `appear` when a retained layer above you is dismissed; viewport / `enteredView`.

`appear` / `disappear` are `self.` on instance roots. Two clips ⇒ two components (`Dim` + slotted page).

If a crossing also has a `PresentationMotion`, do not put a full-page `translateX` on the pages’ `appear` / `disappear`. The pair owns the hole move. Omitting `move` still lets each page play its own clip.

---

## 15. Retained chrome (author-owned)

`present(page, retainPrior: true)` appends a layer. It does not size, place, dim, or blur. `.sheet` is still E055 (later chrome). N5’s single `cover` field is the v1 stand-in for one retained entry; N9 allows a chain.

Authors who want a scrim + a hugging card present a **page** that is a `.stack` (painter’s order: first at the back, last on top) and slot the destination in:

```pdl
component Dim() layout {
  width = .fill
  height = .fill
  background = #00000066
  self.appear = {
    animate = Motion(timing: motion.appear, pose: Pose(opacity: 0))
  }
  self.disappear = {
    animate = Motion(timing: motion.dismiss, pose: Pose(opacity: 0))
  }
}

page Cover(content: Page = Settings()) layout {
  direction = .stack
  width = .fill
  height = .fill
  let shield = Dim()
  let surface = content
  children = [shield, surface]
}

page Settings() layout {
  width = 300
  height = 300
  // …
  self.appear = {
    animate = Motion(timing: motion.appear, pose: Pose(translateX: -48))
  }
  self.disappear = {
    animate = Motion(timing: motion.dismiss, pose: Pose(translateX: 48))
  }
}

showSettings() = {
  presenter.present(Cover(content: Settings()), retainPrior: true)
}
```

Platform blur / darker scrim lives on `Dim` (or a variant), not on `present(…)`. A full-bleed settings page can be presented bare: `present(Settings(), retainPrior: true)`.

**Host (N7 / N9).** Incremental apply today inserts/removes a single cover with no clip.

1. New retained entry **mounts** → play `appear` on that instance only (not the whole Phone `appear-armed`).
2. `dismiss()` of a retained entry → play `disappear` → wait `finished` → pop.
3. No clip → unmount immediately.
4. Appear still in flight → reverse from the live overlay, then pop.
5. Several retained entries: each is a painted sibling in z-order (stack walk + authored `.stack`). `dismiss` pops only the top.

No `PresentationMotion` on `retainPrior: true` in v1 — use `appear` / `disappear` on `Dim` + the slotted page. A later general `Choreography` (unnamed clips) is not this type.

Clip-rack Appear / Disappear stay for teaching. They do not clear Presenter pins.

---

## 16. `PresentationMotion` (Presenter crossing)

A Presenter crossing is **two pages, two clips, one front**. It does not live on `self.appear`. `Motion` is one node. This type is **Presenter-only** — the slot names `incoming` / `outgoing` / `front` are this framework. A later general `Choreography` (unnamed clips) is a different object.

```pdl
enum Front {
  case incoming
  case outgoing
}

PresentationMotion(
  incoming: Motion | Pose,     // slot ⇒ play .toRest (pose → rest)
  outgoing: Motion | Pose,     // slot ⇒ play .toPose (rest → pose)
  duration: Duration?,         // shared clock when a slot is a Pose
  ease: Ease?,
  delay: Duration?,
  front: Front = .incoming,
  switchAt: Duration?          // ms from play start; omit = keep front the whole clip
)
```

Play is **implied by the slot**, not stored on the Motion. `enterFrom` / `leaveTo` were role names for those Poses; the slots are now `incoming` / `outgoing`.

A **Pose** in a slot inherits the pair’s `duration` / `ease` / `delay`. A **Motion** in a slot uses its own clock (different durations and eases are allowed). A Motion with `keys:` plays that path as authored (`Key.ease` is the curve to the next stop). If both slots are Poses and no shared duration is set, the hole default applies, or the crossing snaps.

```pdl
semantic motion.navPush: PresentationMotion = PresentationMotion(
  duration: 350,
  ease: Ease.bezier(0.2, 0, 0, 1),
  incoming: Pose(translateX: 390),
  outgoing: Pose(translateX: -120, opacity: 0.55),
  front: .incoming
)

semantic motion.deck: PresentationMotion = PresentationMotion(
  duration: 350,
  ease: Ease.out,
  incoming: Pose(translateX: 390),
  outgoing: Pose(translateX: -390),
  front: .incoming
)

semantic motion.crossFade: PresentationMotion = PresentationMotion(
  incoming: Motion(duration: 280, ease: Ease.bezier(0.42, 0, 0.58, 1), pose: Pose(opacity: 0)),
  outgoing: Motion(duration: 280, ease: Ease.bezier(0.42, 0, 0.58, 1), pose: Pose(opacity: 0)),
  front: .outgoing,
  switchAt: 240
)
```

iOS-style: incoming starts at +390 and settles; outgoing ends at −120 and darkened; incoming stays in front. Card deck: every crossing is right-to-left. Crossfade: outgoing stays in front until halfway, then incoming takes front.

`front` is in-flight on hide-prior / `swap` / `replace`. Do not put crossing Z on `Pose`.

### 16.1 Where it is set

Default on the hole (`move:` / `dismissMove:`). Override on **`present`**. Store the value on the **stack entry**. `dismiss()` does not take a move. Verb args stay `move:` — do not write `present(incoming:, outgoing:)`.

```pdl
let presenter = Presenter(root: home, move: motion.navFade)
// optional Presenter.dismissMove — hole default when the verb omits dismissMove

presenter.present(Episode(episodeId: id))
presenter.present(Episode(episodeId: id), move: motion.navPush)
presenter.present(
  Episode(episodeId: id),
  move: motion.navPush,
  dismissMove: motion.navPush.reversed
)
presenter.dismiss()
```

`push(page, move:, dismissMove:)` is sugar for `present(page, retainPrior: false, …)`.

| Args | This crossing | Later `dismiss()` of this entry |
|------|---------------|--------------------------------|
| both omitted | Presenter `move`, or **snap** if none | Presenter `dismissMove`, else same as `move`, or snap |
| `move:` only | that crossing | **the same `move` again** (not reversed) |
| `move:` + `dismissMove:` | `move` | `dismissMove` as a normal crossing |

**Omit `dismissMove` is not reverse.** Reverse is a computed property: `motion.navPush.reversed` swaps the two **sides** (pose + that side’s timing travel together) and **time-reverses `ease`**: `.in`↔`.out`, `Ease.bezier(x1,y1,x2,y2)` → `Ease.bezier(1-x2,1-y2,1-x1,1-y1)`, `.linear` stays. Pair `delay` stays. Omit `switchAt`: flip `front` (`.incoming` ↔ `.outgoing`) so the same page stays on top. With `switchAt`: keep `front` (the side swap remaps who that label is) and invert to `span − switchAt` (span is max of each side’s delay + duration). A `Motion` slot’s own `ease` flips after the swap. `keys:` paths are not reversed — write `dismissMove:` for that. You may name it (`semantic motion.navPop: PresentationMotion = motion.navPush.reversed`). A theme that replaces `motion.navPush` changes the derived value too.

`replace` / `swap` take optional `move` only (no `dismissMove`). `retainPrior: true` does not take a `PresentationMotion` in v1 — use `appear` / `disappear` on the presented tree. Hide-prior `present` is the pair-clip case.

### 16.2 Host two-node lane (`retainPrior: false` only)

Bake paints the walk (§14.1). For one hide-prior clip the host must hold **outgoing and incoming**:

1. Apply the next pin in memory; do not drop the outgoing node yet.
2. Mount the incoming page at its incoming pose (on dismiss, remount the revealed page from the next bake / pin, already at that crossing’s outgoing pose).
3. Play both clips. If durations differ, each side has its own playhead.
4. Honor `front` / `switchAt` while both are on stage.
5. Commit: paint walk only (hidden hide-prior bases leave the tree).

Authors do not pass “old view” and “new view.” The Presenter hole *is* that constructor.

Interrupt (`dismiss` during a present): reverse each side from its live progress (same machine as hover cancel), then commit or restore. Timeout if WAAPI never finishes.

### 16.3 Worked screen

```pdl
screen Phone <ShowEpisode, AppNav>(
  nav: NavKind = .fade
) layout {
  let home = Home()
  let presenter = Presenter(root: home, move: motion.navFade)
  children = [presenter]

  showEpisode(id: EpisodeId) = {
    if nav == .ios {
      presenter.present(
        Episode(episodeId: id),
        move: motion.navPush,
        dismissMove: motion.navPush.reversed
      )
    } else {
      presenter.present(Episode(episodeId: id))
    }
  }
  back() = { presenter.dismiss() }
  showSettings() = {
    presenter.present(Cover(content: Settings()), retainPrior: true)
  }
  closeSettings() = { presenter.dismiss() }
  showLibrary() = {
    presenter.replace(Library())   // wipe stack; dismiss no-op until present again
  }
}
```

---

## 17. Relationship to motion

[`PROPOSAL_MOTION_PLAY.md`](./PROPOSAL_MOTION_PLAY.md) stays the Pose / Motion / play-mode spec. Clock names are **`Timing` / `Ease`** after **M5** ([`IMPLEMENTATION_PLAN_MOTION_NAMING.md`](./IMPLEMENTATION_PLAN_MOTION_NAMING.md)). This proposal owns **when** the host fires `appear` / `disappear` for Presenter, and the **`PresentationMotion`** type.

| Kind | What it is |
|------|------------|
| **`Pose`** | Overlay state (opacity, translate, scale, rotate, blur, origin). Not Z. |
| **`Duration`** | Span in ms. Delay is the same type, used as an offset. |
| **`Ease`** | How time is shaped (`.linear`, `.in`, `.out`, `Ease.bezier(…)`). Not a CSS string. |
| **`Timing`** | Reusable clock (duration + ease + delay). Not a crossing. Bare Timing is tree-tween `animate =`. |
| **`Key`** | A pose at `at: 0…1` of the duration. |
| **`Motion`** | One node, one playhead — the value of `animate =`. |
| **`PresentationMotion`** | Presenter-only: incoming + outgoing + front. Contains Motions / Poses. |
| **`Play`** | `.toRest` / `.toPose` / `.loop`. On a crossing, implied by the slot. |

| Machine | Nodes | Owner |
|---------|-------|--------|
| Pose track on `self.appear` / `self.disappear` | One instance | The page / chrome component |
| `PresentationMotion` | Two pages | `present` / `swap` / `replace` (`move:`) |
| Tree tween | Same node, bake A → B | Unchanged (hover fill, …) |

Do not add an `Animation` type. “Animation” is vernacular (host playback) only.

PointerInput keeps hover / press / focus / activate. Site default `disappear` → `.toPose` (today’s `dismiss` default). Clip rack label: **Disappear**.

---

## 18. Still open (read-through)

Locked enough to implement N6–N9. These are the holes to stare at before grammar lock:

| Topic | Status |
|-------|--------|
| **Hole-relative units (Q16)** | **Locked.** v1 is authored CSS px. Hole-relative is a later Pose unit. |
| **`appear` vs pair timing (Q26)** | **Locked lean.** Fire `appear` when the incoming page is **mounted for the move**, not after commit. |
| **`replace` with several painted layers (Q25)** | **Locked.** Snap; `disappear` on each discarded painted instance. |
| **RTL (Q27)** | **Locked.** No silent invert. Second token or later Pose unit. |
| **Copy-override (Q28)** | **Locked.** Not in v1. Literal + `.reversed` only. |
| **Front site (Q22)** | **Locked.** On `PresentationMotion` (`front` / `switchAt`). Not `present(z:)`. Not on `Pose`. |
| **Mid-clip flip (Q29)** | **Locked.** `switchAt: Duration?` (ms from play start). (0, 1) is E005. |
| **Per-side clocks (Q31)** | **Locked.** Motion-in-slot uses its own timing. Interrupt is per playhead. |
| **Timing / Ease rename (Q30)** | **Locked.** M5 breaking slice before N8. See motion-naming plan. |
| **Interrupt** | **Locked lean.** Back mid-present: reverse each live clip from current progress, then commit or restore. |
| **N3 `replace` (top only)** | **Shipped today.** N9 renames that verb to **`swap`**. New `replace` is full-stack wipe. |
| **Interactive / gesture dismiss** | **Later.** Would drive the stored `dismissMove` (or `move` if omitted) from a drag playhead. |
| **Keep-alive** | **Later.** Do not paint the whole stack in IR just to animate. |
| **`.sheet`** | **Later (E055).** Author a bottom-hugging `Cover` with `.stack` + `justify` on the surface if they need the look now. |
| **Fixture chips** | **Locked lean.** Snap to the pinned world. No `PresentationMotion` / `appear` on fixture apply (load-time section `appear` may still run). |
| **`Presenter.dismissMove`** | **Locked lean.** Hole default when every dismiss should differ from every present. Verb `dismissMove:` still wins per entry. |
| **Grammar of `.reversed`** | **Locked.** Computed property (`motion.navPush.reversed`). Swaps sides, time-reverses `ease`. Omit `switchAt`: flip `front`. With `switchAt`: keep `front`, invert to `span − switchAt`. Not `.reversed()`, not omit-magic. |
| **Reduced Motion** | **Locked lean.** Theme replaces the `PresentationMotion` token wholly (fade or instant). `.reversed` of that token follows. |
| **Several presenters** | **Locked.** Each hole has its own stack. **Per-tab history** = one Presenter per tab, not `replace` on a shared hole. |
| **N5 one `cover` field** | **Keep until N9.** Labs may still pin `presenter.cover`. |
| **General `Choreography`** | **Later.** Unnamed clips; not this type. |
| **Presenter-of-Presenters** | **Later.** |
