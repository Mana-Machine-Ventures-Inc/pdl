import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseModule } from "../src/parser.js";
import { loadDesign } from "../src/loadDesign.js";
import { buildComponentCatalogue } from "../src/catalogue.js";
import { buildResolvedTokenMap } from "../src/evaluate.js";
import { PDL_JSON_SCHEMA_VERSION } from "../src/graphJson.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const atomsDir = resolve(__dirname, "../test-fixtures/pdl/atoms");

describe("atoms fixtures", () => {
  it("parses every standalone .pdl file in atoms/", () => {
    const files = readdirSync(atomsDir).filter((f) => f.endsWith(".pdl"));
    expect(files.length).toBeGreaterThan(5);
    for (const f of files) {
      const path = join(atomsDir, f);
      const src = readFileSync(path, "utf-8");
      expect(() => parseModule(src, path)).not.toThrow();
    }
  });

  it("loads and catalogues atoms/design.pdl", () => {
    const entry = join(atomsDir, "design.pdl");
    const d = loadDesign(entry);
    expect(d.components.size).toBeGreaterThan(10);
    const cat = buildComponentCatalogue(d);
    expect(Object.keys(cat.components).length).toBe(d.components.size);
    expect(cat.schemaVersion).toBe(PDL_JSON_SCHEMA_VERSION);
    expect(Object.keys(cat.primitives).length).toBeGreaterThan(0);
    expect(cat.semantics).toBeDefined();
    expect(cat.themes).toBeDefined();
    expect(Object.keys(cat.typeStyles).length).toBeGreaterThan(0);
    expect(Object.keys(cat.variantTypes).length).toBeGreaterThan(0);
    expect(cat.variantTypes.AtomsTone).toBeDefined();
  });

  it("loads root design.pdl including atoms + merge chain", () => {
    const entry = resolve(__dirname, "../test-fixtures/pdl/integration/design.pdl");
    const d = loadDesign(entry);
    expect(d.primitives.get("color.merge.token")).toBeDefined();
    const cat = buildComponentCatalogue(d);
    const merged = cat.primitives["color.merge.token"]!.definition as { kind: string; value: string };
    expect(merged).toEqual({ kind: "hex", value: "#333333" });
    expect(buildResolvedTokenMap(d).get("color.merge.token")).toBe("#333333");
  });
});
