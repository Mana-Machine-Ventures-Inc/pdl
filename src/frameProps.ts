import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FrameBodyItem, ValueExpr } from "./ast.js";
import {
  isHttpUrl,
  isPackRelativeFilePath,
  mediaKindForFormat,
  normalizeMediaFormatName,
  normalizeMediaKindName,
} from "./assetRefs.js";
import type { DesignDefinition } from "./designModel.js";
import { PdlError } from "./errors.js";

export type FrameKindName = "layout" | "text" | "icon" | "media";

type ValueKindDef = {
  accept: string[];
  tokenTypes?: string[];
  /** PascalCase enum type for optional `TypeName.case` sugar (→ same AST as `.case`). */
  typeName?: string;
  cases?: string[];
  range?: [number, number];
  nonNegativeNumber?: boolean;
  positiveNumber?: boolean;
  numberSugar?: "fixed" | "uniformInsets";
};

type PropDef = { type: string };

type FramePropsTable = {
  schemaVersion: number;
  valueKinds: Record<string, ValueKindDef>;
  kinds: Record<string, { props: Record<string, PropDef> }>;
  childFlexProps: Record<string, PropDef>;
  special: Record<
    string,
    {
      kinds?: string[];
      type?: string;
      structural?: boolean;
      typeStyleRef?: boolean;
    }
  >;
};

const TABLE: FramePropsTable = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "shared", "frame-props.json"), "utf8"),
) as FramePropsTable;

function tokenTypeOf(design: DesignDefinition, name: string): string | undefined {
  return design.primitives.get(name)?.tokenType ?? design.semantics.get(name)?.tokenType;
}

function enumCaseName(value: ValueExpr): string | undefined {
  if (value.kind === "dotEnum") {
    return value.value.startsWith(".") ? value.value.slice(1) : value.value;
  }
  if (value.kind === "ident") return value.name;
  return undefined;
}

/** Props that accept a bare number as uniform EdgeInsets sugar. */
export function uniformEdgeInsetProps(): Set<string> {
  const out = new Set<string>();
  const consider = (name: string, typeId: string) => {
    if (TABLE.valueKinds[typeId]?.numberSugar === "uniformInsets") out.add(name);
  };
  for (const kind of Object.values(TABLE.kinds)) {
    for (const [name, def] of Object.entries(kind.props)) consider(name, def.type);
  }
  for (const [name, def] of Object.entries(TABLE.childFlexProps)) consider(name, def.type);
  return out;
}

/** Props that accept a bare number as `.fixed(n)` sizing sugar. */
export function fixedSizingAxisProps(): Set<string> {
  const out = new Set<string>();
  const consider = (name: string, typeId: string) => {
    if (TABLE.valueKinds[typeId]?.numberSugar === "fixed") out.add(name);
  };
  for (const kind of Object.values(TABLE.kinds)) {
    for (const [name, def] of Object.entries(kind.props)) consider(name, def.type);
  }
  return out;
}

function propTypeId(kind: string, prop: string): string | undefined {
  const special = TABLE.special[prop];
  if (special) {
    if (special.structural && !special.type) return undefined;
    if (special.kinds && !special.kinds.includes(kind)) return undefined;
    return special.type;
  }
  const fromKind = TABLE.kinds[kind]?.props[prop]?.type;
  if (fromKind) return fromKind;
  return TABLE.childFlexProps[prop]?.type;
}

/** True if `prop` is allowed on frame kind (including child-flex and special). */
export function isKnownFrameProp(kind: string, prop: string): boolean {
  if (prop === "children") return true;
  const special = TABLE.special[prop];
  if (special) {
    if (special.structural && prop === "children") return true;
    if (special.kinds) return special.kinds.includes(kind);
    return true;
  }
  if (TABLE.kinds[kind]?.props[prop]) return true;
  if (TABLE.childFlexProps[prop]) return true;
  return false;
}

/** Frame enum type names that accept `TypeName.case` as sugar for `.case` (excludes `Sizing`). */
export function frameEnumTypeNames(): Set<string> {
  const out = new Set<string>();
  for (const vk of Object.values(TABLE.valueKinds)) {
    if (vk.typeName && vk.cases?.length) out.add(vk.typeName);
  }
  return out;
}

export function isFrameEnumTypeName(name: string): boolean {
  return frameEnumTypeNames().has(name);
}

function valueKindExpectation(typeId: string): string {
  const vk = TABLE.valueKinds[typeId];
  if (!vk) return typeId;
  if (vk.cases?.length) {
    const dots = vk.cases.map((c) => `.${c}`).join(", ");
    if (vk.typeName) return `one of ${dots} (or ${vk.typeName}.<case>)`;
    return `one of ${dots}`;
  }
  const parts = [...vk.accept];
  if (vk.tokenTypes?.length) parts.push(`or ${vk.tokenTypes.join("/")}-typed token`);
  return parts.join(" | ");
}

function literalOk(vk: ValueKindDef, value: ValueExpr, typeId?: string): boolean {
  // Bare `.hug` / `.fill` parse as dotEnum (shared with ContentMode.fill); only those cases
  // are valid for sizing props.
  if (typeId === "sizing" && value.kind === "dotEnum") {
    const c = enumCaseName(value);
    return c === "hug" || c === "fill";
  }
  if (!vk.accept.includes(value.kind)) return false;
  if (value.kind === "number") {
    if (vk.nonNegativeNumber && value.value < 0) return false;
    if (vk.positiveNumber && !(value.value > 0)) return false;
    if (vk.range) {
      const [lo, hi] = vk.range;
      if (value.value < lo || value.value > hi) return false;
    }
  }
  if (value.kind === "ratio") {
    if (!(value.width > 0 && value.height > 0)) return false;
  }
  if (value.kind === "string") {
    if (typeId === "icon" && !isPackRelativeFilePath(value.value)) return false;
    if (
      typeId === "mediaSource" &&
      !isHttpUrl(value.value) &&
      !isPackRelativeFilePath(value.value)
    ) {
      return false;
    }
  }
  if (vk.cases?.length) {
    const c = enumCaseName(value);
    if (c === undefined || !vk.cases.includes(c)) return false;
  }
  return true;
}

/** §15 layer constructors (keyword-call form). */
const LAYER_CTORS = new Set(["Color", "Ramp", "Blur", "Media", "Vibrancy"]);

/**
 * Token types valid as a whole layer entry.
 * `Ramp` tokens are full paint shapes (§14); `Blur` / `Vibrancy` / `Opacity` are inputs only.
 */
const LAYER_TOKEN_TYPES = new Set(["Color", "Background", "Foreground", "Ramp"]);

function assertLayerEntry(
  design: DesignDefinition,
  entry: ValueExpr,
  context: string,
): void {
  switch (entry.kind) {
    case "hex":
    case "opacityOf":
      return;
    case "ident": {
      const refType = tokenTypeOf(design, entry.name);
      if (!refType) return; // unresolved / param — other passes
      if (LAYER_TOKEN_TYPES.has(refType)) return;
      if (refType === "Opacity") {
        throw new PdlError(
          "PDL-E006",
          `${context}: bare Opacity token \`${entry.name}\` is not a layer; apply it with \`color @ ${entry.name}\` (or pass opacity: on a layer constructor)`,
          { path: design.entryPath },
        );
      }
      if (refType === "Blur" || refType === "Vibrancy") {
        throw new PdlError(
          "PDL-E006",
          `${context}: bare ${refType} token \`${entry.name}\` is not a layer; use ${refType}(${refType === "Blur" ? "blur" : "vibrancy"}: ${entry.name})`,
          { path: design.entryPath },
        );
      }
      throw new PdlError(
        "PDL-E006",
        `${context}: layer entry \`${entry.name}\` has type ${refType}; expected a Color / Background / Foreground / Ramp layer, #hex, color @ opacity, or layer constructor`,
        { path: design.entryPath },
      );
    }
    case "call": {
      if (!LAYER_CTORS.has(entry.callee)) {
        throw new PdlError(
          "PDL-E006",
          `${context}: unknown layer constructor \`${entry.callee}\`; expected Color, Ramp, Blur, Media, or Vibrancy`,
          { path: design.entryPath },
        );
      }
      return;
    }
    default:
      throw new PdlError(
        "PDL-E006",
        `${context}: invalid layer entry (got ${entry.kind}); expected Color / Background / Foreground / Ramp, #hex, color @ opacity, or layer constructor`,
        { path: design.entryPath },
      );
  }
}

/** Walk a background/foreground / Background / Foreground RHS and check layer entries. */
export function assertLayerStackValue(
  design: DesignDefinition,
  value: ValueExpr,
  context: string,
): void {
  if (value.kind === "hex" || value.kind === "opacityOf") return;
  if (value.kind === "ident") {
    assertLayerEntry(design, value, context);
    return;
  }
  if (value.kind === "call") {
    assertLayerEntry(design, value, context);
    return;
  }
  if (value.kind === "array") {
    value.items.forEach((item, i) => {
      assertLayerEntry(design, item, `${context} layer[${i}]`);
    });
    return;
  }
}

/**
 * §23.3 — assert a frame (or typeStyle) property RHS matches the SoT value kind.
 * Unknown props are handled by the caller (PDL-E011).
 */
export function assertFramePropCompatible(
  design: DesignDefinition,
  kind: string,
  prop: string,
  value: ValueExpr,
  context: string,
): void {
  const typeId = propTypeId(kind, prop);
  if (!typeId) return;
  const vk = TABLE.valueKinds[typeId];
  if (!vk) {
    throw new PdlError(
      "PDL-E006",
      `${context}: property \`${prop}\` references unknown value kind \`${typeId}\``,
      { path: design.entryPath },
    );
  }

  // `null` = unset this property (revert to default / absent). Legal on any known frame prop.
  if (value.kind === "null") return;

  if (value.kind === "ident") {
    if (typeId === "styleRef" || typeId === "booleanOrCondition") return;
    if (vk.tokenTypes?.length) {
      const refType = tokenTypeOf(design, value.name);
      if (!refType) return; // param or resolve-time name
      if (!vk.tokenTypes.includes(refType)) {
        throw new PdlError(
          "PDL-E006",
          `${context}: property \`${prop}\` expects ${valueKindExpectation(typeId)} (token \`${value.name}\` has type ${refType})`,
          { path: design.entryPath },
        );
      }
      return;
    }
    if (vk.accept.includes("ident") && vk.cases?.length) {
      if (!vk.cases.includes(value.name)) {
        throw new PdlError(
          "PDL-E006",
          `${context}: property \`${prop}\` expects ${valueKindExpectation(typeId)} (got \`${value.name}\`)`,
          { path: design.entryPath },
        );
      }
      return;
    }
    throw new PdlError(
      "PDL-E006",
      `${context}: property \`${prop}\` expects ${valueKindExpectation(typeId)} (got ident)`,
      { path: design.entryPath },
    );
  }

  if (literalOk(vk, value, typeId)) {
    if (typeId === "colorOrLayers") {
      assertLayerStackValue(design, value, `${context}: property \`${prop}\``);
    }
    if (typeId === "sizing" && value.kind === "sizing" && value.mode === "aspect") {
      assertAspectSizingArg(design, value.aspect, `${context}: property \`${prop}\``);
    }
    if (typeId === "mediaSource" && value.kind === "mediaSourceRef") {
      assertMediaSourceMeta(design, value, `${context}: property \`${prop}\``);
    }
    return;
  }

  throw new PdlError(
    "PDL-E006",
    `${context}: property \`${prop}\` expects ${valueKindExpectation(typeId)} (got ${value.kind})`,
    { path: design.entryPath },
  );
}

function assertMediaSourceMeta(
  design: DesignDefinition,
  value: Extract<ValueExpr, { kind: "mediaSourceRef" }>,
  context: string,
): void {
  if (value.mediaKind !== undefined) {
    const raw =
      value.mediaKind.kind === "dotEnum"
        ? value.mediaKind.value
        : value.mediaKind.kind === "ident"
          ? value.mediaKind.name
          : undefined;
    if (!raw || !normalizeMediaKindName(raw)) {
      throw new PdlError(
        "PDL-E006",
        `${context}: MediaSource kind must be .raster, .vector, or .video`,
        { path: design.entryPath },
      );
    }
  }
  if (value.format !== undefined) {
    const raw =
      value.format.kind === "dotEnum"
        ? value.format.value
        : value.format.kind === "ident"
          ? value.format.name
          : undefined;
    if (!raw || !normalizeMediaFormatName(raw)) {
      throw new PdlError(
        "PDL-E006",
        `${context}: MediaSource format must be one of .webp|.jpeg|.png|.gif|.svg|.mp4|.webm|.pdf`,
        { path: design.entryPath },
      );
    }
  }
  const mk = value.mediaKind
    ? normalizeMediaKindName(
        value.mediaKind.kind === "dotEnum"
          ? value.mediaKind.value
          : value.mediaKind.kind === "ident"
            ? value.mediaKind.name
            : "",
      )
    : undefined;
  const fmt = value.format
    ? normalizeMediaFormatName(
        value.format.kind === "dotEnum"
          ? value.format.value
          : value.format.kind === "ident"
            ? value.format.name
            : "",
      )
    : undefined;
  if (mk && fmt && mediaKindForFormat(fmt) !== mk) {
    throw new PdlError(
      "PDL-E006",
      `${context}: MediaSource kind \`.${mk}\` is incompatible with format \`.${fmt}\``,
      { path: design.entryPath },
    );
  }
}

function assertAspectSizingArg(
  design: DesignDefinition,
  aspect: ValueExpr | undefined,
  context: string,
): void {
  if (!aspect) {
    throw new PdlError("PDL-E006", `${context}: \`.aspect\` requires a ratio argument`, {
      path: design.entryPath,
    });
  }
  if (aspect.kind === "number") {
    if (!(aspect.value > 0) || !Number.isFinite(aspect.value)) {
      throw new PdlError(
        "PDL-E006",
        `${context}: \`.aspect(n)\` requires a positive finite ratio`,
        { path: design.entryPath },
      );
    }
    return;
  }
  if (aspect.kind === "ratio") {
    if (!(aspect.height > 0) || !Number.isFinite(aspect.width) || !Number.isFinite(aspect.height)) {
      throw new PdlError(
        "PDL-E006",
        `${context}: \`.aspect(W:H)\` requires a positive finite height`,
        { path: design.entryPath },
      );
    }
    return;
  }
  if (aspect.kind === "ident") {
    const refType = tokenTypeOf(design, aspect.name);
    if (refType && refType !== "Ratio") {
      throw new PdlError(
        "PDL-E006",
        `${context}: \`.aspect\` expects a Ratio token (\`${aspect.name}\` has type ${refType})`,
        { path: design.entryPath },
      );
    }
    return;
  }
  throw new PdlError(
    "PDL-E006",
    `${context}: \`.aspect\` expects a positive ratio, \`W:H\` sugar, or Ratio token (got ${aspect.kind})`,
    { path: design.entryPath },
  );
}

function isAspectSizingExpr(value: ValueExpr | undefined): boolean {
  return value?.kind === "sizing" && value.mode === "aspect";
}

/** Axis is authoritatively sized (not derived from aspect / hug / unset). */
function isClosedSizingExpr(value: ValueExpr | undefined): boolean {
  if (!value || value.kind === "null") return false;
  if (value.kind === "number") return true;
  if (value.kind === "sizing") {
    return value.mode === "fill" || value.mode === "fixed" || value.mode === "flex";
  }
  // Bare `.fill` is a closed sizing enum (`.hug` is free).
  if (value.kind === "dotEnum") {
    const c = enumCaseName(value);
    return c === "fill";
  }
  if (value.kind === "ident") return true;
  return false;
}

/**
 * Width/height/aspectRatio consistency:
 * - `.aspect` marks the *derived* axis (W/H = ratio).
 * - Frame `aspectRatio` is sugar when exactly one axis is closed (or both free for intrinsic).
 * - Both axes closed + `aspectRatio`, or `.aspect` on both axes, is overconstrained.
 */
export function assertAspectBoxConsistent(
  design: DesignDefinition,
  props: Map<string, ValueExpr>,
  context: string,
): void {
  const width = props.get("width");
  const height = props.get("height");
  const aspectRatio = props.get("aspectRatio");
  const wAspect = isAspectSizingExpr(width);
  const hAspect = isAspectSizingExpr(height);

  if (wAspect && hAspect) {
    throw new PdlError(
      "PDL-E006",
      `${context}: cannot set \`.aspect\` on both \`width\` and \`height\` — put \`.aspect(…)\` on the derived axis only`,
      { path: design.entryPath },
    );
  }
  if (aspectRatio && (wAspect || hAspect)) {
    throw new PdlError(
      "PDL-E006",
      `${context}: use either \`aspectRatio\` or \`.aspect(…)\` on one axis, not both`,
      { path: design.entryPath },
    );
  }
  if (aspectRatio && isClosedSizingExpr(width) && isClosedSizingExpr(height)) {
    throw new PdlError(
      "PDL-E006",
      `${context}: \`aspectRatio\` conflicts with both \`width\` and \`height\` set — leave one axis free or use \`height = .aspect(…)\` / \`width = .aspect(…)\``,
      { path: design.entryPath },
    );
  }
}

function validatePropOnKind(
  design: DesignDefinition,
  kind: string,
  prop: string,
  value: ValueExpr,
  context: string,
): void {
  if (prop === "children") return;
  if (!isKnownFrameProp(kind, prop)) {
    throw new PdlError(
      "PDL-E011",
      `${context}: unknown property \`${prop}\` on \`${kind}\` frame`,
      { path: design.entryPath },
    );
  }
  assertFramePropCompatible(design, kind, prop, value, context);
}

/** Walk component frame body props / frameProps / nested lets. */
export function validateFramePropsInBody(
  design: DesignDefinition,
  items: FrameBodyItem[],
  componentName: string,
  currentFrameKind: string,
  letKinds: Map<string, string>,
  inheritedProps: Map<string, ValueExpr> = new Map(),
): void {
  const ctx = `component ${componentName}`;
  const propsOnFrame = new Map(inheritedProps);
  for (const item of items) {
    switch (item.kind) {
      case "prop":
        validatePropOnKind(design, currentFrameKind, item.name, item.value, ctx);
        propsOnFrame.set(item.name, item.value);
        break;
      case "frameProp": {
        const fk = letKinds.get(item.frame);
        if (!fk) break; // unknown frame handled elsewhere for hidden; skip type check
        validatePropOnKind(design, fk, item.name, item.value, ctx);
        break;
      }
      case "let":
        validateFramePropsInBody(design, item.body, componentName, item.frameKind, letKinds);
        break;
      case "if":
        for (const br of item.chain.branches) {
          validateFramePropsInBody(
            design,
            br.body,
            componentName,
            currentFrameKind,
            letKinds,
            propsOnFrame,
          );
        }
        if (item.chain.elseBody) {
          validateFramePropsInBody(
            design,
            item.chain.elseBody,
            componentName,
            currentFrameKind,
            letKinds,
            propsOnFrame,
          );
        }
        break;
      default:
        break;
    }
  }
  assertAspectBoxConsistent(design, propsOnFrame, ctx);
}

/** typeStyle bodies may only use valid `text` frame property names (§3 / §5), excluding `style`. */
export function validateTypeStyleProps(design: DesignDefinition): void {
  for (const ts of design.typeStyles.values()) {
    const ctx = `typeStyle ${ts.name}`;
    for (const [prop, value] of Object.entries(ts.props)) {
      if (prop === "style" || !TABLE.kinds.text.props[prop]) {
        throw new PdlError(
          "PDL-E011",
          `${ctx}: unknown property \`${prop}\` (typeStyle allows text frame props from §5)`,
          { path: design.entryPath },
        );
      }
      assertFramePropCompatible(design, "text", prop, value, ctx);
    }
  }
}
