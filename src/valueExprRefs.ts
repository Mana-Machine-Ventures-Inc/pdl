import type { ValueExpr } from "./ast.js";
import type { DesignDefinition } from "./designModel.js";

/**
 * Collects **primitive** and **semantic** token names referenced from a **`ValueExpr`** subtree
 * (authored RHS only — not evaluated). Used for resolved **`system`** trimming and transitive closure.
 *
 * Keep in sync with **`serialiseValueExprWithTokenRefs`** (`graph.ts`) when adding **`ValueExpr`** kinds.
 */
export function collectDeclaredTokenNamesFromValueExpr(
  expr: ValueExpr,
  design: DesignDefinition,
  sink: Set<string>,
): void {
  switch (expr.kind) {
    case "ident":
      if (design.primitives.has(expr.name) || design.semantics.has(expr.name)) sink.add(expr.name);
      return;
    case "opacityOf":
      collectDeclaredTokenNamesFromValueExpr(expr.base, design, sink);
      collectDeclaredTokenNamesFromValueExpr(expr.opacity, design, sink);
      return;
    case "edgeInsets":
      for (const v of Object.values(expr.fields)) collectDeclaredTokenNamesFromValueExpr(v, design, sink);
      return;
    case "corner":
      collectDeclaredTokenNamesFromValueExpr(expr.tl, design, sink);
      collectDeclaredTokenNamesFromValueExpr(expr.tr, design, sink);
      collectDeclaredTokenNamesFromValueExpr(expr.br, design, sink);
      collectDeclaredTokenNamesFromValueExpr(expr.bl, design, sink);
      return;
    case "shadow":
      collectDeclaredTokenNamesFromValueExpr(expr.x, design, sink);
      collectDeclaredTokenNamesFromValueExpr(expr.y, design, sink);
      collectDeclaredTokenNamesFromValueExpr(expr.blurRadius, design, sink);
      collectDeclaredTokenNamesFromValueExpr(expr.color, design, sink);
      if (expr.spread) collectDeclaredTokenNamesFromValueExpr(expr.spread, design, sink);
      return;
    case "iconRef":
      if (expr.source === "file") {
        collectDeclaredTokenNamesFromValueExpr(expr.path, design, sink);
      } else {
        collectDeclaredTokenNamesFromValueExpr(expr.system, design, sink);
        collectDeclaredTokenNamesFromValueExpr(expr.name, design, sink);
      }
      return;
    case "mediaSourceRef":
      collectDeclaredTokenNamesFromValueExpr(
        expr.source === "file" ? expr.path : expr.url,
        design,
        sink,
      );
      if (expr.mediaKind) collectDeclaredTokenNamesFromValueExpr(expr.mediaKind, design, sink);
      if (expr.format) collectDeclaredTokenNamesFromValueExpr(expr.format, design, sink);
      return;
    case "array":
      for (const it of expr.items) collectDeclaredTokenNamesFromValueExpr(it, design, sink);
      return;
    case "instance":
      for (const v of Object.values(expr.kwargs)) {
        collectDeclaredTokenNamesFromValueExpr(v, design, sink);
      }
      return;
    case "transition":
      collectDeclaredTokenNamesFromValueExpr(expr.duration, design, sink);
      collectDeclaredTokenNamesFromValueExpr(expr.easing, design, sink);
      if (expr.delay) collectDeclaredTokenNamesFromValueExpr(expr.delay, design, sink);
      return;
    case "rampInline":
      for (const s of expr.stops) collectDeclaredTokenNamesFromValueExpr(s, design, sink);
      return;
    case "sizing":
      if (expr.aspect) collectDeclaredTokenNamesFromValueExpr(expr.aspect, design, sink);
      if (expr.flexArgs) {
        for (const v of Object.values(expr.flexArgs)) collectDeclaredTokenNamesFromValueExpr(v, design, sink);
      }
      return;
    case "call":
      for (const v of Object.values(expr.args)) collectDeclaredTokenNamesFromValueExpr(v, design, sink);
      return;
    case "gradientStop":
      for (const v of Object.values(expr.fields)) collectDeclaredTokenNamesFromValueExpr(v, design, sink);
      return;
    case "hex":
    case "string":
    case "number":
    case "ratio":
    case "boolean":
    case "null":
    case "dotEnum":
    case "condition":
    case "vibrancyTuple":
      return;
    default: {
      const _x: never = expr;
      void _x;
      return;
    }
  }
}
