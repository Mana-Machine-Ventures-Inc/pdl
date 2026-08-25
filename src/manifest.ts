import type { ComponentCatalogue } from "./catalogue.js";
import { PDL_JSON_SCHEMA_VERSION } from "./graphJson.js";

/** Top-level keys on `buildDesignManifest()` output (stable for tests / validators). */
export const DESIGN_MANIFEST_ROOT_KEYS = [
  "kind",
  "schemaVersion",
  "generatedAt",
  "entryPath",
  "modulePaths",
  "previewBackground",
  "themes",
  "variants",
  "typeStyles",
  "components",
] as const;

export type ManifestComponent = {
  name: string;
  rootKind: string;
  params: { name: string; type: string }[];
  expose: string[];
};

/**
 * Thin registry for tooling, CI, and documentation — not a substitute for the Component Catalogue
 * (`shared/schema/component-catalogue.json`).
 */
export type DesignManifest = {
  kind: "designManifest";
  schemaVersion: string;
  generatedAt: string;
  entryPath: string;
  modulePaths: string[];
  previewBackground: string | null;
  themes: string[];
  variants: string[];
  typeStyles: string[];
  components: ManifestComponent[];
};

/** Shape of the fields this module reads out of a `pdl tokens` document. */
export type ResolvedTokensDocument = {
  entryPath?: unknown;
  modulePaths?: unknown;
  previewBackground?: unknown;
};

const sortedNames = (o: unknown): string[] =>
  Object.keys(o && typeof o === "object" ? o : {}).sort();

/**
 * Build the registry from a `pdl catalogue` document, plus an optional `pdl tokens`
 * document for the entry / module / preview-background fields the catalogue omits.
 */
export function buildDesignManifestFromCatalogue(
  catalogue: ComponentCatalogue,
  tokens?: ResolvedTokensDocument,
): DesignManifest {
  const components: ManifestComponent[] = Object.entries(catalogue.components ?? {})
    .map(([name, row]) => {
      const params = (row.params ?? []).map((p) => ({
        name: p.name,
        type: typeof p.type === "string" ? p.type : String(p.type ?? "String"),
      }));
      return {
        name: row.name ?? name,
        rootKind: row.root?.kind ?? "layout",
        params,
        // `expose` is gone from the language; absent means every param is exposed.
        expose: row.expose ?? params.map((p) => p.name),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const modulePaths = Array.isArray(tokens?.modulePaths)
    ? tokens!.modulePaths.map(String)
    : [];

  return {
    kind: "designManifest",
    schemaVersion: PDL_JSON_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    entryPath: typeof tokens?.entryPath === "string" ? tokens.entryPath : "",
    modulePaths,
    previewBackground:
      typeof tokens?.previewBackground === "string" ? tokens.previewBackground : null,
    themes: sortedNames(catalogue.themes),
    variants: sortedNames(catalogue.variantTypes),
    typeStyles: sortedNames(catalogue.typeStyles),
    components,
  };
}
