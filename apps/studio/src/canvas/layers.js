/**
 * Bake IR → Canvas layer tree + layer panel UI.
 */

import {
  effectiveRootChildNames,
  suggestLayerName,
  sanitizeLayerName,
  usedLetNames,
} from "./layerStructure.js";

/**
 * @typedef {object} CanvasLayer
 * @property {string} id
 * @property {string} label
 * @property {string} kind
 * @property {string} [instanceOf]
 * @property {Record<string, unknown>} props
 * @property {Record<string, unknown>} [instanceKwargs]
 * @property {CanvasLayer[]} children
 * @property {number} depth
 * @property {boolean} [pendingAdd]
 * @property {boolean} [pendingDelete]
 */

/**
 * @param {object | null | undefined} bakedComp
 * @returns {CanvasLayer | null}
 */
export function layersFromBake(bakedComp) {
  if (!bakedComp?.root) return null;
  return walkFrame(bakedComp.root, "root", bakedComp.name || "Root", 0);
}

/**
 * @param {object} frame
 * @param {string} id
 * @param {string} label
 * @param {number} depth
 * @param {{ pendingAdd?: boolean, pendingDelete?: boolean }} [flags]
 * @returns {CanvasLayer}
 */
function walkFrame(frame, id, label, depth, flags = {}) {
  const kids = Array.isArray(frame.children) ? frame.children : [];
  /** @type {CanvasLayer[]} */
  const children = [];
  kids.forEach((ch, i) => {
    if (!ch || typeof ch !== "object") return;
    const childId = layerIdFor(ch, i, id);
    const childLabel = layerLabel(ch);
    children.push(walkFrame(ch, childId, childLabel, depth + 1));
  });
  return {
    id,
    label,
    kind: String(frame.kind || "layout"),
    instanceOf: typeof frame.instanceOf === "string" ? frame.instanceOf : undefined,
    props: frame.props && typeof frame.props === "object" ? { ...frame.props } : {},
    instanceKwargs:
      frame.instanceKwargs && typeof frame.instanceKwargs === "object"
        ? { ...frame.instanceKwargs }
        : undefined,
    children,
    depth,
    pendingAdd: flags.pendingAdd,
    pendingDelete: flags.pendingDelete,
  };
}

/**
 * @param {object} frame
 * @param {number} index
 * @param {string} parentId
 */
function layerIdFor(frame, index, parentId) {
  if (typeof frame.id === "string" && frame.id && !/^\d+$/.test(frame.id)) {
    return `let:${frame.id}`;
  }
  if (typeof frame.instanceOf === "string" && frame.instanceOf) {
    return `inst:${frame.instanceOf}@${parentId}.${index}`;
  }
  return `path:${parentId === "root" ? "" : parentId + "."}${index}`;
}

/**
 * @param {object} frame
 */
function layerLabel(frame) {
  if (typeof frame.id === "string" && frame.id && !/^\d+$/.test(frame.id)) {
    return frame.id;
  }
  if (typeof frame.instanceOf === "string" && frame.instanceOf) {
    return frame.instanceOf;
  }
  const content = frame.props?.content;
  if (typeof content === "string" && content.trim()) {
    const t = content.trim();
    return t.length > 24 ? `${t.slice(0, 22)}…` : t;
  }
  return String(frame.kind || "frame");
}

/**
 * Flatten tree for list rendering.
 * @param {CanvasLayer | null} root
 * @returns {CanvasLayer[]}
 */
export function flattenLayers(root) {
  /** @type {CanvasLayer[]} */
  const out = [];
  function walk(n) {
    if (!n) return;
    out.push(n);
    for (const c of n.children) walk(c);
  }
  walk(root);
  return out;
}

/**
 * @param {CanvasLayer | null} root
 * @param {string} id
 * @returns {CanvasLayer | null}
 */
export function findLayer(root, id) {
  if (!root) return null;
  if (root.id === id) return root;
  for (const c of root.children) {
    const hit = findLayer(c, id);
    if (hit) return hit;
  }
  return null;
}

/**
 * @param {HTMLElement} el
 * @param {CanvasLayer | null} root
 * @param {string} selectedId
 * @param {object} [handlers]
 * @param {string[]} [rootChildOrder]
 * @param {object | null | undefined} [bakedComp]
 */
export function renderLayerTree(
  el,
  root,
  selectedId,
  handlers = {},
  rootChildOrder = [],
  bakedComp = null,
) {
  if (!root) {
    el.innerHTML = `<p class="hint">Select a component to edit in Canvas.</p>`;
    return;
  }

  const rows = flattenLayers(root);
  const order = rootChildOrder.length ? rootChildOrder : root.children.map((c) => c.label);
  const orderIndex = (letName) => order.indexOf(letName);

  const listHtml = rows
    .map((n) => {
      const pad = 8 + n.depth * 12;
      const meta = n.instanceOf ? n.instanceOf : n.kind;
      const isRootChild = n.depth === 1 && n.id.startsWith("let:");
      const letName = isRootChild ? n.id.slice(4) : "";
      const idx = isRootChild ? orderIndex(letName) : -1;
      const canUp = isRootChild && idx > 0;
      const canDown = isRootChild && idx >= 0 && idx < order.length - 1;
      const pendingCls = n.pendingAdd ? " is-pending-add" : n.pendingDelete ? " is-pending-del" : "";
      const reorder =
        isRootChild && handlers.onMove
          ? `<span class="canvas-layer-reorder">
              <button type="button" class="btn ghost btn-tiny canvas-layer-move" data-move="up" data-let="${escapeAttr(letName)}"${canUp ? "" : " disabled"} title="Move up">↑</button>
              <button type="button" class="btn ghost btn-tiny canvas-layer-move" data-move="down" data-let="${escapeAttr(letName)}"${canDown ? "" : " disabled"} title="Move down">↓</button>
            </span>`
          : "";
      return `<div class="canvas-layer-row${n.id === selectedId ? " is-selected" : ""}${pendingCls}">
        <button type="button" class="canvas-layer" data-layer="${escapeAttr(n.id)}" style="padding-left:${pad}px">
          <span class="canvas-layer-name">${escapeHtml(n.label)}</span>
          <span class="canvas-layer-kind">${escapeHtml(meta)}</span>
        </button>
        ${reorder}
      </div>`;
    })
    .join("");

  const suggested = suggestLayerName(bakedComp, "text");

  el.innerHTML = `<div class="canvas-layer-list">${listHtml}</div>
    <div class="canvas-layers-add">
      <label class="canvas-add-field"><span>Name</span>
        <input type="text" id="canvasAddName" value="${escapeAttr(suggested)}" spellcheck="false" placeholder="Label" />
      </label>
      <label class="canvas-add-field"><span>Kind</span>
        <select id="canvasAddKind">
          <option value="text">Text</option>
          <option value="layout">Layout</option>
          <option value="icon">Icon</option>
          <option value="media">Media</option>
        </select>
      </label>
      <button type="button" class="btn primary btn-tiny" id="canvasAddLayer">Add layer</button>
    </div>`;

  el.querySelectorAll("[data-layer]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-layer");
      if (id && handlers.onSelect) handlers.onSelect(id);
    });
  });

  el.querySelectorAll("[data-move]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (btn.hasAttribute("disabled")) return;
      const letName = btn.getAttribute("data-let");
      const dir = btn.getAttribute("data-move");
      if (letName && handlers.onMove) handlers.onMove(letName, dir === "down" ? 1 : -1);
    });
  });

  const kindSel = el.querySelector("#canvasAddKind");
  const nameInput = el.querySelector("#canvasAddName");
  kindSel?.addEventListener("change", () => {
    if (!(nameInput instanceof HTMLInputElement)) return;
    const kind = /** @type {HTMLSelectElement} */ (kindSel).value;
    nameInput.value = suggestLayerName(bakedComp, kind);
  });

  el.querySelector("#canvasAddLayer")?.addEventListener("click", () => {
    const kind = kindSel instanceof HTMLSelectElement ? kindSel.value : "text";
    const rawName = nameInput instanceof HTMLInputElement ? nameInput.value : "";
    const name = sanitizeLayerName(rawName);
    if (!name) return;
    if (handlers.onAdd) handlers.onAdd({ kind, name });
  });
}

export { sanitizeLayerName, suggestLayerName, usedLetNames, effectiveRootChildNames };

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}
