# Motion (Playground lab)

Self-contained examples for **HTML preview motion**. Bake stays at rest pose; the host plays a CSS overlay (`opacity`, `scale`, `translate`, `blur`, `rotate`).

Open the pack in Playground (Project → **Motion**). The canvas is this file’s gallery.

| Component | What you should see |
|-----------|---------------------|
| `MotionLab` | Modal + stagger list + blur card + hover chip (default) |
| `MotionPoseLab` | One card per Pose field (`opacity`, `scale`, `scaleX`, `scaleY`, `translateX`, `translateY`, `blur`, `rotate`) |
| `MotionPoseOpacity` | Fade only: `opacity` 0 → 1 |
| `MotionPoseScale` | Uniform grow: `scale` 0.5 → 1 |
| `MotionPoseScaleX` | Horizontal un-squash: `scaleX` 0.2 → 1 |
| `MotionPoseScaleY` | Vertical un-squash: `scaleY` 0.2 → 1 |
| `MotionPoseTranslateX` | Slide from the right: `translateX` 48 → 0 |
| `MotionPoseTranslateY` | Slide from below: `translateY` 24 → 0 |
| `MotionPoseBlur` | Unblur only: `blur` 16px → 0 (opacity stays 1) |
| `MotionPoseRotate` | Tilt in: `rotate` −12° → 0 |
| `MotionModal` | Appear from opacity 0 / scale 0.95 / +8px. **Appear** / **Dismiss** on the clip rack |
| `MotionStaggerList` | Three rows stagger in 40ms steps from the last row |
| `MotionBlurCard` | Appear from `Pose(blur: 18)` (CSS filter overlay). **Appear** / **Dismiss** |
| `MotionHoverChip` | Hover interpolates `background` via `animate =` (Transition sugar). **Hover start** / **Hover end** |
| `MotionHoverFlourish` | Hover pose track: keys through a pop, then `.rest`. hoverEnd reverses from current progress |
| `MotionHoverPop` | Token `motion.hoverPop` omits `play`. hoverStart → `.toPose`, hoverEnd → `.toRest` |
| `MotionHoverPopOverride` | Token sets `play: .toPose`. hoverEnd is `Motion(motion.hoverPopHeld, play: .toRest)` |
| `MotionStandingSpin` | Child `spinner.animate = motion.spin` while `isLoading`. Linear `rotate: 360` loops |
| `MotionStandingSelf` | Root `self.animate = motion.spin` while `isLoading` |
| `MotionPulse` | Standing keys through dim/scale and `.rest` |
| `MotionSheen` | Shine starts off the left (`translateX: -80`), sweeps to off the right (`160`), loops |
| `MotionAppearThenPulse` | Appear fade, then standing pulse on the same opacity channel |
| `PressPopButton` | Press shrinks + darkens; release pops forward (scale overshoot) onto a raised shadow |
| `PressPopLab` | Soft gray stage for the press-pop stub |

Units: duration **ms**, translate/blur **px**, scale unitless, opacity / origin 0…1, rotate degrees.

Preview transport is one button per animating handler (Appear, Dismiss, Hover start, …), grouped by instance when the canvas has more than one. Cards with appear start at the appear-from pose, then play **Appear** once they are on screen. **Reset** returns to not-yet-appeared; scroll away and back, then stay on screen for 500ms to play Appear again. **Dismiss** plays out. **Slow-mo** is per preview card and plays that card’s motion (including hover tweens) at 5× duration.

Proposal (**P**–**M3** shipped; **M4** teaching): [`docs/PROPOSAL_MOTION_PLAY.md`](../../../../docs/PROPOSAL_MOTION_PLAY.md).
