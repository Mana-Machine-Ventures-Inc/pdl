import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBakedDesignComponent } from "../src/bakeDesign.js";
import {
  companionPreviewFromDesign,
  evaluateRulesForPreview,
  evaluateRulesOnComponent,
} from "../src/evaluateRules.js";
import { loadDesign } from "../src/loadDesign.js";
import { renderBakedDesignToHtmlDocument } from "../src/renderHtml.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fx = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl", ...p);

function bakeNamed(name: string) {
  const design = loadDesign(fx("integration/rules_preview.pdl"));
  const companions = companionPreviewFromDesign(design);
  const doc = buildBakedDesignComponent(design, { componentName: name });
  const violations = evaluateRulesOnComponent(doc.components[name]!, companions.rulesByComponent);
  return { design, companions, doc, violations };
}

describe("evaluateRules", () => {
  it("flags two primary buttons as a mustNot error", () => {
    const { violations } = bakeNamed("PvTwoPrimary");
    const hits = violations.filter((v) => v.component === "PvButton");
    expect(hits.length).toBe(2);
    expect(hits.every((v) => v.severity === "error")).toBe(true);
    expect(hits[0]!.message).toMatch(/Only one primary button/);
  });

  it("allows one primary + one secondary", () => {
    const { violations } = bakeNamed("PvOnePrimary");
    expect(violations.filter((v) => v.component === "PvButton")).toEqual([]);
  });

  it("flags a tab bar with one tab", () => {
    const { violations } = bakeNamed("PvTabBarThin");
    expect(violations.some((v) => v.message.includes("between 2 and 5"))).toBe(true);
    expect(violations.find((v) => v.message.includes("between 2 and 5"))?.severity).toBe("error");
  });

  it("accepts a tab bar with two tabs", () => {
    const { violations } = bakeNamed("PvTabBar");
    expect(violations.filter((v) => v.message.includes("between 2 and 5"))).toEqual([]);
  });

  it("requires a field-label sibling before a field", () => {
    const unlabeled = bakeNamed("PvUnlabeledField");
    expect(unlabeled.violations.some((v) => v.component === "PvField" && v.severity === "error")).toBe(
      true,
    );
    const labeled = bakeNamed("PvLabeledField");
    expect(labeled.violations.filter((v) => v.component === "PvField")).toEqual([]);
  });

  it("warns when a card has no nested instances", () => {
    const { violations } = bakeNamed("PvCard");
    expect(violations).toEqual([
      expect.objectContaining({
        component: "PvCard",
        severity: "warn",
        message: "A card should contain at least one nested instance.",
      }),
    ]);
  });

  it("warns when a tab bar is not last among siblings", () => {
    const { violations } = bakeNamed("PvLastBar");
    expect(
      violations.some(
        (v) => v.component === "PvTabBar" && v.message.includes("sit last") && v.severity === "warn",
      ),
    ).toBe(true);
  });
});

describe("evaluateRulesForPreview", () => {
  it("omits isolated-root violations (single-component canvas)", () => {
    for (const name of ["PvTabBarThin", "PvField", "PvCard"] as const) {
      const { companions, doc } = bakeNamed(name);
      const preview = evaluateRulesForPreview(doc.components[name]!, companions.rulesByComponent);
      expect(preview).toEqual([]);
    }
  });

  it("still flags nested instances inside a scene", () => {
    const { companions, doc } = bakeNamed("PvThinTabBarScene");
    const preview = evaluateRulesForPreview(
      doc.components.PvThinTabBarScene!,
      companions.rulesByComponent,
    );
    expect(preview.some((v) => v.component === "PvTabBarThin" && v.message.includes("between 2 and 5"))).toBe(
      true,
    );
  });
});

describe("renderHtml companions", () => {
  it("prints usage text and orange/red rule banners on a nested card", () => {
    const { companions, doc } = bakeNamed("PvEmptyCardScene");
    const html = renderBakedDesignToHtmlDocument(doc, {
      singleComponent: "PvEmptyCardScene",
      usageByComponent: companions.usageByComponent,
      rulesByComponent: companions.rulesByComponent,
    });
    expect(html).toContain("pdl-rule--warn");
    expect(html).toContain("A card should contain at least one nested instance.");
    expect(html).toContain('data-pdl-rule="warn"');
  });

  it("does not banner isolated-root rules in single-component preview", () => {
    const { companions, doc } = bakeNamed("PvTabBarThin");
    const html = renderBakedDesignToHtmlDocument(doc, {
      singleComponent: "PvTabBarThin",
      usageByComponent: companions.usageByComponent,
      rulesByComponent: companions.rulesByComponent,
    });
    expect(html).toContain('data-pdl-component="PvTabBarThin"');
    expect(html).not.toContain("data-pdl-rules=");
    expect(html).not.toContain("between 2 and 5");
  });

  it("outlines nested instances that break a must rule", () => {
    const { companions, doc } = bakeNamed("PvTwoPrimary");
    const html = renderBakedDesignToHtmlDocument(doc, {
      singleComponent: "PvTwoPrimary",
      usageByComponent: companions.usageByComponent,
      rulesByComponent: companions.rulesByComponent,
    });
    expect(html).toContain("pdl-rule--error");
    expect(html).toContain("Only one primary button in this layout.");
    expect(html).toContain('data-pdl-rule="error"');
    expect(html).toContain("on PvTwoPrimary/save");
  });
});

describe("playground usage-rules pack", () => {
  it("UsageRulesLab renders usage text plus must and should banners", () => {
    const design = loadDesign(fx("lab/usage-rules/design.pdl"));
    const companions = companionPreviewFromDesign(design);
    const doc = buildBakedDesignComponent(design, { componentName: "UsageRulesLab" });
    const html = renderBakedDesignToHtmlDocument(doc, {
      singleComponent: "UsageRulesLab",
      usageByComponent: companions.usageByComponent,
      rulesByComponent: companions.rulesByComponent,
    });
    expect(html).toContain("Usage &amp; rules walkthrough");
    expect(html).toContain("pdl-rule--error");
    expect(html).toContain("pdl-rule--warn");
    expect(html).toContain("Only one primary button in this layout.");
    expect(html).toContain("A field must have a label sibling before it.");
    expect(html).toContain("A card should contain at least one nested instance.");
    expect(html).toContain("A tab bar must have between 2 and 5 tabs.");
  });
});
