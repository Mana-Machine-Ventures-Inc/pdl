import type { DesignDefinition } from "./designModel.js";
import {
  buildCatalogueComponentRow,
  collectRequiredComponentNames,
  type CatalogueComponent,
  type CatalogueVariantTypeDef,
} from "./catalogue.js";
import { buildResolvedTokenMap } from "./evaluate.js";
import { PdlError } from "./errors.js";
import { serialiseValueExprWithTokenRefs } from "./graph.js";
import { PDL_JSON_SCHEMA_VERSION, type GraphThemeEntry, type GraphTokenRow, type GraphTypeStyleEntry } from "./graphJson.js";
import { RESOLVE_OPTIONS_GRAPH_CATALOGUE } from "./resolveTree.js";
import { collectDeclaredTokenNamesFromValueExpr } from "./valueExprRefs.js";

const PRIMITIVE_REF = /^primitive:(.+)$/;
const SEMANTIC_REF = /^semantic:(.+)$/;

/** @see {@link GraphTokenRow} */
export type ResolvedPrimitiveEntry = GraphTokenRow;

/** @see {@link GraphTokenRow} */
export type ResolvedSemanticEntry = GraphTokenRow;

/** @see {@link GraphThemeEntry} — theme **name** is the map key on **`system.themes`**. */
export type ResolvedThemeEntry = GraphThemeEntry;

/** @see {@link GraphTypeStyleEntry} */
export type ResolvedTypeStyleEntry = GraphTypeStyleEntry;

/** One catalogue row as embedded in **`resolvedComponent`**, without **`defaultParams`**. */
export type ResolvedCatalogueComponentRow = Omit<CatalogueComponent, "defaultParams">;

/**
 * Design-system payload bundled with **`resolvedComponent`**: same row shapes as the full catalogue
 * (**`graphJson`**), trimmed to tokens / themes / type styles relevant to the resolved component.
 */
export type ResolvedComponentSystemBundle = {
  /** Present only when **`buildResolvedComponentDocument`** was given **`theme`**. */
  theme?: string;
  variantTypes: Record<string, CatalogueVariantTypeDef>;
  primitives: Record<string, ResolvedPrimitiveEntry>;
  semantics: Record<string, ResolvedSemanticEntry>;
  themes: Record<string, ResolvedThemeEntry>;
  typeStyles: Record<string, ResolvedTypeStyleEntry>;
};

/**
 * Full **`pdl resolve`** JSON document: **`components`** holds a **catalogue row per component**
 * in the transitive **`letInstance`** / instance-**`children`** closure (including the requested
 * component), keyed by **`name`**. **`primaryComponent`** is the CLI-requested entry. **`system`**
 * carries trimmed tokens, **`typeStyles`**, and related metadata — **no** merged top-level catalogue
 * fields and **no** materialised instance tree.
 */
export type ResolvedComponentDocument = {
  schemaKind: "resolvedComponent";
  schemaVersion: string;
  generatedAt: string;
  entryPath: string;
  /** The **`componentName`** passed to **`buildResolvedComponentDocument`** (must equal **`components[k].name`** for that key). */
  primaryComponent: string;
  paramOverrides?: Record<string, unknown>;
  components: Record<string, ResolvedCatalogueComponentRow>;
  system: ResolvedComponentSystemBundle;
};

function collectTokenRefNames(value: unknown, sink: Set<string>): void {
  if (value === null || typeof value === "undefined") return;
  if (typeof value === "string") {
    let m = value.match(PRIMITIVE_REF);
    if (m) {
      sink.add(m[1]!);
      return;
    }
    m = value.match(SEMANTIC_REF);
    if (m) {
      sink.add(m[1]!);
      return;
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const el of value) collectTokenRefNames(el, sink);
    return;
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    for (const v of Object.values(o)) collectTokenRefNames(v, sink);
  }
}

function collectTypeStyleNames(
  value: unknown,
  knownStyles: ReadonlySet<string>,
  sink: Set<string>,
): void {
  if (value === null || typeof value === "undefined") return;
  if (typeof value === "string") {
    if (knownStyles.has(value)) sink.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const el of value) collectTypeStyleNames(el, knownStyles, sink);
    return;
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    const ts = o.typeStyle;
    if (typeof ts === "string") {
      const m = ts.match(/^typeStyle:(.+)$/);
      const styleName = m ? m[1]! : ts;
      if (knownStyles.has(styleName)) sink.add(styleName);
    }
    for (const v of Object.values(o)) collectTypeStyleNames(v, knownStyles, sink);
  }
}

function collectUsageFromCatalogueComponent(
  meta: CatalogueComponent,
  knownTypeStyles: ReadonlySet<string>,
): { tokenNames: Set<string>; typeStyleNames: Set<string> } {
  const tokenNames = new Set<string>();
  const typeStyleNames = new Set<string>();

  collectTokenRefNames(meta.root.props, tokenNames);
  collectTypeStyleNames(meta.root.props, knownTypeStyles, typeStyleNames);

  for (const node of Object.values(meta.childNodes)) {
    collectTokenRefNames(node, tokenNames);
    collectTypeStyleNames(node, knownTypeStyles, typeStyleNames);
  }

  for (const v of meta.variants) {
    for (const ch of v.changes) collectTokenRefNames(ch.value, tokenNames);
    for (const ch of v.changes) collectTypeStyleNames(ch.value, knownTypeStyles, typeStyleNames);
  }

  return { tokenNames, typeStyleNames };
}

/** Merge **`primitive:`** / **`semantic:`** / **`typeStyle:`** usage from **`meta`** into shared sets. */
function mergeUsageFromCatalogueComponent(
  meta: CatalogueComponent,
  knownTypeStyles: ReadonlySet<string>,
  tokenNames: Set<string>,
  typeStyleNames: Set<string>,
): void {
  const u = collectUsageFromCatalogueComponent(meta, knownTypeStyles);
  for (const t of u.tokenNames) tokenNames.add(t);
  for (const ts of u.typeStyleNames) typeStyleNames.add(ts);
}

/** Union **`primitive:`** / **`semantic:`** / **`typeStyle:`** usage across multiple catalogue rows. */
function collectUsageFromCatalogueRows(
  rows: Iterable<CatalogueComponent>,
  knownTypeStyles: ReadonlySet<string>,
): { tokenNames: Set<string>; typeStyleNames: Set<string> } {
  const tokenNames = new Set<string>();
  const typeStyleNames = new Set<string>();
  for (const m of rows) mergeUsageFromCatalogueComponent(m, knownTypeStyles, tokenNames, typeStyleNames);
  return { tokenNames, typeStyleNames };
}

/** Pull primitive/semantic names from `typeStyle { … }` bodies into the collected token name set. */
function augmentTokenNamesFromUsedTypeStyles(
  design: DesignDefinition,
  typeStyleNames: Set<string>,
  tokenNames: Set<string>,
): void {
  for (const tsName of typeStyleNames) {
    const decl = design.typeStyles.get(tsName);
    if (!decl) continue;
    for (const expr of Object.values(decl.props)) {
      collectDeclaredTokenNamesFromValueExpr(expr, design, tokenNames);
    }
  }
}

/** Extend the name set with every primitive/semantic referenced in definitions (fixpoint). */
function augmentTokenNamesTransitiveFromDefinitions(design: DesignDefinition, tokenNames: Set<string>): void {
  let prev = -1;
  while (tokenNames.size !== prev) {
    prev = tokenNames.size;
    for (const name of [...tokenNames]) {
      const prim = design.primitives.get(name);
      if (prim) collectDeclaredTokenNamesFromValueExpr(prim.value, design, tokenNames);
      const sem = design.semantics.get(name);
      if (sem) collectDeclaredTokenNamesFromValueExpr(sem.value, design, tokenNames);
    }
  }
}

/**
 * Pull token names from theme override RHS when the override **target** (LHS key) is already in
 * `tokenNames`, then run transitive definition expansion; repeat until stable so theme chains are covered.
 */
function augmentTokenNamesFromRelevantThemesAndDefinitions(design: DesignDefinition, tokenNames: Set<string>): void {
  let prev = -1;
  while (tokenNames.size !== prev) {
    prev = tokenNames.size;
    for (const t of design.themes.values()) {
      for (const [key, expr] of Object.entries(t.overrides)) {
        if (!tokenNames.has(key)) continue;
        collectDeclaredTokenNamesFromValueExpr(expr, design, tokenNames);
      }
    }
    augmentTokenNamesTransitiveFromDefinitions(design, tokenNames);
  }
}

export function buildResolvedComponentDocument(
  design: DesignDefinition,
  opts: {
    componentName: string;
    paramOverrides?: Record<string, unknown>;
    theme?: string;
    modifiers?: string[];
  },
): ResolvedComponentDocument {
  const { componentName, paramOverrides = {}, theme, modifiers = [] } = opts;
  const c = design.components.get(componentName);
  if (!c) {
    throw new PdlError("PDL-E006", `Unknown component ${componentName}`, { path: design.entryPath });
  }
  const tokenMap = buildResolvedTokenMap(design, theme || undefined, modifiers);

  const depNames = collectRequiredComponentNames(design, componentName);
  const allNames = [...new Set([componentName, ...depNames])].sort((a, b) => a.localeCompare(b));
  const catalogueRows = new Map<string, CatalogueComponent>();
  for (const name of allNames) {
    const decl = design.components.get(name);
    if (!decl) {
      throw new PdlError("PDL-E006", `Unknown component ${name} in required closure`, { path: design.entryPath });
    }
    catalogueRows.set(name, buildCatalogueComponentRow(design, tokenMap, decl, RESOLVE_OPTIONS_GRAPH_CATALOGUE));
  }

  const knownTypeStyles = new Set(design.typeStyles.keys());
  const { tokenNames, typeStyleNames } = collectUsageFromCatalogueRows(catalogueRows.values(), knownTypeStyles);
  augmentTokenNamesFromUsedTypeStyles(design, typeStyleNames, tokenNames);
  augmentTokenNamesFromRelevantThemesAndDefinitions(design, tokenNames);

  const primitives: Record<string, ResolvedPrimitiveEntry> = Object.fromEntries(
    [...design.primitives.values()]
      .filter((p) => tokenNames.has(p.name))
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

  const semantics: Record<string, ResolvedSemanticEntry> = Object.fromEntries(
    [...design.semantics.values()]
      .filter((s) => tokenNames.has(s.name))
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

  const themes: Record<string, ResolvedThemeEntry> = Object.fromEntries(
    [...design.themes.values()]
      .map((t) => {
        const keys = Object.keys(t.overrides)
          .filter((k) => tokenNames.has(k))
          .sort();
        if (keys.length === 0) return null;
        return [
          t.name,
          {
            baseTheme: t.baseTheme ?? null,
            overrides: Object.fromEntries(
              keys.map((k) => [k, serialiseValueExprWithTokenRefs(t.overrides[k]!, design)]),
            ),
          },
        ] as const;
      })
      .filter((x): x is readonly [string, ResolvedThemeEntry] => x !== null)
      .sort(([a], [b]) => a.localeCompare(b)),
  );

  const typeStyles: Record<string, ResolvedTypeStyleEntry> = Object.fromEntries(
    [...design.typeStyles.values()]
      .filter((ts) => typeStyleNames.has(ts.name))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((ts) => [
        ts.name,
        {
          name: ts.name,
          props: Object.fromEntries(
            Object.entries(ts.props).map(([k, v]) => [k, serialiseValueExprWithTokenRefs(v, design)]),
          ),
        },
      ]),
  );

  const usedVariantTypeNames = new Set<string>();
  for (const m of catalogueRows.values()) {
    for (const p of m.params) {
      if (p.variantTypeName) usedVariantTypeNames.add(p.variantTypeName);
    }
  }
  const variantTypesFiltered: Record<string, CatalogueVariantTypeDef> = Object.fromEntries(
    [...usedVariantTypeNames].sort().map((n) => {
      const v = design.variants.get(n);
      if (!v) {
        throw new PdlError("PDL-E001", `Unknown variant type ${n}`, { path: design.entryPath });
      }
      return [n, { name: v.name, cases: [...v.cases] }] as const;
    }),
  );

  const components: Record<string, ResolvedCatalogueComponentRow> = Object.fromEntries(
    [...catalogueRows.entries()].map(([name, m]) => {
      const { defaultParams: _defaultParams, ...row } = m;
      return [name, row] as const;
    }),
  );

  return {
    schemaKind: "resolvedComponent",
    schemaVersion: PDL_JSON_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    entryPath: design.entryPath,
    primaryComponent: componentName,
    components,
    ...(Object.keys(paramOverrides).length ? { paramOverrides } : {}),
    system: {
      ...(theme ? { theme } : {}),
      variantTypes: variantTypesFiltered,
      primitives,
      semantics,
      themes,
      typeStyles,
    },
  };
}
