import { describe, expect, it } from "vitest";
import { buildBakedDesignSystem } from "../src/bakeDesign.js";
import { buildComponentCatalogue } from "../src/catalogue.js";
import { loadDesign } from "../src/loadDesign.js";
import { renderCatalogueSystemHtml } from "../src/renderCatalogueHtml.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fx = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl", ...p);

describe("renderCatalogueSystemHtml", () => {
  it("includes token sections and a baked preview for a small design", () => {
    const design = loadDesign(fx("integration/themed.pdl"));
    const catalogue = buildComponentCatalogue(design, { theme: "Dark" });
    const baked = buildBakedDesignSystem(design, { theme: "Dark" });
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
    const design = loadDesign(fx("integration/greeting.pdl"));
    const catalogue = buildComponentCatalogue(design, {});
    const baked = buildBakedDesignSystem(design, {});
    const html = renderCatalogueSystemHtml(catalogue, baked);
    expect(html).toContain("No entries.");
    expect(html).toContain('id="pdl-component-Greeting"');
  });
});
