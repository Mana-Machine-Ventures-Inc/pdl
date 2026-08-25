/**
 * State choreography: First → mutate → Last → land (.rest).
 *
 * Within one `animate =`, keys stay sequential. Across every `animate =` that
 * fires in the same turn (child press + emit capture, several targeted shots),
 * tracks start together — paint/FLIP land is not delayed by another clip's
 * flourish. See docs/PROPOSAL_STATE_CHOREOGRAPHY.md.
 */

import {
  easeToWaapi,
  implicitTransitionCss,
  normalizeAnimationTiming,
  type AnimationKey,
  type AnimationSpec,
  type MotionTransition,
} from "./motionProps.js";

export type ChoreoNodeSnap = {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  background: string;
  opacity: string;
};

export type ChoreoFirstMap = Record<string, ChoreoNodeSnap>;

export type ChoreoLandTiming = {
  duration: number;
  easing: string;
  delay: number;
};

/** One authored `animate =` in an interaction turn. */
export type ChoreoTrack = {
  /** Pose overlay target (`data-pdl-id` / instance-let). */
  targetId?: string;
  flourish: AnimationSpec | null;
  landTiming: ChoreoLandTiming | null;
};

/**
 * Bundle posted on `pdl-interaction` / resolve. Legacy flat
 * `{ first, landTiming, flourish, targetId }` still normalizes to one track.
 */
export type ChoreoSession = {
  first: ChoreoFirstMap;
  tracks: ChoreoTrack[];
  land?: boolean;
};

/** @deprecated Prefer tracks — kept for callers that built the flat shape. */
export type ChoreoSessionFlat = {
  first: ChoreoFirstMap;
  landTiming: ChoreoLandTiming;
  flourish: AnimationSpec | null;
  targetId?: string;
  land?: boolean;
};

function numberish(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof v === "object" && typeof (v as { value?: unknown }).value === "number") {
    const n = (v as { value: number }).value;
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function nodeChoreoId(el: Element): string | null {
  const id = el.getAttribute("data-pdl-id");
  if (id) return id;
  const letId = el.getAttribute("data-pdl-instance-let");
  if (letId) return `let:${letId}`;
  const inst = el.getAttribute("data-pdl-instance-of");
  if (inst) {
    const kw = el.getAttribute("data-pdl-instance-kwargs") || "";
    return `inst:${inst}:${kw.slice(0, 64)}`;
  }
  return null;
}

/** Snapshot identified descendants (+ self) for First. */
export function snapshotChoreoTree(root: Element): ChoreoFirstMap {
  const out: ChoreoFirstMap = {};
  const visit = (el: Element) => {
    const id = nodeChoreoId(el);
    if (id) {
      const r = el.getBoundingClientRect();
      let background = "";
      let opacity = "";
      try {
        const cs = getComputedStyle(el);
        background = cs.backgroundColor || "";
        opacity = cs.opacity || "";
      } catch {
        /* ignore */
      }
      out[id] = {
        id,
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
        background,
        opacity,
      };
    }
    for (let i = 0; i < el.children.length; i++) {
      const c = el.children[i];
      if (c) visit(c);
    }
  };
  visit(root);
  return out;
}

export function splitChoreographySpec(spec: AnimationSpec | null | undefined): {
  flourish: AnimationSpec | null;
  landTiming: ChoreoLandTiming | null;
  isLand: boolean;
} {
  if (!spec || !Array.isArray(spec.keys) || !spec.keys.length) {
    return { flourish: null, landTiming: null, isLand: false };
  }
  const keys = spec.keys;
  const last = keys[keys.length - 1];
  const lastIsRest = last && (last.pose === "rest" || last.pose === (".rest" as unknown));
  const markedLand = (spec as { land?: boolean }).land === true;
  if (!lastIsRest && !markedLand) {
    return { flourish: null, landTiming: null, isLand: false };
  }
  const landKey = lastIsRest ? last : keys[0];
  const t = landKey?.timing;
  const duration = numberish(t?.duration) ?? 200;
  const delay = numberish(t?.delay) ?? 0;
  const easeRaw = t?.ease ?? (t as { easing?: unknown } | undefined)?.easing ?? "out";
  const landTiming: ChoreoLandTiming = {
    duration,
    easing: easeToWaapi(easeRaw),
    delay,
  };
  const flourishKeys = keys.slice(0, -1).filter((k) => k && k.pose !== "rest");
  const flourish: AnimationSpec | null =
    flourishKeys.length > 0
      ? { kind: "animation", keys: flourishKeys as AnimationKey[] }
      : null;
  return { flourish, landTiming, isLand: true };
}

export function landTimingToCss(timing: ChoreoLandTiming, extraDelay = 0): string {
  const mt: MotionTransition = {
    duration: timing.duration,
    easing: timing.easing,
    delay: timing.delay + Math.max(0, extraDelay),
  };
  return implicitTransitionCss(mt);
}

/** Wall clock of flourish beats (cleanup / max only — does not gate land). */
export function flourishTotalMs(spec: AnimationSpec | null | undefined): number {
  if (!spec || !Array.isArray(spec.keys)) return 0;
  return spec.keys.reduce((sum, k) => {
    const d = numberish(k?.timing?.duration) ?? 0;
    const delay = numberish(k?.timing?.delay) ?? 0;
    return sum + d + delay;
  }, 0);
}

export function trackWallMs(track: ChoreoTrack): number {
  const land = track.landTiming
    ? (track.landTiming.duration || 0) + (track.landTiming.delay || 0)
    : 0;
  return Math.max(land, flourishTotalMs(track.flourish));
}

/** Accept track bundles or the pre-parallel flat session shape. */
export function normalizeChoreoSession(raw: unknown): ChoreoSession | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const first = o.first;
  if (!first || typeof first !== "object") return null;

  if (Array.isArray(o.tracks) && o.tracks.length > 0) {
    const tracks: ChoreoTrack[] = [];
    for (const t of o.tracks) {
      if (!t || typeof t !== "object") continue;
      const tr = t as Record<string, unknown>;
      tracks.push({
        targetId: typeof tr.targetId === "string" ? tr.targetId : undefined,
        flourish: (tr.flourish as AnimationSpec | null | undefined) ?? null,
        landTiming: (tr.landTiming as ChoreoLandTiming | null | undefined) ?? null,
      });
    }
    if (!tracks.length) return null;
    return { first: first as ChoreoFirstMap, tracks, land: true };
  }

  const landTiming = o.landTiming as ChoreoLandTiming | undefined;
  if (!landTiming || typeof landTiming !== "object") return null;
  return {
    first: first as ChoreoFirstMap,
    tracks: [
      {
        targetId: typeof o.targetId === "string" ? o.targetId : undefined,
        flourish: (o.flourish as AnimationSpec | null | undefined) ?? null,
        landTiming,
      },
    ],
    land: true,
  };
}

/**
 * Paint/FLIP clock for the bundle. Last track with landTiming wins (emit capture
 * is appended after the child, so the capture clock owns the rebake land).
 */
export function primaryLandTiming(session: ChoreoSession | ChoreoSessionFlat): ChoreoLandTiming | null {
  const s = normalizeChoreoSession(session);
  if (!s) return null;
  for (let i = s.tracks.length - 1; i >= 0; i--) {
    const t = s.tracks[i]?.landTiming;
    if (t) return t;
  }
  return null;
}

/** CSS for paint / FLIP — land starts at t=0 (plus the track's own delay:), never after flourish. */
export function sessionLandCss(session: ChoreoSession | ChoreoSessionFlat): string {
  const t = primaryLandTiming(session);
  if (!t) return "none";
  return landTimingToCss(t, 0);
}

export function findChoreoEl(root: ParentNode, id: string): HTMLElement | null {
  if (id.startsWith("let:")) {
    const letId = id.slice(4);
    return root.querySelector(`[data-pdl-instance-let="${CSS.escape(letId)}"]`);
  }
  const byId = root.querySelector(`[data-pdl-id="${CSS.escape(id)}"]`);
  if (byId) return byId as HTMLElement;
  return null;
}

export function mergeChoreoSessions(
  a: ChoreoSession | null | undefined,
  b: ChoreoSession | null | undefined,
): ChoreoSession | null {
  const left = a ? normalizeChoreoSession(a) : null;
  const right = b ? normalizeChoreoSession(b) : null;
  if (!left && !right) return null;
  if (!left) return right;
  if (!right) return left;
  return {
    first: { ...left.first, ...right.first },
    tracks: [...left.tracks, ...right.tracks],
    land: true,
  };
}

/**
 * Phase A — before the DOM becomes Last. Arms `data-pdl-transition` on every
 * identified node so the reconcile paints Last through a transition instead of
 * snapping. Reconcile reads this attribute (shell style + solid layer band), so
 * fills that live in `.pdl-layer-band` interpolate too.
 */
export function armChoreographyLand(
  scope: ParentNode,
  session: ChoreoSession | ChoreoSessionFlat,
): void {
  const s = normalizeChoreoSession(session);
  if (!s) return;
  const css = sessionLandCss(s);
  if (!css || css === "none") return;
  for (const id of Object.keys(s.first || {})) {
    const el = findChoreoEl(scope, id);
    if (!el) continue;
    el.setAttribute("data-pdl-transition", css);
    try {
      el.style.transition = css;
    } catch {
      /* ignore */
    }
  }
}

/**
 * Phase B — after the DOM is Last. Paint is already tweening from the armed
 * transition; FLIP invert/release uses the land clock. Every track's flourish
 * starts immediately (parallel with land and with each other).
 */
export function playChoreographyLand(
  scope: ParentNode,
  session: ChoreoSession | ChoreoSessionFlat,
  opts?: {
    playFlourish?: (el: HTMLElement, spec: AnimationSpec) => { finished?: Promise<unknown> } | null;
    targetEl?: HTMLElement | null;
  },
): void {
  const s = normalizeChoreoSession(session);
  if (!s) return;
  const first = s.first || {};
  const css = sessionLandCss(s);
  const ids = Object.keys(first);
  const flourishTargets = new Set(
    s.tracks
      .filter((t) => t.flourish && t.flourish.keys?.length && t.targetId)
      .map((t) => t.targetId as string),
  );
  const flipped: string[] = [];

  for (const id of ids) {
    // Flourish owns transform on its target — skip FLIP there to avoid fighting scale.
    if (flourishTargets.has(id)) continue;
    const el = findChoreoEl(scope, id);
    const f = first[id];
    if (!el || !f) continue;
    const r = el.getBoundingClientRect();
    const dx = f.left - r.left;
    const dy = f.top - r.top;
    const sx = r.width > 0.5 ? f.width / r.width : 1;
    const sy = r.height > 0.5 ? f.height / r.height : 1;
    const moved =
      Math.abs(dx) > 0.5 ||
      Math.abs(dy) > 0.5 ||
      Math.abs(sx - 1) > 0.02 ||
      Math.abs(sy - 1) > 0.02;
    if (!moved) continue;
    el.style.transition = "none";
    el.style.transformOrigin = "0 0";
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    el.setAttribute("data-pdl-flip", "1");
    flipped.push(id);
  }

  const releaseFlip = () => {
    if (!flipped.length) return;
    requestAnimationFrame(() => {
      for (const id of flipped) {
        const el = findChoreoEl(scope, id);
        if (!el || el.getAttribute("data-pdl-flip") !== "1") continue;
        if (css && css !== "none") el.style.transition = css;
        el.style.transform = "";
        el.removeAttribute("data-pdl-flip");
      }
    });
  };

  const clearMs = Math.max(0, ...s.tracks.map(trackWallMs)) + 80;
  const clearArmed = () => {
    for (const id of ids) {
      const el = findChoreoEl(scope, id);
      if (!el) continue;
      el.style.transition = "";
      el.style.transformOrigin = "";
      el.removeAttribute("data-pdl-transition");
    }
  };
  if (typeof window !== "undefined") window.setTimeout(clearArmed, clearMs);

  // Land (FLIP release) is on the land clock — not gated on flourish completion.
  releaseFlip();

  if (!opts?.playFlourish) return;
  for (const track of s.tracks) {
    const flourish = track.flourish;
    if (!flourish?.keys?.length) continue;
    const target =
      (track.targetId ? findChoreoEl(scope, track.targetId) : null) ||
      opts.targetEl ||
      (scope instanceof Element ? scope : null);
    if (!target) continue;
    opts.playFlourish(target as HTMLElement, flourish);
  }
}

export function buildChoreoSession(
  root: Element,
  spec: AnimationSpec,
  targetId?: string,
): ChoreoSession | null {
  const split = splitChoreographySpec(spec);
  if (!split.isLand || !split.landTiming) return null;
  return {
    first: snapshotChoreoTree(root),
    tracks: [
      {
        targetId,
        flourish: split.flourish,
        landTiming: split.landTiming,
      },
    ],
    land: true,
  };
}

/** Timing from a raw catalogue animation object (iframe / tests). */
export function landTimingFromSpec(spec: unknown): ChoreoLandTiming | null {
  if (!spec || typeof spec !== "object") return null;
  const split = splitChoreographySpec(spec as AnimationSpec);
  return split.landTiming;
}

export function normalizeLandTiming(raw: unknown): ChoreoLandTiming | null {
  const t = normalizeAnimationTiming(raw);
  if (!t) return null;
  return {
    duration: t.duration,
    easing: easeToWaapi(t.ease),
    delay: t.delay,
  };
}
