import { state, emit } from "./state.js";

/**
 * @param {object} opts
 * @param {(sel: { kind: string, name?: string, file?: string }) => void} opts.onSelect
 */
export function mountNavigator(opts) {
  const systemEl = document.getElementById("navSystem");
  const filesEl = document.getElementById("navFiles");
  const search = document.getElementById("navSearch");

  document.querySelectorAll(".nav-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-nav");
      state.navTab = tab === "files" ? "files" : "system";
      document.querySelectorAll(".nav-tab").forEach((b) => {
        b.classList.toggle("is-active", b === btn);
      });
      systemEl.hidden = state.navTab !== "system";
      filesEl.hidden = state.navTab !== "files";
      emit();
    });
  });

  search?.addEventListener("input", () => {
    state.navQuery = search.value.trim().toLowerCase();
    renderNavigator();
  });

  function section(title, items) {
    if (!items.length) return "";
    return `<div class="nav-section"><div class="nav-section-title">${escapeHtml(title)}</div>${items.join("")}</div>`;
  }

  function itemButton({ id, label, role, selected, kind, file }) {
    const roleBit = role ? `<span class="role">${escapeHtml(role)}</span>` : "";
    return `<button type="button" class="nav-item${selected ? " is-selected" : ""}" data-kind="${kind}" data-name="${escapeAttr(id)}" data-file="${escapeAttr(file || "")}">${escapeHtml(label)}${roleBit}</button>`;
  }

  function renderSystem() {
    const cat = state.catalogue;
    const q = state.navQuery;
    if (!cat) {
      systemEl.innerHTML = `<p class="hint">Open a project to load the system catalogue.</p>`;
      return;
    }

    const foundations = [];
    const summary = cat.designSummary ?? {};
    if ((summary.primitives?.length || summary.semantics?.length) && (!q || "tokens".includes(q) || "foundation".includes(q))) {
      foundations.push(
        itemButton({
          id: "__tokens__",
          label: "Tokens",
          kind: "foundation",
          file: guessFoundationFile(),
          selected: state.selectedSymbol === "__tokens__",
        }),
      );
    }
    for (const t of cat.themes ?? []) {
      if (q && !t.toLowerCase().includes(q)) continue;
      foundations.push(
        itemButton({
          id: t,
          label: t,
          role: "theme",
          kind: "theme",
          selected: state.selectedSymbol === t,
        }),
      );
    }

    const components = [];
    const pages = [];
    const screens = [];
    for (const name of cat.components ?? []) {
      if (q && !name.toLowerCase().includes(q)) continue;
      const role = cat.componentRoles?.[name];
      const file = resolveComponentFile(name);
      const btn = itemButton({
        id: name,
        label: name,
        role,
        kind: "symbol",
        file,
        selected: state.selectedSymbol === name || state.previewRoot === name,
      });
      if (role === "screen") screens.push(btn);
      else if (role === "page") pages.push(btn);
      else components.push(btn);
    }

    const samples = [];
    for (const bank of Object.keys(cat.samples ?? {})) {
      if (q && !bank.toLowerCase().includes(q)) continue;
      samples.push(
        itemButton({
          id: bank,
          label: bank,
          role: "samples",
          kind: "samples",
          selected: state.selectedSymbol === bank,
        }),
      );
    }

    // Prototype mode promotes screens/pages.
    if (state.mode === "prototype") {
      systemEl.innerHTML =
        section("Screens", screens) +
        section("Pages", pages) +
        section("Components", components) +
        section("Samples", samples) +
        section("Foundations", foundations);
    } else {
      systemEl.innerHTML =
        section("Foundations", foundations) +
        section("Components", components) +
        section("Pages", pages) +
        section("Screens", screens) +
        section("Samples", samples);
    }

    systemEl.querySelectorAll(".nav-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        opts.onSelect({
          kind: btn.getAttribute("data-kind"),
          name: btn.getAttribute("data-name"),
          file: btn.getAttribute("data-file") || undefined,
        });
      });
    });
  }

  function renderFiles() {
    const q = state.navQuery;
    const paths = Object.keys(state.files).sort();
    const items = paths
      .filter((p) => !q || p.toLowerCase().includes(q))
      .map((p) =>
        itemButton({
          id: p,
          label: p,
          kind: "file",
          file: p,
          selected: state.editFile === p,
        }),
      );
    filesEl.innerHTML = items.length
      ? `<div class="nav-section">${items.map((h) => h.replace("nav-item", "nav-item nav-file")).join("")}</div>`
      : `<p class="hint">No files</p>`;
    // re-fix classes - actually the replace is fragile. Simpler:
    filesEl.innerHTML = items.length
      ? `<div class="nav-section">${paths
          .filter((p) => !q || p.toLowerCase().includes(q))
          .map((p) => {
            const sel = state.editFile === p ? " is-selected" : "";
            return `<button type="button" class="nav-item nav-file${sel}" data-kind="file" data-name="${escapeAttr(p)}" data-file="${escapeAttr(p)}">${escapeHtml(p)}</button>`;
          })
          .join("")}</div>`
      : `<p class="hint">No files</p>`;

    filesEl.querySelectorAll(".nav-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        opts.onSelect({
          kind: "file",
          name: btn.getAttribute("data-name"),
          file: btn.getAttribute("data-file"),
        });
      });
    });
  }

  function guessFoundationFile() {
    return (
      Object.keys(state.files).find((p) => /foundation\.pdl$/i.test(p)) ||
      Object.keys(state.files).find((p) => /token/i.test(p)) ||
      null
    );
  }

  function resolveComponentFile(name) {
    const mapped = state.catalogue?.componentFiles?.[name];
    if (mapped) {
      const norm = String(mapped).replace(/\\/g, "/");
      const hit = Object.keys(state.files).find(
        (p) => norm.endsWith(p) || p.endsWith(norm) || norm.includes(p),
      );
      if (hit) return hit;
    }
    // Scrape files for declaration.
    for (const [path, src] of Object.entries(state.files)) {
      if (new RegExp(`\\b(component|page|screen)\\s+${name}\\b`).test(src)) return path;
    }
    return null;
  }

  function renderNavigator() {
    renderSystem();
    renderFiles();
  }

  return { renderNavigator, resolveComponentFile, guessFoundationFile };
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
