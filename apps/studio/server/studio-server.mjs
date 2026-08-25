/**
 * PDL Studio server — project FS + catalogue enrich + bake→HTML.
 * Reuses scripts/lib/bake-pipeline.mjs and repo dist/ toolchain.
 */
import { createServer } from "node:http";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
  statSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, basename, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { bakeAndRender, resolveRepoPath, rustPdlArgs } from "../../../scripts/lib/bake-pipeline.mjs";
import { buildStarterPack } from "./starter-pack.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = resolve(__dirname, "..");
const REPO_ROOT = resolve(STUDIO_DIR, "../..");
const STATIC_DIR = resolve(STUDIO_DIR, "static");
const DIST_DIR = resolve(REPO_ROOT, "dist");

const DEFAULT_FIRST_PORT = 3857;
const PORT_FALLBACK_SPAN = 10; // try 3857..3866 when STUDIO_PORT is unset
const envPort = process.env.STUDIO_PORT;
const strictPort = envPort !== undefined && envPort !== "";
const HOST = process.env.STUDIO_HOST || "127.0.0.1";

/** Starter projects (repo-relative). */
const STARTERS = [
  {
    id: "airbnb-lite",
    label: "Airbnb-lite",
    root: "test-fixtures/pdl/systems/airbnb-lite",
    entry: "design.pdl",
    description: "Tokens, buttons, fixtures — good first project",
  },
  {
    id: "playlist-composer-lite",
    label: "Playlist Composer",
    root: "test-fixtures/pdl/systems/playlist-composer-lite",
    entry: "design.pdl",
    description: "Samples, fixtures, ForEach interaction",
  },
  {
    id: "ios26-lite",
    label: "iOS 26 lite",
    root: "test-fixtures/pdl/systems/ios26-lite",
    entry: "design.pdl",
    description: "Screens, pages, Presenter prototypes",
  },
  {
    id: "usage-rules",
    label: "Usage & rules",
    root: "test-fixtures/pdl/lab/usage-rules",
    entry: "design.pdl",
    description: "Usage notes and rule banners",
  },
];

/** @type {Promise<object>} */
let toolchainPromise = null;

function loadToolchain() {
  if (!toolchainPromise) {
    toolchainPromise = (async () => {
      const renderHtml = await import(pathToFileURL(join(DIST_DIR, "renderHtml.js")).href);
      const loadDesign = await import(pathToFileURL(join(DIST_DIR, "loadDesign.js")).href).catch(
        () => ({}),
      );
      return {
        renderBakedDesignToHtmlDocumentWithReport:
          renderHtml.renderBakedDesignToHtmlDocumentWithReport,
        loadDesign: loadDesign.loadDesign,
        serialiseValueExpr: loadDesign.serialiseValueExpr,
        evaluateValue: loadDesign.evaluateValue,
        buildResolvedTokenMap: loadDesign.buildResolvedTokenMap,
        companionPreviewFromDesign: renderHtml.companionPreviewFromDesign,
        mergeCompanionPreview: renderHtml.mergeCompanionPreview,
        interactionsByComponentFromDesign: renderHtml.interactionsByComponentFromDesign,
      };
    })();
  }
  return toolchainPromise;
}

function readJsonBody(req) {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > 12 * 1024 * 1024) {
        reject(new Error("Body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolveBody(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(data);
}

function assertSafeRelativePath(rel) {
  const s = String(rel || "").replace(/\\/g, "/");
  if (!s || s.startsWith("/") || s.includes("..")) {
    throw new Error(`Unsafe path: ${rel}`);
  }
  return s;
}

/**
 * Resolve a project root path. Creates the directory when `create` is true.
 * @param {string} root
 * @param {{ create?: boolean }} [opts]
 */
function resolveProjectRoot(root, opts = {}) {
  if (typeof root !== "string" || !root.trim()) {
    throw new Error('Expected "root" path');
  }
  const trimmed = root.trim();
  const abs = trimmed.startsWith("/") || /^[A-Za-z]:[\\/]/.test(trimmed)
    ? resolve(trimmed)
    : resolveRepoPath(REPO_ROOT, trimmed);
  if (!existsSync(abs)) {
    if (opts.create) {
      mkdirSync(abs, { recursive: true });
    } else {
      throw new Error(`Not a directory: ${abs}`);
    }
  }
  if (!statSync(abs).isDirectory()) {
    throw new Error(`Not a directory: ${abs}`);
  }
  return abs;
}

/**
 * Resolve a path under an open project root.
 * @param {string} projectRootAbs
 * @param {string} rel
 */
function resolveInProject(projectRootAbs, rel) {
  const safe = assertSafeRelativePath(rel);
  const abs = resolve(projectRootAbs, safe);
  const relToRoot = relative(projectRootAbs, abs);
  if (relToRoot.startsWith("..") || relToRoot === "") {
    if (abs === projectRootAbs) return abs;
    throw new Error(`Path escapes project: ${rel}`);
  }
  return abs;
}

function collectPdlFiles(dirAbs, projectRootAbs, out = {}) {
  let entries;
  try {
    entries = readdirSync(dirAbs, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    if (ent.name === "node_modules" || ent.name === ".git" || ent.name === "errors") continue;
    const abs = join(dirAbs, ent.name);
    if (ent.isDirectory()) {
      collectPdlFiles(abs, projectRootAbs, out);
    } else if (ent.isFile() && ent.name.endsWith(".pdl")) {
      const rel = relative(projectRootAbs, abs).split(sep).join("/");
      out[rel] = readFileSync(abs, "utf8");
    }
  }
  return out;
}

function collectImportClosure(entryAbs, projectRootAbs, out = {}, visiting = new Set()) {
  const rel = relative(projectRootAbs, entryAbs).split(sep).join("/");
  if (visiting.has(rel)) return out;
  visiting.add(rel);
  if (!existsSync(entryAbs)) return out;
  const text = readFileSync(entryAbs, "utf8");
  out[rel] = text;
  const importRe = /^\s*import\s+"([^"]+)"/gm;
  let m;
  while ((m = importRe.exec(text))) {
    const target = resolve(dirname(entryAbs), m[1]);
    if (relative(projectRootAbs, target).startsWith("..")) continue;
    collectImportClosure(target, projectRootAbs, out, visiting);
  }
  return out;
}

function pickEntry(files, preferred) {
  if (preferred && files[preferred]) return preferred;
  if (files["design.pdl"]) return "design.pdl";
  const keys = Object.keys(files).sort();
  return keys[0] || null;
}

function projectMeta(rootAbs) {
  const relRoot = relative(REPO_ROOT, rootAbs);
  return {
    root: rootAbs,
    rootLabel: basename(rootAbs),
    rootDisplay: relRoot.startsWith("..") ? rootAbs : relRoot.split(sep).join("/"),
  };
}

function handleStarters() {
  return { ok: true, starters: STARTERS };
}

function handleOpenProject(body) {
  const rootAbs = resolveProjectRoot(body.root);
  const files = collectPdlFiles(rootAbs, rootAbs);
  const entry = pickEntry(files, body.entry ? assertSafeRelativePath(body.entry) : null);
  if (!entry) {
    return {
      ok: false,
      empty: true,
      error: "No .pdl files in project",
      ...projectMeta(rootAbs),
      fileList: [],
      files: {},
    };
  }
  return {
    ok: true,
    ...projectMeta(rootAbs),
    entry,
    files,
    fileList: Object.keys(files).sort(),
  };
}

/**
 * Scaffold a starter pack into an empty (or new) folder.
 * @param {{ root: string, title?: string, prefix?: string, force?: boolean }} body
 */
function handleNewProject(body) {
  const rootAbs = resolveProjectRoot(body.root, { create: true });
  const existing = collectPdlFiles(rootAbs, rootAbs);
  const existingKeys = Object.keys(existing);
  if (existingKeys.length && !body.force) {
    return {
      ok: false,
      error: `Folder already has .pdl files (${existingKeys.slice(0, 4).join(", ")}). Open it instead, or enable overwrite.`,
      ...projectMeta(rootAbs),
    };
  }

  const title =
    (typeof body.title === "string" && body.title.trim()) ||
    basename(rootAbs).replace(/[-_]+/g, " ") ||
    "My Design System";
  const pack = buildStarterPack({
    title,
    prefix: typeof body.prefix === "string" ? body.prefix : undefined,
  });

  for (const [rel, content] of Object.entries(pack)) {
    const abs = resolve(rootAbs, rel);
    try {
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, content, "utf8");
    } catch (err) {
      const code = err && typeof err === "object" && "code" in err ? err.code : "";
      if (code === "EPERM" || code === "EACCES") {
        throw new Error(
          `Can't write to ${abs} (${code}). Quit Studio and run it from your own terminal with: npm run studio — then create the project again (agent-started servers can't write outside the pdl repo).`,
        );
      }
      throw err;
    }
  }

  const files = collectPdlFiles(rootAbs, rootAbs);
  return {
    ok: true,
    created: Object.keys(pack),
    ...projectMeta(rootAbs),
    entry: "design.pdl",
    files,
    fileList: Object.keys(files).sort(),
    defaultComponent: "Button",
  };
}

function handleRead(body) {
  const rootAbs = resolveProjectRoot(body.root);
  const abs = resolveInProject(rootAbs, body.path);
  if (!existsSync(abs)) throw new Error(`Missing file: ${body.path}`);
  return { ok: true, path: body.path, content: readFileSync(abs, "utf8") };
}

function handleWrite(body) {
  const rootAbs = resolveProjectRoot(body.root);
  const path = assertSafeRelativePath(body.path);
  if (typeof body.content !== "string") throw new Error('Expected "content" string');
  const abs = resolveInProject(rootAbs, path);
  if (typeof body.expectedBaseline === "string" && existsSync(abs)) {
    const current = readFileSync(abs, "utf8");
    if (current !== body.expectedBaseline) {
      return {
        ok: false,
        conflict: true,
        path,
        error: "File changed on disk since last load",
      };
    }
  }
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, body.content, "utf8");
  return { ok: true, path };
}

function handleDiskSources(body) {
  const rootAbs = resolveProjectRoot(body.root);
  const entry = assertSafeRelativePath(body.entry);
  const entryAbs = resolveInProject(rootAbs, entry);
  const files = collectImportClosure(entryAbs, rootAbs);
  return { ok: true, entry, files };
}

function hostParamsFromCatalogue(cat) {
  const hosts = cat.hosts && typeof cat.hosts === "object" ? cat.hosts : {};
  const names = Object.keys(hosts);
  const key = hosts.Default ? "Default" : names.sort()[0];
  if (!key || !hosts[key]) return [];
  const params = Array.isArray(hosts[key].params) ? hosts[key].params : [];
  return params
    .filter((p) => p && typeof p.name === "string")
    .map((p) => ({
      name: p.name,
      typeName: typeof p.variantTypeName === "string" ? p.variantTypeName : String(p.type ?? p.name),
      cases: Array.isArray(p.cases) ? p.cases.map(String) : [],
    }));
}

function enrichFromRustCatalogue(entryAbs) {
  const outPath = join(REPO_ROOT, ".tmp", "studio.catalogue.json");
  mkdirSync(dirname(outPath), { recursive: true });
  const bin = rustPdlArgs(REPO_ROOT);
  const args =
    bin.length === 1
      ? ["catalogue", entryAbs, "--out", outPath]
      : [...bin.slice(1), "catalogue", entryAbs, "--out", outPath];
  const r = spawnSync(bin[0], args, {
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
  const themes = Object.keys(cat.themes ?? {}).sort();
  /** @type {Record<string, string[]>} */
  const variantCases = {};
  for (const [name, v] of Object.entries(cat.variantTypes ?? {})) {
    variantCases[name] = Array.isArray(v?.cases) ? [...v.cases] : [];
  }
  /** @type {Record<string, Array<{ name: string; typeName: string; default: unknown }>>} */
  const componentParams = {};
  /** @type {Record<string, Record<string, Record<string, unknown>>>} */
  const fixturesByComponent = {};
  /** @type {Record<string, unknown>} */
  const interactionsByComponent = {};
  /** @type {Record<string, unknown>} */
  const emitCapturesByComponent = {};
  /** @type {Record<string, string>} */
  const usageByComponent = {};
  /** @type {Record<string, { tagOps: object[]; rules: object[] }>} */
  const rulesByComponent = {};
  /** @type {Record<string, string>} */
  const componentRoles = {};
  /** @type {Record<string, string>} */
  const componentFiles = {};

  for (const [name, c] of Object.entries(cat.components ?? {})) {
    componentParams[name] = (c.params ?? []).map((p) => {
      const rawType = p.type;
      const typeName =
        (typeof p.variantTypeName === "string" && p.variantTypeName) ||
        (typeof rawType === "string"
          ? rawType
          : rawType && typeof rawType === "object"
            ? "object"
            : "String");
      return {
        name: p.name,
        typeName,
        default: c.defaultParams?.[p.name] ?? p.default ?? null,
      };
    });
    if (c.fixtures && typeof c.fixtures === "object" && !Array.isArray(c.fixtures)) {
      fixturesByComponent[name] = c.fixtures;
    }
    if (Array.isArray(c.interactions) && c.interactions.length) {
      interactionsByComponent[name] = c.interactions;
    }
    if (Array.isArray(c.emitCaptures) && c.emitCaptures.length) {
      emitCapturesByComponent[name] = c.emitCaptures;
    }
    if (typeof c.usage === "string" && c.usage.trim()) {
      usageByComponent[name] = c.usage.trim();
    }
    if (typeof c.role === "string" && (c.role === "page" || c.role === "screen")) {
      componentRoles[name] = c.role;
    }
    if (typeof c.sourcePath === "string") {
      componentFiles[name] = c.sourcePath;
    } else if (typeof c.path === "string") {
      componentFiles[name] = c.path;
    }
    if (c.rules && typeof c.rules === "object") {
      const tags = Array.isArray(c.rules.tags) ? c.rules.tags.map(String) : [];
      const rules = Array.isArray(c.rules.rules) ? c.rules.rules : [];
      if (tags.length || rules.length) {
        rulesByComponent[name] = {
          tagOps: tags.length ? [{ kind: "set", tags }] : [],
          rules,
        };
      }
    }
  }

  const primitives = cat.primitives ?? {};
  const semantics = cat.semantics ?? {};
  const themeDefs = cat.themes ?? {};
  const typeStyles = cat.typeStyles ?? {};

  return {
    ok: true,
    components,
    themes,
    fixturesByComponent,
    componentParams,
    componentRoles,
    componentFiles,
    variantCases,
    interactionsByComponent,
    emitCapturesByComponent,
    usageByComponent,
    rulesByComponent,
    hostParams: hostParamsFromCatalogue(cat),
    samples: cat.samples ?? {},
    /** Full token / theme / typeStyle maps for the Studio inspector. */
    tokenTables: {
      primitives,
      semantics,
      themes: themeDefs,
      typeStyles,
    },
    designSummary: {
      previewBackground: null,
      primitives: Object.keys(primitives),
      semantics: Object.keys(semantics),
      themeDefinitions: themes,
      variants: Object.entries(variantCases).map(([name, cases]) => ({ name, cases })),
      typeStyles: Object.keys(typeStyles),
    },
    loader: "rust-catalogue",
  };
}

/**
 * Write overlay files into a temp tree under project shape, return entry abs.
 * @param {string} rootAbs
 * @param {string} entry
 * @param {Record<string, string>} [overlayFiles]
 */
function materializeWorkspace(rootAbs, entry, overlayFiles) {
  if (!overlayFiles || Object.keys(overlayFiles).length === 0) {
    return { entryAbs: resolveInProject(rootAbs, entry), tmp: null };
  }
  const tmp = mkdtempSync(join(tmpdir(), "pdl-studio-"));
  // Copy import closure from disk, then overlay editor buffers.
  const entryAbsDisk = resolveInProject(rootAbs, entry);
  const closure = collectImportClosure(entryAbsDisk, rootAbs);
  const merged = { ...closure, ...overlayFiles };
  for (const [rel, text] of Object.entries(merged)) {
    const abs = resolve(tmp, assertSafeRelativePath(rel));
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, text, "utf8");
  }
  return { entryAbs: resolve(tmp, entry), tmp };
}

async function handleLoad(body) {
  const rootAbs = resolveProjectRoot(body.root);
  const entry = assertSafeRelativePath(body.entry);
  const { entryAbs, tmp } = materializeWorkspace(rootAbs, entry, body.files);
  try {
    return enrichFromRustCatalogue(entryAbs);
  } finally {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
  }
}

function buildFixtureControlsByComponent(enriched, names, activeByComponent) {
  /** @type {Record<string, { labels: string[]; active?: string | null }>} */
  const out = {};
  for (const name of names) {
    const fixtures = enriched.fixturesByComponent?.[name] ?? {};
    const labels = Object.keys(fixtures);
    out[name] = {
      labels,
      active: activeByComponent?.[name] ?? null,
    };
  }
  return out;
}

function buildParamControlsByComponent(enriched, names, kvByComponent) {
  /** @type {Record<string, Array<{ name: string; typeName: string; value: string; cases?: string[] }>>} */
  const out = {};
  for (const name of names) {
    const params = enriched.componentParams?.[name] ?? [];
    const kv = kvByComponent?.[name] ?? {};
    out[name] = params
      .filter((p) => p.typeName !== "object")
      .map((p) => {
        const cases = enriched.variantCases?.[p.typeName];
        const raw = kv[p.name] ?? p.default;
        return {
          name: p.name,
          typeName: p.typeName,
          value: raw == null ? "" : String(raw),
          cases: Array.isArray(cases) ? cases : undefined,
        };
      });
  }
  return out;
}

function componentRolesFromEnriched(enriched) {
  return { ...(enriched.componentRoles ?? {}) };
}

function editableTypeDefaultsFromEnriched(_enriched) {
  return undefined;
}

async function handleRenderFromBake(body) {
  const bake = body?.bake;
  if (!bake || typeof bake !== "object") {
    throw new Error('Expected "bake" object');
  }
  const { renderBakedDesignToHtmlDocumentWithReport } = await loadToolchain();
  const component =
    typeof body.component === "string" && body.component.trim()
      ? body.component.trim()
      : undefined;
  const componentNames = Array.isArray(body.componentNames)
    ? body.componentNames.map(String).filter(Boolean)
    : undefined;
  const wantInteractive = body.interactiveHost !== false;

  let enriched = null;
  let tmp = null;
  try {
    if (wantInteractive && body.root && body.entry) {
      const rootAbs = resolveProjectRoot(body.root);
      const entry = assertSafeRelativePath(body.entry);
      const mat = materializeWorkspace(rootAbs, entry, body.files);
      tmp = mat.tmp;
      enriched = enrichFromRustCatalogue(mat.entryAbs);
    }

    const previewNames =
      componentNames?.length > 0
        ? componentNames
        : component
          ? [component]
          : Object.keys(bake?.components ?? {});

    /** @type {Record<string, Record<string, unknown>>} */
    let componentOverrides = {};
    if (body.componentOverrides && typeof body.componentOverrides === "object") {
      componentOverrides = body.componentOverrides;
    } else if (component && body.kv && typeof body.kv === "object") {
      componentOverrides = { [component]: body.kv };
    }

    const { html, renderFailures } = renderBakedDesignToHtmlDocumentWithReport(bake, {
      title: "PDL Studio preview",
      singleComponent: componentNames?.length ? undefined : component,
      componentNames,
      interactiveHost: wantInteractive,
      hostChrome: body.hostChrome === "device" ? "device" : undefined,
      interactionsByComponent: {
        ...(body.interactionsByComponent ?? {}),
        ...(enriched?.interactionsByComponent ?? {}),
      },
      emitCapturesByComponent: {
        ...(body.emitCapturesByComponent ?? {}),
        ...(enriched?.emitCapturesByComponent ?? {}),
      },
      usageByComponent: enriched?.usageByComponent,
      rulesByComponent: enriched?.rulesByComponent,
      editableTypeDefaults: editableTypeDefaultsFromEnriched(enriched),
      paramControlsByComponent:
        enriched != null
          ? buildParamControlsByComponent(enriched, previewNames, componentOverrides)
          : undefined,
      fixtureControlsByComponent:
        enriched != null
          ? buildFixtureControlsByComponent(
              enriched,
              previewNames,
              body.activeFixturesByComponent ?? {},
            )
          : undefined,
      worldMode: body.worldMode === "params" ? "params" : "fixtures",
      componentRolesByComponent:
        enriched != null
          ? componentRolesFromEnriched(enriched)
          : body.componentRolesByComponent,
    });

    return {
      ok: true,
      html,
      baked: bake,
      renderFailures,
      engine: "wasm",
    };
  } finally {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
  }
}

async function handleExport(body) {
  const rootAbs = resolveProjectRoot(body.root);
  const entry = assertSafeRelativePath(body.entry);
  const kind = body.kind || "bake";
  const component = typeof body.component === "string" ? body.component.trim() : "";
  const theme = typeof body.theme === "string" ? body.theme.trim() : "";
  const { entryAbs, tmp } = materializeWorkspace(rootAbs, entry, body.files);
  try {
    if (kind === "catalogue") {
      const outPath = join(REPO_ROOT, ".tmp", "studio.export.catalogue.json");
      mkdirSync(dirname(outPath), { recursive: true });
      const bin = rustPdlArgs(REPO_ROOT);
      const args =
        bin.length === 1
          ? ["catalogue", entryAbs, "--out", outPath]
          : [...bin.slice(1), "catalogue", entryAbs, "--out", outPath];
      const r = spawnSync(bin[0], args, {
        cwd: REPO_ROOT,
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
      });
      if (r.status !== 0) {
        throw new Error(((r.stderr || "") + (r.stdout || "")).trim() || "catalogue failed");
      }
      return {
        ok: true,
        filename: `${basename(rootAbs)}.catalogue.json`,
        content: readFileSync(outPath, "utf8"),
        mime: "application/json",
      };
    }

    const mode = kind === "html" && !component ? "system" : "component";
    if (mode === "component" && !component) {
      throw new Error("Export HTML/bake needs a component (or kind html without component for system gallery)");
    }
    const result = await bakeAndRender({
      repoRoot: REPO_ROOT,
      entry: entryAbs,
      engine: "rust",
      mode: mode === "system" ? "system" : "component",
      component: mode === "component" ? component : undefined,
      theme: theme || undefined,
      interactiveHost: kind === "html",
      singleComponent: mode === "component" ? component : undefined,
    });
    if (!result.ok) {
      throw new Error(result.error || result.stderr || "export bake failed");
    }
    if (kind === "bake") {
      return {
        ok: true,
        filename: `${component || basename(rootAbs)}.bake.json`,
        content: JSON.stringify(result.baked, null, 2),
        mime: "application/json",
      };
    }
    return {
      ok: true,
      filename: `${component || basename(rootAbs)}.html`,
      content: result.html || "",
      mime: "text/html",
    };
  } finally {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
  }
}

function serveStatic(pathname, res) {
  const safe = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  const filePath = resolve(STATIC_DIR, safe);
  const rel = relative(STATIC_DIR, filePath);
  if (rel.startsWith("..")) {
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
    if (safe === "index.html") {
      let v = Date.now();
      try {
        v = Math.round(statSync(resolve(STATIC_DIR, "studio-app.js")).mtimeMs);
      } catch {
        /* keep */
      }
      const html = buf
        .toString("utf8")
        .replace(`src="/studio-app.js"`, `src="/studio-app.js?v=${v}"`);
      res.writeHead(200, { "Content-Type": ct, "Cache-Control": "no-store" });
      res.end(html);
      return;
    }
    res.writeHead(200, { "Content-Type": ct, "Cache-Control": "no-store" });
    res.end(buf);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  try {
    if (req.method === "GET" && pathname === "/api/starters") {
      json(res, 200, handleStarters());
      return;
    }
    if (req.method === "POST" && pathname === "/api/open-project") {
      const body = await readJsonBody(req);
      json(res, 200, handleOpenProject(body));
      return;
    }
    if (req.method === "POST" && pathname === "/api/new-project") {
      const body = await readJsonBody(req);
      json(res, 200, handleNewProject(body));
      return;
    }
    if (req.method === "POST" && pathname === "/api/read") {
      const body = await readJsonBody(req);
      json(res, 200, handleRead(body));
      return;
    }
    if (req.method === "POST" && pathname === "/api/write") {
      const body = await readJsonBody(req);
      json(res, 200, handleWrite(body));
      return;
    }
    if (req.method === "POST" && pathname === "/api/disk-sources") {
      const body = await readJsonBody(req);
      json(res, 200, handleDiskSources(body));
      return;
    }
    if (req.method === "POST" && pathname === "/api/load") {
      const body = await readJsonBody(req);
      json(res, 200, await handleLoad(body));
      return;
    }
    if (req.method === "POST" && pathname === "/api/render-from-bake") {
      const body = await readJsonBody(req);
      json(res, 200, await handleRenderFromBake(body));
      return;
    }
    if (req.method === "POST" && pathname === "/api/export") {
      const body = await readJsonBody(req);
      json(res, 200, await handleExport(body));
      return;
    }
    if (req.method === "GET") {
      serveStatic(pathname, res);
      return;
    }
    json(res, 404, { ok: false, error: "Not found" });
  } catch (err) {
    json(res, 200, {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

function portHint(busyPort) {
  return (
    `Port ${busyPort} is already in use. Stop it (lsof -iTCP:${busyPort} -sTCP:LISTEN) ` +
    `or set an exact port: STUDIO_PORT=3858 npm run studio`
  );
}

function listenStudio() {
  const first = strictPort ? Number(envPort) : DEFAULT_FIRST_PORT;
  if (!Number.isInteger(first) || first < 1 || first > 65535) {
    console.error(`Invalid STUDIO_PORT: ${envPort}`);
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
    console.error(`Port ${first + attempt - 1} busy, trying ${next}…`);
    server.listen(next, HOST);
  });

  server.listen(first, HOST, () => {
    const bound = /** @type {import("node:net").AddressInfo} */ (server.address());
    const p = bound?.port ?? first;
    console.log(`PDL Studio  http://${HOST}:${p}`);
    console.log(`Repo root   ${REPO_ROOT}`);
    if (!strictPort && p !== DEFAULT_FIRST_PORT) {
      console.error(`(Using ${p} because ${DEFAULT_FIRST_PORT} was busy.)`);
    }
  });
}

listenStudio();
