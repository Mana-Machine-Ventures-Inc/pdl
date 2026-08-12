# Files and imports

## Entry file

The entry `.pdl` lists `import` lines; merge order follows that graph. Cycles are **PDL-E002**.

```pdl
import "./tokens_color.pdl"
import "./button.pdl"

previewBackground color.surface.primary
```

## Merge

Modules contribute top-level declarations into one design. Tokens share one namespace — duplicate names are **PDL-E003**. Later `samples` banks with the same name replace earlier banks wholesale.

## previewBackground

Optional entry directive: a Color token (or resolved color) used as preview chrome. Bake exposes `previewBackground` for hosts.

## Recommended layout

```text
design.pdl          # entry imports
tokens_*.pdl
type_styles.pdl
components/*.pdl
```

Normative detail: [`full-spec.md` §2](../../full-spec.md#2--files-imports-and-entry).
