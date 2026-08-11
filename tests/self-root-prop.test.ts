import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { loadDesign } from "../src/loadDesign.js";
import { buildBakedDesignComponent } from "../src/bakeDesign.js";
import { parseModule } from "../src/parser.js";

const fx = (rel: string) => join(process.cwd(), "test-fixtures/pdl", rel);

describe("self.prop root frame assignment", () => {
  it("parses self.background = color as frameProp (not host handler)", () => {
    const mod = parseModule(
      `component C() layout {
  let L = Text(background: #000)
  self.background = #FFF
  children = [L]
}
`,
      "t.pdl",
    );
    const c = mod.declarations.find((d) => d.kind === "component" && d.name === "C");
    expect(c?.kind).toBe("component");
    if (c?.kind !== "component") return;
    const selfBg = c.body.find(
      (i) => i.kind === "frameProp" && i.frame === "self" && i.name === "background",
    );
    expect(selfBg).toMatchObject({
      kind: "frameProp",
      frame: "self",
      name: "background",
      value: { kind: "hex", value: "#FFF" },
    });
  });

  it("keeps self.pressEnd = { … } as host handler", () => {
    const mod = parseModule(
      `component C <PointerInput>() layout {
  self.pressEnd = { }
}
`,
      "t.pdl",
    );
    const c = mod.declarations.find((d) => d.kind === "component" && d.name === "C");
    expect(c?.kind).toBe("component");
    if (c?.kind !== "component") return;
    expect(c.body.every((i) => i.kind !== "frameProp")).toBe(true);
  });

  it("bakes nested let backgrounds: c, b, and self→Root are distinct", () => {
    const design = loadDesign(fx("atoms/self_root_prop.pdl"));
    const baked = buildBakedDesignComponent(design, {
      componentName: "AtomSelfRootProp",
    });
    const root = baked.components.AtomSelfRootProp?.root as {
      props?: Record<string, unknown>;
      children?: Array<{
        id?: string;
        props?: Record<string, unknown>;
        children?: Array<{ id?: string; props?: Record<string, unknown> }>;
      }>;
    };
    expect(root?.props?.background).toBe("#FFFFFF");
    const b = root?.children?.find((ch) => ch.id === "b");
    expect(b?.props?.background).toBe("#AAAAAA");
    const c = b?.children?.find((ch) => ch.id === "c");
    expect(c?.props?.background).toBe("#111111");
  });
});
