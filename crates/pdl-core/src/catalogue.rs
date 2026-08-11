//! Component catalogue (`graphSystem` / `catalogue`).
//!
//! Rust port of `src/catalogue.ts`. Emits the stable `componentCatalogue` JSON
//! document (token layers + one catalogue row per component) that the TypeScript
//! oracle produces, so goldens compare byte-for-byte after `stable_stringify`
//! with `omit_empty`.

use std::collections::{BTreeSet, HashMap};

use indexmap::IndexMap;
use serde_json::{Map, Value};

use crate::ast::*;
use crate::bake::{now_iso8601, PDL_JSON_SCHEMA_VERSION};
use crate::design::{effective_emits, effective_params, DesignDefinition};
use crate::error::PdlError;
use crate::evaluate::{build_resolved_token_map, evaluate_value, Eval, ParamMeta, ParamValues, Tokens};
use crate::graph_serialize::{
    serialise_condition_expr, serialise_value_expr, serialise_value_expr_with_token_refs,
};
use crate::resolve::{
    is_hidden_frame, resolve_component_tree, resolve_default_param_values, CatalFrame,
    RESOLVE_OPTIONS_GRAPH_CATALOGUE,
};
use crate::rules_json::rule_line_to_def;

fn json_compact(v: &Value) -> String {
    serde_json::to_string(v).unwrap_or_default()
}

fn obj(entries: Vec<(&str, Value)>) -> Value {
    let mut m = Map::new();
    for (k, v) in entries {
        m.insert(k.to_string(), v);
    }
    Value::Object(m)
}

fn strip_dot(s: &str) -> &str {
    s.strip_prefix('.').unwrap_or(s)
}

// ---- condition helpers -----------------------------------------------------

fn negate_condition(c: &ConditionExpr) -> ConditionExpr {
    match c {
        ConditionExpr::Truthy { param } => ConditionExpr::Cmp {
            param: param.clone(),
            op: crate::ast::CmpOp::Eq,
            rhs: "false".to_string(),
            rhs_is_param: false,
        },
        other => ConditionExpr::Not {
            expr: Box::new(other.clone()),
        },
    }
}

fn conjoin_when(outer: Option<ConditionExpr>, inner: Option<ConditionExpr>) -> Option<ConditionExpr> {
    match (outer, inner) {
        (None, inner) => inner,
        (outer, None) => outer,
        (Some(o), Some(i)) => Some(ConditionExpr::And { items: vec![o, i] }),
    }
}

fn conjoin_many(conjuncts: Vec<ConditionExpr>) -> Option<ConditionExpr> {
    match conjuncts.len() {
        0 => None,
        1 => conjuncts.into_iter().next(),
        _ => Some(ConditionExpr::And { items: conjuncts }),
    }
}

// ---- rules flattening ------------------------------------------------------

fn effective_rule_tags(statements: &[RulesStatement]) -> Vec<String> {
    let mut t: Vec<String> = Vec::new();
    for st in statements {
        match st {
            RulesStatement::TagsSet { tags } => t = tags.clone(),
            RulesStatement::TagsAdd { tag } => t.push(tag.clone()),
            _ => {}
        }
    }
    t
}

/// Flattened rule + optional `when` condition (from enclosing `if` branches).
struct FlatRule {
    def: Value,
    when: Option<ConditionExpr>,
}

fn flatten_rules_with_when(statements: &[RulesStatement]) -> Vec<FlatRule> {
    let mut out: Vec<FlatRule> = Vec::new();
    walk_rules(statements, None, &mut out);
    out
}

fn walk_rules(xs: &[RulesStatement], parent_when: Option<ConditionExpr>, out: &mut Vec<FlatRule>) {
    for st in xs {
        match st {
            RulesStatement::RuleLine {
                strength,
                query,
                description,
            } => {
                let def = rule_line_to_def(strength, query, description.as_deref());
                out.push(FlatRule {
                    def,
                    when: parent_when.clone(),
                });
            }
            RulesStatement::If { chain } => {
                let mut neg_prior: Vec<ConditionExpr> = Vec::new();
                for br in &chain.branches {
                    let inner_when: ConditionExpr = if neg_prior.is_empty() {
                        br.condition.clone()
                    } else {
                        let mut conjuncts: Vec<ConditionExpr> =
                            neg_prior.iter().map(negate_condition).collect();
                        conjuncts.push(br.condition.clone());
                        conjoin_many(conjuncts).expect("non-empty conjuncts")
                    };
                    let when = conjoin_when(parent_when.clone(), Some(inner_when));
                    walk_rules(&br.body, when, out);
                    neg_prior.push(br.condition.clone());
                }
                if let Some(else_body) = &chain.else_body {
                    let else_inner = if neg_prior.is_empty() {
                        None
                    } else {
                        conjoin_many(neg_prior.iter().map(negate_condition).collect())
                    };
                    let else_when = conjoin_when(parent_when.clone(), else_inner);
                    walk_rules(else_body, else_when, out);
                }
            }
            _ => {}
        }
    }
}

// ---- interaction serialisation ---------------------------------------------

fn serialise_interaction_handler_item(item: &InteractionHandlerItem) -> Value {
    match item {
        InteractionHandlerItem::Assign { param, value } => obj(vec![
            ("kind", Value::String("assign".to_string())),
            ("param", Value::String(param.clone())),
            ("value", serialise_value_expr(value)),
        ]),
        InteractionHandlerItem::Animate { value } => obj(vec![
            ("kind", Value::String("animate".to_string())),
            ("value", serialise_value_expr(value)),
        ]),
        InteractionHandlerItem::Emit { name, args } => obj(vec![
            ("kind", Value::String("emit".to_string())),
            ("name", Value::String(name.clone())),
            (
                "args",
                Value::Array(args.iter().map(|a| Value::String(a.clone())).collect()),
            ),
        ]),
        InteractionHandlerItem::HostVerb { name, args } => obj(vec![
            ("kind", Value::String("hostVerb".to_string())),
            ("name", Value::String(name.clone())),
            (
                "args",
                Value::Array(args.iter().map(|a| Value::String(a.clone())).collect()),
            ),
        ]),
        InteractionHandlerItem::If { chain } => obj(vec![
            ("kind", Value::String("if".to_string())),
            ("chain", serialise_interaction_if_chain(chain)),
        ]),
    }
}

fn serialise_interaction_if_chain(chain: &InteractionIfChain) -> Value {
    let branches: Vec<Value> = chain
        .branches
        .iter()
        .map(|br| {
            obj(vec![
                ("condition", serialise_condition_expr(&br.condition)),
                (
                    "body",
                    Value::Array(br.body.iter().map(serialise_interaction_handler_item).collect()),
                ),
            ])
        })
        .collect();
    let mut entries = vec![("branches", Value::Array(branches))];
    if let Some(else_body) = &chain.else_body {
        entries.push((
            "elseBody",
            Value::Array(
                else_body
                    .iter()
                    .map(serialise_interaction_handler_item)
                    .collect(),
            ),
        ));
    }
    obj(entries)
}

fn serialise_interaction_decl(decl: &InteractionDecl) -> Value {
    let handlers: Vec<Value> = decl
        .handlers
        .iter()
        .map(|h| {
            obj(vec![
                ("event", Value::String(h.event.clone())),
                (
                    "body",
                    Value::Array(h.body.iter().map(serialise_interaction_handler_item).collect()),
                ),
            ])
        })
        .collect();
    obj(vec![
        ("name", Value::String(decl.name.clone())),
        ("component", Value::String(decl.component.clone())),
        ("handlers", Value::Array(handlers)),
    ])
}

fn serialise_layout_on_handler(handler: &LayoutOnHandler, default_qualifier: Option<&str>) -> Value {
    let payload: Vec<Value> = handler
        .payload
        .iter()
        .map(|a| {
            obj(vec![
                ("name", Value::String(a.name.clone())),
                ("type", Value::String(a.type_name.clone())),
            ])
        })
        .collect();
    let body: Vec<Value> = handler
        .body
        .iter()
        .map(|a| {
            obj(vec![
                ("kind", Value::String("assign".to_string())),
                ("param", Value::String(a.param.clone())),
                ("value", serialise_value_expr(&a.value)),
            ])
        })
        .collect();
    let qualifier = handler
        .qualifier
        .clone()
        .or_else(|| default_qualifier.map(|s| s.to_string()));
    let mut entries = vec![
        ("channel", Value::String(handler.channel.clone())),
        ("payload", Value::Array(payload)),
        ("body", Value::Array(body)),
    ];
    if let Some(q) = qualifier {
        entries.insert(0, ("qualifier", Value::String(q)));
    }
    obj(entries)
}

fn collect_emit_captures_from_body(items: &[FrameBodyItem], out: &mut Vec<Value>) {
    for item in items {
        match item {
            FrameBodyItem::ForEach { list, body, .. } => {
                for h in crate::ast::foreach_layout_handlers(body) {
                    out.push(serialise_layout_on_handler(h, Some(list.as_str())));
                }
            }
            FrameBodyItem::LayoutOn { handler } => {
                out.push(serialise_layout_on_handler(handler, None));
            }
            FrameBodyItem::Let { body, .. } => collect_emit_captures_from_body(body, out),
            FrameBodyItem::If { chain } => {
                for br in &chain.branches {
                    collect_emit_captures_from_body(&br.body, out);
                }
                if let Some(else_body) = &chain.else_body {
                    collect_emit_captures_from_body(else_body, out);
                }
            }
            _ => {}
        }
    }
}

// ---- frame / registry helpers ----------------------------------------------

/// Single-frame shell for the `childNodes` registry (no nested children).
fn catal_frame_shell(f: &CatalFrame) -> CatalFrame {
    CatalFrame {
        id: f.id.clone(),
        kind: f.kind.clone(),
        props: f.props.clone(),
        children: Vec::new(),
        instance_of: f.instance_of.clone(),
        instance_kwargs: if f.instance_of.is_some() {
            Some(f.instance_kwargs.clone().unwrap_or_default())
        } else {
            None
        },
    }
}

fn merge_registry_from_tree(tree: &CatalFrame, sink: &mut IndexMap<String, CatalFrame>) {
    if tree.id != "Root" && !sink.contains_key(&tree.id) {
        sink.insert(tree.id.clone(), catal_frame_shell(tree));
    }
    for ch in &tree.children {
        merge_registry_from_tree(ch, sink);
    }
}

fn build_child_node_registry(scan_trees: &[CatalFrame]) -> IndexMap<String, CatalFrame> {
    let mut sink: IndexMap<String, CatalFrame> = IndexMap::new();
    for t in scan_trees {
        merge_registry_from_tree(t, &mut sink);
    }
    sink
}

fn extract_visible_child_map(tree: &CatalFrame) -> IndexMap<String, Vec<String>> {
    let mut m: IndexMap<String, Vec<String>> = IndexMap::new();
    walk_visible(tree, &mut m);
    m
}

fn walk_visible(f: &CatalFrame, m: &mut IndexMap<String, Vec<String>>) {
    let vis: Vec<String> = f
        .children
        .iter()
        .filter(|ch| !is_hidden_frame(ch))
        .map(|ch| ch.id.clone())
        .collect();
    m.insert(f.id.clone(), vis);
    for ch in &f.children {
        walk_visible(ch, m);
    }
}

/// Frame id → visible direct child ids, sorted by frame id.
fn visible_child_hierarchy_map(tree: &CatalFrame) -> IndexMap<String, Vec<String>> {
    let m = extract_visible_child_map(tree);
    let mut keys: Vec<&String> = m.keys().collect();
    keys.sort();
    let mut out: IndexMap<String, Vec<String>> = IndexMap::new();
    for k in keys {
        out.insert(k.clone(), m[k].clone());
    }
    out
}

fn hierarchy_to_value(m: &IndexMap<String, Vec<String>>) -> Value {
    let mut o = Map::new();
    for (k, v) in m {
        o.insert(
            k.clone(),
            Value::Array(v.iter().map(|s| Value::String(s.clone())).collect()),
        );
    }
    Value::Object(o)
}

// ---- variant prop diffing --------------------------------------------------

struct FrameSurface {
    props: Map<String, Value>,
    instance_of: Option<String>,
    instance_kwargs: Map<String, Value>,
}

fn collect_frame_surface_by_id(f: &CatalFrame, sink: &mut HashMap<String, FrameSurface>) {
    sink.insert(
        f.id.clone(),
        FrameSurface {
            props: f.props.clone(),
            instance_of: f.instance_of.clone(),
            instance_kwargs: f.instance_kwargs.clone().unwrap_or_default(),
        },
    );
    for ch in &f.children {
        collect_frame_surface_by_id(ch, sink);
    }
}

struct Change {
    frame_id: String,
    prop: String,
    value: Value,
}

fn diff_frame_props_by_id(a: &CatalFrame, b: &CatalFrame) -> Vec<Change> {
    let mut map_a: HashMap<String, FrameSurface> = HashMap::new();
    let mut map_b: HashMap<String, FrameSurface> = HashMap::new();
    collect_frame_surface_by_id(a, &mut map_a);
    collect_frame_surface_by_id(b, &mut map_b);

    let mut ids: BTreeSet<String> = BTreeSet::new();
    ids.extend(map_a.keys().cloned());
    ids.extend(map_b.keys().cloned());

    let empty_props: Map<String, Value> = Map::new();
    let empty_kwargs: Map<String, Value> = Map::new();
    let mut changes: Vec<Change> = Vec::new();

    for id in &ids {
        let fa = map_a.get(id);
        let fb = map_b.get(id);
        let pa = fa.map(|s| &s.props).unwrap_or(&empty_props);
        let pb = fb.map(|s| &s.props).unwrap_or(&empty_props);
        let a_instance_of = fa.and_then(|s| s.instance_of.clone());
        let b_instance_of = fb.and_then(|s| s.instance_of.clone());
        let a_kwargs = fa.map(|s| &s.instance_kwargs).unwrap_or(&empty_kwargs);
        let b_kwargs = fb.map(|s| &s.instance_kwargs).unwrap_or(&empty_kwargs);

        let mut keys: BTreeSet<String> = BTreeSet::new();
        keys.extend(pa.keys().cloned());
        keys.extend(pb.keys().cloned());
        for k in &keys {
            let sa = pa.get(k).map(json_compact);
            let sb = pb.get(k).map(json_compact);
            if sa != sb {
                let value = pb.get(k).cloned().unwrap_or(Value::Null);
                changes.push(Change {
                    frame_id: id.clone(),
                    prop: k.clone(),
                    value,
                });
            }
        }

        if a_instance_of != b_instance_of {
            let value = match &b_instance_of {
                Some(s) => Value::String(s.clone()),
                None => Value::Null,
            };
            changes.push(Change {
                frame_id: id.clone(),
                prop: "instanceOf".to_string(),
                value,
            });
        }

        let a_kwargs_v = Value::Object(a_kwargs.clone());
        let b_kwargs_v = Value::Object(b_kwargs.clone());
        if json_compact(&a_kwargs_v) != json_compact(&b_kwargs_v) {
            changes.push(Change {
                frame_id: id.clone(),
                prop: "instanceKwargs".to_string(),
                value: b_kwargs_v,
            });
        }
    }

    changes
}

fn strip_changes_redundant_with_registry(
    changes: Vec<Change>,
    child_nodes: &IndexMap<String, CatalFrame>,
) -> Vec<Change> {
    changes
        .into_iter()
        .filter(|ch| {
            let shell = match child_nodes.get(&ch.frame_id) {
                Some(s) => s,
                None => return true,
            };
            if ch.prop == "instanceOf" {
                let v = match &shell.instance_of {
                    Some(s) => Value::String(s.clone()),
                    None => Value::Null,
                };
                return json_compact(&v) != json_compact(&ch.value);
            }
            if ch.prop == "instanceKwargs" {
                let v = Value::Object(shell.instance_kwargs.clone().unwrap_or_default());
                let chv = if ch.value.is_null() {
                    Value::Object(Map::new())
                } else {
                    ch.value.clone()
                };
                return json_compact(&v) != json_compact(&chv);
            }
            let pv = shell.props.get(&ch.prop).map(json_compact);
            pv != Some(json_compact(&ch.value))
        })
        .collect()
}

fn collect_affected_frames_for_variant(
    changes: &[Change],
    hierarchy_default: &IndexMap<String, Vec<String>>,
    hierarchy_variant: Option<&IndexMap<String, Vec<String>>>,
) -> Vec<String> {
    let mut s: BTreeSet<String> = BTreeSet::new();
    for ch in changes {
        s.insert(ch.frame_id.clone());
    }
    if let Some(hv) = hierarchy_variant {
        let mut keys: BTreeSet<String> = BTreeSet::new();
        keys.extend(hierarchy_default.keys().cloned());
        keys.extend(hv.keys().cloned());
        let empty: Vec<String> = Vec::new();
        for k in &keys {
            let a = hierarchy_default.get(k).unwrap_or(&empty);
            let b = hv.get(k).unwrap_or(&empty);
            if a != b {
                s.insert(k.clone());
                for id in a {
                    s.insert(id.clone());
                }
                for id in b {
                    s.insert(id.clone());
                }
            }
        }
    }
    s.into_iter().collect()
}

// ---- variant axes ----------------------------------------------------------

struct Axis {
    name: String,
    cases: Vec<String>,
}

fn variant_param_axes(design: &DesignDefinition, c: &ComponentDecl) -> Result<Vec<Axis>, PdlError> {
    Ok(effective_params(design, c)?
        .into_iter()
        .filter(|p| !p.is_array && design.variants.contains_key(&p.type_name))
        .map(|p| Axis {
            name: p.name.clone(),
            cases: design.variants[&p.type_name].cases.clone(),
        })
        .collect())
}

fn default_variant_assignment(
    design: &DesignDefinition,
    c: &ComponentDecl,
) -> Result<Vec<(String, String)>, PdlError> {
    let mut out: Vec<(String, String)> = Vec::new();
    for p in effective_params(design, c)? {
        if p.is_array || !design.variants.contains_key(&p.type_name) {
            continue;
        }
        match &p.default_value {
            ValueExpr::DotEnum { value } => {
                out.push((p.name.clone(), strip_dot(value).to_string()));
            }
            _ => {
                return Err(PdlError::new(
                    "PDL-E010",
                    format!(
                        "Variant parameter `{}` on component {} must use a dot-enum default",
                        p.name, c.name
                    ),
                    Some(design.entry_path.clone()),
                    None,
                    None,
                ));
            }
        }
    }
    Ok(out)
}

fn each_variant_assignment(axes: &[Axis]) -> Vec<Vec<(String, String)>> {
    if axes.is_empty() {
        return Vec::new();
    }
    let head = &axes[0];
    let tail = &axes[1..];
    let mut out: Vec<Vec<(String, String)>> = Vec::new();
    if tail.is_empty() {
        for c in &head.cases {
            out.push(vec![(head.name.clone(), c.clone())]);
        }
        return out;
    }
    for c in &head.cases {
        for rest in each_variant_assignment(tail) {
            let mut v = vec![(head.name.clone(), c.clone())];
            v.extend(rest);
            out.push(v);
        }
    }
    out
}

fn assignment_key(assign: &[(String, String)]) -> String {
    let mut entries: Vec<&(String, String)> = assign.iter().collect();
    entries.sort_by(|a, b| a.0.cmp(&b.0));
    let mut m = Map::new();
    for (k, v) in entries {
        m.insert(k.clone(), Value::String(v.clone()));
    }
    json_compact(&Value::Object(m))
}

fn assignment_to_overrides(assign: &[(String, String)]) -> Map<String, Value> {
    let mut m = Map::new();
    for (k, v) in assign {
        m.insert(k.clone(), Value::String(v.clone()));
    }
    m
}

fn assignments_equal(a: &[(String, String)], b: &[(String, String)], keys: &[String]) -> bool {
    let am: HashMap<&str, &str> = a.iter().map(|(k, v)| (k.as_str(), v.as_str())).collect();
    let bm: HashMap<&str, &str> = b.iter().map(|(k, v)| (k.as_str(), v.as_str())).collect();
    keys.iter()
        .all(|k| am.get(k.as_str()) == bm.get(k.as_str()))
}

// ---- params ----------------------------------------------------------------

fn catalogue_params(
    design: &DesignDefinition,
    c: &ComponentDecl,
    tokens: &mut Tokens,
) -> Result<Value, PdlError> {
    let defaults = resolve_default_param_values(design, tokens, c)?;
    let mut arr: Vec<Value> = Vec::new();
    for p in effective_params(design, c)? {
        let resolved_default = defaults.get(&p.name).cloned().unwrap_or(Value::Null);
        let mut entries = vec![("name", Value::String(p.name.clone()))];
        if p.is_array {
            entries.push((
                "type",
                obj(vec![
                    ("kind", Value::String("array".to_string())),
                    ("element", Value::String(p.type_name.clone())),
                ]),
            ));
            entries.push(("default", resolved_default));
        } else if design.variants.contains_key(&p.type_name) {
            entries.push(("type", Value::String("variant".to_string())));
            entries.push(("default", resolved_default));
            entries.push(("variantTypeName", Value::String(p.type_name.clone())));
        } else {
            entries.push(("type", Value::String(p.type_name.clone())));
            entries.push(("default", resolved_default));
        }
        arr.push(obj(entries));
    }
    Ok(Value::Array(arr))
}

fn base_param_strings(
    design: &DesignDefinition,
    c: &ComponentDecl,
    tokens: &mut Tokens,
) -> Result<Value, PdlError> {
    let pv = resolve_default_param_values(design, tokens, c)?;
    let mut o = Map::new();
    for (k, v) in &pv {
        let s = match v {
            Value::String(s) => s.clone(),
            other => json_compact(other),
        };
        o.insert(k.clone(), Value::String(s));
    }
    Ok(Value::Object(o))
}

// ---- token layers ----------------------------------------------------------

struct TokenLayers {
    primitives: Value,
    semantics: Value,
    themes: Value,
    type_styles: Value,
}

fn build_catalogue_token_layers(design: &DesignDefinition) -> TokenLayers {
    let mut primitives = Map::new();
    for p in design.primitives.values() {
        primitives.insert(
            p.name.clone(),
            obj(vec![
                ("name", Value::String(p.name.clone())),
                ("tokenType", Value::String(p.token_type.clone())),
                (
                    "definition",
                    serialise_value_expr_with_token_refs(&p.value, design),
                ),
            ]),
        );
    }
    let mut semantics = Map::new();
    for s in design.semantics.values() {
        semantics.insert(
            s.name.clone(),
            obj(vec![
                ("name", Value::String(s.name.clone())),
                ("tokenType", Value::String(s.token_type.clone())),
                (
                    "definition",
                    serialise_value_expr_with_token_refs(&s.value, design),
                ),
            ]),
        );
    }
    let mut themes = Map::new();
    for t in design.themes.values() {
        let mut overrides = Map::new();
        for (k, expr) in &t.overrides {
            overrides.insert(k.clone(), serialise_value_expr_with_token_refs(expr, design));
        }
        themes.insert(
            t.name.clone(),
            obj(vec![
                (
                    "baseTheme",
                    match &t.base_theme {
                        Some(b) => Value::String(b.clone()),
                        None => Value::Null,
                    },
                ),
                ("overrides", Value::Object(overrides)),
            ]),
        );
    }
    let mut type_styles = Map::new();
    for ts in design.type_styles.values() {
        let mut props = Map::new();
        for (k, v) in &ts.props {
            props.insert(k.clone(), serialise_value_expr_with_token_refs(v, design));
        }
        type_styles.insert(
            ts.name.clone(),
            obj(vec![
                ("name", Value::String(ts.name.clone())),
                ("props", Value::Object(props)),
            ]),
        );
    }
    TokenLayers {
        primitives: Value::Object(primitives),
        semantics: Value::Object(semantics),
        themes: Value::Object(themes),
        type_styles: Value::Object(type_styles),
    }
}

// ---- required components ----------------------------------------------------

fn accumulate_from_body(items: &[FrameBodyItem], sink: &mut BTreeSet<String>) {
    for it in items {
        match it {
            FrameBodyItem::LetInstance { component, .. } => {
                sink.insert(component.clone());
            }
            FrameBodyItem::Children { entries, .. } => {
                for e in entries {
                    if let ChildEntry::Instance { component, .. } = e {
                        sink.insert(component.clone());
                    }
                }
            }
            FrameBodyItem::Let { body, .. } => accumulate_from_body(body, sink),
            FrameBodyItem::If { chain } => {
                for br in &chain.branches {
                    accumulate_from_body(&br.body, sink);
                }
                if let Some(else_body) = &chain.else_body {
                    accumulate_from_body(else_body, sink);
                }
            }
            _ => {}
        }
    }
}

/// Component names transitively required by `root_name` (excluding itself), sorted.
pub fn collect_required_component_names(design: &DesignDefinition, root_name: &str) -> Vec<String> {
    let root = match design.components.get(root_name) {
        Some(r) => r,
        None => return Vec::new(),
    };

    let mut out: BTreeSet<String> = BTreeSet::new();
    accumulate_from_body(&root.body, &mut out);
    out.remove(root_name);

    let mut queue: Vec<String> = out.iter().cloned().collect();
    while let Some(n) = queue.pop_first_like() {
        let c = match design.components.get(&n) {
            Some(c) => c,
            None => continue,
        };
        let mut more: BTreeSet<String> = BTreeSet::new();
        accumulate_from_body(&c.body, &mut more);
        more.remove(root_name);
        for m in more {
            if !out.contains(&m) {
                out.insert(m.clone());
                queue.push(m);
            }
        }
    }

    out.into_iter().collect()
}

/// Tiny helper: pop from the front of a `Vec` used as a FIFO queue (mirrors TS `queue.shift()`).
trait PopFront<T> {
    fn pop_first_like(&mut self) -> Option<T>;
}
impl<T> PopFront<T> for Vec<T> {
    fn pop_first_like(&mut self) -> Option<T> {
        if self.is_empty() {
            None
        } else {
            Some(self.remove(0))
        }
    }
}

// ---- component row ----------------------------------------------------------

/// Build a single component catalogue row.
pub fn build_catalogue_component_row(
    design: &DesignDefinition,
    tokens: &mut Tokens,
    c: &ComponentDecl,
) -> Result<Value, PdlError> {
    let opts = RESOLVE_OPTIONS_GRAPH_CATALOGUE;
    let base_tree = resolve_component_tree(design, &c.name, tokens, &Map::new(), opts)?;

    let axes = variant_param_axes(design, c)?;
    let default_assign = default_variant_assignment(design, c)?;
    let variant_keys: Vec<String> = axes.iter().map(|a| a.name.clone()).collect();

    let mut trees_by_assign_key: HashMap<String, CatalFrame> = HashMap::new();
    trees_by_assign_key.insert(assignment_key(&default_assign), base_tree.clone());

    let mut scan_trees: Vec<CatalFrame> = vec![base_tree.clone()];
    for assign in each_variant_assignment(&axes) {
        if assignments_equal(&assign, &default_assign, &variant_keys) {
            continue;
        }
        let k = assignment_key(&assign);
        if trees_by_assign_key.contains_key(&k) {
            continue;
        }
        let t = resolve_component_tree(design, &c.name, tokens, &assignment_to_overrides(&assign), opts)?;
        trees_by_assign_key.insert(k, t.clone());
        scan_trees.push(t);
    }

    let child_nodes = build_child_node_registry(&scan_trees);
    let hierarchy_default = visible_child_hierarchy_map(&base_tree);

    // Variant entries (sorted by assignment key later).
    struct VariantEntry {
        params: Vec<(String, String)>,
        affected_frames: Vec<String>,
        changes: Vec<Change>,
        structural: bool,
        child_hierarchy: Option<IndexMap<String, Vec<String>>>,
        key: String,
    }
    let mut variants: Vec<VariantEntry> = Vec::new();
    for assign in each_variant_assignment(&axes) {
        if assignments_equal(&assign, &default_assign, &variant_keys) {
            continue;
        }
        let key = assignment_key(&assign);
        let tree2 = trees_by_assign_key
            .get(&key)
            .expect("variant tree present")
            .clone();
        let hierarchy_variant = visible_child_hierarchy_map(&tree2);
        let variant_hierarchy_out = if hierarchy_variant != hierarchy_default {
            Some(hierarchy_variant)
        } else {
            None
        };

        let changes = diff_frame_props_by_id(&base_tree, &tree2);
        let changes = strip_changes_redundant_with_registry(changes, &child_nodes);

        if changes.is_empty() && variant_hierarchy_out.is_none() {
            continue;
        }

        let structural = variant_hierarchy_out.is_some();
        let affected =
            collect_affected_frames_for_variant(&changes, &hierarchy_default, variant_hierarchy_out.as_ref());
        variants.push(VariantEntry {
            params: assign,
            affected_frames: affected,
            changes,
            structural,
            child_hierarchy: variant_hierarchy_out,
            key,
        });
    }
    variants.sort_by(|a, b| a.key.cmp(&b.key));

    // usage
    let usage_map = design.usage.get(&c.name);
    let usage_str = usage_map
        .and_then(|m| m.get("description"))
        .cloned()
        .unwrap_or_default();
    let usage_by_key: Option<Value> = match usage_map {
        Some(m) if !m.is_empty() => {
            let mut keys: Vec<&String> = m.keys().collect();
            keys.sort();
            let mut o = Map::new();
            for k in keys {
                o.insert(k.clone(), Value::String(m[k].clone()));
            }
            Some(Value::Object(o))
        }
        _ => None,
    };

    // fixtures
    let fixtures_out: Option<Value> = match design.fixtures.get(&c.name) {
        Some(fx) if !fx.is_empty() => {
            let mut labels: Vec<&String> = fx.keys().collect();
            labels.sort();
            let mut o = Map::new();
            let empty_pv: ParamValues = Map::new();
            let empty_pm: ParamMeta = IndexMap::new();
            for label in labels {
                let ex = &fx[label];
                let mut params = Map::new();
                for b in &ex.bindings {
                    let mut visiting = std::collections::HashSet::new();
                    let mut ev = Eval {
                        design,
                        tokens,
                        visiting: &mut visiting,
                        param_values: Some(&empty_pv),
                        param_meta: Some(&empty_pm),
                        use_string_placeholders: false,
                    };
                    params.insert(b.name.clone(), evaluate_value(&b.value, &mut ev)?);
                }
                o.insert(label.clone(), Value::Object(params));
            }
            Some(Value::Object(o))
        }
        _ => None,
    };

    // rules
    let rules_out: Option<Value> = match design.rules.get(&c.name) {
        Some(rstmts) if !rstmts.is_empty() => {
            let flat = flatten_rules_with_when(rstmts);
            let rules_arr: Vec<Value> = flat
                .into_iter()
                .map(|fr| {
                    let mut def = fr.def;
                    if let Some(when) = fr.when {
                        if let Value::Object(m) = &mut def {
                            m.insert("when".to_string(), serialise_condition_expr(&when));
                        }
                    }
                    def
                })
                .collect();
            let tags: Vec<Value> = effective_rule_tags(rstmts)
                .into_iter()
                .map(Value::String)
                .collect();
            Some(obj(vec![
                ("tags", Value::Array(tags)),
                ("rules", Value::Array(rules_arr)),
            ]))
        }
        _ => None,
    };

    // interactions
    let interactions_out: Option<Value> = match design.interactions.get(&c.name) {
        Some(imap) if !imap.is_empty() => {
            let mut decls: Vec<&InteractionDecl> = imap.values().collect();
            decls.sort_by(|a, b| a.name.cmp(&b.name));
            Some(Value::Array(
                decls.into_iter().map(serialise_interaction_decl).collect(),
            ))
        }
        _ => None,
    };

    let required_components = collect_required_component_names(design, &c.name);

    // Legacy transitional field: always all params (`expose` keyword removed).
    let expose_arr: Vec<Value> = effective_params(design, c)?
        .into_iter()
        .map(|p| Value::String(p.name))
        .collect();

    let root = obj(vec![
        ("kind", Value::String(base_tree.kind.clone())),
        ("props", Value::Object(base_tree.props.clone())),
    ]);

    // child nodes registry → value
    let mut child_nodes_v = Map::new();
    for (id, shell) in &child_nodes {
        child_nodes_v.insert(id.clone(), shell.to_value());
    }

    // variants → value
    let variants_v: Vec<Value> = variants
        .into_iter()
        .map(|v| {
            let mut params = Map::new();
            for (k, val) in &v.params {
                params.insert(k.clone(), Value::String(val.clone()));
            }
            let changes_v: Vec<Value> = v
                .changes
                .iter()
                .map(|ch| {
                    obj(vec![
                        ("frameId", Value::String(ch.frame_id.clone())),
                        ("prop", Value::String(ch.prop.clone())),
                        ("value", ch.value.clone()),
                    ])
                })
                .collect();
            let mut entries = vec![
                ("params", Value::Object(params)),
                (
                    "affectedFrames",
                    Value::Array(
                        v.affected_frames
                            .iter()
                            .map(|s| Value::String(s.clone()))
                            .collect(),
                    ),
                ),
                ("changes", Value::Array(changes_v)),
            ];
            if v.structural {
                entries.push(("structuralChange", Value::Bool(true)));
            }
            if let Some(hier) = &v.child_hierarchy {
                entries.push(("childHierarchy", hierarchy_to_value(hier)));
            }
            obj(entries)
        })
        .collect();

    let mut out = Map::new();
    out.insert("name".to_string(), Value::String(c.name.clone()));
    if let Some(proto) = &c.conforms_to {
        out.insert("conformsTo".to_string(), Value::String(proto.clone()));
    }
    let host_protos = crate::design::effective_host_protocols(design, c).unwrap_or_default();
    if !host_protos.is_empty() {
        out.insert(
            "hostProtocols".to_string(),
            Value::Array(host_protos.into_iter().map(Value::String).collect()),
        );
    }
    out.insert("params".to_string(), catalogue_params(design, c, tokens)?);
    out.insert("expose".to_string(), Value::Array(expose_arr));
    out.insert("usage".to_string(), Value::String(usage_str));
    if let Some(ubk) = usage_by_key {
        out.insert("usageByKey".to_string(), ubk);
    }
    if let Some(fx) = fixtures_out {
        out.insert("fixtures".to_string(), fx);
    }
    if let Some(r) = rules_out {
        out.insert("rules".to_string(), r);
    }
    if let Some(i) = interactions_out {
        out.insert("interactions".to_string(), i);
    }
    let mut emit_captures: Vec<Value> = Vec::new();
    collect_emit_captures_from_body(&c.body, &mut emit_captures);
    if !emit_captures.is_empty() {
        out.insert("emitCaptures".to_string(), Value::Array(emit_captures));
    }
    let emits = effective_emits(design, c);
    if !emits.is_empty() {
        out.insert(
            "emits".to_string(),
            Value::Array(
                emits
                    .into_iter()
                    .map(|e| {
                        obj(vec![
                            ("name", Value::String(e.name)),
                            (
                                "args",
                                Value::Array(
                                    e.args
                                        .into_iter()
                                        .map(|a| {
                                            obj(vec![
                                                ("name", Value::String(a.name)),
                                                ("type", Value::String(a.type_name)),
                                            ])
                                        })
                                        .collect(),
                                ),
                            ),
                        ])
                    })
                    .collect(),
            ),
        );
    }
    out.insert("root".to_string(), root);
    out.insert(
        "defaultParams".to_string(),
        base_param_strings(design, c, tokens)?,
    );
    out.insert("childNodes".to_string(), Value::Object(child_nodes_v));
    out.insert(
        "childHierarchy".to_string(),
        hierarchy_to_value(&hierarchy_default),
    );
    if !required_components.is_empty() {
        out.insert(
            "requiredComponents".to_string(),
            Value::Array(
                required_components
                    .into_iter()
                    .map(Value::String)
                    .collect(),
            ),
        );
    }
    out.insert("variants".to_string(), Value::Array(variants_v));

    Ok(Value::Object(out))
}

/// Build the full `componentCatalogue` document.
pub fn build_component_catalogue(
    design: &DesignDefinition,
    theme: Option<&str>,
    modifiers: &[String],
    generated_at: Option<String>,
) -> Result<Value, PdlError> {
    let mut tokens = build_resolved_token_map(design, theme, modifiers)?;
    let layers = build_catalogue_token_layers(design);

    let mut components = Map::new();
    for c in design.components.values() {
        let row = build_catalogue_component_row(design, &mut tokens, c)?;
        components.insert(c.name.clone(), row);
    }

    let mut variant_types = Map::new();
    for v in design.variants.values() {
        variant_types.insert(
            v.name.clone(),
            obj(vec![
                ("name", Value::String(v.name.clone())),
                (
                    "cases",
                    Value::Array(v.cases.iter().map(|c| Value::String(c.clone())).collect()),
                ),
            ]),
        );
    }

    let mut doc = Map::new();
    doc.insert(
        "kind".to_string(),
        Value::String("componentCatalogue".to_string()),
    );
    doc.insert(
        "schemaVersion".to_string(),
        Value::String(PDL_JSON_SCHEMA_VERSION.to_string()),
    );
    doc.insert(
        "generatedAt".to_string(),
        Value::String(generated_at.unwrap_or_else(now_iso8601)),
    );
    if let Some(t) = theme {
        doc.insert("theme".to_string(), Value::String(t.to_string()));
    }
    doc.insert("primitives".to_string(), layers.primitives);
    doc.insert("semantics".to_string(), layers.semantics);
    doc.insert("themes".to_string(), layers.themes);
    doc.insert("typeStyles".to_string(), layers.type_styles);
    doc.insert("variantTypes".to_string(), Value::Object(variant_types));
    // Prelude host protocols are always in the design map for validation, but only
    // appear in the catalogue when referenced (conformsTo / requires).
    let protocols_for_catalogue: Vec<&crate::ast::ProtocolDecl> = design
        .protocols
        .values()
        .filter(|p| {
            if !crate::design::is_host_protocol_prelude(&p.name) {
                return true;
            }
            let referenced = design
                .components
                .values()
                .any(|c| c.conforms_to.as_deref() == Some(p.name.as_str()))
                || design.protocols.values().any(|other| {
                    other.requires.iter().any(|r| r == &p.name)
                });
            referenced
        })
        .collect();
    if !protocols_for_catalogue.is_empty() {
        let mut protocols = Map::new();
        for p in &protocols_for_catalogue {
            let params: Vec<Value> = p
                .params
                .iter()
                .map(|param| {
                    let mut entries = vec![("name", Value::String(param.name.clone()))];
                    if param.is_array {
                        entries.push((
                            "type",
                            obj(vec![
                                ("kind", Value::String("array".to_string())),
                                ("element", Value::String(param.type_name.clone())),
                            ]),
                        ));
                        entries.push((
                            "default",
                            serialise_value_expr(&param.default_value),
                        ));
                    } else if design.variants.contains_key(&param.type_name) {
                        entries.push(("type", Value::String("variant".to_string())));
                        entries.push((
                            "default",
                            serialise_value_expr(&param.default_value),
                        ));
                        entries.push(("variantTypeName", Value::String(param.type_name.clone())));
                    } else {
                        entries.push(("type", Value::String(param.type_name.clone())));
                        entries.push((
                            "default",
                            serialise_value_expr(&param.default_value),
                        ));
                    }
                    obj(entries)
                })
                .collect();
            let mut row = Map::new();
            row.insert("name".to_string(), Value::String(p.name.clone()));
            let role = match p.role {
                crate::ast::ProtocolRole::Host => "host",
                crate::ast::ProtocolRole::Api => "api",
            };
            let subject = match p.role {
                crate::ast::ProtocolRole::Host => "host",
                crate::ast::ProtocolRole::Api => "component",
            };
            row.insert("role".to_string(), Value::String(role.to_string()));
            row.insert("subject".to_string(), Value::String(subject.to_string()));
            if !p.requires.is_empty() {
                row.insert(
                    "requires".to_string(),
                    Value::Array(p.requires.iter().cloned().map(Value::String).collect()),
                );
            }
            row.insert("params".to_string(), Value::Array(params));
            if !p.emits.is_empty() {
                let emits: Vec<Value> = p
                    .emits
                    .iter()
                    .map(|e| {
                        obj(vec![
                            ("name", Value::String(e.name.clone())),
                            (
                                "args",
                                Value::Array(
                                    e.args
                                        .iter()
                                        .map(|a| {
                                            obj(vec![
                                                ("name", Value::String(a.name.clone())),
                                                ("type", Value::String(a.type_name.clone())),
                                            ])
                                        })
                                        .collect(),
                                ),
                            ),
                        ])
                    })
                    .collect();
                row.insert("emits".to_string(), Value::Array(emits));
            }
            protocols.insert(p.name.clone(), Value::Object(row));
        }
        doc.insert("protocols".to_string(), Value::Object(protocols));
        let mut roles = Map::new();
        for p in &protocols_for_catalogue {
            let role = match p.role {
                crate::ast::ProtocolRole::Host => "host",
                crate::ast::ProtocolRole::Api => "api",
            };
            roles.insert(p.name.clone(), Value::String(role.to_string()));
        }
        if !roles.is_empty() {
            doc.insert("protocolRoles".to_string(), Value::Object(roles));
        }
    }
    doc.insert("components".to_string(), Value::Object(components));

    Ok(Value::Object(doc))
}
