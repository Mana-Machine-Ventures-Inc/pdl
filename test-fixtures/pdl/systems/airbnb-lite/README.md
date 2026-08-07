# Airbnb-lite (PDL veracity pack)

**Source inspiration:** Airbnb-ish product UI (coral primary, teal secondary, warm neutrals) — not an official port.  
**Scope:** incomplete on purpose (`*-lite`). For Playground demos and language stress, not production DS maintenance.

## Coverage matrix

| Area | Status | Notes |
|------|--------|-------|
| Color / space / radius tokens | Ported | `foundation.pdl` |
| Type styles | Ported | Title, Body, Caption |
| Light + Dark theme | Partial | Dark overrides canvas/text |
| Button (tone × size) | Ported | `AbnButton` |
| Text field block | Ported | `AbnField` |
| Chip / filter pill | Ported | `AbnChip` |
| Multi-instance demos | Ported | Button row + Cancel/Save + field stack |
| Fixtures | Ported | Button + Field examples |
| Protocols / ForEach / emits | Deferred | Use `protocols/` fixtures |
| Motion / interaction runtime | Deferred | Needs B7 host |
| Full Airbnb iconography / Lottie | Deferred | Out of language v1 |

## Components

| Name | Role |
|------|------|
| `AbnButton` | Text CTA |
| `AbnField` | Label + value + helper |
| `AbnChip` | Compact filter chip |
| `AbnButtonRowDemo` | Sibling buttons (distinct labels) |
| `AbnFormActionsDemo` | Cancel + Save (scoping proof) |
| `AbnFieldStackDemo` | Two fields stacked |

## Bake

```bash
cargo build -p pdl-cli
./target/debug/pdl bakeSystem test-fixtures/pdl/systems/airbnb-lite/design.pdl --out /tmp/airbnb-lite.bake.json
./target/debug/pdl bakeComponent test-fixtures/pdl/systems/airbnb-lite/design.pdl AbnFormActionsDemo --out /tmp/abn-actions.bake.json
```

Playground: pack **Airbnb-lite** (default in P1).
