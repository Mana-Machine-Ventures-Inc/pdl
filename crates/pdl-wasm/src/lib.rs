//! Browser / WASM surface for `pdl-core` bake.
//!
//! Sources are passed as a JSON object of absolute/virtual paths → UTF-8 PDL.
//! HTML rendering stays on the TypeScript host (`/api/render-from-bake`).

use pdl_core::bake::{
    build_baked_design_component_with_host, build_baked_design_system_with_host,
};
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
) -> Result<String, JsValue> {
    let sources = parse_sources(files_json)?;
    let design = load_design_from_sources(entry, &sources).map_err(|e| err_js(e.format()))?;
    let kv = parse_kv(kv_json)?;
    let facts = parse_kv(host_facts_json)?;
    let theme_ref = theme.as_deref().filter(|t| !t.is_empty());
    let host_ref = host.as_deref().filter(|t| !t.is_empty());
    let facts_ref = if facts.is_empty() { None } else { Some(&facts) };
    let doc = build_baked_design_component_with_host(
        &design,
        component,
        theme_ref,
        &kv,
        host_ref,
        facts_ref,
        Some(FIXED_AT.to_string()),
    )
    .map_err(|e| err_js(e.format()))?;
    Ok(doc.to_string())
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
