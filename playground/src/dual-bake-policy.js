/**
 * Dual-bake (`.pdl-inst-state` / `.pdl-state` siblings) is retired.
 * Nested chrome uses instance-resolve; top-level chrome uses owner rebake.
 * These helpers remain so call sites stay stable — IR-only is always allowed.
 */

/**
 * @param {Document | null | undefined} doc
 */
export function pointerChromeDualBakeMissing(doc) {
  void doc;
  return false;
}

/**
 * @param {Document | null | undefined} doc
 */
export function documentHasPointerChromeDualBake(doc) {
  if (!doc) return false;
  return !!doc.querySelector(
    ".pdl-instance > .pdl-inst-state[data-pdl-state], section.pdl-preview > .pdl-state[data-pdl-state]",
  );
}

/**
 * @param {{
 *   incremental: boolean,
 *   ownerOnly: boolean,
 *   doc: Document | null | undefined,
 * }} _opts
 */
export function shouldInvalidateDualBakeOnSourceTick(_opts) {
  return false;
}

/**
 * @param {{
 *   incremental: boolean,
 *   ownerOnly: boolean,
 *   doc: Document | null | undefined,
 * }} _opts
 */
export function allowIrOnlyPreviewApply(_opts) {
  return true;
}
