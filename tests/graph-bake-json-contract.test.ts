import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBakedDesignComponent, buildBakedDesignSystem } from "../src/bakeDesign.js";
import { buildComponentCatalogue } from "../src/catalogue.js";
import { loadDesign } from "../src/loadDesign.js";
import { buildResolvedComponentDocument } from "../src/resolveBundle.js";
import {
  assertBakedDesignContract,
  assertComponentCatalogueContract,
  assertResolvedComponentContract,
} from "./helpers/graphBakeContracts.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fx = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl", ...p);

describe("JSON artefact contracts (graph vs bake vs spec)", () => {
  it("componentCatalogue from graphSystem-equivalent build matches catalogue contract", () => {
    for (const rel of [
      "integration/themed.pdl",
      "integration/greeting.pdl",
      "atoms/design.pdl",
      "molecules/design.pdl",
    ] as const) {
      const design = loadDesign(fx(rel));
      const cat = buildComponentCatalogue(design, {});
      expect(() => assertComponentCatalogueContract(cat, rel)).not.toThrow();
    }
  });

  it("componentCatalogue with --theme still matches contract", () => {
    const design = loadDesign(fx("integration/themed.pdl"));
    const cat = buildComponentCatalogue(design, { theme: "Dark" });
    expect(() => assertComponentCatalogueContract(cat, "themed+Dark")).not.toThrow();
    expect(cat.theme).toBe("Dark");
  });

  it("resolvedComponent matches contract for varied fixtures", () => {
    const cases: Array<{
      pdl: string;
      component: string;
      theme?: string;
      paramOverrides?: Record<string, unknown>;
    }> = [
      { pdl: "integration/greeting.pdl", component: "Greeting" },
      { pdl: "molecules/m_10_form_group.pdl", component: "MoleculeFieldBlock" },
      { pdl: "atoms/design.pdl", component: "AtomTextPlain", theme: "AtomsWarm" },
      {
        pdl: "atoms/hidden_frame_atoms.pdl",
        component: "AtomHiddenFrame",
        paramOverrides: { mode: "hideExtra" },
      },
    ];
    for (const c of cases) {
      const design = loadDesign(fx(c.pdl));
      const doc = buildResolvedComponentDocument(design, {
        componentName: c.component,
        theme: c.theme,
        paramOverrides: c.paramOverrides,
      });
      const label = `${c.pdl} → ${c.component}`;
      expect(() => assertResolvedComponentContract(doc, label)).not.toThrow();
    }
  });

  it("bakedDesign from bakeSystem / bakeComponent matches bake contract", () => {
    const designThemed = loadDesign(fx("integration/themed.pdl"));
    expect(() => assertBakedDesignContract(buildBakedDesignSystem(designThemed), "bakeSystem themed")).not.toThrow();
    expect(() =>
      assertBakedDesignContract(buildBakedDesignSystem(designThemed, { theme: "Dark" }), "bakeSystem themed Dark"),
    ).not.toThrow();

    const designAtoms = loadDesign(fx("atoms/design.pdl"));
    expect(() => assertBakedDesignContract(buildBakedDesignSystem(designAtoms), "bakeSystem atoms")).not.toThrow();

    const hidden = loadDesign(fx("atoms/hidden_frame_atoms.pdl"));
    expect(() =>
      assertBakedDesignContract(
        buildBakedDesignComponent(hidden, {
          componentName: "AtomHiddenFrame",
          paramOverrides: { mode: "hideExtra" },
        }),
        "bakeComponent hidden",
      ),
    ).not.toThrow();
  });

  it("fails fast on deliberately wrong shapes (sanity-check helpers)", () => {
    expect(() => assertComponentCatalogueContract({ kind: "wrong" }, "bad-kind")).toThrow(/kind must be/);
    expect(() => assertResolvedComponentContract({ schemaKind: "resolvedComponent" }, "incomplete")).toThrow(
      /unexpected top-level key|must be/,
    );
    expect(() =>
      assertBakedDesignContract(
        {
          schemaKind: "bakedDesign",
          schemaVersion: "1.0.0-beta",
          generatedAt: "x",
          provenance: { entryPath: "e", bakedTheme: null, bakeProfile: "system-defaults" },
          components: {},
          primitives: {},
        },
        "bake+primitives",
      ),
    ).toThrow(/forbidden key "primitives"/);
  });
});
