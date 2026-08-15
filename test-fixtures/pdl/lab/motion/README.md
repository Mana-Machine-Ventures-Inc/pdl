# Motion (Playground lab)

Self-contained examples for **HTML preview motion**. Bake stays at rest pose; the host plays a CSS overlay (`opacity`, `scale`, `translate`, `blur`).

Open the pack in Playground (Project → **Motion**). The canvas is this file’s gallery.

| Component | What you should see |
|-----------|---------------------|
| `MotionLab` | Modal + stagger list + hover chip (default) |
| `MotionModal` | Appear from opacity 0 / scale 0.95 / +8px. **Replay motion** runs dismiss then appear |
| `MotionStaggerList` | Three rows stagger in 40ms steps |
| `MotionHoverChip` | Hover interpolates `background` via `animate =` (Transition sugar) |

Units: duration **ms**, translate/blur **px**, scale unitless, opacity 0…1.
