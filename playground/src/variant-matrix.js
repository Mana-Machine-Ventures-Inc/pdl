/**
 * Shared variant-matrix axis expansion for Playground (WASM client + server).
 * Expands `variant` enums and Bool params; skips String / other types.
 */

/** Soft cap — drop trailing axes (Bools first, since appended last) until product fits. */
export const VARIANT_MATRIX_MAX_COMBOS = 64;

/**
 * @param {Array<{ name?: string, typeName?: string }>} params
 * @param {Record<string, string[] | undefined>} variantCases
 * @param {number} [maxCombos]
 * @returns {Array<{ name: string, cases: Array<string | boolean>, kind: "variant" | "bool" }>}
 */
export function matrixAxesFromParams(params, variantCases, maxCombos = VARIANT_MATRIX_MAX_COMBOS) {
  /** @type {Array<{ name: string, cases: Array<string | boolean>, kind: "variant" | "bool" }>} */
  const axes = [];
  for (const p of params ?? []) {
    if (!p?.name || typeof p.typeName !== "string") continue;
    const typeName = p.typeName;
    const cases = variantCases?.[typeName];
    if (cases?.length) {
      axes.push({ name: p.name, cases: [...cases], kind: "variant" });
      continue;
    }
    if (typeName === "Bool" || typeName === "Boolean") {
      axes.push({ name: p.name, cases: [false, true], kind: "bool" });
    }
  }
  while (axes.length > 1 && productSize(axes) > maxCombos) {
    axes.pop();
  }
  return axes;
}

/**
 * @param {Array<{ cases: unknown[] }>} axes
 */
function productSize(axes) {
  return axes.reduce((n, a) => n * Math.max(1, a.cases?.length ?? 0), 1);
}

/**
 * Full cartesian product (no mid-axis truncation).
 * @param {Array<{ name: string, cases: Array<string | boolean>, kind?: string }>} axes
 * @returns {Array<{ labels: Record<string, string>, kv: Record<string, string | boolean> }>}
 */
export function expandVariantMatrixCombos(axes) {
  /** @type {Array<{ labels: Record<string, string>, kv: Record<string, string | boolean> }>} */
  let combos = [{ labels: {}, kv: {} }];
  for (const axis of axes) {
    /** @type {typeof combos} */
    const next = [];
    for (const prev of combos) {
      for (const c of axis.cases) {
        const labelVal = typeof c === "boolean" ? String(c) : String(c);
        next.push({
          labels: { ...prev.labels, [axis.name]: labelVal },
          kv: { ...prev.kv, [axis.name]: c },
        });
      }
    }
    combos = next;
  }
  return combos;
}

/**
 * @param {string} component
 * @param {Record<string, string>} labels
 * @param {Array<{ name: string, kind?: string }> | undefined} axes
 */
export function formatVariantMatrixLabel(component, labels, axes) {
  const keys = Object.keys(labels);
  if (keys.length === 0) return component;
  const kindByName = new Map((axes ?? []).map((a) => [a.name, a.kind]));
  const parts = keys.map((k) => {
    const v = labels[k];
    const kind = kindByName.get(k);
    if (kind === "bool" || v === "true" || v === "false") return `${k}=${v}`;
    return `${k}=.${v}`;
  });
  return `${component} · ${parts.join(", ")}`;
}
