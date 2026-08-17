//! Presenter stack + cover (`root` + pushed pages; optional layered cover).
//! N4: `push` / `pop` / `replace`. N5: `present(.cover)` / `dismiss`.
//! Cover paints above the stack top (centered); the stack stays visible behind.

use std::collections::HashMap;

use indexmap::IndexMap;
use serde_json::{Map, Value};

use crate::ast::{ChildEntry, PresenterVerb, ValueExpr};
use crate::design::DesignDefinition;

/// Fixture / bake pin for one presenter let.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct PresenterPin {
    /// Full stack (`root` first). Empty means “use the declared `root`”.
    pub stack: Vec<ChildEntry>,
    /// Layered cover above the stack top. `None` is vacant (no `T?`).
    pub cover: Option<ChildEntry>,
}

/// Turn a page let or instance into a stack / cover entry.
pub fn child_entry_from_page_expr(value: &ValueExpr) -> Option<ChildEntry> {
    match value {
        ValueExpr::Ident { name } => Some(ChildEntry::FrameRef {
            id: name.clone(),
            opacity: None,
        }),
        ValueExpr::Instance {
            component, kwargs, ..
        } => Some(ChildEntry::Instance {
            component: component.clone(),
            kwargs: kwargs.clone(),
            opacity: None,
        }),
        _ => None,
    }
}

/// Fixture / pin array → stack entries (skips non-page values).
pub fn stack_from_value_expr(value: &ValueExpr) -> Option<Vec<ChildEntry>> {
    match value {
        ValueExpr::Array { items } => {
            let mut out = Vec::new();
            for it in items {
                out.push(child_entry_from_page_expr(it)?);
            }
            Some(out)
        }
        other => Some(vec![child_entry_from_page_expr(other)?]),
    }
}

/// Apply a presenter verb. `pop` at `root` (len == 1) is a no-op.
/// `present` sets cover; `dismiss` clears it (no-op if vacant). Stack is unchanged.
pub fn apply_presenter_op(
    stack: &mut Vec<ChildEntry>,
    cover: &mut Option<ChildEntry>,
    verb: PresenterVerb,
    page: Option<ChildEntry>,
) {
    match verb {
        PresenterVerb::Push | PresenterVerb::Pop | PresenterVerb::Replace => {
            apply_stack_op(stack, verb, page);
        }
        PresenterVerb::Present => {
            if let Some(p) = page {
                *cover = Some(p);
            }
        }
        PresenterVerb::Dismiss => {
            *cover = None;
        }
    }
}

/// Apply a stack verb. `pop` at `root` (len == 1) is a no-op.
pub fn apply_stack_op(stack: &mut Vec<ChildEntry>, verb: PresenterVerb, page: Option<ChildEntry>) {
    match verb {
        PresenterVerb::Push => {
            if let Some(p) = page {
                stack.push(p);
            }
        }
        PresenterVerb::Pop => {
            if stack.len() > 1 {
                stack.pop();
            }
        }
        PresenterVerb::Replace => {
            if let Some(p) = page {
                if let Some(last) = stack.last_mut() {
                    *last = p;
                } else {
                    stack.push(p);
                }
            }
        }
        PresenterVerb::Present | PresenterVerb::Dismiss => {}
    }
}

/// Fixture example → presenter let id → stack + optional cover.
pub fn presenter_pins_from_fixture(
    design: &DesignDefinition,
    component: &str,
    label: &str,
) -> HashMap<String, PresenterPin> {
    let mut out: HashMap<String, PresenterPin> = HashMap::new();
    let Some(fm) = design.fixtures.get(component) else {
        return out;
    };
    let Some(ex) = fm.get(label) else {
        return out;
    };
    for b in &ex.bindings {
        if let Some((let_id, field)) = b.name.split_once('.') {
            if field == "cover" {
                if let Some(entry) = child_entry_from_page_expr(&b.value) {
                    out.entry(let_id.to_string()).or_default().cover = Some(entry);
                }
            }
            continue;
        }
        if let Some(stack) = stack_from_value_expr(&b.value) {
            if !stack.is_empty() {
                out.entry(b.name.clone()).or_default().stack = stack;
            }
        }
    }
    out
}

/// JSON instance `{ component, params }` or `{ id }` → stack / cover entry.
pub fn child_entry_from_json(value: &Value) -> Option<ChildEntry> {
    let obj = value.as_object()?;
    if let Some(component) = obj.get("component").and_then(|v| v.as_str()) {
        let mut kwargs = IndexMap::new();
        if let Some(params) = obj
            .get("params")
            .or_else(|| obj.get("kwargs"))
            .and_then(|v| v.as_object())
        {
            for (k, v) in params {
                kwargs.insert(k.clone(), json_to_value_expr(v));
            }
        }
        return Some(ChildEntry::Instance {
            component: component.to_string(),
            kwargs,
            opacity: None,
        });
    }
    if let Some(id) = obj.get("id").and_then(|v| v.as_str()) {
        return Some(ChildEntry::FrameRef {
            id: id.to_string(),
            opacity: None,
        });
    }
    None
}

fn json_to_value_expr(value: &Value) -> ValueExpr {
    match value {
        Value::Null => ValueExpr::Null,
        Value::Bool(b) => ValueExpr::Boolean { value: *b },
        Value::Number(n) => ValueExpr::Number {
            value: n.as_f64().unwrap_or(0.0),
        },
        Value::String(s) if s.starts_with('.') => ValueExpr::DotEnum { value: s.clone() },
        Value::String(s) => ValueExpr::String { value: s.clone() },
        Value::Object(m) if m.get("component").and_then(|v| v.as_str()).is_some() => {
            let component = m["component"].as_str().unwrap_or("").to_string();
            let mut kwargs = IndexMap::new();
            if let Some(params) = m.get("params").and_then(|v| v.as_object()) {
                for (k, v) in params {
                    kwargs.insert(k.clone(), json_to_value_expr(v));
                }
            }
            ValueExpr::Instance { component, kwargs }
        }
        other => ValueExpr::String {
            value: other.to_string(),
        },
    }
}

fn child_entry_to_json(entry: &ChildEntry) -> Value {
    match entry {
        ChildEntry::Instance {
            component, kwargs, ..
        } => {
            let mut params = Map::new();
            for (k, v) in kwargs {
                params.insert(k.clone(), value_expr_to_json(v));
            }
            serde_json::json!({
                "component": component,
                "params": params,
            })
        }
        ChildEntry::FrameRef { id, .. } => serde_json::json!({ "id": id }),
        _ => Value::Null,
    }
}

fn value_expr_to_json(value: &ValueExpr) -> Value {
    match value {
        ValueExpr::Null => Value::Null,
        ValueExpr::Boolean { value } => Value::Bool(*value),
        ValueExpr::Number { value } => serde_json::Number::from_f64(*value)
            .map(Value::Number)
            .unwrap_or(Value::Null),
        ValueExpr::String { value } => Value::String(value.clone()),
        ValueExpr::DotEnum { value } => Value::String(value.clone()),
        ValueExpr::Ident { name } => Value::String(name.clone()),
        ValueExpr::Instance { component, kwargs } => {
            let mut params = Map::new();
            for (k, v) in kwargs {
                params.insert(k.clone(), value_expr_to_json(v));
            }
            serde_json::json!({ "component": component, "params": params })
        }
        _ => Value::Null,
    }
}

/// Playground / WASM pin bag → presenter lets.
///
/// Accepts either `{ letId: { stack, cover? } }` or catalogue fixture keys
/// (`presenter` array + `presenter.cover`).
pub fn pins_from_json(value: &Value) -> HashMap<String, PresenterPin> {
    let mut out: HashMap<String, PresenterPin> = HashMap::new();
    let Some(obj) = value.as_object() else {
        return out;
    };
    for (key, val) in obj {
        if let Some((let_id, field)) = key.split_once('.') {
            if field == "cover" {
                if let Some(entry) = child_entry_from_json(val) {
                    out.entry(let_id.to_string()).or_default().cover = Some(entry);
                }
            }
            continue;
        }
        match val {
            Value::Array(items) => {
                let stack: Vec<ChildEntry> =
                    items.iter().filter_map(child_entry_from_json).collect();
                if !stack.is_empty() {
                    out.entry(key.clone()).or_default().stack = stack;
                }
            }
            Value::Object(m) => {
                let pin = out.entry(key.clone()).or_default();
                if let Some(stack_v) = m.get("stack") {
                    if let Some(items) = stack_v.as_array() {
                        let stack: Vec<ChildEntry> =
                            items.iter().filter_map(child_entry_from_json).collect();
                        if !stack.is_empty() {
                            pin.stack = stack;
                        }
                    }
                } else if m.get("component").is_some() {
                    if let Some(entry) = child_entry_from_json(val) {
                        pin.stack = vec![entry];
                    }
                }
                if let Some(cover_v) = m.get("cover") {
                    if cover_v.is_null() {
                        pin.cover = None;
                    } else {
                        pin.cover = child_entry_from_json(cover_v);
                    }
                }
            }
            _ => {}
        }
    }
    out
}

pub fn pins_to_json(pins: &HashMap<String, PresenterPin>) -> Value {
    let mut o = Map::new();
    let mut keys: Vec<&String> = pins.keys().collect();
    keys.sort();
    for k in keys {
        let pin = &pins[k];
        let stack: Vec<Value> = pin.stack.iter().map(child_entry_to_json).collect();
        let mut rec = Map::new();
        rec.insert("stack".into(), Value::Array(stack));
        if let Some(c) = &pin.cover {
            rec.insert("cover".into(), child_entry_to_json(c));
        }
        o.insert(k.clone(), Value::Object(rec));
    }
    Value::Object(o)
}

/// Apply `{ qualifier, name, page?, style? }` ops to a pin bag. Unknown verbs skipped.
pub fn apply_presenter_ops_json(pins: &Value, ops: &Value) -> Value {
    let mut map = pins_from_json(pins);
    let Some(items) = ops.as_array() else {
        return pins_to_json(&map);
    };
    for op in items {
        let Some(obj) = op.as_object() else {
            continue;
        };
        let qualifier = obj
            .get("qualifier")
            .and_then(|v| v.as_str())
            .unwrap_or("presenter");
        let name = obj.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let Some(verb) = PresenterVerb::from_name(name) else {
            continue;
        };
        let page = obj.get("page").and_then(child_entry_from_json);
        let pin = map.entry(qualifier.to_string()).or_default();
        apply_presenter_op(&mut pin.stack, &mut pin.cover, verb, page);
    }
    pins_to_json(&map)
}

/// Display name for a stack / cover entry (`Home` / let id).
pub fn stack_entry_name(entry: &ChildEntry) -> String {
    match entry {
        ChildEntry::Instance { component, .. } => component.clone(),
        ChildEntry::FrameRef { id, .. } => id.clone(),
        _ => "page".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use indexmap::IndexMap;

    fn page(name: &str) -> ChildEntry {
        ChildEntry::Instance {
            component: name.into(),
            kwargs: IndexMap::new(),
            opacity: None,
        }
    }

    #[test]
    fn pop_at_root_is_noop() {
        let mut stack = vec![page("Home")];
        apply_stack_op(&mut stack, PresenterVerb::Pop, None);
        assert_eq!(stack.len(), 1);
        assert_eq!(stack_entry_name(&stack[0]), "Home");
    }

    #[test]
    fn push_then_pop_returns_to_root() {
        let mut stack = vec![page("Home")];
        apply_stack_op(&mut stack, PresenterVerb::Push, Some(page("Episode")));
        assert_eq!(stack.len(), 2);
        apply_stack_op(&mut stack, PresenterVerb::Pop, None);
        assert_eq!(stack_entry_name(&stack[0]), "Home");
        assert_eq!(stack.len(), 1);
    }

    #[test]
    fn present_sets_cover_dismiss_clears_stack_unchanged() {
        let mut stack = vec![page("Home"), page("Episode")];
        let mut cover = None;
        apply_presenter_op(
            &mut stack,
            &mut cover,
            PresenterVerb::Present,
            Some(page("Settings")),
        );
        assert_eq!(stack_entry_name(cover.as_ref().unwrap()), "Settings");
        assert_eq!(stack.len(), 2);
        apply_presenter_op(&mut stack, &mut cover, PresenterVerb::Dismiss, None);
        assert!(cover.is_none());
        assert_eq!(stack_entry_name(&stack[1]), "Episode");
    }

    #[test]
    fn dismiss_when_vacant_is_noop() {
        let mut stack = vec![page("Home")];
        let mut cover = None;
        apply_presenter_op(&mut stack, &mut cover, PresenterVerb::Dismiss, None);
        assert!(cover.is_none());
        assert_eq!(stack.len(), 1);
    }

    #[test]
    fn pins_from_catalogue_fixture_keys() {
        let v = serde_json::json!({
            "presenter": [
                { "component": "Home", "params": {} },
                { "component": "Episode", "params": { "episodeId": "demo" } }
            ],
            "presenter.cover": { "component": "Settings", "params": {} }
        });
        let pins = pins_from_json(&v);
        let pin = pins.get("presenter").expect("presenter let");
        assert_eq!(pin.stack.len(), 2);
        assert_eq!(stack_entry_name(&pin.stack[1]), "Episode");
        assert_eq!(stack_entry_name(pin.cover.as_ref().unwrap()), "Settings");
    }

    #[test]
    fn apply_ops_json_home_episode_cover_dismiss_pop() {
        let start = serde_json::json!({
            "presenter": { "stack": [{ "component": "Home", "params": {} }] }
        });
        let after_push = apply_presenter_ops_json(
            &start,
            &serde_json::json!([{
                "qualifier": "presenter",
                "name": "push",
                "page": { "component": "Episode", "params": { "episodeId": "demo" } }
            }]),
        );
        assert_eq!(after_push["presenter"]["stack"][1]["component"], "Episode");
        let after_present = apply_presenter_ops_json(
            &after_push,
            &serde_json::json!([{
                "qualifier": "presenter",
                "name": "present",
                "page": { "component": "Settings", "params": {} },
                "style": "cover"
            }]),
        );
        assert_eq!(after_present["presenter"]["cover"]["component"], "Settings");
        assert_eq!(
            after_present["presenter"]["stack"]
                .as_array()
                .unwrap()
                .len(),
            2
        );
        let after_dismiss = apply_presenter_ops_json(
            &after_present,
            &serde_json::json!([{ "qualifier": "presenter", "name": "dismiss" }]),
        );
        assert!(after_dismiss["presenter"].get("cover").is_none());
        assert_eq!(
            after_dismiss["presenter"]["stack"][1]["component"],
            "Episode"
        );
        let after_pop = apply_presenter_ops_json(
            &after_dismiss,
            &serde_json::json!([{ "qualifier": "presenter", "name": "pop" }]),
        );
        assert_eq!(after_pop["presenter"]["stack"].as_array().unwrap().len(), 1);
        assert_eq!(after_pop["presenter"]["stack"][0]["component"], "Home");
        let pop_root = apply_presenter_ops_json(
            &after_pop,
            &serde_json::json!([{ "qualifier": "presenter", "name": "pop" }]),
        );
        assert_eq!(pop_root["presenter"]["stack"].as_array().unwrap().len(), 1);
    }
}
