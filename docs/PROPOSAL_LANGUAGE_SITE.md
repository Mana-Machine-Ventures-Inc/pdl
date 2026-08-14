# Proposal: Public language documentation site

**Status:** accepted / shipped (2026-08-13)  
**Binding:** the public site **is** the human spec. Machine lock: `shared/*.json`, `grammar/pdl.ebnf`, `shared/schema/*.json`, fixtures.  
**Related:** `shared/language-objects.json`, `shared/frame-props.json`, `shared/diagnostics.json`, `website/`, `grammar/pdl.ebnf`

`docs/full-spec.md` is retired. Do not restore a long markdown spec.

---

## 1. Problem (historical)

PDL’s public face was a 5,800-line `full-spec.md` plus proposal files. New authors expect a tour, a language guide, and a generated reference.

---

## 2. Three products (now)

| Product | Audience | Source |
|---------|----------|--------|
| **Guide** | People writing `.pdl` | `website/src/index.md` |
| **Language objects** | Lookup (frames, types, `if`, `let`, …) | `shared/language-objects.json` + `shared/frame-props.json` |
| **Diagnostics** | Error codes + keywords | `shared/diagnostics.json` + `shared/keywords.json` |

Implementer artefacts (EBNF wrap, JSON IR, error-fixture index) stay generated for CI and are **not** published. Proposals, `SPEC_GAPS.md`, and coverage checklists stay GitHub-only.

---

## 3. Site IA

```text
website/
├── Guide                 /
├── Language objects      /generated/objects
└── Diagnostics           /generated/diagnostics
```

No Spec nav. No standalone keywords or frame-properties routes.

---

## 4. Generate vs write

**Generate** (`scripts/gen-docs.mjs` → `website/src/generated/`):

- Language objects — `shared/language-objects.json` + `shared/frame-props.json`
- Diagnostics — `shared/diagnostics.json` (+ keywords)
- Unpublished: grammar wrap from `grammar/pdl.ebnf`, JSON IR from `shared/schema/*`, error-fixture index

**Write:** Guide only.

**Grammar:** edit `grammar/pdl.ebnf`. `docs:gen` does not overwrite it.

---

## 5. Toolchain

- **VitePress** in `website/`
- **`npm run docs:gen`** then `docs:dev` / `docs:build`
- Generated files are **checked in**
- Publish via GitHub Pages (`.github/workflows/docs-pages.yml`)

---

## 6. Success

- The public site is the spec authors read
- Lock files are the spec compilers read
- `npm run docs:gen` stays green; do not hand-edit `website/src/generated/`
