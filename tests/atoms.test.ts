import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseModule } from "../src/parser.js";
import { loadDesign } from "../src/loadDesign.js";
import { buildComponentCatalogue } from "../src/catalogue.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const atomsDir = resolve(__dirname, "../test-fixtures/pdl/atoms");

describe("atoms fixtures", () => {
  // Full design-graph equality (including every component body) is in atoms-graph-golden.test.ts.

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
    expect(cat.components.length).toBe(d.components.size);
    expect(cat.schemaVersion).toBe("1.0.0-beta");
  });

  it("loads root design.pdl including atoms + merge chain", () => {
    const entry = resolve(__dirname, "../test-fixtures/pdl/design.pdl");
    const d = loadDesign(entry);
    expect(d.primitives.get("color.merge.token")).toBeDefined();
    const cat = buildComponentCatalogue(d);
    expect(cat.tokens["color.merge.token"]).toBe("#333333");
  });
});
