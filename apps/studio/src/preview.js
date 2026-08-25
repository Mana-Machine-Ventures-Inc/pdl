import { loadWasmBake, virtualizeSources } from "@playground/wasm-bake.js";
import { applyPreviewHtml, requestInteractiveRebind } from "@playground/preview-apply.js";
import { applyPresenterOps, resolvePairMove } from "@playground/presenter-pins.js";
import { snapshotPresenterOutgoing, startPresenterPairClip } from "@playground/presenter-clip.js";
import {
  reconcileBakedComponentIntoCanvas,
  reconcileBakedInstanceIntoElement,
} from "@pdl/bakeReconcile.ts";
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

/** @type {Record<string, Record<string, unknown>>} */
let presenterPinsByComponent = {};
/** @type {object | null} */
let lastBakedDesign = null;
/** @type {Map<string, object>} */
const instanceBakeIrCache = new Map();
/** @type {Map<string, number>} */
const instanceResolveToken = new Map();
/** @type {Map<string, Promise<void>>} */
const instanceResolveTail = new Map();
/** @type {{ cancel: () => void } | null} */
let activePairClip = null;

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
      delete presenterPinsByComponent[root];
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
  if (type === "pdl-resolve-instance") {
    queueInstanceResolve(data);
    return;
  }
  if (type === "pdl-interaction") {
    void handleInteractionMessage(data);
    return;
  }
}

/**
 * Host rebake path for chrome SoT / presenter pins (Playground parity).
 * Dual-bake stateTrees are retired — hover/press must update params and patch
 * the live canvas in place (full remount would fire hoverEnd and look like a no-op).
 * Never changes editor/nav selection — pointer chrome is not a select gesture.
 * @param {Record<string, unknown>} data
 */
async function handleInteractionMessage(data) {
  const evName = typeof data.event === "string" ? data.event : "";
  const comp = typeof data.component === "string" ? data.component : "";
  const chromeEvent =
    evName === "hoverStart" ||
    evName === "hoverEnd" ||
    evName === "pressStart" ||
    evName === "pressEnd" ||
    evName === "pressCancel";
  if (data.unhandledAncestors) {
    onStatus?.(`Interaction · ${comp} · unhandled ancestors (no-op)`);
  } else if (evName) {
    const emitBit =
      Array.isArray(data.emits) && data.emits.length
        ? ` · emit ${data.emits.map((e) => e?.name).filter(Boolean).join(",")}`
        : "";
    const childBit = data.childComponent ? ` ← ${data.childComponent}` : "";
    onStatus?.(`Interaction · ${comp}${childBit} · ${evName}${emitBit}`);
  }

  const ops = Array.isArray(data.presenterOps) ? data.presenterOps : [];
  const owner = comp || state.previewRoot || "";
  const sectionOps = ops.filter(
    (op) => !op.owner || op.owner === "section" || op.owner === owner,
  );
  const pinsBefore = presenterPinsByComponent[owner] ?? {};
  const pairMove = resolvePairMove(sectionOps, pinsBefore);
  const outgoingSnap = pairMove
    ? snapshotPresenterOutgoing(frame?.contentDocument, owner)
    : null;
  if (activePairClip) {
    activePairClip.cancel();
    activePairClip = null;
  }
  const pinsChanged = applyPresenterOpsForOwner(owner, ops);
  const assignChanged = Boolean(data.changed) && ops.length === 0;
  const parentSoTChanged =
    (data.previewHandled !== true && (pinsChanged || assignChanged)) ||
    (Boolean(pairMove) && pinsChanged);

  if (
    owner &&
    data.params &&
    typeof data.params === "object" &&
    !Array.isArray(data.params) &&
    (!chromeEvent || parentSoTChanged)
  ) {
    // Merge scalar SoT into overrides — keep selection / previewRoot untouched.
    state.paramOverrides[owner] = {
      ...(state.paramOverrides[owner] ?? {}),
      ...normalizeParamKv(owner, /** @type {Record<string, unknown>} */ (data.params)),
    };
    if (parentSoTChanged) {
      state.activeWorld[owner] = null;
      // Stay on Params so World knobs reflect live chrome without switching selection.
      if (state.worldMode !== "params") state.worldMode = "params";
    }
    onWorldMutated?.();
  }

  if (parentSoTChanged && owner) {
    state.activeWorld[owner] = null;
    const ok = await rebakeOwnerInPlace(owner);
    if (!ok) await runPreview();
    if (pairMove && outgoingSnap) {
      activePairClip = startPresenterPairClip(
        frame?.contentDocument,
        outgoingSnap,
        pairMove,
        owner,
      );
    }
  }
}

/**
 * Bake one owner and reconcile into its existing preview canvas (no srcdoc remount).
 * @param {string} owner
 * @returns {Promise<boolean>}
 */
async function rebakeOwnerInPlace(owner) {
  if (!owner || !frame || !state.root || !state.entry) return false;
  const doc = frame.contentDocument;
  const section = doc?.querySelector(
    `section.pdl-preview[data-pdl-component="${CSS.escape(owner)}"]`,
  );
  if (!section) return false;
  const canvas =
    section.querySelector(".pdl-state:not([hidden]) .pdl-canvas") ||
    section.querySelector(".pdl-canvas");
  if (!canvas) return false;

  try {
    const wasm = await loadWasmBake();
    if (!wasm) return false;
    flushEditorToFiles();
    const disk = await diskSources(state.root, state.entry);
    const sourceFiles = { ...(disk.files ?? {}), ...state.files };
    const { filesJson, entry: virtEntry } = virtualizeSources(sourceFiles, state.entry);
    const theme = state.theme || "";
    const hasHost = (state.catalogue?.hostParams?.length ?? 0) > 0;
    const host = hasHost ? "Default" : "";
    const hostFacts = JSON.stringify(hasHost ? state.hostFacts ?? {} : {});
    const kv = bakeKv(state.paramOverrides[owner] ?? {});
    const bakeJson = wasm.bake_component_sources(
      filesJson,
      virtEntry,
      owner,
      theme,
      JSON.stringify(kv),
      host,
      hostFacts,
      pinsJsonFor(owner),
    );
    const bake = JSON.parse(bakeJson);
    const nextComp = bake?.components?.[owner];
    if (!nextComp?.root) return false;

    const prevComp = lastBakedDesign?.components?.[owner] ?? null;
    const bp =
      nextComp.bakedParams && typeof nextComp.bakedParams === "object"
        ? { ...nextComp.bakedParams }
        : undefined;
    const prevBp =
      prevComp?.bakedParams && typeof prevComp.bakedParams === "object"
        ? { ...prevComp.bakedParams }
        : undefined;
    const ok = reconcileBakedComponentIntoCanvas(canvas, prevComp, nextComp, {
      sessionParams: bp,
      prevSessionParams: prevBp,
    });
    if (!ok) return false;

    if (!lastBakedDesign) lastBakedDesign = { components: {} };
    if (!lastBakedDesign.components) lastBakedDesign.components = {};
    lastBakedDesign.components[owner] = nextComp;
    seedPinsFromBake(owner, nextComp);

    const paramsEl = section.querySelector(".pdl-preview-params");
    if (paramsEl && nextComp.bakedParams) {
      const compact = JSON.stringify(nextComp.bakedParams);
      const pretty = JSON.stringify(nextComp.bakedParams, null, 2);
      paramsEl.setAttribute("data-json", compact);
      const line = paramsEl.querySelector(".pdl-preview-params-line");
      const full = paramsEl.querySelector(".pdl-preview-params-full");
      if (line) line.textContent = compact;
      if (full) full.textContent = pretty;
    }
    return true;
  } catch (err) {
    console.warn("owner in-place rebake failed:", err);
    return false;
  }
}

/**
 * @param {string} owner
 * @param {unknown[]} ops
 */
function applyPresenterOpsForOwner(owner, ops) {
  if (!owner || !Array.isArray(ops) || !ops.length) return false;
  const sectionOps = ops.filter(
    (op) =>
      op &&
      typeof op === "object" &&
      (!/** @type {{ owner?: string }} */ (op).owner ||
        /** @type {{ owner?: string }} */ (op).owner === "section" ||
        /** @type {{ owner?: string }} */ (op).owner === owner),
  );
  if (!sectionOps.length) return false;
  const current = presenterPinsByComponent[owner] ?? {};
  presenterPinsByComponent[owner] = applyPresenterOps(current, sectionOps);
  return true;
}

/** @param {string} owner */
function pinsJsonFor(owner) {
  const pins = owner ? presenterPinsByComponent[owner] : null;
  if (!pins || typeof pins !== "object" || !Object.keys(pins).length) return undefined;
  return JSON.stringify(pins);
}

/**
 * @param {object | null | undefined} bakedComp
 * @returns {Record<string, unknown> | null}
 */
function extractPresenterPins(bakedComp) {
  /** @type {Record<string, unknown>} */
  const acc = {};
  function walk(n) {
    if (!n || typeof n !== "object") return;
    const rec = /** @type {Record<string, unknown>} */ (n);
    if (rec.kind === "presenter" && typeof rec.id === "string" && rec.id) {
      const props =
        rec.props && typeof rec.props === "object"
          ? /** @type {Record<string, unknown>} */ (rec.props)
          : {};
      const names = Array.isArray(props.stack) ? props.stack.map(String) : [];
      /** @type {{ stack: Array<{ component: string, params: Record<string, unknown> }>, cover?: { component: string, params: Record<string, unknown> } }} */
      const pin = {
        stack: names.map((c) => ({ component: c, params: {} })),
      };
      if (typeof props.cover === "string" && props.cover) {
        pin.cover = { component: props.cover, params: {} };
      }
      acc[rec.id] = pin;
    }
    const kids = Array.isArray(rec.children) ? rec.children : [];
    for (const ch of kids) walk(ch);
  }
  walk(bakedComp?.root);
  return Object.keys(acc).length ? acc : null;
}

/**
 * @param {string} owner
 * @param {object | null | undefined} bakedComp
 */
function seedPinsFromBake(owner, bakedComp) {
  if (!owner || !bakedComp) return;
  const seeded = extractPresenterPins(bakedComp);
  if (!seeded) return;
  const cur = presenterPinsByComponent[owner];
  if (!cur || !Object.keys(cur).length) {
    presenterPinsByComponent[owner] = seeded;
    return;
  }
  for (const [letId, pin] of Object.entries(seeded)) {
    const existing = cur[letId];
    const stack =
      existing && typeof existing === "object"
        ? /** @type {{ stack?: unknown }} */ (existing).stack
        : null;
    if (!Array.isArray(stack) || stack.length === 0) {
      cur[letId] = pin;
    }
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
        const bakeJson = wasm.bake_component_sources(
          filesJson,
          virtEntry,
          name,
          theme,
          JSON.stringify(kv),
          host,
          hostFacts,
          pinsJsonFor(name),
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
        pinsJsonFor(name),
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

    if (bake?.components && typeof bake.components === "object") {
      lastBakedDesign = bake;
      for (const [n, comp] of Object.entries(bake.components)) {
        seedPinsFromBake(n, comp);
      }
    }

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
    // WASM bake compares variant params without a leading dot (`hovered` not `.hovered`).
    // Studio knobs / catalogue often keep the authoring form with a dot.
    if (typeof v === "string" && v.startsWith(".") && v.length > 1 && !v.includes(" ")) {
      out[k] = v.slice(1);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function instanceResolveKey(data) {
  const owner = typeof data.component === "string" ? data.component : "";
  const instanceLet = typeof data.instanceLet === "string" ? data.instanceLet : "";
  const child = typeof data.childComponent === "string" ? data.childComponent : "";
  return instanceLet ? `${owner}::${instanceLet}` : `${owner}::__root__::${child}`;
}

function stableJsonForCache(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableJsonForCache(v)).join(",")}]`;
  }
  const keys = Object.keys(/** @type {object} */ (value)).sort();
  return `{${keys
    .map(
      (k) =>
        `${JSON.stringify(k)}:${stableJsonForCache(/** @type {Record<string, unknown>} */ (value)[k])}`,
    )
    .join(",")}}`;
}

function instanceResolveCacheKey(childComponent, childParams) {
  return `${childComponent}\0${stableJsonForCache(childParams ?? {})}`;
}

/**
 * @param {string} childComponent
 * @param {Record<string, unknown>} childParams
 */
async function bakeChildComponentForResolve(childComponent, childParams) {
  const cacheKey = instanceResolveCacheKey(childComponent, childParams);
  const hit = instanceBakeIrCache.get(cacheKey);
  if (hit?.root) return /** @type {{ root: object, bakedParams?: object }} */ (hit);

  const wasm = await loadWasmBake();
  if (!wasm || !state.root || !state.entry) return null;

  flushEditorToFiles();
  const disk = await diskSources(state.root, state.entry);
  const sourceFiles = { ...(disk.files ?? {}), ...state.files };
  const { filesJson, entry: virtEntry } = virtualizeSources(sourceFiles, state.entry);
  const theme = state.theme || "";
  const hasHost = (state.catalogue?.hostParams?.length ?? 0) > 0;
  const host = hasHost ? "Default" : "";
  const hostFacts = JSON.stringify(hasHost ? state.hostFacts ?? {} : {});

  const bakeJson = wasm.bake_component_sources(
    filesJson,
    virtEntry,
    childComponent,
    theme,
    JSON.stringify(childParams ?? {}),
    host,
    hostFacts,
    pinsJsonFor(childComponent),
  );
  const bake = JSON.parse(bakeJson);
  const bakedComp = bake?.components?.[childComponent] ?? null;
  if (!bakedComp?.root) return null;
  const packed = {
    root: bakedComp.root,
    bakedParams: bakedComp.bakedParams,
  };
  instanceBakeIrCache.set(cacheKey, packed);
  return packed;
}

/**
 * @param {object} data
 * @param {number} token
 */
async function applyInstanceResolve(data, token) {
  const doc = frame?.contentDocument;
  if (!doc) return;
  const owner = typeof data.component === "string" ? data.component : "";
  const instanceLet = typeof data.instanceLet === "string" ? data.instanceLet : "";
  const childComponent = typeof data.childComponent === "string" ? data.childComponent : "";
  const childParams =
    data.childParams && typeof data.childParams === "object" && !Array.isArray(data.childParams)
      ? /** @type {Record<string, unknown>} */ (data.childParams)
      : {};
  if (!childComponent) return;
  const key = instanceResolveKey(data);
  if (instanceResolveToken.get(key) !== token) return;

  const baked = await bakeChildComponentForResolve(childComponent, childParams);
  if (instanceResolveToken.get(key) !== token) return;
  if (!baked?.root) {
    onStatus?.(`Instance resolve failed · ${childComponent}`);
    return;
  }

  const section = owner
    ? doc.querySelector(`section.pdl-preview[data-pdl-component="${CSS.escape(owner)}"]`)
    : null;

  if (!instanceLet) {
    if (!section) return;
    const canvas =
      section.querySelector(".pdl-state:not([hidden]) .pdl-canvas") ||
      section.querySelector(".pdl-canvas");
    if (!canvas) return;
    const prevComp = lastBakedDesign?.components?.[owner] ?? null;
    const nextComp = {
      ...(prevComp && typeof prevComp === "object" ? prevComp : { name: owner }),
      name: owner,
      root: baked.root,
      bakedParams: baked.bakedParams ?? childParams,
    };
    const ok = reconcileBakedComponentIntoCanvas(canvas, prevComp, nextComp, {
      sessionParams: childParams,
      prevSessionParams:
        prevComp?.bakedParams && typeof prevComp.bakedParams === "object"
          ? { ...prevComp.bakedParams }
          : undefined,
    });
    if (!ok) return;
    if (lastBakedDesign?.components) lastBakedDesign.components[owner] = nextComp;
    const paramsEl = section.querySelector(".pdl-preview-params");
    if (paramsEl && nextComp.bakedParams) {
      const compact = JSON.stringify(nextComp.bakedParams);
      const pretty = JSON.stringify(nextComp.bakedParams, null, 2);
      paramsEl.setAttribute("data-json", compact);
      const line = paramsEl.querySelector(".pdl-preview-params-line");
      const full = paramsEl.querySelector(".pdl-preview-params-full");
      if (line) line.textContent = compact;
      if (full) full.textContent = pretty;
    }
    const reason = typeof data.reason === "string" ? data.reason : "";
    onStatus?.(
      `Instance resolve · ${childComponent}#${owner}${reason ? ` · ${reason}` : ""}`,
    );
    return;
  }

  const node = (section || doc).querySelector(
    `[data-pdl-instance-let="${CSS.escape(instanceLet)}"]`,
  );
  if (!node) return;

  /** @type {object | null} */
  let prevRoot = null;
  try {
    const raw = node.getAttribute("data-pdl-instance-bake");
    if (raw) prevRoot = JSON.parse(raw);
  } catch {
    prevRoot = null;
  }
  /** @type {Record<string, unknown> | undefined} */
  let prevKwargs;
  try {
    prevKwargs = JSON.parse(node.getAttribute("data-pdl-instance-kwargs") || "{}");
  } catch {
    prevKwargs = undefined;
  }

  if (instanceResolveToken.get(key) !== token) return;

  const ok = reconcileBakedInstanceIntoElement(node, prevRoot, baked.root, {
    sessionParams: childParams,
    prevSessionParams: prevKwargs,
  });
  if (!ok) return;
  if (instanceResolveToken.get(key) !== token) return;

  try {
    node.setAttribute("data-pdl-instance-bake", JSON.stringify(baked.root));
    node.setAttribute("data-pdl-instance-kwargs", JSON.stringify(childParams));
  } catch {
    /* ignore */
  }
  const reason = typeof data.reason === "string" ? data.reason : "";
  onStatus?.(
    `Instance resolve · ${childComponent}${instanceLet ? `#${instanceLet}` : ""}${
      reason ? ` · ${reason}` : ""
    }`,
  );
}

/**
 * @param {object} data
 */
function queueInstanceResolve(data) {
  const key = instanceResolveKey(data);
  const token = (instanceResolveToken.get(key) || 0) + 1;
  instanceResolveToken.set(key, token);
  const prev = instanceResolveTail.get(key) || Promise.resolve();
  const next = prev
    .then(() => applyInstanceResolve(data, token))
    .catch((err) => {
      console.warn("instance resolve failed:", err);
    });
  instanceResolveTail.set(key, next);
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
