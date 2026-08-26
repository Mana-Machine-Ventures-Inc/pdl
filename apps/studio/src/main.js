import { state, emit, isDirty, clearDirty, subscribe } from "./state.js";
import {
  fetchStarters,
  openProject,
  tryOpenProject,
  newProject,
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
  getCursorOffset,
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
  highlightPreviewComponent,
  syncPreviewModeChrome,
} from "./preview.js";
import { mountCanvas, syncCanvasToSelection, syncRightPaneChrome } from "./canvas/index.js";
import { symbolsInFile, declarationAtOffset } from "./symbols.js";

const RECENT_KEY = "pdl-studio-recent-v1";
const LAST_KEY = "pdl-studio-last-v1";

const welcome = document.getElementById("welcome");
const workspace = document.getElementById("workspace");
const openDialog = document.getElementById("openDialog");
const newDialog = document.getElementById("newDialog");

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
  onCursorScope: () => {
    syncSelectionFromCursor();
  },
});

mountPreview(document.getElementById("previewFrame"), {
  onStatus: (msg) => {
    document.getElementById("statusLeft").textContent = msg;
  },
  onError: (err) => {
    setProblemText(err, { file: state.editFile || undefined });
  },
  onOpenSource: (name) => {
    selectSymbol(name);
  },
  onWorldMutated: () => {
    world.renderWorld();
    updateChrome();
  },
});

mountCanvas({
  onStatus: (msg) => {
    document.getElementById("statusLeft").textContent = msg;
  },
  onError: (err, meta) => {
    if (err) setProblemText(err, { file: meta?.file || state.editFile || undefined });
    else clearProblems();
  },
  onApplied: () => {
    world.renderWorld();
    updateChrome();
    // Keep Preview in sync for when the user switches back; Canvas already rebaked.
    if (state.rightPaneMode !== "canvas") schedulePreview(80);
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
document.getElementById("btnNew")?.addEventListener("click", () => openNewDialog());
document.getElementById("btnWelcomeNew")?.addEventListener("click", () => openNewDialog());
document.getElementById("openCancel")?.addEventListener("click", () => openDialog.close());
document.getElementById("newCancel")?.addEventListener("click", () => newDialog.close());
document.getElementById("btnReload")?.addEventListener("click", () => void reloadProject());
document.getElementById("btnScaffoldHere")?.addEventListener("click", () => {
  const root = document.getElementById("openRoot").value.trim();
  openDialog.close();
  openNewDialog({ root });
});

document.getElementById("openForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const root = document.getElementById("openRoot").value.trim();
  const entry = document.getElementById("openEntry").value.trim() || undefined;
  const errEl = document.getElementById("openError");
  const emptyHint = document.getElementById("openEmptyHint");
  try {
    errEl.hidden = true;
    emptyHint.hidden = true;
    if (isDirty() && !confirm("Discard unsaved changes and open another project?")) return;
    const probed = await tryOpenProject(root, entry);
    if (probed.empty) {
      errEl.hidden = false;
      errEl.textContent = probed.error || "No .pdl files in project";
      emptyHint.hidden = false;
      return;
    }
    if (!probed.ok) throw new Error(probed.error || "Open failed");
    await loadProject(root, entry);
    openDialog.close();
  } catch (err) {
    errEl.hidden = false;
    errEl.textContent = err instanceof Error ? err.message : String(err);
    emptyHint.hidden = true;
  }
});

document.getElementById("newForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const root = document.getElementById("newRoot").value.trim();
  const title = document.getElementById("newTitle").value.trim();
  const prefix = document.getElementById("newPrefix").value.trim();
  const errEl = document.getElementById("newError");
  try {
    errEl.hidden = true;
    if (isDirty() && !confirm("Discard unsaved changes and create a new project?")) return;
    const created = await newProject({
      root,
      title: title || undefined,
      prefix: prefix || undefined,
    });
    newDialog.close();
    await applyOpenedProject(created, { preferComponent: created.defaultComponent || "Button" });
    setStatusRight(`Created ${created.created?.length || 0} starter files`);
  } catch (err) {
    errEl.hidden = false;
    errEl.textContent = err instanceof Error ? err.message : String(err);
  }
});

document.getElementById("newRoot")?.addEventListener("input", () => {
  const root = document.getElementById("newRoot").value.trim();
  const titleEl = document.getElementById("newTitle");
  const prefixEl = document.getElementById("newPrefix");
  if (!root || (titleEl.value && prefixEl.dataset.touched === "1")) return;
  const base = root.replace(/\\/g, "/").replace(/\/$/, "").split("/").pop() || "";
  if (!titleEl.value) {
    titleEl.value = base.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  if (!prefixEl.value || prefixEl.dataset.autFilled === "1") {
    const slug = base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .replace(/^[^a-z]+/, "")
      .slice(0, 8);
    prefixEl.value = slug || "ds";
    prefixEl.dataset.autFilled = "1";
  }
});

document.getElementById("newPrefix")?.addEventListener("input", () => {
  document.getElementById("newPrefix").dataset.touched = "1";
  document.getElementById("newPrefix").dataset.autFilled = "0";
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
    if (newDialog.open) newDialog.close();
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
  document.getElementById("openError").hidden = true;
  document.getElementById("openEmptyHint").hidden = true;
  if (state.rootDisplay) {
    document.getElementById("openRoot").value = state.rootDisplay;
  }
  openDialog.showModal();
  document.getElementById("openRoot")?.focus();
}

/**
 * @param {{ root?: string, title?: string }} [seed]
 */
function openNewDialog(seed = {}) {
  document.getElementById("newError").hidden = true;
  const rootEl = document.getElementById("newRoot");
  const titleEl = document.getElementById("newTitle");
  const prefixEl = document.getElementById("newPrefix");
  if (seed.root) rootEl.value = seed.root;
  else if (!rootEl.value && state.rootDisplay) {
    // Suggest sibling folder
    const base = String(state.rootDisplay).replace(/\\/g, "/").replace(/\/[^/]+\/?$/, "");
    rootEl.value = base ? `${base}/my-design-system` : "";
  }
  if (seed.title) titleEl.value = seed.title;
  prefixEl.dataset.touched = "0";
  prefixEl.dataset.autFilled = "0";
  // Trigger autofill from path
  rootEl.dispatchEvent(new Event("input"));
  newDialog.showModal();
  rootEl.focus();
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
 * @param {{ preferComponent?: string }} [opts]
 */
async function loadProject(root, entry, opts = {}) {
  document.getElementById("statusLeft").textContent = "Opening…";
  clearProblems();
  const opened = await openProject(root, entry);
  await applyOpenedProject(opened, opts);
}

/**
 * @param {object} opened
 * @param {{ preferComponent?: string }} [opts]
 */
async function applyOpenedProject(opened, opts = {}) {
  document.getElementById("statusLeft").textContent = "Opening…";
  clearProblems();
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

  pickDefaultSelection(opts.preferComponent);
  fillThemes();
  fillHostChrome();
  nav.renderNavigator();
  syncEditorFromState();
  if (
    state.selectedSymbol &&
    state.selectedSymbol !== "__tokens__" &&
    state.selectedSymbol !== "__typeStyles__" &&
    state.selectedKind === "component"
  ) {
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

/**
 * @param {string} [preferComponent]
 */
function pickDefaultSelection(preferComponent) {
  const cat = state.catalogue;
  if (!cat) return;

  if (preferComponent && cat.components?.includes(preferComponent)) {
    selectSymbol(preferComponent);
    return;
  }

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

  const preferred = [
    "Button",
    "PlaylistComposer",
    "AbnPointerLab",
    "AbnButton",
    "IosPhone",
    "UsageRulesLab",
  ];
  for (const name of preferred) {
    if (cat.components?.includes(name)) {
      selectSymbol(name);
      return;
    }
  }

  const first = (cat.components ?? []).find((n) => !cat.componentRoles?.[n]) || cat.components?.[0];
  if (first) selectSymbol(first);
  else if (
    (cat.designSummary?.primitives?.length || cat.designSummary?.semantics?.length) ||
    Object.keys(cat.tokenTables?.primitives ?? {}).length
  ) {
    selectTokens();
  } else {
    state.editFile = state.entry;
    state.previewRoot = null;
    state.selectedSymbol = null;
    state.selectedKind = "file";
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
    selectTokens(sel.file);
    return;
  }
  if (sel.kind === "typeStyles" || sel.name === "__typeStyles__") {
    selectTypeStyles(sel.file);
    return;
  }
  if (sel.kind === "samples" && sel.name) {
    selectSamples(sel.name);
    return;
  }
  if (sel.kind === "theme" && sel.name) {
    selectTheme(sel.name);
    return;
  }
  if (sel.kind === "symbol" && sel.name) {
    selectSymbol(sel.name, sel.file);
  }
}

/**
 * @param {string} [fileHint]
 */
function selectTokens(fileHint) {
  const file =
    fileHint ||
    Object.keys(state.files).find((p) => /foundation\.pdl$/i.test(p)) ||
    Object.keys(state.files).find((p) => /token/i.test(p)) ||
    state.entry;
  state.selectedKind = "tokens";
  state.selectedSymbol = "__tokens__";
  state.editFile = file;
  syncEditorFromState();
  nav.renderNavigator();
  companions.renderCompanion();
  updateChrome();
  syncCanvasToSelection();
  schedulePreview(0);
}

/**
 * @param {string} [fileHint]
 */
function selectTypeStyles(fileHint) {
  const file =
    fileHint ||
    Object.keys(state.files).find((p) => /foundation\.pdl$/i.test(p)) ||
    state.entry;
  state.selectedKind = "typeStyles";
  state.selectedSymbol = "__typeStyles__";
  state.editFile = file;
  syncEditorFromState();
  nav.renderNavigator();
  companions.renderCompanion();
  updateChrome();
  schedulePreview(0);
}

/**
 * @param {string} name
 */
function selectTheme(name) {
  state.selectedKind = "theme";
  state.selectedSymbol = name;
  state.theme = name;
  const themeFile =
    Object.keys(state.files).find((p) =>
      new RegExp(`\\btheme\\s+${name}\\b`).test(state.files[p]),
    ) ||
    Object.keys(state.files).find((p) => /theme/i.test(p)) ||
    state.editFile;
  if (themeFile) state.editFile = themeFile;
  fillThemes();
  syncEditorFromState();
  nav.renderNavigator();
  companions.renderCompanion();
  updateChrome();
  schedulePreview(0);
}

/**
 * @param {string} name
 */
function selectSamples(name) {
  for (const [path, src] of Object.entries(state.files)) {
    if (new RegExp(`\\bsamples\\s+${name}\\b`).test(src)) {
      state.selectedKind = "samples";
      state.selectedSymbol = name;
      state.editFile = path;
      syncEditorFromState();
      focusSymbol(name);
      nav.renderNavigator();
      companions.renderCompanion();
      updateChrome();
      schedulePreview(0);
      return;
    }
  }
  state.selectedKind = "samples";
  state.selectedSymbol = name;
  nav.renderNavigator();
  companions.renderCompanion();
  updateChrome();
  schedulePreview(0);
}

/**
 * @param {string} name
 * @param {string} [fileHint]
 * @param {{ focus?: boolean }} [opts]
 */
function selectSymbol(name, fileHint, opts = {}) {
  const focus = opts.focus !== false;
  state.selectedKind = "component";
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
  applyFileGalleryPreference(file);
  syncEditorFromState();
  if (focus) focusSymbol(name);
  nav.renderNavigator();
  world.renderWorld();
  companions.renderCompanion();
  updateChrome();
  syncCanvasToSelection();
  schedulePreview(50);
}

/**
 * Prefer file gallery whenever the open buffer declares multiple components.
 * @param {string | null} file
 */
function applyFileGalleryPreference(file) {
  if (!file) return;
  const syms = symbolsInFile(file, state.files, state.catalogue);
  if (syms.length > 1) {
    state.previewMode = "gallery";
  } else if (syms.length === 1) {
    state.previewMode = "primary";
  }
  syncPreviewModeChrome();
}

/**
 * Cursor section → selected symbol (nav hard-select); siblings soft-highlight.
 * Does not move the cursor.
 */
function syncSelectionFromCursor() {
  const file = state.editFile;
  if (!file) return;
  const offset = getCursorOffset();
  if (offset == null) return;
  const src = state.files[file] ?? "";
  const decl = declarationAtOffset(src, offset);
  if (!decl || !["component", "page", "screen"].includes(decl.kind)) return;

  const syms = symbolsInFile(file, state.files, state.catalogue);
  const changed =
    state.selectedKind !== "component" ||
    state.selectedSymbol !== decl.name ||
    state.editFile !== file;

  state.selectedKind = "component";
  state.selectedSymbol = decl.name;
  if (!state.previewPinned) state.previewRoot = decl.name;

  if (syms.length > 1 && state.previewMode !== "gallery") {
    state.previewMode = "gallery";
    syncPreviewModeChrome();
    schedulePreview(50);
  } else if (changed && state.previewMode === "primary") {
    schedulePreview(80);
  } else {
    highlightPreviewComponent(decl.name);
  }

  if (changed) {
    nav.renderNavigator();
    world.renderWorld();
    companions.renderCompanion();
    updateChrome();
    syncCanvasToSelection();
  } else {
    nav.renderNavigator();
  }
}

/**
 * @param {string} file
 */
function selectFile(file) {
  state.editFile = file;
  syncEditorFromState();

  const src = state.files[file] ?? "";
  const hasTokens = /\b(primitive|semantic)\s+/.test(src);
  const hasTheme = /\btheme\s+\w+/.test(src);
  const hasType = /\btypeStyle\s+/.test(src);
  const syms = symbolsInFile(file, state.files, state.catalogue);

  if (syms.length) {
    applyFileGalleryPreference(file);
    if (state.previewPinned && state.previewRoot && syms.includes(state.previewRoot)) {
      state.selectedKind = "component";
      state.selectedSymbol = state.previewRoot;
    } else {
      const offset = getCursorOffset();
      const decl = offset != null ? declarationAtOffset(src, offset) : null;
      const pick =
        decl && syms.includes(decl.name)
          ? decl.name
          : syms.length === 1
            ? syms[0]
            : syms.includes(state.previewRoot)
              ? state.previewRoot
              : syms[0];
      selectSymbol(pick, file, { focus: false });
      return;
    }
  } else if (hasTokens) {
    state.selectedKind = "tokens";
    state.selectedSymbol = "__tokens__";
  } else if (hasTheme) {
    const m = src.match(/\btheme\s+(\w+)/);
    state.selectedKind = "theme";
    state.selectedSymbol = m?.[1] ?? state.theme;
    if (m?.[1]) state.theme = m[1];
    fillThemes();
  } else if (hasType) {
    state.selectedKind = "typeStyles";
    state.selectedSymbol = "__typeStyles__";
  } else {
    state.selectedKind = "file";
    state.selectedSymbol = null;
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
  let label = "—";
  if (state.selectedKind === "tokens") label = "Tokens";
  else if (state.selectedKind === "typeStyles") label = "Type styles";
  else if (state.selectedKind === "theme") label = sym ? `Theme · ${sym}` : "Theme";
  else if (state.selectedKind === "samples") label = sym ? `Samples · ${sym}` : "Samples";
  else if (state.selectedKind === "file") label = state.editFile || "File";
  else if (sym) label = sym === "__tokens__" ? "Tokens" : sym;
  document.getElementById("symbolLabel").textContent = label;
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
  if (state.selectedKind && state.selectedKind !== "component") {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
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
