/**
 * Layer structure pending overlay tests.
 */
import { describe, expect, it } from "vitest";
import {
  effectiveRootChildNames,
  moveRootChild,
  overlayStructureOnBake,
  suggestLayerName,
} from "../apps/studio/src/canvas/layerStructure.js";

const BAKE = {
  root: {
    kind: "layout",
    children: [
      { id: "Label", kind: "text", props: { content: "Hi" }, children: [] },
      { id: "Icon", kind: "icon", props: { size: 16 }, children: [] },
    ],
  },
};

describe("layerStructure", () => {
  it("applies add, delete, reorder pending", () => {
    const pending = [
      { id: "1", kind: "addLayer", target: "root", payload: { kind: "layout", name: "Row" } },
      { id: "2", kind: "deleteLayer", target: "let:Icon" },
      { id: "3", kind: "reorderChildren", target: "root", payload: { order: ["Row", "Label"] } },
    ];
    expect(effectiveRootChildNames(BAKE, pending)).toEqual(["Row", "Label"]);
    const out = overlayStructureOnBake(BAKE, pending);
    expect(out.root.children.map((c) => c.id)).toEqual(["Row", "Label"]);
  });

  it("moves root child order", () => {
    const order = moveRootChild(BAKE, "Icon", -1, []);
    expect(order).toEqual(["Icon", "Label"]);
  });

  it("suggests unused layer names", () => {
    expect(suggestLayerName(BAKE, "text")).toBe("Label2");
    expect(suggestLayerName(BAKE, "layout")).toBe("Box");
  });
});
