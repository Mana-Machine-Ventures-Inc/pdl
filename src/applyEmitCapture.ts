/**
 * Apply layout `on` emit-capture assigns (catalogue JSON shape).
 * Spec §4e / §8 — parent rebinding after child `emit`.
 */

import {
  evaluateSerialisedAssignValue,
  type ParamMap,
} from "./applyInteractionEvent.js";

export type EmitCaptureJson = {
  qualifier?: string;
  channel: string;
  payload?: Array<{ name: string; type?: string }>;
  body?: Array<{ kind?: string; param: string; value: unknown }>;
};

export type ApplyEmitCaptureResult = {
  params: ParamMap;
  changed: boolean;
  handled: boolean;
};

/**
 * @param captures catalogue `emitCaptures` for the parent component
 * @param channel emit channel name (`select`)
 * @param emitArgNames ordered arg names from `emit select(filter)`
 * @param childParams instance kwargs / live child params
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
    return { params: { ...parentParams }, changed: false, handled: false };
  }
  let capture: EmitCaptureJson | undefined;
  for (const c of captures) {
    if (c.channel !== channel) continue;
    if (qualifier && c.qualifier && c.qualifier !== qualifier) continue;
    capture = c;
  }
  if (!capture) {
    return { params: { ...parentParams }, changed: false, handled: false };
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
  for (const a of capture.body ?? []) {
    if (!a?.param) continue;
    let resolved = evaluateSerialisedAssignValue(a.value, scope);
    if (
      a.value &&
      typeof a.value === "object" &&
      (a.value as { kind?: string }).kind === "ident"
    ) {
      const name = String((a.value as { name?: string }).name ?? "");
      if (Object.prototype.hasOwnProperty.call(scope, name)) {
        resolved = scope[name];
      }
    }
    if (next[a.param] !== resolved) changed = true;
    next[a.param] = resolved;
    scope[a.param] = resolved;
  }
  return { params: next, changed, handled: true };
}
