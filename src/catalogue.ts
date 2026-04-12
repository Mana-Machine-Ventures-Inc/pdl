import type { ComponentDecl, FrameBodyItem } from "./ast.js";
import type { DesignDefinition } from "./designModel.js";
import { PdlError } from "./errors.js";
import { buildResolvedTokenMap } from "./evaluate.js";
import { resolveComponentTree, resolveDefaultParamValues, type CatalFrame } from "./resolveTree.js";

const SCHEMA = "1.0.0-beta";

export type CatalogueVariantEntry = {
  /** Full snapshot of every variant-typed parameter for this permutation. */
  params: Record<string, string>;
  affectedFrames: string[];
  changes: { frameId: string; prop: string; value: unknown }[];
  structuralChange?: boolean;
  /**
   * When present, ordered Root direct-child frame ids for this permutation (differs from component-level **`children`**).
   * Omitted when the same as default. Full subtrees live in **`childNodes`** keyed by id.
   */
  children?: string[];
};

export type CatalogueComponent = {
  name: string;
  params: {
    name: string;
    type: string;
    default: unknown;
    /** PDL `variant` type name when `type` is `"variant"` (e.g. for Figma variant property sets); allowed cases live on **`variantTypes`** only. */
    variantTypeName?: string;
  }[];
  expose: string[];
  usage: string;
  /** Root frame kind (`layout`, `text`, `icon`, or `media`). */
  kind: string;
  /** Root frame properties for the **default** (all variant params at defaults) resolution. */
  props: Record<string, unknown>;
  /**
   * Stringified default bindings for every component param (for tooling / parity with former `base.params`).
   */
  defaultParams: Record<string, string>;
  /**
   * Every candidate direct child of Root across `if` branches: id → catalogue **subtree** (same node shape as a tree child: `id`, `kind`, `props`, `children`).
   */
  childNodes: Record<string, CatalFrame>;
  /** Ordered Root child frame ids when all variant parameters are at their defaults. */
  children: string[];
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

/** Frame refs appearing in `children = […]` targeting Root, unioned across `if` branches (not inside `let` bodies). */
function collectRootLevelFrameRefTargets(body: FrameBodyItem[]): Set<string> {
  const s = new Set<string>();
  const walk = (items: FrameBodyItem[]) => {
    for (const it of items) {
      if (it.kind === "children" && it.target === "root") {
        for (const e of it.entries) {
          if (e.kind === "frameRef") s.add(e.id);
        }
      } else if (it.kind === "if") {
        for (const br of it.chain.branches) walk(br.body);
        if (it.chain.elseBody) walk(it.chain.elseBody);
      }
    }
  };
  walk(body);
  return s;
}

function directRootChildSubtree(tree: CatalFrame, id: string): CatalFrame | null {
  const ch = tree.children.find((x) => x.id === id);
  return ch ? frameToJson(ch) : null;
}

function variantParamAxes(
  design: DesignDefinition,
  c: ComponentDecl,
): { name: string; cases: string[] }[] {
  return c.params
    .filter((p) => design.variants.has(p.typeName))
    .map((p) => ({ name: p.name, cases: [...design.variants.get(p.typeName)!.cases] }));
}

function defaultVariantAssignment(design: DesignDefinition, c: ComponentDecl): Record<string, string> {
  const o: Record<string, string> = {};
  for (const p of c.params) {
    if (!design.variants.has(p.typeName)) continue;
    const dv = p.defaultValue;
    if (dv.kind !== "dotEnum") {
      throw new PdlError(
        "PDL-E010",
        `Variant parameter \`${p.name}\` on component ${c.name} must use a dot-enum default`,
        { path: design.entryPath },
      );
    }
    o[p.name] = stripDot(dv.value);
  }
  return o;
}

function*eachVariantAssignment(axes: { name: string; cases: string[] }[]): Generator<Record<string, string>> {
  if (axes.length === 0) return;
  const [head, ...tail] = axes;
  if (tail.length === 0) {
    for (const c of head.cases) yield { [head.name]: c };
    return;
  }
  for (const c of head.cases) {
    for (const rest of eachVariantAssignment(tail)) {
      yield { [head.name]: c, ...rest };
    }
  }
}

function assignmentKey(assign: Record<string, string>): string {
  return JSON.stringify(Object.fromEntries(Object.entries(assign).sort(([a], [b]) => a.localeCompare(b))));
}

function assignmentsEqual(
  a: Record<string, string>,
  b: Record<string, string>,
  keys: string[],
): boolean {
  return keys.every((k) => a[k] === b[k]);
}

function stripRootChildrenFromChanges(
  changes: CatalogueVariantEntry["changes"],
): CatalogueVariantEntry["changes"] {
  return changes.filter((ch) => !(ch.frameId === "Root" && ch.prop === "children"));
}

function buildChildNodesMap(
  design: DesignDefinition,
  candidateIds: string[],
  scanTrees: CatalFrame[],
  componentName: string,
): Record<string, CatalFrame> {
  const out: Record<string, CatalFrame> = {};
  for (const id of candidateIds) {
    let node: CatalFrame | null = null;
    for (const t of scanTrees) {
      node = directRootChildSubtree(t, id);
      if (node) break;
    }
    if (!node) {
      throw new PdlError(
        "PDL-E001",
        `Catalogue: could not resolve childNode \`${id}\` under Root for component ${componentName}`,
        { path: design.entryPath },
      );
    }
    out[id] = node;
  }
  return out;
}

function paramCatalogueType(
  design: DesignDefinition,
  p: import("./ast.js").ComponentParam,
  resolvedDefault: unknown,
): { type: string; default: unknown; variantTypeName?: string } {
  const v = design.variants.get(p.typeName);
  if (v) {
    return {
      type: "variant",
      variantTypeName: p.typeName,
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

  const resolveOpts = { useStringPlaceholders: true, catalogueTokenRefs: true } as const;

  for (const c of design.components.values()) {
    const baseTree = resolveComponentTree(design, c.name, tokenMap, {}, resolveOpts);
    const baseParamsStr = baseParamStrings(design, c, tokenMap);
    const expose = design.expose.get(c.name) ?? c.params.map((p) => p.name);

    const defaultChildOrder = baseTree.children.map((ch) => ch.id);
    const candidateIdList = [...collectRootLevelFrameRefTargets(c.body)].sort((a, b) => a.localeCompare(b));

    const axes = variantParamAxes(design, c);
    const defaultAssign = defaultVariantAssignment(design, c);
    const variantKeys = axes.map((a) => a.name);

    const treesByAssignKey = new Map<string, CatalFrame>();
    treesByAssignKey.set(assignmentKey(defaultAssign), baseTree);

    const scanTrees: CatalFrame[] = [baseTree];
    for (const assign of eachVariantAssignment(axes)) {
      if (assignmentsEqual(assign, defaultAssign, variantKeys)) continue;
      const k = assignmentKey(assign);
      if (treesByAssignKey.has(k)) continue;
      const t = resolveComponentTree(design, c.name, tokenMap, assign, resolveOpts);
      treesByAssignKey.set(k, t);
      scanTrees.push(t);
    }

    const childNodes = buildChildNodesMap(design, candidateIdList, scanTrees, c.name);

    const variants: CatalogueVariantEntry[] = [];
    for (const assign of eachVariantAssignment(axes)) {
      if (assignmentsEqual(assign, defaultAssign, variantKeys)) continue;
      const tree2 = treesByAssignKey.get(assignmentKey(assign))!;
      const { changes, affected, structural } = diffTrees(baseTree, tree2);
      const childOrder2 = tree2.children.map((ch) => ch.id);
      const childrenOverride =
        JSON.stringify(childOrder2) !== JSON.stringify(defaultChildOrder) ? childOrder2 : undefined;
      const changesOut = childrenOverride ? stripRootChildrenFromChanges(changes) : changes;
      const structuralOut = structural || Boolean(childrenOverride);
      if (changesOut.length === 0 && childrenOverride === undefined) continue;
      variants.push({
        params: assign,
        affectedFrames: [...affected],
        changes: changesOut,
        ...(structuralOut ? { structuralChange: true } : {}),
        ...(childrenOverride ? { children: childrenOverride } : {}),
      });
    }
    variants.sort((a, b) => assignmentKey(a.params).localeCompare(assignmentKey(b.params)));

    const baseJson = frameToJson(baseTree);
    components.push({
      name: c.name,
      params: catalogueParams(design, c, tokenMap),
      expose,
      usage: "",
      kind: baseTree.kind,
      props: { ...baseJson.props },
      defaultParams: baseParamsStr,
      childNodes,
      children: defaultChildOrder,
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
