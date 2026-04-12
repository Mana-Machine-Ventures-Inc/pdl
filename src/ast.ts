/**
 * AST shapes for PDL (informal; aligned with full-spec.md §21).
 */

export type ValueExpr =
  | { kind: "hex"; value: string }
  | { kind: "string"; value: string }
  | { kind: "number"; value: number }
  | { kind: "boolean"; value: boolean }
  | { kind: "ident"; name: string }
  | { kind: "dotEnum"; value: string }
  | { kind: "opacityOf"; base: ValueExpr; opacity: ValueExpr }
  | { kind: "edgeInsets"; variant: "xy" | "trbl"; fields: Record<string, ValueExpr> }
  | { kind: "corner"; tl: ValueExpr; tr: ValueExpr; br: ValueExpr; bl: ValueExpr }
  | { kind: "array"; items: ValueExpr[] }
  | { kind: "transition"; duration: ValueExpr; easing: ValueExpr; delay?: ValueExpr }
  | { kind: "vibrancyTuple"; saturation: number; brightness: number }
  | { kind: "rampInline"; direction: string; stops: ValueExpr[] }
  | { kind: "sizing"; mode: "hug" | "fill" | "fixed" | "flex"; fixed?: number; flexArgs?: Record<string, ValueExpr> }
  | { kind: "call"; callee: "Color" | "Ramp" | "Blur" | "Media" | "Vibrancy"; args: Record<string, ValueExpr> }
  | { kind: "gradientStop"; fields: Record<string, ValueExpr> };

export type ConditionExpr =
  | { kind: "cmp"; param: string; op: "==" | "!="; rhs: string }
  | { kind: "and"; items: ConditionExpr[] }
  | { kind: "or"; items: ConditionExpr[] };

export type ComponentParam = {
  name: string;
  typeName: string;
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
  params: ComponentParam[];
  rootKind: "layout" | "text" | "icon" | "media";
  body: FrameBodyItem[];
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

export type TopLevelDecl =
  | ImportDecl
  | PreviewBackgroundDecl
  | PrimitiveDecl
  | SemanticDecl
  | ThemeDecl
  | TypeStyleDecl
  | VariantDecl
  | ComponentDecl
  | ExposeDecl;

export type ModuleAst = {
  kind: "module";
  path: string;
  declarations: TopLevelDecl[];
};
