import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { indentWithTab } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { pdlCompletionSource as buildPdlCompletionSource } from "./pdl-completions.js";

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
const editorWorkspace = $("editorWorkspace");
const designMeta = $("designMeta");
const outputPanelHtml = $("outputPanelHtml");
const outputPanelDesign = $("outputPanelDesign");
const renderConsole = $("renderConsole");
const renderConsoleTitle = $("renderConsoleTitle");
const renderConsoleBody = $("renderConsoleBody");

/** @type {string | null} */
let preferredComponent = "MoleculeButtonRowDemo";

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
        if (c) s.add(String(c));
      }
    }
    for (const ts of ds.typeStyles ?? []) {
      if (ts?.name) s.add(String(ts.name));
    }
  }
  completionSymbols = [...s].sort((a, b) => a.localeCompare(b));
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
  errorEl.textContent = msg;
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
  return document.querySelector('input[name="engine"]:checked')?.value === "ts" ? "ts" : "rust";
}

function selectedMode() {
  return document.querySelector('input[name="mode"]:checked')?.value ?? "system";
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
  packSelect.value = "molecules";
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
    setCompletionSymbolsFromAnalyze(data);
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
    const mode = selectedMode();
    let kv = {};
    if (mode === "component" && kvJson.value.trim()) {
      kv = JSON.parse(kvJson.value);
      if (kv === null || typeof kv !== "object" || Array.isArray(kv)) {
        throw new Error("Param overrides must be a JSON object");
      }
    }
    const theme = themeInput.value.trim();
    const body = {
      ...getBodyBase(),
      mode,
      component: component.value,
      theme: theme || undefined,
      kv: mode === "component" ? kv : undefined,
      pack: mode === "pack" ? packPath.value.trim() : undefined,
    };
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
      updateRenderConsole([
        {
          phase: "Bake or render (server)",
          message: errMsg,
        },
      ]);
      frame.removeAttribute("srcdoc");
      setStatus("");
      return;
    }
    frame.srcdoc = data.html;
    const failures = Array.isArray(data.renderFailures) ? data.renderFailures : [];
    const eng = data.engine ? ` · ${data.engine}` : "";
    const ms = data.durationMs != null ? ` · ${data.durationMs}ms` : "";
    if (failures.length > 0) {
      updateRenderConsole(
        failures.map((f) => ({
          phase: "HTML render",
          component: f.component,
          message: f.message,
          stack: f.stack,
        })),
      );
      setStatus(`Preview updated${eng}${ms} — ${failures.length} HTML issue(s)`);
    } else {
      updateRenderConsole([]);
      setStatus(`Preview updated${eng}${ms}`);
    }
    if (data.components) fillComponentSelect(data.components);
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
  const mode = selectedMode();
  const system = mode === "system";
  const pack = mode === "pack";
  component.disabled = system || pack;
  kvJson.disabled = system || pack;
  packWrap.hidden = !pack;
  if (pack) {
    const rustRadio = document.querySelector('input[name="engine"][value="rust"]');
    if (rustRadio) rustRadio.checked = true;
  }
}

function updateWorkspaceUi() {
  const disk = diskRootMode();
  if (editorWorkspace) editorWorkspace.hidden = disk;
}

document.querySelectorAll('input[name="mode"]').forEach((r) => {
  r.addEventListener("change", () => {
    updateModeUi();
    scheduleDebouncedRender(0);
  });
});
document.querySelectorAll('input[name="engine"]').forEach((r) => {
  r.addEventListener("change", () => {
    updateModeUi();
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

component.addEventListener("change", () => scheduleDebouncedRender(0));
themeInput.addEventListener("input", () => scheduleDebouncedRender());
kvJson.addEventListener("input", () => scheduleDebouncedRender());
entryPath.addEventListener("input", () => scheduleDebouncedRender());
packPath.addEventListener("input", () => scheduleDebouncedRender());

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

void (async () => {
  await initCatalog();
  await loadPack("molecules");
})();
