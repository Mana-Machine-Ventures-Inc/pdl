import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBakedDesignComponent } from "../src/bakeDesign.js";
import { loadDesign } from "../src/loadDesign.js";
import { renderBakedComponentToHtmlFragment } from "../src/renderHtml.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fx = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl", ...p);

describe("scalar numeric sugar", () => {
  it("coerces uniform padding, margin, inset and fixed width/height on bake", () => {
    const design = loadDesign(fx("atoms/scalar_numeric_sugar.pdl"));
    const doc = buildBakedDesignComponent(design, { componentName: "ScalarNumericSugar" });
    const root = doc.components.ScalarNumericSugar!.root;
    expect(root.props.padding).toEqual({ top: 12, right: 12, bottom: 12, left: 12 });
    expect(root.props.margin).toEqual({ top: 8, right: 8, bottom: 8, left: 8 });
    expect(root.props.width).toEqual({ fixed: 200 });
    expect(root.props.height).toEqual({ fixed: 100 });
    const t = root.children[0]!;
    expect(t.props.padding).toEqual({ top: 4, right: 4, bottom: 4, left: 4 });
    expect(t.props.width).toEqual({ fixed: 80 });
  });

  it("rejects negative scalar sugar for edge insets", () => {
    expect(() => loadDesign(fx("atoms/scalar_numeric_sugar_bad.pdl"))).toThrow(
      /padding|non-negative|edgeInsets|PDL-E006/,
    );
  });

  it("renderHtml emits padding, margin, and fixed sizing from baked props", () => {
    const design = loadDesign(fx("atoms/scalar_numeric_sugar.pdl"));
    const doc = buildBakedDesignComponent(design, { componentName: "ScalarNumericSugar" });
    const frag = renderBakedComponentToHtmlFragment(doc.components.ScalarNumericSugar!);
    expect(frag).toMatch(/data-pdl-id="Root"[^>]*padding:12px/);
    expect(frag).toMatch(/data-pdl-id="Root"[^>]*margin:8px/);
    expect(frag).toMatch(/data-pdl-id="Root"[^>]*width:200px/);
    expect(frag).toMatch(/data-pdl-id="Root"[^>]*height:100px/);
    expect(frag).toMatch(/data-pdl-id="T"[^>]*padding:4px/);
    expect(frag).toMatch(/data-pdl-id="T"[^>]*width:80px/);
  });

  it("renderHtml maps baked { fixed: n } width to px", () => {
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
        W: {
          name: "W",
          rootKind: "layout",
          bakedParams: {},
          root: {
            id: "Root",
            kind: "layout",
            props: { direction: "column", width: { fixed: 240 } },
            children: [],
          },
        },
      },
    };
    const frag = renderBakedComponentToHtmlFragment(doc.components.W!);
    expect(frag).toContain("width:240px");
  });
});
