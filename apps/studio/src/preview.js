import { loadWasmBake, virtualizeSources } from "@playground/wasm-bake.js";
import { applyPreviewHtml, requestInteractiveRebind } from "@playground/preview-apply.js";
import { state, emit } from "./state.js";
import { diskSources, renderFromBake } from "./api.js";
import { symbolsInFile } from "./symbols.js";
import { flushEditorToFiles } from "./editor.js";
import { renderSelectionInspector } from "./inspector.js";

/** @type {HTMLIFrameElement | null} */
let frame = null;
let renderSeq = 0;
let debounceTimer = 0;
/** @type {((msg: string) => void) | null} */
let onStatus = null;
/** @type {((err: string | null) => void) | null} */
let onError = null;
/** @type {((component: string) => void) | null} */
let onOpenSource = null;
/** @type {(() => void) | null} */
let onWorldMutated = null;

export function mountPreview(iframe, handlers = {}) {
  frame = iframe;
  onStatus = handlers.onStatus ?? null;
  onError = handlers.onError ?? null;
  onOpenSource = handlers.onOpenSource ?? null;
  onWorldMutated = handlers.onWorldMutated ?? null;

  window.addEventListener("message", (ev) => {
    const data = ev.data;
    if (!data || typeof data !== "object") return;
    handlePreviewMessage(data);
  });

  document.getElementById("previewPin")?.addEventListener("change", (e) => {
    state.previewPinned = /** @type {HTMLInputElement} */ (e.target).checked;
    emit();
  });

  document.querySelectorAll("[data-preview-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-preview-mode");
      state.previewMode = mode === "gallery" ? "gallery" : "primary";
      syncPreviewModeChrome();
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
    state.worldMode = "fixtures";
    emit();
    onWorldMutated?.();
    schedulePreview();
  });
}

/**
 * @param {Record<string, unknown>} data
 */
function handlePreviewMessage(data) {
  const type = data.type;
  if (type === "pdl-open-source" && typeof data.component === "string" && data.component) {
    onOpenSource?.(data.component);
    return;
  }
  if (type === "pdl-world-mode" && (data.mode === "fixtures" || data.mode === "params")) {
    state.worldMode = data.mode;
    emit();
    onWorldMutated?.();
    return;
  }
  if (type === "pdl-fixture" && typeof data.component === "string" && data.component) {
    applyFixtureFromPreview(
      data.component,
      typeof data.label === "string" && data.label.trim() ? String(data.label) : null,
    );
    return;
  }
  if (type === "pdl-param" && typeof data.component === "string" && data.kv && typeof data.kv === "object") {
    applyParamsFromPreview(data.component, /** @type {Record<string, unknown>} */ (data.kv));
    return;
  }
}

/**
 * @param {string} component
 * @param {string | null} label
 */
function applyFixtureFromPreview(component, label) {
  const fixtures = state.catalogue?.fixturesByComponent?.[component] ?? {};
  state.selectedKind = "component";
  if (!state.previewPinned) state.previewRoot = component;
  state.selectedSymbol = component;
  state.worldMode = "fixtures";
  if (label && fixtures[label]) {
    state.activeWorld[component] = label;
    state.paramOverrides[component] = {
      ...flattenScalars(fixtures[label]),
    };
  } else {
    state.activeWorld[component] = null;
    state.paramOverrides[component] = {};
  }
  emit();
  onWorldMutated?.();
  schedulePreview(0);
}

/**
 * @param {string} component
 * @param {Record<string, unknown>} kv
 */
function applyParamsFromPreview(component, kv) {
  state.selectedKind = "component";
  if (!state.previewPinned) state.previewRoot = component;
  state.selectedSymbol = component;
  // Param edits leave fixture mode (same contract as Playground).
  state.activeWorld[component] = null;
  state.worldMode = "params";
  state.paramOverrides[component] = normalizeParamKv(component, kv);
  emit();
  onWorldMutated?.();
  schedulePreview(0);
}

/**
 * @param {string} component
 * @param {Record<string, unknown>} kv
 */
function normalizeParamKv(component, kv) {
  const params = state.catalogue?.componentParams?.[component] ?? [];
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, raw] of Object.entries(kv ?? {})) {
    if (raw === undefined || raw === null) continue;
    if (typeof raw === "object") continue;
    let v = raw;
    const p = params.find((x) => x.name === k);
    const cases = p ? state.catalogue?.variantCases?.[p.typeName] : undefined;
    if (typeof v === "string") {
      if (Array.isArray(cases) && cases.includes(v.replace(/^\./, ""))) {
        v = `.${v.replace(/^\./, "")}`;
      } else if (v === "true") v = true;
      else if (v === "false") v = false;
      else if (v !== "" && !Number.isNaN(Number(v)) && /^-?\d+(\.\d+)?$/.test(v)) v = Number(v);
    }
    out[k] = v;
  }
  return out;
}

function flattenScalars(bag) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(bag ?? {})) {
    if (v === null || v === undefined) continue;
    if (typeof v === "object") continue;
    out[k] = v;
  }
  return out;
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

  const scope = renderSelectionInspector();
  if (scope.handled) {
    onError?.(null);
    onStatus?.(scope.status || "Inspector");
    return;
  }

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
      // Keep cursor-selected component first so World/knobs match focus.
      if (previewRoot && componentNames.includes(previewRoot)) {
        componentNames = [
          previewRoot,
          ...componentNames.filter((n) => n !== previewRoot),
        ];
      }
    } else {
      component = previewRoot || undefined;
    }

    const t0 = performance.now();
    let bake;
    if (componentNames && componentNames.length > 1) {
      // Bake each and merge component maps (file gallery).
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
      if (componentNames?.length === 1) {
        component = undefined;
      } else {
        component = name;
        componentNames = undefined;
      }
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

    const galleryCount = Array.isArray(componentNames) ? componentNames.length : 0;

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
      worldMode: state.worldMode,
    });
    if (id !== renderSeq) return;
    if (!data.ok) throw new Error(data.error || "render-from-bake failed");

    applyHtml(data.html);
    highlightPreviewComponent(state.selectedSymbol || state.previewRoot);
    onStatus?.(
      galleryCount > 1
        ? `Preview · file gallery · ${galleryCount} · bake ${bakeMs}ms`
        : `Preview · wasm · bake ${bakeMs}ms`,
    );
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
      const patched = applyPreviewHtml(doc, html);
      if (patched) {
        // Preserve Studio's fixtures|params mode across incremental morphs.
        doc.querySelectorAll("section.pdl-preview").forEach((sec) => {
          sec.setAttribute("data-world-mode", state.worldMode);
          sec.querySelectorAll(".pdl-world-mode [data-world-mode]").forEach((btn) => {
            btn.classList.toggle(
              "is-active",
              btn.getAttribute("data-world-mode") === state.worldMode,
            );
          });
        });
        requestInteractiveRebind(frame);
        highlightPreviewComponent(state.selectedSymbol || state.previewRoot);
        return;
      }
    } catch {
      /* fall through to full srcdoc replace */
    }
  }
  frame.srcdoc = html;
  frame.addEventListener(
    "load",
    () => {
      const d = frame?.contentDocument;
      if (!d) return;
      d.querySelectorAll("section.pdl-preview").forEach((sec) => {
        sec.setAttribute("data-world-mode", state.worldMode);
        sec.querySelectorAll(".pdl-world-mode [data-world-mode]").forEach((btn) => {
          btn.classList.toggle(
            "is-active",
            btn.getAttribute("data-world-mode") === state.worldMode,
          );
        });
      });
    },
    { once: true },
  );
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

export function syncPreviewModeChrome() {
  document.querySelectorAll("[data-preview-mode]").forEach((btn) => {
    const mode = btn.getAttribute("data-preview-mode");
    btn.classList.toggle("is-active", mode === state.previewMode);
  });
}

/**
 * Emphasize the cursor-selected component inside a file gallery.
 * @param {string | null | undefined} name
 */
export function highlightPreviewComponent(name) {
  if (!frame) return;
  const doc = frame.contentDocument;
  if (!doc) return;
  const want = name || "";
  /** @type {Element | null} */
  let focusSec = null;
  doc.querySelectorAll("section.pdl-preview[data-pdl-component]").forEach((sec) => {
    const on = want && sec.getAttribute("data-pdl-component") === want;
    sec.classList.toggle("pdl-preview--focus", Boolean(on));
    if (on) focusSec = sec;
  });
  if (focusSec && typeof focusSec.scrollIntoView === "function") {
    try {
      focusSec.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } catch {
      /* ignore */
    }
  }
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
