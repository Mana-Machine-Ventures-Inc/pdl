/**
 * Effective root children order + structural pending overlay on bake tree.
 */

import { canvasSession } from "./session.js";

/** @typedef {'text' | 'layout' | 'icon' | 'media'} LayerKind */

/**
 * Sanitize a user layer name to a valid let identifier.
 * @param {string} name
 */
export function sanitizeLayerName(name) {
  const cleaned = String(name).replace(/[^A-Za-z0-9_]/g, "") || "Layer";
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `L${cleaned}`;
}

/**
 * Root-level let names after applying pending structural edits.
 * @param {object | null | undefined} bakedComp
 * @param {import('./session.js').PendingEdit[]} [pending]
 * @returns {string[]}
 */
export function effectiveRootChildNames(bakedComp, pending = canvasSession.pending) {
  /** @type {string[]} */
  let names = [];
  const kids = bakedComp?.root?.children;
  if (Array.isArray(kids)) {
    for (const ch of kids) {
      if (ch && typeof ch.id === "string" && ch.id && !/^\d+$/.test(ch.id)) {
        names.push(ch.id);
      }
    }
  }
  for (const p of pending) {
    if (p.kind === "addLayer" && p.payload?.name) {
      const n = sanitizeLayerName(String(p.payload.name));
      if (!names.includes(n)) names.push(n);
    } else if (p.kind === "deleteLayer" && p.target?.startsWith("let:")) {
      const n = p.target.slice(4);
      names = names.filter((x) => x !== n);
    } else if (p.kind === "reorderChildren" && Array.isArray(p.payload?.order)) {
      names = p.payload.order.map((x) => String(x)).filter(Boolean);
    }
  }
  return names;
}

/**
 * Clone bake component and apply pending add/delete/reorder to root.children.
 * @param {object | null | undefined} bakedComp
 * @param {import('./session.js').PendingEdit[]} [pending]
 */
export function overlayStructureOnBake(bakedComp, pending = canvasSession.pending) {
  if (!bakedComp?.root) return bakedComp ?? null;
  const clone = structuredClone
    ? structuredClone(bakedComp)
    : JSON.parse(JSON.stringify(bakedComp));
  if (!clone.root.children) clone.root.children = [];

  /** @type {Map<string, object>} */
  const byId = new Map();
  for (const ch of clone.root.children) {
    if (ch && typeof ch.id === "string") byId.set(ch.id, ch);
  }

  for (const p of pending) {
    if (p.kind === "addLayer" && p.payload?.name) {
      const name = sanitizeLayerName(String(p.payload.name));
      const kind = String(p.payload.kind || "text").toLowerCase();
      if (!byId.has(name)) {
        const frame = placeholderFrame(kind, name, p.payload);
        byId.set(name, frame);
      }
    } else if (p.kind === "deleteLayer" && p.target?.startsWith("let:")) {
      byId.delete(p.target.slice(4));
    }
  }

  const order = effectiveRootChildNames(bakedComp, pending);
  clone.root.children = order.map((name) => byId.get(name)).filter(Boolean);
  return clone;
}

/**
 * @param {string} kind
 * @param {string} name
 * @param {object} payload
 */
function placeholderFrame(kind, name, payload) {
  /** @type {Record<string, unknown>} */
  const props = {};
  if (kind === "text") {
    props.content = payload.content != null ? String(payload.content) : name;
    props.fontSize = 15;
    props.fontWeight = 600;
  } else if (kind === "media") {
    props.source = "";
    props.width = ".fill";
    props.height = 120;
  } else if (kind === "icon") {
    props.size = 20;
    props.color = "#333333";
  }
  return { id: name, kind, props, children: [] };
}

/**
 * Move a root child one step up/down in effective order; returns new order or null.
 * @param {object | null | undefined} bakedComp
 * @param {string} letName
 * @param {-1 | 1} delta
 * @param {import('./session.js').PendingEdit[]} [pending]
 */
export function moveRootChild(bakedComp, letName, delta, pending = canvasSession.pending) {
  const order = effectiveRootChildNames(bakedComp, pending);
  const i = order.indexOf(letName);
  if (i < 0) return null;
  const j = i + delta;
  if (j < 0 || j >= order.length) return null;
  const next = order.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/**
 * Names already used by lets (baked + pending adds, minus pending deletes).
 * @param {object | null | undefined} bakedComp
 * @param {import('./session.js').PendingEdit[]} [pending]
 */
export function usedLetNames(bakedComp, pending = canvasSession.pending) {
  return new Set(effectiveRootChildNames(bakedComp, pending));
}

/**
 * Default name for a new layer of given kind.
 * @param {object | null | undefined} bakedComp
 * @param {string} kind
 */
export function suggestLayerName(bakedComp, kind) {
  const used = usedLetNames(bakedComp);
  const base =
    kind === "text"
      ? "Label"
      : kind === "layout"
        ? "Box"
        : kind === "icon"
          ? "Icon"
          : "Media";
  if (!used.has(base)) return base;
  for (let n = 2; n < 100; n++) {
    const cand = `${base}${n}`;
    if (!used.has(cand)) return cand;
  }
  return `${base}${Date.now() % 1000}`;
}
