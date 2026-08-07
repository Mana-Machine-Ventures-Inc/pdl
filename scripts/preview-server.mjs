#!/usr/bin/env node
/**
 * Live disk-watch preview: Rust bake (default) → HTML host with livereload.
 *
 * Usage:
 *   npm run preview -- <entry.pdl> <Component>
 *   npm run preview -- <entry.pdl> --system
 *   npm run preview -- <entry.pdl> --pack <pack.json>
 *   npm run preview -- <entry.pdl> <Component> --theme Light --engine rust|ts [key=value…]
 *
 * Env:
 *   PREVIEW_PORT   exact port (default: try 3848..3857)
 *   PREVIEW_HOST   bind host (default 127.0.0.1)
 */
import { createServer } from "node:http";
import {
  watch,
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
} from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  bakeAndRender,
  errorHtmlPage,
  injectLivereload,
  resolveRepoPath,
} from "./lib/bake-pipeline.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const HOST = process.env.PREVIEW_HOST || "127.0.0.1";
const DEFAULT_PORT = 3848;
const PORT_SPAN = 10;
const DEBOUNCE_MS = 350;
const WATCH_EXTS = new Set([".pdl", ".json"]);

function usage(code = 1) {
  console.error(`PDL live preview — disk watch → bake → HTML

Usage:
  npm run preview -- <entry.pdl> <ComponentName> [--theme Name] [--engine rust|ts] [key=value…]
  npm run preview -- <entry.pdl> --system [--theme Name] [--engine rust|ts]
  npm run preview -- <entry.pdl> --pack <pack.json> [--engine rust] [--component Name]

Options:
  --system         bakeSystem (all components)
  --pack <path>    bakePack (Rust only)
  --theme <name>   theme for bake
  --engine rust|ts default rust (compiler under test)
  --component <N>  with --pack / --system: limit HTML to one component
  --watch-dir <d>  directory to watch (default: entry's directory, recursive)
  --port <n>       listen port (or PREVIEW_PORT)

Open the printed URL; edit .pdl files and the page reloads after bake.
Bake JSON: .tmp/preview.bake.json
`);
  process.exit(code);
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  if (argv.length < 1 || argv[0] === "-h" || argv[0] === "--help") usage(argv[0] ? 0 : 1);

  const entry = resolveRepoPath(REPO_ROOT, argv[0]);
  /** @type {'component' | 'system' | 'pack'} */
  let mode = "component";
  /** @type {string | undefined} */
  let component;
  /** @type {string | undefined} */
  let pack;
  /** @type {string | undefined} */
  let theme;
  /** @type {'rust' | 'ts'} */
  let engine = "rust";
  /** @type {string | undefined} */
  let singleComponent;
  /** @type {string | undefined} */
  let watchDir;
  /** @type {number | undefined} */
  let port;
  /** @type {Record<string, unknown>} */
  const paramOverrides = {};

  const rest = argv.slice(1);
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--system") {
      mode = "system";
    } else if (a === "--pack") {
      mode = "pack";
      const p = rest[++i];
      if (!p || p.startsWith("-")) usage();
      pack = resolveRepoPath(REPO_ROOT, p);
    } else if (a === "--theme") {
      const t = rest[++i];
      if (!t || t.startsWith("-")) usage();
      theme = t;
    } else if (a === "--engine") {
      const e = rest[++i];
      if (e !== "rust" && e !== "ts") usage();
      engine = e;
    } else if (a === "--component") {
      const c = rest[++i];
      if (!c || c.startsWith("-")) usage();
      singleComponent = c;
    } else if (a === "--watch-dir") {
      const d = rest[++i];
      if (!d || d.startsWith("-")) usage();
      watchDir = resolveRepoPath(REPO_ROOT, d);
    } else if (a === "--port") {
      const p = rest[++i];
      if (!p || p.startsWith("-")) usage();
      port = Number(p);
    } else if (a.includes("=") && !a.startsWith("-")) {
      const eq = a.indexOf("=");
      const k = a.slice(0, eq);
      let v = a.slice(eq + 1);
      if (/^-?\d+(\.\d+)?$/.test(v)) paramOverrides[k] = Number(v);
      else if (v === "true" || v === "false") paramOverrides[k] = v === "true";
      else if (v.startsWith(".")) paramOverrides[k] = v.slice(1);
      else paramOverrides[k] = v;
    } else if (!a.startsWith("-") && mode === "component" && !component) {
      component = a;
    } else {
      console.error(`Unknown argument: ${a}`);
      usage();
    }
  }

  if (mode === "component" && !component) {
    console.error("Component name required (or use --system / --pack).");
    usage();
  }
  if (mode === "pack" && !pack) {
    console.error("--pack requires a pack.json path.");
    usage();
  }
  if (!existsSync(entry)) {
    console.error(`Entry not found: ${entry}`);
    process.exit(1);
  }
  if (pack && !existsSync(pack)) {
    console.error(`Pack not found: ${pack}`);
    process.exit(1);
  }

  return {
    entry,
    mode,
    component,
    pack,
    theme,
    engine,
    singleComponent,
    watchDir: watchDir ?? dirname(entry),
    port,
    paramOverrides,
  };
}

const opts = parseArgs(process.argv.slice(2));
const bakeOutPath = join(REPO_ROOT, ".tmp", "preview.bake.json");
const htmlOutPath = join(REPO_ROOT, ".tmp", "preview.html");
mkdirSync(join(REPO_ROOT, ".tmp"), { recursive: true });

/** @type {string} */
let currentHtml = errorHtmlPage({
  message: "Building first preview…",
  title: "PDL preview — starting",
});
/** @type {number} */
let generation = 0;
/** @type {Set<import('node:http').ServerResponse>} */
const sseClients = new Set();
/** @type {ReturnType<typeof setTimeout> | null} */
let rebuildTimer = null;
let rebuilding = false;
let rebuildQueued = false;

function broadcastReload() {
  const data = `event: reload\ndata: ${generation}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(data);
    } catch {
      sseClients.delete(res);
    }
  }
}

/**
 * @param {string} reason
 */
async function rebuild(reason) {
  if (rebuilding) {
    rebuildQueued = true;
    return;
  }
  rebuilding = true;
  const label = relative(REPO_ROOT, opts.entry) || opts.entry;
  console.log(`[preview] bake (${opts.engine}/${opts.mode}) — ${reason}`);
  const result = await bakeAndRender({
    repoRoot: REPO_ROOT,
    entry: opts.entry,
    engine: opts.engine,
    mode: opts.mode,
    component: opts.component,
    pack: opts.pack,
    theme: opts.theme,
    paramOverrides: opts.paramOverrides,
    bakeOutPath,
    title: `PDL preview — ${label}`,
    singleComponent: opts.singleComponent,
  });

  generation += 1;
  if (!result.ok) {
    console.error(`[preview] FAIL (${result.durationMs}ms)\n${result.error}`);
    currentHtml = injectLivereload(
      errorHtmlPage({
        title: "PDL preview — bake failed",
        message: result.error ?? "Unknown bake error",
        detail: result.stderr,
        meta: `${opts.engine} · ${opts.mode} · ${label} · gen ${generation}`,
      }),
      generation,
    );
  } else {
    const failN = result.renderFailures?.length ?? 0;
    console.log(
      `[preview] OK ${result.durationMs}ms → ${relative(REPO_ROOT, bakeOutPath)}` +
        (failN ? ` (${failN} HTML render failure(s))` : ""),
    );
    if (result.renderFailures?.length) {
      for (const f of result.renderFailures) {
        console.error(`  HTML ${f.component}: ${f.message}`);
      }
    }
    currentHtml = injectLivereload(result.html ?? "", generation);
    writeFileSync(htmlOutPath, result.html ?? "", "utf8");
  }
  writeFileSync(join(REPO_ROOT, ".tmp", "preview.last.html"), currentHtml, "utf8");
  broadcastReload();
  rebuilding = false;
  if (rebuildQueued) {
    rebuildQueued = false;
    void rebuild("queued");
  }
}

/**
 * @param {string} reason
 */
function scheduleRebuild(reason) {
  if (rebuildTimer) clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    rebuildTimer = null;
    void rebuild(reason);
  }, DEBOUNCE_MS);
}

/**
 * Watch a directory for .pdl / .json changes.
 * Prefers one recursive watcher; on EMFILE / failure, watches individual files.
 * @param {string} dir
 * @param {(ev: string, file: string) => void} onChange
 * @param {string[]} [extraFiles] Absolute paths always watched (entry, pack)
 * @returns {() => void}
 */
function watchTree(dir, onChange, extraFiles = []) {
  /** @type {import('node:fs').FSWatcher[]} */
  const watchers = [];

  /**
   * @param {import('node:fs').FSWatcher} w
   */
  function track(w) {
    w.on("error", (err) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[preview] watch error:`, msg);
      if (String(/** @type {NodeJS.ErrnoException} */ (err).code) === "EMFILE") {
        console.error(
          `[preview] too many watchers — falling back to entry/pack file watch only`,
        );
        for (const x of watchers) {
          try {
            x.close();
          } catch {
            /* ignore */
          }
        }
        watchers.length = 0;
        for (const f of extraFiles) {
          watchFile(f);
        }
      }
    });
    watchers.push(w);
  }

  /**
   * @param {string} file
   */
  function watchFile(file) {
    if (!file || !existsSync(file)) return;
    try {
      const w = watch(file, { persistent: true }, (eventType) => {
        onChange(eventType, file);
      });
      track(w);
    } catch (e) {
      console.error(`[preview] file watch failed for ${file}:`, e instanceof Error ? e.message : e);
    }
  }

  try {
    const w = watch(dir, { recursive: true, persistent: true }, (eventType, filename) => {
      if (!filename) {
        onChange(eventType, dir);
        return;
      }
      const full = join(dir, filename.toString());
      const lower = full.toLowerCase();
      const ext = lower.includes(".") ? lower.slice(lower.lastIndexOf(".")) : "";
      if (WATCH_EXTS.has(ext) || eventType === "rename") {
        onChange(eventType, full);
      }
    });
    track(w);
  } catch (e) {
    console.error(
      `[preview] recursive watch unavailable (${e instanceof Error ? e.message : e}); watching files only`,
    );
    for (const f of extraFiles) watchFile(f);
  }

  return () => {
    for (const w of watchers) {
      try {
        w.close();
      } catch {
        /* ignore */
      }
    }
  };
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${HOST}`);
  if (req.method === "GET" && url.pathname === "/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    });
    res.write(`event: hello\ndata: ${generation}\n\n`);
    sseClients.add(res);
    req.on("close", () => sseClients.delete(res));
    return;
  }
  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(currentHtml);
    return;
  }
  if (req.method === "GET" && url.pathname === "/bake.json") {
    try {
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(readFileSync(bakeOutPath, "utf8"));
    } catch {
      res.writeHead(404);
      res.end("No bake yet");
    }
    return;
  }
  res.writeHead(404);
  res.end("Not found");
});

function listen() {
  const envPort = process.env.PREVIEW_PORT;
  const strict = envPort !== undefined && envPort !== "";
  const preferred = opts.port ?? (strict ? Number(envPort) : DEFAULT_PORT);
  if (!Number.isInteger(preferred) || preferred < 1 || preferred > 65535) {
    console.error(`Invalid port: ${preferred}`);
    process.exit(1);
  }
  const maxTries = strict || opts.port !== undefined ? 1 : PORT_SPAN;
  let attempt = 0;

  server.on("error", (err) => {
    if (/** @type {NodeJS.ErrnoException} */ (err).code !== "EADDRINUSE") {
      console.error(err);
      process.exit(1);
    }
    attempt += 1;
    if (attempt >= maxTries) {
      console.error(
        `Port ${preferred + attempt - 1} in use. Set PREVIEW_PORT=… or --port.`,
      );
      process.exit(1);
    }
    const next = preferred + attempt;
    console.error(`Port ${preferred + attempt - 1} busy, trying ${next}…`);
    server.listen(next, HOST);
  });

  server.listen(preferred, HOST, () => {
    const bound = /** @type {import("node:net").AddressInfo} */ (server.address());
    const p = bound?.port ?? preferred;
    console.log(`PDL preview at http://${HOST}:${p}`);
    console.log(`  entry:  ${relative(REPO_ROOT, opts.entry)}`);
    console.log(`  engine: ${opts.engine} · mode: ${opts.mode}`);
    console.log(`  watch:  ${relative(REPO_ROOT, opts.watchDir) || opts.watchDir}`);
    console.log(`  bake:   ${relative(REPO_ROOT, bakeOutPath)}`);
    const watchFiles = [opts.entry, opts.pack].filter(Boolean);
    const stopWatch = watchTree(
      opts.watchDir,
      (_ev, file) => {
        scheduleRebuild(relative(REPO_ROOT, file) || file);
      },
      watchFiles,
    );
    // Pack may live outside the entry tree (e.g. packs/ sibling). Skip if already under watchDir.
    let stopPackWatch = () => {};
    if (opts.pack) {
      const packDir = dirname(opts.pack);
      const relToWatch = relative(opts.watchDir, packDir);
      const underWatch =
        packDir === opts.watchDir || (!relToWatch.startsWith("..") && relToWatch !== "");
      if (!underWatch) {
        stopPackWatch = watchTree(
          packDir,
          (_ev, file) => {
            scheduleRebuild(relative(REPO_ROOT, file) || file);
          },
          [opts.pack],
        );
      }
    }
    process.on("SIGINT", () => {
      stopWatch();
      stopPackWatch();
      process.exit(0);
    });
    void rebuild("startup");
  });
}

listen();
