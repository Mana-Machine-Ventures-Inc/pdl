import type {
  ComponentDecl,
  ConditionExpr,
  FrameBodyItem,
  InteractionHandlerItem,
  RulesStatement,
  ValueExpr,
} from "./ast.js";
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
    case "not":
      validateConditionExpr(design, expr.expr, paramByName, componentName);
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
    default: {
      const _x: never = expr;
      void _x;
      return;
    }
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

function validateCompanionSymbols(design: DesignDefinition): void {
  for (const name of design.usage.keys()) {
    if (!design.components.has(name)) {
      throw new PdlError("PDL-E006", `usage references unknown component \`${name}\``, { path: design.entryPath });
    }
  }
  for (const name of design.fixtures.keys()) {
    if (!design.components.has(name)) {
      throw new PdlError("PDL-E006", `fixtures references unknown component \`${name}\``, { path: design.entryPath });
    }
  }
  for (const name of design.rules.keys()) {
    if (!design.components.has(name)) {
      throw new PdlError("PDL-E006", `rules references unknown component \`${name}\``, { path: design.entryPath });
    }
  }
  for (const name of design.interactions.keys()) {
    if (!design.components.has(name)) {
      throw new PdlError("PDL-E006", `interaction targets unknown component \`${name}\``, { path: design.entryPath });
    }
  }
}

function validateFixturesForComponent(design: DesignDefinition, componentName: string): void {
  const c = design.components.get(componentName);
  if (!c) return;
  const pmap = new Map(c.params.map((p) => [p.name, p]));
  const fm = design.fixtures.get(componentName);
  if (!fm) return;
  for (const ex of fm.values()) {
    for (const b of ex.bindings) {
      if (!pmap.has(b.name)) {
        throw new PdlError(
          "PDL-E007",
          `Unknown parameter \`${b.name}\` in fixture "${ex.label}" (component ${componentName})`,
          { path: design.entryPath },
        );
      }
    }
  }
}

function validateInteractionBody(
  design: DesignDefinition,
  items: InteractionHandlerItem[],
  paramByName: Map<string, { typeName: string }>,
  componentName: string,
): void {
  for (const it of items) {
    if (it.kind === "assign") {
      if (!paramByName.has(it.param)) {
        throw new PdlError(
          "PDL-E007",
          `Unknown parameter \`${it.param}\` in interaction (component ${componentName})`,
          { path: design.entryPath },
        );
      }
    } else if (it.kind === "if") {
      for (const br of it.chain.branches) {
        validateConditionExpr(design, br.condition, paramByName, componentName);
        validateInteractionBody(design, br.body, paramByName, componentName);
      }
      if (it.chain.elseBody) {
        validateInteractionBody(design, it.chain.elseBody, paramByName, componentName);
      }
    }
  }
}

function validateInteractionsForComponent(design: DesignDefinition, componentName: string): void {
  const m = design.interactions.get(componentName);
  if (!m) return;
  const c = design.components.get(componentName)!;
  const paramByName = new Map(c.params.map((p) => [p.name, { typeName: p.typeName }]));
  for (const decl of m.values()) {
    for (const h of decl.handlers) {
      validateInteractionBody(design, h.body, paramByName, componentName);
    }
  }
}

function validateRulesStatements(
  design: DesignDefinition,
  statements: RulesStatement[],
  paramByName: Map<string, { typeName: string }>,
  componentName: string,
): void {
  for (const st of statements) {
    if (st.kind === "if") {
      for (const br of st.chain.branches) {
        validateConditionExpr(design, br.condition, paramByName, componentName);
        validateRulesStatements(design, br.body, paramByName, componentName);
      }
      if (st.chain.elseBody) {
        validateRulesStatements(design, st.chain.elseBody, paramByName, componentName);
      }
    }
  }
}

function validateRulesForComponent(design: DesignDefinition, componentName: string): void {
  const stmts = design.rules.get(componentName);
  if (!stmts?.length) return;
  const c = design.components.get(componentName)!;
  const paramByName = new Map(c.params.map((p) => [p.name, { typeName: p.typeName }]));
  validateRulesStatements(design, stmts, paramByName, componentName);
}

/** Semantic checks on merged design (after parse + import merge). */
export function validateMergedDesign(design: DesignDefinition): void {
  validateCompanionSymbols(design);
  for (const c of design.components.values()) {
    const paramByName = new Map(c.params.map((p) => [p.name, { typeName: p.typeName }]));
    validateIfConditionsInBody(design, c.body, paramByName, c.name);
    const letKinds = collectLetFrameKinds(c.body);
    validateHiddenInBody(design, c.body, paramByName, c.name, c.rootKind, letKinds);
    validateFixturesForComponent(design, c.name);
    validateInteractionsForComponent(design, c.name);
    validateRulesForComponent(design, c.name);
  }
}
