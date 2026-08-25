import { state } from "./state.js";

/**
 * Right-column inspector for non-component selection scopes (tokens, themes, type styles, samples, files).
 */

/** @returns {HTMLElement | null} */
function pane() {
  return document.getElementById("inspectPane");
}

/** @returns {HTMLElement | null} */
function frameWrap() {
  return document.querySelector(".preview-frame-wrap");
}

export function showComponentPreviewChrome() {
  const p = pane();
  const wrap = frameWrap();
  if (p) {
    p.hidden = true;
    p.innerHTML = "";
  }
  if (wrap) wrap.hidden = false;
}

/**
 * @param {string} title
 * @param {string} html
 * @param {string} [status]
 */
export function showInspector(title, html, status) {
  const p = pane();
  const wrap = frameWrap();
  if (wrap) wrap.hidden = true;
  if (!p) return;
  p.hidden = false;
  p.innerHTML = `<div class="inspect-head"><strong>${escapeHtml(title)}</strong></div><div class="inspect-body">${html}</div>`;
  return status;
}

/**
 * Render the inspector for the current selection scope.
 * @returns {{ handled: boolean, status?: string }}
 */
export function renderSelectionInspector() {
  const kind = state.selectedKind;
  if (!kind || kind === "component") {
    showComponentPreviewChrome();
    return { handled: false };
  }

  const cat = state.catalogue;
  if (!cat) {
    showInspector("—", `<p class="hint">No catalogue loaded.</p>`);
    return { handled: true, status: "No catalogue" };
  }

  if (kind === "tokens") {
    const html = tokensHtml(cat);
    const n =
      Object.keys(cat.tokenTables?.primitives ?? {}).length +
      Object.keys(cat.tokenTables?.semantics ?? {}).length;
    showInspector("Tokens", html, `${n} token(s)`);
    return { handled: true, status: `Tokens · ${n}` };
  }

  if (kind === "theme") {
    const name = state.selectedSymbol || state.theme;
    const html = themeHtml(cat, name);
    showInspector(name ? `Theme · ${name}` : "Theme", html);
    return { handled: true, status: name ? `Theme · ${name}` : "Theme" };
  }

  if (kind === "typeStyles") {
    const html = typeStylesHtml(cat);
    const n = Object.keys(cat.tokenTables?.typeStyles ?? {}).length;
    showInspector("Type styles", html);
    return { handled: true, status: `Type styles · ${n}` };
  }

  if (kind === "samples") {
    const name = state.selectedSymbol;
    const html = samplesHtml(cat, name);
    showInspector(name ? `Samples · ${name}` : "Samples", html);
    return { handled: true, status: name ? `Samples · ${name}` : "Samples" };
  }

  if (kind === "file") {
    const file = state.editFile;
    const html = fileScopeHtml(file, cat);
    showInspector(file || "File", html);
    return { handled: true, status: file ? `File · ${file}` : "File" };
  }

  showComponentPreviewChrome();
  return { handled: false };
}

/**
 * @param {object} cat
 */
function tokensHtml(cat) {
  const tables = cat.tokenTables ?? {};
  const primitives = tables.primitives ?? {};
  const semantics = tables.semantics ?? {};
  const parts = [];
  parts.push(tokenSection("Primitives", Object.values(primitives), primitives, semantics));
  parts.push(tokenSection("Semantics", Object.values(semantics), primitives, semantics));
  if (!Object.keys(primitives).length && !Object.keys(semantics).length) {
    return `<p class="hint">No tokens in this catalogue.</p>`;
  }
  return parts.join("");
}

/**
 * @param {object} cat
 * @param {string | null} name
 */
function themeHtml(cat, name) {
  if (!name) return `<p class="hint">Select a theme.</p>`;
  const def = cat.tokenTables?.themes?.[name];
  if (!def) return `<p class="hint">Theme <code>${escapeHtml(name)}</code> not found.</p>`;
  const overrides = def.overrides ?? {};
  const primitives = cat.tokenTables?.primitives ?? {};
  const semantics = cat.tokenTables?.semantics ?? {};
  const rows = Object.entries(overrides).map(([tokenName, definition]) => ({
    name: tokenName,
    tokenType: guessTokenType(tokenName, primitives, semantics),
    definition,
  }));
  if (!rows.length) {
    return `<p class="hint">No overrides on this theme.</p>`;
  }
  return tokenSection("Overrides", rows, primitives, semantics);
}

/**
 * @param {object} cat
 */
function typeStylesHtml(cat) {
  const styles = cat.tokenTables?.typeStyles ?? {};
  const entries = Object.values(styles);
  if (!entries.length) return `<p class="hint">No type styles.</p>`;
  return `<ul class="token-list type-style-list">${entries
    .map((s) => {
      const props = s.props ?? {};
      const family = propVal(props.fontFamily) ?? "system-ui";
      const size = propVal(props.fontSize) ?? 16;
      const weight = propVal(props.fontWeight) ?? 400;
      const lh = propVal(props.lineHeight);
      const style = [
        `font-family:${cssQuote(String(family))}`,
        `font-size:${Math.min(Number(size) || 16, 36)}px`,
        `font-weight:${Number(weight) || 400}`,
        lh != null ? `line-height:${lh}` : "",
      ]
        .filter(Boolean)
        .join(";");
      const meta = [
        family,
        `${size}px`,
        weight,
        lh != null ? `lh ${lh}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      return `<li><span class="type-sample" style="${escapeAttr(style)}" aria-hidden="true">Ag</span><code class="name">${escapeHtml(s.name)}</code><span class="type">${escapeHtml(meta)}</span></li>`;
    })
    .join("")}</ul>`;
}

/**
 * @param {object} cat
 * @param {string | null} name
 */
function samplesHtml(cat, name) {
  const bank = name ? cat.samples?.[name] : null;
  if (!name || !bank) return `<p class="hint">Select a samples bank.</p>`;
  const entries = Array.isArray(bank)
    ? bank.map((v, i) => ({ key: String(i), value: v }))
    : Object.entries(bank).map(([key, value]) => ({ key, value }));
  if (!entries.length) return `<p class="hint">Empty samples bank.</p>`;
  return `<ul class="token-list samples-list">${entries
    .map(
      (e) =>
        `<li><code class="name">${escapeHtml(e.key)}</code><code class="hex">${escapeHtml(formatValue(e.value))}</code></li>`,
    )
    .join("")}</ul>`;
}

/**
 * @param {string | null} file
 * @param {object} cat
 */
function fileScopeHtml(file, cat) {
  if (!file) return `<p class="hint">No file selected.</p>`;
  const src = state.files[file] ?? "";
  const hasTokens = /\b(primitive|semantic)\s+/.test(src);
  const hasTheme = /\btheme\s+\w+/.test(src);
  const hasType = /\btypeStyle\s+/.test(src);
  const comps = (cat.components ?? []).filter((n) => {
    const path = cat.componentFiles?.[n];
    if (path) {
      const norm = String(path).replace(/\\/g, "/");
      if (norm.endsWith(file) || file.endsWith(norm) || norm.includes(file)) return true;
    }
    return new RegExp(`\\b(component|page|screen)\\s+${escapeReg(n)}\\b`).test(src);
  });

  if (hasTokens && !comps.length) {
    return tokensHtml(cat);
  }
  if (hasTheme && !comps.length) {
    const m = src.match(/\btheme\s+(\w+)/);
    return themeHtml(cat, m?.[1] ?? state.theme);
  }
  if (hasType && !comps.length) {
    return typeStylesHtml(cat);
  }

  const bits = [];
  bits.push(`<p class="hint">${escapeHtml(file)}</p>`);
  if (comps.length) {
    bits.push(
      `<ul class="token-list">${comps
        .map((n) => `<li><code class="name">${escapeHtml(n)}</code><span class="type">${escapeHtml(cat.componentRoles?.[n] || "component")}</span></li>`)
        .join("")}</ul>`,
    );
  } else {
    bits.push(`<p class="hint">No previewable symbols in this file. Open System and pick Tokens or a component.</p>`);
  }
  return bits.join("");
}

/**
 * @param {string} title
 * @param {object[]} rows
 * @param {Record<string, object>} primitives
 * @param {Record<string, object>} semantics
 */
function tokenSection(title, rows, primitives, semantics) {
  if (!rows.length) return "";
  const sorted = [...rows].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return `<div class="token-section"><div class="token-section-title">${escapeHtml(title)}</div><ul class="token-list">${sorted
    .map((row) => tokenLi(row, primitives, semantics))
    .join("")}</ul></div>`;
}

/**
 * @param {object} row
 * @param {Record<string, object>} primitives
 * @param {Record<string, object>} semantics
 */
function tokenLi(row, primitives, semantics) {
  const resolved = resolveToken(row, primitives, semantics);
  const type = row.tokenType || resolved.tokenType || "";
  let preview = `<span class="swatch empty" aria-hidden="true"></span>`;
  let valueBit = "";

  if (type === "Color" && resolved.cssColor) {
    preview = `<span class="swatch" title="${escapeAttr(resolved.label || resolved.cssColor)}"><span class="fill" style="background:${escapeAttr(resolved.cssColor)}"></span></span>`;
    valueBit = `<code class="hex">${escapeHtml(resolved.label || resolved.cssColor)}</code>`;
  } else if (type === "Distance" && resolved.number != null) {
    const w = Math.max(2, Math.min(Math.round(Math.abs(resolved.number)), 96));
    preview = `<span class="ruler" title="${escapeAttr(String(resolved.number))}px" aria-hidden="true"><span class="tick"></span><span class="beam" style="width:${w}px"></span><span class="tick"></span></span>`;
    valueBit = `<code class="hex">${escapeHtml(String(resolved.number))}px</code>`;
  } else if (type === "Radius" && resolved.number != null) {
    const r = Math.max(0, resolved.number);
    const box = Math.max(14, Math.min(Math.round(r) || 14, 48));
    const rad = Math.min(r, box);
    preview = `<span class="radius-corner" title="${escapeAttr(String(r))}px" aria-hidden="true" style="width:${box}px;height:${box}px;border-top-left-radius:${rad}px"></span>`;
    valueBit = `<code class="hex">${escapeHtml(String(r))}px</code>`;
  } else if (type === "Opacity" && resolved.number != null) {
    valueBit = `<code class="hex">${escapeHtml(String(resolved.number))}</code>`;
  } else if (resolved.label) {
    valueBit = `<code class="hex">${escapeHtml(resolved.label)}</code>`;
  } else if (resolved.ref) {
    valueBit = `<code class="hex">${escapeHtml(resolved.ref)}</code>`;
  }

  const typeBit = type ? `<span class="type">${escapeHtml(type)}</span>` : "";
  return `<li>${preview}<code class="name">${escapeHtml(row.name)}</code>${typeBit}${valueBit}</li>`;
}

/**
 * @param {object} row
 * @param {Record<string, object>} primitives
 * @param {Record<string, object>} semantics
 * @param {number} [depth]
 */
function resolveToken(row, primitives, semantics, depth = 0) {
  if (depth > 8) return { label: "…" };
  const def = row?.definition;
  if (def == null) return {};

  if (typeof def === "object" && def.kind === "hex" && typeof def.value === "string") {
    return { cssColor: def.value, label: def.value, tokenType: "Color" };
  }
  if (typeof def === "object" && def.kind === "number" && typeof def.value === "number") {
    return { number: def.value, label: String(def.value) };
  }
  if (typeof def === "object" && def.kind === "string" && typeof def.value === "string") {
    return { label: def.value };
  }
  if (typeof def === "string") {
    if (def.startsWith("primitive:")) {
      const target = primitives[def.slice("primitive:".length)];
      if (target) {
        const nested = resolveToken(target, primitives, semantics, depth + 1);
        return { ...nested, ref: def };
      }
      return { ref: def, label: def };
    }
    if (def.startsWith("semantic:")) {
      const target = semantics[def.slice("semantic:".length)];
      if (target) {
        const nested = resolveToken(target, primitives, semantics, depth + 1);
        return { ...nested, ref: def };
      }
      return { ref: def, label: def };
    }
    if (/^#[0-9A-Fa-f]{3,8}$/.test(def)) {
      return { cssColor: def, label: def, tokenType: "Color" };
    }
    return { label: def };
  }
  return { label: formatValue(def) };
}

/**
 * @param {string} name
 * @param {Record<string, object>} primitives
 * @param {Record<string, object>} semantics
 */
function guessTokenType(name, primitives, semantics) {
  return primitives[name]?.tokenType || semantics[name]?.tokenType || "Color";
}

function propVal(p) {
  if (p == null) return null;
  if (typeof p === "object" && "value" in p) return p.value;
  return p;
}

function formatValue(v) {
  if (v == null) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function cssQuote(s) {
  return `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
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
