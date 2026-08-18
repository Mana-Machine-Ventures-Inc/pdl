# Proposal: Spec documents and stories (Eng Spec storytelling)

**Status:** proposed 2026-08-17 — design only; not locked.  
**Depends on:** [`PROPOSAL_HOST_ENVIRONMENT.md`](./PROPOSAL_HOST_ENVIRONMENT.md) (`host` profiles, `<Host>`, `hostFacts`); [`PROPOSAL_ROUTING_PAGES_SCREENS.md`](./PROPOSAL_ROUTING_PAGES_SCREENS.md) (`page` / `screen` / `Presenter`); §11 `fixtures` + §13 `rules` (self-documenting components).  
**Related:** Figma Eng Spec ingest (interpretive, not round-trip); design-system wiki as a catalogue host; Playground Docs / future Studio.  
**Does not replace:** component `fixtures`, `usage`, or `rules`. Does not add a canvas, override bag, or `Note` type.

Until this is locked in `shared/*.json` / `grammar/pdl.ebnf`, tooling must not treat the syntax as normative.

---

## 1. Problem

A well-built PDL pack already **documents components**: params, `if`, fixtures, and rules. A wiki can infer `/components/button` from the catalogue. What it cannot infer is the **storytelling** of a Figma Eng Spec file — ordered screen worlds, callouts on a deep `let`, “this chapter is authentication,” phone vs tablet, logged-in vs not.

Faithful Figma ↔ PDL round-trip would need document objects we do not want in portable core (`Canvas`, `Node.id`, arbitrary `Override`, `Foreign`). Designers often use instance overrides *because Figma has no fixtures*. The useful ingest is interpretive: collapse those copies into one `component` + fixtures + rules. The leftover is a **titled document of stories**, not another component API.

---

## 2. Goals

| Goal | Meaning |
|------|---------|
| **Self-documenting components** | No `spec Button`. Wiki infers the page from `usage`, fixtures, rules, params |
| **Don’ts from rules** | Synthesize a do/don’t pair from the query; never publish `DontTwoPrimaries` as a component |
| **Spec as chapter** | `spec Authentication` is a wiki document (`/authentication.html`) that collects stories |
| **Story as spine** | Ordered beats: existing `page`/`screen` fixtures + title + description + `point` + `next` / `see` |
| **Audience is an if-tree** | `if` / `else` / `&&` / `||` on the spec (and inner `if` on steps). No `where` / `when` / `on =` |
| **Stable point paths** | Lets + Presenter `.top` / `.cover` + list `[i]`; resolve against **this** beat’s bake |
| **Host worlds** | Device columns from pack `host` profiles or `sizeClass`; not SKU lists |
| **Viewer iterate + de-dupe** | Cartesian product of axes mentioned in the spec’s if-tree; drop duplicate inclusions |

### Non-goals (v1)

- Figma pixel identity or node-id round-trip (`Canvas`, `Override`, `Foreign`).
- `Note` / `NoteKind` as a new value type; do/don’t lists inside `usage`.
- `spec` as a component gallery (`show = [Button.primary, …]`).
- File-level `if` outside a `spec` (no conditional `component` / `theme`).
- A second navigator that duplicates `Presenter` + emits.
- Markdown / long essays in `.pdl`.
- Anatomy-as-spatial-diagram; Smart Animate as a language primitive.
- Merge-by-name of two `story Foo` fragments.

---

## 3. Two layers

```text
Inferred (no new objects)
  usage + fixtures + rules + params + tokens
       → /components/button, /foundations/color

Authored (this proposal)
  spec { title, description, if-tree of stories }
    story { steps }
      step { show, title, description, point, next, see }
       → /authentication.html
```

| Object | Job | Changes bake? |
|--------|-----|----------------|
| `usage.description` | Lede on a **type** | No |
| `fixtures` | Named **worlds** (unary) | No (preview input) |
| `rules` | Relational **checks**; wiki synthesizes illustrations | No |
| `spec` | **Chapter** + audience if-tree + URL | No |
| `story` / `step` | Ordered commentary over screen fixtures | No |

Write each fact once: a do is a fixture; a don’t is a rule (illustrated, not a scene component); a leftover sentence is `usage`; a flow with callouts is a story inside a spec.

---

## 4. Self-documenting components (no extra objects)

A pack already has a documentation graph. The wiki **prints** it.

| Route | Inference |
|-------|-----------|
| `/components/button` | Catalogue row: usage, params, fixtures, rules, tokens in the tree |
| `/foundations/color` | `primitive` / `semantic` Color + `theme` remaps |
| Pattern | A component that `requiredComponents` others and has fixtures |
| Don’t | A rule + a **synthesized** satisfy/violate pair |

**Fixture identity (prerequisite).** Today `example "Primary call to action"` is a display label. Specs and URLs need `Button.primary`. Prefer `example primary { title = "…" … }`. Quoted labels may slug as sugar and warn on collision. Meta keys (`title`, `host`, `theme`, `hostFacts`) stay out of the component param bag.

**Do not add** `Note`, fixture `kind = .dont`, or `spec Button { show = […] }`.

---

## 5. Don’ts inferred from rules

`DontTwoPrimaries` fails the self-documenting test: it is a valid `component` and a naive index will publish it.

Rules are relational; fixtures are unary. The don’t picture is a **derived illustration** of the query, hung on the rule, never `catalogue.components`.

Polarity:

- `.mustNot Q` — don’t = `Q` true; do = `Q` false.
- `.must Q` — do = `Q` true; don’t = `Q` false.
- `.should` / `.shouldNot` — same pictures, softer chrome.

The query language is small (`self` / `parent` / `children` / `siblings` / `ancestors` / `descendants`, `where(tag:)`, `count` / `exists` / `between`, `precedes` / `follows`). Tags already map to components + param `if`s (`if tone == .primary { tags.add("primary-action") }`). Synthesis wraps the smallest instances that carry those tags in an anonymous `Layout` (or overrides a list param). Refuse if a tag has no owner or the query is too open. Caption = `Rule` `description`.

Escape hatch (later, not v1): `Rule(..., using: SomeFixture)` only if a *real* molecule is the intended do.

---

## 6. `spec` — the chapter object

A `spec` is a titled document. It is the **only** place audience `if`s live. Stories nest inside it. The site map is the list of specs.

```pdl
enum AuthState {
  case loggedIn
  case notLoggedIn
}

spec Authentication {
  title = "Authentication"
  description = "How someone gets in, stays in, and leaves."

  if AuthState == .loggedIn {
    story Logout {
      step confirm {
        show = Settings.signedIn
        title = "Leave"
        description = "Sign out is in settings, not the tab bar."
        point signOut.row { description = "Confirms, then lands signed-out home." }
        next = done
      }
    }
  } else {
    if (host == Phone) || (host == Tablet) {
      story Login {
        step form {
          show = LoginScreen.empty
          title = "Sign in"
          description = "Email first; SSO is secondary."
          next = sso
        }
        if host == Phone {
          step sso {
            show = LoginScreen.empty
            point ssoRow.apple { description = "Apple is the first SSO." }
          }
        } else {
          step sso {
            show = LoginScreen.empty
            point sidebar.apple { description = "SSO sits in the rail." }
          }
        }
      }
    }
    story ForgotPassword {
      step form { show = ForgotPassword.empty … }
    }
  }
}
```

**Ambient axes (spec body only).** `AuthState` and `host` are current values of those axes — not component bindings. `if AuthState == .loggedIn` is legal. `if auth == .loggedIn` is not (unless we later add spec params). `host` is a **profile name** from the pack (`Phone`, `Tablet`, `Default`, `CI`), not prelude `<Host>`.

`enum` / `variant` are the same in v1; prefer `enum` for situation ids.

**Stories only inside a spec** in v1. Reuse across chapters is copy or a later `include`. No file-level `if` around `component` / `theme`.

Tags on a story (`tags = ["onboarding"]`) are an **index** only. They do not drive the if-tree and are not a substitute for `AuthState`.

---

## 7. `story` / `step`

A story is an ordered list of beats. It has no signature. It does not return a tree. Inner `if` / `else` refine **steps** on the same axes the parent spec already used.

| Field | Job |
|-------|-----|
| `show` | Existing **`page` or `screen` fixture** (`LoginScreen.empty`). No anonymous `Layout` / `Button(label:)`. |
| `title` / `description` | Copy for this beat (not `usage`). |
| `point <path>` | Callout on a named node in **this** `show` bake. |
| `next` | Default successor (step id in this projection). |
| `see` | Cross-refs: other steps, `OtherSpec.story.step`, `Button.primary`, `Tracks.focus`. |

v1 `show` is a `page` / `screen` fixture so stories stay at Eng Spec altitude. Component fixtures belong in `see`.

**Clicks vs Presenter.** Story chrome (`next`, hotspot on a `point`) changes **which beat you are reading**. `Presenter` + emits change **the product**. Overlay mode: run the live screen; pick the step whose `show` matches the current fixture / stack pin; show that copy. No second interaction graph.

---

## 8. Point paths

Author path walks **lets**, then two special segments. Positional “first layout, first child” is Figma layer order and is not the default.

```pdl
point library.top.list[0].play {
  description = "This item has a play button."
}
```

| Segment | Meaning |
|---------|---------|
| `library` | `let` on the shown screen (here a `Presenter`) |
| `.top` | Painted stack top. `.cover` if a cover is up. Not a buried stack page. |
| `.list` | `let` on that page |
| `[0]` / `.first` / `[trackId: "neon"]` | List / ForEach-expanded row only |
| `.play` | Inner `let` on the row instance |

Resolve against the **baked `show`**, not the screen type in the abstract. Missing segment on that bake → error. `library.list` must not implicit-enter the hole (the screen may also have `let list`).

`child(i)` among mixed `children` is last-resort ingest sugar and should warn. Studio re-resolves paths when fixtures change and warns per world (see §10).

Bake ids (`instance__nested`) stay host-internal. Authors never write them.

---

## 9. Host profiles and device columns

A `host` profile is pack-owned: same param names/types on every profile in the design (PDL-E045); defaults and `mount` may differ. Labs use `Default` + `CI` with `sizeClass` / `surface` / `previewBackground`. `WindowSize` / `AppSurface` are pack variants, not language types.

Bake: defaults → `mount` once against facts → pin any fact whose key matches a param.

Stories must **not** invent `.iPhone` / `.iPad`. Claim `host == Phone` only if that profile exists (same bag as `Default`, different defaults), or branch on `sizeClass` if that is the pack axis:

```pdl
if (sizeClass == .compact) || (sizeClass == .medium) { … }
```

Prefer one `<Host>` screen and **stable let names** across `if sizeClass` so one `point` serves every column. Fork `show` or wrap a whole step in `if host == Phone` when the shell or the beat is actually different.

Theme is a site switcher, not a spec axis. Do not take `sizeClass × surface × theme × AuthState` unless the if-tree wrote that product.

---

## 10. Viewer: iterate, then de-dupe

Compile the spec into stories and steps, each tagged with the `if` chain that included them. Nothing is discarded.

1. Collect axes mentioned in this spec’s if-tree (`AuthState`, `host`, …).
2. For each tuple in the cartesian product, evaluate, collect `(story, steps)`.
3. Group by story name.
4. **Keep an axis** on a story if it appears in a guard **on the path to that story**.
5. **Drop an axis** if it only appeared on a sibling branch (e.g. a story at spec root, outside the `AuthState` `if` — one card, no AuthState switcher).

De-dupe **duplicate inclusions**, not device pictures:

| Same | Collapse? |
|------|-----------|
| Same story + same steps, axis not on that story’s path | Yes — one card |
| Same story + same steps, different `host` on the path | No — one story, two columns |
| Same story, different steps (`if host == Phone { step tabs }`) | No — two projections |

Never collapse Phone vs Tablet just because the step *source* looks the same. Never introspect `HomeScreen` to drop a beat; the `if` **is** the claim. Paths still validate on the projected bake only.

Empty projection (logged-in × no matching stories) is a valid view, not an error.

`/authentication.html`: spec `title` / `description`, knobs for axes the **page** uses, then surviving stories. Host may be page chrome or per-story if only some stories branched on `host`.

Playground: Story / Docs mode — linear read, column projection, or overlay on the live `show`. Publish: `catalogue` + bake each listed fixture (per remaining host world).

---

## 11. Figma Eng Spec ingest (interpretive)

Classifier + folder, not a node walker:

1. Cluster state frames → one `component` + `example` ids (layer name → fixture id).
2. Checkable captions → `Rule`; leftover sentence → `usage.description`.
3. Screen-state artboards → `page` / `screen` fixtures.
4. Page order + captions → `spec` + `story` steps.
5. Arrows / “taps search” → `next` / `see` / `point <let>` when the let is obvious.
6. Device frames of the same flow → `if host` / `if sizeClass` on the spec or on steps.

Refuse vectors as structure, prototype links as `PresentationMotion`, and redlines. Output is a **proposal pack** (human accepts). Export to Figma, if any, emits one component + a generated spec page from stories — cleaner than the source, not the same node ids.

---

## 12. Rejected alternatives (kept for memory)

| Idea | Why not |
|------|---------|
| `Canvas` / `Node` / `Override` / `Foreign` | Fidelity of a Figma file; portable core is a program |
| `Note` + `usage.notes` + fixture `kind` | Four strings for one thought; do = fixture, don’t = rule |
| `spec` as `show = [Button.primary, …]` | Hand-built Storybook; inferred wiki already does this |
| `DontTwoPrimaries` scene component | Published as a real component |
| `on = [Phone]` on a step | Second opt-in dialect |
| `story Foo where … when …` / `on =` | Signature on something that returns nothing |
| Boolean in `story Foo(host == Phone \|\| …)` | `()` is params everywhere else |
| `if` at file top around `component` | Conditional declarations only inside `spec` |
| Implicit `library.list` entering a Presenter | Collides with a screen-level `let list` |
| CSS / type selectors for `point` | Wrong icon the moment a second glyph appears |

---

## 13. Open questions

1. **Fixture id** — require `example primary` now, or accept `"Primary"` slug sugar?
2. **`if AuthState == .loggedIn`** — lock type-name-as-axis for spec bodies only (recommended), or require a declared spec param?
3. **Must every story sit in a spec?** v1 yes. `include Login` later if two chapters share a story.
4. **Host profiles vs `sizeClass`** — product packs that want `on = [Phone, Tablet]` must add same-shaped profiles; otherwise branch on `sizeClass` under `Default`.
5. **`see` target grammar** — `Button.primary` vs `spec Foundations` vs `Authentication.Login.form`.
6. **Overlay matching** — exact fixture id vs “same presenter stack top”?
7. **Hide rule-illustration trees** from the component index — always (they are not components) vs a host flag for hand-built scenes.
8. **How long is `description`** — one thought as a lint (`.should`), not a compiler error.

---

## 14. Worked pack (sketch)

```pdl
enum AuthState { case loggedIn; case notLoggedIn }

spec Authentication {
  title = "Authentication"
  description = "How someone gets in, stays in, and leaves."

  if AuthState == .loggedIn {
    story Logout {
      step confirm {
        show = Settings.signedIn
        title = "Sign out"
        description = "In settings, not the tab bar."
        point signOut.row { description = "Confirms, then signed-out home." }
      }
    }
  } else {
    if (host == Phone) || (host == Tablet) {
      story Login {
        step form {
          show = LoginScreen.empty
          title = "Sign in"
          description = "Email first."
          next = sso
        }
        if host == Phone {
          step sso {
            show = LoginScreen.empty
            point ssoRow.apple { description = "Apple first." }
          }
        } else {
          step sso {
            show = LoginScreen.empty
            point sidebar.apple { description = "SSO in the rail." }
          }
        }
      }
    }
    story ForgotPassword {
      step form { show = ForgotPassword.empty }
    }
  }
}
```

Wiki: `/authentication.html` — AuthState control; Logout vs Login + ForgotPassword; Login also offers Phone | Tablet; `point` resolved per bake. `/components/login-screen` still inferred from fixtures and rules. No `Dont…` in the index.

---

## 15. Implementation notes (when we start)

Not scheduled. When this leaves “proposed”:

- Grammar + `language-objects.json` for `spec`, `story`, `step`, `point`, spec-scoped `if`.
- Fixture example **ids** (breaking or sugar).
- Catalogue: `specs[]`, story predicates, resolved `show` / `point` frame ids per world.
- Host: `illustrate(rule)` for don’ts; spec projector (iterate + de-dupe); Docs / Story UI.
- Diagnostic family for unknown `show`, bad `point`, `next` to a step not in this projection, `if AuthState` outside a spec.

No implementation plan file until this is accepted.
