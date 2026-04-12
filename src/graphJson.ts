/**
 * Shared JSON shapes and version for **graph** artefacts (**`componentCatalogue`**, **`resolvedComponent.system`**)
 * and other stable PDL JSON (**`bakedDesign`**, **`designManifest`**).
 */

export const PDL_JSON_SCHEMA_VERSION = "1.0.0-beta" as const;

/** One **`primitive`** or **`semantic`** row in the token graph (catalogue + resolved **`system`**). */
export type GraphTokenRow = {
  name: string;
  tokenType: string;
  definition: unknown;
};

/**
 * One declared **`theme { … }`** block. The theme **name** is the **map key** on the parent **`themes`** object.
 * **`baseTheme`** is the parent theme id for inheritance, or **`null`** when none.
 */
export type GraphThemeEntry = {
  baseTheme: string | null;
  overrides: Record<string, unknown>;
};

/** One **`typeStyle { … }`** preset (catalogue + resolved **`system`**). */
export type GraphTypeStyleEntry = {
  name: string;
  props: Record<string, unknown>;
};
