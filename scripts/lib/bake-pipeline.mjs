/**
 * Shared bake → HTML pipeline for live preview and playground.
 * Bake IR is the boundary; Rust is the default compiler under test.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * @typedef {'rust' | 'ts'} BakeEngine
 * @typedef {'component' | 'system' | 'pack'} BakeMode
 *
 * @typedef {object} BakeRequest
 * @property {string} repoRoot
 * @property {string} entry Absolute path to entry .pdl
 * @property {BakeEngine} [engine]
 * @property {BakeMode} mode
 * @property {string} [component] Required for mode=component (unless engine fills from pack)
 * @property {string} [pack] Absolute path to injection pack JSON (mode=pack)
 * @property {string} [theme]
 * @property {Record<string, unknown>} [paramOverrides]
 * @property {string} [bakeOutPath] Write bake JSON here (default: <repo>/.tmp/preview.bake.json)
 * @property {string} [title] HTML document title
 * @property {string} [singleComponent] Limit HTML to one component name
 * @property {string[]} [componentNames] Limit HTML gallery to these names
 * @property {boolean} [interactiveHost] Inject hover/press host script
 * @property {Record<string, unknown>} [interactionsByComponent]
 * @property {Record<string, unknown>} [emitCapturesByComponent]
 * @property {Record<string, Record<string, unknown>>} [stateTrees] Extra state bakes per component
 * @property {Record<string, unknown>} [paramControlsByComponent]
 * @property {Record<string, Record<string, unknown>>} [componentOverrides] Per-component bake param overrides
 */

/**
 * @typedef {object} BakeResult
 * @property {boolean} ok
 * @property {BakeEngine} engine
 * @property {BakeMode} mode
 * @property {unknown} [baked]
 * @property {string} [bakePath]
 * @property {string} [html]
 * @property {Array<{ component: string, message: string, stack?: string }>} [renderFailures]
 * @property {string} [error]
 * @property {string} [stderr]
 * @property {number} durationMs
 */

function defaultBakeOut(repoRoot) {
  return join(repoRoot, ".tmp", "preview.bake.json");
}

/**
 * @param {string} repoRoot
 * @returns {string[]}
 */
export function rustPdlArgs(repoRoot) {
  const release = join(repoRoot, "target", "release", "pdl");
  const debug = join(repoRoot, "target", "debug", "pdl");
  if (existsSync(release)) return [release];
  if (existsSync(debug)) return [debug];
  return ["cargo", "run", "-q", "-p", "pdl-cli", "--"];
}

/**
 * @param {Record<string, unknown>} overrides
 * @returns {string[]}
 */
function kvArgs(overrides) {
  const out = [];
  for (const [k, v] of Object.entries(overrides ?? {})) {
    if (v === undefined || v === null) continue;
    // CLI param overrides are scalar `key=value` only. Arrays/objects (e.g. a
    // component's `chips: [SubnavItem]` list) can't be represented and would
    // stringify to "[object Object]", corrupting the bake — skip them so
    // scalar overrides (like currentFilter) still apply against defaults.
    if (typeof v === "object") continue;
    out.push(`${k}=${String(v)}`);
  }
  return out;
}

/**
 * @param {BakeRequest} req
 * @returns {{ cmd: string, args: string[] }}
 */
function buildRustBakeCommand(req) {
  const bin = rustPdlArgs(req.repoRoot);
  const outPath = req.bakeOutPath ?? defaultBakeOut(req.repoRoot);
  /** @type {string[]} */
  const args = [];
  if (req.mode === "system") {
    args.push("bakeSystem", req.entry);
    if (req.theme) args.push("--theme", req.theme);
    args.push("--out", outPath);
  } else if (req.mode === "pack") {
    if (!req.pack) throw new Error('mode "pack" requires pack path');
    args.push("bakePack", req.entry, req.pack, "--out", outPath);
  } else {
    if (!req.component) throw new Error('mode "component" requires component name');
    args.push("bakeComponent", req.entry, req.component);
    if (req.theme) args.push("--theme", req.theme);
    args.push(...kvArgs(req.paramOverrides ?? {}));
    args.push("--out", outPath);
  }
  if (bin.length === 1) {
    return { cmd: bin[0], args };
  }
  return { cmd: bin[0], args: [...bin.slice(1), ...args] };
}

/**
 * @param {string} repoRoot
 */
async function loadTsToolchain(repoRoot) {
  const dist = join(repoRoot, "dist");
  if (!existsSync(join(dist, "loadDesign.js"))) {
    throw new Error(`Missing ${join(dist, "loadDesign.js")}. Run "npm run build" from the repo root.`);
  }
  const load = await import(pathToFileURL(join(dist, "loadDesign.js")).href);
  const bake = await import(pathToFileURL(join(dist, "bakeDesign.js")).href);
  const render = await import(pathToFileURL(join(dist, "renderHtml.js")).href);
  return {
    loadDesign: load.loadDesign,
    buildBakedDesignComponent: bake.buildBakedDesignComponent,
    buildBakedDesignSystem: bake.buildBakedDesignSystem,
    renderBakedDesignToHtmlDocumentWithReport: render.renderBakedDesignToHtmlDocumentWithReport,
  };
}

/**
 * @param {BakeRequest} req
 * @returns {Promise<BakeResult>}
 */
export async function bakeAndRender(req) {
  const started = Date.now();
  const engine = req.engine ?? "rust";
  const bakePath = req.bakeOutPath ?? defaultBakeOut(req.repoRoot);
  mkdirSync(dirname(bakePath), { recursive: true });

  try {
    /** @type {unknown} */
    let baked;
    /** @type {string | undefined} */
    let stderr;

    if (engine === "rust") {
      const { cmd, args } = buildRustBakeCommand({ ...req, bakeOutPath: bakePath });
      const r = spawnSync(cmd, args, {
        cwd: req.repoRoot,
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
      });
      stderr = (r.stderr || "") + (r.status !== 0 && r.stdout ? `\n${r.stdout}` : "");
      if (r.status !== 0) {
        return {
          ok: false,
          engine,
          mode: req.mode,
          bakePath,
          error: (stderr || `Bake failed with exit ${r.status}`).trim(),
          stderr: stderr?.trim() || undefined,
          durationMs: Date.now() - started,
        };
      }
      if (!existsSync(bakePath)) {
        return {
          ok: false,
          engine,
          mode: req.mode,
          error: `Bake succeeded but output missing: ${bakePath}`,
          stderr: stderr?.trim() || undefined,
          durationMs: Date.now() - started,
        };
      }
      baked = JSON.parse(readFileSync(bakePath, "utf8"));
    } else {
      if (req.mode === "pack") {
        return {
          ok: false,
          engine,
          mode: req.mode,
          error: 'TS engine does not support bakePack; use --engine rust (default)',
          durationMs: Date.now() - started,
        };
      }
      const tsBake = await loadTsToolchain(req.repoRoot);
      const design = tsBake.loadDesign(req.entry);
      baked =
        req.mode === "system"
          ? tsBake.buildBakedDesignSystem(design, { theme: req.theme })
          : tsBake.buildBakedDesignComponent(design, {
              componentName: req.component,
              theme: req.theme,
              paramOverrides: req.paramOverrides ?? {},
            });
      writeFileSync(bakePath, JSON.stringify(baked), "utf8");
    }

    const ts = await loadTsToolchain(req.repoRoot);
    const single =
      req.singleComponent ??
      (req.mode === "component" && req.component ? req.component : undefined);

    /** @type {unknown} */
    let bakedDoc = baked;
    if (
      Array.isArray(req.componentNames) &&
      req.componentNames.length > 0 &&
      baked &&
      typeof baked === "object" &&
      /** @type {{ components?: Record<string, unknown> }} */ (baked).components
    ) {
      const src = /** @type {{ components: Record<string, unknown> }} */ (baked);
      /** @type {Record<string, unknown>} */
      const filtered = {};
      for (const n of req.componentNames) {
        if (src.components[n]) filtered[n] = src.components[n];
      }
      bakedDoc = { ...src, components: filtered };
    }

    // Apply per-component param overrides (Playground knobs / in-preview controls).
    const overrides = req.componentOverrides;
    if (
      overrides &&
      typeof overrides === "object" &&
      bakedDoc &&
      typeof bakedDoc === "object"
    ) {
      const doc = /** @type {{ components: Record<string, unknown> }} */ (bakedDoc);
      for (const [compName, ov] of Object.entries(overrides)) {
        if (!ov || typeof ov !== "object" || Object.keys(ov).length === 0) continue;
        const outPath = join(
          dirname(bakePath),
          `override-${compName.replace(/[^\w.-]+/g, "_")}.bake.json`,
        );
        const one = await bakeAndRender({
          repoRoot: req.repoRoot,
          entry: req.entry,
          engine,
          mode: "component",
          component: compName,
          theme: req.theme,
          paramOverrides: /** @type {Record<string, unknown>} */ (ov),
          bakeOutPath: outPath,
          title: "override",
          singleComponent: compName,
          interactiveHost: false,
        });
        if (one.ok && one.baked) {
          const tree =
            /** @type {{ components?: Record<string, unknown> }} */ (one.baked).components?.[
              compName
            ];
          if (tree) {
            doc.components = { ...doc.components, [compName]: tree };
          }
        }
      }
      bakedDoc = doc;
    }

    const { html, renderFailures } = ts.renderBakedDesignToHtmlDocumentWithReport(bakedDoc, {
      singleComponent: single,
      componentNames: req.componentNames,
      title: req.title ?? "PDL preview",
      interactiveHost: req.interactiveHost === true,
      interactionsByComponent: req.interactionsByComponent,
      emitCapturesByComponent: req.emitCapturesByComponent,
      stateTrees: req.stateTrees,
      paramControlsByComponent: req.paramControlsByComponent,
    });

    return {
      ok: true,
      engine,
      mode: req.mode,
      baked: bakedDoc,
      bakePath,
      html,
      renderFailures,
      stderr: stderr?.trim() || undefined,
      durationMs: Date.now() - started,
    };
  } catch (e) {
    return {
      ok: false,
      engine,
      mode: req.mode,
      bakePath,
      error: e instanceof Error ? e.message : String(e),
      durationMs: Date.now() - started,
    };
  }
}

/**
 * Escape text for embedding in HTML.
 * @param {string} text
 */
export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Error / status HTML page for failed bake (never a blank success).
 * @param {{ title?: string, message: string, detail?: string, meta?: string }} opts
 */
export function errorHtmlPage(opts) {
  const title = opts.title ?? "PDL preview — bake failed";
  const detail = opts.detail
    ? `<pre class="detail">${escapeHtml(opts.detail)}</pre>`
    : "";
  const meta = opts.meta ? `<p class="meta">${escapeHtml(opts.meta)}</p>` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
body { margin: 0; padding: 24px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #1a1010; color: #ffc9c9; }
h1 { font-size: 1.1rem; color: #ff8a80; margin: 0 0 12px; }
.msg { white-space: pre-wrap; background: #2a1515; border: 1px solid #5c2b2b; border-radius: 8px; padding: 16px; }
.detail { margin-top: 16px; font-size: 0.8rem; opacity: 0.85; overflow: auto; max-height: 50vh; }
.meta { color: #b89; font-size: 0.8rem; margin-top: 16px; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<pre class="msg">${escapeHtml(opts.message)}</pre>
${detail}
${meta}
</body>
</html>
`;
}

/**
 * Inject SSE livereload client before </body>.
 * @param {string} html
 * @param {number} generation
 */
export function injectLivereload(html, generation) {
  const script = `<script>
(function(){
  var gen=${JSON.stringify(String(generation))};
  var es=new EventSource("/events");
  es.addEventListener("reload",function(ev){
    if(ev.data!==gen) location.reload();
  });
  es.onerror=function(){ /* browser reconnects */ };
})();
</script>`;
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${script}</body>`);
  }
  return html + script;
}

/**
 * Resolve a path against repo root if relative.
 * @param {string} repoRoot
 * @param {string} p
 */
export function resolveRepoPath(repoRoot, p) {
  return resolve(p.startsWith("/") || /^[A-Za-z]:/.test(p) ? p : join(repoRoot, p));
}
