/**
 * Built-in component / emit / value-let / token type names (`shared/language-objects.json`).
 * Boolean params use **`Bool`** only — `Boolean` is not a type name.
 *
 * Host frame enums (`Direction`, `Align`, …) and **`BlurStyle`** are named types
 * for params and value lets (cases from `shared/frame-props.json` + BlurStyle shell).
 */
export const BUILTIN_PARAM_TYPES: ReadonlySet<string> = new Set([
  "Color",
  "Opacity",
  "Distance",
  "Radius",
  "Shadow",
  "Icon",
  "MediaSource",
  "Ratio",
  "FontFamily",
  "Size",
  "Weight",
  "LineHeight",
  "LetterSpacing",
  "Sizing",
  "Duration",
  "Easing",
  "Transition",
  "Pose",
  "Stagger",
  "Motion",
  "Effect",
  "Blur",
  "Vibrancy",
  "Ramp",
  "Background",
  "Foreground",
  "EdgeInsets",
  "CornerRadii",
  "GradientStop",
  "Media",
  "String",
  "Number",
  "Bool",
  // Host enums (first-class)
  "Direction",
  "Wrap",
  "Align",
  "Justify",
  "Overflow",
  "BorderPosition",
  "TruncateStyle",
  "ContentMode",
  "AlignSelf",
  "Position",
  "BlurStyle",
  "EffectKind",
]);

/** Closed cases for host enum types (params / value lets / token RHS). */
export const HOST_ENUM_CASES: Readonly<Record<string, readonly string[]>> = {
  Direction: ["row", "column", "rowReverse", "columnReverse", "stack", "reverseStack"],
  Wrap: ["nowrap", "wrap"],
  Align: ["start", "center", "end", "stretch"],
  Justify: ["start", "center", "end", "stretch", "spaceBetween", "spaceAround"],
  Overflow: ["visible", "scroll", "clip"],
  BorderPosition: ["inside", "outside"],
  TruncateStyle: ["clip", "ellipsis"],
  ContentMode: ["cover", "contain", "fill", "scaleDown"],
  AlignSelf: ["start", "center", "end", "stretch", "auto"],
  Position: ["flow", "absolute"],
  /** Reserved shell — more cases (gaussian, bokeh, fast, …) later. */
  BlurStyle: ["standard"],
  EffectKind: ["blurSelf", "blurBehind", "glass"],
};

/** Strip `[T]` array sugar → `T`. */
export function unwrapParamTypeName(typeName: string): string {
  const t = typeName.trim();
  if (t.startsWith("[") && t.endsWith("]")) return t.slice(1, -1).trim();
  return t;
}

export function isBuiltinParamType(typeName: string): boolean {
  return BUILTIN_PARAM_TYPES.has(unwrapParamTypeName(typeName));
}

export function isHostEnumType(typeName: string): boolean {
  return unwrapParamTypeName(typeName) in HOST_ENUM_CASES;
}

export function hostEnumCases(typeName: string): readonly string[] | undefined {
  return HOST_ENUM_CASES[unwrapParamTypeName(typeName)];
}

export function isBoolParamType(typeName: string): boolean {
  return unwrapParamTypeName(typeName) === "Bool";
}

/**
 * Infer a value-let type from an RHS expression when `let name = …` omits `: Type`.
 * Returns undefined when the RHS is ambiguous (caller should require an annotation).
 */
export function inferValueLetType(value: {
  kind: string;
  callee?: string;
}): string | undefined {
  switch (value.kind) {
    case "call":
      // MediaLayer constructs a Media-typed layer value.
      return value.callee === "MediaLayer" ? "Media" : value.callee;
    case "shadow":
      return "Shadow";
    case "edgeInsets":
      return "EdgeInsets";
    case "corner":
      return "CornerRadii";
    case "gradientStop":
      return "GradientStop";
    case "iconRef":
      return "Icon";
    case "mediaSourceRef":
      return "MediaSource";
    case "transition":
      return "Transition";
    case "pose":
      return "Pose";
    case "stagger":
      return "Stagger";
    case "key":
      return undefined;
    case "motion":
      return "Motion";
    case "effect":
      return "Effect";
    case "rampInline":
      return "Ramp";
    case "hex":
    case "opacityOf":
      return "Color";
    case "sizing":
      return "Sizing";
    case "string":
      return "String";
    case "number":
      return "Number";
    case "boolean":
      return "Bool";
    default:
      return undefined;
  }
}
