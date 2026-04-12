import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DESIGN_GRAPH_ROOT_KEYS, buildDesignGraph } from "../src/graph.js";
import { loadDesign } from "../src/loadDesign.js";
import { stableStringify } from "../src/stableJson.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const goldenDir = join(__dirname, "fixtures/atom-graph-expected");
const atomsDir = join(__dirname, "../test-fixtures/pdl/atoms");

function normalizeGraph(g: ReturnType<typeof buildDesignGraph>): unknown {
  const o = JSON.parse(JSON.stringify(g)) as Record<string, unknown>;
  o.entryPath = "<resolved>";
  o.modulePaths = (g as { modulePaths: string[] }).modulePaths.map((p) => basename(p)).sort();
  return o;
}

describe("atom design graph goldens", () => {
  const goldenFiles = readdirSync(goldenDir).filter((f) => f.endsWith(".graph.json"));

  it("exposes a stable top-level graph key set", () => {
    expect(DESIGN_GRAPH_ROOT_KEYS.length).toBe(16);
  });

  for (const gf of goldenFiles) {
    const atomFile = gf.replace(".graph.json", ".pdl");
    it(`graph for ${atomFile} matches golden (keys + full tree)`, () => {
      const expected = JSON.parse(readFileSync(join(goldenDir, gf), "utf-8")) as Record<string, unknown>;
      const entryPath = join(atomsDir, atomFile);
      const raw = buildDesignGraph(loadDesign(entryPath)) as Record<string, unknown>;
      expect(Object.keys(raw).sort()).toEqual([...DESIGN_GRAPH_ROOT_KEYS].sort());

      const actual = normalizeGraph(raw as ReturnType<typeof buildDesignGraph>) as Record<string, unknown>;
      expect(Object.keys(actual).sort()).toEqual([...DESIGN_GRAPH_ROOT_KEYS].sort());

      expect(stableStringify(actual)).toBe(stableStringify(expected));
    });
  }
});
