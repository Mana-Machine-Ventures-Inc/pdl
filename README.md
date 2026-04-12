# PDL toolchain

TypeScript compiler for **PDL** (Programmatic Design Language) as described in `full-spec.md`.

## Commands

After `npm install` and `npm run build`:

| Command | Description |
|---------|-------------|
| `node dist/cli.js graph <entry.pdl>` | Emit merged **design graph** JSON (see `docs/SPEC_GAPS.md`). |
| `node dist/cli.js resolve <entry.pdl> <Component> [key=value …]` | Emit one **resolved instance** tree as JSON. |
| `node dist/cli.js catalogue <entry.pdl> [--theme Name] [--out file.json]` | Emit **Component Catalogue** JSON (§16). |

`npm test` runs the Vitest suite.

**Atom graph goldens:** each `test-fixtures/pdl/atoms/*.pdl` (including `design.pdl`) has a matching `tests/fixtures/atom-graph-expected/<same-name>.graph.json`. Tests assert the full normalized design graph (no extra top-level keys, no drift in primitives, component bodies, etc.). After intentional compiler or fixture changes, refresh goldens with:

`npm run test:update-atom-graphs`

## Test fixtures

- **`test-fixtures/pdl/atoms/`** — one module per language surface (token types, themes, `typeStyle`, variants, layout/text/icon/media, `expose`, etc.); **`atoms/design.pdl`** imports them all.
- **`test-fixtures/pdl/design.pdl`** — pulls **`atoms/design.pdl`** plus the merge regression chain.

## Documentation

- Normative language: `full-spec.md`
- Known spec/tooling gaps: `docs/SPEC_GAPS.md`
