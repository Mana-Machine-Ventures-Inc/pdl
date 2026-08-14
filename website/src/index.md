# About

**PDL (Programmatic Design Language)** is a **closed set of objects** you compose in text files: declarations (`component`, `emits`, `protocol`, `samples`, `fixtures`), four frame kinds, named token types, enums with fixed cases, and a short list of constructors. Those meanings are locked in `shared/language-objects.json`. The language grows by adding objects there — not by quietly changing what `.row`, `emit`, or `Bank.entry.field` already means.

You write **tokens** and **components** in `.pdl`. A compiler flattens them. A **preview** draws the snapshot.

It is closer to “SwiftUI views checked into git” than to CSS, Figma, or React.

| You write | The compiler produces | Something on screen |
|-----------|----------------------|---------------------|
| `.pdl` files | A flattened layout (and a typed graph for tools) | HTML preview now; other apps later |

This repo is a **language toolchain**, not a hosted design app. You clone it, run Playground or the CLI, and edit files. A future **Studio** product is not in this repository.

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
| **Frame** | A layout node. Kinds are `layout` (container), `text`, `icon`, and `media`. |
| **Token** | A named value (`color.surface`, `space.stack`). **Primitives** are the raw palette; **semantics** are the intent names components should use. |
| **Theme** | A named remap of semantic tokens (for example light / dark). |
| **Variant** | A design axis with cases (`Tone { case primary; case secondary }`). Written `.primary` at use sites. In v1, `enum` is the same feature. |
| **Emit** | A named **output** from a child (`emit select(filter)`). The parent captures it. Not a host click like `pressEnd`. |
| **Protocol** | A shared contract. **API** protocols share params and emits for mixed lists. **Host** protocols name environment events (`pressEnd`) and verbs (`beginEditing`). |
| **Fixture** | A named **preview scenario** for one component (“Empty search”). It is a bag of parameter values, not data you mount in layout. |
| **Sample** | A typed **data bank** (`Tracks.focus.tracks`) you *can* mount in layout. |
| **Companion** | A block keyed by component name: `fixtures`, `usage`, `rules`, `extend`. Sample banks are not companions. |
| **Bake** | Compile to a flattened layout snapshot (JSON, then HTML). That snapshot is what you see. |
| **Host** | Anything that **draws** bake output and delivers inbound events. The HTML preview is a host. “Host” does not mean web hosting. |
| **Import** | `import "tokens.pdl"` **merges** that file into the same design. There is no `export`. Names are project-wide after merge. |

**Catalogue** is the typed graph (tokens + component trees) for tools and codegen. You do not need it to preview.

## Rules that surprise people

- **Numbers are unitless.** `gap = 8` is eight design units (pixels in the HTML preview). Do not write `8px`.
- **Every parameter is public.** There is no `expose` / private props.
- **`children` is what is on screen.** A `ForEach` block does not create views by itself; it writes onto items you already mount.
- **`pressEnd` is not an emit.** Host events come from the preview; `emits` is what a child tells its parent.
- **Old syntax you may find in archives is invalid.** Classic `let label: text = { … }` and top-level `interaction` blocks are errors. Use `let text = Text(…)` and handlers on the component body.

To install the Playground and write a first file, see [Getting Started](/getting-started).
