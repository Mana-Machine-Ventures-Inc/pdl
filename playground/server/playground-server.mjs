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
import { networkInterfaces, tmpdir } from "node:os";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { bakeAndRender, resolveRepoPath, rustPdlArgs } from "../../scripts/lib/bake-pipeline.mjs";
import {
  expandVariantMatrixCombos,
  formatVariantMatrixLabel,
  matrixAxesFromParams,
} from "../src/variant-matrix.js";

/** Known packs for PDL Playground. */
const PACK_CATALOG = [
  {
    id: "playlist-composer-lite",
    label: "Playlist Composer",
    entry: "test-fixtures/pdl/systems/playlist-composer-lite/design.pdl",
    defaultComponent: "PlaylistComposer",
    description: "Interaction flagship — chips, tracks, rename/search sessions, ForEach demos",
  },
  {
    id: "airbnb-lite",
    label: "Airbnb-lite",
    entry: "test-fixtures/pdl/systems/airbnb-lite/design.pdl",
    defaultComponent: "AbnPointerLab",
    description: "Flagship veracity pack — coral/teal, Cancel/Save scoping demo",
  },
  {
    id: "ios26-lite",
    label: "iOS 26 lite",
    entry: "test-fixtures/pdl/systems/ios26-lite/design.pdl",
    defaultComponent: "IosPhone",
    description: "iOS 26 community kit (lite)",
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
    description: "Protocols, slots, emits + ForEach select handler (Rust)",
  },
  {
    id: "atoms",
    label: "Atoms",
    entry: "test-fixtures/pdl/atoms/design.pdl",
    defaultComponent: "AtomTextPlain",
    description: "Token / typeStyle language surfaces",
  },
  {
    id: "usage-rules",
    label: "Usage & rules",
    entry: "test-fixtures/pdl/lab/usage-rules/design.pdl",
    defaultComponent: "UsageRulesLab",
    description: "Usage notes plus red must / orange should warnings in the HTML preview",
  },
  {
    id: "motion",
    label: "Motion",
    entry: "test-fixtures/pdl/lab/motion/design.pdl",
    defaultComponent: "MotionLab",
    description: "Appear / dismiss, press-pop, stagger, and implicit animate = in the HTML preview",
  },
  {
    id: "effect",
    label: "Effect",
    entry: "test-fixtures/pdl/lab/effect/design.pdl",
    defaultComponent: "EffectLab",
    description: "Frame effect: blur self, blur behind, and appear-to-rest self blur",
  },
  {
    id: "host",
    label: "Host environment",
    entry: "test-fixtures/pdl/lab/host/design.pdl",
    defaultComponent: "Shell",
    description: "Host profiles, mount facts, catalogs, fixture env pins (H0–H5)",
  },
  {
    id: "lab-nav",
    label: "Nav (Presenter)",
    entry: "test-fixtures/pdl/lab/nav/n8_slide.pdl",
    defaultComponent: "Phone",
    description:
      "N8 pair slide — tap a row: Episode enters from the right, Home eases left. Back plays .reversed.",
  },
  {
    id: "lab-nav-keys",
    label: "Nav (keys)",
    entry: "test-fixtures/pdl/lab/nav/n8_keys.pdl",
    defaultComponent: "Phone",
    description:
      "N8k keyed pair — Episode tosses through a mid pose. Back is a hand-written key path.",
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

/**
 * Walk `import "…"` edges from an entry (same closure Rust disk bake uses).
 * Used by WASM bake so cross-directory imports (e.g. integration → atoms) resolve
 * even when the in-browser `files` map is incomplete.
 * @param {string} entryAbs
 * @param {string} repoRoot
 * @param {Record<string, string>} [out]
 * @param {Set<string>} [visiting]
 */
function collectImportClosure(entryAbs, repoRoot, out = {}, visiting = new Set()) {
  const abs = resolve(entryAbs);
  assertUnderRepo(abs);
  if (!existsSync(abs) || extname(abs) !== ".pdl") {
    throw new Error(`Not a .pdl file: ${relative(repoRoot, abs)}`);
  }
  const rel = relative(repoRoot, abs).replace(/\\/g, "/");
  if (out[rel] !== undefined) return out;
  if (visiting.has(rel)) {
    // Cycle — leave detection to the compiler.
    return out;
  }
  visiting.add(rel);
  const source = readFileSync(abs, "utf8");
  out[rel] = source;
  for (const m of source.matchAll(/^\s*import\s+"([^"]+)"/gm)) {
    const nextAbs = resolve(dirname(abs), m[1]);
    collectImportClosure(nextAbs, repoRoot, out, visiting);
  }
  visiting.delete(rel);
  return out;
}

/**
 * @param {{ entry?: string }} body
 */
function handleDiskSources(body) {
  const entry = typeof body?.entry === "string" ? body.entry.trim() : "";
  if (!entry) throw new Error('Expected "entry" path');
  assertSafeRelativePath(entry);
  const entryAbs = resolveRepoPath(REPO_ROOT, entry);
  assertUnderRepo(entryAbs);
  const files = collectImportClosure(entryAbs, REPO_ROOT);
  return { ok: true, entry, files };
}

function handleCatalog() {
  return { ok: true, packs: PACK_CATALOG };
}

function lanIPv4Addresses() {
  /** @type {string[]} */
  const out = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const info of list ?? []) {
      if (info.internal) continue;
      const v4 = info.family === "IPv4" || info.family === 4;
      if (v4 && info.address) out.push(info.address);
    }
  }
  return [...new Set(out)];
}

function lanInfo(port) {
  const localhost = `http://127.0.0.1:${port}`;
  const lan = lanIPv4Addresses().map((ip) => `http://${ip}:${port}`);
  return {
    ok: true,
    host: HOST,
    port,
    localhost,
    lan,
    device: {
      local: `${localhost}/device`,
      lan: lan.map((base) => `${base}/device`),
    },
  };
}

const nodeRequire = createRequire(import.meta.url);

/** PNG buffer for a device-stage URL (Open on phone QR). */
async function qrPngBuffer(text) {
  const QRCode = nodeRequire("qrcode");
  return QRCode.toBuffer(text, { type: "png", width: 240, margin: 1 });
}

/** Desktop → phone projection snapshot (one session per Playground process). */
let stageRev = 0;
/** @type {Record<string, unknown> | null} */
let stageSnapshot = null;

function handleGetStage() {
  if (!stageSnapshot) return { ok: true, rev: stageRev, stage: null };
  const slim = { ...stageSnapshot };
  // Disk packs are on the Mac already — don't ship sources to the phone.
  if (slim.diskRoot === true) slim.files = {};
  return { ok: true, rev: stageRev, stage: slim };
}

function handlePutStage(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Expected a stage snapshot object");
  }
  const component = typeof body.component === "string" ? body.component.trim() : "";
  const entry = typeof body.entry === "string" ? body.entry.trim() : "";
  if (!component) throw new Error('Expected "component"');
  if (!entry) throw new Error('Expected "entry"');
  stageRev += 1;
  stageSnapshot = {
    rev: stageRev,
    packId: typeof body.packId === "string" ? body.packId : "",
    entry,
    component,
    theme: typeof body.theme === "string" ? body.theme : "",
    host: typeof body.host === "string" && body.host.trim() ? body.host : undefined,
    hostFacts:
      body.hostFacts && typeof body.hostFacts === "object" && !Array.isArray(body.hostFacts)
        ? body.hostFacts
        : undefined,
    diskRoot: body.diskRoot === true,
    files: body.files && typeof body.files === "object" && !Array.isArray(body.files) ? body.files : {},
    kv: body.kv && typeof body.kv === "object" && !Array.isArray(body.kv) ? body.kv : {},
    presenterPins:
      body.presenterPins && typeof body.presenterPins === "object" && !Array.isArray(body.presenterPins)
        ? body.presenterPins
        : {},
    activeFixture: typeof body.activeFixture === "string" ? body.activeFixture : null,
    components: Array.isArray(body.components) ? body.components.map(String) : [],
    updatedAt: Date.now(),
  };
  return { ok: true, rev: stageRev };
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
  // Optimistic concurrency: refuse to clobber external / agent edits.
  if (typeof body.expectedBaseline === "string") {
    const onDisk = existsSync(abs) ? readFileSync(abs, "utf8") : "";
    if (onDisk !== body.expectedBaseline) {
      return {
        ok: false,
        conflict: true,
        path: relative(REPO_ROOT, abs).replace(/\\/g, "/"),
        error: `Disk changed for ${rel} — Reload from disk (refusing to overwrite)`,
      };
    }
  }
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, "utf8");
  return { ok: true, path: relative(REPO_ROOT, abs).replace(/\\/g, "/") };
}

function handleReadFile(body) {
  const rel = typeof body?.path === "string" ? body.path.trim() : "";
  if (!rel) throw new Error('Expected "path"');
  assertSafeRelativePath(rel);
  const abs = resolveRepoPath(REPO_ROOT, rel);
  assertUnderRepo(abs);
  const underFixtures = relative(REPO_ROOT, abs).replace(/\\/g, "/").startsWith("test-fixtures/pdl/");
  if (!underFixtures) {
    throw new Error("Playground reads via /api/read are limited to test-fixtures/pdl/");
  }
  if (!existsSync(abs)) {
    return { ok: false, error: `File not found: ${rel}` };
  }
  return {
    ok: true,
    path: relative(REPO_ROOT, abs).replace(/\\/g, "/"),
    content: readFileSync(abs, "utf8"),
  };
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");
const DIST = join(REPO_ROOT, "dist");
const STATIC_DIR = resolve(__dirname, "..", "static");
const MAX_BODY_BYTES = 12 * 1024 * 1024;
const HOST = process.env.PLAYGROUND_HOST || "0.0.0.0";
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
  const companions = await import(pathToFileURL(join(DIST, "evaluateRules.js")).href);
  const catalogue = await import(pathToFileURL(join(DIST, "catalogue.js")).href);
  return {
    loadDesign: m.loadDesign,
    ...bake,
    ...render,
    serialiseValueExpr: graph.serialiseValueExpr,
    evaluateValue: evaluate.evaluateValue,
    buildResolvedTokenMap: evaluate.buildResolvedTokenMap,
    companionPreviewFromDesign: companions.companionPreviewFromDesign,
    companionPreviewFromCatalogue: companions.companionPreviewFromCatalogue,
    mergeCompanionPreview: companions.mergeCompanionPreview,
    interactionsByComponentFromDesign: catalogue.interactionsByComponentFromDesign,
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
  return { components, themes, componentRoles: componentRolesFromDesign(design) };
}

/**
 * @param {{ components?: Map<string, { role?: string }> }} design
 * @returns {Record<string, string>}
 */
function componentRolesFromDesign(design) {
  /** @type {Record<string, string>} */
  const out = {};
  const comps = design?.components;
  if (!comps || typeof comps.entries !== "function") return out;
  for (const [name, c] of comps.entries()) {
    if (c?.role === "page" || c?.role === "screen") out[name] = c.role;
  }
  return out;
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

/** @param {unknown} v */
function cssColorFromResolved(v) {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(s)) return s;
  return null;
}

/**
 * Expand #RGB / #RRGGBB / #RRGGBBAA to a CSS color that preserves alpha.
 * 8-digit hex is fine in modern browsers; also expose rgba() for overlays.
 * @param {string} hex
 */
function cssPaintFromHex(hex) {
  const raw = hex.trim();
  let h = raw.startsWith("#") ? raw.slice(1) : raw;
  if (h.length === 3) {
    h = `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  }
  if (h.length === 6) {
    return { hex: `#${h.toUpperCase()}`, css: `#${h}`, alpha: 1 };
  }
  if (h.length === 8) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = parseInt(h.slice(6, 8), 16) / 255;
    const alpha = Math.round(a * 1000) / 1000;
    return {
      hex: `#${h.toUpperCase()}`,
      css: `rgba(${r}, ${g}, ${b}, ${alpha})`,
      alpha,
    };
  }
  return { hex: raw, css: raw, alpha: 1 };
}

/**
 * JSON-friendly view of primitives, semantics, themes, variants, type styles (for playground UI).
 * @param {unknown} design - DesignDefinition from loadDesign
 * @param {(e: unknown) => unknown} serialiseValueExpr
 * @param {string} workspaceRoot
 * @param {Map<string, unknown> | undefined} [tokenMap]
 */
function buildDesignSummary(design, serialiseValueExpr, workspaceRoot, tokenMap) {
  const relModule = (p) => {
    try {
      const r = relative(workspaceRoot, p);
      if (r && !r.startsWith("..") && r !== "") return r.replace(/\\/g, "/");
    } catch {
      /* ignore */
    }
    return String(p).replace(/\\/g, "/");
  };

  /** @param {string} name @param {string} tokenType @param {unknown} value */
  const tokenRow = (name, tokenType, value) => {
    const resolved = tokenMap?.get(name);

    // Opacity tokens: preview as black @ alpha over the checkerboard.
    if (tokenType === "Opacity") {
      let alpha = NaN;
      if (typeof resolved === "number") alpha = resolved;
      else if (typeof resolved === "string" && /^-?\d+(\.\d+)?$/.test(resolved.trim())) {
        alpha = Number(resolved.trim());
      }
      if (Number.isFinite(alpha)) {
        const a = Math.min(1, Math.max(0, alpha));
        const rounded = Math.round(a * 1000) / 1000;
        return {
          name,
          tokenType,
          value,
          cssColor: `rgba(0, 0, 0, ${rounded})`,
          hex: String(rounded),
          alpha: rounded,
          resolved: String(rounded),
        };
      }
    }

    // Shadow tokens: CSS box-shadow string for previews (no color swatch — use shadow card).
    if (
      tokenType === "Shadow" &&
      resolved &&
      typeof resolved === "object" &&
      /** @type {Record<string, unknown>} */ (resolved).kind === "shadow"
    ) {
      const o = /** @type {Record<string, unknown>} */ (resolved);
      const x = Number(o.x);
      const y = Number(o.y);
      const blur = Number(o.blurRadius);
      const spread = o.spread === undefined || o.spread === null ? 0 : Number(o.spread);
      const color = typeof o.color === "string" ? o.color : "";
      if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(blur) && color) {
        const css = `${x}px ${y}px ${blur}px ${Number.isFinite(spread) ? spread : 0}px ${color}`;
        return {
          name,
          tokenType,
          value,
          resolved: css,
          shadowCss: css,
          hex: css,
        };
      }
    }

    // Size / Weight / LineHeight / LetterSpacing: numeric resolved value for Aa micro-previews.
    if (
      tokenType === "Size" ||
      tokenType === "Weight" ||
      tokenType === "LineHeight" ||
      tokenType === "LetterSpacing"
    ) {
      let n = NaN;
      if (typeof resolved === "number") n = resolved;
      else if (typeof resolved === "string" && /^-?\d+(\.\d+)?$/.test(resolved.trim())) {
        n = Number(resolved.trim());
      }
      if (Number.isFinite(n)) {
        return {
          name,
          tokenType,
          value,
          resolved: String(n),
          hex: String(n),
        };
      }
    }

    // Sizing: hug / fill / fixed / flex — expose a mode + label for icons.
    if (tokenType === "Sizing") {
      /** @type {string | null} */
      let mode = null;
      /** @type {string | null} */
      let label = null;
      if (resolved === "hug" || resolved === "fill") {
        mode = resolved;
        label = resolved;
      } else if (resolved && typeof resolved === "object") {
        const o = /** @type {Record<string, unknown>} */ (resolved);
        if (typeof o.fixed === "number" || typeof o.fixed === "string") {
          mode = "fixed";
          label = `fixed(${o.fixed})`;
        } else if (o.flex && typeof o.flex === "object") {
          mode = "flex";
          const fx = /** @type {Record<string, unknown>} */ (o.flex);
          const parts = [];
          if (fx.min != null) parts.push(`min: ${fx.min}`);
          if (fx.max != null) parts.push(`max: ${fx.max}`);
          if (fx.preferred != null) parts.push(`preferred: ${fx.preferred}`);
          label = parts.length ? `flex(${parts.join(", ")})` : "flex";
        }
      }
      if (mode && label) {
        return {
          name,
          tokenType,
          value,
          resolved: label,
          sizingMode: mode,
          hex: label,
        };
      }
    }

    const hexRaw = cssColorFromResolved(resolved);
    const paint = hexRaw ? cssPaintFromHex(hexRaw) : null;
    const display =
      paint?.hex ??
      (typeof resolved === "string" || typeof resolved === "number" || typeof resolved === "boolean"
        ? String(resolved)
        : null);
    return {
      name,
      tokenType,
      value,
      ...(paint
        ? {
            cssColor: paint.css,
            hex: paint.hex,
            alpha: paint.alpha,
          }
        : {}),
      ...(display != null ? { resolved: display } : {}),
    };
  };

  const primitives = [...design.primitives.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, p]) => tokenRow(name, p.tokenType, serialiseValueExpr(p.value)));

  const semantics = [...design.semantics.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, s]) => tokenRow(name, s.tokenType, serialiseValueExpr(s.value)));

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

function enrichLoadPayload(
  design,
  serialiseValueExpr,
  evaluateValue,
  buildResolvedTokenMap,
  workspaceRoot,
  interactionsByComponentFromDesign,
) {
  const tokenMap = buildResolvedTokenMap(design);
  const designSummary = buildDesignSummary(design, serialiseValueExpr, workspaceRoot, tokenMap);
  const controls = buildFixturesAndParams(design, evaluateValue, tokenMap);
  return {
    ok: true,
    ...designMeta(design),
    designSummary,
    ...controls,
    interactionsByComponent: interactionsByComponentFromDesign
      ? interactionsByComponentFromDesign(design, tokenMap)
      : {},
  };
}

/** Rust wins handler lists; keep TS `motion` when a stale rust catalogue omitted it. */
function mergeInteractionsPreferMotion(tsIx, rustIx) {
  const out = { ...(tsIx ?? {}), ...(rustIx ?? {}) };
  for (const [name, rustList] of Object.entries(rustIx ?? {})) {
    const tsList = tsIx?.[name];
    if (!Array.isArray(rustList) || !Array.isArray(tsList)) continue;
    out[name] = rustList.map((rd) => {
      if (!rd || typeof rd !== "object") return rd;
      const td = tsList.find((x) => x && x.name === rd.name) ?? tsList[0];
      const rustHandlers = Array.isArray(rd.handlers) ? rd.handlers : [];
      const tsHandlers = Array.isArray(td?.handlers) ? td.handlers : [];
      return {
        ...rd,
        handlers: rustHandlers.map((rh) => {
          if (rh?.motion && (rh.motion.pose || rh.motion.from || rh.motion.to || rh.motion.transition)) {
            const th = tsHandlers.find((h) => h && h.event === rh?.event);
            if (th?.motion?.staggerFrom && !rh.motion.staggerFrom) {
              return { ...rh, motion: { ...rh.motion, staggerFrom: th.motion.staggerFrom } };
            }
            return rh;
          }
          const th = tsHandlers.find((h) => h && h.event === rh?.event);
          return th?.motion ? { ...rh, motion: th.motion } : rh;
        }),
      };
    });
  }
  return out;
}

function formatErr(err) {
  if (err && typeof err.format === "function") {
    return err.format();
  }
  return err instanceof Error ? err.message : String(err);
}

/**
 * Enrich payload from Rust `pdl catalogue` when TS loadDesign cannot parse
 * Rust-first syntax (protocols, host inbound `[self.]channel = { … }`, emits, ForEach, …).
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
  for (const [name, c] of Object.entries(cat.components ?? {})) {
    componentParams[name] = (c.params ?? []).map((p) => {
      // Array / object types are not Playground knobs — mark as object so controls skip them.
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
      fixturesByComponent[name] = /** @type {Record<string, Record<string, unknown>>} */ (
        c.fixtures
      );
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
  return {
    ok: true,
    components,
    themes,
    designSummary: {
      previewBackground: null,
      modulePaths: [entryAbs],
      primitives: [],
      semantics: [],
      themeDefinitions: [],
      variants: Object.entries(variantCases).map(([name, cases]) => ({ name, cases })),
      typeStyles: [],
    },
    fixturesByComponent,
    componentParams,
    componentRoles,
    variantCases,
    interactionsByComponent,
    emitCapturesByComponent,
    usageByComponent,
    rulesByComponent,
    hostParams: hostParamsFromCatalogue(cat),
    loader: "rust-catalogue",
  };
}

/**
 * Variant host params from the Default (or first) profile — Playground chrome.
 * @param {{ hosts?: Record<string, { params?: Array<{ name?: string, type?: unknown, variantTypeName?: string, cases?: string[] }> }> }} cat
 */
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

/**
 * Prefer TS loadDesign (fixtures / design summary); always merge Rust catalogue
 * emitCaptures + interactions when available. TS still skims ForEach / emit
 * capture assigns, so nested LibrarySubnav-style hosts need the Rust slice.
 * @param {string} entryAbs
 * @param {string} summaryRoot
 */
async function enrichDesignAt(entryAbs, summaryRoot) {
  const {
    loadDesign,
    serialiseValueExpr,
    evaluateValue,
    buildResolvedTokenMap,
    companionPreviewFromDesign,
    mergeCompanionPreview,
    interactionsByComponentFromDesign,
  } = await toolchainPromise;
  /** @type {ReturnType<typeof enrichFromRustCatalogue> | null} */
  let rustEnrich = null;
  try {
    rustEnrich = enrichFromRustCatalogue(entryAbs);
  } catch {
    rustEnrich = null;
  }
  try {
    const design = loadDesign(entryAbs);
    const tsPayload = enrichLoadPayload(
      design,
      serialiseValueExpr,
      evaluateValue,
      buildResolvedTokenMap,
      summaryRoot,
      interactionsByComponentFromDesign,
    );
    const tsCompanions = companionPreviewFromDesign(design);
    const rustCompanions = rustEnrich
      ? {
          usageByComponent: rustEnrich.usageByComponent ?? {},
          rulesByComponent: rustEnrich.rulesByComponent ?? {},
        }
      : { usageByComponent: {}, rulesByComponent: {} };
    const companions = rustEnrich
      ? mergeCompanionPreview(rustCompanions, tsCompanions)
      : tsCompanions;
    const withCompanions = {
      ...tsPayload,
      usageByComponent: companions.usageByComponent,
      rulesByComponent: companions.rulesByComponent,
    };
    if (!rustEnrich) return withCompanions;
    return {
      ...withCompanions,
      // Rust wins for host/emit metadata (ForEach captures, host handlers).
      interactionsByComponent: mergeInteractionsPreferMotion(
        tsPayload.interactionsByComponent,
        rustEnrich.interactionsByComponent,
      ),
      emitCapturesByComponent: {
        ...(tsPayload.emitCapturesByComponent ?? {}),
        ...(rustEnrich.emitCapturesByComponent ?? {}),
      },
      // Prefer Rust variant cases when TS missed protocol/enum surfaces.
      variantCases: {
        ...(tsPayload.variantCases ?? {}),
        ...(rustEnrich.variantCases ?? {}),
      },
      componentParams: {
        ...(tsPayload.componentParams ?? {}),
        ...(rustEnrich.componentParams ?? {}),
      },
      componentRoles: {
        ...(tsPayload.componentRoles ?? {}),
        ...(rustEnrich.componentRoles ?? {}),
      },
      hostParams: rustEnrich.hostParams ?? [],
      loader: "ts+rust-catalogue",
    };
  } catch (err) {
    if (rustEnrich) return rustEnrich;
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
    if (!existsSync(entryAbs)) {
      const available = Object.keys(files ?? {})
        .filter((p) => String(p).endsWith(".pdl"))
        .slice(0, 8)
        .join(", ");
      throw new Error(
        `Entry "${entry}" is not in the scratch workspace` +
          (available ? ` (have: ${available})` : " (no .pdl files)"),
      );
    }
    // Must await: a bare `return enrichDesignAt(...)` runs `finally` (rmSync) before the
    // async enrich reads the temp files → ENOENT on lab.pdl / entry.
    return await enrichDesignAt(entryAbs, tmp);
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
/**
 * §11 fixture dropdowns per gallery component.
 * @param {{ fixturesByComponent?: Record<string, Record<string, unknown>> }} enriched
 * @param {string[]} names
 * @param {Record<string, string | null | undefined>} [activeByComponent]
 */
/**
 * Catalogue page/screen roles for preview chrome (Playground Reset).
 * @param {{ componentRoles?: Record<string, string> }} enriched
 */
function componentRolesFromEnriched(enriched) {
  const roles = enriched?.componentRoles;
  return roles && typeof roles === "object" && !Array.isArray(roles)
    ? /** @type {Record<string, string>} */ (roles)
    : {};
}

function buildFixtureControlsByComponent(enriched, names, activeByComponent) {
  /** @type {Record<string, { labels: string[]; active?: string | null }>} */
  const out = {};
  const active =
    activeByComponent && typeof activeByComponent === "object" && !Array.isArray(activeByComponent)
      ? activeByComponent
      : {};
  const fixtures =
    enriched?.fixturesByComponent && typeof enriched.fixturesByComponent === "object"
      ? enriched.fixturesByComponent
      : {};
  for (const name of names) {
    const examples = fixtures[name];
    if (!examples || typeof examples !== "object" || Array.isArray(examples)) continue;
    const labels = Object.keys(examples).sort((a, b) => a.localeCompare(b));
    if (!labels.length) continue;
    const want = active[name];
    out[name] = {
      labels,
      active: typeof want === "string" && labels.includes(want) ? want : null,
    };
  }
  return out;
}

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
    const hostNames = new Set((enriched.hostParams ?? []).map((h) => h.name).filter(Boolean));
    for (const p of params) {
      if (!p?.name || p.name === "interactionState") continue;
      if (hostNames.has(p.name)) continue;
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

/** EditableText type defaults (activatesOn) — nested kwargs omit these. */
function editableTypeDefaultsFromEnriched(enriched) {
  /** @type {Record<string, Record<string, unknown>>} */
  const out = {};
  for (const [name, params] of Object.entries(enriched?.componentParams ?? {})) {
    /** @type {Record<string, unknown>} */
    const bag = {};
    for (const p of Array.isArray(params) ? params : []) {
      if (!p?.name) continue;
      if (
        (p.name === "activatesOn" ||
          p.name === "isEditing" ||
          p.name === "value" ||
          p.name === "isEmpty") &&
        p.default !== undefined
      ) {
        bag[p.name] = p.default;
      }
    }
    if (Object.keys(bag).length) out[name] = bag;
  }
  return out;
}


async function handleRender(body) {
  const {
    files,
    entry,
    mode: modeRaw,
    component,
    theme,
    host,
    hostFacts,
    kv,
    pack,
    engine: engineRaw,
    diskRoot,
    componentNames: namesRaw,
    variantMatrix,
    interactiveHost: interactiveRaw,
    bakeOnly: bakeOnlyRaw,
  } = body;
  const bakeOnly = bakeOnlyRaw === true;
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

    // Phase 5: variant matrix — bake each combo for every requested component.
    if (variantMatrix === true) {
      /** @type {string[]} */
      const matrixTargets =
        Array.isArray(componentNames) && componentNames.length > 0
          ? componentNames
          : typeof component === "string" && component.trim()
            ? [component.trim()]
            : [];
      if (matrixTargets.length === 0) {
        throw new Error('variantMatrix requires "componentNames" or "component"');
      }

      /** @type {Record<string, Record<string, unknown>>} */
      let matrixOverrides = {};
      if (body.componentOverrides && typeof body.componentOverrides === "object") {
        matrixOverrides = /** @type {Record<string, Record<string, unknown>>} */ (
          body.componentOverrides
        );
      } else if (typeof component === "string" && component.trim() && Object.keys(kvObj).length > 0) {
        matrixOverrides = { [component]: kvObj };
      }

      /** @type {Record<string, unknown>} */
      const mergedComponents = {};
      let lastEngine = engine;
      let duration = 0;
      for (const target of matrixTargets) {
        const params = enriched.componentParams?.[target] ?? [];
        const axes = matrixAxesFromParams(params, enriched.variantCases ?? {});
        const combos = expandVariantMatrixCombos(axes);
        const baseKv = matrixOverrides[target] ?? {};
        for (const combo of combos) {
          const label = formatVariantMatrixLabel(target, combo.labels, axes);
          const outPath = join(
            REPO_ROOT,
            ".tmp",
            `playground-var-${Object.keys(mergedComponents).length}.bake.json`,
          );
          const result = await bakeAndRender({
            repoRoot: REPO_ROOT,
            entry: entryAbs,
            engine,
            mode: "component",
            component: target,
            theme: typeof theme === "string" ? theme : undefined,
            host: typeof host === "string" && host.trim() ? host : undefined,
            hostFacts:
              hostFacts && typeof hostFacts === "object" && !Array.isArray(hostFacts)
                ? hostFacts
                : undefined,
            paramOverrides: { ...baseKv, ...combo.kv },
            bakeOutPath: outPath,
            title: "PDL Playground · variants",
            singleComponent: target,
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
          const tree = baked?.components?.[target];
          if (tree) mergedComponents[label] = tree;
        }
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
        title:
          matrixTargets.length === 1
            ? `Variants — ${matrixTargets[0]}`
            : `Variants — ${matrixTargets.length} components`,
        componentNames: Object.keys(mergedComponents),
        usageByComponent: enriched.usageByComponent,
        rulesByComponent: enriched.rulesByComponent,
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
      host: typeof host === "string" && host.trim() ? host : undefined,
      hostFacts:
        hostFacts && typeof hostFacts === "object" && !Array.isArray(hostFacts)
          ? hostFacts
          : undefined,
      paramOverrides: componentParamOverrides,
      presenterPins:
        typeof component === "string" &&
        body.presenterPinsByComponent &&
        typeof body.presenterPinsByComponent === "object" &&
        !Array.isArray(body.presenterPinsByComponent)
          ? /** @type {Record<string, Record<string, unknown>>} */ (body.presenterPinsByComponent)[
              component
            ]
          : body.presenterPins && typeof body.presenterPins === "object"
            ? body.presenterPins
            : undefined,
      presenterPinsByComponent:
        body.presenterPinsByComponent &&
        typeof body.presenterPinsByComponent === "object" &&
        !Array.isArray(body.presenterPinsByComponent)
          ? /** @type {Record<string, Record<string, unknown>>} */ (body.presenterPinsByComponent)
          : undefined,
      bakeOutPath,
      title: "PDL Playground preview",
      singleComponent:
        mode === "component" && typeof component === "string"
          ? component
          : typeof body.singleComponent === "string"
            ? body.singleComponent
            : undefined,
      componentNames,
      interactiveHost: wantInteractive && mode !== "pack" && !bakeOnly,
      interactionsByComponent: enriched.interactionsByComponent,
      usageByComponent: enriched.usageByComponent,
      rulesByComponent: enriched.rulesByComponent,
      componentOverrides: mode === "system" ? componentOverrides : undefined,
      bakeOnly,
    });
    if (!result.ok) {
      return {
        ok: false,
        error: result.error ?? "Bake failed",
        engine: result.engine,
        durationMs: result.durationMs,
      };
    }

    // Hot-path IR reconcile: return bake scene graph only (no HTML / dual-bake).
    // Still send the catalogue — pose/duration edits do not change rest-pose IR,
    // so the iframe host must replace `interactions` without a srcdoc remount.
    if (bakeOnly) {
      return {
        ok: true,
        baked: result.baked ?? null,
        engine: result.engine,
        durationMs: result.durationMs,
        components: Object.keys(
          /** @type {{ components?: object }} */ (result.baked)?.components ?? {},
        ),
        interactionsByComponent: enriched.interactionsByComponent ?? {},
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
    const fixtureControlsByComponent = buildFixtureControlsByComponent(
      enriched,
      previewNames,
      body.activeFixturesByComponent && typeof body.activeFixturesByComponent === "object"
        ? /** @type {Record<string, string | null>} */ (body.activeFixturesByComponent)
        : {},
    );

    // Nested/top-level chrome: instance resolve (playground) or owner rebake.
    // Dual-bake stateTrees / instanceStateTrees retired (Phase 2).
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
        hostChrome: body.hostChrome === "device" ? "device" : undefined,
        interactionsByComponent: enriched.interactionsByComponent,
        emitCapturesByComponent: enriched.emitCapturesByComponent,
        usageByComponent: enriched.usageByComponent,
        rulesByComponent: enriched.rulesByComponent,
        editableTypeDefaults: editableTypeDefaultsFromEnriched(enriched),
        paramControlsByComponent,
        fixtureControlsByComponent,
        componentRolesByComponent: componentRolesFromEnriched(enriched),
        componentSourcesByComponent,
      });
      html = rerender.html;
      return {
        ...enriched,
        html,
        // Hot-path IR reconcile: bake scene graph without forcing srcdoc remount.
        baked: result.baked ?? null,
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
  /** @type {string[] | undefined} */
  const componentNames = Array.isArray(body.componentNames)
    ? body.componentNames.map(String).filter(Boolean)
    : undefined;
  const wantInteractive = body.interactiveHost !== false;

  /** @type {Record<string, unknown> | undefined} */
  let interactionsByComponent =
    body.interactionsByComponent && typeof body.interactionsByComponent === "object"
      ? /** @type {Record<string, unknown>} */ (body.interactionsByComponent)
      : undefined;
  /** @type {Record<string, unknown> | undefined} */
  let emitCapturesByComponent =
    body.emitCapturesByComponent && typeof body.emitCapturesByComponent === "object"
      ? /** @type {Record<string, unknown>} */ (body.emitCapturesByComponent)
      : undefined;

  // WASM bake is IR-only — enrich host/emit decls + dual-bake pointer chrome from the
  // workspace so Edit/press and hover backgrounds match the Rust CLI path.
  /** @type {string | undefined} */
  let tmp;
  try {
    /** @type {object | null} */
    let enriched = null;
    /** @type {string | undefined} */
    let entryAbs;
    if (wantInteractive && typeof body.entry === "string" && body.entry.trim()) {
      const useDisk = body.diskRoot === true;
      /** @type {string} */
      let summaryRoot;
      if (useDisk) {
        entryAbs = resolveRepoPath(REPO_ROOT, body.entry);
        assertUnderRepo(entryAbs);
        summaryRoot = dirname(entryAbs);
      } else {
        if (!body.files || typeof body.files !== "object") {
          throw new Error('interactive WASM HTML needs "files" (or diskRoot: true)');
        }
        assertSafeRelativePath(body.entry);
        tmp = mkdtempSync(join(tmpdir(), "pdl-playground-wasm-"));
        writeWorkspace(tmp, body.files);
        entryAbs = resolve(tmp, body.entry);
        summaryRoot = tmp;
      }
      enriched = await enrichDesignAt(entryAbs, summaryRoot);
      interactionsByComponent = {
        ...(interactionsByComponent ?? {}),
        ...(enriched.interactionsByComponent ?? {}),
      };
      emitCapturesByComponent = {
        ...(emitCapturesByComponent ?? {}),
        ...(enriched.emitCapturesByComponent ?? {}),
      };
    }

    const previewNames =
      componentNames?.length > 0
        ? componentNames
        : component
          ? [component]
          : Object.keys(/** @type {{ components?: object }} */ (bake)?.components ?? {});

    /** @type {Record<string, Record<string, unknown>>} */
    let componentOverrides = {};
    if (body.componentOverrides && typeof body.componentOverrides === "object") {
      componentOverrides = /** @type {Record<string, Record<string, unknown>>} */ (
        body.componentOverrides
      );
    } else if (
      component &&
      body.kv &&
      typeof body.kv === "object" &&
      !Array.isArray(body.kv)
    ) {
      componentOverrides = {
        [component]: /** @type {Record<string, unknown>} */ (body.kv),
      };
    }

    const paramControlsByComponent =
      enriched != null
        ? buildParamControlsByComponent(enriched, previewNames, componentOverrides)
        : body.paramControlsByComponent && typeof body.paramControlsByComponent === "object"
          ? /** @type {Record<string, Array<{ name: string; typeName: string; value: string; cases?: string[] }>>} */ (
              body.paramControlsByComponent
            )
          : undefined;
    const fixtureControlsByComponent =
      enriched != null
        ? buildFixtureControlsByComponent(
            enriched,
            previewNames,
            body.activeFixturesByComponent && typeof body.activeFixturesByComponent === "object"
              ? /** @type {Record<string, string | null>} */ (body.activeFixturesByComponent)
              : {},
          )
        : body.fixtureControlsByComponent && typeof body.fixtureControlsByComponent === "object"
          ? /** @type {Record<string, { labels: string[]; active?: string | null }>} */ (
              body.fixtureControlsByComponent
            )
          : undefined;

    // Dual-bake chrome retired — nested paint uses instance resolve in the playground.
    const { html, renderFailures } = renderBakedDesignToHtmlDocumentWithReport(bake, {
      title: "PDL Playground preview (WASM bake)",
      singleComponent: component,
      componentNames,
      interactiveHost: wantInteractive,
      hostChrome: body.hostChrome === "device" ? "device" : undefined,
      interactionsByComponent,
      emitCapturesByComponent,
      usageByComponent: enriched?.usageByComponent,
      rulesByComponent: enriched?.rulesByComponent,
      editableTypeDefaults: editableTypeDefaultsFromEnriched(enriched),
      paramControlsByComponent,
      fixtureControlsByComponent,
      componentRolesByComponent:
        enriched != null
          ? componentRolesFromEnriched(enriched)
          : body.componentRolesByComponent && typeof body.componentRolesByComponent === "object"
            ? /** @type {Record<string, string>} */ (body.componentRolesByComponent)
            : undefined,
    });
    return {
      ok: true,
      html,
      // Hot-path IR reconcile fallback (same bake the WASM client already has).
      baked: bake,
      renderFailures,
      engine: "wasm",
    };
  } finally {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
  }
}

function serveStatic(pathname, res) {
  const mapped =
    pathname === "/device" || pathname === "/device/" ? "/device.html" : pathname;
  const safe = mapped === "/" ? "index.html" : mapped.replace(/^\//, "");
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
    if (safe === "device.html" || safe === "index.html") {
      const jsName = safe === "device.html" ? "device-app.js" : "playground-app.js";
      let v = Date.now();
      try {
        v = Math.round(statSync(resolve(STATIC_DIR, jsName)).mtimeMs);
      } catch {
        /* keep Date.now() */
      }
      const html = buf
        .toString("utf8")
        .replace(`src="/${jsName}"`, `src="/${jsName}?v=${v}"`);
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

function isLoopback(addr) {
  const a = String(addr ?? "");
  return a === "127.0.0.1" || a === "::1" || a.endsWith("::1") || a.includes("127.0.0.1");
}

function isMobileUa(ua) {
  return /iPhone|iPad|iPod|Android/i.test(String(ua ?? ""));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const pathname = url.pathname;
  const remote = req.socket.remoteAddress ?? "";
  if (!isLoopback(remote)) {
    console.log(`  ${req.method} ${pathname} ← ${remote}`);
  }

  if (req.method === "GET" && pathname === "/" && isMobileUa(req.headers["user-agent"])) {
    res.writeHead(302, { Location: "/device" });
    res.end();
    return;
  }

  if (req.method === "GET" && pathname === "/api/catalog") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(handleCatalog()));
    return;
  }

  if (req.method === "GET" && pathname === "/api/lan") {
    const bound = /** @type {import("node:net").AddressInfo | null} */ (server.address());
    const port = bound?.port ?? DEFAULT_FIRST_PORT;
    const info = lanInfo(port);
    const firstLan = info.device.lan[0];
    if (firstLan) {
      try {
        const png = await qrPngBuffer(firstLan);
        info.device.qrDataUrl = `data:image/png;base64,${png.toString("base64")}`;
      } catch {
        /* /api/qr still available after qrcode is installed */
      }
    }
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(info));
    return;
  }

  if (req.method === "GET" && pathname === "/api/stage") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(handleGetStage()));
    return;
  }

  if (req.method === "GET" && pathname === "/api/qr") {
    const bound = /** @type {import("node:net").AddressInfo | null} */ (server.address());
    const port = bound?.port ?? DEFAULT_FIRST_PORT;
    const info = lanInfo(port);
    const raw = url.searchParams.get("u") ?? "";
    const allowed = new Set([info.device.local, ...info.device.lan]);
    if (!allowed.has(raw)) {
      res.writeHead(400);
      res.end("Unknown device URL");
      return;
    }
    try {
      const png = await qrPngBuffer(raw);
      res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "no-store" });
      res.end(png);
    } catch (e) {
      res.writeHead(503);
      res.end(formatErr(e));
    }
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

  if (req.method === "POST" && pathname === "/api/disk-sources") {
    try {
      const body = await readJsonBody(req);
      const out = handleDiskSources(body);
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

  if (req.method === "POST" && pathname === "/api/read") {
    try {
      const body = await readJsonBody(req);
      const out = handleReadFile(body);
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

  if (req.method === "POST" && pathname === "/api/stage") {
    try {
      const body = await readJsonBody(req);
      const out = handlePutStage(body);
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
    const info = lanInfo(p);
    console.log(`PDL Playground`);
    console.log(`  Local   ${info.localhost}`);
    if (info.lan.length === 0) {
      console.log(`  Phone   (no LAN IPv4 — check Wi-Fi; bind is ${HOST})`);
    } else {
      for (const url of info.device.lan) {
        console.log(`  Phone   ${url}`);
      }
    }
    console.log(`  Phase P5 · file canvas · interactive host · /device stage`);
    if (HOST === "0.0.0.0") {
      console.log(`  Same Wi-Fi only (not guest). macOS may prompt to allow Node.`);
    }
    if (!strictPort && p !== DEFAULT_FIRST_PORT) {
      console.error(`(Using ${p} because ${DEFAULT_FIRST_PORT} was busy.)`);
    }
  });
}

listenPlayground();
