/** Variant / Bool condition validation shared by `if`, `hidden`, and Bool kwargs. */

import type { ConditionExpr } from "./ast.js";
import type { DesignDefinition } from "./designModel.js";
import { PdlError } from "./errors.js";
import { isBoolParamType } from "./paramTypes.js";

export type ParamTypeMap =
  | Map<string, string>
  | Map<string, { typeName: string }>;

function typeOf(paramByName: ParamTypeMap, name: string): string | undefined {
  const v = paramByName.get(name) as string | { typeName: string } | undefined;
  if (v === undefined) return undefined;
  return typeof v === "string" ? v : v.typeName;
}

/**
 * Validate a condition against enclosing component parameter types.
 */
export function validateConditionExpr(
  design: DesignDefinition,
  expr: ConditionExpr,
  paramByName: ParamTypeMap,
  componentName: string,
): void {
  switch (expr.kind) {
    case "and":
    case "or":
      for (const sub of expr.items) {
        validateConditionExpr(design, sub, paramByName, componentName);
      }
      return;
    case "not":
      validateConditionExpr(design, expr.expr, paramByName, componentName);
      return;
    case "truthy": {
      const paramName = expr.param;
      const typeName = typeOf(paramByName, paramName);
      if (!typeName) {
        throw new PdlError(
          "PDL-E007",
          `Unknown parameter \`${paramName}\` in \`if\` condition (component ${componentName})`,
          { path: design.entryPath },
        );
      }
      if (!isBoolParamType(typeName)) {
        throw new PdlError(
          "PDL-E010",
          `Bare \`if ${paramName}\` requires a Bool parameter (got type ${typeName}); use \`${paramName} == …\` for variants`,
          { path: design.entryPath },
        );
      }
      return;
    }
    case "cmp": {
      const paramName = expr.param;
      const typeName = typeOf(paramByName, paramName);
      if (!typeName) {
        throw new PdlError(
          "PDL-E007",
          `Unknown parameter \`${paramName}\` in \`if\` condition (component ${componentName})`,
          { path: design.entryPath },
        );
      }
      const rhsRaw = expr.rhs.startsWith(".") ? expr.rhs.slice(1) : expr.rhs;
      // Param-param compare: RHS is a bare identifier that names another param.
      const rhsIsParam =
        !expr.rhs.startsWith(".") &&
        expr.rhs !== "true" &&
        expr.rhs !== "false" &&
        typeOf(paramByName, expr.rhs) !== undefined;

      if (isBoolParamType(typeName)) {
        if (rhsIsParam) {
          const rhsTy = typeOf(paramByName, expr.rhs)!;
          if (rhsTy !== typeName) {
            throw new PdlError(
              "PDL-E010",
              `Condition compares incompatible parameter types \`${paramName}\` (${typeName}) and \`${expr.rhs}\` (${rhsTy})`,
              { path: design.entryPath },
            );
          }
          return;
        }
        if (rhsRaw !== "true" && rhsRaw !== "false") {
          throw new PdlError(
            "PDL-E010",
            `Bool condition on \`${paramName}\` expected \`true\` / \`false\` (or \`.true\` / \`.false\`)`,
            { path: design.entryPath },
          );
        }
        return;
      }
      const vdecl = design.variants.get(typeName);
      if (!vdecl) {
        throw new PdlError(
          "PDL-E010",
          `Condition compares non-variant parameter \`${paramName}\` (type ${typeName}); \`if\` conditions must use a variant-typed parameter`,
          { path: design.entryPath },
        );
      }
      if (rhsIsParam) {
        const rhsTy = typeOf(paramByName, expr.rhs)!;
        if (rhsTy !== typeName) {
          throw new PdlError(
            "PDL-E010",
            `Condition compares incompatible parameter types \`${paramName}\` (${typeName}) and \`${expr.rhs}\` (${rhsTy})`,
            { path: design.entryPath },
          );
        }
        return;
      }
      if (!vdecl.cases.includes(rhsRaw)) {
        throw new PdlError(
          "PDL-E010",
          `Unknown variant case \`.${rhsRaw}\` for parameter \`${paramName}\` (variant ${vdecl.name}); expected one of: ${vdecl.cases.map((c) => `.${c}`).join(", ")}`,
          { path: design.entryPath },
        );
      }
      return;
    }
    default: {
      const _x: never = expr;
      void _x;
      return;
    }
  }
}
