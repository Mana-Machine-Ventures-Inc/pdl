import { describe, expect, it } from "vitest";
import {
  collectMotionFromHandlerItems,
  effectiveTransition,
  implicitTransitionCss,
  motionKeyframes,
  playPresentationMotion,
  poseTrackKeyframes,
  resolvedMotionKeys,
  snapshotsForMode,
  staggerDelayMs,
  waapiEffectTiming,
  withDismissDefaultFront,
} from "../src/applyMotion.js";
import { applySiteDefaultPlay, defaultMotionPlay, snapshotToCss } from "../src/motionProps.js";
import type { InteractionHandlerItem } from "../src/ast.js";

const appearBody: InteractionHandlerItem[] = [
  {
    kind: "animate",
    value: {
      kind: "motion",
      timing: {
        kind: "timing",
        duration: { kind: "number", value: 250 },
        ease: { kind: "string", value: "ease-out" },
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
  it("collects Motion(timing, pose, stagger)", () => {
    const spec = collectMotionFromHandlerItems(appearBody);
    expect(spec.transition).toEqual({ duration: 250, easing: "ease-out", delay: 0 });
    expect(spec.pose).toEqual({ opacity: 0, scale: 0.95, translateY: 8 });
    expect(spec.stagger).toBe(40);
    expect(spec.staggerFrom).toBe("last");
  });

  it("treats a bare Timing as Motion sugar", () => {
    const spec = collectMotionFromHandlerItems([
      {
        kind: "animate",
        value: {
          kind: "timing",
          duration: { kind: "number", value: 200 },
          ease: { kind: "string", value: "ease-out" },
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

  it("puts Key.ease on the WAAPI frame for that stop", () => {
    const frames = poseTrackKeyframes(
      {
        transition: { duration: 480, easing: "ease-in", delay: 0 },
        keys: [
          { pose: { translateX: 390 }, at: 0 },
          { pose: { translateX: 40 }, at: 0.55, easing: "ease-out" },
          { pose: "rest", at: 1 },
        ],
      },
      1,
    );
    expect(frames.map((f) => f.offset)).toEqual([0, 0.55, 1]);
    expect(frames[1]!.easing).toBe("ease-out");
    expect(frames[0]!.easing).toBeUndefined();
    expect(frames[2]!.easing).toBeUndefined();
  });

  it("builds implicit CSS transition from animate =", () => {
    const css = implicitTransitionCss({ duration: 200, easing: "ease-out", delay: 0 });
    expect(css).toContain("background-color 200ms ease-out");
    expect(css).toContain("opacity 200ms ease-out");
    expect(implicitTransitionCss({ duration: 0, easing: "linear", delay: 0 })).toBe("none");
  });
});

describe("playPresentationMotion", () => {
  function fakeLane() {
    const classes = new Set<string>();
    const seen: {
      duration?: number;
      easing?: string;
      fromOpacity?: string;
      toOpacity?: string;
      front?: boolean;
      startOpacity?: string;
      offsets?: Array<number | undefined>;
      frameEasings?: Array<string | undefined>;
      frameCount?: number;
    } = {};
    const el = {
      classList: {
        add(...names: string[]) {
          for (const n of names) classes.add(n);
        },
        remove(...names: string[]) {
          for (const n of names) classes.delete(n);
        },
        toggle(name: string, on?: boolean) {
          if (on) classes.add(name);
          else classes.delete(name);
          if (name === "pdl-presenter__lane--front") seen.front = Boolean(on);
        },
      },
      style: { zIndex: "", transform: "", opacity: "", filter: "", transformOrigin: "" },
      getAnimations: () => [],
      animate: (
        frames: Array<{ opacity?: string; offset?: number; easing?: string }>,
        opts: { duration: number; easing: string },
      ) => {
        seen.duration = opts.duration;
        seen.easing = opts.easing;
        seen.fromOpacity = frames[0]?.opacity;
        seen.toOpacity = frames[frames.length - 1]?.opacity;
        seen.startOpacity = el.style.opacity;
        seen.offsets = frames.map((f) => f.offset);
        seen.frameEasings = frames.map((f) => f.easing);
        seen.frameCount = frames.length;
        const listeners: Array<() => void> = [];
        const anim = {
          addEventListener(type: string, fn: () => void) {
            if (type === "finish") listeners.push(fn);
          },
          cancel() {},
        };
        setTimeout(() => {
          for (const fn of listeners) fn();
        }, opts.duration);
        return anim;
      },
    };
    return { el, seen };
  }

  it("plays both lanes for the pair duration (not a fixed 800ms cap)", async () => {
    const incoming = fakeLane();
    const outgoing = fakeLane();
    let done = false;
    playPresentationMotion(incoming.el as never, outgoing.el as never, {
      incoming: { translateX: 390 },
      outgoing: { translateX: 0, opacity: 0 },
      duration: 2000,
      ease: "in",
      front: ".outgoing",
    }, { onDone: () => { done = true; } });
    expect(incoming.seen.duration).toBe(2000);
    expect(outgoing.seen.duration).toBe(2000);
    expect(incoming.seen.easing).toBe("ease-in");
    expect(outgoing.seen.easing).toBe("ease-in");
    expect(outgoing.seen.toOpacity).toBe("0");
    await new Promise((r) => setTimeout(r, 900));
    expect(done).toBe(false);
    await new Promise((r) => setTimeout(r, 1300));
    expect(done).toBe(true);
  });

  it("animates incoming opacity from the start pose (toRest)", () => {
    const incoming = fakeLane();
    const outgoing = fakeLane();
    playPresentationMotion(incoming.el as never, outgoing.el as never, {
      kind: "presentationMotion",
      incoming: { kind: "pose", translateX: -48, opacity: 0.86 },
      outgoing: { kind: "pose", translateX: 390 },
      duration: 3200,
      ease: "linear",
    });
    expect(incoming.seen.startOpacity).toBe("0.86");
    expect(incoming.seen.fromOpacity).toBe("0.86");
    expect(incoming.seen.toOpacity).toBe("1");
  });

  it("puts outgoing in front when dismiss defaults front", () => {
    const incoming = fakeLane();
    const outgoing = fakeLane();
    playPresentationMotion(
      incoming.el as never,
      outgoing.el as never,
      {
        incoming: { translateX: -48, opacity: 0.86 },
        outgoing: { translateX: 390 },
        duration: 200,
        ease: "linear",
      },
      { defaultFront: "outgoing" },
    );
    expect(incoming.seen.front).toBe(false);
    expect(outgoing.seen.front).toBe(true);
  });

  it("plays a 3-key incoming path and a Pose outgoing", () => {
    const incoming = fakeLane();
    const outgoing = fakeLane();
    playPresentationMotion(incoming.el as never, outgoing.el as never, {
      kind: "presentationMotion",
      incoming: {
        kind: "motion",
        duration: 480,
        ease: "out",
        keys: [
          { pose: { translateX: 390, opacity: 0 }, at: 0 },
          { pose: { translateX: 40 }, at: 0.55, ease: "out" },
          { pose: "rest", at: 1 },
        ],
      },
      outgoing: { kind: "pose", translateX: -48, opacity: 0.86 },
      duration: 320,
      ease: "in",
    });
    expect(incoming.seen.duration).toBe(480);
    expect(incoming.seen.offsets).toEqual([0, 0.55, 1]);
    expect(incoming.seen.frameEasings?.[1]).toBe("ease-out");
    expect(incoming.seen.startOpacity).toBe("0");
    expect(incoming.seen.fromOpacity).toBe("0");
    expect(outgoing.seen.duration).toBe(320);
    expect(outgoing.seen.frameCount).toBe(2);
    expect(outgoing.seen.toOpacity).toBe("0.86");
  });

  it("animates a keys-only incoming Motion (no pose:)", () => {
    const incoming = fakeLane();
    const outgoing = fakeLane();
    playPresentationMotion(incoming.el as never, outgoing.el as never, {
      incoming: {
        kind: "motion",
        duration: 200,
        ease: "linear",
        keys: [
          { pose: { opacity: 0 }, at: 0 },
          { pose: "rest", at: 1 },
        ],
      },
      outgoing: { kind: "pose", translateX: 0 },
      duration: 200,
      ease: "linear",
    });
    expect(incoming.seen.frameCount).toBe(2);
    expect(incoming.seen.duration).toBe(200);
    expect(incoming.seen.startOpacity).toBe("0");
  });

  it("flips front at switchAt on a keyed incoming", async () => {
    const incoming = fakeLane();
    const outgoing = fakeLane();
    playPresentationMotion(incoming.el as never, outgoing.el as never, {
      incoming: {
        kind: "motion",
        duration: 80,
        ease: "linear",
        keys: [
          { pose: { translateX: 390 }, at: 0 },
          { pose: "rest", at: 1 },
        ],
      },
      outgoing: { kind: "pose", translateX: -48 },
      duration: 80,
      ease: "linear",
      front: ".outgoing",
      switchAt: 40,
    });
    expect(incoming.seen.front).toBe(false);
    expect(outgoing.seen.front).toBe(true);
    await new Promise((r) => setTimeout(r, 50));
    expect(incoming.seen.front).toBe(true);
    expect(outgoing.seen.front).toBe(false);
  });
});

describe("withDismissDefaultFront", () => {
  it("stamps .outgoing when front is omitted", () => {
    expect(withDismissDefaultFront({ kind: "presentationMotion", duration: 320 })).toEqual({
      kind: "presentationMotion",
      duration: 320,
      front: ".outgoing",
    });
  });

  it("keeps an explicit front", () => {
    expect(
      withDismissDefaultFront({ kind: "presentationMotion", front: ".incoming" }),
    ).toEqual({ kind: "presentationMotion", front: ".incoming" });
  });
});
