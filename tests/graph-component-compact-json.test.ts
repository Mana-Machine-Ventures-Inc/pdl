import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadDesign } from "../src/loadDesign.js";
import { buildResolvedComponentDocument } from "../src/resolveBundle.js";
import { stableStringify } from "../src/stableJson.js";
import { assertResolvedComponentContract } from "./helpers/graphBakeContracts.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fx = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl", ...p);

/** Same path the CLI uses: `buildResolvedComponentDocument` + `stableStringify(..., { omitEmpty: true })`. */
function compactResolvedJson(designRel: string, componentName: string): Record<string, unknown> {
  const design = loadDesign(fx(designRel));
  const bundle = buildResolvedComponentDocument(design, { componentName });
  return JSON.parse(stableStringify(bundle, { omitEmpty: true })) as Record<string, unknown>;
}

/**
 * Structural invariants for compact **`resolvedComponent`** JSON (empty_layout_shell + EmptyLayoutShell).
 * Guards against re-introducing empty catalogue noise (`[]`, `{}`, `""`) on disk.
 */
function expectEmptyLayoutShellCompactShape(doc: Record<string, unknown>): void {
  expect(doc.schemaKind).toBe("resolvedComponent");

  const components = doc.components as Record<string, Record<string, unknown>>;
  const deep = components.DeepSlot;
  expect(Object.keys(deep).sort()).toEqual(["name", "root"]);
  for (const noisy of [
    "childHierarchy",
    "childNodes",
    "expose",
    "params",
    "variants",
    "usage",
    "requiredComponents",
  ] as const) {
    expect(deep).not.toHaveProperty(noisy);
  }

  const shell = components.EmptyLayoutShell;
  expect(shell).not.toHaveProperty("usage");

  const ch = shell.childHierarchy as Record<string, unknown>;
  expect(Object.keys(ch).sort()).toEqual(["Root", "SlotOne", "SlotTwo"]);
  expect(ch).not.toHaveProperty("SlotThree");

  const childNodes = shell.childNodes as Record<string, Record<string, unknown>>;
  expect(Object.keys(childNodes.DSlot!).sort()).toEqual(["id", "instanceOf", "kind", "props"]);
  expect(childNodes.DSlot).not.toHaveProperty("children");
  expect(childNodes.DSlot).not.toHaveProperty("instanceKwargs");

  expect(Object.keys(childNodes.SlotOne!).sort()).toEqual(["id", "kind", "props"]);
  expect(childNodes.SlotOne).not.toHaveProperty("children");

  const variant = (shell.variants as unknown[])[0] as Record<string, unknown>;
  expect(variant).not.toHaveProperty("changes");
  expect(Object.keys(variant).sort()).toEqual(["affectedFrames", "childHierarchy", "params", "structuralChange"]);

  const system = doc.system as Record<string, unknown>;
  expect(Object.keys(system).sort()).toEqual(["primitives", "semantics", "variantTypes"]);
  expect(system).not.toHaveProperty("themes");
  expect(system).not.toHaveProperty("typeStyles");
}

describe("graphComponent compact JSON (omitEmpty)", () => {
  it("empty_layout_shell → EmptyLayoutShell: drops empty structure on transitive rows and system maps", () => {
    const doc = compactResolvedJson("integration/empty_layout_shell.pdl", "EmptyLayoutShell");
    expectEmptyLayoutShellCompactShape(doc);
  });

  it("golden empty_layout_shell.componentGraph.json stays compact and contract-valid", () => {
    const raw = readFileSync(fx("integration/empty_layout_shell.componentGraph.json"), "utf8");
    const doc = JSON.parse(raw) as Record<string, unknown>;
    expect(() => assertResolvedComponentContract(doc)).not.toThrow();
    expectEmptyLayoutShellCompactShape(doc);
    expect(doc.entryPath).toBe("test-fixtures/pdl/integration/empty_layout_shell.pdl");
    expect(doc.generatedAt).toBe("2026-04-12T00:00:00.000Z");
    expect(doc.primaryComponent).toBe("EmptyLayoutShell");
  });

  it("stableStringify omitEmpty omits the whole system object when every subtree is empty", () => {
    const doc = compactResolvedJson("integration/greeting.pdl", "Greeting");
    expect(doc).not.toHaveProperty("system");
    const greeting = (doc.components as Record<string, unknown>).Greeting as Record<string, unknown>;
    expect(greeting).not.toHaveProperty("usage");
    expect(greeting).not.toHaveProperty("variants");
  });
});
