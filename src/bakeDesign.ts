import type { DesignDefinition } from "./designModel.js";
import { PdlError } from "./errors.js";
import { PDL_JSON_SCHEMA_VERSION } from "./graphJson.js";
import { buildResolvedTokenMap, evaluateValue } from "./evaluate.js";
import { coerceFramePropValue } from "./frameNumericSugar.js";
import {
  pruneHiddenChildrenTree,
  RESOLVE_OPTIONS_LITERAL_BAKE,
  resolveComponentTree,
  resolveDefaultParamValues,
  type CatalFrame,
} from "./resolveTree.js";

export type BakedFrame = CatalFrame;

export type BakedComponentJson = {
  name: string;
  rootKind: string;
  /** Omitted when empty under omitEmpty (Rust / TS bake). */
  bakedParams?: Record<string, unknown>;
  root: BakedFrame;
};

export type BakedDesignDocument = {
  schemaKind: "bakedDesign";
  schemaVersion: string;
  generatedAt: string;
  provenance: {
    entryPath: string;
    bakedTheme: string | null;
    /** `system-defaults` | `component-explicit` | `injection-pack` (Rust packs) | future profiles */
    bakeProfile: string;
  };
  /**
   * Resolved CSS color for `previewBackground` (when declared), after theme apply.
   * Omitted when unset or unresolvable.
   */
  previewBackground?: string;
  components: Record<string, BakedComponentJson>;
};

/** Resolve entry `previewBackground` token to a CSS color string for HTML hosts. */
function resolvePreviewBackgroundCss(
  design: DesignDefinition,
  tokenMap: Map<string, unknown>,
): string | undefined {
  const name = design.previewBackground;
  if (!name) return undefined;
  const v = tokenMap.get(name);
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  return undefined;
}

/**
 * Bake must be fully literal: expand `style = TypeStyle` into concrete text props,
 * then drop the `typeStyle` name. Explicit frame props win over preset defaults.
 */
function expandTypeStyleIntoFrame(
  design: DesignDefinition,
  tokens: Map<string, unknown>,
  frame: CatalFrame,
): CatalFrame {
  const props = { ...frame.props };
  const tsRaw = props.typeStyle;
  if (typeof tsRaw === "string") {
    const name = tsRaw.startsWith("typeStyle:") ? tsRaw.slice("typeStyle:".length) : tsRaw;
    const decl = design.typeStyles.get(name);
    if (decl) {
      const fromStyle: Record<string, unknown> = {};
      for (const [k, expr] of Object.entries(decl.props)) {
        const v = evaluateValue(expr, {
          design,
          tokens,
          visiting: new Set(),
          paramValues: {},
          paramMeta: new Map(),
        });
        fromStyle[k] = coerceFramePropValue(k, v, design.entryPath);
      }
      const { typeStyle: _drop, ...frameRest } = props;
      Object.assign(props, fromStyle, frameRest);
      delete props.typeStyle;
    } else if (Object.keys(props).length > 1) {
      delete props.typeStyle;
    }
  }
  return {
    id: frame.id,
    kind: frame.kind,
    props,
    children: frame.children.map((c) => expandTypeStyleIntoFrame(design, tokens, c)),
    ...(frame.instanceOf !== undefined
      ? {
          instanceOf: frame.instanceOf,
          instanceKwargs: { ...(frame.instanceKwargs ?? {}) },
        }
      : {}),
  };
}

function bakeFrameTree(
  design: DesignDefinition,
  tokens: Map<string, unknown>,
  raw: CatalFrame,
): BakedFrame {
  return expandTypeStyleIntoFrame(design, tokens, pruneHiddenChildrenTree(raw));
}

/**
 * Fully materialised, draw-oriented JSON: one **`BakedComponentJson`** per component (default params),
 * no token tables or variant registries.
 */
export function buildBakedDesignSystem(
  design: DesignDefinition,
  opts: { theme?: string } = {},
): BakedDesignDocument {
  const tokenMap = buildResolvedTokenMap(design, opts.theme, []);
  const resolveOpts = RESOLVE_OPTIONS_LITERAL_BAKE;
  const components: Record<string, BakedComponentJson> = {};

  for (const c of [...design.components.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    const bakedParams = resolveDefaultParamValues(design, tokenMap, c);
    const raw = resolveComponentTree(design, c.name, tokenMap, {}, resolveOpts);
    components[c.name] = {
      name: c.name,
      rootKind: c.rootKind,
      bakedParams,
      root: bakeFrameTree(design, tokenMap, raw),
    };
  }

  const previewBackground = resolvePreviewBackgroundCss(design, tokenMap);
  return {
    schemaKind: "bakedDesign",
    schemaVersion: PDL_JSON_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    provenance: {
      entryPath: design.entryPath,
      bakedTheme: opts.theme ?? null,
      bakeProfile: "system-defaults",
    },
    ...(previewBackground ? { previewBackground } : {}),
    components,
  };
}

/**
 * Single-component bake (explicit params + optional theme).
 */
export function buildBakedDesignComponent(
  design: DesignDefinition,
  opts: { componentName: string; theme?: string; paramOverrides?: Record<string, unknown> },
): BakedDesignDocument {
  const { componentName, theme, paramOverrides = {} } = opts;
  const c = design.components.get(componentName);
  if (!c) {
    throw new PdlError("PDL-E037", `Unknown component ${componentName}`, { path: design.entryPath });
  }
  const tokenMap = buildResolvedTokenMap(design, theme, []);
  const resolveOpts = RESOLVE_OPTIONS_LITERAL_BAKE;
  const defaults = resolveDefaultParamValues(design, tokenMap, c);
  const bakedParams = { ...defaults, ...paramOverrides };
  const raw = resolveComponentTree(design, componentName, tokenMap, paramOverrides, resolveOpts);

  const previewBackground = resolvePreviewBackgroundCss(design, tokenMap);
  return {
    schemaKind: "bakedDesign",
    schemaVersion: PDL_JSON_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    provenance: {
      entryPath: design.entryPath,
      bakedTheme: theme ?? null,
      bakeProfile: "component-explicit",
    },
    ...(previewBackground ? { previewBackground } : {}),
    components: {
      [componentName]: {
        name: componentName,
        rootKind: c.rootKind,
        bakedParams,
        root: bakeFrameTree(design, tokenMap, raw),
      },
    },
  };
}
