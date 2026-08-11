import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBakedDesignComponent } from "../src/bakeDesign.js";
import { loadDesign } from "../src/loadDesign.js";
import { parseModule } from "../src/parser.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const atoms = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl/atoms", ...p);

describe("World A expression-tree authoring", () => {
  it("parses let title = Text(…) into a text frame let", () => {
    const mod = parseModule(
      `component C() layout {
  let title = Text(content: "Hi", color: #111111)
  children = [title]
}
`,
      "t.pdl",
    );
    const c = mod.declarations.find((d) => d.kind === "component");
    expect(c?.kind).toBe("component");
    if (c?.kind !== "component") return;
    const letTitle = c.body.find((i) => i.kind === "let" && i.id === "title");
    expect(letTitle).toMatchObject({
      kind: "let",
      id: "title",
      frameKind: "text",
    });
    if (letTitle?.kind !== "let") return;
    expect(letTitle.body).toEqual(
      expect.arrayContaining([
        { kind: "prop", name: "content", value: { kind: "string", value: "Hi" } },
      ]),
    );
  });

  it("desugars anonymous Layout(…) in children to synthetic lets", () => {
    const mod = parseModule(
      `component C() layout {
  children = [Layout(direction: .row, children: [Text(content: "a")])]
}
`,
      "t.pdl",
    );
    const c = mod.declarations.find((d) => d.kind === "component");
    if (c?.kind !== "component") return;
    const lets = c.body.filter((i) => i.kind === "let");
    expect(lets.length).toBeGreaterThanOrEqual(2);
    expect(lets.some((l) => l.kind === "let" && l.frameKind === "text")).toBe(true);
    expect(lets.some((l) => l.kind === "let" && l.frameKind === "layout")).toBe(true);
    const kids = c.body.find((i) => i.kind === "children");
    expect(kids?.kind).toBe("children");
    if (kids?.kind !== "children") return;
    expect(kids.entries.every((e) => e.kind === "frameRef")).toBe(true);
  });

  it("rejects asset Icon(…) with IconRef migrate hint", () => {
    expect(() =>
      parseModule(`primitive x: Icon = Icon(system: .sfSymbols, name: "star")`, "t.pdl"),
    ).toThrow(/IconRef/);
  });

  it("rejects reserved component name Text", () => {
    expect(() => parseModule(`component Text() layout { children = [] }`, "t.pdl")).toThrow(
      /reserved/,
    );
  });

  it("loads World A fixture and bakes", () => {
    const design = loadDesign(atoms("world_a_text_layout.pdl"));
    const baked = buildBakedDesignComponent(design, { componentName: "AtomWorldA" });
    const root = baked.components.AtomWorldA.root;
    expect(root.children?.length).toBeGreaterThan(0);
  });
});
