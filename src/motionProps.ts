/**
 * v1 Pose overlay fields. Not frame/layout props.
 * Units: opacity 0…1, scale unitless, translate/blur CSS px, duration ms.
 */

export const MOTION_PROP_NAMES = [
  "opacity",
  "scale",
  "scaleX",
  "scaleY",
  "translateX",
  "translateY",
  "blur",
] as const;

export type MotionPropName = (typeof MOTION_PROP_NAMES)[number];

export const MOTION_PROP_SET: ReadonlySet<string> = new Set(MOTION_PROP_NAMES);

export function isMotionPropName(name: string): name is MotionPropName {
  return MOTION_PROP_SET.has(name);
}

export type MotionTransition = {
  duration: number;
  easing: string;
  delay: number;
};

export type MotionSnapshot = Partial<Record<MotionPropName, number>>;

export type MotionSpec = {
  transition?: MotionTransition;
  pose?: MotionSnapshot;
  stagger?: number;
  staggerFrom?: "first" | "last";
};

export const MOTION_IDENTITY: Required<MotionSnapshot> = {
  opacity: 1,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  translateX: 0,
  translateY: 0,
  blur: 0,
};

export function normalizeTransition(raw: unknown): MotionTransition | undefined {
  if (raw == null) return undefined;
  if (typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const duration = Number(o.duration);
  if (!Number.isFinite(duration) || duration < 0) return undefined;
  const easing = typeof o.easing === "string" && o.easing.trim() ? o.easing.trim() : "linear";
  const delay = Number(o.delay);
  return {
    duration,
    easing,
    delay: Number.isFinite(delay) && delay > 0 ? delay : 0,
  };
}

export function snapshotToCss(
  snap: MotionSnapshot,
  restOpacity = 1,
): { transform: string; opacity: string; filter: string } {
  const tx = snap.translateX ?? 0;
  const ty = snap.translateY ?? 0;
  const sx = snap.scaleX ?? snap.scale ?? 1;
  const sy = snap.scaleY ?? snap.scale ?? 1;
  const transform = `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})`;
  const opacity = String(snap.opacity ?? restOpacity);
  const blur = snap.blur ?? 0;
  const filter = blur > 0 ? `blur(${blur}px)` : "none";
  return { transform, opacity, filter };
}

export const IMPLICIT_TRANSITION_PROPS = [
  "opacity",
  "background-color",
  "border-color",
  "box-shadow",
  "color",
  "transform",
  "filter",
] as const;

export function implicitTransitionCss(t: MotionTransition): string {
  if (t.duration <= 0) return "none";
  const delay = t.delay > 0 ? ` ${t.delay}ms` : "";
  return IMPLICIT_TRANSITION_PROPS.map((p) => `${p} ${t.duration}ms ${t.easing}${delay}`).join(", ");
}
