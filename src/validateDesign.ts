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
import {
  assertLayerStackValue,
  validateFramePropsInBody,
  validateTypeStyleProps,
} from "./frameProps.js";

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
    case "truthy": {
      const paramName = expr.param;
      const p = paramByName.get(paramName);
      if (!p) {
        throw new PdlError(
          "PDL-E007",
          `Unknown parameter \`${paramName}\` in \`if\` condition (component ${componentName})`,
          { path: design.entryPath },
        );
      }
      if (p.typeName !== "Boolean" && p.typeName !== "Bool") {
        throw new PdlError(
          "PDL-E010",
          `Bare \`if ${paramName}\` requires a Boolean parameter (got type ${p.typeName}); use \`${paramName} == …\` for variants`,
          { path: design.entryPath },
        );
      }
      return;
    }
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
      const rhsRaw = expr.rhs.startsWith(".") ? expr.rhs.slice(1) : expr.rhs;
      if (p.typeName === "Boolean" || p.typeName === "Bool") {
        if (rhsRaw !== "true" && rhsRaw !== "false") {
          throw new PdlError(
            "PDL-E010",
            `Boolean condition on \`${paramName}\` expected \`true\` / \`false\` (or \`.true\` / \`.false\`)`,
            { path: design.entryPath },
          );
        }
        return;
      }
      const vdecl = design.variants.get(p.typeName);
      if (!vdecl) {
        throw new PdlError(
          "PDL-E010",
          `Condition compares non-variant parameter \`${paramName}\` (type ${p.typeName}); \`if\` conditions must use a variant-typed parameter`,
          { path: design.entryPath },
        );
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

function collectUniqueFrameIdsFromBody(
  items: FrameBodyItem[],
  seen: Set<string>,
  componentName: string,
  design: DesignDefinition,
): void {
  for (const it of items) {
    switch (it.kind) {
      case "let": {
        if (seen.has(it.id)) {
          throw new PdlError(
            "PDL-E021",
            `Duplicate frame id \`${it.id}\` in component ${componentName} (\`let\` / \`letInstance\` names must be unique across the whole component body, including all \`if\` branches)`,
            { path: design.entryPath },
          );
        }
        seen.add(it.id);
        collectUniqueFrameIdsFromBody(it.body, seen, componentName, design);
        break;
      }
      case "letInstance": {
        if (seen.has(it.id)) {
          throw new PdlError(
            "PDL-E021",
            `Duplicate frame id \`${it.id}\` in component ${componentName} (\`let\` / \`letInstance\` names must be unique across the whole component body, including all \`if\` branches)`,
            { path: design.entryPath },
          );
        }
        seen.add(it.id);
        break;
      }
      case "if": {
        for (const br of it.chain.branches) collectUniqueFrameIdsFromBody(br.body, seen, componentName, design);
        if (it.chain.elseBody) collectUniqueFrameIdsFromBody(it.chain.elseBody, seen, componentName, design);
        break;
      }
      default:
        break;
    }
  }
}

function validateCompanionSymbols(design: DesignDefinition): void {
  for (const name of design.usage.keys()) {
    if (!design.components.has(name)) {
      throw new PdlError("PDL-E037", `usage references unknown component \`${name}\``, { path: design.entryPath });
    }
  }
  for (const name of design.fixtures.keys()) {
    if (!design.components.has(name)) {
      throw new PdlError("PDL-E037", `fixtures references unknown component \`${name}\``, { path: design.entryPath });
    }
  }
  for (const name of design.rules.keys()) {
    if (!design.components.has(name)) {
      throw new PdlError("PDL-E037", `rules references unknown component \`${name}\``, { path: design.entryPath });
    }
  }
  for (const name of design.interactions.keys()) {
    if (!design.components.has(name)) {
      throw new PdlError("PDL-E037", `interaction targets unknown component \`${name}\``, { path: design.entryPath });
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

function tokenTypeOf(design: DesignDefinition, name: string): string | undefined {
  return design.primitives.get(name)?.tokenType ?? design.semantics.get(name)?.tokenType;
}

/** Ensure `@` opacity sides are numbers or Opacity tokens (nested in composites). */
function validateOpacitySides(design: DesignDefinition, expr: ValueExpr): void {
  switch (expr.kind) {
    case "opacityOf": {
      validateOpacitySides(design, expr.base);
      if (expr.opacity.kind === "number") {
        if (expr.opacity.value < 0 || expr.opacity.value > 1) {
          throw new PdlError(
            "PDL-E005",
            `Opacity side of \`@\` must be a number in 0…1 (got ${expr.opacity.value})`,
            { path: design.entryPath },
          );
        }
        return;
      }
      if (expr.opacity.kind === "ident") {
        const refType = tokenTypeOf(design, expr.opacity.name);
        if (!refType) {
          throw new PdlError("PDL-E007", `Unresolved identifier ${expr.opacity.name}`, {
            path: design.entryPath,
          });
        }
        if (refType !== "Opacity") {
          throw new PdlError(
            "PDL-E005",
            `Opacity side of \`@\` must be an Opacity token or number (got \`${expr.opacity.name}\` of type ${refType})`,
            { path: design.entryPath },
          );
        }
        return;
      }
      throw new PdlError("PDL-E005", "Opacity side of `@` must be an Opacity token or number", {
        path: design.entryPath,
      });
    }
    case "array":
      for (const item of expr.items) validateOpacitySides(design, item);
      return;
    case "corner":
      for (const side of [expr.tl, expr.tr, expr.br, expr.bl]) validateOpacitySides(design, side);
      return;
    case "shadow":
      validateOpacitySides(design, expr.x);
      validateOpacitySides(design, expr.y);
      validateOpacitySides(design, expr.blurRadius);
      validateOpacitySides(design, expr.color);
      if (expr.spread) validateOpacitySides(design, expr.spread);
      return;
    case "edgeInsets":
      for (const v of Object.values(expr.fields)) validateOpacitySides(design, v);
      return;
    case "transition":
      validateOpacitySides(design, expr.duration);
      validateOpacitySides(design, expr.easing);
      if (expr.delay) validateOpacitySides(design, expr.delay);
      return;
    case "call":
      for (const v of Object.values(expr.args)) validateOpacitySides(design, v);
      return;
    case "rampInline":
      for (const s of expr.stops) validateOpacitySides(design, s);
      return;
    case "gradientStop":
      for (const v of Object.values(expr.fields)) validateOpacitySides(design, v);
      return;
    default:
      return;
  }
}

/** Expected shape description for error messages (full-spec §23.2). */
function tokenRhsExpectation(tokenType: string): string {
  switch (tokenType) {
    case "Color":
      return "a #hex color (or color @ opacity)";
    case "Opacity":
      return "a number in 0…1";
    case "Distance":
    case "Radius":
      return "a non-negative number";
    case "Shadow":
      return "`Shadow(x:, y:, blurRadius:, color: [, spread:])`";
    case "Size":
    case "Weight":
      return "a number";
    case "LineHeight":
      return "a positive number (unitless ratio, e.g. `1.35`)";
    case "LetterSpacing":
      return "a number (em units, e.g. `0.01` or `-0.02`)";
    case "Ratio":
      return "a positive number or `W:H` ratio sugar (e.g. `16:9`)";
    case "Duration":
    case "Blur":
      return "a non-negative number";
    case "FontFamily":
    case "Icon":
    case "MediaSource":
    case "Easing":
      return "a string";
    case "Transition":
      return "a transition tuple `(duration: …, easing: …)`";
    case "Vibrancy":
      return "a vibrancy tuple `(saturation: …, brightness: …)`";
    case "Ramp":
      return "a ramp literal `(direction: …, stops: […])`";
    case "Sizing":
      return "a sizing literal (`.hug` / `Sizing.hug`, `.fill`, `.fixed(n)`, `.flex(…)`)";
    case "Background":
    case "Foreground":
      return "a color, layer list `[…]`, or layer constructor";
    default:
      return `a value compatible with ${tokenType}`;
  }
}

/** Token types that evaluate to a scalar number (valid on Shadow axes). */
const SHADOW_AXIS_TOKEN_TYPES = new Set([
  "Distance",
  "Radius",
  "Size",
  "Weight",
  "Ratio",
  "Duration",
  "Blur",
]);

/** Shadow axis: number literal or numeric token ident; optional non-negative for blurRadius. */
function assertShadowAxisField(
  design: DesignDefinition,
  tokenName: string,
  field: string,
  expr: ValueExpr,
  opts?: { nonNegative?: boolean },
): void {
  if (expr.kind === "ident") {
    const ref = expr.name;
    const refType = tokenTypeOf(design, ref);
    if (!refType) {
      throw new PdlError("PDL-E007", `Unresolved identifier ${ref}`, { path: design.entryPath });
    }
    if (!SHADOW_AXIS_TOKEN_TYPES.has(refType)) {
      throw new PdlError(
        "PDL-E005",
        `Shadow \`${tokenName}\` field \`${field}\` must be a number or numeric token (Distance, Radius, Size, …); \`${ref}\` has type ${refType}`,
        { path: design.entryPath },
      );
    }
    return;
  }
  if (expr.kind === "number") {
    if (opts?.nonNegative && expr.value < 0) {
      throw new PdlError(
        "PDL-E005",
        `Shadow \`${tokenName}\` field \`${field}\` must be a non-negative number`,
        { path: design.entryPath },
      );
    }
    return;
  }
  throw new PdlError(
    "PDL-E005",
    `Shadow \`${tokenName}\` field \`${field}\` must be a number (got ${expr.kind})`,
    { path: design.entryPath },
  );
}

/** Shadow color: #hex, color @ opacity, or Color token ident. */
function assertShadowColorField(
  design: DesignDefinition,
  tokenName: string,
  expr: ValueExpr,
): void {
  if (expr.kind === "hex" || expr.kind === "opacityOf") return;
  if (expr.kind === "ident") {
    const ref = expr.name;
    const refType = tokenTypeOf(design, ref);
    if (!refType) {
      throw new PdlError("PDL-E007", `Unresolved identifier ${ref}`, { path: design.entryPath });
    }
    if (refType !== "Color") {
      throw new PdlError(
        "PDL-E005",
        `Shadow \`${tokenName}\` field \`color\` must be a Color; \`${ref}\` has type ${refType}`,
        { path: design.entryPath },
      );
    }
    return;
  }
  throw new PdlError(
    "PDL-E005",
    `Shadow \`${tokenName}\` field \`color\` must be a Color (#hex, color @ opacity, or Color token) (got ${expr.kind})`,
    { path: design.entryPath },
  );
}

function assertShadowConstructorFields(
  design: DesignDefinition,
  tokenName: string,
  value: Extract<ValueExpr, { kind: "shadow" }>,
): void {
  assertShadowAxisField(design, tokenName, "x", value.x);
  assertShadowAxisField(design, tokenName, "y", value.y);
  assertShadowAxisField(design, tokenName, "blurRadius", value.blurRadius, { nonNegative: true });
  if (value.spread) assertShadowAxisField(design, tokenName, "spread", value.spread);
  assertShadowColorField(design, tokenName, value.color);
}

/**
 * Full-spec §23.2: one gate for every TokenType RHS shape.
 * Bare `ident` is accepted here; primitive/semantic alias rules run separately.
 */
function assertTokenRhsCompatible(
  design: DesignDefinition,
  name: string,
  tokenType: string,
  value: ValueExpr,
): void {
  if (value.kind === "null") {
    throw new PdlError(
      "PDL-E005",
      `Token \`${name}\` has type ${tokenType} and must be ${tokenRhsExpectation(tokenType)} (got null); \`null\` unsets frame properties, not token values`,
      { path: design.entryPath },
    );
  }
  if (value.kind === "ident") return;

  if (tokenType === "Radius" && value.kind === "corner") {
    throw new PdlError(
      "PDL-E005",
      `Token \`${name}\` has type Radius and must be a number (or Radius token alias on \`semantic\`); \`Corner(…)\` belongs on frame \`cornerRadius\`, not on tokens`,
      { path: design.entryPath },
    );
  }
  if (tokenType === "Shadow" && value.kind !== "shadow") {
    throw new PdlError(
      "PDL-E005",
      `Token \`${name}\` has type Shadow and must be \`Shadow(x:, y:, blurRadius:, color: [, spread:])\` (or a Shadow token alias on \`semantic\`); CSS box-shadow strings are not valid`,
      { path: design.entryPath },
    );
  }

  const ok = ((): boolean => {
    switch (tokenType) {
      case "Color":
        return value.kind === "hex" || value.kind === "opacityOf";
      case "Opacity":
        return value.kind === "number" && value.value >= 0 && value.value <= 1;
      case "Distance":
      case "Radius":
        return value.kind === "number" && value.value >= 0;
      case "Shadow":
        return value.kind === "shadow";
      case "Size":
      case "Weight":
        return value.kind === "number";
      case "LineHeight":
        return value.kind === "number" && value.value > 0;
      case "LetterSpacing":
        return value.kind === "number";
      case "Ratio":
        return (
          (value.kind === "number" && value.value > 0) ||
          (value.kind === "ratio" && value.width > 0 && value.height > 0)
        );
      case "Duration":
      case "Blur":
        return value.kind === "number" && value.value >= 0;
      case "FontFamily":
      case "Icon":
      case "MediaSource":
      case "Easing":
        return value.kind === "string";
      case "Transition":
        return value.kind === "transition";
      case "Vibrancy":
        return value.kind === "vibrancyTuple";
      case "Ramp":
        return value.kind === "rampInline";
      case "Sizing":
        return value.kind === "sizing";
      case "Background":
      case "Foreground":
        return (
          value.kind === "hex" ||
          value.kind === "opacityOf" ||
          value.kind === "array" ||
          value.kind === "call"
        );
      default:
        return false;
    }
  })();

  if (!ok) {
    const detail =
      tokenType === "Opacity" && value.kind === "number"
        ? " (out of range 0…1)"
        : (tokenType === "Distance" ||
              tokenType === "Radius" ||
              tokenType === "Duration" ||
              tokenType === "Blur") &&
            value.kind === "number"
          ? " (must be non-negative)"
          : ` (got ${value.kind})`;
    throw new PdlError(
      "PDL-E005",
      `Token \`${name}\` has type ${tokenType} and must be ${tokenRhsExpectation(tokenType)}${detail}`,
      { path: design.entryPath },
    );
  }

  if (tokenType === "Shadow" && value.kind === "shadow") {
    assertShadowConstructorFields(design, name, value);
  }
  if ((tokenType === "Background" || tokenType === "Foreground") && ok) {
    try {
      assertLayerStackValue(design, value, `Token \`${name}\``);
    } catch (e) {
      if (e instanceof PdlError && e.code === "PDL-E006") {
        throw new PdlError("PDL-E005", e.message, { path: design.entryPath });
      }
      throw e;
    }
  }
}

function validateTokenDeclarations(design: DesignDefinition): void {
  for (const [name, p] of design.primitives) {
    assertTokenRhsCompatible(design, name, p.tokenType, p.value);
    if (p.value.kind === "ident") {
      const ref = p.value.name;
      const refType = tokenTypeOf(design, ref);
      throw new PdlError(
        "PDL-E005",
        refType
          ? `Primitive \`${name}\` must use a literal value (cannot reference token \`${ref}\` of type ${refType}); use \`semantic\` to alias tokens`
          : `Primitive \`${name}\` must use a literal value (cannot reference \`${ref}\`); use \`semantic\` to alias tokens`,
        { path: design.entryPath },
      );
    }
    validateOpacitySides(design, p.value);
  }
  for (const [name, s] of design.semantics) {
    assertTokenRhsCompatible(design, name, s.tokenType, s.value);
    if (s.value.kind === "ident") {
      const ref = s.value.name;
      const refType = tokenTypeOf(design, ref);
      if (!refType) {
        throw new PdlError("PDL-E007", `Unresolved identifier ${ref}`, { path: design.entryPath });
      }
      if (refType !== s.tokenType) {
        throw new PdlError(
          "PDL-E005",
          `Token \`${name}\` has type ${s.tokenType} but references \`${ref}\` of type ${refType}`,
          { path: design.entryPath },
        );
      }
    }
    validateOpacitySides(design, s.value);
  }
}

/** Semantic checks on merged design (after parse + import merge). */
export function validateMergedDesign(design: DesignDefinition): void {
  validateCompanionSymbols(design);
  validateTokenDeclarations(design);
  validateTypeStyleProps(design);
  for (const c of design.components.values()) {
    collectUniqueFrameIdsFromBody(c.body, new Set(), c.name, design);
    const paramByName = new Map(c.params.map((p) => [p.name, { typeName: p.typeName }]));
    validateIfConditionsInBody(design, c.body, paramByName, c.name);
    const letKinds = collectLetFrameKinds(c.body);
    validateHiddenInBody(design, c.body, paramByName, c.name, c.rootKind, letKinds);
    validateFramePropsInBody(design, c.body, c.name, c.rootKind, letKinds);
    validateFixturesForComponent(design, c.name);
    validateInteractionsForComponent(design, c.name);
    validateRulesForComponent(design, c.name);
  }
}
