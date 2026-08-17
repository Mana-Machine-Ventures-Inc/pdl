//! AST shapes for PDL (informal; aligned with `grammar/pdl.ebnf`).
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
    Fixed {
        fixed: f64,
    },
    Flex {
        flex_args: IndexMap<String, ValueExpr>,
    },
    /// Derive this axis from the other so width/height = ratio (`W:H`, number, or Ratio token).
    Aspect {
        aspect: Box<ValueExpr>,
    },
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
    Timing {
        duration: Box<ValueExpr>,
        ease: Box<ValueExpr>,
        delay: Option<Box<ValueExpr>>,
    },
    /// `Pose(opacity:, scale:, …)` — overlay snapshot.
    Pose {
        props: IndexMap<String, ValueExpr>,
    },
    /// `Stagger(step: [, from:])`.
    Stagger {
        step: Box<ValueExpr>,
        from: Option<Box<ValueExpr>>,
    },
    /// `Key(pose: Pose | .rest, at: [, ease:])`.
    Key {
        pose: Box<ValueExpr>,
        at: Box<ValueExpr>,
        ease: Option<Box<ValueExpr>>,
    },
    /// `Motion(timing: | duration:/ease:/delay: [, play:] [, pose:] [, keys:] [, stagger:] [, repeat:])`.
    Motion {
        /// Positional copy source: `Motion(motion.hoverPop, play: .toRest)`.
        base: Option<Box<ValueExpr>>,
        timing: Option<Box<ValueExpr>>,
        pose: Option<Box<ValueExpr>>,
        keys: Option<Box<ValueExpr>>,
        play: Option<Box<ValueExpr>>,
        repeat: Option<Box<ValueExpr>>,
        stagger: Option<Box<ValueExpr>>,
    },
    /// `Ease.bezier(x1, y1, x2, y2)`.
    EaseBezier {
        x1: Box<ValueExpr>,
        y1: Box<ValueExpr>,
        x2: Box<ValueExpr>,
        y2: Box<ValueExpr>,
    },
    /// Presenter pair clip.
    PresentationMotion {
        incoming: Box<ValueExpr>,
        outgoing: Box<ValueExpr>,
        duration: Option<Box<ValueExpr>>,
        ease: Option<Box<ValueExpr>>,
        delay: Option<Box<ValueExpr>>,
        front: Option<Box<ValueExpr>>,
        switch_at: Option<Box<ValueExpr>>,
    },
    /// `Effect(.blurSelf | .blurBehind | .glass, radius: [, vibrancy:])`.
    Effect {
        effect_kind: Box<ValueExpr>,
        radius: Option<Box<ValueExpr>>,
        vibrancy: Option<Box<ValueExpr>>,
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
    /// Child-let / ForEach binder (`Field` in `Field.change`). **`None` is ancestor
    /// capture** (`showEpisode(id:) = { … }`) — not `Protocol.channel`, not `self.`.
    /// List params are **PDL-E036**.
    pub qualifier: Option<String>,
    pub channel: String,
    pub payload: Vec<EmitArgDecl>,
    pub body: Vec<LayoutOnBodyItem>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct LayoutOnAssign {
    pub param: String,
    pub value: ValueExpr,
}

/// Body of an emit-capture handler: parent assigns and/or let-qualified host verbs.
#[derive(Debug, Clone, PartialEq)]
pub enum LayoutOnBodyItem {
    Assign(LayoutOnAssign),
    /// `Input.beginEditing(draft)` / `Input.finishEditing()` — target a nested EditableText let.
    HostVerb {
        qualifier: Option<String>,
        name: String,
        args: Vec<String>,
    },
    /// `presenter.replace/push/pop/present/dismiss(…)` — legal only in an ancestor-capture body.
    PresenterVerb {
        qualifier: String,
        verb: PresenterVerb,
        page: Option<ValueExpr>,
        /// `present(…, style: .cover)` — case name without the leading dot.
        style: Option<String>,
        /// `push(page, move:, dismissMove:)` — evaluated PresentationMotion.
        move_spec: Option<ValueExpr>,
        dismiss_move: Option<ValueExpr>,
    },
}

/// Presenter hole verbs. N3 `replace`; N4 `push` / `pop`; N5 `present` / `dismiss`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PresenterVerb {
    Replace,
    Push,
    Pop,
    Present,
    Dismiss,
}

impl PresenterVerb {
    pub fn from_name(name: &str) -> Option<Self> {
        match name {
            "replace" => Some(Self::Replace),
            "push" => Some(Self::Push),
            "pop" => Some(Self::Pop),
            "present" => Some(Self::Present),
            "dismiss" => Some(Self::Dismiss),
            _ => None,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::Replace => "replace",
            Self::Push => "push",
            Self::Pop => "pop",
            Self::Present => "present",
            Self::Dismiss => "dismiss",
        }
    }
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

/// Discoverability role. Same bake machine; `page` auto-satisfies prelude `Page`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum ComponentRole {
    #[default]
    Component,
    Page,
    Screen,
}

impl ComponentRole {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Component => "component",
            Self::Page => "page",
            Self::Screen => "screen",
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct ComponentDecl {
    pub name: String,
    /// `component` / `page` / `screen`. Omitted from catalogue when `component`.
    pub role: ComponentRole,
    /// Protocols this component **receives** (`component Name <P, Q>(…)`).
    /// Host inbound (`PointerInput`) and ancestor-sink API protocols (`ShowEpisode`).
    /// A `page` satisfies prelude `Page` via [`ComponentRole::Page`], not this list.
    pub conforms_to: Vec<String>,
    /// Protocols this component **sends** (`emits <ShowEpisode>` / `emits <SubnavItem>`).
    /// Supplies emit channels, API params, and `[P]` slot membership.
    pub emits_protocols: Vec<String>,
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

/// How far an unhandled emit travels (`emits(propagation:)`). Default `.parent`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum EmitPropagation {
    #[default]
    Parent,
    Ancestors,
}

impl EmitPropagation {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Parent => "parent",
            Self::Ancestors => "ancestors",
        }
    }
}

/// Shared emit channel declared on a `protocol` or `emits C` (`select(filter: FilterId)`).
#[derive(Debug, Clone, PartialEq)]
pub struct ProtocolEmitDecl {
    pub name: String,
    pub args: Vec<EmitArgDecl>,
    /// Copied from the enclosing `emits(propagation:)` block (N1).
    pub propagation: EmitPropagation,
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

/// Host-role token remap (`catalog AppleIcons { … }`). Same override IR as `theme`.
#[derive(Debug, Clone, PartialEq)]
pub struct CatalogDecl {
    pub name: String,
    pub overrides: IndexMap<String, ValueExpr>,
}

/// Comparison used only in `mount` conditions (`width < 600`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MountCmpOp {
    Eq,
    Ne,
    Lt,
    Le,
    Gt,
    Ge,
}

/// Value in a `mount` body: bag probe, coalesce, literal, local, or `self.param`.
#[derive(Debug, Clone, PartialEq)]
pub enum MountExpr {
    HostProbe {
        key: String,
        type_name: String,
        /// `as?` (soft) vs `as` (strict).
        soft: bool,
    },
    Coalesce {
        arms: Vec<MountExpr>,
    },
    Value(ValueExpr),
}

#[derive(Debug, Clone, PartialEq)]
pub enum MountCondition {
    Cmp {
        left: MountExpr,
        op: MountCmpOp,
        right: MountExpr,
    },
    Truthy {
        expr: MountExpr,
    },
    And {
        items: Vec<MountCondition>,
    },
    Or {
        items: Vec<MountCondition>,
    },
}

#[derive(Debug, Clone, PartialEq)]
pub struct MountIfChain {
    pub condition: MountCondition,
    pub then_items: Vec<MountItem>,
    pub else_if: Vec<(MountCondition, Vec<MountItem>)>,
    pub else_items: Option<Vec<MountItem>>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum MountItem {
    Let {
        name: String,
        type_name: String,
        value: MountExpr,
    },
    Assign {
        param: String,
        value: MountExpr,
    },
    If {
        chain: MountIfChain,
    },
    UseCatalog {
        name: String,
    },
    TokenAssign {
        name: String,
        value: MountExpr,
    },
}

/// `host Name(params) [mount { … }]`.
#[derive(Debug, Clone, PartialEq)]
pub struct HostDecl {
    pub name: String,
    pub params: Vec<ComponentParam>,
    pub mount: Option<Vec<MountItem>>,
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
    /// Optional bake knobs (H5). Not component params.
    pub host: Option<String>,
    pub theme: Option<String>,
    /// JSON object text for `hostFactsJson`.
    pub host_facts: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct FixturesDecl {
    pub component: String,
    pub examples: Vec<FixtureExampleDecl>,
}

/// One typed field inside a sample bank entry (`tracks: [TrackRow] = […]`).
#[derive(Debug, Clone, PartialEq)]
pub struct SampleFieldDecl {
    pub name: String,
    pub type_name: String,
    pub is_array: bool,
    pub value: ValueExpr,
}

/// Named entry inside a sample bank (`pop_results { … }`).
#[derive(Debug, Clone, PartialEq)]
pub struct SampleEntryDecl {
    pub name: String,
    pub fields: Vec<SampleFieldDecl>,
}

/// Top-level `samples Tracks { … }` typed data bank.
#[derive(Debug, Clone, PartialEq)]
pub struct SamplesDecl {
    pub name: String,
    pub entries: Vec<SampleEntryDecl>,
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
    /// Host verb: `beginEditing(value)` / `Input.finishEditing()` (EditableText).
    /// `qualifier` is a nested let id when present (`Input` in `Input.beginEditing(draft)`).
    HostVerb {
        qualifier: Option<String>,
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
    Catalog(CatalogDecl),
    Host(HostDecl),
    TypeStyle(TypeStyleDecl),
    Variant(VariantDecl),
    Protocol(ProtocolDecl),
    Component(ComponentDecl),
    Expose(ExposeDecl),
    Usage(UsageDecl),
    Fixtures(FixturesDecl),
    Samples(SamplesDecl),
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
