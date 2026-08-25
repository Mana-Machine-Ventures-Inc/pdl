#!/usr/bin/env node
/**
 * PDL host CLI — HTML and the thin manifest, from Rust JSON artifacts.
 *
 * Parse / validate / bake / catalogue / resolve all live in Rust (`crates/pdl-cli`).
 * Every command here takes a `pdl bake*` document (and optionally a `pdl catalogue` /
 * `pdl tokens` document) and never reads `.pdl` source.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { BakedDesignDocument } from "./bakeDesign.js";
import {
  companionPreviewFromCatalogue,
  renderBakedDesignToHtmlDocument,
} from "./renderHtml.js";
import { renderCatalogueSystemHtml } from "./renderCatalogueHtml.js";
import type { ComponentCatalogue } from "./catalogue.js";
import { stableStringify } from "./stableJson.js";
import { buildDesignManifestFromCatalogue } from "./manifest.js";

function usage(): never {
  console.error(`PDL host CLI (HTML + manifest from Rust JSON)

Usage:
  pdl renderHtml --from-bake <baked.json> [--catalogue <catalogue.json>] [--component <Name>] [--out <file.html>]
  pdl renderCatalogueHtml --from-bake <baked.json> --catalogue <catalogue.json> [--out <file.html>]
  pdl manifest --catalogue <catalogue.json> [--tokens <tokens.json>] [--out <file.json>]

Produce the inputs with the Rust CLI:
  pdl bakeSystem <entry.pdl> --out sys.bake.json
  pdl bakeComponent <entry.pdl> <Component> --out comp.bake.json
  pdl catalogue <entry.pdl> --out cat.json
  pdl tokens <entry.pdl> --out tokens.json

Options:
  --from-bake <path>   bakedDesign JSON (\`pdl bakeSystem\` / \`bakeComponent\` / \`bakePack\`)
  --catalogue <path>   componentCatalogue JSON — adds usage / rules / interactions
  --tokens <path>      resolvedTokens JSON — adds modulePaths / previewBackground
  --component <Name>   Render only this component from the bake document
  --out <path>         Write to file instead of stdout

Note: \`node dist/cli.js …\` runs compiled output. After changing src/, run \`npm run build\`.
`);
  process.exit(1);
}

function loadJsonFile(path: string, label: string): unknown {
  const abs = resolve(path);
  try {
    return JSON.parse(readFileSync(abs, "utf-8"));
  } catch (e) {
    throw new Error(`Failed to read ${label} ${abs}: ${e instanceof Error ? e.message : e}`);
  }
}

function loadBakedDesignDocument(path: string): BakedDesignDocument {
  const raw = loadJsonFile(path, "bake JSON");
  if (
    !raw ||
    typeof raw !== "object" ||
    (raw as { schemaKind?: string }).schemaKind !== "bakedDesign"
  ) {
    throw new Error(`Expected a bakedDesign document in ${resolve(path)}`);
  }
  return raw as BakedDesignDocument;
}

function loadCatalogueDocument(path: string): ComponentCatalogue {
  const raw = loadJsonFile(path, "catalogue JSON");
  if (!raw || typeof raw !== "object" || !(raw as { components?: unknown }).components) {
    throw new Error(`Expected a componentCatalogue document in ${resolve(path)}`);
  }
  return raw as ComponentCatalogue;
}

type Flags = {
  bakePath?: string;
  cataloguePath?: string;
  tokensPath?: string;
  component?: string;
  outPath?: string;
};

function parseFlags(args: string[]): Flags {
  const out: Flags = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    const next = () => {
      const v = args[++i];
      if (!v || v.startsWith("-")) usage();
      return v;
    };
    if (a === "--from-bake") out.bakePath = next();
    else if (a === "--catalogue") out.cataloguePath = next();
    else if (a === "--tokens") out.tokensPath = next();
    else if (a === "--component") out.component = next();
    else if (a === "--out") out.outPath = next();
    else usage();
  }
  return out;
}

function writeOut(outPath: string | undefined, s: string): void {
  if (outPath) writeFileSync(outPath, s, "utf-8");
  else process.stdout.write(s);
}

/** `usage` / `rules` / `interactions` for the interactive host, when a catalogue is supplied. */
function hostExtrasFromCatalogue(cat: ComponentCatalogue | undefined) {
  if (!cat) return { interactiveHost: false } as const;
  const companions = companionPreviewFromCatalogue(
    cat.components as unknown as Record<string, unknown>,
  );
  const interactionsByComponent: Record<string, unknown> = {};
  for (const [name, row] of Object.entries(cat.components)) {
    if (row.interactions?.length) interactionsByComponent[name] = row.interactions;
  }
  return {
    usageByComponent: companions.usageByComponent,
    rulesByComponent: companions.rulesByComponent,
    interactionsByComponent,
    interactiveHost: Object.keys(interactionsByComponent).length > 0,
  };
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 1) usage();
  const cmd = argv[0];
  const flags = parseFlags(argv.slice(1));

  if (cmd === "renderHtml") {
    if (!flags.bakePath) usage();
    const baked = loadBakedDesignDocument(flags.bakePath);
    if (flags.component && !baked.components[flags.component]) {
      throw new Error(`Component \`${flags.component}\` not found in bake document`);
    }
    const cat = flags.cataloguePath ? loadCatalogueDocument(flags.cataloguePath) : undefined;
    const html = renderBakedDesignToHtmlDocument(baked, {
      singleComponent: flags.component,
      ...hostExtrasFromCatalogue(cat),
    });
    writeOut(flags.outPath, html);
    return;
  }

  if (cmd === "renderCatalogueHtml") {
    if (!flags.bakePath || !flags.cataloguePath) usage();
    const baked = loadBakedDesignDocument(flags.bakePath);
    const cat = loadCatalogueDocument(flags.cataloguePath);
    writeOut(flags.outPath, renderCatalogueSystemHtml(cat, baked));
    return;
  }

  if (cmd === "manifest") {
    if (!flags.cataloguePath) usage();
    const cat = loadCatalogueDocument(flags.cataloguePath);
    const tokens = flags.tokensPath
      ? (loadJsonFile(flags.tokensPath, "tokens JSON") as Record<string, unknown>)
      : undefined;
    const man = buildDesignManifestFromCatalogue(cat, tokens);
    writeOut(flags.outPath, stableStringify(man));
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
