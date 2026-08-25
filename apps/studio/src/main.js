import { state, emit, isDirty, clearDirty, subscribe } from "./state.js";
import {
  fetchStarters,
  openProject,
  loadCatalogue,
  writeFile,
  exportArtifact,
} from "./api.js";
import {
  mountEditor,
  syncEditorFromState,
  focusSymbol,
  focusLine,
  flushEditorToFiles,
} from "./editor.js";
import { mountNavigator } from "./navigator.js";
import { mountWorld } from "./world.js";
import { mountCompanionDock } from "./companions.js";
import { mountProblems, setProblemText, clearProblems } from "./problems.js";
import {
  mountPreview,
  schedulePreview,
  runPreview,
  fillThemes,
  fillHostChrome,
} from "./preview.js";
import { symbolsInFile } from "./symbols.js";

const RECENT_KEY = "pdl-studio-recent-v1";
const LAST_KEY = "pdl-studio-last-v1";

const welcome = document.getElementById("welcome");
const workspace = document.getElementById("workspace");
const openDialog = document.getElementById("openDialog");

const nav = mountNavigator({ onSelect: handleNavSelect });
const world = mountWorld({
  onChange: () => {
    world.renderWorld();
    schedulePreview();
  },
  onSampleClick: (samplePath) => {
    const bank = String(samplePath).split(".")[0];
    handleNavSelect({ kind: "samples", name: bank });
  },
});
const companions = mountCompanionDock({
  onReveal: (file, sym) => {
    state.editFile = file;
    syncEditorFromState();
    if (sym) focusSymbol(sym);
    nav.renderNavigator();
    updateChrome();
  },
});

mountProblems({
  onGoto: (p) => {
    if (!p.file) return;
    const hit =
      Object.keys(state.files).find(
        (f) => f === p.file || f.endsWith(`/${p.file}`) || p.file.endsWith(f),
      ) || p.file;
    if (!state.files[hit]) return;
    state.editFile = hit;
    syncEditorFromState();
    if (p.line) focusLine(p.line);
    nav.renderNavigator();
    updateChrome();
  },
});

mountEditor(document.getElementById("editorMount"), {
  onChange: () => {
    updateChrome();
    schedulePreview(450);
  },
  onGoto: (path, line, name) => {
    if (!state.files[path]) return;
    state.editFile = path;
    if (name) state.selectedSymbol = name;
    syncEditorFromState();
    focusLine(line);
    nav.renderNavigator();
    companions.renderCompanion();
    updateChrome();
  },
});

mountPreview(document.getElementById("previewFrame"), {
  onStatus: (msg) => {
    document.getElementById("statusLeft").textContent = msg;
  },
  onError: (err) => {
    setProblemText(err, { file: state.editFile || undefined });
  },
});

// Dock tabs
document.querySelectorAll(".dock-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    const dock = btn.getAttribute("data-dock");
    document.querySelectorAll(".dock-tab").forEach((b) => {
      b.classList.toggle("is-active", b === btn);
    });
    document.getElementById("dockWorld").hidden = dock !== "world";
    document.getElementById("dockNotes").hidden = dock !== "notes";
    if (dock === "notes") companions.renderCompanion();
  });
});

// Modes
document.querySelectorAll(".mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.getAttribute("data-mode");
    state.mode = mode === "prototype" || mode === "review" ? mode : "design";
    document.querySelectorAll(".mode-btn").forEach((b) => {
      const on = b === btn;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.getElementById("app").dataset.mode = state.mode;
    if (state.mode === "prototype") {
      promotePrototypeRoot();
    }
    nav.renderNavigator();
    companions.renderCompanion();
    schedulePreview();
    updateChrome();
  });
});

document.getElementById("btnOpen")?.addEventListener("click", () => openOpenDialog());
document.getElementById("btnWelcomeOpen")?.addEventListener("click", () => openOpenDialog());
document.getElementById("openCancel")?.addEventListener("click", () => openDialog.close());
document.getElementById("btnReload")?.addEventListener("click", () => void reloadProject());

document.getElementById("openForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const root = document.getElementById("openRoot").value.trim();
  const entry = document.getElementById("openEntry").value.trim() || undefined;
  const errEl = document.getElementById("openError");
  try {
    errEl.hidden = true;
    if (isDirty() && !confirm("Discard unsaved changes and open another project?")) return;
    await loadProject(root, entry);
    openDialog.close();
  } catch (err) {
    errEl.hidden = false;
    errEl.textContent = err instanceof Error ? err.message : String(err);
  }
});

document.getElementById("btnSave")?.addEventListener("click", () => void saveAll());

const exportBtn = document.getElementById("btnExport");
const exportMenu = document.getElementById("exportMenu");
exportBtn?.addEventListener("click", () => {
  exportMenu.hidden = !exportMenu.hidden;
});
document.addEventListener("click", (e) => {
  if (!exportMenu || exportMenu.hidden) return;
  if (e.target === exportBtn || exportMenu.contains(/** @type {Node} */ (e.target))) return;
  exportMenu.hidden = true;
});
exportMenu?.querySelectorAll("[data-export]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    exportMenu.hidden = true;
    const kind = btn.getAttribute("data-export");
    try {
      flushEditorToFiles();
      const data = await exportArtifact({
        root: state.root,
        entry: state.entry,
        files: Object.fromEntries([...state.dirty].map((p) => [p, state.files[p]])),
        kind,
        component: state.previewRoot || undefined,
        theme: state.theme || undefined,
      });
      downloadText(data.filename, data.content, data.mime);
      setStatusRight(`Exported ${data.filename}`);
      clearProblems();
    } catch (err) {
      setProblemText(err instanceof Error ? err.message : String(err), {
        file: state.editFile || undefined,
      });
    }
  });
});

// Keyboard shortcuts
window.addEventListener("keydown", (e) => {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key === "s") {
    e.preventDefault();
    void saveAll();
  } else if (mod && e.key === "o") {
    e.preventDefault();
    openOpenDialog();
  } else if (mod && e.key === "k") {
    e.preventDefault();
    const search = document.getElementById("navSearch");
    search?.focus();
    search?.select();
  } else if (e.key === "Escape") {
    exportMenu.hidden = true;
    if (openDialog.open) openDialog.close();
  }
});

subscribe(() => {
  updateChrome();
  world.renderWorld();
  companions.renderCompanion();
});

async function init() {
  renderRecent();
  const data = await fetchStarters();
  const list = document.getElementById("starterList");
  list.innerHTML = (data.starters ?? [])
    .map(
      (s) =>
        `<li><button type="button" data-root="${s.root}" data-entry="${s.entry}"><strong>${escapeHtml(s.label)}</strong><span>${escapeHtml(s.description || s.root)}</span></button></li>`,
    )
    .join("");
  list.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      void loadProject(btn.getAttribute("data-root"), btn.getAttribute("data-entry"));
    });
  });

  try {
    const raw = localStorage.getItem(LAST_KEY);
    if (raw) {
      const last = JSON.parse(raw);
      if (last?.root) await loadProject(last.root, last.entry);
    }
  } catch {
    /* ignore */
  }
}

function openOpenDialog() {
  if (state.rootDisplay) {
    document.getElementById("openRoot").value = state.rootDisplay;
  }
  openDialog.showModal();
  document.getElementById("openRoot")?.focus();
}

function readRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function pushRecent(root, entry, label) {
  const next = [
    { root, entry, label, at: Date.now() },
    ...readRecent().filter((r) => r.root !== root),
  ].slice(0, 6);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

function renderRecent() {
  const list = document.getElementById("recentList");
  const heading = document.getElementById("recentHeading");
  const recent = readRecent();
  if (!recent.length) {
    list.hidden = true;
    heading.hidden = true;
    return;
  }
  list.hidden = false;
  heading.hidden = false;
  list.innerHTML = recent
    .map(
      (r) =>
        `<li><button type="button" data-root="${escapeAttr(r.root)}" data-entry="${escapeAttr(r.entry || "design.pdl")}"><strong>${escapeHtml(r.label || r.root)}</strong><span>${escapeHtml(r.root)}</span></button></li>`,
    )
    .join("");
  list.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      void loadProject(btn.getAttribute("data-root"), btn.getAttribute("data-entry"));
    });
  });
}

/**
 * @param {string} root
 * @param {string} [entry]
 */
async function loadProject(root, entry) {
  document.getElementById("statusLeft").textContent = "Opening…";
  clearProblems();
  const opened = await openProject(root, entry);
  state.root = opened.root;
  state.rootDisplay = opened.rootDisplay;
  state.rootLabel = opened.rootLabel;
  state.entry = opened.entry;
  state.files = { ...opened.files };
  state.baselines = { ...opened.files };
  state.dirty.clear();
  state.activeWorld = {};
  state.paramOverrides = {};
  state.hostFacts = {};
  state.theme = "";
  state.previewPinned = false;
  document.getElementById("previewPin").checked = false;

  try {
    const cat = await loadCatalogue(state.root, state.entry, dirtyOverlay());
    state.catalogue = cat;
  } catch (err) {
    state.catalogue = null;
    setProblemText(err instanceof Error ? err.message : String(err));
  }

  welcome.hidden = true;
  workspace.hidden = false;
  document.getElementById("btnSave").disabled = false;
  document.getElementById("btnExport").disabled = false;
  document.getElementById("btnReload").disabled = false;

  pickDefaultSelection();
  fillThemes();
  fillHostChrome();
  nav.renderNavigator();
  syncEditorFromState();
  if (state.selectedSymbol && state.selectedSymbol !== "__tokens__") {
    focusSymbol(state.selectedSymbol);
  }
  world.renderWorld();
  companions.renderCompanion();
  updateChrome();
  await runPreview();

  localStorage.setItem(
    LAST_KEY,
    JSON.stringify({ root: state.rootDisplay || state.root, entry: state.entry }),
  );
  pushRecent(state.rootDisplay || state.root, state.entry, state.rootLabel);
  renderRecent();
}

async function reloadProject() {
  if (!state.root) return;
  if (isDirty() && !confirm("Discard unsaved changes and reload from disk?")) return;
  const root = state.rootDisplay || state.root;
  const entry = state.entry;
  await loadProject(root, entry);
  setStatusRight("Reloaded from disk");
}

function pickDefaultSelection() {
  const cat = state.catalogue;
  if (!cat) return;

  if (state.mode === "prototype") {
    const screen = (cat.components ?? []).find((n) => cat.componentRoles?.[n] === "screen");
    if (screen) {
      selectSymbol(screen);
      return;
    }
  }

  const entrySymbols = symbolsInFile(state.entry, state.files, cat);
  if (entrySymbols.length === 1) {
    selectSymbol(entrySymbols[0]);
    return;
  }

  const preferred = ["PlaylistComposer", "AbnPointerLab", "AbnButton", "IosPhone", "UsageRulesLab"];
  for (const name of preferred) {
    if (cat.components?.includes(name)) {
      selectSymbol(name);
      return;
    }
  }

  const first = (cat.components ?? []).find((n) => !cat.componentRoles?.[n]) || cat.components?.[0];
  if (first) selectSymbol(first);
  else {
    state.editFile = state.entry;
    state.previewRoot = null;
    state.selectedSymbol = null;
  }
}

function promotePrototypeRoot() {
  const cat = state.catalogue;
  const screen = (cat?.components ?? []).find((n) => cat.componentRoles?.[n] === "screen");
  if (screen && !state.previewPinned) selectSymbol(screen);
}

/**
 * @param {{ kind: string, name?: string, file?: string }} sel
 */
function handleNavSelect(sel) {
  if (sel.kind === "file" && sel.file) {
    selectFile(sel.file);
    return;
  }
  if (sel.kind === "foundation" || sel.name === "__tokens__") {
    const file =
      sel.file ||
      Object.keys(state.files).find((p) => /foundation\.pdl$/i.test(p)) ||
      state.entry;
    state.selectedSymbol = "__tokens__";
    state.editFile = file;
    syncEditorFromState();
    nav.renderNavigator();
    companions.renderCompanion();
    updateChrome();
    return;
  }
  if (sel.kind === "samples" && sel.name) {
    for (const [path, src] of Object.entries(state.files)) {
      if (new RegExp(`\\bsamples\\s+${sel.name}\\b`).test(src)) {
        state.selectedSymbol = sel.name;
        state.editFile = path;
        syncEditorFromState();
        focusSymbol(sel.name);
        nav.renderNavigator();
        companions.renderCompanion();
        updateChrome();
        return;
      }
    }
  }
  if (sel.kind === "theme" && sel.name) {
    state.theme = sel.name;
    fillThemes();
    schedulePreview();
    return;
  }
  if ((sel.kind === "symbol" || sel.kind === "samples") && sel.name) {
    selectSymbol(sel.name, sel.file);
  }
}

/**
 * @param {string} name
 * @param {string} [fileHint]
 */
function selectSymbol(name, fileHint) {
  state.selectedSymbol = name;
  const file =
    fileHint ||
    nav.resolveComponentFile(name) ||
    Object.keys(state.files).find((p) =>
      new RegExp(`\\b(component|page|screen)\\s+${name}\\b`).test(state.files[p]),
    ) ||
    state.editFile ||
    state.entry;
  state.editFile = file;
  if (!state.previewPinned) {
    state.previewRoot = name;
  }
  syncEditorFromState();
  focusSymbol(name);
  nav.renderNavigator();
  world.renderWorld();
  companions.renderCompanion();
  updateChrome();
  schedulePreview(50);
}

/**
 * @param {string} file
 */
function selectFile(file) {
  state.editFile = file;
  state.selectedSymbol = null;
  syncEditorFromState();

  if (!state.previewPinned) {
    const syms = symbolsInFile(file, state.files, state.catalogue);
    if (syms.length === 1) {
      state.previewRoot = syms[0];
      state.selectedSymbol = syms[0];
      focusSymbol(syms[0]);
    } else if (syms.length > 1) {
      if (!syms.includes(state.previewRoot)) {
        state.previewRoot = syms[0];
      }
      state.selectedSymbol = state.previewRoot;
    }
  }

  nav.renderNavigator();
  world.renderWorld();
  companions.renderCompanion();
  updateChrome();
  schedulePreview(50);
}

async function saveAll() {
  flushEditorToFiles();
  if (!state.root || !state.dirty.size) {
    setStatusRight(state.root ? "Nothing to save" : "");
    return;
  }
  const paths = [...state.dirty];
  for (const path of paths) {
    const content = state.files[path];
    const result = await writeFile(state.root, path, content, state.baselines[path]);
    if (result.conflict) {
      setProblemText(
        `Conflict saving ${path}: file changed on disk. Use Reload to discard local edits.`,
        { file: path },
      );
      return;
    }
    state.baselines[path] = content;
    clearDirty(path);
  }
  try {
    state.catalogue = await loadCatalogue(state.root, state.entry, {});
    fillThemes();
    fillHostChrome();
    nav.renderNavigator();
    world.renderWorld();
    companions.renderCompanion();
    clearProblems();
  } catch (err) {
    setProblemText(err instanceof Error ? err.message : String(err));
  }
  updateChrome();
  setStatusRight(`Saved ${paths.length} file(s)`);
}

function dirtyOverlay() {
  /** @type {Record<string, string>} */
  const out = {};
  for (const p of state.dirty) out[p] = state.files[p];
  return out;
}

function updateChrome() {
  document.getElementById("projectName").textContent = state.rootLabel
    ? state.rootDisplay || state.rootLabel
    : "No project";
  const saveState = document.getElementById("saveState");
  saveState.textContent = isDirty() ? "● Unsaved" : state.root ? "Saved" : "";
  document.getElementById("btnSave").disabled = !state.root || !isDirty();
  document.getElementById("btnReload").disabled = !state.root;
  document.getElementById("btnExport").disabled = !state.root;

  const sym = state.selectedSymbol || state.previewRoot;
  document.getElementById("symbolLabel").textContent = sym
    ? sym === "__tokens__"
      ? "Tokens"
      : sym
    : "—";
  document.getElementById("fileLabel").textContent = state.editFile || "";

  const pin = state.previewPinned ? " · preview pinned" : "";
  document.getElementById("statusRight").textContent = state.root
    ? `${state.mode}${pin} · ${state.dirty.size} dirty`
    : "";

  updateLegend();
}

function updateLegend() {
  const el = document.getElementById("interactionLegend");
  if (!el) return;
  const name = state.previewRoot;
  const ix = name && state.catalogue?.interactionsByComponent?.[name];
  if (!Array.isArray(ix) || !ix.length) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  const events = new Set();
  for (const block of ix) {
    for (const h of block.handlers ?? []) {
      if (h?.event) events.add(String(h.event));
    }
  }
  if (!events.size) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.innerHTML = `<strong>Host events</strong> ${[...events].map(escapeHtml).join(" · ")} <span class="hint">— inbound from the runtime, not parent emits</span>`;
}

function setStatusRight(msg) {
  document.getElementById("statusRight").textContent = msg;
}

function downloadText(filename, content, mime) {
  const blob = new Blob([content], { type: mime || "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}

void init();
