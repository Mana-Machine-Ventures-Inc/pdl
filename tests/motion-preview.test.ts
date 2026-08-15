import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBakedDesignComponent, buildBakedDesignSystem } from "../src/bakeDesign.js";
import { buildComponentCatalogue, interactionsByComponentFromDesign } from "../src/catalogue.js";
import { loadDesign } from "../src/loadDesign.js";
import { renderBakedDesignToHtmlDocument } from "../src/renderHtml.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fx = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl", ...p);

describe("HTML preview motion", () => {
  it("catalogue evaluates Motion pose snapshots", () => {
    const design = loadDesign(fx("lab/motion/design.pdl"));
    const cat = buildComponentCatalogue(design);
    const modal = cat.components.MotionModal!;
    const handlers = (modal.interactions?.[0] as { handlers: Array<Record<string, unknown>> })
      .handlers;
    const appear = handlers.find((h) => h.event === "appear") as {
      motion: {
        transition: { duration: number; easing: string; delay: number };
        pose: Record<string, number>;
      };
    };
    expect(appear.motion.transition.duration).toBe(250);
    expect(appear.motion.transition.easing).toBe("ease-out");
    expect(appear.motion.pose).toEqual({ opacity: 0, scale: 0.95, translateY: 8 });
    const list = cat.components.MotionStaggerList!;
    const listAppear = (
      list.interactions?.[0] as { handlers: Array<{ event: string; motion?: { stagger?: number } }> }
    ).handlers.find((h) => h.event === "appear");
    expect(listAppear?.motion?.stagger).toBe(40);
    expect(listAppear?.motion?.staggerFrom).toBe("last");
    const blurCard = cat.components.MotionBlurCard!;
    const blurAppear = (
      blurCard.interactions?.[0] as {
        handlers: Array<{ event: string; motion?: { pose?: Record<string, number> } }>;
      }
    ).handlers.find((h) => h.event === "appear");
    expect(blurAppear?.motion?.pose).toEqual({ blur: 18, opacity: 0.35 });
    const poseOf = (name: string) => {
      const row = cat.components[name]!;
      return (
        row.interactions?.[0] as {
          handlers: Array<{ event: string; motion?: { pose?: Record<string, number> } }>;
        }
      ).handlers.find((h) => h.event === "appear")?.motion?.pose;
    };
    expect(poseOf("MotionPoseOpacity")).toEqual({ opacity: 0 });
    expect(poseOf("MotionPoseScale")).toEqual({ scale: 0.5 });
    expect(poseOf("MotionPoseScaleX")).toEqual({ scaleX: 0.2 });
    expect(poseOf("MotionPoseScaleY")).toEqual({ scaleY: 0.2 });
    expect(poseOf("MotionPoseTranslateX")).toEqual({ translateX: 48 });
    expect(poseOf("MotionPoseTranslateY")).toEqual({ translateY: 24 });
    expect(poseOf("MotionPoseBlur")).toEqual({ blur: 16 });
    expect(poseOf("MotionPoseRotate")).toEqual({ rotate: -12 });
    const flourish = (
      cat.components.MotionHoverFlourish!.interactions?.[0] as {
        handlers: Array<{
          event: string;
          motion?: { play?: string; keys?: Array<{ at: number; pose?: unknown }> };
        }>;
      }
    ).handlers.find((h) => h.event === "hoverStart");
    expect(flourish?.motion?.play).toBe("toRest");
    expect(flourish?.motion?.keys).toHaveLength(3);
    expect(flourish?.motion?.keys?.[2]?.at).toBe(1);
    const flourishEnd = (
      cat.components.MotionHoverFlourish!.interactions?.[0] as {
        handlers: Array<{ event: string; motion?: { play?: string } }>;
      }
    ).handlers.find((h) => h.event === "hoverEnd");
    expect(flourishEnd?.motion?.play).toBe("toRest");
    const popOf = (name: string, event: string) =>
      (
        cat.components[name]!.interactions?.[0] as {
          handlers: Array<{ event: string; motion?: { play?: string; keys?: unknown[] } }>;
        }
      ).handlers.find((h) => h.event === event)?.motion;
    expect(popOf("MotionHoverPop", "hoverStart")?.play).toBe("toPose");
    expect(popOf("MotionHoverPop", "hoverEnd")?.play).toBe("toRest");
    expect(popOf("MotionHoverPop", "hoverStart")?.keys).toHaveLength(2);
    expect(popOf("MotionHoverPopOverride", "hoverStart")?.play).toBe("toPose");
    expect(popOf("MotionHoverPopOverride", "hoverEnd")?.play).toBe("toRest");
    const modalAppear = (
      cat.components.MotionModal!.interactions?.[0] as {
        handlers: Array<{ event: string; motion?: { play?: string } }>;
      }
    ).handlers.find((h) => h.event === "appear");
    const modalDismiss = (
      cat.components.MotionModal!.interactions?.[0] as {
        handlers: Array<{ event: string; motion?: { play?: string } }>;
      }
    ).handlers.find((h) => h.event === "dismiss");
    expect(modalAppear?.motion?.play).toBe("toRest");
    expect(modalDismiss?.motion?.play).toBe("toPose");
    const chipHover = (
      cat.components.MotionHoverChip!.interactions?.[0] as {
        handlers: Array<{ event: string; motion?: { play?: string; transition?: unknown } }>;
      }
    ).handlers.find((h) => h.event === "hoverStart");
    expect(chipHover?.motion?.play).toBeUndefined();
    expect(chipHover?.motion?.transition).toBeTruthy();
  });

  it("HTML host includes motion transport and WAAPI helpers", () => {
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
    expect(html).toContain("data-pdl-motion-reset");
    expect(html).toContain('data-pdl-motion-clip');
    expect(html).toContain('data-event="appear"');
    expect(html).toContain('data-event="dismiss"');
    expect(html).toContain("data-pdl-motion-slowmo");
    expect(html).toContain(">Reset<");
    expect(html).toContain(">Appear<");
    expect(html).toContain(">Dismiss<");
    expect(html).toContain("Slow-mo");
    expect(html).toContain("playMotionTree");
    expect(html).toContain("holdMotionTree");
    expect(html).toContain("holdAppearFrom");
    expect(html).toContain("playAppearWhenVisible");
    expect(html).toContain("motionTimeScale");
    expect(html).toContain("applyImplicitTransition");
    expect(html).toContain("motionFromHandler");
    expect(html).toContain("syncStandingUnder");
    expect(html).toContain("poseTrackFrames");
    expect(html).toContain("reverseInFlight");
    expect(html).toContain("playReturnToRest");
    expect(html).toContain('"pose":{"opacity":0');
  });

  it("bakes data-pdl-animate on a standing spinner", () => {
    const design = loadDesign(fx("lab/motion/design.pdl"));
    const doc = buildBakedDesignComponent(design, {
      componentName: "MotionStandingSpin",
      paramOverrides: { isLoading: true },
    });
    const html = renderBakedDesignToHtmlDocument(doc, {
      singleComponent: "MotionStandingSpin",
      interactiveHost: true,
    });
    expect(html).toContain("data-pdl-animate");
    expect(html).toMatch(/play(?:&quot;|")\s*:\s*(?:&quot;|")loop/);
    expect(html).toMatch(/rotate(?:&quot;|")\s*:\s*360/);
  });

  it("hover-only components get Hover start / Hover end clips", () => {
    const design = loadDesign(fx("lab/motion/design.pdl"));
    const cat = buildComponentCatalogue(design);
    const interactionsByComponent: Record<string, unknown> = {};
    for (const [name, row] of Object.entries(cat.components)) {
      if (row.interactions?.length) interactionsByComponent[name] = row.interactions;
    }
    const doc = buildBakedDesignComponent(design, { componentName: "MotionHoverChip" });
    const html = renderBakedDesignToHtmlDocument(doc, {
      singleComponent: "MotionHoverChip",
      interactionsByComponent,
      interactiveHost: true,
    });
    expect(html).toContain('data-event="hoverStart"');
    expect(html).toContain('data-event="hoverEnd"');
    expect(html).toContain(">Hover start<");
    expect(html).toContain(">Hover end<");
    expect(html).not.toContain('data-event="appear"');
  });

  it("playground enrich payload includes evaluated motion", () => {
    const design = loadDesign(fx("lab/motion/design.pdl"));
    const ix = interactionsByComponentFromDesign(design);
    const appear = (
      ix.MotionModal as Array<{ handlers: Array<{ event: string; motion?: { pose?: unknown } }> }>
    )[0]!.handlers.find((h) => h.event === "appear");
    expect(appear?.motion?.pose).toEqual({ opacity: 0, scale: 0.95, translateY: 8 });
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
    expect(html).toContain("data-pdl-motion-clip");
    expect(html).toContain('"kind":"motion"');
    expect(html).toContain("motionFromHandler");
  });

  it("device hostChrome still shows motion transport when appear/dismiss is registered", () => {
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
      hostChrome: "device",
    });
    expect(html).toContain("data-pdl-motion-clip");
    expect(html).toContain("Slow-mo");
    expect(html).toContain('data-pdl-motion="1"');
    expect(html).toContain("body.pdl-device-stage .pdl-motion-bar");
    expect(html).not.toMatch(/body\.pdl-device-stage \.pdl-motion-bar\s*\{[^}]*display:\s*none/);
  });

  it("Play applies Stagger(from: .last) so the last row starts first", async () => {
    const { Window } = await import("happy-dom");
    const design = loadDesign(fx("lab/motion/design.pdl"));
    const cat = buildComponentCatalogue(design);
    const interactionsByComponent: Record<string, unknown> = {};
    for (const [name, row] of Object.entries(cat.components)) {
      if (row.interactions?.length) interactionsByComponent[name] = row.interactions;
    }
    const bake = buildBakedDesignComponent(design, { componentName: "MotionStaggerList" });
    const html = renderBakedDesignToHtmlDocument(bake, {
      singleComponent: "MotionStaggerList",
      interactionsByComponent,
      interactiveHost: true,
    });
    const window = new Window({ url: "http://localhost/" });
    const delays: { let: string | null; delay: number; fill?: string }[] = [];
    (window.HTMLElement.prototype as unknown as {
      animate: (k: unknown, o: { delay?: number; fill?: string }) => object;
    }).animate = function (this: Element, _k: unknown, opts: { delay?: number; fill?: string }) {
      delays.push({
        let: this.getAttribute("data-pdl-instance-let"),
        delay: Number(opts?.delay ?? 0),
        fill: opts?.fill,
      });
      return { finished: Promise.resolve(), cancel() {} };
    };
    window.document.write(html);
    window.document.close();
    window.document.querySelectorAll("[data-pdl-listening]").forEach((n) => {
      n.removeAttribute("data-pdl-listening");
    });
    for (const s of [...window.document.querySelectorAll("script")]) {
      window.eval(s.textContent || "");
    }
    await new Promise((r) => setTimeout(r, 20));
    const play = window.document.querySelector('[data-pdl-motion-clip][data-event="appear"]');
    expect(play).toBeTruthy();
    play!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await new Promise((r) => setTimeout(r, 20));
    const byLet = Object.fromEntries(delays.filter((d) => d.let).map((d) => [d.let, d.delay]));
    expect(byLet).toMatchObject({ a: 80, b: 40, c: 0 });
    expect(delays.filter((d) => d.let).every((d) => d.fill === "both")).toBe(true);
  });

  it("Play still honors body Stagger(from: .last) when catalogue omitted staggerFrom", async () => {
    const { Window } = await import("happy-dom");
    const design = loadDesign(fx("lab/motion/design.pdl"));
    const cat = buildComponentCatalogue(design);
    const interactionsByComponent: Record<string, unknown> = {};
    for (const [name, row] of Object.entries(cat.components)) {
      if (!row.interactions?.length) continue;
      interactionsByComponent[name] = (
        row.interactions as Array<{ handlers: Array<Record<string, unknown>> }>
      ).map((d) => ({
        ...d,
        handlers: d.handlers.map((h) => {
          const motion = h.motion && typeof h.motion === "object" ? { ...(h.motion as object) } : h.motion;
          if (motion && typeof motion === "object" && "staggerFrom" in motion) {
            delete (motion as { staggerFrom?: string }).staggerFrom;
          }
          return { ...h, motion };
        }),
      }));
    }
    const bake = buildBakedDesignComponent(design, { componentName: "MotionStaggerList" });
    const html = renderBakedDesignToHtmlDocument(bake, {
      singleComponent: "MotionStaggerList",
      interactionsByComponent,
      interactiveHost: true,
    });
    const window = new Window({ url: "http://localhost/" });
    const delays: { let: string | null; delay: number }[] = [];
    (window.HTMLElement.prototype as unknown as { animate: (k: unknown, o: { delay?: number }) => object }).animate =
      function (this: Element, _k: unknown, opts: { delay?: number }) {
        delays.push({
          let: this.getAttribute("data-pdl-instance-let"),
          delay: Number(opts?.delay ?? 0),
        });
        return { finished: Promise.resolve(), cancel() {} };
      };
    window.document.write(html);
    window.document.close();
    window.document.querySelectorAll("[data-pdl-listening]").forEach((n) => {
      n.removeAttribute("data-pdl-listening");
    });
    for (const s of [...window.document.querySelectorAll("script")]) {
      window.eval(s.textContent || "");
    }
    await new Promise((r) => setTimeout(r, 20));
    window.document
      .querySelector('[data-pdl-motion-clip][data-event="appear"]')!
      .dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await new Promise((r) => setTimeout(r, 20));
    const byLet = Object.fromEntries(delays.filter((d) => d.let).map((d) => [d.let, d.delay]));
    expect(byLet).toMatchObject({ a: 80, b: 40, c: 0 });
  });

  it("Slow-mo scales only the preview card that owns the toggle", async () => {
    const { Window } = await import("happy-dom");
    const design = loadDesign(fx("lab/motion/design.pdl"));
    const cat = buildComponentCatalogue(design);
    const interactionsByComponent: Record<string, unknown> = {};
    for (const [name, row] of Object.entries(cat.components)) {
      if (row.interactions?.length) interactionsByComponent[name] = row.interactions;
    }
    const bake = buildBakedDesignSystem(design);
    const html = renderBakedDesignToHtmlDocument(bake, {
      interactionsByComponent,
      interactiveHost: true,
    });
    const window = new Window({ url: "http://localhost/" });
    const plays: { component: string | null; duration: number }[] = [];
    (window.HTMLElement.prototype as unknown as {
      animate: (k: unknown, o: { duration?: number }) => object;
    }).animate = function (this: Element, _k: unknown, opts: { duration?: number }) {
      const section = this.closest("section.pdl-preview");
      plays.push({
        component: section?.getAttribute("data-pdl-component") ?? null,
        duration: Number(opts?.duration ?? 0),
      });
      return { finished: Promise.resolve(), cancel() {} };
    };
    window.document.write(html);
    window.document.close();
    window.document.querySelectorAll("[data-pdl-listening]").forEach((n) => {
      n.removeAttribute("data-pdl-listening");
    });
    for (const s of [...window.document.querySelectorAll("script")]) {
      window.eval(s.textContent || "");
    }
    await new Promise((r) => setTimeout(r, 20));
    const modal = window.document.querySelector('section.pdl-preview[data-pdl-component="MotionModal"]')!;
    const list = window.document.querySelector('section.pdl-preview[data-pdl-component="MotionStaggerList"]')!;
    modal.querySelector("[data-pdl-motion-slowmo]")!.dispatchEvent(
      new window.MouseEvent("click", { bubbles: true, button: 0 }),
    );
    expect(modal.getAttribute("data-pdl-slowmo")).toBe("1");
    expect(list.getAttribute("data-pdl-slowmo")).toBeNull();
    expect(window.document.documentElement.getAttribute("data-pdl-slowmo")).toBeNull();
    modal
      .querySelector('[data-pdl-motion-clip][data-event="appear"]')!
      .dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    list
      .querySelector('[data-pdl-motion-clip][data-event="appear"]')!
      .dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await new Promise((r) => setTimeout(r, 20));
    const modalDur = plays.find((p) => p.component === "MotionModal")?.duration;
    const listDur = plays.find((p) => p.component === "MotionStaggerList")?.duration;
    expect(modalDur).toBe(1250);
    expect(listDur).toBe(220);
  });

  it("appear cards start and Reset at the from-pose, not rest", async () => {
    const { Window } = await import("happy-dom");
    const design = loadDesign(fx("lab/motion/design.pdl"));
    const cat = buildComponentCatalogue(design);
    const interactionsByComponent: Record<string, unknown> = {};
    for (const [name, row] of Object.entries(cat.components)) {
      if (row.interactions?.length) interactionsByComponent[name] = row.interactions;
    }
    const bake = buildBakedDesignComponent(design, { componentName: "MotionModal" });
    const html = renderBakedDesignToHtmlDocument(bake, {
      singleComponent: "MotionModal",
      interactionsByComponent,
      interactiveHost: true,
    });
    const window = new Window({ url: "http://localhost/" });
    (window.HTMLElement.prototype as unknown as { animate: () => object }).animate = function () {
      return { finished: Promise.resolve(), cancel() {} };
    };
    window.document.write(html);
    window.document.close();
    window.document.querySelectorAll("[data-pdl-listening]").forEach((n) => {
      n.removeAttribute("data-pdl-listening");
    });
    for (const s of [...window.document.querySelectorAll("script")]) {
      window.eval(s.textContent || "");
    }
    await new Promise((r) => setTimeout(r, 20));
    const section = window.document.querySelector('section.pdl-preview[data-pdl-component="MotionModal"]')!;
    const root =
      section.querySelector(".pdl-canvas > .pdl-frame, .pdl-canvas > .pdl-instance") ||
      section.querySelector(".pdl-canvas")?.firstElementChild;
    expect(root).toBeTruthy();
    expect((root as HTMLElement).style.opacity).toBe("0");
    (root as HTMLElement).style.opacity = "1";
    section
      .querySelector("[data-pdl-motion-reset]")!
      .dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    expect((root as HTMLElement).style.opacity).toBe("0");
    expect((root as HTMLElement).style.visibility).not.toBe("hidden");
  });

  it("Pose(scale:) holds uniform scale, not identity scaleX/scaleY", async () => {
    const { Window } = await import("happy-dom");
    const design = loadDesign(fx("lab/motion/design.pdl"));
    const cat = buildComponentCatalogue(design);
    const interactionsByComponent: Record<string, unknown> = {};
    for (const [name, row] of Object.entries(cat.components)) {
      if (row.interactions?.length) interactionsByComponent[name] = row.interactions;
    }
    const bake = buildBakedDesignComponent(design, { componentName: "MotionPoseScale" });
    const html = renderBakedDesignToHtmlDocument(bake, {
      singleComponent: "MotionPoseScale",
      interactionsByComponent,
      interactiveHost: true,
    });
    const window = new Window({ url: "http://localhost/" });
    (window.HTMLElement.prototype as unknown as { animate: () => object }).animate = function () {
      return { finished: Promise.resolve(), cancel() {} };
    };
    window.document.write(html);
    window.document.close();
    window.document.querySelectorAll("[data-pdl-listening]").forEach((n) => {
      n.removeAttribute("data-pdl-listening");
    });
    for (const s of [...window.document.querySelectorAll("script")]) {
      window.eval(s.textContent || "");
    }
    await new Promise((r) => setTimeout(r, 20));
    const section = window.document.querySelector('section.pdl-preview[data-pdl-component="MotionPoseScale"]')!;
    const root = (section.querySelector(".pdl-canvas > .pdl-frame, .pdl-canvas > .pdl-instance") ||
      section.querySelector(".pdl-canvas")?.firstElementChild) as HTMLElement;
    expect(root.style.transform).toBe("translate(0px, 0px) rotate(0deg) scale(0.5, 0.5)");
  });

  it("Pose(rotate:) holds tilt in the overlay transform", async () => {
    const { Window } = await import("happy-dom");
    const design = loadDesign(fx("lab/motion/design.pdl"));
    const cat = buildComponentCatalogue(design);
    const interactionsByComponent: Record<string, unknown> = {};
    for (const [name, row] of Object.entries(cat.components)) {
      if (row.interactions?.length) interactionsByComponent[name] = row.interactions;
    }
    const bake = buildBakedDesignComponent(design, { componentName: "MotionPoseRotate" });
    const html = renderBakedDesignToHtmlDocument(bake, {
      singleComponent: "MotionPoseRotate",
      interactionsByComponent,
      interactiveHost: true,
    });
    const window = new Window({ url: "http://localhost/" });
    (window.HTMLElement.prototype as unknown as { animate: () => object }).animate = function () {
      return { finished: Promise.resolve(), cancel() {} };
    };
    window.document.write(html);
    window.document.close();
    window.document.querySelectorAll("[data-pdl-listening]").forEach((n) => {
      n.removeAttribute("data-pdl-listening");
    });
    for (const s of [...window.document.querySelectorAll("script")]) {
      window.eval(s.textContent || "");
    }
    await new Promise((r) => setTimeout(r, 20));
    const section = window.document.querySelector('section.pdl-preview[data-pdl-component="MotionPoseRotate"]')!;
    const root = (section.querySelector(".pdl-canvas > .pdl-frame, .pdl-canvas > .pdl-instance") ||
      section.querySelector(".pdl-canvas")?.firstElementChild) as HTMLElement;
    expect(root.style.transform).toBe("translate(0px, 0px) rotate(-12deg) scale(1, 1)");
  });

  it("live interaction update reapplies appear-from pose without remount", async () => {
    const { Window } = await import("happy-dom");
    const design = loadDesign(fx("lab/motion/design.pdl"));
    const cat = buildComponentCatalogue(design);
    const interactionsByComponent: Record<string, unknown> = {};
    for (const [name, row] of Object.entries(cat.components)) {
      if (row.interactions?.length) interactionsByComponent[name] = row.interactions;
    }
    const bake = buildBakedDesignComponent(design, { componentName: "MotionPoseScale" });
    const html = renderBakedDesignToHtmlDocument(bake, {
      singleComponent: "MotionPoseScale",
      interactionsByComponent,
      interactiveHost: true,
    });
    const window = new Window({ url: "http://localhost/" });
    (window.HTMLElement.prototype as unknown as { animate: () => object }).animate = function () {
      return { finished: Promise.resolve(), cancel() {} };
    };
    window.document.write(html);
    window.document.close();
    window.document.querySelectorAll("[data-pdl-listening]").forEach((n) => {
      n.removeAttribute("data-pdl-listening");
    });
    for (const s of [...window.document.querySelectorAll("script")]) {
      window.eval(s.textContent || "");
    }
    await new Promise((r) => setTimeout(r, 20));
    const section = window.document.querySelector('section.pdl-preview[data-pdl-component="MotionPoseScale"]')!;
    const root = (section.querySelector(".pdl-canvas > .pdl-frame, .pdl-canvas > .pdl-instance") ||
      section.querySelector(".pdl-canvas")?.firstElementChild) as HTMLElement;
    expect(root.style.transform).toBe("translate(0px, 0px) rotate(0deg) scale(0.5, 0.5)");
    const next = JSON.parse(JSON.stringify(interactionsByComponent)) as typeof interactionsByComponent;
    const handlers = (
      next.MotionPoseScale as Array<{
        handlers: Array<{ event: string; motion?: { pose?: Record<string, number> } }>;
      }>
    )[0].handlers;
    const appear = handlers.find((h) => h.event === "appear")!;
    appear.motion!.pose = { scale: 0.2 };
    window.dispatchEvent(
      new window.MessageEvent("message", {
        data: { type: "pdl-update-interactions", interactions: next },
      }),
    );
    await new Promise((r) => setTimeout(r, 20));
    expect(root.style.transform).toBe("translate(0px, 0px) rotate(0deg) scale(0.2, 0.2)");
  });

  it("preview rebind does not snap appear cards back to the from-pose", async () => {
    const { Window } = await import("happy-dom");
    const design = loadDesign(fx("lab/motion/design.pdl"));
    const cat = buildComponentCatalogue(design);
    const interactionsByComponent: Record<string, unknown> = {};
    for (const [name, row] of Object.entries(cat.components)) {
      if (row.interactions?.length) interactionsByComponent[name] = row.interactions;
    }
    const bake = buildBakedDesignComponent(design, { componentName: "MotionModal" });
    const html = renderBakedDesignToHtmlDocument(bake, {
      singleComponent: "MotionModal",
      interactionsByComponent,
      interactiveHost: true,
    });
    const window = new Window({ url: "http://localhost/" });
    (window.HTMLElement.prototype as unknown as { animate: () => object }).animate = function () {
      return { finished: Promise.resolve(), cancel() {} };
    };
    window.document.write(html);
    window.document.close();
    window.document.querySelectorAll("[data-pdl-listening]").forEach((n) => {
      n.removeAttribute("data-pdl-listening");
    });
    for (const s of [...window.document.querySelectorAll("script")]) {
      window.eval(s.textContent || "");
    }
    await new Promise((r) => setTimeout(r, 20));
    const section = window.document.querySelector('section.pdl-preview[data-pdl-component="MotionModal"]')!;
    const root = (section.querySelector(".pdl-canvas > .pdl-frame, .pdl-canvas > .pdl-instance") ||
      section.querySelector(".pdl-canvas")?.firstElementChild) as HTMLElement;
    root.style.opacity = "1";
    window.dispatchEvent(new window.MessageEvent("message", { data: { type: "pdl-rebind-interactive" } }));
    await new Promise((r) => setTimeout(r, 20));
    expect(root.style.opacity).toBe("1");
  });

  it("Reset then leaving and re-entering the viewport plays Appear again", async () => {
    const { Window } = await import("happy-dom");
    const observers: Array<{ cb: (entries: { isIntersecting: boolean }[]) => void }> = [];
    const window = new Window({ url: "http://localhost/" });
    (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
      cb: (entries: { isIntersecting: boolean }[]) => void;
      constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
        this.cb = cb;
        observers.push(this);
      }
      observe() {}
      disconnect() {}
    };
    const design = loadDesign(fx("lab/motion/design.pdl"));
    const cat = buildComponentCatalogue(design);
    const interactionsByComponent: Record<string, unknown> = {};
    for (const [name, row] of Object.entries(cat.components)) {
      if (row.interactions?.length) interactionsByComponent[name] = row.interactions;
    }
    const bake = buildBakedDesignComponent(design, { componentName: "MotionModal" });
    const html = renderBakedDesignToHtmlDocument(bake, {
      singleComponent: "MotionModal",
      interactionsByComponent,
      interactiveHost: true,
    });
    let plays = 0;
    (window.HTMLElement.prototype as unknown as { animate: () => object }).animate = function () {
      plays += 1;
      return { finished: Promise.resolve(), cancel() {} };
    };
    window.document.write(html);
    window.document.close();
    window.document.querySelectorAll("[data-pdl-listening]").forEach((n) => {
      n.removeAttribute("data-pdl-listening");
    });
    for (const s of [...window.document.querySelectorAll("script")]) {
      window.eval(s.textContent || "");
    }
    await new Promise((r) => setTimeout(r, 20));
    const before = plays;
    window.document
      .querySelector("[data-pdl-motion-reset]")!
      .dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await new Promise((r) => setTimeout(r, 20));
    expect(plays).toBe(before);
    const io = observers[observers.length - 1];
    expect(io).toBeTruthy();
    io!.cb([{ isIntersecting: false }]);
    expect(plays).toBe(before);
    io!.cb([{ isIntersecting: true }]);
    expect(plays).toBe(before);
    await new Promise((r) => setTimeout(r, 600));
    expect(plays).toBeGreaterThan(before);
  });

  it("standing spin loops rotate 0deg → 360deg without a wrap snap", async () => {
    const { Window } = await import("happy-dom");
    const design = loadDesign(fx("lab/motion/design.pdl"));
    const bake = buildBakedDesignComponent(design, {
      componentName: "MotionStandingSpin",
      paramOverrides: { isLoading: true },
    });
    const html = renderBakedDesignToHtmlDocument(bake, {
      singleComponent: "MotionStandingSpin",
      interactiveHost: true,
    });
    const window = new Window({ url: "http://localhost/" });
    const calls: Array<{ transforms: string[]; iterations?: number; easing?: string }> = [];
    (window.HTMLElement.prototype as unknown as {
      animate: (k: Array<{ transform?: string }>, o: { iterations?: number; easing?: string }) => object;
    }).animate = function (
      this: Element,
      k: Array<{ transform?: string }>,
      o: { iterations?: number; easing?: string },
    ) {
      calls.push({
        transforms: k.map((f) => String(f.transform ?? "")),
        iterations: o.iterations,
        easing: o.easing,
      });
      return { finished: Promise.resolve(), cancel() {}, playState: "running", playbackRate: 1 };
    };
    window.document.write(html);
    window.document.close();
    window.document.querySelectorAll("[data-pdl-listening]").forEach((n) => {
      n.removeAttribute("data-pdl-listening");
    });
    for (const s of [...window.document.querySelectorAll("script")]) {
      window.eval(s.textContent || "");
    }
    await new Promise((r) => setTimeout(r, 20));
    const loop = calls.find((c) => c.iterations === Number.POSITIVE_INFINITY);
    expect(loop).toBeTruthy();
    expect(loop!.easing).toBe("linear");
    expect(loop!.transforms[0]).toContain("rotate(0deg)");
    expect(loop!.transforms[loop!.transforms.length - 1]).toContain("rotate(360deg)");
    const t0 = loop!.transforms[0]!;
    const t1 = loop!.transforms[loop!.transforms.length - 1]!;
    expect(t0.replace("rotate(0deg)", "rotate(360deg)")).toBe(t1);
  });

  it("hover flourish plays key offsets and hoverEnd reverses from current progress", async () => {
    const { Window } = await import("happy-dom");
    const design = loadDesign(fx("lab/motion/design.pdl"));
    const cat = buildComponentCatalogue(design);
    const interactionsByComponent: Record<string, unknown> = {};
    for (const [name, row] of Object.entries(cat.components)) {
      if (row.interactions?.length) interactionsByComponent[name] = row.interactions;
    }
    const bake = buildBakedDesignComponent(design, { componentName: "MotionHoverFlourish" });
    const html = renderBakedDesignToHtmlDocument(bake, {
      singleComponent: "MotionHoverFlourish",
      interactionsByComponent,
      interactiveHost: true,
    });
    const window = new Window({ url: "http://localhost/" });
    const anim = {
      playState: "running",
      playbackRate: 1,
      finished: Promise.resolve(),
      cancel() {},
      play() {},
    };
    const offsets: number[][] = [];
    (window.HTMLElement.prototype as unknown as {
      animate: (k: Array<{ offset?: number }>, _o: unknown) => object;
      getAnimations: () => object[];
    }).animate = function (k: Array<{ offset?: number }>) {
      offsets.push(k.map((f) => Number(f.offset)));
      return anim;
    };
    (window.HTMLElement.prototype as unknown as { getAnimations: () => object[] }).getAnimations =
      function () {
        return [anim];
      };
    window.document.write(html);
    window.document.close();
    window.document.querySelectorAll("[data-pdl-listening]").forEach((n) => {
      n.removeAttribute("data-pdl-listening");
    });
    for (const s of [...window.document.querySelectorAll("script")]) {
      window.eval(s.textContent || "");
    }
    await new Promise((r) => setTimeout(r, 20));
    const start = window.document.querySelector('[data-pdl-motion-clip][data-event="hoverStart"]');
    const end = window.document.querySelector('[data-pdl-motion-clip][data-event="hoverEnd"]');
    expect(start).toBeTruthy();
    start!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await new Promise((r) => setTimeout(r, 20));
    expect(offsets.some((o) => o[0] === 0 && o.includes(0.35) && o.includes(0.7) && o.includes(1))).toBe(
      true,
    );
    end!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await new Promise((r) => setTimeout(r, 20));
    expect(anim.playbackRate).toBe(-1);
  });

  it("hoverEnd after a finished toPose reverses to rest instead of replaying the pop", async () => {
    const { Window } = await import("happy-dom");
    const design = loadDesign(fx("lab/motion/design.pdl"));
    const cat = buildComponentCatalogue(design);
    const interactionsByComponent: Record<string, unknown> = {};
    for (const [name, row] of Object.entries(cat.components)) {
      if (row.interactions?.length) interactionsByComponent[name] = row.interactions;
    }
    const bake = buildBakedDesignComponent(design, { componentName: "MotionHoverPopOverride" });
    const html = renderBakedDesignToHtmlDocument(bake, {
      singleComponent: "MotionHoverPopOverride",
      interactionsByComponent,
      interactiveHost: true,
    });
    const window = new Window({ url: "http://localhost/" });
    const anim = {
      playState: "running",
      playbackRate: 1,
      currentTime: 280,
      finished: new Promise(() => {}),
      cancel() {},
      play() {
        this.played = true;
      },
      played: false,
      effect: { getTiming: () => ({ duration: 280, fill: "both" }) },
    };
    const transforms: string[][] = [];
    (window.HTMLElement.prototype as unknown as {
      animate: (k: Array<{ transform?: string }>, _o: unknown) => object;
      getAnimations: () => object[];
    }).animate = function (k: Array<{ transform?: string }>) {
      transforms.push(k.map((f) => String(f.transform ?? "")));
      return anim;
    };
    (window.HTMLElement.prototype as unknown as { getAnimations: () => object[] }).getAnimations =
      function () {
        return [anim];
      };
    window.document.write(html);
    window.document.close();
    window.document.querySelectorAll("[data-pdl-listening]").forEach((n) => {
      n.removeAttribute("data-pdl-listening");
    });
    for (const s of [...window.document.querySelectorAll("script")]) {
      window.eval(s.textContent || "");
    }
    await new Promise((r) => setTimeout(r, 20));
    const start = window.document.querySelector('[data-pdl-motion-clip][data-event="hoverStart"]');
    const end = window.document.querySelector('[data-pdl-motion-clip][data-event="hoverEnd"]');
    start!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await new Promise((r) => setTimeout(r, 20));
    expect(transforms).toHaveLength(1);
    expect(transforms[0]![transforms[0]!.length - 1]).toContain("scale(1.12");
    anim.playState = "finished";
    end!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await new Promise((r) => setTimeout(r, 20));
    expect(anim.playbackRate).toBe(-1);
    expect(anim.played).toBe(true);
    expect(transforms).toHaveLength(1);
  });

  it("standing pulse waits until appear finished on the same node", async () => {
    const { Window } = await import("happy-dom");
    const design = loadDesign(fx("lab/motion/design.pdl"));
    const cat = buildComponentCatalogue(design);
    const interactionsByComponent: Record<string, unknown> = {};
    for (const [name, row] of Object.entries(cat.components)) {
      if (row.interactions?.length) interactionsByComponent[name] = row.interactions;
    }
    const bake = buildBakedDesignComponent(design, { componentName: "MotionAppearThenPulse" });
    const html = renderBakedDesignToHtmlDocument(bake, {
      singleComponent: "MotionAppearThenPulse",
      interactionsByComponent,
      interactiveHost: true,
    });
    const window = new Window({ url: "http://localhost/" });
    const calls: Array<{ iterations?: number }> = [];
    (window.HTMLElement.prototype as unknown as {
      animate: (_k: unknown, o: { iterations?: number }) => object;
    }).animate = function (_k: unknown, o: { iterations?: number }) {
      calls.push({ iterations: o.iterations });
      return { finished: Promise.resolve(), cancel() {}, playState: "running", playbackRate: 1 };
    };
    window.document.write(html);
    window.document.close();
    window.document.querySelectorAll("[data-pdl-listening]").forEach((n) => {
      n.removeAttribute("data-pdl-listening");
    });
    for (const s of [...window.document.querySelectorAll("script")]) {
      window.eval(s.textContent || "");
    }
    await new Promise((r) => setTimeout(r, 20));
    expect(calls.some((c) => c.iterations === Number.POSITIVE_INFINITY)).toBe(false);
    const play = window.document.querySelector('[data-pdl-motion-clip][data-event="appear"]');
    expect(play).toBeTruthy();
    play!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await new Promise((r) => setTimeout(r, 20));
    expect(calls.some((c) => c.iterations === Number.POSITIVE_INFINITY)).toBe(true);
  });
});
