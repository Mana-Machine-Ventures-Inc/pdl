/**
 * Runtime shape checks for **graph** (`componentCatalogue`, `resolvedComponent`) and **bake** (`bakedDesign`)
 * JSON so CI catches drift from `full-spec.md` §16 / §16d without relying on large snapshots.
 */

import { PDL_JSON_SCHEMA_VERSION } from "../../src/graphJson.js";

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function fail(path: string, detail: string): never {
  throw new Error(`[${path}] ${detail}`);
}

function assertPlainObject(x: unknown, path: string): asserts x is Record<string, unknown> {
  if (!isPlainObject(x)) fail(path, `expected plain object, got ${typeof x}`);
}

function assertString(x: unknown, path: string): asserts x is string {
  if (typeof x !== "string") fail(path, `expected string, got ${typeof x}`);
}

function assertOptionalString(x: unknown, path: string): void {
  if (x === undefined) return;
  assertString(x, path);
}

/** Legacy or wrong-discriminant keys that must not appear on a catalogue root. */
const LEGACY_CATALOGUE_ROOT = new Set(["tokens", "tokensByTheme", "themesDeclared", "schemaKind"]);

/** Keys that must not appear on **`resolvedComponent`** root (token graph lives under **`system`**). */
const FORBIDDEN_RESOLVED_ROOT = new Set([
  "tokens",
  "tokensByTheme",
  "themesDeclared",
  "kind",
  "primitives",
  "semantics",
  "themes",
  "typeStyles",
  "variantTypes",
]);

const FORBIDDEN_RESOLVED_SYSTEM = new Set(["themesDeclared", "tokens", "tokensByTheme"]);

/** Token-graph keys that must not appear on **`bakedDesign`** root. */
const FORBIDDEN_BAKED_ROOT = new Set([
  "primitives",
  "semantics",
  "themes",
  "typeStyles",
  "variantTypes",
  "kind",
  "tokens",
  "tokensByTheme",
  "themesDeclared",
  "theme",
]);

function assertNoKeys(obj: Record<string, unknown>, forbidden: Set<string>, path: string): void {
  for (const k of Object.keys(obj)) {
    if (forbidden.has(k)) fail(path, `forbidden key "${k}" (legacy or wrong artefact shape)`);
  }
}

function assertOnlyKeys(
  obj: Record<string, unknown>,
  allowed: Set<string>,
  forbiddenFirst: Set<string>,
  path: string,
): void {
  for (const k of Object.keys(obj)) {
    if (forbiddenFirst.has(k)) {
      fail(path, `forbidden key "${k}" (legacy or wrong artefact shape)`);
    }
    if (!allowed.has(k)) fail(path, `unexpected key "${k}"`);
  }
}

function assertGraphTokenRow(x: unknown, path: string): void {
  assertPlainObject(x, path);
  assertString(x.name, `${path}.name`);
  assertString(x.tokenType, `${path}.tokenType`);
  if (!("definition" in x)) fail(path, "missing definition");
}

function assertGraphThemeEntry(x: unknown, path: string): void {
  assertPlainObject(x, path);
  if (x.baseTheme !== null && typeof x.baseTheme !== "string") {
    fail(path, `baseTheme must be string | null, got ${typeof x.baseTheme}`);
  }
  assertPlainObject(x.overrides, `${path}.overrides`);
}

function assertGraphTypeStyleEntry(x: unknown, path: string): void {
  assertPlainObject(x, path);
  assertString(x.name, `${path}.name`);
  assertPlainObject(x.props, `${path}.props`);
}

function assertVariantTypeDef(x: unknown, path: string): void {
  assertPlainObject(x, path);
  assertString(x.name, `${path}.name`);
  if (!Array.isArray(x.cases)) fail(path, "cases must be an array");
  for (let i = 0; i < x.cases.length; i++) {
    assertString(x.cases[i], `${path}.cases[${i}]`);
  }
}

function assertCatalFrame(x: unknown, path: string, depth: number): void {
  if (depth > 80) fail(path, "frame tree too deep (possible cycle)");
  assertPlainObject(x, path);
  assertString(x.id, `${path}.id`);
  assertString(x.kind, `${path}.kind`);
  assertPlainObject(x.props, `${path}.props`);
  if (!Array.isArray(x.children)) fail(path, "children must be an array");
  for (let i = 0; i < x.children.length; i++) {
    assertCatalFrame(x.children[i], `${path}.children[${i}]`, depth + 1);
  }
  if (x.instanceOf !== undefined) assertString(x.instanceOf, `${path}.instanceOf`);
  if (x.instanceKwargs !== undefined) {
    assertPlainObject(x.instanceKwargs, `${path}.instanceKwargs`);
  }
  const extra = Object.keys(x).filter(
    (k) => !["id", "kind", "props", "children", "instanceOf", "instanceKwargs"].includes(k),
  );
  if (extra.length) fail(path, `unexpected frame keys: ${extra.join(", ")}`);
}

/** Catalogue **`childNodes`** registry entry: no nested materialised children. */
function assertRegistryFrame(x: unknown, path: string): void {
  assertPlainObject(x, path);
  assertString(x.id, `${path}.id`);
  assertString(x.kind, `${path}.kind`);
  assertPlainObject(x.props, `${path}.props`);
  if (x.children === undefined) {
    // Compact graph JSON may omit **`children: []`** on registry leaves.
  } else {
    if (!Array.isArray(x.children)) fail(path, "children must be an array");
    if (x.children.length !== 0) fail(path, "childNodes registry entries must have empty children");
  }
  if (x.instanceOf !== undefined) assertString(x.instanceOf, `${path}.instanceOf`);
  if (x.instanceKwargs !== undefined) assertPlainObject(x.instanceKwargs, `${path}.instanceKwargs`);
  const extra = Object.keys(x).filter(
    (k) => !["id", "kind", "props", "children", "instanceOf", "instanceKwargs"].includes(k),
  );
  if (extra.length) fail(path, `unexpected registry frame keys: ${extra.join(", ")}`);
}

function assertCatalogueParam(x: unknown, path: string): void {
  assertPlainObject(x, path);
  assertString(x.name, `${path}.name`);
  assertString(x.type, `${path}.type`);
  if (!("default" in x)) fail(path, "param missing default");
  if (x.variantTypeName !== undefined) assertString(x.variantTypeName, `${path}.variantTypeName`);
  const allowed = new Set(["name", "type", "default", "variantTypeName"]);
  for (const k of Object.keys(x)) {
    if (!allowed.has(k)) fail(path, `unexpected param key "${k}"`);
  }
}

function assertCatalogueVariantEntry(x: unknown, path: string): void {
  assertPlainObject(x, path);
  assertPlainObject(x.params, `${path}.params`);
  if (!Array.isArray(x.affectedFrames)) fail(path, "affectedFrames must be an array");
  x.affectedFrames.forEach((id, i) => assertString(id, `${path}.affectedFrames[${i}]`));
  const changes = x.changes ?? [];
  if (!Array.isArray(changes)) fail(path, "changes must be an array");
  for (let i = 0; i < changes.length; i++) {
    const ch = changes[i];
    assertPlainObject(ch, `${path}.changes[${i}]`);
    assertString(ch.frameId, `${path}.changes[${i}].frameId`);
    assertString(ch.prop, `${path}.changes[${i}].prop`);
    if (!("value" in ch)) fail(path, `changes[${i}] missing value key`);
  }
  if (x.structuralChange !== undefined && typeof x.structuralChange !== "boolean") {
    fail(path, "structuralChange must be boolean if present");
  }
  if (x.structuralChange === true && x.childHierarchy === undefined) {
    fail(path, "structuralChange requires variants[].childHierarchy");
  }
  if (x.childHierarchy !== undefined) {
    assertPlainObject(x.childHierarchy, `${path}.childHierarchy`);
    for (const [pid, row] of Object.entries(x.childHierarchy)) {
      assertString(pid, `${path}.childHierarchy key`);
      if (!Array.isArray(row)) fail(path, `variants[].childHierarchy[${pid}] must be an array`);
      row.forEach((id, i) => assertString(id, `${path}.childHierarchy[${pid}][${i}]`));
    }
  }
  const allowed = new Set(["params", "affectedFrames", "changes", "structuralChange", "childHierarchy"]);
  for (const k of Object.keys(x)) {
    if (!allowed.has(k)) fail(path, `unexpected variant key "${k}"`);
  }
}

function assertCatalogueComponentRow(x: unknown, path: string, opts: { requireDefaultParams: boolean }): void {
  assertPlainObject(x, path);
  assertString(x.name, `${path}.name`);
  const params = x.params ?? [];
  if (!Array.isArray(params)) fail(path, "params must be an array");
  params.forEach((p, i) => assertCatalogueParam(p, `${path}.params[${i}]`));
  const expose = x.expose ?? [];
  if (!Array.isArray(expose)) fail(path, "expose must be an array");
  expose.forEach((e, i) => assertString(e, `${path}.expose[${i}]`));
  assertString(x.usage ?? "", `${path}.usage`);
  assertPlainObject(x.root, `${path}.root`);
  assertString(x.root.kind, `${path}.root.kind`);
  assertPlainObject(x.root.props, `${path}.root.props`);
  for (const rk of Object.keys(x.root)) {
    if (rk !== "kind" && rk !== "props") fail(`${path}.root`, `unexpected root key "${rk}"`);
  }
  if (opts.requireDefaultParams) {
    assertPlainObject(x.defaultParams, `${path}.defaultParams`);
  } else if ("defaultParams" in x) {
    fail(path, "resolved catalogue row must not include defaultParams");
  }
  const childNodes = x.childNodes ?? {};
  assertPlainObject(childNodes, `${path}.childNodes`);
  for (const [cid, subtree] of Object.entries(childNodes)) {
    assertRegistryFrame(subtree, `${path}.childNodes[${cid}]`);
  }
  const childHierarchy = x.childHierarchy ?? {};
  assertPlainObject(childHierarchy, `${path}.childHierarchy`);
  if (Object.keys(childHierarchy).length > 0) {
    if (!("Root" in childHierarchy)) fail(path, "non-empty childHierarchy must include Root");
    if (!Array.isArray(childHierarchy.Root)) fail(path, "childHierarchy.Root must be an array");
    for (const [pid, row] of Object.entries(childHierarchy)) {
      assertString(pid, `${path}.childHierarchy key`);
      if (!Array.isArray(row)) fail(path, `childHierarchy[${pid}] must be an array`);
      row.forEach((id, i) => assertString(id, `${path}.childHierarchy[${pid}][${i}]`));
    }
  }
  const variants = x.variants ?? [];
  if (!Array.isArray(variants)) fail(path, "variants must be an array");
  variants.forEach((v, i) => assertCatalogueVariantEntry(v, `${path}.variants[${i}]`));
  if (x.requiredComponents !== undefined) {
    if (!Array.isArray(x.requiredComponents)) fail(path, "requiredComponents must be an array");
    x.requiredComponents.forEach((id, i) => assertString(id, `${path}.requiredComponents[${i}]`));
  }

  if (x.usageByKey !== undefined) assertPlainObject(x.usageByKey, `${path}.usageByKey`);
  if (x.fixtures !== undefined) assertPlainObject(x.fixtures, `${path}.fixtures`);
  if (x.rules !== undefined) assertPlainObject(x.rules, `${path}.rules`);
  if (x.interactions !== undefined && !Array.isArray(x.interactions)) fail(path, "interactions must be an array");

  const allowed = new Set([
    "name",
    "params",
    "expose",
    "usage",
    "usageByKey",
    "fixtures",
    "rules",
    "interactions",
    "root",
    "defaultParams",
    "childNodes",
    "childHierarchy",
    "requiredComponents",
    "variants",
  ]);
  for (const k of Object.keys(x)) {
    if (!allowed.has(k)) fail(path, `unexpected component key "${k}"`);
  }
}

const CATALOGUE_ROOT = new Set([
  "kind",
  "schemaVersion",
  "generatedAt",
  "primitives",
  "semantics",
  "themes",
  "typeStyles",
  "variantTypes",
  "components",
  "theme",
]);

/**
 * Asserts a value matches the **Component Catalogue** root contract (`full-spec.md` §16 §2.1).
 */
export function assertComponentCatalogueContract(doc: unknown, path = "componentCatalogue"): void {
  assertPlainObject(doc, path);
  assertOnlyKeys(doc, CATALOGUE_ROOT, LEGACY_CATALOGUE_ROOT, path);
  if (doc.kind !== "componentCatalogue") fail(path, `kind must be "componentCatalogue", got ${JSON.stringify(doc.kind)}`);
  if (doc.schemaVersion !== PDL_JSON_SCHEMA_VERSION) {
    fail(path, `schemaVersion must be ${JSON.stringify(PDL_JSON_SCHEMA_VERSION)}, got ${JSON.stringify(doc.schemaVersion)}`);
  }
  assertString(doc.generatedAt, `${path}.generatedAt`);
  assertOptionalString(doc.theme, `${path}.theme`);

  assertPlainObject(doc.primitives, `${path}.primitives`);
  for (const [name, row] of Object.entries(doc.primitives)) {
    if (name !== (row as { name?: string }).name) {
      fail(`${path}.primitives[${name}]`, "row.name must match map key");
    }
    assertGraphTokenRow(row, `${path}.primitives[${name}]`);
  }

  assertPlainObject(doc.semantics, `${path}.semantics`);
  for (const [name, row] of Object.entries(doc.semantics)) {
    if (name !== (row as { name?: string }).name) {
      fail(`${path}.semantics[${name}]`, "row.name must match map key");
    }
    assertGraphTokenRow(row, `${path}.semantics[${name}]`);
  }

  assertPlainObject(doc.themes, `${path}.themes`);
  for (const [tname, row] of Object.entries(doc.themes)) {
    assertGraphThemeEntry(row, `${path}.themes[${tname}]`);
  }

  assertPlainObject(doc.typeStyles, `${path}.typeStyles`);
  for (const [tsName, row] of Object.entries(doc.typeStyles)) {
    if (tsName !== (row as { name?: string }).name) {
      fail(`${path}.typeStyles[${tsName}]`, "row.name must match map key");
    }
    assertGraphTypeStyleEntry(row, `${path}.typeStyles[${tsName}]`);
  }

  assertPlainObject(doc.variantTypes, `${path}.variantTypes`);
  for (const [vn, row] of Object.entries(doc.variantTypes)) {
    if (vn !== (row as { name?: string }).name) {
      fail(`${path}.variantTypes[${vn}]`, "row.name must match map key");
    }
    assertVariantTypeDef(row, `${path}.variantTypes[${vn}]`);
  }

  assertPlainObject(doc.components, `${path}.components`);
  for (const [cname, row] of Object.entries(doc.components)) {
    if (cname !== (row as { name?: string }).name) {
      fail(`${path}.components[${cname}]`, "row.name must match map key");
    }
    assertCatalogueComponentRow(row, `${path}.components[${cname}]`, { requireDefaultParams: true });
  }
}

const RESOLVED_DOC_ROOT = new Set([
  "schemaKind",
  "schemaVersion",
  "generatedAt",
  "entryPath",
  "primaryComponent",
  "components",
  "system",
  "paramOverrides",
]);

const RESOLVED_SYSTEM_ROOT = new Set(["theme", "variantTypes", "primitives", "semantics", "themes", "typeStyles"]);

/**
 * Asserts a value matches the **`resolvedComponent`** document contract (`full-spec.md` §16 §2.5).
 */
export function assertResolvedComponentContract(doc: unknown, path = "resolvedComponent"): void {
  assertPlainObject(doc, path);
  assertOnlyKeys(doc, RESOLVED_DOC_ROOT, FORBIDDEN_RESOLVED_ROOT, path);
  if (doc.schemaKind !== "resolvedComponent") {
    fail(path, `schemaKind must be "resolvedComponent", got ${JSON.stringify(doc.schemaKind)}`);
  }
  if (doc.schemaVersion !== PDL_JSON_SCHEMA_VERSION) {
    fail(path, `schemaVersion must be ${JSON.stringify(PDL_JSON_SCHEMA_VERSION)}, got ${JSON.stringify(doc.schemaVersion)}`);
  }
  assertString(doc.generatedAt, `${path}.generatedAt`);
  assertString(doc.entryPath, `${path}.entryPath`);
  assertString(doc.primaryComponent, `${path}.primaryComponent`);

  if (doc.paramOverrides !== undefined) assertPlainObject(doc.paramOverrides, `${path}.paramOverrides`);

  assertPlainObject(doc.components, `${path}.components`);
  if (!(doc.primaryComponent in doc.components)) {
    fail(path, `primaryComponent must be a key of components (got ${JSON.stringify(doc.primaryComponent)})`);
  }
  if ((doc.components[doc.primaryComponent] as { name?: string }).name !== doc.primaryComponent) {
    fail(path, "components[primaryComponent].name must match primaryComponent");
  }
  for (const [cname, row] of Object.entries(doc.components)) {
    if (cname !== (row as { name?: string }).name) {
      fail(`${path}.components[${cname}]`, "row.name must match map key");
    }
    assertCatalogueComponentRow(row, `${path}.components[${cname}]`, { requireDefaultParams: false });
  }

  assertPlainObject(doc.system, `${path}.system`);
  assertNoKeys(doc.system, FORBIDDEN_RESOLVED_SYSTEM, `${path}.system`);
  for (const k of Object.keys(doc.system)) {
    if (!RESOLVED_SYSTEM_ROOT.has(k)) fail(`${path}.system`, `unexpected system key "${k}"`);
  }
  assertOptionalString(doc.system.theme, `${path}.system.theme`);

  const variantTypes = doc.system.variantTypes ?? {};
  assertPlainObject(variantTypes, `${path}.system.variantTypes`);
  for (const [vn, row] of Object.entries(variantTypes)) {
    if (vn !== (row as { name?: string }).name) {
      fail(`${path}.system.variantTypes[${vn}]`, "row.name must match map key");
    }
    assertVariantTypeDef(row, `${path}.system.variantTypes[${vn}]`);
  }

  const primitives = doc.system.primitives ?? {};
  assertPlainObject(primitives, `${path}.system.primitives`);
  for (const [name, row] of Object.entries(primitives)) {
    if (name !== (row as { name?: string }).name) fail(`${path}.system.primitives[${name}]`, "row.name must match map key");
    assertGraphTokenRow(row, `${path}.system.primitives[${name}]`);
  }

  const semantics = doc.system.semantics ?? {};
  assertPlainObject(semantics, `${path}.system.semantics`);
  for (const [name, row] of Object.entries(semantics)) {
    if (name !== (row as { name?: string }).name) fail(`${path}.system.semantics[${name}]`, "row.name must match map key");
    assertGraphTokenRow(row, `${path}.system.semantics[${name}]`);
  }

  const themes = doc.system.themes ?? {};
  assertPlainObject(themes, `${path}.system.themes`);
  for (const [tname, row] of Object.entries(themes)) {
    assertGraphThemeEntry(row, `${path}.system.themes[${tname}]`);
  }

  const typeStyles = doc.system.typeStyles ?? {};
  assertPlainObject(typeStyles, `${path}.system.typeStyles`);
  for (const [tsName, row] of Object.entries(typeStyles)) {
    if (tsName !== (row as { name?: string }).name) {
      fail(`${path}.system.typeStyles[${tsName}]`, "row.name must match map key");
    }
    assertGraphTypeStyleEntry(row, `${path}.system.typeStyles[${tsName}]`);
  }
}

const BAKED_DOC_ROOT = new Set([
  "schemaKind",
  "schemaVersion",
  "generatedAt",
  "provenance",
  "components",
  "previewBackground",
]);
const BAKED_PROVENANCE_ROOT = new Set(["entryPath", "bakedTheme", "bakeProfile"]);
const BAKE_PROFILES = new Set(["system-defaults", "component-explicit"]);

/**
 * Asserts a value matches the **`bakedDesign`** document contract (`full-spec.md` §16d).
 */
export function assertBakedDesignContract(doc: unknown, path = "bakedDesign"): void {
  assertPlainObject(doc, path);
  assertOnlyKeys(doc, BAKED_DOC_ROOT, FORBIDDEN_BAKED_ROOT, path);
  if (doc.schemaKind !== "bakedDesign") {
    fail(path, `schemaKind must be "bakedDesign", got ${JSON.stringify(doc.schemaKind)}`);
  }
  if (doc.schemaVersion !== PDL_JSON_SCHEMA_VERSION) {
    fail(path, `schemaVersion must be ${JSON.stringify(PDL_JSON_SCHEMA_VERSION)}, got ${JSON.stringify(doc.schemaVersion)}`);
  }
  assertString(doc.generatedAt, `${path}.generatedAt`);

  assertPlainObject(doc.provenance, `${path}.provenance`);
  for (const k of Object.keys(doc.provenance)) {
    if (!BAKED_PROVENANCE_ROOT.has(k)) fail(`${path}.provenance`, `unexpected provenance key "${k}"`);
  }
  assertString(doc.provenance.entryPath, `${path}.provenance.entryPath`);
  if (doc.provenance.bakedTheme !== null && typeof doc.provenance.bakedTheme !== "string") {
    fail(`${path}.provenance`, "bakedTheme must be string | null");
  }
  assertString(doc.provenance.bakeProfile, `${path}.provenance.bakeProfile`);
  if (!BAKE_PROFILES.has(doc.provenance.bakeProfile)) {
    fail(`${path}.provenance.bakeProfile`, `must be one of ${[...BAKE_PROFILES].join(", ")}`);
  }

  assertPlainObject(doc.components, `${path}.components`);
  for (const [cname, row] of Object.entries(doc.components)) {
    if (cname !== (row as { name?: string }).name) {
      fail(`${path}.components[${cname}]`, "row.name must match map key");
    }
    assertPlainObject(row, `${path}.components[${cname}]`);
    assertString(row.name, `${path}.components[${cname}].name`);
    assertString(row.rootKind, `${path}.components[${cname}].rootKind`);
    assertPlainObject(row.bakedParams, `${path}.components[${cname}].bakedParams`);
    assertCatalFrame(row.root, `${path}.components[${cname}].root`, 0);
    const allowed = new Set(["name", "rootKind", "bakedParams", "root"]);
    for (const k of Object.keys(row)) {
      if (!allowed.has(k)) fail(`${path}.components[${cname}]`, `unexpected baked component key "${k}"`);
    }
  }
}
