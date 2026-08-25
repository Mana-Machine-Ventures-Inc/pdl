/**
 * Triage helper: which `.pdl` files in a directory fail to load?
 *
 *   node scripts/find-parse-fail.mjs [dir]   # default test-fixtures/pdl/atoms
 *
 * Each file goes through the Rust compiler (`pdl catalogue`), so this reports parse,
 * merge, validate and token-map failures — the first diagnostic per file.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = resolve(REPO_ROOT, process.argv[2] ?? "test-fixtures/pdl/atoms");

const bin = ["target/release/pdl", "target/debug/pdl"]
  .map((rel) => join(REPO_ROOT, rel))
  .find(existsSync);
const cmd = bin ?? "cargo";
const leading = bin ? [] : ["run", "-q", "-p", "pdl-cli", "--"];

let failed = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith(".pdl"))) {
  const r = spawnSync(cmd, [...leading, "catalogue", join(dir, f)], {
    encoding: "utf8",
    cwd: REPO_ROOT,
  });
  if (r.status !== 0) {
    failed += 1;
    console.log(`${f}: ${(r.stderr || r.stdout).trim().split("\n")[0]}`);
  }
}
console.log(`${failed} of ${readdirSync(dir).filter((x) => x.endsWith(".pdl")).length} failed`);
