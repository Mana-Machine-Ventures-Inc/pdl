import type { DesignDefinition } from "./designModel.js";
import { PdlError } from "./errors.js";
import { PDL_JSON_SCHEMA_VERSION } from "./graphJson.js";
import { buildResolvedTokenMap } from "./evaluate.js";
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
  components: Record<string, BakedComponentJson>;
};

function stripPresetTypeStyleName(frame: CatalFrame): CatalFrame {
  const props = { ...frame.props };
  if (typeof props.typeStyle === "string" && Object.keys(props).length > 1) {
    delete props.typeStyle;
  }
  return {
    id: frame.id,
    kind: frame.kind,
    props,
    children: frame.children.map(stripPresetTypeStyleName),
    ...(frame.instanceOf !== undefined
      ? {
          instanceOf: frame.instanceOf,
          instanceKwargs: { ...(frame.instanceKwargs ?? {}) },
        }
      : {}),
  };
}

function bakeFrameTree(raw: CatalFrame): BakedFrame {
  return stripPresetTypeStyleName(pruneHiddenChildrenTree(raw));
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
      root: bakeFrameTree(raw),
    };
  }

  return {
    schemaKind: "bakedDesign",
    schemaVersion: PDL_JSON_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    provenance: {
      entryPath: design.entryPath,
      bakedTheme: opts.theme ?? null,
      bakeProfile: "system-defaults",
    },
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
    throw new PdlError("PDL-E006", `Unknown component ${componentName}`, { path: design.entryPath });
  }
  const tokenMap = buildResolvedTokenMap(design, theme, []);
  const resolveOpts = RESOLVE_OPTIONS_LITERAL_BAKE;
  const defaults = resolveDefaultParamValues(design, tokenMap, c);
  const bakedParams = { ...defaults, ...paramOverrides };
  const raw = resolveComponentTree(design, componentName, tokenMap, paramOverrides, resolveOpts);

  return {
    schemaKind: "bakedDesign",
    schemaVersion: PDL_JSON_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    provenance: {
      entryPath: design.entryPath,
      bakedTheme: theme ?? null,
      bakeProfile: "component-explicit",
    },
    components: {
      [componentName]: {
        name: componentName,
        rootKind: c.rootKind,
        bakedParams,
        root: bakeFrameTree(raw),
      },
    },
  };
}
