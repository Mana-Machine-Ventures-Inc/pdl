import type { ComponentDecl } from "./ast.js";
import type { DesignDefinition } from "./designModel.js";
import { buildResolvedTokenMap } from "./evaluate.js";
import { resolveComponentTree, resolveDefaultParamValues, type CatalFrame } from "./resolveTree.js";

const SCHEMA = "1.0.0-beta";

export type CatalogueVariantEntry = {
  params: Record<string, string>;
  affectedFrames: string[];
  changes: { frameId: string; prop: string; value: unknown }[];
  structuralChange?: boolean;
};

export type CatalogueComponent = {
  name: string;
  params: {
    name: string;
    type: string;
    default: unknown;
    cases?: string[];
    /** PDL `variant` type name when `type` is `"variant"` (e.g. for Figma variant property sets). */
    variantTypeName?: string;
  }[];
  expose: string[];
  usage: string;
  base: { params: Record<string, string>; tree: CatalFrame };
  variants: CatalogueVariantEntry[];
};

/** Declared `variant` types in the merged design (sorted by `name`). */
export type CatalogueVariantTypeDef = {
  name: string;
  cases: string[];
};

export type ComponentCatalogue = {
  /** Discriminant when multiple JSON artefacts are bundled or stored together. */
  kind: "componentCatalogue";
  schemaVersion: string;
  generatedAt: string;
  /**
   * Active theme context used when resolving **trees** and the flat **`tokens`** map
   * (`(none)` if no named theme was selected on the CLI).
   */
  theme: string;
  /** All `theme` names declared in the merged design (sorted). */
  themesDeclared: string[];
  /**
   * Full resolved token map for the **active** context (same entries as the `Map` passed to
   * `resolveComponentTree`). When CLI **`--theme`** / **`modifiers`** are used, this slice can
   * differ from every pure-theme row in **`tokensByTheme`**.
   */
  tokens: Record<string, unknown>;
  /**
   * Every named resolution context: **`base`** = primitives + semantics with **no** `theme { }`
   * overrides applied, then one key per declared **`theme`** (sorted) = full map after applying
   * that theme’s overrides only. Receivers can flatten, diff, or drive runtime switching without
   * re-running the PDL resolver. Keys are stable strings (`"base"`, theme names).
   */
  tokensByTheme: Record<string, Record<string, unknown>>;
  /**
   * All merged **`variant { … }`** definitions: **`name`** is the PDL type identifier;
   * **`cases`** are case ids without a leading dot. Emitters (e.g. Figma) can map param
   * **`variantTypeName`** (per component) to these rows for stable property naming.
   */
  variantTypes: CatalogueVariantTypeDef[];
  components: CatalogueComponent[];
};

function frameToJson(f: CatalFrame): CatalFrame {
  return {
    id: f.id,
    kind: f.kind,
    props: { ...f.props },
    children: f.children.map(frameToJson),
  };
}

function diffTrees(a: CatalFrame, b: CatalFrame): {
  changes: CatalogueVariantEntry["changes"];
  affected: Set<string>;
  structural: boolean;
} {
  const changes: CatalogueVariantEntry["changes"] = [];
  const affected = new Set<string>();
  let structural = false;

  const walk = (fa: CatalFrame, fb: CatalFrame) => {
    if (fa.id !== fb.id) structural = true;
    const id = fb.id;
    const keys = new Set([...Object.keys(fa.props), ...Object.keys(fb.props)]);
    for (const k of keys) {
      if (JSON.stringify(fa.props[k]) !== JSON.stringify(fb.props[k])) {
        changes.push({ frameId: id, prop: k, value: fb.props[k] });
        affected.add(id);
      }
    }
    if (fa.children.length !== fb.children.length) {
      structural = true;
      changes.push({ frameId: id, prop: "children", value: fb.children });
      affected.add(id);
      return;
    }
    for (let i = 0; i < fa.children.length; i++) {
      walk(fa.children[i]!, fb.children[i]!);
    }
  };

  walk(a, b);
  return { changes, affected, structural };
}

function paramCatalogueType(
  design: DesignDefinition,
  p: import("./ast.js").ComponentParam,
  resolvedDefault: unknown,
): { type: string; cases?: string[]; default: unknown; variantTypeName?: string } {
  const v = design.variants.get(p.typeName);
  if (v) {
    return {
      type: "variant",
      variantTypeName: p.typeName,
      cases: v.cases.map((c) => c),
      default: resolvedDefault,
    };
  }
  return { type: p.typeName, default: resolvedDefault };
}

function stripDot(s: string): string {
  return s.startsWith(".") ? s.slice(1) : s;
}

function baseParamStrings(design: DesignDefinition, c: ComponentDecl, tokens: Map<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  const pv = resolveDefaultParamValues(design, tokens, c);
  for (const [k, v] of Object.entries(pv)) {
    out[k] = typeof v === "string" ? v : JSON.stringify(v);
  }
  return out;
}

function catalogueParams(
  design: DesignDefinition,
  c: ComponentDecl,
  tokens: Map<string, unknown>,
): CatalogueComponent["params"] {
  const defaults = resolveDefaultParamValues(design, tokens, c);
  return c.params.map((p) => {
    const t = paramCatalogueType(design, p, defaults[p.name]);
    return {
      name: p.name,
      type: t.type,
      default: t.default,
      ...(t.cases ? { cases: t.cases } : {}),
      ...(t.variantTypeName ? { variantTypeName: t.variantTypeName } : {}),
    };
  });
}

function sortedTokenRecord(m: Map<string, unknown>): Record<string, unknown> {
  return Object.fromEntries([...m.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

/** Full token maps: `base` (no theme overrides) + one entry per declared theme (no CLI modifiers). */
export function buildTokensByTheme(design: DesignDefinition): Record<string, Record<string, unknown>> {
  const themesDeclared = [...design.themes.keys()].sort();
  const out: Record<string, Record<string, unknown>> = {
    base: sortedTokenRecord(buildResolvedTokenMap(design, undefined, [])),
  };
  for (const name of themesDeclared) {
    out[name] = sortedTokenRecord(buildResolvedTokenMap(design, name, []));
  }
  return out;
}

export function buildComponentCatalogue(
  design: DesignDefinition,
  opts: { theme?: string; modifiers?: string[] } = {},
): ComponentCatalogue {
  const theme = opts.theme ?? "";
  const tokenMap = buildResolvedTokenMap(design, opts.theme || undefined, opts.modifiers ?? []);
  const tokensByTheme = buildTokensByTheme(design);
  const components: CatalogueComponent[] = [];

  for (const c of design.components.values()) {
    const baseTree = resolveComponentTree(design, c.name, tokenMap, {}, {
      useStringPlaceholders: true,
      catalogueTokenRefs: true,
    });
    const baseParamsStr = baseParamStrings(design, c, tokenMap);
    const expose = design.expose.get(c.name) ?? c.params.map((p) => p.name);

    const variants: CatalogueVariantEntry[] = [];

    for (const p of c.params) {
      const vdecl = design.variants.get(p.typeName);
      if (!vdecl) continue;
      const defCase =
        p.defaultValue.kind === "dotEnum"
          ? stripDot(p.defaultValue.value)
          : String(p.defaultValue);
      for (const caseName of vdecl.cases) {
        if (caseName === defCase) continue;
        const tree2 = resolveComponentTree(
          design,
          c.name,
          tokenMap,
          { [p.name]: caseName },
          { useStringPlaceholders: true, catalogueTokenRefs: true },
        );
        const { changes, affected, structural } = diffTrees(baseTree, tree2);
        if (changes.length === 0) continue;
        variants.push({
          params: { [p.name]: caseName },
          affectedFrames: [...affected],
          changes,
          ...(structural ? { structuralChange: true } : {}),
        });
      }
    }

    components.push({
      name: c.name,
      params: catalogueParams(design, c, tokenMap),
      expose,
      usage: "",
      base: { params: baseParamsStr, tree: frameToJson(baseTree) },
      variants,
    });
  }

  const themesDeclared = [...design.themes.keys()].sort();
  const variantTypes: CatalogueVariantTypeDef[] = [...design.variants.values()]
    .map((v) => ({ name: v.name, cases: [...v.cases] }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    kind: "componentCatalogue",
    schemaVersion: SCHEMA,
    generatedAt: new Date().toISOString(),
    theme: theme || "(none)",
    themesDeclared,
    tokens: sortedTokenRecord(tokenMap),
    tokensByTheme,
    variantTypes,
    components,
  };
}
