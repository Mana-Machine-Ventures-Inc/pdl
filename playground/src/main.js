import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { indentWithTab } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import {
  formatPropertyInsert,
  inferFrameKindAt,
  PROPERTIES_BY_KIND,
} from "./add-property.js";
import {
  augmentUnknownComponentMessage,
  formatUnreachableModuleWarning,
  resolveCanvasTarget,
  sourceDeclaresComponent,
  unreachableWorkspaceModules,
} from "./file-canvas.js";
import { pdlCompletionSource as buildPdlCompletionSource } from "./pdl-completions.js";
import { formatTemplateInsert, PDL_TEMPLATES } from "./pdl-templates.js";
import { loadWasmBake, virtualizeSources } from "./wasm-bake.js";
import {
  applyPreviewHtml,
  capturePreviewEphemerals,
  restorePreviewEphemerals,
  requestInteractiveRebind,
} from "./preview-apply.js";
import { allowIrOnlyPreviewApply } from "./dual-bake-policy.js";
import {
  bakedComponentTreesEqual,
  changedEditableSessionTypes,
  frameTreeNestsInstanceTypes,
  reconcileBakedComponentIntoCanvas,
  reconcileBakedInstanceIntoElement,
} from "@pdl/bakeReconcile.ts";
import { collectEditableSessionDefaults } from "@pdl/renderHtml.ts";

/** Synthetic pack id for browser-only scratch (never mixed with disk fixture packs). */
const SCRATCH_PACK_ID = "__scratch__";

/** Default scratch starter — tokens + a simple labeled control. */
const START_DESIGN_PDL = `// Scratch project — separate from fixture packs (Airbnb, molecules, …).
// Coverage walk: rename entry to lab.pdl and build bottom-up (see PLAYGROUND_COVERAGE_CHECKLIST.md).

primitive atoms.color.brandPrimary: Color = #FF5A5F
primitive atoms.color.surface: Color = #F2F2F4
primitive atoms.color.labelOnBrand: Color = #FFFFFF

semantic atoms.color.buttonFill: Color = atoms.color.brandPrimary

component Button() layout {
  direction = .row
  align = .center
  justify = .center
  gap = 8
  background = atoms.color.buttonFill
  cornerRadius = 8
  width = .hug
  height = .hug

  let Label = Text(
    content: "Button",
    color: atoms.color.labelOnBrand,
    fontSize: 15,
    fontWeight: 600
  )

  children = [Label]
}
`;

/** @type {Record<string, string>} */
let files = { "lab.pdl": START_DESIGN_PDL };
let activePath = "lab.pdl";
/** Last real disk pack id (so leaving scratch can restore it). */
let lastDiskPackId = "airbnb-lite";
/** @type {Record<string, string> | null} last scratch file map (survives toggling to a disk pack) */
let lastScratchSnapshot = null;

/** @type {string[]} */
let completionSymbols = [];

/** @type {EditorView | null} */
let editorView = null;

/** Auto-refresh preview this many ms after the last editor change. */
const RENDER_DEBOUNCE_MS = 500;

/** Browser draft — survives reload; not a Studio project store.
 * Bump key/version when language breaks old editor buffers (e.g. protocol `: component`). */
const DRAFT_STORAGE_KEY = "pdl-playground-draft-v2";
const DRAFT_SCHEMA_VERSION = 2;
/** Drop drafts older than this (ms). */
const DRAFT_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const DRAFT_SAVE_DEBOUNCE_MS = 400;

/** @type {ReturnType<typeof setTimeout> | null} */
let renderDebounceTimer = null;
/** @type {ReturnType<typeof setTimeout> | null} */
let draftSaveTimer = null;
/** Skip autosave while applying a restored draft / pack load. */
let suppressDraftSave = false;
/** Skip dirty-tracking while programmatically replacing the editor buffer. */
let suppressEditorDirty = false;
/**
 * Last content loaded from disk per path (open-pack / reload).
 * Flush refuses to overwrite when the on-disk file no longer matches this baseline.
 * @type {Record<string, string>}
 */
let diskBaseline = {};

/** Incremented on each render attempt; stale HTTP responses are ignored. */
let latestRenderId = 0;

/** @type {Record<string, unknown> | null} last Analyze/Render designSummary (resolved colors for token preview) */
let lastDesignSummary = null;

const $ = (id) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
};

const dropzone = $("dropzone");
const filePick = $("filePick");
const dirPick = $("dirPick");
const entryPath = $("entryPath");
const editorMount = $("editorMount");
const fileTabs = $("fileTabs");
const component = $("component");
const themeInput = $("theme");
const themeList = $("themeList");
const kvJson = $("kvJson");
const btnAnalyze = $("btnAnalyze");
const btnRender = $("btnRender");
const status = $("status");
const errorEl = $("error");
const frame = $("frame");
const packWrap = $("packWrap");
const packPath = $("packPath");
const packSelect = $("packSelect");
const packDesc = $("packDesc");
const btnReloadPack = $("btnReloadPack");
const draftHint = $("draftHint");
const fixtureChips = $("fixtureChips");
const fixtureHint = $("fixtureHint");
const editorWorkspace = $("editorWorkspace");
const designMeta = $("designMeta");
const outputPanelHtml = $("outputPanelHtml");
const outputPanelDesign = $("outputPanelDesign");
const renderConsole = $("renderConsole");
const renderConsoleTitle = $("renderConsoleTitle");
const renderConsoleBody = $("renderConsoleBody");
const canvasHint = $("canvasHint");
const addProperty = $("addProperty");
const addPropertyKind = $("addPropertyKind");
const insertTemplate = $("insertTemplate");

/** @type {string | null} */
let preferredComponent = "AbnPointerLab";

/** Primary component for fixtures/params (from active file canvas). */
let primaryComponent = "";

/** @type {Record<string, Record<string, Record<string, unknown>>>} */
let fixturesByComponent = {};
/** @type {Record<string, Array<{ name: string; typeName: string; default: unknown }>>} */
let componentParams = {};
/** @type {Record<string, string[]>} */
let variantCases = {};
/** Per-component scalar param overrides (never shared across gallery sections). */
/** @type {Record<string, Record<string, unknown>>} */
let kvByComponent = {};
/** @type {string | null} */
let activeFixtureLabel = null;
/** @type {boolean} */
let syncingKnobs = false;
/**
 * Paths edited in the Playground editor. Analyze/Render only flush these —
 * never rewrite untouched disk files from a stale in-memory bag.
 * @type {Set<string>}
 */
let dirtyDiskPaths = new Set();

/** @param {string} rel */
function markFileDirty(rel) {
  if (suppressEditorDirty) return;
  if (typeof rel === "string" && rel.endsWith(".pdl")) dirtyDiskPaths.add(rel);
}

/** @param {Record<string, string>} fileMap */
function adoptDiskBaseline(fileMap) {
  diskBaseline = {};
  for (const [rel, content] of Object.entries(fileMap ?? {})) {
    if (typeof content === "string" && rel.endsWith(".pdl")) {
      diskBaseline[rel] = content;
    }
  }
}

/** @type {ReturnType<typeof resolveCanvasTarget> | null} */
let lastCanvas = null;

const editorTheme = EditorView.theme({
  "&": { height: "100%" },
  ".cm-scroller": { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  ".cm-gutters": {
    backgroundColor: "#f0f1f4",
    color: "#6e7781",
    borderRight: "1px solid #d8dee4",
  },
  ".cm-activeLineGutter": { backgroundColor: "#e8ebf0" },
});

/** @param {import("@codemirror/autocomplete").CompletionContext} context */
function pdlCompletionSource(context) {
  return buildPdlCompletionSource(context, () => completionSymbols);
}

function setCompletionSymbolsFromAnalyze(data) {
  const s = new Set();
  for (const c of data.components ?? []) {
    if (c) s.add(String(c));
  }
  const ds = data.designSummary;
  if (ds && typeof ds === "object") {
    for (const p of ds.primitives ?? []) {
      if (p?.name) s.add(String(p.name));
    }
    for (const x of ds.semantics ?? []) {
      if (x?.name) s.add(String(x.name));
    }
    for (const t of ds.themeDefinitions ?? []) {
      if (t?.name) s.add(String(t.name));
    }
    for (const v of ds.variants ?? []) {
      if (v?.name) s.add(String(v.name));
      for (const c of v.cases ?? []) {
        if (c) s.add(`.${c}`);
        if (c) s.add(String(c));
      }
    }
    for (const ts of ds.typeStyles ?? []) {
      if (ts?.name) s.add(String(ts.name));
    }
  }
  for (const [comp, params] of Object.entries(data.componentParams ?? {})) {
    s.add(comp);
    for (const p of params) {
      if (p?.name) s.add(String(p.name));
    }
  }
  for (const cases of Object.values(data.variantCases ?? {})) {
    for (const c of cases) {
      s.add(`.${c}`);
      s.add(String(c));
    }
  }
  completionSymbols = [...s].sort((a, b) => a.localeCompare(b));
}

function storeControlsFromData(data) {
  fixturesByComponent = data.fixturesByComponent ?? {};
  componentParams = data.componentParams ?? {};
  variantCases = data.variantCases ?? {};
}

function readKvObject() {
  const raw = kvJson.value.trim();
  if (!raw) return {};
  const v = JSON.parse(raw);
  if (v === null || typeof v !== "object" || Array.isArray(v)) {
    throw new Error("Param overrides must be a JSON object");
  }
  return /** @type {Record<string, unknown>} */ (v);
}

function writeKvObject(obj) {
  syncingKnobs = true;
  kvJson.value = Object.keys(obj).length ? JSON.stringify(obj, null, 2) : "";
  syncingKnobs = false;
}

/** True when a string is a JSON array/object (e.g. mis-typed list params). */
function isJsonStructureString(v) {
  if (typeof v !== "string") return false;
  const t = v.trim();
  if (!(t.startsWith("[") || t.startsWith("{"))) return false;
  try {
    const parsed = JSON.parse(t);
    return parsed !== null && typeof parsed === "object";
  } catch {
    return false;
  }
}

/**
 * Bake/fixture overrides: scalars + arrays (filtered catalogs).
 * Drop plain objects and JSON-looking strings (those are not CLI/WASM kv shapes).
 * @param {Record<string, unknown>} obj
 */
function bakeKv(obj) {
  /** @type {Record<string, unknown>} */
  const out = {};
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return out;
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) {
      out[k] = v;
      continue;
    }
    if (v !== null && typeof v === "object") continue;
    // Enrichment sometimes stringifies instance lists (chips) as type String.
    if (isJsonStructureString(v)) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Keep only keys declared on `compName` (scalars + list arrays for fixtures).
 * Unknown keys must never enter another component's bakedParams.
 * @param {string} compName
 * @param {Record<string, unknown>} kv
 */
function filterKvToDeclaredParams(compName, kv) {
  const declared = componentParams[compName];
  const bag = bakeKv(kv);
  if (!declared?.length) return bag;
  const allowed = new Set(declared.map((p) => p.name).filter(Boolean));
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(bag)) {
    if (allowed.has(k)) out[k] = v;
  }
  return out;
}

/**
 * Component that owns the KV textarea / override bag for this render.
 * Prefer interaction/pack choice over canvas-first (file declaration order).
 * @param {string[]} names
 * @param {string} [canvasPrimary]
 */
function overrideOwner(names, canvasPrimary) {
  if (preferredComponent && names.includes(preferredComponent)) return preferredComponent;
  if (primaryComponent && names.includes(primaryComponent)) return primaryComponent;
  if (component.value && names.includes(component.value)) return component.value;
  if (canvasPrimary && names.includes(canvasPrimary)) return canvasPrimary;
  return names[0] ?? "";
}

/** @param {string} owner */
function syncKvTextareaFromOwner(owner) {
  if (!owner) {
    writeKvObject({});
    return;
  }
  writeKvObject(kvByComponent[owner] ?? {});
}

/**
 * Persist textarea edits into the owner's bag (filtered).
 * @param {string} owner
 */
function commitKvTextareaToOwner(owner) {
  if (!owner) return;
  const filtered = filterKvToDeclaredParams(owner, readKvObject());
  if (Object.keys(filtered).length) kvByComponent[owner] = filtered;
  else delete kvByComponent[owner];
}

/**
 * @param {string} owner
 * @param {Record<string, unknown>} params
 */
function setKvForComponent(owner, params) {
  if (!owner) return;
  const filtered = filterKvToDeclaredParams(owner, params);
  if (Object.keys(filtered).length) kvByComponent[owner] = filtered;
  else delete kvByComponent[owner];
  if (owner === primaryComponent || owner === preferredComponent || owner === component.value) {
    syncKvTextareaFromOwner(owner);
  }
}

/**
 * @param {string[]} names
 * @returns {Record<string, Record<string, unknown>>}
 */
function buildComponentOverrides(names) {
  /** @type {Record<string, Record<string, unknown>>} */
  const out = {};
  for (const name of names) {
    const bag = kvByComponent[name];
    if (!bag) continue;
    const filtered = filterKvToDeclaredParams(name, bag);
    if (Object.keys(filtered).length) out[name] = filtered;
  }
  return out;
}

function renderFixtureChips() {
  fixtureChips.replaceChildren();
  const name = primaryComponent || component.value;
  const examples = fixturesByComponent[name] ?? {};
  const labels = Object.keys(examples).sort();
  if (labels.length === 0) {
    fixtureHint.hidden = false;
    fixtureHint.textContent = name
      ? `No fixtures for ${name}.`
      : "Open a file that declares a component with fixtures.";
    return;
  }
  fixtureHint.hidden = true;
  for (const label of labels) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip" + (label === activeFixtureLabel ? " active" : "");
    b.textContent = label;
    b.setAttribute("role", "listitem");
    b.addEventListener("click", () => {
      activeFixtureLabel = label;
      const owner = name || primaryComponent || component.value;
      // Fixtures may include explicit `tracks` — do not host-refilter over them.
      setKvForComponent(owner, { ...examples[label] });
      renderFixtureChips();
      scheduleDebouncedRender(0, { incremental: true, ownerOnly: true });
    });
    fixtureChips.append(b);
  }
}

function refreshControlsUi() {
  renderFixtureChips();
}

function getEditorText() {
  return editorView?.state.doc.toString() ?? "";
}

function setEditorText(text) {
  if (!editorView) return;
  suppressEditorDirty = true;
  try {
    editorView.dispatch({
      changes: { from: 0, to: editorView.state.doc.length, insert: text },
    });
  } finally {
    suppressEditorDirty = false;
  }
}

function mountEditor() {
  const start = files[activePath] ?? "";
  editorView = new EditorView({
    parent: editorMount,
    state: EditorState.create({
      doc: start,
      extensions: [
        basicSetup,
        EditorView.lineWrapping,
        editorTheme,
        keymap.of([indentWithTab, ...completionKeymap]),
        autocompletion({ override: [pdlCompletionSource] }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            files[activePath] = getEditorText();
            if (!suppressEditorDirty) {
              markFileDirty(activePath);
              scheduleDraftSave();
              // Live preview: rebake canvas IR + reconcile deltas (not srcdoc remount).
              scheduleDebouncedRender(undefined, { incremental: true });
            }
          }
        }),
      ],
    }),
  });
}

function setStatus(msg) {
  status.textContent = msg;
}

function showError(msg) {
  if (!msg) {
    errorEl.hidden = true;
    errorEl.textContent = "";
    return;
  }
  errorEl.hidden = false;
  // Prefer multi-line compiler messages (code / path / line when present).
  errorEl.textContent = String(msg).trim();
}

/**
 * @param {Array<{ component?: string; phase?: string; message: string; stack?: string }>} entries
 */
function updateRenderConsole(entries) {
  renderConsoleBody.replaceChildren();
  if (!entries || entries.length === 0) {
    renderConsole.hidden = true;
    renderConsole.removeAttribute("open");
    renderConsoleTitle.textContent = "Render console";
    return;
  }
  renderConsole.hidden = false;
  renderConsole.setAttribute("open", "");
  const n = entries.length;
  renderConsoleTitle.textContent = `Render console (${n} ${n === 1 ? "issue" : "issues"})`;
  for (const e of entries) {
    const article = document.createElement("article");
    article.className = "render-console-entry";
    if (e.phase) {
      const ph = document.createElement("span");
      ph.className = "phase";
      ph.textContent = e.phase;
      article.append(ph);
    }
    const h = document.createElement("h4");
    h.textContent = e.component ?? "Error";
    article.append(h);
    const pre = document.createElement("pre");
    pre.className = "msg";
    pre.textContent = e.message;
    article.append(pre);
    if (e.stack) {
      const det = document.createElement("details");
      det.className = "stack";
      const sum = document.createElement("summary");
      sum.textContent = "Stack trace";
      det.append(sum);
      const sp = document.createElement("pre");
      sp.className = "stack";
      sp.textContent = e.stack;
      det.append(sp);
      article.append(det);
    }
    renderConsoleBody.append(article);
  }
}

function jsonCell(obj) {
  const pre = document.createElement("div");
  pre.className = "mono";
  pre.textContent = JSON.stringify(obj, null, 2);
  return pre;
}

/** @param {HTMLElement} parent */
function appendKvTable(parent, obj) {
  const keys = Object.keys(obj).sort();
  if (keys.length === 0) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "— none —";
    parent.append(p);
    return;
  }
  const table = document.createElement("table");
  for (const k of keys) {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.textContent = k;
    const td = document.createElement("td");
    td.append(jsonCell(obj[k]));
    tr.append(th, td);
    table.append(tr);
  }
  parent.append(table);
}

/**
 * @param {unknown} summary
 */
function renderDesignSummary(summary) {
  designMeta.replaceChildren();
  if (!summary || typeof summary !== "object") {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent =
      "Run Analyze or Render to see primitives, semantics, themes, variants, type styles, and merged modules.";
    designMeta.append(p);
    return;
  }

  const s = /** @type {Record<string, unknown>} */ (summary);

  if (s.previewBackground != null && s.previewBackground !== "") {
    const p = document.createElement("p");
    p.append(document.createTextNode("previewBackground: "));
    const code = document.createElement("code");
    code.textContent = String(s.previewBackground);
    p.append(code);
    designMeta.append(p);
  }

  const modules = /** @type {string[] | undefined} */ (s.modulePaths);
  if (modules && modules.length > 0) {
    const det = document.createElement("details");
    det.open = true;
    const sum = document.createElement("summary");
    sum.append(document.createTextNode("Merged modules "));
    const c = document.createElement("span");
    c.className = "count";
    c.textContent = `(${modules.length})`;
    sum.append(c);
    det.append(sum);
    const ul = document.createElement("ul");
    ul.className = "path-list mono";
    for (const path of modules) {
      const li = document.createElement("li");
      li.textContent = path;
      ul.append(li);
    }
    det.append(ul);
    designMeta.append(det);
  }

  /**
   * Shadow preview: white card with the resolved CSS box-shadow.
   * @param {string} css
   */
  function shadowCardEl(css) {
    const pad = document.createElement("span");
    pad.className = "shadow-pad";
    pad.setAttribute("aria-hidden", "true");
    pad.title = css;
    Object.assign(pad.style, {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "0 0 auto",
      width: "40px",
      height: "32px",
      background: "#eef0f3",
      borderRadius: "4px",
      overflow: "visible",
    });
    const card = document.createElement("span");
    Object.assign(card.style, {
      display: "block",
      width: "18px",
      height: "14px",
      background: "#fff",
      borderRadius: "3px",
      boxShadow: css,
    });
    pad.append(card);
    return pad;
  }

  /**
   * Radius preview: quarter-corner sized to the px value (capped for the table).
   * @param {number} px
   */
  function radiusCornerEl(px) {
    const r = Math.max(0, px);
    const box = Math.max(14, Math.min(Math.round(r) || 14, 48));
    const rad = Math.min(r, box);
    const el = document.createElement("span");
    el.setAttribute("aria-hidden", "true");
    el.title = `${r}px`;
    Object.assign(el.style, {
      display: "inline-block",
      flex: "0 0 auto",
      width: `${box}px`,
      height: `${box}px`,
      boxSizing: "border-box",
      background: "#e8ecf1",
      borderTop: "2px solid #334",
      borderLeft: "2px solid #334",
      borderTopLeftRadius: `${rad}px`,
    });
    return el;
  }

  /**
   * @param {string} title
   * @param {Array<Record<string, unknown>>} rows
   * @param {string[]} colKeys
   * @param {string[]} colLabels
   * @param {boolean} open
   */
  function appendTokenTable(title, rows, colKeys, colLabels, open) {
    const det = document.createElement("details");
    det.open = open;
    const sum = document.createElement("summary");
    sum.append(document.createTextNode(`${title} `));
    const c = document.createElement("span");
    c.className = "count";
    c.textContent = `(${rows.length})`;
    sum.append(c);
    det.append(sum);
    if (rows.length === 0) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = "— none —";
      det.append(p);
    } else {
      const table = document.createElement("table");
      const head = document.createElement("tr");
      for (const lab of colLabels) {
        const th = document.createElement("th");
        th.textContent = lab;
        head.append(th);
      }
      table.append(head);
      for (const row of rows) {
        const tr = document.createElement("tr");
        for (const key of colKeys) {
          const td = document.createElement("td");
          if (key === "value" || key === "definition") {
            const wrap = document.createElement("div");
            wrap.className = "token-value-cell";
            wrap.style.display = "flex";
            wrap.style.alignItems = "center";
            wrap.style.gap = "8px";
            const cssColor = typeof row.cssColor === "string" ? row.cssColor : null;
            const hexLabel =
              typeof row.hex === "string"
                ? row.hex
                : typeof row.resolved === "string"
                  ? row.resolved
                  : cssColor;
            const distRaw = row.resolved ?? hexLabel;
            const distPx =
              row.tokenType === "Distance" &&
              (typeof distRaw === "number" || typeof distRaw === "string")
                ? Number(distRaw)
                : NaN;
            const radiusPx =
              row.tokenType === "Radius" &&
              (typeof distRaw === "number" || typeof distRaw === "string")
                ? Number(distRaw)
                : NaN;
            if (Number.isFinite(distPx)) {
              const ruler = document.createElement("span");
              ruler.setAttribute("aria-hidden", "true");
              ruler.title = `${distPx}px`;
              Object.assign(ruler.style, {
                display: "inline-flex",
                alignItems: "center",
                flex: "0 0 auto",
                height: "14px",
                color: "#334",
              });
              const mkTick = () => {
                const t = document.createElement("span");
                Object.assign(t.style, {
                  width: "2px",
                  height: "12px",
                  background: "#334",
                  borderRadius: "1px",
                  flex: "0 0 auto",
                });
                return t;
              };
              const beam = document.createElement("span");
              Object.assign(beam.style, {
                width: `${Math.max(2, Math.min(Math.round(Math.abs(distPx)), 96))}px`,
                height: "2px",
                background: "#334",
                flex: "0 0 auto",
              });
              ruler.append(mkTick(), beam, mkTick());
              wrap.append(ruler);
              const code = document.createElement("code");
              code.textContent = String(distPx);
              wrap.append(code);
            } else if (Number.isFinite(radiusPx) && radiusPx >= 0) {
              wrap.append(radiusCornerEl(radiusPx));
              const code = document.createElement("code");
              code.textContent = String(radiusPx);
              wrap.append(code);
            } else if (row.tokenType === "Shadow") {
              const shadowCss =
                typeof row.shadowCss === "string"
                  ? row.shadowCss
                  : typeof distRaw === "string"
                    ? distRaw
                    : "";
              if (shadowCss.trim()) {
                wrap.append(shadowCardEl(shadowCss.trim()));
                const code = document.createElement("code");
                code.textContent = shadowCss.trim();
                wrap.append(code);
              } else {
                wrap.append(jsonCell(row[key]));
              }
            } else if (
              row.tokenType === "FontFamily" &&
              typeof distRaw === "string" &&
              distRaw.trim().length > 0
            ) {
              const stack = distRaw.trim();
              const { text, missing, primary } = fontFamilyPreviewLabel(stack);
              const sample = document.createElement("span");
              sample.className = missing ? "font-sample font-sample--missing" : "font-sample";
              sample.setAttribute("aria-hidden", "true");
              sample.title = missing
                ? `Font not found locally: ${primary} (falls back in CSS stack)`
                : stack;
              sample.textContent = text;
              Object.assign(sample.style, {
                flex: "0 0 auto",
                fontSize: "16px",
                lineHeight: "1.2",
                letterSpacing: "0.02em",
                ...(missing
                  ? {
                      color: "#a40",
                      fontFamily: "ui-monospace, Menlo, monospace",
                      background: "#fff6ee",
                      border: "1px solid #f0c9a8",
                      borderRadius: "4px",
                      padding: "2px 6px",
                    }
                  : {
                      color: "#222",
                      fontFamily: stack.replace(/[\n\r;]/g, " ").trim(),
                    }),
              });
              wrap.append(sample);
              const code = document.createElement("code");
              code.textContent = stack;
              wrap.append(code);
            } else if (row.tokenType === "Size") {
              const px = asFiniteNumber(distRaw);
              if (px != null && px >= 0) {
                const sample = document.createElement("span");
                sample.className = "type-sample type-sample--size";
                sample.setAttribute("aria-hidden", "true");
                sample.title = `${px}px`;
                sample.textContent = "Aa";
                const shown = Math.max(10, Math.min(px, 36));
                Object.assign(sample.style, {
                  flex: "0 0 auto",
                  fontFamily: PREVIEW_UI_FONT,
                  fontSize: `${shown}px`,
                  lineHeight: "1",
                  color: "#222",
                });
                wrap.append(sample);
                const code = document.createElement("code");
                code.textContent = String(px);
                wrap.append(code);
              } else {
                wrap.append(jsonCell(row[key]));
              }
            } else if (row.tokenType === "Weight") {
              const w = asFiniteNumber(distRaw);
              if (w != null && w >= 0) {
                const sample = document.createElement("span");
                sample.className = "type-sample type-sample--weight";
                sample.setAttribute("aria-hidden", "true");
                sample.title = `weight ${w}`;
                sample.textContent = "Aa";
                Object.assign(sample.style, {
                  flex: "0 0 auto",
                  fontFamily: PREVIEW_UI_FONT,
                  fontSize: "15px",
                  fontWeight: String(Math.round(w)),
                  lineHeight: "1",
                  color: "#222",
                });
                wrap.append(sample);
                const code = document.createElement("code");
                code.textContent = String(w);
                wrap.append(code);
              } else {
                wrap.append(jsonCell(row[key]));
              }
            } else if (row.tokenType === "LineHeight") {
              const lh = asFiniteNumber(distRaw);
              if (lh != null && lh > 0) {
                const sample = document.createElement("span");
                sample.className = "type-sample type-sample--lineheight";
                sample.setAttribute("aria-hidden", "true");
                sample.title = `line-height ${lh}`;
                sample.innerHTML = "Ag<br>Ag";
                Object.assign(sample.style, {
                  flex: "0 0 auto",
                  fontFamily: PREVIEW_UI_FONT,
                  fontSize: "11px",
                  lineHeight: String(lh),
                  color: "#222",
                  textAlign: "center",
                });
                wrap.append(sample);
                const code = document.createElement("code");
                code.textContent = String(lh);
                wrap.append(code);
              } else {
                wrap.append(jsonCell(row[key]));
              }
            } else if (row.tokenType === "LetterSpacing") {
              const ls = asFiniteNumber(distRaw);
              if (ls != null) {
                const sample = document.createElement("span");
                sample.className = "type-sample type-sample--letterspacing";
                sample.setAttribute("aria-hidden", "true");
                sample.title = `letter-spacing ${ls}em`;
                sample.textContent = "AV";
                Object.assign(sample.style, {
                  flex: "0 0 auto",
                  fontFamily: PREVIEW_UI_FONT,
                  fontSize: "15px",
                  letterSpacing: `${ls}em`,
                  lineHeight: "1",
                  color: "#222",
                });
                wrap.append(sample);
                const code = document.createElement("code");
                code.textContent = String(ls);
                wrap.append(code);
              } else {
                wrap.append(jsonCell(row[key]));
              }
            } else if (row.tokenType === "Sizing") {
              const mode =
                typeof row.sizingMode === "string"
                  ? row.sizingMode
                  : typeof distRaw === "string"
                    ? distRaw.split("(")[0]
                    : "";
              const label = typeof distRaw === "string" ? distRaw : mode;
              if (mode) {
                const glyph = document.createElement("span");
                glyph.className = `sizing-icon sizing-icon--${mode}`;
                glyph.setAttribute("aria-hidden", "true");
                glyph.title = label || mode;
                glyph.textContent = sizingModeGlyph(mode);
                Object.assign(glyph.style, {
                  flex: "0 0 auto",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "28px",
                  height: "22px",
                  fontSize: "14px",
                  lineHeight: "1",
                  color: "#334",
                  background: "#eef0f3",
                  borderRadius: "4px",
                });
                wrap.append(glyph);
                const code = document.createElement("code");
                code.textContent = label || mode;
                wrap.append(code);
              } else {
                wrap.append(jsonCell(row[key]));
              }
            } else if (cssColor && hexLabel) {
              const swatch = document.createElement("span");
              swatch.setAttribute("aria-hidden", "true");
              swatch.title = hexLabel;
              Object.assign(swatch.style, {
                width: "14px",
                height: "14px",
                borderRadius: "4px",
                border: "1px solid rgba(0,0,0,0.18)",
                flex: "0 0 auto",
                position: "relative",
                overflow: "hidden",
                backgroundImage:
                  "linear-gradient(45deg,#ccc 25%,transparent 25%),linear-gradient(-45deg,#ccc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ccc 75%),linear-gradient(-45deg,transparent 75%,#ccc 75%)",
                backgroundSize: "8px 8px",
                backgroundPosition: "0 0,0 4px,4px -4px,-4px 0",
                backgroundColor: "#fff",
              });
              const fill = document.createElement("span");
              Object.assign(fill.style, {
                position: "absolute",
                inset: "0",
                background: cssColor,
              });
              swatch.append(fill);
              wrap.append(swatch);
              const hex = document.createElement("code");
              const isOpacity = row.tokenType === "Opacity";
              const alpha =
                !isOpacity && typeof row.alpha === "number" && row.alpha < 1
                  ? ` · α ${Math.round(row.alpha * 100)}%`
                  : "";
              hex.textContent = `${hexLabel}${alpha}`;
              wrap.append(hex);
            } else {
              wrap.append(jsonCell(row[key]));
            }
            td.append(wrap);
          } else {
            td.textContent = String(row[key] ?? "");
          }
          tr.append(td);
        }
        table.append(tr);
      }
      det.append(table);
    }
    designMeta.append(det);
  }

  const primitives = /** @type {Array<Record<string, unknown>>} */ (s.primitives ?? []);
  appendTokenTable("Primitives", primitives, ["name", "tokenType", "value"], ["Name", "Type", "Value"], true);

  const semantics = /** @type {Array<Record<string, unknown>>} */ (s.semantics ?? []);
  appendTokenTable("Semantics", semantics, ["name", "tokenType", "value"], ["Name", "Type", "Value"], true);

  const themeDefs = /** @type {Array<Record<string, unknown>>} */ (s.themeDefinitions ?? []);
  {
    const det = document.createElement("details");
    det.open = false;
    const sum = document.createElement("summary");
    sum.append(document.createTextNode("Themes "));
    const c = document.createElement("span");
    c.className = "count";
    c.textContent = `(${themeDefs.length})`;
    sum.append(c);
    det.append(sum);
    if (themeDefs.length === 0) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = "— none —";
      det.append(p);
    } else {
      for (const t of themeDefs) {
        const sub = document.createElement("details");
        sub.open = false;
        const subSum = document.createElement("summary");
        const base = t.baseTheme ? ` extends ${String(t.baseTheme)}` : "";
        subSum.textContent = `${String(t.name)}${base}`;
        sub.append(subSum);
        appendKvTable(sub, /** @type {Record<string, unknown>} */ (t.overrides ?? {}));
        det.append(sub);
      }
    }
    designMeta.append(det);
  }

  const variants = /** @type {Array<Record<string, unknown>>} */ (s.variants ?? []);
  {
    const det = document.createElement("details");
    det.open = false;
    const sum = document.createElement("summary");
    sum.append(document.createTextNode("Variants "));
    const c = document.createElement("span");
    c.className = "count";
    c.textContent = `(${variants.length})`;
    sum.append(c);
    det.append(sum);
    if (variants.length === 0) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = "— none —";
      det.append(p);
    } else {
      const table = document.createElement("table");
      const head = document.createElement("tr");
      for (const lab of ["Name", "Cases"]) {
        const th = document.createElement("th");
        th.textContent = lab;
        head.append(th);
      }
      table.append(head);
      for (const v of variants) {
        const tr = document.createElement("tr");
        const td1 = document.createElement("td");
        td1.textContent = String(v.name ?? "");
        const td2 = document.createElement("td");
        const cases = Array.isArray(v.cases) ? v.cases.join(", ") : "";
        td2.textContent = cases;
        tr.append(td1, td2);
        table.append(tr);
      }
      det.append(table);
    }
    designMeta.append(det);
  }

  const typeStyles = /** @type {Array<Record<string, unknown>>} */ (s.typeStyles ?? []);
  {
    const det = document.createElement("details");
    det.open = false;
    const sum = document.createElement("summary");
    sum.append(document.createTextNode("Type styles "));
    const c = document.createElement("span");
    c.className = "count";
    c.textContent = `(${typeStyles.length})`;
    sum.append(c);
    det.append(sum);
    if (typeStyles.length === 0) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = "— none —";
      det.append(p);
    } else {
      for (const ts of typeStyles) {
        const sub = document.createElement("details");
        sub.open = false;
        const subSum = document.createElement("summary");
        subSum.textContent = String(ts.name ?? "");
        sub.append(subSum);
        appendKvTable(sub, /** @type {Record<string, unknown>} */ (ts.props ?? {}));
        det.append(sub);
      }
    }
    designMeta.append(det);
  }
}

document.querySelectorAll("[data-output-tab]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const id = btn.getAttribute("data-output-tab");
    document.querySelectorAll("[data-output-tab]").forEach((b) => {
      const on = b.getAttribute("data-output-tab") === id;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    const showHtml = id === "html";
    outputPanelHtml.classList.toggle("is-hidden", !showHtml);
    outputPanelDesign.classList.toggle("is-hidden", showHtml);
    outputPanelDesign.setAttribute("aria-hidden", showHtml ? "true" : "false");
    if (showHtml) {
      requestAnimationFrame(() => editorView?.requestMeasure());
    }
  });
});

function syncEditorToFiles() {
  const prev = files[activePath];
  const next = getEditorText();
  files[activePath] = next;
  if (prev !== next) markFileDirty(activePath);
}

/** @param {string} s */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Locate `component Name` (optional `<Protocol>`) in workspace sources.
 * @param {string} componentName
 * @returns {{ path: string, line: number } | null}
 */
function findComponentSource(componentName) {
  if (!componentName) return null;
  const re = new RegExp(`^\\s*component\\s+${escapeRegExp(componentName)}\\b`);
  const paths = sortedFilePaths(Object.keys(files).filter((p) => p.endsWith(".pdl")));
  // Prefer the active file when it declares the component.
  const ordered = paths.includes(activePath)
    ? [activePath, ...paths.filter((p) => p !== activePath)]
    : paths;
  for (const path of ordered) {
    const content = files[path] ?? "";
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (re.test(lines[i] ?? "")) {
        return { path, line: i + 1 };
      }
    }
  }
  return null;
}

/**
 * @param {string[]} names
 * @returns {Record<string, { path: string, line: number }>}
 */
function buildComponentSources(names) {
  /** @type {Record<string, { path: string, line: number }>} */
  const out = {};
  for (const name of names) {
    const loc = findComponentSource(name);
    if (loc) out[name] = loc;
  }
  return out;
}

/**
 * Switch to the declaring file and scroll the editor to the component header.
 * @param {string} componentName
 */
function openComponentSource(componentName) {
  syncEditorToFiles();
  const loc = findComponentSource(componentName);
  if (!loc) {
    setStatus(`Source not found for ${componentName}`);
    return;
  }
  const switched = loc.path !== activePath;
  if (switched) {
    activePath = loc.path;
    setEditorText(files[activePath] ?? "");
    renderTabs();
    // Keep preview focused on this component; don't clobber pack preference.
    preferredComponent = componentName;
    primaryComponent = componentName;
    if ([...component.options].some((o) => o.value === componentName)) {
      component.value = componentName;
    }
    refreshCanvasHint();
  }
  if (!editorView) return;
  const doc = editorView.state.doc;
  const lineNo = Math.min(Math.max(1, loc.line), doc.lines);
  const line = doc.line(lineNo);
  editorView.dispatch({
    selection: { anchor: line.from, head: Math.min(line.to, line.from + line.text.length) },
    effects: EditorView.scrollIntoView(line.from, { y: "center" }),
  });
  editorView.focus();
  const short = loc.path.includes("/") ? loc.path.split("/").slice(-2).join("/") : loc.path;
  setStatus(`Source · ${componentName} · ${short}:${loc.line}`);
  // Switching files changes the canvas entry — refresh preview once.
  if (switched) scheduleDebouncedRender(0);
}

/** Basename of a workspace path (`a/b/design.pdl` → `design.pdl`). */
function fileBasename(path) {
  const norm = String(path).replace(/\\/g, "/");
  const i = norm.lastIndexOf("/");
  return i >= 0 ? norm.slice(i + 1) : norm;
}

/**
 * Workspace file order for tabs / pickers: `design.pdl` first, then A–Z.
 * @param {Iterable<string>} [paths]
 * @returns {string[]}
 */
function sortedFilePaths(paths = Object.keys(files)) {
  return [...paths].sort((a, b) => {
    const aDesign = fileBasename(a) === "design.pdl" ? 0 : 1;
    const bDesign = fileBasename(b) === "design.pdl" ? 0 : 1;
    if (aDesign !== bDesign) return aDesign - bDesign;
    return a.localeCompare(b);
  });
}

function renderTabs() {
  fileTabs.replaceChildren();
  const paths = sortedFilePaths();
  for (const p of paths) {
    const b = document.createElement("button");
    b.type = "button";
    const short = p.includes("/") ? p.split("/").slice(-2).join("/") : p;
    b.textContent = short;
    b.title = p;
    if (p === activePath) b.classList.add("active");
    b.addEventListener("click", () => {
      syncEditorToFiles();
      activePath = p;
      primaryComponent = "";
      setEditorText(files[activePath] ?? "");
      renderTabs();
      refreshCanvasHint();
      scheduleDraftSave();
      scheduleDebouncedRender(0);
    });
    fileTabs.append(b);
  }
  if (!diskRootMode()) {
    const add = document.createElement("button");
    add.type = "button";
    add.textContent = "+ New file";
    add.addEventListener("click", () => {
      syncEditorToFiles();
      let n = Object.keys(files).length + 1;
      let name = `module${n}.pdl`;
      while (files[name]) {
        n += 1;
        name = `module${n}.pdl`;
      }
      files[name] = "";
      activePath = name;
      setEditorText("");
      renderTabs();
    });
    fileTabs.append(add);
  }
}

/**
 * Replace the scratch workspace with dropped/picked files (never merge into a disk pack).
 * @param {Record<string, string>} newMap
 * @param {{ label?: string }} [opts]
 */
function replaceScratchFiles(newMap, opts = {}) {
  syncEditorToFiles();
  enterScratchProject({
    fileMap: newMap,
    analyze: true,
    status: opts.label ?? `Scratch project · ${Object.keys(newMap).length} file(s)`,
  });
}

/**
 * Enter the isolated scratch project (browser files only).
 * @param {{
 *   fileMap?: Record<string, string>,
 *   analyze?: boolean,
 *   status?: string,
 *   clearDraftHint?: boolean,
 * }} [opts]
 */
function enterScratchProject(opts = {}) {
  const fileMap =
    opts.fileMap && Object.keys(opts.fileMap).length > 0
      ? { ...opts.fileMap }
      : lastScratchSnapshot && Object.keys(lastScratchSnapshot).length > 0
        ? { ...lastScratchSnapshot }
        : { "lab.pdl": START_DESIGN_PDL };
  if (packSelect.value && packSelect.value !== SCRATCH_PACK_ID) {
    lastDiskPackId = packSelect.value;
  }
  setWorkspaceMode("editor");
  if ([...packSelect.options].some((o) => o.value === SCRATCH_PACK_ID)) {
    packSelect.value = SCRATCH_PACK_ID;
  }
  files = fileMap;
  lastScratchSnapshot = { ...files };
  preferredComponent = null;
  primaryComponent = "";
  kvByComponent = {};
  activeFixtureLabel = null;
  writeKvObject({});
  const paths = sortedFilePaths();
  const pdl = paths.filter((p) => p.endsWith(".pdl"));
  const designPath = pdl.find((p) => fileBasename(p) === "design.pdl");
  const labPath = pdl.find((p) => fileBasename(p) === "lab.pdl");
  if (pdl.length === 1) {
    entryPath.value = pdl[0];
  } else if (labPath) {
    entryPath.value = labPath;
  } else if (designPath) {
    entryPath.value = designPath;
  } else if (pdl.length > 0) {
    entryPath.value = pdl[0];
  } else {
    entryPath.value = "lab.pdl";
  }
  const ent = entryPath.value.trim();
  activePath = files[ent] !== undefined ? ent : pdl[0] ?? paths[0] ?? "lab.pdl";
  if (files[activePath] === undefined) {
    files[activePath] = "";
  }
  packDesc.textContent =
    "Scratch project — browser-only workspace, separate from fixture packs on disk.";
  if (btnReloadPack) {
    btnReloadPack.textContent = "Reset scratch";
    btnReloadPack.title = "Replace this scratch project with the starter lab.pdl";
  }
  if (opts.clearDraftHint !== false && draftHint) draftHint.hidden = true;
  setEditorText(files[activePath] ?? "");
  renderTabs();
  refreshCanvasHint();
  updateWorkspaceUi();
  if (opts.status) setStatus(opts.status);
  scheduleDraftSave();
  if (opts.analyze !== false) {
    void (async () => {
      if (await runAnalyze()) scheduleDebouncedRender(0);
    })();
  }
}

function isScratchProject() {
  return packSelect.value === SCRATCH_PACK_ID || !diskRootMode();
}

/** @param {FileList} list */
async function readFileList(list) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const f of list) {
    const rel = f.webkitRelativePath || f.name;
    if (!rel.endsWith(".pdl")) continue;
    out[rel] = await f.text();
  }
  if (Object.keys(out).length === 0) {
    throw new Error("No .pdl files in selection");
  }
  return out;
}

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.style.borderColor = "#38f";
});
dropzone.addEventListener("dragleave", () => {
  dropzone.style.borderColor = "";
});
dropzone.addEventListener("drop", async (e) => {
  e.preventDefault();
  dropzone.style.borderColor = "";
  const dt = e.dataTransfer;
  if (!dt?.files?.length) return;
  try {
    const map = await readFileList(dt.files);
    replaceScratchFiles(map, { label: `Scratch project · ${Object.keys(map).length} file(s)` });
    showError("");
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err));
  }
});

filePick.addEventListener("change", async () => {
  const list = filePick.files;
  if (!list?.length) return;
  try {
    const map = await readFileList(list);
    replaceScratchFiles(map, { label: `Scratch project · ${Object.keys(map).length} file(s)` });
    showError("");
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err));
  }
  filePick.value = "";
});

dirPick.addEventListener("change", async () => {
  const list = dirPick.files;
  if (!list?.length) return;
  try {
    const map = await readFileList(list);
    replaceScratchFiles(map, {
      label: `Scratch project · ${Object.keys(map).length} file(s) from folder`,
    });
    showError("");
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err));
  }
  dirPick.value = "";
});

function diskRootMode() {
  return document.querySelector('input[name="workspace"]:checked')?.value === "disk";
}

function workspaceModeValue() {
  return diskRootMode() ? "disk" : "editor";
}

function setWorkspaceMode(mode) {
  const v = mode === "editor" ? "editor" : "disk";
  const radio = document.querySelector(`input[name="workspace"][value="${v}"]`);
  if (radio) radio.checked = true;
  updateWorkspaceUi();
}

function setEngineValue(eng) {
  const v = eng === "ts" || eng === "rust" ? eng : "wasm";
  const radio = document.querySelector(`input[name="engine"][value="${v}"]`);
  if (radio) radio.checked = true;
  syncEngineBadge();
}

function syncEngineBadge() {
  const badge = document.getElementById("engineBadge");
  if (!badge) return;
  const eng = selectedEngine();
  badge.classList.remove("badge-wasm", "badge-rust", "badge-muted");
  if (eng === "wasm") {
    badge.textContent = "Rust WASM";
    badge.classList.add("badge-wasm");
    badge.title = "In-browser bake (default · fast)";
  } else if (eng === "rust") {
    badge.textContent = "Rust CLI";
    badge.classList.add("badge-rust");
    badge.title = "Spawns pdl per bake — slower for interaction";
  } else {
    badge.textContent = "TypeScript";
    badge.classList.add("badge-muted");
    badge.title = "TS oracle bake";
  }
}

/**
 * @returns {object | null}
 */
function readDraft() {
  try {
    // Drop pre-breakage drafts that still have `interaction { }` / bare `protocol P {`.
    try {
      localStorage.removeItem("pdl-playground-draft-v1");
    } catch {
      /* ignore */
    }
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (!draft || typeof draft !== "object" || draft.v !== DRAFT_SCHEMA_VERSION) return null;
    if (typeof draft.savedAt !== "number" || Date.now() - draft.savedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      return null;
    }
    if (!draft.files || typeof draft.files !== "object") return null;
    return draft;
  } catch {
    return null;
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  if (draftHint) draftHint.hidden = true;
}

function saveDraftNow() {
  if (suppressDraftSave) return;
  try {
    syncEditorToFiles();
    const names = lastCanvas?.componentNames ?? [];
    const owner = overrideOwner(names, lastCanvas?.primaryComponent);
    if (owner) {
      try {
        commitKvTextareaToOwner(owner);
      } catch {
        /* incomplete JSON while typing */
      }
    }
    const disk = diskRootMode();
    const payload = {
      v: DRAFT_SCHEMA_VERSION,
      savedAt: Date.now(),
      packId: disk ? packSelect.value || null : SCRATCH_PACK_ID,
      packDesc: packDesc.textContent || "",
      workspace: workspaceModeValue(),
      engine: selectedEngine(),
      entry: entryPath.value || "",
      activePath,
      // Disk packs: never snapshot file bodies into localStorage — Reload/open always
      // takes truth from disk. Scratch still needs a full file map.
      files: disk ? {} : { ...files },
      preferredComponent,
      primaryComponent,
      kvByComponent: { ...kvByComponent },
      theme: themeInput.value || "",
      variantView: selectedVariantView(),
      lastDiskPackId,
      dirtyDiskPaths: disk ? [...dirtyDiskPaths] : [],
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("[playground] draft save failed", err);
  }
}

function scheduleDraftSave() {
  if (suppressDraftSave) return;
  if (draftSaveTimer) clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(() => {
    draftSaveTimer = null;
    saveDraftNow();
  }, DRAFT_SAVE_DEBOUNCE_MS);
}

/**
 * @param {object} draft
 */
async function restoreDraft(draft) {
  suppressDraftSave = true;
  try {
    if (typeof draft.lastDiskPackId === "string" && draft.lastDiskPackId) {
      lastDiskPackId = draft.lastDiskPackId;
    }
    // One-time flip: old default was Rust CLI; prefer WASM after this ship.
    const wasmDefaultKey = "pdl-playground-wasm-default-v1";
    let migratedWasmDefault = false;
    try {
      migratedWasmDefault = localStorage.getItem(wasmDefaultKey) === "1";
    } catch {
      /* ignore */
    }
    if (!migratedWasmDefault) {
      setEngineValue("wasm");
      try {
        localStorage.setItem(wasmDefaultKey, "1");
      } catch {
        /* ignore */
      }
    } else {
      setEngineValue(typeof draft.engine === "string" ? draft.engine : "wasm");
    }
    const vv = draft.variantView === "grid" ? "grid" : "single";
    const vvRadio = document.querySelector(`input[name="variantView"][value="${vv}"]`);
    if (vvRadio) vvRadio.checked = true;
    themeInput.value = typeof draft.theme === "string" ? draft.theme : "";

    const scratch =
      draft.packId === SCRATCH_PACK_ID ||
      draft.workspace === "editor" ||
      !draft.packId ||
      draft.packId === "";

    if (scratch) {
      enterScratchProject({
        fileMap: draft.files && typeof draft.files === "object" ? draft.files : undefined,
        analyze: false,
        clearDraftHint: false,
        status: "Restored scratch draft",
      });
      if (typeof draft.entry === "string" && draft.entry && files[draft.entry] !== undefined) {
        entryPath.value = draft.entry;
        activePath = draft.entry;
      }
      if (typeof draft.activePath === "string" && files[draft.activePath] !== undefined) {
        activePath = draft.activePath;
      }
      preferredComponent = typeof draft.preferredComponent === "string" ? draft.preferredComponent : null;
      primaryComponent = typeof draft.primaryComponent === "string" ? draft.primaryComponent : "";
      kvByComponent =
        draft.kvByComponent && typeof draft.kvByComponent === "object" && !Array.isArray(draft.kvByComponent)
          ? { ...draft.kvByComponent }
          : {};
      setEditorText(files[activePath] ?? "");
      renderTabs();
      refreshCanvasHint();
      if (draftHint) draftHint.hidden = false;
      if (await runAnalyze()) await runRender({ debounced: false });
      return;
    }

    // Disk packs: always open fresh sources from disk. Draft keeps knobs / selection only —
    // never rehydrate stale file bodies (that race overwrote agent/external edits).
    const packId =
      draft.packId && [...packSelect.options].some((o) => o.value === draft.packId)
        ? draft.packId
        : lastDiskPackId && lastDiskPackId !== SCRATCH_PACK_ID
          ? lastDiskPackId
          : "airbnb-lite";
    const ok = await loadPack(packId, { fromDisk: true, skipAnalyze: true });
    if (!ok) return;
    if (typeof draft.entry === "string" && draft.entry && files[draft.entry] !== undefined) {
      entryPath.value = draft.entry;
    }
    if (typeof draft.activePath === "string" && files[draft.activePath] !== undefined) {
      activePath = draft.activePath;
      setEditorText(files[activePath] ?? "");
      renderTabs();
    }
    preferredComponent =
      typeof draft.preferredComponent === "string" ? draft.preferredComponent : preferredComponent;
    primaryComponent =
      typeof draft.primaryComponent === "string" ? draft.primaryComponent : primaryComponent;
    kvByComponent =
      draft.kvByComponent && typeof draft.kvByComponent === "object" && !Array.isArray(draft.kvByComponent)
        ? { ...draft.kvByComponent }
        : {};
    activeFixtureLabel = null;
    writeKvObject({});
    refreshCanvasHint();
    syncKvTextareaFromOwner(overrideOwner(lastCanvas?.componentNames ?? [], lastCanvas?.primaryComponent));
    if (draftHint) {
      draftHint.hidden = false;
      draftHint.textContent =
        "Restored preview knobs from browser draft — pack sources were reloaded from disk.";
    }
    setStatus(`Opened ${packId} from disk (draft knobs restored)`);
    if (await runAnalyze()) await runRender({ debounced: false });
  } finally {
    suppressDraftSave = false;
    saveDraftNow();
  }
}

function selectedEngine() {
  const v = document.querySelector('input[name="engine"]:checked')?.value;
  if (v === "ts" || v === "rust") return v;
  return "wasm";
}

function selectedVariantView() {
  return document.querySelector('input[name="variantView"]:checked')?.value ?? "single";
}

function refreshCanvasHint() {
  syncEditorToFiles();
  lastCanvas = resolveCanvasTarget(activePath, files);
  const names = lastCanvas.componentNames ?? [];
  if (primaryComponent && names.includes(primaryComponent)) {
    // keep current primary (e.g. chosen via in-preview param controls)
  } else if (preferredComponent && names.includes(preferredComponent)) {
    // Pack default / last interaction wins over file declaration order (comps[0]).
    primaryComponent = preferredComponent;
  } else {
    primaryComponent = lastCanvas.primaryComponent ?? "";
  }
  if (primaryComponent) {
    component.value = primaryComponent;
    if (!preferredComponent || !names.includes(preferredComponent)) {
      preferredComponent = primaryComponent;
    }
  }
  syncKvTextareaFromOwner(overrideOwner(names, lastCanvas.primaryComponent));
  if (canvasHint) {
    if (lastCanvas.kind === "components") {
      canvasHint.textContent = `Canvas: ${lastCanvas.componentNames.join(", ")} (from ${activePath.split("/").pop()})`;
    } else if (lastCanvas.kind === "tokens") {
      const n =
        lastCanvas.tokens.primitives.length +
        lastCanvas.tokens.semantics.length +
        lastCanvas.tokens.themes.length +
        lastCanvas.tokens.variants.length +
        lastCanvas.tokens.typeStyles.length;
      canvasHint.textContent = `Canvas: ${n} token/theme/variant decl(s) in this file (and imports).`;
    } else {
      canvasHint.textContent = "Canvas: nothing to preview in this file.";
    }
  }
  refreshAddPropertyMenu();
  refreshControlsUi();
}

/** @param {string} s */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** CSS generic families — always treated as available. */
const GENERIC_FONT_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "emoji",
  "math",
  "fangsong",
]);

/**
 * Split a CSS font-family stack into family names (quotes stripped).
 * @param {string} stack
 * @returns {string[]}
 */
function parseFontStackFamilies(stack) {
  const out = [];
  let cur = "";
  let quote = /** @type {string | null} */ (null);
  for (let i = 0; i < stack.length; i++) {
    const ch = stack[i];
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === ",") {
      const name = cur.trim();
      if (name) out.push(name);
      cur = "";
      continue;
    }
    cur += ch;
  }
  const last = cur.trim();
  if (last) out.push(last);
  return out;
}

/**
 * Canvas metric probe: primary face is available if pairing it with two
 * different fallbacks changes at least one measured width vs the bare fallback.
 * @param {string} familyName
 */
function isLocalFontAvailable(familyName) {
  const name = familyName.trim();
  if (!name) return false;
  if (GENERIC_FONT_FAMILIES.has(name.toLowerCase())) return true;
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return true;
    const probe = "mmmmmmmmmmlliwi@WwÁg";
    const size = "72px ";
    const quoted = `"${name.replace(/\\/g, "").replace(/"/g, "")}"`;
    ctx.font = `${size}monospace`;
    const mono = ctx.measureText(probe).width;
    ctx.font = `${size}serif`;
    const serif = ctx.measureText(probe).width;
    ctx.font = `${size}${quoted}, monospace`;
    const withMono = ctx.measureText(probe).width;
    ctx.font = `${size}${quoted}, serif`;
    const withSerif = ctx.measureText(probe).width;
    return withMono !== mono || withSerif !== serif;
  } catch {
    return true;
  }
}

/**
 * FontFamily preview copy: "AaBbCc" when the stack's first face is present,
 * otherwise "??????" (still compiles; preview-only signal).
 * @param {string} stack
 * @returns {{ text: string, missing: boolean, primary: string }}
 */
function fontFamilyPreviewLabel(stack) {
  const families = parseFontStackFamilies(stack);
  const primary = families[0] ?? "";
  const missing = primary.length > 0 && !isLocalFontAvailable(primary);
  return {
    text: missing ? "??????" : "AaBbCc",
    missing,
    primary,
  };
}

/** System UI stack for Size / Weight micro-previews. */
const PREVIEW_UI_FONT = "system-ui, -apple-system, Segoe UI, sans-serif";

/**
 * Sizing mode → compact unicode glyph for token lists.
 * @param {string} mode
 */
function sizingModeGlyph(mode) {
  switch (mode) {
    case "hug":
      return "⟷"; // content-sized
    case "fill":
      return "⇔"; // stretch to fill
    case "fixed":
      return "▮"; // fixed block
    case "flex":
      return "≈"; // flexible range
    default:
      return "□";
  }
}

/**
 * @param {unknown} raw
 * @returns {number | null}
 */
function asFiniteNumber(raw) {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && /^-?\d+(\.\d+)?$/.test(raw.trim())) return Number(raw.trim());
  return null;
}

/**
 * @param {{ primitives: string[], semantics: string[], themes: string[], variants: string[], typeStyles: string[] }} tokens
 * @param {Record<string, unknown> | null} [summary]
 */
function tokensPreviewHtml(tokens, summary = null) {
  /** @type {Map<string, Record<string, unknown>>} */
  const byName = new Map();
  if (summary && typeof summary === "object") {
    for (const row of /** @type {unknown[]} */ (summary.primitives ?? [])) {
      if (row && typeof row === "object" && /** @type {any} */ (row).name) {
        byName.set(String(/** @type {any} */ (row).name), /** @type {Record<string, unknown>} */ (row));
      }
    }
    for (const row of /** @type {unknown[]} */ (summary.semantics ?? [])) {
      if (row && typeof row === "object" && /** @type {any} */ (row).name) {
        byName.set(String(/** @type {any} */ (row).name), /** @type {Record<string, unknown>} */ (row));
      }
    }
  }

  /** @param {unknown} raw @returns {number | null} */
  const asNumber = (raw) => {
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string" && /^-?\d+(\.\d+)?$/.test(raw.trim())) return Number(raw.trim());
    return null;
  };

  /**
   * Distance preview: ticks + beam sized to the px value (`|_12_|`).
   * @param {number} px
   */
  const distanceRuler = (px) => {
    const w = Math.max(2, Math.min(Math.round(Math.abs(px)), 96));
    return `<span class="ruler" title="${escapeHtml(String(px))}px" aria-hidden="true"><span class="tick"></span><span class="beam" style="width:${w}px"></span><span class="tick"></span></span>`;
  };

  /**
   * Radius preview: top-left quarter-corner; box ≈ radius (capped) so the curve is true-scale.
   * @param {number} px
   */
  const radiusCorner = (px) => {
    const r = Math.max(0, px);
    const box = Math.max(14, Math.min(Math.round(r) || 14, 48));
    const rad = Math.min(r, box);
    return `<span class="radius-corner" title="${escapeHtml(String(r))}px" aria-hidden="true" style="width:${box}px;height:${box}px;border-top-left-radius:${rad}px"></span>`;
  };

  /**
   * FontFamily preview: sample glyphs in the stack, or ?????? if the primary face is missing.
   * @param {string} stack
   */
  const fontSample = (stack) => {
    const safe = stack.replace(/[\n\r;]/g, " ").trim();
    const { text, missing, primary } = fontFamilyPreviewLabel(stack);
    const title = missing
      ? `Font not found locally: ${primary} (falls back in CSS stack)`
      : stack;
    const cls = missing ? "font-sample font-sample--missing" : "font-sample";
    const style = missing ? "" : ` style="font-family:${escapeHtml(safe)}"`;
    return `<span class="${cls}" title="${escapeHtml(title)}" aria-hidden="true"${style}>${escapeHtml(text)}</span>`;
  };

  /**
   * Shadow preview: white card with the resolved CSS box-shadow on a gray pad.
   * @param {string} css
   */
  const shadowCard = (css) => {
    const safe = css.replace(/[\n\r"<>]/g, " ").trim();
    return `<span class="shadow-pad" title="${escapeHtml(css)}" aria-hidden="true"><span class="shadow-card" style="box-shadow:${escapeHtml(safe)}"></span></span>`;
  };

  /**
   * Size preview: "Aa" at (capped) presentation size, system UI font.
   * @param {number} px
   */
  const sizeSample = (px) => {
    const shown = Math.max(10, Math.min(px, 36));
    return `<span class="type-sample type-sample--size" title="${escapeHtml(String(px))}px" aria-hidden="true" style="font-size:${shown}px;font-family:${escapeHtml(PREVIEW_UI_FONT)}">Aa</span>`;
  };

  /**
   * Weight preview: "Aa" at standard size with the token weight.
   * @param {number} w
   */
  const weightSample = (w) => {
    const fw = Math.round(w);
    return `<span class="type-sample type-sample--weight" title="weight ${escapeHtml(String(w))}" aria-hidden="true" style="font-weight:${fw};font-family:${escapeHtml(PREVIEW_UI_FONT)}">Aa</span>`;
  };

  /**
   * LineHeight preview: two lines with the token leading.
   * @param {number} lh
   */
  const lineHeightSample = (lh) =>
    `<span class="type-sample type-sample--lineheight" title="line-height ${escapeHtml(String(lh))}" aria-hidden="true" style="font-family:${escapeHtml(PREVIEW_UI_FONT)};font-size:11px;line-height:${lh};text-align:center">Ag<br>Ag</span>`;

  /**
   * LetterSpacing preview: tracking applied to "AV".
   * @param {number} ls
   */
  const letterSpacingSample = (ls) =>
    `<span class="type-sample type-sample--letterspacing" title="letter-spacing ${escapeHtml(String(ls))}em" aria-hidden="true" style="font-family:${escapeHtml(PREVIEW_UI_FONT)};font-size:15px;letter-spacing:${ls}em">AV</span>`;

  /**
   * Sizing preview: unicode glyph for hug / fill / fixed / flex.
   * @param {string} mode
   * @param {string} label
   */
  const sizingIcon = (mode, label) => {
    const g = sizingModeGlyph(mode);
    return `<span class="sizing-icon sizing-icon--${escapeHtml(mode)}" title="${escapeHtml(label)}" aria-hidden="true">${escapeHtml(g)}</span>`;
  };

  /** @param {string} name */
  const tokenLi = (name) => {
    const meta = byName.get(name);
    const cssColor = typeof meta?.cssColor === "string" ? meta.cssColor : null;
    const hexLabel =
      typeof meta?.hex === "string"
        ? meta.hex
        : typeof meta?.resolved === "string"
          ? meta.resolved
          : null;
    const alpha = typeof meta?.alpha === "number" ? meta.alpha : null;
    const type = typeof meta?.tokenType === "string" ? meta.tokenType : "";
    const distPx = type === "Distance" ? asNumber(meta?.resolved ?? hexLabel) : null;
    const radiusPx = type === "Radius" ? asNumber(meta?.resolved ?? hexLabel) : null;
    const sizePx = type === "Size" ? asNumber(meta?.resolved ?? hexLabel) : null;
    const weightN = type === "Weight" ? asNumber(meta?.resolved ?? hexLabel) : null;
    const lineHeightN = type === "LineHeight" ? asNumber(meta?.resolved ?? hexLabel) : null;
    const letterSpacingN = type === "LetterSpacing" ? asNumber(meta?.resolved ?? hexLabel) : null;
    const fontStack =
      type === "FontFamily" && typeof (meta?.resolved ?? hexLabel) === "string"
        ? String(meta?.resolved ?? hexLabel).trim()
        : "";
    const shadowCss =
      type === "Shadow"
        ? typeof meta?.shadowCss === "string"
          ? meta.shadowCss
          : typeof meta?.resolved === "string"
            ? meta.resolved
            : ""
        : "";
    const sizingMode =
      type === "Sizing"
        ? typeof meta?.sizingMode === "string"
          ? meta.sizingMode
          : typeof (meta?.resolved ?? hexLabel) === "string"
            ? String(meta?.resolved ?? hexLabel).split("(")[0]
            : ""
        : "";
    const sizingLabel =
      type === "Sizing" && typeof (meta?.resolved ?? hexLabel) === "string"
        ? String(meta?.resolved ?? hexLabel)
        : sizingMode;

    let preview;
    if (distPx != null) {
      preview = distanceRuler(distPx);
    } else if (radiusPx != null && radiusPx >= 0) {
      preview = radiusCorner(radiusPx);
    } else if (shadowCss) {
      preview = shadowCard(shadowCss);
    } else if (fontStack) {
      preview = fontSample(fontStack);
    } else if (sizePx != null && sizePx >= 0) {
      preview = sizeSample(sizePx);
    } else if (weightN != null && weightN >= 0) {
      preview = weightSample(weightN);
    } else if (lineHeightN != null && lineHeightN > 0) {
      preview = lineHeightSample(lineHeightN);
    } else if (letterSpacingN != null) {
      preview = letterSpacingSample(letterSpacingN);
    } else if (sizingMode) {
      preview = sizingIcon(sizingMode, sizingLabel || sizingMode);
    } else if (cssColor) {
      preview = `<span class="swatch" title="${escapeHtml(hexLabel ?? cssColor)}"><span class="fill" style="background:${escapeHtml(cssColor)}"></span></span>`;
    } else {
      preview = `<span class="swatch empty" aria-hidden="true"></span>`;
    }

    // Color with alpha: append α%. Opacity tokens already display the multiplier.
    const alphaBit =
      type !== "Opacity" && cssColor && alpha != null && alpha < 1
        ? ` · α ${Math.round(alpha * 100)}%`
        : "";
    const valueBit = hexLabel
      ? `<code class="hex">${escapeHtml(hexLabel)}${escapeHtml(alphaBit)}</code>`
      : "";
    const typeBit = type ? `<span class="type">${escapeHtml(type)}</span>` : "";
    return `<li>${preview}<code class="name">${escapeHtml(name)}</code>${typeBit}${valueBit}</li>`;
  };

  const row = (title, items) => {
    if (!items.length) return "";
    return `<h2>${escapeHtml(title)}</h2><ul class="tokens">${items.map(tokenLi).join("")}</ul>`;
  };
  const plain = (title, items) => {
    if (!items.length) return "";
    return `<h2>${escapeHtml(title)}</h2><ul>${items.map((x) => `<li><code>${escapeHtml(x)}</code></li>`).join("")}</ul>`;
  };
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;height:auto;overflow:visible}
  body{font:14px/1.45 ui-sans-serif,system-ui;padding:24px;background:#f6f7f9;color:#222;box-sizing:border-box}
  h1{font-size:1.1rem;margin:0 0 0.4rem} h2{font-size:0.95rem;margin-top:1.2rem;color:#444}
  code{font-family:ui-monospace,Menlo,monospace;font-size:0.85rem}
  ul{padding-left:0;list-style:none;margin:0.4rem 0 0}
  ul.tokens li{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #e6e8ec}
  .swatch{width:18px;height:18px;border-radius:5px;border:1px solid rgba(0,0,0,0.18);flex:0 0 auto;position:relative;overflow:hidden;
    background-color:#fff;
    background-image:
      linear-gradient(45deg,#ccc 25%,transparent 25%),linear-gradient(-45deg,#ccc 25%,transparent 25%),
      linear-gradient(45deg,transparent 75%,#ccc 75%),linear-gradient(-45deg,transparent 75%,#ccc 75%);
    background-size:8px 8px;background-position:0 0,0 4px,4px -4px,-4px 0}
  .swatch .fill{position:absolute;inset:0;border-radius:inherit}
  .swatch.empty{opacity:0.35}
  .ruler{display:inline-flex;align-items:center;flex:0 0 auto;min-width:18px;height:18px;color:#334}
  .ruler .tick{width:2px;height:14px;background:#334;border-radius:1px;flex:0 0 auto}
  .ruler .beam{height:2px;background:#334;flex:0 0 auto;min-width:2px}
  .radius-corner{display:inline-block;flex:0 0 auto;box-sizing:border-box;background:#e8ecf1;
    border-top:2px solid #334;border-left:2px solid #334;border-top-left-radius:0}
  .font-sample{flex:0 0 auto;font-size:17px;line-height:1.2;color:#222;letter-spacing:0.02em;
    padding:2px 6px;background:#fff;border:1px solid #e0e3e8;border-radius:4px;min-width:4.5rem;text-align:center}
  .font-sample--missing{color:#a40;background:#fff6ee;border-color:#f0c9a8;
    font-family:ui-monospace,Menlo,monospace;letter-spacing:0.08em}
  .shadow-pad{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;
    width:44px;height:34px;background:#eef0f3;border-radius:4px;overflow:visible}
  .shadow-card{display:block;width:18px;height:14px;background:#fff;border-radius:3px}
  .type-sample{flex:0 0 auto;line-height:1;color:#222;min-width:1.6rem;text-align:center}
  .type-sample--weight{font-size:15px}
  .sizing-icon{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;
    width:28px;height:22px;font-size:14px;line-height:1;color:#334;background:#eef0f3;border-radius:4px}
  .name{color:#111}
  .type{color:#789;font-size:0.75rem;min-width:4.5rem}
  .hex{color:#0b5;background:#eef8f1;padding:1px 6px;border-radius:4px}
  </style></head><body>
  <h1>Tokens — ${escapeHtml(activePath.split("/").pop() ?? "")}</h1>
  ${row("Primitives", tokens.primitives)}
  ${row("Semantics", tokens.semantics)}
  ${plain("Themes", tokens.themes)}
  ${plain("Variants", tokens.variants)}
  ${plain("Type styles", tokens.typeStyles)}
  <script>
  (function(){
    function postHeight(){
      try {
        var h = Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight,
          document.body.offsetHeight
        );
        parent.postMessage({ type: 'pdl-resize', height: h }, '*');
      } catch (e) {}
    }
    postHeight();
    requestAnimationFrame(postHeight);
    window.addEventListener('load', postHeight);
  })();
  </script>
  </body></html>`;
}

function refreshAddPropertyMenu() {
  if (!addProperty || !editorView) return;
  const pos = editorView.state.selection.main.head;
  const kind = inferFrameKindAt(editorView.state.doc.toString(), pos);
  if (addPropertyKind) addPropertyKind.textContent = `Kind: ${kind}`;
  const props = PROPERTIES_BY_KIND[kind] ?? PROPERTIES_BY_KIND.unknown;
  const prev = addProperty.value;
  addProperty.replaceChildren();
  const ph = document.createElement("option");
  ph.value = "";
  ph.textContent = "— insert into editor —";
  addProperty.append(ph);
  for (const p of props) {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.label;
    opt.dataset.snippet = p.snippet;
    addProperty.append(opt);
  }
  if ([...addProperty.options].some((o) => o.value === prev)) addProperty.value = prev;
}

function populateInsertTemplateMenu() {
  if (!insertTemplate) return;
  insertTemplate.replaceChildren();
  const ph = document.createElement("option");
  ph.value = "";
  ph.textContent = "— stub patterns —";
  insertTemplate.append(ph);
  for (const t of PDL_TEMPLATES) {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.label;
    insertTemplate.append(opt);
  }
}

/**
 * @param {string} templateId
 */
function insertPdlTemplate(templateId) {
  if (!editorView || !templateId) return;
  const tmpl = PDL_TEMPLATES.find((t) => t.id === templateId);
  if (!tmpl) return;
  const pos = editorView.state.selection.main.head;
  const doc = editorView.state.doc.toString();
  const { from, to, insert } = formatTemplateInsert(doc, pos, tmpl.snippet);
  /** @type {{ anchor: number, head?: number }} */
  let selection = { anchor: from + insert.length };
  if (tmpl.select) {
    const idx = insert.indexOf(tmpl.select);
    if (idx >= 0) {
      selection = {
        anchor: from + idx,
        head: from + idx + tmpl.select.length,
      };
    }
  }
  editorView.dispatch({
    changes: { from, to, insert },
    selection,
    scrollIntoView: true,
  });
  editorView.focus();
  files[activePath] = editorView.state.doc.toString();
  refreshCanvasHint();
  scheduleDebouncedRender();
}

/** Pack / scratch entry from the UI (import-graph root for advisories). */
function designatedEntryPath() {
  const disk = diskRootMode();
  const ent = entryPath.value.trim();
  if (ent && files[ent] !== undefined) return ent;
  if (activePath && files[activePath] !== undefined) return activePath;
  const pdl = sortedFilePaths().filter((p) => p.endsWith(".pdl"));
  if (pdl.length) return pdl[0];
  return ent || (disk ? "test-fixtures/pdl/molecules/design.pdl" : "lab.pdl");
}

function selectedComponentForBake() {
  return (
    primaryComponent ||
    component.value ||
    preferredComponent ||
    lastCanvas?.primaryComponent ||
    ""
  );
}

/**
 * Bake/analyze entry: in disk packs, use the open file so partial modules
 * (e.g. companion_extend_entry.pdl) resolve their own components — not only pack design.pdl.
 * Blank canvas: if the open file declares the selected component, bake that module
 * so unimported authoring files preview without a false PDL-E037.
 */
function bakeEntryPath() {
  const disk = diskRootMode();
  if (disk && activePath && activePath.endsWith(".pdl")) return activePath;
  if (!disk && activePath && activePath.endsWith(".pdl") && files[activePath] !== undefined) {
    const name = selectedComponentForBake();
    if (name && sourceDeclaresComponent(files[activePath] ?? "", name)) {
      return activePath;
    }
  }
  if (!disk) {
    const ent = entryPath.value.trim();
    if (ent && files[ent] !== undefined) return ent;
    if (activePath && files[activePath] !== undefined) return activePath;
    const pdl = sortedFilePaths().filter((p) => p.endsWith(".pdl"));
    if (pdl.length) return pdl[0];
  }
  return (
    entryPath.value.trim() ||
    (disk ? "test-fixtures/pdl/molecules/design.pdl" : "lab.pdl")
  );
}

/**
 * @param {string} message
 * @param {string} [entry]
 */
function withUnknownComponentHint(message, entry = bakeEntryPath()) {
  syncEditorToFiles();
  return augmentUnknownComponentMessage(message, files, entry);
}

/** Soft advisories for workspace modules outside the designated entry import graph. */
function unreachableModuleConsoleEntries() {
  syncEditorToFiles();
  const entry = designatedEntryPath();
  return unreachableWorkspaceModules(files, entry).map((path) => {
    const w = formatUnreachableModuleWarning(path, entry);
    return {
      phase: "Workspace",
      component: w.code,
      message: w.message,
    };
  });
}

/**
 * Sources for WASM bake. Repo fixture entries load the import closure from disk
 * (same graph Rust uses); in-memory editor edits overlay those sources.
 * Blank-canvas paths (`design.pdl`, etc.) use the editor map only.
 * @param {string} entry
 * @returns {Promise<Record<string, string>>}
 */
async function sourcesForWasmBake(entry) {
  syncEditorToFiles();
  const repoEntry = entry.replace(/\\/g, "/").startsWith("test-fixtures/pdl/");
  if (!repoEntry) return { ...files };
  const res = await fetch("/api/disk-sources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entry }),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.error || "Failed to load disk sources for WASM bake");
  }
  return { ...(data.files ?? {}), ...files };
}

function getBodyBase() {
  syncEditorToFiles();
  const disk = diskRootMode();
  return {
    files: disk ? undefined : files,
    entry: bakeEntryPath(),
    diskRoot: disk || undefined,
    engine: selectedEngine(),
  };
}

/**
 * @param {number} [delayMs] — `0` runs render on the next task (e.g. mode / component change); default debounces editor typing.
 */
/** @type {boolean} */
let previewDocumentLive = false;
/** @type {object | null} */
let lastBakedDesign = null;
/**
 * IR cache for instance-resolve: `childType + stableJSON(childParams)` → bake root.
 * Cleared on cold remount / source ticks.
 * @type {Map<string, object>}
 */
const instanceBakeIrCache = new Map();
/** @type {Map<string, number>} monotonic token so stale async bakes do not clobber hoverEnd */
const instanceResolveToken = new Map();
/** @type {Map<string, Promise<void>>} serial resolve chain per instanceLet */
const instanceResolveTail = new Map();
/** When true, next runRender tries identity apply instead of srcdoc remount. */
let nextRenderIncremental = false;
/**
 * When true with incremental: bake only the param owner (knobs/emits/fixtures).
 * Source/theme ticks use incremental without ownerOnly → rebake whole canvas IR,
 * reconcile only changed components (avoids remounting siblings / reloading media).
 */
let nextRenderOwnerOnly = false;

/**
 * @param {number} [delayMs]
 * @param {{ incremental?: boolean, ownerOnly?: boolean }} [opts]
 */
function scheduleDebouncedRender(delayMs = RENDER_DEBOUNCE_MS, opts = {}) {
  if (opts.incremental) nextRenderIncremental = true;
  if (opts.ownerOnly) nextRenderOwnerOnly = true;
  if (renderDebounceTimer) {
    clearTimeout(renderDebounceTimer);
    renderDebounceTimer = null;
  }
  if (delayMs <= 0) {
    void runRender({ debounced: false });
    return;
  }
  renderDebounceTimer = setTimeout(() => {
    renderDebounceTimer = null;
    void runRender({ debounced: true });
  }, delayMs);
}

/**
 * Merge a partial (dirty-only) bake into the live design SoT.
 * @param {object | null} prev
 * @param {object} patch
 */
function mergeBakedDesign(prev, patch) {
  if (!prev?.components) return patch;
  return {
    ...prev,
    ...patch,
    components: {
      ...prev.components,
      ...(patch.components || {}),
    },
  };
}

/** Stable JSON for instance-resolve IR cache keys. */
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

function clearInstanceResolveCache() {
  instanceBakeIrCache.clear();
  instanceResolveToken.clear();
  instanceResolveTail.clear();
}

/** Abort in-flight instance resolves; keep child IR bake cache warm. */
function cancelPendingInstanceResolves() {
  instanceResolveToken.clear();
}

/**
 * Bake a nested child type with live kwargs (WASM primary, Rust bakeOnly fallback).
 * @param {string} childComponent
 * @param {Record<string, unknown>} childParams
 * @returns {Promise<{ root: object, bakedParams?: object } | null>}
 */
async function bakeChildComponentForResolve(childComponent, childParams) {
  const cacheKey = instanceResolveCacheKey(childComponent, childParams);
  const hit = instanceBakeIrCache.get(cacheKey);
  if (hit?.root) return /** @type {{ root: object, bakedParams?: object }} */ (hit);

  const theme = themeInput.value.trim();
  const entry = bakeEntryPath();
  let bakedComp = null;

  if (selectedEngine() === "wasm") {
    const wasm = await loadWasmBake();
    if (wasm) {
      const sourceFiles = await sourcesForWasmBake(entry);
      const { filesJson, entry: virtEntry } = virtualizeSources(sourceFiles, entry);
      const bakeJson = wasm.bake_component_sources(
        filesJson,
        virtEntry,
        childComponent,
        theme || undefined,
        JSON.stringify(childParams ?? {}),
      );
      const bake = JSON.parse(bakeJson);
      bakedComp = bake?.components?.[childComponent] ?? null;
    }
  }

  if (!bakedComp) {
    const res = await fetch("/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...getBodyBase(),
        mode: "component",
        component: childComponent,
        theme: theme || undefined,
        bakeOnly: true,
        interactiveHost: false,
        componentOverrides: { [childComponent]: childParams ?? {} },
      }),
    });
    const data = await res.json();
    if (data?.ok && data.baked?.components?.[childComponent]) {
      bakedComp = data.baked.components[childComponent];
    }
  }

  if (!bakedComp?.root) return null;
  const packed = {
    root: bakedComp.root,
    bakedParams: bakedComp.bakedParams,
  };
  instanceBakeIrCache.set(cacheKey, packed);
  return packed;
}

/**
 * Apply one `pdl-resolve-instance` message (coalesced caller passes latest kwargs).
 * @param {object} data
 * @param {number} token
 */
async function applyInstanceResolve(data, token) {
  const doc = frame.contentDocument;
  if (!doc || !previewDocumentLive) return;
  const instanceLet = typeof data.instanceLet === "string" ? data.instanceLet : "";
  const childComponent = typeof data.childComponent === "string" ? data.childComponent : "";
  const childParams =
    data.childParams && typeof data.childParams === "object" && !Array.isArray(data.childParams)
      ? /** @type {Record<string, unknown>} */ (data.childParams)
      : {};
  if (!instanceLet || !childComponent) return;
  const key = instanceLet;
  if (instanceResolveToken.get(key) !== token) return;

  const baked = await bakeChildComponentForResolve(childComponent, childParams);
  // A newer hoverEnd/press may have been queued while we baked — do not clobber it.
  if (instanceResolveToken.get(key) !== token) return;
  if (!baked?.root) {
    setStatus(`Instance resolve failed · ${childComponent}`);
    return;
  }

  const node = doc.querySelector(`[data-pdl-instance-let="${CSS.escape(instanceLet)}"]`);
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

  // Mount identity is preserved (listeners stay). Do not rebind — copying
  // data-pdl-listening onto a replaced node used to skip listener attach.
  try {
    node.setAttribute("data-pdl-instance-bake", JSON.stringify(baked.root));
    node.setAttribute("data-pdl-instance-kwargs", JSON.stringify(childParams));
  } catch {
    /* ignore */
  }
  const reason = typeof data.reason === "string" ? data.reason : "";
  setStatus(
    `Instance resolve · ${childComponent}${instanceLet ? `#${instanceLet}` : ""}${
      reason ? ` · ${reason}` : ""
    }`,
  );
}

/**
 * Queue resolve per instanceLet. Newer events bump a token so an in-flight
 * hoverStart bake is discarded when hoverEnd/press supersedes it.
 * @param {object} data
 */
function queueInstanceResolve(data) {
  const key =
    (typeof data.instanceLet === "string" && data.instanceLet) ||
    (typeof data.childComponent === "string" && data.childComponent) ||
    "_";
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

/**
 * Param-driven updates: IR reconcile into the live iframe (primary). HTML morph is
 * fallback only. Source/theme/engine changes still assign srcdoc (cold path).
 * @param {object} data
 * @param {{ incremental: boolean }} opts
 * @returns {'incremental' | 'remount'}
 */
function applyPreviewUpdate(data, opts) {
  const html = typeof data.html === "string" ? data.html : "";
  const nextBaked = data.baked && typeof data.baked === "object" ? data.baked : null;
  const doc = frame.contentDocument;
  const wantIncremental =
    opts.incremental &&
    previewDocumentLive &&
    !!doc?.querySelector?.(".pdl-gallery") &&
    (!!nextBaked?.components || html.length > 0);

  if (wantIncremental) {
    const ephem = capturePreviewEphemerals(doc);
    let applied = false;
    let applyKind = "";
    // Ideal path: bake IR → reconcile DOM (no HTML required).
    // nextBaked may be a dirty-only patch (one component); merge into lastBakedDesign.
    if (nextBaked?.components && lastBakedDesign?.components) {
      applied = tryIncrementalBakeReconcile(doc, lastBakedDesign, nextBaked);
      if (applied) applyKind = "ir";
    }
    // Bridge: identity morph of rebaked HTML when IR cannot apply.
    if (!applied && html.length > 0) {
      applied = applyPreviewHtml(doc, html);
      if (applied) applyKind = "morph";
    }
    if (applied) {
      if (nextBaked) lastBakedDesign = mergeBakedDesign(lastBakedDesign, nextBaked);
      restorePreviewEphemerals(doc, ephem);
      // Rebind only when IR actually mutated (or morph). Equal-IR no-ops still ok.
      requestInteractiveRebind(frame);
      frame.dataset.pdlLastApply = applyKind;
      return "incremental";
    }
  }

  // Cold remount requires HTML.
  if (!html) {
    return "remount";
  }

  previewDocumentLive = false;
  lastBakedDesign = nextBaked;
  clearInstanceResolveCache();
  frame.srcdoc = html;
  frame.addEventListener(
    "load",
    () => {
      previewDocumentLive = true;
    },
    { once: true },
  );
  return "remount";
}

/**
 * Reconcile only components present in `nextBake` (dirty set). Unchanged siblings
 * are left untouched. Equal IR per component is a DOM no-op.
 * @param {Document} doc
 * @param {object} prevBake
 * @param {object} nextBake
 */
function tryIncrementalBakeReconcile(doc, prevBake, nextBake) {
  try {
    const names = Object.keys(nextBake.components || {});
    if (names.length === 0) return false;
    // Defaults from full live design + dirty patch (includes nested instanceOf types
    // like NoteField inside NoteEditor — parent-only bake omits them from components).
    const defaultsSource = mergeBakedDesign(prevBake, nextBake);
    const editableSessionDefaults = collectEditableSessionDefaults(defaultsSource);
    const prevEditableDefaults = collectEditableSessionDefaults(prevBake);
    const changedEditableTypes = changedEditableSessionTypes(
      prevEditableDefaults,
      editableSessionDefaults,
    );
    // Also refresh parents that nest EditableText types whose defaults changed
    // (e.g. NoteField.activatesOn) even when that parent isn't in the dirty bake set.
    const liveNames = new Set(names);
    if (changedEditableTypes.size > 0) {
      for (const [name, comp] of Object.entries(defaultsSource.components || {})) {
        if (
          comp?.root &&
          frameTreeNestsInstanceTypes(comp.root, changedEditableTypes)
        ) {
          liveNames.add(name);
        }
      }
    }
    for (const name of liveNames) {
      const section = doc.querySelector(
        `section.pdl-preview[data-pdl-component="${CSS.escape(name)}"]`,
      );
      if (!section) {
        // Dirty patch may omit siblings; only require sections for names we intend to patch.
        if (names.includes(name)) return false;
        continue;
      }
      const canvas =
        section.querySelector(".pdl-state:not([hidden]) .pdl-canvas") ||
        section.querySelector(".pdl-canvas");
      if (!canvas) {
        if (names.includes(name)) return false;
        continue;
      }
      const prevComp = prevBake.components?.[name];
      const nextComp = defaultsSource.components?.[name] || nextBake.components?.[name];
      if (!nextComp?.root) return false;
      const nestsChangedDefaults =
        changedEditableTypes.size > 0 &&
        frameTreeNestsInstanceTypes(nextComp.root, changedEditableTypes);
      if (bakedComponentTreesEqual(prevComp, nextComp) && !nestsChangedDefaults) {
        continue;
      }
      const bp = nextComp.bakedParams && typeof nextComp.bakedParams === "object"
        ? { ...nextComp.bakedParams }
        : undefined;
      const prevBp =
        prevComp?.bakedParams && typeof prevComp.bakedParams === "object"
          ? { ...prevComp.bakedParams }
          : undefined;
      const ok = reconcileBakedComponentIntoCanvas(canvas, prevComp, nextComp, {
        sessionParams: bp,
        prevSessionParams: prevBp,
        instCtx: {
          editableSessionDefaults,
        },
        prevInstCtx: {
          editableSessionDefaults: prevEditableDefaults,
        },
      });
      if (!ok) return false;
      const paramsEl = section.querySelector(".pdl-preview-params");
      if (paramsEl && nextComp.bakedParams) {
        const compact = JSON.stringify(nextComp.bakedParams);
        const pretty = JSON.stringify(nextComp.bakedParams, null, 2);
        paramsEl.setAttribute("data-json", compact);
        const line = paramsEl.querySelector(".pdl-preview-params-line");
        const full = paramsEl.querySelector(".pdl-preview-params-full");
        if (line) line.textContent = compact;
        if (full) full.textContent = pretty;
        if (!line && !full) paramsEl.textContent = compact;
      }
    }
    return true;
  } catch {
    return false;
  }
}

function fillComponentSelect(names) {
  const prev = component.value;
  component.replaceChildren();
  for (const name of names ?? []) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    component.append(opt);
  }
  const prefer = preferredComponent && names?.includes(preferredComponent) ? preferredComponent : null;
  const pick = prefer || (names?.includes(prev) ? prev : null);
  if (pick) component.value = pick;
  else if (component.options.length > 0) component.selectedIndex = 0;
}

async function flushDiskWrites() {
  if (!diskRootMode()) return;
  syncEditorToFiles();
  const toWrite = [...dirtyDiskPaths].filter(
    (rel) =>
      rel.endsWith(".pdl") &&
      rel.startsWith("test-fixtures/pdl/") &&
      typeof files[rel] === "string",
  );
  /** @type {string[]} */
  const conflicts = [];
  for (const rel of toWrite) {
    const content = files[rel];
    // No-op vs last disk load — drop dirty without touching the file.
    if (diskBaseline[rel] !== undefined && content === diskBaseline[rel]) {
      dirtyDiskPaths.delete(rel);
      continue;
    }
    const res = await fetch("/api/write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: rel,
        content,
        expectedBaseline:
          diskBaseline[rel] !== undefined ? diskBaseline[rel] : undefined,
      }),
    });
    const data = await res.json();
    if (data.conflict) {
      conflicts.push(rel.split("/").pop() || rel);
      dirtyDiskPaths.delete(rel);
      continue;
    }
    if (!data.ok) throw new Error(data.error || `Failed to write ${rel}`);
    diskBaseline[rel] = content;
    dirtyDiskPaths.delete(rel);
  }
  if (conflicts.length) {
    throw new Error(
      `Disk changed under you (${conflicts.join(", ")}). Click “Reload from disk” — refusing to overwrite external edits.`,
    );
  }
}

async function loadPack(packId, { fromDisk = false, skipAnalyze = false } = {}) {
  if (packId === SCRATCH_PACK_ID) {
    enterScratchProject({ status: "Scratch project" });
    return true;
  }
  setStatus(`Loading pack ${packId}…`);
  showError("");
  const heldSuppress = suppressDraftSave;
  suppressDraftSave = true;
  try {
    const res = await fetch("/api/open-pack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packId }),
    });
    const data = await res.json();
    if (!data.ok) {
      showError(data.error || "Failed to open pack");
      setStatus("");
      return false;
    }
    if (fromDisk) clearDraft();
    lastDiskPackId = packId;
    const diskRadio = document.querySelector('input[name="workspace"][value="disk"]');
    if (diskRadio) diskRadio.checked = true;
    if (packSelect.value !== packId) packSelect.value = packId;
    updateWorkspaceUi();
    if (btnReloadPack) {
      btnReloadPack.textContent = "Reload from disk";
      btnReloadPack.title =
        "Discard in-memory editor buffers and browser draft; reload this pack from disk";
    }
    files = { ...(data.files ?? {}) };
    adoptDiskBaseline(files);
    dirtyDiskPaths.clear();
    entryPath.value = data.entry;
    preferredComponent = data.defaultComponent ?? null;
    primaryComponent = data.defaultComponent ?? "";
    kvByComponent = {};
    activeFixtureLabel = null;
    writeKvObject({});
    packDesc.textContent = data.pack?.description ?? "";
    activePath = data.entry;
    if (files[activePath] === undefined) {
      const keys = sortedFilePaths();
      activePath = keys[0] ?? data.entry;
    }
    setEditorText(files[activePath] ?? "");
    renderTabs();
    if (draftHint) draftHint.hidden = true;
    if (fromDisk) setStatus(`Reloaded ${packId} from disk`);
    if (!skipAnalyze) {
      if (await runAnalyze()) await runRender({ debounced: false });
    }
    return true;
  } finally {
    if (!heldSuppress) {
      suppressDraftSave = false;
      saveDraftNow();
    }
  }
}

async function initCatalog() {
  const res = await fetch("/api/catalog");
  const data = await res.json();
  packSelect.replaceChildren();
  const scratchOpt = document.createElement("option");
  scratchOpt.value = SCRATCH_PACK_ID;
  scratchOpt.textContent = "Scratch project";
  packSelect.append(scratchOpt);
  for (const p of data.packs ?? []) {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.label;
    packSelect.append(opt);
  }
  packSelect.value = "airbnb-lite";
  lastDiskPackId = "airbnb-lite";
}

async function runAnalyze() {
  showError("");
  updateRenderConsole([]);
  setStatus("Analyzing…");
  try {
    await flushDiskWrites();
    const res = await fetch("/api/load", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getBodyBase()),
    });
    const data = await res.json();
    const workspaceWarn = unreachableModuleConsoleEntries();
    if (!data.ok) {
      const errMsg = withUnknownComponentHint(data.error || "Analyze failed", bakeEntryPath());
      showError(errMsg);
      updateRenderConsole([
        { phase: "Analyze (load / parse)", message: errMsg },
        ...workspaceWarn,
      ]);
      setStatus("");
      lastDesignSummary = null;
      renderDesignSummary(null);
      completionSymbols = [];
      return false;
    }
    fillComponentSelect(data.components ?? []);
    themeList.replaceChildren();
    for (const t of data.themes ?? []) {
      const o = document.createElement("option");
      o.value = t;
      themeList.append(o);
    }
    storeControlsFromData(data);
    setCompletionSymbolsFromAnalyze(data);
    refreshCanvasHint();
    const nComp = data.components?.length ?? 0;
    if (workspaceWarn.length > 0) {
      updateRenderConsole(workspaceWarn);
      setStatus(
        `OK — ${nComp} components · ${selectedEngine()} · ${workspaceWarn.length} workspace warning(s)`,
      );
    } else {
      setStatus(`OK — ${nComp} components · ${selectedEngine()}`);
    }
    lastDesignSummary = data.designSummary ?? null;
    renderDesignSummary(data.designSummary);
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    showError(msg);
    updateRenderConsole([
      { phase: "Analyze (network / JSON)", message: msg, stack: e instanceof Error ? e.stack : undefined },
      ...unreachableModuleConsoleEntries(),
    ]);
    setStatus("");
    lastDesignSummary = null;
    renderDesignSummary(null);
    completionSymbols = [];
    return false;
  }
}

async function runRender({ debounced = false } = {}) {
  const id = ++latestRenderId;
  const incremental = nextRenderIncremental;
  const ownerOnly = nextRenderOwnerOnly;
  nextRenderIncremental = false;
  nextRenderOwnerOnly = false;
  // Source/theme ticks: drop cached child IR so next hover/press rebakes from sources.
  // Owner-only SoT rebakes: cancel in-flight resolves so a stale pressEnd/hover
  // bake (e.g. selected:false) cannot clobber ForEach presentation after remount.
  if (!ownerOnly) clearInstanceResolveCache();
  else cancelPendingInstanceResolves();
  showError("");
  updateRenderConsole([]);
  if (!debounced && renderDebounceTimer) {
    clearTimeout(renderDebounceTimer);
    renderDebounceTimer = null;
  }
  setStatus(debounced ? "Updating preview…" : "Rendering…");
  try {
    await flushDiskWrites();
    refreshCanvasHint();
    const canvas = lastCanvas ?? resolveCanvasTarget(activePath, files);
    const variantView = selectedVariantView();
    const theme = themeInput.value.trim();
    const eng = selectedEngine();

    if (canvas.kind === "tokens") {
      // Resolve colors via /api/load so swatches show hex + paint (not name-only regex).
      const loadRes = await fetch("/api/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getBodyBase()),
      });
      const loadData = await loadRes.json();
      if (id !== latestRenderId) return;
      if (!loadData.ok) {
        const errMsg = withUnknownComponentHint(
          loadData.error || "Token preview failed",
          bakeEntryPath(),
        );
        showError(errMsg);
        updateRenderConsole([
          { phase: "Tokens (load / parse)", message: errMsg },
          ...unreachableModuleConsoleEntries(),
        ]);
        lastDesignSummary = null;
        frame.srcdoc = tokensPreviewHtml(canvas.tokens, null);
        setStatus("");
        return;
      }
      lastDesignSummary = loadData.designSummary ?? null;
      renderDesignSummary(loadData.designSummary);
      frame.srcdoc = tokensPreviewHtml(canvas.tokens, lastDesignSummary);
      setStatus("Preview updated · tokens");
      return;
    }
    if (canvas.kind === "empty" || canvas.componentNames.length === 0) {
      if (id !== latestRenderId) return;
      frame.srcdoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:auto}</style></head><body style="font:14px system-ui;padding:24px;color:#556">Nothing to preview in <code>${escapeHtml(activePath)}</code>.
<script>(function(){function p(){try{parent.postMessage({type:'pdl-resize',height:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight)},'*')}catch(e){}}p();requestAnimationFrame(p)})()</script></body></html>`;
      setStatus("Empty canvas");
      return;
    }

    const names = canvas.componentNames;
    const canvasPrimary = canvas.primaryComponent || names[0];
    const owner = overrideOwner(names, canvasPrimary);
    // Persist any textarea edits into the owner's bag before baking.
    commitKvTextareaToOwner(owner);
    const componentOverrides = buildComponentOverrides(names);
    const kv = componentOverrides[owner] ?? {};

    if (eng === "wasm") {
      syncEditorToFiles();
      const wasm = await loadWasmBake();
      if (!wasm) {
        throw new Error(
          "WASM bake unavailable — run ./scripts/build-pdl-wasm.sh and rebuild playground",
        );
      }
      const entry = bakeEntryPath();
      // Disk mode: Rust reads the real FS import closure; WASM only sees `files`.
      // Refresh closure from disk (editor overlays win) so sibling imports resolve.
      const sourceFiles = await sourcesForWasmBake(entry);
      const { filesJson, entry: virtEntry } = virtualizeSources(sourceFiles, entry);
      const t0 = performance.now();
      // Param/emit hot path: bake only the dirty owner. Source/theme: whole canvas IR.
      const dirtyOnly =
        incremental &&
        ownerOnly &&
        previewDocumentLive &&
        !!lastBakedDesign?.components &&
        names.length > 1 &&
        !!(owner || canvasPrimary);
      const bakeTarget = owner || canvasPrimary;
      const bakeJson =
        names.length === 1 || dirtyOnly
          ? wasm.bake_component_sources(
              filesJson,
              virtEntry,
              bakeTarget,
              theme || undefined,
              JSON.stringify(kv),
            )
          : wasm.bake_system_sources(filesJson, virtEntry, theme || undefined);
      const bakeMs = Math.round(performance.now() - t0);
      const bake = JSON.parse(bakeJson);
      if (names.length > 1 && bake.components && !dirtyOnly) {
        const filtered = {};
        for (const n of names) {
          if (bake.components[n]) filtered[n] = bake.components[n];
        }
        bake.components = filtered;
      }
      // Hot path: bake IR in-browser → reconcile (skip HTML round-trip).
      // Nested chrome edits apply on next instance-resolve interaction.
      const liveDoc = frame.contentDocument;
      if (
        incremental &&
        previewDocumentLive &&
        lastBakedDesign?.components &&
        allowIrOnlyPreviewApply({ incremental, ownerOnly, doc: liveDoc })
      ) {
        const mode = applyPreviewUpdate({ baked: bake, ok: true }, { incremental: true });
        if (mode === "incremental") {
          const workspaceWarn = unreachableModuleConsoleEntries();
          if (workspaceWarn.length > 0) updateRenderConsole(workspaceWarn);
          const applyBit = " · live apply";
          setStatus(
            workspaceWarn.length > 0
              ? `Preview updated · wasm · bake ${bakeMs}ms${applyBit} · ${workspaceWarn.length} workspace warning(s)`
              : `Preview updated · wasm · bake ${bakeMs}ms${applyBit}`,
          );
          return;
        }
      }
      const res = await fetch("/api/render-from-bake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bake,
          component: names.length === 1 ? owner || canvasPrimary : undefined,
          componentNames: names.length > 1 ? names : undefined,
          // Same interactive host as Rust CLI — Edit/press/emits need catalogue decls.
          interactiveHost: true,
          // Param / variant knobs (CLI path gets these from handleRender).
          componentOverrides,
          kv,
          ...getBodyBase(),
        }),
      });
      const data = await res.json();
      if (id !== latestRenderId) return;
      if (!data.ok) {
        const errMsg = withUnknownComponentHint(
          data.error || "WASM HTML render failed",
          entry,
        );
        showError(errMsg);
        updateRenderConsole([
          { phase: "WASM bake / render", message: errMsg },
          ...unreachableModuleConsoleEntries(),
        ]);
        frame.removeAttribute("srcdoc");
        setStatus("");
        return;
      }
      if (!data.baked) data.baked = bake;
      const mode = applyPreviewUpdate(data, { incremental });
      const workspaceWarn = unreachableModuleConsoleEntries();
      if (workspaceWarn.length > 0) updateRenderConsole(workspaceWarn);
      const applyBit = mode === "incremental" ? " · live apply" : "";
      setStatus(
        workspaceWarn.length > 0
          ? `Preview updated · wasm · bake ${bakeMs}ms${applyBit} · ${workspaceWarn.length} workspace warning(s)`
          : `Preview updated · wasm · bake ${bakeMs}ms${applyBit}`,
      );
      return;
    }

    /** @type {Record<string, unknown>} */
    const body = {
      ...getBodyBase(),
      theme: theme || undefined,
      interactiveHost: true,
      kv,
      componentSources: buildComponentSources(names),
      bakeOnly: incremental && previewDocumentLive,
    };

    if (variantView === "grid" && (owner || canvasPrimary)) {
      body.mode = "component";
      body.component = owner || canvasPrimary;
      body.variantMatrix = true;
    } else if (
      names.length === 1 ||
      // Param/emit: bake only the dirty owner; merge + reconcile that section.
      (body.bakeOnly && ownerOnly && (owner || canvasPrimary))
    ) {
      body.mode = "component";
      body.component = owner || canvasPrimary;
      body.kv = componentOverrides[owner || canvasPrimary] ?? kv;
    } else {
      body.mode = "system";
      body.componentNames = names;
      // Per-component bags — never splat one kv onto canvas-first (FilterChip).
      if (Object.keys(componentOverrides).length > 0) {
        body.componentOverrides = componentOverrides;
      }
      if (owner) body.component = owner;
    }

    let res = await fetch("/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let data = await res.json();
    if (id !== latestRenderId) return;
    if (!data.ok) {
      const errMsg = withUnknownComponentHint(data.error || "Render failed", bakeEntryPath());
      showError(errMsg);
      updateRenderConsole([
        { phase: "Bake or render (server)", message: errMsg },
        ...unreachableModuleConsoleEntries(),
      ]);
      frame.removeAttribute("srcdoc");
      setStatus("");
      return;
    }
    let mode = applyPreviewUpdate(data, { incremental });
    // bakeOnly IR miss → cold remount with full HTML (restore full canvas bake).
    if (mode === "remount" && body.bakeOnly && !data.html) {
      body.bakeOnly = false;
      if (names.length > 1 && variantView !== "grid") {
        body.mode = "system";
        body.componentNames = names;
        if (Object.keys(componentOverrides).length > 0) {
          body.componentOverrides = componentOverrides;
        }
        if (owner) body.component = owner;
        body.kv = kv;
      }
      res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      data = await res.json();
      if (id !== latestRenderId) return;
      if (!data.ok) {
        const errMsg = withUnknownComponentHint(data.error || "Render failed", bakeEntryPath());
        showError(errMsg);
        updateRenderConsole([
          { phase: "Bake or render (server)", message: errMsg },
          ...unreachableModuleConsoleEntries(),
        ]);
        frame.removeAttribute("srcdoc");
        setStatus("");
        return;
      }
      mode = applyPreviewUpdate(data, { incremental: false });
    }
    const failures = Array.isArray(data.renderFailures) ? data.renderFailures : [];
    const workspaceWarn = unreachableModuleConsoleEntries();
    const engLabel = data.engine ? ` · ${data.engine}` : "";
    const ms = data.durationMs != null ? ` · ${data.durationMs}ms` : "";
    const varN = data.variantCount != null ? ` · ${data.variantCount} variants` : "";
    const applyBit = mode === "incremental" ? " · live apply" : "";
    if (failures.length > 0) {
      updateRenderConsole([
        ...failures.map((f) => ({
          phase: "HTML render",
          component: f.component,
          message: withUnknownComponentHint(f.message, bakeEntryPath()),
          stack: f.stack,
        })),
        ...workspaceWarn,
      ]);
      setStatus(`Preview updated${engLabel}${ms}${varN}${applyBit} — ${failures.length} HTML issue(s)`);
    } else if (workspaceWarn.length > 0) {
      updateRenderConsole(workspaceWarn);
      setStatus(
        `Preview updated${engLabel}${ms}${varN}${applyBit} · ${workspaceWarn.length} workspace warning(s)`,
      );
    } else {
      updateRenderConsole([]);
      setStatus(`Preview updated${engLabel}${ms}${varN}${applyBit}`);
    }
    if (data.components) fillComponentSelect(data.components);
    if (data.fixturesByComponent || data.componentParams) {
      storeControlsFromData(data);
      setCompletionSymbolsFromAnalyze(data);
      refreshCanvasHint();
    }
    if (data.designSummary) {
      lastDesignSummary = data.designSummary;
      renderDesignSummary(data.designSummary);
      setCompletionSymbolsFromAnalyze(data);
    }
  } catch (e) {
    if (id !== latestRenderId) return;
    const raw = e instanceof Error ? e.message : String(e);
    const msg = withUnknownComponentHint(raw, bakeEntryPath());
    showError(msg);
    updateRenderConsole([
      {
        phase: "Render (client)",
        message: msg,
        stack: e instanceof Error ? e.stack : undefined,
      },
      ...unreachableModuleConsoleEntries(),
    ]);
    frame.removeAttribute("srcdoc");
    setStatus("");
  }
}

function updateModeUi() {
  if (packWrap) packWrap.hidden = true;
}

function updateWorkspaceUi() {
  const disk = diskRootMode();
  if (editorWorkspace) editorWorkspace.hidden = disk;
}

document.querySelectorAll('input[name="variantView"]').forEach((r) => {
  r.addEventListener("change", () => {
    refreshControlsUi();
    scheduleDebouncedRender(0);
  });
});
document.querySelectorAll('input[name="engine"]').forEach((r) => {
  r.addEventListener("change", () => {
    syncEngineBadge();
    scheduleDebouncedRender(0);
  });
});
syncEngineBadge();
document.querySelectorAll('input[name="workspace"]').forEach((r) => {
  r.addEventListener("change", () => {
    updateWorkspaceUi();
    if (!diskRootMode()) {
      // Disk pack → scratch (restore prior scratch snapshot if any; never keep pack files).
      enterScratchProject({
        status: lastScratchSnapshot ? "Scratch project restored" : "Scratch project (starter)",
      });
      return;
    }
    // Scratch → disk pack (snapshot scratch first so toggle-back restores it)
    syncEditorToFiles();
    lastScratchSnapshot = { ...files };
    const id =
      lastDiskPackId && lastDiskPackId !== SCRATCH_PACK_ID ? lastDiskPackId : "airbnb-lite";
    void loadPack(id, { fromDisk: true });
  });
});
packSelect.addEventListener("change", () => {
  const id = packSelect.value || "airbnb-lite";
  if (id === SCRATCH_PACK_ID) {
    enterScratchProject({
      status: lastScratchSnapshot ? "Scratch project restored" : "Scratch project (starter)",
    });
    return;
  }
  // Leaving scratch for a fixture pack — keep scratch snapshot for later.
  // (value is already the new pack id; use workspace mode to detect prior scratch.)
  if (!diskRootMode()) {
    syncEditorToFiles();
    lastScratchSnapshot = { ...files };
  }
  // Switching packs intentionally drops the browser draft for a clean disk load.
  void loadPack(id, { fromDisk: true });
});
btnReloadPack.addEventListener("click", () => {
  if (packSelect.value === SCRATCH_PACK_ID || !diskRootMode()) {
    clearDraft();
    lastScratchSnapshot = null;
    enterScratchProject({
      fileMap: { "lab.pdl": START_DESIGN_PDL },
      status: "Scratch reset to starter lab.pdl",
    });
    return;
  }
  const id = packSelect.value || lastDiskPackId || "airbnb-lite";
  // Hard reset: drop dirty flags + draft file bag, then open-pack from disk.
  dirtyDiskPaths.clear();
  clearDraft();
  void loadPack(id, { fromDisk: true });
});
window.addEventListener("beforeunload", () => {
  saveDraftNow();
});
updateModeUi();
updateWorkspaceUi();

themeInput.addEventListener("input", () => {
  scheduleDraftSave();
  // Theme can affect every canvas component — full IR rebake, reconcile deltas.
  scheduleDebouncedRender(undefined, { incremental: true });
});
kvJson.addEventListener("input", () => {
  if (syncingKnobs) return;
  activeFixtureLabel = null;
  const names = lastCanvas?.componentNames ?? [];
  const owner = overrideOwner(names, lastCanvas?.primaryComponent);
  try {
    commitKvTextareaToOwner(owner);
  } catch {
    // Incomplete JSON while typing — wait for the next keystroke / render.
  }
  refreshControlsUi();
  scheduleDraftSave();
  // Param knobs: dirty-owner bake + reconcile.
  scheduleDebouncedRender(undefined, { incremental: true, ownerOnly: true });
});
entryPath.addEventListener("input", () => {
  scheduleDraftSave();
  scheduleDebouncedRender();
});
packPath.addEventListener("input", () => scheduleDebouncedRender());

addProperty?.addEventListener("change", () => {
  if (!editorView || !addProperty.value) return;
  const opt = addProperty.selectedOptions[0];
  const snippet = opt?.dataset?.snippet;
  if (!snippet) return;
  const pos = editorView.state.selection.main.head;
  const doc = editorView.state.doc.toString();
  const { from, to, insert } = formatPropertyInsert(doc, pos, snippet);
  editorView.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + insert.length },
  });
  addProperty.value = "";
  files[activePath] = editorView.state.doc.toString();
  refreshAddPropertyMenu();
  scheduleDebouncedRender();
});

insertTemplate?.addEventListener("change", () => {
  if (!insertTemplate.value) return;
  insertPdlTemplate(insertTemplate.value);
  insertTemplate.value = "";
});

window.addEventListener("message", (ev) => {
  const data = ev.data;
  if (!data || typeof data !== "object") return;
  if (data.type === "pdl-resize" && typeof data.height === "number") {
    const h = Math.max(120, Math.min(Math.ceil(data.height) + 4, 12000));
    frame.style.height = `${h}px`;
    return;
  }
  if (data.type === "pdl-open-source" && typeof data.component === "string" && data.component) {
    openComponentSource(data.component);
    return;
  }
  if (data.type === "pdl-param" && data.component && data.kv && typeof data.kv === "object") {
    primaryComponent = String(data.component);
    preferredComponent = primaryComponent;
    if ([...component.options].some((o) => o.value === primaryComponent)) {
      component.value = primaryComponent;
    }
    setKvForComponent(primaryComponent, /** @type {Record<string, unknown>} */ (data.kv));
    scheduleDebouncedRender(0, { incremental: true, ownerOnly: true });
    return;
  }
  if (data.type === "pdl-resolve-instance") {
    queueInstanceResolve(data);
    return;
  }
  if (data.type === "pdl-interaction") {
    const evName = typeof data.event === "string" ? data.event : "";
    const comp = typeof data.component === "string" ? data.component : "";
    if (evName) {
      const emitBit =
        Array.isArray(data.emits) && data.emits.length
          ? ` · emit ${data.emits.map((e) => e?.name).filter(Boolean).join(",")}`
          : "";
      const childBit = data.childComponent ? ` ← ${data.childComponent}` : "";
      setStatus(`Interaction · ${comp}${childBit} · ${evName}${emitBit}`);
    }
    if (data.params && typeof data.params === "object" && !Array.isArray(data.params)) {
      primaryComponent = comp || primaryComponent;
      preferredComponent = primaryComponent;
      // Own the bag under the emitting/capturing component only (e.g. LibrarySubnav),
      // filtered to its declared scalar params — never FilterChip / canvas-first.
      // PlaylistComposer: mood branches mount `samples Tracks` at bake — no host catalog.
      setKvForComponent(
        primaryComponent,
        /** @type {Record<string, unknown>} */ (data.params),
      );
      activeFixtureLabel = null;
      refreshControlsUi();
      // Rebake when emit capture changed parent SoT. Nested chrome uses
      // pdl-resolve-instance (previewHandled) and does not rebake the parent.
      if (data.previewHandled !== true && data.changed) {
        scheduleDebouncedRender(0, { incremental: true, ownerOnly: true });
      }
    }
  }
});

btnAnalyze.addEventListener("click", () => void runAnalyze());

btnRender.addEventListener("click", () => {
  if (renderDebounceTimer) {
    clearTimeout(renderDebounceTimer);
    renderDebounceTimer = null;
  }
  void runRender({ debounced: false });
});

renderDesignSummary(null);
mountEditor();
renderTabs();
refreshControlsUi();
populateInsertTemplateMenu();
refreshAddPropertyMenu();

void (async () => {
  editorView?.dom.addEventListener("keyup", () => refreshAddPropertyMenu());
  editorView?.dom.addEventListener("click", () => refreshAddPropertyMenu());
  await initCatalog();
  const draft = readDraft();
  if (draft) {
    await restoreDraft(draft);
  } else {
    await loadPack("airbnb-lite");
  }
})();
