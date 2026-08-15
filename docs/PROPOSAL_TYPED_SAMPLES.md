# Proposal: Typed Samples (Named Data Banks)

**Status:** accepted / implemented (2026-08-12). **Superseded as binding spec** by `shared/language-objects.json` `samples` + `shared/schema/component-catalogue.json`. This proposal remains design history; open follow-ups live in `docs/SPEC_GAPS.md`.

**Schema / reference:** `shared/language-objects.json` (`samples`, `arrayChildren`) · `shared/schema/component-catalogue.json`  
**Related:** `docs/PROPOSAL_SLOTS_PROTOCOLS_FIXTURES.md` (lists, dual fixtures / injection packs); pack `test-fixtures/pdl/systems/playlist-composer-lite/`  
**Does not replace:** §11 component `fixtures` (scenario param maps for preview / docs)

---

## 1. Problem

PDL can mount typed instance lists (`tracks: [TrackRow]`, ForEach, emit captures) and can branch chrome on **variants** / Bools. It cannot yet:

1. Author a **named, reusable bank** of typed values (especially `[Component]` lists) outside a single component’s params.
2. **Reference** that bank from layout with path syntax and bake-time type checks.
3. Switch which bank entry is mounted when a **variant world** changes — without a host-specific JS catalog.

Today’s §11 **`fixtures Component { example "…" { … } }`** are **scenario snapshots** (full param bags for preview / Storybook / tests). They are not injectable values. Injection packs (dual fixtures) supply external JSON for prototypes, but are not first-class typed symbols inside `.pdl` authoring.

~~The Playlist Composer Playground demo previously filtered tracks with a hardcoded JS catalog after mood/search emits.~~ **Resolved:** playlist-composer-lite uses `samples Tracks { … }` + mood `if` mounts; host catalog removed.

---

## 2. Goals

| Goal | Meaning |
|------|---------|
| **PDL-authored catalogs** | Named banks of typed fields live in `.pdl` and participate in validate / bake |
| **Path references** | `Tracks.pop_results.tracks` (bank · entry · field) as a value expression |
| **Type safety** | Mismatched element types / missing fields → clear **PDL-E0xx** at load / bake |
| **Variant-driven worlds** | Existing `if searchWorld == .pop { … }` chooses which sample mounts |
| **Mount-site injection** | Samples feed `children` / `Frame.children` (same family as rename chrome), not a new runtime “apply fixture” API |
| **Distinct from scenario fixtures** | §11 `fixtures` stay example param maps; samples are reusable data symbols |
| **Host-thin** | Hosts update variant (or other scalar) SoT; bake expands the chosen sample — no pack-specific JS lists |

### Non-goals (v1)

- Free-text conditions (`if searchQuery == "pop"`) — use a **variant** driver; string→variant mapping stays host / emit policy if needed  
- Replacing §11 scenario fixtures or injection packs  
- Arbitrary queries (`where`, sort, join, network)  
- Emit-capture assignment of list literals / sample paths (may follow once value-expr evaluation in captures exists)  
- Making samples a second display language or hand-edited JSON SoT for designers  

---

## 3. Naming

| Candidate | Notes |
|-----------|--------|
| **`samples`** (preferred) | Short; “sample data”; clear vs scenario `fixtures` |
| `dataset` / `catalog` | Fine; slightly heavier |
| `DataSource` | Evokes runtime I/O; prefer for a later host-facing protocol if needed |

**Recommendation:** top-level keyword **`samples`**. Prose may say “typed sample banks.” Do **not** overload `fixtures`.

---

## 4. Mental model

```text
┌─────────────────────────────────────────────────────────────┐
│  samples Tracks { … }     typed bank (symbol)               │
│    pop_results { … }      named entry                       │
│      tracks: [TrackRow]   typed field                       │
└───────────────────────────┬─────────────────────────────────┘
                            │ Tracks.pop_results.tracks
┌───────────────────────────▼─────────────────────────────────┐
│  component shell                                          │
│    variant searchWorld → if branch → TrackList.children = │
│    ForEach(tracks) / children = [Header, TrackList, …]    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                   bake expands instances
```

| Concept | Role | Analogy |
|---------|------|---------|
| **Sample bank** | Top-level typed symbol | Swift `enum` + associated static data / a small typed JSON module |
| **Entry** | Named record inside the bank | `pop_results`, `focus`, `empty` |
| **Field** | Typed value on an entry | `tracks: [TrackRow]` |
| **Path** | `Bank.entry.field` | Stable reference used in value position |
| **Scenario fixture** (§11) | Full component param bag for preview | Storybook story — may *use* sample paths as concrete values later |

---

## 5. Syntax (sketch)

### 5.1 Declaring a bank

```pdl
samples Tracks {
  pop_results {
    tracks: [TrackRow] = [
      TrackRow(title: "Neon Pop", artist: "Kite Line", trackId: .neon, mood: .night),
      TrackRow(title: "Sugar Hit", artist: "Relay Club", trackId: .coastal, mood: .drive)
    ]
  }
  focus {
    tracks: [TrackRow] = [
      TrackRow(title: "Desk Lamp", artist: "Static Grove", trackId: .desk, mood: .focus),
      TrackRow(title: "Quiet Percent", artist: "Marble Room", trackId: .quiet, mood: .focus)
    ]
  }
  empty {
    tracks: [TrackRow] = []
  }
}
```

**Rules (proposed):**

1. `samples <Ident>` — bank name is a design-global symbol (merge / uniqueness like components).  
2. Entry names are **identifiers** (not display strings). Duplicate entry names in one bank are invalid.  
3. Fields use **param-like** `name: Type = valueExpr` (or `name = valueExpr` with inferred type from annotation — decide in impl; prefer explicit type for lists).  
4. Values must be concrete at catalogue/bake (literals, tokens, `.case`, instance constructors, nested sample paths if we allow composition).  
5. Element types for lists: component types and protocols (same gate as expandable lists today).  

### 5.2 Path expression

```txt
SamplePath = Ident ( "." Ident )+
```

Examples: `Tracks.pop_results.tracks`, `Tracks.focus.tracks`.

Resolved type = type of the named field. Unknown bank / entry / field → **PDL-E0xx**.

### 5.3 Mount-site use with variants

```pdl
variant SearchWorld {
  case library
  case pop
  case focus
}

component PlaylistComposer(
  searchWorld: SearchWorld = .library,
  tracks: [TrackRow] = [ /* default library rows */ ],
  …
) layout {
  …
  let TrackList = Layout(direction: .column, gap: pc.space.xs, width: .fill)

  if searchWorld == .pop {
    TrackList.children = Tracks.pop_results.tracks
  } else if searchWorld == .focus {
    TrackList.children = Tracks.focus.tracks
  } else {
    TrackList.children = [tracks]
  }

  ForEach(tracks) { track in
    track.selected = self.selectedTrack == trackId
    track.select(id: TrackId) = { selectedTrack = id }
  }
  // Note: ForEach list binding vs TrackList.children — see open question Q2.

  children = [Eyebrow, TitleRow, Search, ChipRow, TrackList, Status]
}
```

**Driver is a variant**, not a free string. Search UI may still edit a `String` param; host or a later emit map sets `searchWorld` (e.g. query `"pop"` → `.pop`).

### 5.4 Relationship to §11 fixtures

Scenario fixtures remain:

```pdl
fixtures PlaylistComposer {
  example "Pop results" {
    searchWorld = .pop
    // optional: selectedTrack = …
  }
}
```

They select the **world**; bake’s `if` pulls the sample. Optionally (follow-on) allow fixture bodies to write `tracks = Tracks.pop_results.tracks` as a concrete binding for gallery overrides without layout `if`.

---

## 6. Semantics

### 6.1 Resolve / bake

1. Merge sample banks like other top-level symbols.  
2. When evaluating a value expr that is a sample path, substitute the field’s evaluated value (same instance-array shape as a list param default).  
3. `Frame.children = SamplePath` (where path type is `[T]`) expands like `children = [listParam]` / list splice.  
4. Empty arrays are meaningful (`Tracks.empty.tracks` → no rows). Catalogue `omitEmpty` must **not** drop intentional empty sample fields when serialising sample tables (same lesson as empty fixture `tracks = []`).

### 6.2 Validation

| Check | Outcome |
|-------|---------|
| Unknown `Bank` / `entry` / `field` | Error |
| Path used where type doesn’t match (e.g. `[TrackRow]` required, got `[ComposerChip]`) | Error |
| Protocol list: elements must conform | Same rules as list params |
| Circular sample refs (if composition allowed) | Error |

### 6.3 Host role

Hosts **do not** maintain parallel catalogs. They:

1. Deliver interactions that assign **variant / scalar** params (`searchWorld`, `currentMood`, …).  
2. Rebake / reconcile.  
3. Optionally map string search → variant in product code (outside PDL v1).

~~Playground mood/search filtering for playlist-composer-lite should migrate to samples + variants and delete `PLAYLIST_TRACK_CATALOG`.~~ **Done** (2026-08-12).

---

## 7. Why not overload `fixtures`?

| | §11 `fixtures` | Samples (this proposal) |
|--|----------------|-------------------------|
| Keyed by | Component name + display label | Bank ident + entry ident |
| Shape | Param map for that component | Typed fields (often lists) |
| Referenced from layout? | No | Yes (`Bank.entry.field`) |
| Audience | Preview / docs / tests | Shared data for many components |
| Merge | By example label | By bank / entry symbol |

Keeping both avoids breaking Storybook-style examples and gives catalogs a clean symbol space.

---

## 8. Alternatives considered

| Approach | Why not (for v1) |
|----------|------------------|
| Host JS catalog | Not portable; duplicates PDL; doesn’t scale |
| Only scenario fixtures + host apply | Works as a bridge; still host policy; no typed path expr |
| Extra list params on the shell (`tracksFocus`, …) | Works locally; doesn’t share across components; noisy |
| String `if searchQuery == "pop"` | Condition grammar + fuzzy matching; defer |
| `TracksFixture(key:, param:)` call API | Heavier than path expr; stringly keys |
| Keyword `DataSource` | Fine later for host I/O; `samples` better for authored banks |

---

## 9. Implementation sketch (ordered)

1. **AST / parse** — `samples` top-level; path in value expr.  
2. **Merge / validate** — symbol table; type of paths.  
3. **Evaluate** — sample paths in resolve defaults and in `children` RHS.  
4. **Catalogue** — optional `samples` section for tooling / Playground browser.  
5. **Playlist composer** — `SearchWorld` (or mood) variants + `samples Tracks { … }`; remove Playground JS catalog.  
6. **Follow-on** — sample paths in emit-assign; sample refs in §11 fixture bodies; string→variant helpers.

---

## 10. Open questions

| ID | Question | Lean |
|----|----------|------|
| **Q1** | Keyword: `samples` vs `catalog` vs `dataset`? | **Closed** — `samples` |
| **Q2** | ForEach still binds the **param** `tracks` while `TrackList.children` mounts a sample — do we require `tracks` to be updated too, or allow ForEach over a let/list expr later? | **Open** — prefer one SoT in examples; ForEach over path/let deferred (`SPEC_GAPS`) |
| **Q3** | Allow sample paths inside §11 fixture bodies in v1? | **Closed** — yes (playlist fixtures bind `Tracks.kite.tracks` / empty) |
| **Q4** | Nesting / one sample field referencing another? | Defer |
| **Q5** | Catalogue omitEmpty for empty sample arrays | **Closed** — preserve empties under `samples` (§16a) |
| **Q6** | Solo `children = [tracks]` vs bare `children = tracks` / sample path — array-in-array metaphor vs compose recipes `[Header, tracks, Footer]` | **Guidance in §11a**; lint later. Both legal (§4e). |

---

## 11. Success criteria

- [x] Author a `samples Tracks { … }` bank and reference `Tracks.focus.tracks` from a variant `if` branch.  
- [x] Wrong / unknown path fails validate with **PDL-E041**.  
- [x] Playlist Composer + lab filter worlds **without** a host JS catalog.  
- [x] §11 scenario fixtures continue to work (may bind sample paths).  
- [x] Spec §11a (+ merge / catalogue / EBNF); Rust bake SoT + TS oracle.

---

## 12. Summary

**Typed samples** are named, type-checked data banks in PDL, referenced as `Bank.entry.field`, mounted under existing **variant** conditionals at **children** sites. They are the scalable replacement for host-side demo catalogs and the missing half of “fixtures as injectable model shapes” — without overloading §11 scenario fixtures or waiting on string conditions.
