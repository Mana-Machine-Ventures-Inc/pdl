/** Deterministic JSON.stringify for catalogue / golden tests (sorted object keys). */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortDeep(value), null, 2) + "\n";
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
