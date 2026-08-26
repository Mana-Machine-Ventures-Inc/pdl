/**
 * Studio Canvas — layers + inspector + mini stage; authors .pdl via pending → Apply.
 */

import { loadWasmBake, virtualizeSources } from "@playground/wasm-bake.js";
import { state, markDirty, emit } from "../state.js";
import { diskSources } from "../api.js";
import { flushEditorToFiles, syncEditorFromState } from "../editor.js";
import { findSymbolInSource } from "../symbols.js";
import {
  canvasSession,
  subscribeCanvas,
  resetCanvasSession,
  selectCanvasLayer,
  setCanvasWorldParam,
  discardPending,
  pruneBlankPending,
  pushPending,
  setCanvasWarnings,
} from "./session.js";
import { layersFromBake, findLayer, renderLayerTree, effectiveRootChildNames } from "./layers.js";
import { overlayStructureOnBake, moveRootChild, sanitizeLayerName } from "./layerStructure.js";
import { renderInspector, flushInspectorPending, inspectorHasInvalid } from "./inspector.js";
import { applyPendingToSource } from "./rewrite.js";
import {
  activeNonDefaultAxes,
  variantAxisParams,
  crossAxisWarning,
} from "./warnings.js";
import { resolveCssColor } from "./tokens.js";

/** @type {((msg: string) => void) | null} */
let onStatus = null;
/** @type {((err: string | null, meta?: object) => void) | null} */
let onError = null;
/** @type {(() => void) | null} */
let onApplied = null;

/** @type {string | null} */
let chosenAxis = null;
let bakeSeq = 0;

/**
 * @param {object} [handlers]
 */
export function mountCanvas(handlers = {}) {
  onStatus = handlers.onStatus ?? null;
  onError = handlers.onError ?? null;
  onApplied = handlers.onApplied ?? null;

  wirePaneToggle();
  wireCanvasChrome();
  subscribeCanvas(() => {
    if (state.rightPaneMode !== "canvas") return;
    // Key entry is sacrosanct: never rebuild the inspector while typing.
    if (isInspectorTyping()) refreshCanvasLive();
    else renderCanvasUi();
  });
  syncRightPaneChrome();
}

function wirePaneToggle() {
  document.querySelectorAll("[data-right-pane]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-right-pane");
      state.rightPaneMode = mode === "canvas" ? "canvas" : "preview";
      emit();
      syncRightPaneChrome();
      if (state.rightPaneMode === "canvas") {
        void refreshCanvasBake();
      }
    });
  });
}

function wireCanvasChrome() {
  document.getElementById("btnCanvasApply")?.addEventListener("click", () => {
    void applyCanvasPending();
  });
  document.getElementById("btnCanvasDiscard")?.addEventListener("click", () => {
    discardPending();
    chosenAxis = null;
    renderCanvasUi();
    onStatus?.("Canvas · discarded pending");
  });
}

export function syncRightPaneChrome() {
  const mode = state.rightPaneMode || "preview";
  document.querySelectorAll("[data-right-pane]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.getAttribute("data-right-pane") === mode);
  });
  const pane = document.querySelector(".preview-pane");
  if (pane) pane.setAttribute("data-right-pane", mode);

  const previewTools = document.getElementById("previewToolbar");
  const previewHost = document.getElementById("hostChrome");
  const legend = document.getElementById("interactionLegend");
  const frameWrap = document.querySelector(".preview-frame-wrap");
  const inspect = document.getElementById("inspectPane");
  const canvas = document.getElementById("canvasPane");

  if (mode === "canvas") {
    if (previewTools) previewTools.hidden = true;
    if (previewHost) previewHost.hidden = true;
    if (legend) legend.hidden = true;
    if (frameWrap) /** @type {HTMLElement} */ (frameWrap).hidden = true;
    if (inspect) inspect.hidden = true;
    if (canvas) canvas.hidden = false;
    syncCanvasToSelection();
    void refreshCanvasBake();
  } else {
    if (previewTools) previewTools.hidden = false;
    if (canvas) canvas.hidden = true;
    if (frameWrap) /** @type {HTMLElement} */ (frameWrap).hidden = false;
  }
}

/**
 * Call when navigator selection changes.
 */
export function syncCanvasToSelection() {
  if (state.selectedKind !== "component" || !state.previewRoot) {
    resetCanvasSession(null, null);
    renderCanvasUi();
    return;
  }
  const name = state.previewRoot;
  const file =
    state.editFile ||
    state.catalogue?.componentFiles?.[name] ||
    null;
  if (canvasSession.component !== name) {
    resetCanvasSession(name, file);
    chosenAxis = null;
  } else {
    canvasSession.file = file;
  }
  if (state.rightPaneMode === "canvas") void refreshCanvasBake();
  else renderCanvasUi();
}

function isInspectorTyping() {
  const ae = document.activeElement;
  return (
    ae instanceof HTMLInputElement &&
    ae.hasAttribute("data-prop") &&
    Boolean(ae.closest("#canvasInspector"))
  );
}

/** Rebuild layers list + add form (safe while inspector is focused). */
function renderLayersPanel() {
  const rootEl = document.getElementById("canvasLayers");
  if (!rootEl) return;
  const comp = canvasSession.component;
  const baked = canvasSession.bake?.components?.[comp || ""];
  const bakedWithStructure = overlayStructureOnBake(baked);
  const tree = layersFromBake(bakedWithStructure);
  const selected = canvasSession.selectedLayer;
  const rootChildOrder = effectiveRootChildNames(baked);

  renderLayerTree(
    rootEl,
    tree,
    selected,
    {
      onSelect: (id) => {
        selectCanvasLayer(id);
        highlightStageLayer(id);
      },
      onMove: (letName, delta) => {
        const order = moveRootChild(baked, letName, /** @type {-1|1} */ (delta));
        if (!order) return;
        pushPending(
          { kind: "reorderChildren", target: "root", payload: { order } },
          { silent: true },
        );
        renderLayersPanel();
        refreshCanvasLive();
      },
      onAdd: ({ kind, name }) => {
        const n = sanitizeLayerName(name);
        const used = new Set(effectiveRootChildNames(baked));
        if (used.has(n)) {
          onError?.(`Layer name “${n}” already exists`);
          return;
        }
        pushPending(
          {
            kind: "addLayer",
            target: "root",
            payload: { kind, name: n, content: kind === "text" ? n : undefined },
          },
          { silent: true },
        );
        renderLayersPanel();
        refreshCanvasLive();
      },
    },
    rootChildOrder,
    baked,
  );
}

/**
 * Live chrome only: pending list, Apply buttons, stage sketch.
 * Does not touch the inspector DOM (preserves focus while typing).
 */
function refreshCanvasLive() {
  pruneBlankPending({ silent: true });
  const pendingEl = document.getElementById("canvasPending");
  const metaEl = document.getElementById("canvasMeta");
  const warnEl = document.getElementById("canvasWarnings");
  const comp = canvasSession.component;
  const baked = canvasSession.bake?.components?.[comp || ""];
  const selected = canvasSession.selectedLayer;
  const n = canvasSession.pending.length;

  if (metaEl && comp) {
    metaEl.textContent = n ? `${n} pending · stage live` : "Defaults · edit props, then Apply";
  }
  renderPending(pendingEl);
  updateApplyChrome();
  renderLayersPanel();

  const params = state.catalogue?.componentParams?.[comp || ""] ?? [];
  const cases = state.catalogue?.variantCases ?? {};
  const axes = activeNonDefaultAxes(canvasSession.world, params, cases);
  const stageErr = paintStageSafe(overlayPendingOnBake(overlayStructureOnBake(baked)));
  highlightStageLayer(selected);

  if (warnEl) {
    const warns = [
      ...canvasSession.warnings,
      ...canvasSession.pending.map((p) => p.warning).filter(Boolean),
    ];
    const cross = crossAxisWarning(axes, chosenAxis || undefined);
    if (cross) warns.push(cross);
    if (stageErr) warns.push(stageErr);
    warnEl.hidden = !warns.length;
    warnEl.innerHTML = warns.map((w) => `<div>${escapeHtml(String(w))}</div>`).join("");
  }
}

function renderCanvasUi() {
  // Never clobber the field the user is typing into.
  if (isInspectorTyping()) {
    refreshCanvasLive();
    return;
  }

  pruneBlankPending({ silent: true });
  const inspEl = document.getElementById("canvasInspector");
  const variantEl = document.getElementById("canvasVariants");
  const pendingEl = document.getElementById("canvasPending");
  const titleEl = document.getElementById("canvasTitle");
  const metaEl = document.getElementById("canvasMeta");

  const comp = canvasSession.component;
  if (titleEl) titleEl.textContent = comp || "Canvas";
  if (metaEl) {
    const n = canvasSession.pending.length;
    metaEl.textContent = comp
      ? n
        ? `${n} pending`
        : "Defaults · edit props, then Apply"
      : "Select a component";
  }

  const baked = canvasSession.bake?.components?.[comp || ""];
  const bakedWithStructure = overlayStructureOnBake(baked);
  const tree = layersFromBake(bakedWithStructure);
  const selected = canvasSession.selectedLayer;

  renderLayersPanel();

  const params = state.catalogue?.componentParams?.[comp || ""] ?? [];
  const cases = state.catalogue?.variantCases ?? {};
  const axes = activeNonDefaultAxes(canvasSession.world, params, cases);

  if (variantEl) renderVariantBar(variantEl, params, cases);

  const layer = findLayer(tree, selected);
  if (inspEl) {
    renderInspector(
      inspEl,
      layer,
      axes,
      chosenAxis,
      (ax) => {
        chosenAxis = ax;
        renderCanvasUi();
      },
      () => {
        // Field commits use silent pushPending — refresh chrome/stage only.
        refreshCanvasLive();
      },
    );
  }

  renderPending(pendingEl);
  updateApplyChrome();
  const stageErr = paintStageSafe(overlayPendingOnBake(overlayStructureOnBake(baked)));
  highlightStageLayer(selected);

  const warnEl = document.getElementById("canvasWarnings");
  if (warnEl) {
    const warns = [
      ...canvasSession.warnings,
      ...canvasSession.pending.map((p) => p.warning).filter(Boolean),
    ];
    const cross = crossAxisWarning(axes, chosenAxis || undefined);
    if (cross) warns.push(cross);
    if (stageErr) warns.push(stageErr);
    warnEl.hidden = !warns.length;
    warnEl.innerHTML = warns.map((w) => `<div>${escapeHtml(String(w))}</div>`).join("");
  }
}

/**
 * @param {HTMLElement} el
 * @param {Array<{ name: string, typeName: string, defaultValue?: unknown }>} params
 * @param {Record<string, string[]>} variantCases
 */
function renderVariantBar(el, params, variantCases) {
  const axes = variantAxisParams(params, variantCases);
  if (!axes.length) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  el.hidden = false;
  el.innerHTML = axes
    .map((p) => {
      const casesList = variantCases[p.typeName] || [];
      const cur = canvasSession.world[p.name];
      const curBare = cur != null ? String(cur).replace(/^\./, "") : "";
      const defBare = String(p.default ?? p.defaultValue ?? casesList[0] ?? "")
        .replace(/^\./, "")
        .replace(/^"|"$/g, "");
      const options = [
        `<option value="">${escapeHtml(defBare || "default")} (default)</option>`,
        ...casesList.map(
          (c) =>
            `<option value=".${escapeAttr(c)}"${curBare === c ? " selected" : ""}>${escapeHtml(c)}</option>`,
        ),
      ];
      return `<label class="canvas-variant"><span>${escapeHtml(p.name)}</span>
        <select data-canvas-axis="${escapeAttr(p.name)}">${options.join("")}</select>
      </label>`;
    })
    .join("");

  el.querySelectorAll("select[data-canvas-axis]").forEach((sel) => {
    sel.addEventListener("change", () => {
      const key = sel.getAttribute("data-canvas-axis");
      if (!key) return;
      setCanvasWorldParam(key, /** @type {HTMLSelectElement} */ (sel).value || undefined);
      chosenAxis = null;
      void refreshCanvasBake();
    });
  });
}

function renderPending(el) {
  if (!el) return;
  const items = canvasSession.pending;
  if (!items.length) {
    el.innerHTML = `<span class="hint">No pending edits</span>`;
    return;
  }
  el.innerHTML = items
    .map((p) => {
      const axisBit =
        p.axes && Object.keys(p.axes).length
          ? ` · ${Object.entries(p.axes)
              .map(([k, v]) => `${k}=.${v}`)
              .join(", ")}`
          : "";
      const label =
        p.kind === "setProp"
          ? `${p.target}.${p.prop} = ${formatShort(p.value)}`
          : p.kind === "addLayer"
            ? `+ ${String(p.payload?.kind || "text")} ${p.payload?.name || ""}`
            : p.kind === "deleteLayer"
              ? `− ${p.target}`
              : p.kind === "reorderChildren"
                ? `↕ children [${(p.payload?.order || []).join(", ")}]`
                : p.kind;
      return `<div class="canvas-pending-item">${escapeHtml(label)}${escapeHtml(axisBit)}</div>`;
    })
    .join("");
}

function updateApplyChrome() {
  const apply = document.getElementById("btnCanvasApply");
  const discard = document.getElementById("btnCanvasDiscard");
  const n = canvasSession.pending.length;
  if (apply) /** @type {HTMLButtonElement} */ (apply).disabled = n === 0;
  if (discard) /** @type {HTMLButtonElement} */ (discard).disabled = n === 0;
}

/**
 * Bake component with canvas world overrides.
 */
export async function refreshCanvasBake() {
  const id = ++bakeSeq;
  const name = canvasSession.component;
  if (!name || !state.root || !state.entry) {
    canvasSession.bake = null;
    renderCanvasUi();
    return;
  }

  try {
    flushEditorToFiles();
    const wasm = await loadWasmBake();
    if (!wasm) throw new Error("WASM bake unavailable");
    const disk = await diskSources(state.root, state.entry);
    const sourceFiles = { ...(disk.files ?? {}), ...state.files };
    const { filesJson, entry: virtEntry } = virtualizeSources(sourceFiles, state.entry);
    const theme = state.theme || "";
    const hasHost = (state.catalogue?.hostParams?.length ?? 0) > 0;
    const host = hasHost ? "Default" : "";
    const hostFacts = JSON.stringify(hasHost ? state.hostFacts ?? {} : {});
    const kv = bakeKv(canvasSession.world);
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
    if (id !== bakeSeq) return;
    canvasSession.bake = JSON.parse(bakeJson);
    canvasSession.bakeError = null;
    onError?.(null);
    onStatus?.(`Canvas · ${name} · baked`);
  } catch (err) {
    if (id !== bakeSeq) return;
    canvasSession.bakeError = err instanceof Error ? err.message : String(err);
    onError?.(canvasSession.bakeError, { file: canvasSession.file || undefined });
    onStatus?.("Canvas bake failed");
  }
  renderCanvasUi();
}

async function applyCanvasPending() {
  const name = canvasSession.component;
  const file = resolveComponentFile(name);
  if (!name || !file) {
    onError?.("No component file for Canvas apply");
    return;
  }

  // Commit any in-progress inspector field (Apply often clicked before blur).
  const baked = canvasSession.bake?.components?.[name];
  const tree = layersFromBake(baked);
  const layer = findLayer(tree, canvasSession.selectedLayer);
  const params = state.catalogue?.componentParams?.[name] ?? [];
  const cases = state.catalogue?.variantCases ?? {};
  const axesNow = activeNonDefaultAxes(canvasSession.world, params, cases);
  flushInspectorPending(
    document.getElementById("canvasInspector"),
    layer,
    axesNow,
    chosenAxis,
  );
  pruneBlankPending();

  if (inspectorHasInvalid(document.getElementById("canvasInspector"))) {
    onError?.("Fix invalid inspector fields before Apply");
    onStatus?.("Canvas Apply blocked — invalid fields");
    // Do not rebuild inspector — keep typed values + red field errors.
    return;
  }

  if (!canvasSession.pending.length) {
    onStatus?.("Canvas · nothing to apply");
    renderCanvasUi();
    return;
  }

  flushEditorToFiles();
  const source = state.files[file] ?? "";
  const axes = axesNow;

  /** @type {Record<string, string>} */
  const chosenAxisByEdit = {};
  for (const p of canvasSession.pending) {
    if (p.kind !== "setProp") continue;
    const keys = Object.keys(p.axes ?? {});
    if (keys.length > 1) {
      if (!chosenAxis || !keys.includes(chosenAxis)) {
        onError?.(
          `Pick an axis for ${p.prop} (active: ${keys.join(", ")}) before Apply.`,
        );
        setCanvasWarnings([
          `Changing ${keys.join(" + ")} at once — pick which axis owns this property.`,
        ]);
        renderCanvasUi();
        return;
      }
      chosenAxisByEdit[p.id] = chosenAxis;
    }
  }

  const pending = canvasSession.pending.map((p) => {
    if (p.kind !== "setProp") return p;
    const keys = Object.keys(p.axes ?? {});
    if (keys.length === 0 && Object.keys(axes).length === 1) {
      return { ...p, axes: { ...axes } };
    }
    return p;
  });

  const result = applyPendingToSource(source, name, pending, { chosenAxisByEdit });
  if (!result.ok) {
    onError?.(result.error || "Rewrite failed", { file });
    onStatus?.("Canvas Apply failed");
    return;
  }

  try {
    const wasm = await loadWasmBake();
    if (!wasm) throw new Error("WASM bake unavailable");
    const disk = await diskSources(state.root, state.entry);
    const trialFiles = { ...(disk.files ?? {}), ...state.files, [file]: result.source };
    const { filesJson, entry: virtEntry } = virtualizeSources(trialFiles, state.entry);
    const theme = state.theme || "";
    const hasHost = (state.catalogue?.hostParams?.length ?? 0) > 0;
    const bakeJson = wasm.bake_component_sources(
      filesJson,
      virtEntry,
      name,
      theme,
      JSON.stringify(bakeKv(canvasSession.world)),
      hasHost ? "Default" : "",
      JSON.stringify(hasHost ? state.hostFacts ?? {} : {}),
      undefined,
    );
    JSON.parse(bakeJson);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    onError?.(msg, { file });
    onStatus?.("Canvas Apply rejected — bake failed");
    return;
  }

  state.files[file] = result.source;
  markDirty(file);
  if (state.editFile !== file) state.editFile = file;
  syncEditorFromState();
  void findSymbolInSource(result.source, name);

  discardPending();
  chosenAxis = null;
  setCanvasWarnings(result.warnings ?? []);
  onError?.(null);
  onStatus?.(
    `Canvas · applied ${pending.length} edit(s)${(result.warnings || []).length ? " · with warnings" : ""}`,
  );
  await refreshCanvasBake();
  onApplied?.();
  emit();
}

function resolveComponentFile(name) {
  if (!name) return null;
  if (canvasSession.file && state.files[canvasSession.file]) return canvasSession.file;
  const fromCat = state.catalogue?.componentFiles?.[name];
  if (fromCat && state.files[fromCat]) return fromCat;
  for (const [path, src] of Object.entries(state.files)) {
    if (new RegExp(`\\b(component|page|screen)\\s+${escapeReg(name)}\\b`).test(src)) {
      return path;
    }
  }
  return state.editFile;
}

/**
 * Clone bake component and overlay pending setProp values onto frame props
 * so the stage updates live before Apply writes PDL.
 * @param {object | null | undefined} bakedComp
 */
function overlayPendingOnBake(bakedComp) {
  if (!bakedComp?.root) return bakedComp ?? null;
  const clone = structuredClone
    ? structuredClone(bakedComp)
    : JSON.parse(JSON.stringify(bakedComp));
  for (const edit of canvasSession.pending) {
    if (edit.kind !== "setProp" || !edit.prop) continue;
    const frame = findBakeFrame(clone.root, edit.target);
    if (!frame) continue;
    if (!frame.props || typeof frame.props !== "object") frame.props = {};
    frame.props[edit.prop] = edit.value;
  }
  return clone;
}

/**
 * @param {object} frame
 * @param {string} target
 */
function findBakeFrame(frame, target) {
  if (target === "root") return frame;
  if (target.startsWith("let:")) {
    const want = target.slice(4);
    /** @type {object | null} */
    let hit = null;
    function walk(n) {
      if (!n || hit) return;
      if (n.id === want) {
        hit = n;
        return;
      }
      for (const ch of n.children || []) walk(ch);
    }
    walk(frame);
    return hit;
  }
  return null;
}

/**
 * @param {object | null | undefined} bakedComp
 * @returns {string | null} error message if sketch failed or tokens unresolved
 */
function paintStageSafe(bakedComp) {
  try {
    const unresolved = paintStage(bakedComp);
    if (unresolved?.length) {
      return `Unresolved color token(s): ${unresolved.join(", ")} — stage uses fallback until Apply/bake.`;
    }
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const frame = document.getElementById("canvasStageFrame");
    if (frame && frame instanceof HTMLIFrameElement) {
      frame.srcdoc = `<!doctype html><html><body style="font:13px system-ui;padding:16px;color:#a33">Stage sketch failed</body></html>`;
    }
    return `Stage sketch failed: ${msg}`;
  }
}

/**
 * @param {object | null | undefined} bakedComp
 * @returns {string[]} unresolved token names
 */
function paintStage(bakedComp) {
  const frame = document.getElementById("canvasStageFrame");
  if (!frame || !(frame instanceof HTMLIFrameElement)) return [];
  if (!bakedComp?.root) {
    frame.srcdoc = `<!doctype html><html><body style="font:13px system-ui;padding:16px;color:#666">No bake</body></html>`;
    return [];
  }
  const selected = canvasSession.selectedLayer;
  const { html, unresolved } = sketchHtml(bakedComp, selected);
  frame.srcdoc = html;
  return unresolved;
}

/**
 * @param {object} bakedComp
 * @param {string} [selectedId]
 * @returns {{ html: string, unresolved: string[] }}
 */
function sketchHtml(comp, selectedId = "root") {
  /** @type {string[]} */
  const unresolved = [];
  const css = `
    body{margin:0;font:13px/1.4 system-ui;background:#e7efe9;padding:12px}
    .stage{background:#fff;border-radius:12px;padding:16px;border:1px solid #c5d4c9;min-height:80px}
    .node{outline:1px dashed transparent;border-radius:6px;box-sizing:border-box}
    .node.is-hot{outline:2px solid #0b6e4f}
    .row{display:flex;flex-direction:row;align-items:center;gap:8px}
    .col{display:flex;flex-direction:column;gap:8px}
    .txt{white-space:pre-wrap}
  `;
  const inner = sketchFrame(comp.root, "root", selectedId, unresolved);
  return {
    html: `<!doctype html><html><head><style>${css}</style></head><body><div class="stage">${inner}</div>
  <script>
    window.addEventListener('message',function(ev){
      if(!ev.data||ev.data.type!=='canvas-highlight')return;
      document.querySelectorAll('.node').forEach(function(n){
        n.classList.toggle('is-hot',n.getAttribute('data-layer')===ev.data.id);
      });
    });
  <\/script></body></html>`,
    unresolved,
  };
}

/**
 * @param {object} frame
 * @param {string} id
 * @param {string} selectedId
 * @param {string[]} unresolved
 */
function sketchFrame(frame, id, selectedId, unresolved) {
  const props = frame.props || {};
  const dir = props.direction === "column" || props.direction === ".column" ? "col" : "row";
  const bg = cssColorProp(props.background, unresolved);
  const pad = paddingCss(props.padding);
  const radius = props.cornerRadius != null ? `${Number(props.cornerRadius) || 0}px` : "";
  const bw = props.borderWidth != null ? Number(props.borderWidth) : null;
  let bc = cssColorProp(props.borderColor, unresolved);
  if (!bc && bw != null && bw > 0) bc = "#111111";
  const style = [
    bg ? `background:${escapeCss(bg)}` : "",
    pad ? `padding:${pad}` : "",
    radius ? `border-radius:${radius}` : "",
    props.opacity != null ? `opacity:${props.opacity}` : "",
    bw != null && bw > 0 && Number.isFinite(bw) ? `border:${bw}px solid ${escapeCss(bc || "#111")}` : "",
  ]
    .filter(Boolean)
    .join(";");

  const hot = id === selectedId ? " is-hot" : "";

  if (frame.kind === "text") {
    const content = props.content != null ? String(props.content) : "";
    const color = cssColorProp(props.color, unresolved);
    const fs = props.fontSize != null ? `${props.fontSize}px` : "";
    const fw = props.fontWeight != null ? String(props.fontWeight) : "";
    const ts = [
      color ? `color:${escapeCss(color)}` : "",
      fs ? `font-size:${fs}` : "",
      fw ? `font-weight:${fw}` : "",
    ]
      .filter(Boolean)
      .join(";");
    return `<div class="node txt${hot}" data-layer="${escapeAttr(id)}" style="${ts}">${escapeHtml(content)}</div>`;
  }

  const kids = (frame.children || [])
    .map((ch, i) => {
      let childId;
      if (typeof ch.id === "string" && ch.id && !/^\d+$/.test(ch.id)) childId = `let:${ch.id}`;
      else childId = `path:${id === "root" ? "" : id + "."}${i}`;
      return sketchFrame(ch, childId, selectedId, unresolved);
    })
    .join("");
  return `<div class="node ${dir}${hot}" data-layer="${escapeAttr(id)}" style="${style}">${kids}</div>`;
}

/**
 * @param {unknown} value
 * @param {string[]} unresolved
 * @returns {string}
 */
function cssColorProp(value, unresolved) {
  if (value == null || value === "") return "";
  // Bake usually already resolved colors to hex strings.
  if (typeof value === "string" && /^#[0-9A-Fa-f]{3,8}$/.test(value.trim())) {
    return value.trim();
  }
  const { css, unresolved: miss } = resolveCssColor(value);
  if (miss && !unresolved.includes(miss)) unresolved.push(miss);
  return css || "";
}

/**
 * @param {unknown} padding
 */
function paddingCss(padding) {
  if (padding == null) return "";
  if (typeof padding === "number") return `${padding}px`;
  if (typeof padding === "string") {
    const m = /EdgeInsets\(([^)]*)\)/.exec(padding);
    if (m) {
      /** @type {Record<string, string>} */
      const bag = {};
      for (const part of m[1].split(",")) {
        const [k, v] = part.split(":").map((s) => s.trim());
        if (k && v) bag[k] = v;
      }
      if (bag.x != null || bag.y != null) {
        return `${bag.y || 0}px ${bag.x || 0}px`;
      }
      return `${bag.top || 0}px ${bag.right || 0}px ${bag.bottom || 0}px ${bag.left || 0}px`;
    }
    return "";
  }
  if (typeof padding === "object") {
    const o = /** @type {Record<string, unknown>} */ (padding);
    if (o.x != null || o.y != null) return `${o.y || 0}px ${o.x || 0}px`;
    return `${o.top || 0}px ${o.right || 0}px ${o.bottom || 0}px ${o.left || 0}px`;
  }
  return "";
}

/**
 * @param {string} id
 */
function highlightStageLayer(id) {
  const frame = document.getElementById("canvasStageFrame");
  if (!frame || !(frame instanceof HTMLIFrameElement)) return;
  try {
    frame.contentWindow?.postMessage({ type: "canvas-highlight", id }, "*");
  } catch {
    /* ignore */
  }
}

function bakeKv(overrides) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(overrides ?? {})) {
    if (v === undefined || v === null) continue;
    if (typeof v === "object") continue;
    if (typeof v === "string" && v.startsWith(".") && v.length > 1 && !v.includes(" ")) {
      out[k] = v.slice(1);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function formatShort(v) {
  if (typeof v === "string") return v.length > 40 ? `${v.slice(0, 38)}…` : v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
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

function escapeCss(s) {
  return String(s).replace(/[;<>"']/g, "");
}

function escapeReg(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
