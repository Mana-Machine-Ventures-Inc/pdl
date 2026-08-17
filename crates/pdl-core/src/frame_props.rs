//! Frame property lock loaded from `shared/frame-props.json`.

use std::collections::{HashMap, HashSet};
use std::sync::OnceLock;

use serde::Deserialize;

use crate::asset_refs::{
    is_http_url, is_pack_relative_file_path, media_kind_for_format, normalize_media_format_name,
    normalize_media_kind_name,
};
use crate::ast::*;
use crate::design::DesignDefinition;
use crate::error::PdlError;
use crate::param_types::host_enum_cases;
use indexmap::IndexMap;

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
        ValueExpr::Null => "null",
        ValueExpr::Condition { .. } => "condition",
        ValueExpr::Ident { .. } => "ident",
        ValueExpr::SelfRef => "self",
        ValueExpr::SelfMember { .. } => "selfMember",
        ValueExpr::DotEnum { .. } => "dotEnum",
        ValueExpr::OpacityOf { .. } => "opacityOf",
        ValueExpr::EdgeInsets { .. } => "edgeInsets",
        ValueExpr::Corner { .. } => "corner",
        ValueExpr::Shadow { .. } => "shadow",
        ValueExpr::IconFile { .. } | ValueExpr::IconSystem { .. } => "iconRef",
        ValueExpr::MediaSourceFile { .. } | ValueExpr::MediaSourceUrl { .. } => "mediaSourceRef",
        ValueExpr::Array { .. } => "array",
        ValueExpr::Timing { .. } => "timing",
        ValueExpr::Pose { .. } => "pose",
        ValueExpr::Stagger { .. } => "stagger",
        ValueExpr::Key { .. } => "key",
        ValueExpr::Motion { .. } => "motion",
        ValueExpr::EaseBezier { .. } => "easeBezier",
        ValueExpr::PresentationMotion { .. } => "presentationMotion",
        ValueExpr::Effect { .. } => "effect",
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

/// PascalCase type name eligible for `TypeName.case` → `.case` sugar
/// (built-in frame enums and user `variant` types). Excludes lowercase token paths.
pub fn looks_like_qualified_enum_type_name(name: &str) -> bool {
    let mut chars = name.chars();
    match chars.next() {
        Some(c) if c.is_ascii_uppercase() => chars.all(|c| c.is_ascii_alphanumeric()),
        _ => false,
    }
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

fn literal_ok(vk: &ValueKindDef, value: &ValueExpr, type_id: &str) -> bool {
    // Bare `.hug` / `.fill` parse as DotEnum (shared with ContentMode.fill); only those
    // cases are valid for sizing props.
    if type_id == "sizing" {
        if let ValueExpr::DotEnum { value: v } = value {
            let c = v.strip_prefix('.').unwrap_or(v.as_str());
            return c == "hug" || c == "fill";
        }
    }
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
    if let ValueExpr::String { value: s } = value {
        if type_id == "icon" && !is_pack_relative_file_path(s) {
            return false;
        }
        if type_id == "mediaSource" && !is_http_url(s) && !is_pack_relative_file_path(s) {
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

    // `null` = unset this property (revert to default / absent). Legal on any known frame prop.
    if matches!(value, ValueExpr::Null) {
        return Ok(());
    }

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

    if type_id == "effect" {
        if matches!(value, ValueExpr::Effect { .. }) {
            assert_effect_value(design, value, &format!("{context}: property `{prop}`"))?;
            return Ok(());
        }
        if let ValueExpr::Call {
            callee: CallCallee::Blur,
            args,
        } = value
        {
            assert_blur_call_compatible(design, args, &format!("{context}: property `{prop}`"))?;
            return Ok(());
        }
    }

    if literal_ok(vk, value, &type_id) {
        if type_id == "colorOrLayers" {
            assert_layer_stack_value(design, value, &format!("{context}: property `{prop}`"))?;
        }
        if type_id == "sizing" {
            if let ValueExpr::Sizing {
                mode: SizingMode::Aspect { aspect },
            } = value
            {
                assert_aspect_sizing_arg(design, aspect, &format!("{context}: property `{prop}`"))?;
            }
        }
        if type_id == "mediaSource" {
            assert_media_source_meta_frame(
                design,
                value,
                &format!("{context}: property `{prop}`"),
            )?;
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

fn assert_media_source_meta_frame(
    design: &DesignDefinition,
    value: &ValueExpr,
    context: &str,
) -> Result<(), PdlError> {
    let (media_kind, format) = match value {
        ValueExpr::MediaSourceFile {
            media_kind, format, ..
        }
        | ValueExpr::MediaSourceUrl {
            media_kind, format, ..
        } => (media_kind, format),
        _ => return Ok(()),
    };
    let mk = if let Some(k) = media_kind {
        let raw = match k.as_ref() {
            ValueExpr::DotEnum { value } | ValueExpr::Ident { name: value } => value.as_str(),
            _ => {
                return Err(err(
                    "PDL-E006",
                    format!("{context}: MediaSource kind must be .raster, .vector, or .video"),
                    design,
                ))
            }
        };
        let Some(n) = normalize_media_kind_name(raw) else {
            return Err(err(
                "PDL-E006",
                format!("{context}: MediaSource kind must be .raster, .vector, or .video"),
                design,
            ));
        };
        Some(n)
    } else {
        None
    };
    let fmt = if let Some(f) = format {
        let raw = match f.as_ref() {
            ValueExpr::DotEnum { value } | ValueExpr::Ident { name: value } => value.as_str(),
            _ => {
                return Err(err(
                    "PDL-E006",
                    format!(
                        "{context}: MediaSource format must be one of .webp|.jpeg|.png|.gif|.svg|.mp4|.webm|.pdf"
                    ),
                    design,
                ))
            }
        };
        let Some(n) = normalize_media_format_name(raw) else {
            return Err(err(
                "PDL-E006",
                format!(
                    "{context}: MediaSource format must be one of .webp|.jpeg|.png|.gif|.svg|.mp4|.webm|.pdf"
                ),
                design,
            ));
        };
        Some(n)
    } else {
        None
    };
    if let (Some(mk), Some(fmt)) = (mk, fmt) {
        let expected = media_kind_for_format(fmt).unwrap_or("");
        if mk != expected {
            return Err(err(
                "PDL-E006",
                format!("{context}: MediaSource kind `.{mk}` is incompatible with format `.{fmt}`"),
                design,
            ));
        }
    }
    Ok(())
}

fn assert_aspect_sizing_arg(
    design: &DesignDefinition,
    aspect: &ValueExpr,
    context: &str,
) -> Result<(), PdlError> {
    match aspect {
        ValueExpr::Number { value: n } => {
            if !(*n > 0.0) || !n.is_finite() {
                return Err(err(
                    "PDL-E006",
                    format!("{context}: `.aspect(n)` requires a positive finite ratio"),
                    design,
                ));
            }
            Ok(())
        }
        ValueExpr::Ratio { width, height } => {
            if !(*height > 0.0) || !width.is_finite() || !height.is_finite() {
                return Err(err(
                    "PDL-E006",
                    format!("{context}: `.aspect(W:H)` requires a positive finite height"),
                    design,
                ));
            }
            Ok(())
        }
        ValueExpr::Ident { name } => {
            if let Some(ref_type) = token_type_of(design, name) {
                if ref_type != "Ratio" {
                    return Err(err(
                        "PDL-E006",
                        format!(
                            "{context}: `.aspect` expects a Ratio token (`{name}` has type {ref_type})"
                        ),
                        design,
                    ));
                }
            }
            Ok(())
        }
        _ => Err(err(
            "PDL-E006",
            format!(
                "{context}: `.aspect` expects a positive ratio, `W:H` sugar, or Ratio token (got {})",
                value_kind_name(aspect)
            ),
            design,
        )),
    }
}

fn is_aspect_sizing_expr(value: Option<&ValueExpr>) -> bool {
    matches!(
        value,
        Some(ValueExpr::Sizing {
            mode: SizingMode::Aspect { .. },
        })
    )
}

fn is_closed_sizing_expr(value: Option<&ValueExpr>) -> bool {
    match value {
        None | Some(ValueExpr::Null) => false,
        Some(ValueExpr::Number { .. }) => true,
        Some(ValueExpr::Sizing { mode }) => matches!(
            mode,
            SizingMode::Fill | SizingMode::Fixed { .. } | SizingMode::Flex { .. }
        ),
        // Bare `.fill` is a closed sizing enum (`.hug` is free).
        Some(ValueExpr::DotEnum { value }) => {
            value.strip_prefix('.').unwrap_or(value.as_str()) == "fill"
        }
        Some(ValueExpr::Ident { .. }) => true,
        _ => false,
    }
}

pub fn assert_aspect_box_consistent(
    design: &DesignDefinition,
    props: &HashMap<String, ValueExpr>,
    context: &str,
) -> Result<(), PdlError> {
    let width = props.get("width");
    let height = props.get("height");
    let aspect_ratio = props.get("aspectRatio");
    let w_aspect = is_aspect_sizing_expr(width);
    let h_aspect = is_aspect_sizing_expr(height);

    if w_aspect && h_aspect {
        return Err(err(
            "PDL-E006",
            format!(
                "{context}: cannot set `.aspect` on both `width` and `height` — put `.aspect(…)` on the derived axis only"
            ),
            design,
        ));
    }
    if aspect_ratio.is_some() && (w_aspect || h_aspect) {
        return Err(err(
            "PDL-E006",
            format!("{context}: use either `aspectRatio` or `.aspect(…)` on one axis, not both"),
            design,
        ));
    }
    if aspect_ratio.is_some() && is_closed_sizing_expr(width) && is_closed_sizing_expr(height) {
        return Err(err(
            "PDL-E006",
            format!(
                "{context}: `aspectRatio` conflicts with both `width` and `height` set — leave one axis free or use `height = .aspect(…)` / `width = .aspect(…)`"
            ),
            design,
        ));
    }
    Ok(())
}

/// Token types valid as a whole layer entry (Blur/Media/Vibrancy/Ramp are layer objects).
const LAYER_TOKEN_TYPES: &[&str] = &[
    "Color",
    "Background",
    "Foreground",
    "Ramp",
    "Blur",
    "Vibrancy",
    "Media",
];

fn strip_dot(s: &str) -> &str {
    s.strip_prefix('.').unwrap_or(s)
}

fn is_number_or_numeric_token(design: &DesignDefinition, value: &ValueExpr) -> bool {
    match value {
        ValueExpr::Number { .. } => true,
        ValueExpr::Ident { name } => match token_type_of(design, name) {
            Some(t) => matches!(t.as_str(), "Number" | "Opacity" | "Ratio"),
            None => true,
        },
        _ => false,
    }
}

/// Vibrancy values: `Vibrancy(saturation:, brightness:)` or a Vibrancy token — not naked tuples.
fn is_vibrancy_expr(design: &DesignDefinition, value: &ValueExpr) -> bool {
    match value {
        ValueExpr::Call {
            callee: CallCallee::Vibrancy,
            ..
        } => true,
        ValueExpr::Ident { name } => match token_type_of(design, name) {
            Some(t) => t == "Vibrancy",
            None => true, // unresolved / param
        },
        _ => false,
    }
}

fn is_blur_style_expr(design: &DesignDefinition, value: &ValueExpr) -> bool {
    let cases = host_enum_cases("BlurStyle").unwrap_or(&["standard"]);
    match value {
        ValueExpr::DotEnum { value } => cases.iter().any(|c| *c == strip_dot(value)),
        ValueExpr::Ident { name } => match token_type_of(design, name) {
            Some(t) => t == "BlurStyle",
            None => true,
        },
        _ => false,
    }
}

fn is_radius_expr(design: &DesignDefinition, value: &ValueExpr) -> bool {
    match value {
        ValueExpr::Number { value: n } if *n >= 0.0 => true,
        ValueExpr::Ident { name } => match token_type_of(design, name) {
            Some(t) => t == "Radius",
            None => true,
        },
        _ => false,
    }
}

fn effect_case_name(value: &ValueExpr) -> Option<&str> {
    match value {
        ValueExpr::DotEnum { value } => Some(value.strip_prefix('.').unwrap_or(value.as_str())),
        ValueExpr::Ident { name } => Some(name.as_str()),
        _ => None,
    }
}

/// Type-check `Effect(.blurSelf | .blurBehind | .glass, radius: [, vibrancy:])`.
pub fn assert_effect_value(
    design: &DesignDefinition,
    value: &ValueExpr,
    context: &str,
) -> Result<(), PdlError> {
    let ValueExpr::Effect {
        effect_kind,
        radius,
        vibrancy,
    } = value
    else {
        return Err(err(
            "PDL-E005",
            format!("{context}: expected `Effect(…)`"),
            design,
        ));
    };
    let Some(raw) = effect_case_name(effect_kind) else {
        return Err(err(
            "PDL-E005",
            format!("{context}: `Effect(…)` kind must be `.blurSelf`, `.blurBehind`, or `.glass`"),
            design,
        ));
    };
    if raw != "blurSelf" && raw != "blurBehind" && raw != "glass" {
        return Err(err(
            "PDL-E005",
            format!("{context}: `Effect(…)` kind must be `.blurSelf`, `.blurBehind`, or `.glass`"),
            design,
        ));
    }
    if raw == "glass" {
        return Err(err(
            "PDL-E005",
            format!(
                "{context}: `Effect(.glass)` is not implemented yet — use `.blurSelf` or `.blurBehind`"
            ),
            design,
        ));
    }
    let Some(radius) = radius else {
        return Err(err(
            "PDL-E005",
            format!("{context}: `Effect(.{raw})` requires `radius:` (a Radius / number)"),
            design,
        ));
    };
    if !is_radius_expr(design, radius) {
        return Err(err(
            "PDL-E040",
            format!(
                "{context}: `Effect` argument `radius:` expects a Radius / non-negative number (got {})",
                value_kind_name(radius)
            ),
            design,
        ));
    }
    if let Some(vibrancy) = vibrancy {
        if !is_vibrancy_expr(design, vibrancy) {
            return Err(err(
                "PDL-E040",
                format!(
                    "{context}: `Effect` argument `vibrancy:` expects `Vibrancy(saturation:, brightness:)` or a Vibrancy token (got {})",
                    value_kind_name(vibrancy)
                ),
                design,
            ));
        }
        if let ValueExpr::Call {
            callee: CallCallee::Vibrancy,
            args,
        } = vibrancy.as_ref()
        {
            assert_vibrancy_call_compatible(design, args, context)?;
        }
    }
    Ok(())
}

/// Type-check `Blur(radius: … [, style:] [, vibrancy:])` arguments.
pub fn assert_blur_call_compatible(
    design: &DesignDefinition,
    args: &IndexMap<String, ValueExpr>,
    context: &str,
) -> Result<(), PdlError> {
    let Some(radius) = args.get("radius") else {
        return Err(err(
            "PDL-E020",
            format!("{context}: `Blur(…)` requires `radius:` (a Radius / number)"),
            design,
        ));
    };
    if !is_radius_expr(design, radius) {
        return Err(err(
            "PDL-E040",
            format!(
                "{context}: `Blur` argument `radius:` expects a Radius / non-negative number (got {})",
                value_kind_name(radius)
            ),
            design,
        ));
    }
    if let Some(style) = args.get("style") {
        if !is_blur_style_expr(design, style) {
            return Err(err(
                "PDL-E040",
                format!(
                    "{context}: `Blur` argument `style:` expects BlurStyle (e.g. `.standard`) (got {})",
                    value_kind_name(style)
                ),
                design,
            ));
        }
    }
    if let Some(vibrancy) = args.get("vibrancy") {
        if !is_vibrancy_expr(design, vibrancy) {
            return Err(err(
                "PDL-E040",
                format!(
                    "{context}: `Blur` argument `vibrancy:` expects `Vibrancy(saturation:, brightness:)` or a Vibrancy token — not a naked tuple, number, or BlurStyle case (got {})",
                    value_kind_name(vibrancy)
                ),
                design,
            ));
        }
        if let ValueExpr::Call {
            callee: CallCallee::Vibrancy,
            args: inner,
        } = vibrancy
        {
            assert_vibrancy_call_compatible(design, inner, context)?;
        }
    }
    Ok(())
}

/// Type-check `Vibrancy(saturation:, brightness:)` — the only Vibrancy value constructor.
pub fn assert_vibrancy_call_compatible(
    design: &DesignDefinition,
    args: &IndexMap<String, ValueExpr>,
    context: &str,
) -> Result<(), PdlError> {
    if args.contains_key("vibrancy")
        && !args.contains_key("saturation")
        && !args.contains_key("brightness")
    {
        return Err(err(
            "PDL-E020",
            format!(
                "{context}: `Vibrancy(…)` takes `saturation:` and `brightness:` (e.g. `Vibrancy(saturation: 1.2, brightness: 1.05)`); use a Vibrancy token bare in a layer stack, not `Vibrancy(vibrancy: …)`"
            ),
            design,
        ));
    }
    if !args.contains_key("saturation") || !args.contains_key("brightness") {
        return Err(err(
            "PDL-E020",
            format!("{context}: `Vibrancy(…)` requires `saturation:` and `brightness:`"),
            design,
        ));
    }
    let unknown: Vec<_> = args
        .keys()
        .filter(|k| *k != "saturation" && *k != "brightness")
        .cloned()
        .collect();
    if !unknown.is_empty() {
        return Err(err(
            "PDL-E020",
            format!(
                "{context}: Vibrancy unknown label(s): {} (expected saturation, brightness)",
                unknown.join(", ")
            ),
            design,
        ));
    }
    let sat = args.get("saturation").unwrap();
    let bri = args.get("brightness").unwrap();
    if !is_number_or_numeric_token(design, sat) {
        return Err(err(
            "PDL-E040",
            format!(
                "{context}: `Vibrancy` argument `saturation:` expects a number (got {})",
                value_kind_name(sat)
            ),
            design,
        ));
    }
    if !is_number_or_numeric_token(design, bri) {
        return Err(err(
            "PDL-E040",
            format!(
                "{context}: `Vibrancy` argument `brightness:` expects a number (got {})",
                value_kind_name(bri)
            ),
            design,
        ));
    }
    Ok(())
}

fn assert_layer_entry(
    design: &DesignDefinition,
    entry: &ValueExpr,
    context: &str,
) -> Result<(), PdlError> {
    match entry {
        ValueExpr::Hex { .. } | ValueExpr::OpacityOf { .. } => Ok(()),
        ValueExpr::Call { callee, args } => match callee {
            CallCallee::Blur => {
                assert_blur_call_compatible(design, args, &format!("{context}: Blur(…)"))
            }
            CallCallee::Vibrancy => {
                assert_vibrancy_call_compatible(design, args, &format!("{context}: Vibrancy(…)"))
            }
            CallCallee::Color | CallCallee::Ramp | CallCallee::MediaLayer => Ok(()),
        },
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
            if ref_type == "Radius" {
                return Err(err(
                    "PDL-E006",
                    format!(
                        "{context}: bare Radius token `{name}` is not a layer; use `Blur(radius: {name})`"
                    ),
                    design,
                ));
            }
            if ref_type == "Effect" {
                return Err(err(
                    "PDL-E006",
                    format!(
                        "{context}: Effect token `{name}` is not a layer — set `effect = {name}` on the frame"
                    ),
                    design,
                ));
            }
            Err(err(
                "PDL-E006",
                format!(
                        "{context}: layer entry `{name}` has type {ref_type}; expected a Color / Background / Foreground / Ramp / Blur / Media / Vibrancy layer, #hex, color @ opacity, or layer constructor (Media fills use MediaLayer)"
                    ),
                    design,
                ))
            }
        ValueExpr::Effect { .. } => Err(err(
            "PDL-E006",
            format!(
                "{context}: `Effect(…)` is not a layer — set `effect =` on the frame (fills stay Color / Ramp / Media)"
            ),
            design,
        )),
            _ => Err(err(
            "PDL-E006",
            format!(
                "{context}: invalid layer entry (got {}); expected Color / Background / Foreground / Ramp / Blur / Media / Vibrancy, #hex, color @ opacity, or layer constructor (Media fills use MediaLayer)",
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
        ValueExpr::Effect { .. } => Err(err(
            "PDL-E006",
            format!(
                "{context}: `Effect(…)` is not a layer — set `effect =` on the frame (fills stay Color / Ramp / Media)"
            ),
            design,
        )),
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
    validate_frame_props_in_body_with_props(
        design,
        items,
        component_name,
        current_frame_kind,
        let_kinds,
        &HashMap::new(),
    )
}

fn validate_frame_props_in_body_with_props(
    design: &DesignDefinition,
    items: &[FrameBodyItem],
    component_name: &str,
    current_frame_kind: &str,
    let_kinds: &HashMap<String, String>,
    inherited: &HashMap<String, ValueExpr>,
) -> Result<(), PdlError> {
    let ctx = format!("component {component_name}");
    let mut props_on_frame = inherited.clone();
    for item in items {
        match item {
            FrameBodyItem::Prop { name, value } => {
                validate_prop_on_kind(design, current_frame_kind, name, value, &ctx)?;
                props_on_frame.insert(name.clone(), value.clone());
            }
            FrameBodyItem::FrameProp { frame, name, value } => {
                let fk = if frame == "self" {
                    design
                        .components
                        .get(component_name)
                        .map(|c| match c.root_kind {
                            crate::ast::RootKind::Layout => "layout",
                            crate::ast::RootKind::Text => "text",
                            crate::ast::RootKind::Icon => "icon",
                            crate::ast::RootKind::Media => "media",
                        })
                } else {
                    let_kinds.get(frame).map(|s| s.as_str())
                };
                if let Some(fk) = fk {
                    validate_prop_on_kind(design, fk, name, value, &ctx)?;
                }
            }
            FrameBodyItem::Children { entries, .. } => {
                for e in entries {
                    let opacity = match e {
                        ChildEntry::FrameRef {
                            opacity: Some(op), ..
                        }
                        | ChildEntry::Instance {
                            opacity: Some(op), ..
                        }
                        | ChildEntry::FrameCtor {
                            opacity: Some(op), ..
                        } => Some(op),
                        _ => None,
                    };
                    if let Some(op) = opacity {
                        // Same rules as frame `opacity =` (0…1 / Opacity token).
                        validate_prop_on_kind(design, "layout", "opacity", op, &ctx)?;
                    }
                }
            }
            FrameBodyItem::Let {
                frame_kind, body, ..
            } => {
                validate_frame_props_in_body(design, body, component_name, frame_kind, let_kinds)?;
            }
            FrameBodyItem::If { chain } => {
                for br in &chain.branches {
                    validate_frame_props_in_body_with_props(
                        design,
                        &br.body,
                        component_name,
                        current_frame_kind,
                        let_kinds,
                        &props_on_frame,
                    )?;
                }
                if let Some(else_body) = &chain.else_body {
                    validate_frame_props_in_body_with_props(
                        design,
                        else_body,
                        component_name,
                        current_frame_kind,
                        let_kinds,
                        &props_on_frame,
                    )?;
                }
            }
            _ => {}
        }
    }
    assert_aspect_box_consistent(design, &props_on_frame, &ctx)
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
                        "{ctx}: unknown property `{prop}` (typeStyle allows text frame props only)"
                    ),
                    design,
                ));
            }
            assert_frame_prop_compatible(design, "text", prop, value, &ctx)?;
        }
    }
    Ok(())
}
