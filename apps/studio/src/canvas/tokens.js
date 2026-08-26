/**
 * Resolve Color token refs / hex / opacityOf for Canvas stage sketch CSS.
 */

import { state } from "../state.js";

/**
 * @param {unknown} value  Hex, token name, or `base @ opacity` string
 * @returns {{ css: string | null, unresolved: string | null }}
 */
export function resolveCssColor(value) {
  if (value == null || value === "") return { css: null, unresolved: null };
  if (typeof value !== "string") {
    if (value && typeof value === "object") {
      const css = cssFromDefinition(value, 0);
      return css ? { css, unresolved: null } : { css: null, unresolved: "«object»" };
    }
    return { css: null, unresolved: String(value) };
  }

  const s = value.trim();
  if (!s) return { css: null, unresolved: null };

  const opacityOf = /^(.*?)\s*@\s*(-?[\d.]+)\s*$/.exec(s);
  if (opacityOf) {
    const base = resolveCssColor(opacityOf[1].trim());
    if (!base.css) return base;
    const op = Number(opacityOf[2]);
    if (!Number.isFinite(op)) return { css: base.css, unresolved: null };
    return { css: applyOpacity(base.css, op), unresolved: null };
  }

  if (/^#[0-9A-Fa-f]{3,8}$/.test(s)) return { css: s, unresolved: null };

  if (/^[A-Za-z_][\w.]*$/.test(s)) {
    const css = cssFromTokenName(s, 0);
    return css ? { css, unresolved: null } : { css: null, unresolved: s };
  }

  // Already a CSS color keyword / rgb() from bake — pass through if looks safe.
  if (/^(rgb|hsl)a?\(/i.test(s) || /^[a-z]+$/i.test(s)) return { css: s, unresolved: null };

  return { css: null, unresolved: s };
}

/**
 * @param {string} name
 * @param {number} depth
 * @returns {string | null}
 */
function cssFromTokenName(name, depth) {
  if (depth > 10) return null;
  const override = themeOverride(name);
  if (override != null) {
    const css = cssFromDefinition(override, depth + 1);
    if (css) return css;
  }
  const row = lookupTokenRow(name);
  if (!row) return null;
  return cssFromDefinition(row.definition, depth + 1);
}

/**
 * @param {string} name
 */
function themeOverride(name) {
  const themeName = state.theme;
  if (!themeName) return null;
  const themes = state.catalogue?.tokenTables?.themes ?? {};
  const t = themes[themeName];
  if (!t?.overrides || typeof t.overrides !== "object") return null;
  return t.overrides[name] ?? null;
}

/**
 * @param {string} name
 */
function lookupTokenRow(name) {
  const tables = state.catalogue?.tokenTables ?? {};
  return tables.primitives?.[name] || tables.semantics?.[name] || null;
}

/**
 * @param {unknown} def
 * @param {number} depth
 * @returns {string | null}
 */
function cssFromDefinition(def, depth) {
  if (def == null || depth > 10) return null;

  if (typeof def === "string") {
    if (def.startsWith("primitive:")) return cssFromTokenName(def.slice("primitive:".length), depth + 1);
    if (def.startsWith("semantic:")) return cssFromTokenName(def.slice("semantic:".length), depth + 1);
    if (/^#[0-9A-Fa-f]{3,8}$/.test(def)) return def;
    if (/^[A-Za-z_][\w.]*$/.test(def)) return cssFromTokenName(def, depth + 1);
    return null;
  }

  if (typeof def !== "object") return null;
  const o = /** @type {Record<string, unknown>} */ (def);

  if (o.kind === "hex" && typeof o.value === "string") return o.value;
  if (o.kind === "string" && typeof o.value === "string" && /^#[0-9A-Fa-f]{3,8}$/.test(o.value)) {
    return o.value;
  }
  if (o.kind === "ident" && typeof o.name === "string") {
    return cssFromTokenName(o.name, depth + 1);
  }
  if (o.kind === "opacityOf") {
    const base = cssFromDefinition(o.base, depth + 1);
    if (!base) return null;
    const opRaw = o.opacity;
    let op = NaN;
    if (typeof opRaw === "number") op = opRaw;
    else if (opRaw && typeof opRaw === "object" && /** @type {any} */ (opRaw).kind === "number") {
      op = Number(/** @type {any} */ (opRaw).value);
    } else if (typeof opRaw === "string") op = Number(opRaw);
    if (!Number.isFinite(op)) return base;
    return applyOpacity(base, op);
  }
  return null;
}

/**
 * @param {string} hex
 * @param {number} opacity 0–1
 */
function applyOpacity(hex, opacity) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const a = Math.max(0, Math.min(1, opacity));
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
}

/**
 * @param {string} hex
 * @returns {{ r: number, g: number, b: number } | null}
 */
function hexToRgb(hex) {
  const h = hex.replace(/^#/, "");
  let full = h;
  if (h.length === 3) full = h.split("").map((c) => c + c).join("");
  if (h.length === 4) full = h.slice(0, 3).split("").map((c) => c + c).join(""); // ignore alpha nibble
  if (full.length === 8) full = full.slice(0, 6);
  if (full.length !== 6 || !/^[0-9A-Fa-f]+$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}
