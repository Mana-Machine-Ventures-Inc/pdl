import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildResolvedTokenMap } from "../src/evaluate.js";
import { loadDesign } from "../src/loadDesign.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ENTRY = resolve(__dirname, "../test-fixtures/pdl/lab/nav/reversed_ease.pdl");

function tokens() {
  return buildResolvedTokenMap(loadDesign(ENTRY));
}

describe("PresentationMotion .reversed ease", () => {
  it("flips pair .out to .in and leaves delay", () => {
    const t = tokens();
    const fwd = t.get("motion.slideOut") as {
      ease?: string;
      delay?: number;
      front?: string;
    };
    const back = t.get("motion.slideIn") as {
      ease?: string;
      delay?: number;
      front?: string;
      incoming?: { keys?: Array<{ pose?: { translateX?: number } }> };
      outgoing?: { start?: { translateX?: number } };
    };
    expect(fwd.ease).toBe("out");
    expect(back.ease).toBe("in");
    expect(back.delay).toBe(40);
    expect(back.incoming?.keys?.[0]?.pose?.translateX).toBe(-48);
    expect(back.outgoing?.start?.translateX).toBe(390);
    expect(back.front).toBe(".outgoing");
  });

  it("time-reverses Ease.bezier control points", () => {
    const t = tokens();
    const fwd = t.get("motion.material") as {
      ease?: { kind?: string; x1?: number; y1?: number; x2?: number; y2?: number };
    };
    const back = t.get("motion.materialBack") as typeof fwd;
    expect(fwd.ease).toEqual({ kind: "easeBezier", x1: 0.2, y1: 0, x2: 0, y2: 1 });
    expect(back.ease).toEqual({ kind: "easeBezier", x1: 1, y1: 0, x2: 0.8, y2: 1 });
  });

  it("flips Animation slot clocks after the sides swap", () => {
    const t = tokens();
    const back = t.get("motion.slotClocksBack") as {
      incoming?: { keys?: Array<{ timing?: { ease?: string }; pose?: { opacity?: number } }> };
      outgoing?: { keys?: Array<{ timing?: { ease?: string }; pose?: { translateX?: number } }> };
      front?: string;
    };
    expect(back.incoming?.keys?.[0]?.pose?.opacity).toBe(0);
    expect(back.outgoing?.keys?.[0]?.pose?.translateX).toBe(40);
    expect(back.incoming?.keys?.[0]?.timing?.ease).toBe("out");
    expect(back.outgoing?.keys?.[0]?.timing?.ease).toBe("in");
    expect(back.front).toBe(".incoming");
  });

  it("keeps .linear", () => {
    const t = tokens();
    const back = t.get("motion.holdLinearBack") as { ease?: string };
    expect(back.ease).toBe("linear");
  });

  it("keeps front and inverts switchAt", () => {
    const t = tokens();
    const fwd = t.get("motion.cardSwap") as {
      front?: string;
      switchAt?: number;
    };
    const back = t.get("motion.cardSwapBack") as {
      front?: string;
      switchAt?: number;
      incoming?: { keys?: Array<{ pose?: { translateX?: number } }> };
      outgoing?: { start?: { translateX?: number } };
    };
    expect(fwd.front).toBe("outgoing");
    expect(fwd.switchAt).toBe(144);
    expect(back.incoming?.keys?.[0]?.pose?.translateX).toBe(36);
    expect(back.outgoing?.start?.translateX).toBe(-36);
    expect(back.front).toBe("outgoing");
    expect(back.switchAt).toBe(336);
  });

  it("does not reverse Animation key lists", () => {
    const t = tokens();
    type Keyed = {
      front?: string;
      switchAt?: number;
      ease?: string;
      incoming?: {
        kind?: string;
        start?: { translateX?: number };
        keys?: Array<{ timing?: { ease?: string }; pose?: { translateX?: number } | string }>;
      };
      outgoing?: {
        kind?: string;
        start?: { translateX?: number };
        keys?: Array<{ timing?: { ease?: string }; pose?: { translateX?: number } | string }>;
      };
    };
    const fwd = t.get("motion.cardToss") as Keyed;
    const back = t.get("motion.cardTossBack") as Keyed;
    expect(fwd.incoming?.keys).toHaveLength(2);
    expect(fwd.incoming?.keys?.[0]?.timing?.ease).toBe("out");
    expect(fwd.incoming?.start?.translateX).toBe(390);
    expect(back.incoming?.keys?.[0]?.pose).toMatchObject({ translateX: -48, opacity: 0.86 });
    expect(back.outgoing?.keys?.[0]?.timing?.ease).toBe("in");
    expect(back.outgoing?.keys).toHaveLength(2);
    expect(back.outgoing?.start?.translateX).toBe(390);
    expect(back.front).toBe("outgoing");
    expect(back.switchAt).toBe(336);
  });

  it("evaluates n8_keys cardToss Animation keys", () => {
    const design = loadDesign(resolve(__dirname, "../test-fixtures/pdl/lab/nav/n8_keys.pdl"));
    const toss = buildResolvedTokenMap(design).get("motion.cardToss") as {
      incoming?: { keys?: unknown[]; start?: unknown };
      outgoing?: { keys?: unknown[] };
    };
    expect(toss.incoming?.start).toBeTruthy();
    expect(toss.incoming?.keys).toHaveLength(2);
    expect(toss.outgoing?.keys).toHaveLength(2);
  });
});
