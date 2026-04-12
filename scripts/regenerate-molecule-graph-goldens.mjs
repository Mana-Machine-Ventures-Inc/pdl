#!/usr/bin/env node
/**
 * Regenerate tests/fixtures/molecule-graph-expected/*.graph.json from test-fixtures/pdl/molecules/*.pdl
 * Run after intentional AST / graph shape changes: npm run test:update-molecule-graphs
 */
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDesign } from "../dist/loadDesign.js";
import { buildDesignGraph } from "../dist/graph.js";
import { stableStringify } from "../dist/stableJson.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const moleculesDir = join(root, "test-fixtures/pdl/molecules");
const outDir = join(root, "tests/fixtures/molecule-graph-expected");

function normalize(g) {
  const o = JSON.parse(JSON.stringify(g));
  o.entryPath = "<resolved>";
  o.modulePaths = o.modulePaths.map((p) => basename(p)).sort();
  return o;
}

mkdirSync(outDir, { recursive: true });
const files = readdirSync(moleculesDir).filter((x) => x.endsWith(".pdl"));
for (const f of files) {
  const p = join(moleculesDir, f);
  const g = buildDesignGraph(loadDesign(p));
  writeFileSync(join(outDir, f.replace(".pdl", ".graph.json")), stableStringify(normalize(g)));
}
console.log("Wrote", files.length, "golden graph files to", outDir);
