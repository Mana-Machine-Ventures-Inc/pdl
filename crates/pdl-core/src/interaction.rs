//! `apply_interaction_event` — simulate ambient interaction handlers on a param map.
//! Spec §8 / Phase H.

use crate::ast::{
    InteractionDecl, InteractionHandlerItem, InteractionIfChain, LayoutOnHandler, ValueExpr,
};
use crate::evaluate::{evaluate_condition, ParamValues};
use crate::stable_json::number_value;
use indexmap::IndexMap;
use serde_json::Value;

fn strip_leading_dot(s: &str) -> &str {
    s.strip_prefix('.').unwrap_or(s)
}

/// Result of applying one ambient event through merged interaction decls.
#[derive(Debug, Clone, PartialEq)]
pub struct ApplyInteractionResult {
    pub params: ParamValues,
    pub emits: Vec<(String, Vec<String>)>,
    pub changed: bool,
    pub handled: bool,
}

fn eval_assign_value(expr: &ValueExpr, params: &ParamValues) -> Value {
    match expr {
        ValueExpr::DotEnum { value } => Value::String(strip_leading_dot(value).to_string()),
        ValueExpr::String { value } => Value::String(value.clone()),
        ValueExpr::Number { value } => number_value(*value),
        ValueExpr::Boolean { value } => Value::Bool(*value),
        ValueExpr::Hex { value } => Value::String(value.clone()),
        ValueExpr::Ident { name } => {
            if let Some(v) = params.get(name) {
                v.clone()
            } else {
                Value::String(name.clone())
            }
        }
        _ => Value::Null,
    }
}

fn run_body(
    body: &[InteractionHandlerItem],
    params: &mut ParamValues,
    emits: &mut Vec<(String, Vec<String>)>,
) -> bool {
    let mut changed = false;
    for item in body {
        match item {
            InteractionHandlerItem::Assign { param, value } => {
                let next = eval_assign_value(value, params);
                let prev = params.get(param);
                if prev != Some(&next) {
                    changed = true;
                }
                params.insert(param.clone(), next);
            }
            InteractionHandlerItem::Emit { name, args } => {
                emits.push((name.clone(), args.clone()));
            }
            InteractionHandlerItem::HostVerb {
                qualifier,
                name,
                args,
            } => {
                // Let-qualified verbs target a nested instance — not this component bag.
                if qualifier.is_some() {
                    continue;
                }
                // Mirror preview host session verbs so apply_interaction_event can simulate.
                match name.as_str() {
                    "beginEditing" => {
                        let seed_name = args
                            .first()
                            .map(|a| a.strip_prefix("self.").unwrap_or(a.as_str()))
                            .unwrap_or("value");
                        let seed = params
                            .get(seed_name)
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();
                        let checkpoint = params
                            .get("value")
                            .cloned()
                            .unwrap_or_else(|| Value::String(seed.clone()));
                        params.insert("_editCheckpoint".into(), checkpoint);
                        params.insert("value".into(), Value::String(seed.clone()));
                        params.insert("isEditing".into(), Value::Bool(true));
                        params.insert("isEmpty".into(), Value::Bool(seed.is_empty()));
                        changed = true;
                    }
                    "finishEditing" | "commitEditing" => {
                        let empty = params
                            .get("value")
                            .and_then(|v| v.as_str())
                            .map(|s| s.is_empty())
                            .unwrap_or(true);
                        params.insert("isEditing".into(), Value::Bool(false));
                        params.insert("isEmpty".into(), Value::Bool(empty));
                        changed = true;
                    }
                    "cancelEditing" => {
                        if let Some(cp) = params.get("_editCheckpoint").cloned() {
                            params.insert("value".into(), cp);
                        }
                        let empty = params
                            .get("value")
                            .and_then(|v| v.as_str())
                            .map(|s| s.is_empty())
                            .unwrap_or(true);
                        params.insert("isEditing".into(), Value::Bool(false));
                        params.insert("isEmpty".into(), Value::Bool(empty));
                        changed = true;
                    }
                    _ => {}
                }
            }
            InteractionHandlerItem::Animate { .. }
            | InteractionHandlerItem::From { .. }
            | InteractionHandlerItem::To { .. }
            | InteractionHandlerItem::Stagger { .. }
            | InteractionHandlerItem::StaggerFrom { .. } => {}
            InteractionHandlerItem::If { chain } => {
                if run_if_chain(chain, params, emits) {
                    changed = true;
                }
            }
        }
    }
    changed
}

fn run_if_chain(
    chain: &InteractionIfChain,
    params: &mut ParamValues,
    emits: &mut Vec<(String, Vec<String>)>,
) -> bool {
    for br in &chain.branches {
        if evaluate_condition(&br.condition, params) {
            return run_body(&br.body, params, emits);
        }
    }
    if let Some(else_body) = &chain.else_body {
        return run_body(else_body, params, emits);
    }
    false
}

/// Merge handlers last-wins by event across decls (spec Q3b).
pub fn merge_handlers_by_event(
    decls: &[&InteractionDecl],
) -> IndexMap<String, Vec<InteractionHandlerItem>> {
    let mut map = IndexMap::new();
    for d in decls {
        for h in &d.handlers {
            map.insert(h.event.clone(), h.body.clone());
        }
    }
    map
}

/// Apply ambient `event` using interaction decls for a component.
pub fn apply_interaction_event(
    params: &ParamValues,
    decls: &[&InteractionDecl],
    event: &str,
) -> ApplyInteractionResult {
    let by_event = merge_handlers_by_event(decls);
    let Some(body) = by_event.get(event) else {
        return ApplyInteractionResult {
            params: params.clone(),
            emits: vec![],
            changed: false,
            handled: false,
        };
    };
    let mut next = params.clone();
    let mut emits = vec![];
    let changed = run_body(body, &mut next, &mut emits);
    ApplyInteractionResult {
        params: next,
        emits,
        changed,
        handled: true,
    }
}

/// Apply a layout `on` emit-capture body using payload locals + parent params.
pub fn apply_emit_capture(
    parent_params: &ParamValues,
    handler: &LayoutOnHandler,
    // Emit arg names from `emit select(filter)` in order.
    emit_arg_names: &[String],
    // Child instance params used to resolve emit arg values.
    child_params: &ParamValues,
) -> ApplyInteractionResult {
    let mut scope = parent_params.clone();
    for (i, payload) in handler.payload.iter().enumerate() {
        let src = emit_arg_names.get(i).map(|s| s.as_str()).unwrap_or(payload.name.as_str());
        if let Some(v) = child_params.get(src) {
            scope.insert(payload.name.clone(), v.clone());
        } else if let Some(v) = child_params.get(&payload.name) {
            scope.insert(payload.name.clone(), v.clone());
        }
    }
    let mut next = parent_params.clone();
    let emits = vec![];
    let mut changed = false;
    for item in &handler.body {
        match item {
            crate::ast::LayoutOnBodyItem::Assign(a) => {
                let val = eval_assign_value(&a.value, &scope);
                // Prefer payload-local idents from scope when RHS is ident
                let resolved = match &a.value {
                    ValueExpr::Ident { name } => scope.get(name).cloned().unwrap_or(val),
                    _ => val,
                };
                if next.get(&a.param) != Some(&resolved) {
                    changed = true;
                }
                next.insert(a.param.clone(), resolved.clone());
                // Keep scope in sync for multi-assign
                scope.insert(a.param.clone(), resolved);
            }
            crate::ast::LayoutOnBodyItem::HostVerb { .. } => {
                // Executed by the HTML/preview host against the nested let session bag.
                changed = true;
            }
        }
    }
    ApplyInteractionResult {
        params: next,
        emits,
        changed,
        handled: true,
    }
}

/// Find first matching emit capture by channel (and optional qualifier).
pub fn find_emit_capture<'a>(
    handlers: &'a [LayoutOnHandler],
    channel: &str,
    qualifier: Option<&str>,
) -> Option<&'a LayoutOnHandler> {
    let mut best: Option<&LayoutOnHandler> = None;
    for h in handlers {
        if h.channel != channel {
            continue;
        }
        if let Some(q) = qualifier {
            if h.qualifier.as_deref() == Some(q) || h.qualifier.is_none() {
                best = Some(h);
            }
        } else {
            best = Some(h);
        }
    }
    best
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ast::{InteractionHandler, InteractionHandlerItem, ValueExpr};
    use crate::evaluate::ParamValues;
    use serde_json::Value;

    fn assign(param: &str, case: &str) -> InteractionHandlerItem {
        InteractionHandlerItem::Assign {
            param: param.to_string(),
            value: ValueExpr::DotEnum {
                value: format!(".{case}"),
            },
        }
    }

    #[test]
    fn pointer_cycle_assigns_interaction_state() {
        let decl = InteractionDecl {
            name: "Cycle".into(),
            component: "Btn".into(),
            handlers: vec![
                InteractionHandler {
                    event: "hoverStart".into(),
                    body: vec![assign("interactionState", "hovered")],
                },
                InteractionHandler {
                    event: "pressStart".into(),
                    body: vec![assign("interactionState", "pressed")],
                },
                InteractionHandler {
                    event: "pressEnd".into(),
                    body: vec![assign("interactionState", "hovered")],
                },
                InteractionHandler {
                    event: "hoverEnd".into(),
                    body: vec![assign("interactionState", "rest")],
                },
            ],
        };
        let mut params = ParamValues::new();
        params.insert("interactionState".into(), Value::String("rest".into()));
        let r1 = apply_interaction_event(&params, &[&decl], "hoverStart");
        assert!(r1.handled && r1.changed);
        assert_eq!(
            r1.params.get("interactionState"),
            Some(&Value::String("hovered".into()))
        );
        let r2 = apply_interaction_event(&r1.params, &[&decl], "pressStart");
        assert_eq!(
            r2.params.get("interactionState"),
            Some(&Value::String("pressed".into()))
        );
        let r3 = apply_interaction_event(&r2.params, &[&decl], "pressEnd");
        assert_eq!(
            r3.params.get("interactionState"),
            Some(&Value::String("hovered".into()))
        );
    }

    #[test]
    fn unknown_event_is_noop() {
        let decl = InteractionDecl {
            name: "Cycle".into(),
            component: "Btn".into(),
            handlers: vec![InteractionHandler {
                event: "hoverStart".into(),
                body: vec![assign("interactionState", "hovered")],
            }],
        };
        let mut params = ParamValues::new();
        params.insert("interactionState".into(), Value::String("rest".into()));
        let r = apply_interaction_event(&params, &[&decl], "activate");
        assert!(!r.handled);
        assert!(!r.changed);
    }

    #[test]
    fn library_subnav_emit_capture_rebinds_current_filter() {
        use crate::ast::{EmitArgDecl, LayoutOnAssign, LayoutOnBodyItem, LayoutOnHandler};
        let handler = LayoutOnHandler {
            qualifier: Some("chips".into()),
            channel: "select".into(),
            payload: vec![EmitArgDecl {
                name: "filter_id".into(),
                type_name: "FilterId".into(),
            }],
            body: vec![LayoutOnBodyItem::Assign(LayoutOnAssign {
                param: "currentFilter".into(),
                value: ValueExpr::Ident {
                    name: "filter_id".into(),
                },
            })],
        };
        let mut parent = ParamValues::new();
        parent.insert("currentFilter".into(), Value::String("all".into()));
        let mut child = ParamValues::new();
        child.insert("filter".into(), Value::String("podcasts".into()));
        child.insert("title".into(), Value::String("Podcasts".into()));
        let r = apply_emit_capture(
            &parent,
            &handler,
            &["filter".into()],
            &child,
        );
        assert!(r.handled && r.changed);
        assert_eq!(
            r.params.get("currentFilter"),
            Some(&Value::String("podcasts".into()))
        );
    }

    #[test]
    fn library_subnav_ast_has_foreach_on_select() {
        let root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..");
        let entry = root.join("test-fixtures/pdl/protocols/design.pdl");
        let design = crate::design::load_design(entry.to_str().unwrap()).expect("load");
        let c = design.components.get("LibrarySubnav").expect("LibrarySubnav");
        let mut n = 0usize;
        for item in &c.body {
            if let crate::ast::FrameBodyItem::ForEach { body, .. } = item {
                let handlers = crate::ast::foreach_layout_handlers(body);
                n += handlers.len();
                assert_eq!(handlers[0].channel, "select");
            }
        }
        assert!(n > 0, "expected ForEach select handlers in AST, got {n}");
    }
}
