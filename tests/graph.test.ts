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
    const comps = g.components as Record<string, { name: string; rootKind: string }>;
    expect(comps).toBeDefined();
    expect(Array.isArray(comps)).toBe(false);
    const names = Object.keys(comps).sort();
    expect(names.length).toBeGreaterThan(10);
    for (const n of names) {
      expect(comps[n]!.name).toBe(n);
    }

    const prim = g.primitives as Record<string, { name: string }>;
    expect(Array.isArray(prim)).toBe(false);
    expect(Object.keys(prim).length).toBeGreaterThan(0);
    expect(prim[Object.keys(prim)[0]!]!.name).toBe(Object.keys(prim)[0]);

    const sem = g.semantics as Record<string, { name: string }>;
    expect(Array.isArray(sem)).toBe(false);

    const vts = g.variants as Record<string, { name: string; cases: string[] }>;
    expect(Array.isArray(vts)).toBe(false);
    expect(Object.keys(vts).length).toBeGreaterThan(0);

    const ts = g.typeStyles as Record<string, { name: string }>;
    expect(Array.isArray(ts)).toBe(false);
    expect(ts.AtomCaption!.name).toBe("AtomCaption");

    const th = g.themes as Record<string, { name: string; baseTheme: string | null }>;
    expect(Array.isArray(th)).toBe(false);
    expect(th.AtomsWarm!.name).toBe("AtomsWarm");
    expect(th.AtomsWarm!.baseTheme).toBeNull();
  });
});
