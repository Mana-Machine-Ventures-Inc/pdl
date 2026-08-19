import { describe, expect, it, vi } from "vitest";
import {
  collectAnimationFromHandlerItems,
  hasAnimationTrack,
  identitySnapshot,
  implicitTransitionCss,
  motionKeyframes,
  playAnimationOnElement,
  playPresentationMotion,
  resolvePoseDest,
  specFromEvaluated,
  staggerDelayMs,
  withDismissDefaultFront,
} from "../src/applyMotion.js";
import { snapshotToCss } from "../src/motionProps.js";
import type { InteractionHandlerItem } from "../src/ast.js";

const appearBody: InteractionHandlerItem[] = [
  {
    kind: "animate",
    value: {
      kind: "animation",
      start: {
        kind: "pose",
        props: {
          opacity: { kind: "number", value: 0 },
          scale: { kind: "number", value: 0.95 },
          translateY: { kind: "number", value: 8 },
        },
      },
      keys: {
        kind: "array",
        items: [
          {
            kind: "motion",
            timing: {
              kind: "timing",
              duration: { kind: "number", value: 250 },
              ease: { kind: "string", value: "ease-out" },
            },
            pose: { kind: "dotEnum", value: ".rest" },
          },
        ],
      },
      stagger: {
        kind: "stagger",
        step: { kind: "number", value: 40 },
        from: { kind: "dotEnum", value: ".last" },
      },
    },
  },
];

function mockAnimatable() {
  const calls: Array<{
    frames: Keyframe[];
    opts: KeyframeAnimationOptions;
  }> = [];
  const style = {
    transform: "",
    opacity: "",
    filter: "",
    transformOrigin: "",
  };
  const el = {
    style,
    getAnimations: () => [],
    animate: (frames: Keyframe[], opts: KeyframeAnimationOptions) => {
      calls.push({ frames, opts });
      return { finished: Promise.resolve(), cancel() {} };
    },
  };
  return { el, calls, style };
}

describe("applyMotion", () => {
  it("collects Animation(start, keys, stagger)", () => {
    const spec = collectAnimationFromHandlerItems(appearBody);
    expect(spec).toMatchObject({
      kind: "animation",
      start: { opacity: 0, scale: 0.95, translateY: 8 },
      stagger: 40,
      staggerFrom: "last",
    });
    expect(spec?.keys).toHaveLength(1);
    expect(spec?.keys[0]?.timing).toMatchObject({ duration: 250, delay: 0 });
    expect(spec?.keys[0]?.pose).toBe("rest");
    expect(hasAnimationTrack(spec)).toBe(true);
  });

  it("normalizes evaluated Animation JSON", () => {
    const spec = specFromEvaluated({
      kind: "animation",
      start: { opacity: 0 },
      keys: [{ timing: { duration: 200, ease: "out", delay: 0 }, pose: "rest" }],
      repeat: "forever",
    });
    expect(spec?.start).toEqual({ opacity: 0 });
    expect(spec?.keys[0]?.pose).toBe("rest");
    expect(spec?.repeat).toBe("forever");
  });

  it("builds appear keyframes from start pose to rest", () => {
    const spec = collectAnimationFromHandlerItems(appearBody)!;
    const from = resolvePoseDest(spec.start!, identitySnapshot(1), 1);
    const to = resolvePoseDest(spec.keys[0]!.pose, from, 1);
    const [a, b] = motionKeyframes(from, to, 1);
    expect(a.transform).toBe("translate(0px, 8px) rotate(0deg) scale(0.95, 0.95)");
    expect(a.opacity).toBe("0");
    expect(b.transform).toBe("translate(0px, 0px) rotate(0deg) scale(1, 1)");
    expect(b.opacity).toBe("1");
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
    const spec = collectAnimationFromHandlerItems(appearBody)!;
    expect(staggerDelayMs(spec, 0, 3)).toBe(80);
    expect(staggerDelayMs(spec, 2, 3)).toBe(0);
  });

  it("zeros duration when reduced motion is preferred", async () => {
    const { el, calls } = mockAnimatable();
    const handle = playAnimationOnElement(
      el as never,
      {
        kind: "animation",
        start: { opacity: 0 },
        keys: [{ timing: { duration: 250, ease: "out", delay: 0 }, pose: "rest" }],
      },
      { reduced: true, applyStart: true },
    );
    expect(handle).toBeTruthy();
    await handle!.finished;
    expect(calls[0]?.opts.duration).toBe(0);
  });

  it("plays sequential keys with per-segment timing", async () => {
    const { el, calls } = mockAnimatable();
    const handle = playAnimationOnElement(
      el as never,
      {
        kind: "animation",
        start: { translateX: 390, opacity: 0 },
        keys: [
          { timing: { duration: 264, ease: "out", delay: 0 }, pose: { translateX: 40 } },
          { timing: { duration: 216, ease: "out", delay: 0 }, pose: "rest" },
        ],
      },
      { applyStart: true },
    );
    await handle!.finished;
    expect(calls).toHaveLength(2);
    expect(calls[0]?.opts.duration).toBe(264);
    expect(calls[0]?.opts.easing).toBe("ease-out");
    expect(calls[1]?.opts.duration).toBe(216);
    expect(calls[0]?.frames[0]?.opacity).toBe("0");
    expect(String(calls[1]?.frames[1]?.transform)).toContain("translate(0px, 0px)");
  });

  it("cancels forever repeat without hanging", async () => {
    const { el, calls } = mockAnimatable();
    // Never-resolve after a few segments so a runaway loop cannot starve the suite.
    let n = 0;
    el.animate = (frames: Keyframe[], opts: KeyframeAnimationOptions) => {
      n += 1;
      calls.push({ frames, opts });
      if (n > 4) return { finished: new Promise(() => {}), cancel() {} };
      return { finished: Promise.resolve(), cancel() {} };
    };
    const handle = playAnimationOnElement(
      el as never,
      {
        kind: "animation",
        keys: [{ timing: { duration: 800, ease: "linear", delay: 0 }, pose: { rotate: 360 } }],
        repeat: "forever",
      },
      { applyStart: false },
    );
    expect(handle).toBeTruthy();
    await Promise.resolve();
    handle!.cancel();
    await handle!.finished;
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0]?.opts.iterations).toBe(1);
    expect(String(calls[0]?.frames[0]?.transform)).toContain("rotate(0deg)");
    expect(String(calls[0]?.frames[1]?.transform)).toContain("rotate(360deg)");
  });

  it("builds implicit CSS transition from Timing", () => {
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
      segmentCount?: number;
      durations?: number[];
    } = { durations: [], segmentCount: 0 };
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
        frames: Array<{ opacity?: string }>,
        opts: { duration: number; easing: string; delay?: number },
      ) => {
        seen.duration = opts.duration;
        seen.easing = opts.easing;
        seen.fromOpacity = frames[0]?.opacity;
        seen.toOpacity = frames[frames.length - 1]?.opacity;
        seen.startOpacity = el.style.opacity;
        seen.segmentCount = (seen.segmentCount ?? 0) + 1;
        seen.durations!.push(opts.duration);
        const wait = Math.max(0, Number(opts.duration) + Number(opts.delay ?? 0));
        return {
          finished: new Promise<void>((r) => setTimeout(r, wait)),
          cancel() {},
        };
      },
    };
    return { el, seen };
  }

  it("plays both lanes for the pair duration (not a fixed 800ms cap)", async () => {
    vi.useFakeTimers();
    const incoming = fakeLane();
    const outgoing = fakeLane();
    let done = false;
    playPresentationMotion(
      incoming.el as never,
      outgoing.el as never,
      {
        incoming: { translateX: 390 },
        outgoing: { translateX: 0, opacity: 0 },
        duration: 2000,
        ease: "in",
        front: ".outgoing",
      },
      { onDone: () => { done = true; } },
    );
    expect(incoming.seen.duration).toBe(2000);
    expect(outgoing.seen.duration).toBe(2000);
    expect(incoming.seen.easing).toBe("ease-in");
    expect(outgoing.seen.easing).toBe("ease-in");
    // Pose sugar: start at authored pose, key to .rest
    expect(outgoing.seen.fromOpacity).toBe("0");
    expect(outgoing.seen.toOpacity).toBe("1");
    await vi.advanceTimersByTimeAsync(900);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1300);
    expect(done).toBe(true);
    vi.useRealTimers();
  });

  it("animates incoming opacity from the start pose (toRest)", () => {
    const incoming = fakeLane();
    const outgoing = fakeLane();
    playPresentationMotion(incoming.el as never, outgoing.el as never, {
      kind: "presentationMotion",
      incoming: { kind: "pose", translateX: -48, opacity: 0.86 },
      outgoing: { kind: "pose", translateX: 390 },
      duration: 100,
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
        duration: 50,
        ease: "linear",
      },
      { defaultFront: "outgoing" },
    );
    expect(incoming.seen.front).toBe(false);
    expect(outgoing.seen.front).toBe(true);
  });

  it("plays a multi-key incoming Animation and a Pose outgoing", async () => {
    vi.useFakeTimers();
    const incoming = fakeLane();
    const outgoing = fakeLane();
    playPresentationMotion(incoming.el as never, outgoing.el as never, {
      kind: "presentationMotion",
      incoming: {
        kind: "animation",
        start: { translateX: 390, opacity: 0 },
        keys: [
          { timing: { duration: 264, ease: "out", delay: 0 }, pose: { translateX: 40 } },
          { timing: { duration: 216, ease: "out", delay: 0 }, pose: "rest" },
        ],
      },
      outgoing: { kind: "pose", translateX: -48, opacity: 0.86 },
      duration: 320,
      ease: "in",
    });
    expect(incoming.seen.startOpacity).toBe("0");
    expect(incoming.seen.fromOpacity).toBe("0");
    expect(outgoing.seen.duration).toBe(320);
    expect(outgoing.seen.segmentCount).toBe(1);
    await vi.advanceTimersByTimeAsync(264);
    expect(incoming.seen.segmentCount).toBe(2);
    expect(incoming.seen.durations).toEqual([264, 216]);
    vi.useRealTimers();
  });

  it("animates a start+keys incoming Animation", () => {
    const incoming = fakeLane();
    const outgoing = fakeLane();
    playPresentationMotion(incoming.el as never, outgoing.el as never, {
      incoming: {
        kind: "animation",
        start: { opacity: 0 },
        keys: [{ timing: { duration: 200, ease: "linear", delay: 0 }, pose: "rest" }],
      },
      outgoing: { kind: "pose", translateX: 0 },
      duration: 200,
      ease: "linear",
    });
    expect(incoming.seen.segmentCount).toBe(1);
    expect(incoming.seen.duration).toBe(200);
    expect(incoming.seen.startOpacity).toBe("0");
  });

  it("flips front at switchAt on a keyed incoming", async () => {
    vi.useFakeTimers();
    const incoming = fakeLane();
    const outgoing = fakeLane();
    playPresentationMotion(incoming.el as never, outgoing.el as never, {
      incoming: {
        kind: "animation",
        start: { translateX: 390 },
        keys: [{ timing: { duration: 80, ease: "linear", delay: 0 }, pose: "rest" }],
      },
      outgoing: { kind: "pose", translateX: -48 },
      duration: 80,
      ease: "linear",
      front: ".outgoing",
      switchAt: 40,
    });
    expect(incoming.seen.front).toBe(false);
    expect(outgoing.seen.front).toBe(true);
    await vi.advanceTimersByTimeAsync(40);
    expect(incoming.seen.front).toBe(true);
    expect(outgoing.seen.front).toBe(false);
    await vi.advanceTimersByTimeAsync(80);
    vi.useRealTimers();
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
