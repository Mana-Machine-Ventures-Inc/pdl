//! Baked design documents.
//!
//! Rust port of `src/bakeDesign.ts`. Produces fully materialised, draw-oriented
//! JSON (one component entry per component, no token tables).

use std::collections::HashSet;

use serde_json::{Map, Value};

use crate::ast::{ComponentDecl, RootKind, ValueExpr};
use crate::design::DesignDefinition;
use crate::error::PdlError;
use crate::evaluate::{build_resolved_token_map, evaluate_value, Eval, Tokens};
use crate::resolve::{
    prune_hidden_children_tree, resolve_component_tree, resolve_default_param_values, CatalFrame,
    RESOLVE_OPTIONS_LITERAL_BAKE,
};

/// Schema version for stable PDL JSON artefacts. Matches the TypeScript oracle
/// (`src/graphJson.ts` `PDL_JSON_SCHEMA_VERSION`) so goldens compare byte-for-byte.
pub const PDL_JSON_SCHEMA_VERSION: &str = "1.0.0-beta";

fn root_kind_str(k: RootKind) -> &'static str {
    match k {
        RootKind::Layout => "layout",
        RootKind::Text => "text",
        RootKind::Icon => "icon",
        RootKind::Media => "media",
    }
}

/// Expand `style = TypeStyle` into concrete text props, then drop the `typeStyle` name.
/// Explicit frame props win over preset defaults.
fn expand_type_style_into_frame(
    design: &DesignDefinition,
    tokens: &mut Tokens,
    frame: &CatalFrame,
) -> Result<CatalFrame, PdlError> {
    let mut props = frame.props.clone();
    if let Some(Value::String(ts_raw)) = props.get("typeStyle").cloned() {
        let name = ts_raw
            .strip_prefix("typeStyle:")
            .unwrap_or(ts_raw.as_str());
        if let Some(decl) = design.type_styles.get(name) {
            let mut from_style = Map::new();
            for (k, expr) in &decl.props {
                if matches!(expr, ValueExpr::Null) {
                    continue;
                }
                let mut visiting = HashSet::new();
                let mut ev = Eval {
                    design,
                    tokens,
                    visiting: &mut visiting,
                    param_values: None,
                    param_meta: None,
                    use_string_placeholders: false,
                };
                let v = evaluate_value(expr, &mut ev)?;
                if v.is_null() {
                    continue;
                }
                from_style.insert(k.clone(), v);
            }
            let frame_rest = {
                let mut rest = props.clone();
                rest.remove("typeStyle");
                rest
            };
            props = from_style;
            for (k, v) in frame_rest {
                if v.is_null() {
                    props.remove(&k);
                } else {
                    props.insert(k, v);
                }
            }
            props.remove("typeStyle");
        } else if props.len() > 1 {
            props.remove("typeStyle");
        }
    }
    // Strip remaining null sentinels (unset → absent default).
    props.retain(|_, v| !v.is_null());
    let mut children = Vec::with_capacity(frame.children.len());
    for ch in &frame.children {
        children.push(expand_type_style_into_frame(design, tokens, ch)?);
    }
    Ok(CatalFrame {
        id: frame.id.clone(),
        kind: frame.kind.clone(),
        props,
        children,
        instance_of: frame.instance_of.clone(),
        instance_kwargs: if frame.instance_of.is_some() {
            Some(frame.instance_kwargs.clone().unwrap_or_default())
        } else {
            None
        },
        foreach_list: frame.foreach_list.clone(),
    })
}

fn bake_frame_tree(
    design: &DesignDefinition,
    tokens: &mut Tokens,
    raw: &CatalFrame,
) -> Result<CatalFrame, PdlError> {
    expand_type_style_into_frame(design, tokens, &prune_hidden_children_tree(raw))
}

fn baked_component_json(name: &str, root_kind: &str, baked_params: Value, root: Value) -> Value {
    let mut o = Map::new();
    o.insert("name".to_string(), Value::String(name.to_string()));
    o.insert("rootKind".to_string(), Value::String(root_kind.to_string()));
    o.insert("bakedParams".to_string(), baked_params);
    o.insert("root".to_string(), root);
    Value::Object(o)
}

fn resolve_preview_background_css(design: &DesignDefinition, token_map: &Tokens) -> Option<String> {
    let name = design.preview_background.as_ref()?;
    match token_map.get(name) {
        Some(Value::String(s)) if !s.trim().is_empty() => Some(s.trim().to_string()),
        _ => None,
    }
}

fn baked_document(
    generated_at: &str,
    entry_path: &str,
    baked_theme: Option<&str>,
    bake_profile: &str,
    components: Map<String, Value>,
    preview_background: Option<String>,
) -> Value {
    let mut provenance = Map::new();
    provenance.insert(
        "entryPath".to_string(),
        Value::String(entry_path.to_string()),
    );
    provenance.insert(
        "bakedTheme".to_string(),
        match baked_theme {
            Some(t) => Value::String(t.to_string()),
            None => Value::Null,
        },
    );
    provenance.insert(
        "bakeProfile".to_string(),
        Value::String(bake_profile.to_string()),
    );

    let mut doc = Map::new();
    doc.insert(
        "schemaKind".to_string(),
        Value::String("bakedDesign".to_string()),
    );
    doc.insert(
        "schemaVersion".to_string(),
        Value::String(PDL_JSON_SCHEMA_VERSION.to_string()),
    );
    doc.insert(
        "generatedAt".to_string(),
        Value::String(generated_at.to_string()),
    );
    doc.insert("provenance".to_string(), Value::Object(provenance));
    if let Some(bg) = preview_background {
        doc.insert("previewBackground".to_string(), Value::String(bg));
    }
    doc.insert("components".to_string(), Value::Object(components));
    Value::Object(doc)
}

/// Fully materialised bake of every component (default params).
pub fn build_baked_design_system(
    design: &DesignDefinition,
    theme: Option<&str>,
    generated_at: Option<String>,
) -> Result<Value, PdlError> {
    let mut token_map = build_resolved_token_map(design, theme, &[])?;
    let opts = RESOLVE_OPTIONS_LITERAL_BAKE;

    let mut sorted: Vec<&ComponentDecl> = design.components.values().collect();
    sorted.sort_by(|a, b| a.name.cmp(&b.name));

    let mut components = Map::new();
    let empty_overrides = Map::new();
    for c in sorted {
        let mut baked_params = resolve_default_param_values(design, &mut token_map, c)?;
        crate::resolve::sync_editable_text_facts(
            design,
            c,
            &mut baked_params,
            &empty_overrides,
        )?;
        let raw = resolve_component_tree(design, &c.name, &mut token_map, &Map::new(), opts)?;
        components.insert(
            c.name.clone(),
            baked_component_json(
                &c.name,
                root_kind_str(c.root_kind),
                Value::Object(baked_params),
                bake_frame_tree(design, &mut token_map, &raw)?.to_value(),
            ),
        );
    }

    let preview_background = resolve_preview_background_css(design, &token_map);
    Ok(baked_document(
        &generated_at.unwrap_or_else(now_iso8601),
        &design.entry_path,
        theme,
        "system-defaults",
        components,
        preview_background,
    ))
}

/// Single-component bake (explicit params + optional theme).
pub fn build_baked_design_component(
    design: &DesignDefinition,
    component_name: &str,
    theme: Option<&str>,
    param_overrides: &Map<String, Value>,
    generated_at: Option<String>,
) -> Result<Value, PdlError> {
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
    let mut token_map = build_resolved_token_map(design, theme, &[])?;
    let opts = RESOLVE_OPTIONS_LITERAL_BAKE;
    let defaults = resolve_default_param_values(design, &mut token_map, &c)?;
    let mut baked_params = defaults;
    for (k, v) in param_overrides {
        baked_params.insert(k.clone(), v.clone());
    }
    // Same EditableText fact sync as resolve — HTML session host reads bakedParams.value.
    crate::resolve::sync_editable_text_facts(design, &c, &mut baked_params, param_overrides)?;
    let raw = resolve_component_tree(
        design,
        component_name,
        &mut token_map,
        param_overrides,
        opts,
    )?;

    let mut components = Map::new();
    components.insert(
        component_name.to_string(),
        baked_component_json(
            component_name,
            root_kind_str(c.root_kind),
            Value::Object(baked_params),
            bake_frame_tree(design, &mut token_map, &raw)?.to_value(),
        ),
    );

    let preview_background = resolve_preview_background_css(design, &token_map);
    Ok(baked_document(
        &generated_at.unwrap_or_else(now_iso8601),
        &design.entry_path,
        theme,
        "component-explicit",
        components,
        preview_background,
    ))
}

/// Minimal UTC ISO-8601 timestamp (`YYYY-MM-DDTHH:MM:SS.sssZ`) without external deps.
pub(crate) fn now_iso8601() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let dur = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let secs = dur.as_secs() as i64;
    let millis = dur.subsec_millis();
    let days = secs.div_euclid(86_400);
    let secs_of_day = secs.rem_euclid(86_400);
    let (year, month, day) = civil_from_days(days);
    let hour = secs_of_day / 3600;
    let minute = (secs_of_day % 3600) / 60;
    let second = secs_of_day % 60;
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z",
        year, month, day, hour, minute, second, millis
    )
}

/// Howard Hinnant's `civil_from_days` (days since 1970-01-01 → (y, m, d)).
fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    (if m <= 2 { y + 1 } else { y }, m, d)
}
