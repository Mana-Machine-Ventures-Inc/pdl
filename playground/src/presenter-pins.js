/**
 * Session pin bag for Presenter lets. Same shape as WASM `apply_presenter_pins`.
 * `{ letId: { stack: [{ component, params }], cover? } }`
 */

/**
 * @param {unknown} page
 * @returns {{ component: string, params: Record<string, unknown> } | null}
 */
function pageEntry(page) {
  if (!page || typeof page !== "object") return null;
  const rec = /** @type {Record<string, unknown>} */ (page);
  const component = rec.component != null ? String(rec.component) : "";
  if (!component) return null;
  const params =
    rec.params && typeof rec.params === "object" && !Array.isArray(rec.params)
      ? { .../** @type {Record<string, unknown>} */ (rec.params) }
      : {};
  return { component, params };
}

/**
 * @param {Record<string, unknown> | null | undefined} pins
 * @param {Array<{ qualifier?: string, name?: string, page?: unknown, style?: string, move?: unknown, dismissMove?: unknown, owner?: string }>} ops
 * @returns {Record<string, unknown>}
 */
export function applyPresenterOps(pins, ops) {
  /** @type {Record<string, { stack: Array<{ component: string, params: Record<string, unknown> }>, cover?: { component: string, params: Record<string, unknown> }, lastMove?: unknown, lastDismissMove?: unknown }>} */
  const next = {};
  if (pins && typeof pins === "object" && !Array.isArray(pins)) {
    for (const [k, v] of Object.entries(pins)) {
      if (!v || typeof v !== "object" || Array.isArray(v)) continue;
      const rec = /** @type {Record<string, unknown>} */ (v);
      const stack = Array.isArray(rec.stack)
        ? rec.stack
            .map((e) => pageEntry(e))
            .filter((e) => e != null)
        : [];
      /** @type {{ stack: Array<{ component: string, params: Record<string, unknown> }>, cover?: { component: string, params: Record<string, unknown> }, lastMove?: unknown, lastDismissMove?: unknown }} */
      const pin = { stack };
      const cover = pageEntry(rec.cover);
      if (cover) pin.cover = cover;
      if (rec.lastMove != null) pin.lastMove = rec.lastMove;
      if (rec.lastDismissMove != null) pin.lastDismissMove = rec.lastDismissMove;
      next[k] = pin;
    }
  }
  for (const op of ops ?? []) {
    if (!op || typeof op !== "object") continue;
    const qualifier =
      typeof op.qualifier === "string" && op.qualifier.trim() ? op.qualifier : "presenter";
    const pin = next[qualifier] ?? { stack: [] };
    const stack = [...pin.stack];
    const page = pageEntry(op.page);
    switch (op.name) {
      case "push":
        if (page) stack.push(page);
        if (op.move != null) pin.lastMove = op.move;
        if (op.dismissMove != null || op.move != null) {
          pin.lastDismissMove = op.dismissMove ?? op.move;
        }
        break;
      case "pop":
        if (stack.length > 1) stack.pop();
        break;
      case "replace":
        if (page) {
          if (stack.length) stack[stack.length - 1] = page;
          else stack.push(page);
        }
        break;
      case "present":
        if (page) pin.cover = page;
        break;
      case "dismiss":
        delete pin.cover;
        break;
      default:
        continue;
    }
    pin.stack = stack;
    next[qualifier] = pin;
  }
  return next;
}

/**
 * Pair clip for this op list. Push/present use `move`. Pop/dismiss use the
 * stored `lastDismissMove` (or `lastMove`) from before the op is applied.
 *
 * @param {Array<{ qualifier?: string, name?: string, move?: unknown, dismissMove?: unknown }>} ops
 * @param {Record<string, unknown> | null | undefined} pins
 */
export function resolvePairMove(ops, pins) {
  for (const op of ops ?? []) {
    if (!op || typeof op !== "object") continue;
    const qualifier =
      typeof op.qualifier === "string" && op.qualifier.trim() ? op.qualifier : "presenter";
    if (op.name === "push" || (op.name === "present" && !op.style)) {
      if (op.move && typeof op.move === "object") return op.move;
    }
    if (op.name === "pop" || op.name === "dismiss") {
      if (op.move && typeof op.move === "object") return op.move;
      const pin =
        pins && typeof pins === "object" && !Array.isArray(pins)
          ? /** @type {Record<string, unknown>} */ (pins)[qualifier]
          : null;
      if (pin && typeof pin === "object" && !Array.isArray(pin)) {
        const rec = /** @type {Record<string, unknown>} */ (pin);
        if (rec.lastDismissMove && typeof rec.lastDismissMove === "object") {
          return rec.lastDismissMove;
        }
        if (rec.lastMove && typeof rec.lastMove === "object") return rec.lastMove;
      }
    }
  }
  return null;
}

/**
 * After a catalogue refresh, retarget stored pair clips at the newly
 * evaluated `move` / `dismissMove` so Back uses the edited token.
 *
 * @param {Record<string, unknown> | null | undefined} pinsByOwner
 * @param {Record<string, unknown> | null | undefined} emitCapturesByComponent
 */
export function refreshPinnedPairMoves(pinsByOwner, emitCapturesByComponent) {
  if (!pinsByOwner || !emitCapturesByComponent) return;
  for (const [owner, bag] of Object.entries(pinsByOwner)) {
    const caps = emitCapturesByComponent[owner];
    if (!Array.isArray(caps) || !bag || typeof bag !== "object" || Array.isArray(bag)) continue;
    /** @type {{ move?: unknown, dismissMove?: unknown } | null} */
    let found = null;
    for (const cap of caps) {
      if (!cap || typeof cap !== "object") continue;
      const body = /** @type {{ body?: unknown }} */ (cap).body;
      if (!Array.isArray(body)) continue;
      for (const item of body) {
        if (!item || typeof item !== "object") continue;
        const rec = /** @type {{ kind?: string, move?: unknown, dismissMove?: unknown }} */ (item);
        if (rec.kind === "presenterVerb" && (rec.move != null || rec.dismissMove != null)) {
          found = rec;
        }
      }
    }
    if (!found) continue;
    for (const pin of Object.values(/** @type {Record<string, unknown>} */ (bag))) {
      if (!pin || typeof pin !== "object" || Array.isArray(pin)) continue;
      const rec = /** @type {Record<string, unknown>} */ (pin);
      if (rec.lastMove != null && found.move != null) rec.lastMove = found.move;
      if (rec.lastDismissMove != null) rec.lastDismissMove = found.dismissMove ?? found.move;
    }
  }
}
