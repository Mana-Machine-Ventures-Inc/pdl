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
import { resolveCanvasTarget } from "./file-canvas.js";
import { pdlCompletionSource as buildPdlCompletionSource } from "./pdl-completions.js";
import { loadWasmBake, virtualizeSources } from "./wasm-bake.js";

/** Default workspace: a few tokens + one component for quick Analyze / Render. */
const START_DESIGN_PDL = `// Starter design — tokens + a simple labeled control for playground previews.

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

  let Label: text = {
    content = "Button"
    color = atoms.color.labelOnBrand
    fontSize = 15
    fontWeight = 600
  }

  children = [Label]
}
`;

/** @type {Record<string, string>} */
let files = { "design.pdl": START_DESIGN_PDL };
let activePath = "design.pdl";

/** @type {string[]} */
let completionSymbols = [];

/** @type {EditorView | null} */
let editorView = null;

/** Auto-refresh preview this many ms after the last editor change. */
const RENDER_DEBOUNCE_MS = 500;

/** @type {ReturnType<typeof setTimeout> | null} */
let renderDebounceTimer = null;

/** Incremented on each render attempt; stale HTTP responses are ignored. */
let latestRenderId = 0;

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
const fixtureChips = $("fixtureChips");
const fixtureHint = $("fixtureHint");
const paramKnobs = $("paramKnobs");
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

/** @type {string | null} */
let preferredComponent = "AbnFormActionsDemo";

/** Primary component for fixtures/params (from active file canvas). */
let primaryComponent = "";

/** @type {Record<string, Record<string, Record<string, unknown>>>} */
let fixturesByComponent = {};
/** @type {Record<string, Array<{ name: string; typeName: string; default: unknown }>>} */
let componentParams = {};
/** @type {Record<string, string[]>} */
let variantCases = {};
/** @type {string | null} */
let activeFixtureLabel = null;
/** @type {boolean} */
let syncingKnobs = false;

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
      writeKvObject({ ...examples[label] });
      renderFixtureChips();
      renderParamKnobs();
      scheduleDebouncedRender(0);
    });
    fixtureChips.append(b);
  }
}

function renderParamKnobs() {
  paramKnobs.replaceChildren();
  const name = primaryComponent || component.value;
  const variantView = selectedVariantView();
  const params = componentParams[name] ?? [];
  if (params.length === 0) {
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent = name ? "No params." : "No primary component in this file.";
    paramKnobs.append(p);
    return;
  }
  let current = {};
  try {
    current = readKvObject();
  } catch {
    current = {};
  }
  const filtered =
    variantView === "pick"
      ? params.filter((p) => (variantCases[p.typeName] ?? []).length > 0)
      : params;
  if (filtered.length === 0) {
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent = "No variant params to pick.";
    paramKnobs.append(p);
    return;
  }
  for (const p of filtered) {
    const row = document.createElement("div");
    row.className = "param-row";
    const lab = document.createElement("label");
    lab.textContent = `${p.name} (${p.typeName})`;
    lab.htmlFor = `param-${p.name}`;
    row.append(lab);
    const cases = variantCases[p.typeName];
    const value = current[p.name] !== undefined ? current[p.name] : p.default;
    if (cases && cases.length > 0) {
      const sel = document.createElement("select");
      sel.id = `param-${p.name}`;
      for (const c of cases) {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = `.${c}`;
        sel.append(opt);
      }
      sel.value = String(value ?? cases[0]);
      sel.addEventListener("change", () => {
        activeFixtureLabel = null;
        const next = { ...readKvObjectSafe(), [p.name]: sel.value };
        writeKvObject(next);
        renderFixtureChips();
        scheduleDebouncedRender(0);
      });
      row.append(sel);
    } else {
      const input = document.createElement("input");
      input.type = "text";
      input.id = `param-${p.name}`;
      input.value = value == null ? "" : String(value);
      input.addEventListener("input", () => {
        activeFixtureLabel = null;
        const next = { ...readKvObjectSafe(), [p.name]: input.value };
        writeKvObject(next);
        renderFixtureChips();
        scheduleDebouncedRender();
      });
      row.append(input);
    }
    paramKnobs.append(row);
  }
}

function readKvObjectSafe() {
  try {
    return readKvObject();
  } catch {
    return {};
  }
}

function refreshControlsUi() {
  renderFixtureChips();
  renderParamKnobs();
}

function getEditorText() {
  return editorView?.state.doc.toString() ?? "";
}

function setEditorText(text) {
  if (!editorView) return;
  editorView.dispatch({
    changes: { from: 0, to: editorView.state.doc.length, insert: text },
  });
}

function mountEditor() {
  const start = files[activePath] ?? "";
  editorView = new EditorView({
    parent: editorMount,
    state: EditorState.create({
      doc: start,
      extensions: [
        basicSetup,
        editorTheme,
        keymap.of([indentWithTab, ...completionKeymap]),
        autocompletion({ override: [pdlCompletionSource] }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            files[activePath] = getEditorText();
            scheduleDebouncedRender();
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
            td.append(jsonCell(row[key]));
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
  files[activePath] = getEditorText();
}

function renderTabs() {
  fileTabs.replaceChildren();
  const paths = Object.keys(files).sort();
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
      setEditorText(files[activePath] ?? "");
      renderTabs();
      refreshCanvasHint();
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

function mergeDroppedFiles(newMap) {
  syncEditorToFiles();
  files = { ...files, ...newMap };
  const paths = Object.keys(files).sort();
  const pdl = paths.filter((p) => p.endsWith(".pdl"));
  if (pdl.length === 1) {
    entryPath.value = pdl[0];
  } else if (pdl.includes("design.pdl")) {
    entryPath.value = "design.pdl";
  } else if (pdl.length > 0) {
    entryPath.value = pdl[0];
  }
  const ent = entryPath.value.trim();
  if (files[ent] !== undefined) {
    activePath = ent;
  } else if (pdl.length > 0) {
    activePath = pdl[0];
    entryPath.value = pdl[0];
  } else {
    activePath = paths[0] ?? "design.pdl";
    if (files[activePath] === undefined) {
      files[activePath] = "";
    }
  }
  setEditorText(files[activePath] ?? "");
  renderTabs();
  void (async () => {
    if (await runAnalyze()) scheduleDebouncedRender(0);
  })();
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
    mergeDroppedFiles(map);
    setStatus(`Loaded ${Object.keys(map).length} file(s)`);
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
    mergeDroppedFiles(map);
    setStatus(`Loaded ${Object.keys(map).length} file(s)`);
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
    mergeDroppedFiles(map);
    setStatus(`Loaded ${Object.keys(map).length} file(s) from folder`);
    showError("");
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err));
  }
  dirPick.value = "";
});

function diskRootMode() {
  return document.querySelector('input[name="workspace"]:checked')?.value === "disk";
}

function selectedEngine() {
  const v = document.querySelector('input[name="engine"]:checked')?.value;
  if (v === "ts" || v === "wasm") return v;
  return "rust";
}

function selectedVariantView() {
  return document.querySelector('input[name="variantView"]:checked')?.value ?? "single";
}

function refreshCanvasHint() {
  syncEditorToFiles();
  lastCanvas = resolveCanvasTarget(activePath, files);
  primaryComponent = lastCanvas.primaryComponent ?? "";
  if (primaryComponent) {
    component.value = primaryComponent;
    preferredComponent = primaryComponent;
  }
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

function tokensPreviewHtml(tokens) {
  const row = (title, items) => {
    if (!items.length) return "";
    return `<h2>${title}</h2><ul>${items.map((x) => `<li><code>${x}</code></li>`).join("")}</ul>`;
  };
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  body{font:14px/1.45 ui-sans-serif,system-ui;padding:24px;background:#f6f7f9;color:#222}
  h1{font-size:1.1rem} h2{font-size:0.95rem;margin-top:1.2rem}
  code{font-family:ui-monospace,Menlo,monospace;font-size:0.85rem}
  ul{padding-left:1.2rem}
  </style></head><body>
  <h1>Tokens — ${activePath.split("/").pop()}</h1>
  ${row("Primitives", tokens.primitives)}
  ${row("Semantics", tokens.semantics)}
  ${row("Themes", tokens.themes)}
  ${row("Variants", tokens.variants)}
  ${row("Type styles", tokens.typeStyles)}
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

function getBodyBase() {
  syncEditorToFiles();
  const disk = diskRootMode();
  return {
    files: disk ? undefined : files,
    entry: entryPath.value.trim() || (disk ? "test-fixtures/pdl/molecules/design.pdl" : "design.pdl"),
    diskRoot: disk || undefined,
    engine: selectedEngine(),
  };
}

/**
 * @param {number} [delayMs] — `0` runs render on the next task (e.g. mode / component change); default debounces editor typing.
 */
function scheduleDebouncedRender(delayMs = RENDER_DEBOUNCE_MS) {
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
  for (const [rel, content] of Object.entries(files)) {
    if (!rel.endsWith(".pdl")) continue;
    if (!rel.startsWith("test-fixtures/pdl/")) continue;
    const res = await fetch("/api/write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: rel, content }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || `Failed to write ${rel}`);
  }
}

async function loadPack(packId) {
  setStatus(`Loading pack ${packId}…`);
  showError("");
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
  const diskRadio = document.querySelector('input[name="workspace"][value="disk"]');
  if (diskRadio) diskRadio.checked = true;
  updateWorkspaceUi();
  files = { ...(data.files ?? {}) };
  entryPath.value = data.entry;
  preferredComponent = data.defaultComponent ?? null;
  packDesc.textContent = data.pack?.description ?? "";
  activePath = data.entry;
  if (files[activePath] === undefined) {
    const keys = Object.keys(files).sort();
    activePath = keys[0] ?? data.entry;
  }
  setEditorText(files[activePath] ?? "");
  renderTabs();
  if (await runAnalyze()) await runRender({ debounced: false });
  return true;
}

async function initCatalog() {
  const res = await fetch("/api/catalog");
  const data = await res.json();
  packSelect.replaceChildren();
  for (const p of data.packs ?? []) {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.label;
    packSelect.append(opt);
  }
  packSelect.value = "airbnb-lite";
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
    if (!data.ok) {
      showError(data.error || "Analyze failed");
      updateRenderConsole([
        { phase: "Analyze (load / parse)", message: data.error || "Analyze failed" },
      ]);
      setStatus("");
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
    setStatus(`OK — ${data.components?.length ?? 0} components · ${selectedEngine()}`);
    renderDesignSummary(data.designSummary);
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    showError(msg);
    updateRenderConsole([{ phase: "Analyze (network / JSON)", message: msg, stack: e instanceof Error ? e.stack : undefined }]);
    setStatus("");
    renderDesignSummary(null);
    completionSymbols = [];
    return false;
  }
}

async function runRender({ debounced = false } = {}) {
  const id = ++latestRenderId;
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
    let kv = {};
    if (kvJson.value.trim()) {
      kv = JSON.parse(kvJson.value);
      if (kv === null || typeof kv !== "object" || Array.isArray(kv)) {
        throw new Error("Param overrides must be a JSON object");
      }
    }
    const theme = themeInput.value.trim();
    const eng = selectedEngine();

    if (canvas.kind === "tokens") {
      if (id !== latestRenderId) return;
      frame.srcdoc = tokensPreviewHtml(canvas.tokens);
      setStatus("Preview updated · tokens");
      return;
    }
    if (canvas.kind === "empty" || canvas.componentNames.length === 0) {
      if (id !== latestRenderId) return;
      frame.srcdoc = `<!DOCTYPE html><html><body style="font:14px system-ui;padding:24px;color:#556">Nothing to preview in <code>${activePath}</code>.</body></html>`;
      setStatus("Empty canvas");
      return;
    }

    const names = canvas.componentNames;
    const primary = canvas.primaryComponent || names[0];

    if (eng === "wasm") {
      syncEditorToFiles();
      const wasm = await loadWasmBake();
      if (!wasm) {
        throw new Error(
          "WASM bake unavailable — run ./scripts/build-pdl-wasm.sh and rebuild playground",
        );
      }
      const entry = entryPath.value.trim();
      const { filesJson, entry: virtEntry } = virtualizeSources(files, entry);
      const t0 = performance.now();
      const bakeJson =
        names.length === 1 || variantView === "pick"
          ? wasm.bake_component_sources(
              filesJson,
              virtEntry,
              primary,
              theme || undefined,
              JSON.stringify(kv),
            )
          : wasm.bake_system_sources(filesJson, virtEntry, theme || undefined);
      const bakeMs = Math.round(performance.now() - t0);
      const bake = JSON.parse(bakeJson);
      if (names.length > 1 && bake.components) {
        const filtered = {};
        for (const n of names) {
          if (bake.components[n]) filtered[n] = bake.components[n];
        }
        bake.components = filtered;
      }
      const res = await fetch("/api/render-from-bake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bake,
          component: names.length === 1 ? primary : undefined,
        }),
      });
      const data = await res.json();
      if (id !== latestRenderId) return;
      if (!data.ok) {
        showError(data.error || "WASM HTML render failed");
        frame.removeAttribute("srcdoc");
        setStatus("");
        return;
      }
      frame.srcdoc = data.html;
      setStatus(`Preview updated · wasm · bake ${bakeMs}ms`);
      return;
    }

    /** @type {Record<string, unknown>} */
    const body = {
      ...getBodyBase(),
      theme: theme || undefined,
      interactiveHost: true,
      kv,
    };

    if (variantView === "grid" && primary) {
      body.mode = "component";
      body.component = primary;
      body.variantMatrix = true;
    } else if (variantView === "pick" || names.length === 1) {
      body.mode = "component";
      body.component = primary;
    } else {
      body.mode = "system";
      body.componentNames = names;
    }

    const res = await fetch("/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (id !== latestRenderId) return;
    if (!data.ok) {
      const errMsg = data.error || "Render failed";
      showError(errMsg);
      updateRenderConsole([{ phase: "Bake or render (server)", message: errMsg }]);
      frame.removeAttribute("srcdoc");
      setStatus("");
      return;
    }
    frame.srcdoc = data.html;
    const failures = Array.isArray(data.renderFailures) ? data.renderFailures : [];
    const engLabel = data.engine ? ` · ${data.engine}` : "";
    const ms = data.durationMs != null ? ` · ${data.durationMs}ms` : "";
    const varN = data.variantCount != null ? ` · ${data.variantCount} variants` : "";
    if (failures.length > 0) {
      updateRenderConsole(
        failures.map((f) => ({
          phase: "HTML render",
          component: f.component,
          message: f.message,
          stack: f.stack,
        })),
      );
      setStatus(`Preview updated${engLabel}${ms}${varN} — ${failures.length} HTML issue(s)`);
    } else {
      updateRenderConsole([]);
      setStatus(`Preview updated${engLabel}${ms}${varN}`);
    }
    if (data.components) fillComponentSelect(data.components);
    if (data.fixturesByComponent || data.componentParams) {
      storeControlsFromData(data);
      setCompletionSymbolsFromAnalyze(data);
      refreshCanvasHint();
    }
    if (data.designSummary) {
      renderDesignSummary(data.designSummary);
      setCompletionSymbolsFromAnalyze(data);
    }
  } catch (e) {
    if (id !== latestRenderId) return;
    const msg = e instanceof Error ? e.message : String(e);
    showError(msg);
    updateRenderConsole([
      {
        phase: "Render (client)",
        message: msg,
        stack: e instanceof Error ? e.stack : undefined,
      },
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
    scheduleDebouncedRender(0);
  });
});
document.querySelectorAll('input[name="workspace"]').forEach((r) => {
  r.addEventListener("change", () => {
    updateWorkspaceUi();
    void runAnalyze().then((ok) => {
      if (ok) scheduleDebouncedRender(0);
    });
  });
});
packSelect.addEventListener("change", () => {
  void loadPack(packSelect.value);
});
updateModeUi();
updateWorkspaceUi();

themeInput.addEventListener("input", () => scheduleDebouncedRender());
kvJson.addEventListener("input", () => {
  if (syncingKnobs) return;
  activeFixtureLabel = null;
  refreshControlsUi();
  scheduleDebouncedRender();
});
entryPath.addEventListener("input", () => scheduleDebouncedRender());
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

window.addEventListener("message", (ev) => {
  const data = ev.data;
  if (!data || data.type !== "pdl-interaction") return;
  if (data.event === "pressEnd") {
    setStatus(`Emit · ${data.component} · pressEnd`);
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

void (async () => {
  editorView?.dom.addEventListener("keyup", () => refreshAddPropertyMenu());
  editorView?.dom.addEventListener("click", () => refreshAddPropertyMenu());
  await initCatalog();
  await loadPack("airbnb-lite");
})();
