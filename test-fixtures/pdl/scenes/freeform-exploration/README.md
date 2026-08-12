# Freeform exploration scene (stub)

**Status:** architectural stub — not a running canvas product.  
**Idea:** whiteboard placement over **real PDL** drafts/instances; promote into the pack when ready.

## Model

| Layer | Files | Role |
|-------|--------|------|
| **Canvas jacket** | `scene.json` | Freeform `x/y/z`, draft status, multiplayer-friendly node ids, optional `childPlacement` overrides |
| **PDL drafts** | `d_*.pdl` | In-session components — **same language structure** as pack components (bakeable) |
| **Pack baseline** | `../../systems/airbnb-lite/*` | Existing tokens + `AbnButton` / `AbnChip` / … |

Freeform is **placement only**. Draft bodies are not property blobs — they are PDL `component` trees so language constraints surface during sketching, not only at promote.

```text
scene.json  →  where / which instance / draft vs pack
d_*.pdl     →  what (params, tokens, nested components, layout)
design.pdl  →  bake entry (airbnb-lite + drafts)
```

## What’s on the board

1. **`FilterRail` (draft)** — row of pack `AbnChip`s; inner tree already flow layout; whole rail still freeform on the canvas.
2. **`StayCard` (draft)** — uses `abn.*` tokens, nests pack **`AbnChip`** (badge) + **`AbnButton`** (CTA). Two instances with different args. One node keeps `childPlacement` freeform overrides to illustrate “Auto layout not committed yet.”
3. **Loose pack instances** — `AbnChip` + `AbnButton` dropped on the board (trivial sync path: scene nodes only).

## Bake drafts

Drafts must stay resolve/bake clean (same fence as pack components):

```bash
cargo build -p pdl-cli
./target/debug/pdl bakeComponent \
  test-fixtures/pdl/scenes/freeform-exploration/design.pdl StayCard \
  --out /tmp/stay-card.bake.json

./target/debug/pdl bakeComponent \
  test-fixtures/pdl/scenes/freeform-exploration/design.pdl FilterRail \
  --out /tmp/filter-rail.bake.json

npm run preview -- \
  test-fixtures/pdl/scenes/freeform-exploration/design.pdl StayCard
```

`scene.json` is **not** consumed by the CLI yet — hosts would mount bake output at each node’s `placement`.

While stubbing `StayCard`, bake rejected invalid `padding` / `EdgeInsets` shapes (**PDL-E006** / **PDL-E001**) — the point of keeping drafts in real PDL instead of a loose property bag.

## Promote (intended)

1. Clear freeform `childPlacement` (commit Auto layout → trust PDL `children` / `direction` / `gap`).
2. Move `d_stay_card.pdl` → pack file (e.g. `systems/airbnb-lite/c_stay_card.pdl`).
3. Rewrite scene nodes from `draftInstance` → `packInstance`.
4. Commit pack + scene like normal source.

## Non-goals (this stub)

- No multiplayer server, CRDT, or canvas UI
- No scene→DOM host
- No automatic layout inference
