/** @typedef {'design' | 'prototype' | 'review'} StudioMode */
/** @typedef {'system' | 'files'} NavTab */
/** @typedef {'primary' | 'gallery'} PreviewMode */
/** @typedef {'preview' | 'canvas'} RightPaneMode */
/** @typedef {'component' | 'tokens' | 'theme' | 'typeStyles' | 'samples' | 'file'} SelectionKind */
/** @typedef {'fixtures' | 'params'} WorldMode */

/**
 * @typedef {object} StudioState
 * @property {StudioMode} mode
 * @property {NavTab} navTab
 * @property {PreviewMode} previewMode
 * @property {RightPaneMode} rightPaneMode
 * @property {boolean} previewPinned
 * @property {string | null} root
 * @property {string | null} rootDisplay
 * @property {string | null} rootLabel
 * @property {string | null} entry
 * @property {Record<string, string>} files
 * @property {Record<string, string>} baselines
 * @property {Set<string>} dirty
 * @property {string | null} editFile
 * @property {string | null} previewRoot
 * @property {string | null} selectedSymbol
 * @property {SelectionKind | null} selectedKind
 * @property {WorldMode} worldMode
 * @property {object | null} catalogue
 * @property {string} theme
 * @property {Record<string, string | null>} activeWorld
 * @property {Record<string, Record<string, unknown>>} paramOverrides
 * @property {Record<string, string>} hostFacts
 * @property {string} navQuery
 */

/** @type {StudioState} */
export const state = {
  mode: "design",
  navTab: "system",
  previewMode: "primary",
  rightPaneMode: "preview",
  previewPinned: false,
  root: null,
  rootDisplay: null,
  rootLabel: null,
  entry: null,
  files: {},
  baselines: {},
  dirty: new Set(),
  editFile: null,
  previewRoot: null,
  selectedSymbol: null,
  selectedKind: null,
  worldMode: "fixtures",
  catalogue: null,
  theme: "",
  activeWorld: {},
  paramOverrides: {},
  hostFacts: {},
  navQuery: "",
};

/** @type {Set<() => void>} */
const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emit() {
  for (const fn of listeners) fn();
}

export function markDirty(path) {
  state.dirty.add(path);
  emit();
}

export function clearDirty(path) {
  if (path) state.dirty.delete(path);
  else state.dirty.clear();
  emit();
}

export function isDirty() {
  return state.dirty.size > 0;
}
