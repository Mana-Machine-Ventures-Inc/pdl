import { basicSetup } from "codemirror";
import { indentWithTab } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { pdlCompletionSource as buildPdlCompletionSource } from "@playground/pdl-completions.js";
import { formatTemplateInsert, PDL_TEMPLATES } from "@playground/pdl-templates.js";
import {
  PROPERTIES_BY_KIND,
  inferFrameKindAt,
  formatPropertyInsert,
} from "@playground/add-property.js";
import { extractAtPos, resolveGotoTarget } from "@playground/pdl-goto.js";
import { state, markDirty } from "./state.js";
import { findSymbolInSource } from "./symbols.js";

/** @type {EditorView | null} */
let view = null;
/** @type {string | null} */
let boundPath = null;
/** @type {((path: string, text: string) => void) | null} */
let onChange = null;
/** @type {((path: string, line: number, name?: string) => void) | null} */
let onGoto = null;
/** @type {(() => void) | null} */
let onCursorScope = null;
let syncing = false;

function completionSymbols() {
  const cat = state.catalogue;
  /** @type {string[]} */
  const out = [];
  if (cat?.components) out.push(...cat.components);
  if (cat?.themes) out.push(...cat.themes);
  for (const t of cat?.designSummary?.typeStyles ?? []) {
    if (typeof t === "string") out.push(t);
    else if (t?.name) out.push(t.name);
  }
  for (const p of cat?.designSummary?.primitives ?? []) {
    if (typeof p === "string") out.push(p);
    else if (p?.name) out.push(p.name);
  }
  for (const p of cat?.designSummary?.semantics ?? []) {
    if (typeof p === "string") out.push(p);
    else if (p?.name) out.push(p.name);
  }
  for (const bank of Object.keys(cat?.samples ?? {})) out.push(bank);
  return out;
}

function gotoDefinition() {
  if (!view || !boundPath) return false;
  const pos = view.state.selection.main.head;
  const target = extractAtPos(view.state.doc, pos);
  if (!target) return false;
  const loc = resolveGotoTarget(target, state.files, boundPath);
  if (!loc) return false;
  onGoto?.(loc.path, loc.line, loc.name);
  return true;
}

/**
 * @param {HTMLElement} parent
 * @param {object} [handlers]
 */
export function mountEditor(parent, handlers = {}) {
  onChange = handlers.onChange ?? null;
  onGoto = handlers.onGoto ?? null;
  onCursorScope = handlers.onCursorScope ?? null;

  view = new EditorView({
    parent,
    state: EditorState.create({
      doc: "",
      extensions: [
        basicSetup,
        EditorView.lineWrapping,
        keymap.of([
          indentWithTab,
          ...completionKeymap,
          {
            key: "F12",
            run: () => gotoDefinition(),
          },
          {
            key: "Mod-b",
            run: () => gotoDefinition(),
          },
        ]),
        autocompletion({
          override: [
            (context) => buildPdlCompletionSource(context, completionSymbols),
          ],
        }),
        EditorView.domEventHandlers({
          click(event, v) {
            if (!(event.metaKey || event.ctrlKey)) return false;
            const pos = v.posAtCoords({ x: event.clientX, y: event.clientY });
            if (pos == null) return false;
            const target = extractAtPos(v.state.doc, pos);
            if (!target) return false;
            const loc = resolveGotoTarget(target, state.files, boundPath || state.editFile || "");
            if (!loc) return false;
            onGoto?.(loc.path, loc.line, loc.name);
            return true;
          },
        }),
        EditorView.updateListener.of((update) => {
          if (syncing) return;
          if (update.docChanged && boundPath) {
            const text = update.state.doc.toString();
            state.files[boundPath] = text;
            markDirty(boundPath);
            onChange?.(boundPath, text);
          }
          if (update.selectionSet || update.docChanged) {
            refreshPropertyMenu();
            onCursorScope?.();
          }
        }),
        EditorView.theme({
          "&": { height: "100%" },
          ".cm-scroller": { overflow: "auto", fontFamily: "var(--mono)" },
          ".cm-tooltip-autocomplete": { fontFamily: "var(--mono)", fontSize: "12px" },
        }),
      ],
    }),
  });

  fillTemplateMenu();
  refreshPropertyMenu();
  wireToolbar();

  return view;
}

function fillTemplateMenu() {
  const sel = document.getElementById("insertTemplate");
  if (!sel) return;
  sel.innerHTML =
    `<option value="">Template…</option>` +
    PDL_TEMPLATES.map((t) => `<option value="${t.id}">${escapeHtml(t.label)}</option>`).join("");
}

function refreshPropertyMenu() {
  const sel = document.getElementById("addProperty");
  const kindEl = document.getElementById("addPropertyKind");
  if (!sel || !view) return;
  const pos = view.state.selection.main.head;
  const kind = inferFrameKindAt(view.state.doc.toString(), pos);
  if (kindEl) kindEl.textContent = `Kind: ${kind}`;
  const props = PROPERTIES_BY_KIND[kind] || PROPERTIES_BY_KIND.unknown;
  const prev = sel.value;
  sel.innerHTML =
    `<option value="">Property…</option>` +
    props.map((p) => `<option value="${p.id}">${escapeHtml(p.label)}</option>`).join("");
  if (props.some((p) => p.id === prev)) sel.value = prev;
}

function wireToolbar() {
  document.getElementById("insertTemplate")?.addEventListener("change", (e) => {
    const id = /** @type {HTMLSelectElement} */ (e.target).value;
    if (!id || !view) return;
    const tmpl = PDL_TEMPLATES.find((t) => t.id === id);
    /** @type {HTMLSelectElement} */ (e.target).value = "";
    if (!tmpl) return;
    const pos = view.state.selection.main.head;
    const insert = formatTemplateInsert(view.state.doc.toString(), pos, tmpl.snippet);
    view.dispatch({
      changes: { from: pos, insert },
      selection: { anchor: pos + insert.length },
    });
    view.focus();
  });

  document.getElementById("addProperty")?.addEventListener("change", (e) => {
    const id = /** @type {HTMLSelectElement} */ (e.target).value;
    if (!id || !view) return;
    const pos = view.state.selection.main.head;
    const kind = inferFrameKindAt(view.state.doc.toString(), pos);
    const prop = (PROPERTIES_BY_KIND[kind] || PROPERTIES_BY_KIND.unknown).find((p) => p.id === id);
    /** @type {HTMLSelectElement} */ (e.target).value = "";
    if (!prop) return;
    const insert = formatPropertyInsert(view.state.doc.toString(), pos, prop.snippet);
    view.dispatch({
      changes: { from: pos, insert },
      selection: { anchor: pos + insert.length },
    });
    view.focus();
    refreshPropertyMenu();
  });
}

export function syncEditorFromState() {
  if (!view) return;
  const path = state.editFile;
  syncing = true;
  try {
    if (!path) {
      boundPath = null;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: "" },
      });
      return;
    }
    const text = state.files[path] ?? "";
    if (boundPath === path && view.state.doc.toString() === text) return;
    boundPath = path;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: text },
    });
  } finally {
    syncing = false;
    refreshPropertyMenu();
  }
}

/**
 * @param {string} symbol
 */
export function focusSymbol(symbol) {
  if (!view || !state.editFile) return;
  const loc = findSymbolInSource(state.files[state.editFile] || "", symbol);
  if (!loc) return;
  focusLine(loc.line + 1);
}

/**
 * 1-based line
 * @param {number} line1
 */
export function focusLine(line1) {
  if (!view) return;
  const line = view.state.doc.line(Math.min(Math.max(1, line1), view.state.doc.lines));
  view.dispatch({
    selection: { anchor: line.from },
    effects: EditorView.scrollIntoView(line.from, { y: "start" }),
  });
  view.focus();
}

export function flushEditorToFiles() {
  if (!view || !boundPath) return;
  state.files[boundPath] = view.state.doc.toString();
}

export function getEditorView() {
  return view;
}

/** Current cursor offset in the active editor doc, or null. */
export function getCursorOffset() {
  if (!view) return null;
  return view.state.selection.main.head;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
