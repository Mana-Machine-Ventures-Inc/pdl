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

  it("uses param: refs for String props on default child subtrees in childNodes", () => {
    const d = loadDesign(fx("greeting.pdl"));
    const c = buildComponentCatalogue(d);
    const g = c.components.find((x) => x.name === "Greeting")!;
    const title = g.childNodes[g.children[0]!]!;
    expect(title.props.content).toBe("param:title");
  });

  it("lists childNodes and default-order children for the root frame", () => {
    const d = loadDesign(fx("greeting.pdl"));
    const g = buildComponentCatalogue(d).components.find((x) => x.name === "Greeting")!;
    expect(g.children).toEqual(["Title"]);
    expect(Object.keys(g.childNodes).sort()).toEqual(["Title"]);
    expect(g.childNodes.Title!.kind).toBe("text");
    expect(g.kind).toBe("layout");
    expect(g.props.direction).toBe("column");
  });

  it("emits full variant param tuples and children overrides when Root children differ", () => {
    const d = loadDesign(fx("molecules/m_10_form_group.pdl"));
    const field = buildComponentCatalogue(d).components.find((x) => x.name === "MoleculeFieldBlock")!;
    expect(field.children).toEqual(["Lab", "Box", "Help"]);
    expect(Object.keys(field.childNodes).sort()).toEqual(["Box", "Help", "Lab"]);
    const noHelp = field.variants.find((v) => v.params.layoutMode === "noHelp");
    expect(noHelp?.params).toEqual({ layoutMode: "noHelp" });
    expect(noHelp?.children).toEqual(["Lab", "Box"]);
  });

  it("uses Cartesian variant exploration (one catalogue row per non-default tuple)", () => {
    const d = loadDesign(fx("molecules/m_02_buttons_basic.pdl"));
    const btn = buildComponentCatalogue(d).components.find((x) => x.name === "MoleculeTextButton")!;
    expect(btn.variants).toHaveLength(5);
    const keys = btn.variants.map((v) => `${v.params.tone}/${v.params.size}`).sort();
    expect(keys).toEqual([
      "ghost/lg",
      "ghost/sm",
      "primary/lg",
      "secondary/lg",
      "secondary/sm",
    ]);
  });

  it("uses primitive:/semantic: refs for bare token idents on root props", () => {
    const d = loadDesign(fx("themed.pdl"));
    const c = buildComponentCatalogue(d);
    const box = c.components.find((x) => x.name === "Box")!;
    expect(box.props.background).toBe("primitive:color.bg");
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

  it("exposes variantTypes and variantTypeName on variant params (cases only on variantTypes)", () => {
    const d = loadDesign(fx("atoms/conditional_variant_atoms.pdl"));
    const c = buildComponentCatalogue(d);
    const tone = c.variantTypes.find((v) => v.name === "AtomsTone");
    expect(tone?.cases).toEqual(["neutral", "accent", "danger"]);
    const comp = c.components.find((x) => x.name === "AtomVariantSwatch")!;
    const p = comp.params.find((x) => x.name === "tone")!;
    expect(p.type).toBe("variant");
    expect(p.variantTypeName).toBe("AtomsTone");
    expect(p).not.toHaveProperty("cases");
  });

  it("emits typeStyle on text frames without expanding the preset typography", () => {
    const d = loadDesign(fx("atoms/text_atoms.pdl"));
    const c = buildComponentCatalogue(d);
    const comp = c.components.find((x) => x.name === "AtomTextTypeStyle")!;
    const a = comp.childNodes.A!;
    expect(a.props).toEqual(
      expect.objectContaining({ typeStyle: "typeStyle:AtomCaption", content: "Caption line" }),
    );
    expect(a.props).not.toHaveProperty("fontFamily");
    expect(a.props).not.toHaveProperty("fontSize");
  });

  it("keeps explicit typography props next to typeStyle when PDL overrides them", () => {
    const d = loadDesign(fx("atoms/text_atoms.pdl"));
    const c = buildComponentCatalogue(d);
    const o = c.components.find((x) => x.name === "AtomTextStylePlusOverride")!;
    const t = o.childNodes.T!;
    expect(t.props).toEqual(
      expect.objectContaining({ typeStyle: "typeStyle:AtomCaption", fontSize: 22, content: "Mixed" }),
    );
    expect(t.props).not.toHaveProperty("fontFamily");
  });

  it("emits only typeStyle on catalogue text children that use a preset (e.g. field label)", () => {
    const d = loadDesign(fx("molecules/m_10_form_group.pdl"));
    const field = buildComponentCatalogue(d).components.find((x) => x.name === "MoleculeFieldBlock")!;
    const lab = field.childNodes.Lab!;
    expect(lab.props).toEqual(expect.objectContaining({ typeStyle: "typeStyle:AtomCaption" }));
    expect(lab.props).not.toHaveProperty("fontFamily");
    expect(lab.props).not.toHaveProperty("fontSize");
  });
});
