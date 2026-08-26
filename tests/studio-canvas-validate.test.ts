/**
 * Canvas inspector prop validation tests.
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { validateInspectorProp } from "../apps/studio/src/canvas/validateProp.js";
import { state } from "../apps/studio/src/state.js";

describe("validateInspectorProp", () => {
  const prevCat = state.catalogue;

  beforeEach(() => {
    state.catalogue = {
      tokenTables: {
        primitives: {
          "mana.color.ink": {
            name: "mana.color.ink",
            tokenType: "Color",
            definition: { kind: "hex", value: "#112233" },
          },
          "mana.space.sm": {
            name: "mana.space.sm",
            tokenType: "Distance",
            definition: { kind: "number", value: 8 },
          },
        },
        semantics: {
          "mana.color.label": {
            name: "mana.color.label",
            tokenType: "Color",
            definition: "primitive:mana.color.ink",
          },
        },
        themes: {},
      },
    };
  });

  afterEach(() => {
    state.catalogue = prevCat;
  });

  it("accepts direction cases with or without dot", () => {
    expect(validateInspectorProp("layout", "direction", "row")).toEqual({
      ok: true,
      value: ".row",
    });
    expect(validateInspectorProp("layout", "direction", ".column").ok).toBe(true);
    expect(validateInspectorProp("layout", "direction", "Direction.stack").ok).toBe(true);
  });

  it("rejects invalid direction enum", () => {
    const r = validateInspectorProp("layout", "direction", "left");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toMatch(/Invalid Direction/i);
      expect(r.expected).toContain(".row");
    }
  });

  it("rejects quoted enum strings", () => {
    const r = validateInspectorProp("layout", "direction", '"row"');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/Quoted string/i);
  });

  it("accepts Color hex and tokens", () => {
    expect(validateInspectorProp("layout", "borderColor", "#0F6E56").ok).toBe(true);
    expect(validateInspectorProp("layout", "borderColor", "mana.color.label").ok).toBe(true);
  });

  it("rejects unknown Color tokens", () => {
    const r = validateInspectorProp("layout", "borderColor", "mana.color.missing");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/Unknown Color token/i);
  });

  it("rejects Distance token for Color", () => {
    const r = validateInspectorProp("layout", "borderColor", "mana.space.sm");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/Distance/);
  });

  it("accepts Distance token for gap", () => {
    expect(validateInspectorProp("layout", "gap", "mana.space.sm").ok).toBe(true);
    expect(validateInspectorProp("layout", "gap", "8").ok).toBe(true);
  });

  it("rejects bad sizing", () => {
    const r = validateInspectorProp("layout", "width", "stretch");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.expected).toContain(".hug");
  });

  it("accepts hug/fill sizing", () => {
    expect(validateInspectorProp("layout", "width", "hug")).toEqual({ ok: true, value: ".hug" });
    expect(validateInspectorProp("layout", "height", ".fill").ok).toBe(true);
  });

  it("rejects opacity out of range", () => {
    const r = validateInspectorProp("layout", "opacity", "1.5");
    expect(r.ok).toBe(false);
  });

  it("allows empty as unset", () => {
    expect(validateInspectorProp("layout", "wrap", "").ok).toBe(true);
  });
});

describe("inspectorPropsForKind", () => {
  it("includes full text frame props from frame-props.json", async () => {
    const { inspectorPropsForKind } = await import("../apps/studio/src/canvas/validateProp.js");
    const props = inspectorPropsForKind("text");
    expect(props).toContain("content");
    expect(props).toContain("width");
    expect(props).toContain("height");
    expect(props).toContain("padding");
    expect(props).toContain("margin");
    expect(props).toContain("lineHeight");
    expect(props).toContain("position");
    expect(props).toContain("animate");
  });

  it("includes layout margin and child flex props", async () => {
    const { inspectorPropsForKind } = await import("../apps/studio/src/canvas/validateProp.js");
    const props = inspectorPropsForKind("layout");
    expect(props).toContain("margin");
    expect(props).toContain("alignSelf");
    expect(props).toContain("inset");
  });
});
