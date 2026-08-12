# Conformance

PDL defines three conformance classes (summary). Full requirements: [`full-spec.md` §25](../../full-spec.md#25--conformance-specification).

| Class | Role |
|-------|------|
| **A — Parser** | Accept valid source, reject invalid with correct `PDL-E*` codes, merge imports, type-check tokens/props, deterministic catalogue |
| **B — Resolver** | Themes + modifiers, catalogue generation, conditions, bake/resolve semantics |
| **C — Emitter** | Consume catalogue/bake; document supported kinds/layers; graceful degrade; carry `schemaVersion` |

## Versioning

Current language / schema lineage: **`1.0.0-beta`**. Catalogue and manifests MUST carry `schemaVersion` until a stable release. See [`full-spec.md` §26](../../full-spec.md#26--versioning-and-stability-contract).

## Fixtures

Normative acceptance fixtures live under `test-fixtures/pdl/` (see §25.4 in the full spec). Error fixtures under `test-fixtures/pdl/errors/` exercise diagnostic codes.
