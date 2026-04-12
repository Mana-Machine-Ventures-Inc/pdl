import type { ConditionExpr, FrameBodyItem } from "./ast.js";
import type { DesignDefinition } from "./designModel.js";
import { PdlError } from "./errors.js";

function validateConditionExpr(
  design: DesignDefinition,
  expr: ConditionExpr,
  paramByName: Map<string, { typeName: string }>,
  componentName: string,
): void {
  switch (expr.kind) {
    case "and":
    case "or":
      for (const sub of expr.items) {
        validateConditionExpr(design, sub, paramByName, componentName);
      }
      return;
    case "cmp": {
      const paramName = expr.param;
      const p = paramByName.get(paramName);
      if (!p) {
        throw new PdlError(
          "PDL-E007",
          `Unknown parameter \`${paramName}\` in \`if\` condition (component ${componentName})`,
          { path: design.entryPath },
        );
      }
      const vdecl = design.variants.get(p.typeName);
      if (!vdecl) {
        throw new PdlError(
          "PDL-E010",
          `Condition compares non-variant parameter \`${paramName}\` (type ${p.typeName}); \`if\` conditions must use a variant-typed parameter`,
          { path: design.entryPath },
        );
      }
      const rhs = expr.rhs.startsWith(".") ? expr.rhs.slice(1) : expr.rhs;
      if (!vdecl.cases.includes(rhs)) {
        throw new PdlError(
          "PDL-E010",
          `Unknown variant case \`.${rhs}\` for parameter \`${paramName}\` (variant ${vdecl.name}); expected one of: ${vdecl.cases.map((c) => `.${c}`).join(", ")}`,
          { path: design.entryPath },
        );
      }
      return;
    }
    default:
      return;
  }
}

function validateIfConditionsInBody(
  design: DesignDefinition,
  items: FrameBodyItem[],
  paramByName: Map<string, { typeName: string }>,
  componentName: string,
): void {
  for (const item of items) {
    switch (item.kind) {
      case "if": {
        for (const br of item.chain.branches) {
          validateConditionExpr(design, br.condition, paramByName, componentName);
          validateIfConditionsInBody(design, br.body, paramByName, componentName);
        }
        if (item.chain.elseBody) {
          validateIfConditionsInBody(design, item.chain.elseBody, paramByName, componentName);
        }
        break;
      }
      case "let":
        validateIfConditionsInBody(design, item.body, paramByName, componentName);
        break;
      default:
        break;
    }
  }
}

/** Semantic checks on merged design (after parse + import merge). */
export function validateMergedDesign(design: DesignDefinition): void {
  for (const c of design.components.values()) {
    const paramByName = new Map(c.params.map((p) => [p.name, { typeName: p.typeName }]));
    validateIfConditionsInBody(design, c.body, paramByName, c.name);
  }
}
