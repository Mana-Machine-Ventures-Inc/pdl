import { fixedSizingAxisProps, uniformEdgeInsetProps } from "./frameProps.js";
import { PdlError } from "./errors.js";

/** Frame props where a single non-negative number means uniform `EdgeInsets` (full-spec §6 / shared/frame-props.json). */
const UNIFORM_EDGE_INSETS = uniformEdgeInsetProps();

/** `width` / `height`: non-negative number is sugar for `.fixed(n)` → `{ fixed: n }` after evaluation. */
const FIXED_SIZING_AXES = fixedSizingAxisProps();

function assertScalarSugarNumber(name: string, n: number, entryPath: string): void {
  if (!Number.isFinite(n) || n < 0) {
    throw new PdlError(
      "PDL-E003",
      `Property \`${name}\` must be a non-negative finite number when using scalar numeric sugar`,
      { path: entryPath },
    );
  }
}

/**
 * After `evaluateValue`, normalize scalar numbers for props where the meaning is unambiguous
 * (uniform insets, fixed sizing). Used for `prop`, `frameProp`, and keys merged from `style`.
 */
export function coerceFramePropValue(prop: string, value: unknown, entryPath: string): unknown {
  if (value === null || value === undefined) return value;

  if (UNIFORM_EDGE_INSETS.has(prop)) {
    if (typeof value === "number") {
      assertScalarSugarNumber(prop, value, entryPath);
      return { top: value, right: value, bottom: value, left: value };
    }
    return value;
  }

  if (FIXED_SIZING_AXES.has(prop)) {
    if (typeof value === "number") {
      assertScalarSugarNumber(prop, value, entryPath);
      return { fixed: value };
    }
    return value;
  }

  return value;
}
