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
        /// When true, `rhs` is another parameter name (`selected == filter`).
        /// When false, `rhs` is a variant case (`.all`).
        rhs_is_param: bool,
    },
    /// Bare parameter as a boolean (`if selected { … }`).
    Truthy {
        param: String,
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
    MediaLayer,
    Vibrancy,
}

/// Sizing mode for `.hug` / `.fill` / `.fixed(n)` / `.flex(...)` / `.aspect(...)`.
#[derive(Debug, Clone, PartialEq)]
pub enum SizingMode {
    Hug,
    Fill,
    Fixed { fixed: f64 },
    Flex { flex_args: IndexMap<String, ValueExpr> },
    /// Derive this axis from the other so width/height = ratio (`W:H`, number, or Ratio token).
    Aspect { aspect: Box<ValueExpr> },
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
    /// `16:9` aspect-ratio sugar — evaluates to `width / height`.
    Ratio {
        width: f64,
        height: f64,
    },
    Boolean {
        value: bool,
    },
    /// Unset a frame property (`prop = null`) — pretend it was never set.
    Null,
    /// Only on `hidden = …` — same grammar as `if` conditions
    /// (variant comparisons).
    Condition {
        expr: ConditionExpr,
    },
    Ident {
        name: String,
    },
    /// Bare `self` — enclosing component instance (emit payload).
    SelfRef,
    /// `self.param` — enclosing component parameter (escape hatch / qualifier).
    SelfMember {
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
    /// `Shadow(x:, y:, blurRadius:, color: [, spread:])` — drop shadow (not a CSS string).
    Shadow {
        x: Box<ValueExpr>,
        y: Box<ValueExpr>,
        blur_radius: Box<ValueExpr>,
        color: Box<ValueExpr>,
        spread: Option<Box<ValueExpr>>,
    },
    /// `IconRef(file: "…")`.
    IconFile {
        path: Box<ValueExpr>,
    },
    /// `IconRef(system: .sfSymbols, name: "…")`.
    IconSystem {
        system: Box<ValueExpr>,
        name: Box<ValueExpr>,
    },
    /// `MediaSource(file: "…" [, kind:, format:])`.
    MediaSourceFile {
        path: Box<ValueExpr>,
        /// Author `kind:` (.raster|.vector|.video) — baked as `mediaKind`.
        media_kind: Option<Box<ValueExpr>>,
        format: Option<Box<ValueExpr>>,
    },
    /// `MediaSource(url: "https://…" [, kind:, format:])`.
    MediaSourceUrl {
        url: Box<ValueExpr>,
        media_kind: Option<Box<ValueExpr>>,
        format: Option<Box<ValueExpr>>,
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
    /// Component instance literal: `Name()` / `Name(param: value, …)`.
    Instance {
        component: String,
        kwargs: IndexMap<String, ValueExpr>,
    },
    GradientStop {
        fields: IndexMap<String, ValueExpr>,
    },
}

#[derive(Debug, Clone, PartialEq)]
pub struct ComponentParam {
    pub name: String,
    /// Element type name (`String`, `ModalContent`, variant name, …).
    pub type_name: String,
    /// True when declared as `[T]` (array / slot list).
    pub is_array: bool,
    pub default_value: ValueExpr,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ChildEntry {
    FrameRef {
        id: String,
        /// Mount-time frame `opacity` from `Pic @ …`.
        opacity: Option<ValueExpr>,
    },
    Spacer,
    /// World A frame ctor before desugar (`Text` / `Layout` / `Icon` / `Media`).
    FrameCtor {
        frame_kind: String,
        props: IndexMap<String, ValueExpr>,
        /// Nested `children:` entries (may themselves include frame ctors).
        child_entries: Option<Vec<ChildEntry>>,
        opacity: Option<ValueExpr>,
    },
    Instance {
        component: String,
        kwargs: IndexMap<String, ValueExpr>,
        /// Mount-time root `opacity` from `Comp(…) @ …`.
        opacity: Option<ValueExpr>,
    },
    /// Expand `list` param instances with derived kwargs (from `ForEach`).
    ForEach {
        list: String,
        binds: IndexMap<String, ValueExpr>,
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
    /// Local typed value: `let ramp: Ramp = Ramp(…)` — not a frame.
    LetValue {
        id: String,
        type_name: String,
        value: ValueExpr,
    },
    If {
        chain: IfChain,
    },
    /// `ForEach(listParam) { item in … }` — body is binder overrides, emit captures,
    /// and `if`/`else` (same condition grammar as layout). Not a mount site (§4e).
    ForEach {
        list: String,
        /// Required binder for the current element (`chip` in `chip in`).
        item: String,
        /// Only `FrameProp` (binder-qualified), `LayoutOn` (binder-qualified emit
        /// capture), and nested `If` are legal here — enforced at parse.
        body: Vec<FrameBodyItem>,
    },
    /// Layout emit capture: `Field.change(…) = { … }` (let/slot) — not list params (§4e).
    LayoutOn {
        handler: LayoutOnHandler,
    },
    /// Host inbound: `self.pressEnd = { … }` — lifted to `InteractionDecl` after parse (§4a′ / §8).
    HostHandler {
        event: String,
        body: Vec<InteractionHandlerItem>,
    },
}

/// Parent-layout capture of a child emit channel (§4e / §8) — handler assignment.
#[derive(Debug, Clone, PartialEq)]
pub struct LayoutOnHandler {
    /// Optional let/slot qualifier (`Field` in `Field.change`). List params are **PDL-E036**.
    pub qualifier: Option<String>,
    pub channel: String,
    pub payload: Vec<EmitArgDecl>,
    pub body: Vec<LayoutOnAssign>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct LayoutOnAssign {
    pub param: String,
    pub value: ValueExpr,
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

/// Emit-capture handlers in a `ForEach` body (walks all `if` / `else` branches).
pub fn foreach_layout_handlers(body: &[FrameBodyItem]) -> Vec<&LayoutOnHandler> {
    let mut out = Vec::new();
    fn walk<'a>(items: &'a [FrameBodyItem], out: &mut Vec<&'a LayoutOnHandler>) {
        for item in items {
            match item {
                FrameBodyItem::LayoutOn { handler } => out.push(handler),
                FrameBodyItem::If { chain } => {
                    for br in &chain.branches {
                        walk(&br.body, out);
                    }
                    if let Some(else_body) = &chain.else_body {
                        walk(else_body, out);
                    }
                }
                _ => {}
            }
        }
    }
    walk(body, &mut out);
    out
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
    /// Optional protocol this component conforms to (`component Name <Protocol>(…)`).
    pub conforms_to: Option<String>,
    /// Params declared on the component itself (protocol params are merged via
    /// [`crate::design::effective_params`]).
    pub params: Vec<ComponentParam>,
    pub root_kind: RootKind,
    pub body: Vec<FrameBodyItem>,
}

/// One typed payload field on an emit signature (`filter: FilterId`).
#[derive(Debug, Clone, PartialEq)]
pub struct EmitArgDecl {
    pub name: String,
    pub type_name: String,
}

/// Shared emit channel declared on a `protocol` or `emits C` (`select(filter: FilterId)`).
#[derive(Debug, Clone, PartialEq)]
pub struct ProtocolEmitDecl {
    pub name: String,
    pub args: Vec<EmitArgDecl>,
}

/// Protocol role: in-tree API/structure vs host runtime powers (§4a / capabilities proposal).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProtocolRole {
    /// Shared params + `emits` for slots / mixed lists (default).
    Api,
    /// Ambient channels + host verbs for Playground / app runtime.
    Host,
}

/// Host verb on a host protocol: `beginEditing(value)` / `cancelEditing()`.
#[derive(Debug, Clone, PartialEq)]
pub struct HostVerbDecl {
    pub name: String,
    /// Positional payload field names (documentation / arity); untyped in v1.
    pub params: Vec<String>,
}

/// `protocol Name { … }` — API contract and/or host runtime power.
#[derive(Debug, Clone, PartialEq)]
pub struct ProtocolDecl {
    pub name: String,
    pub role: ProtocolRole,
    /// Host (or other) protocols this API protocol pulls in (`requires PointerInput`).
    pub requires: Vec<String>,
    pub params: Vec<ComponentParam>,
    pub emits: Vec<ProtocolEmitDecl>,
    /// Host inbound channels (`pressEnd`, …) — environment → component (§4a′).
    pub inbound: Vec<String>,
    /// Host verbs callable from handler bodies (`beginEditing(value)`, …).
    pub verbs: Vec<HostVerbDecl>,
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
    /// Fire a declared intent: `emit select` / `emit select(filter)`.
    Emit {
        name: String,
        args: Vec<String>,
    },
    /// Host verb: `beginEditing(value)` / `cancelEditing()` (EditableText).
    HostVerb {
        name: String,
        args: Vec<String>,
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

/// Top-level `emits Component { select(filter: FilterId) … }`.
#[derive(Debug, Clone, PartialEq)]
pub struct EmitsDecl {
    pub component: String,
    pub emits: Vec<ProtocolEmitDecl>,
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
    Protocol(ProtocolDecl),
    Component(ComponentDecl),
    Expose(ExposeDecl),
    Usage(UsageDecl),
    Fixtures(FixturesDecl),
    Rules(RulesDecl),
    Interaction(InteractionDecl),
    Emits(EmitsDecl),
    Extend(ExtendDecl),
}

#[derive(Debug, Clone, PartialEq)]
pub struct ModuleAst {
    pub path: String,
    pub declarations: Vec<TopLevelDecl>,
}
