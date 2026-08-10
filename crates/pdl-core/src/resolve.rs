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
    }
}

struct MutableFrame {
    kind: String,
    props: Map<String, Value>,
    child_entries: Vec<ChildEntry>,
    instance_of: Option<String>,
    instance_kwargs: Option<Map<String, Value>>,
}

/// Slot / ForEach overlays collected while walking a component body (do not mount).
#[derive(Default)]
struct SlotResolveCtx {
    /// `simple.title = …` / `simple.content = …` — classified at mount by concrete component.
    slot_overrides: HashMap<String, IndexMap<String, Value>>,
    /// `ForEach(chips) { chip in chip.selected = … }` binds applied when `children` expands `chips`.
    foreach_binds: HashMap<String, IndexMap<String, ValueExpr>>,
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
        child_entries.push(ChildEntry::FrameRef { id: cid });
    }
    frames.insert(
        id.to_string(),
        MutableFrame {
            kind: catal.kind.clone(),
            props: catal.props.clone(),
            child_entries,
            instance_of: catal.instance_of.clone(),
            instance_kwargs: catal.instance_kwargs.clone(),
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

fn coerce_frame_prop_value(prop: &str, value: Value, entry_path: &str) -> Result<Value, PdlError> {
    if value.is_null() {
        return Ok(value);
    }
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

/// Later `gap = …` clears prior `columnGap` / `rowGap` (uniform gap replaces per-axis overrides).
fn assign_frame_prop(props: &mut Map<String, Value>, name: &str, value: Value) {
    props.insert(name.to_string(), value);
    if name == "gap" {
        props.remove("columnGap");
        props.remove("rowGap");
    }
}

// ---- evaluation helpers ----------------------------------------------------

fn eval_prop(
    expr: &ValueExpr,
    design: &DesignDefinition,
    tokens: &mut Tokens,
    param_values: &ParamValues,
    param_meta: &ParamMeta,
    opts: ResolveOptions,
) -> Result<Value, PdlError> {
    if opts.catalogue_token_refs {
        if let ValueExpr::Ident { name } = expr {
            if !param_meta.contains_key(name) {
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
        param_values: Some(param_values),
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
    opts: ResolveOptions,
) -> Result<bool, PdlError> {
    match value {
        ValueExpr::Condition { expr } => return Ok(evaluate_condition(expr, param_values)),
        ValueExpr::Boolean { value } => return Ok(*value),
        ValueExpr::DotEnum { value } => {
            let raw = strip_leading_dot(value);
            if raw == "true" || raw == "false" {
                return Ok(raw == "true");
            }
        }
        _ => {}
    }
    let v = eval_prop(value, design, tokens, param_values, param_meta, opts)?;
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

#[allow(clippy::too_many_arguments)]
fn process_frame_items(
    items: &[FrameBodyItem],
    default_target: &str,
    frames: &mut HashMap<String, MutableFrame>,
    design: &DesignDefinition,
    tokens: &mut Tokens,
    param_values: &ParamValues,
    param_meta: &ParamMeta,
    slot_ctx: &mut SlotResolveCtx,
    opts: ResolveOptions,
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
                        eval_hidden_expr(value, design, tokens, param_values, param_meta, opts)?;
                    let f = frames.get_mut(default_target).unwrap();
                    if hidden {
                        f.props.insert("hidden".to_string(), Value::Bool(true));
                    } else {
                        f.props.remove("hidden");
                    }
                    continue;
                }
                let v = eval_prop(value, design, tokens, param_values, param_meta, opts)?;
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
                // Slot / list param: `simple.content = …` — never invent a phantom frame.
                if let Some(meta) = param_meta.get(frame) {
                    if meta.is_array {
                        return Err(PdlError::new(
                            "PDL-E034",
                            format!(
                                "Cannot override `{frame}.{name}` on array slot `{frame}`; use `ForEach({frame}) {{ item in item.{name} = … }}` and `children = [{frame}]`"
                            ),
                            Some(entry_path.clone()),
                            None,
                            None,
                        ));
                    }
                    let pv = eval_prop(value, design, tokens, param_values, param_meta, opts)?;
                    slot_ctx
                        .slot_overrides
                        .entry(frame.clone())
                        .or_default()
                        .insert(name.clone(), pv);
                    continue;
                }
                let kind = frame_kind_or_layout(frames, frame);
                ensure_frame(frames, frame, &kind);
                if name == "hidden" {
                    let hidden =
                        eval_hidden_expr(value, design, tokens, param_values, param_meta, opts)?;
                    let fr = frames.get_mut(frame).unwrap();
                    if hidden {
                        fr.props.insert("hidden".to_string(), Value::Bool(true));
                    } else {
                        fr.props.remove("hidden");
                    }
                    continue;
                }
                let pv = eval_prop(value, design, tokens, param_values, param_meta, opts)?;
                let coerced = coerce_frame_prop_value(name, pv, &entry_path)?;
                let fr = frames.get_mut(frame).unwrap();
                assign_frame_prop(&mut fr.props, name, coerced);
            }
            FrameBodyItem::Children { target, entries } => {
                let tid = match target {
                    ChildrenTarget::Root => default_target.to_string(),
                    ChildrenTarget::Let { let_id } => let_id.clone(),
                };
                let kind = frame_kind_or_layout(frames, &tid);
                ensure_frame(frames, &tid, &kind);
                frames.get_mut(&tid).unwrap().child_entries = entries.clone();
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
                    slot_ctx,
                    opts,
                )?;
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
                let mut kw_explicit = Map::new();
                for (k, expr) in kwargs {
                    let mut visiting = HashSet::new();
                    let mut ev = Eval {
                        design,
                        tokens,
                        visiting: &mut visiting,
                        param_values: Some(param_values),
                        param_meta: Some(param_meta),
                        use_string_placeholders: false,
                    };
                    kw_explicit.insert(k.clone(), evaluate_value(expr, &mut ev)?);
                }
                // Full nested resolve so the child's slot dotted overrides / ForEach
                // expand against the child's own param_meta (not the parent's).
                let mut sub =
                    resolve_component_tree(design, component, tokens, &kw_explicit, opts)?;
                sub.instance_of = Some(component.clone());
                sub.instance_kwargs = Some(kw_explicit);
                insert_catal_tree(frames, &sub, id);
            }
            FrameBodyItem::If { chain } => {
                let extra = pick_if_body(chain, param_values);
                process_frame_items(
                    extra,
                    default_target,
                    frames,
                    design,
                    tokens,
                    param_values,
                    param_meta,
                    slot_ctx,
                    opts,
                )?;
            }
            FrameBodyItem::ForEach {
                list,
                item: _,
                binds,
                handlers: _,
            } => {
                // Binds / handlers only — mount happens via `children = [list]`.
                slot_ctx
                    .foreach_binds
                    .entry(list.clone())
                    .or_default()
                    .extend(binds.iter().map(|(k, v)| (k.clone(), v.clone())));
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
        },
    );
    let mut slot_ctx = SlotResolveCtx::default();
    process_frame_items(
        &c.body,
        "Root",
        &mut frames,
        design,
        tokens,
        &param_values,
        &param_meta,
        &mut slot_ctx,
        options,
    )?;
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
    let mut sub = resolve_component_tree(design, component, tokens, &kw_overrides, options)?;
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
    let foreach_binds = slot_ctx.foreach_binds.get(slot_name);
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

        // Collect evaluated overrides (ForEach binds + single-slot dotted).
        let mut overlay: IndexMap<String, Value> = IndexMap::new();
        if let Some(binds) = foreach_binds {
            // §4e: bare idents → item fields first, then enclosing params.
            let mut bind_scope = param_values.clone();
            for (k, v) in &base_params {
                bind_scope.insert(k.clone(), v.clone());
            }
            for (k, expr) in binds {
                let mut visiting = HashSet::new();
                let mut ev = Eval {
                    design,
                    tokens,
                    visiting: &mut visiting,
                    param_values: Some(&bind_scope),
                    param_meta: Some(param_meta),
                    use_string_placeholders: false,
                };
                overlay.insert(k.clone(), evaluate_value(expr, &mut ev)?);
            }
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
        )?;
        apply_root_frame_overrides(&mut mounted, frame_props);
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
                });
                si += 1;
            }
            ChildEntry::FrameRef { id: cid } => {
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
            ChildEntry::Instance { component, kwargs } => {
                let mut kw_overrides = Map::new();
                for (k, expr) in kwargs {
                    let mut visiting = HashSet::new();
                    let mut ev = Eval {
                        design,
                        tokens,
                        visiting: &mut visiting,
                        param_values: Some(param_values),
                        param_meta: Some(param_meta),
                        use_string_placeholders: false,
                    };
                    kw_overrides.insert(k.clone(), evaluate_value(expr, &mut ev)?);
                }
                children.push(mount_instance(
                    id,
                    component,
                    kw_overrides,
                    design,
                    tokens,
                    visiting_inst,
                    options,
                    &mut si,
                )?);
            }
            ChildEntry::ForEach { .. } => {
                // Legacy IR path — ForEach no longer auto-mounts; ignore if present.
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
    })
}
