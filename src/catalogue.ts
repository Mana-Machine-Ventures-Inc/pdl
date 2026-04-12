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
  params: { name: string; type: string; default: unknown; cases?: string[] }[];
  expose: string[];
  usage: string;
  base: { params: Record<string, string>; tree: CatalFrame };
  variants: CatalogueVariantEntry[];
};

export type ComponentCatalogue = {
  schemaVersion: string;
  generatedAt: string;
  theme: string;
  tokens: Record<string, unknown>;
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
): { type: string; cases?: string[]; default: unknown } {
  const v = design.variants.get(p.typeName);
  if (v) {
    return {
      type: "variant",
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
    };
  });
}

export function buildComponentCatalogue(
  design: DesignDefinition,
  opts: { theme?: string; modifiers?: string[] } = {},
): ComponentCatalogue {
  const theme = opts.theme ?? "";
  const tokenMap = buildResolvedTokenMap(design, opts.theme || undefined, opts.modifiers ?? []);
  const components: CatalogueComponent[] = [];

  for (const c of design.components.values()) {
    const baseTree = resolveComponentTree(design, c.name, tokenMap, {}, {
      useStringPlaceholders: true,
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
          { useStringPlaceholders: true },
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

  return {
    schemaVersion: SCHEMA,
    generatedAt: new Date().toISOString(),
    theme: theme || "(none)",
    tokens: Object.fromEntries([...tokenMap.entries()].sort(([a], [b]) => a.localeCompare(b))),
    components,
  };
}
