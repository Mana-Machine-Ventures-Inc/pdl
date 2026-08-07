# Airbnb-lite (PDL veracity pack)

**Source inspiration:** Airbnb-ish product UI (coral primary, teal secondary, warm neutrals) — not an official port.  
**Scope:** incomplete on purpose (`*-lite`). For Playground demos and language stress, not production DS maintenance.

## Coverage matrix

| Area | Status | Notes |
|------|--------|-------|
| Color / space / radius tokens | Ported | `foundation.pdl` (+ hover/press brand fills) |
| Type styles | Ported | Title, Body, Caption |
| Light + Dark theme | Partial | Dark overrides canvas/text |
| Button (tone × size) | Ported | `AbnButton` + rest/hovered/pressed |
| Text field block | Ported | `AbnField` |
| Chip / filter pill | Ported | `AbnChip` |
| Multi-instance demos | Ported | Button row + Cancel/Save + field stack |
| Pointer cycle lab | Ported | `AbnPointerLab` — hover + press host demo |
| Interactive hover/press | Ported | Inline `interaction { }` on `AbnButton` / `AbnPointerLab`; host applies handlers |
| Fixtures | Ported | Button / Field / Chip / PointerLab |
| Protocols / ForEach / emits | Deferred | Use `protocols/` fixtures |
| Motion / transition runtime | Deferred | Needs B7 host |
| Full Airbnb iconography / Lottie | Deferred | Out of language v1 |

## Components

| Name | Role |
|------|------|
| `AbnButton` | Text CTA with tone × size × pointer phase |
| `AbnField` | Label + value + helper |
| `AbnChip` | Compact filter chip |
| `AbnButtonRowDemo` | Sibling buttons (distinct labels) |
| `AbnFormActionsDemo` | Cancel + Save (scoping proof) |
| `AbnFieldStackDemo` | Two fields stacked |
| `AbnPointerLab` | Self-contained rest → hover → press lab |

## Bake

```bash
cargo build -p pdl-cli
./target/debug/pdl bakeSystem test-fixtures/pdl/systems/airbnb-lite/design.pdl --out /tmp/airbnb-lite.bake.json
./target/debug/pdl bakeComponent test-fixtures/pdl/systems/airbnb-lite/design.pdl AbnPointerLab --out /tmp/abn-pointer.bake.json
```

Playground: pack **Airbnb-lite** opens on **`AbnPointerLab`**. Hover / press / release / leave drive `interactionState` via the preview host.
