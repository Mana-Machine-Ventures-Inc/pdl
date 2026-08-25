import { state } from "./state.js";
import { findSymbolInSource } from "./symbols.js";

/**
 * Companion / Notes dock — usage, rules, reveal companions file.
 * @param {object} opts
 * @param {(file: string, symbol?: string) => void} opts.onReveal
 */
export function mountCompanionDock(opts) {
  const el = document.getElementById("companionDock");

  function findCompanionFile(symbol) {
    if (!symbol) return null;
    for (const [path, src] of Object.entries(state.files)) {
      if (
        new RegExp(`\\b(fixtures|usage|rules|extend)\\s+${escapeReg(symbol)}\\b`).test(src)
      ) {
        return path;
      }
    }
    return Object.keys(state.files).find((p) => /companions\.pdl$/i.test(p)) || null;
  }

  function renderCompanion() {
    if (!el) return;
    if (
      state.selectedKind === "tokens" ||
      state.selectedKind === "theme" ||
      state.selectedKind === "typeStyles" ||
      state.selectedKind === "samples" ||
      state.selectedKind === "file"
    ) {
      const labels = {
        tokens: "Tokens",
        theme: "Theme",
        typeStyles: "Type styles",
        samples: "Samples",
        file: "File",
      };
      el.innerHTML = `<p class="hint">${labels[state.selectedKind] || "Selection"} scope — usage and rules appear for components.</p>`;
      return;
    }
    const name = state.previewRoot || state.selectedSymbol;
    const cat = state.catalogue;
    if (!name || name === "__tokens__" || name === "__typeStyles__" || !cat) {
      el.innerHTML = `<p class="hint">Select a component to see usage and rules.</p>`;
      return;
    }

    const usage = cat.usageByComponent?.[name];
    const rules = cat.rulesByComponent?.[name];
    const companionFile = findCompanionFile(name);
    const layoutFile =
      Object.keys(state.files).find((p) =>
        new RegExp(`\\b(component|page|screen)\\s+${escapeReg(name)}\\b`).test(state.files[p]),
      ) || null;

    const parts = [];
    parts.push(`<div class="notes-title">${escapeHtml(name)}</div>`);

    if (companionFile || layoutFile) {
      parts.push(`<div class="notes-actions">`);
      if (layoutFile) {
        parts.push(
          `<button type="button" class="btn ghost btn-tiny" data-reveal="${escapeAttr(layoutFile)}" data-sym="${escapeAttr(name)}">Open layout</button>`,
        );
      }
      if (companionFile) {
        parts.push(
          `<button type="button" class="btn ghost btn-tiny" data-reveal="${escapeAttr(companionFile)}" data-sym="${escapeAttr(name)}">Open companions</button>`,
        );
      }
      if (companionFile && state.files[companionFile]) {
        const loc = findSymbolInSource(state.files[companionFile], name);
        if (loc) {
          parts.push(
            `<span class="hint">${escapeHtml(companionFile)}${loc.line != null ? `:${loc.line + 1}` : ""}</span>`,
          );
        }
      }
      parts.push(`</div>`);
    }

    if (usage) {
      parts.push(`<div class="notes-section"><div class="notes-label">Usage</div><pre class="notes-body">${escapeHtml(usage)}</pre></div>`);
    } else {
      parts.push(`<div class="notes-section"><div class="notes-label">Usage</div><p class="hint">No usage note for this symbol.</p></div>`);
    }

    if (rules && (rules.rules?.length || rules.tagOps?.length)) {
      const ruleLines = (rules.rules ?? [])
        .map((r) => {
          const sev = r.severity || r.level || "should";
          const msg = r.message || r.text || JSON.stringify(r);
          return `<li class="rule rule-${escapeAttr(String(sev))}"><span class="sev">${escapeHtml(String(sev))}</span> ${escapeHtml(String(msg))}</li>`;
        })
        .join("");
      parts.push(
        `<div class="notes-section"><div class="notes-label">Rules</div><ul class="rule-list">${ruleLines || "<li class=\"hint\">Tags only</li>"}</ul></div>`,
      );
    } else {
      parts.push(`<div class="notes-section"><div class="notes-label">Rules</div><p class="hint">No rules companion.</p></div>`);
    }

    // Interaction legend for host protocols (from interactions list names).
    const ix = cat.interactionsByComponent?.[name];
    if (Array.isArray(ix) && ix.length) {
      const events = [];
      for (const block of ix) {
        for (const h of block.handlers ?? []) {
          if (h?.event) events.push(String(h.event));
        }
      }
      if (events.length) {
        parts.push(
          `<div class="notes-section"><div class="notes-label">Host events</div><p class="hint">${escapeHtml(events.join(" · "))} — runtime → this component (not parent emits)</p></div>`,
        );
      }
    }

    el.innerHTML = parts.join("");
    el.querySelectorAll("[data-reveal]").forEach((btn) => {
      btn.addEventListener("click", () => {
        opts.onReveal(btn.getAttribute("data-reveal"), btn.getAttribute("data-sym") || undefined);
      });
    });
  }

  return { renderCompanion, findCompanionFile };
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

function escapeReg(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
