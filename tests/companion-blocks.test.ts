import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildComponentCatalogue } from "../src/catalogue.js";
import { buildResolvedComponentDocument } from "../src/resolveBundle.js";
import { loadDesign } from "../src/loadDesign.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fx = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl", ...p);

describe("companion blocks (usage, fixtures, rules, interaction, extend)", () => {
  it("parses and merges standalone companions on a component", () => {
    const d = loadDesign(fx("integration/companion_blocks.pdl"));
    expect(d.usage.get("CompanionBlock")?.get("description")).toBe("Test companion metadata.");
    expect(d.fixtures.get("CompanionBlock")?.size).toBe(1);
    expect(d.rules.get("CompanionBlock")?.length).toBeGreaterThan(0);
    expect(d.interactions.get("CompanionBlock")?.get("CompanionHover")).toBeDefined();
  });

  it("merges extend usage += and fixtures by label", () => {
    const d = loadDesign(fx("integration/companion_extend_entry.pdl"));
    expect(d.usage.get("CompanionBlock")?.get("description")).toBe(
      "Test companion metadata. Extended via extend.",
    );
    const f = d.fixtures.get("CompanionBlock")!;
    expect(f.size).toBe(2);
    expect(f.get("Accent")?.bindings.some((b) => b.name === "tone")).toBe(true);
    expect(f.get("Neutral")).toBeDefined();
  });

  it("emits companions on the Component Catalogue row", () => {
    const d = loadDesign(fx("integration/companion_extend_entry.pdl"));
    const cat = buildComponentCatalogue(d);
    const row = cat.components.CompanionBlock!;
    expect(row.usage).toContain("Extended via extend.");
    expect(row.usageByKey?.description).toBe(row.usage);
    expect(row.fixtures?.Accent?.tone).toBe("accent");
    expect(row.fixtures?.Neutral?.tone).toBe("neutral");
    expect(row.rules?.tags).toEqual(["demo"]);
    expect(row.rules?.rules?.length).toBe(1);
    expect(row.rules?.rules?.[0]?.strength).toBe("should");
    expect(row.interactions?.length).toBe(1);
    const hover = row.interactions?.[0] as { name: string; handlers: { event: string }[] };
    expect(hover?.name).toBe("CompanionHover");
    expect(hover?.handlers.map((h) => h.event)).toEqual(["hoverStart", "hoverEnd"]);
  });

  it("includes companions in resolvedComponent.components[name]", () => {
    const d = loadDesign(fx("integration/companion_extend_entry.pdl"));
    const doc = buildResolvedComponentDocument(d, { componentName: "CompanionBlock" });
    expect(doc.primaryComponent).toBe("CompanionBlock");
    const row = doc.components.CompanionBlock!;
    expect(row.usage).toContain("Extended via extend.");
    expect(row.fixtures?.Neutral).toBeDefined();
    expect(row.rules?.rules?.[0]?.query).toEqual(
      expect.objectContaining({ kind: "chain", nav: { kind: "nav", axis: "ancestors" } }),
    );
    expect(row.interactions?.length).toBe(1);
  });
});
