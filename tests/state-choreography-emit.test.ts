/**
 * @vitest-environment happy-dom
 *
 * Emit-driven land choreography (parallel tracks):
 *  - child `self.pressEnd = { animate = …; emit … }` and
 *  - parent `dot.select(…) = { animate = …; currentPage = page }`
 * post a bundle whose tracks all start at t=0 — capture land is not delayed
 * by the child's flourish.
 */
import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import {
  bakeComponent as rustBake,
  catalogue as rustCatalogue,
} from "./helpers/rustFixtures.js";
import { reconcileBakedComponentIntoCanvas } from "../src/bakeReconcile.js";
import type { BakedFrame } from "../src/bakeDesign.js";
import {
  patchFrameProps,
  renderBakedDesignToHtmlDocumentWithReport,
  renderFrameForReconcile,
} from "../src/renderHtml.js";
import {
  armChoreographyLand,
  landTimingToCss,
  mergeChoreoSessions,
  normalizeChoreoSession,
  primaryLandTiming,
  sessionLandCss,
  type ChoreoSession,
} from "../src/stateChoreography.js";

const ENTRY =
  process.env.PDL_CHOREO_ENTRY || "test-fixtures/pdl/systems/ios26-lite/c_pagecontrol.pdl";

const catalogue = () => rustCatalogue(ENTRY) as never;

const bakePageControl = (overrides: string[] = []) =>
  rustBake(ENTRY, "IosPageControl", { params: overrides });

async function mountInteractive(bake: unknown) {
  const cat = catalogue();
  const interactionsByComponent: Record<string, unknown> = {};
  const emitCapturesByComponent: Record<string, unknown> = {};
  for (const [name, c] of Object.entries(cat.components || {})) {
    if (c.interactions) interactionsByComponent[name] = c.interactions;
    if (c.emitCaptures) emitCapturesByComponent[name] = c.emitCaptures;
  }
  const { html } = renderBakedDesignToHtmlDocumentWithReport(bake as never, {
    title: "t",
    singleComponent: "IosPageControl",
    interactiveHost: true,
    interactionsByComponent: interactionsByComponent as never,
    emitCapturesByComponent: emitCapturesByComponent as never,
  });
  const window = new Window({ url: "http://localhost/" });
  const document = window.document;
  document.write(html);
  document.close();
  const messages: Array<Record<string, unknown>> = [];
  window.parent = {
    postMessage(payload: Record<string, unknown>) {
      messages.push(payload);
    },
  } as never;
  for (const s of [...document.querySelectorAll("script")]) {
    window.eval(s.textContent || "");
  }
  await new Promise((r) => setTimeout(r, 20));
  return { window, document, messages, html, catalogue: cat };
}

function pressDot(window: Window, dot: Element) {
  dot.dispatchEvent(new window.MouseEvent("mousedown", { bubbles: true, button: 0 }));
  dot.dispatchEvent(new window.MouseEvent("mouseup", { bubbles: true, button: 0 }));
}

describe("armChoreographyLand", () => {
  it("hands the land clock to the layer-band fill that reconcile patches", async () => {
    const dotFrame = (bg: string): BakedFrame => ({
      id: "Dot",
      kind: "layout",
      props: { direction: "row", width: 8, height: 8, cornerRadius: 50, background: bg },
      children: [],
    });
    const idle = dotFrame("#3C3C4333");
    const active = dotFrame("#000000");
    document.body.innerHTML = renderFrameForReconcile(idle, {
      stackChild: false,
      stackZ: 0,
      omitInstanceAttrs: true,
    });
    const el = document.querySelector('[data-pdl-id="Dot"]') as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.querySelector(":scope > .pdl-layer-band > div")).toBeTruthy();

    armChoreographyLand(document, {
      first: { Dot: { left: 0, top: 0, width: 8, height: 8, background: "", opacity: "" } },
      tracks: [
        {
          targetId: "Dot",
          flourish: null,
          landTiming: { duration: 500, easing: "linear", delay: 0 },
        },
      ],
    });
    expect(el.getAttribute("data-pdl-transition")).toContain("background-color 500ms");

    patchFrameProps(el, idle, active, { stackChild: false, stackZ: 0, omitInstanceAttrs: true });
    await new Promise((r) => setTimeout(r, 40));
    const band = el.querySelector(":scope > .pdl-layer-band > div") as HTMLElement;
    const style = band.getAttribute("style") || "";
    expect(style).toContain("transition");
    expect(style).toContain("500ms");
    expect(style.toLowerCase()).toContain("#000000");
  });
});

describe("parallel tracks", () => {
  it("does not delay land CSS by flourish wall-clock", () => {
    const session: ChoreoSession = {
      first: {},
      tracks: [
        {
          targetId: "dot",
          flourish: {
            kind: "animation",
            keys: [
              { timing: { duration: 200, ease: "out", delay: 0 }, pose: { scale: 1.2 } },
              { timing: { duration: 200, ease: "out", delay: 0 }, pose: { scale: 0.92 } },
            ],
          },
          landTiming: { duration: 200, easing: "ease-out", delay: 0 },
        },
        {
          landTiming: { duration: 500, easing: "linear", delay: 0 },
          flourish: null,
        },
      ],
    };
    const css = sessionLandCss(session);
    expect(css).toContain("500ms");
    expect(css).not.toMatch(/delay:\s*400/);
    // No extra delay beyond the land track's own delay: field (0).
    expect(landTimingToCss(primaryLandTiming(session)!, 0)).toBe(css);
  });

  it("merges child + capture into two tracks with capture land primary", () => {
    const child: ChoreoSession = {
      first: { a: { id: "a", left: 0, top: 0, width: 1, height: 1, background: "", opacity: "" } },
      tracks: [
        {
          targetId: "a",
          flourish: { kind: "animation", keys: [{ timing: { duration: 90 }, pose: { scale: 1.1 } }] },
          landTiming: { duration: 200, easing: "ease-out", delay: 0 },
        },
      ],
    };
    const cap: ChoreoSession = {
      first: {
        a: { id: "a", left: 0, top: 0, width: 1, height: 1, background: "", opacity: "" },
        b: { id: "b", left: 0, top: 0, width: 1, height: 1, background: "", opacity: "" },
      },
      tracks: [
        {
          flourish: null,
          landTiming: { duration: 500, easing: "linear", delay: 0 },
        },
      ],
    };
    const merged = mergeChoreoSessions(child, cap)!;
    expect(merged.tracks).toHaveLength(2);
    expect(merged.tracks[0]?.flourish?.keys?.length).toBe(1);
    expect(primaryLandTiming(merged)?.duration).toBe(500);
    expect(Object.keys(merged.first)).toEqual(["a", "b"]);
  });

  it("normalizes legacy flat sessions to one track", () => {
    const n = normalizeChoreoSession({
      first: { x: { id: "x", left: 0, top: 0, width: 1, height: 1, background: "", opacity: "" } },
      landTiming: { duration: 220, easing: "ease-out", delay: 0 },
      flourish: null,
      targetId: "x",
    });
    expect(n?.tracks).toHaveLength(1);
    expect(n?.tracks[0]?.landTiming?.duration).toBe(220);
  });
});

describe("emit capture animate", () => {
  it("catalogues an evaluated land clip on the capture", () => {
    const cat = catalogue();
    const caps = cat.components.IosPageControl?.emitCaptures as Array<{
      channel: string;
      animation?: { land?: boolean; keys?: Array<{ timing?: { duration?: number } }> };
      animationTargets?: Array<{ target?: string; list?: boolean; animation?: unknown }>;
      body?: Array<{ kind: string }>;
    }>;
    const select = caps?.find((c) => c.channel === "select");
    expect(select?.animation?.land).toBe(true);
    expect(select?.animation?.keys?.[0]?.timing?.duration).toBe(500);
    expect(select?.body?.some((b) => b.kind === "animate")).toBe(true);
    const chorus = select?.animationTargets?.find((t) => t.list === true && t.target === "dots");
    expect(chorus?.animation).toBeTruthy();
  });

  it("presses a dot and posts parallel child + list chorus + capture tracks", async () => {
    const bake = bakePageControl(["currentPage=1", "numberOfPages=3"]);
    const { window, document, messages } = await mountInteractive(bake);
    const dots = [...document.querySelectorAll('[data-pdl-instance-of="IosPageDot"]')];
    pressDot(window, dots[2]!);
    await new Promise((r) => setTimeout(r, 20));
    const interaction = messages.find(
      (m) => m.type === "pdl-interaction" && m.event === "pressEnd",
    ) as { choreography?: unknown } | undefined;
    const choreo = normalizeChoreoSession(interaction?.choreography);
    expect(choreo).toBeTruthy();
    // Solo press + 2 sibling chorus + capture land (≥ 4), or at least solo + capture.
    expect(choreo!.tracks.length).toBeGreaterThanOrEqual(3);
    const withFlourish = choreo!.tracks.filter((t) => (t.flourish?.keys?.length ?? 0) > 0);
    const withCaptureLand = choreo!.tracks.find((t) => t.landTiming?.duration === 500);
    expect(withFlourish.length).toBeGreaterThanOrEqual(2); // solo + ≥1 sibling
    expect(withCaptureLand).toBeTruthy();
    expect(primaryLandTiming(choreo!)?.duration).toBe(500);
    const dotIds = Object.keys(choreo!.first).filter((id) => id.includes("IosPageDot"));
    expect(dotIds.length).toBe(3);
    expect(sessionLandCss(choreo!)).toContain("500ms");
    expect(sessionLandCss(choreo!)).not.toMatch(/400ms/);
  });
});

describe("emit → parent rebake carries a land session", () => {
  it("child pressEnd animate + emit attaches choreography to pdl-interaction", async () => {
    const bake = bakePageControl(["currentPage=1", "numberOfPages=3"]);
    const { window, document, messages } = await mountInteractive(bake);
    const dots = [...document.querySelectorAll('[data-pdl-instance-of="IosPageDot"]')];
    expect(dots.length).toBe(3);
    pressDot(window, dots[2]!);
    await new Promise((r) => setTimeout(r, 20));

    const interaction = messages.find(
      (m) => m.type === "pdl-interaction" && m.event === "pressEnd",
    ) as { choreography?: unknown } | undefined;
    const choreo = normalizeChoreoSession(interaction?.choreography);
    expect(interaction).toBeTruthy();
    expect(choreo).toBeTruthy();
    expect(Object.keys(choreo!.first).length).toBeGreaterThan(0);
    expect(primaryLandTiming(choreo!)).toBeTruthy();
  });

  it("arming the posted session makes the rebake tween every dot fill", async () => {
    const bake = bakePageControl(["currentPage=1", "numberOfPages=3"]);
    const { window, document, messages } = await mountInteractive(bake);
    const section = document.querySelector("section.pdl-preview")!;
    const canvas = (section.querySelector(".pdl-state:not([hidden]) .pdl-canvas") ||
      section.querySelector(".pdl-canvas"))!;
    const dots = [...document.querySelectorAll('[data-pdl-instance-of="IosPageDot"]')];
    pressDot(window, dots[2]!);
    await new Promise((r) => setTimeout(r, 20));
    const interaction = messages.find(
      (m) => m.type === "pdl-interaction" && m.event === "pressEnd",
    ) as { choreography?: Parameters<typeof armChoreographyLand>[1] };
    const session = normalizeChoreoSession(interaction?.choreography);
    expect(session).toBeTruthy();

    armChoreographyLand(section, session!);
    const next = bakePageControl(["currentPage=3", "numberOfPages=3"]);
    const ok = reconcileBakedComponentIntoCanvas(
      canvas,
      bake.components.IosPageControl,
      next.components.IosPageControl,
      { sessionParams: { currentPage: 3, numberOfPages: 3 } },
    );
    expect(ok).toBe(true);
    await new Promise((r) => setTimeout(r, 40));

    const bands = [...document.querySelectorAll('[data-pdl-instance-of="IosPageDot"]')].map(
      (d) => d.querySelector(":scope > .pdl-layer-band > div")?.getAttribute("style") || "",
    );
    expect(bands.length).toBe(3);
    expect(bands[0]).toContain("500ms");
    expect(bands[2]).toContain("500ms");
  });

  it("snapshot ids resolve in the post-rebake DOM", async () => {
    const bake = bakePageControl(["currentPage=1", "numberOfPages=3"]);
    const { window, document, messages } = await mountInteractive(bake);
    const dots = [...document.querySelectorAll('[data-pdl-instance-of="IosPageDot"]')];
    pressDot(window, dots[2]!);
    await new Promise((r) => setTimeout(r, 20));
    const interaction = messages.find(
      (m) => m.type === "pdl-interaction" && m.event === "pressEnd",
    ) as { choreography?: unknown } | undefined;
    const choreo = normalizeChoreoSession(interaction?.choreography);
    const ids = Object.keys(choreo?.first ?? {});
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      const found = id.startsWith("let:")
        ? document.querySelector(`[data-pdl-instance-let="${id.slice(4)}"]`)
        : document.querySelector(`[data-pdl-id="${id}"]`);
      expect(found, `missing choreo id ${id}`).toBeTruthy();
    }
  });
});
