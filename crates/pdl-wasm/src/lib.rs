//! Browser / WASM surface for `pdl-core` bake.
//!
//! Sources are passed as a JSON object of absolute/virtual paths → UTF-8 PDL.
//! HTML rendering stays on the TypeScript host (`/api/render-from-bake`).

use pdl_core::bake::{
    build_baked_design_component_with_host, build_baked_design_component_with_presenter_pins,
    build_baked_design_system_with_host,
};
use pdl_core::presenter::{apply_presenter_ops_json, pins_from_json};
use pdl_core::{load_design_from_sources, SourceMap};
use serde_json::{Map, Value};
use wasm_bindgen::prelude::*;

fn err_js(e: impl std::fmt::Display) -> JsValue {
    JsValue::from_str(&e.to_string())
}

fn parse_sources(files_json: &str) -> Result<SourceMap, JsValue> {
    let v: Value = serde_json::from_str(files_json).map_err(|e| err_js(format!("files JSON: {e}")))?;
    let obj = v
        .as_object()
        .ok_or_else(|| err_js("files JSON must be an object of path → source"))?;
    let mut sources = SourceMap::new();
    for (k, val) in obj {
        let text = val
            .as_str()
            .ok_or_else(|| err_js(format!("file `{k}` must be a string")))?;
        sources.insert(k.replace('\\', "/"), text.to_string());
    }
    if sources.is_empty() {
        return Err(err_js("expected at least one source file"));
    }
    Ok(sources)
}

fn parse_kv(kv_json: Option<String>) -> Result<Map<String, Value>, JsValue> {
    match kv_json {
        None => Ok(Map::new()),
        Some(s) if s.trim().is_empty() => Ok(Map::new()),
        Some(s) => {
            let v: Value = serde_json::from_str(&s).map_err(|e| err_js(format!("kv JSON: {e}")))?;
            match v {
                Value::Object(m) => Ok(m),
                _ => Err(err_js("kv must be a JSON object")),
            }
        }
    }
}

const FIXED_AT: &str = "1970-01-01T00:00:00.000Z";

/// List component names after merge/validate (sorted).
#[wasm_bindgen]
pub fn analyze_sources(files_json: &str, entry: &str) -> Result<String, JsValue> {
    let sources = parse_sources(files_json)?;
    let design = load_design_from_sources(entry, &sources).map_err(|e| err_js(e.format()))?;
    let mut names: Vec<&str> = design.components.keys().map(|s| s.as_str()).collect();
    names.sort_unstable();
    let mut themes: Vec<&str> = design.themes.keys().map(|s| s.as_str()).collect();
    themes.sort_unstable();
    let out = serde_json::json!({
        "ok": true,
        "components": names,
        "themes": themes,
        "entryPath": design.entry_path,
    });
    Ok(out.to_string())
}

fn parse_pins(pins_json: Option<String>) -> Result<std::collections::HashMap<String, pdl_core::presenter::PresenterPin>, JsValue> {
    match pins_json {
        None => Ok(std::collections::HashMap::new()),
        Some(s) if s.trim().is_empty() => Ok(std::collections::HashMap::new()),
        Some(s) => {
            let v: Value = serde_json::from_str(&s).map_err(|e| err_js(format!("pins JSON: {e}")))?;
            Ok(pins_from_json(&v))
        }
    }
}

/// Bake one component; returns bake-document JSON string.
#[wasm_bindgen]
pub fn bake_component_sources(
    files_json: &str,
    entry: &str,
    component: &str,
    theme: Option<String>,
    kv_json: Option<String>,
    host: Option<String>,
    host_facts_json: Option<String>,
    pins_json: Option<String>,
) -> Result<String, JsValue> {
    let sources = parse_sources(files_json)?;
    let design = load_design_from_sources(entry, &sources).map_err(|e| err_js(e.format()))?;
    let kv = parse_kv(kv_json)?;
    let facts = parse_kv(host_facts_json)?;
    let pins = parse_pins(pins_json)?;
    let theme_ref = theme.as_deref().filter(|t| !t.is_empty());
    let host_ref = host.as_deref().filter(|t| !t.is_empty());
    let facts_ref = if facts.is_empty() { None } else { Some(&facts) };
    let doc = if pins.is_empty() {
        build_baked_design_component_with_host(
            &design,
            component,
            theme_ref,
            &kv,
            host_ref,
            facts_ref,
            Some(FIXED_AT.to_string()),
        )
    } else {
        build_baked_design_component_with_presenter_pins(
            &design,
            component,
            theme_ref,
            &kv,
            host_ref,
            facts_ref,
            Some(FIXED_AT.to_string()),
            pins,
        )
    }
    .map_err(|e| err_js(e.format()))?;
    Ok(doc.to_string())
}

/// Apply presenter verbs to a pin bag. `pinsJson` / `opsJson` → next `pinsJson`.
#[wasm_bindgen]
pub fn apply_presenter_pins(pins_json: &str, ops_json: &str) -> Result<String, JsValue> {
    let pins: Value =
        serde_json::from_str(pins_json).map_err(|e| err_js(format!("pins JSON: {e}")))?;
    let ops: Value = serde_json::from_str(ops_json).map_err(|e| err_js(format!("ops JSON: {e}")))?;
    Ok(apply_presenter_ops_json(&pins, &ops).to_string())
}

/// Bake a variant-matrix gallery in one load.
///
/// `cells_json` is a JSON array of `{ "component": "Name", "label": "Name · …", "kv": {…} }`.
/// Design sources are parsed **once**; each cell resolves against that design.
/// Optional `pins_by_component_json` is `{ "Name": <pins bag>, … }` for screen cells.
#[wasm_bindgen]
pub fn bake_variant_matrix_sources(
    files_json: &str,
    entry: &str,
    cells_json: &str,
    theme: Option<String>,
    host: Option<String>,
    host_facts_json: Option<String>,
    pins_by_component_json: Option<String>,
) -> Result<String, JsValue> {
    let sources = parse_sources(files_json)?;
    let design = load_design_from_sources(entry, &sources).map_err(|e| err_js(e.format()))?;
    let facts = parse_kv(host_facts_json)?;
    let theme_ref = theme.as_deref().filter(|t| !t.is_empty());
    let host_ref = host.as_deref().filter(|t| !t.is_empty());
    let facts_ref = if facts.is_empty() { None } else { Some(&facts) };

    let cells_v: Value =
        serde_json::from_str(cells_json).map_err(|e| err_js(format!("cells JSON: {e}")))?;
    let cells = cells_v
        .as_array()
        .ok_or_else(|| err_js("cells JSON must be an array"))?;

    let pins_by_component: Map<String, Value> = match pins_by_component_json {
        None => Map::new(),
        Some(s) if s.trim().is_empty() => Map::new(),
        Some(s) => {
            let v: Value =
                serde_json::from_str(&s).map_err(|e| err_js(format!("pinsByComponent JSON: {e}")))?;
            match v {
                Value::Object(m) => m,
                _ => return Err(err_js("pinsByComponent must be a JSON object")),
            }
        }
    };

    let mut merged = Map::new();
    for (i, cell) in cells.iter().enumerate() {
        let obj = cell
            .as_object()
            .ok_or_else(|| err_js(format!("cells[{i}] must be an object")))?;
        let component = obj
            .get("component")
            .and_then(|v| v.as_str())
            .ok_or_else(|| err_js(format!("cells[{i}].component must be a string")))?;
        let label = obj
            .get("label")
            .and_then(|v| v.as_str())
            .unwrap_or(component);
        let kv = match obj.get("kv") {
            None => Map::new(),
            Some(Value::Object(m)) => m.clone(),
            Some(_) => return Err(err_js(format!("cells[{i}].kv must be an object"))),
        };

        let pins = match pins_by_component.get(component) {
            Some(v) => pins_from_json(v),
            None => std::collections::HashMap::new(),
        };

        let doc = if pins.is_empty() {
            build_baked_design_component_with_host(
                &design,
                component,
                theme_ref,
                &kv,
                host_ref,
                facts_ref,
                Some(FIXED_AT.to_string()),
            )
        } else {
            build_baked_design_component_with_presenter_pins(
                &design,
                component,
                theme_ref,
                &kv,
                host_ref,
                facts_ref,
                Some(FIXED_AT.to_string()),
                pins,
            )
        }
        .map_err(|e| err_js(e.format()))?;

        let tree = doc
            .get("components")
            .and_then(|c| c.get(component))
            .cloned()
            .ok_or_else(|| err_js(format!("bake missing component `{component}`")))?;
        merged.insert(label.to_string(), tree);
    }

    let out = serde_json::json!({
        "schemaVersion": "1.0.0-beta",
        "generatedAt": FIXED_AT,
        "provenance": {
            "entryPath": design.entry_path,
            "bakedTheme": theme_ref,
            "bakeProfile": "variant-matrix",
        },
        "components": Value::Object(merged),
    });
    Ok(out.to_string())
}

/// Bake all components (system defaults).
#[wasm_bindgen]
pub fn bake_system_sources(
    files_json: &str,
    entry: &str,
    theme: Option<String>,
    host: Option<String>,
    host_facts_json: Option<String>,
) -> Result<String, JsValue> {
    let sources = parse_sources(files_json)?;
    let design = load_design_from_sources(entry, &sources).map_err(|e| err_js(e.format()))?;
    let facts = parse_kv(host_facts_json)?;
    let theme_ref = theme.as_deref().filter(|t| !t.is_empty());
    let host_ref = host.as_deref().filter(|t| !t.is_empty());
    let facts_ref = if facts.is_empty() { None } else { Some(&facts) };
    let doc = build_baked_design_system_with_host(
        &design,
        theme_ref,
        host_ref,
        facts_ref,
        Some(FIXED_AT.to_string()),
    )
    .map_err(|e| err_js(e.format()))?;
    Ok(doc.to_string())
}
