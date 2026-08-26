/**
 * Cross-axis / unsupported-structure warnings for Canvas pending edits.
 */

/**
 * Non-default variant axes currently active in the canvas world.
 * @param {Record<string, unknown>} world
 * @param {Array<{ name: string, typeName: string, default?: unknown, defaultValue?: unknown }>} params
 * @param {Record<string, string[]>} variantCases
 * @returns {Record<string, string>}
 */
export function activeNonDefaultAxes(world, params, variantCases) {
  /** @type {Record<string, string>} */
  const axes = {};
  for (const p of params ?? []) {
    const cases = variantCases?.[p.typeName];
    if (!Array.isArray(cases) || !cases.length) continue;
    const raw = world?.[p.name];
    if (raw === undefined || raw === null) continue;
    const bare = String(raw).replace(/^\./, "");
    const defBare = String(p.default ?? p.defaultValue ?? cases[0] ?? "")
      .replace(/^\./, "")
      .replace(/^"|"$/g, "");
    if (bare && bare !== defBare) axes[p.name] = bare;
  }
  return axes;
}

/**
 * @param {Record<string, string>} axes
 * @param {string} [chosenAxis]
 * @returns {string | null}
 */
export function crossAxisWarning(axes, chosenAxis) {
  const keys = Object.keys(axes ?? {});
  if (keys.length < 2) return null;
  if (chosenAxis && keys.includes(chosenAxis)) return null;
  return `Changing ${keys.join(" + ")} at once — pick which axis owns this property.`;
}

/**
 * Catalogue params that are variant enums (Canvas axis bar).
 * @param {Array<{ name: string, typeName: string, default?: unknown, defaultValue?: unknown }>} params
 * @param {Record<string, string[]>} variantCases
 */
export function variantAxisParams(params, variantCases) {
  return (params ?? []).filter((p) => {
    const cases = variantCases?.[p.typeName];
    return Array.isArray(cases) && cases.length > 0;
  });
}
