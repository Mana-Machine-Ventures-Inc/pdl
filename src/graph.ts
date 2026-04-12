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
  "usage",
  "fixtures",
  "rules",
  "interactions",
] as const;

export type DesignGraphRootKey = (typeof DESIGN_GRAPH_ROOT_KEYS)[number];

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
    primitives: Object.fromEntries(
      [...design.primitives.values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((d) => [
          d.name,
          {
            name: d.name,
            tokenType: d.tokenType,
            value: serialiseValueExpr(d.value),
          },
        ]),
    ),
    semantics: Object.fromEntries(
      [...design.semantics.values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((d) => [
          d.name,
          {
            name: d.name,
            tokenType: d.tokenType,
            value: serialiseValueExpr(d.value),
          },
        ]),
    ),
    themes: Object.fromEntries(
      [...design.themes.values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((t) => [
          t.name,
          {
            name: t.name,
            baseTheme: t.baseTheme ?? null,
            overrides: Object.fromEntries(
              Object.entries(t.overrides).map(([k, v]) => [k, serialiseValueExpr(v)]),
            ),
          },
        ]),
    ),
    variants: Object.fromEntries(
      [...design.variants.values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((v) => [
          v.name,
          {
            name: v.name,
            cases: v.cases,
          },
        ]),
    ),
    typeStyles: Object.fromEntries(
      [...design.typeStyles.values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((t) => [
          t.name,
          {
            name: t.name,
            props: Object.fromEntries(Object.entries(t.props).map(([k, v]) => [k, serialiseValueExpr(v)])),
          },
        ]),
    ),
    components: Object.fromEntries(
      [...design.components.values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => [
          c.name,
          {
            name: c.name,
            params: c.params.map((p) => ({
              name: p.name,
              typeName: p.typeName,
              defaultValue: serialiseValueExpr(p.defaultValue),
            })),
            rootKind: c.rootKind,
            body: c.body,
          },
        ]),
    ),
    expose: Object.fromEntries([...design.expose.entries()].sort(([a], [b]) => a.localeCompare(b))),
    usage: Object.fromEntries(
      [...design.usage.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([comp, m]) => [
          comp,
          Object.fromEntries([...m.entries()].sort(([x], [y]) => x.localeCompare(y))),
        ]),
    ),
    fixtures: Object.fromEntries(
      [...design.fixtures.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([comp, m]) => [
          comp,
          Object.fromEntries(
            [...m.entries()]
              .sort(([x], [y]) => x.localeCompare(y))
              .map(([label, ex]) => [
                label,
                {
                  label: ex.label,
                  bindings: ex.bindings.map((b) => ({
                    name: b.name,
                    value: serialiseValueExpr(b.value),
                  })),
                },
              ]),
          ),
        ]),
    ),
    rules: Object.fromEntries(
      [...design.rules.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([comp, stmts]) => [comp, stmts]),
    ),
    interactions: Object.fromEntries(
      [...design.interactions.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([comp, m]) => [comp, [...m.values()].sort((a, b) => a.name.localeCompare(b.name))]),
    ),
  };
}
