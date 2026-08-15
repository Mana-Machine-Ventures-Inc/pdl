import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PdlError } from "../src/errors.js";
import { buildResolvedTokenMap } from "../src/evaluate.js";
import { loadDesign } from "../src/loadDesign.js";
import { resolveComponentTree } from "../src/resolveTree.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fx = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl", ...p);

describe("resolveComponentTree nested children", () => {
  it("attaches bare children = […] inside let to that frame, not Root", () => {
    const d = loadDesign(fx("molecules/m_10_form_group.pdl"));
    const tokens = buildResolvedTokenMap(d);
    const tree = resolveComponentTree(d, "MoleculeFieldBlock", tokens);
    const box = tree.children.find((c) => c.id === "Box")!;
    expect(box.kind).toBe("layout");
    expect(box.children).toHaveLength(1);
    expect(box.children[0]!.kind).toBe("text");
    expect(box.children[0]!.id).toBe("Val");
  });

  it("rejects the same let under two parents (PDL-E042)", () => {
    const d = loadDesign(fx("errors/e042-duplicate-mount-nested.pdl"));
    const tokens = buildResolvedTokenMap(d);
    try {
      resolveComponentTree(d, "DupMountNested", tokens);
      throw new Error("expected PDL-E042");
    } catch (e) {
      expect(e).toBeInstanceOf(PdlError);
      expect((e as PdlError).code).toBe("PDL-E042");
      expect((e as PdlError).message).toMatch(/label.*mounted more than once/i);
    }
  });
});
