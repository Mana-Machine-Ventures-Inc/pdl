import { describe, expect, it } from "vitest";
import { renderCatalogueSystemHtml } from "../src/renderCatalogueHtml.js";
import { bakeSystem, catalogue as rustCatalogue, fx } from "./helpers/rustFixtures.js";

describe("renderCatalogueSystemHtml", () => {
  it("includes token sections and a baked preview for a small design", () => {
    const entry = fx("integration/themed.pdl");
    const catalogue = rustCatalogue(entry, { theme: "Dark" });
    const baked = bakeSystem(entry, { theme: "Dark" });
    const html = renderCatalogueSystemHtml(catalogue, baked);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Primitives");
    expect(html).toContain("Semantics");
    expect(html).toContain("Themes");
    expect(html).toContain("Type styles");
    expect(html).toContain("Variant types");
    expect(html).toContain("Components (default bake)");
    expect(html).toContain("color.bg");
    expect(html).toContain("Dark");
    expect(html).toContain('id="pdl-component-Box"');
    expect(html).toContain("pdl-canvas");
  });

  it("renders greeting with empty token tables and Greeting preview", () => {
    const entry = fx("integration/greeting.pdl");
    const catalogue = rustCatalogue(entry);
    const baked = bakeSystem(entry);
    const html = renderCatalogueSystemHtml(catalogue, baked);
    expect(html).toContain("No entries.");
    expect(html).toContain('id="pdl-component-Greeting"');
  });
});
