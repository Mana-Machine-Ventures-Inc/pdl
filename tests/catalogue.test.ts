import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildComponentCatalogue } from "../src/catalogue.js";
import { buildResolvedTokenMap } from "../src/evaluate.js";
import { loadDesign } from "../src/loadDesign.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fx = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl", ...p);

describe("catalogue", () => {
  it("is tagged and lists declared themes", () => {
    const d = loadDesign(fx("integration/themed.pdl"));
    const c = buildComponentCatalogue(d);
    expect(c.kind).toBe("componentCatalogue");
    expect(Object.keys(c.themes).sort()).toEqual(["Dark"]);
  });

  it("uses param: refs for String props on default child subtrees in childNodes", () => {
    const d = loadDesign(fx("integration/greeting.pdl"));
    const c = buildComponentCatalogue(d);
    const g = c.components.Greeting!;
    const title = g.childNodes[g.childHierarchy.Root[0]!]!;
    expect(title.props.content).toBe("param:title");
  });

  it("lists childNodes and default-order children for the root frame", () => {
    const d = loadDesign(fx("integration/greeting.pdl"));
    const g = buildComponentCatalogue(d).components.Greeting!;
    expect(g.childHierarchy.Root).toEqual(["Title"]);
    expect(Object.keys(g.childNodes).sort()).toEqual(["Title"]);
    expect(g.childNodes.Title!.kind).toBe("text");
    expect(g.root.kind).toBe("layout");
    expect(g.root.props.direction).toBe("column");
  });

  it("emits full variant param tuples and children overrides when Root children differ", () => {
    const d = loadDesign(fx("molecules/m_10_form_group.pdl"));
    const field = buildComponentCatalogue(d).components.MoleculeFieldBlock!;
    expect(field.childHierarchy.Root).toEqual(["Lab", "Box", "Help"]);
    expect(Object.keys(field.childNodes).sort()).toEqual(["Box", "Help", "Lab", "Val"]);
    const noHelp = field.variants.find((v) => v.params.layoutMode === "noHelp");
    expect(noHelp?.params).toEqual({ layoutMode: "noHelp" });
    expect(noHelp?.childHierarchy?.Root).toEqual(["Lab", "Box"]);
  });

  it("uses Cartesian variant exploration (one catalogue row per non-default tuple)", () => {
    const d = loadDesign(fx("molecules/m_02_buttons_basic.pdl"));
    const btn = buildComponentCatalogue(d).components.MoleculeTextButton!;
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
    const d = loadDesign(fx("integration/themed.pdl"));
    const c = buildComponentCatalogue(d);
    const box = c.components.Box!;
    expect(box.root.props.background).toBe("primitive:color.bg");
  });

  it("lists primitives once and theme overrides as serialised RHS (literals or pointers)", () => {
    const d = loadDesign(fx("integration/themed.pdl"));
    const c = buildComponentCatalogue(d, {});
    expect(c.primitives["color.bg"]!.definition).toEqual({ kind: "hex", value: "#FFFFFF" });
    expect(c.themes.Dark!.baseTheme).toBeNull();
    expect(c.themes.Dark!.overrides["color.bg"]).toEqual({ kind: "hex", value: "#000000" });
    expect(buildResolvedTokenMap(d).get("color.bg")).toBe("#FFFFFF");
    expect(buildResolvedTokenMap(d, "Dark").get("color.bg")).toBe("#000000");
  });

  it("includes primitives, semantics, typeStyles, and per-theme override maps (no duplicated flat maps)", () => {
    const d = loadDesign(fx("integration/themed.pdl"));
    const c = buildComponentCatalogue(d, {});
    expect(c.primitives["color.bg"]).toBeDefined();
    expect(Object.keys(c.semantics).length).toBe(0);
    expect(Object.keys(c.themes).sort()).toEqual(["Dark"]);
    expect(Object.keys(c.typeStyles).length).toBe(0);
    expect(c).not.toHaveProperty("theme");
    expect(c.variantTypes).toEqual({});
  });

  it("emits full typeStyles with primitive:/semantic: pointers like token definitions", () => {
    const d = loadDesign(fx("atoms/design.pdl"));
    const c = buildComponentCatalogue(d);
    expect(c.typeStyles.AtomCaption!.props.color).toBe("primitive:atoms.color.textMuted");
    expect(c.typeStyles.AtomBody!.props.color).toBe("primitive:atoms.color.textPrimary");
    expect(c.typeStyles.AtomTitle!.props.color).toBe("primitive:atoms.color.textPrimary");
  });

  it("sets catalogue theme metadata while token layers stay authoritative", () => {
    const d = loadDesign(fx("integration/themed.pdl"));
    const c = buildComponentCatalogue(d, { theme: "Dark" });
    expect(c.theme).toBe("Dark");
    expect(c.primitives["color.bg"]!.definition).toEqual({ kind: "hex", value: "#FFFFFF" });
    expect(buildResolvedTokenMap(d, "Dark").get("color.bg")).toBe("#000000");
  });

  it("emits theme override RHS as primitive: pointer when override references a primitive", () => {
    const d = loadDesign(fx("atoms/design.pdl"));
    const c = buildComponentCatalogue(d);
    expect(c.themes.AtomsWarm?.overrides["atoms.color.sem.fromRgb"]).toBe("primitive:atoms.color.brandPrimary");
    expect(c.semantics["atoms.color.sem.fromRgb"]).toBeDefined();
  });

  it("exposes variantTypes and variantTypeName on variant params (cases only on variantTypes)", () => {
    const d = loadDesign(fx("atoms/conditional_variant_atoms.pdl"));
    const c = buildComponentCatalogue(d);
    const tone = c.variantTypes.AtomsTone;
    expect(tone?.cases).toEqual(["neutral", "accent", "danger"]);
    const comp = c.components.AtomVariantSwatch!;
    const p = comp.params.find((x) => x.name === "tone")!;
    expect(p.type).toBe("variant");
    expect(p.variantTypeName).toBe("AtomsTone");
    expect(p).not.toHaveProperty("cases");
  });

  it("emits typeStyle on text frames without expanding the preset typography", () => {
    const d = loadDesign(fx("atoms/text_atoms.pdl"));
    const c = buildComponentCatalogue(d);
    const comp = c.components.AtomTextTypeStyle!;
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
    const o = c.components.AtomTextStylePlusOverride!;
    const t = o.childNodes.T!;
    expect(t.props).toEqual(
      expect.objectContaining({ typeStyle: "typeStyle:AtomCaption", fontSize: 22, content: "Mixed" }),
    );
    expect(t.props).not.toHaveProperty("fontFamily");
  });

  it("emits only typeStyle on catalogue text children that use a preset (e.g. field label)", () => {
    const d = loadDesign(fx("molecules/m_10_form_group.pdl"));
    const field = buildComponentCatalogue(d).components.MoleculeFieldBlock!;
    const lab = field.childNodes.Lab!;
    expect(lab.props).toEqual(expect.objectContaining({ typeStyle: "typeStyle:AtomCaption" }));
    expect(lab.props).not.toHaveProperty("fontFamily");
    expect(lab.props).not.toHaveProperty("fontSize");
  });

  it("uses layout `hidden` for visible children order while keeping ids in childNodes", () => {
    const d = loadDesign(fx("atoms/hidden_frame_atoms.pdl"));
    const row = buildComponentCatalogue(d).components.AtomHiddenFrame!;
    expect(row.childHierarchy.Root).toEqual(["A", "B"]);
    expect(Object.keys(row.childNodes).sort()).toEqual(["A", "B", "Inner"]);
    expect(row.childHierarchy.B).toEqual(["Inner"]);
    const hide = row.variants.find((v) => v.params.mode === "hideExtra");
    expect(hide?.childHierarchy?.Root).toEqual(["A"]);
    expect(row.childNodes.Inner!.kind).toBe("text");
    expect(row.childNodes.Inner!.children).toEqual([]);
  });

  it("merges rules tags = and tags.add in order for catalogue.rules.tags", () => {
    const d = loadDesign(fx("integration/rules_tags_when.pdl"));
    const row = buildComponentCatalogue(d).components.RulesTagHost!;
    expect(row.rules?.tags).toEqual(["t0", "t1"]);
  });

  it("flattened rules attach else when using negated prior branches", () => {
    const d = loadDesign(fx("integration/rules_tags_when.pdl"));
    const rules = buildComponentCatalogue(d).components.RulesElseHost!.rules!.rules;
    expect(rules).toHaveLength(2);
    expect(rules[0]!.when).toEqual({ kind: "cmp", param: "mode", op: "==", rhs: ".ea" });
    expect(rules[1]!.when).toEqual({
      kind: "not",
      expr: { kind: "cmp", param: "mode", op: "==", rhs: ".ea" },
    });
    expect(rules[1]!.strength).toBe("shouldNot");
  });

  it("nested rules if conjoins outer and inner branch conditions", () => {
    const d = loadDesign(fx("integration/rules_tags_when.pdl"));
    const rules = buildComponentCatalogue(d).components.RulesNestHost!.rules!.rules;
    expect(rules).toHaveLength(1);
    expect(rules[0]!.when).toEqual({
      kind: "and",
      items: [
        { kind: "cmp", param: "o", op: "==", rhs: ".o1" },
        { kind: "cmp", param: "i", op: "==", rhs: ".i1" },
      ],
    });
  });

  it("emits childHierarchy-only structural variants (no redundant DSlot changes or patches)", () => {
    const d = loadDesign(fx("integration/empty_layout_shell.pdl"));
    const row = buildComponentCatalogue(d).components.EmptyLayoutShell!;
    expect(row.requiredComponents).toEqual(["DeepSlot"]);
    expect(row.childHierarchy.Root).toEqual(["SlotOne"]);
    expect(row.childHierarchy.SlotOne).toEqual(["SlotTwo"]);
    expect(row.childHierarchy.SlotTwo).toEqual(["SlotThree"]);
    expect(row.childHierarchy.SlotThree).toEqual([]);
    const nested = row.variants.find((v) => v.params.embed === "nested");
    expect(nested).toBeDefined();
    expect(nested!.childHierarchy!.Root).toEqual(["SlotThree"]);
    expect(nested!.structuralChange).toBe(true);
    expect(nested!.changes).toEqual([]);
    expect(nested!.childHierarchy!.SlotOne).toEqual(["DSlot"]);
    expect(nested!.childHierarchy!.SlotThree).toEqual(["SlotTwo"]);
    expect(nested!.childHierarchy!.SlotTwo).toEqual(["SlotOne"]);
    expect(nested!.affectedFrames).toEqual(["DSlot", "Root", "SlotOne", "SlotThree", "SlotTwo"]);
  });
});
