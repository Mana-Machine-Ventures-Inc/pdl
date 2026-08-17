//! Injection pack validate + bake (B3).
//!
//! External JSON packs supply instance params for a target component. After
//! catalogue-gated validation (with soft-skip warnings for bad list items),
//! packs reuse the same bake path as explicit `bakeComponent` overrides.
//!
//! See `shared/schema/injection-pack.json` and `docs/PROPOSAL_SLOTS_PROTOCOLS_FIXTURES.md` §9.3.

use serde_json::{Map, Value};

use crate::ast::ComponentParam;
use crate::bake::{build_baked_design_component, PDL_JSON_SCHEMA_VERSION};
use crate::design::{effective_params, DesignDefinition};
use crate::error::PdlError;

/// Soft-failure diagnostic from pack validation (bad list items, etc.).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PackWarning {
    pub path: String,
    pub message: String,
}

impl PackWarning {
    pub fn format(&self) -> String {
        format!("{}: {}", self.path, self.message)
    }
}

/// Parsed injection pack document.
#[derive(Debug, Clone)]
pub struct InjectionPack {
    pub schema_version: String,
    pub component: String,
    pub theme: Option<String>,
    pub params: Map<String, Value>,
}

/// Result of validating (and normalizing) a pack against a design.
#[derive(Debug, Clone)]
pub struct PackValidation {
    pub pack: InjectionPack,
    /// Params ready for [`build_baked_design_component`] (slot arrays cleaned).
    pub param_overrides: Map<String, Value>,
    pub warnings: Vec<PackWarning>,
}

/// Result of baking a validated pack.
#[derive(Debug, Clone)]
pub struct PackBakeResult {
    pub document: Value,
    pub warnings: Vec<PackWarning>,
}

fn warn(path: impl Into<String>, message: impl Into<String>) -> PackWarning {
    PackWarning {
        path: path.into(),
        message: message.into(),
    }
}

fn err(code: &str, message: String, design: &DesignDefinition) -> PdlError {
    PdlError::new(code, message, Some(design.entry_path.clone()), None, None)
}

/// Accept current oracle / plan lineage strings.
fn schema_version_ok(v: &str) -> bool {
    v == PDL_JSON_SCHEMA_VERSION || v == "1.0.0" || v == crate::SCHEMA_VERSION
}

/// Whether `component` may fill a slot typed as `bound` (protocol or concrete name).
pub fn component_satisfies_bound(design: &DesignDefinition, component: &str, bound: &str) -> bool {
    if component == bound {
        return true;
    }
    let Some(c) = design.components.get(component) else {
        return false;
    };
    if bound == crate::design::PAGE_PROTOCOL_PRELUDE && c.role == crate::ast::ComponentRole::Page {
        return true;
    }
    c.emits_protocols.iter().any(|p| p == bound)
}

fn parse_pack_object(raw: &Value, design: &DesignDefinition) -> Result<InjectionPack, PdlError> {
    let obj = raw.as_object().ok_or_else(|| {
        err(
            "PDL-E020",
            "Injection pack must be a JSON object".into(),
            design,
        )
    })?;
    let schema_version = obj
        .get("schemaVersion")
        .and_then(|v| v.as_str())
        .ok_or_else(|| {
            err(
                "PDL-E020",
                "Injection pack missing string `schemaVersion`".into(),
                design,
            )
        })?
        .to_string();
    if !schema_version_ok(&schema_version) {
        return Err(err(
            "PDL-E020",
            format!(
                "Unsupported injection pack schemaVersion `{schema_version}` (expected `{PDL_JSON_SCHEMA_VERSION}` or `1.0.0`)"
            ),
            design,
        ));
    }
    let component = obj
        .get("component")
        .and_then(|v| v.as_str())
        .ok_or_else(|| {
            err(
                "PDL-E020",
                "Injection pack missing string `component`".into(),
                design,
            )
        })?
        .to_string();
    let theme = obj
        .get("theme")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let params = match obj.get("params") {
        None => Map::new(),
        Some(Value::Object(m)) => m.clone(),
        Some(_) => {
            return Err(err(
                "PDL-E020",
                "Injection pack `params` must be an object".into(),
                design,
            ))
        }
    };
    // Reject unknown top-level keys softly? Hard-error on unknown for v1 clarity.
    for k in obj.keys() {
        if !matches!(
            k.as_str(),
            "schemaVersion" | "component" | "theme" | "params"
        ) {
            return Err(err(
                "PDL-E020",
                format!("Unknown injection pack field `{k}`"),
                design,
            ));
        }
    }
    Ok(InjectionPack {
        schema_version,
        component,
        theme,
        params,
    })
}

fn normalize_scalar_for_param(param: &ComponentParam, value: &Value) -> Result<Value, String> {
    if param.is_array {
        return Err("expected array".into());
    }
    // Variant params in packs use bare case strings (no leading dot).
    if let Value::String(s) = value {
        return Ok(Value::String(s.clone()));
    }
    Ok(value.clone())
}

fn normalize_instance_item(
    design: &DesignDefinition,
    bound: &str,
    item: &Value,
    path: &str,
    warnings: &mut Vec<PackWarning>,
) -> Option<Value> {
    let obj = match item.as_object() {
        Some(o) => o,
        None => {
            warnings.push(warn(
                path,
                "slot item must be an object `{ component, params }`; skipping",
            ));
            return None;
        }
    };
    let component = match obj.get("component").and_then(|v| v.as_str()) {
        Some(c) => c,
        None => {
            warnings.push(warn(path, "slot item missing `component`; skipping"));
            return None;
        }
    };
    if !design.components.contains_key(component) {
        warnings.push(warn(
            path,
            format!("unknown component `{component}`; skipping"),
        ));
        return None;
    }
    if !component_satisfies_bound(design, component, bound) {
        warnings.push(warn(
            path,
            format!("component `{component}` does not satisfy bound `{bound}`; skipping"),
        ));
        return None;
    }
    let params = match obj.get("params") {
        None => Map::new(),
        Some(Value::Object(m)) => m.clone(),
        Some(_) => {
            warnings.push(warn(path, "`params` must be an object; skipping item"));
            return None;
        }
    };
    // Soft-check: unknown param keys on the concrete component.
    if let Ok(effective) =
        crate::design::effective_params(design, design.components.get(component).unwrap())
    {
        let known: std::collections::HashSet<_> =
            effective.iter().map(|p| p.name.as_str()).collect();
        for k in params.keys() {
            if !known.contains(k.as_str()) {
                warnings.push(warn(
                    format!("{path}.params.{k}"),
                    format!("unknown param `{k}` on `{component}` (kept)"),
                ));
            }
        }
    }
    let mut out = Map::new();
    out.insert(
        "component".to_string(),
        Value::String(component.to_string()),
    );
    if !params.is_empty() {
        out.insert("params".to_string(), Value::Object(params));
    }
    Some(Value::Object(out))
}

fn normalize_param_value(
    design: &DesignDefinition,
    param: &ComponentParam,
    value: &Value,
    path: &str,
    warnings: &mut Vec<PackWarning>,
) -> Result<Option<Value>, PdlError> {
    if param.is_array {
        let items = value.as_array().ok_or_else(|| {
            err(
                "PDL-E020",
                format!("Pack param `{path}` must be an array for `[T]`"),
                design,
            )
        })?;
        let mut out = Vec::new();
        for (i, item) in items.iter().enumerate() {
            let item_path = format!("{path}[{i}]");
            if let Some(v) =
                normalize_instance_item(design, &param.type_name, item, &item_path, warnings)
            {
                out.push(v);
            }
        }
        return Ok(Some(Value::Array(out)));
    }
    // Single protocol/component slot: one instance object.
    if design.protocols.contains_key(&param.type_name)
        || design.components.contains_key(&param.type_name)
    {
        if value.as_object().is_some()
            && value
                .as_object()
                .map(|o| o.contains_key("component"))
                .unwrap_or(false)
        {
            return Ok(normalize_instance_item(
                design,
                &param.type_name,
                value,
                path,
                warnings,
            ));
        }
    }
    match normalize_scalar_for_param(param, value) {
        Ok(v) => Ok(Some(v)),
        Err(msg) => Err(err(
            "PDL-E020",
            format!("Pack param `{path}`: {msg}"),
            design,
        )),
    }
}

/// Validate a pack JSON value against `design` and produce bake-ready overrides.
pub fn validate_injection_pack(
    design: &DesignDefinition,
    raw: &Value,
) -> Result<PackValidation, PdlError> {
    let pack = parse_pack_object(raw, design)?;
    if !design.components.contains_key(&pack.component) {
        return Err(err(
            "PDL-E037",
            format!("Unknown pack component `{}`", pack.component),
            design,
        ));
    }
    if let Some(theme) = &pack.theme {
        if !design.themes.contains_key(theme) {
            return Err(err(
                "PDL-E005",
                format!("Unknown pack theme `{theme}`"),
                design,
            ));
        }
    }
    let c = design.components.get(&pack.component).unwrap();
    let effective = effective_params(design, c)?;
    let by_name: std::collections::HashMap<&str, &ComponentParam> =
        effective.iter().map(|p| (p.name.as_str(), p)).collect();

    let mut warnings = Vec::new();
    let mut overrides = Map::new();
    for (key, value) in &pack.params {
        let Some(param) = by_name.get(key.as_str()) else {
            return Err(err(
                "PDL-E007",
                format!(
                    "Unknown parameter `{key}` on pack component `{}`",
                    pack.component
                ),
                design,
            ));
        };
        let path = format!("params.{key}");
        if let Some(normalized) = normalize_param_value(design, param, value, &path, &mut warnings)?
        {
            overrides.insert(key.clone(), normalized);
        }
    }

    Ok(PackValidation {
        pack,
        param_overrides: overrides,
        warnings,
    })
}

/// Validate + bake an injection pack into a `bakedDesign` document.
pub fn bake_injection_pack(
    design: &DesignDefinition,
    raw: &Value,
    generated_at: Option<String>,
) -> Result<PackBakeResult, PdlError> {
    let validated = validate_injection_pack(design, raw)?;
    let mut document = build_baked_design_component(
        design,
        &validated.pack.component,
        validated.pack.theme.as_deref(),
        &validated.param_overrides,
        generated_at,
    )?;
    // Stamp bake profile for pack provenance.
    if let Value::Object(ref mut doc) = document {
        if let Some(Value::Object(prov)) = doc.get_mut("provenance") {
            prov.insert(
                "bakeProfile".to_string(),
                Value::String("injection-pack".to_string()),
            );
        }
    }
    Ok(PackBakeResult {
        document,
        warnings: validated.warnings,
    })
}

/// Load pack JSON from a file path.
pub fn load_injection_pack_file(path: &str) -> Result<Value, PdlError> {
    let text = std::fs::read_to_string(path).map_err(|e| {
        PdlError::new(
            "PDL-E000",
            format!("Failed to read pack {path}: {e}"),
            Some(path.to_string()),
            None,
            None,
        )
    })?;
    serde_json::from_str(&text).map_err(|e| {
        PdlError::new(
            "PDL-E020",
            format!("Invalid pack JSON in {path}: {e}"),
            Some(path.to_string()),
            None,
            None,
        )
    })
}
