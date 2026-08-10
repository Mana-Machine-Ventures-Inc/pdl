import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { loadDesign } from "../src/loadDesign.js";
import { buildBakedDesignComponent } from "../src/bakeDesign.js";

const fx = (rel: string) => join(process.cwd(), "test-fixtures/pdl", rel);

describe("gap cascade (columnGap / rowGap / gap)", () => {
  it("later gap clears prior columnGap and rowGap", () => {
    const design = loadDesign(fx("atoms/layout_enums_atoms.pdl"));
    const baked = buildBakedDesignComponent(design, {
      componentName: "AtomLayoutGapReset",
    });
    const props = baked.components.AtomLayoutGapReset!.root.props;
    expect(props.gap).toBe(8);
    expect(props).not.toHaveProperty("columnGap");
    expect(props).not.toHaveProperty("rowGap");
  });

  it("later columnGap/rowGap keep overriding after gap", () => {
    const design = loadDesign(fx("atoms/layout_enums_atoms.pdl"));
    const baked = buildBakedDesignComponent(design, {
      componentName: "AtomLayoutWrap",
    });
    const props = baked.components.AtomLayoutWrap!.root.props;
    expect(props.gap).toBe(6);
    expect(props.columnGap).toBeDefined();
    expect(props.rowGap).toBeDefined();
  });
});
