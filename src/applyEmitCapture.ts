/**
 * Apply layout `on` emit-capture assigns (catalogue JSON shape).
 * Spec §4e / §8 — parent rebinding after child `emit`.
 *
 * Deep embeddings: ForEach catalogue stamps the **owning list param** (`chips` /
 * `tracks`) as the capture qualifier — including when another component mounts the
 * list (`ChipRow(children: chips)`). Bake stamps that name on expanded instances
 * (`foreachList` / `data-pdl-foreach-list`). Hosts pass that qualifier so a parent
 * capture connects at any DOM depth; instance-let ids are synthetic.
 */

import {
  evaluateSerialisedAssignValue,
  type ParamMap,
} from "./applyInteractionEvent.js";

export type PresenterOp = {
  qualifier: string;
  name: string;
  page?: { component: string; params: Record<string, unknown> } | { id: string } | null;
  style?: string | null;
  move?: unknown;
  dismissMove?: unknown;
  /** Component type that owned the capture. Section owner applies session pins. */
  owner?: string;
};

export type EmitCaptureBodyItem =
  | { kind?: "assign"; param: string; value: unknown }
  | { kind: "hostVerb"; name: string; args?: string[]; qualifier?: string }
  | {
      kind: "presenterVerb";
      name: string;
      qualifier?: string;
      page?: unknown;
      style?: string;
      move?: unknown;
      dismissMove?: unknown;
    };

export type EmitCaptureJson = {
  qualifier?: string | null;
  channel: string;
  /** Catalogue stamps `ancestor` on bare `channel(…) =` captures. */
  capture?: string;
  payload?: Array<{ name: string; type?: string }>;
  body?: EmitCaptureBodyItem[];
};

export type HostVerbCall = {
  qualifier?: string;
  name: string;
  args: string[];
};

export type ApplyEmitCaptureResult = {
  params: ParamMap;
  changed: boolean;
  handled: boolean;
  /** Let-qualified host verbs to run against nested EditableText sessions. */
  hostVerbs: HostVerbCall[];
  presenterOps: PresenterOp[];
};

/**
 * Resolve which emit-capture to run.
 *
 * - Exact qualifier match: let-scoped (`Edit.tap`) **or** ForEach list name (`chips`)
 *   when the host passes `data-pdl-foreach-list`.
 * - Sole channel capture: LabBar-style single ForEach list (instance-let fallback).
 * - Unqualified: last channel match (legacy).
 * - Multiple same-channel captures without an exact match do **not** guess
 *   (avoids Edit/Done cross-talk); multi-list shells must stamp foreachList.
 */
export function findEmitCapture(
  captures: EmitCaptureJson[],
  channel: string,
  wantQual: string | null,
): EmitCaptureJson | undefined {
  const channelCaps = captures.filter((c) => c && c.channel === channel);
  if (!channelCaps.length) return undefined;

  if (!wantQual) {
    return channelCaps[channelCaps.length - 1];
  }

  const exact = channelCaps.find((c) => (c.qualifier ?? null) === wantQual);
  if (exact) return exact;

  // ForEach without foreachList stamp: sole list capture still works (LabBar).
  if (channelCaps.length === 1) return channelCaps[0];

  return undefined;
}

/** Bare ancestor capture: catalogue `capture: "ancestor"` or no qualifier. */
export function findBareAncestorCapture(
  captures: EmitCaptureJson[],
  channel: string,
): EmitCaptureJson | undefined {
  const channelCaps = captures.filter((c) => c && c.channel === channel);
  return channelCaps.find((c) => c.capture === "ancestor" || c.qualifier == null || c.qualifier === "");
}

/**
 * Nearest ancestor bare capture wins, then the section. Child-let / ForEach
 * qualifier match on the section stays first (`.parent`).
 */
export function resolveEmitCapture(opts: {
  channel: string;
  qualifier?: string | null;
  sectionCaptures: EmitCaptureJson[];
  /** Emitting node → section, nearest first (exclude the section type). */
  ancestorCaptures?: Array<{ type: string; captures: EmitCaptureJson[] }>;
}): { capture: EmitCaptureJson; owner: string } | undefined {
  const wantQual =
    opts.qualifier != null && String(opts.qualifier).length > 0 ? String(opts.qualifier) : null;
  if (wantQual) {
    const exact = opts.sectionCaptures.find(
      (c) => c && c.channel === opts.channel && (c.qualifier ?? null) === wantQual,
    );
    if (exact) return { capture: exact, owner: "section" };
  }
  for (const anc of opts.ancestorCaptures ?? []) {
    const bare = findBareAncestorCapture(anc.captures ?? [], opts.channel);
    if (bare) return { capture: bare, owner: anc.type };
  }
  const sectionBare = findBareAncestorCapture(opts.sectionCaptures, opts.channel);
  if (sectionBare) return { capture: sectionBare, owner: "section" };
  const fallback = findEmitCapture(opts.sectionCaptures, opts.channel, wantQual);
  if (fallback) return { capture: fallback, owner: "section" };
  return undefined;
}

function evalPageExpr(
  page: unknown,
  scope: ParamMap,
): PresenterOp["page"] {
  if (!page || typeof page !== "object") return null;
  const p = page as Record<string, unknown>;
  if (p.kind === "ident") {
    return { id: String(p.name ?? "") };
  }
  const component = typeof p.component === "string" ? p.component : "";
  if (!component) return null;
  const src =
    p.kwargs && typeof p.kwargs === "object" && !Array.isArray(p.kwargs)
      ? (p.kwargs as Record<string, unknown>)
      : p.params && typeof p.params === "object" && !Array.isArray(p.params)
        ? (p.params as Record<string, unknown>)
        : {};
  const params: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(src)) {
    params[k] = evaluateSerialisedAssignValue(v, scope);
  }
  return { component, params };
}

/**
 * @param captures catalogue `emitCaptures` for the parent component
 * @param channel emit channel name (`select`)
 * @param emitArgNames ordered arg names from `emit select(filter)`
 * @param childParams instance kwargs / live child params
 * @param qualifier ForEach list name (`chips`) or let id (`Edit`); prefer foreachList
 */
export function applyEmitCapture(
  parentParams: ParamMap,
  captures: EmitCaptureJson[] | undefined | null,
  channel: string,
  emitArgNames: string[],
  childParams: ParamMap,
  qualifier?: string | null,
): ApplyEmitCaptureResult {
  if (!Array.isArray(captures) || !captures.length) {
    return {
      params: { ...parentParams },
      changed: false,
      handled: false,
      hostVerbs: [],
      presenterOps: [],
    };
  }
  const wantQual = qualifier != null && String(qualifier).length > 0 ? String(qualifier) : null;
  const capture = findEmitCapture(captures, channel, wantQual);
  if (!capture) {
    return {
      params: { ...parentParams },
      changed: false,
      handled: false,
      hostVerbs: [],
      presenterOps: [],
    };
  }

  const scope: ParamMap = { ...parentParams };
  const payload = capture.payload ?? [];
  payload.forEach((p, i) => {
    const src = emitArgNames[i] ?? p.name;
    if (Object.prototype.hasOwnProperty.call(childParams, src)) {
      scope[p.name] = childParams[src];
    } else if (Object.prototype.hasOwnProperty.call(childParams, p.name)) {
      scope[p.name] = childParams[p.name];
    }
  });

  const next: ParamMap = { ...parentParams };
  let changed = false;
  const hostVerbs: HostVerbCall[] = [];
  const presenterOps: PresenterOp[] = [];
  for (const a of capture.body ?? []) {
    if (a && (a as { kind?: string }).kind === "hostVerb") {
      const hv = a as { name: string; args?: string[]; qualifier?: string };
      hostVerbs.push({
        qualifier: hv.qualifier,
        name: hv.name,
        args: Array.isArray(hv.args) ? hv.args.map(String) : [],
      });
      changed = true;
      continue;
    }
    if (a && (a as { kind?: string }).kind === "presenterVerb") {
      const pv = a as {
        name: string;
        qualifier?: string;
        page?: unknown;
        style?: string;
        move?: unknown;
        dismissMove?: unknown;
      };
      presenterOps.push({
        qualifier: pv.qualifier || "presenter",
        name: pv.name,
        page: evalPageExpr(pv.page, scope),
        style: pv.style ?? null,
        move: pv.move,
        dismissMove: pv.dismissMove,
      });
      changed = true;
      continue;
    }
    const assign = a as { param?: string; value?: unknown };
    if (!assign?.param) continue;
    let resolved = evaluateSerialisedAssignValue(assign.value, scope);
    if (
      assign.value &&
      typeof assign.value === "object" &&
      (assign.value as { kind?: string }).kind === "ident"
    ) {
      const name = String((assign.value as { name?: string }).name ?? "");
      if (Object.prototype.hasOwnProperty.call(scope, name)) {
        resolved = scope[name];
      }
    }
    if (next[assign.param] !== resolved) changed = true;
    next[assign.param] = resolved;
    scope[assign.param] = resolved;
  }
  return { params: next, changed, handled: true, hostVerbs, presenterOps };
}
