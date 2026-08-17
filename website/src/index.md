# About

**PDL (Programmatic Design Language)** is a **declarative, type-safe language** for an organization’s design system: tokens, components, variants, usage, and rules, checked into git as ordinary files. You declare objects, compose them, and the compiler checks the types — closer to SwiftUI than to HTML or a stylesheet.

Design should not live forever in a proprietary canvas. Adobe and Figma are strong for making and collaborating; they are poor long-term stewards of the repository. PDL is meant to be the **source of truth** you own — transportable, diffable, compilable, and yours to fork or move.

You write `.pdl` the way you write SwiftUI: a closed set of objects, explicit parameters, and real logic. That is what makes variants honest, prototypes dynamic, and the same source compilable into other formats. A compiler flattens the files; a preview draws the snapshot. HTML is the host today; other apps come later.

The files are for **designers, maintainers, and developers** together. Components say what can vary. Usage and rules say how it should be used. Bake output is what hosts draw. Nothing important lives only in someone’s head or in a file you cannot open next year.

The vocabulary is closed and locked in `shared/language-objects.json`. The language grows by adding objects there — not by quietly changing what `.row`, `emit`, or `Bank.entry.field` already means.

This repository is the **language toolchain**, not a hosted design app. Clone it, run Playground or the CLI, edit files. A future Studio is not in this repo.

Language version: **`1.0.0-beta`** (still allowed to change).

## What PDL is not

- **Not CSS.** `direction = .column` and `gap = 8` look like flexbox, but you are not writing a stylesheet. There are no selectors, no cascade, no `px` / `rem` suffixes.
- **Not Figma.** There is no canvas product here, no component panel, no auto-layout as Figma names it. Hug/fill are `.hug` and `.fill` on `width` / `height`.
- **Not React (or any UI runtime).** There is no `useState` and no `.pdl` executing in the browser. A click **assigns a parameter** and the compiler **builds a new tree**.
- **Not a package you `import` from npm into an app.** Hosts consume compiler output (flattened JSON → HTML today).

## Glossary

| Word | Meaning |
|------|---------|
| **Component** | A reusable UI piece: a name, public parameters, and one root **frame**. |
| **page** | A navigable destination. Same body as a component. Auto-satisfies prelude `Page`. |
| **screen** | A device shell. Same body as a component. Studio lists screens as prototype roots. Mount `Presenter(root:)` next to chrome. |
| **Frame** | A layout node. Kinds are `layout` (container), `text`, `icon`, `media`, and `presenter`. |
| **Token** | A named value (`color.surface`, `space.stack`). **Primitives** are the raw palette; **semantics** are the intent names components should use. |
| **Theme** | A named remap of semantic tokens a person flips (light / dark). Not a platform icon set. |
| **Catalog** | A named remap the environment applies (`use catalog` in `mount`) — SF Symbols vs Material icons. Not listed next to themes. |
| **Variant** | A design axis with cases (`Tone { case primary; case secondary }`). Written `.primary` at use sites. In v1, `enum` is the same feature. |
| **Emit** | A named **output** from a child (`emit select(filter)`). The parent captures it. Not a host click like `pressEnd`. |
| **Protocol** | A shared contract. **API** protocols share params and emits for mixed lists. **Host** protocols are either inbound events (`pressEnd`) or the environment opt-in (`<Host>`). |
| **host profile** | `host Default(sizeClass: …) mount { … }` — pack-owned environment params. Not the HTML preview. |
| **Fixture** | A named **preview scenario** for one component (“Empty search”). Parameter values, plus optional bake knobs (`host`, `theme`, `hostFacts`). |
| **Sample** | A typed **data bank** (`Tracks.focus.tracks`) you *can* mount in layout. |
| **Companion** | A block keyed by component name: `fixtures`, `usage`, `rules`, `extend`. Sample banks are not companions. |
| **Bake** | Compile to a flattened layout snapshot (JSON, then HTML). That snapshot is what you see. |
| **Host (runtime)** | Anything that **draws** bake output and delivers inbound events. The HTML preview is a host. “Host” does not mean web hosting. |
| **Import** | `import "tokens.pdl"` **merges** that file into the same design. There is no `export`. Names are project-wide after merge. |

**Catalogue** is the typed graph (tokens + component trees) for tools and codegen. You do not need it to preview.

## Rules that surprise people

- **Numbers are unitless.** `gap = 8` is eight design units (pixels in the HTML preview). Do not write `8px`.
- **Every parameter is public.** There is no `expose` / private props.
- **`children` is what is on screen.** A `ForEach` block does not create views by itself; it writes onto items you already mount.
- **`pressEnd` is not an emit.** Host events come from the preview; `emits` is what a child tells its parent.
- **`<Host>` is not PointerInput.** It reads the active `host` profile’s params (`sizeClass`, …). Molecules should not opt in — structural parents do.
- **Old syntax you may find in archives is invalid.** Classic `let label: text = { … }` and top-level `interaction` blocks are errors. Use `let text = Text(…)` and handlers on the component body.

To install the Playground and write a first file, see [Getting Started](/getting-started).
