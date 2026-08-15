import type { ChildEntry, ComponentDecl, FrameBodyItem, ValueExpr } from "./ast.js";
import { validateConditionExpr } from "./conditions.js";
import type { DesignDefinition } from "./designModel.js";
import { PdlError } from "./errors.js";
import { assertBlurCallCompatible, assertEffectValue, assertVibrancyCallCompatible } from "./frameProps.js";
import {
  hostEnumCases,
  isBoolParamType,
  isHostEnumType,
  unwrapParamTypeName,
} from "./paramTypes.js";
import { lookupSampleField, splitSamplePath } from "./samples.js";

function tokenTypeOf(design: DesignDefinition, name: string): string | undefined {
  return design.primitives.get(name)?.tokenType ?? design.semantics.get(name)?.tokenType;
}

function stripDot(s: string): string {
  return s.startsWith(".") ? s.slice(1) : s;
}

function valueKindLabel(value: ValueExpr): string {
  switch (value.kind) {
    case "ident":
      return `identifier \`${value.name}\``;
    case "dotEnum":
      return `\`${value.value}\``;
    case "string":
      return "string literal";
    case "number":
      return "number literal";
    case "boolean":
      return `boolean \`${value.value}\``;
    case "hex":
      return "color literal";
    case "ratio":
      return "ratio literal";
    case "instance":
      return `instance \`${value.component}(…)\``;
    case "array":
      return "array";
    case "call":
      return `${value.callee}(…)`;
    case "iconRef":
      return "IconRef(…)";
    case "mediaSourceRef":
      return "MediaSource(…)";
    case "sizing":
      return "sizing literal";
    case "shadow":
      return "Shadow(…)";
    case "edgeInsets":
      return "EdgeInsets(…)";
    case "corner":
      return "Corner(…)";
    case "gradientStop":
      return "GradientStop(…)";
    case "transition":
      return "transition";
    default:
      return value.kind;
  }
}

/**
 * Assert a value is type-compatible with a declared parameter type
 * (defaults, instance kwargs, fixtures).
 */
export function assertParamValueCompatible(
  design: DesignDefinition,
  expectedTypeName: string,
  value: ValueExpr,
  callerParams: Map<string, string>,
  where: string,
): void {
  const expected = unwrapParamTypeName(expectedTypeName);

  if (value.kind === "ident") {
    const callerTy = callerParams.get(value.name);
    if (callerTy) {
      const got = unwrapParamTypeName(callerTy);
      if (got !== expected) {
        throw new PdlError(
          "PDL-E040",
          `Type mismatch ${where}: parameter \`${value.name}\` has type ${got}, expected ${expected}`,
          { path: design.entryPath },
        );
      }
      return;
    }
    const tokTy = tokenTypeOf(design, value.name);
    if (tokTy) {
      if (tokTy !== expected) {
        throw new PdlError(
          "PDL-E040",
          `Type mismatch ${where}: token \`${value.name}\` has type ${tokTy}, expected ${expected}`,
          { path: design.entryPath },
        );
      }
      return;
    }
    if (splitSamplePath(value.name)) {
      const field = lookupSampleField(design, value.name);
      const got = unwrapParamTypeName(field.typeName);
      if (got !== expected) {
        throw new PdlError(
          "PDL-E040",
          `Type mismatch ${where}: sample \`${value.name}\` has type ${got}, expected ${expected}`,
          { path: design.entryPath },
        );
      }
      return;
    }
    throw new PdlError(
      "PDL-E007",
      `Unresolved identifier \`${value.name}\` ${where}`,
      { path: design.entryPath },
    );
  }

  const mismatch = () => {
    throw new PdlError(
      "PDL-E040",
      `Type mismatch ${where}: got ${valueKindLabel(value)}, expected ${expected}`,
      { path: design.entryPath },
    );
  };

  if (expected === "String" || expected === "FontFamily") {
    if (value.kind === "string") return;
    mismatch();
  }
  if (isBoolParamType(expected)) {
    if (value.kind === "boolean") return;
    if (
      value.kind === "dotEnum" &&
      (value.value === ".true" || value.value === ".false")
    ) {
      return;
    }
    // Call-site / ForEach equality: `selected: currentFilter == .all`
    if (value.kind === "condition") {
      validateConditionExpr(design, value.expr, callerParams, where);
      return;
    }
    mismatch();
  }
  if (
    expected === "Number" ||
    expected === "Size" ||
    expected === "Weight" ||
    expected === "Duration" ||
    expected === "Opacity" ||
    expected === "Distance" ||
    expected === "Radius" ||
    expected === "LineHeight" ||
    expected === "LetterSpacing"
  ) {
    if (value.kind === "number") return;
    mismatch();
  }
  if (expected === "Ratio") {
    if (value.kind === "number" || value.kind === "ratio") return;
    mismatch();
  }
  if (expected === "Color") {
    if (value.kind === "hex" || value.kind === "opacityOf") return;
    if (value.kind === "call" && value.callee === "Color") return;
    mismatch();
  }
  if (expected === "Icon") {
    if (value.kind === "iconRef") return;
    if (value.kind === "string") return; // pack-relative path sugar
    mismatch();
  }
  if (expected === "MediaSource") {
    if (value.kind === "mediaSourceRef") return;
    if (value.kind === "string") return;
    mismatch();
  }
  if (expected === "Shadow") {
    if (value.kind === "shadow") return;
    mismatch();
  }
  if (expected === "Sizing") {
    if (value.kind === "sizing" || value.kind === "number") return;
    if (value.kind === "dotEnum") {
      const c = stripDot(value.value);
      if (c === "hug" || c === "fill") return;
    }
    mismatch();
  }
  if (expected === "Ramp") {
    if (value.kind === "call" && value.callee === "Ramp") return;
    if (value.kind === "rampInline") return;
    mismatch();
  }
  if (expected === "Blur") {
    if (value.kind === "call" && value.callee === "Blur") {
      assertBlurCallCompatible(design, value.args, where);
      return;
    }
    mismatch();
  }
  if (expected === "Vibrancy") {
    if (value.kind === "call" && value.callee === "Vibrancy") {
      assertVibrancyCallCompatible(design, value.args, where);
      return;
    }
    if (value.kind === "vibrancyTuple") {
      throw new PdlError(
        "PDL-E040",
        `Type mismatch ${where}: naked \`(saturation:, brightness:)\` is not a Vibrancy value; use \`Vibrancy(saturation:, brightness:)\``,
        { path: design.entryPath },
      );
    }
    mismatch();
  }
  if (expected === "Media") {
    if (value.kind === "call" && value.callee === "MediaLayer") return;
    mismatch();
  }
  if (expected === "EdgeInsets") {
    if (value.kind === "edgeInsets") return;
    if (value.kind === "number") return; // uniform sugar
    mismatch();
  }
  if (expected === "CornerRadii") {
    if (value.kind === "corner") return;
    mismatch();
  }
  if (expected === "GradientStop") {
    if (value.kind === "gradientStop") return;
    mismatch();
  }
  if (expected === "Easing") {
    if (value.kind === "string" || value.kind === "dotEnum") return;
    mismatch();
  }
  if (expected === "Transition") {
    if (value.kind === "transition") return;
    mismatch();
  }
  if (expected === "Pose") {
    if (value.kind === "pose") return;
    mismatch();
  }
  if (expected === "Stagger") {
    if (value.kind === "stagger") return;
    mismatch();
  }
  if (expected === "Motion") {
    if (value.kind === "motion" || value.kind === "transition") return;
    mismatch();
  }
  if (expected === "Effect") {
    if (value.kind === "effect") {
      assertEffectValue(design, value, where);
      return;
    }
    if (value.kind === "call" && value.callee === "Blur") {
      assertBlurCallCompatible(design, value.args, where);
      return;
    }
    mismatch();
  }
  if (expected === "Background" || expected === "Foreground") {
    if (value.kind === "hex" || value.kind === "opacityOf" || value.kind === "array") return;
    if (value.kind === "call") return;
    mismatch();
  }

  if (isHostEnumType(expected)) {
    const cases = hostEnumCases(expected)!;
    if (value.kind === "dotEnum") {
      const caseName = stripDot(value.value);
      if (!cases.includes(caseName)) {
        throw new PdlError(
          "PDL-E040",
          `Type mismatch ${where}: unknown case \`.${caseName}\` for ${expected} (expected one of: ${cases.map((c) => `.${c}`).join(", ")})`,
          { path: design.entryPath },
        );
      }
      return;
    }
    mismatch();
  }

  const vdecl = design.variants.get(expected);
  if (vdecl) {
    if (value.kind === "dotEnum") {
      const caseName = stripDot(value.value);
      if (!vdecl.cases.includes(caseName)) {
        throw new PdlError(
          "PDL-E040",
          `Type mismatch ${where}: unknown case \`.${caseName}\` for variant ${expected} (expected one of: ${vdecl.cases.map((c) => `.${c}`).join(", ")})`,
          { path: design.entryPath },
        );
      }
      return;
    }
    mismatch();
  }

  // Component-typed slot: accept a matching instance constructor.
  if (design.components.has(expected)) {
    if (value.kind === "instance" && value.component === expected) return;
    if (value.kind === "array") return; // element checks deferred
    if (value.kind === "null") return;
    mismatch();
  }
  // Array / structured slot defaults — light touch for v1.
  if (value.kind === "instance" || value.kind === "array" || value.kind === "null") {
    return;
  }
  mismatch();
}

export function assertInstanceKwargsCompatible(
  design: DesignDefinition,
  target: ComponentDecl,
  kwargs: Record<string, ValueExpr>,
  callerParams: Map<string, string>,
  where: string,
): void {
  const pmap = new Map(target.params.map((p) => [p.name, p]));
  for (const [name, value] of Object.entries(kwargs)) {
    const p = pmap.get(name);
    if (!p) {
      throw new PdlError(
        "PDL-E007",
        `Unknown parameter \`${name}\` ${where} (component ${target.name})`,
        { path: design.entryPath },
      );
    }
    assertParamValueCompatible(
      design,
      p.typeName,
      value,
      callerParams,
      `${where} argument \`${name}\``,
    );
  }
}

function walkChildEntries(
  design: DesignDefinition,
  entries: ChildEntry[],
  callerParams: Map<string, string>,
  where: string,
): void {
  for (const e of entries) {
    if (e.kind !== "instance") continue;
    const target = design.components.get(e.component);
    if (!target) {
      throw new PdlError(
        "PDL-E037",
        `Unknown component \`${e.component}\` ${where}`,
        { path: design.entryPath },
      );
    }
    assertInstanceKwargsCompatible(
      design,
      target,
      e.kwargs,
      callerParams,
      `in ${where} instance \`${e.component}\``,
    );
  }
}

export function validateParamBindingsInBody(
  design: DesignDefinition,
  items: FrameBodyItem[],
  callerParams: Map<string, string>,
  componentName: string,
): void {
  for (const item of items) {
    switch (item.kind) {
      case "letInstance": {
        const target = design.components.get(item.component);
        if (!target) {
          throw new PdlError(
            "PDL-E037",
            `Unknown component \`${item.component}\` in \`let ${item.id}\` (component ${componentName})`,
            { path: design.entryPath },
          );
        }
        assertInstanceKwargsCompatible(
          design,
          target,
          item.kwargs,
          callerParams,
          `in \`let ${item.id} = ${item.component}(…)\` (component ${componentName})`,
        );
        break;
      }
      case "children":
        walkChildEntries(
          design,
          item.entries,
          callerParams,
          `children of ${componentName}`,
        );
        break;
      case "let":
        validateParamBindingsInBody(design, item.body, callerParams, componentName);
        break;
      case "if":
        for (const br of item.chain.branches) {
          validateParamBindingsInBody(design, br.body, callerParams, componentName);
        }
        if (item.chain.elseBody) {
          validateParamBindingsInBody(design, item.chain.elseBody, callerParams, componentName);
        }
        break;
      default:
        break;
    }
  }
}

export function validateComponentParamDefaults(design: DesignDefinition): void {
  for (const c of design.components.values()) {
    const callerParams = new Map(c.params.map((p) => [p.name, p.typeName]));
    for (const p of c.params) {
      assertParamValueCompatible(
        design,
        p.typeName,
        p.defaultValue,
        callerParams,
        `for default of \`${c.name}.${p.name}\``,
      );
    }
  }
}
