import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDesignGraph } from "../src/graph.js";
import { loadDesign } from "../src/loadDesign.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fx = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl", ...p);

describe("design graph", () => {
  it("includes merged modules and component AST", () => {
    const d = loadDesign(fx("design.pdl"));
    const g = buildDesignGraph(d) as Record<string, unknown>;
    expect(g.kind).toBe("designGraph");
    expect(Array.isArray(g.components)).toBe(true);
    expect((g.components as unknown[]).length).toBeGreaterThan(10);
  });
});
