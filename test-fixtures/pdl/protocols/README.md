# Protocols pack (Rust B1–B5)

FilterChip → LibrarySubnav demonstrates the full emit path:

1. Child `interaction { on pressEnd { emit select(filter) } }`
2. Parent `ForEach(chips) { selected: self.currentFilter; on select(filter_id: FilterId) { currentFilter = filter_id } }`
3. Playground HTML host applies the emit capture and rebakes with the new `currentFilter`

Entry: `design.pdl` (imports `filter_chip.pdl` + `modal_content.pdl`).

`library_subnav.pdl` remains an alternate ForEach-only sketch (not imported).
