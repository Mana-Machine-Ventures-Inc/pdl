/**
 * Semantic invariants for LetInstance frame-id scoping.
 * Golden JSON can encode nested-id collisions; these asserts cannot.
 */
import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildComponentCatalogue } from "../src/catalogue.js";
import { buildResolvedTokenMap } from "../src/evaluate.js";
import { loadDesign } from "../src/loadDesign.js";
import { resolveComponentTree, type CatalFrame } from "../src/resolveTree.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fx = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl", ...p);

function collectIds(frame: CatalFrame, out: string[] = []): string[] {
  out.push(frame.id);
  for (const ch of frame.children) collectIds(ch, out);
  return out;
}

function assertUniqueFrameIds(root: CatalFrame, context: string): void {
  const ids = collectIds(root);
  expect(new Set(ids).size, `${context}: duplicate frame ids`).toBe(ids.length);
}

function nestedTextContents(frame: CatalFrame, out: string[] = []): string[] {
  if (frame.kind === "text" && typeof frame.props.content === "string") {
    out.push(frame.props.content);
  }
  for (const ch of frame.children) nestedTextContents(ch, out);
  return out;
}

function walkInstances(frame: CatalFrame, out: CatalFrame[] = []): CatalFrame[] {
  if (frame.instanceOf) out.push(frame);
  for (const ch of frame.children) walkInstances(ch, out);
  return out;
}

function assertInstanceLabelsReachNestedText(root: CatalFrame, context: string): void {
  const instances = walkInstances(root);
  expect(instances.length, `${context}: expected instances`).toBeGreaterThan(0);
  for (const inst of instances) {
    const label = inst.instanceKwargs?.label;
    if (typeof label !== "string") continue;
    const texts = nestedTextContents(inst);
    expect(texts, `${context}: ${inst.id} nested texts`).toContain(label);
  }
}

function child(parent: CatalFrame, id: string): CatalFrame {
  const found = parent.children.find((c) => c.id === id);
  if (!found) throw new Error(`missing child ${id} under ${parent.id}`);
  return found;
}

describe("resolve LetInstance scoping", () => {
  it("keeps distinct labels across sibling MoleculeTextButton instances", () => {
    const d = loadDesign(fx("molecules/m_02_buttons_basic.pdl"));
    const tokens = buildResolvedTokenMap(d);
    const root = resolveComponentTree(d, "MoleculeButtonRowDemo", tokens);
    assertUniqueFrameIds(root, "MoleculeButtonRowDemo");
    assertInstanceLabelsReachNestedText(root, "MoleculeButtonRowDemo");

    for (const [id, label] of [
      ["A", "Primary sm"],
      ["B", "Secondary lg"],
      ["C", "Ghost sm"],
    ] as const) {
      const btn = child(root, id);
      expect(btn.instanceKwargs?.label).toBe(label);
      expect(btn.children[0]!.id).toBe(`${id}__L`);
      expect(btn.children[0]!.props.content).toBe(label);
    }
  });

  it("keeps distinct nested labels for form field + action buttons", () => {
    const d = loadDesign(fx("molecules/m_10_form_group.pdl"));
    const tokens = buildResolvedTokenMap(d);
    const root = resolveComponentTree(d, "MoleculeFormColumnDemo", tokens);
    assertUniqueFrameIds(root, "MoleculeFormColumnDemo");
    assertInstanceLabelsReachNestedText(root, "MoleculeFormColumnDemo");

    expect(child(root, "F0").children[0]!.id).toBe("F0__Lab");
    expect(child(root, "F1").children[0]!.id).toBe("F1__Lab");
    expect(child(root, "F0").children[0]!.props.content).toBe("Workspace");
    expect(child(root, "F1").children[0]!.props.content).toBe("Role");

    const actions = child(root, "Actions");
    const cancel = child(actions, "Cancel");
    const save = child(actions, "Save");
    expect(cancel.instanceKwargs?.label).toBe("Cancel");
    expect(save.instanceKwargs?.label).toBe("Save");
    expect(cancel.children[0]!.props.content).toBe("Cancel");
    expect(save.children[0]!.props.content).toBe("Save");
  });

  it("scopes two-level LetInstance nesting in card grid", () => {
    const d = loadDesign(fx("molecules/m_05_card.pdl"));
    const tokens = buildResolvedTokenMap(d);
    const root = resolveComponentTree(d, "MoleculeCardGridDemo", tokens);
    assertUniqueFrameIds(root, "MoleculeCardGridDemo");
    assertInstanceLabelsReachNestedText(root, "MoleculeCardGridDemo");

    const c1 = child(root, "C1");
    const c2 = child(root, "C2");
    expect(c1.instanceKwargs?.title).toBe("With media");
    expect(c2.instanceKwargs?.title).toBe("No media");
    expect(child(c1, "C1__Title").props.content).toBe("With media");
    expect(child(c2, "C2__Title").props.content).toBe("No media");

    const c1Primary = child(child(c1, "C1__Actions"), "C1__Primary");
    const c2Primary = child(child(c2, "C2__Actions"), "C2__Primary");
    expect(c1Primary.children[0]!.id).toBe("C1__Primary__L");
    expect(c2Primary.children[0]!.id).toBe("C2__Primary__L");
    expect(c1Primary.children[0]!.props.content).toBe("Open");
    expect(c2Primary.children[0]!.props.content).toBe("Open");
  });
});

describe("catalogue registry LetInstance scoping", () => {
  it("registers scoped nested ids for MoleculeFormColumnDemo", () => {
    const d = loadDesign(fx("molecules/m_10_form_group.pdl"));
    const row = buildComponentCatalogue(d).components.MoleculeFormColumnDemo!;
    const keys = Object.keys(row.childNodes);
    for (const key of ["Cancel__L", "Save__L", "F0__Lab", "F1__Lab", "F0__Val", "F1__Val"]) {
      expect(keys, `missing ${key}`).toContain(key);
    }
    expect(keys).not.toContain("L");
    expect(keys).not.toContain("Lab");
  });

  it("registers scoped nested ids for MoleculeButtonRowDemo", () => {
    const d = loadDesign(fx("molecules/m_02_buttons_basic.pdl"));
    const row = buildComponentCatalogue(d).components.MoleculeButtonRowDemo!;
    const keys = Object.keys(row.childNodes);
    expect(keys).toEqual(expect.arrayContaining(["A__L", "B__L", "C__L"]));
    expect(keys).not.toContain("L");
  });
});
