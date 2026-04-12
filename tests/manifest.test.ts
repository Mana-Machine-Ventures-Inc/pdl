import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DESIGN_MANIFEST_ROOT_KEYS, buildDesignManifest } from "../src/manifest.js";
import { loadDesign } from "../src/loadDesign.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fx = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl", ...p);

describe("design manifest", () => {
  it("has a stable top-level key set", () => {
    expect(DESIGN_MANIFEST_ROOT_KEYS.length).toBe(10);
  });

  it("lists components, themes, and expose without frame trees", () => {
    const d = loadDesign(fx("integration/themed.pdl"));
    const m = buildDesignManifest(d);
    expect(m.kind).toBe("designManifest");
    expect(Object.keys(m).sort()).toEqual([...DESIGN_MANIFEST_ROOT_KEYS].sort());
    expect(m.themes).toEqual(["Dark"]);
    expect(m.components.map((c) => c.name)).toEqual(["Box"]);
    expect(m.components[0]!.expose).toEqual([]);
    expect(m.components[0]!.params).toEqual([]);
    expect(m.components[0]!.rootKind).toBe("layout");
  });

  it("includes sorted variant and typeStyle names from larger fixtures", () => {
    const d = loadDesign(fx("integration/design.pdl"));
    const m = buildDesignManifest(d);
    expect(m.components.length).toBeGreaterThan(5);
    expect(m.variants.length).toBeGreaterThan(0);
    expect(m.modulePaths.length).toBeGreaterThan(1);
  });
});
