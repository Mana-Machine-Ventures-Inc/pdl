//! AST shapes for PDL (informal; aligned with full-spec.md §21).
//!
//! Rust port of `src/ast.ts`. TypeScript discriminated unions (`{ kind: "..." }`)
//! become idiomatic Rust enums; `Record<string, ValueExpr>` maps use
//! [`IndexMap`] so field/argument insertion order is preserved (matching the
//! JS object-key ordering the TypeScript oracle relies on).

use indexmap::IndexMap;

/// Boolean/variant comparison operator (`==` / `!=`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CmpOp {
    Eq,
    Ne,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ConditionExpr {
    Cmp {
        param: String,
        op: CmpOp,
        rhs: String,
    },
    And {
        items: Vec<ConditionExpr>,
    },
    Or {
        items: Vec<ConditionExpr>,
    },
    /// Synthesised when flattening `rules` `else` / prior-branch negations
    /// (not a PDL `if` atom).
    Not {
        expr: Box<ConditionExpr>,
    },
}

/// `EdgeInsets` shorthand shape.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EdgeInsetsVariant {
    /// `(x:, y:)`
    Xy,
    /// `(top:, right:, bottom:, left:)`
    Trbl,
}

/// Callee for builtin labelled-argument calls.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CallCallee {
    Color,
    Ramp,
    Blur,
    Media,
    Vibrancy,
}

/// Sizing mode for `.hug` / `.fill` / `.fixed(n)` / `.flex(...)`.
#[derive(Debug, Clone, PartialEq)]
pub enum SizingMode {
    Hug,
    Fill,
    Fixed { fixed: f64 },
    Flex { flex_args: IndexMap<String, ValueExpr> },
}

#[derive(Debug, Clone, PartialEq)]
pub enum ValueExpr {
    Hex {
        value: String,
    },
    String {
        value: String,
    },
    Number {
        value: f64,
    },
    Boolean {
        value: bool,
    },
    /// Only on `hidden = …` — same grammar as `if` conditions
    /// (variant comparisons).
    Condition {
        expr: ConditionExpr,
    },
    Ident {
        name: String,
    },
    DotEnum {
        value: String,
    },
    OpacityOf {
        base: Box<ValueExpr>,
        opacity: Box<ValueExpr>,
    },
    EdgeInsets {
        variant: EdgeInsetsVariant,
        fields: IndexMap<String, ValueExpr>,
    },
    Corner {
        tl: Box<ValueExpr>,
        tr: Box<ValueExpr>,
        br: Box<ValueExpr>,
        bl: Box<ValueExpr>,
    },
    Array {
        items: Vec<ValueExpr>,
    },
    Transition {
        duration: Box<ValueExpr>,
        easing: Box<ValueExpr>,
        delay: Option<Box<ValueExpr>>,
    },
    VibrancyTuple {
        saturation: f64,
        brightness: f64,
    },
    RampInline {
        direction: String,
        stops: Vec<ValueExpr>,
    },
    Sizing {
        mode: SizingMode,
    },
    Call {
        callee: CallCallee,
        args: IndexMap<String, ValueExpr>,
    },
    GradientStop {
        fields: IndexMap<String, ValueExpr>,
    },
}

#[derive(Debug, Clone, PartialEq)]
pub struct ComponentParam {
    pub name: String,
    pub type_name: String,
    pub default_value: ValueExpr,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ChildEntry {
    FrameRef {
        id: String,
    },
    Spacer,
    Instance {
        component: String,
        kwargs: IndexMap<String, ValueExpr>,
    },
}

/// Target of a `children = [...]` assignment.
#[derive(Debug, Clone, PartialEq)]
pub enum ChildrenTarget {
    Root,
    Let { let_id: String },
}

#[derive(Debug, Clone, PartialEq)]
pub enum FrameBodyItem {
    Prop {
        name: String,
        value: ValueExpr,
    },
    FrameProp {
        frame: String,
        name: String,
        value: ValueExpr,
    },
    Children {
        target: ChildrenTarget,
        entries: Vec<ChildEntry>,
    },
    Let {
        id: String,
        frame_kind: String,
        body: Vec<FrameBodyItem>,
    },
    LetInstance {
        id: String,
        component: String,
        kwargs: IndexMap<String, ValueExpr>,
    },
    If {
        chain: IfChain,
    },
}

#[derive(Debug, Clone, PartialEq)]
pub struct IfBranch {
    pub condition: ConditionExpr,
    pub body: Vec<FrameBodyItem>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct IfChain {
    pub branches: Vec<IfBranch>,
    pub else_body: Option<Vec<FrameBodyItem>>,
}

/// Root frame kind for a `component` declaration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RootKind {
    Layout,
    Text,
    Icon,
    Media,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ComponentDecl {
    pub name: String,
    pub params: Vec<ComponentParam>,
    pub root_kind: RootKind,
    pub body: Vec<FrameBodyItem>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PrimitiveDecl {
    pub name: String,
    pub token_type: String,
    pub value: ValueExpr,
}

#[derive(Debug, Clone, PartialEq)]
pub struct SemanticDecl {
    pub name: String,
    pub token_type: String,
    pub value: ValueExpr,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ThemeDecl {
    pub name: String,
    pub base_theme: Option<String>,
    pub overrides: IndexMap<String, ValueExpr>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct TypeStyleDecl {
    pub name: String,
    pub props: IndexMap<String, ValueExpr>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct VariantDecl {
    pub name: String,
    pub cases: Vec<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ImportDecl {
    pub path: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PreviewBackgroundDecl {
    pub token: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ExposeDecl {
    pub component: String,
    pub names: Vec<String>,
}

/// `usage C { key = "…" | key += "…" }`
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UsageOp {
    /// `=`
    Assign,
    /// `+=`
    Append,
}

#[derive(Debug, Clone, PartialEq)]
pub struct UsageProp {
    pub key: String,
    pub op: UsageOp,
    pub value: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct UsageDecl {
    pub component: String,
    pub props: Vec<UsageProp>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct FixtureBinding {
    pub name: String,
    pub value: ValueExpr,
}

#[derive(Debug, Clone, PartialEq)]
pub struct FixtureExampleDecl {
    pub label: String,
    pub bindings: Vec<FixtureBinding>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct FixturesDecl {
    pub component: String,
    pub examples: Vec<FixtureExampleDecl>,
}

/// Rule query navigation axis. `self` is spelled `SelfAxis` (Rust reserves
/// `Self`/`self`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NavAxis {
    SelfAxis,
    Parent,
    Ancestors,
    Descendants,
    Siblings,
    Children,
}

/// `children.first` / `children.last` / `children.<n>`
#[derive(Debug, Clone, PartialEq)]
pub enum ChildrenPickIndex {
    First,
    Last,
    Index(f64),
}

#[derive(Debug, Clone, PartialEq)]
pub enum RulePathStep {
    Nav { axis: NavAxis },
    ChildrenPick { index: ChildrenPickIndex },
}

#[derive(Debug, Clone, PartialEq)]
pub struct RulePathExpr {
    pub steps: Vec<RulePathStep>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OrderingRelation {
    Precedes,
    Follows,
    AdjacentTo,
}

/// Ordering reference node. Currently only `self`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OrderingRef {
    SelfRef,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AggregateOp {
    Eq,
    Ne,
    Gt,
    Gte,
    Lt,
    Lte,
    Between,
}

#[derive(Debug, Clone, PartialEq)]
pub enum RuleChainTerminalParsed {
    Exists,
    Ordering {
        relation: OrderingRelation,
        r#ref: OrderingRef,
    },
    AggregateCompare {
        op: AggregateOp,
        right: Option<f64>,
        low: Option<f64>,
        high: Option<f64>,
    },
}

#[derive(Debug, Clone, PartialEq)]
pub enum RuleQueryParsed {
    Chain {
        axis: NavAxis,
        where_tags: Vec<String>,
        terminal: RuleChainTerminalParsed,
    },
    NodeEq {
        left: RulePathExpr,
        right: RulePathExpr,
    },
}

#[derive(Debug, Clone, PartialEq)]
pub struct RulesIfBranch {
    pub condition: ConditionExpr,
    pub body: Vec<RulesStatement>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct RulesIfChain {
    pub branches: Vec<RulesIfBranch>,
    pub else_body: Option<Vec<RulesStatement>>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum RulesStatement {
    TagsSet {
        tags: Vec<String>,
    },
    TagsAdd {
        tag: String,
    },
    RuleLine {
        strength: String,
        query: RuleQueryParsed,
        description: Option<String>,
    },
    If {
        chain: RulesIfChain,
    },
}

#[derive(Debug, Clone, PartialEq)]
pub struct RulesDecl {
    pub component: String,
    pub statements: Vec<RulesStatement>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ExtendSection {
    Fixtures { examples: Vec<FixtureExampleDecl> },
    Usage { props: Vec<UsageProp> },
    Rules { statements: Vec<RulesStatement> },
    Expose { names: Vec<String> },
}

#[derive(Debug, Clone, PartialEq)]
pub struct ExtendDecl {
    pub component: String,
    pub sections: Vec<ExtendSection>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct InteractionIfBranch {
    pub condition: ConditionExpr,
    pub body: Vec<InteractionHandlerItem>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct InteractionIfChain {
    pub branches: Vec<InteractionIfBranch>,
    pub else_body: Option<Vec<InteractionHandlerItem>>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum InteractionHandlerItem {
    Assign {
        param: String,
        value: ValueExpr,
    },
    Animate {
        value: ValueExpr,
    },
    If {
        chain: InteractionIfChain,
    },
}

#[derive(Debug, Clone, PartialEq)]
pub struct InteractionHandler {
    pub event: String,
    pub body: Vec<InteractionHandlerItem>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct InteractionDecl {
    pub name: String,
    pub component: String,
    pub handlers: Vec<InteractionHandler>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum TopLevelDecl {
    Import(ImportDecl),
    PreviewBackground(PreviewBackgroundDecl),
    Primitive(PrimitiveDecl),
    Semantic(SemanticDecl),
    Theme(ThemeDecl),
    TypeStyle(TypeStyleDecl),
    Variant(VariantDecl),
    Component(ComponentDecl),
    Expose(ExposeDecl),
    Usage(UsageDecl),
    Fixtures(FixturesDecl),
    Rules(RulesDecl),
    Interaction(InteractionDecl),
    Extend(ExtendDecl),
}

#[derive(Debug, Clone, PartialEq)]
pub struct ModuleAst {
    pub path: String,
    pub declarations: Vec<TopLevelDecl>,
}
