import { describe, expect, it } from "vitest";
import { buildBakedDesignComponent } from "../src/bakeDesign.js";
import { loadDesign } from "../src/loadDesign.js";
import {
  renderBakedComponentToHtmlFragment,
  renderBakedDesignToHtmlDocument,
} from "../src/renderHtml.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fx = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl", ...p);

describe("renderHtml", () => {
  it("renders layout + text from a real bake", () => {
    const design = loadDesign(fx("molecules/m_02_buttons_basic.pdl"));
    const doc = buildBakedDesignComponent(design, { componentName: "MoleculeTextButton" });
    const comp = doc.components.MoleculeTextButton!;
    const frag = renderBakedComponentToHtmlFragment(comp);
    expect(frag).toContain('data-pdl-id="Root"');
    expect(frag).toContain('data-pdl-id="L"');
    expect(frag).toContain("pdl-text");
    expect(frag).toContain("Button");
    expect(frag).toContain("flex-direction:row");
    expect(frag).not.toContain("<script");
  });

  it("wraps a full HTML document for gallery mode", () => {
    const design = loadDesign(fx("integration/empty_layout_shell.pdl"));
    const doc = buildBakedDesignComponent(design, { componentName: "EmptyLayoutShell" });
    const html = renderBakedDesignToHtmlDocument(doc, { singleComponent: "EmptyLayoutShell" });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("EmptyLayoutShell");
    expect(html).toContain('data-pdl-id="SlotThree"');
    expect(html).toContain("#D4A574");
  });

  it("empty root layout with fill + background still paints (canvas establishes height for %)", () => {
    const doc = {
      schemaKind: "bakedDesign" as const,
      schemaVersion: "1.0.0-beta",
      generatedAt: "2026-01-01T00:00:00.000Z",
      provenance: {
        entryPath: "/x.pdl",
        bakedTheme: null,
        bakeProfile: "component-explicit" as const,
      },
      components: {
        Button: {
          name: "Button",
          rootKind: "layout",
          bakedParams: {},
          root: {
            id: "Root",
            kind: "layout",
            props: {
              background: "#FF5A5F",
              width: "fill",
              height: "fill",
            },
            children: [],
          },
        },
      },
    };
    const html = renderBakedDesignToHtmlDocument(doc, { singleComponent: "Button" });
    expect(html).toContain("#FF5A5F");
    expect(html).toContain("width: 100%");
    expect(html).toContain("height: 400pt");
    expect(html).toContain("align-items: flex-start");
  });

  it("canvas uses flex-start so root hug width is not stretched by the preview chrome", () => {
    const doc = {
      schemaKind: "bakedDesign" as const,
      schemaVersion: "1.0.0-beta",
      generatedAt: "2026-01-01T00:00:00.000Z",
      provenance: {
        entryPath: "/x.pdl",
        bakedTheme: null,
        bakeProfile: "component-explicit" as const,
      },
      components: {
        Huggy: {
          name: "Huggy",
          rootKind: "layout",
          bakedParams: {},
          root: {
            id: "Root",
            kind: "layout",
            props: {
              direction: "row",
              background: "#00f",
              width: "hug",
              height: "hug",
            },
            children: [
              {
                id: "T",
                kind: "text",
                props: { content: "Hi" },
                children: [],
              },
            ],
          },
        },
      },
    };
    const html = renderBakedDesignToHtmlDocument(doc, { singleComponent: "Huggy" });
    expect(html).toContain("align-items: flex-start");
    expect(html).toMatch(/data-pdl-id="Root"[^>]*width:auto/);
  });

  it("escapes text content for HTML safety", () => {
    const doc = {
      schemaKind: "bakedDesign" as const,
      schemaVersion: "1.0.0-beta",
      generatedAt: "2026-01-01T00:00:00.000Z",
      provenance: {
        entryPath: "/x.pdl",
        bakedTheme: null,
        bakeProfile: "component-explicit" as const,
      },
      components: {
        X: {
          name: "X",
          rootKind: "layout",
          bakedParams: {},
          root: {
            id: "Root",
            kind: "layout",
            props: { direction: "column" },
            children: [
              {
                id: "T",
                kind: "text",
                props: { content: '<img src=x onerror="alert(1)">' },
                children: [],
              },
            ],
          },
        },
      },
    };
    const frag = renderBakedComponentToHtmlFragment(doc.components.X!);
    expect(frag).toContain("&lt;img");
    expect(frag).not.toContain("<img src=x");
  });
});
