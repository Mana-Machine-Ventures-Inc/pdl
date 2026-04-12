import type { ComponentDecl, ConditionExpr, FrameBodyItem, ValueExpr } from "./ast.js";
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

function collectLetFrameKinds(items: FrameBodyItem[]): Map<string, string> {
  const m = new Map<string, string>();
  const walk = (body: FrameBodyItem[]) => {
    for (const it of body) {
      if (it.kind === "let") {
        m.set(it.id, it.frameKind);
        walk(it.body);
      } else if (it.kind === "if") {
        for (const br of it.chain.branches) walk(br.body);
        if (it.chain.elseBody) walk(it.chain.elseBody);
      }
    }
  };
  walk(items);
  return m;
}

function assertValidHiddenRhs(value: ValueExpr, componentName: string, design: DesignDefinition): void {
  if (value.kind === "boolean" || value.kind === "condition") return;
  if (value.kind === "dotEnum") {
    const raw = value.value.startsWith(".") ? value.value.slice(1) : value.value;
    if (raw === "true" || raw === "false") return;
  }
  throw new PdlError(
    "PDL-E012",
    `\`hidden\` on component ${componentName} must be true, false, .true, .false, or a variant condition (like \`mode == .case\`)`,
    { path: design.entryPath },
  );
}

function validateHiddenInBody(
  design: DesignDefinition,
  items: FrameBodyItem[],
  paramByName: Map<string, { typeName: string }>,
  componentName: string,
  currentFrameKind: ComponentDecl["rootKind"],
  letKinds: Map<string, string>,
): void {
  for (const item of items) {
    if (item.kind === "prop" && item.name === "hidden") {
      if (currentFrameKind !== "layout") {
        throw new PdlError(
          "PDL-E012",
          `\`hidden\` is only valid on \`layout\` frames (component ${componentName}, current frame kind \`${currentFrameKind}\`)`,
          { path: design.entryPath },
        );
      }
      assertValidHiddenRhs(item.value, componentName, design);
      if (item.value.kind === "condition") {
        validateConditionExpr(design, item.value.expr, paramByName, componentName);
      }
    }
    if (item.kind === "frameProp" && item.name === "hidden") {
      const fk = letKinds.get(item.frame);
      if (!fk) {
        throw new PdlError(
          "PDL-E012",
          `Unknown frame \`${item.frame}\` in \`${item.frame}.hidden\` (component ${componentName})`,
          { path: design.entryPath },
        );
      }
      if (fk !== "layout") {
        throw new PdlError(
          "PDL-E012",
          `\`hidden\` is only valid on \`layout\` frames; \`${item.frame}\` is \`${fk}\` (component ${componentName})`,
          { path: design.entryPath },
        );
      }
      assertValidHiddenRhs(item.value, componentName, design);
      if (item.value.kind === "condition") {
        validateConditionExpr(design, item.value.expr, paramByName, componentName);
      }
    }
    switch (item.kind) {
      case "let":
        validateHiddenInBody(design, item.body, paramByName, componentName, item.frameKind as ComponentDecl["rootKind"], letKinds);
        break;
      case "if":
        for (const br of item.chain.branches) {
          validateHiddenInBody(design, br.body, paramByName, componentName, currentFrameKind, letKinds);
        }
        if (item.chain.elseBody) {
          validateHiddenInBody(design, item.chain.elseBody, paramByName, componentName, currentFrameKind, letKinds);
        }
        break;
      default:
        break;
    }
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
    const letKinds = collectLetFrameKinds(c.body);
    validateHiddenInBody(design, c.body, paramByName, c.name, c.rootKind, letKinds);
  }
}
