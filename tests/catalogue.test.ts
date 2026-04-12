import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildComponentCatalogue } from "../src/catalogue.js";
import { loadDesign } from "../src/loadDesign.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fx = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl", ...p);

describe("catalogue", () => {
  it("uses __param__ for String props in base tree", () => {
    const d = loadDesign(fx("greeting.pdl"));
    const c = buildComponentCatalogue(d);
    const g = c.components.find((x) => x.name === "Greeting")!;
    expect(g.base.tree.children[0]!.props.content).toBe("__param:title__");
  });

  it("applies theme overrides to the token map", () => {
    const d = loadDesign(fx("themed.pdl"));
    const light = buildComponentCatalogue(d, {});
    expect(light.tokens["color.bg"]).toBe("#FFFFFF");
    const dark = buildComponentCatalogue(d, { theme: "Dark" });
    expect(dark.tokens["color.bg"]).toBe("#000000");
  });
});
