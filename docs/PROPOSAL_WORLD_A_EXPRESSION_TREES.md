# Proposal: World A — Expression-tree authoring

**Status:** accepted / implementing  
**Depends on:** `shared/language-objects.json` (`lets`, `conditionals`) + `shared/frame-props.json`. **Superseded as binding spec** by lock files. `docs/PROPOSAL_PROTOCOL_CAPABILITIES.md` (kinds ≠ protocols); `docs/PROPOSAL_PORTABLE_CORE.md` (bake IR host contract)  
**Related:** value lets (`Blur(…)`, `Ramp(…)`); layer stacks; PointerInput handlers  

---

## 1. Problem

Today’s declare-and-mount surface:

```pdl
let Label: text = { content = "Press me" }
children = [Label]
```

uses `= { … }` as fake equality for a **scoped frame body**. That is equivalent (for flat props) to:

```pdl
let Label: text = {}
Label.content = "Press me"
```

…but feels unlike every other constructor in the language (`Blur(…)`, `FilterChip(…)`, `Vibrancy(…)`). Authors reasonably expect:

```pdl
let label = Text(content: "Press me")
label.content = "Hovered"
children = [Layout(direction: .column, children: [label])]
```

**World A** makes UI trees **expression-shaped**: construct with kwargs, mutate with dotted assigns, mount with `children`.

The component shell stays:

```pdl
component Name(params…) layout { body }
```

- `(…)` — init inputs (params)  
- `layout { … }` — root **kind** + **post-init body** (props, lets, if, handlers, mounts)  

Trailing closures on frame ctors (`Layout(…) { … }` — World B) are **out of scope** for v1.

---

## 2. Goals

| Goal | Meaning |
|------|---------|
| **Construct then mutate** | `let x = Text(…)`; `x.content = …` |
| **Unified call shape** | Frame ctors, component instances, and value ctors all use `Name(label: value)` |
| **Stable bake IR** | World A **desugars** to today’s `FrameBodyItem` / id mounts before resolve |
| **Kinds stay kinds** | Bake nodes still have `kind: "text"\|"layout"\|"icon"\|"media"` |
| **Dual syntax then deprecate** | Classic `let Id: text = {…}` works until corpus is migrated |

### Non-goals (v1)

- World B trailing closures on `Layout` / `Text`  
- `ForEach(…)` inside `children:` kwargs (ForEach remains overlay ≠ mount, E035)  
- Frame-prop mutation inside host handlers (`label.content =` in `hoverStart`) — handlers stay param/emit only  
- Changing `bakedDesign` schema or dropping stable frame ids  
- Branch-scoped let ids (E021 uniqueness across all `if` branches stays)

---

## 3. Naming (locked)

PascalCase **frame** constructors: **`Text`**, **`Layout`**, **`Icon`**, **`Media`**.

| Today | World A |
|-------|---------|
| `let X: text = {…}` | `let X = Text(…)` |
| `let X: layout = {…}` | `let X = Layout(…)` |
| `let X: icon = {…}` | `let X = Icon(…)` |
| `let X: media = {…}` | `let X = Media(…)` |
| Asset ctor `Icon(file:)` / `Icon(system:)` | **`IconRef(…)`** (token type remains `Icon`) |
| Layer ctor `Media(source:…)` in bg/fg | **`MediaLayer(…)`** |
| `Spacer()` in children | unchanged |
| `component Text` / `Layout` / `Icon` / `Media` | **PDL-E037** reserved |

IR kinds remain lowercase. Layer stacks use `MediaLayer`; frames use `Media`.

---

## 4. Surface sketch

```pdl
let title = Text(content: titleParam, color: color.label.primary)
let row = Layout(direction: .row, gap: 8, children: [title, Spacer()])
let mark = Icon(icon: IconRef(system: .sfSymbols, name: "star"), size: 16)
let hero = Media(source: media.hero, contentMode: .cover)
let chip = FilterChip(filter: .all, selected: true)

if interactionState == .hovered {
  title.content = "Hovered"
}

children = [row]
self.hoverStart = { interactionState = .hovered }
```

Frame ctor kwargs are the frame-prop set from `shared/frame-props.json` for that kind, plus optional `children:` on `Layout` (and any kind that allows children).

---

## 5. Desugar → classic AST

World A lowers **before** resolve/validate semantics that care about mounts:

```text
let title = Text(content: "Hi")
  → let title: text = { content = "Hi" }

let row = Layout(direction: .row, children: [title])
  → let row: layout = { direction = .row; children = [title] }

children = [Layout(direction: .row, children: [title])]
  → let __auto_N: layout = { direction = .row; children = [title] }
    children = [__auto_N]

let chip = FilterChip(…)
  → letInstance (unchanged)

let blur = Blur(radius: 8)
  → letValue (unchanged — not a frame ctor)
```

**Id rules**

- Bound name → bake `id`  
- Anonymous nested ctor → synthetic id (`${parent}_Layout_N`), same spirit as inline `Comp()` / `Spacer()`  

**Order / E019**

- `Layout(children: [title])` before `let title = …` remains illegal after desugar (forward visibility).

**Handlers / captures**

- Emit capture and nested PointerInput still require a **bind name** for the instance. Anonymous `FilterChip(…)` in a `children:` list is display-only.

---

## 6. Grammar sketch (additive)

```ebnf
frame-ctor-name
  ::= 'Text' | 'Layout' | 'Icon' | 'Media' ;

frame-ctor
  ::= frame-ctor-name '(' frame-ctor-args ')' ;

frame-ctor-args
  ::= [ labelled-arg { ',' labelled-arg } [ ',' ] ] ;

(* children: accepts bind ids, Spacer(), nested frame-ctor, or Comp() *)
child-expr
  ::= IDENT
    | 'Spacer' '(' ')'
    | frame-ctor
    | component-instance
    ;

let-decl
  ::= 'let' IDENT '=' frame-ctor          (* World A frame *)
    | 'let' IDENT '=' component-instance  (* letInstance *)
    | 'let' IDENT '=' value-expr          (* letValue when inferable *)
    | 'let' IDENT ':' frame-kind '=' '{' frame-body '}'  (* classic — deprecated *)
    | 'let' IDENT ':' type-name '=' value-expr           (* typed value let *)
    ;

asset-ctor
  ::= 'IconRef' '(' … ')' ;

layer-ctor
  ::= 'Color' | 'Ramp' | 'Blur' | 'Vibrancy' | 'MediaLayer' ;
```

---

## 7. Phased delivery

| Phase | Work |
|-------|------|
| **0** | This proposal |
| **1** | Rename `Icon`→`IconRef`, layer `Media`→`MediaLayer` |
| **2** | Dual syntax: parse World A → desugar; keep classic |
| **3** | Diagnostics (reserved names, value vs frame, capture needs bind) |
| **4** | Docs / cheatsheet / playground templates |
| **5** | Codemod fixtures; regenerate goldens |
| **6** | Reject classic `let Id: kind = {` |

Bake schema unchanged through Phase 5.

---

## 8. Failure modes (watch list)

1. Incomplete Icon/Media rename → parse ambiguity  
2. Authors expect view-builder hoisting of forward refs  
3. Mutation vs rebuild confusion on `row.children = …`  
4. Anonymous interactive nodes without bind names  
5. Value let `Blur` vs frame let `Text` confusion  
6. TS/Rust dual-core drift  
7. Long dual-syntax teaching window  

---

## 9. Acceptance

- World A and classic twins produce identical bake/HTML  
- Clear migrate errors for old `Icon(` / layer `Media(` and later classic frame lets  
- `component C() layout {}` reads as init + body  
- Kinds remain draw roles; handlers remain param/emit only  
