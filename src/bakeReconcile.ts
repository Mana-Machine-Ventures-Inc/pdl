/**
 * Bake-IR → DOM reconciler (docs/PROPOSAL_INCREMENTAL_PREVIEW_APPLY.md).
 *
 * Diffs previous/next baked frame trees by stable identity and patches a live
 * container. Prop updates use patchFrameProps; mounts/replacements use
 * renderFrameForReconcile. Equal IR is a no-op; child lists move in place.
 */
import type { BakedComponentJson, BakedFrame } from "./bakeDesign.js";
import {
  patchFrameProps,
  renderFrameForReconcile,
  type FrameRenderOpts,
  type InstanceRenderCtx,
} from "./renderHtml.js";

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  const ak = Object.keys(a as object).sort();
  const bk = Object.keys(b as object).sort();
  if (ak.length !== bk.length) return false;
  return ak.every(
    (k, i) =>
      k === bk[i] &&
      deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
  );
}

/** True when preview IR for a component is unchanged (skip DOM). */
export function bakedComponentTreesEqual(
  a: BakedComponentJson | null | undefined,
  b: BakedComponentJson | null | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    deepEqual(a.root, b.root) &&
    deepEqual(a.bakedParams ?? {}, b.bakedParams ?? {}) &&
    a.rootKind === b.rootKind
  );
}

export function frameReconcileKey(frame: BakedFrame): string {
  if (frame.instanceOf && frame.id) return `let:${frame.id}`;
  return `id:${frame.id}`;
}

function htmlToElement(doc: Document, html: string): Element {
  const wrap = doc.createElement("div");
  wrap.innerHTML = html.trim();
  const el = wrap.firstElementChild;
  if (!el) throw new Error("renderFrame produced no element");
  return el;
}

function childrenContainer(el: Element): Element {
  return (
    el.querySelector(":scope > .pdl-layout__content") ||
    el.querySelector(":scope > .pdl-inst-state:not([hidden])") ||
    el
  );
}

function findChildByKey(parent: Element, key: string): Element | null {
  for (const ch of Array.from(parent.children)) {
    const letK = ch.getAttribute("data-pdl-instance-let");
    if (letK && `let:${letK}` === key) return ch;
    const id = ch.getAttribute("data-pdl-id");
    if (id && `id:${id}` === key) return ch;
  }
  return null;
}

function migrateSession(from: Element, to: Element): void {
  const raw = from.getAttribute("data-pdl-session-params");
  if (!raw) return;
  const target = to.hasAttribute("data-pdl-session-params")
    ? to
    : to.querySelector("[data-pdl-session-params]");
  if (!target) return;
  try {
    const prev = JSON.parse(raw) as Record<string, unknown>;
    const next = JSON.parse(target.getAttribute("data-pdl-session-params") || "{}") as Record<
      string,
      unknown
    >;
    const merged = { ...next, ...prev };
    const liveInput = from.querySelector("input.pdl-text--editable") as HTMLInputElement | null;
    if (liveInput && typeof document !== "undefined" && document.activeElement === liveInput) {
      merged.value = liveInput.value;
    } else if (prev.value !== undefined && (next.isEditing === true || next.isEditing === "true")) {
      merged.value = prev.value;
    }
    if (next.isEditing === true || next.isEditing === "true") merged.isEditing = true;
    target.setAttribute("data-pdl-session-params", JSON.stringify(merged));
    const input = target.querySelector("input.pdl-text--editable") as HTMLInputElement | null;
    if (input && typeof merged.value === "string") input.value = merged.value;
  } catch {
    target.setAttribute("data-pdl-session-params", raw);
  }
}

export type BakeReconcileInstCtx = {
  pointerInputTypes?: Set<string>;
  editableSessionDefaults?: Record<string, Record<string, unknown>>;
  /** Prebaked nested interactionState trees (cold-path dual-bake); optional on hot path. */
  stateTrees?: Record<string, Record<string, BakedComponentJson>>;
};

export type ReconcileOptions = {
  instCtx?: BakeReconcileInstCtx;
  nextKeyStart?: number;
  /** Root session params (component bakedParams) for EditableText activation. */
  sessionParams?: Record<string, unknown>;
};

function toInstanceRenderCtx(
  opts: ReconcileOptions,
): InstanceRenderCtx | undefined {
  if (!opts.instCtx && opts.nextKeyStart == null && !opts.sessionParams) return undefined;
  return {
    nextKey: opts.nextKeyStart ?? 0,
    stateTrees: opts.instCtx?.stateTrees ?? {},
    pointerInputTypes: opts.instCtx?.pointerInputTypes,
    editableSessionDefaults: opts.instCtx?.editableSessionDefaults,
  };
}

/**
 * Reconcile a baked component into an existing `.pdl-canvas` element.
 * No-op (returns true) when prev/next IR are equal.
 */
export function reconcileBakedComponentIntoCanvas(
  canvasEl: Element,
  prev: BakedComponentJson | null | undefined,
  next: BakedComponentJson,
  opts: ReconcileOptions = {},
): boolean {
  const doc = canvasEl.ownerDocument;
  if (!doc) return false;
  try {
    if (bakedComponentTreesEqual(prev, next)) return true;

    const instCtx = toInstanceRenderCtx(opts);
    const rootOpts: FrameRenderOpts = {
      stackChild: false,
      stackZ: 0,
      sessionParams: opts.sessionParams ?? (next.bakedParams as Record<string, unknown> | undefined),
    };
    reconcileChildList(
      canvasEl,
      prev ? [prev.root] : [],
      [next.root],
      instCtx,
      doc,
      rootOpts,
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Identity-preserving child reconcile: patch/move/insert/remove in place.
 * Avoids clear+reappend when the ordered node list is already correct.
 */
function reconcileChildList(
  parentEl: Element,
  prevKids: BakedFrame[],
  nextKids: BakedFrame[],
  instCtx: InstanceRenderCtx | undefined,
  doc: Document,
  parentOpts: FrameRenderOpts,
): void {
  const prevByKey = new Map(prevKids.map((f) => [frameReconcileKey(f), f]));
  /** @type {Element[]} */
  const desired: Element[] = [];
  const used = new Set<Element>();

  for (let i = 0; i < nextKids.length; i++) {
    const next = nextKids[i]!;
    const key = frameReconcileKey(next);
    const prev = prevByKey.get(key);
    let live = findChildByKey(parentEl, key);
    if (live && used.has(live)) live = null;

    const childOpts: FrameRenderOpts = stackAwareChildOpts(
      parentOpts,
      parentEl,
      i,
      nextKids.length,
    );

    if (live && prev && prev.kind === next.kind && prev.instanceOf === next.instanceOf) {
      used.add(live);
      reconcileFrame(live, prev, next, instCtx, doc, childOpts);
      const current = findChildByKey(parentEl, key);
      if (current) desired.push(current);
      else if (live.isConnected) desired.push(live);
      else {
        const html = renderFrameForReconcile(next, childOpts, instCtx);
        desired.push(htmlToElement(doc, html));
      }
    } else {
      const html = renderFrameForReconcile(next, childOpts, instCtx);
      const fresh = htmlToElement(doc, html);
      if (live) migrateSession(live, fresh);
      desired.push(fresh);
    }
  }

  applyChildOrder(parentEl, desired);
}

/** Remove leftovers and move nodes into `desired` order with minimal mutations. */
function applyChildOrder(parentEl: Element, desired: Element[]): void {
  const want = new Set(desired);
  for (const ch of Array.from(parentEl.children)) {
    if (!want.has(ch)) parentEl.removeChild(ch);
  }
  for (let i = 0; i < desired.length; i++) {
    const node = desired[i]!;
    if (parentEl.children[i] !== node) {
      parentEl.insertBefore(node, parentEl.children[i] || null);
    }
  }
}

/** Best-effort stack z from parent direction attr/style; default non-stack. */
function stackAwareChildOpts(
  parentOpts: FrameRenderOpts,
  parentEl: Element,
  index: number,
  childCount: number,
): FrameRenderOpts {
  const sessionParams = parentOpts.sessionParams;
  // Parent layout with stack uses CSS grid; detect via class + style heuristics.
  const style = parentEl.getAttribute("style") || "";
  const isStack =
    /grid-template-columns:\s*minmax/.test(style) || /display:\s*grid/.test(style);
  if (!isStack) return { stackChild: false, stackZ: 0, sessionParams };
  // Match renderHtml stackZIndex: reverseStack paints earlier children on top.
  const reverse = /flex-direction:\s*column-reverse/.test(style);
  const stackZ = reverse ? index + 1 : childCount - index;
  return { stackChild: true, stackZ, sessionParams };
}

function paintTarget(live: Element): Element {
  // Dual-bake instance wrapper: patch the visible state body.
  if (live.classList.contains("pdl-instance")) {
    return (
      live.querySelector(":scope > .pdl-inst-state:not([hidden]) > [data-pdl-id]") ||
      live.querySelector(":scope > .pdl-inst-state:not([hidden]) > *") ||
      live
    );
  }
  return live;
}

function reconcileFrame(
  live: Element,
  prev: BakedFrame,
  next: BakedFrame,
  instCtx: InstanceRenderCtx | undefined,
  doc: Document,
  opts: FrameRenderOpts,
): void {
  const propsSame = deepEqual(prev.props ?? {}, next.props ?? {});
  const kwargsSame = deepEqual(prev.instanceKwargs ?? {}, next.instanceKwargs ?? {});
  const kidsSame = deepEqual(prev.children ?? [], next.children ?? []);

  if (propsSame && kwargsSame && kidsSame) return;

  const target = paintTarget(live);
  let frameOpts = opts;
  if (next.instanceOf && instCtx?.editableSessionDefaults?.[next.instanceOf]) {
    frameOpts = {
      ...opts,
      sessionParams: {
        ...instCtx.editableSessionDefaults[next.instanceOf],
        ...(next.instanceKwargs ?? {}),
      },
    };
  }

  if (!propsSame || !kwargsSame) {
    const result = patchFrameProps(target, prev, next, frameOpts, instCtx);
    // Also keep wrapper kwargs/session in sync when dual-baked.
    if (live.classList.contains("pdl-instance") && live !== target) {
      if (next.instanceKwargs) {
        live.setAttribute("data-pdl-instance-kwargs", JSON.stringify(next.instanceKwargs));
      }
      if (frameOpts.sessionParams) {
        const raw = live.getAttribute("data-pdl-session-params");
        let merged = { ...frameOpts.sessionParams };
        if (raw) {
          try {
            const prevBag = JSON.parse(raw) as Record<string, unknown>;
            merged = { ...frameOpts.sessionParams, ...prevBag };
            if (
              frameOpts.sessionParams.isEditing === true ||
              frameOpts.sessionParams.isEditing === "true"
            ) {
              merged.isEditing = true;
            }
          } catch {
            /* keep merged */
          }
        }
        live.setAttribute("data-pdl-session-params", JSON.stringify(merged));
      }
    }
    if (result === "needsRemount") {
      const html = renderFrameForReconcile(next, frameOpts, instCtx);
      const fresh = htmlToElement(doc, html);
      migrateSession(live, fresh);
      live.replaceWith(fresh);
      return;
    }
  }

  const prevKids = prev.children ?? [];
  const nextKids = next.children ?? [];
  if (deepEqual(prevKids, nextKids)) return;

  const visibleState = live.classList.contains("pdl-instance")
    ? live.querySelector(":scope > .pdl-inst-state:not([hidden])")
    : null;
  const container = visibleState ?? childrenContainer(target);
  reconcileChildList(container, prevKids, nextKids, instCtx, doc, frameOpts);
}
