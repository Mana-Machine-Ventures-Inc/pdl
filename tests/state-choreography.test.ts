import { describe, expect, it } from "vitest";
import {
  collectAnimationFromHandlerItems,
  specFromEvaluated,
} from "../src/applyMotion.js";
import {
  landTimingToCss,
  sessionLandCss,
  splitChoreographySpec,
} from "../src/stateChoreography.js";
import type { InteractionHandlerItem } from "../src/valueJson.js";

describe("splitChoreographySpec", () => {
  it("splits flourish keys from a trailing .rest land", () => {
    const split = splitChoreographySpec({
      kind: "animation",
      keys: [
        {
          timing: { duration: 90, ease: "out", delay: 0 },
          pose: { scale: 1.12 },
        },
        {
          timing: { duration: 200, ease: "out", delay: 0 },
          pose: "rest",
        },
      ],
    });
    expect(split.isLand).toBe(true);
    expect(split.flourish?.keys).toHaveLength(1);
    expect(split.flourish?.keys?.[0]?.pose).toEqual({ scale: 1.12 });
    expect(split.landTiming?.duration).toBe(200);
    expect(landTimingToCss(split.landTiming!)).toContain("200ms");
  });

  it("treats clock-only Motion land flag as land with no flourish", () => {
    const split = splitChoreographySpec({
      kind: "animation",
      land: true,
      keys: [
        {
          timing: { duration: 220, ease: "out", delay: 0 },
          pose: "rest",
        },
      ],
    });
    expect(split.isLand).toBe(true);
    expect(split.flourish).toBeNull();
    expect(split.landTiming?.duration).toBe(220);
  });

  it("does not treat non-rest Animation as land", () => {
    const split = splitChoreographySpec({
      kind: "animation",
      keys: [
        {
          timing: { duration: 100, ease: "out", delay: 0 },
          pose: { scale: 1.1 },
        },
      ],
    });
    expect(split.isLand).toBe(false);
  });

  it("sessionLandCss ignores flourish duration (parallel with land)", () => {
    const css = sessionLandCss({
      first: {},
      tracks: [
        {
          flourish: {
            kind: "animation",
            keys: [{ timing: { duration: 400, ease: "out", delay: 0 }, pose: { scale: 1.2 } }],
          },
          landTiming: { duration: 200, easing: "ease-out", delay: 0 },
        },
      ],
    });
    expect(css).toContain("200ms");
    expect(css).not.toContain("400ms");
  });
});

describe("specFromEvaluated Motion land sugar", () => {
  it("desugars Motion to Animation(keys, land)", () => {
    const spec = specFromEvaluated({
      kind: "motion",
      timing: { duration: 220, ease: "out" },
      pose: "rest",
    });
    expect(spec?.land).toBe(true);
    expect(spec?.keys).toHaveLength(1);
    expect(spec?.keys?.[0]?.pose).toBe("rest");
  });
});

describe("collectAnimationFromHandlerItems land", () => {
  it("collects clock-only Motion animate as land", () => {
    const items: InteractionHandlerItem[] = [
      {
        kind: "animate",
        value: {
          kind: "motion",
          timing: {
            kind: "timing",
            duration: { kind: "number", value: 220 },
            ease: { kind: "dotEnum", value: ".out" },
          },
          pose: { kind: "dotEnum", value: ".rest" },
        },
      },
    ];
    const spec = collectAnimationFromHandlerItems(items);
    expect(spec?.land).toBe(true);
    expect(spec?.keys?.[0]?.pose).toBe("rest");
  });
});
