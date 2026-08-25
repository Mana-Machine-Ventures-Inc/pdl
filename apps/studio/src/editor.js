import { basicSetup } from "codemirror";
import { indentWithTab } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { state, markDirty } from "./state.js";
import { findSymbolInSource } from "./symbols.js";

/** @type {EditorView | null} */
let view = null;
/** @type {string | null} */
let boundPath = null;
/** @type {((path: string, text: string) => void) | null} */
let onChange = null;
let syncing = false;

export function mountEditor(parent, handlers = {}) {
  onChange = handlers.onChange ?? null;
  view = new EditorView({
    parent,
    state: EditorState.create({
      doc: "",
      extensions: [
        basicSetup,
        EditorView.lineWrapping,
        keymap.of([indentWithTab]),
        EditorView.updateListener.of((update) => {
          if (syncing || !update.docChanged || !boundPath) return;
          const text = update.state.doc.toString();
          state.files[boundPath] = text;
          markDirty(boundPath);
          onChange?.(boundPath, text);
        }),
        EditorView.theme({
          "&": { height: "100%" },
          ".cm-scroller": { overflow: "auto", fontFamily: "var(--mono)" },
        }),
      ],
    }),
  });
  return view;
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
  }
}

/**
 * @param {string} symbol
 */
export function focusSymbol(symbol) {
  if (!view || !state.editFile) return;
  const loc = findSymbolInSource(state.files[state.editFile] || "", symbol);
  if (!loc) return;
  const line = view.state.doc.line(Math.min(loc.line + 1, view.state.doc.lines));
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
