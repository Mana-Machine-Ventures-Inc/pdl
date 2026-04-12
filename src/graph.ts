import type { ConditionExpr, ValueExpr } from "./ast.js";
import type { DesignDefinition } from "./designModel.js";

export function serialiseConditionExpr(c: ConditionExpr): unknown {
  switch (c.kind) {
    case "cmp":
      return { kind: "cmp", param: c.param, op: c.op, rhs: c.rhs };
    case "and":
      return { kind: "and", items: c.items.map(serialiseConditionExpr) };
    case "or":
      return { kind: "or", items: c.items.map(serialiseConditionExpr) };
    case "not":
      return { kind: "not", expr: serialiseConditionExpr(c.expr) };
    default:
      return { kind: "unknown" };
  }
}

/** Serialise a value expression for catalogue / resolve JSON (embedded `SerialisedValueExpr` slices). */
export function serialiseValueExpr(e: ValueExpr): unknown {
  switch (e.kind) {
    case "hex":
    case "string":
    case "number":
    case "boolean":
      return { kind: e.kind, value: (e as { value: unknown }).value };
    case "condition":
      return { kind: "condition", expr: serialiseConditionExpr(e.expr) };
    case "ident":
      return { kind: "ident", name: e.name };
    case "dotEnum":
      return { kind: "dotEnum", value: e.value };
    case "opacityOf":
      return { kind: "opacityOf", base: serialiseValueExpr(e.base), opacity: serialiseValueExpr(e.opacity) };
    case "edgeInsets":
      return {
        kind: "edgeInsets",
        variant: e.variant,
        fields: Object.fromEntries(Object.entries(e.fields).map(([k, v]) => [k, serialiseValueExpr(v)])),
      };
    case "corner":
      return {
        kind: "corner",
        tl: serialiseValueExpr(e.tl),
        tr: serialiseValueExpr(e.tr),
        br: serialiseValueExpr(e.br),
        bl: serialiseValueExpr(e.bl),
      };
    case "array":
      return { kind: "array", items: e.items.map(serialiseValueExpr) };
    case "transition":
      return {
        kind: "transition",
        duration: serialiseValueExpr(e.duration),
        easing: serialiseValueExpr(e.easing),
        ...(e.delay ? { delay: serialiseValueExpr(e.delay) } : {}),
      };
    case "vibrancyTuple":
      return { kind: "vibrancyTuple", saturation: e.saturation, brightness: e.brightness };
    case "rampInline":
      return { kind: "rampInline", direction: e.direction, stops: e.stops.map(serialiseValueExpr) };
    case "sizing":
      return {
        kind: "sizing",
        mode: e.mode,
        ...(e.fixed !== undefined ? { fixed: e.fixed } : {}),
        ...(e.flexArgs ? { flexArgs: Object.fromEntries(Object.entries(e.flexArgs).map(([k, v]) => [k, serialiseValueExpr(v)])) } : {}),
      };
    case "call":
      return { kind: "call", callee: e.callee, args: Object.fromEntries(Object.entries(e.args).map(([k, v]) => [k, serialiseValueExpr(v)])) };
    case "gradientStop":
      return {
        kind: "gradientStop",
        fields: Object.fromEntries(Object.entries(e.fields).map(([k, v]) => [k, serialiseValueExpr(v)])),
      };
    default:
      return { kind: "unknown" };
  }
}

/**
 * Serialise a **`ValueExpr`** for theme override JSON: bare **`primitive`** / **`semantic`** idents
 * become **`primitive:name`** / **`semantic:name`** strings so values are not duplicated from definitions.
 */
export function serialiseValueExprWithTokenRefs(expr: ValueExpr, design: DesignDefinition): unknown {
  switch (expr.kind) {
    case "ident":
      if (design.primitives.has(expr.name)) return `primitive:${expr.name}`;
      if (design.semantics.has(expr.name)) return `semantic:${expr.name}`;
      return { kind: "ident", name: expr.name };
    case "hex":
    case "string":
    case "number":
    case "boolean":
      return { kind: expr.kind, value: (expr as { value: unknown }).value };
    case "condition":
      return serialiseValueExpr(expr);
    case "dotEnum":
      return { kind: "dotEnum", value: expr.value };
    case "opacityOf":
      return {
        kind: "opacityOf",
        base: serialiseValueExprWithTokenRefs(expr.base, design),
        opacity: serialiseValueExprWithTokenRefs(expr.opacity, design),
      };
    case "edgeInsets":
      return {
        kind: "edgeInsets",
        variant: expr.variant,
        fields: Object.fromEntries(
          Object.entries(expr.fields).map(([k, v]) => [k, serialiseValueExprWithTokenRefs(v, design)]),
        ),
      };
    case "corner":
      return {
        kind: "corner",
        tl: serialiseValueExprWithTokenRefs(expr.tl, design),
        tr: serialiseValueExprWithTokenRefs(expr.tr, design),
        br: serialiseValueExprWithTokenRefs(expr.br, design),
        bl: serialiseValueExprWithTokenRefs(expr.bl, design),
      };
    case "array":
      return { kind: "array", items: expr.items.map((it) => serialiseValueExprWithTokenRefs(it, design)) };
    case "transition":
      return {
        kind: "transition",
        duration: serialiseValueExprWithTokenRefs(expr.duration, design),
        easing: serialiseValueExprWithTokenRefs(expr.easing, design),
        ...(expr.delay ? { delay: serialiseValueExprWithTokenRefs(expr.delay, design) } : {}),
      };
    case "vibrancyTuple":
      return { kind: "vibrancyTuple", saturation: expr.saturation, brightness: expr.brightness };
    case "rampInline":
      return {
        kind: "rampInline",
        direction: expr.direction,
        stops: expr.stops.map((s) => serialiseValueExprWithTokenRefs(s, design)),
      };
    case "sizing":
      return {
        kind: "sizing",
        mode: expr.mode,
        ...(expr.fixed !== undefined ? { fixed: expr.fixed } : {}),
        ...(expr.flexArgs
          ? {
              flexArgs: Object.fromEntries(
                Object.entries(expr.flexArgs).map(([k, v]) => [k, serialiseValueExprWithTokenRefs(v, design)]),
              ),
            }
          : {}),
      };
    case "call":
      return {
        kind: "call",
        callee: expr.callee,
        args: Object.fromEntries(
          Object.entries(expr.args).map(([k, v]) => [k, serialiseValueExprWithTokenRefs(v, design)]),
        ),
      };
    case "gradientStop":
      return {
        kind: "gradientStop",
        fields: Object.fromEntries(
          Object.entries(expr.fields).map(([k, v]) => [k, serialiseValueExprWithTokenRefs(v, design)]),
        ),
      };
    default: {
      const _x: never = expr;
      void _x;
      return { kind: "unknown" };
    }
  }
}
