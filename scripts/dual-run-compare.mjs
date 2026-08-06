#!/usr/bin/env node
/**
 * Compare TypeScript vs Rust CLI JSON for shared bake/graph commands.
 * Pins generatedAt and absolute entryPath before deep equality.
 *
 * Usage: node scripts/dual-run-compare.mjs [entry.pdl ...]
 * Default entries: integration/greeting + first few goldens from manifest.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = join(root, ".tmp/dual-run");
mkdirSync(tmp, { recursive: true });

function pin(value) {
  if (Array.isArray(value)) return value.map(pin);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === "generatedAt") out[k] = "<pinned>";
      else if (k === "entryPath") out[k] = "<entry>";
      else out[k] = pin(v);
    }
    return out;
  }
  return value;
}

function run(cmd, args, outFile) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (r.status !== 0) {
    console.error(`FAIL ${cmd} ${args.join(" ")}\n${r.stderr || r.stdout}`);
    process.exit(1);
  }
  writeFileSync(outFile, r.stdout);
  return JSON.parse(r.stdout);
}

function compare(name, entry, tsArgs, rsArgs) {
  const tsPath = join(tmp, `${name}.ts.json`);
  const rsPath = join(tmp, `${name}.rs.json`);
  // TS: node dist/cli.js …
  const tsDoc = run("node", ["dist/cli.js", ...tsArgs], tsPath);
  const rsDoc = run("cargo", ["run", "-q", "-p", "pdl-cli", "--", ...rsArgs], rsPath);
  const a = pin(tsDoc);
  const b = pin(rsDoc);
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    console.error(`MISMATCH ${name} (${entry})`);
    console.error(`  wrote ${tsPath} and ${rsPath}`);
    process.exit(1);
  }
  console.log(`OK  ${name}`);
}

const entries = process.argv.slice(2);
const defaults = [
  "test-fixtures/pdl/integration/greeting.pdl",
  "test-fixtures/pdl/atoms/text_atoms.pdl",
  "test-fixtures/pdl/molecules/design.pdl",
];
const list = entries.length ? entries : defaults;

// Ensure TS build exists
if (!existsSync(join(root, "dist/cli.js"))) {
  const b = spawnSync("npm", ["run", "build"], { cwd: root, encoding: "utf8" });
  if (b.status !== 0) {
    console.error(b.stderr || b.stdout);
    process.exit(1);
  }
}

for (const entry of list) {
  const base = entry.replace(/[\\/]/g, "_").replace(/\.pdl$/, "");
  compare(`${base}_bakeSystem`, entry, ["bakeSystem", entry], ["bakeSystem", entry]);
  compare(`${base}_graphSystem`, entry, ["graphSystem", entry], ["graphSystem", entry]);
}

console.log(`ALL OK (${list.length} entries × bakeSystem+graphSystem)`);
