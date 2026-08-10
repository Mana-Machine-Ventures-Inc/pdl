//! Frame property SoT loaded from `shared/frame-props.json` (§5 / §23.3).

use std::collections::{HashMap, HashSet};
use std::sync::OnceLock;

use serde::Deserialize;

use crate::ast::*;
use crate::design::DesignDefinition;
use crate::error::PdlError;

#[derive(Debug, Deserialize)]
struct ValueKindDef {
    accept: Vec<String>,
    #[serde(rename = "tokenTypes", default)]
    token_types: Vec<String>,
    /// PascalCase enum type for optional `TypeName.case` sugar (→ same AST as `.case`).
    #[serde(rename = "typeName", default)]
    type_name: Option<String>,
    #[serde(default)]
    cases: Vec<String>,
    #[serde(default)]
    range: Option<[f64; 2]>,
    #[serde(rename = "nonNegativeNumber", default)]
    non_negative_number: bool,
    #[serde(rename = "positiveNumber", default)]
    positive_number: bool,
    #[serde(rename = "numberSugar")]
    number_sugar: Option<String>,
}

#[derive(Debug, Deserialize)]
struct PropDef {
    #[serde(rename = "type")]
    type_id: String,
}

#[derive(Debug, Deserialize)]
struct KindDef {
    props: HashMap<String, PropDef>,
}

#[derive(Debug, Deserialize)]
struct SpecialDef {
    #[serde(default)]
    kinds: Vec<String>,
    #[serde(rename = "type")]
    type_id: Option<String>,
    #[serde(default)]
    structural: bool,
}

#[derive(Debug, Deserialize)]
struct FramePropsTable {
    #[serde(rename = "valueKinds")]
    value_kinds: HashMap<String, ValueKindDef>,
    kinds: HashMap<String, KindDef>,
    #[serde(rename = "childFlexProps")]
    child_flex_props: HashMap<String, PropDef>,
    special: HashMap<String, SpecialDef>,
}

fn table() -> &'static FramePropsTable {
    static TABLE: OnceLock<FramePropsTable> = OnceLock::new();
    TABLE.get_or_init(|| {
        serde_json::from_str(include_str!("../../../shared/frame-props.json"))
            .expect("shared/frame-props.json must parse")
    })
}

fn err(code: &str, message: String, design: &DesignDefinition) -> PdlError {
    PdlError::new(code, message, Some(design.entry_path.clone()), None, None)
}

fn token_type_of(design: &DesignDefinition, name: &str) -> Option<String> {
    design
        .primitives
        .get(name)
        .map(|p| p.token_type.clone())
        .or_else(|| design.semantics.get(name).map(|s| s.token_type.clone()))
}

fn value_kind_name(value: &ValueExpr) -> &'static str {
    match value {
        ValueExpr::Hex { .. } => "hex",
        ValueExpr::String { .. } => "string",
        ValueExpr::Number { .. } => "number",
        ValueExpr::Ratio { .. } => "ratio",
        ValueExpr::Boolean { .. } => "boolean",
        ValueExpr::Condition { .. } => "condition",
        ValueExpr::Ident { .. } => "ident",
        ValueExpr::SelfRef => "self",
        ValueExpr::SelfMember { .. } => "selfMember",
        ValueExpr::DotEnum { .. } => "dotEnum",
        ValueExpr::OpacityOf { .. } => "opacityOf",
        ValueExpr::EdgeInsets { .. } => "edgeInsets",
        ValueExpr::Corner { .. } => "corner",
        ValueExpr::Shadow { .. } => "shadow",
        ValueExpr::Array { .. } => "array",
        ValueExpr::Transition { .. } => "transition",
        ValueExpr::VibrancyTuple { .. } => "vibrancyTuple",
        ValueExpr::RampInline { .. } => "rampInline",
        ValueExpr::Sizing { .. } => "sizing",
        ValueExpr::Call { .. } => "call",
        ValueExpr::Instance { .. } => "instance",
        ValueExpr::GradientStop { .. } => "gradientStop",
    }
}

fn enum_case_name(value: &ValueExpr) -> Option<&str> {
    match value {
        ValueExpr::DotEnum { value } => Some(value.strip_prefix('.').unwrap_or(value.as_str())),
        ValueExpr::Ident { name } => Some(name.as_str()),
        _ => None,
    }
}

fn sugar_props(sugar: &str) -> HashSet<String> {
    let t = table();
    let mut out = HashSet::new();
    let mut consider = |name: &str, type_id: &str| {
        if t.value_kinds
            .get(type_id)
            .and_then(|vk| vk.number_sugar.as_deref())
            == Some(sugar)
        {
            out.insert(name.to_string());
        }
    };
    for kind in t.kinds.values() {
        for (name, def) in &kind.props {
            consider(name, &def.type_id);
        }
    }
    for (name, def) in &t.child_flex_props {
        consider(name, &def.type_id);
    }
    out
}

pub fn is_uniform_edge_inset(prop: &str) -> bool {
    static SET: OnceLock<HashSet<String>> = OnceLock::new();
    SET.get_or_init(|| sugar_props("uniformInsets"))
        .contains(prop)
}

pub fn is_fixed_sizing_axis(prop: &str) -> bool {
    static SET: OnceLock<HashSet<String>> = OnceLock::new();
    SET.get_or_init(|| sugar_props("fixed")).contains(prop)
}

/// Frame enum type names that accept `TypeName.case` as sugar for `.case` (excludes `Sizing`).
pub fn is_frame_enum_type_name(name: &str) -> bool {
    static SET: OnceLock<HashSet<String>> = OnceLock::new();
    SET.get_or_init(|| {
        table()
            .value_kinds
            .values()
            .filter(|vk| !vk.cases.is_empty())
            .filter_map(|vk| vk.type_name.clone())
            .collect()
    })
    .contains(name)
}

fn prop_type_id(kind: &str, prop: &str) -> Option<String> {
    let t = table();
    if let Some(special) = t.special.get(prop) {
        if special.structural && special.type_id.is_none() {
            return None;
        }
        if !special.kinds.is_empty() && !special.kinds.iter().any(|k| k == kind) {
            return None;
        }
        return special.type_id.clone();
    }
    if let Some(def) = t.kinds.get(kind).and_then(|k| k.props.get(prop)) {
        return Some(def.type_id.clone());
    }
    t.child_flex_props.get(prop).map(|d| d.type_id.clone())
}

pub fn is_known_frame_prop(kind: &str, prop: &str) -> bool {
    if prop == "children" {
        return true;
    }
    let t = table();
    if let Some(special) = t.special.get(prop) {
        if !special.kinds.is_empty() {
            return special.kinds.iter().any(|k| k == kind);
        }
        return true;
    }
    if t.kinds
        .get(kind)
        .is_some_and(|k| k.props.contains_key(prop))
    {
        return true;
    }
    t.child_flex_props.contains_key(prop)
}

fn value_kind_expectation(type_id: &str) -> String {
    let t = table();
    let Some(vk) = t.value_kinds.get(type_id) else {
        return type_id.to_string();
    };
    if !vk.cases.is_empty() {
        let dots = vk
            .cases
            .iter()
            .map(|c| format!(".{c}"))
            .collect::<Vec<_>>()
            .join(", ");
        if let Some(tn) = &vk.type_name {
            return format!("one of {dots} (or {tn}.<case>)");
        }
        return format!("one of {dots}");
    }
    let mut parts = vk.accept.clone();
    if !vk.token_types.is_empty() {
        parts.push(format!("or {}-typed token", vk.token_types.join("/")));
    }
    parts.join(" | ")
}

fn literal_ok(vk: &ValueKindDef, value: &ValueExpr) -> bool {
    let kind = value_kind_name(value);
    if !vk.accept.iter().any(|a| a == kind) {
        return false;
    }
    if let ValueExpr::Number { value: n } = value {
        if vk.non_negative_number && *n < 0.0 {
            return false;
        }
        if vk.positive_number && !(*n > 0.0) {
            return false;
        }
        if let Some([lo, hi]) = vk.range {
            if *n < lo || *n > hi {
                return false;
            }
        }
    }
    if let ValueExpr::Ratio { width, height } = value {
        if !(*width > 0.0 && *height > 0.0) {
            return false;
        }
    }
    if !vk.cases.is_empty() {
        let Some(c) = enum_case_name(value) else {
            return false;
        };
        if !vk.cases.iter().any(|x| x == c) {
            return false;
        }
    }
    true
}

pub fn assert_frame_prop_compatible(
    design: &DesignDefinition,
    kind: &str,
    prop: &str,
    value: &ValueExpr,
    context: &str,
) -> Result<(), PdlError> {
    let Some(type_id) = prop_type_id(kind, prop) else {
        return Ok(());
    };
    let t = table();
    let Some(vk) = t.value_kinds.get(&type_id) else {
        return Err(err(
            "PDL-E006",
            format!("{context}: property `{prop}` references unknown value kind `{type_id}`"),
            design,
        ));
    };

    if let ValueExpr::Ident { name } = value {
        if type_id == "styleRef" || type_id == "booleanOrCondition" {
            return Ok(());
        }
        if !vk.token_types.is_empty() {
            if let Some(ref_type) = token_type_of(design, name) {
                if !vk.token_types.iter().any(|x| x == &ref_type) {
                    return Err(err(
                        "PDL-E006",
                        format!(
                            "{context}: property `{prop}` expects {} (token `{name}` has type {ref_type})",
                            value_kind_expectation(&type_id)
                        ),
                        design,
                    ));
                }
            }
            return Ok(());
        }
        if vk.accept.iter().any(|a| a == "ident") && !vk.cases.is_empty() {
            if !vk.cases.iter().any(|c| c == name) {
                return Err(err(
                    "PDL-E006",
                    format!(
                        "{context}: property `{prop}` expects {} (got `{name}`)",
                        value_kind_expectation(&type_id)
                    ),
                    design,
                ));
            }
            return Ok(());
        }
        return Err(err(
            "PDL-E006",
            format!(
                "{context}: property `{prop}` expects {} (got ident)",
                value_kind_expectation(&type_id)
            ),
            design,
        ));
    }

    if literal_ok(vk, value) {
        if type_id == "colorOrLayers" {
            assert_layer_stack_value(design, value, &format!("{context}: property `{prop}`"))?;
        }
        return Ok(());
    }
    Err(err(
        "PDL-E006",
        format!(
            "{context}: property `{prop}` expects {} (got {})",
            value_kind_expectation(&type_id),
            value_kind_name(value)
        ),
        design,
    ))
}

/// Token types valid as a whole layer entry (`Ramp` is a full paint shape; `Blur`/`Opacity` are inputs).
const LAYER_TOKEN_TYPES: &[&str] = &["Color", "Background", "Foreground", "Ramp"];

fn assert_layer_entry(
    design: &DesignDefinition,
    entry: &ValueExpr,
    context: &str,
) -> Result<(), PdlError> {
    match entry {
        // Builtin layer constructors are already typed as CallCallee::{Color,Ramp,Blur,Media,Vibrancy}.
        ValueExpr::Hex { .. } | ValueExpr::OpacityOf { .. } | ValueExpr::Call { .. } => Ok(()),
        ValueExpr::Ident { name } => {
            let Some(ref_type) = token_type_of(design, name) else {
                return Ok(());
            };
            if LAYER_TOKEN_TYPES.iter().any(|t| *t == ref_type) {
                return Ok(());
            }
            if ref_type == "Opacity" {
                return Err(err(
                    "PDL-E006",
                    format!(
                        "{context}: bare Opacity token `{name}` is not a layer; apply it with `color @ {name}` (or pass opacity: on a layer constructor)"
                    ),
                    design,
                ));
            }
            if ref_type == "Blur" || ref_type == "Vibrancy" {
                let arg = if ref_type == "Blur" { "blur" } else { "vibrancy" };
                return Err(err(
                    "PDL-E006",
                    format!(
                        "{context}: bare {ref_type} token `{name}` is not a layer; use {ref_type}({arg}: {name})"
                    ),
                    design,
                ));
            }
            Err(err(
                "PDL-E006",
                format!(
                    "{context}: layer entry `{name}` has type {ref_type}; expected a Color / Background / Foreground / Ramp layer, #hex, color @ opacity, or layer constructor"
                ),
                design,
            ))
        }
        _ => Err(err(
            "PDL-E006",
            format!(
                "{context}: invalid layer entry (got {}); expected Color / Background / Foreground / Ramp, #hex, color @ opacity, or layer constructor",
                value_kind_name(entry)
            ),
            design,
        )),
    }
}

/// Walk a background/foreground / Background / Foreground RHS and check layer entries.
pub fn assert_layer_stack_value(
    design: &DesignDefinition,
    value: &ValueExpr,
    context: &str,
) -> Result<(), PdlError> {
    match value {
        ValueExpr::Hex { .. } | ValueExpr::OpacityOf { .. } => Ok(()),
        ValueExpr::Ident { .. } | ValueExpr::Call { .. } => assert_layer_entry(design, value, context),
        ValueExpr::Array { items } => {
            for (i, item) in items.iter().enumerate() {
                assert_layer_entry(design, item, &format!("{context} layer[{i}]"))?;
            }
            Ok(())
        }
        _ => Ok(()),
    }
}

fn validate_prop_on_kind(
    design: &DesignDefinition,
    kind: &str,
    prop: &str,
    value: &ValueExpr,
    context: &str,
) -> Result<(), PdlError> {
    if prop == "children" {
        return Ok(());
    }
    if !is_known_frame_prop(kind, prop) {
        return Err(err(
            "PDL-E011",
            format!("{context}: unknown property `{prop}` on `{kind}` frame"),
            design,
        ));
    }
    assert_frame_prop_compatible(design, kind, prop, value, context)
}

pub fn validate_frame_props_in_body(
    design: &DesignDefinition,
    items: &[FrameBodyItem],
    component_name: &str,
    current_frame_kind: &str,
    let_kinds: &HashMap<String, String>,
) -> Result<(), PdlError> {
    let ctx = format!("component {component_name}");
    for item in items {
        match item {
            FrameBodyItem::Prop { name, value } => {
                validate_prop_on_kind(design, current_frame_kind, name, value, &ctx)?;
            }
            FrameBodyItem::FrameProp { frame, name, value } => {
                if let Some(fk) = let_kinds.get(frame) {
                    validate_prop_on_kind(design, fk, name, value, &ctx)?;
                }
            }
            FrameBodyItem::Let {
                frame_kind, body, ..
            } => {
                validate_frame_props_in_body(design, body, component_name, frame_kind, let_kinds)?;
            }
            FrameBodyItem::If { chain } => {
                for br in &chain.branches {
                    validate_frame_props_in_body(
                        design,
                        &br.body,
                        component_name,
                        current_frame_kind,
                        let_kinds,
                    )?;
                }
                if let Some(else_body) = &chain.else_body {
                    validate_frame_props_in_body(
                        design,
                        else_body,
                        component_name,
                        current_frame_kind,
                        let_kinds,
                    )?;
                }
            }
            _ => {}
        }
    }
    Ok(())
}

pub fn validate_type_style_props(design: &DesignDefinition) -> Result<(), PdlError> {
    let t = table();
    let text_props = &t
        .kinds
        .get("text")
        .expect("frame-props.json must define text")
        .props;
    for ts in design.type_styles.values() {
        let ctx = format!("typeStyle {}", ts.name);
        for (prop, value) in &ts.props {
            if prop == "style" || !text_props.contains_key(prop) {
                return Err(err(
                    "PDL-E011",
                    format!(
                        "{ctx}: unknown property `{prop}` (typeStyle allows text frame props from §5)"
                    ),
                    design,
                ));
            }
            assert_frame_prop_compatible(design, "text", prop, value, &ctx)?;
        }
    }
    Ok(())
}
