/**
 * Bake-IR → DOM reconciler (docs/PROPOSAL_INCREMENTAL_PREVIEW_APPLY.md).
 *
 * Diffs previous/next baked frame trees by stable identity and patches a live
 * container. Prop updates use patchFrameProps; mounts/replacements use
 * renderFrameForReconcile. Equal IR is a no-op; child lists move in place.
 */
import type { BakedComponentJson, BakedFrame } from "./bakeDesign.js";
import {
  mergeEditableSessionParams,
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
    const liveInput = (
      from.matches?.("input.pdl-text--editable")
        ? from
        : from.querySelector(
            ".pdl-inst-state:not([hidden]) input.pdl-text--editable, input.pdl-text--editable",
          )
    ) as HTMLInputElement | null;
    const liveValue =
      liveInput && typeof document !== "undefined" && document.activeElement === liveInput
        ? liveInput.value
        : null;
    const merged = mergeEditableSessionParams(next, prev, liveValue);
    target.setAttribute("data-pdl-session-params", JSON.stringify(merged));
    const input = (
      target.matches?.("input.pdl-text--editable")
        ? target
        : target.querySelector("input.pdl-text--editable")
    ) as HTMLInputElement | null;
    if (input && typeof merged.value === "string") input.value = merged.value;
  } catch {
    target.setAttribute("data-pdl-session-params", raw);
  }
}

/** Attrs that must stay on the listening `[data-pdl-instance-let]` mount across paints. */
const STABLE_INSTANCE_MOUNT_ATTRS = [
  "data-pdl-instance-let",
  "data-pdl-instance-of",
  "data-pdl-instance-kwargs",
  "data-pdl-foreach-list",
  "data-pdl-session-params",
  "data-pdl-pointer-input",
  "data-pdl-listening",
  "data-pdl-chrome-state-param",
  "data-pdl-instance-key",
  "data-pdl-instance-bake",
] as const;

/**
 * Apply a freshly rendered frame onto `mount` without replacing the element.
 * Critical for instance-resolve: hoverStart must not destroy the node that owns
 * mouseleave/click listeners (replaceWith under the cursor skips hoverEnd).
 */
function adoptRenderedIntoMount(mount: Element, fresh: Element): void {
  if (mount.classList.contains("pdl-instance")) {
    while (mount.firstChild) mount.removeChild(mount.firstChild);
    mount.appendChild(fresh);
    return;
  }

  const preserved = new Map<string, string>();
  for (const name of STABLE_INSTANCE_MOUNT_ATTRS) {
    const v = mount.getAttribute(name);
    if (v != null) preserved.set(name, v);
  }

  if (mount.tagName === "INPUT" || mount.tagName === "TEXTAREA") {
    const live = mount as HTMLInputElement;
    const src = fresh as HTMLInputElement;
    for (const attr of Array.from(src.attributes)) {
      if ((STABLE_INSTANCE_MOUNT_ATTRS as readonly string[]).includes(attr.name)) continue;
      live.setAttribute(attr.name, attr.value);
    }
    if (typeof src.value === "string") live.value = src.value;
    for (const [k, v] of preserved) live.setAttribute(k, v);
    return;
  }

  const cls = fresh.getAttribute("class");
  if (cls != null) mount.setAttribute("class", cls);
  else mount.removeAttribute("class");

  const style = fresh.getAttribute("style");
  if (style != null) mount.setAttribute("style", style);
  else mount.removeAttribute("style");

  for (const attr of Array.from(mount.attributes)) {
    if (attr.name === "class" || attr.name === "style") continue;
    if ((STABLE_INSTANCE_MOUNT_ATTRS as readonly string[]).includes(attr.name)) continue;
    if (attr.name.startsWith("data-pdl-") && !fresh.hasAttribute(attr.name)) {
      mount.removeAttribute(attr.name);
    }
  }
  for (const attr of Array.from(fresh.attributes)) {
    if (attr.name === "class" || attr.name === "style") continue;
    if ((STABLE_INSTANCE_MOUNT_ATTRS as readonly string[]).includes(attr.name)) continue;
    mount.setAttribute(attr.name, attr.value);
  }

  while (mount.firstChild) mount.removeChild(mount.firstChild);
  while (fresh.firstChild) mount.appendChild(fresh.firstChild);

  for (const [k, v] of preserved) mount.setAttribute(k, v);
}

export type BakeReconcileInstCtx = {
  pointerInputTypes?: Set<string>;
  editableSessionDefaults?: Record<string, Record<string, unknown>>;
  /** Prebaked nested interactionState trees (cold-path dual-bake); optional on hot path. */
  stateTrees?: Record<string, Record<string, BakedComponentJson>>;
};

export type ReconcileOptions = {
  instCtx?: BakeReconcileInstCtx;
  /** Prior bake's EditableText defaults — used for activatesOn structure remounts. */
  prevInstCtx?: BakeReconcileInstCtx;
  nextKeyStart?: number;
  /** Root session params (component bakedParams) for EditableText activation. */
  sessionParams?: Record<string, unknown>;
  /** Prior root session params (previous bakedParams). */
  prevSessionParams?: Record<string, unknown>;
};

function toInstanceRenderCtx(
  inst?: BakeReconcileInstCtx,
  nextKeyStart?: number,
): InstanceRenderCtx | undefined {
  if (!inst && nextKeyStart == null) return undefined;
  return {
    nextKey: nextKeyStart ?? 0,
    stateTrees: inst?.stateTrees ?? {},
    pointerInputTypes: inst?.pointerInputTypes,
    editableSessionDefaults: inst?.editableSessionDefaults,
  };
}

/** True when a frame tree nests an `instanceOf` in `typeNames`. */
export function frameTreeNestsInstanceTypes(
  frame: BakedFrame | null | undefined,
  typeNames: ReadonlySet<string>,
): boolean {
  if (!frame || typeNames.size === 0) return false;
  if (frame.instanceOf && typeNames.has(frame.instanceOf)) return true;
  for (const ch of frame.children ?? []) {
    if (frameTreeNestsInstanceTypes(ch, typeNames)) return true;
  }
  return false;
}

/** EditableText type names whose session defaults changed between bakes. */
export function changedEditableSessionTypes(
  prev: Record<string, Record<string, unknown>>,
  next: Record<string, Record<string, unknown>>,
): Set<string> {
  const out = new Set<string>();
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const k of keys) {
    if (!deepEqual(prev[k] ?? null, next[k] ?? null)) out.add(k);
  }
  return out;
}

/**
 * Reconcile a nested instance mount from a fresh bake of that child type.
 * Used by instance-resolve (pointer / editing chrome): bake(EditorBtn, kwargs) →
 * patch the `[data-pdl-instance-let]` node without rebaking the parent.
 *
 * Flattens legacy dual-bake `.pdl-inst-state` siblings so resolve owns paint.
 * Never replaces the listening mount element — hoverStart under the cursor must
 * keep the same node so mouseleave/click listeners still fire.
 */
export function reconcileBakedInstanceIntoElement(
  instanceEl: Element,
  prevRoot: BakedFrame | null | undefined,
  nextRoot: BakedFrame,
  opts: ReconcileOptions = {},
): boolean {
  const doc = instanceEl.ownerDocument;
  if (!doc || !nextRoot) return false;
  try {
    const instCtx = toInstanceRenderCtx(opts.instCtx, opts.nextKeyStart);
    const prevInstCtx = toInstanceRenderCtx(opts.prevInstCtx, opts.nextKeyStart);
    const sessionParams =
      opts.sessionParams ??
      ((nextRoot.instanceKwargs as Record<string, unknown> | undefined) ?? undefined);
    const frameOpts: FrameRenderOpts = {
      stackChild: false,
      stackZ: 0,
      sessionParams,
      omitInstanceAttrs: true,
    };
    const prevFrameOpts: FrameRenderOpts = {
      stackChild: false,
      stackZ: 0,
      sessionParams: opts.prevSessionParams ?? sessionParams,
      omitInstanceAttrs: true,
    };

    const wrapper = instanceEl.classList.contains("pdl-instance")
      ? instanceEl
      : instanceEl.hasAttribute("data-pdl-instance-let")
        ? instanceEl
        : instanceEl.closest("[data-pdl-instance-let], .pdl-instance") || instanceEl;

    // Drop dual-bake state siblings — instance resolve paints a single tree.
    if (wrapper.classList.contains("pdl-instance")) {
      const states = wrapper.querySelectorAll(":scope > .pdl-inst-state");
      if (states.length > 0) {
        const keep =
          wrapper.querySelector(":scope > .pdl-inst-state:not([hidden]) > *") ||
          states[0]?.firstElementChild ||
          null;
        while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);
        if (keep) wrapper.appendChild(keep);
      }
    }

    const syncInstanceAttrs = (el: Element): void => {
      if (sessionParams && Object.keys(sessionParams).length) {
        el.setAttribute("data-pdl-instance-kwargs", JSON.stringify(sessionParams));
        if (el.hasAttribute("data-pdl-session-params") || el.hasAttribute("data-pdl-instance-of")) {
          const raw = el.getAttribute("data-pdl-session-params");
          let merged: Record<string, unknown> = { ...sessionParams };
          if (raw) {
            try {
              const prevBag = JSON.parse(raw) as Record<string, unknown>;
              merged = mergeEditableSessionParams(sessionParams, prevBag, null);
            } catch {
              /* keep */
            }
          }
          el.setAttribute("data-pdl-session-params", JSON.stringify(merged));
        }
      }
    };

    const paintIntoMount = (root: BakedFrame): void => {
      const html = renderFrameForReconcile(root, frameOpts, instCtx);
      const fresh = htmlToElement(doc, html);
      adoptRenderedIntoMount(wrapper, fresh);
      syncInstanceAttrs(wrapper);
    };

    // Nested `.pdl-instance` shell: listeners stay on wrapper; inner paint may remount.
    const paintEl: Element | null =
      wrapper.classList.contains("pdl-instance") && wrapper.firstElementChild
        ? wrapper.firstElementChild
        : null;

    if (!prevRoot) {
      paintIntoMount(nextRoot);
      return true;
    }

    if (
      deepEqual(prevRoot, nextRoot) &&
      deepEqual(opts.prevSessionParams ?? null, opts.sessionParams ?? null)
    ) {
      syncInstanceAttrs(wrapper);
      return true;
    }

    if (paintEl) {
      // Listeners are on the outer wrapper — inner replaceWith is safe.
      reconcileFrame(
        paintEl,
        prevRoot,
        nextRoot,
        instCtx,
        doc,
        frameOpts,
        prevInstCtx,
        prevFrameOpts,
      );
      if (!wrapper.firstElementChild?.isConnected) {
        paintIntoMount(nextRoot);
      } else {
        syncInstanceAttrs(wrapper);
      }
      return true;
    }

    // Bare mount (= listening node): patch in place; on remount, adopt (never replaceWith).
    const propsSame = deepEqual(prevRoot.props ?? {}, nextRoot.props ?? {});
    const kidsSame = deepEqual(prevRoot.children ?? [], nextRoot.children ?? []);
    if (!propsSame) {
      const result = patchFrameProps(
        wrapper,
        prevRoot,
        nextRoot,
        frameOpts,
        instCtx,
        prevInstCtx,
        prevFrameOpts,
      );
      if (result === "needsRemount") {
        paintIntoMount(nextRoot);
        return true;
      }
    }
    syncInstanceAttrs(wrapper);
    if (!kidsSame) {
      reconcileChildList(
        childrenContainer(wrapper),
        prevRoot.children ?? [],
        nextRoot.children ?? [],
        instCtx,
        doc,
        frameOpts,
        prevInstCtx,
        prevFrameOpts,
      );
    }
    return true;
  } catch {
    return false;
  }
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
    const instCtx = toInstanceRenderCtx(opts.instCtx, opts.nextKeyStart);
    const prevInstCtx = toInstanceRenderCtx(opts.prevInstCtx, opts.nextKeyStart);
    const rootOpts: FrameRenderOpts = {
      stackChild: false,
      stackZ: 0,
      sessionParams: opts.sessionParams ?? (next.bakedParams as Record<string, unknown> | undefined),
    };
    const prevRootOpts: FrameRenderOpts = {
      stackChild: false,
      stackZ: 0,
      sessionParams:
        opts.prevSessionParams ??
        ((prev?.bakedParams as Record<string, unknown> | undefined) ?? rootOpts.sessionParams),
    };
    const treesEqual = bakedComponentTreesEqual(prev, next);
    const sessionDefaultsChanged = !deepEqual(
      opts.prevInstCtx?.editableSessionDefaults ?? null,
      opts.instCtx?.editableSessionDefaults ?? null,
    );
    const rootSessionChanged = !deepEqual(
      prevRootOpts.sessionParams ?? null,
      rootOpts.sessionParams ?? null,
    );
    // Equal IR still needs a pass when EditableText activatesOn (type default) flips —
    // nested kwargs omit activatesOn, so the parent tree looks unchanged.
    if (treesEqual && !sessionDefaultsChanged && !rootSessionChanged) return true;

    reconcileChildList(
      canvasEl,
      prev ? [prev.root] : [],
      [next.root],
      instCtx,
      doc,
      rootOpts,
      prevInstCtx,
      prevRootOpts,
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
  prevInstCtx?: InstanceRenderCtx,
  prevParentOpts?: FrameRenderOpts,
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
    const prevChildOpts: FrameRenderOpts = stackAwareChildOpts(
      prevParentOpts ?? parentOpts,
      parentEl,
      i,
      nextKids.length,
    );

    if (live && prev && prev.kind === next.kind && prev.instanceOf === next.instanceOf) {
      used.add(live);
      reconcileFrame(live, prev, next, instCtx, doc, childOpts, prevInstCtx, prevChildOpts);
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
  prevInstCtx?: InstanceRenderCtx,
  prevOpts?: FrameRenderOpts,
): void {
  const propsSame = deepEqual(prev.props ?? {}, next.props ?? {});
  const kwargsSame = deepEqual(prev.instanceKwargs ?? {}, next.instanceKwargs ?? {});
  const kidsSame = deepEqual(prev.children ?? [], next.children ?? []);

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
  let prevFrameOpts = prevOpts ?? opts;
  if (prev.instanceOf && (prevInstCtx ?? instCtx)?.editableSessionDefaults?.[prev.instanceOf]) {
    const pCtx = prevInstCtx ?? instCtx;
    prevFrameOpts = {
      ...(prevOpts ?? opts),
      sessionParams: {
        ...pCtx!.editableSessionDefaults![prev.instanceOf],
        ...(prev.instanceKwargs ?? {}),
      },
    };
  }

  const editableDefaultsSame = deepEqual(
    prevInstCtx?.editableSessionDefaults ?? null,
    instCtx?.editableSessionDefaults ?? null,
  );

  // Patch / remount this node when props, kwargs, or EditableText paint mode change.
  // activatesOn on the type default leaves instance kwargs equal but flips input↔plain text.
  if (!propsSame || !kwargsSame || !editableDefaultsSame) {
    const result = patchFrameProps(
      target,
      prev,
      next,
      frameOpts,
      instCtx,
      prevInstCtx,
      prevFrameOpts,
    );
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
            const liveInput = (
              live.matches?.("input.pdl-text--editable")
                ? live
                : live.querySelector("input.pdl-text--editable")
            ) as HTMLInputElement | null;
            const liveValue =
              liveInput &&
              typeof document !== "undefined" &&
              document.activeElement === liveInput
                ? liveInput.value
                : null;
            merged = mergeEditableSessionParams(frameOpts.sessionParams, prevBag, liveValue);
          } catch {
            /* keep merged */
          }
        }
        live.setAttribute("data-pdl-session-params", JSON.stringify(merged));
      }
    } else if (
      result === "patched" &&
      frameOpts.sessionParams &&
      live.hasAttribute("data-pdl-session-params")
    ) {
      // Bare <input> instance (no wrapper): refresh activatesOn in the session bag.
      const raw = live.getAttribute("data-pdl-session-params");
      let merged = { ...frameOpts.sessionParams };
      if (raw) {
        try {
          const prevBag = JSON.parse(raw) as Record<string, unknown>;
          merged = mergeEditableSessionParams(frameOpts.sessionParams, prevBag, null);
        } catch {
          /* keep */
        }
      }
      live.setAttribute("data-pdl-session-params", JSON.stringify(merged));
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
  // IR kids equal — still recurse when type-default session paint may remount leaves
  // (NoteEditor tree unchanged while NoteField.activatesOn flips).
  if (kidsSame && editableDefaultsSame) return;

  const visibleState = live.classList.contains("pdl-instance")
    ? live.querySelector(":scope > .pdl-inst-state:not([hidden])")
    : null;
  const container = visibleState ?? childrenContainer(target);
  reconcileChildList(
    container,
    prevKids,
    nextKids,
    instCtx,
    doc,
    frameOpts,
    prevInstCtx,
    prevFrameOpts,
  );
}
