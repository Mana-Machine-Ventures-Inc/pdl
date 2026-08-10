import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBakedDesignComponent } from "../src/bakeDesign.js";
import { buildComponentCatalogue } from "../src/catalogue.js";
import { buildResolvedTokenMap, evaluateValue } from "../src/evaluate.js";
import { PdlError } from "../src/errors.js";
import { serialiseValueExpr } from "../src/graph.js";
import { loadDesign } from "../src/loadDesign.js";
import { parseModule } from "../src/parser.js";
import type { DesignDefinition } from "../src/designModel.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fx = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl", ...p);
const err = (...p: string[]) => fx("errors", ...p);

function emptyDesign(): DesignDefinition {
  return {
    entryPath: "x.pdl",
    modulePaths: [],
    primitives: new Map(),
    semantics: new Map(),
    themes: new Map(),
    typeStyles: new Map(),
    variants: new Map(),
    components: new Map(),
    expose: new Map(),
    usage: new Map(),
    fixtures: new Map(),
    rules: new Map(),
    interactions: new Map(),
  };
}

function expectPdl(fn: () => void, code: string, message?: RegExp): void {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(PdlError);
    expect((e as PdlError).code).toBe(code);
    if (message) expect((e as PdlError).message).toMatch(message);
    return;
  }
  throw new Error(`expected PdlError ${code}`);
}

describe("Ratio W:H sugar — parse", () => {
  it("parses common ratios into { kind: ratio, width, height }", () => {
    const m = parseModule(
      `
      primitive a: Ratio = 16:9
      primitive b: Ratio = 4:3
      primitive c: Ratio = 1.5:1
      `,
      "x.pdl",
    );
    const vals = m.declarations
      .filter((d): d is Extract<typeof d, { kind: "primitive" }> => d.kind === "primitive")
      .map((d) => d.value);
    expect(vals).toEqual([
      { kind: "ratio", width: 16, height: 9 },
      { kind: "ratio", width: 4, height: 3 },
      { kind: "ratio", width: 1.5, height: 1 },
    ]);
  });

  it("still parses bare Ratio numbers", () => {
    const m = parseModule(`primitive r: Ratio = 1.777`, "x.pdl");
    expect(m.declarations[0]).toMatchObject({
      value: { kind: "number", value: 1.777 },
    });
  });

  it("does not mis-parse Shadow(x: 0, …) labeled args as ratio sugar", () => {
    const m = parseModule(
      `primitive s: Shadow = Shadow(x: 0, y: 4, blurRadius: 12, color: #000000)`,
      "x.pdl",
    );
    expect(m.declarations[0]).toMatchObject({
      value: {
        kind: "shadow",
        x: { kind: "number", value: 0 },
        y: { kind: "number", value: 4 },
      },
    });
  });

  it("rejects zero height (PDL-E001)", () => {
    expectPdl(() => loadDesign(err("e001-ratio-zero-height.pdl")), "PDL-E001", /positive finite height|16:9/);
  });
});

describe("Ratio W:H sugar — evaluate & serialise", () => {
  it("evaluates to width/height", () => {
    const v = evaluateValue(
      { kind: "ratio", width: 16, height: 9 },
      { design: emptyDesign(), tokens: new Map() },
    );
    expect(v).toBeCloseTo(16 / 9, 10);
  });

  it("serialises authored W:H without collapsing to a number", () => {
    expect(serialiseValueExpr({ kind: "ratio", width: 16, height: 9 })).toEqual({
      kind: "ratio",
      width: 16,
      height: 9,
    });
  });
});

describe("Ratio W:H sugar — design load / catalogue / bake", () => {
  it("loads fixture tokens and resolves sugar + aliases", () => {
    const design = loadDesign(fx("atoms/ratio_wh_sugar.pdl"));
    expect(design.primitives.get("ratio.video")!.value).toEqual({
      kind: "ratio",
      width: 16,
      height: 9,
    });
    expect(design.primitives.get("ratio.square")!.value).toEqual({ kind: "number", value: 1 });
    const map = buildResolvedTokenMap(design);
    expect(map.get("ratio.video")).toBeCloseTo(16 / 9, 10);
    expect(map.get("ratio.photo")).toBeCloseTo(4 / 3, 10);
    expect(map.get("ratio.square")).toBe(1);
    expect(map.get("ratio.hero")).toBeCloseTo(16 / 9, 10);
  });

  it("catalogue keeps ratio definition AST (not pre-divided)", () => {
    const design = loadDesign(fx("atoms/ratio_wh_sugar.pdl"));
    const cat = buildComponentCatalogue(design);
    expect(cat.primitives["ratio.video"]).toMatchObject({
      tokenType: "Ratio",
      definition: { kind: "ratio", width: 16, height: 9 },
    });
  });

  it("desugars aspectRatio = 16:9 onto the free height axis when width is closed", () => {
    const design = loadDesign(fx("atoms/ratio_wh_sugar.pdl"));
    const doc = buildBakedDesignComponent(design, { componentName: "RatioSugarMedia" });
    const props = doc.components.RatioSugarMedia!.root.props;
    expect(props.aspectRatio).toBeUndefined();
    expect(props.height).toEqual({ aspect: expect.closeTo(16 / 9, 10) });
  });

  it("desugars aspectRatio token ref onto free height when width is closed", () => {
    const design = loadDesign(fx("atoms/ratio_wh_sugar.pdl"));
    const doc = buildBakedDesignComponent(design, { componentName: "RatioSugarTokenRef" });
    const props = doc.components.RatioSugarTokenRef!.root.props;
    expect(props.aspectRatio).toBeUndefined();
    expect(props.height).toEqual({ aspect: expect.closeTo(4 / 3, 10) });
  });

  it("atoms tokens_icon_media_ratio.pdl uses 16:9 for video", () => {
    const design = loadDesign(fx("atoms/tokens_icon_media_ratio.pdl"));
    expect(design.primitives.get("atoms.ratio.video")!.value).toEqual({
      kind: "ratio",
      width: 16,
      height: 9,
    });
    expect(buildResolvedTokenMap(design).get("atoms.ratio.video")).toBeCloseTo(16 / 9, 10);
  });
});

describe("Sizing .aspect", () => {
  it("parses .aspect(16:9) and Sizing.aspect(n)", () => {
    const m = parseModule(
      `
      component A() media {
        width = 300
        height = .aspect(16:9)
      }
      component B() media {
        width = Sizing.aspect(1.5)
        height = 100
      }
      `,
      "x.pdl",
    );
    const decls = m.declarations.filter(
      (d): d is Extract<typeof d, { kind: "component" }> => d.kind === "component",
    );
    const h = decls[0]!.body.find((i) => i.kind === "prop" && i.name === "height");
    expect(h).toMatchObject({
      kind: "prop",
      value: { kind: "sizing", mode: "aspect", aspect: { kind: "ratio", width: 16, height: 9 } },
    });
    const w = decls[1]!.body.find((i) => i.kind === "prop" && i.name === "width");
    expect(w).toMatchObject({
      kind: "prop",
      value: { kind: "sizing", mode: "aspect", aspect: { kind: "number", value: 1.5 } },
    });
  });

  it("bakes height = .aspect(16:9) to { aspect: number }", () => {
    const design = loadDesign(fx("atoms/aspect_sizing.pdl"));
    const doc = buildBakedDesignComponent(design, { componentName: "AtomAspectExplicit" });
    expect(doc.components.AtomAspectExplicit!.root.props).toMatchObject({
      width: { fixed: 300 },
      height: { aspect: expect.closeTo(16 / 9, 10) },
    });
  });

  it("desugars aspectRatio sugar on AtomAspectSugar", () => {
    const design = loadDesign(fx("atoms/aspect_sizing.pdl"));
    const doc = buildBakedDesignComponent(design, { componentName: "AtomAspectSugar" });
    const props = doc.components.AtomAspectSugar!.root.props;
    expect(props.aspectRatio).toBeUndefined();
    expect(props.width).toBe("fill");
    expect(props.height).toEqual({ aspect: expect.closeTo(16 / 9, 10) });
  });
});

describe("Ratio W:H sugar — type defenses", () => {
  it("PDL-E005 rejects CSS-like string on Ratio token", () => {
    expectPdl(() => loadDesign(err("e005-ratio-string.pdl")), "PDL-E005", /Ratio/);
  });

  it("PDL-E006 rejects W:H sugar on Distance-typed frame props (gap)", () => {
    expectPdl(() => loadDesign(err("e006-gap-ratio-sugar.pdl")), "PDL-E006", /gap/);
  });
});
