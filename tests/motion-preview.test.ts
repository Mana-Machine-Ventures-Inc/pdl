import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBakedDesignComponent, buildBakedDesignSystem } from "../src/bakeDesign.js";
import { buildComponentCatalogue, interactionsByComponentFromDesign } from "../src/catalogue.js";
import { loadDesign } from "../src/loadDesign.js";
import { renderBakedDesignToHtmlDocument } from "../src/renderHtml.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fx = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl", ...p);

/** Safe WAAPI mock: forever standing loops must not spin on resolved `finished`. */
function installAnimateMock(
  window: { HTMLElement: { prototype: unknown } },
  onCall?: (el: Element, keyframes: Keyframe[], opts: KeyframeAnimationOptions) => void,
  opts?: { maxResolvingCalls?: number },
) {
  const max = opts?.maxResolvingCalls ?? 8;
  let n = 0;
  (window.HTMLElement.prototype as {
    animate: (k: Keyframe[], o: KeyframeAnimationOptions) => object;
  }).animate = function (this: Element, k: Keyframe[], o: KeyframeAnimationOptions) {
    n += 1;
    onCall?.(this, k, o);
    if (n > max) return { finished: new Promise(() => {}), cancel() {} };
    return { finished: Promise.resolve(), cancel() {} };
  };
}

async function mountHtml(html: string) {
  const { Window } = await import("happy-dom");
  const window = new Window({ url: "http://localhost/" });
  installAnimateMock(window);
  window.document.write(html);
  window.document.close();
  window.document.querySelectorAll("[data-pdl-listening]").forEach((n) => {
    n.removeAttribute("data-pdl-listening");
  });
  for (const s of [...window.document.querySelectorAll("script")]) {
    window.eval(s.textContent || "");
  }
  await new Promise((r) => setTimeout(r, 20));
  return window;
}

describe("HTML preview motion", () => {
  it("catalogue evaluates Animation start/keys snapshots", () => {
    const design = loadDesign(fx("lab/motion/design.pdl"));
    const cat = buildComponentCatalogue(design);
    const modal = cat.components.MotionModal!;
    const handlers = (modal.interactions?.[0] as { handlers: Array<Record<string, unknown>> })
      .handlers;
    const appear = handlers.find((h) => h.event === "appear") as {
      animation: {
        start: Record<string, number>;
        keys: Array<{ timing: { duration: number }; pose: string }>;
      };
    };
    expect(appear.animation.start).toEqual({ opacity: 0, scale: 0.95, translateY: 8 });
    expect(appear.animation.keys[0]?.timing.duration).toBe(250);
    expect(appear.animation.keys[0]?.pose).toBe("rest");
    const list = cat.components.MotionStaggerList!;
    const listAppear = (
      list.interactions?.[0] as {
        handlers: Array<{ event: string; animation?: { stagger?: number; staggerFrom?: string } }>;
      }
    ).handlers.find((h) => h.event === "appear");
    expect(listAppear?.animation?.stagger).toBe(40);
    expect(listAppear?.animation?.staggerFrom).toBe("last");
    const blurCard = cat.components.MotionBlurCard!;
    const blurAppear = (
      blurCard.interactions?.[0] as {
        handlers: Array<{ event: string; animation?: { start?: Record<string, number> } }>;
      }
    ).handlers.find((h) => h.event === "appear");
    expect(blurAppear?.animation?.start).toEqual({ blur: 18, opacity: 0.35 });
    const startOf = (name: string) => {
      const row = cat.components[name]!;
      return (
        row.interactions?.[0] as {
          handlers: Array<{ event: string; animation?: { start?: Record<string, number> } }>;
        }
      ).handlers.find((h) => h.event === "appear")?.animation?.start;
    };
    expect(startOf("MotionPoseOpacity")).toEqual({ opacity: 0 });
    expect(startOf("MotionPoseScale")).toEqual({ scale: 0.5 });
    expect(startOf("MotionPoseScaleX")).toEqual({ scaleX: 0.2 });
    expect(startOf("MotionPoseScaleY")).toEqual({ scaleY: 0.2 });
    expect(startOf("MotionPoseTranslateX")).toEqual({ translateX: 48 });
    expect(startOf("MotionPoseTranslateY")).toEqual({ translateY: 24 });
    expect(startOf("MotionPoseBlur")).toEqual({ blur: 16 });
    expect(startOf("MotionPoseRotate")).toEqual({ rotate: -12 });
    const flourish = (
      cat.components.MotionHoverFlourish!.interactions?.[0] as {
        handlers: Array<{
          event: string;
          animation?: { keys?: Array<{ pose?: unknown }> };
        }>;
      }
    ).handlers.find((h) => h.event === "hoverStart");
    expect(flourish?.animation?.keys).toHaveLength(3);
    expect(flourish?.animation?.keys?.[2]?.pose).toBe("rest");
    const flourishEnd = (
      cat.components.MotionHoverFlourish!.interactions?.[0] as {
        handlers: Array<{ event: string; animation?: { keys?: Array<{ pose?: unknown }> } }>;
      }
    ).handlers.find((h) => h.event === "hoverEnd");
    expect(flourishEnd?.animation?.keys?.[0]?.pose).toBe("rest");
    const popOf = (name: string, event: string) =>
      (
        cat.components[name]!.interactions?.[0] as {
          handlers: Array<{ event: string; animation?: { keys?: unknown[] } }>;
        }
      ).handlers.find((h) => h.event === event)?.animation;
    expect(popOf("MotionHoverPop", "hoverStart")?.keys).toHaveLength(2);
    expect(
      (
        popOf("MotionHoverPop", "hoverEnd") as { keys?: Array<{ pose?: unknown }> } | undefined
      )?.keys?.[0]?.pose,
    ).toBe("rest");
    expect(popOf("MotionHoverPopOverride", "hoverStart")?.keys).toHaveLength(1);
    expect(
      (
        popOf("MotionHoverPopOverride", "hoverEnd") as
          | { keys?: Array<{ pose?: unknown }> }
          | undefined
      )?.keys?.[0]?.pose,
    ).toBe("rest");
    const modalDismiss = (
      cat.components.MotionModal!.interactions?.[0] as {
        handlers: Array<{
          event: string;
          animation?: { keys?: Array<{ pose?: { opacity?: number } }> };
        }>;
      }
    ).handlers.find((h) => h.event === "dismiss");
    expect(modalDismiss?.animation?.keys?.[0]?.pose?.opacity).toBe(0);
    const chipHover = (
      cat.components.MotionHoverChip!.interactions?.[0] as {
        handlers: Array<{ event: string; animation?: unknown }>;
      }
    ).handlers.find((h) => h.event === "hoverStart");
    expect(chipHover?.animation).toBeUndefined();
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
    expect(html).toContain("data-pdl-motion-clip");
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
    expect(html).toContain("animationFromHandler");
    expect(html).toContain("playAnimationOnEl");
    expect(html).toContain("syncStandingUnder");
    expect(html).toContain('"kind":"animation"');
    expect(html).toContain('"opacity":0');
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
    expect(html).toMatch(/repeat(?:&quot;|")\s*:\s*(?:&quot;|")forever/);
    expect(html).toMatch(/rotate(?:&quot;|")\s*:\s*360/);
  });

  it("hover pose components get Hover start / Hover end clips", () => {
    const design = loadDesign(fx("lab/motion/design.pdl"));
    const cat = buildComponentCatalogue(design);
    const interactionsByComponent: Record<string, unknown> = {};
    for (const [name, row] of Object.entries(cat.components)) {
      if (row.interactions?.length) interactionsByComponent[name] = row.interactions;
    }
    const doc = buildBakedDesignComponent(design, { componentName: "MotionHoverPop" });
    const html = renderBakedDesignToHtmlDocument(doc, {
      singleComponent: "MotionHoverPop",
      interactionsByComponent,
      interactiveHost: true,
    });
    expect(html).toContain('data-event="hoverStart"');
    expect(html).toContain('data-event="hoverEnd"');
    expect(html).toContain(">Hover start<");
    expect(html).toContain(">Hover end<");
    expect(html).not.toContain('data-event="appear"');
  });

  it("playground enrich payload includes evaluated animation", () => {
    const design = loadDesign(fx("lab/motion/design.pdl"));
    const ix = interactionsByComponentFromDesign(design);
    const appear = (
      ix.MotionModal as Array<{
        handlers: Array<{ event: string; animation?: { start?: unknown } }>;
      }>
    )[0]!.handlers.find((h) => h.event === "appear");
    expect(appear?.animation?.start).toEqual({ opacity: 0, scale: 0.95, translateY: 8 });
  });

  it("HTML host still plays appear when catalogue omitted the animation key", () => {
    const design = loadDesign(fx("lab/motion/design.pdl"));
    const cat = buildComponentCatalogue(design);
    const interactionsByComponent: Record<string, unknown> = {};
    for (const [name, row] of Object.entries(cat.components)) {
      if (!row.interactions?.length) continue;
      interactionsByComponent[name] = (
        row.interactions as Array<{ handlers: Array<Record<string, unknown>> }>
      ).map((d) => ({
        ...d,
        handlers: d.handlers.map(({ animation: _a, ...h }) => h),
      }));
    }
    const doc = buildBakedDesignComponent(design, { componentName: "MotionModal" });
    const html = renderBakedDesignToHtmlDocument(doc, {
      singleComponent: "MotionModal",
      interactionsByComponent,
      interactiveHost: true,
    });
    expect(html).toContain("data-pdl-motion-clip");
    expect(html).toContain('"kind":"animation"');
    expect(html).toContain("animationFromHandler");
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
    installAnimateMock(window, (el, _k, opts) => {
      delays.push({
        let: el.getAttribute("data-pdl-instance-let"),
        delay: Number(opts?.delay ?? 0),
        fill: opts?.fill as string | undefined,
      });
    });
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

  it("stagger still delays children when catalogue omitted staggerFrom", async () => {
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
          const animation =
            h.animation && typeof h.animation === "object"
              ? { ...(h.animation as object) }
              : h.animation;
          if (animation && typeof animation === "object" && "staggerFrom" in animation) {
            delete (animation as { staggerFrom?: string }).staggerFrom;
          }
          return { ...h, animation };
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
    installAnimateMock(window, (el, _k, opts) => {
      delays.push({
        let: el.getAttribute("data-pdl-instance-let"),
        delay: Number(opts?.delay ?? 0),
      });
    });
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
    expect(byLet).toMatchObject({ a: 0, b: 40, c: 80 });
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
    installAnimateMock(
      window,
      (el, _k, opts) => {
        const section = el.closest("section.pdl-preview");
        plays.push({
          component: section?.getAttribute("data-pdl-component") ?? null,
          duration: Number(opts?.duration ?? 0),
        });
      },
      { maxResolvingCalls: 6 },
    );
    window.document.write(html);
    window.document.close();
    window.document.querySelectorAll("[data-pdl-listening]").forEach((n) => {
      n.removeAttribute("data-pdl-listening");
    });
    for (const s of [...window.document.querySelectorAll("script")]) {
      window.eval(s.textContent || "");
    }
    await new Promise((r) => setTimeout(r, 20));
    const modal = window.document.querySelector(
      'section.pdl-preview[data-pdl-component="MotionModal"]',
    )!;
    const list = window.document.querySelector(
      'section.pdl-preview[data-pdl-component="MotionStaggerList"]',
    )!;
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
    const window = await mountHtml(html);
    const section = window.document.querySelector(
      'section.pdl-preview[data-pdl-component="MotionModal"]',
    )!;
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
    const window = await mountHtml(html);
    const section = window.document.querySelector(
      'section.pdl-preview[data-pdl-component="MotionPoseScale"]',
    )!;
    const root = (section.querySelector(".pdl-canvas > .pdl-frame, .pdl-canvas > .pdl-instance") ||
      section.querySelector(".pdl-canvas")?.firstElementChild) as HTMLElement;
    expect(root.style.transform).toBe("translate(0px, 0px) rotate(0deg) scale(0.5, 0.5)");
  });

  it("Pose(rotate:) holds tilt in the overlay transform", async () => {
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
    const window = await mountHtml(html);
    const section = window.document.querySelector(
      'section.pdl-preview[data-pdl-component="MotionPoseRotate"]',
    )!;
    const root = (section.querySelector(".pdl-canvas > .pdl-frame, .pdl-canvas > .pdl-instance") ||
      section.querySelector(".pdl-canvas")?.firstElementChild) as HTMLElement;
    expect(root.style.transform).toBe("translate(0px, 0px) rotate(-12deg) scale(1, 1)");
  });

  it("live interaction update reapplies appear-from pose without remount", async () => {
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
    const window = await mountHtml(html);
    const section = window.document.querySelector(
      'section.pdl-preview[data-pdl-component="MotionPoseScale"]',
    )!;
    const root = (section.querySelector(".pdl-canvas > .pdl-frame, .pdl-canvas > .pdl-instance") ||
      section.querySelector(".pdl-canvas")?.firstElementChild) as HTMLElement;
    expect(root.style.transform).toBe("translate(0px, 0px) rotate(0deg) scale(0.5, 0.5)");
    const next = JSON.parse(JSON.stringify(interactionsByComponent)) as typeof interactionsByComponent;
    const handlers = (
      next.MotionPoseScale as Array<{
        handlers: Array<{ event: string; animation?: { start?: Record<string, number> } }>;
      }>
    )[0].handlers;
    const appear = handlers.find((h) => h.event === "appear")!;
    appear.animation!.start = { scale: 0.2 };
    window.dispatchEvent(
      new window.MessageEvent("message", {
        data: { type: "pdl-update-interactions", interactions: next },
      }),
    );
    await new Promise((r) => setTimeout(r, 20));
    expect(root.style.transform).toBe("translate(0px, 0px) rotate(0deg) scale(0.2, 0.2)");
  });

  it("preview rebind does not snap appear cards back to the from-pose", async () => {
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
    const window = await mountHtml(html);
    const section = window.document.querySelector(
      'section.pdl-preview[data-pdl-component="MotionModal"]',
    )!;
    const root = (section.querySelector(".pdl-canvas > .pdl-frame, .pdl-canvas > .pdl-instance") ||
      section.querySelector(".pdl-canvas")?.firstElementChild) as HTMLElement;
    root.style.opacity = "1";
    window.dispatchEvent(
      new window.MessageEvent("message", { data: { type: "pdl-rebind-interactive" } }),
    );
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
    installAnimateMock(window, () => {
      plays += 1;
    });
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

  it("standing spin plays rotate 0deg → 360deg segments (forever outer loop)", async () => {
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
    installAnimateMock(
      window,
      (_el, k, o) => {
        calls.push({
          transforms: k.map((f) => String(f.transform ?? "")),
          iterations: o.iterations as number | undefined,
          easing: o.easing as string | undefined,
        });
      },
      { maxResolvingCalls: 2 },
    );
    window.document.write(html);
    window.document.close();
    window.document.querySelectorAll("[data-pdl-listening]").forEach((n) => {
      n.removeAttribute("data-pdl-listening");
    });
    for (const s of [...window.document.querySelectorAll("script")]) {
      window.eval(s.textContent || "");
    }
    await new Promise((r) => setTimeout(r, 20));
    expect(calls.length).toBeGreaterThan(0);
    const loop = calls[0]!;
    expect(loop.iterations).toBe(1);
    expect(loop.easing).toBe("linear");
    expect(loop.transforms[0]).toContain("rotate(0deg)");
    expect(loop.transforms[loop.transforms.length - 1]).toContain("rotate(360deg)");
    const t0 = loop.transforms[0]!;
    const t1 = loop.transforms[loop.transforms.length - 1]!;
    expect(t0.replace("rotate(0deg)", "rotate(360deg)")).toBe(t1);
  });

  it("hover flourish plays sequential key Motions; hoverEnd plays authored rest", async () => {
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
    const segments: Array<{ transforms: string[]; duration?: number }> = [];
    installAnimateMock(window, (_el, k, o) => {
      segments.push({
        transforms: k.map((f) => String(f.transform ?? "")),
        duration: o.duration as number | undefined,
      });
    });
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
    expect(segments.length).toBeGreaterThanOrEqual(3);
    expect(segments[0]!.transforms[segments[0]!.transforms.length - 1]).toContain("scale(1.16");
    const afterStart = segments.length;
    end!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await new Promise((r) => setTimeout(r, 20));
    expect(segments.length).toBeGreaterThan(afterStart);
    const last = segments[segments.length - 1]!;
    expect(last.transforms[last.transforms.length - 1]).toContain("scale(1, 1)");
  });

  it("hoverEnd after a finished pop plays the authored rest Animation", async () => {
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
    const transforms: string[][] = [];
    installAnimateMock(window, (_el, k) => {
      transforms.push(k.map((f) => String(f.transform ?? "")));
    });
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
    end!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await new Promise((r) => setTimeout(r, 20));
    expect(transforms).toHaveLength(2);
    expect(transforms[1]![transforms[1]!.length - 1]).toContain("scale(1, 1)");
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
    const calls: Array<{ duration?: number; rotate?: boolean }> = [];
    let n = 0;
    (window.HTMLElement.prototype as {
      animate: (k: Keyframe[], o: KeyframeAnimationOptions) => object;
    }).animate = function (_k: Keyframe[], o: KeyframeAnimationOptions) {
      n += 1;
      calls.push({
        duration: o.duration as number | undefined,
        rotate: _k.some((f) => String(f.transform ?? "").includes("rotate")),
      });
      // Cap forever standing after appear completes.
      if (n > 4) return { finished: new Promise(() => {}), cancel() {} };
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
    const before = calls.length;
    const play = window.document.querySelector('[data-pdl-motion-clip][data-event="appear"]');
    expect(play).toBeTruthy();
    play!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await new Promise((r) => setTimeout(r, 40));
    expect(calls.length).toBeGreaterThan(before);
    // Appear runs first; standing pulse (repeat forever) starts after appearDone.
    expect(calls.length).toBeGreaterThan(before + 1);
  });
});
