# Protocols pack (Rust B1–B5)

FilterChip → LibrarySubnav demonstrates the full emit path:

1. Child `interaction { on pressEnd { emit select(filter) } }`
2. Parent `ForEach(chips) { selected: self.currentFilter == filter; on select(…) { currentFilter = filter_id } }`
3. Chip draws from Bool `selected` (identity stays on `filter`); playground host rebakes after capture

Entry: `design.pdl` (imports `filter_chip.pdl` + `modal_content.pdl`).

`library_subnav.pdl` remains an alternate ForEach-only sketch (not imported).
