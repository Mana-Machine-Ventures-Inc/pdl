import type { ValueExpr } from "./ast.js";
import type { DesignDefinition } from "./designModel.js";
import {
  buildComponentCatalogue,
  type CatalogueComponent,
  type CatalogueVariantTypeDef,
} from "./catalogue.js";
import { PdlError } from "./errors.js";
import { serialiseValueExpr } from "./graph.js";

const PRIMITIVE_REF = /^primitive:(.+)$/;
const SEMANTIC_REF = /^semantic:(.+)$/;

export type ResolvedPrimitiveEntry = {
  name: string;
  tokenType: string;
  /** PDL RHS of the primitive (design-time), for tooling that reads the token graph. */
  definition: unknown;
};

export type ResolvedSemanticEntry = {
  name: string;
  tokenType: string;
  definition: unknown;
};

export type ResolvedThemeEntry = {
  name: string;
  baseTheme: string | null;
  /**
   * Semantic token name → override RHS. Bare **`primitive` / `semantic`** idents are emitted as
   * **`primitive:`** / **`semantic:`** strings so emitters can join to **`primitives` / `semantics`**;
   * literals and composites stay as serialised **`ValueExpr`**-shaped JSON.
   */
  overrides: Record<string, unknown>;
};

export type ResolvedTypeStyleEntry = {
  name: string;
  props: Record<string, unknown>;
};

/** One catalogue row as embedded in **`resolvedComponent`**, without **`defaultParams`**. */
export type ResolvedCatalogueComponentRow = Omit<CatalogueComponent, "defaultParams">;

/**
 * Design-system payload bundled with **`resolvedComponent`**: active theme context, trimmed
 * **`variantTypes`**, token graph (**`primitives` / `semantics` / `typeStyles`**), and per-declared-**`theme`**
 * **overrides** (token refs cross-link to rows in **`primitives` / `semantics`**).
 */
export type ResolvedComponentSystemBundle = {
  theme: string;
  themesDeclared: string[];
  variantTypes: CatalogueVariantTypeDef[];
  primitives: ResolvedPrimitiveEntry[];
  semantics: ResolvedSemanticEntry[];
  themes: ResolvedThemeEntry[];
  typeStyles: ResolvedTypeStyleEntry[];
};

/**
 * Full **`pdl resolve`** JSON document: **`components`** holds one catalogue row per resolved
 * component key (today: the requested component only), and **`system`** carries trimmed tokens,
 * **`typeStyles`**, and related metadata — **no** merged top-level catalogue fields and **no**
 * materialised instance tree.
 */
export type ResolvedComponentDocument = {
  schemaKind: "resolvedComponent";
  schemaVersion: string;
  generatedAt: string;
  entryPath: string;
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

  collectTokenRefNames(meta.props, tokenNames);
  collectTypeStyleNames(meta.props, knownTypeStyles, typeStyleNames);

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

function collectTokenNamesFromValueExpr(expr: ValueExpr, design: DesignDefinition, sink: Set<string>): void {
  switch (expr.kind) {
    case "ident":
      if (design.primitives.has(expr.name) || design.semantics.has(expr.name)) sink.add(expr.name);
      return;
    case "opacityOf":
      collectTokenNamesFromValueExpr(expr.base, design, sink);
      collectTokenNamesFromValueExpr(expr.opacity, design, sink);
      return;
    case "edgeInsets":
      for (const v of Object.values(expr.fields)) collectTokenNamesFromValueExpr(v, design, sink);
      return;
    case "corner":
      collectTokenNamesFromValueExpr(expr.tl, design, sink);
      collectTokenNamesFromValueExpr(expr.tr, design, sink);
      collectTokenNamesFromValueExpr(expr.br, design, sink);
      collectTokenNamesFromValueExpr(expr.bl, design, sink);
      return;
    case "array":
      for (const it of expr.items) collectTokenNamesFromValueExpr(it, design, sink);
      return;
    case "transition":
      collectTokenNamesFromValueExpr(expr.duration, design, sink);
      collectTokenNamesFromValueExpr(expr.easing, design, sink);
      if (expr.delay) collectTokenNamesFromValueExpr(expr.delay, design, sink);
      return;
    case "rampInline":
      for (const s of expr.stops) collectTokenNamesFromValueExpr(s, design, sink);
      return;
    case "sizing":
      if (expr.flexArgs) {
        for (const v of Object.values(expr.flexArgs)) collectTokenNamesFromValueExpr(v, design, sink);
      }
      return;
    case "call":
      for (const v of Object.values(expr.args)) collectTokenNamesFromValueExpr(v, design, sink);
      return;
    case "gradientStop":
      for (const v of Object.values(expr.fields)) collectTokenNamesFromValueExpr(v, design, sink);
      return;
    case "hex":
    case "string":
    case "number":
    case "boolean":
    case "dotEnum":
    case "vibrancyTuple":
      return;
    default: {
      const _x: never = expr;
      void _x;
      return;
    }
  }
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
      collectTokenNamesFromValueExpr(expr, design, tokenNames);
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
      if (prim) collectTokenNamesFromValueExpr(prim.value, design, tokenNames);
      const sem = design.semantics.get(name);
      if (sem) collectTokenNamesFromValueExpr(sem.value, design, tokenNames);
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
        collectTokenNamesFromValueExpr(expr, design, tokenNames);
      }
    }
    augmentTokenNamesTransitiveFromDefinitions(design, tokenNames);
  }
}

/** Serialise a `ValueExpr` for theme overrides; bare token idents become `primitive:` / `semantic:` strings. */
function serialiseValueExprWithTokenMarkers(expr: ValueExpr, design: DesignDefinition): unknown {
  switch (expr.kind) {
    case "ident":
      if (design.primitives.has(expr.name)) return `primitive:${expr.name}`;
      if (design.semantics.has(expr.name)) return `semantic:${expr.name}`;
      return { kind: "ident", name: expr.name };
    case "hex":
    case "string":
    case "number":
    case "boolean":
      return { kind: expr.kind, value: (expr as { value: unknown }).value };
    case "dotEnum":
      return { kind: "dotEnum", value: expr.value };
    case "opacityOf":
      return {
        kind: "opacityOf",
        base: serialiseValueExprWithTokenMarkers(expr.base, design),
        opacity: serialiseValueExprWithTokenMarkers(expr.opacity, design),
      };
    case "edgeInsets":
      return {
        kind: "edgeInsets",
        variant: expr.variant,
        fields: Object.fromEntries(
          Object.entries(expr.fields).map(([k, v]) => [k, serialiseValueExprWithTokenMarkers(v, design)]),
        ),
      };
    case "corner":
      return {
        kind: "corner",
        tl: serialiseValueExprWithTokenMarkers(expr.tl, design),
        tr: serialiseValueExprWithTokenMarkers(expr.tr, design),
        br: serialiseValueExprWithTokenMarkers(expr.br, design),
        bl: serialiseValueExprWithTokenMarkers(expr.bl, design),
      };
    case "array":
      return { kind: "array", items: expr.items.map((it) => serialiseValueExprWithTokenMarkers(it, design)) };
    case "transition":
      return {
        kind: "transition",
        duration: serialiseValueExprWithTokenMarkers(expr.duration, design),
        easing: serialiseValueExprWithTokenMarkers(expr.easing, design),
        ...(expr.delay ? { delay: serialiseValueExprWithTokenMarkers(expr.delay, design) } : {}),
      };
    case "vibrancyTuple":
      return { kind: "vibrancyTuple", saturation: expr.saturation, brightness: expr.brightness };
    case "rampInline":
      return {
        kind: "rampInline",
        direction: expr.direction,
        stops: expr.stops.map((s) => serialiseValueExprWithTokenMarkers(s, design)),
      };
    case "sizing":
      return {
        kind: "sizing",
        mode: expr.mode,
        ...(expr.fixed !== undefined ? { fixed: expr.fixed } : {}),
        ...(expr.flexArgs
          ? {
              flexArgs: Object.fromEntries(
                Object.entries(expr.flexArgs).map(([k, v]) => [k, serialiseValueExprWithTokenMarkers(v, design)]),
              ),
            }
          : {}),
      };
    case "call":
      return {
        kind: "call",
        callee: expr.callee,
        args: Object.fromEntries(
          Object.entries(expr.args).map(([k, v]) => [k, serialiseValueExprWithTokenMarkers(v, design)]),
        ),
      };
    case "gradientStop":
      return {
        kind: "gradientStop",
        fields: Object.fromEntries(
          Object.entries(expr.fields).map(([k, v]) => [k, serialiseValueExprWithTokenMarkers(v, design)]),
        ),
      };
    default: {
      const _x: never = expr;
      void _x;
      return { kind: "unknown" };
    }
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
  const cat = buildComponentCatalogue(design, { theme, modifiers });
  const meta = cat.components.find((c) => c.name === componentName);
  if (!meta) {
    throw new PdlError("PDL-E006", `Unknown component ${componentName}`, { path: design.entryPath });
  }

  const knownTypeStyles = new Set(design.typeStyles.keys());
  const { tokenNames, typeStyleNames } = collectUsageFromCatalogueComponent(meta, knownTypeStyles);
  augmentTokenNamesFromUsedTypeStyles(design, typeStyleNames, tokenNames);
  augmentTokenNamesFromRelevantThemesAndDefinitions(design, tokenNames);

  const primitives: ResolvedPrimitiveEntry[] = [...design.primitives.values()]
    .filter((p) => tokenNames.has(p.name))
    .map((p) => ({
      name: p.name,
      tokenType: p.tokenType,
      definition: serialiseValueExpr(p.value),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const semantics: ResolvedSemanticEntry[] = [...design.semantics.values()]
    .filter((s) => tokenNames.has(s.name))
    .map((s) => ({
      name: s.name,
      tokenType: s.tokenType,
      definition: serialiseValueExpr(s.value),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const themes: ResolvedThemeEntry[] = [...design.themes.values()]
    .map((t) => {
      const keys = Object.keys(t.overrides)
        .filter((k) => tokenNames.has(k))
        .sort();
      if (keys.length === 0) return null;
      return {
        name: t.name,
        baseTheme: t.baseTheme ?? null,
        overrides: Object.fromEntries(
          keys.map((k) => [k, serialiseValueExprWithTokenMarkers(t.overrides[k]!, design)]),
        ),
      };
    })
    .filter((x): x is ResolvedThemeEntry => x !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  const typeStyles: ResolvedTypeStyleEntry[] = [...design.typeStyles.values()]
    .filter((ts) => typeStyleNames.has(ts.name))
    .map((ts) => ({
      name: ts.name,
      props: Object.fromEntries(
        Object.entries(ts.props).map(([k, v]) => [k, serialiseValueExpr(v)]),
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const usedVariantTypeNames = new Set(
    meta.params.map((p) => p.variantTypeName).filter((x): x is string => Boolean(x)),
  );
  const variantTypesFiltered = cat.variantTypes.filter((v) => usedVariantTypeNames.has(v.name));

  const { defaultParams: _defaultParams, ...catalogueRow } = meta;

  return {
    schemaKind: "resolvedComponent",
    schemaVersion: cat.schemaVersion,
    generatedAt: new Date().toISOString(),
    entryPath: design.entryPath,
    components: { [componentName]: catalogueRow },
    ...(Object.keys(paramOverrides).length ? { paramOverrides } : {}),
    system: {
      theme: cat.theme,
      themesDeclared: cat.themesDeclared,
      variantTypes: variantTypesFiltered,
      primitives,
      semantics,
      themes,
      typeStyles,
    },
  };
}
