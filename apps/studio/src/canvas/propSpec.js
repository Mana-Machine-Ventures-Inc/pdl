/**
 * Prop editor descriptors from shared/frame-props.json + language-objects.json.
 */

import frameProps from "@shared/frame-props.json";
import languageObjects from "@shared/language-objects.json";
import { propTypeId } from "./validateProp.js";
import { formatValue } from "./rewrite.js";

/**
 * @typedef {{ name: string, labeled: boolean }} FormArg
 * @typedef {{
 *   id: string,
 *   label: string,
 *   meaning?: string,
 *   kind: 'dotCase' | 'dotCall' | 'number' | 'token' | 'constructor',
 *   args: FormArg[],
 *   form: string,
 *   ctor?: string,
 * }} AcceptMode
 * @typedef {{
 *   editor: 'enum' | 'accept' | 'text',
 *   prop: string,
 *   typeId: string | null,
 *   options?: { value: string, label: string, meaning?: string }[],
 *   modes?: AcceptMode[],
 *   allowEmpty?: boolean,
 * }} PropEditorSpec
 */

/** @type {Map<string, object>} */
const enumsByName = new Map((languageObjects.enums ?? []).map((e) => [e.name, e]));
/** @type {Map<string, object>} */
const typesByName = new Map(
  [...(languageObjects.types ?? []), ...(languageObjects.tokenTypes ?? [])].map((t) => [
    t.name,
    t,
  ]),
);

/**
 * @param {string} frameKind
 * @param {string} prop
 * @returns {PropEditorSpec}
 */
export function editorSpecForProp(frameKind, prop) {
  const typeId = propTypeId(frameKind, prop);
  if (!typeId) return { editor: "text", prop, typeId: null };

  const vk = frameProps.valueKinds?.[typeId];
  if (!vk) return { editor: "text", prop, typeId };

  // Closed enums from frame-props (Direction, Align, …).
  if (vk.typeName && Array.isArray(vk.cases) && vk.cases.length) {
    const meanings = caseMeanings(vk.typeName);
    return {
      editor: "enum",
      prop,
      typeId,
      allowEmpty: true,
      options: vk.cases.map((c) => ({
        value: `.${c}`,
        label: `.${c}`,
        meaning: meanings.get(c),
      })),
    };
  }

  // Types with accept-forms (Sizing, EdgeInsets, …) that include dotted modes.
  const typeName = vk.tokenTypes?.[0] || (typeId === "sizing" ? "Sizing" : null);
  const langType = typeName ? typesByName.get(typeName) : null;
  const modes = langType ? parseAcceptModes(langType.accept ?? []) : [];
  if (modes.some((m) => m.kind === "dotCase" || m.kind === "dotCall" || m.kind === "constructor")) {
    return {
      editor: "accept",
      prop,
      typeId,
      allowEmpty: true,
      modes,
    };
  }

  return { editor: "text", prop, typeId };
}

/**
 * @param {string} typeName
 * @returns {Map<string, string>}
 */
function caseMeanings(typeName) {
  const e = enumsByName.get(typeName);
  const map = new Map();
  for (const c of e?.cases ?? []) {
    if (c?.case) map.set(c.case, c.meaning || "");
  }
  return map;
}

/**
 * Parse language-objects `accept[].form` into editor modes.
 * Skips anti-pattern / illustrative token-path forms that aren't selectable modes.
 * @param {Array<{ form?: string, meaning?: string }>} accept
 * @returns {AcceptMode[]}
 */
export function parseAcceptModes(accept) {
  /** @type {AcceptMode[]} */
  const modes = [];
  /** @type {Set<string>} */
  const seen = new Set();

  for (const item of accept || []) {
    const form = String(item?.form ?? "").trim();
    if (!form) continue;
    // Anti-patterns and quoted-string examples — not editor modes.
    if (form.startsWith('"') || form.startsWith("'")) continue;

    const parsed = parseOneForm(form, item.meaning);
    if (!parsed) continue;
    if (seen.has(parsed.id)) continue;
    seen.add(parsed.id);
    modes.push(parsed);
  }
  return modes;
}

/**
 * @param {string} form
 * @param {string} [meaning]
 * @returns {AcceptMode | null}
 */
export function parseOneForm(form, meaning) {
  // `.hug` / `.fill`
  let m = /^\.([A-Za-z_][\w]*)$/.exec(form);
  if (m) {
    return {
      id: m[1],
      label: form,
      meaning,
      kind: "dotCase",
      args: [],
      form,
    };
  }

  // `.fixed(n)` / `.flex(min:, preferred:, max:)` / `.aspect(r)`
  m = /^\.([A-Za-z_][\w]*)\((.*)\)$/.exec(form);
  if (m) {
    return {
      id: m[1],
      label: form,
      meaning,
      kind: "dotCall",
      args: parseArgList(m[2]),
      form,
    };
  }

  // `Corner(tl:, tr:, br:, bl:)` / `EdgeInsets(x:, y:)` / `Timing(…)`
  m = /^([A-Z][A-Za-z0-9_]*)\((.*)\)$/.exec(form);
  if (m) {
    const args = parseArgList(m[2]);
    const id =
      args.length > 0
        ? `${m[1]}(${args.map((a) => (a.labeled ? `${a.name}:` : a.name)).join(", ")})`
        : m[1];
    return {
      id,
      label: form,
      meaning,
      kind: "constructor",
      ctor: m[1],
      args,
      form,
    };
  }

  // Bare number sugar (`240`) → number mode once.
  if (/^-?\d+(\.\d+)?$/.test(form)) {
    return {
      id: "number",
      label: "number",
      meaning,
      kind: "number",
      args: [{ name: "value", labeled: false }],
      form,
    };
  }

  // Token path example (`sizing.sidebar`, `color.token`) — one custom/token mode.
  if (/^[a-z][\w.]*$/i.test(form) && form.includes(".")) {
    return {
      id: "token",
      label: "token",
      meaning: meaning || "A token reference",
      kind: "token",
      args: [{ name: "name", labeled: false }],
      form,
    };
  }

  return null;
}

/**
 * @param {string} inner
 * @returns {FormArg[]}
 */
export function parseArgList(inner) {
  const s = String(inner || "").trim();
  if (!s || s === "…" || s === "...") return [];
  /** @type {FormArg[]} */
  const args = [];
  for (const part of s.split(",")) {
    const p = part.trim();
    if (!p || p === "…" || p === "...") continue;
    // `min:` / `preferred:` / `duration: …`
    const labeled = /^([A-Za-z_][\w]*)\s*:\s*(.*)$/.exec(p);
    if (labeled) {
      args.push({ name: labeled[1], labeled: true });
      continue;
    }
    // positional placeholder `n` / `r`
    const pos = /^([A-Za-z_][\w]*)$/.exec(p);
    if (pos) {
      args.push({ name: pos[1], labeled: false });
      continue;
    }
  }
  return args;
}

/**
 * Interpret a current inspector/bake value into mode + arg map for an accept editor.
 * @param {AcceptMode[]} modes
 * @param {unknown} raw
 * @returns {{ modeId: string, args: Record<string, string> }}
 */
export function decodeAcceptValue(modes, raw) {
  const empty = { modeId: "", args: /** @type {Record<string, string>} */ ({}) };
  if (raw === undefined || raw === null || raw === "") return empty;

  // Bake object: sizing modes, EdgeInsets/Corner structs, etc.
  if (raw && typeof raw === "object") {
    const o = /** @type {Record<string, unknown>} */ (raw);
    if (typeof o.mode === "string" && modes.some((m) => m.id === o.mode)) {
      /** @type {Record<string, string>} */
      const args = {};
      if (o.mode === "fixed" && o.fixed != null) args.n = String(o.fixed);
      if (o.flexArgs && typeof o.flexArgs === "object") {
        for (const [k, v] of Object.entries(/** @type {Record<string, unknown>} */ (o.flexArgs))) {
          if (v != null) args[k] = stringifyArg(v);
        }
      }
      if (o.aspect != null) args.r = stringifyArg(o.aspect);
      return { modeId: o.mode, args };
    }
    if (o.fixed != null && modes.some((m) => m.id === "fixed")) {
      return { modeId: "fixed", args: { n: String(o.fixed) } };
    }
    if (o.flexArgs && modes.some((m) => m.id === "flex")) {
      /** @type {Record<string, string>} */
      const args = {};
      for (const [k, v] of Object.entries(/** @type {Record<string, unknown>} */ (o.flexArgs))) {
        if (v != null) args[k] = stringifyArg(v);
      }
      return { modeId: "flex", args };
    }

    const insets = decodeBakedInsets(modes, o);
    if (insets) return insets;

    const corner = decodeBakedCorner(modes, o);
    if (corner) return corner;

    // Unknown structured value — round-trip through PDL text if possible.
    try {
      const formatted = formatValue(raw);
      if (typeof formatted === "string" && formatted && !formatted.startsWith("{")) {
        return decodeAcceptValue(modes, formatted);
      }
    } catch {
      /* ignore */
    }
    return empty;
  }

  if (typeof raw === "number" && Number.isFinite(raw)) {
    if (modes.some((m) => m.id === "number")) return { modeId: "number", args: { value: String(raw) } };
    if (modes.some((m) => m.id === "fixed")) return { modeId: "fixed", args: { n: String(raw) } };
    return empty;
  }

  const s = String(raw).trim();
  if (!s) return empty;

  // `.hug` / `hug`
  const bare = s.replace(/^\./, "");
  if (/^[A-Za-z_][\w]*$/.test(bare) && modes.some((m) => m.id === bare && m.kind === "dotCase")) {
    return { modeId: bare, args: {} };
  }

  // `.flex(min: 8, max: 120)` / `Sizing.fixed(240)`
  const call = /^\.?(?:Sizing\.)?([A-Za-z_][\w]*)\((.*)\)\s*$/s.exec(s);
  if (call && modes.some((m) => m.id === call[1])) {
    return { modeId: call[1], args: parseCallArgs(call[2], modes.find((m) => m.id === call[1])) };
  }

  // Constructor `EdgeInsets(x: 12, y: 8)`
  const ctor = /^([A-Z][A-Za-z0-9_]*)\((.*)\)\s*$/s.exec(s);
  if (ctor) {
    const mode = modes.find(
      (m) =>
        m.kind === "constructor" &&
        (m.ctor === ctor[1] || m.id === ctor[1] || m.id.startsWith(`${ctor[1]}(`)),
    );
    // Prefer mode whose arg names best match labeled keys in the value.
    const labeled = [...s.matchAll(/([A-Za-z_][\w]*)\s*:/g)].map((x) => x[1]);
    const best =
      modes
        .filter((m) => m.kind === "constructor" && (m.ctor === ctor[1] || m.id.startsWith(`${ctor[1]}(`)))
        .sort((a, b) => {
          const score = (m) => m.args.filter((arg) => labeled.includes(arg.name)).length;
          return score(b) - score(a);
        })[0] || mode;
    if (best) {
      return { modeId: best.id, args: parseCallArgs(ctor[2], best) };
    }
  }

  if (/^-?\d+(\.\d+)?$/.test(s)) {
    if (modes.some((m) => m.id === "number")) return { modeId: "number", args: { value: s } };
    if (modes.some((m) => m.id === "fixed")) return { modeId: "fixed", args: { n: s } };
  }

  if (modes.some((m) => m.id === "token") && /^[A-Za-z_][\w.]*$/.test(s)) {
    return { modeId: "token", args: { name: s } };
  }

  return empty;
}

/**
 * Decode baked EdgeInsets props (flat TRBL/XY or `{ kind: "edgeInsets", fields }`).
 * @param {AcceptMode[]} modes
 * @param {Record<string, unknown>} o
 */
function decodeBakedInsets(modes, o) {
  /** @type {Record<string, unknown>} */
  let fields = o;
  if (o.kind === "edgeInsets" && o.fields && typeof o.fields === "object") {
    fields = /** @type {Record<string, unknown>} */ (o.fields);
  }

  const hasXy = "x" in fields || "y" in fields;
  const hasTrbl =
    "top" in fields || "right" in fields || "bottom" in fields || "left" in fields;
  if (!hasXy && !hasTrbl) return null;

  if (hasTrbl) {
    const top = scalarNum(fields.top);
    const right = scalarNum(fields.right);
    const bottom = scalarNum(fields.bottom);
    const left = scalarNum(fields.left);
    if (top != null && right != null && bottom != null && left != null) {
      if (top === right && right === bottom && bottom === left) {
        if (modes.some((m) => m.id === "number")) {
          return { modeId: "number", args: { value: String(top) } };
        }
      }
      if (top === bottom && left === right) {
        const xyMode = findConstructorMode(modes, "EdgeInsets", ["x", "y"]);
        if (xyMode) {
          return {
            modeId: xyMode.id,
            args: { x: String(left), y: String(top) },
          };
        }
      }
    }
    const trblMode = findConstructorMode(modes, "EdgeInsets", [
      "top",
      "right",
      "bottom",
      "left",
    ]);
    if (trblMode) {
      /** @type {Record<string, string>} */
      const args = {};
      for (const k of ["top", "right", "bottom", "left"]) {
        if (fields[k] != null) args[k] = stringifyArg(fields[k]);
      }
      return { modeId: trblMode.id, args };
    }
  }

  if (hasXy) {
    const xyMode = findConstructorMode(modes, "EdgeInsets", ["x", "y"]);
    if (xyMode) {
      /** @type {Record<string, string>} */
      const args = {};
      if (fields.x != null) args.x = stringifyArg(fields.x);
      if (fields.y != null) args.y = stringifyArg(fields.y);
      return { modeId: xyMode.id, args };
    }
  }

  return null;
}

/**
 * @param {AcceptMode[]} modes
 * @param {Record<string, unknown>} o
 */
function decodeBakedCorner(modes, o) {
  if (o.kind !== "corner" && !("tl" in o || "tr" in o || "br" in o || "bl" in o)) {
    return null;
  }
  const cornerMode = findConstructorMode(modes, "Corner", ["tl", "tr", "br", "bl"]);
  if (!cornerMode) return null;
  /** @type {Record<string, string>} */
  const args = {};
  for (const k of ["tl", "tr", "br", "bl"]) {
    if (o[k] != null) args[k] = stringifyArg(o[k]);
  }
  return { modeId: cornerMode.id, args };
}

/**
 * @param {AcceptMode[]} modes
 * @param {string} ctor
 * @param {string[]} argNames
 */
function findConstructorMode(modes, ctor, argNames) {
  return modes.find(
    (m) =>
      m.kind === "constructor" &&
      m.ctor === ctor &&
      argNames.every((n) => m.args.some((a) => a.name === n)),
  );
}

/**
 * @param {unknown} v
 * @returns {number | null}
 */
function scalarNum(v) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof v === "object") {
    const o = /** @type {Record<string, unknown>} */ (v);
    if (o.kind === "number" && typeof o.value === "number") return o.value;
  }
  return null;
}

/**
 * @param {string} inner
 * @param {AcceptMode | undefined} mode
 * @returns {Record<string, string>}
 */
function parseCallArgs(inner, mode) {
  /** @type {Record<string, string>} */
  const args = {};
  const s = String(inner || "").trim();
  if (!s) return args;

  // Labeled: `min: 8, preferred: 40, max: 120`
  if (/[A-Za-z_][\w]*\s*:/.test(s)) {
    for (const part of splitArgs(s)) {
      const m = /^([A-Za-z_][\w]*)\s*:\s*(.*)$/.exec(part.trim());
      if (m) args[m[1]] = m[2].trim();
    }
    return args;
  }

  // Positional single arg → first positional mode arg name (`n`, `r`, `value`)
  const pos = mode?.args?.find((a) => !a.labeled) || mode?.args?.[0];
  if (pos) args[pos.name] = s;
  return args;
}

/**
 * Split on commas not inside nested parens.
 * @param {string} s
 */
function splitArgs(s) {
  /** @type {string[]} */
  const parts = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      parts.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

/**
 * Serialize mode + args to a PDL-ready value.
 * @param {AcceptMode[]} modes
 * @param {string} modeId
 * @param {Record<string, string>} argValues
 * @returns {unknown | undefined}
 */
export function encodeAcceptValue(modes, modeId, argValues) {
  if (!modeId) return undefined;
  const mode = modes.find((m) => m.id === modeId);
  if (!mode) return undefined;

  if (mode.kind === "dotCase") return `.${mode.id}`;

  if (mode.kind === "number") {
    const v = String(argValues.value ?? argValues.n ?? "").trim();
    if (v === "") return undefined;
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    return v;
  }

  if (mode.kind === "token") {
    const name = String(argValues.name ?? "").trim();
    return name || undefined;
  }

  if (mode.kind === "dotCall") {
    const parts = [];
    for (const a of mode.args) {
      const v = String(argValues[a.name] ?? "").trim();
      if (v === "") continue;
      parts.push(a.labeled ? `${a.name}: ${v}` : v);
    }
    // Positional single-arg with unlabeled placeholder filled via first key
    if (!parts.length && mode.args.length === 1 && !mode.args[0].labeled) {
      const v = String(argValues[mode.args[0].name] ?? "").trim();
      if (v) return `.${mode.id}(${v})`;
      return undefined;
    }
    return `.${mode.id}(${parts.join(", ")})`;
  }

  if (mode.kind === "constructor") {
    const parts = [];
    for (const a of mode.args) {
      const v = String(argValues[a.name] ?? "").trim();
      if (v === "") continue;
      parts.push(a.labeled ? `${a.name}: ${v}` : v);
    }
    const name = mode.ctor || mode.id.replace(/\(.*$/, "");
    return `${name}(${parts.join(", ")})`;
  }

  return undefined;
}

/**
 * @param {unknown} v
 */
function stringifyArg(v) {
  if (v == null) return "";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    const o = /** @type {Record<string, unknown>} */ (v);
    if (o.kind === "number" && o.value != null) return String(o.value);
    if (typeof o.value === "number" || typeof o.value === "string") return String(o.value);
  }
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/**
 * Decode current value for a simple enum select.
 * @param {unknown} raw
 * @param {{ value: string }[]} options
 */
export function decodeEnumValue(raw, options) {
  if (raw === undefined || raw === null || raw === "") return "";
  const s = String(raw).trim();
  const withDot = s.startsWith(".") ? s : `.${s.replace(/^[A-Z][A-Za-z0-9_]*\./, "")}`;
  if (options.some((o) => o.value === withDot)) return withDot;
  // Direction.row → .row
  const q = /^[A-Z][A-Za-z0-9_]*\.([A-Za-z_][\w]*)$/.exec(s);
  if (q) {
    const v = `.${q[1]}`;
    if (options.some((o) => o.value === v)) return v;
  }
  return withDot;
}
