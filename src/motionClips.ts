/** Preview transport clips — one control per handler that actually animates. */

const EVENT_ORDER = [
  "appear",
  "dismiss",
  "hoverStart",
  "hoverEnd",
  "pressStart",
  "pressEnd",
  "pressCancel",
] as const;

const EVENT_LABELS: Record<string, string> = {
  appear: "Appear",
  dismiss: "Dismiss",
  hoverStart: "Hover start",
  hoverEnd: "Hover end",
  pressStart: "Press",
  pressEnd: "Release",
  pressCancel: "Cancel",
};

export type MotionClipKind = "pose" | "tween";

export type MotionClip = {
  event: string;
  label: string;
  kind: MotionClipKind;
  component: string;
  instanceLet: string;
  groupLabel: string;
};

export function motionClipLabel(event: string): string {
  if (EVENT_LABELS[event]) return EVENT_LABELS[event];
  return event.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim();
}

export function handlerHasMotionClip(handler: unknown): boolean {
  if (!handler || typeof handler !== "object") return false;
  const h = handler as {
    animation?: Record<string, unknown>;
    motion?: Record<string, unknown>;
    body?: Array<{ kind?: string }>;
  };
  const a = h.animation;
  if (a && typeof a === "object") {
    if (Array.isArray(a.keys) && a.keys.length) return true;
    if (a.start != null || a.stagger != null || a.repeat != null) return true;
  }
  const m = h.motion;
  if (m && typeof m === "object") {
    if (m.pose || m.from || m.to || m.transition || m.stagger != null || Array.isArray(m.keys)) return true;
  }
  return Array.isArray(h.body) && h.body.some((it) => it != null && it.kind === "animate");
}

export function catalogueDeclsHaveMotionClips(decls: unknown): boolean {
  if (!Array.isArray(decls)) return false;
  for (const d of decls) {
    if (!d || typeof d !== "object") continue;
    const handlers = (d as { handlers?: unknown[] }).handlers;
    if (!Array.isArray(handlers)) continue;
    if (handlers.some(handlerHasMotionClip)) return true;
  }
  return false;
}

function clipKind(handler: unknown): MotionClipKind {
  const a =
    handler && typeof handler === "object"
      ? (handler as { animation?: Record<string, unknown>; motion?: Record<string, unknown> }).animation
      : undefined;
  if (a && (a.start != null || (Array.isArray(a.keys) && a.keys.length))) return "pose";
  const m =
    handler && typeof handler === "object"
      ? (handler as { motion?: Record<string, unknown> }).motion
      : undefined;
  if (m && (m.pose || m.from || m.to || (Array.isArray(m.keys) && m.keys.length))) return "pose";
  return "tween";
}

function eventRank(event: string): number {
  const i = (EVENT_ORDER as readonly string[]).indexOf(event);
  return i === -1 ? 50 : i;
}

export function clipsFromDecls(
  component: string,
  decls: unknown,
  instanceLet = "",
  groupLabel = component,
): MotionClip[] {
  if (!Array.isArray(decls)) return [];
  const byEvent = new Map<string, unknown>();
  for (const d of decls) {
    if (!d || typeof d !== "object") continue;
    const handlers = (d as { handlers?: unknown[] }).handlers;
    if (!Array.isArray(handlers)) continue;
    for (const h of handlers) {
      if (!h || typeof h !== "object") continue;
      const event = (h as { event?: unknown }).event;
      if (typeof event !== "string" || !handlerHasMotionClip(h)) continue;
      byEvent.set(event, h);
    }
  }
  return [...byEvent.entries()]
    .sort((a, b) => eventRank(a[0]) - eventRank(b[0]) || a[0].localeCompare(b[0]))
    .map(([event, h]) => ({
      event,
      label: motionClipLabel(event),
      kind: clipKind(h),
      component,
      instanceLet,
      groupLabel,
    }));
}

export function collectMotionClips(
  rootComponent: string,
  interactions: Record<string, unknown> | undefined,
  rootChildren: unknown,
): MotionClip[] {
  const ix = interactions ?? {};
  const out: MotionClip[] = [];
  out.push(...clipsFromDecls(rootComponent, ix[rootComponent], "", rootComponent));
  const walk = (nodes: unknown) => {
    if (!Array.isArray(nodes)) return;
    for (const n of nodes) {
      if (!n || typeof n !== "object") continue;
      const rec = n as { id?: string; instanceOf?: string; children?: unknown };
      if (typeof rec.instanceOf === "string") {
        const instanceLet = typeof rec.id === "string" ? rec.id : "";
        out.push(
          ...clipsFromDecls(
            rec.instanceOf,
            ix[rec.instanceOf],
            instanceLet,
            instanceLet || rec.instanceOf,
          ),
        );
      }
      walk(rec.children);
    }
  };
  walk(rootChildren);
  return out;
}

export function groupMotionClips(clips: MotionClip[]): MotionClip[][] {
  const groups: MotionClip[][] = [];
  const index = new Map<string, number>();
  for (const clip of clips) {
    const key = `${clip.instanceLet}\0${clip.component}`;
    const existing = index.get(key);
    if (existing != null) {
      groups[existing]!.push(clip);
      continue;
    }
    index.set(key, groups.length);
    groups.push([clip]);
  }
  return groups;
}
