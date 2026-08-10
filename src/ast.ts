/**
 * AST shapes for PDL (informal; aligned with full-spec.md §21).
 */

export type ConditionExpr =
  | { kind: "cmp"; param: string; op: "==" | "!="; rhs: string }
  /** Bare Boolean param: `if selected { … }` / `if editing { … }` (Rust `Truthy`). */
  | { kind: "truthy"; param: string }
  | { kind: "and"; items: ConditionExpr[] }
  | { kind: "or"; items: ConditionExpr[] }
  /** Synthesised when flattening `rules` `else` / prior-branch negations (not a PDL `if` atom). */
  | { kind: "not"; expr: ConditionExpr };

export type ValueExpr =
  | { kind: "hex"; value: string }
  | { kind: "string"; value: string }
  | { kind: "number"; value: number }
  /** `16:9` aspect-ratio sugar — evaluates to `width / height`. */
  | { kind: "ratio"; width: number; height: number }
  | { kind: "boolean"; value: boolean }
  /** Only on `hidden = …` — same grammar as `if` conditions (variant comparisons). */
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
  | { kind: "array"; items: ValueExpr[] }
  | { kind: "instance"; component: string; kwargs: Record<string, ValueExpr> }
  | { kind: "transition"; duration: ValueExpr; easing: ValueExpr; delay?: ValueExpr }
  | { kind: "vibrancyTuple"; saturation: number; brightness: number }
  | { kind: "rampInline"; direction: string; stops: ValueExpr[] }
  | { kind: "sizing"; mode: "hug" | "fill" | "fixed" | "flex"; fixed?: number; flexArgs?: Record<string, ValueExpr> }
  | { kind: "call"; callee: "Color" | "Ramp" | "Blur" | "Media" | "Vibrancy"; args: Record<string, ValueExpr> }
  | { kind: "gradientStop"; fields: Record<string, ValueExpr> };

export type ComponentParam = {
  name: string;
  typeName: string;
  /** `slots: [ModalContent] = …` */
  isArray?: boolean;
  defaultValue: ValueExpr;
};

export type ChildEntry =
  | { kind: "frameRef"; id: string }
  | { kind: "spacer" }
  | { kind: "instance"; component: string; kwargs: Record<string, ValueExpr> };

export type FrameBodyItem =
  | { kind: "prop"; name: string; value: ValueExpr }
  | { kind: "frameProp"; frame: string; name: string; value: ValueExpr }
  | { kind: "children"; target: "root" | { letId: string }; entries: ChildEntry[] }
  | { kind: "let"; id: string; frameKind: string; body: FrameBodyItem[] }
  | { kind: "letInstance"; id: string; component: string; kwargs: Record<string, ValueExpr> }
  | { kind: "if"; chain: IfChain };

export type IfChain = {
  branches: { condition: ConditionExpr; body: FrameBodyItem[] }[];
  elseBody?: FrameBodyItem[];
};

export type ComponentDecl = {
  kind: "component";
  name: string;
  /** Optional protocol conformance (`component C <P>`). Rust validates host roles. */
  conformsTo?: string;
  params: ComponentParam[];
  rootKind: "layout" | "text" | "icon" | "media";
  body: FrameBodyItem[];
};

/** Minimal protocol AST for import/load; host-role validation is Rust-first. */
export type ProtocolDecl = {
  kind: "protocol";
  name: string;
  role: "api" | "host";
  requires: string[];
};

export type PrimitiveDecl = {
  kind: "primitive";
  name: string;
  tokenType: string;
  value: ValueExpr;
};

export type SemanticDecl = {
  kind: "semantic";
  name: string;
  tokenType: string;
  value: ValueExpr;
};

export type ThemeDecl = {
  kind: "theme";
  name: string;
  baseTheme?: string;
  overrides: Record<string, ValueExpr>;
};

export type TypeStyleDecl = {
  kind: "typeStyle";
  name: string;
  props: Record<string, ValueExpr>;
};

export type VariantDecl = {
  kind: "variant";
  name: string;
  cases: string[];
};

export type ImportDecl = { kind: "import"; path: string };
export type PreviewBackgroundDecl = { kind: "previewBackground"; token: string };

export type ExposeDecl = { kind: "expose"; component: string; names: string[] };

/** `usage C { key = "…" | key += "…" }` */
export type UsageProp = { key: string; op: "=" | "+="; value: string };
export type UsageDecl = { kind: "usage"; component: string; props: UsageProp[] };

export type FixtureBinding = { name: string; value: ValueExpr };
export type FixtureExampleDecl = { label: string; bindings: FixtureBinding[] };
export type FixturesDecl = { kind: "fixtures"; component: string; examples: FixtureExampleDecl[] };

export type RulePathStep =
  | { kind: "nav"; axis: "self" | "parent" | "ancestors" | "descendants" | "siblings" | "children" }
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

export type RulesIfChain = {
  branches: { condition: ConditionExpr; body: RulesStatement[] }[];
  elseBody?: RulesStatement[];
};

export type RulesStatement =
  | { kind: "tagsSet"; tags: string[] }
  | { kind: "tagsAdd"; tag: string }
  | {
      kind: "ruleLine";
      strength: string;
      query: RuleQueryParsed;
      description?: string;
    }
  | { kind: "if"; chain: RulesIfChain };

export type RulesDecl = { kind: "rules"; component: string; statements: RulesStatement[] };

export type ExtendSection =
  | { kind: "fixtures"; examples: FixtureExampleDecl[] }
  | { kind: "usage"; props: UsageProp[] }
  | { kind: "rules"; statements: RulesStatement[] }
  | { kind: "expose"; names: string[] };

export type ExtendDecl = { kind: "extend"; component: string; sections: ExtendSection[] };

export type InteractionIfChain = {
  branches: { condition: ConditionExpr; body: InteractionHandlerItem[] }[];
  elseBody?: InteractionHandlerItem[];
};

export type InteractionHandlerItem =
  | { kind: "assign"; param: string; value: ValueExpr }
  | { kind: "animate"; value: ValueExpr }
  | { kind: "emit"; name: string; args: string[] }
  | { kind: "hostVerb"; name: string; args: string[] }
  | { kind: "if"; chain: InteractionIfChain };

export type InteractionDecl = {
  kind: "interaction";
  name: string;
  component: string;
  handlers: { event: string; body: InteractionHandlerItem[] }[];
};

export type TopLevelDecl =
  | ImportDecl
  | PreviewBackgroundDecl
  | PrimitiveDecl
  | SemanticDecl
  | ThemeDecl
  | TypeStyleDecl
  | VariantDecl
  | ProtocolDecl
  | ComponentDecl
  | ExposeDecl
  | UsageDecl
  | FixturesDecl
  | RulesDecl
  | InteractionDecl
  | ExtendDecl;

export type ModuleAst = {
  kind: "module";
  path: string;
  declarations: TopLevelDecl[];
};
