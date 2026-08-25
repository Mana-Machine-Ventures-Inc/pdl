import { describe, expect, it } from "vitest";
import { collectMotionClips, motionClipLabel } from "../src/motionClips.js";
import {
  bakeComponent,
  catalogue,
  fx,
  interactionsByComponent as rustInteractions,
} from "./helpers/rustFixtures.js";

const MOTION_LAB = fx("lab/motion/design.pdl");

describe("motion clips", () => {
  it("labels lifecycle and pointer events", () => {
    expect(motionClipLabel("appear")).toBe("Appear");
    expect(motionClipLabel("dismiss")).toBe("Dismiss");
    expect(motionClipLabel("hoverStart")).toBe("Hover start");
    expect(motionClipLabel("pressEnd")).toBe("Release");
  });

  it("collects one clip per animating handler, grouped by instance", () => {
    const interactionsByComponent = rustInteractions(MOTION_LAB);
    const bake = bakeComponent(MOTION_LAB, "MotionLab");
    const clips = collectMotionClips(
      "MotionLab",
      interactionsByComponent,
      bake.components.MotionLab?.root?.children,
    );
    // MotionHoverChip is state-only (no Animation) — no hover clips.
    expect(clips.map((c) => `${c.groupLabel}:${c.event}`)).toEqual([
      "modal:appear",
      "modal:dismiss",
      "list:appear",
      "blur:appear",
      "blur:dismiss",
      "flourish:hoverStart",
      "flourish:hoverEnd",
      "pop:hoverStart",
      "pop:hoverEnd",
      "overridePop:hoverStart",
      "overridePop:hoverEnd",
      "appearPulse:appear",
      "pressPop:pressStart",
      "pressPop:pressEnd",
      "pressPop:pressCancel",
      "targeted:pressStart",
      "targeted:pressEnd",
      "targeted:pressCancel",
      "dance:pressStart",
      "dance:pressEnd",
      "dance:pressCancel",
    ]);
  });

  it("MotionParallelDance pressEnd catalogues three concurrent animationTargets", () => {
    const cat = catalogue(MOTION_LAB);
    const pressEnd = (
      cat.components.MotionParallelDance!.interactions?.[0] as {
        handlers: Array<{
          event: string;
          animationTargets?: Array<{ target: string; animation?: { keys?: unknown[] } }>;
        }>;
      }
    ).handlers.find((h) => h.event === "pressEnd");
    expect(pressEnd?.animationTargets?.map((t) => t.target)).toEqual(["go", "left", "right"]);
    expect(pressEnd?.animationTargets?.find((t) => t.target === "left")?.animation?.keys).toHaveLength(4);
    expect(pressEnd?.animationTargets?.find((t) => t.target === "right")?.animation?.keys).toHaveLength(4);
  });

  it("MotionPoseLab exposes one Appear/Dismiss pair per Pose field", () => {
    const interactionsByComponent = rustInteractions(MOTION_LAB);
    const bake = bakeComponent(MOTION_LAB, "MotionPoseLab");
    const clips = collectMotionClips(
      "MotionPoseLab",
      interactionsByComponent,
      bake.components.MotionPoseLab?.root?.children,
    );
    expect(clips.map((c) => `${c.groupLabel}:${c.event}`)).toEqual([
      "opacity:appear",
      "opacity:dismiss",
      "scale:appear",
      "scale:dismiss",
      "scaleX:appear",
      "scaleX:dismiss",
      "scaleY:appear",
      "scaleY:dismiss",
      "translateX:appear",
      "translateX:dismiss",
      "translateY:appear",
      "translateY:dismiss",
      "blur:appear",
      "blur:dismiss",
      "rotate:appear",
      "rotate:dismiss",
    ]);
  });
});
