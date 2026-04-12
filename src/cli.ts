#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildComponentCatalogue } from "./catalogue.js";
import { stableStringify } from "./stableJson.js";
import { buildDesignGraph } from "./graph.js";
import { loadDesign } from "./loadDesign.js";
import { buildResolvedTokenMap } from "./evaluate.js";
import { resolveComponentTree } from "./resolveTree.js";

function usage(): never {
  console.error(`PDL toolchain

Usage:
  pdl graph <entry.pdl>
  pdl resolve <entry.pdl> <ComponentName> [key=value ...]
  pdl catalogue <entry.pdl> [--theme <ThemeName>] [--out <file.json>]

Options:
  --theme <name>   Primary theme for token resolution (optional)
  --out <path>     Write JSON to file instead of stdout (catalogue only)
`);
  process.exit(1);
}

function parseKeyValues(args: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const a of args) {
    const eq = a.indexOf("=");
    if (eq <= 0) throw new Error(`Bad param ${a}, expected key=value`);
    const k = a.slice(0, eq);
    let v = a.slice(eq + 1);
    if (/^-?\d+(\.\d+)?$/.test(v)) out[k] = Number(v);
    else if (v === "true" || v === "false") out[k] = v === "true";
    else if (v.startsWith(".")) out[k] = v.slice(1);
    else out[k] = v;
  }
  return out;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 2) usage();
  const cmd = argv[0];
  const entry = resolve(argv[1]!);

  if (cmd === "graph") {
    const design = loadDesign(entry);
    process.stdout.write(stableStringify(buildDesignGraph(design)));
    return;
  }

  if (cmd === "resolve") {
    const comp = argv[2];
    if (!comp) usage();
    const kv = parseKeyValues(argv.slice(3));
    const design = loadDesign(entry);
    const tokenMap = buildResolvedTokenMap(design);
    const tree = resolveComponentTree(design, comp, tokenMap, kv);
    process.stdout.write(stableStringify(tree));
    return;
  }

  if (cmd === "catalogue") {
    let theme: string | undefined;
    let outPath: string | undefined;
    const rest = argv.slice(2);
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === "--theme") {
        theme = rest[++i];
      } else if (rest[i] === "--out") {
        outPath = rest[++i];
      }
    }
    const design = loadDesign(entry);
    const cat = buildComponentCatalogue(design, { theme });
    const s = stableStringify(cat);
    if (outPath) writeFileSync(outPath, s, "utf-8");
    else process.stdout.write(s);
    return;
  }

  usage();
}

try {
  main();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
