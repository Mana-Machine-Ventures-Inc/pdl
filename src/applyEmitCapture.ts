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

export type EmitCaptureBodyItem =
  | { kind?: "assign"; param: string; value: unknown }
  | { kind: "hostVerb"; name: string; args?: string[]; qualifier?: string };

export type EmitCaptureJson = {
  qualifier?: string;
  channel: string;
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
    return { params: { ...parentParams }, changed: false, handled: false, hostVerbs: [] };
  }
  const wantQual = qualifier != null && String(qualifier).length > 0 ? String(qualifier) : null;
  const capture = findEmitCapture(captures, channel, wantQual);
  if (!capture) {
    return { params: { ...parentParams }, changed: false, handled: false, hostVerbs: [] };
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
  return { params: next, changed, handled: true, hostVerbs };
}
