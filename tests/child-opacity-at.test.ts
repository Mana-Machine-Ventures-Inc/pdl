import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { PdlError } from "../src/errors.js";
import { loadDesign } from "../src/loadDesign.js";
import { buildBakedDesignComponent } from "../src/bakeDesign.js";
import { parseModule } from "../src/parser.js";

const fx = (rel: string) => join(process.cwd(), "test-fixtures/pdl", rel);

describe("child / layer `@ Opacity` sugar", () => {
  it("parses Pic @ 0.5 on children frameRef", () => {
    const mod = parseModule(
      `component C() layout {
  let Pic = Media(source: "https://example.com/a.png")
  children = [Pic @ 0.5]
}
`,
      "t.pdl",
    );
    const c = mod.declarations.find((d) => d.kind === "component");
    expect(c?.kind).toBe("component");
    if (c?.kind !== "component") return;
    const kids = c.body.find((i) => i.kind === "children");
    expect(kids?.kind).toBe("children");
    if (kids?.kind !== "children") return;
    expect(kids.entries[0]).toMatchObject({
      kind: "frameRef",
      id: "Pic",
      opacity: { kind: "number", value: 0.5 },
    });
  });

  it("desugars MediaLayer(…) @ op into opacity: arg", () => {
    const mod = parseModule(
      `component C() layout {
  background = [MediaLayer(source: "https://example.com/a.png", contentMode: .cover) @ 0.4]
  children = []
}
`,
      "t.pdl",
    );
    const c = mod.declarations.find((d) => d.kind === "component");
    if (c?.kind !== "component") return;
    const bg = c.body.find((i) => i.kind === "prop" && i.name === "background");
    expect(bg?.kind).toBe("prop");
    if (bg?.kind !== "prop" || bg.value.kind !== "array") return;
    const media = bg.value.items[0];
    expect(media).toMatchObject({
      kind: "call",
      callee: "MediaLayer",
      args: {
        opacity: { kind: "number", value: 0.4 },
      },
    });
  });

  it("bakes LabLayers with Pic opacity 0.5", () => {
    const design = loadDesign(fx("atoms/child_opacity_at.pdl"));
    const baked = buildBakedDesignComponent(design, { componentName: "LabLayers" });
    const root = baked.components.LabLayers?.root as {
      children?: Array<{ props?: Record<string, unknown> }>;
    };
    expect(root?.children?.[0]?.props?.opacity).toBe(0.5);
  });

  it("rejects Spacer() @ opacity", () => {
    expect(() => loadDesign(fx("errors/e001-spacer-at-opacity.pdl"))).toThrow(PdlError);
    try {
      loadDesign(fx("errors/e001-spacer-at-opacity.pdl"));
    } catch (e) {
      expect((e as PdlError).message).toMatch(/Spacer\(\).*opacity/i);
    }
  });

  it("rejects Media with both opacity: and @", () => {
    expect(() => loadDesign(fx("errors/e020-media-double-opacity.pdl"))).toThrow(PdlError);
    try {
      loadDesign(fx("errors/e020-media-double-opacity.pdl"));
    } catch (e) {
      expect((e as PdlError).message).toMatch(/already has `opacity:`|PDL-E020/);
    }
  });

  it("rejects Blur(…) @ opacity", () => {
    expect(() => loadDesign(fx("errors/e001-blur-at-opacity.pdl"))).toThrow(PdlError);
    try {
      loadDesign(fx("errors/e001-blur-at-opacity.pdl"));
    } catch (e) {
      expect((e as PdlError).message).toMatch(/Blur/);
    }
  });
});
