/**
 * Bake-IR → DOM reconciler (docs/PROPOSAL_INCREMENTAL_PREVIEW_APPLY.md).
 *
 * Diffs previous/next baked frame trees by stable identity and patches a live
 * container. Uses renderFrameForReconcile for mounts/replacements.
 */
import type { BakedComponentJson, BakedFrame } from "./bakeDesign.js";
import {
  renderFrameForReconcile,
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

function patchTextContent(el: Element, content: string): void {
  const inner =
    el.querySelector(":scope > .pdl-text__inner") ||
    el.querySelector(":scope > .pdl-text__clamp") ||
    null;
  if (inner) {
    inner.textContent = content;
    return;
  }
  if (el.children.length === 0) {
    el.textContent = content;
    return;
  }
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 3) node.parentNode?.removeChild(node);
  }
  el.insertBefore(el.ownerDocument.createTextNode(content), el.firstChild);
}

export type BakeReconcileInstCtx = {
  pointerInputTypes?: Set<string>;
  editableSessionDefaults?: Record<string, Record<string, unknown>>;
};

export type ReconcileOptions = {
  instCtx?: BakeReconcileInstCtx;
  nextKeyStart?: number;
};

/**
 * Reconcile a baked component into an existing `.pdl-canvas` element.
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
    const instCtx: InstanceRenderCtx | undefined = opts.instCtx
      ? {
          nextKey: opts.nextKeyStart ?? 0,
          stateTrees: {},
          pointerInputTypes: opts.instCtx.pointerInputTypes,
          editableSessionDefaults: opts.instCtx.editableSessionDefaults,
        }
      : undefined;
    reconcileChildList(canvasEl, prev ? [prev.root] : [], [next.root], instCtx, doc);
    return true;
  } catch {
    return false;
  }
}

function reconcileChildList(
  parentEl: Element,
  prevKids: BakedFrame[],
  nextKids: BakedFrame[],
  instCtx: InstanceRenderCtx | undefined,
  doc: Document,
): void {
  const prevByKey = new Map(prevKids.map((f) => [frameReconcileKey(f), f]));
  const result: Element[] = [];
  const used = new Set<Element>();

  for (const next of nextKids) {
    const key = frameReconcileKey(next);
    const prev = prevByKey.get(key);
    let live = findChildByKey(parentEl, key);
    if (live && used.has(live)) live = null;

    if (live && prev && prev.kind === next.kind && prev.instanceOf === next.instanceOf) {
      used.add(live);
      reconcileFrame(live, prev, next, instCtx, doc);
      const current = findChildByKey(parentEl, key);
      if (current) result.push(current);
      else if (live.isConnected) result.push(live);
      else {
        const html = renderFrameForReconcile(next, { stackChild: false, stackZ: 0 }, instCtx);
        result.push(htmlToElement(doc, html));
      }
    } else {
      const html = renderFrameForReconcile(next, { stackChild: false, stackZ: 0 }, instCtx);
      const fresh = htmlToElement(doc, html);
      if (live) migrateSession(live, fresh);
      result.push(fresh);
    }
  }

  while (parentEl.firstChild) parentEl.removeChild(parentEl.firstChild);
  for (const node of result) parentEl.appendChild(node);
}

function reconcileFrame(
  live: Element,
  prev: BakedFrame,
  next: BakedFrame,
  instCtx: InstanceRenderCtx | undefined,
  doc: Document,
): void {
  const propsSame = deepEqual(prev.props ?? {}, next.props ?? {});
  const kwargsSame = deepEqual(prev.instanceKwargs ?? {}, next.instanceKwargs ?? {});

  if (prev.kind === "text" && next.kind === "text" && !prev.instanceOf && !next.instanceOf && kwargsSame) {
    const prevCopy = { ...(prev.props ?? {}) };
    const nextCopy = { ...(next.props ?? {}) };
    const prevContent = prevCopy.content;
    const nextContent = nextCopy.content;
    delete prevCopy.content;
    delete nextCopy.content;
    if (deepEqual(prevCopy, nextCopy) && prevContent !== nextContent) {
      patchTextContent(live, String(nextContent ?? ""));
      return;
    }
  }

  if (!propsSame || !kwargsSame) {
    const html = renderFrameForReconcile(next, { stackChild: false, stackZ: 0 }, instCtx);
    const fresh = htmlToElement(doc, html);
    migrateSession(live, fresh);
    live.replaceWith(fresh);
    return;
  }

  const prevKids = prev.children ?? [];
  const nextKids = next.children ?? [];
  if (deepEqual(prevKids, nextKids)) return;

  const visibleState = live.classList.contains("pdl-instance")
    ? live.querySelector(":scope > .pdl-inst-state:not([hidden])")
    : null;
  const target = visibleState ?? childrenContainer(live);
  reconcileChildList(target, prevKids, nextKids, instCtx, doc);
}
