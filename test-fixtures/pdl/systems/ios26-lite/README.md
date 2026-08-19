# iOS 26 lite (Figma → PDL)

**Source:** [iOS and iPadOS 26 (Community)](https://www.figma.com/design/wsKoOjupxcWAef2rjaevOB/iOS-and-iPadOS-26--Community-)  
**Scope:** incomplete on purpose (`*-lite`). Interpretive ingest via Desktop Bridge — not a full HIG port.

## Folded so far

Colors · controls · Materials · Liquid Glass stand-in · **pages + phone screen**

| Figma / role | PDL |
|--------------|-----|
| Settings composition | `page IosSettingsPage` (+ Home / Search pages) |
| Phone chrome | `screen IosPhone` — `Presenter` + `IosAppTabBar` |
| Materials / controls | prior slices |

**Routing:** tap Home / Search / Settings → `goHome` / `goSearch` / `goSettings` → `presenter.replace(…)`. Gallery `IosTabBar` stays display-only (no emits) so demos bake without a screen sink.

Playground default: **`IosPhone`**.

## Still deferred

IC modes · true `Effect(.glass)` · Tab Search/Minimized · activity spinner · push/pop stack · Product Bezels · Examples screens

## Bake

```bash
./target/debug/pdl bakeSystem test-fixtures/pdl/systems/ios26-lite/design.pdl --out /tmp/ios26-lite.bake.json
./target/debug/pdl bakeComponent test-fixtures/pdl/systems/ios26-lite/design.pdl IosPhone --out /tmp/ios26-phone.bake.json
```
