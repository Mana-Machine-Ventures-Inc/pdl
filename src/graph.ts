import type { ConditionExpr, ValueExpr } from "./ast.js";
import type { DesignDefinition } from "./designModel.js";
import { PdlError } from "./errors.js";

export function serialiseConditionExpr(c: ConditionExpr): unknown {
  switch (c.kind) {
    case "cmp":
      return { kind: "cmp", param: c.param, op: c.op, rhs: c.rhs };
    case "truthy":
      return { kind: "truthy", param: c.param };
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
    case "not":
      return { kind: "not", expr: serialiseValueExpr(e.expr) };
    case "null":
      return { kind: "null" };
    case "ratio":
      return { kind: "ratio", width: e.width, height: e.height };
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
    case "shadow":
      return {
        kind: "shadow",
        x: serialiseValueExpr(e.x),
        y: serialiseValueExpr(e.y),
        blurRadius: serialiseValueExpr(e.blurRadius),
        color: serialiseValueExpr(e.color),
        ...(e.spread ? { spread: serialiseValueExpr(e.spread) } : {}),
      };
    case "iconRef":
      return e.source === "file"
        ? { kind: "iconRef", source: "file", path: serialiseValueExpr(e.path) }
        : {
            kind: "iconRef",
            source: "system",
            system: serialiseValueExpr(e.system),
            name: serialiseValueExpr(e.name),
          };
    case "mediaSourceRef": {
      const meta = {
        ...(e.mediaKind ? { mediaKind: serialiseValueExpr(e.mediaKind) } : {}),
        ...(e.format ? { format: serialiseValueExpr(e.format) } : {}),
      };
      return e.source === "file"
        ? { kind: "mediaSourceRef", source: "file", path: serialiseValueExpr(e.path), ...meta }
        : { kind: "mediaSourceRef", source: "url", url: serialiseValueExpr(e.url), ...meta };
    }
    case "array":
      return { kind: "array", items: e.items.map(serialiseValueExpr) };
    case "instance":
      return {
        kind: "instance",
        component: e.component,
        kwargs: Object.fromEntries(
          Object.entries(e.kwargs).map(([k, v]) => [k, serialiseValueExpr(v)]),
        ),
      };
    case "timing":
      return {
        kind: "timing",
        duration: serialiseValueExpr(e.duration),
        ease: serialiseValueExpr(e.ease),
        ...(e.delay ? { delay: serialiseValueExpr(e.delay) } : {}),
      };
    case "pose":
      return {
        kind: "pose",
        props: Object.fromEntries(
          Object.entries(e.props).map(([k, v]) => [k, serialiseValueExpr(v)]),
        ),
      };
    case "stagger":
      return {
        kind: "stagger",
        step: serialiseValueExpr(e.step),
        ...(e.from ? { from: serialiseValueExpr(e.from) } : {}),
      };
    case "motion":
      return {
        kind: "motion",
        ...(e.timing ? { timing: serialiseValueExpr(e.timing) } : {}),
        pose: serialiseValueExpr(e.pose),
      };
    case "animation":
      return {
        kind: "animation",
        ...(e.base ? { base: serialiseValueExpr(e.base) } : {}),
        ...(e.start ? { start: serialiseValueExpr(e.start) } : {}),
        ...(e.keys ? { keys: serialiseValueExpr(e.keys) } : {}),
        ...(e.stagger ? { stagger: serialiseValueExpr(e.stagger) } : {}),
        ...(e.repeat ? { repeat: serialiseValueExpr(e.repeat) } : {}),
      };
    case "easeBezier":
      return {
        kind: "easeBezier",
        x1: serialiseValueExpr(e.x1),
        y1: serialiseValueExpr(e.y1),
        x2: serialiseValueExpr(e.x2),
        y2: serialiseValueExpr(e.y2),
      };
    case "presentationMotion":
      return {
        kind: "presentationMotion",
        incoming: serialiseValueExpr(e.incoming),
        outgoing: serialiseValueExpr(e.outgoing),
        ...(e.duration ? { duration: serialiseValueExpr(e.duration) } : {}),
        ...(e.ease ? { ease: serialiseValueExpr(e.ease) } : {}),
        ...(e.delay ? { delay: serialiseValueExpr(e.delay) } : {}),
        ...(e.front ? { front: serialiseValueExpr(e.front) } : {}),
        ...(e.switchAt ? { switchAt: serialiseValueExpr(e.switchAt) } : {}),
      };
    case "effect":
      return {
        kind: "effect",
        effectKind: serialiseValueExpr(e.effectKind),
        ...(e.radius ? { radius: serialiseValueExpr(e.radius) } : {}),
        ...(e.vibrancy ? { vibrancy: serialiseValueExpr(e.vibrancy) } : {}),
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
        ...(e.aspect ? { aspect: serialiseValueExpr(e.aspect) } : {}),
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
 *
 * When adding **`ValueExpr`** kinds, update **`collectDeclaredTokenNamesFromValueExpr`** in **`valueExprRefs.ts`**
 * so resolved **`system`** trimming stays aligned.
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
    case "not":
      return {
        kind: "not",
        expr: serialiseValueExprWithTokenRefs(expr.expr, design),
      };
    case "null":
      return { kind: "null" };
    case "ratio":
      return { kind: "ratio", width: expr.width, height: expr.height };
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
    case "shadow":
      return {
        kind: "shadow",
        x: serialiseValueExprWithTokenRefs(expr.x, design),
        y: serialiseValueExprWithTokenRefs(expr.y, design),
        blurRadius: serialiseValueExprWithTokenRefs(expr.blurRadius, design),
        color: serialiseValueExprWithTokenRefs(expr.color, design),
        ...(expr.spread
          ? { spread: serialiseValueExprWithTokenRefs(expr.spread, design) }
          : {}),
      };
    case "iconRef":
      return expr.source === "file"
        ? {
            kind: "iconRef",
            source: "file",
            path: serialiseValueExprWithTokenRefs(expr.path, design),
          }
        : {
            kind: "iconRef",
            source: "system",
            system: serialiseValueExprWithTokenRefs(expr.system, design),
            name: serialiseValueExprWithTokenRefs(expr.name, design),
          };
    case "mediaSourceRef": {
      const meta = {
        ...(expr.mediaKind
          ? { mediaKind: serialiseValueExprWithTokenRefs(expr.mediaKind, design) }
          : {}),
        ...(expr.format ? { format: serialiseValueExprWithTokenRefs(expr.format, design) } : {}),
      };
      return expr.source === "file"
        ? {
            kind: "mediaSourceRef",
            source: "file",
            path: serialiseValueExprWithTokenRefs(expr.path, design),
            ...meta,
          }
        : {
            kind: "mediaSourceRef",
            source: "url",
            url: serialiseValueExprWithTokenRefs(expr.url, design),
            ...meta,
          };
    }
    case "array":
      return { kind: "array", items: expr.items.map((it) => serialiseValueExprWithTokenRefs(it, design)) };
    case "instance":
      return {
        kind: "instance",
        component: expr.component,
        kwargs: Object.fromEntries(
          Object.entries(expr.kwargs).map(([k, v]) => [
            k,
            serialiseValueExprWithTokenRefs(v, design),
          ]),
        ),
      };
    case "timing":
      return {
        kind: "timing",
        duration: serialiseValueExprWithTokenRefs(expr.duration, design),
        ease: serialiseValueExprWithTokenRefs(expr.ease, design),
        ...(expr.delay ? { delay: serialiseValueExprWithTokenRefs(expr.delay, design) } : {}),
      };
    case "pose":
      return {
        kind: "pose",
        props: Object.fromEntries(
          Object.entries(expr.props).map(([k, v]) => [k, serialiseValueExprWithTokenRefs(v, design)]),
        ),
      };
    case "stagger":
      return {
        kind: "stagger",
        step: serialiseValueExprWithTokenRefs(expr.step, design),
        ...(expr.from ? { from: serialiseValueExprWithTokenRefs(expr.from, design) } : {}),
      };
    case "motion":
      return {
        kind: "motion",
        ...(expr.timing
          ? { timing: serialiseValueExprWithTokenRefs(expr.timing, design) }
          : {}),
        pose: serialiseValueExprWithTokenRefs(expr.pose, design),
      };
    case "animation":
      return {
        kind: "animation",
        ...(expr.base ? { base: serialiseValueExprWithTokenRefs(expr.base, design) } : {}),
        ...(expr.start ? { start: serialiseValueExprWithTokenRefs(expr.start, design) } : {}),
        ...(expr.keys ? { keys: serialiseValueExprWithTokenRefs(expr.keys, design) } : {}),
        ...(expr.stagger ? { stagger: serialiseValueExprWithTokenRefs(expr.stagger, design) } : {}),
        ...(expr.repeat ? { repeat: serialiseValueExprWithTokenRefs(expr.repeat, design) } : {}),
      };
    case "easeBezier":
      return {
        kind: "easeBezier",
        x1: serialiseValueExprWithTokenRefs(expr.x1, design),
        y1: serialiseValueExprWithTokenRefs(expr.y1, design),
        x2: serialiseValueExprWithTokenRefs(expr.x2, design),
        y2: serialiseValueExprWithTokenRefs(expr.y2, design),
      };
    case "presentationMotion":
      return {
        kind: "presentationMotion",
        incoming: serialiseValueExprWithTokenRefs(expr.incoming, design),
        outgoing: serialiseValueExprWithTokenRefs(expr.outgoing, design),
        ...(expr.duration
          ? { duration: serialiseValueExprWithTokenRefs(expr.duration, design) }
          : {}),
        ...(expr.ease ? { ease: serialiseValueExprWithTokenRefs(expr.ease, design) } : {}),
        ...(expr.delay ? { delay: serialiseValueExprWithTokenRefs(expr.delay, design) } : {}),
        ...(expr.front ? { front: serialiseValueExprWithTokenRefs(expr.front, design) } : {}),
        ...(expr.switchAt
          ? { switchAt: serialiseValueExprWithTokenRefs(expr.switchAt, design) }
          : {}),
      };
    case "effect":
      return {
        kind: "effect",
        effectKind: serialiseValueExprWithTokenRefs(expr.effectKind, design),
        ...(expr.radius ? { radius: serialiseValueExprWithTokenRefs(expr.radius, design) } : {}),
        ...(expr.vibrancy
          ? { vibrancy: serialiseValueExprWithTokenRefs(expr.vibrancy, design) }
          : {}),
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
        ...(expr.aspect ? { aspect: serialiseValueExprWithTokenRefs(expr.aspect, design) } : {}),
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
      throw new PdlError("PDL-E001", `Unsupported value expression kind ${(expr as ValueExpr).kind}`, {
        path: design.entryPath,
      });
    }
  }
}
