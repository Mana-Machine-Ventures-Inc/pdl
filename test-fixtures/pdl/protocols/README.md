# Protocol / slots fixtures

| File | Role |
|------|------|
| `design.pdl` | Entry — imports modal + FilterChip (B1–B4; **parsed** by Rust) |
| `modal_content.pdl` | Protocol + Modal slots |
| `filter_chip.pdl` | Emits + inline interaction; `LibrarySubnav` via `children = [chips]` |
| `library_subnav.pdl` | **§4e** `ForEach` + layout `on` + Pattern A — parses in Rust; **not imported** by `design.pdl` (bake/catalogue of this file is optional) |
| `packs/` | Injection pack JSON for `bakePack` |

See `docs/full-spec.md` §4a–§4e and `docs/IMPLEMENTATION_PLAN.md`.
