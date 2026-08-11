import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { loadDesign } from "../src/loadDesign.js";
import { buildBakedDesignComponent } from "../src/bakeDesign.js";

const fx = (rel: string) => join(process.cwd(), "test-fixtures/pdl", rel);

describe("qualified frame enums (TypeName.case)", () => {
  it("loads and bakes AtomQualifiedEnums", () => {
    const design = loadDesign(fx("atoms/qualified_enums.pdl"));
    expect(design.components.has("AtomQualifiedEnums")).toBe(true);
    const baked = buildBakedDesignComponent(design, {
      componentName: "AtomQualifiedEnums",
    });
    const root = baked.components.AtomQualifiedEnums?.root as {
      props?: Record<string, unknown>;
    };
    expect(root?.props?.direction).toBe("row");
    expect(root?.props?.justify).toBe("center");
    expect(root?.props?.align).toBe("stretch");
    expect(root?.props?.wrap).toBe("nowrap");
    expect(root?.props?.overflow).toBe("clip");
    expect(root?.props?.width).toBe("fill");
    expect(root?.props?.height).toBe("hug");
  });
});

describe("qualified user variants (VariantName.case)", () => {
  it("loads Tone.primary defaults and conditions", () => {
    const design = loadDesign(fx("atoms/qualified_variant_enums.pdl"));
    expect(design.components.has("AtomQualifiedVariantEnums")).toBe(true);
    const comp = design.components.get("AtomQualifiedVariantEnums")!;
    const tone = comp.params.find((p) => p.name === "tone");
    expect(tone?.defaultValue).toEqual({ kind: "dotEnum", value: ".primary" });
    const baked = buildBakedDesignComponent(design, {
      componentName: "AtomQualifiedVariantEnums",
    });
    const root = baked.components.AtomQualifiedVariantEnums?.root as {
      props?: Record<string, unknown>;
    };
    expect(root?.props?.background).toBe("#2563EB");
  });
});

describe("contentMode = .fill (shared spelling with Sizing.fill)", () => {
  it("bakes contentMode=.fill and width=.fill without PDL-E006", () => {
    const design = loadDesign(fx("atoms/content_mode_fill.pdl"));
    const baked = buildBakedDesignComponent(design, {
      componentName: "AtomContentModeFill",
    });
    const root = baked.components.AtomContentModeFill?.root as {
      props?: Record<string, unknown>;
    };
    expect(root?.props?.contentMode).toBe("fill");
    expect(root?.props?.width).toBe("fill");
    expect(root?.props?.height).toBe("hug");
  });
});
