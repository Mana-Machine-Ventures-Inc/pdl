#!/usr/bin/env node
/**
 * Regenerate tests/fixtures/atom-graph-expected/*.graph.json from test-fixtures/pdl/atoms/*.pdl
 * Run after intentional AST / graph shape changes: node scripts/regenerate-atom-graph-goldens.mjs
 */
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDesign } from "../dist/loadDesign.js";
import { buildDesignGraph } from "../dist/graph.js";
import { stableStringify } from "../dist/stableJson.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const atomsDir = join(root, "test-fixtures/pdl/atoms");
const outDir = join(root, "tests/fixtures/atom-graph-expected");

function normalize(g) {
  const o = JSON.parse(JSON.stringify(g));
  o.entryPath = "<resolved>";
  o.modulePaths = o.modulePaths.map((p) => basename(p)).sort();
  return o;
}

mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(atomsDir).filter((x) => x.endsWith(".pdl"))) {
  const p = join(atomsDir, f);
  const g = buildDesignGraph(loadDesign(p));
  writeFileSync(join(outDir, f.replace(".pdl", ".graph.json")), stableStringify(normalize(g)));
}
console.log("Wrote", readdirSync(outDir).filter((x) => x.endsWith(".graph.json")).length, "golden graph files to", outDir);
