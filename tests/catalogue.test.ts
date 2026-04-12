import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildComponentCatalogue } from "../src/catalogue.js";
import { loadDesign } from "../src/loadDesign.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fx = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl", ...p);

describe("catalogue", () => {
  it("is tagged and lists declared themes", () => {
    const d = loadDesign(fx("themed.pdl"));
    const c = buildComponentCatalogue(d);
    expect(c.kind).toBe("componentCatalogue");
    expect(c.themesDeclared).toEqual(["Dark"]);
  });

  it("uses __param__ for String props in base tree", () => {
    const d = loadDesign(fx("greeting.pdl"));
    const c = buildComponentCatalogue(d);
    const g = c.components.find((x) => x.name === "Greeting")!;
    expect(g.base.tree.children[0]!.props.content).toBe("__param:title__");
  });

  it("uses __token__ for bare primitive/semantic idents on frames", () => {
    const d = loadDesign(fx("themed.pdl"));
    const c = buildComponentCatalogue(d);
    const box = c.components.find((x) => x.name === "Box")!;
    expect(box.base.tree.props.background).toBe("__token:color.bg__");
  });

  it("applies theme overrides to the token map", () => {
    const d = loadDesign(fx("themed.pdl"));
    const light = buildComponentCatalogue(d, {});
    expect(light.tokens["color.bg"]).toBe("#FFFFFF");
    const dark = buildComponentCatalogue(d, { theme: "Dark" });
    expect(dark.tokens["color.bg"]).toBe("#000000");
  });

  it("includes tokensByTheme with base and every declared theme", () => {
    const d = loadDesign(fx("themed.pdl"));
    const c = buildComponentCatalogue(d, {});
    expect(Object.keys(c.tokensByTheme).sort()).toEqual(["Dark", "base"]);
    expect(c.tokensByTheme.base["color.bg"]).toBe("#FFFFFF");
    expect(c.tokensByTheme.Dark["color.bg"]).toBe("#000000");
    expect(c.tokens).toEqual(c.tokensByTheme.base);
    expect(c.variantTypes).toEqual([]);
  });

  it("keeps tokensByTheme in sync when catalogue theme is Dark", () => {
    const d = loadDesign(fx("themed.pdl"));
    const c = buildComponentCatalogue(d, { theme: "Dark" });
    expect(c.tokens).toEqual(c.tokensByTheme.Dark);
    expect(c.tokensByTheme.base["color.bg"]).toBe("#FFFFFF");
  });

  it("exposes variantTypes and variantTypeName on variant params", () => {
    const d = loadDesign(fx("atoms/conditional_variant_atoms.pdl"));
    const c = buildComponentCatalogue(d);
    const tone = c.variantTypes.find((v) => v.name === "AtomsTone");
    expect(tone?.cases).toEqual(["neutral", "accent", "danger"]);
    const comp = c.components.find((x) => x.name === "AtomVariantSwatch")!;
    const p = comp.params.find((x) => x.name === "tone")!;
    expect(p.type).toBe("variant");
    expect(p.variantTypeName).toBe("AtomsTone");
    expect(p.cases).toEqual(["neutral", "accent", "danger"]);
  });
});
