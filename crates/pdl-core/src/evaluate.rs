//! Token/value evaluation and resolved token-map construction.
//!
//! Rust port of `src/evaluate.ts`. Resolved values are represented as
//! [`serde_json::Value`] so the downstream bake pipeline can serialize them with
//! [`crate::stable_json`].

use std::collections::{HashMap, HashSet};

use indexmap::IndexMap;
use serde_json::{Map, Value};

use crate::asset_refs::{
    coerce_icon_value, coerce_media_source_value, normalize_icon_system_name,
    normalize_media_format_name, normalize_media_kind_name,
};
use crate::ast::*;
use crate::design::DesignDefinition;
use crate::error::PdlError;
use crate::stable_json::number_value;

/// Resolved token cache (may be partial during bootstrap).
pub type Tokens = HashMap<String, Value>;
/// Component parameter bindings (variant values as bare strings).
pub type ParamValues = Map<String, Value>;
/// Parameter name → declared type metadata.
#[derive(Debug, Clone)]
pub struct ParamTypeMeta {
    pub type_name: String,
    pub is_array: bool,
}

pub type ParamMeta = IndexMap<String, ParamTypeMeta>;

/// Evaluation context (mirrors the TS `EvalOptions`).
pub struct Eval<'a> {
    pub design: &'a DesignDefinition,
    pub tokens: &'a mut Tokens,
    pub visiting: &'a mut HashSet<String>,
    pub param_values: Option<&'a ParamValues>,
    pub param_meta: Option<&'a ParamMeta>,
    pub use_string_placeholders: bool,
}

fn expand_hex(hex: &str) -> String {
    if hex.len() == 4 {
        let b = hex.as_bytes();
        let r = b[1] as char;
        let g = b[2] as char;
        let bl = b[3] as char;
        format!("#{r}{r}{g}{g}{bl}{bl}")
    } else {
        hex.to_string()
    }
}

struct Rgba {
    r: u32,
    g: u32,
    b: u32,
    a: u32,
}

fn parse_hex_rgb(hex: &str) -> Result<Rgba, PdlError> {
    let e = expand_hex(hex);
    let h = &e[1..];
    let parse = |s: &str| u32::from_str_radix(s, 16).unwrap_or(0);
    if h.len() == 6 {
        Ok(Rgba {
            r: parse(&h[0..2]),
            g: parse(&h[2..4]),
            b: parse(&h[4..6]),
            a: 255,
        })
    } else if h.len() == 8 {
        Ok(Rgba {
            r: parse(&h[0..2]),
            g: parse(&h[2..4]),
            b: parse(&h[4..6]),
            a: parse(&h[6..8]),
        })
    } else {
        Err(PdlError::new(
            "PDL-E003",
            format!("Invalid hex color {hex}"),
            None,
            None,
            None,
        ))
    }
}

fn strip_leading_dot(s: &str) -> &str {
    s.strip_prefix('.').unwrap_or(s)
}

/// `String(v)` in JavaScript, restricted to the value kinds condition RHS produces.
fn js_string(v: &Value) -> String {
    match v {
        Value::String(s) => s.clone(),
        Value::Bool(b) => b.to_string(),
        Value::Number(n) => n.to_string(),
        Value::Null => "null".to_string(),
        other => other.to_string(),
    }
}

/// Evaluate a variant `if` condition against bound parameters (values without leading dot).
pub fn evaluate_condition(c: &ConditionExpr, param_values: &ParamValues) -> bool {
    match c {
        ConditionExpr::Cmp {
            param,
            op,
            rhs,
            rhs_is_param,
        } => {
            let left = match param_values.get(param) {
                None => String::new(),
                Some(v) => js_string(v),
            };
            let right = if *rhs_is_param {
                match param_values.get(rhs) {
                    None => String::new(),
                    Some(v) => js_string(v),
                }
            } else {
                strip_leading_dot(rhs).to_string()
            };
            match op {
                CmpOp::Eq => left == right,
                CmpOp::Ne => left != right,
            }
        }
        ConditionExpr::Truthy { param } => match param_values.get(param) {
            Some(Value::Bool(b)) => *b,
            Some(v) => {
                let s = js_string(v);
                s == "true" || s == "1"
            }
            None => false,
        },
        ConditionExpr::And { items } => items.iter().all(|x| evaluate_condition(x, param_values)),
        ConditionExpr::Or { items } => items.iter().any(|x| evaluate_condition(x, param_values)),
        ConditionExpr::Not { expr } => !evaluate_condition(expr, param_values),
    }
}

fn is_placeholder_type(t: &str) -> bool {
    t == "String" || t == "Icon" || t == "MediaSource"
}

fn eval_media_kind_opt(
    media_kind: Option<&ValueExpr>,
    ev: &mut Eval,
) -> Result<Option<String>, PdlError> {
    let Some(expr) = media_kind else {
        return Ok(None);
    };
    let v = evaluate_value(expr, ev)?;
    let raw = match &v {
        Value::String(s) => s.as_str(),
        _ => {
            return Err(PdlError::new(
                "PDL-E006",
                "MediaSource kind must be .raster, .vector, or .video".to_string(),
                Some(ev.design.entry_path.clone()),
                None,
                None,
            ))
        }
    };
    let Some(k) = normalize_media_kind_name(raw) else {
        return Err(PdlError::new(
            "PDL-E006",
            format!("Unknown MediaSource kind `{raw}` (expected .raster, .vector, or .video)"),
            Some(ev.design.entry_path.clone()),
            None,
            None,
        ));
    };
    Ok(Some(k.to_string()))
}

fn eval_media_format_opt(
    format: Option<&ValueExpr>,
    ev: &mut Eval,
) -> Result<Option<String>, PdlError> {
    let Some(expr) = format else {
        return Ok(None);
    };
    let v = evaluate_value(expr, ev)?;
    let raw = match &v {
        Value::String(s) => s.as_str(),
        _ => {
            return Err(PdlError::new(
                "PDL-E006",
                "MediaSource format must be a closed case (.webp|.jpeg|.png|.gif|.svg|.mp4|.webm|.pdf)"
                    .to_string(),
                Some(ev.design.entry_path.clone()),
                None,
                None,
            ))
        }
    };
    let Some(f) = normalize_media_format_name(raw) else {
        return Err(PdlError::new(
            "PDL-E006",
            format!(
                "Unknown MediaSource format `{raw}` (expected .webp|.jpeg|.png|.gif|.svg|.mp4|.webm|.pdf)"
            ),
            Some(ev.design.entry_path.clone()),
            None,
            None,
        ));
    };
    Ok(Some(f.to_string()))
}

pub fn evaluate_value(expr: &ValueExpr, ev: &mut Eval) -> Result<Value, PdlError> {
    match expr {
        ValueExpr::Hex { value } => Ok(Value::String(expand_hex(value))),
        ValueExpr::String { value } => Ok(Value::String(value.clone())),
        ValueExpr::Number { value } => Ok(number_value(*value)),
        ValueExpr::Ratio { width, height } => Ok(number_value(width / height)),
        ValueExpr::Boolean { value } => Ok(Value::Bool(*value)),
        ValueExpr::Null => Ok(Value::Null),
        ValueExpr::Condition { expr } => {
            let pv = ev.param_values.ok_or_else(|| {
                PdlError::new(
                    "PDL-E001",
                    "Condition expressions require component parameter context",
                    Some(ev.design.entry_path.clone()),
                    None,
                    None,
                )
            })?;
            Ok(Value::Bool(evaluate_condition(expr, pv)))
        }
        ValueExpr::DotEnum { value } => Ok(Value::String(strip_leading_dot(value).to_string())),
        ValueExpr::Ident { name } => evaluate_ident(name, ev),
        ValueExpr::SelfMember { name } => evaluate_ident(name, ev),
        ValueExpr::SelfRef => Err(PdlError::new(
            "PDL-E001",
            "`self` as a value is only valid as an emit payload (not in bake trees)",
            Some(ev.design.entry_path.clone()),
            None,
            None,
        )),
        ValueExpr::OpacityOf { base, opacity } => {
            let base_v = evaluate_value(base, ev)?;
            let op_v = evaluate_value(opacity, ev)?;
            let alpha = match &op_v {
                Value::Number(n) => n.as_f64().unwrap_or(1.0),
                Value::String(s) if is_decimal_string(s) => s.parse::<f64>().unwrap_or(1.0),
                _ => {
                    return Err(PdlError::new(
                        "PDL-E003",
                        "Opacity @ rhs must be number or resolved Opacity token",
                        None,
                        None,
                        None,
                    ))
                }
            };
            let base_str = match &base_v {
                Value::String(s) => s.clone(),
                other => other.to_string(),
            };
            if !base_str.starts_with('#') {
                return Err(PdlError::new(
                    "PDL-E003",
                    "@ opacity base must resolve to hex color",
                    None,
                    None,
                    None,
                ));
            }
            let rgba = parse_hex_rgb(&base_str)?;
            let out_a = (rgba.a as f64 * alpha).round() as u32;
            Ok(Value::String(format!(
                "#{:02x}{:02x}{:02x}{:02x}",
                rgba.r, rgba.g, rgba.b, out_a
            )))
        }
        ValueExpr::EdgeInsets { variant, fields } => match variant {
            EdgeInsetsVariant::Xy => {
                let x = evaluate_value(field(fields, "x")?, ev)?;
                let y = evaluate_value(field(fields, "y")?, ev)?;
                Ok(obj(vec![
                    ("top", y.clone()),
                    ("right", x.clone()),
                    ("bottom", y),
                    ("left", x),
                ]))
            }
            EdgeInsetsVariant::Trbl => {
                let top = evaluate_value(field(fields, "top")?, ev)?;
                let right = evaluate_value(field(fields, "right")?, ev)?;
                let bottom = evaluate_value(field(fields, "bottom")?, ev)?;
                let left = evaluate_value(field(fields, "left")?, ev)?;
                Ok(obj(vec![
                    ("top", top),
                    ("right", right),
                    ("bottom", bottom),
                    ("left", left),
                ]))
            }
        },
        ValueExpr::Corner { tl, tr, br, bl } => {
            let tl = evaluate_value(tl, ev)?;
            let tr = evaluate_value(tr, ev)?;
            let br = evaluate_value(br, ev)?;
            let bl = evaluate_value(bl, ev)?;
            if tl == tr && tr == br && br == bl {
                Ok(tl)
            } else {
                Ok(obj(vec![("tl", tl), ("tr", tr), ("br", br), ("bl", bl)]))
            }
        }
        ValueExpr::Shadow {
            x,
            y,
            blur_radius,
            color,
            spread,
        } => {
            let x = evaluate_value(x, ev)?;
            let y = evaluate_value(y, ev)?;
            let blur_radius = evaluate_value(blur_radius, ev)?;
            let color = evaluate_value(color, ev)?;
            let spread = match spread {
                Some(s) => evaluate_value(s, ev)?,
                None => number_value(0.0),
            };
            Ok(obj(vec![
                ("kind", Value::String("shadow".to_string())),
                ("x", x),
                ("y", y),
                ("blurRadius", blur_radius),
                ("spread", spread),
                ("color", color),
            ]))
        }
        ValueExpr::IconFile { path } => {
            let path = evaluate_value(path, ev)?;
            if !path.is_string() {
                return Err(PdlError::new(
                    "PDL-E003",
                    "IconRef(file:) path must evaluate to a string".to_string(),
                    Some(ev.design.entry_path.clone()),
                    None,
                    None,
                ));
            }
            Ok(obj(vec![
                ("kind", Value::String("iconRef".to_string())),
                ("source", Value::String("file".to_string())),
                ("path", path),
            ]))
        }
        ValueExpr::IconSystem { system, name } => {
            let system_raw = evaluate_value(system, ev)?;
            let name = evaluate_value(name, ev)?;
            let Some(system_str) = system_raw.as_str() else {
                return Err(PdlError::new(
                    "PDL-E003",
                    "IconRef(system:, name:) requires string system and name".to_string(),
                    Some(ev.design.entry_path.clone()),
                    None,
                    None,
                ));
            };
            if !name.is_string() {
                return Err(PdlError::new(
                    "PDL-E003",
                    "IconRef(system:, name:) requires string system and name".to_string(),
                    Some(ev.design.entry_path.clone()),
                    None,
                    None,
                ));
            }
            let Some(system) = normalize_icon_system_name(system_str) else {
                return Err(PdlError::new(
                    "PDL-E006",
                    format!(
                        "Unknown Icon system `{system_str}` (expected .sfSymbols or .materialSymbols)"
                    ),
                    Some(ev.design.entry_path.clone()),
                    None,
                    None,
                ));
            };
            Ok(obj(vec![
                ("kind", Value::String("iconRef".to_string())),
                ("source", Value::String("system".to_string())),
                ("system", Value::String(system.to_string())),
                ("name", name),
            ]))
        }
        ValueExpr::MediaSourceFile {
            path,
            media_kind,
            format,
        } => {
            let path = evaluate_value(path, ev)?;
            if !path.is_string() {
                return Err(PdlError::new(
                    "PDL-E003",
                    "MediaSource(file:) path must evaluate to a string".to_string(),
                    Some(ev.design.entry_path.clone()),
                    None,
                    None,
                ));
            }
            let mk = eval_media_kind_opt(media_kind.as_deref(), ev)?;
            let fmt = eval_media_format_opt(format.as_deref(), ev)?;
            crate::asset_refs::media_source_ref_json(
                "file",
                "path",
                path,
                mk,
                fmt,
                &ev.design.entry_path,
            )
        }
        ValueExpr::MediaSourceUrl {
            url,
            media_kind,
            format,
        } => {
            let url = evaluate_value(url, ev)?;
            if !url.is_string() {
                return Err(PdlError::new(
                    "PDL-E003",
                    "MediaSource(url:) must evaluate to a string".to_string(),
                    Some(ev.design.entry_path.clone()),
                    None,
                    None,
                ));
            }
            let mk = eval_media_kind_opt(media_kind.as_deref(), ev)?;
            let fmt = eval_media_format_opt(format.as_deref(), ev)?;
            crate::asset_refs::media_source_ref_json(
                "url",
                "url",
                url,
                mk,
                fmt,
                &ev.design.entry_path,
            )
        }
        ValueExpr::Array { items } => {
            let mut out = Vec::with_capacity(items.len());
            for it in items {
                out.push(evaluate_value(it, ev)?);
            }
            Ok(Value::Array(out))
        }
        ValueExpr::Instance { component, kwargs } => {
            let mut params = Map::new();
            for (k, v) in kwargs {
                params.insert(k.clone(), evaluate_value(v, ev)?);
            }
            Ok(obj(vec![
                ("component", Value::String(component.clone())),
                ("params", Value::Object(params)),
            ]))
        }
        ValueExpr::Transition {
            duration,
            easing,
            delay,
        } => {
            let mut entries = vec![
                ("duration", evaluate_value(duration, ev)?),
                ("easing", evaluate_value(easing, ev)?),
            ];
            if let Some(d) = delay {
                entries.push(("delay", evaluate_value(d, ev)?));
            }
            Ok(obj(entries))
        }
        ValueExpr::Pose { props } => {
            let mut m = Map::new();
            m.insert("kind".to_string(), Value::String("pose".to_string()));
            for (k, v) in props {
                m.insert(k.clone(), evaluate_value(v, ev)?);
            }
            Ok(Value::Object(m))
        }
        ValueExpr::Stagger { step, from } => {
            let mut entries = vec![
                ("kind", Value::String("stagger".to_string())),
                ("step", evaluate_value(step, ev)?),
            ];
            if let Some(f) = from {
                entries.push(("from", evaluate_value(f, ev)?));
            }
            Ok(obj(entries))
        }
        ValueExpr::Key { pose, at, easing } => {
            let mut entries = vec![
                ("kind", Value::String("key".to_string())),
                ("pose", evaluate_value(pose, ev)?),
                ("at", evaluate_value(at, ev)?),
            ];
            if let Some(e) = easing {
                entries.push(("easing", evaluate_value(e, ev)?));
            }
            Ok(obj(entries))
        }
        ValueExpr::Motion {
            base,
            transition,
            pose,
            keys,
            play,
            repeat,
            stagger,
        } => {
            let mut map = if let Some(b) = base {
                motion_object_from_eval(evaluate_value(b, ev)?)
            } else {
                let mut m = Map::new();
                m.insert("kind".into(), Value::String("motion".into()));
                m
            };
            if let Some(t) = transition {
                map.insert("transition".into(), evaluate_value(t, ev)?);
            }
            if let Some(p) = play {
                map.insert("play".into(), evaluate_value(p, ev)?);
            }
            if let Some(p) = pose {
                map.insert("pose".into(), evaluate_value(p, ev)?);
            }
            if let Some(k) = keys {
                map.insert("keys".into(), evaluate_value(k, ev)?);
            }
            if let Some(s) = stagger {
                map.insert("stagger".into(), evaluate_value(s, ev)?);
            }
            if let Some(r) = repeat {
                map.insert("repeat".into(), evaluate_value(r, ev)?);
            }
            Ok(Value::Object(map))
        }
        ValueExpr::Effect {
            effect_kind,
            radius,
            vibrancy,
        } => {
            let raw = evaluate_value(effect_kind, ev)?;
            let case_name = raw
                .as_str()
                .map(|s| s.strip_prefix('.').unwrap_or(s).to_string())
                .unwrap_or_else(|| "blurSelf".to_string());
            let mut map = Map::new();
            map.insert("kind".into(), Value::String("effect".into()));
            map.insert("case".into(), Value::String(case_name));
            if let Some(r) = radius {
                map.insert("radius".into(), evaluate_value(r, ev)?);
            }
            if let Some(v) = vibrancy {
                map.insert("vibrancy".into(), evaluate_value(v, ev)?);
            }
            Ok(Value::Object(map))
        }
        ValueExpr::VibrancyTuple {
            saturation,
            brightness,
        } => Ok(obj(vec![
            ("saturation", number_value(*saturation)),
            ("brightness", number_value(*brightness)),
        ])),
        ValueExpr::RampInline { direction, stops } => {
            let mut ev_stops = Vec::with_capacity(stops.len());
            for s in stops {
                ev_stops.push(evaluate_value(s, ev)?);
            }
            Ok(obj(vec![
                ("kind", Value::String("ramp".to_string())),
                ("direction", Value::String(direction.clone())),
                ("stops", Value::Array(ev_stops)),
            ]))
        }
        ValueExpr::Sizing { mode } => match mode {
            SizingMode::Hug => Ok(Value::String("hug".to_string())),
            SizingMode::Fill => Ok(Value::String("fill".to_string())),
            SizingMode::Fixed { fixed } => Ok(obj(vec![("fixed", number_value(*fixed))])),
            SizingMode::Aspect { aspect } => {
                let ar = evaluate_value(aspect, ev)?;
                let Some(n) = ar.as_f64() else {
                    return Err(PdlError::new(
                        "PDL-E005",
                        "`.aspect(…)` must evaluate to a positive finite ratio (width/height)"
                            .to_string(),
                        Some(ev.design.entry_path.clone()),
                        None,
                        None,
                    ));
                };
                if !(n > 0.0) || !n.is_finite() {
                    return Err(PdlError::new(
                        "PDL-E005",
                        "`.aspect(…)` must evaluate to a positive finite ratio (width/height)"
                            .to_string(),
                        Some(ev.design.entry_path.clone()),
                        None,
                        None,
                    ));
                }
                Ok(obj(vec![("aspect", number_value(n))]))
            }
            SizingMode::Flex { flex_args } => {
                let mut flex = Map::new();
                for (k, ve) in flex_args {
                    flex.insert(k.clone(), evaluate_value(ve, ev)?);
                }
                Ok(obj(vec![("flex", Value::Object(flex))]))
            }
        },
        ValueExpr::Call { callee, args } => evaluate_call(*callee, args, ev),
        ValueExpr::GradientStop { fields } => {
            let mut o = Map::new();
            o.insert(
                "kind".to_string(),
                Value::String("gradientStop".to_string()),
            );
            for (k, v) in fields {
                o.insert(k.clone(), evaluate_value(v, ev)?);
            }
            Ok(Value::Object(o))
        }
    }
}

fn evaluate_call(
    callee: CallCallee,
    args: &IndexMap<String, ValueExpr>,
    ev: &mut Eval,
) -> Result<Value, PdlError> {
    let mut get = |k: &str| -> Result<Value, PdlError> {
        match args.get(k) {
            Some(e) => evaluate_value(e, ev),
            None => Err(PdlError::new(
                "PDL-E001",
                format!("Missing argument `{k}`"),
                None,
                None,
                None,
            )),
        }
    };
    match callee {
        CallCallee::Color => get("color"),
        CallCallee::Blur => {
            let mut entries = vec![
                ("kind", Value::String("blur".to_string())),
                ("radius", get("radius")?),
            ];
            if args.contains_key("style") {
                entries.push(("style", get("style")?));
            }
            if args.contains_key("vibrancy") {
                entries.push(("vibrancy", get("vibrancy")?));
            }
            Ok(obj(entries))
        }
        CallCallee::MediaLayer => {
            let mut entries = vec![
                ("kind", Value::String("media".to_string())),
                ("source", get("source")?),
            ];
            if args.contains_key("contentMode") {
                entries.push(("contentMode", get("contentMode")?));
            }
            if args.contains_key("justify") {
                entries.push(("justify", get("justify")?));
            }
            if args.contains_key("align") {
                entries.push(("align", get("align")?));
            }
            if args.contains_key("opacity") {
                entries.push(("opacity", get("opacity")?));
            }
            Ok(obj(entries))
        }
        CallCallee::Vibrancy => {
            if args.contains_key("saturation") && args.contains_key("brightness") {
                Ok(obj(vec![
                    ("kind", Value::String("vibrancy".to_string())),
                    ("saturation", get("saturation")?),
                    ("brightness", get("brightness")?),
                ]))
            } else {
                // Legacy wrap form (rejected at validate); keep eval defensive.
                Ok(obj(vec![
                    ("kind", Value::String("vibrancy".to_string())),
                    ("vibrancy", get("vibrancy")?),
                ]))
            }
        }
        CallCallee::Ramp => Ok(obj(vec![
            ("kind", Value::String("ramp".to_string())),
            ("direction", get("direction")?),
            ("stops", get("stops")?),
        ])),
    }
}

fn evaluate_ident(name: &str, ev: &mut Eval) -> Result<Value, PdlError> {
    if let Some(meta) = ev.param_meta {
        if let Some(t) = meta.get(name) {
            if ev.use_string_placeholders && is_placeholder_type(&t.type_name) && !t.is_array {
                return Ok(Value::String(format!("param:{name}")));
            }
        }
    }
    if let Some(pv) = ev.param_values {
        if let Some(v) = pv.get(name) {
            return Ok(v.clone());
        }
    }
    if let Some(meta) = ev.param_meta {
        if let Some(t) = meta.get(name) {
            if is_placeholder_type(&t.type_name) && !t.is_array {
                return Ok(Value::String(format!("param:{name}")));
            }
        }
    }
    if let Some(cached) = ev.tokens.get(name) {
        return Ok(cached.clone());
    }
    if let Some(prim) = ev.design.primitives.get(name) {
        let token_type = prim.token_type.clone();
        let prim_expr = prim.value.clone();
        return resolve_token(name, &prim_expr, Some(&token_type), ev);
    }
    if let Some(sem) = ev.design.semantics.get(name) {
        let token_type = sem.token_type.clone();
        let sem_expr = sem.value.clone();
        return resolve_token(name, &sem_expr, Some(&token_type), ev);
    }
    if ev.design.type_styles.contains_key(name) {
        return Ok(obj(vec![("__typeStyle", Value::String(name.to_string()))]));
    }
    // Typed sample path: `Tracks.focus.tracks` (after tokens — banks are PascalCase symbols).
    if crate::samples::split_sample_path(name).is_some()
        && crate::samples::is_known_sample_path(ev.design, name)
    {
        return evaluate_sample_path(name, ev);
    }
    Err(PdlError::new(
        "PDL-E007",
        format!("Unresolved identifier {name}"),
        None,
        None,
        None,
    ))
}

fn evaluate_sample_path(path: &str, ev: &mut Eval) -> Result<Value, PdlError> {
    let field = crate::samples::lookup_sample_field(ev.design, path)?;
    // Guard cycles if sample fields ever reference each other.
    let cycle_key = format!("sample:{path}");
    if !ev.visiting.insert(cycle_key.clone()) {
        return Err(PdlError::new(
            "PDL-E041",
            format!("Circular sample reference `{path}`"),
            Some(ev.design.entry_path.clone()),
            None,
            None,
        ));
    }
    let field_expr = field.value.clone();
    let out = evaluate_value(&field_expr, ev);
    ev.visiting.remove(&cycle_key);
    out
}

fn resolve_token(
    name: &str,
    value_expr: &ValueExpr,
    token_type: Option<&str>,
    ev: &mut Eval,
) -> Result<Value, PdlError> {
    if ev.visiting.contains(name) {
        return Err(PdlError::new(
            "PDL-E004",
            format!("Circular token reference {name}"),
            None,
            None,
            None,
        ));
    }
    ev.visiting.insert(name.to_string());
    let mut evaluated = evaluate_value(value_expr, ev)?;
    ev.visiting.remove(name);
    if token_type == Some("Icon") {
        evaluated = coerce_icon_value(evaluated, &ev.design.entry_path)?;
    } else if token_type == Some("MediaSource") {
        evaluated = coerce_media_source_value(evaluated, &ev.design.entry_path)?;
    }
    ev.tokens.insert(name.to_string(), evaluated.clone());
    Ok(evaluated)
}

fn field<'a>(
    fields: &'a IndexMap<String, ValueExpr>,
    key: &str,
) -> Result<&'a ValueExpr, PdlError> {
    fields.get(key).ok_or_else(|| {
        PdlError::new(
            "PDL-E001",
            format!("Missing EdgeInsets field `{key}`"),
            None,
            None,
            None,
        )
    })
}

fn is_decimal_string(s: &str) -> bool {
    let mut chars = s.chars().peekable();
    let mut saw_digit = false;
    while let Some(&c) = chars.peek() {
        if c.is_ascii_digit() {
            saw_digit = true;
            chars.next();
        } else {
            break;
        }
    }
    if !saw_digit {
        return false;
    }
    if chars.peek() == Some(&'.') {
        chars.next();
        let mut frac_digit = false;
        while let Some(&c) = chars.peek() {
            if c.is_ascii_digit() {
                frac_digit = true;
                chars.next();
            } else {
                break;
            }
        }
        if !frac_digit {
            return false;
        }
    }
    chars.next().is_none()
}

fn obj(entries: Vec<(&str, Value)>) -> Value {
    let mut m = Map::new();
    for (k, v) in entries {
        m.insert(k.to_string(), v);
    }
    Value::Object(m)
}

/// Shallow Motion object from a token/value used as `Motion(base, field:)`.
fn motion_object_from_eval(raw: Value) -> Map<String, Value> {
    let Value::Object(o) = raw else {
        let mut m = Map::new();
        m.insert("kind".into(), Value::String("motion".into()));
        return m;
    };
    let is_motion = o.get("kind").and_then(|v| v.as_str()) == Some("motion")
        || o.contains_key("pose")
        || o.contains_key("keys")
        || o.contains_key("play");
    if is_motion {
        let mut m = o;
        m.insert("kind".into(), Value::String("motion".into()));
        return m;
    }
    if o.contains_key("duration") {
        let mut m = Map::new();
        m.insert("kind".into(), Value::String("motion".into()));
        m.insert("transition".into(), Value::Object(o));
        return m;
    }
    let mut m = o;
    m.insert("kind".into(), Value::String("motion".into()));
    m
}

/// Build the resolved token map for a design (optionally applying a base + modifier themes).
pub fn build_resolved_token_map(
    design: &DesignDefinition,
    theme_name: Option<&str>,
    modifier_themes: &[String],
) -> Result<Tokens, PdlError> {
    let mut tokens: Tokens = HashMap::new();
    let mut visiting: HashSet<String> = HashSet::new();

    let prim_names: Vec<String> = design.primitives.keys().cloned().collect();
    let sem_names: Vec<String> = design.semantics.keys().cloned().collect();

    for n in prim_names.into_iter().chain(sem_names.into_iter()) {
        let mut ev = Eval {
            design,
            tokens: &mut tokens,
            visiting: &mut visiting,
            param_values: None,
            param_meta: None,
            use_string_placeholders: false,
        };
        evaluate_value(&ValueExpr::Ident { name: n }, &mut ev)?;
    }

    let apply_theme =
        |name: &str, tokens: &mut Tokens, visiting: &mut HashSet<String>| -> Result<(), PdlError> {
            let overrides: Vec<(String, ValueExpr)> = match design.themes.get(name) {
                Some(th) => th
                    .overrides
                    .iter()
                    .map(|(k, v)| (k.clone(), v.clone()))
                    .collect(),
                None => {
                    return Err(PdlError::new(
                        "PDL-E005",
                        format!("Unknown theme {name}"),
                        Some(design.entry_path.clone()),
                        None,
                        None,
                    ))
                }
            };
            for (tok, rhs) in overrides {
                let mut ev = Eval {
                    design,
                    tokens,
                    visiting,
                    param_values: None,
                    param_meta: None,
                    use_string_placeholders: false,
                };
                let v = evaluate_value(&rhs, &mut ev)?;
                tokens.insert(tok, v);
            }
            Ok(())
        };

    if let Some(name) = theme_name {
        apply_theme(name, &mut tokens, &mut visiting)?;
    }
    for m in modifier_themes {
        apply_theme(m, &mut tokens, &mut visiting)?;
    }

    Ok(tokens)
}
