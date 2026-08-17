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
  assertEffectValue,
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
import { isMotionPropName } from "./motionProps.js";
import { splitSamplePath } from "./samples.js";

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
    if (ex.host) {
      const hosts = design.hosts;
      if (!hosts?.has(ex.host)) {
        throw new PdlError("PDL-E046", `Unknown host profile \`${ex.host}\``, {
          path: design.entryPath,
        });
      }
    }
    if (ex.theme) {
      if (design.catalogs?.has(ex.theme)) {
        throw new PdlError(
          "PDL-E049",
          `\`${ex.theme}\` is a catalog, not a theme; fixture "${ex.label}" cannot set theme to a catalog`,
          { path: design.entryPath },
        );
      }
      if (!design.themes.has(ex.theme)) {
        throw new PdlError("PDL-E005", `Unknown theme \`${ex.theme}\` in fixture "${ex.label}"`, {
          path: design.entryPath,
        });
      }
    }
    if (ex.hostFacts) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(ex.hostFacts);
      } catch (e) {
        throw new PdlError(
          "PDL-E050",
          `hostFacts in fixture "${ex.label}" is not valid JSON: ${e instanceof Error ? e.message : String(e)}`,
          { path: design.entryPath },
        );
      }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new PdlError(
          "PDL-E050",
          `hostFacts in fixture "${ex.label}" must be a JSON object`,
          { path: design.entryPath },
        );
      }
    }
    const letKinds = collectLetFrameKinds(c.body);
    for (const b of ex.bindings) {
      const dot = b.name.indexOf(".");
      const letId = dot === -1 ? b.name : b.name.slice(0, dot);
      const field = dot === -1 ? undefined : b.name.slice(dot + 1);
      if (letKinds.get(letId) === "presenter") {
        if (field && field !== "cover") {
          throw new PdlError(
            "PDL-E055",
            `Fixture "${ex.label}" unknown presenter field \`${field}\` (use \`${letId}\` for the stack or \`${letId}.cover\`)`,
            { path: design.entryPath },
          );
        }
        continue;
      }
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

function validateEaseValue(
  design: DesignDefinition,
  value: ValueExpr,
  where: string,
): void {
  if (value.kind === "easeBezier") return;
  if (value.kind === "dotEnum") {
    const raw = value.value.replace(/^\./, "");
    if (raw === "linear" || raw === "in" || raw === "out") return;
    throw new PdlError(
      "PDL-E005",
      `${where} must be \`.linear\`, \`.in\`, \`.out\`, or \`Ease.bezier(x1, y1, x2, y2)\``,
      { path: design.entryPath },
    );
  }
  if (value.kind === "ident") {
    const t = tokenTypeOf(design, value.name);
    if (t === "Ease") return;
    throw new PdlError(
      "PDL-E005",
      t ? `${where} must be an Ease (got ${t})` : `${where} must be an Ease (unknown \`${value.name}\`)`,
      { path: design.entryPath },
    );
  }
  if (value.kind === "string") {
    throw new PdlError(
      "PDL-E005",
      `${where} must be \`.linear\`, \`.in\`, \`.out\`, or \`Ease.bezier(x1, y1, x2, y2)\` — not a CSS string`,
      { path: design.entryPath },
    );
  }
  throw new PdlError(
    "PDL-E005",
    `${where} must be \`.linear\`, \`.in\`, \`.out\`, or \`Ease.bezier(x1, y1, x2, y2)\``,
    { path: design.entryPath },
  );
}

function validateTransitionValue(
  design: DesignDefinition,
  value: ValueExpr,
  where: string,
): void {
  if (value.kind === "timing") {
    validateEaseValue(design, value.ease, where);
    return;
  }
  if (value.kind === "ident") {
    const t = tokenTypeOf(design, value.name);
    if (t === "Timing") return;
    throw new PdlError(
      "PDL-E005",
      t
        ? `${where} must be a Timing (got ${t})`
        : `${where} must be a Timing token or \`Timing(…)\` (unknown \`${value.name}\`)`,
      { path: design.entryPath },
    );
  }
  throw new PdlError(
    "PDL-E005",
    `${where} must be a Timing token or \`Timing(duration:, ease: [, delay:])\``,
    { path: design.entryPath },
  );
}

function validatePoseValue(
  design: DesignDefinition,
  value: ValueExpr,
  componentName: string,
): void {
  if (value.kind === "ident") {
    const t = tokenTypeOf(design, value.name);
    if (t === "Pose") return;
    throw new PdlError(
      "PDL-E005",
      t
        ? `Motion \`pose:\` must be a Pose (got ${t}) in ${componentName}`
        : `Motion \`pose:\` must be a Pose (unknown \`${value.name}\`) in ${componentName}`,
      { path: design.entryPath },
    );
  }
  if (value.kind !== "pose") {
    throw new PdlError(
      "PDL-E005",
      `Motion \`pose:\` must be \`Pose(…)\` or a Pose token in ${componentName}`,
      { path: design.entryPath },
    );
  }
  for (const [key, field] of Object.entries(value.props)) {
    if (!isMotionPropName(key)) continue;
    if (field.kind === "number") {
      if (
        (key === "opacity" || key === "originX" || key === "originY") &&
        (field.value < 0 || field.value > 1)
      ) {
        throw new PdlError(
          "PDL-E005",
          `Pose \`${key}\` must be a number in 0…1 (got ${field.value}) in ${componentName}`,
          { path: design.entryPath },
        );
      }
      continue;
    }
    if (field.kind === "ident") continue;
    throw new PdlError(
      "PDL-E005",
      `Pose \`${key}\` must be a number in ${componentName}`,
      { path: design.entryPath },
    );
  }
}

function validateStaggerValue(
  design: DesignDefinition,
  value: ValueExpr,
  componentName: string,
): void {
  if (value.kind === "ident") {
    const t = tokenTypeOf(design, value.name);
    if (t === "Stagger") return;
    throw new PdlError(
      "PDL-E005",
      t
        ? `Motion \`stagger:\` must be a Stagger (got ${t}) in ${componentName}`
        : `Motion \`stagger:\` must be a Stagger (unknown \`${value.name}\`) in ${componentName}`,
      { path: design.entryPath },
    );
  }
  if (value.kind !== "stagger") {
    throw new PdlError(
      "PDL-E005",
      `Motion \`stagger:\` must be \`Stagger(…)\` or a Stagger token in ${componentName}`,
      { path: design.entryPath },
    );
  }
  const step = value.step;
  if (step.kind === "number") {
    if (step.value < 0) {
      throw new PdlError(
        "PDL-E005",
        `Stagger \`step:\` must be a non-negative Duration in ${componentName}`,
        { path: design.entryPath },
      );
    }
  } else if (step.kind === "ident") {
    const t = tokenTypeOf(design, step.name);
    if (t && t !== "Duration") {
      throw new PdlError(
        "PDL-E005",
        `Stagger \`step:\` must be a Duration (got ${t}) in ${componentName}`,
        { path: design.entryPath },
      );
    }
  } else {
    throw new PdlError(
      "PDL-E005",
      `Stagger \`step:\` must be a Duration / milliseconds in ${componentName}`,
      { path: design.entryPath },
    );
  }
}

function motionHasPose(design: DesignDefinition, value: ValueExpr): boolean {
  if (value.kind === "pose") return true;
  if (value.kind === "ident") return tokenTypeOf(design, value.name) === "Pose";
  return false;
}

function playName(value: ValueExpr): string | undefined {
  if (value.kind !== "dotEnum") return undefined;
  return value.value.replace(/^\./, "");
}

function validatePlayValue(design: DesignDefinition, value: ValueExpr, componentName: string): void {
  const name = playName(value);
  if (name === "toRest" || name === "toPose" || name === "loop") return;
  throw new PdlError(
    "PDL-E005",
    `Motion \`play:\` must be \`.toRest\`, \`.toPose\`, or \`.loop\` in ${componentName}`,
    { path: design.entryPath },
  );
}

function validateRepeatValue(design: DesignDefinition, value: ValueExpr, componentName: string): void {
  if (value.kind === "number") {
    if (!Number.isInteger(value.value) || value.value < 1) {
      throw new PdlError(
        "PDL-E005",
        `Motion \`repeat:\` must be an integer ≥ 1 (got ${value.value}) in ${componentName}`,
        { path: design.entryPath },
      );
    }
    return;
  }
  if (value.kind === "ident") return;
  throw new PdlError(
    "PDL-E005",
    `Motion \`repeat:\` must be a finite count in ${componentName}`,
    { path: design.entryPath },
  );
}

function validateKeyValue(design: DesignDefinition, value: ValueExpr, componentName: string): void {
  if (value.kind !== "key") {
    throw new PdlError(
      "PDL-E005",
      `Motion \`keys:\` entries must be \`Key(…)\` in ${componentName}`,
      { path: design.entryPath },
    );
  }
  const rest =
    value.pose.kind === "dotEnum" && value.pose.value.replace(/^\./, "") === "rest";
  if (!rest) validatePoseValue(design, value.pose, componentName);
  if (value.at.kind === "number" && (value.at.value < 0 || value.at.value > 1)) {
    throw new PdlError(
      "PDL-E005",
      `Key \`at:\` must be 0…1 (got ${value.at.value}) in ${componentName}`,
      { path: design.entryPath },
    );
  }
}

function validateKeysValue(design: DesignDefinition, value: ValueExpr, componentName: string): void {
  if (value.kind !== "array" || value.items.length === 0) {
    throw new PdlError(
      "PDL-E005",
      `Motion \`keys:\` must be a non-empty list of Key in ${componentName}`,
      { path: design.entryPath },
    );
  }
  for (const item of value.items) validateKeyValue(design, item, componentName);
}

function motionHasStagger(design: DesignDefinition, value: ValueExpr): boolean {
  if (value.kind === "stagger") return true;
  if (value.kind === "ident") return tokenTypeOf(design, value.name) === "Stagger";
  return false;
}

type MotionFields = {
  timing?: ValueExpr;
  pose?: ValueExpr;
  keys?: ValueExpr;
  play?: ValueExpr;
  repeat?: ValueExpr;
  stagger?: ValueExpr;
};

function motionTokenValue(design: DesignDefinition, name: string): ValueExpr | undefined {
  return design.semantics.get(name)?.value ?? design.primitives.get(name)?.value;
}

function flattenMotionFields(
  design: DesignDefinition,
  value: ValueExpr,
  depth = 0,
): MotionFields {
  if (depth > 8) return {};
  if (value.kind === "ident") {
    const inner = motionTokenValue(design, value.name);
    return inner ? flattenMotionFields(design, inner, depth + 1) : {};
  }
  if (value.kind !== "motion") return {};
  const base = value.base ? flattenMotionFields(design, value.base, depth + 1) : {};
  return {
    timing: value.timing ?? base.timing,
    pose: value.pose ?? base.pose,
    keys: value.keys ?? base.keys,
    play: value.play ?? base.play,
    repeat: value.repeat ?? base.repeat,
    stagger: value.stagger ?? base.stagger,
  };
}

function validateMotionBase(design: DesignDefinition, base: ValueExpr, componentName: string): void {
  if (base.kind === "ident") {
    const t = tokenTypeOf(design, base.name);
    if (t === "Motion") return;
    throw new PdlError(
      "PDL-E005",
      t
        ? `Motion copy base must be a Motion token (got ${t}) in ${componentName}`
        : `Motion copy base must be a Motion token in ${componentName} (unknown \`${base.name}\`)`,
      { path: design.entryPath },
    );
  }
  if (base.kind === "motion") {
    validateAnimateMotion(design, base, componentName, "");
    return;
  }
  throw new PdlError(
    "PDL-E005",
    `Motion copy base must be a Motion token in ${componentName}`,
    { path: design.entryPath },
  );
}

function validateAnimateMotion(
  design: DesignDefinition,
  value: ValueExpr,
  componentName: string,
  _event: string,
): void {
  if (value.kind === "timing") {
    validateEaseValue(design, value.ease, `\`animate =\` Timing in ${componentName}`);
    return;
  }
  if (value.kind === "ident") {
    const t = tokenTypeOf(design, value.name);
    if (t === "Timing" || t === "Motion") return;
    throw new PdlError(
      "PDL-E005",
      t
        ? `\`animate =\` must be a Motion or Timing (got ${t}) in ${componentName}`
        : `\`animate =\` must be a Motion or Timing in ${componentName} (unknown \`${value.name}\`)`,
      { path: design.entryPath },
    );
  }
  if (value.kind !== "motion") {
    throw new PdlError(
      "PDL-E005",
      `\`animate =\` must be \`Motion(…)\` or a Timing token/\`Timing(…)\` in ${componentName}`,
      { path: design.entryPath },
    );
  }
  if (value.base) validateMotionBase(design, value.base, componentName);
  if (value.timing) {
    validateTransitionValue(
      design,
      value.timing,
      `Motion \`timing:\` in ${componentName}`,
    );
  } else if (!value.base) {
    throw new PdlError(
      "PDL-E005",
      `Motion requires \`timing:\` in ${componentName}`,
      { path: design.entryPath },
    );
  }
  if (value.pose) validatePoseValue(design, value.pose, componentName);
  if (value.keys) validateKeysValue(design, value.keys, componentName);
  if (value.play) validatePlayValue(design, value.play, componentName);
  if (value.repeat) validateRepeatValue(design, value.repeat, componentName);
  if (value.stagger) validateStaggerValue(design, value.stagger, componentName);
  const flat = flattenMotionFields(design, value);
  const hasPose = Boolean(flat.pose && motionHasPose(design, flat.pose));
  const hasKeys = Boolean(flat.keys);
  const hasPath = hasPose || hasKeys;
  const hasStagger = Boolean(flat.stagger && motionHasStagger(design, flat.stagger));
  if (hasPose && hasKeys) {
    throw new PdlError(
      "PDL-E005",
      `Motion cannot take both \`pose:\` and \`keys:\` in ${componentName}`,
      { path: design.entryPath },
    );
  }
  if (hasStagger && !hasPath) {
    throw new PdlError(
      "PDL-E005",
      `Motion \`stagger:\` requires \`pose:\` or \`keys:\` in ${componentName}`,
      { path: design.entryPath },
    );
  }
  const play = flat.play ? playName(flat.play) : undefined;
  if (play === "loop" && flat.repeat) {
    throw new PdlError(
      "PDL-E005",
      `Motion \`play: .loop\` is forever — do not set \`repeat:\` in ${componentName}`,
      { path: design.entryPath },
    );
  }
  if (flat.repeat && !hasPath) {
    throw new PdlError(
      "PDL-E005",
      `Motion \`repeat:\` requires \`pose:\` or \`keys:\` in ${componentName}`,
      { path: design.entryPath },
    );
  }
}

function validateBlurEffectConflictInBody(
  design: DesignDefinition,
  items: FrameBodyItem[],
  componentName: string,
): void {
  const seen = new Map<string, Set<string>>();
  const mark = (target: string, name: string) => {
    let set = seen.get(target);
    if (!set) {
      set = new Set();
      seen.set(target, set);
    }
    set.add(name);
    if (set.has("blur") && set.has("effect")) {
      throw new PdlError(
        "PDL-E005",
        `\`blur =\` and \`effect =\` are the same slot — use one in ${componentName}`,
        { path: design.entryPath },
      );
    }
  };
  for (const item of items) {
    if ((item.kind === "prop" || item.kind === "frameProp") && (item.name === "blur" || item.name === "effect")) {
      if (item.value.kind === "null") continue;
      const target = item.kind === "frameProp" ? item.frame : "self";
      mark(target, item.name);
    } else if (item.kind === "let") {
      validateBlurEffectConflictInBody(design, item.body, componentName);
    } else if (item.kind === "if") {
      for (const br of item.chain.branches) {
        validateBlurEffectConflictInBody(design, br.body, componentName);
      }
      if (item.chain.elseBody) validateBlurEffectConflictInBody(design, item.chain.elseBody, componentName);
    }
  }
}

function validateFrameAnimateInBody(
  design: DesignDefinition,
  items: FrameBodyItem[],
  componentName: string,
): void {
  for (const item of items) {
    if ((item.kind === "prop" || item.kind === "frameProp") && item.name === "animate") {
      validateAnimateMotion(design, item.value, componentName, "frame");
    } else if (item.kind === "let") {
      validateFrameAnimateInBody(design, item.body, componentName);
    } else if (item.kind === "if") {
      for (const br of item.chain.branches) {
        validateFrameAnimateInBody(design, br.body, componentName);
      }
      if (item.chain.elseBody) validateFrameAnimateInBody(design, item.chain.elseBody, componentName);
    }
  }
}

function validateInteractionBody(
  design: DesignDefinition,
  items: InteractionHandlerItem[],
  paramByName: Map<string, { typeName: string }>,
  componentName: string,
  event: string,
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
    } else if (it.kind === "animate") {
      validateAnimateMotion(design, it.value, componentName, event);
    } else if (it.kind === "if") {
      for (const br of it.chain.branches) {
        validateConditionExpr(design, br.condition, paramByName, componentName);
        validateInteractionBody(design, br.body, paramByName, componentName, event);
      }
      if (it.chain.elseBody) {
        validateInteractionBody(design, it.chain.elseBody, paramByName, componentName, event);
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
      validateInteractionBody(design, h.body, paramByName, componentName, h.event);
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
    case "timing":
      validateOpacitySides(design, expr.duration);
      validateOpacitySides(design, expr.ease);
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
    case "effect":
      validateOpacitySides(design, expr.effectKind);
      if (expr.radius) validateOpacitySides(design, expr.radius);
      if (expr.vibrancy) validateOpacitySides(design, expr.vibrancy);
      return;
    default:
      return;
  }
}

/** Expected shape description for error messages (`shared/frame-props.json`). */
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
      return "a string";
    case "Ease":
      return "`.linear`, `.in`, `.out`, or `Ease.bezier(x1, y1, x2, y2)`";
    case "Icon":
      return '`IconRef(file: "…")`, `IconRef(system: .sfSymbols|.materialSymbols, name: "…")`, or a pack-relative path string';
    case "MediaSource":
      return '`MediaSource(file: "…" [, kind:, format:])`, `MediaSource(url: "…" [, kind:, format:])`, an http(s) URL, or a pack-relative path string';
    case "Timing":
      return "`Timing(duration:, ease: [, delay:])`";
    case "Pose":
      return "`Pose(opacity:, scale:, …)`";
    case "Stagger":
      return "`Stagger(step: … [, from: .first|.last])`";
      case "Motion":
        return "`Motion(timing: … [, play:] [, pose:] [, keys:] [, stagger:] [, repeat:])`, `Motion(token, field:)`, or a Timing";
      case "Effect":
        return "`Effect(.blurSelf | .blurBehind, radius: [, vibrancy:])` (`.glass` is not implemented yet)";
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
 * One gate for every TokenType RHS shape (`shared/frame-props.json` / language-objects).
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
        return value.kind === "string";
      case "Ease":
        return (
          value.kind === "easeBezier" ||
          (value.kind === "dotEnum" &&
            ["linear", "in", "out"].includes(value.value.replace(/^\./, "")))
        );
      case "Icon":
        if (value.kind === "iconRef") return true;
        return value.kind === "string" && isPackRelativeFilePath(value.value);
      case "MediaSource":
        if (value.kind === "mediaSourceRef") return true;
        return (
          value.kind === "string" &&
          (isHttpUrl(value.value) || isPackRelativeFilePath(value.value))
        );
      case "Timing":
        return value.kind === "timing";
      case "Pose":
        return value.kind === "pose";
      case "Stagger":
        return value.kind === "stagger";
      case "Motion":
        return value.kind === "motion" || value.kind === "timing";
      case "PresentationMotion":
        return value.kind === "presentationMotion";
      case "Effect":
        return (
          value.kind === "effect" ||
          (value.kind === "call" && value.callee === "Blur")
        );
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
  if (tokenType === "Pose" && value.kind === "pose") {
    validatePoseValue(design, value, name);
  }
  if (tokenType === "Stagger" && value.kind === "stagger") {
    validateStaggerValue(design, value, name);
  }
  if (tokenType === "Motion" && value.kind === "motion") {
    validateAnimateMotion(design, value, name, "");
  }
  if ((tokenType === "Timing" || tokenType === "Motion") && value.kind === "timing") {
    validateEaseValue(design, value.ease, `Token \`${name}\``);
  }
  if (tokenType === "PresentationMotion" && value.kind === "presentationMotion" && value.ease) {
    validateEaseValue(design, value.ease, `Token \`${name}\` ease`);
  }
  if (tokenType === "Effect" && value.kind === "effect") {
    try {
      assertEffectValue(design, value, `Token \`${name}\``);
    } catch (e) {
      if (e instanceof PdlError && (e.code === "PDL-E040" || e.code === "PDL-E020")) {
        throw new PdlError("PDL-E005", e.message, { path: design.entryPath });
      }
      throw e;
    }
  }
  if (tokenType === "Effect" && value.kind === "call" && value.callee === "Blur") {
    try {
      assertBlurCallCompatible(design, value.args, `Token \`${name}\``);
    } catch (e) {
      if (e instanceof PdlError && (e.code === "PDL-E040" || e.code === "PDL-E020")) {
        throw new PdlError("PDL-E005", e.message, { path: design.entryPath });
      }
      throw e;
    }
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

function listIdentFromMountExpr(expr: ValueExpr): string | undefined {
  if (expr.kind === "ident") return expr.name;
  if (expr.kind === "array" && expr.items.length === 1 && expr.items[0]!.kind === "ident") {
    return expr.items[0]!.name;
  }
  return undefined;
}

function collectListIdentsFromKwargs(
  kwargs: Record<string, ValueExpr>,
  childrenRefs: Set<string>,
): void {
  for (const expr of Object.values(kwargs)) {
    const name = listIdentFromMountExpr(expr);
    if (name) {
      childrenRefs.add(name);
      const split = splitSamplePath(name);
      if (split) childrenRefs.add(split[2]!);
    }
    if (expr.kind === "array") {
      for (const it of expr.items) {
        if (it.kind === "ident") {
          childrenRefs.add(it.name);
          const split = splitSamplePath(it.name);
          if (split) childrenRefs.add(split[2]!);
        }
      }
    }
  }
}

function duplicateMountError(
  design: DesignDefinition,
  id: string,
  componentName: string,
): PdlError {
  return new PdlError(
    "PDL-E042",
    `Frame \`${id}\` is mounted more than once in component ${componentName} — a \`let\` is one object; write two lets or a list`,
    { path: design.entryPath },
  );
}

/** A frame `let` / `letInstance` may appear at most once in any single `children` list. */
function validateUniqueFrameMountsInBody(
  design: DesignDefinition,
  items: FrameBodyItem[],
  frameLets: Set<string>,
  componentName: string,
): void {
  for (const it of items) {
    switch (it.kind) {
      case "children": {
        const seen = new Set<string>();
        for (const e of it.entries) {
          if (e.kind === "frameRef" && frameLets.has(e.id)) {
            if (seen.has(e.id)) throw duplicateMountError(design, e.id, componentName);
            seen.add(e.id);
          }
        }
        break;
      }
      case "let":
        validateUniqueFrameMountsInBody(design, it.body, frameLets, componentName);
        break;
      case "if":
        for (const br of it.chain.branches) {
          validateUniqueFrameMountsInBody(design, br.body, frameLets, componentName);
        }
        if (it.chain.elseBody) {
          validateUniqueFrameMountsInBody(design, it.chain.elseBody, frameLets, componentName);
        }
        break;
      default:
        break;
    }
  }
}

function validateUniqueFrameMounts(
  design: DesignDefinition,
  c: ComponentDecl,
  frameLets: Set<string>,
): void {
  validateUniqueFrameMountsInBody(design, c.body, frameLets, c.name);
}

function collectForeachAndChildrenMounts(
  items: FrameBodyItem[],
  foreachLists: Set<string>,
  childrenRefs: Set<string>,
): void {
  for (const item of items) {
    switch (item.kind) {
      case "children":
        for (const e of item.entries) {
          if (e.kind === "frameRef") {
            childrenRefs.add(e.id);
            const split = splitSamplePath(e.id);
            if (split) childrenRefs.add(split[2]!);
          } else if (e.kind === "instance") {
            collectListIdentsFromKwargs(e.kwargs, childrenRefs);
          }
        }
        break;
      case "letInstance":
        collectListIdentsFromKwargs(item.kwargs, childrenRefs);
        break;
      case "if":
        for (const br of item.chain.branches) {
          collectForeachAndChildrenMounts(br.body, foreachLists, childrenRefs);
        }
        if (item.chain.elseBody) {
          collectForeachAndChildrenMounts(item.chain.elseBody, foreachLists, childrenRefs);
        }
        break;
      case "let":
        collectForeachAndChildrenMounts(item.body, foreachLists, childrenRefs);
        break;
      default:
        break;
    }
  }
}

function validateForeachMounts(design: DesignDefinition, c: ComponentDecl): void {
  const foreachLists = new Set<string>();
  const childrenRefs = new Set<string>();
  collectForeachAndChildrenMounts(c.body, foreachLists, childrenRefs);
  for (const list of foreachLists) {
    if (!childrenRefs.has(list)) {
      throw new PdlError(
        "PDL-E035",
        `ForEach(\`${list}\`) does not mount the list; add \`children = ${list}\`, \`children = […, ${list}, …]\`, or pass \`${list}\` into a child list param (component ${c.name})`,
        { path: design.entryPath },
      );
    }
  }
}

function validateSamples(design: DesignDefinition): void {
  for (const bank of design.samples.values()) {
    if (design.components.has(bank.name)) {
      throw new PdlError(
        "PDL-E041",
        `Sample bank \`${bank.name}\` collides with component name \`${bank.name}\``,
        { path: design.entryPath },
      );
    }
    for (const entry of bank.entries) {
      const fieldCaller = new Map(entry.fields.map((f) => [f.name, f.typeName]));
      for (const f of entry.fields) {
        assertKnownParamType(
          design,
          f.typeName,
          `on sample \`${bank.name}.${entry.name}.${f.name}\``,
        );
        assertParamValueCompatible(
          design,
          f.typeName,
          f.value,
          fieldCaller,
          `for sample field \`${bank.name}.${entry.name}.${f.name}\``,
        );
      }
    }
  }
}

/** Semantic checks on merged design (after parse + import merge). */
export function validateMergedDesign(design: DesignDefinition): void {
  validateCompanionSymbols(design);
  validateSamples(design);
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
    validateFrameAnimateInBody(design, c.body, c.name);
    validateBlurEffectConflictInBody(design, c.body, c.name);
    validateLetValuesInBody(design, c.body, callerParams, c.name);
    validateParamBindingsInBody(design, c.body, callerParams, c.name);
    validateForeachMounts(design, c);
    validateUniqueFrameMounts(design, c, allFrameIds);
    validateFixturesForComponent(design, c.name);
    validateInteractionsForComponent(design, c.name);
    validateRulesForComponent(design, c.name);
  }
}
