import type { InteractionHandlerItem, ValueExpr } from "./ast.js";
import {
  easeToWaapi,
  implicitTransitionCss,
  isMotionPropName,
  MOTION_IDENTITY,
  normalizeAnimationTiming,
  normalizeTransition,
  snapshotToCss,
  type AnimationKey,
  type AnimationSpec,
  type MotionSnapshot,
  type MotionTransition,
} from "./motionProps.js";

export type {
  AnimationKey,
  AnimationSpec,
  MotionSnapshot,
  MotionSpec,
  MotionTransition,
} from "./motionProps.js";
export { implicitTransitionCss, snapshotToCss };

export function numberFromValueExpr(expr: ValueExpr): number | undefined {
  if (expr.kind === "number") return expr.value;
  return undefined;
}

function snapshotFromPoseExpr(
  expr: ValueExpr,
  evalNumber: (expr: ValueExpr) => number | undefined,
): MotionSnapshot | undefined {
  if (expr.kind !== "pose") return undefined;
  return evalSnapshot(expr.props, evalNumber);
}

function staggerFromExpr(
  expr: ValueExpr,
  evalNumber: (expr: ValueExpr) => number | undefined,
): { stagger?: number; staggerFrom?: "first" | "last" } {
  if (expr.kind !== "stagger") return {};
  const step = evalNumber(expr.step);
  const from =
    expr.from?.kind === "dotEnum"
      ? expr.from.value.replace(/^\./, "")
      : expr.from?.kind === "string"
        ? expr.from.value
        : undefined;
  return {
    ...(step != null && Number.isFinite(step) ? { stagger: step } : {}),
    ...(from === "first" || from === "last" ? { staggerFrom: from } : {}),
  };
}

function poseFromUnknown(raw: unknown): MotionSnapshot | "rest" | undefined {
  if (raw === "rest" || raw === ".rest") return "rest";
  if (typeof raw === "string" && raw.replace(/^\./, "") === "rest") return "rest";
  return snapshotFromUnknown(raw);
}

function animationKeyFromUnknown(raw: unknown): AnimationKey | undefined {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const timing = normalizeAnimationTiming(o.timing ?? o);
  if (!timing) return undefined;
  const pose = poseFromUnknown(o.pose);
  if (pose == null) return undefined;
  return { timing, pose };
}

/** Normalize evaluated / catalogue Animation JSON into AnimationSpec. */
export function specFromEvaluated(raw: unknown): AnimationSpec | undefined {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const isAnimation = o.kind === "animation" || o.keys != null || o.start != null;
  if (!isAnimation) return undefined;
  if (!Array.isArray(o.keys)) return undefined;
  const keys = o.keys
    .map((k) => animationKeyFromUnknown(k))
    .filter((k): k is AnimationKey => k != null);
  if (!keys.length) return undefined;
  const spec: AnimationSpec = { kind: "animation", keys };
  if (o.start != null) {
    const start = poseFromUnknown(o.start);
    if (start != null) spec.start = start;
  }
  const st = o.stagger;
  if (st && typeof st === "object" && !Array.isArray(st)) {
    const so = st as Record<string, unknown>;
    const step = Number(so.step);
    if (Number.isFinite(step) && step >= 0) spec.stagger = step;
    const from = typeof so.from === "string" ? so.from.replace(/^\./, "") : undefined;
    if (from === "first" || from === "last") spec.staggerFrom = from;
  } else if (typeof st === "number" && Number.isFinite(st)) {
    spec.stagger = st;
  }
  if (typeof o.staggerFrom === "string") {
    const from = o.staggerFrom.replace(/^\./, "");
    if (from === "first" || from === "last") spec.staggerFrom = from;
  }
  if (typeof o.repeat === "string" && o.repeat.replace(/^\./, "") === "forever") {
    spec.repeat = "forever";
  } else {
    const repeat = Number(o.repeat);
    if (Number.isFinite(repeat) && repeat >= 1) spec.repeat = repeat;
  }
  return spec;
}

function snapshotFromUnknown(raw: unknown): MotionSnapshot | undefined {
  if (raw == null || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const src =
    o.props && typeof o.props === "object" && !Array.isArray(o.props)
      ? (o.props as Record<string, unknown>)
      : o;
  const snap: MotionSnapshot = {};
  for (const key of Object.keys(src)) {
    if (!isMotionPropName(key)) continue;
    const n = Number(src[key]);
    if (Number.isFinite(n)) snap[key] = n;
  }
  return Object.keys(snap).length ? snap : undefined;
}

function coerceNumber(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw && typeof raw === "object" && !Array.isArray(raw) && "value" in raw) {
    const n = Number((raw as { value: unknown }).value);
    if (Number.isFinite(n)) return n;
  }
  if (typeof raw === "string" && raw.trim()) {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function coerceEase(raw: unknown): unknown {
  if (raw == null) return undefined;
  if (
    typeof raw === "string" ||
    (raw && typeof raw === "object" && (raw as { kind?: string }).kind === "easeBezier")
  ) {
    return raw;
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    if (typeof o.value === "string") return o.value;
  }
  return raw;
}

function pairClock(pair: PresentationMotionEval): {
  duration: number;
  ease: unknown;
  delay: number;
} {
  return {
    duration: coerceNumber(pair.duration) ?? 300,
    ease: coerceEase(pair.ease) ?? "out",
    delay: coerceNumber(pair.delay) ?? 0,
  };
}

function specFromAnimateExpr(
  expr: ValueExpr,
  evalNumber: (expr: ValueExpr) => number | undefined,
  evalValue: (expr: ValueExpr) => unknown,
): AnimationSpec | undefined {
  if (expr.kind === "animation") {
    const baseRaw = expr.base ? evalValue(expr.base) : undefined;
    const base = baseRaw ? specFromEvaluated(baseRaw) : undefined;
    const keysRaw = expr.keys ? evalValue(expr.keys) : base?.keys;
    let keys: AnimationKey[] = [];
    if (Array.isArray(keysRaw)) {
      keys = keysRaw
        .map((k) => animationKeyFromUnknown(k))
        .filter((k): k is AnimationKey => k != null);
    } else if (base?.keys) {
      keys = base.keys;
    }
    if (!keys.length) return undefined;
    const spec: AnimationSpec = { kind: "animation", keys };
    const startSrc = expr.start
      ? (poseFromUnknown(evalValue(expr.start)) ??
        (expr.start.kind === "pose"
          ? snapshotFromPoseExpr(expr.start, evalNumber)
          : undefined))
      : base?.start;
    if (startSrc != null) spec.start = startSrc;
    if (expr.stagger) {
      const fromAst = staggerFromExpr(expr.stagger, evalNumber);
      Object.assign(spec, fromAst);
      if (spec.stagger == null) {
        const st = evalValue(expr.stagger);
        const extra = specFromEvaluated({ kind: "animation", keys, stagger: st });
        if (extra?.stagger != null) spec.stagger = extra.stagger;
        if (extra?.staggerFrom) spec.staggerFrom = extra.staggerFrom;
      }
    } else {
      if (base?.stagger != null) spec.stagger = base.stagger;
      if (base?.staggerFrom) spec.staggerFrom = base.staggerFrom;
    }
    if (expr.repeat) {
      const raw = evalValue(expr.repeat);
      if (typeof raw === "string" && raw.replace(/^\./, "") === "forever") spec.repeat = "forever";
      else {
        const n = Number(raw);
        if (Number.isFinite(n) && n >= 1) spec.repeat = n;
      }
    } else if (base?.repeat != null) {
      spec.repeat = base.repeat;
    }
    return spec;
  }
  return specFromEvaluated(evalValue(expr));
}

export function collectAnimationFromHandlerItems(
  items: InteractionHandlerItem[],
  evalNumber: (expr: ValueExpr) => number | undefined = numberFromValueExpr,
  evalTransition: (expr: ValueExpr) => MotionTransition | undefined = (expr) => {
    if (expr.kind === "timing") {
      const duration = expr.duration.kind === "number" ? expr.duration.value : undefined;
      const ease =
        expr.ease.kind === "string"
          ? expr.ease.value
          : expr.ease.kind === "dotEnum"
            ? expr.ease.value.replace(/^\./, "")
            : expr.ease.kind === "easeBezier"
              ? {
                  kind: "easeBezier",
                  x1: expr.ease.x1.kind === "number" ? expr.ease.x1.value : undefined,
                  y1: expr.ease.y1.kind === "number" ? expr.ease.y1.value : undefined,
                  x2: expr.ease.x2.kind === "number" ? expr.ease.x2.value : undefined,
                  y2: expr.ease.y2.kind === "number" ? expr.ease.y2.value : undefined,
                }
              : undefined;
      const delay = expr.delay?.kind === "number" ? expr.delay.value : undefined;
      return normalizeTransition({ duration, ease, delay });
    }
    return undefined;
  },
  evalValue: (expr: ValueExpr) => unknown = (expr) => {
    if (expr.kind === "timing") return evalTransition(expr);
    if (expr.kind === "number") return expr.value;
    if (expr.kind === "string") return expr.value;
    if (expr.kind === "dotEnum") return expr.value.replace(/^\./, "");
    if (expr.kind === "easeBezier") {
      return {
        kind: "easeBezier",
        x1: evalNumber(expr.x1),
        y1: evalNumber(expr.y1),
        x2: evalNumber(expr.x2),
        y2: evalNumber(expr.y2),
      };
    }
    if (expr.kind === "pose") return { kind: "pose", ...evalSnapshot(expr.props, evalNumber) };
    if (expr.kind === "stagger") {
      return {
        kind: "stagger",
        step: evalNumber(expr.step),
        ...(expr.from ? { from: evalValue(expr.from) } : {}),
      };
    }
    if (expr.kind === "motion") {
      return {
        kind: "motion",
        ...(expr.timing ? { timing: evalValue(expr.timing) } : {}),
        pose: evalValue(expr.pose),
      };
    }
    if (expr.kind === "animation") {
      const out: Record<string, unknown> = { kind: "animation" };
      if (expr.base) {
        const base = evalValue(expr.base);
        if (base && typeof base === "object" && !Array.isArray(base)) {
          Object.assign(out, base, { kind: "animation" });
        }
      }
      if (expr.start) out.start = evalValue(expr.start);
      if (expr.keys) out.keys = evalValue(expr.keys);
      if (expr.stagger) out.stagger = evalValue(expr.stagger);
      if (expr.repeat) out.repeat = evalValue(expr.repeat);
      return out;
    }
    if (expr.kind === "array") return expr.items.map((i) => evalValue(i));
    return undefined;
  },
): AnimationSpec | undefined {
  let last: AnimationSpec | undefined;
  for (const item of items) {
    if (item.kind !== "animate") continue;
    if (item.target) continue;
    const next = specFromAnimateExpr(item.value, evalNumber, evalValue);
    if (next) last = next;
  }
  return last;
}

/** @deprecated Use collectAnimationFromHandlerItems */
export const collectMotionFromHandlerItems = collectAnimationFromHandlerItems;

function evalSnapshot(
  props: Record<string, ValueExpr>,
  evalNumber: (expr: ValueExpr) => number | undefined,
): MotionSnapshot {
  const snap: MotionSnapshot = {};
  for (const [key, expr] of Object.entries(props)) {
    if (!isMotionPropName(key)) continue;
    const n = evalNumber(expr);
    if (n != null && Number.isFinite(n)) snap[key] = n;
  }
  return snap;
}

export function identitySnapshot(restOpacity = 1): MotionSnapshot {
  return { ...MOTION_IDENTITY, opacity: restOpacity };
}

export function motionKeyframes(
  from: MotionSnapshot,
  to: MotionSnapshot,
  restOpacity = 1,
): [Keyframe, Keyframe] {
  const a = snapshotToCss(from, restOpacity);
  const b = snapshotToCss(to, restOpacity);
  return [
    {
      transform: a.transform,
      opacity: a.opacity,
      filter: a.filter,
      transformOrigin: a.transformOrigin,
    },
    {
      transform: b.transform,
      opacity: b.opacity,
      filter: b.filter,
      transformOrigin: b.transformOrigin,
    },
  ];
}

export function staggerDelayMs(
  spec: AnimationSpec,
  childIndex: number,
  childCount: number,
  baseDelay = 0,
): number {
  const step = spec.stagger ?? 0;
  if (step <= 0 || childCount <= 0) return baseDelay;
  const i = spec.staggerFrom === "last" ? childCount - 1 - childIndex : childIndex;
  return baseDelay + i * step;
}

export function prefersReducedMotion(win?: {
  matchMedia?: (q: string) => { matches: boolean };
}): boolean {
  try {
    return Boolean(win?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
  } catch {
    return false;
  }
}

export function hasAnimationTrack(spec: AnimationSpec | undefined | null): boolean {
  return Boolean(spec?.keys?.length);
}

export function resolvePoseDest(
  pose: MotionSnapshot | "rest",
  current: MotionSnapshot,
  restOpacity = 1,
): MotionSnapshot {
  if (pose === "rest") return identitySnapshot(restOpacity);
  return { ...current, ...pose };
}

function applySnapshotStyle(el: Element, snap: MotionSnapshot, restOpacity: number) {
  if (!("style" in el)) return;
  const css = snapshotToCss(snap, restOpacity);
  const style = (el as HTMLElement).style;
  style.transform = css.transform;
  style.opacity = css.opacity;
  style.filter = css.filter;
  style.transformOrigin = css.transformOrigin;
}

function clearMotionOverlayStyle(el: Element) {
  if (!("style" in el)) return;
  const style = (el as HTMLElement).style;
  style.transform = "";
  style.opacity = "";
  style.filter = "";
  style.transformOrigin = "";
}

/** Best-effort current overlay from inline styles (interrupt starts here). */
function readOverlaySnapshot(el: Element, restOpacity: number): MotionSnapshot {
  const ident = identitySnapshot(restOpacity);
  if (!("style" in el)) return ident;
  const style = (el as HTMLElement).style;
  const out: MotionSnapshot = { ...ident };
  const op = Number(style.opacity);
  if (Number.isFinite(op)) out.opacity = op;
  const t = style.transform || "";
  const tr = /translate\(\s*([-0-9.]+)px\s*,\s*([-0-9.]+)px\s*\)/.exec(t);
  if (tr) {
    out.translateX = Number(tr[1]);
    out.translateY = Number(tr[2]);
  }
  const rot = /rotate\(\s*([-0-9.]+)deg\s*\)/.exec(t);
  if (rot) out.rotate = Number(rot[1]);
  const sc = /scale\(\s*([-0-9.]+)\s*,\s*([-0-9.]+)\s*\)/.exec(t);
  if (sc) {
    out.scaleX = Number(sc[1]);
    out.scaleY = Number(sc[2]);
    if (out.scaleX === out.scaleY) out.scale = out.scaleX;
  }
  const blur = /blur\(\s*([-0-9.]+)px\s*\)/.exec(style.filter || "");
  if (blur) out.blur = Number(blur[1]);
  return out;
}

type AnimatableEl = Element & {
  animate?: (keyframes: Keyframe[], options: KeyframeAnimationOptions) => Animation;
  getAnimations?: () => Animation[];
};

/**
 * Sequential WAAPI: optional start snap, then each key Motion from current→pose.
 * Interrupt: cancel and start next from current (`applyStart` false — ignore start).
 * Appear/mount: `applyStart` true applies start snap first.
 */
export function playAnimationOnElement(
  el: AnimatableEl,
  spec: AnimationSpec,
  opts?: {
    restOpacity?: number;
    reduced?: boolean;
    staggerIndex?: number;
    staggerCount?: number;
    applyStart?: boolean;
    onDone?: () => void;
  },
): { cancel: () => void; finished: Promise<void> } | undefined {
  if (typeof el.animate !== "function") return undefined;
  if (!spec.keys?.length) return undefined;
  const restOpacity = opts?.restOpacity ?? 1;
  const reduced = Boolean(opts?.reduced);
  const applyStart = Boolean(opts?.applyStart);

  try {
    el.getAnimations?.().forEach((a) => a.cancel());
  } catch {
    /* ignore */
  }

  let current =
    applyStart && spec.start != null
      ? resolvePoseDest(spec.start, identitySnapshot(restOpacity), restOpacity)
      : readOverlaySnapshot(el, restOpacity);

  if (applyStart && spec.start != null) {
    applySnapshotStyle(el, current, restOpacity);
  }

  const staggerExtra =
    opts?.staggerIndex != null && opts.staggerCount != null
      ? staggerDelayMs(spec, opts.staggerIndex, opts.staggerCount, 0)
      : 0;

  let cancelled = false;
  let active: Animation | undefined;
  let resolveFinished!: () => void;
  const finished = new Promise<void>((r) => {
    resolveFinished = r;
  });

  const cancel = () => {
    cancelled = true;
    try {
      active?.cancel();
    } catch {
      /* ignore */
    }
    resolveFinished();
  };

  const playSegment = (
    from: MotionSnapshot,
    to: MotionSnapshot,
    timing: AnimationKey["timing"],
    delayExtra: number,
  ) => {
    const t = normalizeTransition(timing) ?? { duration: 0, easing: "linear", delay: 0 };
    const duration = reduced || !(t.duration > 0) ? 0 : t.duration;
    const delay = reduced ? 0 : t.delay + delayExtra;
    const anim = el.animate!(motionKeyframes(from, to, restOpacity), {
      duration,
      easing: t.easing,
      delay,
      fill: "both",
      iterations: 1,
    });
    active = anim;
    return anim;
  };

  const runChain = async () => {
    const forever = spec.repeat === "forever";
    const times =
      forever
        ? Number.POSITIVE_INFINITY
        : typeof spec.repeat === "number" && spec.repeat > 1
          ? spec.repeat
          : 1;
    let iteration = 0;
    while (!cancelled && iteration < times) {
      iteration += 1;
      for (let i = 0; i < spec.keys.length; i++) {
        if (cancelled) break;
        const key = spec.keys[i]!;
        const to = resolvePoseDest(key.pose, current, restOpacity);
        const delayExtra = i === 0 && iteration === 1 ? staggerExtra : 0;
        const anim = playSegment(current, to, key.timing, delayExtra);
        try {
          await anim.finished;
        } catch {
          /* cancelled */
        }
        if (cancelled) break;
        current = to;
        applySnapshotStyle(el, current, restOpacity);
      }
    }
    if (!cancelled) opts?.onDone?.();
    resolveFinished();
  };

  void runChain();
  return { cancel, finished };
}

export type PresentationMotionEval = {
  kind?: string;
  incoming?: unknown;
  outgoing?: unknown;
  duration?: unknown;
  ease?: unknown;
  delay?: unknown;
  front?: unknown;
  switchAt?: unknown;
};

function slotAnimationSpec(
  slot: unknown,
  pair: PresentationMotionEval,
): AnimationSpec | undefined {
  const clock = pairClock(pair);
  const evaluated = specFromEvaluated(slot);
  if (evaluated) return evaluated;
  const pose = snapshotFromUnknown(slot);
  if (!pose) return undefined;
  return {
    kind: "animation",
    start: pose,
    keys: [
      {
        timing: { duration: clock.duration, ease: clock.ease, delay: clock.delay },
        pose: "rest",
      },
    ],
  };
}

/** `dismissMove` omits `front` → outgoing stays on top (the page leaving). */
export function withDismissDefaultFront<T>(raw: T): T {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const o = raw as Record<string, unknown>;
  if (o.kind != null && o.kind !== "presentationMotion") return raw;
  const front = String(o.front ?? "").replace(/^\./, "");
  if (front === "incoming" || front === "outgoing") return raw;
  return { ...o, front: ".outgoing" } as T;
}

function presentationIncomingIsFront(
  raw: PresentationMotionEval,
  defaultFront: "incoming" | "outgoing" = "incoming",
): boolean {
  const frontRaw = coerceEase(raw.front);
  const front = String(frontRaw ?? raw.front ?? defaultFront).replace(/^\./, "");
  return front !== "outgoing";
}

function applyPresenterLaneFront(el: Element, front: boolean) {
  el.classList.toggle("pdl-presenter__lane--front", front);
  el.classList.toggle("pdl-presenter__lane--back", !front);
  if ("style" in el) (el as HTMLElement).style.zIndex = front ? "4" : "1";
}

function clearPresenterLane(el: Element) {
  el.classList.remove(
    "pdl-presenter__lane",
    "pdl-presenter__lane--front",
    "pdl-presenter__lane--back",
  );
  clearMotionOverlayStyle(el);
  if ("style" in el) (el as HTMLElement).style.zIndex = "";
}

/**
 * Play a Presenter pair clip. Slots are Animation (Pose sugar expanded at eval).
 */
export function playPresentationMotion(
  incomingEl: Element,
  outgoingEl: Element,
  raw: PresentationMotionEval,
  opts?: { reduced?: boolean; onDone?: () => void; defaultFront?: "incoming" | "outgoing" },
): { cancel: () => void } {
  const reduced = Boolean(opts?.reduced);
  const incomingSpec = slotAnimationSpec(raw.incoming, raw);
  const outgoingSpec = slotAnimationSpec(raw.outgoing, raw);
  const incomingFront = presentationIncomingIsFront(raw, opts?.defaultFront ?? "incoming");
  incomingEl.classList.add("pdl-presenter__lane");
  outgoingEl.classList.add("pdl-presenter__lane");
  applyPresenterLaneFront(incomingEl, incomingFront);
  applyPresenterLaneFront(outgoingEl, !incomingFront);

  const handles: Array<{ cancel: () => void; finished: Promise<void> }> = [];
  if (incomingSpec) {
    const h = playAnimationOnElement(incomingEl as AnimatableEl, incomingSpec, {
      reduced,
      applyStart: true,
    });
    if (h) handles.push(h);
  }
  if (outgoingSpec) {
    // Outgoing Pose sugar expands to Animation without start (keys → pose).
    // Apply start only when the slot authored one.
    const h = playAnimationOnElement(outgoingEl as AnimatableEl, outgoingSpec, {
      reduced,
      applyStart: Boolean(outgoingSpec.start),
    });
    if (h) handles.push(h);
  }

  const switchAt = Number(raw.switchAt);
  let promoteTimer: ReturnType<typeof setTimeout> | undefined;
  if (Number.isFinite(switchAt) && switchAt >= 0) {
    promoteTimer = setTimeout(() => {
      applyPresenterLaneFront(incomingEl, !incomingFront);
      applyPresenterLaneFront(outgoingEl, incomingFront);
    }, switchAt);
  }

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    if (promoteTimer != null) clearTimeout(promoteTimer);
    clearPresenterLane(incomingEl);
    opts?.onDone?.();
  };

  if (!handles.length) {
    finish();
    return { cancel: finish };
  }

  void Promise.all(handles.map((h) => h.finished)).then(finish);

  return {
    cancel: () => {
      if (promoteTimer != null) clearTimeout(promoteTimer);
      for (const h of handles) h.cancel();
      finish();
    },
  };
}

void easeToWaapi;
