import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBakedDesignComponent } from "../src/bakeDesign.js";
import { buildComponentCatalogue, interactionsByComponentFromDesign } from "../src/catalogue.js";
import { loadDesign } from "../src/loadDesign.js";
import { renderBakedDesignToHtmlDocument } from "../src/renderHtml.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fx = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl", ...p);

describe("HTML preview motion", () => {
  it("catalogue evaluates Transition and from/to snapshots", () => {
    const design = loadDesign(fx("lab/motion/design.pdl"));
    const cat = buildComponentCatalogue(design);
    const modal = cat.components.MotionModal!;
    const handlers = (modal.interactions?.[0] as { handlers: Array<Record<string, unknown>> })
      .handlers;
    const appear = handlers.find((h) => h.event === "appear") as {
      motion: {
        transition: { duration: number; easing: string; delay: number };
        from: Record<string, number>;
      };
    };
    expect(appear.motion.transition.duration).toBe(250);
    expect(appear.motion.transition.easing).toContain("cubic-bezier");
    expect(appear.motion.from).toEqual({ opacity: 0, scale: 0.95, translateY: 8 });
    const list = cat.components.MotionStaggerList!;
    const listAppear = (
      list.interactions?.[0] as { handlers: Array<{ event: string; motion?: { stagger?: number } }> }
    ).handlers.find((h) => h.event === "appear");
    expect(listAppear?.motion?.stagger).toBe(40);
  });

  it("HTML host includes Replay motion and WAAPI helpers", () => {
    const design = loadDesign(fx("lab/motion/design.pdl"));
    const cat = buildComponentCatalogue(design);
    const interactionsByComponent: Record<string, unknown> = {};
    for (const [name, row] of Object.entries(cat.components)) {
      if (row.interactions?.length) interactionsByComponent[name] = row.interactions;
    }
    const doc = buildBakedDesignComponent(design, { componentName: "MotionModal" });
    const html = renderBakedDesignToHtmlDocument(doc, {
      singleComponent: "MotionModal",
      interactionsByComponent,
      interactiveHost: true,
    });
    expect(html).toContain('data-pdl-motion="1"');
    expect(html).toContain("Replay motion");
    expect(html).toContain("playMotionTree");
    expect(html).toContain("applyImplicitTransition");
    expect(html).toContain("motionFromHandler");
    expect(html).toContain('"from":{"opacity":0');
  });

  it("playground enrich payload includes evaluated motion", () => {
    const design = loadDesign(fx("lab/motion/design.pdl"));
    const ix = interactionsByComponentFromDesign(design);
    const appear = (
      ix.MotionModal as Array<{ handlers: Array<{ event: string; motion?: { from?: unknown } }> }>
    )[0]!.handlers.find((h) => h.event === "appear");
    expect(appear?.motion?.from).toEqual({ opacity: 0, scale: 0.95, translateY: 8 });
  });

  it("HTML host still plays appear when catalogue omitted the motion key", () => {
    const design = loadDesign(fx("lab/motion/design.pdl"));
    const cat = buildComponentCatalogue(design);
    const interactionsByComponent: Record<string, unknown> = {};
    for (const [name, row] of Object.entries(cat.components)) {
      if (!row.interactions?.length) continue;
      interactionsByComponent[name] = (row.interactions as Array<{ handlers: Array<Record<string, unknown>> }>).map(
        (d) => ({
          ...d,
          handlers: d.handlers.map(({ motion: _m, ...h }) => h),
        }),
      );
    }
    const doc = buildBakedDesignComponent(design, { componentName: "MotionModal" });
    const html = renderBakedDesignToHtmlDocument(doc, {
      singleComponent: "MotionModal",
      interactionsByComponent,
      interactiveHost: true,
    });
    expect(html).toContain("Replay motion");
    expect(html).toContain('"kind":"from"');
    expect(html).toContain("motionFromHandler");
  });
});
