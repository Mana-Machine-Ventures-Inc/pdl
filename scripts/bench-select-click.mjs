#!/usr/bin/env node
/**
 * Benchmark PlaylistComposer select click → update pipeline stages.
 *
 * Measures host sync work, parent rebake (Rust CLI + WASM), TrackRow-only
 * instance-resolve bake, HTML render, and IR reconcile — the real path after
 * pressEnd emit capture.
 */
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Window } from "happy-dom";
import { applyEmitCapture } from "../dist/applyEmitCapture.js";
import { applyInteractionEvent as applyEvent } from "../dist/applyInteractionEvent.js";
import { reconcileBakedInstanceIntoElement } from "../dist/bakeReconcile.js";
import {
  renderBakedDesignToHtmlDocumentWithReport,
  renderFrameForReconcile,
} from "../dist/renderHtml.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ENTRY = path.join(ROOT, "test-fixtures/pdl/systems/playlist-composer-lite/design.pdl");
const PDL = path.join(ROOT, "target/debug/pdl");
const N = 11; // 1 warm + 10 measured
const OUT = path.join(ROOT, "/tmp/pdl-bench-select-click.json");

function stats(samples) {
  const xs = [...samples].sort((a, b) => a - b);
  const sum = xs.reduce((a, b) => a + b, 0);
  const pct = (p) => {
    const i = Math.min(xs.length - 1, Math.max(0, Math.ceil((p / 100) * xs.length) - 1));
    return xs[i];
  };
  return {
    n: xs.length,
    min: xs[0],
    median: pct(50),
    p90: pct(90),
    max: xs[xs.length - 1],
    mean: sum / xs.length,
  };
}

function round(n, d = 2) {
  return Math.round(n * 10 ** d) / 10 ** d;
}

function rustBake(component, overrides = [], { treeOnly = false } = {}) {
  const args = ["bakeComponent", ENTRY, component, ...overrides];
  if (treeOnly) args.push("--tree");
  const t0 = performance.now();
  const r = spawnSync(PDL, args, { encoding: "utf8", cwd: ROOT });
  const ms = performance.now() - t0;
  if (r.status !== 0) throw new Error(r.stderr || `bake ${component} failed`);
  return { ms, json: JSON.parse(r.stdout) };
}

function catalogue() {
  const r = spawnSync(PDL, ["catalogue", ENTRY], { encoding: "utf8", cwd: ROOT });
  if (r.status !== 0) throw new Error(r.stderr || "catalogue failed");
  return JSON.parse(r.stdout);
}

async function loadWasm() {
  const init = (await import("../playground/static/wasm/pdl_wasm.js")).default;
  const { bake_component_sources } = await import("../playground/static/wasm/pdl_wasm.js");
  const wasm = fs.readFileSync(path.join(ROOT, "playground/static/wasm/pdl_wasm_bg.wasm"));
  await init(wasm);
  const dir = path.join(ROOT, "test-fixtures/pdl/systems/playlist-composer-lite");
  const files = {};
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith(".pdl")) {
      const abs = path.resolve(dir, f);
      files[abs] = fs.readFileSync(abs, "utf8");
    }
  }
  const entry = path.resolve(dir, "design.pdl");
  return {
    bake(component, kv) {
      const t0 = performance.now();
      const out = bake_component_sources(
        JSON.stringify(files),
        entry,
        component,
        null,
        kv ? JSON.stringify(kv) : null,
      );
      const ms = performance.now() - t0;
      return { ms, json: JSON.parse(out) };
    },
  };
}

function runMany(label, fn) {
  const all = [];
  for (let i = 0; i < N; i++) {
    all.push(fn());
  }
  const measured = all.slice(1); // drop warm
  return { label, warm: all[0], ...stats(measured), samples: measured.map((x) => round(x)) };
}

async function main() {
  if (!fs.existsSync(PDL)) {
    console.error("missing", PDL, "— run cargo build -p pdl-cli");
    process.exit(1);
  }

  console.error("Warming catalogue…");
  const cat = catalogue();
  const trackDecls = cat.components.TrackRow?.interactions || [];
  const composerCaps = cat.components.PlaylistComposer?.emitCaptures || [];

  // --- 1. Host sync: pressEnd + emit capture ---
  const hostSync = runMany("host_pressEnd_emitCapture", () => {
    const child = {
      title: "Coastal Gear",
      artist: "Relay Club",
      trackId: "coastal",
      mood: "drive",
      selected: false,
      state: "pressed",
    };
    const parent = {
      selectedTrack: "none",
      currentMood: "all",
      status: "idle",
    };
    const t0 = performance.now();
    const ev = applyEvent(child, trackDecls, "pressEnd");
    const cap = applyEmitCapture(
      parent,
      composerCaps,
      "select",
      ["trackId"],
      ev.params,
      "tracks",
    );
    void cap;
    return performance.now() - t0;
  });

  // --- 2. Rust parent rebake (full PlaylistComposer) ---
  console.error("Benchmarking Rust bakeComponent PlaylistComposer…");
  const rustParent = runMany("rust_bake_PlaylistComposer", () => {
    return rustBake("PlaylistComposer", ["selectedTrack=coastal"]).ms;
  });

  // --- 3. Rust TrackRow-only (instance resolve) ---
  console.error("Benchmarking Rust bakeComponent TrackRow…");
  const rustChild = runMany("rust_bake_TrackRow_hover", () => {
    return rustBake("TrackRow", [
      "selected=true",
      "state=hovering",
      "trackId=coastal",
      'title="Coastal Gear"',
      'artist="Relay Club"',
      "mood=drive",
    ]).ms;
  });

  // --- 4. WASM bakes ---
  console.error("Benchmarking WASM…");
  const wasm = await loadWasm();
  const wasmParent = runMany("wasm_bake_PlaylistComposer", () => {
    return wasm.bake("PlaylistComposer", { selectedTrack: "coastal" }).ms;
  });
  const wasmChild = runMany("wasm_bake_TrackRow_hover", () => {
    return wasm.bake("TrackRow", {
      selected: true,
      state: "hovering",
      trackId: "coastal",
      title: "Coastal Gear",
      artist: "Relay Club",
      mood: "drive",
    }).ms;
  });

  // --- 5. HTML render from bake ---
  console.error("Benchmarking HTML render…");
  const bakeIdle = rustBake("PlaylistComposer", ["selectedTrack=none"]).json;
  const bakeSelected = rustBake("PlaylistComposer", ["selectedTrack=coastal"]).json;
  const interactionsByComponent = {};
  const emitCapturesByComponent = {};
  for (const [name, c] of Object.entries(cat.components || {})) {
    if (c.interactions) interactionsByComponent[name] = c.interactions;
    if (c.emitCaptures) emitCapturesByComponent[name] = c.emitCaptures;
  }
  const htmlRender = runMany("html_render_interactive", () => {
    const t0 = performance.now();
    renderBakedDesignToHtmlDocumentWithReport(bakeSelected, {
      title: "t",
      singleComponent: "PlaylistComposer",
      interactiveHost: true,
      interactionsByComponent,
      emitCapturesByComponent,
    });
    return performance.now() - t0;
  });

  // --- 6. IR reconcile instance (TrackRow hover paint) ---
  console.error("Benchmarking IR instance reconcile…");
  const idleRoot = rustBake("TrackRow", [
    "selected=true",
    "state=idle",
    "trackId=coastal",
    'title="Coastal Gear"',
    'artist="Relay Club"',
    "mood=drive",
  ]).json.components.TrackRow.root;
  const hoverRoot = rustBake("TrackRow", [
    "selected=true",
    "state=hovering",
    "trackId=coastal",
    'title="Coastal Gear"',
    'artist="Relay Club"',
    "mood=drive",
  ]).json.components.TrackRow.root;

  const irReconcile = runMany("ir_reconcile_TrackRow", () => {
    const html = renderFrameForReconcile(idleRoot, {
      stackChild: false,
      stackZ: 0,
      omitInstanceAttrs: true,
    });
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `<div class="pdl-instance" data-pdl-instance-let="T">${html}</div>`;
    const wrap = window.document.querySelector("[data-pdl-instance-let=T]");
    const t0 = performance.now();
    reconcileBakedInstanceIntoElement(wrap, idleRoot, hoverRoot, {
      sessionParams: { selected: true, state: "hovering" },
      prevSessionParams: { selected: true, state: "idle" },
    });
    const ms = performance.now() - t0;
    window.close();
    return ms;
  });

  // --- 7. Happy-dom host click (sync only; no playground bake) ---
  console.error("Benchmarking happy-dom host click…");
  const hostClick = runMany("host_happyDom_pressEnd", () => {
    const { html } = renderBakedDesignToHtmlDocumentWithReport(bakeIdle, {
      title: "t",
      singleComponent: "PlaylistComposer",
      interactiveHost: true,
      interactionsByComponent,
      emitCapturesByComponent,
    });
    const window = new Window({ url: "http://localhost/" });
    const document = window.document;
    document.write(html);
    document.close();
    const messages = [];
    window.parent = { postMessage: (p) => messages.push(p) };
    for (const s of [...document.querySelectorAll("script")]) {
      window.eval(s.textContent || "");
    }
    // allow listeners
    const coastal = [...document.querySelectorAll('[data-pdl-instance-of="TrackRow"]')].find(
      (n) => {
        try {
          const kw = JSON.parse(n.getAttribute("data-pdl-instance-kwargs") || "{}");
          return kw.trackId === "coastal" || kw.trackId === ".coastal";
        } catch {
          return false;
        }
      },
    );
    const t0 = performance.now();
    coastal.dispatchEvent(new window.MouseEvent("mousedown", { button: 0, bubbles: true }));
    coastal.dispatchEvent(new window.MouseEvent("mouseup", { button: 0, bubbles: true }));
    const ms = performance.now() - t0;
    window.close();
    return ms;
  });

  // Estimated end-to-end (playground-like)
  const estWasmSelect = {
    host_sync_median: hostSync.median,
    wasm_parent_bake_median: wasmParent.median,
    html_render_median: htmlRender.median,
    // playground often IR-reconciles parent bake without full HTML; use bake as dominant
    estimated_click_to_paint_wasm_ms: round(hostSync.median + wasmParent.median),
    estimated_with_html_fallback_ms: round(hostSync.median + wasmParent.median + htmlRender.median),
  };
  const estRustSelect = {
    host_sync_median: hostSync.median,
    rust_parent_bake_median: rustParent.median,
    estimated_click_to_paint_rust_cli_ms: round(hostSync.median + rustParent.median),
  };
  const estHover = {
    host_sync_approx_ms: hostSync.median, // hoverStart is similar applyEvent cost
    wasm_child_bake_median: wasmChild.median,
    ir_reconcile_median: irReconcile.median,
    estimated_hover_chrome_wasm_ms: round(hostSync.median + wasmChild.median + irReconcile.median),
  };

  const report = {
    meta: {
      when: new Date().toISOString(),
      entry: "test-fixtures/pdl/systems/playlist-composer-lite/design.pdl",
      component: "PlaylistComposer",
      iterations_measured: N - 1,
      machine: process.platform,
      note:
        "Medians over 10 runs after 1 warm-up. Rust times include process spawn for CLI; WASM is in-process.",
    },
    stages: {
      hostSync,
      rustParent,
      rustChild,
      wasmParent,
      wasmChild,
      htmlRender,
      irReconcile,
      hostClick,
    },
    estimates: {
      select_click_parent_rebake_wasm: estWasmSelect,
      select_click_parent_rebake_rust_cli: estRustSelect,
      hover_instance_resolve_wasm: estHover,
    },
  };

  // Round stats for readability
  for (const s of Object.values(report.stages)) {
    for (const k of ["warm", "min", "median", "p90", "max", "mean"]) {
      if (typeof s[k] === "number") s[k] = round(s[k]);
    }
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  // Prefer repo-local out
  const localOut = path.join(ROOT, "tmp-bench-select-click.json");
  fs.writeFileSync(localOut, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.error("Wrote", localOut);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
