/**
 * Dual-bake pointer chrome is a cold snapshot cache (hidden `.pdl-inst-state` trees).
 * Source/theme ticks must invalidate it — IR-only rest bake often does not change when
 * only a hover/press branch is edited.
 */

/**
 * True when PointerInput-like instances are mounted without dual-bake fragments.
 * @param {Document | null | undefined} doc
 */
export function pointerChromeDualBakeMissing(doc) {
  if (!doc) return false;
  const nodes = doc.querySelectorAll(
    '[data-pdl-instance-of][data-pdl-pointer-input="1"], [data-pdl-instance-of]',
  );
  for (const n of nodes) {
    const of = n.getAttribute("data-pdl-instance-of") || "";
    const maybePointer =
      n.getAttribute("data-pdl-pointer-input") === "1" ||
      /Btn|Button|Chip|Press/i.test(of);
    if (!maybePointer) continue;
    if (!n.querySelector(":scope > .pdl-inst-state")) return true;
  }
  return false;
}

/**
 * True when the live preview already has dual-bake chrome fragments to keep fresh.
 * @param {Document | null | undefined} doc
 */
export function documentHasPointerChromeDualBake(doc) {
  if (!doc) return false;
  return !!doc.querySelector(
    ".pdl-instance > .pdl-inst-state[data-pdl-state], section.pdl-preview > .pdl-state[data-pdl-state]",
  );
}

/**
 * Source/theme ticks (`incremental && !ownerOnly`) must remount HTML with fresh
 * dual-bake when chrome fragments are in play. Param/emit ticks keep IR-only.
 *
 * @param {{
 *   incremental: boolean,
 *   ownerOnly: boolean,
 *   doc: Document | null | undefined,
 * }} opts
 */
export function shouldInvalidateDualBakeOnSourceTick(opts) {
  const { incremental, ownerOnly, doc } = opts;
  if (!incremental || ownerOnly) return false;
  return documentHasPointerChromeDualBake(doc);
}

/**
 * Whether the WASM/Rust IR-only early return is allowed.
 * False when dual-bake is missing (need HTML once) or source tick must refresh it.
 *
 * @param {{
 *   incremental: boolean,
 *   ownerOnly: boolean,
 *   doc: Document | null | undefined,
 * }} opts
 */
export function allowIrOnlyPreviewApply(opts) {
  if (shouldInvalidateDualBakeOnSourceTick(opts)) return false;
  if (pointerChromeDualBakeMissing(opts.doc)) return false;
  return true;
}
