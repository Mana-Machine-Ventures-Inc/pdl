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
