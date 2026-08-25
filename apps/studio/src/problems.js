/**
 * Structured problems list with optional go-to.
 */

/**
 * @typedef {{ message: string, file?: string, line?: number, raw?: string }} Problem
 */

/** @type {Problem[]} */
let problems = [];
/** @type {((p: Problem) => void) | null} */
let onGoto = null;

export function mountProblems(handlers = {}) {
  onGoto = handlers.onGoto ?? null;
  document.getElementById("btnClearProblems")?.addEventListener("click", () => {
    clearProblems();
  });
}

/**
 * @param {string | null | undefined} text
 * @param {{ file?: string }} [ctx]
 */
export function setProblemText(text, ctx = {}) {
  if (!text) {
    clearProblems();
    return;
  }
  problems = parseProblems(text, ctx.file);
  render();
}

/**
 * @param {Problem[]} list
 */
export function setProblems(list) {
  problems = list ?? [];
  render();
}

export function clearProblems() {
  problems = [];
  render();
}

/**
 * @param {string} text
 * @param {string} [fallbackFile]
 * @returns {Problem[]}
 */
export function parseProblems(text, fallbackFile) {
  const lines = String(text).split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [{ message: String(text), file: fallbackFile }];

  return lines.map((line) => {
    // path:line:col: message  OR  path:line: message  OR  PDL-Exxx at path:line
    let m =
      /^(.+?\.pdl):(\d+)(?::\d+)?:\s*(.*)$/.exec(line) ||
      /(?:at\s+|in\s+)(.+?\.pdl):(\d+)/i.exec(line);
    if (m) {
      return {
        message: m[3] || line,
        file: m[1].replace(/^.*\//, "").includes("/") ? m[1] : m[1],
        line: Number(m[2]),
        raw: line,
      };
    }
    m = /PDL-E\d+[^:]*:\s*(.*)/.exec(line);
    return {
      message: line,
      file: fallbackFile,
      raw: line,
    };
  });
}

function render() {
  const el = document.getElementById("problems");
  const clearBtn = document.getElementById("btnClearProblems");
  if (!el) return;
  if (!problems.length) {
    el.hidden = true;
    el.innerHTML = "";
    if (clearBtn) clearBtn.hidden = true;
    return;
  }
  el.hidden = false;
  if (clearBtn) clearBtn.hidden = false;
  el.innerHTML = problems
    .map((p, i) => {
      const loc =
        p.file && p.line
          ? `<button type="button" class="prob-loc" data-i="${i}">${escapeHtml(shortPath(p.file))}:${p.line}</button>`
          : p.file
            ? `<span class="prob-loc">${escapeHtml(shortPath(p.file))}</span>`
            : "";
      return `<div class="prob-row">${loc}<span class="prob-msg">${escapeHtml(p.message || p.raw || "")}</span></div>`;
    })
    .join("");

  el.querySelectorAll(".prob-loc[data-i]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.getAttribute("data-i"));
      const p = problems[i];
      if (p) onGoto?.(p);
    });
  });
}

function shortPath(p) {
  const s = String(p).replace(/\\/g, "/");
  const parts = s.split("/");
  return parts.slice(-2).join("/");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
