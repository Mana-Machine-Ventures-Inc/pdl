# Playlist Composer (lite)

Interactive demo pack for the PDL Playground — one coherent music-library surface that stresses recent host paths:

- Nested **PointerInput** chrome via instance resolve (chip / row / toolbar hover & press)
- **EditableText** rename + search sessions (parent shell SoT on began / finished / cancelled)
- **ForEach** list captures on the shell (`chips` / `tracks`) — O(1) handlers for N rows
- **Typed samples** (`samples Tracks { … }`) for mood / search worlds — no host JS catalog
- Standalone **MoodChipBar** / **TrackStack** demos (same Pattern A, preview as roots)

## Inventory

| Concept | PDL target | File |
|---------|------------|------|
| Ink / amber / slate tokens | `primitive` / `semantic` | `foundation.pdl` |
| Title / body / meta | `typeStyle` | `foundation.pdl` |
| Mood / track / chrome enums | `enum` | `foundation.pdl` |
| Filter chip | `ComposerChip <PointerInput>` | `c_chip.pdl` |
| Toolbar button | `ComposerBtn <PointerInput>` | `c_button.pdl` |
| Search + title fields | `SearchField` / `TitleField <EditableText>` | `c_field.pdl` |
| Track row | `TrackRow <PointerInput>` | `c_track.pdl` |
| Track catalogs | `samples Tracks` | `c_composer.pdl` |
| List mounts | `ChipRow` / `TrackList` Layouts | `c_composer.pdl` |
| Shell + ForEach demos | `PlaylistComposer`, `MoodChipBar`, `TrackStack` | `c_composer.pdl` |

## How to preview

Playground pack **Playlist Composer** (default `PlaylistComposer`).

Also open:

- `MoodChipBar` — ForEach mood filter (list-qualified `chips` capture)
- `TrackStack` — ForEach track select
- `ChipPairDemo` — sibling instance scoping smoke

```bash
./target/debug/pdl bakeSystem test-fixtures/pdl/systems/playlist-composer-lite/design.pdl --out /tmp/pc.bake.json
./target/debug/pdl bakeComponent test-fixtures/pdl/systems/playlist-composer-lite/design.pdl PlaylistComposer --out /tmp/pc.bake.json
```

## Click-through (shell)

1. Hover chips / rows — chrome via instance resolve (no dual-bake)
2. Click a mood chip — `currentMood` rebakes; layout `if` mounts `Tracks.<mood>.tracks`
3. Click a track — `selectedTrack` rebakes; ForEach derives `track.selected`
4. **Rename** → edit title → **Done** / **Cancel** (EditableText session + shell swap)
5. Search → blur/Enter — updates `searchQuery` / status (free-text filter worlds use fixtures + sample overrides)
6. **Fixtures** — use each preview section’s Fixture select (or left chips for the primary): mood / Kite / Empty snapshots

## Sample worlds

| World | Driver | Mount |
|-------|--------|-------|
| Library | `currentMood == .all` (else) | `tracks` param (`Tracks.library.tracks` default) |
| Focus | `currentMood == .focus` | `Tracks.focus.tracks` |
| Night | `currentMood == .night` | `Tracks.night.tracks` |
| Drive | `currentMood == .drive` | `Tracks.drive.tracks` |
| Search · Kite | fixture: `tracks = Tracks.kite.tracks` | param override under `.all` |
| Empty | fixture: `tracks = Tracks.empty.tracks` | param override under `.all` |

Hosts only assign scalars (`currentMood`, `searchQuery`, …). Bake expands sample paths — no parallel JS catalog.

## Scaling the catalog

Grow `samples Tracks { … }` entries (and matching mood `if` branches or fixture overrides). Selection + status stay one ForEach capture each.

For libraries beyond a handful of demo ids, prefer `String` track keys over expanding the `TrackId` enum.

## Intentional omissions

- Drag-reorder, multi-select, audio / artwork
- Live free-text search filtering (fixtures + `Tracks.kite` / `Tracks.empty` for demos)
- Theme modes
- Protocol-typed slots (concrete `[ComposerChip]` / `[TrackRow]` today)
- Per-row status copy (shell uses generic “Mood updated” / “Track selected”)

## Language notes / pain points

1. **List + header siblings** — shell uses Layout `ChipRow` / `TrackList` with `children: [chips]` / `children: [tracks]`. Mood worlds override `TrackList.children` with sample paths.
2. **ForEach Pattern A** — `chip.selected = self.currentMood == mood`. Sample mounts reuse `ForEach(tracks)` overlays via the field name `tracks`.
3. **`emit` inside ForEach capture bodies** is invalid — captures only assign parent params (hosts rebake).
4. **Samples vs fixtures** — samples are typed data banks; §11 fixtures are scenario param bags (may reference sample paths).
