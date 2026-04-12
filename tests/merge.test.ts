import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildResolvedTokenMap } from "../src/evaluate.js";
import { loadDesign } from "../src/loadDesign.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fx = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl", ...p);

describe("import merge", () => {
  it("later modules override earlier token declarations", () => {
    const d = loadDesign(fx("merge_entry.pdl"));
    const m = buildResolvedTokenMap(d);
    expect(m.get("color.merge.token")).toBe("#333333");
  });
});
