import { state, emit, isDirty, clearDirty, subscribe } from "./state.js";
import {
  fetchStarters,
  openProject,
  loadCatalogue,
  writeFile,
  exportArtifact,
} from "./api.js";
import { mountEditor, syncEditorFromState, focusSymbol, flushEditorToFiles } from "./editor.js";
import { mountNavigator } from "./navigator.js";
import { mountWorld } from "./world.js";
import {
  mountPreview,
  schedulePreview,
  runPreview,
  fillThemes,
  fillHostChrome,
} from "./preview.js";
import { symbolsInFile } from "./symbols.js";

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

mountEditor(document.getElementById("editorMount"), {
  onChange: () => {
    updateChrome();
    schedulePreview(450);
  },
});

mountPreview(document.getElementById("previewFrame"), {
  onStatus: (msg) => {
    document.getElementById("statusLeft").textContent = msg;
  },
  onError: (err) => {
    const el = document.getElementById("problems");
    if (!err) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.hidden = false;
    el.textContent = err;
  },
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
    schedulePreview();
    updateChrome();
  });
});

document.getElementById("btnOpen")?.addEventListener("click", () => openDialog.showModal());
document.getElementById("btnWelcomeOpen")?.addEventListener("click", () => openDialog.showModal());
document.getElementById("openCancel")?.addEventListener("click", () => openDialog.close());

document.getElementById("openForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const root = document.getElementById("openRoot").value.trim();
  const entry = document.getElementById("openEntry").value.trim() || undefined;
  const errEl = document.getElementById("openError");
  try {
    errEl.hidden = true;
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
    } catch (err) {
      document.getElementById("problems").hidden = false;
      document.getElementById("problems").textContent =
        err instanceof Error ? err.message : String(err);
    }
  });
});

subscribe(() => {
  updateChrome();
  world.renderWorld();
});

async function init() {
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

  // Restore last project
  try {
    const raw = localStorage.getItem("pdl-studio-last-v1");
    if (raw) {
      const last = JSON.parse(raw);
      if (last?.root) await loadProject(last.root, last.entry);
    }
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} root
 * @param {string} [entry]
 */
async function loadProject(root, entry) {
  document.getElementById("statusLeft").textContent = "Opening…";
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

  const cat = await loadCatalogue(state.root, state.entry, dirtyOverlay());
  state.catalogue = cat;

  welcome.hidden = true;
  workspace.hidden = false;
  document.getElementById("btnSave").disabled = false;
  document.getElementById("btnExport").disabled = false;

  // Default selection
  pickDefaultSelection();
  fillThemes();
  fillHostChrome();
  nav.renderNavigator();
  syncEditorFromState();
  if (state.selectedSymbol && state.selectedSymbol !== "__tokens__") {
    focusSymbol(state.selectedSymbol);
  }
  world.renderWorld();
  updateChrome();
  await runPreview();

  localStorage.setItem(
    "pdl-studio-last-v1",
    JSON.stringify({ root: state.rootDisplay || state.root, entry: state.entry }),
  );
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

  // Prefer a known default from starters by looking at first non-page component,
  // or entry file's first component.
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
    if (!state.previewPinned) {
      // Keep previous preview root when browsing tokens, or clear
    }
    syncEditorFromState();
    nav.renderNavigator();
    updateChrome();
    return;
  }
  if (sel.kind === "samples" && sel.name) {
    // Jump to samples declaration in any file.
    for (const [path, src] of Object.entries(state.files)) {
      if (new RegExp(`\\bsamples\\s+${sel.name}\\b`).test(src)) {
        state.selectedSymbol = sel.name;
        state.editFile = path;
        syncEditorFromState();
        focusSymbol(sel.name);
        nav.renderNavigator();
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
      // Keep prior preview if still in file; else first.
      if (!syms.includes(state.previewRoot)) {
        state.previewRoot = syms[0];
      }
      state.selectedSymbol = state.previewRoot;
    } else if (/design\.pdl$/i.test(file)) {
      // Import-only entry: do not expand all imports — keep previous preview root.
    } else {
      // Token / companion file — keep preview pinned to prior root.
    }
  }

  nav.renderNavigator();
  world.renderWorld();
  updateChrome();
  schedulePreview(50);
}

async function saveAll() {
  flushEditorToFiles();
  if (!state.root || !state.dirty.size) return;
  const paths = [...state.dirty];
  for (const path of paths) {
    const content = state.files[path];
    const result = await writeFile(state.root, path, content, state.baselines[path]);
    if (result.conflict) {
      document.getElementById("problems").hidden = false;
      document.getElementById("problems").textContent =
        `Conflict saving ${path}: file changed on disk. Reload project to merge.`;
      return;
    }
    state.baselines[path] = content;
    clearDirty(path);
  }
  // Refresh catalogue after save
  try {
    state.catalogue = await loadCatalogue(state.root, state.entry, {});
    fillThemes();
    fillHostChrome();
    nav.renderNavigator();
    world.renderWorld();
  } catch {
    /* keep prior catalogue */
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

  const sym = state.selectedSymbol || state.previewRoot;
  document.getElementById("symbolLabel").textContent = sym
    ? sym === "__tokens__"
      ? "Tokens"
      : sym
    : "—";
  document.getElementById("fileLabel").textContent = state.editFile || "";

  const pin = state.previewPinned ? " · preview pinned" : "";
  const mode = state.mode;
  document.getElementById("statusRight").textContent = state.root
    ? `${mode}${pin} · ${state.dirty.size} dirty`
    : "";
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

void init();
