import { describe, expect, it, vi } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as catalogue from "../src/catalogue.js";
import { buildResolvedComponentDocument } from "../src/resolveBundle.js";
import { loadDesign } from "../src/loadDesign.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fx = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl", ...p);

describe("resolvedComponent build path", () => {
  it("does not invoke buildComponentCatalogue (single-row path only)", () => {
    const spy = vi.spyOn(catalogue, "buildComponentCatalogue");
    const design = loadDesign(fx("integration/greeting.pdl"));
    const doc = buildResolvedComponentDocument(design, { componentName: "Greeting" });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    expect(doc.components.Greeting).toBeDefined();
    expect(doc.schemaKind).toBe("resolvedComponent");
  });
});
