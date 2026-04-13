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
    case "array":
      for (const it of expr.items) collectDeclaredTokenNamesFromValueExpr(it, design, sink);
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
    case "boolean":
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
