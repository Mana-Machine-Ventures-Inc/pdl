import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { indentWithTab } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { PDL_KEYWORDS } from "./pdl-keywords.js";

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
const componentWrap = $("componentWrap");
const designMeta = $("designMeta");
const outputPanelHtml = $("outputPanelHtml");
const outputPanelDesign = $("outputPanelDesign");

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
  const before = context.matchBefore(/[\w.]+$/);
  if (!before && !context.explicit) return null;
  const from = before ? before.from : context.pos;
  const q = (before?.text ?? "").toLowerCase();
  const opts = [];
  const seen = new Set();
  function add(label, type) {
    if (seen.has(label)) return;
    seen.add(label);
    opts.push({ label, type });
  }
  for (const kw of PDL_KEYWORDS) {
    if (!q || kw.toLowerCase().startsWith(q)) add(kw, "keyword");
  }
  for (const sym of completionSymbols) {
    if (!q || sym.toLowerCase().includes(q)) add(sym, "variable");
  }
  if (opts.length === 0) return null;
  opts.sort((a, b) => a.label.localeCompare(b.label));
  return { from, options: opts.slice(0, 200) };
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
    b.textContent = p;
    if (p === activePath) b.classList.add("active");
    b.addEventListener("click", () => {
      syncEditorToFiles();
      activePath = p;
      setEditorText(files[activePath] ?? "");
      renderTabs();
    });
    fileTabs.append(b);
  }
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

function getBodyBase() {
  syncEditorToFiles();
  return {
    files,
    entry: entryPath.value.trim() || "design.pdl",
  };
}

function updateModeUi() {
  const mode = document.querySelector('input[name="mode"]:checked')?.value;
  const system = mode === "system";
  componentWrap.style.opacity = system ? "0.45" : "1";
  component.disabled = system;
  kvJson.disabled = system;
}

document.querySelectorAll('input[name="mode"]').forEach((r) => {
  r.addEventListener("change", updateModeUi);
});
updateModeUi();

btnAnalyze.addEventListener("click", async () => {
  showError("");
  setStatus("Analyzing…");
  try {
    const res = await fetch("/api/load", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getBodyBase()),
    });
    const data = await res.json();
    if (!data.ok) {
      showError(data.error || "Analyze failed");
      setStatus("");
      renderDesignSummary(null);
      completionSymbols = [];
      return;
    }
    component.replaceChildren();
    for (const name of data.components ?? []) {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      component.append(opt);
    }
    themeList.replaceChildren();
    for (const t of data.themes ?? []) {
      const o = document.createElement("option");
      o.value = t;
      themeList.append(o);
    }
    setCompletionSymbolsFromAnalyze(data);
    setStatus(`OK — ${data.components?.length ?? 0} components, ${data.themes?.length ?? 0} themes`);
    renderDesignSummary(data.designSummary);
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e));
    setStatus("");
    renderDesignSummary(null);
    completionSymbols = [];
  }
});

btnRender.addEventListener("click", async () => {
  showError("");
  setStatus("Rendering…");
  try {
    const mode =
      document.querySelector('input[name="mode"]:checked')?.value === "system"
        ? "system"
        : "component";
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
    };
    const res = await fetch("/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) {
      showError(data.error || "Render failed");
      frame.removeAttribute("srcdoc");
      setStatus("");
      return;
    }
    frame.srcdoc = data.html;
    setStatus("Preview updated");
    if (data.designSummary) {
      renderDesignSummary(data.designSummary);
      setCompletionSymbolsFromAnalyze(data);
    }
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e));
    frame.removeAttribute("srcdoc");
    setStatus("");
  }
});

renderDesignSummary(null);
mountEditor();
renderTabs();
