import type {
  ComponentDecl,
  ConditionExpr,
  FrameBodyItem,
  InteractionDecl,
  InteractionHandlerItem,
  InteractionIfChain,
  RulesStatement,
} from "./ast.js";
import type { DesignDefinition } from "./designModel.js";
import { PdlError } from "./errors.js";
import { buildResolvedTokenMap, evaluateValue } from "./evaluate.js";
import {
  PDL_JSON_SCHEMA_VERSION,
  type GraphThemeEntry,
  type GraphTokenRow,
  type GraphTypeStyleEntry,
} from "./graphJson.js";

export { PDL_JSON_SCHEMA_VERSION, type GraphThemeEntry, type GraphTokenRow, type GraphTypeStyleEntry } from "./graphJson.js";
import { serialiseConditionExpr, serialiseValueExpr, serialiseValueExprWithTokenRefs } from "./graph.js";
import { collectAnimationFromHandlerItems } from "./applyMotion.js";
import { normalizeTransition, type AnimationSpec } from "./motionProps.js";
import { ruleLineToDef, type RuleDefJson } from "./rulesJson.js";
import {
  isHiddenFrame,
  RESOLVE_OPTIONS_GRAPH_CATALOGUE,
  resolveComponentTree,
  resolveDefaultParamValues,
  type CatalFrame,
} from "./resolveTree.js";

function negateCondition(c: ConditionExpr): ConditionExpr {
  return { kind: "not", expr: c };
}

/** Logical AND of an outer `when` (from enclosing `rules if`) and a branch-local conjunct. */
function conjoinWhen(outer: ConditionExpr | undefined, inner: ConditionExpr | undefined): ConditionExpr | undefined {
  if (!outer) return inner;
  if (!inner) return outer;
  return { kind: "and", items: [outer, inner] };
}

/** AND of one or more conjuncts (undefined if empty). */
function conjoinMany(conjuncts: ConditionExpr[]): ConditionExpr | undefined {
  if (conjuncts.length === 0) return undefined;
  if (conjuncts.length === 1) return conjuncts[0];
  return { kind: "and", items: conjuncts };
}

/**
 * TODO: Today only **top-level** `tags =` / `tags.add` in a `rules C { … }` block affect
 * `componentCatalogue.components[C].rules.tags`. Statements inside `if { … }` bodies are ignored
 * for that array — decide spec (e.g. union all branches, or branch-scoped tags on each flattened
 * rule) and implement.
 */
function effectiveRuleTags(statements: RulesStatement[]): string[] {
  let t: string[] = [];
  for (const st of statements) {
    if (st.kind === "tagsSet") t = [...st.tags];
    else if (st.kind === "tagsAdd") t = [...t, st.tag];
  }
  return t;
}

function flattenRulesWithWhen(
  statements: RulesStatement[],
): Array<RuleDefJson & { when?: ConditionExpr }> {
  const out: Array<RuleDefJson & { when?: ConditionExpr }> = [];
  const walk = (xs: RulesStatement[], parentWhen?: ConditionExpr) => {
    for (const st of xs) {
      if (st.kind === "ruleLine") {
        const def = ruleLineToDef(st.strength, st.query, st.description);
        out.push(parentWhen ? { ...def, when: parentWhen } : def);
      } else if (st.kind === "if") {
        const negPrior: ConditionExpr[] = [];
        for (const br of st.chain.branches) {
          const innerWhen: ConditionExpr =
            negPrior.length === 0
              ? br.condition
              : (conjoinMany([...negPrior.map(negateCondition), br.condition]) as ConditionExpr);
          const when = conjoinWhen(parentWhen, innerWhen);
          walk(br.body, when);
          negPrior.push(br.condition);
        }
        if (st.chain.elseBody) {
          const elseInner =
            negPrior.length === 0 ? undefined : conjoinMany(negPrior.map(negateCondition));
          const elseWhen = conjoinWhen(parentWhen, elseInner);
          walk(st.chain.elseBody, elseWhen);
        }
      }
    }
  };
  walk(statements);
  return out;
}

function serialiseInteractionIfChain(chain: InteractionIfChain): unknown {
  return {
    branches: chain.branches.map((br) => ({
      condition: serialiseConditionExpr(br.condition),
      body: br.body.map(serialiseInteractionHandlerItem),
    })),
    ...(chain.elseBody ? { elseBody: chain.elseBody.map(serialiseInteractionHandlerItem) } : {}),
  };
}

function serialiseInteractionHandlerItem(item: InteractionHandlerItem): unknown {
  switch (item.kind) {
    case "assign":
      return { kind: "assign", param: item.param, value: serialiseValueExpr(item.value) };
    case "animate":
      return {
        kind: "animate",
        value: serialiseValueExpr(item.value),
        ...(item.target ? { target: item.target } : {}),
      };
    case "emit":
      return { kind: "emit", name: item.name, args: item.args };
    case "hostVerb":
      return {
        kind: "hostVerb",
        name: item.name,
        args: item.args,
        ...(item.qualifier ? { qualifier: item.qualifier } : {}),
      };
    case "if":
      return { kind: "if", chain: serialiseInteractionIfChain(item.chain) };
    default: {
      const _x: never = item;
      void _x;
      return { kind: "unknown" };
    }
  }
}

function animationSpecToCatalogue(spec: AnimationSpec): Record<string, unknown> {
  const out: Record<string, unknown> = {
    kind: "animation",
    keys: spec.keys.map((k) => ({
      timing: {
        duration: k.timing.duration,
        ease: k.timing.ease,
        delay: k.timing.delay,
      },
      pose: k.pose === "rest" ? "rest" : { ...k.pose },
    })),
  };
  if (spec.start != null) {
    out.start = spec.start === "rest" ? "rest" : { ...spec.start };
  }
  if (spec.stagger != null) out.stagger = spec.stagger;
  if (spec.staggerFrom) out.staggerFrom = spec.staggerFrom;
  if (spec.repeat != null) out.repeat = spec.repeat;
  return out;
}

function evaluateAnimationSpec(
  items: InteractionHandlerItem[],
  design: DesignDefinition,
  tokenMap: Map<string, unknown>,
): AnimationSpec | undefined {
  return collectAnimationFromHandlerItems(
    items,
    (expr) => {
      try {
        const v = evaluateValue(expr, { design, tokens: tokenMap });
        return typeof v === "number" && Number.isFinite(v) ? v : undefined;
      } catch {
        return undefined;
      }
    },
    (expr) => {
      try {
        return normalizeTransition(evaluateValue(expr, { design, tokens: tokenMap }));
      } catch {
        return undefined;
      }
    },
    (expr) => {
      try {
        return evaluateValue(expr, { design, tokens: tokenMap });
      } catch {
        return undefined;
      }
    },
  );
}

function evaluateAnimationTargets(
  items: InteractionHandlerItem[],
  design: DesignDefinition,
  tokenMap: Map<string, unknown>,
): Array<{ target: string; animation: Record<string, unknown> }> {
  const out: Array<{ target: string; animation: Record<string, unknown> }> = [];
  for (const item of items) {
    if (item.kind !== "animate" || !item.target) continue;
    const animation = evaluateAnimationSpec(
      [{ kind: "animate", value: item.value }],
      design,
      tokenMap,
    );
    if (!animation) continue;
    out.push({ target: item.target, animation: animationSpecToCatalogue(animation) });
  }
  return out;
}

function serialiseInteractionDecl(
  decl: InteractionDecl,
  design: DesignDefinition,
  tokenMap: Map<string, unknown>,
): unknown {
  return {
    name: decl.name,
    component: decl.component,
    handlers: decl.handlers.map((h) => {
      const animation = evaluateAnimationSpec(h.body, design, tokenMap);
      const animationTargets = evaluateAnimationTargets(h.body, design, tokenMap);
      return {
        event: h.event,
        body: h.body.map(serialiseInteractionHandlerItem),
        ...(animation ? { animation: animationSpecToCatalogue(animation) } : {}),
        ...(animationTargets.length ? { animationTargets } : {}),
      };
    }),
  };
}

/** Catalogue interaction decls (including evaluated `animation`) keyed by component. */
export function interactionsByComponentFromDesign(
  design: DesignDefinition,
  tokenMap?: Map<string, unknown>,
): Record<string, unknown[]> {
  const tokens = tokenMap ?? buildResolvedTokenMap(design);
  const out: Record<string, unknown[]> = {};
  for (const [name, imap] of design.interactions.entries()) {
    if (!imap.size) continue;
    out[name] = [...imap.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((d) => serialiseInteractionDecl(d, design, tokens) as unknown);
  }
  return out;
}

/**
 * Ordered **child-embedding** patch: replace **`frameId`**’s visible child list with **`children`** (frame ids).
 * Semantics: **move** — each id in **`children`** is removed from any other parent’s list before assignment.
 * Callers may apply patches in sequence; brief invalid states between steps are tolerated if validated only at the end.
 */
export type CatalogueChildPatchOp = {
  op: "setChildren";
  frameId: string;
  children: string[];
};

export type CatalogueVariantEntry = {
  /** Full snapshot of every variant-typed parameter for this permutation. */
  params: Record<string, string>;
  affectedFrames: string[];
  /** Non-structural property deltas keyed by stable **`frameId`** (id-aligned; never uses positional child pairing). */
  changes: { frameId: string; prop: string; value: unknown }[];
  structuralChange?: boolean;
  /**
   * When this permutation’s **child hierarchy** differs from the default, the full map (same shape as component **`childHierarchy`**).
   * Omitted when identical to default. Structural wiring uses **only** this map (no separate **`patches`** / **`children`**).
   */
  childHierarchy?: Record<string, string[]>;
};

/** Component root shell: **`kind`** + resolved **`props`** (default param tuple). */
export type CatalogueComponentRoot = {
  kind: string;
  props: Record<string, unknown>;
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
  /** Primary human-readable line from merged `usage.description` (empty if unset). */
  usage: string;
  /** All merged `usage` keys (including unknown keys preserved per spec). */
  usageByKey?: Record<string, string>;
  /** Named fixture → resolved param map for preview / codegen. */
  fixtures?: Record<string, Record<string, unknown>>;
  /** Merged `rules`: base tags plus flattened `Rule` rows with optional `when` conditions. */
  rules?: { tags: string[]; rules: Array<RuleDefJson & { when?: unknown }> };
  /** Preview-time `interaction` handlers (serialised `ValueExpr` shapes). */
  interactions?: unknown[];
  /** Root frame (**`kind`**, **`props`**) for the default resolution — separate from **`childNodes`** (no nesting here). */
  root: CatalogueComponentRoot;
  /**
   * Stringified default bindings for every component param (for tooling / parity with former `base.params`).
   */
  defaultParams: Record<string, string>;
  /**
   * **Node registry**: every frame id that appears in any default/variant resolution (except **`Root`**), id → shell
   * (**`kind`**, **`props`**, optional **`instanceOf`** / **`instanceKwargs`**, **`children`: []**). No parent/child wiring here.
   */
  childNodes: Record<string, CatalFrame>;
  /**
   * **Child hierarchy** for the **default** resolution: each frame id → ordered **visible** direct child ids
   * (includes **`"Root"`**). Adjacency only; node payloads live in **`childNodes`**. Root’s direct children are
   * **`childHierarchy["Root"]`**.
   */
  childHierarchy: Record<string, string[]>;
  /**
   * Transitive closure of **other** component names referenced via **`letInstance`** or **`children`** instance entries
   * in this component’s body (union across `if` branches), excluding **`name`** itself. Omitted when empty.
   */
  requiredComponents?: string[];
  variants: CatalogueVariantEntry[];
};

/** Declared `variant` types in the merged design (sorted by `name`). */
export type CatalogueVariantTypeDef = {
  name: string;
  cases: string[];
};

/** @see {@link GraphTokenRow} */
export type CataloguePrimitiveEntry = GraphTokenRow;

/** @see {@link GraphTokenRow} */
export type CatalogueSemanticEntry = GraphTokenRow;

/** @see {@link GraphThemeEntry} */
export type CatalogueThemeEntry = GraphThemeEntry;

/** @see {@link GraphTypeStyleEntry} */
export type CatalogueTypeStyleEntry = GraphTypeStyleEntry;

export type ComponentCatalogue = {
  /** Discriminant when multiple JSON artefacts are bundled or stored together. */
  kind: "componentCatalogue";
  schemaVersion: string;
  generatedAt: string;
  /**
   * Present only when the catalogue was built with a CLI **`--theme`**: active theme name for **tree**
   * resolution. Theme keys are otherwise listed under **`themes`** only.
   */
  theme?: string;
  /**
   * Every merged **`primitive`** (sorted keys): each **`definition`** appears **once** in the catalogue.
   */
  primitives: Record<string, CataloguePrimitiveEntry>;
  /**
   * Every merged **`semantic`** (sorted keys): each **`definition`** appears **once** in the catalogue.
   */
  semantics: Record<string, CatalogueSemanticEntry>;
  /**
   * Declared **`theme { … }`** blocks: **`baseTheme`** for inheritance (**`null`** if none); **`overrides`**
   * use **`primitive:`** / **`semantic:`** for bare token idents (same serialisation as **`definitions`**).
   */
  themes: Record<string, CatalogueThemeEntry>;
  /**
   * Every merged **`typeStyle`** (sorted keys): **`props`** use the same pointer serialisation as token definitions.
   */
  typeStyles: Record<string, CatalogueTypeStyleEntry>;
  /**
   * All merged **`variant { … }`** definitions keyed by type **`name`** (sorted keys in JSON).
   * **`cases`** are case ids without a leading dot.
   */
  variantTypes: Record<string, CatalogueVariantTypeDef>;
  /** One catalogue row per component, keyed by component **`name`**. */
  components: Record<string, CatalogueComponent>;
  /** Evaluated typed sample banks (`samples Tracks { … }`), when present. */
  samples?: Record<string, Record<string, Record<string, unknown>>>;
};

function frameToJson(f: CatalFrame): CatalFrame {
  return {
    id: f.id,
    kind: f.kind,
    props: { ...f.props },
    children: f.children.map(frameToJson),
    ...(f.instanceOf !== undefined
      ? {
          instanceOf: f.instanceOf,
          instanceKwargs: { ...(f.instanceKwargs ?? {}) },
        }
      : {}),
  };
}

/**
 * Collect **`other`** component names transitively required by **`rootName`** (instances and **`letInstance`** in body,
 * all **`if`** branches unioned). Excludes **`rootName`** itself.
 */
export function collectRequiredComponentNames(design: DesignDefinition, rootName: string): string[] {
  const root = design.components.get(rootName);
  if (!root) return [];

  const accumulateFromBody = (items: FrameBodyItem[], sink: Set<string>): void => {
    for (const it of items) {
      switch (it.kind) {
        case "letInstance":
          sink.add(it.component);
          break;
        case "children":
          for (const e of it.entries) {
            if (e.kind === "instance") sink.add(e.component);
          }
          break;
        case "let":
          accumulateFromBody(it.body, sink);
          break;
        case "if":
          for (const br of it.chain.branches) accumulateFromBody(br.body, sink);
          if (it.chain.elseBody) accumulateFromBody(it.chain.elseBody, sink);
          break;
        default:
          break;
      }
    }
  };

  const out = new Set<string>();
  accumulateFromBody(root.body, out);
  out.delete(rootName);

  const queue = [...out];
  while (queue.length) {
    const n = queue.shift()!;
    const c = design.components.get(n);
    if (!c) continue;
    const more = new Set<string>();
    accumulateFromBody(c.body, more);
    more.delete(rootName);
    for (const m of more) {
      if (!out.has(m)) {
        out.add(m);
        queue.push(m);
      }
    }
  }

  return [...out].sort((a, b) => a.localeCompare(b));
}

/** Single-frame shell for the **childNodes** registry (no nested **`children`**). */
function catalFrameShell(f: CatalFrame): CatalFrame {
  return {
    id: f.id,
    kind: f.kind,
    props: { ...f.props },
    children: [],
    ...(f.instanceOf !== undefined
      ? {
          instanceOf: f.instanceOf,
          instanceKwargs: { ...(f.instanceKwargs ?? {}) },
        }
      : {}),
  };
}

function mergeRegistryFromTree(tree: CatalFrame, sink: Map<string, CatalFrame>): void {
  const walk = (f: CatalFrame) => {
    if (f.id !== "Root") {
      if (!sink.has(f.id)) sink.set(f.id, catalFrameShell(f));
    }
    for (const ch of f.children) walk(ch);
  };
  walk(tree);
}

/** Union of all frame shells (except **`Root`**) seen across default + variant resolutions. */
function buildChildNodeRegistry(scanTrees: CatalFrame[]): Record<string, CatalFrame> {
  const sink = new Map<string, CatalFrame>();
  for (const t of scanTrees) mergeRegistryFromTree(t, sink);
  return Object.fromEntries([...sink.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

/** Visible child id lists per frame (hidden frames are skipped). */
function extractVisibleChildMap(tree: CatalFrame): Map<string, string[]> {
  const m = new Map<string, string[]>();
  const walk = (f: CatalFrame) => {
    const vis = f.children.filter((ch) => !isHiddenFrame(ch)).map((ch) => ch.id);
    m.set(f.id, vis);
    for (const ch of f.children) walk(ch);
  };
  walk(tree);
  return m;
}

/** Stable JSON object: frame id → visible direct child ids (default tree wiring). */
function visibleChildHierarchyRecord(tree: CatalFrame): Record<string, string[]> {
  const m = extractVisibleChildMap(tree);
  return Object.fromEntries([...m.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function collectFrameIds(tree: CatalFrame): Set<string> {
  const s = new Set<string>();
  const walk = (f: CatalFrame) => {
    s.add(f.id);
    for (const ch of f.children) walk(ch);
  };
  walk(tree);
  return s;
}

/** Depth from **`tree`**’s root (root = 0). */
function depthByFrameId(tree: CatalFrame): Map<string, number> {
  const d = new Map<string, number>();
  const walk = (f: CatalFrame, depth: number) => {
    d.set(f.id, depth);
    for (const ch of f.children) walk(ch, depth + 1);
  };
  walk(tree, 0);
  return d;
}

function cloneChildMap(m: Map<string, string[]>): Map<string, string[]> {
  return new Map([...m.entries()].map(([k, v]) => [k, [...v]]));
}

/**
 * Apply **`setChildren`** with **move** semantics: each child id is removed from every other parent’s list,
 * then **`parent`**’s list is replaced with **`next`** (in order).
 */
function applySetChildrenMove(cur: Map<string, string[]>, parent: string, next: string[]): void {
  const nextArr = [...next];
  for (const cid of nextArr) {
    for (const [p, list] of cur) {
      if (p === parent) continue;
      const idx = list.indexOf(cid);
      if (idx >= 0) {
        const copy = [...list];
        copy.splice(idx, 1);
        cur.set(p, copy);
      }
    }
  }
  cur.set(parent, nextArr);
}

/**
 * Build a short linear list of **`setChildren`** ops that reproduces **`target`**’s visible child map from **`base`**’s
 * when applied in order with **`applySetChildrenMove`** semantics.
 */
export function buildChildPatchOps(base: CatalFrame, target: CatalFrame, entryPath: string): CatalogueChildPatchOp[] {
  const baseM = extractVisibleChildMap(base);
  const tgtM = extractVisibleChildMap(target);
  const depth = depthByFrameId(target);
  const cur = cloneChildMap(baseM);
  const allIds = new Set([...collectFrameIds(base), ...collectFrameIds(target)]);
  for (const id of allIds) {
    if (!cur.has(id)) cur.set(id, [...(baseM.get(id) ?? tgtM.get(id) ?? [])]);
  }
  const ops: CatalogueChildPatchOp[] = [];
  const maxOps = 4096;
  for (let guard = 0; guard < maxOps; guard++) {
    const differing: string[] = [];
    for (const id of [...new Set([...cur.keys(), ...tgtM.keys()])].sort()) {
      if (JSON.stringify(cur.get(id) ?? []) !== JSON.stringify(tgtM.get(id) ?? [])) differing.push(id);
    }
    if (differing.length === 0) {
      return ops;
    }
    differing.sort((a, b) => {
      const da = depth.get(a) ?? -1;
      const db = depth.get(b) ?? -1;
      if (db !== da) return db - da;
      return a.localeCompare(b);
    });
    const p = differing[0]!;
    const want = tgtM.get(p) ?? [];
    applySetChildrenMove(cur, p, want);
    ops.push({ op: "setChildren", frameId: p, children: [...want] });
  }
  throw new PdlError("PDL-E001", "Catalogue: could not converge child patch ops for variant tree", {
    path: entryPath,
  });
}

type FrameSurface = {
  props: Record<string, unknown>;
  instanceOf?: string;
  instanceKwargs: Record<string, unknown>;
};

function collectFrameSurfaceById(f: CatalFrame, sink: Map<string, FrameSurface>): void {
  sink.set(f.id, {
    props: { ...f.props },
    instanceOf: f.instanceOf,
    instanceKwargs: f.instanceKwargs ? { ...f.instanceKwargs } : {},
  });
  for (const ch of f.children) collectFrameSurfaceById(ch, sink);
}

function emptySurface(): FrameSurface {
  return { props: {}, instanceKwargs: {} };
}

function diffFramePropsById(a: CatalFrame, b: CatalFrame): {
  changes: CatalogueVariantEntry["changes"];
  affected: Set<string>;
} {
  const mapA = new Map<string, FrameSurface>();
  const mapB = new Map<string, FrameSurface>();
  collectFrameSurfaceById(a, mapA);
  collectFrameSurfaceById(b, mapB);
  const changes: CatalogueVariantEntry["changes"] = [];
  const affected = new Set<string>();
  const ids = new Set([...mapA.keys(), ...mapB.keys()]);
  for (const id of [...ids].sort()) {
    const fa = mapA.get(id) ?? emptySurface();
    const fb = mapB.get(id) ?? emptySurface();
    const pa = fa.props;
    const pb = fb.props;
    const keys = new Set([...Object.keys(pa), ...Object.keys(pb)]);
    for (const k of [...keys].sort()) {
      if (JSON.stringify(pa[k]) !== JSON.stringify(pb[k])) {
        const value = Object.prototype.hasOwnProperty.call(pb, k) ? pb[k] : null;
        changes.push({ frameId: id, prop: k, value });
        affected.add(id);
      }
    }
    if (fa.instanceOf !== fb.instanceOf) {
      changes.push({ frameId: id, prop: "instanceOf", value: fb.instanceOf === undefined ? null : fb.instanceOf });
      affected.add(id);
    }
    if (JSON.stringify(fa.instanceKwargs) !== JSON.stringify(fb.instanceKwargs)) {
      changes.push({ frameId: id, prop: "instanceKwargs", value: fb.instanceKwargs });
      affected.add(id);
    }
  }
  return { changes, affected };
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

/** Drop **`changes`** lines that restate values already present on the catalogue **`childNodes`** shell. */
function stripChangesRedundantWithRegistry(
  changes: CatalogueVariantEntry["changes"],
  childNodes: Record<string, CatalFrame>,
): CatalogueVariantEntry["changes"] {
  return changes.filter((ch) => {
    const shell = childNodes[ch.frameId];
    if (!shell) return true;
    if (ch.prop === "instanceOf") {
      const v = shell.instanceOf === undefined ? null : shell.instanceOf;
      return JSON.stringify(v) !== JSON.stringify(ch.value);
    }
    if (ch.prop === "instanceKwargs") {
      const v = shell.instanceKwargs ?? {};
      return JSON.stringify(v) !== JSON.stringify(ch.value ?? {});
    }
    const pv = shell.props[ch.prop];
    return JSON.stringify(pv) !== JSON.stringify(ch.value);
  });
}

function collectAffectedFramesForVariant(
  changes: CatalogueVariantEntry["changes"],
  hierarchyDefault: Record<string, string[]>,
  hierarchyVariant: Record<string, string[]> | undefined,
): string[] {
  const s = new Set<string>();
  for (const ch of changes) s.add(ch.frameId);
  if (hierarchyVariant) {
    const keys = new Set([...Object.keys(hierarchyDefault), ...Object.keys(hierarchyVariant)]);
    for (const k of keys) {
      const a = hierarchyDefault[k] ?? [];
      const b = hierarchyVariant[k] ?? [];
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        s.add(k);
        for (const id of a) s.add(id);
        for (const id of b) s.add(id);
      }
    }
  }
  return [...s].sort();
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

/** Serialised token graph for the merged design (full **`primitives` / `semantics` / `themes` / `typeStyles`**). */
export function buildCatalogueTokenLayers(design: DesignDefinition): {
  primitives: Record<string, CataloguePrimitiveEntry>;
  semantics: Record<string, CatalogueSemanticEntry>;
  themes: Record<string, CatalogueThemeEntry>;
  typeStyles: Record<string, CatalogueTypeStyleEntry>;
} {
  const primitives: Record<string, CataloguePrimitiveEntry> = Object.fromEntries(
    [...design.primitives.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => [
        p.name,
        {
          name: p.name,
          tokenType: p.tokenType,
          definition: serialiseValueExprWithTokenRefs(p.value, design),
        },
      ]),
  );
  const semantics: Record<string, CatalogueSemanticEntry> = Object.fromEntries(
    [...design.semantics.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((s) => [
        s.name,
        {
          name: s.name,
          tokenType: s.tokenType,
          definition: serialiseValueExprWithTokenRefs(s.value, design),
        },
      ]),
  );
  const themes: Record<string, CatalogueThemeEntry> = Object.fromEntries(
    [...design.themes.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((t) => [
        t.name,
        {
          baseTheme: t.baseTheme ?? null,
          overrides: Object.fromEntries(
            Object.entries(t.overrides)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, expr]) => [k, serialiseValueExprWithTokenRefs(expr, design)]),
          ),
        },
      ]),
  );
  const typeStyles: Record<string, CatalogueTypeStyleEntry> = Object.fromEntries(
    [...design.typeStyles.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((ts) => [
        ts.name,
        {
          name: ts.name,
          props: Object.fromEntries(
            Object.entries(ts.props)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v]) => [k, serialiseValueExprWithTokenRefs(v, design)]),
          ),
        },
      ]),
  );
  return { primitives, semantics, themes, typeStyles };
}

function buildCatalogueSamples(
  design: DesignDefinition,
  tokens: Map<string, unknown>,
): Record<string, Record<string, Record<string, unknown>>> | undefined {
  if (design.samples.size === 0) return undefined;
  const samplesOut: Record<string, Record<string, Record<string, unknown>>> = {};
  for (const bank of [...design.samples.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    const entriesOut: Record<string, Record<string, unknown>> = {};
    for (const entry of bank.entries) {
      const fieldsOut: Record<string, unknown> = {};
      for (const field of entry.fields) {
        fieldsOut[field.name] = evaluateValue(field.value, {
          design,
          tokens,
          visiting: new Set(),
        });
      }
      entriesOut[entry.name] = fieldsOut;
    }
    samplesOut[bank.name] = entriesOut;
  }
  return samplesOut;
}

/**
 * Build a single **Component Catalogue** row (trees, variants, companions) without walking other components.
 * **`resolveOpts`** should normally be **`RESOLVE_OPTIONS_GRAPH_CATALOGUE`**.
 */
export function buildCatalogueComponentRow(
  design: DesignDefinition,
  tokenMap: Map<string, unknown>,
  c: ComponentDecl,
  resolveOpts: { useStringPlaceholders: boolean; catalogueTokenRefs: boolean },
): CatalogueComponent {
  const baseTree = resolveComponentTree(design, c.name, tokenMap, {}, resolveOpts);
  const baseParamsStr = baseParamStrings(design, c, tokenMap);
  const expose = design.expose.get(c.name) ?? c.params.map((p) => p.name);

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

  const childNodes = buildChildNodeRegistry(scanTrees);

  const hierarchyDefault = visibleChildHierarchyRecord(baseTree);

  const variants: CatalogueVariantEntry[] = [];
  for (const assign of eachVariantAssignment(axes)) {
    if (assignmentsEqual(assign, defaultAssign, variantKeys)) continue;
    const tree2 = treesByAssignKey.get(assignmentKey(assign))!;
    const hierarchyVariant = visibleChildHierarchyRecord(tree2);
    const variantHierarchyOut =
      JSON.stringify(hierarchyVariant) !== JSON.stringify(hierarchyDefault) ? hierarchyVariant : undefined;

    let changesOut = diffFramePropsById(baseTree, tree2).changes;
    changesOut = stripChangesRedundantWithRegistry(changesOut, childNodes);

    if (changesOut.length === 0 && variantHierarchyOut === undefined) continue;

    const structuralOut = Boolean(variantHierarchyOut);
    variants.push({
      params: assign,
      affectedFrames: collectAffectedFramesForVariant(changesOut, hierarchyDefault, variantHierarchyOut),
      changes: changesOut,
      ...(structuralOut ? { structuralChange: true } : {}),
      ...(variantHierarchyOut ? { childHierarchy: variantHierarchyOut } : {}),
    });
  }
  variants.sort((a, b) => assignmentKey(a.params).localeCompare(assignmentKey(b.params)));

  const baseJson = frameToJson(baseTree);

  const usageKeys = design.usage.get(c.name);
  const usageStr = usageKeys?.get("description") ?? "";
  const usageByKey =
    usageKeys && usageKeys.size > 0
      ? Object.fromEntries([...usageKeys.entries()].sort(([a], [b]) => a.localeCompare(b)))
      : undefined;

  const fxMap = design.fixtures.get(c.name);
  let fixturesOut: Record<string, Record<string, unknown>> | undefined;
  if (fxMap && fxMap.size > 0) {
    fixturesOut = {};
    for (const label of [...fxMap.keys()].sort()) {
      const ex = fxMap.get(label)!;
      const params: Record<string, unknown> = {};
      for (const b of ex.bindings) {
        params[b.name] = evaluateValue(b.value, {
          design,
          tokens: tokenMap,
          visiting: new Set(),
          paramValues: {},
          paramMeta: new Map(),
        });
      }
      if (ex.host) params.host = ex.host;
      if (ex.theme) params.theme = ex.theme;
      if (ex.hostFacts) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(ex.hostFacts);
        } catch (e) {
          throw new PdlError(
            "PDL-E050",
            `hostFacts in fixture "${label}" is not valid JSON: ${e instanceof Error ? e.message : String(e)}`,
            { path: design.entryPath },
          );
        }
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new PdlError("PDL-E050", `hostFacts in fixture "${label}" must be a JSON object`, {
            path: design.entryPath,
          });
        }
        params.hostFacts = parsed;
      }
      fixturesOut[label] = params;
    }
  }

  const rstmts = design.rules.get(c.name);
  let rulesOut: { tags: string[]; rules: Array<RuleDefJson & { when?: unknown }> } | undefined;
  if (rstmts?.length) {
    const flat = flattenRulesWithWhen(rstmts);
    rulesOut = {
      tags: effectiveRuleTags(rstmts),
      rules: flat.map((r) => {
        const { when, ...def } = r;
        return when ? { ...def, when: serialiseConditionExpr(when) } : def;
      }),
    };
  }

  const imap = design.interactions.get(c.name);
  const interactionsOut =
    imap && imap.size > 0
      ? [...imap.values()]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((d) => serialiseInteractionDecl(d, design, tokenMap))
      : undefined;

  const requiredComponents = collectRequiredComponentNames(design, c.name);
  const root: CatalogueComponentRoot = { kind: baseTree.kind, props: { ...baseJson.props } };

  return {
    name: c.name,
    params: catalogueParams(design, c, tokenMap),
    expose,
    usage: usageStr,
    ...(usageByKey ? { usageByKey } : {}),
    ...(fixturesOut ? { fixtures: fixturesOut } : {}),
    ...(rulesOut ? { rules: rulesOut } : {}),
    ...(interactionsOut ? { interactions: interactionsOut } : {}),
    root,
    defaultParams: baseParamsStr,
    childNodes,
    childHierarchy: hierarchyDefault,
    ...(requiredComponents.length ? { requiredComponents } : {}),
    variants,
  };
}

export function buildComponentCatalogue(
  design: DesignDefinition,
  opts: { theme?: string; modifiers?: string[] } = {},
): ComponentCatalogue {
  const tokenMap = buildResolvedTokenMap(design, opts.theme || undefined, opts.modifiers ?? []);
  const { primitives, semantics, themes, typeStyles } = buildCatalogueTokenLayers(design);
  const components: Record<string, CatalogueComponent> = {};

  for (const c of [...design.components.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    components[c.name] = buildCatalogueComponentRow(design, tokenMap, c, RESOLVE_OPTIONS_GRAPH_CATALOGUE);
  }

  const variantTypes: Record<string, CatalogueVariantTypeDef> = Object.fromEntries(
    [...design.variants.values()]
      .map((v): [string, CatalogueVariantTypeDef] => [v.name, { name: v.name, cases: [...v.cases] }])
      .sort(([a], [b]) => a.localeCompare(b)),
  );

  const samples = buildCatalogueSamples(design, tokenMap);

  return {
    kind: "componentCatalogue",
    schemaVersion: PDL_JSON_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    ...(opts.theme ? { theme: opts.theme } : {}),
    primitives,
    semantics,
    themes,
    typeStyles,
    variantTypes,
    components,
    ...(samples ? { samples } : {}),
  };
}
