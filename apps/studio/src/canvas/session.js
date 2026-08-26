/**
 * Canvas session: selection, pending edits, variant world (P1).
 */

/**
 * @typedef {object} PendingEdit
 * @property {string} id
 * @property {'setProp' | 'addLayer' | 'deleteLayer' | 'reorderChildren'} kind
 * @property {string} target  Layer path ("root" | "let:Name" | "path:0.1")
 * @property {string} [prop]
 * @property {unknown} [value]
 * @property {Record<string, string>} [axes]  Non-default variant axes for this edit
 * @property {object} [payload]  Extra for add/delete/reorder
 * @property {string} [warning]
 */

/**
 * @typedef {object} CanvasSession
 * @property {string | null} component
 * @property {string | null} file
 * @property {string} selectedLayer
 * @property {Record<string, unknown>} world  Param bag for bake (canvas-scoped)
 * @property {PendingEdit[]} pending
 * @property {object | null} bake
 * @property {string | null} bakeError
 * @property {string[]} warnings
 */

/** @type {CanvasSession} */
export const canvasSession = {
  component: null,
  file: null,
  selectedLayer: "root",
  world: {},
  pending: [],
  bake: null,
  bakeError: null,
  warnings: [],
};

let seq = 0;

/** @type {Set<() => void>} */
const listeners = new Set();

export function subscribeCanvas(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitCanvas() {
  for (const fn of listeners) fn();
}

/**
 * @param {string | null} component
 * @param {string | null} file
 */
export function resetCanvasSession(component, file) {
  canvasSession.component = component;
  canvasSession.file = file;
  canvasSession.selectedLayer = "root";
  canvasSession.world = {};
  canvasSession.pending = [];
  canvasSession.bake = null;
  canvasSession.bakeError = null;
  canvasSession.warnings = [];
  emitCanvas();
}

/**
 * @param {string} layerId
 */
export function selectCanvasLayer(layerId) {
  canvasSession.selectedLayer = layerId || "root";
  emitCanvas();
}

/**
 * @param {Record<string, unknown>} world
 */
export function setCanvasWorld(world) {
  canvasSession.world = { ...(world ?? {}) };
  emitCanvas();
}

/**
 * @param {string} key
 * @param {unknown} value
 */
export function setCanvasWorldParam(key, value) {
  if (value === undefined || value === null || value === "") {
    delete canvasSession.world[key];
  } else {
    canvasSession.world[key] = value;
  }
  emitCanvas();
}

/**
 * @param {Omit<PendingEdit, 'id'>} edit
 * @param {{ silent?: boolean }} [opts]  silent: skip emit (typing — caller refreshes live chrome)
 */
export function pushPending(edit, opts = {}) {
  const id = `pe-${++seq}`;
  // Replace prior setProp for same target+prop
  if (edit.kind === "setProp" && edit.prop) {
    canvasSession.pending = canvasSession.pending.filter(
      (p) => !(p.kind === "setProp" && p.target === edit.target && p.prop === edit.prop),
    );
  }
  if (edit.kind === "reorderChildren") {
    canvasSession.pending = canvasSession.pending.filter((p) => p.kind !== "reorderChildren");
  }
  canvasSession.pending.push({ ...edit, id });
  if (!opts.silent) emitCanvas();
}

/**
 * Drop pending setProp for a target+prop (e.g. field became invalid).
 * @param {string} target
 * @param {string} prop
 * @param {{ silent?: boolean }} [opts]
 */
export function removePendingProp(target, prop, opts = {}) {
  const before = canvasSession.pending.length;
  canvasSession.pending = canvasSession.pending.filter(
    (p) => !(p.kind === "setProp" && p.target === target && p.prop === prop),
  );
  if (canvasSession.pending.length !== before && !opts.silent) emitCanvas();
}

export function discardPending() {
  canvasSession.pending = [];
  canvasSession.warnings = [];
  emitCanvas();
}

/** True when value is empty / whitespace — not a valid prop write. */
export function isBlankPropValue(value) {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

/**
 * Drop setProp edits that would write blank (inspector empty cells).
 * Clearing a prop is not supported via empty string — leave the PDL line alone.
 * @param {{ silent?: boolean }} [opts]
 */
export function pruneBlankPending(opts = {}) {
  const before = canvasSession.pending.length;
  canvasSession.pending = canvasSession.pending.filter(
    (p) => !(p.kind === "setProp" && isBlankPropValue(p.value)),
  );
  if (canvasSession.pending.length !== before && !opts.silent) emitCanvas();
}

/**
 * @param {string[]} warnings
 */
export function setCanvasWarnings(warnings) {
  canvasSession.warnings = warnings ?? [];
  emitCanvas();
}

/**
 * Effective prop value: pending overlay on baked props.
 * @param {string} target
 * @param {string} prop
 * @param {Record<string, unknown> | null | undefined} bakedProps
 */
export function effectiveProp(target, prop, bakedProps) {
  for (let i = canvasSession.pending.length - 1; i >= 0; i--) {
    const p = canvasSession.pending[i];
    if (p.kind === "setProp" && p.target === target && p.prop === prop) {
      return p.value;
    }
  }
  return bakedProps?.[prop];
}
