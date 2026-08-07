/**
 * Local PDL preview server — imports compiled toolchain from repo `dist/`.
 * Bake uses shared scripts/lib/bake-pipeline.mjs (Rust default; same IR as `npm run preview`).
 */
import { createServer } from "node:http";
import {
  readFileSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { bakeAndRender, resolveRepoPath, rustPdlArgs } from "../../scripts/lib/bake-pipeline.mjs";

/** Known packs for PDL Playground. */
const PACK_CATALOG = [
  {
    id: "airbnb-lite",
    label: "Airbnb-lite",
    entry: "test-fixtures/pdl/systems/airbnb-lite/design.pdl",
    defaultComponent: "AbnPointerLab",
    description: "Flagship veracity pack — coral/teal, Cancel/Save scoping demo",
  },
  {
    id: "molecules",
    label: "Molecules (fixtures)",
    entry: "test-fixtures/pdl/molecules/design.pdl",
    defaultComponent: "MoleculeButtonRowDemo",
    description: "Buttons, cards, forms — multi-instance demos",
  },
  {
    id: "integration",
    label: "Integration",
    entry: "test-fixtures/pdl/integration/design.pdl",
    defaultComponent: "MoleculeButtonRowDemo",
    description: "Atoms + molecules + merge chain",
  },
  {
    id: "protocols",
    label: "Protocols",
    entry: "test-fixtures/pdl/protocols/design.pdl",
    defaultComponent: "LibrarySubnav",
    description: "Protocols, slots, emits + ForEach on select (Rust)",
  },
  {
    id: "atoms",
    label: "Atoms",
    entry: "test-fixtures/pdl/atoms/design.pdl",
    defaultComponent: "AtomTextPlain",
    description: "Token / typeStyle language surfaces",
  },
];

function collectPdlFiles(dirAbs, repoRoot, out = {}) {
  if (!existsSync(dirAbs)) return out;
  for (const name of readdirSync(dirAbs)) {
    if (name.startsWith(".")) continue;
    const abs = join(dirAbs, name);
    const st = statSync(abs);
    if (st.isDirectory()) {
      if (name === "errors" || name === "packs" || name === "node_modules") continue;
      collectPdlFiles(abs, repoRoot, out);
    } else if (extname(name) === ".pdl") {
      const rel = relative(repoRoot, abs).replace(/\\/g, "/");
      out[rel] = readFileSync(abs, "utf8");
    }
  }
  return out;
}

function handleCatalog() {
  return { ok: true, packs: PACK_CATALOG };
}

function handleOpenPack(packId) {
  const pack = PACK_CATALOG.find((p) => p.id === packId);
  if (!pack) throw new Error(`Unknown pack: ${packId}`);
  const entryAbs = resolveRepoPath(REPO_ROOT, pack.entry);
  assertUnderRepo(entryAbs);
  const packDir = dirname(entryAbs);
  const files = collectPdlFiles(packDir, REPO_ROOT);
  if (Object.keys(files).length === 0) {
    throw new Error(`No .pdl files under ${relative(REPO_ROOT, packDir)}`);
  }
  return {
    ok: true,
    pack,
    entry: pack.entry,
    defaultComponent: pack.defaultComponent,
    files,
  };
}

function handleWriteFile(body) {
  const { path: rel, content } = body;
  if (typeof rel !== "string" || !rel.trim()) throw new Error('Expected "path"');
  if (typeof content !== "string") throw new Error('Expected "content" string');
  const abs = resolveRepoPath(REPO_ROOT, rel);
  assertUnderRepo(abs);
  const underFixtures = relative(REPO_ROOT, abs).replace(/\\/g, "/").startsWith("test-fixtures/pdl/");
  if (!underFixtures) {
    throw new Error("Playground writes are limited to test-fixtures/pdl/");
  }
  if (extname(abs) !== ".pdl") throw new Error("Only .pdl files can be written");
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, "utf8");
  return { ok: true, path: relative(REPO_ROOT, abs).replace(/\\/g, "/") };
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");
const DIST = join(REPO_ROOT, "dist");
const STATIC_DIR = resolve(__dirname, "..", "static");
const MAX_BODY_BYTES = 12 * 1024 * 1024;
const HOST = "127.0.0.1";
const DEFAULT_FIRST_PORT = 3847;
const PORT_FALLBACK_SPAN = 10; // try DEFAULT_FIRST_PORT .. +9 when PLAYGROUND_PORT is unset
const envPort = process.env.PLAYGROUND_PORT;
const strictPort = envPort !== undefined && envPort !== "";

function loadToolchain() {
  const loadDesignPath = join(DIST, "loadDesign.js");
  if (!existsSync(loadDesignPath)) {
    console.error(
      `Missing ${loadDesignPath}. Run "npm run build" from the repository root first.`,
    );
    process.exit(1);
  }
  return import(pathToFileURL(loadDesignPath).href);
}

const toolchainPromise = loadToolchain().then(async (m) => {
  const bake = await import(pathToFileURL(join(DIST, "bakeDesign.js")).href);
  const render = await import(pathToFileURL(join(DIST, "renderHtml.js")).href);
  const graph = await import(pathToFileURL(join(DIST, "graph.js")).href);
  const evaluate = await import(pathToFileURL(join(DIST, "evaluate.js")).href);
  return {
    loadDesign: m.loadDesign,
    ...bake,
    ...render,
    serialiseValueExpr: graph.serialiseValueExpr,
    evaluateValue: evaluate.evaluateValue,
    buildResolvedTokenMap: evaluate.buildResolvedTokenMap,
  };
});

/** Reject paths that escape the temp workspace. */
function assertSafeRelativePath(rel) {
  if (typeof rel !== "string" || rel.length === 0) {
    throw new Error("Each file key must be a non-empty relative path");
  }
  const norm = rel.replace(/\\/g, "/");
  if (norm.startsWith("/") || /^[A-Za-z]:/.test(norm)) {
    throw new Error(`Absolute paths are not allowed: ${rel}`);
  }
  const segments = norm.split("/");
  if (segments.some((s) => s === "..")) {
    throw new Error(`Path traversal is not allowed: ${rel}`);
  }
}

function writeWorkspace(tmp, files) {
  if (!files || typeof files !== "object") {
    throw new Error("Expected JSON body with a \"files\" object (path → UTF-8 source)");
  }
  const entries = Object.entries(files);
  if (entries.length === 0) {
    throw new Error("Expected at least one file in \"files\"");
  }
  for (const [rel] of entries) {
    assertSafeRelativePath(rel);
  }
  for (const [rel, content] of entries) {
    if (typeof content !== "string") {
      throw new Error(`File "${rel}" must be a string (UTF-8 source)`);
    }
    const dest = resolve(tmp, rel);
    const relToTmp = relative(tmp, dest);
    if (relToTmp.startsWith("..") || relToTmp === "") {
      throw new Error(`Invalid destination for "${rel}"`);
    }
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, content, "utf-8");
  }
}

function readJsonBody(req) {
  return new Promise((resolvePromise, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (buf) => {
      total += buf.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error(`Body too large (max ${MAX_BODY_BYTES} bytes)`));
        req.destroy();
        return;
      }
      chunks.push(buf);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf-8");
        if (!raw.trim()) {
          reject(new Error("Empty body"));
          return;
        }
        resolvePromise(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function designMeta(design) {
  const components = [...design.components.keys()].sort();
  const themes = [...design.themes.keys()].sort();
  return { components, themes };
}

/**
 * Evaluated fixtures + param schemas for Playground controls.
 * @param {unknown} design
 * @param {(e: unknown, ctx: object) => unknown} evaluateValue
 * @param {Map<string, unknown>} tokenMap
 */
function buildFixturesAndParams(design, evaluateValue, tokenMap) {
  /** @type {Record<string, Record<string, Record<string, unknown>>>} */
  const fixturesByComponent = {};
  for (const [compName, fxMap] of design.fixtures.entries()) {
    /** @type {Record<string, Record<string, unknown>>} */
    const examples = {};
    for (const [label, ex] of fxMap.entries()) {
      /** @type {Record<string, unknown>} */
      const params = {};
      for (const b of ex.bindings) {
        params[b.name] = evaluateValue(b.value, {
          design,
          tokens: tokenMap,
          visiting: new Set(),
          paramValues: {},
          paramMeta: new Map(),
        });
      }
      examples[label] = params;
    }
    fixturesByComponent[compName] = examples;
  }

  /** @type {Record<string, Array<{ name: string; typeName: string; default: unknown }>>} */
  const componentParams = {};
  /** @type {Record<string, string[]>} */
  const variantCases = {};
  for (const [vName, v] of design.variants.entries()) {
    variantCases[vName] = [...v.cases];
  }
  for (const [compName, c] of design.components.entries()) {
    componentParams[compName] = (c.params ?? []).map((p) => ({
      name: p.name,
      typeName: p.typeName,
      default: evaluateValue(p.defaultValue, {
        design,
        tokens: tokenMap,
        visiting: new Set(),
        paramValues: {},
        paramMeta: new Map(),
      }),
    }));
  }
  return { fixturesByComponent, componentParams, variantCases };
}

/**
 * JSON-friendly view of primitives, semantics, themes, variants, type styles (for playground UI).
 * @param {unknown} design - DesignDefinition from loadDesign
 * @param {(e: unknown) => unknown} serialiseValueExpr
 * @param {string} workspaceRoot
 */
function buildDesignSummary(design, serialiseValueExpr, workspaceRoot) {
  const relModule = (p) => {
    try {
      const r = relative(workspaceRoot, p);
      if (r && !r.startsWith("..") && r !== "") return r.replace(/\\/g, "/");
    } catch {
      /* ignore */
    }
    return String(p).replace(/\\/g, "/");
  };

  const primitives = [...design.primitives.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, p]) => ({
      name,
      tokenType: p.tokenType,
      value: serialiseValueExpr(p.value),
    }));

  const semantics = [...design.semantics.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, s]) => ({
      name,
      tokenType: s.tokenType,
      value: serialiseValueExpr(s.value),
    }));

  const themeDefinitions = [...design.themes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, t]) => ({
      name,
      baseTheme: t.baseTheme ?? null,
      overrides: Object.fromEntries(
        Object.entries(t.overrides)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => [k, serialiseValueExpr(v)]),
      ),
    }));

  const variants = [...design.variants.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, v]) => ({
      name,
      cases: [...v.cases],
    }));

  const typeStyles = [...design.typeStyles.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, ts]) => ({
      name,
      props: Object.fromEntries(
        Object.entries(ts.props)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => [k, serialiseValueExpr(v)]),
      ),
    }));

  return {
    previewBackground: design.previewBackground ?? null,
    modulePaths: design.modulePaths.map(relModule),
    primitives,
    semantics,
    themeDefinitions,
    variants,
    typeStyles,
  };
}

function enrichLoadPayload(design, serialiseValueExpr, evaluateValue, buildResolvedTokenMap, workspaceRoot) {
  const tokenMap = buildResolvedTokenMap(design);
  const designSummary = buildDesignSummary(design, serialiseValueExpr, workspaceRoot);
  const controls = buildFixturesAndParams(design, evaluateValue, tokenMap);
  /** @type {Record<string, unknown>} */
  const interactionsByComponent = {};
  for (const [compName, imap] of design.interactions.entries()) {
    const list = [];
    for (const [, decl] of imap.entries()) {
      list.push({
        name: decl.name,
        handlers: (decl.handlers ?? []).map((h) => ({
          event: h.event,
          body: h.body,
        })),
      });
    }
    if (list.length) interactionsByComponent[compName] = list;
  }
  return {
    ok: true,
    ...designMeta(design),
    designSummary,
    ...controls,
    interactionsByComponent,
  };
}

function formatErr(err) {
  if (err && typeof err.format === "function") {
    return err.format();
  }
  return err instanceof Error ? err.message : String(err);
}

/**
 * Enrich payload from Rust `pdl catalogue` when TS loadDesign cannot parse
 * Rust-first syntax (protocols, trailing interaction, …).
 * @param {string} entryAbs
 */
function enrichFromRustCatalogue(entryAbs) {
  const outPath = join(REPO_ROOT, ".tmp", "playground.catalogue.json");
  mkdirSync(dirname(outPath), { recursive: true });
  const bin = rustPdlArgs(REPO_ROOT);
  /** @type {string[]} */
  const args =
    bin.length === 1
      ? ["catalogue", entryAbs, "--out", outPath]
      : [...bin.slice(1), "catalogue", entryAbs, "--out", outPath];
  const cmd = bin[0];
  const r = spawnSync(cmd, args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (r.status !== 0) {
    const detail = ((r.stderr || "") + (r.stdout || "")).trim();
    throw new Error(detail || `Rust catalogue failed (exit ${r.status})`);
  }
  const cat = JSON.parse(readFileSync(outPath, "utf8"));
  const components = Object.keys(cat.components ?? {}).sort();
  /** @type {Record<string, string[]>} */
  const variantCases = {};
  for (const [name, v] of Object.entries(cat.variantTypes ?? {})) {
    variantCases[name] = Array.isArray(v?.cases) ? [...v.cases] : [];
  }
  /** @type {Record<string, Array<{ name: string; typeName: string; default: unknown }>>} */
  const componentParams = {};
  /** @type {Record<string, unknown>} */
  const interactionsByComponent = {};
  /** @type {Record<string, unknown>} */
  const emitCapturesByComponent = {};
  for (const [name, c] of Object.entries(cat.components ?? {})) {
    componentParams[name] = (c.params ?? []).map((p) => {
      const typeName =
        (typeof p.variantTypeName === "string" && p.variantTypeName) ||
        (typeof p.type === "string" ? p.type : "String");
      return {
        name: p.name,
        typeName,
        default: c.defaultParams?.[p.name] ?? p.default ?? null,
      };
    });
    if (Array.isArray(c.interactions) && c.interactions.length) {
      interactionsByComponent[name] = c.interactions;
    }
    if (Array.isArray(c.emitCaptures) && c.emitCaptures.length) {
      emitCapturesByComponent[name] = c.emitCaptures;
    }
  }
  return {
    ok: true,
    components,
    themes: [],
    designSummary: {
      previewBackground: null,
      modulePaths: [entryAbs],
      primitives: [],
      semantics: [],
      themeDefinitions: [],
      variants: Object.entries(variantCases).map(([name, cases]) => ({ name, cases })),
      typeStyles: [],
    },
    fixturesByComponent: {},
    componentParams,
    variantCases,
    interactionsByComponent,
    emitCapturesByComponent,
    loader: "rust-catalogue",
  };
}

/**
 * Prefer TS loadDesign (fixtures / design summary); fall back to Rust catalogue
 * for packs that use Rust-first grammar.
 * @param {string} entryAbs
 * @param {string} summaryRoot
 */
async function enrichDesignAt(entryAbs, summaryRoot) {
  const { loadDesign, serialiseValueExpr, evaluateValue, buildResolvedTokenMap } =
    await toolchainPromise;
  try {
    const design = loadDesign(entryAbs);
    return enrichLoadPayload(
      design,
      serialiseValueExpr,
      evaluateValue,
      buildResolvedTokenMap,
      summaryRoot,
    );
  } catch (err) {
    try {
      return enrichFromRustCatalogue(entryAbs);
    } catch (rustErr) {
      const tsMsg = formatErr(err);
      const rustMsg = formatErr(rustErr);
      throw new Error(`${tsMsg}\n(Rust catalogue also failed: ${rustMsg})`);
    }
  }
}

async function handleLoad(body) {
  const { files, entry, diskRoot } = body;
  if (typeof entry !== "string" || !entry.trim()) {
    throw new Error('Expected "entry" path');
  }

  if (diskRoot === true) {
    const entryAbs = resolveRepoPath(REPO_ROOT, entry);
    assertUnderRepo(entryAbs);
    return enrichDesignAt(entryAbs, dirname(entryAbs));
  }

  assertSafeRelativePath(entry);
  const tmp = mkdtempSync(join(tmpdir(), "pdl-playground-"));
  try {
    writeWorkspace(tmp, files);
    const entryAbs = resolve(tmp, entry);
    if (relative(tmp, entryAbs).startsWith("..")) {
      throw new Error("Invalid entry path");
    }
    return enrichDesignAt(entryAbs, tmp);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/**
 * Ensure a path stays under the repo (disk-root mode).
 * @param {string} abs
 */
function assertUnderRepo(abs) {
  const rel = relative(REPO_ROOT, abs);
  if (rel.startsWith("..") || rel === "") {
    throw new Error(`Path must be inside the repository: ${abs}`);
  }
}

/**
 * @param {Record<string, unknown>} enriched
 * @param {string[]} names
 * @param {Record<string, Record<string, unknown>>} [kvByComponent]
 *   Per-component scalar overrides. A single shared bag must not be applied to
 *   every gallery section (that leaked LibrarySubnav.currentFilter onto FilterChip).
 */
function buildParamControlsByComponent(enriched, names, kvByComponent) {
  /** @type {Record<string, Array<{ name: string; typeName: string; value: string; cases?: string[] }>>} */
  const out = {};
  const byComp =
    kvByComponent && typeof kvByComponent === "object" && !Array.isArray(kvByComponent)
      ? kvByComponent
      : {};
  for (const name of names) {
    const params = enriched.componentParams?.[name] ?? [];
    const kv =
      byComp[name] && typeof byComp[name] === "object" && !Array.isArray(byComp[name])
        ? /** @type {Record<string, unknown>} */ (byComp[name])
        : {};
    /** @type {Array<{ name: string; typeName: string; value: string; cases?: string[] }>} */
    const controls = [];
    for (const p of params) {
      if (!p?.name || p.name === "interactionState") continue;
      const typeName = typeof p.typeName === "string" ? p.typeName : "";
      if (!typeName || typeName === "object") continue;
      const cases =
        typeName === "Boolean" || typeName === "Bool"
          ? ["true", "false"]
          : enriched.variantCases?.[typeName];
      const raw = kv[p.name] !== undefined ? kv[p.name] : p.default;
      if (raw !== null && typeof raw === "object") continue;
      // Skip instance-list params that enrichment stringified as JSON (e.g. chips).
      if (typeof raw === "string") {
        const t = raw.trim();
        if (t.startsWith("[") || t.startsWith("{")) {
          try {
            const parsed = JSON.parse(t);
            if (parsed !== null && typeof parsed === "object") continue;
          } catch {
            /* keep as plain string control */
          }
        }
      }
      controls.push({
        name: p.name,
        typeName,
        value: raw == null ? "" : String(raw),
        cases: cases?.length ? [...cases] : undefined,
      });
    }
    if (controls.length) out[name] = controls;
  }
  return out;
}


/**
 * Walk baked frames in render order; collect mounted instances that declare interactionState.
 * @param {unknown} frame
 * @param {Array<{ component: string, kwargs: Record<string, unknown> }>} out
 */
function collectMountedInstances(frame, out) {
  if (!frame || typeof frame !== "object") return;
  const f = /** @type {{ instanceOf?: string, instanceKwargs?: Record<string, unknown>, children?: unknown[] }} */ (
    frame
  );
  if (typeof f.instanceOf === "string" && f.instanceOf) {
    out.push({
      component: f.instanceOf,
      kwargs:
        f.instanceKwargs && typeof f.instanceKwargs === "object" && !Array.isArray(f.instanceKwargs)
          ? { ...f.instanceKwargs }
          : {},
    });
  }
  if (Array.isArray(f.children)) {
    for (const ch of f.children) collectMountedInstances(ch, out);
  }
}

/**
 * Bake hovered/pressed/… trees for each nested instance (keyed i0, i1, …).
 * Needed because child interactionState is ephemeral — parent rebake always resets it to rest.
 * @param {object} args
 */
async function bakeInstanceInteractionStates({
  baked,
  previewNames,
  enriched,
  entryAbs,
  engine,
  theme,
}) {
  /** @type {Record<string, Record<string, unknown>>} */
  const instanceStateTrees = {};
  if (!baked?.components) return instanceStateTrees;

  /** @type {Array<{ component: string, kwargs: Record<string, unknown> }>} */
  const instances = [];
  for (const name of previewNames) {
    const root = baked.components[name]?.root;
    if (root) collectMountedInstances(root, instances);
  }

  let idx = 0;
  for (const inst of instances) {
    const key = `i${idx++}`;
    const params = enriched.componentParams?.[inst.component] ?? [];
    const stateParam = params.find((p) => p.name === "interactionState");
    if (!stateParam) continue;
    const cases = enriched.variantCases?.[stateParam.typeName] ?? [];
    const extraStates = cases.filter((c) => c && c !== "rest");
    if (!extraStates.length) continue;

    /** @type {Record<string, unknown>} */
    const trees = {};
    // Drop interactionState from kwargs so the override wins cleanly.
    const { interactionState: _ignore, ...baseKw } = inst.kwargs;
    for (const stateName of extraStates) {
      const outPath = join(
        REPO_ROOT,
        ".tmp",
        `playground-inst-${inst.component}-${key}-${stateName}.bake.json`,
      );
      const stateBake = await bakeAndRender({
        repoRoot: REPO_ROOT,
        entry: entryAbs,
        engine,
        mode: "component",
        component: inst.component,
        theme: typeof theme === "string" ? theme : undefined,
        paramOverrides: { ...baseKw, interactionState: stateName },
        bakeOutPath: outPath,
        title: `${inst.component}-${stateName}`,
        singleComponent: inst.component,
        interactiveHost: false,
      });
      if (stateBake.ok && stateBake.baked) {
        const tree =
          /** @type {{ components?: Record<string, unknown> }} */ (stateBake.baked).components?.[
            inst.component
          ];
        if (tree) trees[stateName] = tree;
      }
    }
    if (Object.keys(trees).length) instanceStateTrees[key] = trees;
  }
  return instanceStateTrees;
}

async function handleRender(body) {
  const {
    files,
    entry,
    mode: modeRaw,
    component,
    theme,
    kv,
    pack,
    engine: engineRaw,
    diskRoot,
    componentNames: namesRaw,
    variantMatrix,
    interactiveHost: interactiveRaw,
  } = body;
  const mode = modeRaw === "component" || modeRaw === "pack" ? modeRaw : "system";
  if (typeof entry !== "string" || !entry.trim()) {
    throw new Error('Expected "entry" path');
  }
  /** @type {'rust' | 'ts'} */
  const engine = engineRaw === "ts" ? "ts" : "rust";
  if (mode === "component") {
    if (typeof component !== "string" || !component.trim()) {
      throw new Error('In "component" mode, expected non-empty "component" name');
    }
  }
  if (mode === "pack") {
    if (typeof pack !== "string" || !pack.trim()) {
      throw new Error('In "pack" mode, expected non-empty "pack" path');
    }
    if (engine !== "rust") {
      throw new Error('Pack mode requires engine "rust"');
    }
  }
  const kvObj =
    kv && typeof kv === "object" && !Array.isArray(kv)
      ? /** @type {Record<string, unknown>} */ (kv)
      : {};
  /** @type {string[] | undefined} */
  const componentNames = Array.isArray(namesRaw)
    ? namesRaw.map(String).filter(Boolean)
    : undefined;
  const wantInteractive = interactiveRaw !== false;

  const useDisk = diskRoot === true;
  /** @type {string | undefined} */
  let tmp;
  try {
    /** @type {string} */
    let entryAbs;
    /** @type {string | undefined} */
    let packAbs;
    /** @type {string} */
    let summaryRoot;

    if (useDisk) {
      entryAbs = resolveRepoPath(REPO_ROOT, entry);
      assertUnderRepo(entryAbs);
      if (mode === "pack") {
        packAbs = resolveRepoPath(REPO_ROOT, pack);
        assertUnderRepo(packAbs);
      }
      summaryRoot = dirname(entryAbs);
    } else {
      if (!files || typeof files !== "object") {
        throw new Error('Expected JSON body with a "files" object (or diskRoot: true)');
      }
      assertSafeRelativePath(entry);
      if (mode === "pack") assertSafeRelativePath(pack);
      tmp = mkdtempSync(join(tmpdir(), "pdl-playground-"));
      writeWorkspace(tmp, files);
      entryAbs = resolve(tmp, entry);
      if (mode === "pack") packAbs = resolve(tmp, pack);
      summaryRoot = tmp;
    }

    // TS loadDesign for fixtures/summary; Rust catalogue when grammar is Rust-first (protocol, …).
    const enriched = await enrichDesignAt(entryAbs, summaryRoot);
    const bakeOutPath = join(REPO_ROOT, ".tmp", "playground.bake.json");

    // Phase 5: variant matrix — bake each combo as a labeled gallery entry
    if (variantMatrix === true && typeof component === "string" && component.trim()) {
      const params = enriched.componentParams?.[component] ?? [];
      const axes = [];
      for (const p of params) {
        const cases = enriched.variantCases?.[p.typeName];
        if (cases?.length) axes.push({ name: p.name, cases: [...cases] });
      }
      /** @type {Array<{ labels: Record<string, string>, kv: Record<string, string> }>} */
      let combos = [{ labels: {}, kv: {} }];
      for (const axis of axes) {
        /** @type {typeof combos} */
        const next = [];
        for (const prev of combos) {
          for (const c of axis.cases) {
            next.push({
              labels: { ...prev.labels, [axis.name]: c },
              kv: { ...prev.kv, [axis.name]: c },
            });
            if (next.length >= 16) break;
          }
          if (next.length >= 16) break;
        }
        combos = next;
        if (combos.length >= 16) break;
      }
      /** @type {Record<string, unknown>} */
      const mergedComponents = {};
      let lastEngine = engine;
      let duration = 0;
      for (const combo of combos) {
        const label =
          Object.keys(combo.labels).length === 0
            ? component
            : `${component} · ${Object.entries(combo.labels)
                .map(([k, v]) => `${k}=.${v}`)
                .join(", ")}`;
        const outPath = join(REPO_ROOT, ".tmp", `playground-var-${Object.keys(mergedComponents).length}.bake.json`);
        const result = await bakeAndRender({
          repoRoot: REPO_ROOT,
          entry: entryAbs,
          engine,
          mode: "component",
          component,
          theme: typeof theme === "string" ? theme : undefined,
          paramOverrides: { ...kvObj, ...combo.kv },
          bakeOutPath: outPath,
          title: "PDL Playground · variants",
          singleComponent: component,
        });
        duration += result.durationMs ?? 0;
        lastEngine = result.engine;
        if (!result.ok) {
          return {
            ok: false,
            error: result.error ?? `Variant bake failed for ${label}`,
            engine: result.engine,
            durationMs: duration,
          };
        }
        const baked = /** @type {{ components?: Record<string, unknown> }} */ (result.baked);
        const tree = baked?.components?.[component];
        if (tree) mergedComponents[label] = tree;
      }
      const synthetic = {
        schemaVersion: "1.0.0-beta",
        generatedAt: "1970-01-01T00:00:00.000Z",
        provenance: {
          entryPath: entryAbs,
          bakedTheme: theme ?? null,
          bakeProfile: "variant-matrix",
        },
        components: mergedComponents,
      };
      const { renderBakedDesignToHtmlDocumentWithReport } = await toolchainPromise;
      const { html, renderFailures } = renderBakedDesignToHtmlDocumentWithReport(synthetic, {
        title: `Variants — ${component}`,
        componentNames: Object.keys(mergedComponents),
      });
      return {
        ...enriched,
        html,
        renderFailures,
        engine: lastEngine,
        durationMs: duration,
        variantCount: Object.keys(mergedComponents).length,
      };
    }

    /** @type {Record<string, Record<string, unknown>> | undefined} */
    let componentOverrides;
    if (body.componentOverrides && typeof body.componentOverrides === "object") {
      componentOverrides = /** @type {Record<string, Record<string, unknown>>} */ (
        body.componentOverrides
      );
    } else if (
      mode === "system" &&
      typeof component === "string" &&
      component.trim() &&
      Object.keys(kvObj).length > 0
    ) {
      componentOverrides = { [component]: kvObj };
    } else if (
      mode === "component" &&
      typeof component === "string" &&
      Object.keys(kvObj).length > 0
    ) {
      componentOverrides = { [component]: kvObj };
    }

    const componentParamOverrides =
      mode === "component" && typeof component === "string"
        ? componentOverrides?.[component] ?? kvObj
        : {};

    const result = await bakeAndRender({
      repoRoot: REPO_ROOT,
      entry: entryAbs,
      engine,
      mode,
      component: typeof component === "string" ? component : undefined,
      pack: packAbs,
      theme: typeof theme === "string" ? theme : undefined,
      paramOverrides: componentParamOverrides,
      bakeOutPath,
      title: "PDL Playground preview",
      singleComponent:
        mode === "component" && typeof component === "string"
          ? component
          : typeof body.singleComponent === "string"
            ? body.singleComponent
            : undefined,
      componentNames,
      interactiveHost: wantInteractive && mode !== "pack",
      interactionsByComponent: enriched.interactionsByComponent,
      componentOverrides: mode === "system" ? componentOverrides : undefined,
    });
    if (!result.ok) {
      return {
        ok: false,
        error: result.error ?? "Bake failed",
        engine: result.engine,
        durationMs: result.durationMs,
      };
    }

    const previewNames =
      componentNames?.length > 0
        ? componentNames
        : mode === "component" && component
          ? [component]
          : Object.keys(/** @type {{ components: object }} */ (result.baked)?.components ?? {});

    const paramControlsByComponent = buildParamControlsByComponent(
      enriched,
      previewNames,
      componentOverrides ?? {},
    );

    // Phase 4: bake non-rest interactionState trees (hovered, pressed, …) for host swaps
    /** @type {Record<string, Record<string, unknown>>} */
    const stateTrees = {};
    if (wantInteractive && result.baked && mode !== "pack") {
      for (const name of previewNames) {
        const params = enriched.componentParams?.[name] ?? [];
        const stateParam = params.find((p) => p.name === "interactionState");
        if (!stateParam) continue;
        const cases = enriched.variantCases?.[stateParam.typeName] ?? [];
        const extraStates = cases.filter((c) => c && c !== "rest");
        if (!extraStates.length) continue;
        const baseOv =
          componentOverrides?.[name] && typeof componentOverrides[name] === "object"
            ? componentOverrides[name]
            : /** @type {Record<string, unknown>} */ ({});
        /** @type {Record<string, unknown>} */
        const treesForComp = {};
        for (const stateName of extraStates) {
          const outPath = join(
            REPO_ROOT,
            ".tmp",
            `playground-state-${name}-${stateName}.bake.json`,
          );
          const stateBake = await bakeAndRender({
            repoRoot: REPO_ROOT,
            entry: entryAbs,
            engine,
            mode: "component",
            component: name,
            theme: typeof theme === "string" ? theme : undefined,
            paramOverrides: { ...baseOv, interactionState: stateName },
            bakeOutPath: outPath,
            title: stateName,
            singleComponent: name,
            interactiveHost: false,
          });
          if (stateBake.ok && stateBake.baked) {
            const tree =
              /** @type {{ components?: Record<string, unknown> }} */ (stateBake.baked)
                .components?.[name];
            if (tree) treesForComp[stateName] = tree;
          }
        }
        if (Object.keys(treesForComp).length) stateTrees[name] = treesForComp;
      }
    }

    const instanceStateTrees =
      wantInteractive && result.baked && mode !== "pack"
        ? await bakeInstanceInteractionStates({
            baked: result.baked,
            previewNames,
            enriched,
            entryAbs,
            engine,
            theme,
          })
        : {};

    let html = result.html;
    {
      const { renderBakedDesignToHtmlDocumentWithReport } = await toolchainPromise;
      const componentSourcesByComponent =
        body.componentSources && typeof body.componentSources === "object"
          ? body.componentSources
          : undefined;
      const rerender = renderBakedDesignToHtmlDocumentWithReport(result.baked, {
        title: "PDL Playground preview",
        componentNames,
        singleComponent:
          mode === "component" && typeof component === "string" ? component : undefined,
        interactiveHost: wantInteractive && mode !== "pack",
        interactionsByComponent: enriched.interactionsByComponent,
        emitCapturesByComponent: enriched.emitCapturesByComponent,
        stateTrees: Object.keys(stateTrees).length ? stateTrees : undefined,
        instanceStateTrees:
          Object.keys(instanceStateTrees).length > 0 ? instanceStateTrees : undefined,
        paramControlsByComponent,
        componentSourcesByComponent,
      });
      html = rerender.html;
      return {
        ...enriched,
        html,
        renderFailures: rerender.renderFailures?.length
          ? rerender.renderFailures
          : result.renderFailures,
        engine: result.engine,
        durationMs: result.durationMs,
      };
    }
  } finally {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
  }
}

async function handleRenderFromBake(body) {
  const bake = body?.bake;
  if (!bake || typeof bake !== "object") {
    throw new Error('Expected "bake" object (bakedDesign JSON)');
  }
  const { renderBakedDesignToHtmlDocumentWithReport } = await toolchainPromise;
  const component =
    typeof body.component === "string" && body.component.trim()
      ? body.component.trim()
      : undefined;
  const { html, renderFailures } = renderBakedDesignToHtmlDocumentWithReport(bake, {
    title: "PDL Playground preview (WASM bake)",
    singleComponent: component,
  });
  return {
    ok: true,
    html,
    renderFailures,
    engine: "wasm",
  };
}

function serveStatic(pathname, res) {
  const safe = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  const filePath = resolve(STATIC_DIR, safe);
  const rel = relative(STATIC_DIR, filePath);
  if (rel.startsWith("..") || rel === "") {
    res.writeHead(400);
    res.end("Bad path");
    return;
  }
  try {
    const buf = readFileSync(filePath);
    const ext = safe.split(".").pop();
    const ct =
      ext === "html"
        ? "text/html; charset=utf-8"
        : ext === "js"
          ? "text/javascript; charset=utf-8"
          : ext === "css"
            ? "text/css; charset=utf-8"
            : ext === "wasm"
              ? "application/wasm"
              : "application/octet-stream";
    res.writeHead(200, { "Content-Type": ct, "Cache-Control": "no-store" });
    res.end(buf);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const pathname = url.pathname;

  if (req.method === "GET" && pathname === "/api/catalog") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(handleCatalog()));
    return;
  }

  if (req.method === "GET") {
    serveStatic(pathname, res);
    return;
  }

  if (req.method === "POST" && pathname === "/api/open-pack") {
    try {
      const body = await readJsonBody(req);
      const out = handleOpenPack(body.packId ?? body.id);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(out));
    } catch (e) {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: formatErr(e) }));
    }
    return;
  }

  if (req.method === "POST" && pathname === "/api/write") {
    try {
      const body = await readJsonBody(req);
      const out = handleWriteFile(body);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(out));
    } catch (e) {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: formatErr(e) }));
    }
    return;
  }

  if (req.method === "POST" && pathname === "/api/load") {
    try {
      const body = await readJsonBody(req);
      const out = await handleLoad(body);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(out));
    } catch (e) {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: formatErr(e) }));
    }
    return;
  }

  if (req.method === "POST" && pathname === "/api/render") {
    try {
      const body = await readJsonBody(req);
      const out = await handleRender(body);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(out));
    } catch (e) {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: formatErr(e) }));
    }
    return;
  }

  if (req.method === "POST" && pathname === "/api/render-from-bake") {
    try {
      const body = await readJsonBody(req);
      const out = await handleRenderFromBake(body);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(out));
    } catch (e) {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: formatErr(e) }));
    }
    return;
  }

  res.writeHead(404);
  res.end();
});

function portHint(busyPort) {
  return `Port ${busyPort} is already in use (another playground or app). Either stop it, e.g. \`lsof -iTCP:${busyPort} -sTCP:LISTEN\`, or pick another port: PLAYGROUND_PORT=3848 npm run playground`;
}

function listenPlayground() {
  const first = strictPort ? Number(envPort) : DEFAULT_FIRST_PORT;
  if (!Number.isInteger(first) || first < 1 || first > 65535) {
    console.error(`Invalid PLAYGROUND_PORT: ${envPort}`);
    process.exit(1);
  }
  const maxTries = strictPort ? 1 : PORT_FALLBACK_SPAN;
  let attempt = 0;

  server.on("error", (err) => {
    if (err.code !== "EADDRINUSE") {
      console.error(err);
      process.exit(1);
    }
    attempt += 1;
    if (attempt >= maxTries) {
      console.error(portHint(first + attempt - 1));
      process.exit(1);
    }
    const next = first + attempt;
    if (!strictPort) {
      console.error(`Port ${first + attempt - 1} busy, trying ${next}…`);
    }
    server.listen(next, HOST);
  });

  server.listen(first, HOST, () => {
    const bound = /** @type {import("node:net").AddressInfo} */ (server.address());
    const p = bound?.port ?? first;
    console.log(`PDL Playground at http://${HOST}:${p}`);
    console.log(`  Phase P5 · file canvas · interactive host · variant grid`);
    if (!strictPort && p !== DEFAULT_FIRST_PORT) {
      console.error(`(Using ${p} because ${DEFAULT_FIRST_PORT} was busy.)`);
    }
  });
}

listenPlayground();
