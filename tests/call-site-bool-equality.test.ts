import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildBakedDesignComponent } from "../src/bakeDesign.js";
import { loadDesign } from "../src/loadDesign.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fx = (...parts: string[]) => path.join(here, "..", "test-fixtures", "pdl", ...parts);

describe("call-site Bool equality kwargs", () => {
  it("loads and bakes selected: currentFilter == .case", () => {
    const design = loadDesign(fx("protocols", "filter_bar_callsite_bool.pdl"));
    const doc = buildBakedDesignComponent(design, {
      componentName: "CallSiteFilterBar",
      paramOverrides: { currentFilter: "podcasts" },
    });
    const children = doc.components.CallSiteFilterBar.root.children ?? [];
    expect(children).toHaveLength(2);
    expect(children[0]?.props?.background).toBe("#EEEEEE");
    expect(children[1]?.props?.background).toBe("#111111");
  });
});
