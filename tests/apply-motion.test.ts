import { describe, expect, it } from "vitest";
import {
  collectMotionFromHandlerItems,
  effectiveTransition,
  implicitTransitionCss,
  motionKeyframes,
  poseTrackKeyframes,
  resolvedMotionKeys,
  snapshotsForMode,
  staggerDelayMs,
  waapiEffectTiming,
} from "../src/applyMotion.js";
import { applySiteDefaultPlay, defaultMotionPlay, snapshotToCss } from "../src/motionProps.js";
import type { InteractionHandlerItem } from "../src/ast.js";

const appearBody: InteractionHandlerItem[] = [
  {
    kind: "animate",
    value: {
      kind: "motion",
      transition: {
        kind: "transition",
        duration: { kind: "number", value: 250 },
        easing: { kind: "string", value: "ease-out" },
      },
      pose: {
        kind: "pose",
        props: {
          opacity: { kind: "number", value: 0 },
          scale: { kind: "number", value: 0.95 },
          translateY: { kind: "number", value: 8 },
        },
      },
      stagger: {
        kind: "stagger",
        step: { kind: "number", value: 40 },
        from: { kind: "dotEnum", value: ".last" },
      },
    },
  },
];

describe("applyMotion", () => {
  it("collects Motion(transition, pose, stagger)", () => {
    const spec = collectMotionFromHandlerItems(appearBody);
    expect(spec.transition).toEqual({ duration: 250, easing: "ease-out", delay: 0 });
    expect(spec.pose).toEqual({ opacity: 0, scale: 0.95, translateY: 8 });
    expect(spec.stagger).toBe(40);
    expect(spec.staggerFrom).toBe("last");
  });

  it("treats a bare Transition as Motion sugar", () => {
    const spec = collectMotionFromHandlerItems([
      {
        kind: "animate",
        value: {
          kind: "transition",
          duration: { kind: "number", value: 200 },
          easing: { kind: "string", value: "ease-out" },
        },
      },
    ]);
    expect(spec.transition).toEqual({ duration: 200, easing: "ease-out", delay: 0 });
    expect(spec.pose).toBeUndefined();
  });

  it("builds appear keyframes from pose to identity", () => {
    const spec = collectMotionFromHandlerItems(appearBody);
    const snaps = snapshotsForMode(spec, "appear", 1)!;
    const [from, to] = motionKeyframes(snaps.from, snaps.to, 1);
    expect(from.transform).toBe("translate(0px, 8px) rotate(0deg) scale(0.95, 0.95)");
    expect(from.opacity).toBe("0");
    expect(to.transform).toBe("translate(0px, 0px) rotate(0deg) scale(1, 1)");
    expect(to.opacity).toBe("1");
  });

  it("composes translate then scale and blur", () => {
    const css = snapshotToCss({ translateX: 4, translateY: 8, scaleX: 0.5, scaleY: 2, blur: 3 }, 1);
    expect(css.transform).toBe("translate(4px, 8px) rotate(0deg) scale(0.5, 2)");
    expect(css.filter).toBe("blur(3px)");
  });

  it("composes translate, rotate, then scale", () => {
    const css = snapshotToCss({ translateX: 4, rotate: -12, scale: 0.9, originX: 0.5, originY: 0 }, 1);
    expect(css.transform).toBe("translate(4px, 0px) rotate(-12deg) scale(0.9, 0.9)");
    expect(css.transformOrigin).toBe("50% 0%");
  });

  it("uniform scale applies to both axes when scaleX/scaleY are omitted", () => {
    expect(snapshotToCss({ scale: 0.5 }, 1).transform).toBe(
      "translate(0px, 0px) rotate(0deg) scale(0.5, 0.5)",
    );
    expect(snapshotToCss({ scale: 0.5, scaleX: 0.2 }, 1).transform).toBe(
      "translate(0px, 0px) rotate(0deg) scale(0.2, 0.5)",
    );
  });

  it("reverses stagger from last", () => {
    const spec = collectMotionFromHandlerItems(appearBody);
    expect(staggerDelayMs(spec, 0, 3)).toBe(80);
    expect(staggerDelayMs(spec, 2, 3)).toBe(0);
  });

  it("zeros duration when reduced motion is preferred", () => {
    const spec = collectMotionFromHandlerItems(appearBody);
    expect(effectiveTransition(spec, true).duration).toBe(0);
  });

  it("fills site default play when the spec omitted it", () => {
    expect(defaultMotionPlay("appear", true)).toBe("toRest");
    expect(defaultMotionPlay("dismiss", true)).toBe("toPose");
    expect(defaultMotionPlay("hoverStart", true)).toBe("toPose");
    expect(defaultMotionPlay("hoverEnd", true)).toBe("toRest");
    expect(defaultMotionPlay("hoverStart", false)).toBeUndefined();
    expect(defaultMotionPlay("hoverEnd", false)).toBeUndefined();
    const authored = applySiteDefaultPlay({ play: "toPose", keys: [] }, "hoverEnd");
    expect(authored.play).toBe("toPose");
    expect(applySiteDefaultPlay({ keys: [] }, "hoverEnd").play).toBe("toRest");
  });

  it("expands pose sugar to one key at 1 and loops rotate 360 continuously", () => {
    const spec = {
      transition: { duration: 800, easing: "linear", delay: 0 },
      play: "loop" as const,
      pose: { rotate: 360 },
    };
    expect(resolvedMotionKeys(spec)).toEqual([{ pose: { rotate: 360 }, at: 1 }]);
    const frames = poseTrackKeyframes(spec, 1);
    expect(frames).toHaveLength(2);
    expect(frames[0]!.offset).toBe(0);
    expect(frames[0]!.transform).toContain("rotate(0deg)");
    expect(frames[1]!.offset).toBe(1);
    expect(frames[1]!.transform).toContain("rotate(360deg)");
    const timing = waapiEffectTiming(spec, false);
    expect(timing.iterations).toBe(Number.POSITIVE_INFINITY);
    expect(timing.fill).toBe("none");
    expect(timing.easing).toBe("linear");
    expect(timing.duration).toBe(800);
  });

  it("walks authored keys including .rest", () => {
    const frames = poseTrackKeyframes(
      {
        keys: [
          { pose: { scale: 1.16, translateY: -4 }, at: 0.35 },
          { pose: { scale: 0.98 }, at: 0.7 },
          { pose: "rest", at: 1 },
        ],
      },
      1,
    );
    expect(frames.map((f) => f.offset)).toEqual([0, 0.35, 0.7, 1]);
    expect(frames[3]!.transform).toBe("translate(0px, 0px) rotate(0deg) scale(1, 1)");
  });

  it("builds implicit CSS transition from animate =", () => {
    const css = implicitTransitionCss({ duration: 200, easing: "ease-out", delay: 0 });
    expect(css).toContain("background-color 200ms ease-out");
    expect(css).toContain("opacity 200ms ease-out");
    expect(implicitTransitionCss({ duration: 0, easing: "linear", delay: 0 })).toBe("none");
  });
});
