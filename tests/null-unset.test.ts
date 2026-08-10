import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBakedDesignComponent } from "../src/bakeDesign.js";
import { buildResolvedTokenMap } from "../src/evaluate.js";
import { loadDesign } from "../src/loadDesign.js";
import { parseModule } from "../src/parser.js";
import { resolveComponentTree } from "../src/resolveTree.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const atoms = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl/atoms", ...p);

describe("null unset", () => {
  it("parses null as a ValueExpr", () => {
    const m = parseModule(
      `component C() layout { borderColor = null }`,
      "x.pdl",
    );
    const c = m.declarations.find((d) => d.kind === "component");
    expect(c).toBeTruthy();
    if (!c || c.kind !== "component") throw new Error("expected component");
    const prop = c.body.find((b) => b.kind === "prop" && b.name === "borderColor");
    expect(prop).toMatchObject({ kind: "prop", name: "borderColor", value: { kind: "null" } });
  });

  it("bake omits borderColor after borderColor = null; gap = null leaves columnGap", () => {
    const design = loadDesign(atoms("null_unset.pdl"));
    const baked = buildBakedDesignComponent(design, { componentName: "NullUnset" });
    const root = baked.components.NullUnset!.root;
    expect(root.props.borderWidth).toBe(2);
    expect(root.props.borderColor).toBeUndefined();
    expect(root.props.gap).toBeUndefined();
    expect(root.props.columnGap).toBe(4);
  });

  it("resolve keeps null sentinel until bake strips it", () => {
    const design = loadDesign(atoms("null_unset.pdl"));
    const tokens = buildResolvedTokenMap(design);
    const tree = resolveComponentTree(design, "NullUnset", tokens);
    expect(tree.props.borderColor).toBeNull();
    expect(tree.props.columnGap).toBe(4);
  });

  it("color = null after style clears typeStyle color on bake", () => {
    const design = loadDesign(atoms("null_after_typestyle.pdl"));
    const baked = buildBakedDesignComponent(design, { componentName: "NullAfterTypeStyle" });
    const root = baked.components.NullAfterTypeStyle!.root;
    expect(root.props.fontSize).toBe(14);
    expect(root.props.color).toBeUndefined();
    expect(root.props.typeStyle).toBeUndefined();
  });
});