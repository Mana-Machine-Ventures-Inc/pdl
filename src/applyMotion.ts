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
): MotionSpec {
  const spec: MotionSpec = {};
  for (const item of items) {
    if (item.kind === "animate") {
      const t = evalTransition(item.value);
      if (t) spec.transition = t;
    } else if (item.kind === "from") {
      spec.from = evalSnapshot(item.props, evalNumber);
    } else if (item.kind === "to") {
      spec.to = evalSnapshot(item.props, evalNumber);
    } else if (item.kind === "stagger") {
      spec.stagger = item.ms;
    } else if (item.kind === "staggerFrom") {
      spec.staggerFrom = item.value;
    }
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
    { transform: a.transform, opacity: a.opacity, filter: a.filter },
    { transform: b.transform, opacity: b.opacity, filter: b.filter },
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

export type MotionPlayMode = "appear" | "dismiss" | "implicit";

export function snapshotsForMode(
  spec: MotionSpec,
  mode: MotionPlayMode,
  restOpacity = 1,
): { from: MotionSnapshot; to: MotionSnapshot } | undefined {
  const rest: MotionSnapshot = { opacity: restOpacity };
  if (mode === "appear") {
    if (!spec.from || Object.keys(spec.from).length === 0) return undefined;
    return { from: { ...rest, ...spec.from }, to: rest };
  }
  if (mode === "dismiss") {
    if (!spec.to || Object.keys(spec.to).length === 0) return undefined;
    return { from: rest, to: { ...rest, ...spec.to } };
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
  const restOpacity = opts?.restOpacity ?? 1;
  const snaps = snapshotsForMode(spec, mode, restOpacity);
  if (!snaps || typeof el.animate !== "function") return undefined;
  const t = effectiveTransition(spec, Boolean(opts?.reduced));
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
  return el.animate(motionKeyframes(snaps.from, snaps.to, restOpacity), {
    duration: t.duration,
    easing: t.easing,
    delay,
    fill: "forwards",
  });
}
