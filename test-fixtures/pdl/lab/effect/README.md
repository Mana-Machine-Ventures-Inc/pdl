# Effect (Playground lab)

Standing paint on a frame. Not a fill, not a child, not Motion.

| Component | What you should see |
|-----------|---------------------|
| `EffectSelfBlur` | Whole card softened — `blur = 8` → `filter: blur(8px)` |
| `EffectBehindSheet` | Stacked photo + frosted strip (World A `effect:` on the pane) |
| `EffectFrostPane` | Token `effect.frost` (`.blurBehind`) on a child strip over a blue field |
| `EffectAppearUnblur` | Appear from `Pose(blur: 18)` to rest `blur = 4` |
| `EffectLab` | Gallery of the four cards |

`background` / `foreground` stay paints. `Blur()` in a fill list still works (alias window). `.glass` is reserved.

Proposal: [`docs/PROPOSAL_FRAME_BLUR.md`](../../../../docs/PROPOSAL_FRAME_BLUR.md).
