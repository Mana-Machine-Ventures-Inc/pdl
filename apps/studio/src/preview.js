import { loadWasmBake, virtualizeSources } from "@playground/wasm-bake.js";
import { applyPreviewHtml } from "@playground/preview-apply.js";
import { state, emit } from "./state.js";
import { diskSources, renderFromBake } from "./api.js";
import { symbolsInFile } from "./symbols.js";
import { flushEditorToFiles } from "./editor.js";

/** @type {HTMLIFrameElement | null} */
let frame = null;
let renderSeq = 0;
let debounceTimer = 0;
/** @type {((msg: string) => void) | null} */
let onStatus = null;
/** @type {((err: string | null) => void) | null} */
let onError = null;

export function mountPreview(iframe, handlers = {}) {
  frame = iframe;
  onStatus = handlers.onStatus ?? null;
  onError = handlers.onError ?? null;

  document.getElementById("previewPin")?.addEventListener("change", (e) => {
    state.previewPinned = /** @type {HTMLInputElement} */ (e.target).checked;
    emit();
  });

  document.querySelectorAll("[data-preview-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-preview-mode");
      state.previewMode = mode === "gallery" ? "gallery" : "primary";
      document.querySelectorAll("[data-preview-mode]").forEach((b) => {
        b.classList.toggle("is-active", b === btn);
      });
      schedulePreview();
    });
  });

  document.getElementById("themeSelect")?.addEventListener("change", (e) => {
    state.theme = /** @type {HTMLSelectElement} */ (e.target).value;
    schedulePreview();
  });

  document.getElementById("btnResetWorld")?.addEventListener("click", () => {
    const root = state.previewRoot;
    if (root) {
      state.activeWorld[root] = null;
      state.paramOverrides[root] = {};
    }
    emit();
    schedulePreview();
  });
}

export function schedulePreview(ms = 280) {
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    void runPreview();
  }, ms);
}

export async function runPreview() {
  const id = ++renderSeq;
  if (!state.root || !state.entry || !frame) return;
  const previewRoot = state.previewRoot;
  if (!previewRoot && state.previewMode === "primary") {
    onStatus?.("Select a component to preview");
    return;
  }

  flushEditorToFiles();
  onError?.(null);
  onStatus?.("Baking…");

  try {
    const wasm = await loadWasmBake();
    if (!wasm) {
      throw new Error("WASM bake unavailable — run npm run build:wasm");
    }

    // Merge disk import closure with editor overlays.
    const disk = await diskSources(state.root, state.entry);
    const sourceFiles = { ...(disk.files ?? {}), ...state.files };
    const { filesJson, entry: virtEntry } = virtualizeSources(sourceFiles, state.entry);

    const theme = state.theme || "";
    const hasHost = (state.catalogue?.hostParams?.length ?? 0) > 0;
    const host = hasHost ? "Default" : "";
    const hostFacts = JSON.stringify(hasHost ? state.hostFacts ?? {} : {});

    /** @type {string[] | undefined} */
    let componentNames;
    /** @type {string | undefined} */
    let component;

    if (state.previewMode === "gallery" && state.editFile) {
      componentNames = symbolsInFile(state.editFile, state.files, state.catalogue);
      if (!componentNames.length && previewRoot) componentNames = [previewRoot];
    } else {
      component = previewRoot || undefined;
    }

    const t0 = performance.now();
    let bake;
    if (componentNames && componentNames.length > 1) {
      // Bake each and merge component maps (simple gallery).
      /** @type {object} */
      const merged = { components: {} };
      for (const name of componentNames) {
        const kv = bakeKv(state.paramOverrides[name] ?? {});
        const pins = undefined;
        const bakeJson = wasm.bake_component_sources(
          filesJson,
          virtEntry,
          name,
          theme,
          JSON.stringify(kv),
          host,
          hostFacts,
          pins,
        );
        const one = JSON.parse(bakeJson);
        Object.assign(merged.components, one.components ?? {});
        if (!merged.tokens) Object.assign(merged, { ...one, components: merged.components });
      }
      bake = merged;
    } else {
      const name = component || componentNames?.[0];
      if (!name) {
        onStatus?.("Nothing to preview");
        return;
      }
      const kv = bakeKv(state.paramOverrides[name] ?? {});
      const bakeJson = wasm.bake_component_sources(
        filesJson,
        virtEntry,
        name,
        theme,
        JSON.stringify(kv),
        host,
        hostFacts,
        undefined,
      );
      bake = JSON.parse(bakeJson);
      component = name;
      componentNames = undefined;
    }

    const bakeMs = Math.round(performance.now() - t0);
    if (id !== renderSeq) return;

    const activeFixtures = {};
    if (component && state.activeWorld[component]) {
      activeFixtures[component] = state.activeWorld[component];
    }
    if (componentNames) {
      for (const n of componentNames) {
        if (state.activeWorld[n]) activeFixtures[n] = state.activeWorld[n];
      }
    }

    const data = await renderFromBake({
      bake,
      component,
      componentNames,
      interactiveHost: true,
      root: state.root,
      entry: state.entry,
      files: state.files,
      activeFixturesByComponent: activeFixtures,
      componentOverrides: state.paramOverrides,
      hostChrome: state.mode === "prototype" ? "device" : undefined,
    });
    if (id !== renderSeq) return;
    if (!data.ok) throw new Error(data.error || "render-from-bake failed");

    applyHtml(data.html);
    onStatus?.(`Preview · wasm · bake ${bakeMs}ms`);
    onError?.(null);
  } catch (err) {
    if (id !== renderSeq) return;
    const msg = err instanceof Error ? err.message : String(err);
    onError?.(msg);
    onStatus?.("Preview failed");
  }
}

function applyHtml(html) {
  if (!frame) return;
  const doc = frame.contentDocument;
  if (doc && doc.documentElement && doc.body?.querySelector?.(".pdl-root, .pdl-page, [data-pdl-id]")) {
    try {
      applyPreviewHtml(doc, html);
      return;
    } catch {
      /* fall through */
    }
  }
  frame.srcdoc = html;
}

function bakeKv(overrides) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(overrides ?? {})) {
    if (v === undefined || v === null) continue;
    if (typeof v === "object") continue;
    out[k] = v;
  }
  return out;
}

export function fillThemes() {
  const sel = document.getElementById("themeSelect");
  if (!sel) return;
  const themes = state.catalogue?.themes ?? [];
  sel.innerHTML =
    `<option value="">Default</option>` +
    themes.map((t) => `<option value="${t}">${t}</option>`).join("");
  sel.value = state.theme || "";
}

export function fillHostChrome() {
  const el = document.getElementById("hostChrome");
  if (!el) return;
  const params = state.catalogue?.hostParams ?? [];
  if (!params.length) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  el.hidden = false;
  el.innerHTML = params
    .map((p) => {
      const cases = Array.isArray(p.cases) ? p.cases : [];
      return `<label>${escapeHtml(p.name)} <select data-host="${escapeAttr(p.name)}"><option value="">Auto</option>${cases
        .map((c) => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`)
        .join("")}</select></label>`;
    })
    .join("");
  el.querySelectorAll("select").forEach((sel) => {
    sel.addEventListener("change", () => {
      const key = sel.getAttribute("data-host");
      if (!key) return;
      if (!sel.value) delete state.hostFacts[key];
      else state.hostFacts[key] = sel.value.startsWith(".") ? sel.value : `.${sel.value}`;
      schedulePreview();
    });
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}
