import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PdlError } from "../src/errors.js";
import { loadDesign } from "../src/loadDesign.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fx = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl", ...p);

function expectLoadFails(code: string, file: string, msg: RegExp): void {
  try {
    loadDesign(fx(file));
  } catch (e) {
    expect(e).toBeInstanceOf(PdlError);
    expect((e as PdlError).code).toBe(code);
    expect((e as PdlError).message).toMatch(msg);
    return;
  }
  throw new Error(`expected loadDesign(${file}) to throw ${code}`);
}

describe("validateMergedDesign (if conditions)", () => {
  it("PDL-E007 when condition names an unknown parameter", () => {
    expectLoadFails("PDL-E007", "errors/legacy/e07-if-unknown-param.pdl", /layoutMode/);
  });

  it("PDL-E010 when condition uses a non-variant parameter", () => {
    expectLoadFails("PDL-E010", "errors/legacy/e10-if-non-variant-param.pdl", /non-variant/);
  });

  it("PDL-E010 when variant case is not declared on the parameter's variant type", () => {
    expectLoadFails("PDL-E010", "errors/legacy/e10-if-unknown-variant-case.pdl", /bogus/);
  });

  it("PDL-E012 when `hidden` is used on a non-layout frame", () => {
    expectLoadFails("PDL-E012", "errors/legacy/e12-hidden-on-text.pdl", /layout/);
  });

  it("PDL-E021 when two `let` frames reuse the same id anywhere in the component body", () => {
    expectLoadFails("PDL-E021", "errors/legacy/e021-duplicate-let-frame-id.pdl", /Dup/);
  });
});

describe("validateMergedDesign (motion)", () => {
  it("PDL-E005 when Motion stagger has no pose or keys", () => {
    expectLoadFails(
      "PDL-E005",
      "errors/e005-motion-stagger-without-pose.pdl",
      /stagger:.*requires `pose:` or `keys:`/,
    );
  });

  it("PDL-E005 when Motion has both pose and keys", () => {
    expectLoadFails(
      "PDL-E005",
      "errors/e005-motion-pose-and-keys.pdl",
      /both `pose:` and `keys:`/,
    );
  });

  it("PDL-E005 when .loop also sets repeat", () => {
    expectLoadFails(
      "PDL-E005",
      "errors/e005-motion-loop-with-repeat.pdl",
      /play: \.loop/,
    );
  });

  it("PDL-E005 when repeat has no pose track", () => {
    expectLoadFails(
      "PDL-E005",
      "errors/e005-motion-repeat-without-path.pdl",
      /repeat:.*requires `pose:` or `keys:`/,
    );
  });

  it("PDL-E005 when Key at is out of range", () => {
    expectLoadFails("PDL-E005", "errors/e005-motion-key-at-range.pdl", /at:.*0…1/);
  });

  it("parses keys, play, and pose on hover", () => {
    const design = loadDesign(fx("lab/motion/design.pdl"));
    expect(design.components.has("MotionHoverFlourish")).toBe(true);
    expect(design.components.has("MotionHoverPop")).toBe(true);
    expect(design.components.has("MotionHoverPopOverride")).toBe(true);
  });

  it("PDL-E006 when frame animate is not a Motion", () => {
    expectLoadFails(
      "PDL-E006",
      "errors/e006-frame-animate-not-motion.pdl",
      /property `animate`/,
    );
  });

  it("PDL-E005 when Motion copy base is not a Motion token", () => {
    expectLoadFails(
      "PDL-E005",
      "errors/e005-motion-override-not-motion.pdl",
      /copy base must be a Motion token/,
    );
  });

  it("PDL-E005 when Motion(token, pose:) conflicts with token keys", () => {
    expectLoadFails(
      "PDL-E005",
      "errors/e005-motion-override-pose-and-keys.pdl",
      /both `pose:` and `keys:`/,
    );
  });

  it("PDL-E001 when Timing is written as a naked tuple", () => {
    expectLoadFails(
      "PDL-E001",
      "errors/e001-timing-tuple.pdl",
      /Timing\(duration:, ease:/,
    );
  });

  it("PDL-E005 when Ease is a CSS string", () => {
    expectLoadFails(
      "PDL-E005",
      "errors/e005-ease-css.pdl",
      /Ease\.bezier|\.linear/,
    );
  });

  it("PDL-E005 when Ease.bezier x is outside 0…1", () => {
    expectLoadFails(
      "PDL-E005",
      "errors/e005-ease-bezier-x.pdl",
      /Ease\.bezier x2 must be 0…1 \(got -1\)/,
    );
  });
});

describe("validateMergedDesign (effect)", () => {
  it("PDL-E005 when blur and effect are both set", () => {
    expectLoadFails("PDL-E005", "errors/e005-blur-and-effect.pdl", /same slot/);
  });

  it("PDL-E005 when Effect(.glass) is used", () => {
    expectLoadFails("PDL-E005", "errors/e005-effect-glass.pdl", /not implemented/);
  });

  it("PDL-E006 when Effect is used as a fill", () => {
    expectLoadFails("PDL-E006", "errors/e006-effect-in-background.pdl", /not a layer/);
  });

  it("PDL-E001 when Effect is used as a child", () => {
    expectLoadFails("PDL-E001", "errors/e001-effect-as-child.pdl", /not a child/);
  });

  it("loads the effect lab", () => {
    const design = loadDesign(fx("lab/effect/design.pdl"));
    expect(design.components.has("EffectSelfBlur")).toBe(true);
    expect(design.components.has("EffectFrostPane")).toBe(true);
    expect(design.primitives.get("effect.frost")?.tokenType).toBe("Effect");
  });
});
