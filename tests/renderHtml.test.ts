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
    expect(html).toContain("width:100%");
    expect(html).toContain("height:100%");
    expect(html).toContain("pdl-canvas--fill-height");
    expect(html).toMatch(/\.pdl-canvas--fill-height\s*\{[^}]*height:\s*240px/);
    expect(html).toContain("align-items: flex-start");
  });

  it("canvas is width:100% so root width=.fill can expand to the preview", () => {
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
        WideText: {
          name: "WideText",
          rootKind: "text",
          bakedParams: {},
          root: {
            id: "Root",
            kind: "text",
            props: {
              content: "Hello",
              width: "fill",
              background: "#eee",
            },
            children: [],
          },
        },
      },
    };
    const html = renderBakedDesignToHtmlDocument(doc, { singleComponent: "WideText" });
    expect(html).toMatch(/\.pdl-canvas\s*\{[^}]*width:\s*100%/);
    expect(html).toMatch(/data-pdl-id="Root"[^>]*width:100%/);
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
    expect(html).not.toMatch(/<div class="[^"]*pdl-canvas--fill-height/);
  });

  it("hug text in a row with a .fill sibling does not flex-shrink below content", () => {
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
        Row: {
          name: "Row",
          rootKind: "layout",
          bakedParams: {},
          root: {
            id: "Root",
            kind: "layout",
            props: { direction: "row", width: { fixed: 400 } },
            children: [
              {
                id: "A",
                kind: "text",
                props: { content: "Hello", width: "fill", background: "#0000004D" },
                children: [],
              },
              {
                id: "B",
                kind: "text",
                props: { content: "Hello", fontSize: 12, background: "#0000004D" },
                children: [],
              },
            ],
          },
        },
      },
    };
    const frag = renderBakedComponentToHtmlFragment(doc.components.Row!);
    expect(frag).toMatch(/data-pdl-id="A"[^>]*width:100%/);
    expect(frag).toMatch(/data-pdl-id="B"[^>]*flex-shrink:0/);
    expect(frag).toMatch(/data-pdl-id="B"[^>]*min-width:min-content/);
  });

  it("reverseStack paints first child above later siblings", () => {
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
        Rev: {
          name: "Rev",
          rootKind: "layout",
          bakedParams: {},
          root: {
            id: "Root",
            kind: "layout",
            props: { direction: "reverseStack", align: "center", justify: "center" },
            children: [
              { id: "A", kind: "text", props: { content: "front" }, children: [] },
              { id: "B", kind: "text", props: { content: "back" }, children: [] },
            ],
          },
        },
      },
    };
    const frag = renderBakedComponentToHtmlFragment(doc.components.Rev!);
    expect(frag).toContain("display:grid");
    expect(frag).toMatch(/data-pdl-id="A"[^>]*z-index:2/);
    expect(frag).toMatch(/data-pdl-id="B"[^>]*z-index:1/);
  });

  it("stack-centered hug text does not force width:100% (so place-items can center)", () => {
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
        StackText: {
          name: "StackText",
          rootKind: "layout",
          bakedParams: {},
          root: {
            id: "Root",
            kind: "layout",
            props: {
              direction: "stack",
              align: "center",
              justify: "center",
              width: { fixed: 200 },
              height: { fixed: 200 },
            },
            children: [
              {
                id: "A",
                kind: "text",
                props: { content: "Hello", color: "#f00", fontSize: 32 },
                children: [],
              },
            ],
          },
        },
      },
    };
    const frag = renderBakedComponentToHtmlFragment(doc.components.StackText!);
    expect(frag).toContain("place-items:center center");
    expect(frag).toMatch(/data-pdl-id="A"[^>]*>/);
    const textOpen = frag.match(/data-pdl-id="A"[^>]*>/)?.[0] ?? "";
    expect(textOpen).not.toContain("width:100%");
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

  it("emits outside border as outer box-shadow ring with drop Shadow (paint-only)", () => {
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
              shadow: {
                kind: "shadow",
                x: 0,
                y: 2,
                blurRadius: 4,
                spread: 0,
                color: "#00000033",
              },
            },
            children: [],
          },
        },
      },
    };
    const frag = renderBakedComponentToHtmlFragment(doc.components.B!);
    expect(frag).toContain("box-shadow:0 0 0 2px #112233, 0px 2px 4px 0px #00000033");
    expect(frag).not.toContain("border:2px solid");
  });

  it("maps inside borderPosition to inset box-shadow with Shadow object", () => {
    const frag = renderBakedComponentToHtmlFragment({
      name: "In",
      rootKind: "layout",
      bakedParams: {},
      root: {
        id: "Root",
        kind: "layout",
        props: {
          direction: "column",
          borderWidth: 3,
          borderColor: "#ff0000",
          borderPosition: "inside",
          shadow: {
            kind: "shadow",
            x: 0,
            y: 1,
            blurRadius: 2,
            spread: 0,
            color: "#00000033",
          },
        },
        children: [],
      },
    });
    expect(frag).toContain("box-shadow:inset 0 0 0 3px #ff0000, 0px 1px 2px 0px #00000033");
    expect(frag).not.toContain("border:3px solid");
  });

  it("outside border keeps fixed width/height and does not emit CSS border", () => {
    const frag = renderBakedComponentToHtmlFragment({
      name: "FixedBorder",
      rootKind: "layout",
      bakedParams: {},
      root: {
        id: "Root",
        kind: "layout",
        props: {
          direction: "column",
          width: { fixed: 100 },
          height: { fixed: 100 },
          borderWidth: 4,
          borderColor: "#00aa00",
          borderPosition: "outside",
        },
        children: [],
      },
    });
    expect(frag).toContain("width:100px");
    expect(frag).toContain("height:100px");
    expect(frag).toContain("box-shadow:0 0 0 4px #00aa00");
    expect(frag).not.toMatch(/border:\s*4px/);
  });

  it("maps media aspectRatio and objectPosition", () => {
    const frag = renderBakedComponentToHtmlFragment({
      name: "M",
      rootKind: "media",
      bakedParams: {},
      root: {
        id: "Root",
        kind: "media",
        props: {
          source: "https://example.com/a.jpg",
          width: { fixed: 240 },
          aspectRatio: 1.5,
          contentMode: "cover",
          objectPosition: "topLeft",
        },
        children: [],
      },
    });
    expect(frag).toContain("aspect-ratio:1.5");
    expect(frag).toContain("object-fit:cover");
    expect(frag).toContain("object-position:top left");
  });

  it("vertically aligns text via align on a fixed-height text root", () => {
    const frag = renderBakedComponentToHtmlFragment({
      name: "T",
      rootKind: "text",
      bakedParams: {},
      root: {
        id: "Root",
        kind: "text",
        props: {
          content: "Hi",
          width: { fixed: 200 },
          height: { fixed: 80 },
          align: "center",
          justify: "end",
        },
        children: [],
      },
    });
    expect(frag).toContain("justify-content:center");
    expect(frag).toContain("text-align:end");
  });

  it("applies previewBackground to the document chrome", () => {
    const doc = {
      schemaKind: "bakedDesign" as const,
      schemaVersion: "1.0.0-beta",
      generatedAt: "2026-01-01T00:00:00.000Z",
      provenance: {
        entryPath: "/x.pdl",
        bakedTheme: null,
        bakeProfile: "component-explicit" as const,
      },
      previewBackground: "#112233",
      components: {
        X: {
          name: "X",
          rootKind: "layout",
          bakedParams: {},
          root: {
            id: "Root",
            kind: "layout",
            props: { direction: "column" },
            children: [],
          },
        },
      },
    };
    const html = renderBakedDesignToHtmlDocument(doc, { singleComponent: "X" });
    expect(html).toContain("--pdl-preview-background: #112233");
  });

  it("renders vibrancy as backdrop-filter saturate/brightness", () => {
    const frag = renderBakedComponentToHtmlFragment({
      name: "V",
      rootKind: "layout",
      bakedParams: {},
      root: {
        id: "Root",
        kind: "layout",
        props: {
          direction: "column",
          background: [
            { kind: "blur", blur: 8, vibrancy: { saturation: 1.2, brightness: 0.95 } },
            "#ffffff80",
          ],
        },
        children: [],
      },
    });
    expect(frag).toMatch(/backdrop-filter:blur\(8px\) saturate\(1\.2\) brightness\(0\.95\)/);
  });

  it("shows icon name inside the color swatch", () => {
    const frag = renderBakedComponentToHtmlFragment({
      name: "I",
      rootKind: "icon",
      bakedParams: {},
      root: {
        id: "Root",
        kind: "icon",
        props: { icon: "star", size: 32, color: "#336699" },
        children: [],
      },
    });
    expect(frag).toContain("pdl-icon__name");
    expect(frag).toContain("star");
    expect(frag).toContain("#336699");
  });

  it("keeps layered background chrome outside the overflow scrollport", () => {
    const frag = renderBakedComponentToHtmlFragment({
      name: "ScrollChrome",
      rootKind: "layout",
      bakedParams: {},
      root: {
        id: "Root",
        kind: "layout",
        props: {
          direction: "row",
          width: { fixed: 200 },
          height: { fixed: 100 },
          background: "#9999994D",
          overflow: "scroll",
          cornerRadius: { tl: 12, tr: 32, br: 12, bl: 0 },
        },
        children: [
          {
            id: "A",
            kind: "text",
            props: { content: "Hello" },
            children: [],
          },
        ],
      },
    });
    expect(frag).toContain("pdl-layout--layers");
    expect(frag).toContain("pdl-layer-band");
    expect(frag).toContain("pdl-layout__content");
    // Overflow scrolls children only — not the shell that owns the background band.
    expect(frag).toMatch(/pdl-layout__content"[^>]*overflow:scroll/);
    expect(frag).not.toMatch(/pdl-layout--layers"[^>]*overflow:scroll/);
    // Band precedes the content scrollport in the shell.
    const bandAt = frag.indexOf("pdl-layer-band");
    const contentAt = frag.indexOf("pdl-layout__content");
    expect(bandAt).toBeGreaterThan(-1);
    expect(contentAt).toBeGreaterThan(bandAt);
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

  it("marks parent interactive when nested instances have host handlers", () => {
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
        LibrarySubnav: {
          name: "LibrarySubnav",
          rootKind: "layout",
          bakedParams: {},
          root: {
            id: "Root",
            kind: "layout",
            props: { direction: "row" },
            children: [
              {
                id: "Chip0",
                kind: "layout",
                instanceOf: "FilterChip",
                instanceKwargs: { filter: "all", selected: true },
                props: {},
                children: [],
              },
            ],
          },
        },
      },
    };
    const html = renderBakedDesignToHtmlDocument(doc, {
      singleComponent: "LibrarySubnav",
      interactiveHost: true,
      interactionsByComponent: {
        FilterChip: [
          {
            name: "default",
            handlers: [{ event: "pressEnd", body: [] }],
          },
        ],
      },
      // Intentionally omit emitCaptures — nested handlers alone must enable the host.
    });
    expect(html).toContain('data-pdl-component="LibrarySubnav"');
    expect(html).toContain('data-pdl-interactive="1"');
    expect(html).toContain('data-pdl-instance-of="FilterChip"');
  });

  it("truncateStyle=.clip with lineClamp does not emit ellipsis or -webkit-line-clamp", () => {
    const frag = renderBakedComponentToHtmlFragment({
      name: "T",
      rootKind: "text",
      bakedParams: {},
      root: {
        id: "Root",
        kind: "text",
        props: {
          content: "Long copy that would otherwise ellipsize",
          overflow: "clip",
          truncateStyle: "clip",
          lineClamp: 2,
          fontSize: 16,
          lineHeight: 1.5,
        },
        children: [],
      },
    });
    expect(frag).toContain('class="pdl-text__clamp"');
    expect(frag).toContain("text-overflow:clip");
    expect(frag).toContain("max-height:48px"); // 16 * 1.5 * 2
    expect(frag).not.toContain("text-overflow:ellipsis");
    expect(frag).not.toContain("-webkit-line-clamp");
  });

  it("lineClamp hides excess lines even when frame overflow is visible", () => {
    const frag = renderBakedComponentToHtmlFragment({
      name: "T",
      rootKind: "text",
      bakedParams: {},
      root: {
        id: "Root",
        kind: "text",
        props: {
          content: "Hello a a a a a a a a a a a a a a a a a a a a",
          overflow: "visible",
          truncateStyle: "clip",
          lineClamp: 2,
          fontSize: 34,
          lineHeight: 1.2,
          width: { fixed: 200 },
          height: { fixed: 150 },
        },
        children: [],
      },
    });
    // Outer keeps frame overflow + size; inner always clips the truncated tail.
    expect(frag).toMatch(/pdl-text"[^>]*overflow:visible/);
    expect(frag).toContain("height:150px");
    expect(frag).toContain('class="pdl-text__clamp"');
    expect(frag).toMatch(/pdl-text__clamp"[^>]*overflow:hidden/);
    expect(frag).toContain("max-height:81.6px"); // 34 * 1.2 * 2
    expect(frag).not.toContain("text-overflow:ellipsis");
  });

  it("truncateStyle=.ellipsis with lineClamp uses -webkit-line-clamp on inner", () => {
    const frag = renderBakedComponentToHtmlFragment({
      name: "T",
      rootKind: "text",
      bakedParams: {},
      root: {
        id: "Root",
        kind: "text",
        props: {
          content: "Long copy",
          overflow: "clip",
          truncateStyle: "ellipsis",
          lineClamp: 2,
        },
        children: [],
      },
    });
    expect(frag).toContain('class="pdl-text__clamp"');
    expect(frag).toContain("-webkit-line-clamp:2");
    expect(frag).toContain("text-overflow:ellipsis");
  });

  it("maps overflow=.clip to overflow:hidden in HTML preview", () => {
    const frag = renderBakedComponentToHtmlFragment({
      name: "T",
      rootKind: "text",
      bakedParams: {},
      root: {
        id: "Root",
        kind: "text",
        props: { content: "Long copy", overflow: "clip", width: { fixed: 200 }, height: { fixed: 200 } },
        children: [],
      },
    });
    expect(frag).toContain("overflow:hidden");
    expect(frag).not.toContain("overflow:clip");
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
