---
name: pdl-from-design-system
description: >-
  Port real or real-ish design systems into PDL example packs with bake/preview
  checkpoints. Use when converting Material, Radix, Polaris, Carbon, or other DS
  tokens/components into PDL; scaffolding test-fixtures/pdl/systems/*; stress-testing
  PDL limits; or when an LLM needs PDL authoring rules, best practices, or a
  design-system → PDL workflow.
---

# PDL from design system

Port a design system into a **small, bakeable PDL pack**. Do not invent CSS/SwiftUI dialects. Prefer **Rust CLI** for bake/preview.

## Before writing PDL

1. Read [references/pdl-cheatsheet.md](references/pdl-cheatsheet.md) (syntax only).
2. Read [references/ds-mapping.md](references/ds-mapping.md) (DS concepts → PDL).
3. Skim [references/anti-patterns.md](references/anti-patterns.md).
4. Copy patterns from [references/canonical-examples.md](references/canonical-examples.md) or existing fixtures — do not freestyle structure.

Normative language: `docs/full-spec.md` (only when cheatsheet is insufficient). Spec gaps: `docs/SPEC_GAPS.md`.

## Pack layout

Create under `test-fixtures/pdl/systems/<pack-name>/`:

```text
systems/<pack-name>/
  README.md          # source DS, scope, intentional omissions
  design.pdl         # entry: import order
  foundation.pdl     # tokens + typeStyles (+ theme if needed)
  c_button.pdl       # one concern per file
  c_field.pdl
  …
```

Name packs `*-lite` when incomplete on purpose (`material-lite`, `polaris-lite`). Extend existing packs before inventing a new dialect.

## Workflow (mandatory checkpoints)

Copy and track:

```text
- [ ] Inventory: tokens → type styles → primitives/components → composition
- [ ] Slice 1: foundation.pdl + design.pdl — bakeSystem OK
- [ ] Slice 2: first component — bakeComponent + nested labels OK
- [ ] Slice 3: sibling instances of same component — distinct nested props
- [ ] Slice 4: variants / if branches
- [ ] Slice 5 (optional): protocols, slots, ForEach, emits, fixtures
- [ ] Preview HTML smoke (labels, colors, sizes)
- [ ] README: what was ported / deferred / PDL pain points
```

**Never** generate an entire system in one shot. After each slice, bake. Fix compiler errors before the next slice.

## Validation commands

Prefer Rust (rebuild if resolve/bake code changed):

```bash
cargo build -p pdl-cli
./target/debug/pdl bakeSystem test-fixtures/pdl/systems/<pack>/design.pdl --out /tmp/<pack>.bake.json
./target/debug/pdl bakeComponent test-fixtures/pdl/systems/<pack>/design.pdl <ComponentName> --out /tmp/<comp>.bake.json
npm run preview -- test-fixtures/pdl/systems/<pack>/design.pdl --system
```

Or: `npm run pdl:rust -- bakeSystem …`

Semantic checks (sibling instance scoping):

```bash
cargo test -p pdl-core --test instance_scoping
npx vitest run tests/resolve-instance-scoping.test.ts
```

When a multi-instance demo mounts the same component twice, assert nested leaf text matches call-site args (not last-writer). Goldens alone are not enough.

## Hard rules

- All component params are public; **no `expose`**.
- Nested `let` ids must be unique **within** a component (PDL-E021); sibling **instances** get scoped ids at resolve (`Cancel__L`).
- `self` / `self.param` = enclosing component instance; not a frame id.
- Layout `on` only for **declared emits**; ambient interaction `on` only inside `interaction` (E028/E029).
- Selection Pattern A: pass SoT (`selected: FilterId`); chip compares equality — do not invent Bool binds.
- Prefer `variant` + `if` over inventing CSS classes or SwiftUI modifiers.
- One composition concern per file; foundation tokens before components that use them.

## Inventory template

Before coding, write a short inventory (in chat or pack README):

| DS concept | Examples | PDL target | Slice |
|---|---|---|---|
| Color / space / radius | … | `primitive` / `semantic` | 1 |
| Text styles | Heading, Body | `typeStyle` | 1 |
| Button / Field / … | … | `component` + params | 2+ |
| States | primary/sm | `variant` + `if` | 4 |
| Slots / lists | chips in nav | `protocol` / `[P]` / `ForEach` | 5 |

## Done criteria

- `design.pdl` bakes clean with Rust CLI
- At least one demo mounts **≥2** instances of the same component with distinct nested content
- README lists omissions and any language gaps found
- No freestyle syntax that only “looks like” PDL

## References

- [pdl-cheatsheet.md](references/pdl-cheatsheet.md)
- [ds-mapping.md](references/ds-mapping.md)
- [anti-patterns.md](references/anti-patterns.md)
- [canonical-examples.md](references/canonical-examples.md)
- Stub pack: `test-fixtures/pdl/systems/`
- Molecule fixtures: `test-fixtures/pdl/molecules/`
