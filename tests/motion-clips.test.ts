import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBakedDesignComponent } from "../src/bakeDesign.js";
import { buildComponentCatalogue } from "../src/catalogue.js";
import { collectMotionClips, motionClipLabel } from "../src/motionClips.js";
import { loadDesign } from "../src/loadDesign.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fx = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl", ...p);

describe("motion clips", () => {
  it("labels lifecycle and pointer events", () => {
    expect(motionClipLabel("appear")).toBe("Appear");
    expect(motionClipLabel("dismiss")).toBe("Dismiss");
    expect(motionClipLabel("hoverStart")).toBe("Hover start");
    expect(motionClipLabel("pressEnd")).toBe("Release");
  });

  it("collects one clip per animating handler, grouped by instance", () => {
    const design = loadDesign(fx("lab/motion/design.pdl"));
    const cat = buildComponentCatalogue(design);
    const interactionsByComponent: Record<string, unknown> = {};
    for (const [name, row] of Object.entries(cat.components)) {
      if (row.interactions?.length) interactionsByComponent[name] = row.interactions;
    }
    const bake = buildBakedDesignComponent(design, { componentName: "MotionLab" });
    const clips = collectMotionClips(
      "MotionLab",
      interactionsByComponent,
      bake.components.MotionLab?.root?.children,
    );
    expect(clips.map((c) => `${c.groupLabel}:${c.event}`)).toEqual([
      "modal:appear",
      "modal:dismiss",
      "list:appear",
      "blur:appear",
      "blur:dismiss",
      "chip:hoverStart",
      "chip:hoverEnd",
    ]);
  });

  it("MotionPoseLab exposes one Appear/Dismiss pair per Pose field", () => {
    const design = loadDesign(fx("lab/motion/design.pdl"));
    const cat = buildComponentCatalogue(design);
    const interactionsByComponent: Record<string, unknown> = {};
    for (const [name, row] of Object.entries(cat.components)) {
      if (row.interactions?.length) interactionsByComponent[name] = row.interactions;
    }
    const bake = buildBakedDesignComponent(design, { componentName: "MotionPoseLab" });
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
    ]);
  });
});
