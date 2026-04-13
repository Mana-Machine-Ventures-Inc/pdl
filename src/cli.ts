#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildBakedDesignComponent, buildBakedDesignSystem } from "./bakeDesign.js";
import { renderBakedDesignToHtmlDocument } from "./renderHtml.js";
import { buildComponentCatalogue } from "./catalogue.js";
import { renderCatalogueSystemHtml } from "./renderCatalogueHtml.js";
import { stableStringify } from "./stableJson.js";
import { buildDesignManifest } from "./manifest.js";
import { loadDesign } from "./loadDesign.js";
import { buildResolvedTokenMap } from "./evaluate.js";
import { buildResolvedComponentDocument } from "./resolveBundle.js";
import { resolveComponentTree } from "./resolveTree.js";

function usage(): never {
  console.error(`PDL toolchain

Usage:
  pdl graphSystem <entry.pdl> [--out <file.json>]
  pdl graphComponent <entry.pdl> <ComponentName> [--theme <ThemeName>] [--out <file.json>] [key=value ...]
  pdl bakeSystem <entry.pdl> [--theme <ThemeName>] [--out <file.json>]
  pdl bakeComponent <entry.pdl> <ComponentName> [--theme <ThemeName>] [--out <file.json>] [key=value ...]
  pdl renderHtml <entry.pdl> <ComponentName> [--theme <ThemeName>] [--out <file.html>] [key=value ...]
  pdl renderHtml <entry.pdl> --system [--theme <ThemeName>] [--out <file.html>]
  pdl renderCatalogueHtml <entry.pdl> [--theme <ThemeName>] [--out <file.html>]
  pdl manifest <entry.pdl> [--out <file.json>]
  pdl resolve <entry.pdl> <ComponentName> [--tree-only] [--theme <ThemeName>] [key=value ...]
  pdl catalogue <entry.pdl> [--theme <ThemeName>] [--out <file.json>]

Legacy: catalogue matches graphSystem JSON but allows --theme. resolve without --tree-only matches graphComponent.

Options:
  --theme <name>   Primary theme for token resolution (graphComponent, bake*, catalogue, resolve, renderHtml)
  --out <path>     Write output to file instead of stdout (JSON or HTML by command)

Note: \`node dist/cli.js …\` uses compiled output in dist/. After changing src/, run \`npm run build\` (or \`tsc\`), or use npm scripts that run \`tsc\` first.
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

function parseThemeOutAndKv(rest: string[]): { theme?: string; outPath?: string; kvParts: string[] } {
  const kvParts: string[] = [];
  let theme: string | undefined;
  let outPath: string | undefined;
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;
    if (a === "--theme") {
      const t = rest[++i];
      if (!t || t.startsWith("-")) usage();
      theme = t;
    } else if (a === "--out") {
      const p = rest[++i];
      if (!p || p.startsWith("-")) usage();
      outPath = p;
    } else {
      kvParts.push(a);
    }
  }
  return { theme, outPath, kvParts };
}

function writeJson(outPath: string | undefined, s: string): void {
  if (outPath) writeFileSync(outPath, s, "utf-8");
  else process.stdout.write(s);
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 2) usage();
  const cmd = argv[0];
  const entry = resolve(argv[1]!);

  if (cmd === "graphSystem") {
    const rest = argv.slice(2);
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === "--theme") {
        console.error("graphSystem accepts only the entry file and optional --out (no --theme).");
        process.exit(1);
      }
    }
    let outPath: string | undefined;
    const tail: string[] = [];
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === "--out") {
        const p = rest[++i];
        if (!p || p.startsWith("-")) usage();
        outPath = p;
      } else {
        tail.push(rest[i]!);
      }
    }
    if (tail.length) usage();
    const design = loadDesign(entry);
    const cat = buildComponentCatalogue(design, {});
    writeJson(outPath, stableStringify(cat, { omitEmpty: true }));
    return;
  }

  if (cmd === "graphComponent") {
    const comp = argv[2];
    if (!comp) usage();
    const { theme, outPath, kvParts } = parseThemeOutAndKv(argv.slice(3));
    const kv = parseKeyValues(kvParts);
    const design = loadDesign(entry);
    const bundle = buildResolvedComponentDocument(design, {
      componentName: comp,
      paramOverrides: kv,
      theme,
    });
    writeJson(outPath, stableStringify(bundle, { omitEmpty: true }));
    return;
  }

  if (cmd === "bakeSystem") {
    const { theme, outPath, kvParts } = parseThemeOutAndKv(argv.slice(2));
    if (kvParts.length) usage();
    const design = loadDesign(entry);
    const baked = buildBakedDesignSystem(design, { theme });
    writeJson(outPath, stableStringify(baked, { omitEmpty: true }));
    return;
  }

  if (cmd === "bakeComponent") {
    const comp = argv[2];
    if (!comp) usage();
    const { theme, outPath, kvParts } = parseThemeOutAndKv(argv.slice(3));
    const kv = parseKeyValues(kvParts);
    const design = loadDesign(entry);
    const baked = buildBakedDesignComponent(design, {
      componentName: comp,
      theme,
      paramOverrides: kv,
    });
    writeJson(outPath, stableStringify(baked, { omitEmpty: true }));
    return;
  }

  if (cmd === "renderCatalogueHtml") {
    const { theme, outPath, kvParts } = parseThemeOutAndKv(argv.slice(2));
    if (kvParts.length) usage();
    const design = loadDesign(entry);
    const catalogue = buildComponentCatalogue(design, { theme });
    const baked = buildBakedDesignSystem(design, { theme });
    const html = renderCatalogueSystemHtml(catalogue, baked);
    if (outPath) writeFileSync(outPath, html, "utf-8");
    else process.stdout.write(html);
    return;
  }

  if (cmd === "renderHtml") {
    const rest = argv.slice(2);
    const systemMode = rest[0] === "--system";
    const compArg = systemMode ? undefined : rest[0];
    if (!systemMode && !compArg) usage();
    const { theme, outPath, kvParts } = parseThemeOutAndKv(systemMode ? rest.slice(1) : rest.slice(1));
    if (kvParts.length && systemMode) usage();
    const kv = parseKeyValues(kvParts);
    const design = loadDesign(entry);
    const baked = systemMode
      ? buildBakedDesignSystem(design, { theme })
      : buildBakedDesignComponent(design, {
          componentName: compArg!,
          theme,
          paramOverrides: kv,
        });
    const html = renderBakedDesignToHtmlDocument(baked, {
      singleComponent: systemMode ? undefined : compArg,
    });
    if (outPath) writeFileSync(outPath, html, "utf-8");
    else process.stdout.write(html);
    return;
  }

  if (cmd === "manifest") {
    let outPath: string | undefined;
    const rest = argv.slice(2);
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === "--out") {
        outPath = rest[++i];
      }
    }
    const design = loadDesign(entry);
    const man = buildDesignManifest(design);
    const s = stableStringify(man);
    writeJson(outPath, s);
    return;
  }

  if (cmd === "resolve") {
    const comp = argv[2];
    if (!comp) usage();
    const rawArgs = argv.slice(3);
    let treeOnly = false;
    let theme: string | undefined;
    const kvParts: string[] = [];
    for (let i = 0; i < rawArgs.length; i++) {
      const a = rawArgs[i]!;
      if (a === "--tree-only") treeOnly = true;
      else if (a === "--theme") {
        const t = rawArgs[++i];
        if (!t || t.startsWith("-")) usage();
        theme = t;
      } else kvParts.push(a);
    }
    const kv = parseKeyValues(kvParts);
    const design = loadDesign(entry);
    if (treeOnly) {
      const tokenMap = buildResolvedTokenMap(design, theme);
      const tree = resolveComponentTree(design, comp, tokenMap, kv);
      process.stdout.write(stableStringify(tree, { omitEmpty: true }));
      return;
    }
    const bundle = buildResolvedComponentDocument(design, {
      componentName: comp,
      paramOverrides: kv,
      theme,
    });
    process.stdout.write(stableStringify(bundle, { omitEmpty: true }));
    return;
  }

  if (cmd === "catalogue") {
    const { theme, outPath, kvParts } = parseThemeOutAndKv(argv.slice(2));
    if (kvParts.length) usage();
    const design = loadDesign(entry);
    const cat = buildComponentCatalogue(design, { theme });
    writeJson(outPath, stableStringify(cat, { omitEmpty: true }));
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
