import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBakedDesignComponent, buildBakedDesignSystem } from "../src/bakeDesign.js";
import { loadDesign } from "../src/loadDesign.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fx = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl", ...p);

describe("bakedDesign", () => {
  it("emits schemaKind bakedDesign with only components for bakeSystem", () => {
    const design = loadDesign(fx("atoms/hidden_frame_atoms.pdl"));
    const doc = buildBakedDesignSystem(design);
    expect(doc.schemaKind).toBe("bakedDesign");
    expect(doc.provenance.bakeProfile).toBe("system-defaults");
    expect(doc.components.AtomHiddenFrame).toBeDefined();
    expect(doc.components.AtomHiddenFrame!.root.children.map((c) => c.id)).toEqual(["A", "B"]);
  });

  it("bakeComponent hides layout frame when variant matches hidden condition", () => {
    const design = loadDesign(fx("atoms/hidden_frame_atoms.pdl"));
    const doc = buildBakedDesignComponent(design, {
      componentName: "AtomHiddenFrame",
      paramOverrides: { mode: "hideExtra" },
    });
    expect(doc.provenance.bakeProfile).toBe("component-explicit");
    const root = doc.components.AtomHiddenFrame!.root;
    expect(root.children.map((c) => c.id)).toEqual(["A"]);
  });

  it("omits typeStyle preset string after strip when it was the only extra prop on text", () => {
    const design = loadDesign(fx("atoms/text_atoms.pdl"));
    const doc = buildBakedDesignSystem(design);
    const row = doc.components.AtomTextTypeStyle!;
    const caption = row.root.children.find((c) => c.id === "A")!;
    expect(caption.props.content).toBe("Caption line");
    expect(caption.props).not.toHaveProperty("typeStyle");
  });
});
