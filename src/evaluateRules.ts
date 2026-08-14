/**
 * Preview-time evaluation of `usage` / `rules` companions against a baked instance tree.
 * Queries walk component instances (frames with `instanceOf`, plus the preview root).
 * Layout wrappers are skipped for navigator axes.
 */

import type { ConditionExpr, RulesStatement } from "./ast.js";
import type { BakedComponentJson, BakedFrame } from "./bakeDesign.js";
import type { DesignDefinition } from "./designModel.js";
import { serialiseConditionExpr } from "./graph.js";
import { ruleLineToDef, type RuleDefJson } from "./rulesJson.js";

export type RuleSeverity = "error" | "warn";

export type TagOpJson = {
  kind: "set" | "add";
  tags?: string[];
  tag?: string;
  when?: unknown;
};

export type RulePreviewDef = RuleDefJson & { when?: unknown };

export type RulesPreviewJson = {
  tagOps: TagOpJson[];
  rules: RulePreviewDef[];
};

export type CompanionPreview = {
  usageByComponent: Record<string, string>;
  rulesByComponent: Record<string, RulesPreviewJson>;
};

export type RuleViolation = {
  component: string;
  instanceId: string;
  /** Root is the previewed component name; nested is `Owner/letId`. */
  instancePath: string;
  strength: RuleDefJson["strength"];
  severity: RuleSeverity;
  message: string;
};

type RuleInstance = {
  id: string;
  component: string;
  path: string;
  params: Record<string, unknown>;
  tags: string[];
  parent: RuleInstance | null;
  children: RuleInstance[];
};

function negateCondition(c: ConditionExpr): ConditionExpr {
  return { kind: "not", expr: c };
}

function conjoinWhen(
  outer: ConditionExpr | undefined,
  inner: ConditionExpr | undefined,
): ConditionExpr | undefined {
  if (!outer) return inner;
  if (!inner) return outer;
  return { kind: "and", items: [outer, inner] };
}

function conjoinMany(conjuncts: ConditionExpr[]): ConditionExpr | undefined {
  if (conjuncts.length === 0) return undefined;
  if (conjuncts.length === 1) return conjuncts[0];
  return { kind: "and", items: conjuncts };
}

function flattenCompanionRules(statements: RulesStatement[]): RulesPreviewJson {
  const tagOps: TagOpJson[] = [];
  const rules: RulePreviewDef[] = [];
  const walk = (xs: RulesStatement[], parentWhen?: ConditionExpr) => {
    for (const st of xs) {
      const whenJson = parentWhen ? serialiseConditionExpr(parentWhen) : undefined;
      if (st.kind === "tagsSet") {
        tagOps.push(whenJson ? { kind: "set", tags: [...st.tags], when: whenJson } : { kind: "set", tags: [...st.tags] });
      } else if (st.kind === "tagsAdd") {
        tagOps.push(whenJson ? { kind: "add", tag: st.tag, when: whenJson } : { kind: "add", tag: st.tag });
      } else if (st.kind === "ruleLine") {
        const def = ruleLineToDef(st.strength, st.query, st.description);
        rules.push(whenJson ? { ...def, when: whenJson } : def);
      } else if (st.kind === "if") {
        const negPrior: ConditionExpr[] = [];
        for (const br of st.chain.branches) {
          const innerWhen: ConditionExpr =
            negPrior.length === 0
              ? br.condition
              : (conjoinMany([...negPrior.map(negateCondition), br.condition]) as ConditionExpr);
          walk(br.body, conjoinWhen(parentWhen, innerWhen));
          negPrior.push(br.condition);
        }
        if (st.chain.elseBody) {
          const elseInner =
            negPrior.length === 0 ? undefined : conjoinMany(negPrior.map(negateCondition));
          walk(st.chain.elseBody, conjoinWhen(parentWhen, elseInner));
        }
      }
    }
  };
  walk(statements);
  return { tagOps, rules };
}

/** Build usage + flattened rules (including `if`-scoped tags) from a loaded design. */
export function companionPreviewFromDesign(design: DesignDefinition): CompanionPreview {
  const usageByComponent: Record<string, string> = {};
  const rulesByComponent: Record<string, RulesPreviewJson> = {};
  for (const [name, keys] of design.usage.entries()) {
    const desc = keys.get("description")?.trim();
    if (desc) usageByComponent[name] = desc;
  }
  for (const [name, stmts] of design.rules.entries()) {
    if (!stmts?.length) continue;
    rulesByComponent[name] = flattenCompanionRules(stmts);
  }
  return { usageByComponent, rulesByComponent };
}

/** Build companions from a catalogue JSON row map (Rust or TS catalogue). */
export function companionPreviewFromCatalogue(components: Record<string, unknown>): CompanionPreview {
  const usageByComponent: Record<string, string> = {};
  const rulesByComponent: Record<string, RulesPreviewJson> = {};
  for (const [name, raw] of Object.entries(components)) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as {
      usage?: unknown;
      rules?: { tags?: unknown; tagOps?: unknown; rules?: unknown };
    };
    if (typeof row.usage === "string" && row.usage.trim()) {
      usageByComponent[name] = row.usage.trim();
    }
    const r = row.rules;
    if (!r || typeof r !== "object") continue;
    const tagOps: TagOpJson[] = Array.isArray(r.tagOps)
      ? (r.tagOps as TagOpJson[])
      : Array.isArray(r.tags)
        ? [{ kind: "set", tags: (r.tags as unknown[]).map(String) }]
        : [];
    const rules = Array.isArray(r.rules) ? (r.rules as RulePreviewDef[]) : [];
    if (tagOps.length || rules.length) {
      rulesByComponent[name] = { tagOps, rules };
    }
  }
  return { usageByComponent, rulesByComponent };
}

export function mergeCompanionPreview(base: CompanionPreview, overlay: CompanionPreview): CompanionPreview {
  return {
    usageByComponent: { ...base.usageByComponent, ...overlay.usageByComponent },
    rulesByComponent: { ...base.rulesByComponent, ...overlay.rulesByComponent },
  };
}

function stripDot(v: unknown): string {
  const s = v == null ? "" : String(v);
  return s.charAt(0) === "." ? s.slice(1) : s;
}

/** Evaluate a serialised `when` (catalogue condition JSON) against instance params. */
export function evaluateWhen(when: unknown, params: Record<string, unknown>): boolean {
  if (when == null) return true;
  if (typeof when !== "object") return false;
  const c = when as Record<string, unknown>;
  switch (c.kind) {
    case "cmp": {
      const left = stripDot(params[String(c.param ?? "")]);
      const right =
        c.rhsKind === "param" ? stripDot(params[String(c.rhs ?? "")]) : stripDot(c.rhs);
      return c.op === "!=" ? left !== right : left === right;
    }
    case "truthy": {
      const tv = params[String(c.param ?? "")];
      if (typeof tv === "boolean") return tv;
      const ts = tv == null ? "" : String(tv);
      return ts === "true" || ts === "1";
    }
    case "and":
      return (Array.isArray(c.items) ? c.items : []).every((x) => evaluateWhen(x, params));
    case "or":
      return (Array.isArray(c.items) ? c.items : []).some((x) => evaluateWhen(x, params));
    case "not":
      return !evaluateWhen(c.expr, params);
    default:
      return false;
  }
}

function collectDirectInstances(frame: BakedFrame): BakedFrame[] {
  const out: BakedFrame[] = [];
  for (const ch of frame.children ?? []) {
    if (typeof ch.instanceOf === "string" && ch.instanceOf.length > 0) out.push(ch);
    else out.push(...collectDirectInstances(ch));
  }
  return out;
}

function attachChildren(parent: RuleInstance, frames: BakedFrame[]): void {
  for (const f of frames) {
    const node: RuleInstance = {
      id: f.id,
      component: f.instanceOf!,
      path: `${parent.path}/${f.id}`,
      params: { ...((f.instanceKwargs ?? {}) as Record<string, unknown>) },
      tags: [],
      parent,
      children: [],
    };
    parent.children.push(node);
    attachChildren(node, collectDirectInstances(f));
  }
}

function buildInstanceTree(comp: BakedComponentJson): RuleInstance {
  const root: RuleInstance = {
    id: comp.root?.id ?? "Root",
    component: comp.name,
    path: comp.name,
    params: { ...(comp.bakedParams ?? {}) },
    tags: [],
    parent: null,
    children: [],
  };
  attachChildren(root, collectDirectInstances(comp.root));
  return root;
}

function walkInstances(node: RuleInstance, out: RuleInstance[]): void {
  out.push(node);
  for (const ch of node.children) walkInstances(ch, out);
}

function applyTagOps(node: RuleInstance, spec: RulesPreviewJson | undefined): void {
  if (!spec) return;
  let tags: string[] = [];
  for (const op of spec.tagOps) {
    if (!evaluateWhen(op.when, node.params)) continue;
    if (op.kind === "set") tags = [...(op.tags ?? [])];
    else if (typeof op.tag === "string") tags = [...tags, op.tag];
  }
  node.tags = tags;
}

function axisNodes(self: RuleInstance, axis: string): RuleInstance[] {
  switch (axis) {
    case "self":
      return [self];
    case "parent":
      return self.parent ? [self.parent] : [];
    case "ancestors": {
      const out: RuleInstance[] = [];
      let p = self.parent;
      while (p) {
        out.push(p);
        p = p.parent;
      }
      return out;
    }
    case "descendants": {
      const out: RuleInstance[] = [];
      const walk = (n: RuleInstance) => {
        for (const c of n.children) {
          out.push(c);
          walk(c);
        }
      };
      walk(self);
      return out;
    }
    case "siblings":
      return self.parent ? self.parent.children.filter((c) => c !== self) : [];
    case "children":
      return [...self.children];
    default:
      return [];
  }
}

function applyFilters(nodes: RuleInstance[], filters: unknown): RuleInstance[] {
  if (!Array.isArray(filters) || filters.length === 0) return nodes;
  let cur = nodes;
  for (const raw of filters) {
    if (!raw || typeof raw !== "object") continue;
    const f = raw as { kind?: string; name?: string };
    if (f.kind === "whereTag" && typeof f.name === "string") {
      cur = cur.filter((n) => n.tags.includes(f.name!));
    }
  }
  return cur;
}

function compareCount(n: number, terminal: Record<string, unknown>): boolean {
  const op = String(terminal.op ?? "");
  if (op === "between") {
    const low = Number(terminal.low);
    const high = Number(terminal.high);
    return n >= low && n <= high;
  }
  const right = Number(terminal.right);
  switch (op) {
    case "gt":
      return n > right;
    case "gte":
      return n >= right;
    case "lt":
      return n < right;
    case "lte":
      return n <= right;
    case "eq":
      return n === right;
    case "ne":
      return n !== right;
    default:
      return false;
  }
}

function evaluateOrdering(
  self: RuleInstance,
  matched: RuleInstance[],
  relation: string,
): boolean {
  const siblings = self.parent?.children ?? [];
  const selfIdx = siblings.indexOf(self);
  if (selfIdx < 0) return false;
  return matched.some((m) => {
    const i = siblings.indexOf(m);
    if (i < 0) return false;
    if (relation === "precedes") return i < selfIdx;
    if (relation === "follows") return i > selfIdx;
    if (relation === "adjacentTo") return Math.abs(i - selfIdx) === 1;
    return false;
  });
}

function resolvePath(self: RuleInstance, path: unknown): RuleInstance | null {
  if (!path || typeof path !== "object") return null;
  const steps = (path as { steps?: unknown }).steps;
  if (!Array.isArray(steps)) return null;
  let cur: RuleInstance | null = self;
  for (const raw of steps) {
    if (!cur || !raw || typeof raw !== "object") return null;
    const step = raw as { kind?: string; axis?: string; index?: unknown };
    if (step.kind === "nav") {
      const axis = String(step.axis ?? "");
      if (axis === "self") continue;
      if (axis === "parent") {
        cur = cur.parent;
        continue;
      }
      const nodes = axisNodes(cur, axis);
      cur = nodes[0] ?? null;
      continue;
    }
    if (step.kind === "childrenPick") {
      const kids = cur.children;
      if (step.index === "first") cur = kids[0] ?? null;
      else if (step.index === "last") cur = kids[kids.length - 1] ?? null;
      else {
        const i = Number(step.index);
        cur = Number.isInteger(i) ? (kids[i] ?? null) : null;
      }
    }
  }
  return cur;
}

function evaluateQuery(self: RuleInstance, query: unknown): boolean {
  if (!query || typeof query !== "object") return false;
  const q = query as Record<string, unknown>;
  if (q.kind === "nodeEq") {
    const left = resolvePath(self, q.left);
    const right = resolvePath(self, q.right);
    return left != null && left === right;
  }
  const axis =
    q.kind === "chain" && q.nav && typeof q.nav === "object"
      ? String((q.nav as { axis?: string }).axis ?? "")
      : typeof q.axis === "string"
        ? q.axis
        : "";
  const filters =
    Array.isArray(q.filters)
      ? q.filters
      : Array.isArray(q.whereTags)
        ? (q.whereTags as unknown[]).map((name) => ({ kind: "whereTag", name: String(name) }))
        : [];
  const matched = applyFilters(axisNodes(self, axis), filters);
  const terminal = (q.terminal ?? { kind: "exists" }) as Record<string, unknown>;
  const kind = String(terminal.kind ?? "exists");
  if (kind === "exists") return matched.length > 0;
  if (kind === "aggregateCompare") return compareCount(matched.length, terminal);
  if (kind === "ordering") return evaluateOrdering(self, matched, String(terminal.relation ?? ""));
  return false;
}

function severityOf(strength: string): RuleSeverity {
  return strength === "must" || strength === "mustNot" ? "error" : "warn";
}

function isViolation(strength: string, matched: boolean): boolean {
  if (strength === "mustNot" || strength === "shouldNot") return matched;
  return !matched;
}

function ruleMessage(rule: RulePreviewDef): string {
  if (typeof rule.description === "string" && rule.description.trim()) return rule.description.trim();
  return `Rule (.${rule.strength}) failed`;
}

/**
 * Evaluate every instance in a baked component against `rulesByComponent`.
 * Tags are applied first (so sibling/child `where(tag:)` sees the full tree).
 */
export function evaluateRulesOnComponent(
  comp: BakedComponentJson,
  rulesByComponent: Record<string, RulesPreviewJson>,
): RuleViolation[] {
  if (!comp?.root || Object.keys(rulesByComponent).length === 0) return [];
  const root = buildInstanceTree(comp);
  const nodes: RuleInstance[] = [];
  walkInstances(root, nodes);
  for (const n of nodes) applyTagOps(n, rulesByComponent[n.component]);
  const out: RuleViolation[] = [];
  for (const n of nodes) {
    const spec = rulesByComponent[n.component];
    if (!spec) continue;
    for (const rule of spec.rules) {
      if (!evaluateWhen(rule.when, n.params)) continue;
      const ok = evaluateQuery(n, rule.query);
      if (!isViolation(rule.strength, ok)) continue;
      out.push({
        component: n.component,
        instanceId: n.id,
        instancePath: n.path,
        strength: rule.strength,
        severity: severityOf(rule.strength),
        message: ruleMessage(rule),
      });
    }
  }
  return out;
}

/** instancePath → worst severity (error wins over warn). */
export function ruleMarksFromViolations(violations: RuleViolation[]): Record<string, RuleSeverity> {
  const marks: Record<string, RuleSeverity> = {};
  for (const v of violations) {
    if (marks[v.instancePath] === "error") continue;
    marks[v.instancePath] = v.severity;
  }
  return marks;
}
