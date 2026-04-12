import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildResolvedTokenMap } from "../src/evaluate.js";
import { loadDesign } from "../src/loadDesign.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fx = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl", ...p);

describe("import merge", () => {
  it("later modules override earlier token declarations", () => {
    const d = loadDesign(fx("integration/merge_entry.pdl"));
    const m = buildResolvedTokenMap(d);
    expect(m.get("color.merge.token")).toBe("#333333");
  });

  it("merges each physical module once so rules/usage are not duplicated when imports converge", () => {
    const d = loadDesign(fx("molecules/design.pdl"));
    const btn = d.rules.get("MoleculeTextButton");
    expect(btn?.map((s) => s.kind)).toEqual(["tagsSet", "tagsAdd", "ruleLine"]);
  });
});
