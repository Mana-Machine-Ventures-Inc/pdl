import type { ConditionExpr, ValueExpr } from "./ast.js";
import {
  coerceIconValue,
  coerceMediaSourceValue,
  finalizeMediaSourceRef,
  normalizeIconSystemName,
  normalizeMediaFormatName,
  normalizeMediaKindName,
  type MediaFormat,
  type MediaKind,
} from "./assetRefs.js";
import type { DesignDefinition } from "./designModel.js";
import { PdlError } from "./errors.js";
import {
  isKnownSamplePath,
  lookupSampleField,
  splitSamplePath,
} from "./samples.js";

export type ParamEvalMeta = Map<string, { typeName: string; isArray?: boolean }>;

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

function evaluateEase(raw: unknown): unknown {
  if (typeof raw === "string") return raw.trim().replace(/^\./, "");
  return raw;
}

/** Time-reverse an Ease. `.in`↔`.out`; bezier (x1,y1,x2,y2) → (1-x2,1-y2,1-x1,1-y1). */
function reverseEase(raw: unknown): unknown {
  if (raw == null) return raw;
  if (typeof raw === "string") {
    const s = raw.trim().replace(/^\./, "");
    if (s === "in") return "out";
    if (s === "out") return "in";
    return s;
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    if (o.kind === "easeBezier") {
      const x1 = Number(o.x1);
      const y1 = Number(o.y1);
      const x2 = Number(o.x2);
      const y2 = Number(o.y2);
      if ([x1, y1, x2, y2].every(Number.isFinite)) {
        return { kind: "easeBezier", x1: 1 - x2, y1: 1 - y2, x2: 1 - x1, y2: 1 - y1 };
      }
    }
    if (typeof o.value === "string") return reverseEase(o.value);
  }
  return raw;
}

function reverseSlotClock(slot: unknown): unknown {
  if (slot == null || typeof slot !== "object" || Array.isArray(slot)) return slot;
  const o = { ...(slot as Record<string, unknown>) };
  const isMotion =
    o.kind === "motion" ||
    o.timing != null ||
    o.keys != null ||
    (o.pose != null && o.kind !== "pose");
  if (!isMotion) return slot;
  if (o.ease != null) o.ease = reverseEase(o.ease);
  if (o.timing && typeof o.timing === "object" && !Array.isArray(o.timing)) {
    const t = { ...(o.timing as Record<string, unknown>) };
    if (t.ease != null) t.ease = reverseEase(t.ease);
    o.timing = t;
  }
  return o;
}

function reversePresentationMotion(raw: unknown): unknown {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new PdlError("PDL-E005", "`.reversed` is only valid on a PresentationMotion");
  }
  const o = { ...(raw as Record<string, unknown>) };
  if (o.kind !== "presentationMotion") {
    throw new PdlError("PDL-E005", "`.reversed` is only valid on a PresentationMotion");
  }
  const incoming = o.incoming;
  const outgoing = o.outgoing;
  o.incoming = reverseSlotClock(outgoing);
  o.outgoing = reverseSlotClock(incoming);
  if (o.ease != null) o.ease = reverseEase(o.ease);
  const front = String(o.front ?? "incoming").replace(/^\./, "");
  o.front = front === "outgoing" ? ".incoming" : ".outgoing";
  return o;
}

/** Shallow Motion object from a token/value used as `Motion(base, field:)`. */
function motionObjectFromEval(raw: unknown): Record<string, unknown> {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return { kind: "motion" };
  }
  const o = raw as Record<string, unknown>;
  if (o.kind === "motion" || o.pose != null || o.keys != null || o.play != null) {
    return { ...o, kind: "motion" };
  }
  if (o.duration != null) {
    return { kind: "motion", timing: o };
  }
  return { ...o, kind: "motion" };
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

function evaluateSamplePath(name: string, opts: EvalOptions, visiting: Set<string>): unknown {
  const field = lookupSampleField(opts.design, name);
  const cycleKey = `sample:${name}`;
  if (visiting.has(cycleKey)) {
    throw new PdlError("PDL-E041", `Circular sample reference \`${name}\``, {
      path: opts.design.entryPath,
    });
  }
  visiting.add(cycleKey);
  const out = evaluateValue(field.value, opts);
  visiting.delete(cycleKey);
  return out;
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
    case "ratio":
      return expr.width / expr.height;
    case "boolean":
      return expr.value;
    case "null":
      return null;
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
      if (expr.name.endsWith(".reversed")) {
        const base = expr.name.slice(0, -".reversed".length);
        return reversePresentationMotion(evaluateValue({ kind: "ident", name: base }, opts));
      }
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
        let ev = evaluateValue(prim.value, opts);
        visiting.delete(name);
        if (prim.tokenType === "Icon") ev = coerceIconValue(ev, opts.design.entryPath);
        else if (prim.tokenType === "MediaSource") {
          ev = coerceMediaSourceValue(ev, opts.design.entryPath);
        }
        opts.tokens.set(name, ev);
        return ev;
      }
      const sem = opts.design.semantics.get(name);
      if (sem) {
        if (visiting.has(name)) throw new PdlError("PDL-E004", `Circular token reference ${name}`);
        visiting.add(name);
        let ev = evaluateValue(sem.value, opts);
        visiting.delete(name);
        if (sem.tokenType === "Icon") ev = coerceIconValue(ev, opts.design.entryPath);
        else if (sem.tokenType === "MediaSource") {
          ev = coerceMediaSourceValue(ev, opts.design.entryPath);
        }
        opts.tokens.set(name, ev);
        return ev;
      }
      const ty = opts.design.typeStyles.get(name);
      if (ty) {
        // Keep only a reference on resolved frames; expanded defaults live on the `typeStyle`
        // declaration. PDL may still set additional text props on the same frame to override.
        return { __typeStyle: name };
      }
      // Typed sample path: `Tracks.focus.tracks` (after tokens — banks are PascalCase symbols).
      if (splitSamplePath(name) && isKnownSamplePath(opts.design, name)) {
        return evaluateSamplePath(name, opts, visiting);
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
    case "shadow": {
      const x = evaluateValue(expr.x, opts);
      const y = evaluateValue(expr.y, opts);
      const blurRadius = evaluateValue(expr.blurRadius, opts);
      const color = evaluateValue(expr.color, opts);
      const spread = expr.spread !== undefined ? evaluateValue(expr.spread, opts) : 0;
      return { kind: "shadow", x, y, blurRadius, spread, color };
    }
    case "iconRef": {
      if (expr.source === "file") {
        const path = evaluateValue(expr.path, opts);
        if (typeof path !== "string") {
          throw new PdlError("PDL-E003", "IconRef(file:) path must evaluate to a string", {
            path: opts.design.entryPath,
          });
        }
        return { kind: "iconRef", source: "file", path };
      }
      const systemRaw = evaluateValue(expr.system, opts);
      const name = evaluateValue(expr.name, opts);
      if (typeof systemRaw !== "string" || typeof name !== "string") {
        throw new PdlError("PDL-E003", "IconRef(system:, name:) requires string system and name", {
          path: opts.design.entryPath,
        });
      }
      const system = normalizeIconSystemName(systemRaw);
      if (!system) {
        throw new PdlError(
          "PDL-E006",
          `Unknown Icon system \`${systemRaw}\` (expected .sfSymbols or .materialSymbols)`,
          { path: opts.design.entryPath },
        );
      }
      return { kind: "iconRef", source: "system", system, name };
    }
    case "mediaSourceRef": {
      const mediaKindRaw =
        expr.mediaKind !== undefined ? evaluateValue(expr.mediaKind, opts) : undefined;
      const formatRaw = expr.format !== undefined ? evaluateValue(expr.format, opts) : undefined;
      let mediaKind: MediaKind | undefined;
      let format: MediaFormat | undefined;
      if (mediaKindRaw !== undefined) {
        const raw = typeof mediaKindRaw === "string" ? mediaKindRaw : String(mediaKindRaw);
        mediaKind = normalizeMediaKindName(raw);
        if (!mediaKind) {
          throw new PdlError(
            "PDL-E006",
            `Unknown MediaSource kind \`${raw}\` (expected .raster, .vector, or .video)`,
            { path: opts.design.entryPath },
          );
        }
      }
      if (formatRaw !== undefined) {
        const raw = typeof formatRaw === "string" ? formatRaw : String(formatRaw);
        format = normalizeMediaFormatName(raw);
        if (!format) {
          throw new PdlError(
            "PDL-E006",
            `Unknown MediaSource format \`${raw}\` (expected .webp|.jpeg|.png|.gif|.svg|.mp4|.webm|.pdf)`,
            { path: opts.design.entryPath },
          );
        }
      }
      if (expr.source === "file") {
        const path = evaluateValue(expr.path, opts);
        if (typeof path !== "string") {
          throw new PdlError("PDL-E003", "MediaSource(file:) path must evaluate to a string", {
            path: opts.design.entryPath,
          });
        }
        return finalizeMediaSourceRef(
          { kind: "mediaSourceRef", source: "file", path, mediaKind, format },
          opts.design.entryPath,
        );
      }
      const url = evaluateValue(expr.url, opts);
      if (typeof url !== "string") {
        throw new PdlError("PDL-E003", "MediaSource(url:) must evaluate to a string", {
          path: opts.design.entryPath,
        });
      }
      return finalizeMediaSourceRef(
        { kind: "mediaSourceRef", source: "url", url, mediaKind, format },
        opts.design.entryPath,
      );
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
    case "timing":
      return {
        duration: evaluateValue(expr.duration, opts),
        ease: evaluateEase(evaluateValue(expr.ease, opts)),
        ...(expr.delay !== undefined ? { delay: evaluateValue(expr.delay, opts) } : {}),
      };
    case "easeBezier": {
      const a = Number(evaluateValue(expr.x1, opts));
      const b = Number(evaluateValue(expr.y1, opts));
      const c = Number(evaluateValue(expr.x2, opts));
      const d = Number(evaluateValue(expr.y2, opts));
      return { kind: "easeBezier", x1: a, y1: b, x2: c, y2: d };
    }
    case "presentationMotion": {
      const out: Record<string, unknown> = {
        kind: "presentationMotion",
        incoming: evaluateValue(expr.incoming, opts),
        outgoing: evaluateValue(expr.outgoing, opts),
      };
      if (expr.duration !== undefined) out.duration = evaluateValue(expr.duration, opts);
      if (expr.ease !== undefined) out.ease = evaluateEase(evaluateValue(expr.ease, opts));
      if (expr.delay !== undefined) out.delay = evaluateValue(expr.delay, opts);
      if (expr.front !== undefined) out.front = evaluateValue(expr.front, opts);
      if (expr.promoteAt !== undefined) out.promoteAt = evaluateValue(expr.promoteAt, opts);
      return out;
    }
    case "pose": {
      const props: Record<string, unknown> = { kind: "pose" };
      for (const [k, v] of Object.entries(expr.props)) {
        props[k] = evaluateValue(v, opts);
      }
      return props;
    }
    case "stagger":
      return {
        kind: "stagger",
        step: evaluateValue(expr.step, opts),
        ...(expr.from !== undefined ? { from: evaluateValue(expr.from, opts) } : {}),
      };
    case "key":
      return {
        kind: "key",
        pose: evaluateValue(expr.pose, opts),
        at: evaluateValue(expr.at, opts),
        ...(expr.ease !== undefined ? { ease: evaluateEase(evaluateValue(expr.ease, opts)) } : {}),
      };
    case "motion": {
      const out: Record<string, unknown> = expr.base
        ? motionObjectFromEval(evaluateValue(expr.base, opts))
        : { kind: "motion" };
      if (expr.timing !== undefined) out.timing = evaluateValue(expr.timing, opts);
      if (expr.play !== undefined) out.play = evaluateValue(expr.play, opts);
      if (expr.pose !== undefined) out.pose = evaluateValue(expr.pose, opts);
      if (expr.keys !== undefined) out.keys = evaluateValue(expr.keys, opts);
      if (expr.stagger !== undefined) out.stagger = evaluateValue(expr.stagger, opts);
      if (expr.repeat !== undefined) out.repeat = evaluateValue(expr.repeat, opts);
      return out;
    }
    case "effect": {
      const raw = evaluateValue(expr.effectKind, opts);
      const caseName =
        typeof raw === "string" ? raw.replace(/^\./, "") : String(raw).replace(/^\./, "");
      const out: Record<string, unknown> = { kind: "effect", case: caseName };
      if (expr.radius !== undefined) out.radius = evaluateValue(expr.radius, opts);
      if (expr.vibrancy !== undefined) out.vibrancy = evaluateValue(expr.vibrancy, opts);
      return out;
    }
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
      if (expr.mode === "aspect") {
        if (!expr.aspect) {
          throw new PdlError("PDL-E003", "`.aspect` requires a ratio argument", {
            path: opts.design.entryPath,
          });
        }
        const ar = evaluateValue(expr.aspect, opts);
        if (typeof ar !== "number" || !(ar > 0) || !Number.isFinite(ar)) {
          throw new PdlError(
            "PDL-E005",
            "`.aspect(…)` must evaluate to a positive finite ratio (width/height)",
            { path: opts.design.entryPath },
          );
        }
        return { aspect: ar };
      }
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
        return {
          kind: "blur",
          radius: ev("radius"),
          ...(args.style ? { style: ev("style") } : {}),
          ...(args.vibrancy ? { vibrancy: ev("vibrancy") } : {}),
        };
      if (expr.callee === "MediaLayer")
        return {
          kind: "media",
          source: ev("source"),
          ...(args.contentMode ? { contentMode: ev("contentMode") } : {}),
          ...(args.justify ? { justify: ev("justify") } : {}),
          ...(args.align ? { align: ev("align") } : {}),
          ...(args.opacity ? { opacity: ev("opacity") } : {}),
        };
      if (expr.callee === "Vibrancy") {
        if (args.saturation !== undefined && args.brightness !== undefined) {
          return {
            kind: "vibrancy",
            saturation: ev("saturation"),
            brightness: ev("brightness"),
          };
        }
        // Legacy wrap form (rejected at validate); keep eval defensive.
        return { kind: "vibrancy", vibrancy: ev("vibrancy") };
      }
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
      let ev = evaluateValue(rhs, optsBase);
      const tokType =
        design.primitives.get(tok)?.tokenType ?? design.semantics.get(tok)?.tokenType;
      if (tokType === "Icon") ev = coerceIconValue(ev, design.entryPath);
      else if (tokType === "MediaSource") ev = coerceMediaSourceValue(ev, design.entryPath);
      m.set(tok, ev);
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
