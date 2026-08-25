/**
 * Serialised value expressions and handler items, as they appear in `pdl catalogue`
 * output. The compiler emits these shapes from its AST (`crates/pdl-core/src/ast.rs`);
 * the host reads them to evaluate motion and rule queries at preview time.
 *
 * Keep in step with `grammar/pdl.ebnf` and the Rust serialisers — this is a wire
 * contract, not a parser data structure.
 */

export type ConditionExpr =
  | { kind: "cmp"; param: string; op: "==" | "!="; rhs: string }
  /** Bare Bool param: `if selected { … }` / `if editing { … }` (Rust `Truthy`). */
  | { kind: "truthy"; param: string }
  /** Prefix `!` on a condition atom (`if !selected { … }`). Also synthesised for rules-else. */
  | { kind: "not"; expr: ConditionExpr }
  | { kind: "and"; items: ConditionExpr[] }
  | { kind: "or"; items: ConditionExpr[] };

export type ValueExpr =
  | { kind: "hex"; value: string }
  | { kind: "string"; value: string }
  | { kind: "number"; value: number }
  /** `16:9` aspect-ratio sugar — evaluates to `width / height`. */
  | { kind: "ratio"; width: number; height: number }
  | { kind: "boolean"; value: boolean }
  /** Unary Bool negation: `!isOn` / `isOn = !isOn`. */
  | { kind: "not"; expr: ValueExpr }
  /** Frame/typeStyle prop clear — "pretend we didn't set this" (resolve deletes the key). */
  | { kind: "null" }
  /** Bool-producing condition: `hidden = …`, ForEach binds, Bool kwargs. */
  | { kind: "condition"; expr: ConditionExpr }
  | { kind: "ident"; name: string }
  | { kind: "dotEnum"; value: string }
  | { kind: "opacityOf"; base: ValueExpr; opacity: ValueExpr }
  | { kind: "edgeInsets"; variant: "xy" | "trbl"; fields: Record<string, ValueExpr> }
  | { kind: "corner"; tl: ValueExpr; tr: ValueExpr; br: ValueExpr; bl: ValueExpr }
  /** `Shadow(x:, y:, blurRadius:, color: [, spread:])` — drop shadow (not a CSS string). */
  | {
      kind: "shadow";
      x: ValueExpr;
      y: ValueExpr;
      blurRadius: ValueExpr;
      color: ValueExpr;
      spread?: ValueExpr;
    }
  /** `IconRef(file: "…")` or `IconRef(system: .sfSymbols, name: "…")`. */
  | { kind: "iconRef"; source: "file"; path: ValueExpr }
  | { kind: "iconRef"; source: "system"; system: ValueExpr; name: ValueExpr }
  /** `MediaSource(file: "…" [, kind:, format:])` or the `url:` form. */
  | {
      kind: "mediaSourceRef";
      source: "file";
      path: ValueExpr;
      /** Author `kind:` (.raster|.vector|.video) — baked as `mediaKind`. */
      mediaKind?: ValueExpr;
      format?: ValueExpr;
    }
  | {
      kind: "mediaSourceRef";
      source: "url";
      url: ValueExpr;
      mediaKind?: ValueExpr;
      format?: ValueExpr;
    }
  | { kind: "array"; items: ValueExpr[] }
  | { kind: "instance"; component: string; kwargs: Record<string, ValueExpr> }
  | { kind: "timing"; duration: ValueExpr; ease: ValueExpr; delay?: ValueExpr }
  | { kind: "pose"; props: Record<string, ValueExpr> }
  | { kind: "stagger"; step: ValueExpr; from?: ValueExpr }
  /** Segment — clock + destination. Not an `animate =` value on its own. */
  | { kind: "motion"; timing?: ValueExpr; pose: ValueExpr }
  /** Clip — type of `animate =`. */
  | {
      kind: "animation";
      /** Positional copy source: `Animation(motion.hoverPop, start: …)`. */
      base?: ValueExpr;
      start?: ValueExpr;
      keys?: ValueExpr;
      stagger?: ValueExpr;
      repeat?: ValueExpr;
    }
  | { kind: "easeBezier"; x1: ValueExpr; y1: ValueExpr; x2: ValueExpr; y2: ValueExpr }
  | {
      kind: "presentationMotion";
      incoming: ValueExpr;
      outgoing: ValueExpr;
      duration?: ValueExpr;
      ease?: ValueExpr;
      delay?: ValueExpr;
      front?: ValueExpr;
      switchAt?: ValueExpr;
    }
  /** `Effect(.blurSelf | .blurBehind | .glass, radius: [, vibrancy:])`. */
  | { kind: "effect"; effectKind: ValueExpr; radius?: ValueExpr; vibrancy?: ValueExpr }
  | { kind: "vibrancyTuple"; saturation: number; brightness: number }
  | { kind: "rampInline"; direction: string; stops: ValueExpr[] }
  | {
      kind: "sizing";
      mode: "hug" | "fill" | "fixed" | "flex" | "aspect";
      fixed?: number;
      /** `.aspect(16:9)` / `.aspect(n)` — this axis derives from the other. */
      aspect?: ValueExpr;
      flexArgs?: Record<string, ValueExpr>;
    }
  | {
      kind: "call";
      callee: "Color" | "Ramp" | "Blur" | "MediaLayer" | "Vibrancy";
      args: Record<string, ValueExpr>;
    }
  | { kind: "gradientStop"; fields: Record<string, ValueExpr> };

export type InteractionIfChain = {
  branches: { condition: ConditionExpr; body: InteractionHandlerItem[] }[];
  elseBody?: InteractionHandlerItem[];
};

export type InteractionHandlerItem =
  | { kind: "assign"; param: string; value: ValueExpr }
  /** Handler motion shot. `target` names a let (`knob.animate = …`); omit for root. */
  | { kind: "animate"; target?: string; value: ValueExpr }
  | { kind: "emit"; name: string; args: string[] }
  | { kind: "hostVerb"; name: string; args: string[]; qualifier?: string }
  | { kind: "if"; chain: InteractionIfChain };

export type RulePathStep =
  | {
      kind: "nav";
      axis: "self" | "parent" | "ancestors" | "descendants" | "siblings" | "children";
    }
  | { kind: "childrenPick"; index: "first" | "last" | number };

export type RulePathExpr = { kind: "path"; steps: RulePathStep[] };

export type RuleChainTerminalParsed =
  | { kind: "exists" }
  | { kind: "ordering"; relation: "precedes" | "follows" | "adjacentTo"; ref: "self" }
  | {
      kind: "aggregateCompare";
      op: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "between";
      right?: number;
      low?: number;
      high?: number;
    };

export type RuleQueryParsed =
  | {
      kind: "chain";
      axis: "self" | "parent" | "ancestors" | "descendants" | "siblings" | "children";
      whereTags: string[];
      terminal: RuleChainTerminalParsed;
    }
  | { kind: "nodeEq"; left: RulePathExpr; right: RulePathExpr };
