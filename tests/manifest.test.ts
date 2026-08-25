import { describe, expect, it } from "vitest";
import {
  DESIGN_MANIFEST_ROOT_KEYS,
  buildDesignManifestFromCatalogue,
} from "../src/manifest.js";
import { catalogue, fx, tokensDocument } from "./helpers/rustFixtures.js";

const manifestFor = (rel: string) =>
  buildDesignManifestFromCatalogue(catalogue(fx(rel)), tokensDocument(fx(rel)));

describe("design manifest", () => {
  it("has a stable top-level key set", () => {
    expect(DESIGN_MANIFEST_ROOT_KEYS.length).toBe(10);
  });

  it("lists components, themes, and expose without frame trees", () => {
    const m = manifestFor("integration/themed.pdl");
    expect(m.kind).toBe("designManifest");
    expect(Object.keys(m).sort()).toEqual([...DESIGN_MANIFEST_ROOT_KEYS].sort());
    expect(m.themes).toEqual(["Dark"]);
    expect(m.components.map((c) => c.name)).toEqual(["Box"]);
    expect(m.components[0]!.expose).toEqual([]);
    expect(m.components[0]!.params).toEqual([]);
    expect(m.components[0]!.rootKind).toBe("layout");
  });

  it("includes sorted variant and typeStyle names from larger fixtures", () => {
    const m = manifestFor("integration/design.pdl");
    expect(m.components.length).toBeGreaterThan(5);
    expect(m.variants.length).toBeGreaterThan(0);
    expect(m.modulePaths.length).toBeGreaterThan(1);
  });
});
