# Usage & rules (Playground lab)

Self-contained examples for **usage notes** and **live rule warnings** in the HTML preview. Hex colors only — no design-system import.

Open the pack in Playground (Project → **Usage & rules**). The canvas is this file’s gallery.

| Component | What you should see |
|-----------|---------------------|
| `UsageRulesLab` | One column of the scenes below (default) |
| `LabButton` | Usage note; no warning when previewed alone |
| `TwoPrimaryActions` | Two red **must not** warnings |
| `OnePrimaryAction` | Usage note; clean |
| `UnlabeledFieldRow` / `LabField` | Red **must** — missing label |
| `LabeledFieldRow` | Clean |
| `LabCard` / `EmptyCardScene` | Orange **should** — empty card |
| `LabTabBarThin` | Red **must** — only one tab |
| `TabBarNotLast` | Orange **should** — bar is not last |

`.must` / `.mustNot` paint red. `.should` / `.shouldNot` paint orange. The breaking instance is outlined.
