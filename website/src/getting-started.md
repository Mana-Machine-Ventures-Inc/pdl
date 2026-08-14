# Getting Started

You do not need the language specification to start. This repository is the compiler and the preview lab — there is no separate hosted app yet.

## 1. See something

You need **Node.js 20+**. Clone the repo and install:

```bash
git clone https://github.com/VeryTinyMachines/pdl.git
cd pdl
npm install
npm run playground
```

Open **http://127.0.0.1:3847**.

That is the **Playground**: a pack of `.pdl` files on the left, an editor in the middle, a live preview on the right. Pick **Airbnb-lite** or **Playlist Composer**. The **active file tab** is what the preview shows.

- Edit the source and wait for the preview to refresh.
- Under each component preview, **Fixture** switches canned scenarios (empty state, a mood, …).
- Clicking a control in the preview assigns a parameter and compiles again. PDL is not running in the page like JavaScript.

If the Playground bake path asks for a WASM rebuild, install **Rust** (stable) and retry. The command-line tools below also need Rust.

## 2. Write two files

Create `tokens.pdl` and `hello.pdl` in the same folder. Components should use **semantic** token names, not raw hex, once you have a palette.

```pdl
primitive color.white: Color = #FFFFFF
primitive color.ink: Color = #111827
primitive space.md: Distance = 16

semantic color.surface: Color = color.white
semantic color.text: Color = color.ink
semantic space.stack: Distance = space.md

typeStyle Title {
  fontSize = 20
  fontWeight = 600
}
```

```pdl
import "tokens.pdl"

component Greeting(title: String = "Hello") layout {
  direction = .column
  gap = space.stack
  padding = space.stack
  background = color.surface

  let heading = Text(content: title, style: Title, color: color.text)
  children = [heading]
}
```

`import` **merges** `tokens.pdl` into the same design. There is no `export`.

Compile to a flattened layout, then to HTML (needs the Rust CLI):

```bash
cargo build -p pdl-cli
cargo run -q -p pdl-cli -- bakeComponent hello.pdl Greeting --out /tmp/hello.bake.json
npm run renderHtmlFromBake --silent -- /tmp/hello.bake.json --out /tmp/hello.html
```

Open `/tmp/hello.html`. You are looking at **compiled output**, not the `.pdl` text interpreted in the browser.

## When something fails

The compiler prints a code like **PDL-E007**. The [Diagnostics](/generated/diagnostics) page lists every code.

## Playground

The Playground is the **in-repo language lab**: open a design-system pack, edit `.pdl`, see a preview.

It is **not** a design-system maintenance product. It is also **not** `npm run preview`, which watches files on disk for engineering stress tests.

```bash
npm run playground
# → http://127.0.0.1:3847
```

### What the preview is doing

The editor does not style a live DOM from your source. The compiler **flattens** the active file (and its imports) to a layout snapshot; the iframe **paints** that snapshot.

Clicks that change selection assign a parameter on the parent and compile again. Nested hover/press chrome is painted from the same snapshot. There is no second, hand-maintained HTML tree.
