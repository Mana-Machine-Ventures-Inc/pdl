import type { InteractionHandlerItem, ValueExpr } from "./ast.js";
import {
  implicitTransitionCss,
  isMotionPropName,
  MOTION_IDENTITY,
  normalizeTransition,
  snapshotToCss,
  type MotionSnapshot,
  type MotionSpec,
  type MotionTransition,
} from "./motionProps.js";

export type { MotionSnapshot, MotionSpec, MotionTransition };
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

function specFromEvaluated(raw: unknown): MotionSpec {
  if (raw == null || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const spec: MotionSpec = {};
  if (o.kind === "motion" || o.transition != null || o.pose != null) {
    const t = normalizeTransition(o.transition ?? o);
    if (t) spec.transition = t;
    const poseRaw = o.pose;
    if (poseRaw && typeof poseRaw === "object") {
      const pose = snapshotFromUnknown(poseRaw);
      if (pose) spec.pose = pose;
    }
    const st = o.stagger;
    if (st && typeof st === "object") {
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
    const play = typeof o.play === "string" ? o.play.replace(/^\./, "") : undefined;
    if (play === "toRest" || play === "toPose" || play === "loop") spec.play = play;
    if (Array.isArray(o.keys)) {
      const keys = o.keys
        .map((k) => keyFromUnknown(k))
        .filter((k): k is NonNullable<typeof k> => k != null);
      if (keys.length) spec.keys = keys;
    }
    const repeat = Number(o.repeat);
    if (Number.isFinite(repeat) && repeat >= 1) spec.repeat = repeat;
    return spec;
  }
  const t = normalizeTransition(o);
  if (t) spec.transition = t;
  return spec;
}

function keyFromUnknown(raw: unknown): import("./motionProps.js").MotionKey | undefined {
  if (raw == null || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const at = Number(o.at);
  if (!Number.isFinite(at)) return undefined;
  let pose: import("./motionProps.js").MotionKey["pose"];
  if (o.pose === "rest" || o.pose === ".rest") pose = "rest";
  else {
    const snap = snapshotFromUnknown(o.pose);
    if (!snap) return undefined;
    pose = snap;
  }
  const easing = typeof o.easing === "string" && o.easing.trim() ? o.easing.trim() : undefined;
  return { pose, at, ...(easing ? { easing } : {}) };
}

function snapshotFromUnknown(raw: unknown): MotionSnapshot | undefined {
  if (raw == null || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const snap: MotionSnapshot = {};
  for (const key of Object.keys(o)) {
    if (!isMotionPropName(key)) continue;
    const n = Number(o[key]);
    if (Number.isFinite(n)) snap[key] = n;
  }
  return Object.keys(snap).length ? snap : undefined;
}

function specFromAnimateExpr(
  expr: ValueExpr,
  evalNumber: (expr: ValueExpr) => number | undefined,
  evalValue: (expr: ValueExpr) => unknown,
): MotionSpec {
  if (expr.kind === "motion") {
    const spec: MotionSpec = {};
    if (expr.base) Object.assign(spec, specFromEvaluated(evalValue(expr.base)));
    if (expr.transition) {
      const t = normalizeTransition(evalValue(expr.transition));
      if (t) spec.transition = t;
    }
    if (expr.pose) {
      const pose =
        snapshotFromPoseExpr(expr.pose, evalNumber) ?? snapshotFromUnknown(evalValue(expr.pose));
      if (pose) spec.pose = pose;
    }
    if (expr.stagger) {
      const fromAst = staggerFromExpr(expr.stagger, evalNumber);
      Object.assign(spec, fromAst);
      if (spec.stagger == null) {
        Object.assign(spec, specFromEvaluated({ kind: "motion", stagger: evalValue(expr.stagger) }));
      }
    }
    if (expr.play) {
      const raw = evalValue(expr.play);
      const play = typeof raw === "string" ? raw.replace(/^\./, "") : undefined;
      if (play === "toRest" || play === "toPose" || play === "loop") spec.play = play;
    }
    if (expr.keys) {
      const extra = specFromEvaluated({ kind: "motion", keys: evalValue(expr.keys) });
      if (extra.keys) spec.keys = extra.keys;
    }
    if (expr.repeat) {
      const n = Number(evalValue(expr.repeat));
      if (Number.isFinite(n) && n >= 1) spec.repeat = n;
    }
    return spec;
  }
  if (expr.kind === "transition") {
    const t = normalizeTransition(evalValue(expr));
    return t ? { transition: t } : {};
  }
  return specFromEvaluated(evalValue(expr));
}

export function collectMotionFromHandlerItems(
  items: InteractionHandlerItem[],
  evalNumber: (expr: ValueExpr) => number | undefined = numberFromValueExpr,
  evalTransition: (expr: ValueExpr) => MotionTransition | undefined = (expr) => {
    if (expr.kind === "transition") {
      const duration = expr.duration.kind === "number" ? expr.duration.value : undefined;
      const easing = expr.easing.kind === "string" ? expr.easing.value : undefined;
      const delay = expr.delay?.kind === "number" ? expr.delay.value : undefined;
      return normalizeTransition({ duration, easing, delay });
    }
    return undefined;
  },
  evalValue: (expr: ValueExpr) => unknown = (expr) => {
    if (expr.kind === "transition") return evalTransition(expr);
    if (expr.kind === "number") return expr.value;
    if (expr.kind === "string") return expr.value;
    if (expr.kind === "dotEnum") return expr.value.replace(/^\./, "");
    if (expr.kind === "pose") return { kind: "pose", ...evalSnapshot(expr.props, evalNumber) };
    if (expr.kind === "stagger") {
      return {
        kind: "stagger",
        step: evalNumber(expr.step),
        ...(expr.from ? { from: evalValue(expr.from) } : {}),
      };
    }
    if (expr.kind === "key") {
      return {
        kind: "key",
        pose: evalValue(expr.pose),
        at: evalValue(expr.at),
        ...(expr.easing ? { easing: evalValue(expr.easing) } : {}),
      };
    }
    if (expr.kind === "motion") {
      const out: Record<string, unknown> = { kind: "motion" };
      if (expr.base) {
        const base = evalValue(expr.base);
        if (base && typeof base === "object" && !Array.isArray(base)) {
          Object.assign(out, base, { kind: "motion" });
        }
      }
      if (expr.transition) out.transition = evalValue(expr.transition);
      if (expr.play) out.play = evalValue(expr.play);
      if (expr.pose) out.pose = evalValue(expr.pose);
      if (expr.keys) out.keys = evalValue(expr.keys);
      if (expr.stagger) out.stagger = evalValue(expr.stagger);
      if (expr.repeat) out.repeat = evalValue(expr.repeat);
      return out;
    }
    return undefined;
  },
): MotionSpec {
  const spec: MotionSpec = {};
  for (const item of items) {
    if (item.kind !== "animate") continue;
    const next = specFromAnimateExpr(item.value, evalNumber, evalValue);
    if (next.transition) spec.transition = next.transition;
    if (next.play) spec.play = next.play;
    if (next.pose) spec.pose = next.pose;
    if (next.keys) spec.keys = next.keys;
    if (next.stagger != null) spec.stagger = next.stagger;
    if (next.staggerFrom) spec.staggerFrom = next.staggerFrom;
    if (next.repeat != null) spec.repeat = next.repeat;
  }
  return spec;
}

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
  spec: MotionSpec,
  childIndex: number,
  childCount: number,
): number {
  const base = spec.transition?.delay ?? 0;
  const step = spec.stagger ?? 0;
  if (step <= 0 || childCount <= 0) return base;
  const i = spec.staggerFrom === "last" ? childCount - 1 - childIndex : childIndex;
  return base + i * step;
}

export function prefersReducedMotion(win?: { matchMedia?: (q: string) => { matches: boolean } }): boolean {
  try {
    return Boolean(win?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
  } catch {
    return false;
  }
}

export function effectiveTransition(
  spec: MotionSpec,
  reduced: boolean,
): MotionTransition {
  const t = spec.transition ?? { duration: 0, easing: "linear", delay: 0 };
  if (reduced || t.duration <= 0) return { duration: 0, easing: "linear", delay: 0 };
  return t;
}

export type MotionPlayMode = "appear" | "dismiss" | "implicit" | "standing";

export function hasPoseTrack(spec: MotionSpec): boolean {
  return Boolean(spec.pose || (spec.keys && spec.keys.length));
}

export function resolvedMotionKeys(spec: MotionSpec): import("./motionProps.js").MotionKey[] {
  if (spec.keys && spec.keys.length) return spec.keys;
  if (spec.pose) return [{ pose: spec.pose, at: 1 }];
  return [];
}

export function snapshotForKeyPose(
  pose: import("./motionProps.js").MotionKey["pose"],
  restOpacity = 1,
): MotionSnapshot {
  if (pose === "rest") return identitySnapshot(restOpacity);
  return { ...identitySnapshot(restOpacity), ...pose };
}

function cssFields(snap: MotionSnapshot, restOpacity: number): Keyframe {
  const c = snapshotToCss(snap, restOpacity);
  return {
    transform: c.transform,
    opacity: c.opacity,
    filter: c.filter,
    transformOrigin: c.transformOrigin,
  };
}

function clamp01(n: number): number {
  if (!(n > 0)) return 0;
  if (n > 1) return 1;
  return n;
}

/** WAAPI keyframes along `keys` / `pose:` sugar. Offset 0 is identity when the first key is after 0. */
export function poseTrackKeyframes(spec: MotionSpec, restOpacity = 1): Keyframe[] {
  const keys = resolvedMotionKeys(spec);
  if (!keys.length) return [];
  const frames: Keyframe[] = [];
  if (keys[0]!.at > 0) {
    frames.push({ offset: 0, ...cssFields(identitySnapshot(restOpacity), restOpacity) });
  }
  for (const k of keys) {
    frames.push({
      offset: clamp01(k.at),
      ...cssFields(snapshotForKeyPose(k.pose, restOpacity), restOpacity),
      ...(k.easing ? { easing: k.easing } : {}),
    });
  }
  return frames;
}

export function waapiEffectTiming(
  spec: MotionSpec,
  reduced: boolean,
): KeyframeEffectOptions {
  const t = effectiveTransition(spec, reduced);
  const play = spec.play;
  const repeat = spec.repeat != null && spec.repeat > 1 ? spec.repeat : 1;
  return {
    duration: t.duration,
    easing: t.easing,
    delay: t.delay,
    fill: play === "loop" ? "none" : "both",
    iterations: play === "loop" ? Number.POSITIVE_INFINITY : repeat,
  };
}

export function snapshotsForMode(
  spec: MotionSpec,
  mode: MotionPlayMode,
  restOpacity = 1,
): { from: MotionSnapshot; to: MotionSnapshot } | undefined {
  const rest: MotionSnapshot = { opacity: restOpacity };
  const pose = spec.pose;
  if (!pose || Object.keys(pose).length === 0) return undefined;
  if (mode === "appear") {
    return { from: { ...rest, ...pose }, to: rest };
  }
  if (mode === "dismiss") {
    return { from: rest, to: { ...rest, ...pose } };
  }
  return undefined;
}

export function playMotionOnElement(
  el: Element & {
    animate?: (keyframes: Keyframe[], options: KeyframeAnimationOptions) => Animation;
    getAnimations?: () => Animation[];
  },
  spec: MotionSpec,
  mode: MotionPlayMode,
  opts?: { restOpacity?: number; reduced?: boolean; staggerIndex?: number; staggerCount?: number },
): Animation | undefined {
  if (typeof el.animate !== "function") return undefined;
  const restOpacity = opts?.restOpacity ?? 1;
  const reduced = Boolean(opts?.reduced);
  const t = effectiveTransition(spec, reduced);
  const delay =
    t.delay +
    (opts?.staggerIndex != null && opts.staggerCount != null
      ? staggerDelayMs({ ...spec, transition: { ...t, delay: 0 } }, opts.staggerIndex, opts.staggerCount)
      : 0);
  try {
    el.getAnimations?.().forEach((a) => a.cancel());
  } catch {
    /* ignore */
  }
  if (mode === "appear" || mode === "dismiss") {
    const snaps = snapshotsForMode(spec, mode, restOpacity);
    if (!snaps) return undefined;
    return el.animate(motionKeyframes(snaps.from, snaps.to, restOpacity), {
      duration: t.duration,
      easing: t.easing,
      delay,
      fill: "both",
    });
  }
  if (!hasPoseTrack(spec)) return undefined;
  if (reduced && spec.play === "loop") return undefined;
  const frames = poseTrackKeyframes(spec, restOpacity);
  if (!frames.length) return undefined;
  const timing = waapiEffectTiming(spec, reduced);
  return el.animate(frames, { ...timing, delay: (timing.delay ?? 0) + (delay - t.delay) });
}
