/**
 * Host-test fixtures from the Rust compiler.
 *
 * The host (renderHtml, applyMotion, bakeReconcile, evaluateRules) consumes JSON that
 * only Rust produces, so tests ask the `pdl` CLI for it instead of parsing PDL in
 * TypeScript. Results are memoised per argv, which keeps a suite that wants the same
 * bake a dozen times to one spawn.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** In a happy-dom suite `import.meta.url` is an http URL, so fall back to the cwd. */
function findRepoRoot(): string {
  try {
    return resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
  } catch {
    return process.cwd();
  }
}

const repoRoot = findRepoRoot();

/** Absolute path to a repo-relative fixture, e.g. `fx("lab/motion/design.pdl")`. */
export const fx = (...p: string[]) => resolve(repoRoot, "test-fixtures/pdl", ...p);

/** Release wins over debug when both exist, matching how the playground picks. */
function pdlCommand(): { cmd: string; leading: string[] } {
  for (const rel of ["target/release/pdl", "target/debug/pdl"]) {
    const abs = resolve(repoRoot, rel);
    if (existsSync(abs)) return { cmd: abs, leading: [] };
  }
  return { cmd: "cargo", leading: ["run", "-q", "-p", "pdl-cli", "--"] };
}

const cache = new Map<string, unknown>();

function run<T>(args: string[]): T {
  const key = args.join("\u0000");
  if (cache.has(key)) return cache.get(key) as T;
  const { cmd, leading } = pdlCommand();
  const r = spawnSync(cmd, [...leading, ...args], { encoding: "utf-8", cwd: repoRoot });
  if (r.status !== 0) {
    throw new Error(`pdl ${args.join(" ")} failed:\n${r.stderr || r.stdout}`);
  }
  const doc = JSON.parse(r.stdout) as T;
  cache.set(key, doc);
  return doc;
}

export type BakeOptions = {
  theme?: string;
  host?: string;
  hostFacts?: unknown;
  presenterPins?: unknown;
  /** `key=value` param overrides, in CLI spelling (`selected=true`). */
  params?: string[];
};

function bakeFlags(o: BakeOptions | undefined): string[] {
  const args: string[] = [];
  if (o?.theme) args.push("--theme", o.theme);
  if (o?.host) args.push("--host", o.host);
  if (o?.hostFacts !== undefined) args.push("--hostFacts", JSON.stringify(o.hostFacts));
  if (o?.presenterPins !== undefined)
    args.push("--presenterPins", JSON.stringify(o.presenterPins));
  if (o?.params?.length) args.push(...o.params);
  return args;
}

/** `pdl bakeComponent` — a `bakedDesign` document holding one component. */
export function bakeComponent<T = any>(entry: string, component: string, o?: BakeOptions): T {
  return run<T>(["bakeComponent", entry, component, ...bakeFlags(o)]);
}

/** `pdl bakeSystem` — a `bakedDesign` document holding every component. */
export function bakeSystem<T = any>(entry: string, o?: BakeOptions): T {
  return run<T>(["bakeSystem", entry, ...bakeFlags(o)]);
}

/** `pdl catalogue` — the `componentCatalogue` document. */
export function catalogue<T = any>(entry: string, o?: { theme?: string }): T {
  return run<T>(["catalogue", entry, ...(o?.theme ? ["--theme", o.theme] : [])]);
}

/** `pdl tokens` — the resolved token map as a `Map`, like the old oracle returned. */
export function tokenMap(entry: string, theme?: string): Map<string, unknown> {
  const doc = run<{ tokens?: Record<string, unknown> }>([
    "tokens",
    entry,
    ...(theme ? ["--theme", theme] : []),
  ]);
  return new Map(Object.entries(doc.tokens ?? {}));
}

/** Catalogue rows reduced to the host's `interactionsByComponent` shape. */
export function interactionsByComponent(entry: string): Record<string, unknown> {
  const cat = catalogue<{ components: Record<string, { interactions?: unknown[] }> }>(entry);
  const out: Record<string, unknown> = {};
  for (const [name, row] of Object.entries(cat.components ?? {})) {
    if (row.interactions?.length) out[name] = row.interactions;
  }
  return out;
}

/** Catalogue rows reduced to the host's `emitCapturesByComponent` shape. */
export function emitCapturesByComponent(entry: string): Record<string, unknown> {
  const cat = catalogue<{ components: Record<string, { emitCaptures?: unknown[] }> }>(entry);
  const out: Record<string, unknown> = {};
  for (const [name, row] of Object.entries(cat.components ?? {})) {
    if (row.emitCaptures?.length) out[name] = row.emitCaptures;
  }
  return out;
}

/** `pdl tokens` as the raw document (entry / module paths / preview background). */
export function tokensDocument<T = any>(entry: string, theme?: string): T {
  return run<T>(["tokens", entry, ...(theme ? ["--theme", theme] : [])]);
}
