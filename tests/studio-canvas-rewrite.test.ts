/**
 * Unit tests for Canvas PDL surgical rewriter.
 */
import { describe, expect, it } from "vitest";
import {
  applyPendingToSource,
  findComponentBody,
  formatValue,
} from "../apps/studio/src/canvas/rewrite.js";

const BUTTON = `import "foundation.pdl"

component Button(
  label: String = "Button",
  tone: Tone = .primary
) layout {
  direction = .row
  gap = 8
  background = #EEEEEE
  padding = EdgeInsets(x: 12, y: 8)

  if tone == .primary {
    background = #FF0000
  } else if tone == .secondary {
    background = #00FF00
  }

  let L = Text(content: label, fontSize: 15, fontWeight: 600)
  children = [L]
}
`;

describe("canvas rewrite", () => {
  it("finds component body", () => {
    const loc = findComponentBody(BUTTON, "Button");
    expect(loc).not.toBeNull();
    expect(BUTTON.slice(loc.bodyStart, loc.bodyEnd)).toContain("direction = .row");
  });

  it("sets unconditional root prop", () => {
    const r = applyPendingToSource(BUTTON, "Button", [
      { id: "1", kind: "setProp", target: "root", prop: "gap", value: 16 },
    ]);
    expect(r.ok).toBe(true);
    expect(r.source).toContain("gap = 16");
  });

  it("writes into tone axis branch", () => {
    const r = applyPendingToSource(BUTTON, "Button", [
      {
        id: "1",
        kind: "setProp",
        target: "root",
        prop: "background",
        value: "#123456",
        axes: { tone: "secondary" },
      },
    ]);
    expect(r.ok).toBe(true);
    expect(r.source).toMatch(/else if tone == \.secondary \{[\s\S]*background = #123456/);
  });

  it("adds a Text layer", () => {
    const r = applyPendingToSource(BUTTON, "Button", [
      { id: "1", kind: "addLayer", target: "root", payload: { kind: "text", name: "Hint", content: "Hi" } },
    ]);
    expect(r.ok).toBe(true);
    expect(r.source).toContain("let Hint = Text");
    expect(r.source).toContain("children = [L, Hint]");
  });

  it("adds layout, icon, and media layers", () => {
    const base = `component Box() layout {
  children = []
}
`;
    const layout = applyPendingToSource(base, "Box", [
      { id: "1", kind: "addLayer", target: "root", payload: { kind: "layout", name: "Row" } },
    ]);
    expect(layout.ok).toBe(true);
    expect(layout.source).toContain("let Row = Layout");
    expect(layout.source).toContain("children = [Row]");

    const icon = applyPendingToSource(base, "Box", [
      { id: "1", kind: "addLayer", target: "root", payload: { kind: "icon", name: "Star" } },
    ]);
    expect(icon.source).toContain("let Star = Icon");

    const media = applyPendingToSource(base, "Box", [
      { id: "1", kind: "addLayer", target: "root", payload: { kind: "media", name: "Hero" } },
    ]);
    expect(media.source).toContain("let Hero = Media");
  });

  it("reorders children list", () => {
    const src = `component Row() layout {
  let A = Text(content: "a")
  let B = Text(content: "b")
  children = [A, B]
}
`;
    const r = applyPendingToSource(src, "Row", [
      { id: "1", kind: "reorderChildren", target: "root", payload: { order: ["B", "A"] } },
    ]);
    expect(r.ok).toBe(true);
    expect(r.source).toContain("children = [B, A]");
  });

  it("formats EdgeInsets-like objects", () => {
    expect(formatValue({ x: 14, y: 8 })).toBe("EdgeInsets(x: 14, y: 8)");
  });

  it("rejects ambiguous multi-axis without choice", () => {
    const r = applyPendingToSource(BUTTON, "Button", [
      {
        id: "1",
        kind: "setProp",
        target: "root",
        prop: "padding",
        value: "EdgeInsets(x: 20, y: 10)",
        axes: { tone: "secondary", size: "lg" },
      },
    ]);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Ambiguous/);
  });

  it("redirects root color to first Text let", () => {
    const r = applyPendingToSource(BUTTON, "Button", [
      { id: "1", kind: "setProp", target: "root", prop: "color", value: "#00FF00" },
    ]);
    expect(r.ok).toBe(true);
    expect(r.source).toMatch(/L\.color = #00FF00/);
    expect(r.warnings?.[0]).toMatch(/text layer L/);
  });

  it("formats token refs without quoting", () => {
    expect(formatValue("mana.color.label")).toBe("mana.color.label");
    expect(formatValue("mana.color.label @ 0.5")).toBe("mana.color.label @ 0.5");
    expect(formatValue("#0F6E56 @ 0.4")).toBe("#0F6E56 @ 0.4");
  });

  it("writes borderWidth unconditionally", () => {
    const r = applyPendingToSource(BUTTON, "Button", [
      { id: "1", kind: "setProp", target: "root", prop: "borderWidth", value: 3 },
      { id: "2", kind: "setProp", target: "root", prop: "borderColor", value: "#FF0000" },
    ]);
    expect(r.ok).toBe(true);
    expect(r.source).toContain("borderWidth = 3");
    expect(r.source).toContain("borderColor = #FF0000");
  });

  it("writes Color token refs without quotes", () => {
    const r = applyPendingToSource(BUTTON, "Button", [
      { id: "1", kind: "setProp", target: "root", prop: "borderColor", value: "mana.color.label" },
      { id: "2", kind: "setProp", target: "root", prop: "borderWidth", value: 20 },
    ]);
    expect(r.ok).toBe(true);
    expect(r.source).toContain("borderColor = mana.color.label");
    expect(r.source).not.toContain('"mana.color.label"');
  });

  it("deletes multi-line Text lets without leaving content: orphans", () => {
    const src = `component Button() layout {
  background = #fff
  let Label = Text(
    content: label,
    style: Body,
    fontWeight: 600
  )
  if tone == .primary {
    Label.color = #fff
  } else {
    Label.color = #111
  }
  children = [Label]
}
`;
    const r = applyPendingToSource(src, "Button", [
      { id: "1", kind: "deleteLayer", target: "let:Label" },
    ]);
    expect(r.ok).toBe(true);
    expect(r.source).not.toContain("let Label");
    expect(r.source).not.toMatch(/^\s*content:/m);
    expect(r.source).not.toContain("Label.color");
    expect(r.source).toContain("children = []");
  });
});
