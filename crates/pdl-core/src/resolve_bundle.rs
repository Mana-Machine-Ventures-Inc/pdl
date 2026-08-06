//! Resolved component document (`graphComponent` / `resolve`).
//!
//! Rust port of `src/resolveBundle.ts` (`buildResolvedComponentDocument`). Emits
//! the stable `resolvedComponent` JSON: a catalogue row per component in the
//! transitive required closure plus a trimmed `system` bundle of the tokens,
//! themes, and type styles the closure references.

use std::collections::BTreeSet;

use indexmap::IndexMap;
use serde_json::{Map, Value};

use crate::ast::*;
use crate::bake::{now_iso8601, PDL_JSON_SCHEMA_VERSION};
use crate::catalogue::{build_catalogue_component_row, collect_required_component_names};
use crate::design::DesignDefinition;
use crate::error::PdlError;
use crate::evaluate::build_resolved_token_map;
use crate::graph_serialize::{
    collect_declared_token_names_from_value_expr, serialise_value_expr_with_token_refs,
};

fn obj(entries: Vec<(&str, Value)>) -> Value {
    let mut m = Map::new();
    for (k, v) in entries {
        m.insert(k.to_string(), v);
    }
    Value::Object(m)
}

fn strip_ref(s: &str, prefix: &str) -> Option<String> {
    s.strip_prefix(prefix)
        .filter(|rest| !rest.is_empty())
        .map(|rest| rest.to_string())
}

fn collect_token_ref_names(value: &Value, sink: &mut BTreeSet<String>) {
    match value {
        Value::String(s) => {
            if let Some(name) = strip_ref(s, "primitive:") {
                sink.insert(name);
                return;
            }
            if let Some(name) = strip_ref(s, "semantic:") {
                sink.insert(name);
            }
        }
        Value::Array(arr) => {
            for el in arr {
                collect_token_ref_names(el, sink);
            }
        }
        Value::Object(o) => {
            for v in o.values() {
                collect_token_ref_names(v, sink);
            }
        }
        _ => {}
    }
}

fn collect_type_style_names(
    value: &Value,
    known_styles: &IndexMap<String, TypeStyleDecl>,
    sink: &mut BTreeSet<String>,
) {
    match value {
        Value::String(s) => {
            if known_styles.contains_key(s) {
                sink.insert(s.clone());
            }
        }
        Value::Array(arr) => {
            for el in arr {
                collect_type_style_names(el, known_styles, sink);
            }
        }
        Value::Object(o) => {
            if let Some(Value::String(ts)) = o.get("typeStyle") {
                let style_name = strip_ref(ts, "typeStyle:").unwrap_or_else(|| ts.clone());
                if known_styles.contains_key(&style_name) {
                    sink.insert(style_name);
                }
            }
            for v in o.values() {
                collect_type_style_names(v, known_styles, sink);
            }
        }
        _ => {}
    }
}

/// Gather `primitive:` / `semantic:` and type-style usage from one catalogue row Value.
fn collect_usage_from_row(
    row: &Value,
    known_styles: &IndexMap<String, TypeStyleDecl>,
    token_names: &mut BTreeSet<String>,
    type_style_names: &mut BTreeSet<String>,
) {
    if let Some(props) = row.get("root").and_then(|r| r.get("props")) {
        collect_token_ref_names(props, token_names);
        collect_type_style_names(props, known_styles, type_style_names);
    }
    if let Some(Value::Object(nodes)) = row.get("childNodes") {
        for node in nodes.values() {
            collect_token_ref_names(node, token_names);
            collect_type_style_names(node, known_styles, type_style_names);
        }
    }
    if let Some(Value::Array(variants)) = row.get("variants") {
        for v in variants {
            if let Some(Value::Array(changes)) = v.get("changes") {
                for ch in changes {
                    if let Some(val) = ch.get("value") {
                        collect_token_ref_names(val, token_names);
                    }
                }
                for ch in changes {
                    if let Some(val) = ch.get("value") {
                        collect_type_style_names(val, known_styles, type_style_names);
                    }
                }
            }
        }
    }
}

fn augment_token_names_from_used_type_styles(
    design: &DesignDefinition,
    type_style_names: &BTreeSet<String>,
    token_names: &mut BTreeSet<String>,
) {
    for ts_name in type_style_names {
        if let Some(decl) = design.type_styles.get(ts_name) {
            for expr in decl.props.values() {
                collect_declared_token_names_from_value_expr(expr, design, token_names);
            }
        }
    }
}

fn augment_token_names_transitive_from_definitions(
    design: &DesignDefinition,
    token_names: &mut BTreeSet<String>,
) {
    let mut prev = usize::MAX;
    while token_names.len() != prev {
        prev = token_names.len();
        let snapshot: Vec<String> = token_names.iter().cloned().collect();
        for name in snapshot {
            if let Some(prim) = design.primitives.get(&name) {
                collect_declared_token_names_from_value_expr(&prim.value, design, token_names);
            }
            if let Some(sem) = design.semantics.get(&name) {
                collect_declared_token_names_from_value_expr(&sem.value, design, token_names);
            }
        }
    }
}

fn augment_token_names_from_relevant_themes_and_definitions(
    design: &DesignDefinition,
    token_names: &mut BTreeSet<String>,
) {
    let mut prev = usize::MAX;
    while token_names.len() != prev {
        prev = token_names.len();
        for t in design.themes.values() {
            for (key, expr) in &t.overrides {
                if !token_names.contains(key) {
                    continue;
                }
                collect_declared_token_names_from_value_expr(expr, design, token_names);
            }
        }
        augment_token_names_transitive_from_definitions(design, token_names);
    }
}

/// Build the full `resolvedComponent` document for `component_name`.
pub fn build_resolved_component_document(
    design: &DesignDefinition,
    component_name: &str,
    param_overrides: &Map<String, Value>,
    theme: Option<&str>,
    modifiers: &[String],
    generated_at: Option<String>,
) -> Result<Value, PdlError> {
    if !design.components.contains_key(component_name) {
        return Err(PdlError::new(
            "PDL-E006",
            format!("Unknown component {component_name}"),
            Some(design.entry_path.clone()),
            None,
            None,
        ));
    }
    let mut tokens = build_resolved_token_map(design, theme, modifiers)?;

    let dep_names = collect_required_component_names(design, component_name);
    let mut all_names: BTreeSet<String> = BTreeSet::new();
    all_names.insert(component_name.to_string());
    all_names.extend(dep_names);

    // Preserve deterministic (sorted) order for the closure.
    let mut catalogue_rows: Vec<(String, Value)> = Vec::new();
    for name in &all_names {
        let decl = design.components.get(name).cloned().ok_or_else(|| {
            PdlError::new(
                "PDL-E006",
                format!("Unknown component {name} in required closure"),
                Some(design.entry_path.clone()),
                None,
                None,
            )
        })?;
        let row = build_catalogue_component_row(design, &mut tokens, &decl)?;
        catalogue_rows.push((name.clone(), row));
    }

    let known_styles = &design.type_styles;
    let mut token_names: BTreeSet<String> = BTreeSet::new();
    let mut type_style_names: BTreeSet<String> = BTreeSet::new();
    for (_, row) in &catalogue_rows {
        collect_usage_from_row(row, known_styles, &mut token_names, &mut type_style_names);
    }
    augment_token_names_from_used_type_styles(design, &type_style_names, &mut token_names);
    augment_token_names_from_relevant_themes_and_definitions(design, &mut token_names);

    // primitives (filtered)
    let mut primitives = Map::new();
    for p in design.primitives.values() {
        if !token_names.contains(&p.name) {
            continue;
        }
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

    // semantics (filtered)
    let mut semantics = Map::new();
    for s in design.semantics.values() {
        if !token_names.contains(&s.name) {
            continue;
        }
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

    // themes (filtered by relevant override keys)
    let mut themes = Map::new();
    for t in design.themes.values() {
        let mut keys: Vec<&String> = t
            .overrides
            .keys()
            .filter(|k| token_names.contains(*k))
            .collect();
        if keys.is_empty() {
            continue;
        }
        keys.sort();
        let mut overrides = Map::new();
        for k in keys {
            overrides.insert(
                k.clone(),
                serialise_value_expr_with_token_refs(&t.overrides[k], design),
            );
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

    // typeStyles (filtered)
    let mut type_styles = Map::new();
    for ts in design.type_styles.values() {
        if !type_style_names.contains(&ts.name) {
            continue;
        }
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

    // variantTypes used by the closure
    let mut used_variant_type_names: BTreeSet<String> = BTreeSet::new();
    for (_, row) in &catalogue_rows {
        if let Some(Value::Array(params)) = row.get("params") {
            for p in params {
                if let Some(Value::String(vtn)) = p.get("variantTypeName") {
                    used_variant_type_names.insert(vtn.clone());
                }
            }
        }
    }
    let mut variant_types = Map::new();
    for n in &used_variant_type_names {
        let v = design.variants.get(n).ok_or_else(|| {
            PdlError::new(
                "PDL-E001",
                format!("Unknown variant type {n}"),
                Some(design.entry_path.clone()),
                None,
                None,
            )
        })?;
        variant_types.insert(
            n.clone(),
            obj(vec![
                ("name", Value::String(v.name.clone())),
                (
                    "cases",
                    Value::Array(v.cases.iter().map(|c| Value::String(c.clone())).collect()),
                ),
            ]),
        );
    }

    // components (strip defaultParams)
    let mut components = Map::new();
    for (name, row) in catalogue_rows {
        let mut row = row;
        if let Value::Object(m) = &mut row {
            m.remove("defaultParams");
        }
        components.insert(name, row);
    }

    // system bundle
    let mut system = Map::new();
    if let Some(t) = theme {
        system.insert("theme".to_string(), Value::String(t.to_string()));
    }
    system.insert("variantTypes".to_string(), Value::Object(variant_types));
    system.insert("primitives".to_string(), Value::Object(primitives));
    system.insert("semantics".to_string(), Value::Object(semantics));
    system.insert("themes".to_string(), Value::Object(themes));
    system.insert("typeStyles".to_string(), Value::Object(type_styles));

    let mut doc = Map::new();
    doc.insert(
        "schemaKind".to_string(),
        Value::String("resolvedComponent".to_string()),
    );
    doc.insert(
        "schemaVersion".to_string(),
        Value::String(PDL_JSON_SCHEMA_VERSION.to_string()),
    );
    doc.insert(
        "generatedAt".to_string(),
        Value::String(generated_at.unwrap_or_else(now_iso8601)),
    );
    doc.insert(
        "entryPath".to_string(),
        Value::String(design.entry_path.clone()),
    );
    doc.insert(
        "primaryComponent".to_string(),
        Value::String(component_name.to_string()),
    );
    doc.insert("components".to_string(), Value::Object(components));
    if !param_overrides.is_empty() {
        doc.insert(
            "paramOverrides".to_string(),
            Value::Object(param_overrides.clone()),
        );
    }
    doc.insert("system".to_string(), Value::Object(system));

    Ok(Value::Object(doc))
}
