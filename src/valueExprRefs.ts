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
    case "timing":
      collectDeclaredTokenNamesFromValueExpr(expr.duration, design, sink);
      collectDeclaredTokenNamesFromValueExpr(expr.ease, design, sink);
      if (expr.delay) collectDeclaredTokenNamesFromValueExpr(expr.delay, design, sink);
      return;
    case "pose":
      for (const v of Object.values(expr.props)) collectDeclaredTokenNamesFromValueExpr(v, design, sink);
      return;
    case "stagger":
      collectDeclaredTokenNamesFromValueExpr(expr.step, design, sink);
      if (expr.from) collectDeclaredTokenNamesFromValueExpr(expr.from, design, sink);
      return;
    case "key":
      collectDeclaredTokenNamesFromValueExpr(expr.pose, design, sink);
      collectDeclaredTokenNamesFromValueExpr(expr.at, design, sink);
      if (expr.ease) collectDeclaredTokenNamesFromValueExpr(expr.ease, design, sink);
      return;
    case "motion":
      if (expr.base) collectDeclaredTokenNamesFromValueExpr(expr.base, design, sink);
      if (expr.timing) collectDeclaredTokenNamesFromValueExpr(expr.timing, design, sink);
      if (expr.pose) collectDeclaredTokenNamesFromValueExpr(expr.pose, design, sink);
      if (expr.keys) collectDeclaredTokenNamesFromValueExpr(expr.keys, design, sink);
      if (expr.play) collectDeclaredTokenNamesFromValueExpr(expr.play, design, sink);
      if (expr.repeat) collectDeclaredTokenNamesFromValueExpr(expr.repeat, design, sink);
      if (expr.stagger) collectDeclaredTokenNamesFromValueExpr(expr.stagger, design, sink);
      return;
    case "effect":
      collectDeclaredTokenNamesFromValueExpr(expr.effectKind, design, sink);
      if (expr.radius) collectDeclaredTokenNamesFromValueExpr(expr.radius, design, sink);
      if (expr.vibrancy) collectDeclaredTokenNamesFromValueExpr(expr.vibrancy, design, sink);
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
    case "easeBezier":
      collectDeclaredTokenNamesFromValueExpr(expr.x1, design, sink);
      collectDeclaredTokenNamesFromValueExpr(expr.y1, design, sink);
      collectDeclaredTokenNamesFromValueExpr(expr.x2, design, sink);
      collectDeclaredTokenNamesFromValueExpr(expr.y2, design, sink);
      return;
    case "presentationMotion":
      collectDeclaredTokenNamesFromValueExpr(expr.incoming, design, sink);
      collectDeclaredTokenNamesFromValueExpr(expr.outgoing, design, sink);
      if (expr.duration) collectDeclaredTokenNamesFromValueExpr(expr.duration, design, sink);
      if (expr.ease) collectDeclaredTokenNamesFromValueExpr(expr.ease, design, sink);
      if (expr.delay) collectDeclaredTokenNamesFromValueExpr(expr.delay, design, sink);
      if (expr.front) collectDeclaredTokenNamesFromValueExpr(expr.front, design, sink);
      if (expr.promoteAt) collectDeclaredTokenNamesFromValueExpr(expr.promoteAt, design, sink);
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
