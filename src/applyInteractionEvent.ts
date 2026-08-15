/**
 * Apply ambient `interaction` handlers to a param map (catalogue JSON shape).
 * Spec §8 / Phase H — `applyInteractionEvent` parameter simulation.
 */

export type ParamMap = Record<string, unknown>;

export type HandlerItem = {
  kind: string;
  param?: string;
  value?: unknown;
  name?: string;
  args?: string[];
  /** Nested let target for `Input.beginEditing(…)` */
  qualifier?: string;
  chain?: {
    branches?: Array<{ condition: unknown; body: HandlerItem[] }>;
    elseBody?: HandlerItem[];
  };
};

export type InteractionDeclJson = {
  name?: string;
  component?: string;
  handlers?: Array<{ event: string; body?: HandlerItem[] }>;
};

export type ApplyInteractionResult = {
  params: ParamMap;
  emits: Array<{ name: string; args: string[] }>;
  changed: boolean;
  handled: boolean;
};

function stripDot(v: unknown): string {
  const s = String(v ?? "");
  return s.startsWith(".") ? s.slice(1) : s;
}

/**
 * Evaluate a serialised ConditionExpr against params (values without leading dots).
 */
export function evaluateSerialisedCondition(cond: unknown, params: ParamMap): boolean {
  if (!cond || typeof cond !== "object") return false;
  const c = cond as Record<string, unknown>;
  switch (c.kind) {
    case "cmp": {
      const left = params[String(c.param)] ?? "";
      const ls = String(left);
      let rs: string;
      if (c.rhsKind === "param") {
        rs = String(params[String(c.rhs)] ?? "");
      } else {
        rs = stripDot(c.rhs);
      }
      if (c.op === "!=") return ls !== rs;
      return ls === rs;
    }
    case "truthy": {
      const v = params[String(c.param)];
      if (typeof v === "boolean") return v;
      const s = v === undefined || v === null ? "" : String(v);
      return s === "true" || s === "1";
    }
    case "and":
      return ((c.items as unknown[]) ?? []).every((x) => evaluateSerialisedCondition(x, params));
    case "or":
      return ((c.items as unknown[]) ?? []).some((x) => evaluateSerialisedCondition(x, params));
    case "not":
      return !evaluateSerialisedCondition(c.expr, params);
    default:
      return false;
  }
}

/**
 * Resolve a serialised ValueExpr for interaction assign RHS.
 */
export function evaluateSerialisedAssignValue(value: unknown, params: ParamMap): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  const v = value as Record<string, unknown>;
  switch (v.kind) {
    case "dotEnum":
      return stripDot(v.value);
    case "string":
    case "number":
    case "boolean":
    case "hex":
      return v.value;
    case "ident": {
      const name = String(v.name ?? "");
      if (Object.prototype.hasOwnProperty.call(params, name)) return params[name];
      return name;
    }
    default:
      return value;
  }
}

/**
 * Last-wins merge of handlers by ambient event name across interaction decls.
 */
export function mergeInteractionHandlersByEvent(
  interactions: InteractionDeclJson[] | undefined | null,
): Record<string, HandlerItem[]> {
  const map: Record<string, HandlerItem[]> = {};
  if (!Array.isArray(interactions)) return map;
  for (const decl of interactions) {
    for (const h of decl.handlers ?? []) {
      if (!h?.event) continue;
      map[h.event] = Array.isArray(h.body) ? h.body : [];
    }
  }
  return map;
}

function runHandlerBody(
  body: HandlerItem[],
  params: ParamMap,
  emits: Array<{ name: string; args: string[] }>,
): boolean {
  let changed = false;
  for (const item of body ?? []) {
    if (!item || typeof item !== "object") continue;
    if (item.kind === "assign" && typeof item.param === "string") {
      const next = evaluateSerialisedAssignValue(item.value, params);
      if (params[item.param] !== next) {
        params[item.param] = next;
        changed = true;
      } else {
        params[item.param] = next;
      }
      continue;
    }
    if (item.kind === "emit" && typeof item.name === "string") {
      emits.push({ name: item.name, args: Array.isArray(item.args) ? item.args.map(String) : [] });
      continue;
    }
    if (item.kind === "animate") {
      continue;
    }
    if (item.kind === "hostVerb" && typeof item.name === "string") {
      // Let-qualified verbs target a nested instance — handled by the HTML host.
      if (item.qualifier) continue;
      const args = Array.isArray(item.args) ? item.args.map(String) : [];
      if (item.name === "beginEditing") {
        const seedName = args[0]?.replace(/^self\./, "") ?? "value";
        const seed =
          seedName && Object.prototype.hasOwnProperty.call(params, seedName)
            ? String(params[seedName] ?? "")
            : "";
        params._editCheckpoint = String(params.value ?? seed);
        params.value = seed;
        params.isEditing = true;
        params.isEmpty = seed.length === 0;
        changed = true;
      } else if (item.name === "finishEditing" || item.name === "commitEditing") {
        params.isEditing = false;
        params.isEmpty = String(params.value ?? "").length === 0;
        changed = true;
      } else if (item.name === "cancelEditing") {
        if (params._editCheckpoint !== undefined) {
          params.value = params._editCheckpoint;
        }
        params.isEditing = false;
        params.isEmpty = String(params.value ?? "").length === 0;
        changed = true;
      }
      continue;
    }
    if (item.kind === "if" && item.chain) {
      const branches = item.chain.branches ?? [];
      let matched = false;
      for (const br of branches) {
        if (evaluateSerialisedCondition(br.condition, params)) {
          if (runHandlerBody(br.body ?? [], params, emits)) changed = true;
          matched = true;
          break;
        }
      }
      if (!matched && item.chain.elseBody) {
        if (runHandlerBody(item.chain.elseBody, params, emits)) changed = true;
      }
    }
  }
  return changed;
}

/**
 * Apply ambient event handlers for a component.
 */
export function applyInteractionEvent(
  params: ParamMap,
  interactions: InteractionDeclJson[] | undefined | null,
  event: string,
): ApplyInteractionResult {
  const byEvent = mergeInteractionHandlersByEvent(interactions);
  const body = byEvent[event];
  if (!body) {
    return {
      params: { ...params },
      emits: [],
      changed: false,
      handled: false,
    };
  }
  const next: ParamMap = { ...params };
  const emits: Array<{ name: string; args: string[] }> = [];
  const changed = runHandlerBody(body, next, emits);
  return { params: next, emits, changed, handled: true };
}

/** Ambient events the HTML preview host can synthesize from pointer input. */
export const HTML_HOST_AMBIENT_EVENTS = [
  "hoverStart",
  "hoverEnd",
  "pressStart",
  "pressEnd",
  "pressCancel",
] as const;
