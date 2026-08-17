/**
 * Pose overlay fields. Not frame/layout props.
 * Units: opacity / origin 0…1, scale unitless, translate/blur CSS px,
 * rotate degrees, duration ms.
 */

export const MOTION_PROP_NAMES = [
  "opacity",
  "scale",
  "scaleX",
  "scaleY",
  "translateX",
  "translateY",
  "blur",
  "rotate",
  "originX",
  "originY",
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

export type MotionPlay = "toRest" | "toPose" | "loop";

export type MotionKey = {
  pose: MotionSnapshot | "rest";
  at: number;
  easing?: string;
};

export type MotionSpec = {
  transition?: MotionTransition;
  play?: MotionPlay;
  pose?: MotionSnapshot;
  keys?: MotionKey[];
  stagger?: number;
  staggerFrom?: "first" | "last";
  repeat?: number;
};

/** Site default `play` when the Motion value omitted it. */
export function defaultMotionPlay(event: string, hasPoseTrack: boolean): MotionPlay | undefined {
  switch (event) {
    case "appear":
      return "toRest";
    case "dismiss":
      return "toPose";
    case "hoverStart":
    case "pressStart":
      return hasPoseTrack ? "toPose" : undefined;
    case "hoverEnd":
    case "pressEnd":
    case "pressCancel":
      return hasPoseTrack ? "toRest" : undefined;
    default:
      return hasPoseTrack ? "toRest" : undefined;
  }
}

/** Fill `play` on an evaluated frame `animate` value when the spec omitted it. */
export function applyFrameAnimatePlay(raw: unknown): unknown {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const o = raw as Record<string, unknown>;
  if (typeof o.play === "string" && o.play.replace(/^\./, "")) return raw;
  const hasPath = o.pose != null || o.keys != null;
  const play = defaultMotionPlay("frame", hasPath);
  return play ? { ...o, play } : raw;
}

/** Fill `play` from the handler site when the spec omitted it. */
export function applySiteDefaultPlay(spec: MotionSpec, event: string): MotionSpec {
  if (spec.play) return spec;
  const hasPath = spec.pose != null || spec.keys != null;
  const play = defaultMotionPlay(event, hasPath);
  return play ? { ...spec, play } : spec;
}

export const MOTION_IDENTITY: MotionSnapshot = {
  opacity: 1,
  scale: 1,
  translateX: 0,
  translateY: 0,
  blur: 0,
  rotate: 0,
};

/** Map a language Ease (enum or bezier object) to a WAAPI/CSS easing string. */
export function easeToWaapi(raw: unknown): string {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    if (o.kind === "easeBezier") {
      const x1 = Number(o.x1);
      const y1 = Number(o.y1);
      const x2 = Number(o.x2);
      const y2 = Number(o.y2);
      if ([x1, y1, x2, y2].every(Number.isFinite)) {
        return `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
      }
    }
  }
  if (typeof raw !== "string") return "linear";
  const s = raw.trim().replace(/^\./, "");
  if (s === "in" || s === "ease-in") return "ease-in";
  if (s === "out" || s === "ease-out") return "ease-out";
  if (s === "linear") return "linear";
  if (s.startsWith("cubic-bezier")) return s;
  return "linear";
}

export function normalizeTransition(raw: unknown): MotionTransition | undefined {
  if (raw == null) return undefined;
  if (typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const duration = Number(o.duration);
  if (!Number.isFinite(duration) || duration < 0) return undefined;
  const easing = easeToWaapi(o.ease ?? o.easing);
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
): { transform: string; opacity: string; filter: string; transformOrigin: string } {
  const tx = snap.translateX ?? 0;
  const ty = snap.translateY ?? 0;
  const rot = snap.rotate ?? 0;
  const sx = snap.scaleX ?? snap.scale ?? 1;
  const sy = snap.scaleY ?? snap.scale ?? 1;
  const transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(${sx}, ${sy})`;
  const opacity = String(snap.opacity ?? restOpacity);
  const blur = snap.blur ?? 0;
  const filter = blur > 0 ? `blur(${blur}px)` : "none";
  const ox = snap.originX;
  const oy = snap.originY;
  const transformOrigin =
    ox != null || oy != null ? `${(ox ?? 0.5) * 100}% ${(oy ?? 0.5) * 100}%` : "center";
  return { transform, opacity, filter, transformOrigin };
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
