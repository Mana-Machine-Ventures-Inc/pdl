//! Component-tree resolution for bake.
//!
//! Rust port of `src/resolveTree.ts` (+ `src/frameNumericSugar.ts`). Produces a
//! fully materialised [`CatalFrame`] tree with literal, evaluated props.

use std::collections::{HashMap, HashSet};

use indexmap::IndexMap;
use serde_json::{Map, Value};

use crate::ast::*;
use crate::design::{effective_params, DesignDefinition};
use crate::error::PdlError;
use crate::evaluate::{evaluate_condition, evaluate_value, Eval, ParamMeta, ParamValues, Tokens};
use crate::stable_json::number_value;

/// Resolve options (subset used by bake / catalogue paths).
#[derive(Debug, Clone, Copy)]
pub struct ResolveOptions {
    pub use_string_placeholders: bool,
    pub catalogue_token_refs: bool,
}

/// **Bake** and any consumer that needs fully evaluated literals on frames.
pub const RESOLVE_OPTIONS_LITERAL_BAKE: ResolveOptions = ResolveOptions {
    use_string_placeholders: false,
    catalogue_token_refs: false,
};

/// **Graph** outputs: token pointer strings + `param:` placeholders.
pub const RESOLVE_OPTIONS_GRAPH_CATALOGUE: ResolveOptions = ResolveOptions {
    use_string_placeholders: true,
    catalogue_token_refs: true,
};

/// A resolved frame (matches the TS `CatalFrame` JSON shape).
#[derive(Debug, Clone)]
pub struct CatalFrame {
    pub id: String,
    pub kind: String,
    pub props: Map<String, Value>,
    pub children: Vec<CatalFrame>,
    pub instance_of: Option<String>,
    pub instance_kwargs: Option<Map<String, Value>>,
    /// When expanded from `ForEach(list) { … }` / a forwarded list mount, the
    /// **owning** list param (`chips`, `tracks`) — not the child mount param
    /// (`children`). Hosts match catalogue emit captures at any DOM depth.
    pub foreach_list: Option<String>,
}

impl CatalFrame {
    pub fn to_value(&self) -> Value {
        let mut o = Map::new();
        o.insert("id".to_string(), Value::String(self.id.clone()));
        o.insert("kind".to_string(), Value::String(self.kind.clone()));
        o.insert("props".to_string(), Value::Object(self.props.clone()));
        o.insert(
            "children".to_string(),
            Value::Array(self.children.iter().map(|c| c.to_value()).collect()),
        );
        if let Some(io) = &self.instance_of {
            o.insert("instanceOf".to_string(), Value::String(io.clone()));
            o.insert(
                "instanceKwargs".to_string(),
                Value::Object(self.instance_kwargs.clone().unwrap_or_default()),
            );
        }
        if let Some(list) = &self.foreach_list {
            o.insert("foreachList".to_string(), Value::String(list.clone()));
        }
        Value::Object(o)
    }
}

pub fn is_hidden_frame(f: &CatalFrame) -> bool {
    matches!(f.props.get("hidden"), Some(Value::Bool(true)))
}

/// Drop frames with `props.hidden === true` from emitted `children` lists (recursive).
pub fn prune_hidden_children_tree(f: &CatalFrame) -> CatalFrame {
    CatalFrame {
        id: f.id.clone(),
        kind: f.kind.clone(),
        props: f.props.clone(),
        children: f
            .children
            .iter()
            .filter(|ch| !is_hidden_frame(ch))
            .map(prune_hidden_children_tree)
            .collect(),
        instance_of: f.instance_of.clone(),
        instance_kwargs: if f.instance_of.is_some() {
            Some(f.instance_kwargs.clone().unwrap_or_default())
        } else {
            None
        },
        foreach_list: f.foreach_list.clone(),
    }
}

struct MutableFrame {
    kind: String,
    props: Map<String, Value>,
    child_entries: Vec<ChildEntry>,
    instance_of: Option<String>,
    instance_kwargs: Option<Map<String, Value>>,
    /// Preserved across LetInstance flatten (`insert_catal_tree` → rematerialize).
    foreach_list: Option<String>,
}

/// Parent `ForEach(list)` forwarded into a child component that mounts that list
/// via a list/slot param (`ChipRow(children: chips)`).
#[derive(Clone)]
struct ForEachForward {
    /// Catalogue emit-capture qualifier (owning list param on the ForEach author).
    owner_list: String,
    body: Vec<crate::ast::FrameBodyItem>,
    /// Enclosing params for overlay RHS (`self.currentMood`, …).
    owner_params: ParamValues,
    owner_param_meta: ParamMeta,
}

/// LetInstance deferred until after the body walk so `ForEach` overlays exist
/// even when `let Row = ChipRow(…)` appears above `ForEach(chips)` in source.
struct PendingLetInstance {
    id: String,
    component: String,
    kwargs: IndexMap<String, ValueExpr>,
}

/// Slot / ForEach overlays collected while walking a component body (do not mount).
#[derive(Default)]
struct SlotResolveCtx {
    /// `simple.title = …` / `simple.content = …` — classified at mount by concrete component.
    slot_overrides: HashMap<String, IndexMap<String, Value>>,
    /// `ForEach(chips) { chip in … }` bodies applied when `children` expands `chips`.
    foreach_bodies: HashMap<String, Vec<crate::ast::FrameBodyItem>>,
    /// Child param → parent ForEach when this component mounts a forwarded list.
    foreach_forwards: HashMap<String, ForEachForward>,
    pending_let_instances: Vec<PendingLetInstance>,
}

/// `chips` or `[chips]` used as a list-forward / mount reference in kwargs.
fn list_ident_from_expr(expr: &ValueExpr) -> Option<&str> {
    match expr {
        ValueExpr::Ident { name } => Some(name.as_str()),
        ValueExpr::Array { items } if items.len() == 1 => {
            if let ValueExpr::Ident { name } = &items[0] {
                Some(name.as_str())
            } else {
                None
            }
        }
        _ => None,
    }
}

fn foreach_forward_for_list(
    slot_ctx: &SlotResolveCtx,
    param_values: &ParamValues,
    param_meta: &ParamMeta,
    list_name: &str,
) -> Option<ForEachForward> {
    if let Some(body) = slot_ctx.foreach_bodies.get(list_name) {
        return Some(ForEachForward {
            owner_list: list_name.to_string(),
            body: body.clone(),
            owner_params: param_values.clone(),
            owner_param_meta: param_meta.clone(),
        });
    }
    slot_ctx.foreach_forwards.get(list_name).cloned()
}

fn collect_foreach_forwards_for_kwargs(
    kwargs: &IndexMap<String, ValueExpr>,
    slot_ctx: &SlotResolveCtx,
    param_values: &ParamValues,
    param_meta: &ParamMeta,
) -> HashMap<String, ForEachForward> {
    let mut out = HashMap::new();
    for (child_param, expr) in kwargs {
        if let Some(list_name) = list_ident_from_expr(expr) {
            if let Some(fwd) = foreach_forward_for_list(slot_ctx, param_values, param_meta, list_name)
            {
                out.insert(child_param.clone(), fwd);
            }
        }
    }
    out
}

/// Kwarg RHS for a forwarded list: `chips` or `[chips]` both pass the list value
/// (not a one-element array wrapping the list).
fn kwargs_expr_for_eval<'a>(
    child_param: &str,
    expr: &'a ValueExpr,
    forwards: &HashMap<String, ForEachForward>,
) -> &'a ValueExpr {
    if !forwards.contains_key(child_param) {
        return expr;
    }
    match expr {
        ValueExpr::Array { items } if items.len() == 1 => &items[0],
        _ => expr,
    }
}

fn component_param_names(
    design: &DesignDefinition,
    component: &str,
) -> Result<HashSet<String>, PdlError> {
    let c = design.components.get(component).ok_or_else(|| {
        PdlError::new(
            "PDL-E037",
            format!("Unknown component `{component}`"),
            Some(design.entry_path.clone()),
            None,
            None,
        )
    })?;
    Ok(effective_params(design, c)?
        .into_iter()
        .map(|p| p.name)
        .collect())
}

/// Split dotted / ForEach overrides into kwargs vs instance-root frame props.
fn split_instance_overrides(
    design: &DesignDefinition,
    component: &str,
    overrides: &IndexMap<String, Value>,
) -> Result<(Map<String, Value>, Map<String, Value>), PdlError> {
    let param_names = component_param_names(design, component)?;
    let mut kwargs = Map::new();
    let mut frame_props = Map::new();
    for (k, v) in overrides {
        if param_names.contains(k) {
            kwargs.insert(k.clone(), v.clone());
        } else {
            frame_props.insert(
                k.clone(),
                coerce_frame_prop_value(k, v.clone(), &design.entry_path)?,
            );
        }
    }
    Ok((kwargs, frame_props))
}

fn apply_root_frame_overrides(frame: &mut CatalFrame, props: Map<String, Value>) {
    for (k, v) in props {
        assign_frame_prop(&mut frame.props, &k, v);
    }
}

/// Insert a fully resolved CatalFrame tree into the mutable frame map (letInstance path).
fn insert_catal_tree(frames: &mut HashMap<String, MutableFrame>, catal: &CatalFrame, id: &str) {
    let mut child_entries = Vec::new();
    for (i, ch) in catal.children.iter().enumerate() {
        let cid = if ch.id.is_empty() {
            format!("{id}__c{i}")
        } else {
            format!("{id}__{}", ch.id)
        };
        insert_catal_tree(frames, ch, &cid);
        child_entries.push(ChildEntry::FrameRef {
            id: cid,
            opacity: None,
        });
    }
    frames.insert(
        id.to_string(),
        MutableFrame {
            kind: catal.kind.clone(),
            props: catal.props.clone(),
            child_entries,
            instance_of: catal.instance_of.clone(),
            instance_kwargs: catal.instance_kwargs.clone(),
            foreach_list: catal.foreach_list.clone(),
        },
    );
}

fn root_kind_str(k: RootKind) -> &'static str {
    match k {
        RootKind::Layout => "layout",
        RootKind::Text => "text",
        RootKind::Icon => "icon",
        RootKind::Media => "media",
    }
}

fn strip_leading_dot(s: &str) -> &str {
    s.strip_prefix('.').unwrap_or(s)
}

// ---- frameNumericSugar port -----------------------------------------------

fn is_uniform_edge_inset(prop: &str) -> bool {
    crate::frame_props::is_uniform_edge_inset(prop)
}

fn is_fixed_sizing_axis(prop: &str) -> bool {
    crate::frame_props::is_fixed_sizing_axis(prop)
}

fn assert_scalar_sugar_number(name: &str, n: f64, entry_path: &str) -> Result<(), PdlError> {
    if !n.is_finite() || n < 0.0 {
        return Err(PdlError::new(
            "PDL-E003",
            format!(
                "Property `{}` must be a non-negative finite number when using scalar numeric sugar",
                name
            ),
            Some(entry_path.to_string()),
            None,
            None,
        ));
    }
    Ok(())
}

fn is_unresolved_ref_string(value: &Value) -> bool {
    matches!(
        value.as_str(),
        Some(s) if s.starts_with("primitive:")
            || s.starts_with("semantic:")
            || s.starts_with("typeStyle:")
            || s.starts_with("param:")
    )
}

fn coerce_frame_prop_value(prop: &str, value: Value, entry_path: &str) -> Result<Value, PdlError> {
    if value.is_null() {
        return Ok(value);
    }
    let value = if is_unresolved_ref_string(&value) {
        value
    } else if prop == "icon" {
        crate::asset_refs::coerce_icon_value(value, entry_path)?
    } else if prop == "source" {
        crate::asset_refs::coerce_media_source_value(value, entry_path)?
    } else {
        value
    };
    if is_uniform_edge_inset(prop) {
        if let Value::Number(n) = &value {
            let f = n.as_f64().unwrap_or(0.0);
            assert_scalar_sugar_number(prop, f, entry_path)?;
            let mut o = Map::new();
            o.insert("top".to_string(), value.clone());
            o.insert("right".to_string(), value.clone());
            o.insert("bottom".to_string(), value.clone());
            o.insert("left".to_string(), value);
            return Ok(Value::Object(o));
        }
        return Ok(value);
    }
    if is_fixed_sizing_axis(prop) {
        if let Value::Number(n) = &value {
            let f = n.as_f64().unwrap_or(0.0);
            assert_scalar_sugar_number(prop, f, entry_path)?;
            let mut o = Map::new();
            o.insert("fixed".to_string(), value);
            return Ok(Value::Object(o));
        }
        return Ok(value);
    }
    Ok(value)
}

fn is_resolved_aspect_sizing(v: &Value) -> bool {
    v.as_object()
        .and_then(|o| o.get("aspect"))
        .and_then(|a| a.as_f64())
        .is_some_and(|n| n > 0.0 && n.is_finite())
}

fn is_resolved_closed_sizing(v: Option<&Value>) -> bool {
    let Some(v) = v else {
        return false;
    };
    if v.is_null() {
        return false;
    }
    if v.as_str() == Some("hug") {
        return false;
    }
    if v.as_f64().is_some() {
        return true;
    }
    if v.as_str() == Some("fill") {
        return true;
    }
    if let Some(o) = v.as_object() {
        if o.contains_key("aspect") {
            return false;
        }
        if o.contains_key("fixed") || o.contains_key("flex") {
            return true;
        }
    }
    if let Some(s) = v.as_str() {
        if s.starts_with("primitive:") || s.starts_with("semantic:") || s.starts_with("param:") {
            return true;
        }
    }
    false
}

fn normalize_aspect_box_props(props: &mut Map<String, Value>, entry_path: &str) -> Result<(), PdlError> {
    let w_aspect = props
        .get("width")
        .is_some_and(is_resolved_aspect_sizing);
    let h_aspect = props
        .get("height")
        .is_some_and(is_resolved_aspect_sizing);
    if w_aspect && h_aspect {
        return Err(PdlError::new(
            "PDL-E006",
            "Cannot set `.aspect` on both `width` and `height` — put `.aspect(…)` on the derived axis only"
                .to_string(),
            Some(entry_path.to_string()),
            None,
            None,
        ));
    }
    let ar = props
        .get("aspectRatio")
        .and_then(|v| v.as_f64())
        .filter(|n| *n > 0.0 && n.is_finite());
    let Some(ar) = ar else {
        return Ok(());
    };
    if w_aspect || h_aspect {
        return Err(PdlError::new(
            "PDL-E006",
            "Use either `aspectRatio` or `.aspect(…)` on one axis, not both".to_string(),
            Some(entry_path.to_string()),
            None,
            None,
        ));
    }
    let w_closed = is_resolved_closed_sizing(props.get("width"));
    let h_closed = is_resolved_closed_sizing(props.get("height"));
    if w_closed && h_closed {
        return Err(PdlError::new(
            "PDL-E006",
            "`aspectRatio` conflicts with both `width` and `height` set — leave one axis free or use `height = .aspect(…)` / `width = .aspect(…)`"
                .to_string(),
            Some(entry_path.to_string()),
            None,
            None,
        ));
    }
    if w_closed && !h_closed {
        let mut o = Map::new();
        o.insert("aspect".to_string(), number_value(ar));
        props.insert("height".to_string(), Value::Object(o));
        props.remove("aspectRatio");
    } else if h_closed && !w_closed {
        let mut o = Map::new();
        o.insert("aspect".to_string(), number_value(ar));
        props.insert("width".to_string(), Value::Object(o));
        props.remove("aspectRatio");
    }
    Ok(())
}

/// Later `gap = …` clears prior `columnGap` / `rowGap` (uniform gap replaces per-axis overrides).
/// `null` is stored as a sentinel so bake can clear typeStyle contributions too;
/// final bake omits null keys (`gap = null` does **not** clear columnGap/rowGap).
fn assign_frame_prop(props: &mut Map<String, Value>, name: &str, value: Value) {
    if value.is_null() {
        props.insert(name.to_string(), Value::Null);
        return;
    }
    props.insert(name.to_string(), value);
    if name == "gap" {
        props.remove("columnGap");
        props.remove("rowGap");
    }
}

// ---- evaluation helpers ----------------------------------------------------

fn merge_locals(param_values: &ParamValues, local_values: &ParamValues) -> ParamValues {
    let mut out = param_values.clone();
    for (k, v) in local_values {
        out.insert(k.clone(), v.clone());
    }
    out
}

fn eval_prop(
    expr: &ValueExpr,
    design: &DesignDefinition,
    tokens: &mut Tokens,
    param_values: &ParamValues,
    param_meta: &ParamMeta,
    local_values: &ParamValues,
    opts: ResolveOptions,
) -> Result<Value, PdlError> {
    let scoped = merge_locals(param_values, local_values);
    if opts.catalogue_token_refs {
        if let ValueExpr::Ident { name } = expr {
            if !param_meta.contains_key(name) && !local_values.contains_key(name) {
                if design.primitives.contains_key(name) {
                    return Ok(Value::String(format!("primitive:{name}")));
                }
                if design.semantics.contains_key(name) {
                    return Ok(Value::String(format!("semantic:{name}")));
                }
            }
        }
    }
    let mut visiting = HashSet::new();
    let mut ev = Eval {
        design,
        tokens,
        visiting: &mut visiting,
        param_values: Some(&scoped),
        param_meta: Some(param_meta),
        use_string_placeholders: opts.use_string_placeholders,
    };
    evaluate_value(expr, &mut ev)
}

fn eval_hidden_expr(
    value: &ValueExpr,
    design: &DesignDefinition,
    tokens: &mut Tokens,
    param_values: &ParamValues,
    param_meta: &ParamMeta,
    local_values: &ParamValues,
    opts: ResolveOptions,
) -> Result<bool, PdlError> {
    let scoped = merge_locals(param_values, local_values);
    match value {
        ValueExpr::Condition { expr } => return Ok(evaluate_condition(expr, &scoped)),
        ValueExpr::Boolean { value } => return Ok(*value),
        ValueExpr::DotEnum { value } => {
            let raw = strip_leading_dot(value);
            if raw == "true" || raw == "false" {
                return Ok(raw == "true");
            }
        }
        _ => {}
    }
    let v = eval_prop(
        value,
        design,
        tokens,
        param_values,
        param_meta,
        local_values,
        opts,
    )?;
    if let Value::Bool(b) = v {
        Ok(b)
    } else {
        Err(PdlError::new(
            "PDL-E003",
            "`hidden` must be true, false, .true/.false, or a variant condition",
            Some(design.entry_path.clone()),
            None,
            None,
        ))
    }
}

fn merge_style_props(
    props: &mut Map<String, Value>,
    style_val: Value,
    entry_path: &str,
    catalogue_token_refs: bool,
) -> Result<(), PdlError> {
    let is_type_style = matches!(&style_val, Value::Object(o) if o.contains_key("__typeStyle"));
    if is_type_style {
        if let Value::Object(o) = style_val {
            let name = o.get("__typeStyle").cloned();
            for (k, v) in &o {
                if k == "__typeStyle" {
                    continue;
                }
                let coerced = coerce_frame_prop_value(k, v.clone(), entry_path)?;
                props.insert(k.clone(), coerced);
            }
            if let Some(Value::String(name)) = name {
                let val = if catalogue_token_refs {
                    format!("typeStyle:{name}")
                } else {
                    name
                };
                props.insert("typeStyle".to_string(), Value::String(val));
            }
        }
    } else {
        props.insert("style".to_string(), style_val);
    }
    Ok(())
}

/// Text-root + EditableText → set root `editable = true` unless the author set it.
fn imply_editable_text_root(
    design: &DesignDefinition,
    c: &ComponentDecl,
    frames: &mut HashMap<String, MutableFrame>,
) -> Result<(), PdlError> {
    if root_kind_str(c.root_kind) != "text" {
        return Ok(());
    }
    let hosts = crate::design::effective_host_protocols(design, c)?;
    if !hosts.iter().any(|h| h == "EditableText") {
        return Ok(());
    }
    let Some(root) = frames.get_mut("Root") else {
        return Ok(());
    };
    if !root.props.contains_key("editable") {
        root.props.insert("editable".into(), Value::Bool(true));
    }
    Ok(())
}

fn is_truthy_bool_param(v: &Value) -> bool {
    match v {
        Value::Bool(true) => true,
        Value::String(s) => s == "true" || s == "1",
        _ => false,
    }
}

fn value_param_is_empty(param_values: &ParamValues) -> bool {
    match param_values.get("value") {
        Some(Value::String(s)) => s.is_empty(),
        Some(Value::Null) | None => true,
        Some(v) => match v.as_str() {
            Some(s) => s.is_empty(),
            None => true,
        },
    }
}

/// Keep EditableText derived facts aligned with `value` after defaults / overrides.
///
/// `explicit_overrides` are author/preview knobs only — the injected default
/// `isEmpty = true` must not be treated as “force empty” or it clears every
/// non-empty `value` before sync can derive the fact.
pub(crate) fn sync_editable_text_facts(
    design: &DesignDefinition,
    c: &ComponentDecl,
    param_values: &mut ParamValues,
    explicit_overrides: &Map<String, Value>,
) -> Result<(), PdlError> {
    let hosts = crate::design::effective_host_protocols(design, c)?;
    if !hosts.iter().any(|h| h == "EditableText") {
        return Ok(());
    }
    // Preview / pack knobs: explicit `isEmpty = true` means "show empty chrome"
    // — clear a stale non-empty `value` so layout and session buffer agree.
    if explicit_overrides
        .get("isEmpty")
        .is_some_and(is_truthy_bool_param)
        && !value_param_is_empty(param_values)
    {
        param_values.insert("value".into(), Value::String(String::new()));
    }
    let empty = value_param_is_empty(param_values);
    param_values.insert("isEmpty".into(), Value::Bool(empty));
    // isOverLimit stays false until contentLimit lands in the host.
    if !param_values.contains_key("isOverLimit") {
        param_values.insert("isOverLimit".into(), Value::Bool(false));
    }
    if !param_values.contains_key("isEditing") {
        param_values.insert("isEditing".into(), Value::Bool(false));
    }
    Ok(())
}

/// Resolve component default parameter values (variant → bare string, else evaluated literal).
pub fn resolve_default_param_values(
    design: &DesignDefinition,
    tokens: &mut Tokens,
    c: &ComponentDecl,
) -> Result<ParamValues, PdlError> {
    let mut out = Map::new();
    let empty_pv: ParamValues = Map::new();
    let empty_pm: ParamMeta = IndexMap::new();
    let params = effective_params(design, c)?;
    for p in &params {
        if !p.is_array && design.variants.contains_key(&p.type_name) {
            match &p.default_value {
                ValueExpr::DotEnum { value } => {
                    out.insert(
                        p.name.clone(),
                        Value::String(strip_leading_dot(value).to_string()),
                    );
                }
                _ => {
                    return Err(PdlError::new(
                        "PDL-E010",
                        format!("Variant default must be dot-enum for {}", p.name),
                        None,
                        None,
                        None,
                    ));
                }
            }
        } else {
            let mut visiting = HashSet::new();
            let mut ev = Eval {
                design,
                tokens,
                visiting: &mut visiting,
                param_values: Some(&empty_pv),
                param_meta: Some(&empty_pm),
                use_string_placeholders: false,
            };
            let v = evaluate_value(&p.default_value, &mut ev)?;
            out.insert(p.name.clone(), v);
        }
    }
    Ok(out)
}

fn build_param_meta(design: &DesignDefinition, c: &ComponentDecl) -> Result<ParamMeta, PdlError> {
    let mut m = ParamMeta::new();
    for p in effective_params(design, c)? {
        m.insert(
            p.name,
            crate::evaluate::ParamTypeMeta {
                type_name: p.type_name,
                is_array: p.is_array,
            },
        );
    }
    Ok(m)
}

fn ensure_frame(frames: &mut HashMap<String, MutableFrame>, id: &str, kind: &str) {
    frames
        .entry(id.to_string())
        .or_insert_with(|| MutableFrame {
            kind: kind.to_string(),
            props: Map::new(),
            child_entries: Vec::new(),
            instance_of: None,
            instance_kwargs: None,
            foreach_list: None,
        });
}

fn frame_kind_or_layout(frames: &HashMap<String, MutableFrame>, id: &str) -> String {
    frames
        .get(id)
        .map(|f| f.kind.clone())
        .unwrap_or_else(|| "layout".to_string())
}

fn pick_if_body<'a>(chain: &'a IfChain, param_values: &ParamValues) -> &'a [FrameBodyItem] {
    for br in &chain.branches {
        if evaluate_condition(&br.condition, param_values) {
            return &br.body;
        }
    }
    match &chain.else_body {
        Some(b) => b,
        None => &[],
    }
}

/// Apply a `ForEach` body against one list item's bind scope (item fields ⊕ parent params).
fn eval_foreach_overlay(
    body: &[FrameBodyItem],
    bind_scope: &ParamValues,
    design: &DesignDefinition,
    tokens: &mut Tokens,
    param_meta: &ParamMeta,
    overlay: &mut IndexMap<String, Value>,
) -> Result<(), PdlError> {
    for item in body {
        match item {
            FrameBodyItem::FrameProp { name, value, .. } => {
                let mut visiting = HashSet::new();
                let mut ev = Eval {
                    design,
                    tokens,
                    visiting: &mut visiting,
                    param_values: Some(bind_scope),
                    param_meta: Some(param_meta),
                    use_string_placeholders: false,
                };
                overlay.insert(name.clone(), evaluate_value(value, &mut ev)?);
            }
            FrameBodyItem::If { chain } => {
                let chosen = pick_if_body(chain, bind_scope);
                eval_foreach_overlay(chosen, bind_scope, design, tokens, param_meta, overlay)?;
            }
            FrameBodyItem::LayoutOn { .. } => {
                // Emit capture is host/runtime metadata; static bake ignores it.
            }
            other => {
                return Err(PdlError::new(
                    "PDL-E001",
                    format!(
                        "Internal: unexpected item in ForEach body during resolve: {other:?}"
                    ),
                    Some(design.entry_path.clone()),
                    None,
                    None,
                ));
            }
        }
    }
    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn process_frame_items(
    items: &[FrameBodyItem],
    default_target: &str,
    frames: &mut HashMap<String, MutableFrame>,
    design: &DesignDefinition,
    tokens: &mut Tokens,
    param_values: &ParamValues,
    param_meta: &ParamMeta,
    local_values: &mut ParamValues,
    slot_ctx: &mut SlotResolveCtx,
    opts: ResolveOptions,
    // Enclosing component root id — target of `self.prop` (never an intermediate let).
    component_root_id: &str,
) -> Result<(), PdlError> {
    let root_kind = frames
        .get(default_target)
        .ok_or_else(|| {
            PdlError::new(
                "PDL-E001",
                format!("Internal: frame {default_target} not initialized"),
                None,
                None,
                None,
            )
        })?
        .kind
        .clone();
    ensure_frame(frames, default_target, &root_kind);

    let entry_path = design.entry_path.clone();

    for item in items {
        match item {
            FrameBodyItem::Prop { name, value } => {
                if name == "hidden" {
                    let hidden =
                        eval_hidden_expr(value, design, tokens, param_values, param_meta, local_values, opts)?;
                    let f = frames.get_mut(default_target).unwrap();
                    if hidden {
                        f.props.insert("hidden".to_string(), Value::Bool(true));
                    } else {
                        f.props.remove("hidden");
                    }
                    continue;
                }
                if matches!(value, ValueExpr::Null) {
                    let f = frames.get_mut(default_target).unwrap();
                    if name == "style" {
                        f.props.remove("style");
                        f.props.remove("typeStyle");
                    } else {
                        assign_frame_prop(&mut f.props, name, Value::Null);
                    }
                    continue;
                }
                let v = eval_prop(value, design, tokens, param_values, param_meta, local_values, opts)?;
                if name == "style" {
                    let f = frames.get_mut(default_target).unwrap();
                    merge_style_props(&mut f.props, v, &entry_path, opts.catalogue_token_refs)?;
                } else {
                    let coerced = coerce_frame_prop_value(name, v, &entry_path)?;
                    let f = frames.get_mut(default_target).unwrap();
                    assign_frame_prop(&mut f.props, name, coerced);
                }
            }
            FrameBodyItem::FrameProp { frame, name, value } => {
                let frame_id = if frame == "self" {
                    component_root_id
                } else {
                    frame.as_str()
                };
                // Slot / list param: `simple.content = …` — never invent a phantom frame.
                if let Some(meta) = param_meta.get(frame_id) {
                    if meta.is_array {
                        return Err(PdlError::new(
                            "PDL-E034",
                            format!(
                                "Cannot override `{frame_id}.{name}` on array slot `{frame_id}`; use `ForEach({frame_id}) {{ item in item.{name} = … }}` and `children = [{frame_id}]`"
                            ),
                            Some(entry_path.clone()),
                            None,
                            None,
                        ));
                    }
                    let pv = eval_prop(value, design, tokens, param_values, param_meta, local_values, opts)?;
                    slot_ctx
                        .slot_overrides
                        .entry(frame_id.to_string())
                        .or_default()
                        .insert(name.clone(), pv);
                    continue;
                }
                let kind = frame_kind_or_layout(frames, frame_id);
                ensure_frame(frames, frame_id, &kind);
                if name == "hidden" {
                    let hidden =
                        eval_hidden_expr(value, design, tokens, param_values, param_meta, local_values, opts)?;
                    let fr = frames.get_mut(frame_id).unwrap();
                    if hidden {
                        fr.props.insert("hidden".to_string(), Value::Bool(true));
                    } else {
                        fr.props.remove("hidden");
                    }
                    continue;
                }
                if matches!(value, ValueExpr::Null) {
                    let fr = frames.get_mut(frame_id).unwrap();
                    if name == "style" {
                        fr.props.remove("style");
                        fr.props.remove("typeStyle");
                    } else {
                        assign_frame_prop(&mut fr.props, name, Value::Null);
                    }
                    continue;
                }
                let pv = eval_prop(value, design, tokens, param_values, param_meta, local_values, opts)?;
                if name == "style" {
                    let fr = frames.get_mut(frame_id).unwrap();
                    merge_style_props(&mut fr.props, pv, &entry_path, opts.catalogue_token_refs)?;
                } else {
                    let coerced = coerce_frame_prop_value(name, pv, &entry_path)?;
                    let fr = frames.get_mut(frame_id).unwrap();
                    assign_frame_prop(&mut fr.props, name, coerced);
                }
            }
            FrameBodyItem::Children { target, entries } => {
                let tid = match target {
                    ChildrenTarget::Root => default_target.to_string(),
                    ChildrenTarget::Let { let_id } => let_id.clone(),
                };
                let kind = frame_kind_or_layout(frames, &tid);
                ensure_frame(frames, &tid, &kind);
                frames.get_mut(&tid).unwrap().child_entries = entries.clone();
                // Mount annotations: `Pic @ 0.5` → set child frame opacity (later Pic.opacity wins).
                for e in entries {
                    if let ChildEntry::FrameRef {
                        id: cid,
                        opacity: Some(op),
                    } = e
                    {
                        let ck = frame_kind_or_layout(frames, cid);
                        ensure_frame(frames, cid, &ck);
                        let pv = eval_prop(op, design, tokens, param_values, param_meta, local_values, opts)?;
                        let coerced = coerce_frame_prop_value("opacity", pv, &entry_path)?;
                        let fr = frames.get_mut(cid).unwrap();
                        assign_frame_prop(&mut fr.props, "opacity", coerced);
                    }
                }
            }
            FrameBodyItem::Let {
                id,
                frame_kind,
                body,
            } => {
                ensure_frame(frames, id, frame_kind);
                process_frame_items(
                    body,
                    id,
                    frames,
                    design,
                    tokens,
                    param_values,
                    param_meta,
                    local_values,
                    slot_ctx,
                    opts,
                    component_root_id,
                )?;
            }
            FrameBodyItem::LetValue {
                id,
                type_name: _,
                value,
            } => {
                let v = eval_prop(
                    value,
                    design,
                    tokens,
                    param_values,
                    param_meta,
                    local_values,
                    opts,
                )?;
                local_values.insert(id.clone(), v);
            }
            FrameBodyItem::LetInstance {
                id,
                component,
                kwargs,
            } => {
                if design.components.get(component).is_none() {
                    return Err(PdlError::new(
                        "PDL-E037",
                        format!("Unknown component {component} in let instance"),
                        Some(entry_path.clone()),
                        None,
                        None,
                    ));
                }
                // Defer resolve until ForEach bodies from the rest of the layout
                // are collected (lets often appear above ForEach in source).
                slot_ctx.pending_let_instances.push(PendingLetInstance {
                    id: id.clone(),
                    component: component.clone(),
                    kwargs: kwargs.clone(),
                });
            }
            FrameBodyItem::If { chain } => {
                let scoped = merge_locals(param_values, local_values);
                let extra = pick_if_body(chain, &scoped);
                process_frame_items(
                    extra,
                    default_target,
                    frames,
                    design,
                    tokens,
                    param_values,
                    param_meta,
                    local_values,
                    slot_ctx,
                    opts,
                    component_root_id,
                )?;
            }
            FrameBodyItem::ForEach {
                list,
                item: _,
                body,
            } => {
                // Overlay / handlers only — mount happens via `children = [list]`.
                slot_ctx
                    .foreach_bodies
                    .entry(list.clone())
                    .or_default()
                    .extend(body.iter().cloned());
            }
            FrameBodyItem::LayoutOn { .. } => {
                // Emit capture is host/runtime metadata; static bake ignores it.
            }
            FrameBodyItem::HostHandler { .. } => {
                // Lifted to InteractionDecl at parse; ignore if any remain.
            }
        }
    }
    Ok(())
}

/// Resolve `component_name` into a materialised [`CatalFrame`] tree.
pub fn resolve_component_tree(
    design: &DesignDefinition,
    component_name: &str,
    tokens: &mut Tokens,
    param_overrides: &Map<String, Value>,
    options: ResolveOptions,
) -> Result<CatalFrame, PdlError> {
    resolve_component_tree_with_list_forwards(
        design,
        component_name,
        tokens,
        param_overrides,
        options,
        &HashMap::new(),
    )
}

/// Like [`resolve_component_tree`], but applies parent `ForEach` overlays / list
/// stamps when this component mounts a forwarded list param.
fn resolve_component_tree_with_list_forwards(
    design: &DesignDefinition,
    component_name: &str,
    tokens: &mut Tokens,
    param_overrides: &Map<String, Value>,
    options: ResolveOptions,
    list_forwards: &HashMap<String, ForEachForward>,
) -> Result<CatalFrame, PdlError> {
    let c = design
        .components
        .get(component_name)
        .cloned()
        .ok_or_else(|| {
            PdlError::new(
                "PDL-E037",
                format!("Unknown component {component_name}"),
                Some(design.entry_path.clone()),
                None,
                None,
            )
        })?;
    let mut param_values = resolve_default_param_values(design, tokens, &c)?;
    for (k, v) in param_overrides {
        param_values.insert(k.clone(), v.clone());
    }
    sync_editable_text_facts(design, &c, &mut param_values, param_overrides)?;
    let param_meta = build_param_meta(design, &c)?;
    let mut frames: HashMap<String, MutableFrame> = HashMap::new();
    frames.insert(
        "Root".to_string(),
        MutableFrame {
            kind: root_kind_str(c.root_kind).to_string(),
            props: Map::new(),
            child_entries: Vec::new(),
            instance_of: None,
            instance_kwargs: None,
            foreach_list: None,
        },
    );
    let mut slot_ctx = SlotResolveCtx {
        foreach_forwards: list_forwards.clone(),
        ..Default::default()
    };
    let mut local_values = Map::new();
    process_frame_items(
        &c.body,
        "Root",
        &mut frames,
        design,
        tokens,
        &param_values,
        &param_meta,
        &mut local_values,
        &mut slot_ctx,
        options,
        "Root",
    )?;
    // Resolve deferred let instances now that ForEach overlays are complete.
    let pending = std::mem::take(&mut slot_ctx.pending_let_instances);
    for pending in pending {
        let scoped = merge_locals(&param_values, &local_values);
        let child_forwards = collect_foreach_forwards_for_kwargs(
            &pending.kwargs,
            &slot_ctx,
            &scoped,
            &param_meta,
        );
        let mut kw_explicit = Map::new();
        for (k, expr) in &pending.kwargs {
            let eval_expr = kwargs_expr_for_eval(k, expr, &child_forwards);
            let mut visiting = HashSet::new();
            let mut ev = Eval {
                design,
                tokens,
                visiting: &mut visiting,
                param_values: Some(&scoped),
                param_meta: Some(&param_meta),
                use_string_placeholders: false,
            };
            kw_explicit.insert(k.clone(), evaluate_value(eval_expr, &mut ev)?);
        }
        let mut sub = resolve_component_tree_with_list_forwards(
            design,
            &pending.component,
            tokens,
            &kw_explicit,
            options,
            &child_forwards,
        )?;
        sub.instance_of = Some(pending.component.clone());
        sub.instance_kwargs = Some(kw_explicit);
        insert_catal_tree(&mut frames, &sub, &pending.id);
    }
    // EditableText on a text-root component implies an editable leaf — no author
    // `editable = true` required (session bind is always protocol `value`).
    imply_editable_text_root(design, &c, &mut frames)?;
    for mf in frames.values_mut() {
        normalize_aspect_box_props(&mut mf.props, &design.entry_path)?;
    }
    materialize(
        "Root",
        &frames,
        design,
        tokens,
        &param_values,
        &param_meta,
        &slot_ctx,
        &mut HashSet::new(),
        options,
    )
}

fn mount_instance(
    parent_id: &str,
    component: &str,
    kw_overrides: Map<String, Value>,
    design: &DesignDefinition,
    tokens: &mut Tokens,
    visiting_inst: &mut HashSet<String>,
    options: ResolveOptions,
    si: &mut usize,
    list_forwards: &HashMap<String, ForEachForward>,
) -> Result<CatalFrame, PdlError> {
    let key = format!("{parent_id}>{component}");
    if visiting_inst.contains(&key) {
        return Err(PdlError::new(
            "PDL-E004",
            format!("Recursive component instance {component}"),
            None,
            None,
            None,
        ));
    }
    visiting_inst.insert(key.clone());
    let mut sub = resolve_component_tree_with_list_forwards(
        design,
        component,
        tokens,
        &kw_overrides,
        options,
        list_forwards,
    )?;
    visiting_inst.remove(&key);
    sub.id = format!("{parent_id}_{component}_{si}");
    *si += 1;
    sub.instance_of = Some(component.to_string());
    sub.instance_kwargs = Some(kw_overrides);
    Ok(sub)
}

/// Expand slot / list instances from `children = […]`, applying slot + ForEach overlays.
fn expand_slot_items(
    parent_id: &str,
    slot_name: &str,
    items: &[Value],
    design: &DesignDefinition,
    tokens: &mut Tokens,
    param_values: &ParamValues,
    param_meta: &ParamMeta,
    slot_ctx: &SlotResolveCtx,
    visiting_inst: &mut HashSet<String>,
    options: ResolveOptions,
    si: &mut usize,
    children: &mut Vec<CatalFrame>,
) -> Result<(), PdlError> {
    let local_body = slot_ctx.foreach_bodies.get(slot_name);
    let forwarded = slot_ctx.foreach_forwards.get(slot_name);
    let (foreach_body, bind_params, bind_meta, stamp_list): (
        Option<&[FrameBodyItem]>,
        &ParamValues,
        &ParamMeta,
        Option<String>,
    ) = if let Some(body) = local_body {
        (
            Some(body.as_slice()),
            param_values,
            param_meta,
            Some(slot_name.to_string()),
        )
    } else if let Some(fwd) = forwarded {
        (
            Some(fwd.body.as_slice()),
            &fwd.owner_params,
            &fwd.owner_param_meta,
            Some(fwd.owner_list.clone()),
        )
    } else {
        (None, param_values, param_meta, None)
    };
    let slot_dotted = slot_ctx.slot_overrides.get(slot_name);

    for item in items {
        let obj = item.as_object().ok_or_else(|| {
            PdlError::new(
                "PDL-E010",
                "Slot array items must be instance objects `{ component, params }`",
                Some(design.entry_path.clone()),
                None,
                None,
            )
        })?;
        let component = obj
            .get("component")
            .and_then(|v| v.as_str())
            .ok_or_else(|| {
                PdlError::new(
                    "PDL-E010",
                    "Slot instance missing `component`",
                    Some(design.entry_path.clone()),
                    None,
                    None,
                )
            })?;
        let mut base_params = match obj.get("params") {
            Some(Value::Object(m)) => m.clone(),
            None => Map::new(),
            Some(_) => {
                return Err(PdlError::new(
                    "PDL-E010",
                    "Slot instance `params` must be an object",
                    Some(design.entry_path.clone()),
                    None,
                    None,
                ))
            }
        };

        // Collect evaluated overrides (ForEach body + single-slot dotted).
        let mut overlay: IndexMap<String, Value> = IndexMap::new();
        if let Some(body) = foreach_body {
            // §4e: bare idents → item fields first, then enclosing params.
            let mut bind_scope = bind_params.clone();
            for (k, v) in &base_params {
                bind_scope.insert(k.clone(), v.clone());
            }
            eval_foreach_overlay(body, &bind_scope, design, tokens, bind_meta, &mut overlay)?;
        }
        if let Some(dotted) = slot_dotted {
            for (k, v) in dotted {
                overlay.insert(k.clone(), v.clone());
            }
        }

        let (extra_kwargs, frame_props) = split_instance_overrides(design, component, &overlay)?;
        for (k, v) in extra_kwargs {
            base_params.insert(k, v);
        }

        let mut mounted = mount_instance(
            parent_id,
            component,
            base_params,
            design,
            tokens,
            visiting_inst,
            options,
            si,
            &HashMap::new(),
        )?;
        apply_root_frame_overrides(&mut mounted, frame_props);
        // Stamp owning list (local ForEach name, or parent list when forwarded).
        // Emit-capture catalogue qualifies by list name; hosts match via this field.
        if let Some(list) = &stamp_list {
            mounted.foreach_list = Some(list.clone());
        }
        children.push(mounted);
    }
    Ok(())
}

fn materialize(
    id: &str,
    frames: &HashMap<String, MutableFrame>,
    design: &DesignDefinition,
    tokens: &mut Tokens,
    param_values: &ParamValues,
    param_meta: &ParamMeta,
    slot_ctx: &SlotResolveCtx,
    visiting_inst: &mut HashSet<String>,
    options: ResolveOptions,
) -> Result<CatalFrame, PdlError> {
    let mf = frames.get(id).ok_or_else(|| {
        PdlError::new("PDL-E001", format!("Missing frame {id}"), None, None, None)
    })?;
    let mut children = Vec::new();
    let mut si = 0;
    for ch in &mf.child_entries {
        match ch {
            ChildEntry::Spacer => {
                children.push(CatalFrame {
                    id: format!("{id}_spacer_{si}"),
                    kind: "spacer".to_string(),
                    props: Map::new(),
                    children: Vec::new(),
                    instance_of: None,
                    instance_kwargs: None,
                    foreach_list: None,
                });
                si += 1;
            }
            ChildEntry::FrameRef { id: cid, opacity: _ } => {
                if frames.contains_key(cid) {
                    children.push(materialize(
                        cid,
                        frames,
                        design,
                        tokens,
                        param_values,
                        param_meta,
                        slot_ctx,
                        visiting_inst,
                        options,
                    )?);
                } else if let Some(meta) = param_meta.get(cid) {
                    // Expandable list/slot param referenced in `children`.
                    let val = param_values.get(cid).ok_or_else(|| {
                        PdlError::new(
                            "PDL-E007",
                            format!("Missing value for slot param `{cid}`"),
                            Some(design.entry_path.clone()),
                            None,
                            None,
                        )
                    })?;
                    if meta.is_array {
                        let items = val.as_array().ok_or_else(|| {
                            PdlError::new(
                                "PDL-E010",
                                format!("Array slot param `{cid}` must evaluate to an array"),
                                Some(design.entry_path.clone()),
                                None,
                                None,
                            )
                        })?;
                        expand_slot_items(
                            id,
                            cid,
                            items,
                            design,
                            tokens,
                            param_values,
                            param_meta,
                            slot_ctx,
                            visiting_inst,
                            options,
                            &mut si,
                            &mut children,
                        )?;
                    } else {
                        expand_slot_items(
                            id,
                            cid,
                            std::slice::from_ref(val),
                            design,
                            tokens,
                            param_values,
                            param_meta,
                            slot_ctx,
                            visiting_inst,
                            options,
                            &mut si,
                            &mut children,
                        )?;
                    }
                } else {
                    return Err(PdlError::new(
                        "PDL-E001",
                        format!("Missing frame {cid}"),
                        None,
                        None,
                        None,
                    ));
                }
            }
            ChildEntry::Instance {
                component,
                kwargs,
                opacity,
            } => {
                let child_forwards = collect_foreach_forwards_for_kwargs(
                    kwargs,
                    slot_ctx,
                    param_values,
                    param_meta,
                );
                let mut kw_overrides = Map::new();
                for (k, expr) in kwargs {
                    let eval_expr = kwargs_expr_for_eval(k, expr, &child_forwards);
                    let mut visiting = HashSet::new();
                    let mut ev = Eval {
                        design,
                        tokens,
                        visiting: &mut visiting,
                        param_values: Some(param_values),
                        param_meta: Some(param_meta),
                        use_string_placeholders: false,
                    };
                    kw_overrides.insert(k.clone(), evaluate_value(eval_expr, &mut ev)?);
                }
                let mut child = mount_instance(
                    id,
                    component,
                    kw_overrides,
                    design,
                    tokens,
                    visiting_inst,
                    options,
                    &mut si,
                    &child_forwards,
                )?;
                if let Some(op) = opacity {
                    let mut visiting = HashSet::new();
                    let mut ev = Eval {
                        design,
                        tokens,
                        visiting: &mut visiting,
                        param_values: Some(param_values),
                        param_meta: Some(param_meta),
                        use_string_placeholders: false,
                    };
                    let pv = evaluate_value(op, &mut ev)?;
                    let coerced = coerce_frame_prop_value("opacity", pv, &design.entry_path)?;
                    assign_frame_prop(&mut child.props, "opacity", coerced);
                }
                children.push(child);
            }
            ChildEntry::ForEach { .. } => {
                // Legacy IR path — ForEach no longer auto-mounts; ignore if present.
            }
            ChildEntry::FrameCtor { .. } => {
                return Err(PdlError::new(
                    "PDL-E001",
                    "Internal: World A frameCtor survived past parse lowering".to_string(),
                    None,
                    None,
                    None,
                ));
            }
        }
    }
    Ok(CatalFrame {
        id: id.to_string(),
        kind: mf.kind.clone(),
        props: mf.props.clone(),
        children,
        instance_of: mf.instance_of.clone(),
        instance_kwargs: if mf.instance_of.is_some() {
            Some(mf.instance_kwargs.clone().unwrap_or_default())
        } else {
            None
        },
        foreach_list: mf.foreach_list.clone(),
    })
}
