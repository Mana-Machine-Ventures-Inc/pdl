import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { PdlError } from "../src/errors.js";
import { loadDesign } from "../src/loadDesign.js";
import { buildBakedDesignComponent } from "../src/bakeDesign.js";
import { parseModule } from "../src/parser.js";

const fx = (rel: string) => join(process.cwd(), "test-fixtures/pdl", rel);

describe("typed value let (`let name: Type = value`)", () => {
  it("parses let ramp: Ramp = Ramp(…)", () => {
    const mod = parseModule(
      `component C() layout {
  let ramp: Ramp = Ramp(direction: .bottomToTop, stops: [])
  background = [ramp]
  children = []
}
`,
      "t.pdl",
    );
    const c = mod.declarations.find((d) => d.kind === "component");
    expect(c?.kind).toBe("component");
    if (c?.kind !== "component") return;
    const lv = c.body.find((i) => i.kind === "letValue");
    expect(lv).toMatchObject({
      kind: "letValue",
      id: "ramp",
      typeName: "Ramp",
      value: { kind: "call", callee: "Ramp" },
    });
  });

  it("infers type for let blur = Blur(radius: …)", () => {
    const mod = parseModule(
      `component C() layout {
  let blur = Blur(radius: 8)
  background = [blur]
  children = []
}
`,
      "t.pdl",
    );
    const c = mod.declarations.find((d) => d.kind === "component");
    if (c?.kind !== "component") throw new Error("expected component");
    const lv = c.body.find((i) => i.kind === "letValue");
    expect(lv).toMatchObject({
      kind: "letValue",
      id: "blur",
      typeName: "Blur",
      value: { kind: "call", callee: "Blur" },
    });
  });

  it("bakes background from value-let Ramp", () => {
    const design = loadDesign(fx("atoms/let_value_ramp.pdl"));
    const baked = buildBakedDesignComponent(design, {
      componentName: "AtomLetValueRamp",
    });
    const root = baked.components.AtomLetValueRamp?.root as {
      props?: { background?: unknown };
    };
    const bg = root?.props?.background;
    expect(Array.isArray(bg)).toBe(true);
    const layer = (bg as unknown[])[0] as { kind?: string };
    expect(layer?.kind).toBe("ramp");
  });

  it("bakes Blur / EdgeInsets / CornerRadii / Direction / variant value lets", () => {
    const design = loadDesign(fx("atoms/let_value_named_types.pdl"));
    const baked = buildBakedDesignComponent(design, {
      componentName: "AtomLetValueNamedTypes",
    });
    const root = baked.components.AtomLetValueNamedTypes?.root as {
      props?: Record<string, unknown>;
    };
    const bg = root?.props?.background as unknown[];
    expect((bg?.[0] as { kind?: string; radius?: number })?.kind).toBe("blur");
    expect((bg?.[0] as { radius?: number })?.radius).toBe(10);
    expect(root?.props?.direction).toMatch(/^\.?column$/);
    expect(root?.props?.padding).toMatchObject({ top: 8, left: 12 });
  });

  it("bakes bare Blur token as a background layer", () => {
    const mol = loadDesign(fx("molecules/m_07_layer_stacks.pdl"));
    const baked = buildBakedDesignComponent(mol, {
      componentName: "MoleculeLayerInlineSandwich",
    });
    const json = JSON.stringify(baked);
    expect(json).toMatch(/"kind":"blur"/);
    expect(json).toMatch(/"radius":6/);
    expect(mol.primitives.get("atoms.blur.light")?.tokenType).toBe("Blur");
  });

  it("rejects mounting a value let in children", () => {
    try {
      loadDesign(fx("errors/e007-value-let-in-children.pdl"));
      throw new Error("expected PdlError");
    } catch (e) {
      expect(e).toBeInstanceOf(PdlError);
      expect((e as PdlError).message).toMatch(/value let|Cannot mount/);
    }
  });

  it("rejects numeric Blur token RHS", () => {
    try {
      loadDesign(fx("errors/e005-blur-number-token.pdl"));
      throw new Error("expected PdlError");
    } catch (e) {
      expect(e).toBeInstanceOf(PdlError);
      expect((e as PdlError).code).toBe("PDL-E005");
      expect((e as PdlError).message).toMatch(/Blur\(radius/);
    }
  });

  it("rejects legacy Blur(blur: …)", () => {
    try {
      loadDesign(fx("errors/e001-blur-legacy-blur-arg.pdl"));
      throw new Error("expected PdlError");
    } catch (e) {
      expect(e).toBeInstanceOf(PdlError);
      expect((e as PdlError).message).toMatch(/radius:/);
    }
  });
});
