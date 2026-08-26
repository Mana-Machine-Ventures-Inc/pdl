/**
 * Spec-driven prop editor descriptor tests.
 */
import { describe, expect, it } from "vitest";
import {
  parseOneForm,
  parseAcceptModes,
  parseArgList,
  encodeAcceptValue,
  decodeAcceptValue,
  editorSpecForProp,
  decodeEnumValue,
} from "../apps/studio/src/canvas/propSpec.js";

describe("parseAcceptForms", () => {
  it("parses bare enum cases", () => {
    expect(parseOneForm(".hug")).toMatchObject({ id: "hug", kind: "dotCase", args: [] });
  });

  it("parses labeled flex args from the language form", () => {
    const m = parseOneForm(".flex(min:, preferred:, max:)");
    expect(m).toMatchObject({ id: "flex", kind: "dotCall" });
    expect(m?.args.map((a) => a.name)).toEqual(["min", "preferred", "max"]);
    expect(m?.args.every((a) => a.labeled)).toBe(true);
  });

  it("parses positional fixed(n)", () => {
    const m = parseOneForm(".fixed(n)");
    expect(m).toMatchObject({ id: "fixed", kind: "dotCall" });
    expect(m?.args).toEqual([{ name: "n", labeled: false }]);
  });

  it("parses arg lists", () => {
    expect(parseArgList("min:, preferred:, max:")).toEqual([
      { name: "min", labeled: true },
      { name: "preferred", labeled: true },
      { name: "max", labeled: true },
    ]);
  });
});

describe("Sizing editor from language-objects", () => {
  it("builds accept editor for width", () => {
    const spec = editorSpecForProp("layout", "width");
    expect(spec.editor).toBe("accept");
    const ids = (spec.modes || []).map((m) => m.id);
    expect(ids).toContain("hug");
    expect(ids).toContain("fill");
    expect(ids).toContain("flex");
    expect(ids).toContain("fixed");
    expect(ids).toContain("aspect");
    expect(ids).toContain("number");
    expect(ids).toContain("token");
    const flex = spec.modes?.find((m) => m.id === "flex");
    expect(flex?.args.map((a) => a.name)).toEqual(["min", "preferred", "max"]);
  });

  it("round-trips flex values", () => {
    const spec = editorSpecForProp("layout", "width");
    const modes = spec.modes || [];
    const encoded = encodeAcceptValue(modes, "flex", { min: "8", preferred: "40", max: "120" });
    expect(encoded).toBe(".flex(min: 8, preferred: 40, max: 120)");
    const decoded = decodeAcceptValue(modes, encoded);
    expect(decoded.modeId).toBe("flex");
    expect(decoded.args).toMatchObject({ min: "8", preferred: "40", max: "120" });
  });

  it("decodes bake flex objects", () => {
    const modes = editorSpecForProp("layout", "width").modes || [];
    const decoded = decodeAcceptValue(modes, {
      mode: "flex",
      flexArgs: { min: 0, max: 400 },
    });
    expect(decoded.modeId).toBe("flex");
    expect(decoded.args.min).toBe("0");
    expect(decoded.args.max).toBe("400");
  });
});

describe("enum editors from frame-props", () => {
  it("builds direction dropdown", () => {
    const spec = editorSpecForProp("layout", "direction");
    expect(spec.editor).toBe("enum");
    expect(spec.options?.map((o) => o.value)).toContain(".row");
    expect(spec.options?.map((o) => o.value)).toContain(".stack");
    expect(spec.options?.find((o) => o.value === ".row")?.meaning).toMatch(/left to right/i);
  });

  it("decodes bare bake enums", () => {
    const spec = editorSpecForProp("layout", "direction");
    expect(decodeEnumValue("row", spec.options || [])).toBe(".row");
    expect(decodeEnumValue(".column", spec.options || [])).toBe(".column");
  });
});

describe("EdgeInsets editor from language-objects", () => {
  it("builds accept editor for padding", () => {
    const spec = editorSpecForProp("layout", "padding");
    expect(spec.editor).toBe("accept");
    const ids = (spec.modes || []).map((m) => m.id);
    expect(ids).toContain("number");
    expect(ids).toContain("token");
    expect(ids.some((id) => id.startsWith("EdgeInsets(x:"))).toBe(true);
    expect(ids.some((id) => id.startsWith("EdgeInsets(top:"))).toBe(true);
  });

  it("decodes uniform TRBL bake objects as number", () => {
    const modes = editorSpecForProp("layout", "padding").modes || [];
    const decoded = decodeAcceptValue(modes, {
      top: 12,
      right: 12,
      bottom: 12,
      left: 12,
    });
    expect(decoded.modeId).toBe("number");
    expect(decoded.args.value).toBe("12");
  });

  it("decodes xy-pair TRBL bake objects as EdgeInsets(x:, y:)", () => {
    const modes = editorSpecForProp("layout", "padding").modes || [];
    const decoded = decodeAcceptValue(modes, {
      top: 6,
      right: 10,
      bottom: 6,
      left: 10,
    });
    expect(decoded.modeId).toMatch(/^EdgeInsets\(x:/);
    expect(decoded.args).toMatchObject({ x: "10", y: "6" });
  });

  it("decodes truly asymmetric TRBL bake objects per-side", () => {
    const modes = editorSpecForProp("layout", "padding").modes || [];
    const decoded = decodeAcceptValue(modes, {
      top: 8,
      right: 12,
      bottom: 4,
      left: 16,
    });
    expect(decoded.modeId).toMatch(/^EdgeInsets\(top:/);
    expect(decoded.args).toMatchObject({ top: "8", right: "12", bottom: "4", left: "16" });
  });

  it("does not mis-decode objects as token", () => {
    const modes = editorSpecForProp("layout", "padding").modes || [];
    const decoded = decodeAcceptValue(modes, { top: 6, right: 10, bottom: 6, left: 10 });
    expect(decoded.modeId).not.toBe("token");
    expect(decoded.args.name).toBeUndefined();
  });
});

describe("parseAcceptModes skips anti-patterns", () => {
  it("skips quoted forms", () => {
    const modes = parseAcceptModes([
      { form: ".hug" },
      { form: '"#3B82F6"', meaning: "wrong" },
      { form: ".fill" },
    ]);
    expect(modes.map((m) => m.id)).toEqual(["hug", "fill"]);
  });
});
