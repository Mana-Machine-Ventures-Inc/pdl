# Bake pipeline

```text
.pdl  →  portable core (Rust / TS)  →  JSON IR  →  host (HTML, SwiftUI, …)
```

## Two IR shapes

| Artifact | Contents | Typical use |
|----------|----------|-------------|
| **Catalogue / graph** | Token graph with `primitive:` / `semantic:` pointers, components, defaults, variant deltas | Emitters, tooling, Studio |
| **Bake** | Literal trees for a theme + param binding | Preview hosts, static HTML |

Bake JSON is the **stability boundary** for hosts. HTML today is a thin C1 host that draws bake snapshots.

## Engines

| Engine | Role |
|--------|------|
| **Rust** (`pdl-core`, CLI, WASM) | Portable core; SoT for protocols / ForEach / packs |
| **TypeScript** (`src/`) | Historical oracle + HTML emitter (`renderHtml`) |

Playground default bake path: **Rust WASM** → bake JSON → **TS** HTML render.

## Commands (repo)

```bash
npm run bakeComponent --silent -- entry.pdl Button --theme Dark
npm run graphSystem --silent -- entry.pdl
npm run renderHtmlFromBake --silent -- baked.json --out out.html
npm run playground          # WASM bake + HTML host
```

Rust CLI: `cargo run -q -p pdl-cli -- bakeComponent …`

## What hosts own

Hosts map bake frames → platform views and (later) dispatch emits / host inbound (**B7**). They do **not** re-implement PDL merge/validate.

## See also

- [Overview](./overview.md)  
- Normative: [`full-spec.md` §16](../full-spec.md#16--component-catalogue-and-pipeline)  
- Plan: [`IMPLEMENTATION_PLAN.md`](../IMPLEMENTATION_PLAN.md)  
