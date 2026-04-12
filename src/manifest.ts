import type { DesignDefinition } from "./designModel.js";

const SCHEMA = "1.0.0-beta";

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
 * Thin registry for tooling, CI, and documentation — not a substitute for the Component Catalogue (§16).
 * See `full-spec.md` §17.
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

export function buildDesignManifest(design: DesignDefinition): DesignManifest {
  const components: ManifestComponent[] = [...design.components.values()]
    .map((c) => ({
      name: c.name,
      rootKind: c.rootKind,
      params: c.params.map((p) => ({ name: p.name, type: p.typeName })),
      expose: design.expose.get(c.name) ?? c.params.map((p) => p.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    kind: "designManifest",
    schemaVersion: SCHEMA,
    generatedAt: new Date().toISOString(),
    entryPath: design.entryPath,
    modulePaths: [...design.modulePaths],
    previewBackground: design.previewBackground ?? null,
    themes: [...design.themes.keys()].sort(),
    variants: [...design.variants.keys()].sort(),
    typeStyles: [...design.typeStyles.keys()].sort(),
    components,
  };
}
