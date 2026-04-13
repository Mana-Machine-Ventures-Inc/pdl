import { describe, expect, it } from "vitest";
import { buildBakedDesignComponent } from "../src/bakeDesign.js";
import { loadDesign } from "../src/loadDesign.js";
import {
  renderBakedComponentToHtmlFragment,
  renderBakedDesignToHtmlDocument,
  renderBakedDesignToHtmlDocumentWithReport,
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

  it("renderBakedDesignToHtmlDocumentWithReport returns html and empty failures for a valid bake", () => {
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
            props: { background: "#FF5A5F", width: "fill", height: "fill" },
            children: [],
          },
        },
      },
    };
    const { html, renderFailures } = renderBakedDesignToHtmlDocumentWithReport(doc, {
      singleComponent: "Button",
    });
    expect(renderFailures).toEqual([]);
    expect(html).toContain("pdl-gallery");
    expect(html).toContain("#FF5A5F");
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

  it("emits four-value border-radius for asymmetric Corner (e.g. br = 0)", () => {
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
        Card: {
          name: "Card",
          rootKind: "layout",
          bakedParams: {},
          root: {
            id: "Root",
            kind: "layout",
            props: {
              direction: "column",
              cornerRadius: { tl: 12, tr: 12, br: 0, bl: 12 },
            },
            children: [],
          },
        },
      },
    };
    const frag = renderBakedComponentToHtmlFragment(doc.components.Card!);
    expect(frag).toContain("border-radius:12px 12px 0px 12px");
  });

  it("maps flex sizing to min/max/width and column-gap / row-gap", () => {
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
        Flexy: {
          name: "Flexy",
          rootKind: "layout",
          bakedParams: {},
          root: {
            id: "Root",
            kind: "layout",
            props: {
              direction: "row",
              columnGap: 6,
              rowGap: 10,
              width: { flex: { min: 40, max: 200, preferred: 100 } },
            },
            children: [],
          },
        },
      },
    };
    const frag = renderBakedComponentToHtmlFragment(doc.components.Flexy!);
    expect(frag).toContain("min-width:40px");
    expect(frag).toContain("max-width:200px");
    expect(frag).toContain("width:100px");
    expect(frag).toContain("flex:1 1 auto");
    expect(frag).toContain("column-gap:6px");
    expect(frag).toContain("row-gap:10px");
  });

  it("emits border and box-shadow from baked props", () => {
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
        B: {
          name: "B",
          rootKind: "layout",
          bakedParams: {},
          root: {
            id: "Root",
            kind: "layout",
            props: {
              direction: "column",
              borderWidth: 2,
              borderColor: "#112233",
              shadow: "0 2px 4px rgba(0,0,0,0.2)",
            },
            children: [],
          },
        },
      },
    };
    const frag = renderBakedComponentToHtmlFragment(doc.components.B!);
    expect(frag).toContain("border:2px solid #112233");
    expect(frag).toContain("box-shadow:0 2px 4px rgba(0,0,0,0.2)");
  });

  it("renders multi-layer background and foreground as bands (not inset foreground box-shadow)", () => {
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
        Layered: {
          name: "Layered",
          rootKind: "layout",
          bakedParams: {},
          root: {
            id: "Root",
            kind: "layout",
            props: {
              direction: "column",
              background: ["#F7F7F7", "#2222229e"],
              foreground: ["#00ff0040"],
            },
            children: [],
          },
        },
      },
    };
    const frag = renderBakedComponentToHtmlFragment(doc.components.Layered!);
    expect(frag).toContain("pdl-layout--layers");
    expect(frag).toContain("pdl-layer-band");
    expect(frag).toContain("#F7F7F7");
    expect(frag).toContain("#2222229e");
    expect(frag).toContain("#00ff0040");
    expect(frag).not.toMatch(/box-shadow:[^"]*inset 0 0 0 100vmax/);
  });

  it("renders blur in a background stack with backdrop-filter", () => {
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
        BlurCard: {
          name: "BlurCard",
          rootKind: "layout",
          bakedParams: {},
          root: {
            id: "Root",
            kind: "layout",
            props: {
              direction: "column",
              background: [{ kind: "blur", blur: 6 }, "#f7f7f79e"],
            },
            children: [],
          },
        },
      },
    };
    const frag = renderBakedComponentToHtmlFragment(doc.components.BlurCard!);
    expect(frag).toContain("pdl-layout--layers");
    expect(frag).toMatch(/backdrop-filter:blur\(6px\)/);
    expect(frag).toContain("#f7f7f79e");
  });

  it("maps text line-height and letter-spacing", () => {
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
        T: {
          name: "T",
          rootKind: "layout",
          bakedParams: {},
          root: {
            id: "Root",
            kind: "layout",
            props: { direction: "column" },
            children: [
              {
                id: "L",
                kind: "text",
                props: { content: "Hi", fontSize: 20, lineHeight: 1.5, letterSpacing: 0.02 },
                children: [],
              },
            ],
          },
        },
      },
    };
    const frag = renderBakedComponentToHtmlFragment(doc.components.T!);
    expect(frag).toContain("line-height:1.5");
    expect(frag).toContain("letter-spacing:0.4px");
  });
});
