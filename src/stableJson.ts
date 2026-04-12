export type StableStringifyOptions = {
  /**
   * Drop object keys whose value is an empty array or empty object (after recursion).
   * Used for `resolve` / `catalogue` CLI output; graph / manifest goldens keep the default **false**.
   */
  omitEmpty?: boolean;
};

/** Deterministic JSON.stringify for catalogue / golden tests (sorted object keys). */
export function stableStringify(value: unknown, opts?: StableStringifyOptions): string {
  const v = opts?.omitEmpty ? omitEmptyDeep(value) : value;
  return JSON.stringify(sortDeep(v), null, 2) + "\n";
}

/** Remove empty arrays and empty objects recursively (for leaner emitter-facing JSON). */
export function omitEmptyDeep(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  // Only omit empty containers when they appear as **object property values** — do not drop
  // `[]` / `{}` array elements; empty frames may still be meaningful in resolved trees.
  if (Array.isArray(value)) {
    return value.map(omitEmptyDeep);
  }
  const o = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    const ev = omitEmptyDeep(v);
    if (isEmptyContainer(ev)) continue;
    out[k] = ev;
  }
  return out;
}

function isEmptyContainer(v: unknown): boolean {
  if (v === undefined) return true;
  if (Array.isArray(v)) return v.length === 0;
  if (v !== null && typeof v === "object" && !Array.isArray(v)) return Object.keys(v).length === 0;
  return false;
}

function sortDeep(v: unknown): unknown {
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map(sortDeep);
  const o = v as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(o).sort()) {
    out[k] = sortDeep(o[k]);
  }
  return out;
}
