import type { ConditionExpr, ValueExpr } from "./ast.js";
import type { DesignDefinition } from "./designModel.js";
import { PdlError } from "./errors.js";

export type ParamEvalMeta = Map<string, { typeName: string }>;

export type EvalOptions = {
  /** Resolved token map (may be partial during bootstrap). */
  tokens: Map<string, unknown>;
  design: DesignDefinition;
  /** For cycle detection when resolving token graphs. */
  visiting?: Set<string>;
  /** Component parameter bindings (variant values as strings without leading dot). */
  paramValues?: Record<string, unknown>;
  paramMeta?: ParamEvalMeta;
  /**
   * When true, String/Icon/MediaSource params always serialize as `param:name` in trees
   * (Component Catalogue base), while variant params still use `paramValues` for `if` chains.
   */
  useStringPlaceholders?: boolean;
};

function expandHex(hex: string): string {
  if (hex.length === 4) {
    const r = hex[1]!;
    const g = hex[2]!;
    const b = hex[3]!;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return hex;
}

function parseHexRgb(hex: string): { r: number; g: number; b: number; a: number } {
  const e = expandHex(hex);
  const h = e.slice(1);
  if (h.length === 6) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: 255,
    };
  }
  if (h.length === 8) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: parseInt(h.slice(6, 8), 16),
    };
  }
  throw new PdlError("PDL-E003", `Invalid hex color ${hex}`);
}

function stripLeadingDot(s: string): string {
  return s.startsWith(".") ? s.slice(1) : s;
}

/** Evaluate a variant `if` condition against bound component parameters (values without leading dot). */
export function evaluateCondition(c: ConditionExpr, paramValues: Record<string, unknown>): boolean {
  switch (c.kind) {
    case "cmp": {
      const v = paramValues[c.param];
      const rhs = c.rhs.startsWith(".") ? c.rhs.slice(1) : c.rhs;
      const vs = v === undefined ? "" : String(v);
      if (c.op === "==") return vs === rhs;
      return vs !== rhs;
    }
    case "truthy": {
      const v = paramValues[c.param];
      if (typeof v === "boolean") return v;
      const s = v === undefined ? "" : String(v);
      return s === "true" || s === "1";
    }
    case "and":
      return c.items.every((x) => evaluateCondition(x, paramValues));
    case "or":
      return c.items.some((x) => evaluateCondition(x, paramValues));
    case "not":
      return !evaluateCondition(c.expr, paramValues);
    default: {
      const _x: never = c;
      void _x;
      return false;
    }
  }
}

export function evaluateValue(expr: ValueExpr, opts: EvalOptions): unknown {
  const visiting = opts.visiting ?? new Set<string>();

  switch (expr.kind) {
    case "hex":
      return expandHex(expr.value);
    case "string":
      return expr.value;
    case "number":
      return expr.value;
    case "boolean":
      return expr.value;
    case "condition": {
      const pv = opts.paramValues;
      if (!pv) {
        throw new PdlError(
          "PDL-E001",
          "Condition expressions require component parameter context",
          { path: opts.design.entryPath },
        );
      }
      return evaluateCondition(expr.expr, pv);
    }
    case "dotEnum":
      return stripLeadingDot(expr.value);
    case "ident": {
      const name = expr.name;
      if (opts.paramMeta?.has(name)) {
        const t = opts.paramMeta.get(name)!.typeName;
        if (
          opts.useStringPlaceholders &&
          (t === "String" || t === "Icon" || t === "MediaSource")
        ) {
          return `param:${name}`;
        }
      }
      if (opts.paramValues && name in opts.paramValues) {
        return opts.paramValues[name]!;
      }
      if (opts.paramMeta?.has(name)) {
        const t = opts.paramMeta.get(name)!.typeName;
        if (t === "String" || t === "Icon" || t === "MediaSource") {
          return `param:${name}`;
        }
      }
      if (opts.tokens.has(name)) {
        return opts.tokens.get(name);
      }
      const prim = opts.design.primitives.get(name);
      if (prim) {
        if (visiting.has(name)) throw new PdlError("PDL-E004", `Circular token reference ${name}`);
        visiting.add(name);
        const ev = evaluateValue(prim.value, opts);
        visiting.delete(name);
        opts.tokens.set(name, ev);
        return ev;
      }
      const sem = opts.design.semantics.get(name);
      if (sem) {
        if (visiting.has(name)) throw new PdlError("PDL-E004", `Circular token reference ${name}`);
        visiting.add(name);
        const ev = evaluateValue(sem.value, opts);
        visiting.delete(name);
        opts.tokens.set(name, ev);
        return ev;
      }
      const ty = opts.design.typeStyles.get(name);
      if (ty) {
        // Keep only a reference on resolved frames; expanded defaults live on the `typeStyle`
        // declaration. PDL may still set additional text props on the same frame to override.
        return { __typeStyle: name };
      }
      throw new PdlError("PDL-E007", `Unresolved identifier ${name}`);
    }
    case "opacityOf": {
      const base = evaluateValue(expr.base, opts);
      const op = evaluateValue(expr.opacity, opts);
      let alpha = 1;
      if (typeof op === "number") alpha = op;
      else if (typeof op === "string" && /^\d+(\.\d+)?$/.test(op)) alpha = Number(op);
      else throw new PdlError("PDL-E003", "Opacity @ rhs must be number or resolved Opacity token");
      const baseStr = typeof base === "string" ? base : JSON.stringify(base);
      if (!baseStr.startsWith("#")) {
        throw new PdlError("PDL-E003", "@ opacity base must resolve to hex color");
      }
      const { r, g, b, a: ba } = parseHexRgb(baseStr);
      const outA = Math.round(ba * alpha);
      return `#${[r, g, b, outA].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
    }
    case "edgeInsets": {
      if (expr.variant === "xy") {
        const x = evaluateValue(expr.fields.x!, opts) as number;
        const y = evaluateValue(expr.fields.y!, opts) as number;
        return { top: y, right: x, bottom: y, left: x };
      }
      const f = expr.fields;
      return {
        top: evaluateValue(f.top!, opts),
        right: evaluateValue(f.right!, opts),
        bottom: evaluateValue(f.bottom!, opts),
        left: evaluateValue(f.left!, opts),
      };
    }
    case "corner": {
      const tl = evaluateValue(expr.tl, opts);
      const tr = evaluateValue(expr.tr, opts);
      const br = evaluateValue(expr.br, opts);
      const bl = evaluateValue(expr.bl, opts);
      if (tl === tr && tr === br && br === bl) return tl;
      return { tl, tr, br, bl };
    }
    case "array":
      return expr.items.map((i) => evaluateValue(i, opts));
    case "instance": {
      const kwargs: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(expr.kwargs)) {
        kwargs[k] = evaluateValue(v, opts);
      }
      return { kind: "instance", component: expr.component, kwargs };
    }
    case "transition":
      return {
        duration: evaluateValue(expr.duration, opts),
        easing: evaluateValue(expr.easing, opts),
        ...(expr.delay !== undefined ? { delay: evaluateValue(expr.delay, opts) } : {}),
      };
    case "vibrancyTuple":
      return { saturation: expr.saturation, brightness: expr.brightness };
    case "rampInline":
      return {
        kind: "ramp",
        direction: expr.direction,
        stops: expr.stops.map((s) => evaluateValue(s, opts)),
      };
    case "sizing": {
      if (expr.mode === "hug") return "hug";
      if (expr.mode === "fill") return "fill";
      if (expr.mode === "fixed") return { fixed: expr.fixed };
      const raw = expr.flexArgs ?? {};
      const flex: Record<string, unknown> = {};
      for (const [k, ve] of Object.entries(raw)) {
        flex[k] = evaluateValue(ve as ValueExpr, opts);
      }
      return { flex };
    }
    case "call": {
      const args = expr.args;
      const ev = (k: string) => evaluateValue(args[k]!, opts);
      if (expr.callee === "Color") return ev("color");
      if (expr.callee === "Blur")
        return { kind: "blur", blur: ev("blur"), ...(args.vibrancy ? { vibrancy: ev("vibrancy") } : {}) };
      if (expr.callee === "Media")
        return {
          kind: "media",
          source: ev("source"),
          ...(args.contentMode ? { contentMode: ev("contentMode") } : {}),
          ...(args.opacity ? { opacity: ev("opacity") } : {}),
        };
      if (expr.callee === "Vibrancy") return { kind: "vibrancy", vibrancy: ev("vibrancy") };
      if (expr.callee === "Ramp")
        return {
          kind: "ramp",
          direction: ev("direction"),
          stops: ev("stops"),
        };
      throw new PdlError("PDL-E001", `Unsupported callee ${expr.callee}`);
    }
    case "gradientStop": {
      const o: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(expr.fields)) {
        o[k] = evaluateValue(v, opts);
      }
      return { kind: "gradientStop", ...o };
    }
    default:
      throw new PdlError("PDL-E001", `Unsupported value expression kind ${(expr as ValueExpr).kind}`);
  }
}

export function buildResolvedTokenMap(
  design: DesignDefinition,
  themeName?: string,
  modifierThemes: string[] = [],
): Map<string, unknown> {
  const m = new Map<string, unknown>();
  const visiting = new Set<string>();
  const optsBase: EvalOptions = { design, tokens: m, visiting };

  for (const n of design.primitives.keys()) {
    void evaluateValue({ kind: "ident", name: n }, optsBase);
  }
  for (const n of design.semantics.keys()) {
    void evaluateValue({ kind: "ident", name: n }, optsBase);
  }

  const applyTheme = (name: string) => {
    const th = design.themes.get(name);
    if (!th) {
      throw new PdlError("PDL-E005", `Unknown theme ${name}`, { path: design.entryPath });
    }
    for (const [tok, rhs] of Object.entries(th.overrides)) {
      m.set(tok, evaluateValue(rhs, optsBase));
    }
  };

  if (themeName) {
    applyTheme(themeName);
  }
  for (const mod of modifierThemes) {
    applyTheme(mod);
  }

  return m;
}
