import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildResolvedComponentDocument } from "../src/resolveBundle.js";
import { loadDesign } from "../src/loadDesign.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fx = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl", ...p);

describe("resolvedComponent document (pdl resolve default)", () => {
  it("uses components + system shape; omits defaultParams, tokens, root, and flattened catalogue fields", () => {
    const design = loadDesign(fx("molecules/m_10_form_group.pdl"));
    const doc = buildResolvedComponentDocument(design, { componentName: "MoleculeFieldBlock" });
    expect(doc.schemaKind).toBe("resolvedComponent");
    expect(doc.components.MoleculeFieldBlock).toBeDefined();
    expect(doc.components.MoleculeFieldBlock).not.toHaveProperty("defaultParams");
    expect(doc).not.toHaveProperty("tokens");
    expect(doc).not.toHaveProperty("tokensByTheme");
    expect(doc).not.toHaveProperty("instance");
    expect(doc).not.toHaveProperty("root");
    expect(doc).not.toHaveProperty("children");
    expect(doc).not.toHaveProperty("childNodes");
    expect(doc.system).not.toHaveProperty("theme");
    expect(doc.system).not.toHaveProperty("themesDeclared");
  });

  it("includes primitives/semantics for primitive:/semantic: refs, typeStyle bodies, transitive defs, and theme overrides", () => {
    const design = loadDesign(fx("molecules/m_10_form_group.pdl"));
    const doc = buildResolvedComponentDocument(design, { componentName: "MoleculeFieldBlock" });
    const primNames = Object.keys(doc.system.primitives).sort();
    const semNames = Object.keys(doc.system.semantics).sort();
    expect(primNames).toContain("atoms.color.rgb");
    expect(primNames).toContain("atoms.space.xs");
    expect(semNames).toContain("atoms.color.sem.fromRgb");
    const rgbDef = doc.system.primitives["atoms.color.rgb"]?.definition;
    expect(rgbDef).toEqual(expect.objectContaining({ kind: "hex" }));
    expect(doc.system.semantics["atoms.color.sem.fromRgb"]?.definition).toBe("primitive:atoms.color.rgb");
    expect(Object.values(doc.system.primitives).every((p) => !("valuesByTheme" in p))).toBe(true);
    expect(Object.values(doc.system.semantics).every((s) => !("valuesByTheme" in s))).toBe(true);
  });

  it("lists themes with marker-bearing overrides and pulls override tokens into primitives/semantics", () => {
    const design = loadDesign(fx("atoms/design.pdl"));
    const doc = buildResolvedComponentDocument(design, { componentName: "AtomTextPlain" });
    const warm = doc.system.themes["AtomsWarm"];
    expect(warm?.overrides["atoms.color.sem.fromRgb"]).toBe("primitive:atoms.color.rgba");
    expect(doc.system.primitives["atoms.color.rgba"]).toBeDefined();
  });

  it("includes only variant types used by this component's params", () => {
    const design = loadDesign(fx("molecules/m_10_form_group.pdl"));
    const doc = buildResolvedComponentDocument(design, { componentName: "MoleculeFieldBlock" });
    expect(Object.keys(doc.system.variantTypes).sort()).toEqual(["MoleculeFieldBlockLayout"]);
  });

  it("includes only typeStyles referenced on this component", () => {
    const design = loadDesign(fx("molecules/m_10_form_group.pdl"));
    const doc = buildResolvedComponentDocument(design, { componentName: "MoleculeFieldBlock" });
    const names = Object.keys(doc.system.typeStyles).sort();
    expect(names).toEqual(["AtomBody", "AtomCaption", "AtomMono"]);
    expect(doc.system.typeStyles.AtomCaption!.props.color).toBe("semantic:atoms.color.sem.fromRgb");
  });

  it("omits primitives/semantics when the component uses no tokens or typeStyles", () => {
    const design = loadDesign(fx("integration/greeting.pdl"));
    const doc = buildResolvedComponentDocument(design, { componentName: "Greeting" });
    expect(doc.system.primitives).toEqual({});
    expect(doc.system.semantics).toEqual({});
    expect(doc.system.typeStyles).toEqual({});
  });

  it("mirrors component layout and variant children overrides under components[name]", () => {
    const design = loadDesign(fx("molecules/m_10_form_group.pdl"));
    const doc = buildResolvedComponentDocument(design, { componentName: "MoleculeFieldBlock" });
    const c = doc.components.MoleculeFieldBlock!;
    expect(c.childHierarchy.Root).toEqual(["Lab", "Box", "Help"]);
    expect(Object.keys(c.childNodes).sort()).toEqual(["Box", "Help", "Lab", "Val"]);
    const noHelp = c.variants.find((v) => v.params.layoutMode === "noHelp");
    expect(noHelp?.childHierarchy?.Root).toEqual(["Lab", "Box"]);
  });

  it("includes system.themes that affect this component (e.g. AtomsLooseRadius → atoms.radius.sm)", () => {
    const design = loadDesign(fx("molecules/m_10_form_group.pdl"));
    const doc = buildResolvedComponentDocument(design, { componentName: "MoleculeFieldBlock" });
    const loose = doc.system.themes["AtomsLooseRadius"];
    expect(loose?.overrides["atoms.radius.sm"]).toEqual({ kind: "number", value: 12 });
    expect(doc.system.primitives["atoms.radius.sm"]).toBeDefined();
  });

  it("passes through paramOverrides without mutating catalogue default children", () => {
    const design = loadDesign(fx("molecules/m_10_form_group.pdl"));
    const doc = buildResolvedComponentDocument(design, {
      componentName: "MoleculeFieldBlock",
      paramOverrides: { layoutMode: "noHelp" },
    });
    expect(doc.components.MoleculeFieldBlock!.childHierarchy.Root).toEqual(["Lab", "Box", "Help"]);
    expect(doc.paramOverrides).toEqual({ layoutMode: "noHelp" });
  });
});
