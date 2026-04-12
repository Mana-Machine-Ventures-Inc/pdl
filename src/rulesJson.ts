/**
 * Canonical JSON for `Rule(…)` queries (full-spec.md §12.5) from parsed companion AST.
 */
import type { RuleChainTerminalParsed, RulePathExpr, RuleQueryParsed } from "./ast.js";

export type RuleDefJson = {
  strength: "must" | "mustNot" | "should" | "shouldNot";
  query: unknown;
  description: string | null;
  tier: "static" | "preview" | "geometry";
};

function pathToJson(p: RulePathExpr): unknown {
  return {
    kind: "path",
    steps: p.steps.map((s) => {
      if (s.kind === "nav") return { kind: "nav", axis: s.axis };
      return { kind: "childrenPick", index: s.index };
    }),
  };
}

function terminalToJson(terminal: RuleChainTerminalParsed): unknown {
  switch (terminal.kind) {
    case "exists":
      return { kind: "exists" };
    case "ordering":
      return { kind: "ordering", relation: terminal.relation, ref: terminal.ref };
    case "aggregateCompare":
      if (terminal.op === "between") {
        return {
          kind: "aggregateCompare",
          aggregate: { kind: "count" },
          op: "between",
          low: terminal.low,
          high: terminal.high,
        };
      }
      return {
        kind: "aggregateCompare",
        aggregate: { kind: "count" },
        op: terminal.op,
        right: terminal.right,
      };
    default: {
      const _e: never = terminal;
      void _e;
      return { kind: "exists" };
    }
  }
}

export function ruleQueryToJson(q: RuleQueryParsed): unknown {
  if (q.kind === "nodeEq") {
    return {
      kind: "nodeEq",
      left: pathToJson(q.left),
      right: pathToJson(q.right),
    };
  }
  const filters = q.whereTags.map((name) => ({ kind: "whereTag", name }));
  return {
    kind: "chain",
    nav: { kind: "nav", axis: q.axis },
    filters,
    terminal: terminalToJson(q.terminal),
  };
}

export function strengthToJson(s: string): RuleDefJson["strength"] {
  const x = s.startsWith(".") ? s.slice(1) : s;
  if (x === "must") return "must";
  if (x === "mustNot") return "mustNot";
  if (x === "should") return "should";
  if (x === "shouldNot") return "shouldNot";
  return "should";
}

export function ruleLineToDef(
  strength: string,
  query: RuleQueryParsed,
  description: string | undefined,
  tier: RuleDefJson["tier"] = "static",
): RuleDefJson {
  return {
    strength: strengthToJson(strength),
    query: ruleQueryToJson(query),
    description: description ?? null,
    tier,
  };
}
