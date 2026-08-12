import type {
  ComponentDecl,
  FrameBodyItem,
  InteractionHandlerItem,
  RulesStatement,
  ValueExpr,
} from "./ast.js";
import type { DesignDefinition } from "./designModel.js";
import {
  isHttpUrl,
  isPackRelativeFilePath,
  mediaKindForFormat,
  normalizeIconSystemName,
  normalizeMediaFormatName,
  normalizeMediaKindName,
} from "./assetRefs.js";
import { validateConditionExpr } from "./conditions.js";
import { PdlError } from "./errors.js";
import {
  assertBlurCallCompatible,
  assertLayerStackValue,
  assertVibrancyCallCompatible,
  validateFramePropsInBody,
  validateTypeStyleProps,
} from "./frameProps.js";
import {
  assertParamValueCompatible,
  validateComponentParamDefaults,
  validateParamBindingsInBody,
} from "./paramBindings.js";
import {
  hostEnumCases,
  isBuiltinParamType,
  unwrapParamTypeName,
} from "./paramTypes.js";

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
      const fk =
        item.frame === "self"
          ? design.components.get(componentName)?.rootKind
          : letKinds.get(item.frame);
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

function assertUniqueLetId(
  id: string,
  frameIds: Set<string>,
  valueIds: Set<string>,
  componentName: string,
  design: DesignDefinition,
): void {
  if (frameIds.has(id) || valueIds.has(id)) {
    throw new PdlError(
      "PDL-E021",
      `Duplicate id \`${id}\` in component ${componentName} (\`let\` / \`letInstance\` / value \`let\` names must be unique across the whole component body, including all \`if\` branches)`,
      { path: design.entryPath },
    );
  }
}

/** Collect frame `let` / `letInstance` ids and typed value `let` ids (separate sets). */
function collectUniqueFrameIdsFromBody(
  items: FrameBodyItem[],
  frameIds: Set<string>,
  componentName: string,
  design: DesignDefinition,
  valueIds: Set<string> = new Set(),
): void {
  for (const it of items) {
    switch (it.kind) {
      case "let": {
        assertUniqueLetId(it.id, frameIds, valueIds, componentName, design);
        frameIds.add(it.id);
        collectUniqueFrameIdsFromBody(it.body, frameIds, componentName, design, valueIds);
        break;
      }
      case "letInstance": {
        assertUniqueLetId(it.id, frameIds, valueIds, componentName, design);
        frameIds.add(it.id);
        break;
      }
      case "letValue": {
        assertUniqueLetId(it.id, frameIds, valueIds, componentName, design);
        valueIds.add(it.id);
        break;
      }
      case "if": {
        for (const br of it.chain.branches) {
          collectUniqueFrameIdsFromBody(br.body, frameIds, componentName, design, valueIds);
        }
        if (it.chain.elseBody) {
          collectUniqueFrameIdsFromBody(it.chain.elseBody, frameIds, componentName, design, valueIds);
        }
        break;
      }
      default:
        break;
    }
  }
}

function validateLetValuesInBody(
  design: DesignDefinition,
  items: FrameBodyItem[],
  callerParams: Map<string, string>,
  componentName: string,
): void {
  for (const it of items) {
    switch (it.kind) {
      case "letValue": {
        if (
          !isBuiltinParamType(it.typeName) &&
          !design.variants.has(it.typeName)
        ) {
          throw new PdlError(
            "PDL-E039",
            `Unknown value-let type \`${it.typeName}\` in component ${componentName}`,
            { path: design.entryPath },
          );
        }
        assertParamValueCompatible(
          design,
          it.typeName,
          it.value,
          callerParams,
          `for value let \`${it.id}\` (component ${componentName})`,
        );
        break;
      }
      case "let":
        validateLetValuesInBody(design, it.body, callerParams, componentName);
        break;
      case "if":
        for (const br of it.chain.branches) {
          validateLetValuesInBody(design, br.body, callerParams, componentName);
        }
        if (it.chain.elseBody) {
          validateLetValuesInBody(design, it.chain.elseBody, callerParams, componentName);
        }
        break;
      default:
        break;
    }
  }
}

/**
 * § Forward visibility / PDL-E019: `let` / `letInstance` must appear earlier in source
 * order than any `children` frame-id ref or `FrameId.prop` that names it.
 * Component params (including slots) may appear without a prior `let`.
 * Ids that are never declared in the component are left to other validators (e.g. PDL-E012).
 */
function assertForwardFrameVisibility(
  design: DesignDefinition,
  items: FrameBodyItem[],
  declared: Set<string>,
  allFrameIds: Set<string>,
  paramNames: Set<string>,
  componentName: string,
  valueLetIds: Set<string> = new Set(),
): void {
  const requireDeclared = (id: string, context: string) => {
    if (declared.has(id) || paramNames.has(id)) return;
    if (!allFrameIds.has(id)) return;
    throw new PdlError(
      "PDL-E019",
      `Frame \`${id}\` is referenced ${context} before it is declared with \`let\` (component ${componentName}) — declare frames before assigning \`children\` or \`FrameId.prop\``,
      { path: design.entryPath },
    );
  };

  for (const it of items) {
    switch (it.kind) {
      case "children": {
        if (it.target !== "root") {
          requireDeclared(it.target.letId, `as \`${it.target.letId}.children\``);
        }
        for (const entry of it.entries) {
          if (entry.kind === "frameRef") {
            if (valueLetIds.has(entry.id)) {
              throw new PdlError(
                "PDL-E007",
                `Cannot mount value let \`${entry.id}\` in children (component ${componentName}) — value lets are for props/layers, not the child tree`,
                { path: design.entryPath },
              );
            }
            requireDeclared(entry.id, `in a children list`);
          }
        }
        break;
      }
      case "frameProp":
        // `self.prop` targets the enclosing component root — not a `let` id.
        if (it.frame !== "self") {
          requireDeclared(it.frame, `in \`${it.frame}.${it.name}\``);
        }
        break;
      case "let":
        declared.add(it.id);
        assertForwardFrameVisibility(
          design,
          it.body,
          declared,
          allFrameIds,
          paramNames,
          componentName,
          valueLetIds,
        );
        break;
      case "letInstance":
        declared.add(it.id);
        break;
      case "if":
        for (const br of it.chain.branches) {
          assertForwardFrameVisibility(
            design,
            br.body,
            declared,
            allFrameIds,
            paramNames,
            componentName,
            valueLetIds,
          );
        }
        if (it.chain.elseBody) {
          assertForwardFrameVisibility(
            design,
            it.chain.elseBody,
            declared,
            allFrameIds,
            paramNames,
            componentName,
            valueLetIds,
          );
        }
        break;
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
  const callerParams = new Map(c.params.map((p) => [p.name, p.typeName]));
  for (const ex of fm.values()) {
    for (const b of ex.bindings) {
      const p = pmap.get(b.name);
      if (!p) {
        throw new PdlError(
          "PDL-E007",
          `Unknown parameter \`${b.name}\` in fixture "${ex.label}" (component ${componentName})`,
          { path: design.entryPath },
        );
      }
      assertParamValueCompatible(
        design,
        p.typeName,
        b.value,
        callerParams,
        `in fixture "${ex.label}" for \`${componentName}.${b.name}\``,
      );
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
      return "a non-negative number";
    case "Blur":
      return "`Blur(radius: … [, style:] [, vibrancy:])` (radius is a Radius / number — not a bare number token)";
    case "FontFamily":
    case "Easing":
      return "a string";
    case "Icon":
      return '`IconRef(file: "…")`, `IconRef(system: .sfSymbols|.materialSymbols, name: "…")`, or a pack-relative path string';
    case "MediaSource":
      return '`MediaSource(file: "…" [, kind:, format:])`, `MediaSource(url: "…" [, kind:, format:])`, an http(s) URL, or a pack-relative path string';
    case "Transition":
      return "a transition tuple `(duration: …, easing: …)`";
    case "Vibrancy":
      return "`Vibrancy(saturation: …, brightness: …)`";
    case "Ramp":
      return "a ramp literal `(direction: …, stops: […])` or `Ramp(…)`";
    case "Sizing":
      return "a sizing literal (`.hug` / `Sizing.hug`, `.fill`, `.fixed(n)`, `.flex(…)`, `.aspect(16:9)`)";
    case "Background":
    case "Foreground":
      return "a color, layer list `[…]`, or layer constructor";
    case "EdgeInsets":
      return "`EdgeInsets(x:, y:)` or `EdgeInsets(top:, right:, bottom:, left:)`";
    case "CornerRadii":
      return "`Corner(tl:, tr:, br:, bl:)`";
    case "GradientStop":
      return "`GradientStop(…)`";
    case "Media":
      return "`MediaLayer(source:, contentMode: …)`";
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

function assertIconRefFields(
  design: DesignDefinition,
  tokenName: string,
  value: Extract<ValueExpr, { kind: "iconRef" }>,
): void {
  if (value.source === "file") {
    if (value.path.kind !== "string" || !isPackRelativeFilePath(value.path.value)) {
      const got = value.path.kind === "string" ? value.path.value : value.path.kind;
      const hint =
        value.path.kind === "string" && value.path.value.startsWith("/")
          ? " — no leading `/` (pack-relative, not site root)"
          : "";
      throw new PdlError(
        "PDL-E005",
        `Icon \`${tokenName}\` file path must be pack-relative (e.g. \`icons/star.svg\`); got \`${got}\`${hint}`,
        { path: design.entryPath },
      );
    }
    return;
  }
  if (value.name.kind !== "string" || value.name.value.length === 0) {
    throw new PdlError(
      "PDL-E005",
      `Icon \`${tokenName}\` system ref requires a non-empty name string`,
      { path: design.entryPath },
    );
  }
  const sysRaw =
    value.system.kind === "dotEnum"
      ? value.system.value
      : value.system.kind === "ident"
        ? value.system.name
        : value.system.kind === "string"
          ? value.system.value
          : "";
  if (!normalizeIconSystemName(sysRaw)) {
    throw new PdlError(
      "PDL-E006",
      `Icon \`${tokenName}\` unknown system (expected .sfSymbols or .materialSymbols)`,
      { path: design.entryPath },
    );
  }
}

function assertMediaSourceMetaFields(
  design: DesignDefinition,
  tokenName: string,
  value: Extract<ValueExpr, { kind: "mediaSourceRef" }>,
): void {
  if (value.mediaKind !== undefined) {
    if (value.mediaKind.kind !== "dotEnum" && value.mediaKind.kind !== "ident") {
      throw new PdlError(
        "PDL-E006",
        `MediaSource \`${tokenName}\` kind must be .raster, .vector, or .video`,
        { path: design.entryPath },
      );
    }
    const raw =
      value.mediaKind.kind === "dotEnum" ? value.mediaKind.value : value.mediaKind.name;
    if (!normalizeMediaKindName(raw)) {
      throw new PdlError(
        "PDL-E006",
        `MediaSource \`${tokenName}\` unknown kind \`${raw}\` (expected .raster, .vector, or .video)`,
        { path: design.entryPath },
      );
    }
  }
  if (value.format !== undefined) {
    if (value.format.kind !== "dotEnum" && value.format.kind !== "ident") {
      throw new PdlError(
        "PDL-E006",
        `MediaSource \`${tokenName}\` format must be a closed case (.webp|.jpeg|.png|.gif|.svg|.mp4|.webm|.pdf)`,
        { path: design.entryPath },
      );
    }
    const raw = value.format.kind === "dotEnum" ? value.format.value : value.format.name;
    if (!normalizeMediaFormatName(raw)) {
      throw new PdlError(
        "PDL-E006",
        `MediaSource \`${tokenName}\` unknown format \`${raw}\``,
        { path: design.entryPath },
      );
    }
  }
  const mk = value.mediaKind
    ? normalizeMediaKindName(
        value.mediaKind.kind === "dotEnum" ? value.mediaKind.value : value.mediaKind.name,
      )
    : undefined;
  const fmt = value.format
    ? normalizeMediaFormatName(
        value.format.kind === "dotEnum" ? value.format.value : value.format.name,
      )
    : undefined;
  if (mk && fmt && mediaKindForFormat(fmt) !== mk) {
    throw new PdlError(
      "PDL-E006",
      `MediaSource \`${tokenName}\` kind \`.${mk}\` is incompatible with format \`.${fmt}\` (expected \`.${mediaKindForFormat(fmt)}\`)`,
      { path: design.entryPath },
    );
  }
}

function assertMediaSourceRefFields(
  design: DesignDefinition,
  tokenName: string,
  value: Extract<ValueExpr, { kind: "mediaSourceRef" }>,
): void {
  assertMediaSourceMetaFields(design, tokenName, value);
  if (value.source === "file") {
    if (value.path.kind !== "string" || !isPackRelativeFilePath(value.path.value)) {
      throw new PdlError(
        "PDL-E005",
        `MediaSource \`${tokenName}\` file path must be a pack-relative string (e.g. \`media/hero.jpg\`)`,
        { path: design.entryPath },
      );
    }
    return;
  }
  if (value.url.kind !== "string" || !isHttpUrl(value.url.value)) {
    throw new PdlError(
      "PDL-E005",
      `MediaSource \`${tokenName}\` url must be an http(s) string`,
      { path: design.entryPath },
    );
  }
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
        return value.kind === "number" && value.value >= 0;
      case "Blur":
        return value.kind === "call" && value.callee === "Blur";
      case "FontFamily":
      case "Easing":
        return value.kind === "string" || value.kind === "dotEnum";
      case "Icon":
        if (value.kind === "iconRef") return true;
        return value.kind === "string" && isPackRelativeFilePath(value.value);
      case "MediaSource":
        if (value.kind === "mediaSourceRef") return true;
        return (
          value.kind === "string" &&
          (isHttpUrl(value.value) || isPackRelativeFilePath(value.value))
        );
      case "Transition":
        return value.kind === "transition";
      case "Vibrancy":
        return value.kind === "call" && value.callee === "Vibrancy";
      case "Ramp":
        return (
          value.kind === "rampInline" ||
          (value.kind === "call" && value.callee === "Ramp")
        );
      case "Sizing":
        if (value.kind === "sizing") return true;
        // Bare `.hug` / `.fill` parse as dotEnum (same spelling as ContentMode.fill).
        if (value.kind === "dotEnum") {
          const c = value.value.startsWith(".") ? value.value.slice(1) : value.value;
          return c === "hug" || c === "fill";
        }
        return false;
      case "Background":
      case "Foreground":
        return (
          value.kind === "hex" ||
          value.kind === "opacityOf" ||
          value.kind === "array" ||
          value.kind === "call"
        );
      case "EdgeInsets":
        return value.kind === "edgeInsets";
      case "CornerRadii":
        return value.kind === "corner";
      case "GradientStop":
        return value.kind === "gradientStop";
      case "Media":
        return value.kind === "call" && value.callee === "MediaLayer";
      default: {
        // Host enums as token types (rare): `.case`
        const cases = hostEnumCases(tokenType);
        if (cases && value.kind === "dotEnum") {
          const c = value.value.startsWith(".") ? value.value.slice(1) : value.value;
          return cases.includes(c);
        }
        return false;
      }
    }
  })();

  if (!ok) {
    let detail =
      tokenType === "Opacity" && value.kind === "number"
        ? " (out of range 0…1)"
        : tokenType === "Blur" && value.kind === "number"
          ? " (use `Blur(radius: n)` — Blur is the layer object; radius amounts use Radius)"
          : (tokenType === "Distance" ||
                tokenType === "Radius" ||
                tokenType === "Duration") &&
              value.kind === "number"
            ? " (must be non-negative)"
            : ` (got ${value.kind})`;
    if (
      tokenType === "Icon" &&
      value.kind === "string" &&
      value.value.startsWith("/")
    ) {
      detail =
        ` (got \`${value.value}\` — pack-relative Icon paths must not start with \`/\`; use \`icons/star.svg\`)`;
    } else if (
      tokenType === "Icon" &&
      value.kind === "string" &&
      !isPackRelativeFilePath(value.value)
    ) {
      detail = ` (got \`${value.value}\` — bare names are ambiguous; use \`IconRef(system: .sfSymbols, name: "…")\` or a pack path like \`icons/star.svg\`)`;
    }
    throw new PdlError(
      "PDL-E005",
      `Token \`${name}\` has type ${tokenType} and must be ${tokenRhsExpectation(tokenType)}${detail}`,
      { path: design.entryPath },
    );
  }

  if (tokenType === "Shadow" && value.kind === "shadow") {
    assertShadowConstructorFields(design, name, value);
  }
  if (tokenType === "Blur" && value.kind === "call" && value.callee === "Blur") {
    try {
      assertBlurCallCompatible(design, value.args, `Token \`${name}\``);
    } catch (e) {
      if (e instanceof PdlError && (e.code === "PDL-E040" || e.code === "PDL-E020")) {
        throw new PdlError("PDL-E005", e.message, { path: design.entryPath });
      }
      throw e;
    }
  }
  if (tokenType === "Vibrancy" && value.kind === "call" && value.callee === "Vibrancy") {
    try {
      assertVibrancyCallCompatible(design, value.args, `Token \`${name}\``);
    } catch (e) {
      if (e instanceof PdlError && (e.code === "PDL-E040" || e.code === "PDL-E020")) {
        throw new PdlError("PDL-E005", e.message, { path: design.entryPath });
      }
      throw e;
    }
  }
  if (tokenType === "Vibrancy" && value.kind === "vibrancyTuple") {
    throw new PdlError(
      "PDL-E005",
      `Token \`${name}\` has type Vibrancy and must be \`Vibrancy(saturation: …, brightness: …)\` — naked \`(saturation:, brightness:)\` tuples are not typed Vibrancy values`,
      { path: design.entryPath },
    );
  }
  if (tokenType === "Icon" && value.kind === "iconRef") {
    assertIconRefFields(design, name, value);
  }
  if (tokenType === "MediaSource" && value.kind === "mediaSourceRef") {
    assertMediaSourceRefFields(design, name, value);
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

function unknownParamTypeMessage(typeName: string, where: string): string {
  if (typeName === "Boolean") {
    return `Unknown parameter type \`Boolean\` ${where}; use \`Bool\``;
  }
  return `Unknown parameter type \`${typeName}\` ${where} (expected a built-in type, declared variant, or component)`;
}

function assertKnownParamType(
  design: DesignDefinition,
  typeName: string,
  where: string,
): void {
  const name = unwrapParamTypeName(typeName);
  if (
    isBuiltinParamType(name) ||
    design.variants.has(name) ||
    design.components.has(name)
  ) {
    return;
  }
  throw new PdlError("PDL-E039", unknownParamTypeMessage(name, where), {
    path: design.entryPath,
  });
}

function validateComponentParamTypes(design: DesignDefinition): void {
  for (const c of design.components.values()) {
    for (const p of c.params) {
      assertKnownParamType(design, p.typeName, `on component \`${c.name}\` parameter \`${p.name}\``);
    }
  }
}

/** Semantic checks on merged design (after parse + import merge). */
export function validateMergedDesign(design: DesignDefinition): void {
  validateCompanionSymbols(design);
  validateTokenDeclarations(design);
  validateTypeStyleProps(design);
  validateComponentParamTypes(design);
  validateComponentParamDefaults(design);
  for (const c of design.components.values()) {
    const allFrameIds = new Set<string>();
    const valueLetIds = new Set<string>();
    collectUniqueFrameIdsFromBody(c.body, allFrameIds, c.name, design, valueLetIds);
    const paramByName = new Map(c.params.map((p) => [p.name, { typeName: p.typeName }]));
    const callerParams = new Map(c.params.map((p) => [p.name, p.typeName]));
    const paramNames = new Set(c.params.map((p) => p.name));
    assertForwardFrameVisibility(
      design,
      c.body,
      new Set(),
      allFrameIds,
      paramNames,
      c.name,
      valueLetIds,
    );
    validateIfConditionsInBody(design, c.body, paramByName, c.name);
    const letKinds = collectLetFrameKinds(c.body);
    validateHiddenInBody(design, c.body, paramByName, c.name, c.rootKind, letKinds);
    validateFramePropsInBody(design, c.body, c.name, c.rootKind, letKinds);
    validateLetValuesInBody(design, c.body, callerParams, c.name);
    validateParamBindingsInBody(design, c.body, callerParams, c.name);
    validateFixturesForComponent(design, c.name);
    validateInteractionsForComponent(design, c.name);
    validateRulesForComponent(design, c.name);
  }
}
