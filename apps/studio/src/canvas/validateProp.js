/**
 * Canvas inspector prop validation — driven by shared/frame-props.json.
 */

import frameProps from "@shared/frame-props.json";
import { resolveCssColor } from "./tokens.js";
import { state } from "../state.js";

/**
 * @typedef {{ ok: true, value: unknown } | { ok: false, message: string, expected: string }} PropValidation
 */

/**
 * @param {string} frameKind  layout | text | …
 * @param {string} prop
 * @param {string} rawText  Inspector input as typed
 * @returns {PropValidation}
 */
export function validateInspectorProp(frameKind, prop, rawText) {
  const raw = String(rawText ?? "");
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: true, value: undefined };
  }

  const typeId = propTypeId(frameKind, prop);
  if (!typeId) {
    // Unknown prop in lock — allow through (rewrite may still fail).
    return { ok: true, value: trimmed };
  }

  const vk = frameProps.valueKinds?.[typeId];
  if (!vk) return { ok: true, value: trimmed };

  const expected = expectedHint(typeId, vk);

  // Incomplete token path while typing (`mana.color.`) — don't red-flash yet.
  if (/^[A-Za-z_][\w.]*\.$/.test(trimmed)) {
    return { ok: true, value: undefined, incomplete: true };
  }

  // Reject quoted strings for enum / sizing / color — classic authoring mistake.
  if (
    (typeId.startsWith("enum") || typeId === "sizing" || typeId === "color" || typeId === "colorOrLayers") &&
    /^["'].*["']$/.test(trimmed)
  ) {
    return {
      ok: false,
      message: `Quoted string is not valid for ${prop}`,
      expected,
    };
  }

  if (typeId.startsWith("enum")) {
    return validateEnum(trimmed, vk, expected);
  }

  switch (typeId) {
    case "color":
    case "colorOrLayers":
      return validateColor(trimmed, expected, typeId === "colorOrLayers");
    case "distance":
    case "nonNegNumber":
    case "blurRadius":
      return validateNonNegNumberOrToken(trimmed, vk, expected);
    case "opacity":
      return validateOpacity(trimmed, vk, expected);
    case "number":
      return validateNumber(trimmed, vk, expected);
    case "size":
    case "weight":
    case "lineHeight":
    case "letterSpacing":
    case "ratio":
      return validateNumberOrToken(trimmed, vk, expected);
    case "cornerRadius":
      return validateCornerRadius(trimmed, vk, expected);
    case "edgeInsets":
      return validateEdgeInsets(trimmed, expected);
    case "sizing":
      return validateSizing(trimmed, expected);
    case "string":
      return { ok: true, value: unquote(trimmed) };
    case "styleRef":
      if (/^[A-Za-z_][\w.]*$/.test(trimmed)) return { ok: true, value: trimmed };
      return { ok: false, message: "Type style name looks wrong", expected };
    default:
      return { ok: true, value: trimmed };
  }
}

/**
 * @param {HTMLElement | null} el
 */
export function inspectorHasInvalid(el) {
  return Boolean(el?.querySelector(".canvas-field.is-invalid"));
}

/**
 * @param {string} frameKind
 * @param {string} prop
 */
export function propTypeId(frameKind, prop) {
  const kind = frameProps.kinds?.[frameKind];
  const t = kind?.props?.[prop]?.type;
  if (t) return t;
  const child = frameProps.childFlexProps?.[prop]?.type;
  if (child) return child;
  const special = frameProps.special?.[prop];
  if (special?.type) return special.type;
  return null;
}

/**
 * All inspector-editable props for a frame kind — driven by shared/frame-props.json.
 * @param {string} frameKind  layout | text | icon | media | presenter
 * @returns {string[]}
 */
export function inspectorPropsForKind(frameKind) {
  const kindDef = frameProps.kinds?.[frameKind];
  /** @type {string[]} */
  const out = kindDef?.props ? Object.keys(kindDef.props) : [];

  for (const name of Object.keys(frameProps.childFlexProps ?? {})) {
    if (!out.includes(name)) out.push(name);
  }

  for (const [name, def] of Object.entries(frameProps.special ?? {})) {
    if (def.structural) continue;
    if (Array.isArray(def.kinds) && !def.kinds.includes(frameKind)) continue;
    if (!out.includes(name)) out.push(name);
  }

  return out;
}

/**
 * @param {string} typeId
 * @param {object} vk
 */
function expectedHint(typeId, vk) {
  if (typeId.startsWith("enum") && Array.isArray(vk.cases) && vk.cases.length) {
    return vk.cases.map((c) => `.${c}`).join(" · ");
  }
  if (typeId === "sizing") {
    return ".hug · .fill · number · .fixed(n) · .flex(…) · .aspect(…)";
  }
  if (typeId === "color") {
    return "#RRGGBB · Color token · token @ 0–1";
  }
  if (typeId === "colorOrLayers") {
    return "#RRGGBB · Color token · token @ 0–1 (layers OK on Apply)";
  }
  if (typeId === "edgeInsets") {
    return "number · EdgeInsets(x:, y:) · EdgeInsets(top:, right:, bottom:, left:)";
  }
  if (typeId === "opacity") {
    return "0…1 · Opacity token";
  }
  if (typeId === "distance" || typeId === "nonNegNumber" || typeId === "blurRadius") {
    const tok = (vk.tokenTypes || []).join(" / ") || "number";
    return `≥ 0 number · ${tok} token`;
  }
  if (typeId === "cornerRadius") {
    return "≥ 0 number · Radius token · Corner(…)";
  }
  if (vk.range) {
    return `${vk.range[0]}…${vk.range[1]}`;
  }
  if (vk.tokenTypes?.length) {
    return `number · ${(vk.tokenTypes || []).join(" / ")} token`;
  }
  return typeId;
}

/**
 * @param {string} trimmed
 * @param {object} vk
 * @param {string} expected
 * @returns {PropValidation}
 */
function validateEnum(trimmed, vk, expected) {
  const cases = vk.cases || [];
  const caseName = enumCaseName(trimmed);
  if (caseName && cases.includes(caseName)) {
    return { ok: true, value: `.${caseName}` };
  }
  // Direction / Align tokens (rare)
  if (/^[A-Za-z_][\w.]*$/.test(trimmed) && !trimmed.includes('"')) {
    const row = lookupToken(trimmed);
    const want = vk.tokenTypes || [];
    if (row && want.includes(row.tokenType)) {
      return { ok: true, value: trimmed };
    }
  }
  return {
    ok: false,
    message: `Invalid ${vk.typeName || "enum"} value`,
    expected,
  };
}

/**
 * @param {string} trimmed
 */
function enumCaseName(trimmed) {
  let s = unquote(trimmed);
  if (s.startsWith(".")) s = s.slice(1);
  // Direction.row / Align.center
  if (/^[A-Z][A-Za-z0-9_]*\.[A-Za-z_][\w]*$/.test(s)) {
    return s.split(".").pop() || null;
  }
  if (/^[A-Za-z_][\w]*$/.test(s) && !s.includes(".")) return s;
  return null;
}

/**
 * @param {string} trimmed
 * @param {string} expected
 * @param {boolean} allowLayers
 * @returns {PropValidation}
 */
function validateColor(trimmed, expected, allowLayers) {
  if (trimmed.startsWith("[") && allowLayers) {
    // Layer lists: structural check only; bake validates deeply on Apply.
    return { ok: true, value: trimmed };
  }
  const { css, unresolved } = resolveCssColor(trimmed);
  if (css) return { ok: true, value: trimmed };
  if (unresolved && /^[A-Za-z_][\w.]*$/.test(unresolved)) {
    const row = lookupToken(unresolved);
    if (row && row.tokenType && row.tokenType !== "Color") {
      return {
        ok: false,
        message: `Token is ${row.tokenType}, not Color`,
        expected,
      };
    }
    return {
      ok: false,
      message: `Unknown Color token “${unresolved}”`,
      expected,
    };
  }
  return {
    ok: false,
    message: "Not a hex color or Color token",
    expected,
  };
}

/**
 * @param {string} trimmed
 * @param {object} vk
 * @param {string} expected
 * @returns {PropValidation}
 */
function validateNonNegNumberOrToken(trimmed, vk, expected) {
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const n = Number(trimmed);
    if (vk.nonNegativeNumber && n < 0) {
      return { ok: false, message: "Must be ≥ 0", expected };
    }
    return { ok: true, value: n };
  }
  return validateTokenOfTypes(trimmed, vk.tokenTypes || [], expected);
}

/**
 * @param {string} trimmed
 * @param {object} vk
 * @param {string} expected
 * @returns {PropValidation}
 */
function validateNumberOrToken(trimmed, vk, expected) {
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const n = Number(trimmed);
    if (vk.nonNegativeNumber && n < 0) {
      return { ok: false, message: "Must be ≥ 0", expected };
    }
    if (vk.positiveNumber && !(n > 0)) {
      return { ok: false, message: "Must be > 0", expected };
    }
    if (vk.range) {
      const [lo, hi] = vk.range;
      if (n < lo || n > hi) {
        return { ok: false, message: `Must be ${lo}…${hi}`, expected };
      }
    }
    return { ok: true, value: n };
  }
  return validateTokenOfTypes(trimmed, vk.tokenTypes || [], expected);
}

/**
 * @param {string} trimmed
 * @param {object} vk
 * @param {string} expected
 * @returns {PropValidation}
 */
function validateNumber(trimmed, vk, expected) {
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return { ok: true, value: Number(trimmed) };
  }
  return { ok: false, message: "Expected a number", expected };
}

/**
 * @param {string} trimmed
 * @param {object} vk
 * @param {string} expected
 * @returns {PropValidation}
 */
function validateOpacity(trimmed, vk, expected) {
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const n = Number(trimmed);
    if (n < 0 || n > 1) {
      return { ok: false, message: "Opacity must be 0…1", expected };
    }
    return { ok: true, value: n };
  }
  return validateTokenOfTypes(trimmed, ["Opacity"], expected);
}

/**
 * @param {string} trimmed
 * @param {object} vk
 * @param {string} expected
 * @returns {PropValidation}
 */
function validateCornerRadius(trimmed, vk, expected) {
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const n = Number(trimmed);
    if (n < 0) return { ok: false, message: "Must be ≥ 0", expected };
    return { ok: true, value: n };
  }
  if (/^Corner\(/i.test(trimmed)) return { ok: true, value: trimmed };
  return validateTokenOfTypes(trimmed, vk.tokenTypes || ["Radius", "CornerRadii"], expected);
}

/**
 * @param {string} trimmed
 * @param {string} expected
 * @returns {PropValidation}
 */
function validateEdgeInsets(trimmed, expected) {
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const n = Number(trimmed);
    if (n < 0) return { ok: false, message: "Must be ≥ 0", expected };
    return { ok: true, value: n };
  }
  if (/^EdgeInsets\(/i.test(trimmed)) {
    if (!/^EdgeInsets\([^)]*\)$/i.test(trimmed) && !/^EdgeInsets\(.+\)$/i.test(trimmed)) {
      return { ok: false, message: "Malformed EdgeInsets(…)", expected };
    }
    return { ok: true, value: trimmed };
  }
  if (/^[A-Za-z_][\w.]*$/.test(trimmed)) {
    return validateTokenOfTypes(trimmed, ["EdgeInsets"], expected);
  }
  return { ok: false, message: "Invalid padding / insets", expected };
}

/**
 * @param {string} trimmed
 * @param {string} expected
 * @returns {PropValidation}
 */
function validateSizing(trimmed, expected) {
  const s = unquote(trimmed);
  const bare = s.startsWith(".") ? s.slice(1) : s;
  if (bare === "hug" || bare === "fill") return { ok: true, value: `.${bare}` };
  if (/^Sizing\.(hug|fill)$/.test(s)) {
    return { ok: true, value: `.${s.split(".").pop()}` };
  }
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (n < 0) return { ok: false, message: "Must be ≥ 0", expected };
    return { ok: true, value: n };
  }
  if (
    /^\.(fixed|flex|aspect)\(/i.test(s) ||
    /^Sizing\.(fixed|flex|aspect)\(/i.test(s)
  ) {
    return { ok: true, value: s.startsWith("Sizing.") ? s.replace(/^Sizing/, "") : s };
  }
  if (/^[A-Za-z_][\w.]*$/.test(s)) {
    return validateTokenOfTypes(s, ["Sizing"], expected);
  }
  return { ok: false, message: "Invalid sizing", expected };
}

/**
 * @param {string} name
 * @param {string[]} types
 * @param {string} expected
 * @returns {PropValidation}
 */
function validateTokenOfTypes(name, types, expected) {
  if (!/^[A-Za-z_][\w.]*$/.test(name)) {
    return { ok: false, message: "Invalid value", expected };
  }
  const row = lookupToken(name);
  if (!row) {
    return {
      ok: false,
      message: `Unknown token “${name}”`,
      expected,
    };
  }
  if (types.length && row.tokenType && !types.includes(row.tokenType)) {
    return {
      ok: false,
      message: `Token is ${row.tokenType}; expected ${types.join(" / ")}`,
      expected,
    };
  }
  return { ok: true, value: name };
}

/**
 * @param {string} name
 */
function lookupToken(name) {
  const tables = state.catalogue?.tokenTables ?? {};
  return tables.primitives?.[name] || tables.semantics?.[name] || null;
}

/**
 * @param {string} s
 */
function unquote(s) {
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1);
  }
  return s;
}
