# Playlist Composer (lite)

Interactive demo pack for the PDL Playground — one coherent music-library surface that stresses recent host paths:

- Nested **PointerInput** chrome via instance resolve (chip / row / toolbar hover & press)
- **EditableText** rename + search sessions (parent shell SoT on began / finished / cancelled)
- **ForEach** list captures on the shell (`chips` / `tracks`) — O(1) handlers for N rows
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
| List mounts | `ChipRow`, `TrackList` | `c_composer.pdl` |
| Shell + ForEach demos | `PlaylistComposer`, `MoodChipBar`, `TrackStack` | `c_composer.pdl` |

## How to preview

Playground pack **Playlist Composer** (default `PlaylistComposer`).

Also open:

- `MoodChipBar` — ForEach mood filter (list-qualified `chips` capture)
- `TrackStack` — ForEach track select
- `ChipPairDemo` — sibling instance scoping smoke

```bash
./target/debug/pdl bakeSystem test-fixtures/pdl/systems/playlist-composer-lite/design.pdl --out /tmp/pc.bake.json
./target/debug/pdl bakeComponent test-fixtures/pdl/systems/playlist-composer-lite/design.pdl PlaylistComposer --out /tmp/pc-comp.bake.json
```

## Click-through (shell)

1. Hover chips / rows — chrome via instance resolve (no dual-bake)
2. Click a mood chip — `currentMood` rebakes; ForEach derives `chip.selected`
3. Click a track — `selectedTrack` rebakes; ForEach derives `track.selected`
4. **Rename** → edit title → **Done** / **Cancel** (EditableText session + shell swap)
5. Click search field → type → blur/Enter updates `searchQuery`

## Scaling the catalog

Grow `tracks` / `chips` on `PlaylistComposer` (defaults or fixture overrides). Selection + status stay one ForEach capture each — no per-row lets, wrappers, or handlers.

For libraries beyond a handful of demo ids, prefer `String` track keys over expanding the `TrackId` enum.

## Intentional omissions

- Drag-reorder, multi-select, audio / artwork
- Filtering the track list by mood (SoT updates status + chip chrome only)
- Theme modes
- Protocol-typed slots (concrete `[ComposerChip]` / `[TrackRow]` today)
- Per-row status copy (shell uses generic “Mood updated” / “Track selected”)

## Language notes / pain points

1. **List + header siblings** — shell mounts `ChipRow` / `TrackList` components with `children: chips` / `children: tracks`. **B6** is only deferred `before` / `between` / `after` chrome inside `ForEach`.
2. **ForEach Pattern A** — `chip.selected = self.currentMood == mood` (or call-site `selected: currentMood == .all` on hand-mounts).
3. **`emit` inside ForEach capture bodies** is invalid — captures only assign parent params (hosts rebake). Cross-component: parent owns `ForEach` + captures; a child component may mount the list.
4. **Multi-list emits** — bake stamps `foreachList` / `data-pdl-foreach-list` with the **owning** list name (`chips` / `tracks`), including when another component expands the list via a forwarded param.
