/**
 * @vitest-environment happy-dom
 *
 * Hover chrome must stay on the preview section that received the pointer —
 * not rebake the component type (that would paint every gallery instance).
 */
import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { buildBakedDesignComponent } from "../src/bakeDesign.js";
import { buildComponentCatalogue } from "../src/catalogue.js";
import { loadDesign } from "../src/loadDesign.js";
import { renderBakedDesignToHtmlDocumentWithReport } from "../src/renderHtml.js";

const fx = (...p: string[]) => resolve(process.cwd(), "test-fixtures/pdl", ...p);

async function mountMotionHoverChip() {
  const design = loadDesign(fx("lab/motion/design.pdl"));
  const cat = buildComponentCatalogue(design);
  const interactionsByComponent: Record<string, unknown> = {};
  for (const [name, row] of Object.entries(cat.components)) {
    if (row.interactions?.length) interactionsByComponent[name] = row.interactions;
  }
  const doc = buildBakedDesignComponent(design, { componentName: "MotionHoverChip" });
  const { html } = renderBakedDesignToHtmlDocumentWithReport(doc, {
    singleComponent: "MotionHoverChip",
    interactionsByComponent,
    interactiveHost: true,
  });
  const window = new Window({ url: "http://localhost/" });
  const document = window.document;
  document.write(html);
  document.close();
  const messages: object[] = [];
  window.parent = {
    postMessage(payload: object) {
      messages.push(payload);
    },
  } as never;
  for (const s of [...document.querySelectorAll("script")]) {
    window.eval(s.textContent || "");
  }
  await new Promise((r) => setTimeout(r, 20));
  return { document, messages };
}

describe("motion hover isolation", () => {
  it("standalone HoverChip hover posts that section's interaction only", async () => {
    const { document, messages } = await mountMotionHoverChip();
    const section = document.querySelector(
      'section.pdl-preview[data-pdl-component="MotionHoverChip"]',
    )!;
    expect(section).toBeTruthy();
    const canvas = section.querySelector(".pdl-canvas")!;
    expect(canvas).toBeTruthy();
    canvas.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));

    const ix = messages.find(
      (m) =>
        (m as { type?: string }).type === "pdl-interaction" &&
        (m as { event?: string }).event === "hoverStart",
    ) as
      | {
          component?: string;
          event?: string;
          params?: { interactionState?: unknown };
          previewHandled?: boolean;
        }
      | undefined;
    expect(ix).toBeTruthy();
    expect(ix?.component).toBe("MotionHoverChip");
    expect(String(ix?.params?.interactionState ?? "")).toMatch(/hovered/);
  });

  it("preview chrome (title, usage, clip rack) does not fire hover", async () => {
    const { document, messages } = await mountMotionHoverChip();
    const section = document.querySelector(
      'section.pdl-preview[data-pdl-component="MotionHoverChip"]',
    )!;
    const usage = section.querySelector(".pdl-usage");
    const title = section.querySelector(".pdl-preview-title");
    const bar = section.querySelector("[data-pdl-motion-bar]");
    for (const el of [section, usage, title, bar]) {
      el?.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    }
    await new Promise((r) => setTimeout(r, 20));
    expect(
      messages.some(
        (m) =>
          (m as { type?: string }).type === "pdl-interaction" &&
          (m as { event?: string }).event === "hoverStart",
      ),
    ).toBe(false);
  });
});
