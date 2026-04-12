import type { DesignDefinition } from "./designModel.js";
import type { ConditionExpr, ValueExpr } from "./ast.js";

const SCHEMA = "1.0.0-beta";

/** Top-level keys on `buildDesignGraph()` output (for strict tests). */
export const DESIGN_GRAPH_ROOT_KEYS = [
  "kind",
  "schemaVersion",
  "entryPath",
  "modulePaths",
  "previewBackground",
  "primitives",
  "semantics",
  "themes",
  "variants",
  "typeStyles",
  "components",
  "expose",
] as const;

export type DesignGraphRootKey = (typeof DESIGN_GRAPH_ROOT_KEYS)[number];

function serialiseConditionExpr(c: ConditionExpr): unknown {
  switch (c.kind) {
    case "cmp":
      return { kind: "cmp", param: c.param, op: c.op, rhs: c.rhs };
    case "and":
      return { kind: "and", items: c.items.map(serialiseConditionExpr) };
    case "or":
      return { kind: "or", items: c.items.map(serialiseConditionExpr) };
    default:
      return { kind: "unknown" };
  }
}

/** Serialise a value expression for graph / tooling (not normative in spec). */
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

/** Design graph JSON — spec §9 names this output; shape is implementation-defined until schema is added. */
export function buildDesignGraph(design: DesignDefinition): unknown {
  return {
    kind: "designGraph",
    schemaVersion: SCHEMA,
    entryPath: design.entryPath,
    modulePaths: design.modulePaths,
    previewBackground: design.previewBackground ?? null,
    primitives: [...design.primitives.values()].map((d) => ({
      name: d.name,
      tokenType: d.tokenType,
      value: serialiseValueExpr(d.value),
    })),
    semantics: [...design.semantics.values()].map((d) => ({
      name: d.name,
      tokenType: d.tokenType,
      value: serialiseValueExpr(d.value),
    })),
    themes: [...design.themes.values()].map((t) => ({
      name: t.name,
      baseTheme: t.baseTheme ?? null,
      overrides: Object.fromEntries(
        Object.entries(t.overrides).map(([k, v]) => [k, serialiseValueExpr(v)]),
      ),
    })),
    variants: [...design.variants.values()].map((v) => ({ name: v.name, cases: v.cases })),
    typeStyles: [...design.typeStyles.values()].map((t) => ({
      name: t.name,
      props: Object.fromEntries(Object.entries(t.props).map(([k, v]) => [k, serialiseValueExpr(v)])),
    })),
    components: [...design.components.values()].map((c) => ({
      name: c.name,
      params: c.params.map((p) => ({
        name: p.name,
        typeName: p.typeName,
        defaultValue: serialiseValueExpr(p.defaultValue),
      })),
      rootKind: c.rootKind,
      body: c.body,
    })),
    expose: Object.fromEntries([...design.expose.entries()].sort(([a], [b]) => a.localeCompare(b))),
  };
}
