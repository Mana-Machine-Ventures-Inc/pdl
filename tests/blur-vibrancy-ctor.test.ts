import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBakedDesignComponent } from "../src/bakeDesign.js";
import { loadDesign } from "../src/loadDesign.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const atoms = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl/atoms", ...p);

describe("Blur vibrancy: Vibrancy(saturation:, brightness:)", () => {
  it("loads and bakes typed Vibrancy constructor on Blur", () => {
    const design = loadDesign(atoms("blur_vibrancy_ctor.pdl"));
    const baked = buildBakedDesignComponent(design, {
      componentName: "AtomBlurVibrancyCtor",
    });
    const root = baked.components.AtomBlurVibrancyCtor.root;
    const blur = root.props.foreground as Record<string, unknown>;
    expect(blur.kind).toBe("blur");
    expect(blur.radius).toBe(12);
    const vib = blur.vibrancy as Record<string, unknown>;
    expect(vib.kind).toBe("vibrancy");
    expect(vib.saturation).toBe(1.2);
    expect(vib.brightness).toBe(1.05);
  });
});
