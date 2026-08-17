//! `ValueExpr` / `ConditionExpr` serialisation for graph artefacts.
//!
//! Rust port of `src/graph.ts` (`serialiseConditionExpr`, `serialiseValueExpr`,
//! `serialiseValueExprWithTokenRefs`) plus `src/valueExprRefs.ts`
//! (`collectDeclaredTokenNamesFromValueExpr`). Emits the same embedded
//! `SerialisedValueExpr` JSON slices the TypeScript oracle produces for the
//! component catalogue and resolved-component `system` bundle.

use std::collections::BTreeSet;

use serde_json::{Map, Value};

use crate::ast::*;
use crate::design::DesignDefinition;
use crate::stable_json::number_value;

fn cmp_op_str(op: CmpOp) -> &'static str {
    match op {
        CmpOp::Eq => "==",
        CmpOp::Ne => "!=",
    }
}

fn obj(entries: Vec<(&str, Value)>) -> Value {
    let mut m = Map::new();
    for (k, v) in entries {
        m.insert(k.to_string(), v);
    }
    Value::Object(m)
}

/// Serialise a condition expression (`cmp` / `and` / `or` / `not`).
pub fn serialise_condition_expr(c: &ConditionExpr) -> Value {
    match c {
        ConditionExpr::Cmp {
            param,
            op,
            rhs,
            rhs_is_param,
        } => {
            let mut fields = vec![
                ("kind", Value::String("cmp".to_string())),
                ("param", Value::String(param.clone())),
                ("op", Value::String(cmp_op_str(*op).to_string())),
                ("rhs", Value::String(rhs.clone())),
            ];
            if *rhs_is_param {
                fields.push(("rhsKind", Value::String("param".to_string())));
            }
            obj(fields)
        }
        ConditionExpr::Truthy { param } => obj(vec![
            ("kind", Value::String("truthy".to_string())),
            ("param", Value::String(param.clone())),
        ]),
        ConditionExpr::And { items } => obj(vec![
            ("kind", Value::String("and".to_string())),
            (
                "items",
                Value::Array(items.iter().map(serialise_condition_expr).collect()),
            ),
        ]),
        ConditionExpr::Or { items } => obj(vec![
            ("kind", Value::String("or".to_string())),
            (
                "items",
                Value::Array(items.iter().map(serialise_condition_expr).collect()),
            ),
        ]),
        ConditionExpr::Not { expr } => obj(vec![
            ("kind", Value::String("not".to_string())),
            ("expr", serialise_condition_expr(expr)),
        ]),
    }
}

fn scalar_value(expr: &ValueExpr) -> Value {
    match expr {
        ValueExpr::Hex { value } | ValueExpr::String { value } => Value::String(value.clone()),
        ValueExpr::Number { value } => number_value(*value),
        ValueExpr::Boolean { value } => Value::Bool(*value),
        ValueExpr::Null => Value::Null,
        _ => Value::Null,
    }
}

fn scalar_kind(expr: &ValueExpr) -> &'static str {
    match expr {
        ValueExpr::Hex { .. } => "hex",
        ValueExpr::String { .. } => "string",
        ValueExpr::Number { .. } => "number",
        ValueExpr::Boolean { .. } => "boolean",
        ValueExpr::Null => "null",
        _ => "unknown",
    }
}

fn sizing_mode_str(mode: &SizingMode) -> &'static str {
    match mode {
        SizingMode::Hug => "hug",
        SizingMode::Fill => "fill",
        SizingMode::Fixed { .. } => "fixed",
        SizingMode::Flex { .. } => "flex",
        SizingMode::Aspect { .. } => "aspect",
    }
}

fn callee_str(callee: CallCallee) -> &'static str {
    match callee {
        CallCallee::Color => "Color",
        CallCallee::Ramp => "Ramp",
        CallCallee::Blur => "Blur",
        CallCallee::MediaLayer => "MediaLayer",
        CallCallee::Vibrancy => "Vibrancy",
    }
}

fn edge_insets_variant_str(v: EdgeInsetsVariant) -> &'static str {
    match v {
        EdgeInsetsVariant::Xy => "xy",
        EdgeInsetsVariant::Trbl => "trbl",
    }
}

/// Serialise a value expression for catalogue / resolve JSON (embedded `SerialisedValueExpr`).
pub fn serialise_value_expr(e: &ValueExpr) -> Value {
    match e {
        ValueExpr::Hex { .. }
        | ValueExpr::String { .. }
        | ValueExpr::Number { .. }
        | ValueExpr::Boolean { .. } => obj(vec![
            ("kind", Value::String(scalar_kind(e).to_string())),
            ("value", scalar_value(e)),
        ]),
        ValueExpr::Null => obj(vec![("kind", Value::String("null".to_string()))]),
        ValueExpr::Ratio { width, height } => obj(vec![
            ("kind", Value::String("ratio".to_string())),
            ("width", number_value(*width)),
            ("height", number_value(*height)),
        ]),
        ValueExpr::Condition { expr } => obj(vec![
            ("kind", Value::String("condition".to_string())),
            ("expr", serialise_condition_expr(expr)),
        ]),
        ValueExpr::Ident { name } => obj(vec![
            ("kind", Value::String("ident".to_string())),
            ("name", Value::String(name.clone())),
        ]),
        ValueExpr::SelfRef => obj(vec![("kind", Value::String("self".to_string()))]),
        ValueExpr::SelfMember { name } => obj(vec![
            ("kind", Value::String("selfMember".to_string())),
            ("name", Value::String(name.clone())),
        ]),
        ValueExpr::DotEnum { value } => obj(vec![
            ("kind", Value::String("dotEnum".to_string())),
            ("value", Value::String(value.clone())),
        ]),
        ValueExpr::OpacityOf { base, opacity } => obj(vec![
            ("kind", Value::String("opacityOf".to_string())),
            ("base", serialise_value_expr(base)),
            ("opacity", serialise_value_expr(opacity)),
        ]),
        ValueExpr::EdgeInsets { variant, fields } => obj(vec![
            ("kind", Value::String("edgeInsets".to_string())),
            (
                "variant",
                Value::String(edge_insets_variant_str(*variant).to_string()),
            ),
            ("fields", serialise_fields(fields, serialise_value_expr)),
        ]),
        ValueExpr::Corner { tl, tr, br, bl } => obj(vec![
            ("kind", Value::String("corner".to_string())),
            ("tl", serialise_value_expr(tl)),
            ("tr", serialise_value_expr(tr)),
            ("br", serialise_value_expr(br)),
            ("bl", serialise_value_expr(bl)),
        ]),
        ValueExpr::Shadow {
            x,
            y,
            blur_radius,
            color,
            spread,
        } => {
            let mut entries = vec![
                ("kind", Value::String("shadow".to_string())),
                ("x", serialise_value_expr(x)),
                ("y", serialise_value_expr(y)),
                ("blurRadius", serialise_value_expr(blur_radius)),
                ("color", serialise_value_expr(color)),
            ];
            if let Some(s) = spread {
                entries.push(("spread", serialise_value_expr(s)));
            }
            obj(entries)
        }
        ValueExpr::IconFile { path } => obj(vec![
            ("kind", Value::String("iconRef".to_string())),
            ("source", Value::String("file".to_string())),
            ("path", serialise_value_expr(path)),
        ]),
        ValueExpr::IconSystem { system, name } => obj(vec![
            ("kind", Value::String("iconRef".to_string())),
            ("source", Value::String("system".to_string())),
            ("system", serialise_value_expr(system)),
            ("name", serialise_value_expr(name)),
        ]),
        ValueExpr::MediaSourceFile {
            path,
            media_kind,
            format,
        } => {
            let mut entries = vec![
                ("kind", Value::String("mediaSourceRef".to_string())),
                ("source", Value::String("file".to_string())),
                ("path", serialise_value_expr(path)),
            ];
            if let Some(k) = media_kind {
                entries.push(("mediaKind", serialise_value_expr(k)));
            }
            if let Some(f) = format {
                entries.push(("format", serialise_value_expr(f)));
            }
            obj(entries)
        }
        ValueExpr::MediaSourceUrl {
            url,
            media_kind,
            format,
        } => {
            let mut entries = vec![
                ("kind", Value::String("mediaSourceRef".to_string())),
                ("source", Value::String("url".to_string())),
                ("url", serialise_value_expr(url)),
            ];
            if let Some(k) = media_kind {
                entries.push(("mediaKind", serialise_value_expr(k)));
            }
            if let Some(f) = format {
                entries.push(("format", serialise_value_expr(f)));
            }
            obj(entries)
        }
        ValueExpr::Array { items } => obj(vec![
            ("kind", Value::String("array".to_string())),
            (
                "items",
                Value::Array(items.iter().map(serialise_value_expr).collect()),
            ),
        ]),
        ValueExpr::Timing {
            duration,
            ease,
            delay,
        } => {
            let mut entries = vec![
                ("kind", Value::String("timing".to_string())),
                ("duration", serialise_value_expr(duration)),
                ("ease", serialise_value_expr(ease)),
            ];
            if let Some(d) = delay {
                entries.push(("delay", serialise_value_expr(d)));
            }
            obj(entries)
        }
        ValueExpr::Pose { props } => obj(vec![
            ("kind", Value::String("pose".to_string())),
            ("props", serialise_fields(props, serialise_value_expr)),
        ]),
        ValueExpr::Stagger { step, from } => {
            let mut entries = vec![
                ("kind", Value::String("stagger".to_string())),
                ("step", serialise_value_expr(step)),
            ];
            if let Some(f) = from {
                entries.push(("from", serialise_value_expr(f)));
            }
            obj(entries)
        }
        ValueExpr::Key { pose, at, ease } => {
            let mut entries = vec![
                ("kind", Value::String("key".to_string())),
                ("pose", serialise_value_expr(pose)),
                ("at", serialise_value_expr(at)),
            ];
            if let Some(e) = ease {
                entries.push(("ease", serialise_value_expr(e)));
            }
            obj(entries)
        }
        ValueExpr::Motion {
            base,
            timing,
            pose,
            keys,
            play,
            repeat,
            stagger,
        } => {
            let mut entries = vec![("kind", Value::String("motion".to_string()))];
            if let Some(b) = base {
                entries.push(("base", serialise_value_expr(b)));
            }
            if let Some(t) = timing {
                entries.push(("timing", serialise_value_expr(t)));
            }
            if let Some(p) = play {
                entries.push(("play", serialise_value_expr(p)));
            }
            if let Some(p) = pose {
                entries.push(("pose", serialise_value_expr(p)));
            }
            if let Some(k) = keys {
                entries.push(("keys", serialise_value_expr(k)));
            }
            if let Some(s) = stagger {
                entries.push(("stagger", serialise_value_expr(s)));
            }
            if let Some(r) = repeat {
                entries.push(("repeat", serialise_value_expr(r)));
            }
            obj(entries)
        }
        ValueExpr::EaseBezier { x1, y1, x2, y2 } => obj(vec![
            ("kind", Value::String("easeBezier".to_string())),
            ("x1", serialise_value_expr(x1)),
            ("y1", serialise_value_expr(y1)),
            ("x2", serialise_value_expr(x2)),
            ("y2", serialise_value_expr(y2)),
        ]),
        ValueExpr::PresentationMotion {
            incoming,
            outgoing,
            duration,
            ease,
            delay,
            front,
            switch_at,
        } => {
            let mut entries = vec![
                ("kind", Value::String("presentationMotion".to_string())),
                ("incoming", serialise_value_expr(incoming)),
                ("outgoing", serialise_value_expr(outgoing)),
            ];
            if let Some(d) = duration {
                entries.push(("duration", serialise_value_expr(d)));
            }
            if let Some(e) = ease {
                entries.push(("ease", serialise_value_expr(e)));
            }
            if let Some(d) = delay {
                entries.push(("delay", serialise_value_expr(d)));
            }
            if let Some(f) = front {
                entries.push(("front", serialise_value_expr(f)));
            }
            if let Some(p) = switch_at {
                entries.push(("switchAt", serialise_value_expr(p)));
            }
            obj(entries)
        }
        ValueExpr::Effect {
            effect_kind,
            radius,
            vibrancy,
        } => {
            let mut entries = vec![
                ("kind", Value::String("effect".to_string())),
                ("effectKind", serialise_value_expr(effect_kind)),
            ];
            if let Some(r) = radius {
                entries.push(("radius", serialise_value_expr(r)));
            }
            if let Some(v) = vibrancy {
                entries.push(("vibrancy", serialise_value_expr(v)));
            }
            obj(entries)
        }
        ValueExpr::VibrancyTuple {
            saturation,
            brightness,
        } => obj(vec![
            ("kind", Value::String("vibrancyTuple".to_string())),
            ("saturation", number_value(*saturation)),
            ("brightness", number_value(*brightness)),
        ]),
        ValueExpr::RampInline { direction, stops } => obj(vec![
            ("kind", Value::String("rampInline".to_string())),
            ("direction", Value::String(direction.clone())),
            (
                "stops",
                Value::Array(stops.iter().map(serialise_value_expr).collect()),
            ),
        ]),
        ValueExpr::Sizing { mode } => serialise_sizing(mode, serialise_value_expr),
        ValueExpr::Call { callee, args } => obj(vec![
            ("kind", Value::String("call".to_string())),
            ("callee", Value::String(callee_str(*callee).to_string())),
            ("args", serialise_fields(args, serialise_value_expr)),
        ]),
        ValueExpr::Instance { component, kwargs } => obj(vec![
            ("kind", Value::String("instance".to_string())),
            ("component", Value::String(component.clone())),
            ("kwargs", serialise_fields(kwargs, serialise_value_expr)),
        ]),
        ValueExpr::GradientStop { fields } => obj(vec![
            ("kind", Value::String("gradientStop".to_string())),
            ("fields", serialise_fields(fields, serialise_value_expr)),
        ]),
    }
}

fn serialise_fields(
    fields: &indexmap::IndexMap<String, ValueExpr>,
    f: impl Fn(&ValueExpr) -> Value,
) -> Value {
    let mut m = Map::new();
    for (k, v) in fields {
        m.insert(k.clone(), f(v));
    }
    Value::Object(m)
}

fn serialise_sizing(mode: &SizingMode, f: impl Fn(&ValueExpr) -> Value) -> Value {
    let mut entries = vec![
        ("kind".to_string(), Value::String("sizing".to_string())),
        (
            "mode".to_string(),
            Value::String(sizing_mode_str(mode).to_string()),
        ),
    ];
    match mode {
        SizingMode::Fixed { fixed } => {
            entries.push(("fixed".to_string(), number_value(*fixed)));
        }
        SizingMode::Aspect { aspect } => {
            entries.push(("aspect".to_string(), f(aspect)));
        }
        SizingMode::Flex { flex_args } => {
            let mut m = Map::new();
            for (k, v) in flex_args {
                m.insert(k.clone(), f(v));
            }
            entries.push(("flexArgs".to_string(), Value::Object(m)));
        }
        _ => {}
    }
    let mut o = Map::new();
    for (k, v) in entries {
        o.insert(k, v);
    }
    Value::Object(o)
}

/// Serialise a value expression, replacing bare primitive/semantic idents with
/// `primitive:name` / `semantic:name` reference strings so definitions are not duplicated.
pub fn serialise_value_expr_with_token_refs(expr: &ValueExpr, design: &DesignDefinition) -> Value {
    match expr {
        ValueExpr::Ident { name } => {
            if design.primitives.contains_key(name) {
                return Value::String(format!("primitive:{name}"));
            }
            if design.semantics.contains_key(name) {
                return Value::String(format!("semantic:{name}"));
            }
            obj(vec![
                ("kind", Value::String("ident".to_string())),
                ("name", Value::String(name.clone())),
            ])
        }
        ValueExpr::SelfMember { name } => {
            // Same resolution as bare param idents for token-ref purposes.
            serialise_value_expr_with_token_refs(&ValueExpr::Ident { name: name.clone() }, design)
        }
        ValueExpr::SelfRef => obj(vec![("kind", Value::String("self".to_string()))]),
        ValueExpr::Hex { .. }
        | ValueExpr::String { .. }
        | ValueExpr::Number { .. }
        | ValueExpr::Boolean { .. } => obj(vec![
            ("kind", Value::String(scalar_kind(expr).to_string())),
            ("value", scalar_value(expr)),
        ]),
        ValueExpr::Null => obj(vec![("kind", Value::String("null".to_string()))]),
        ValueExpr::Ratio { width, height } => obj(vec![
            ("kind", Value::String("ratio".to_string())),
            ("width", number_value(*width)),
            ("height", number_value(*height)),
        ]),
        ValueExpr::Condition { .. } => serialise_value_expr(expr),
        ValueExpr::DotEnum { value } => obj(vec![
            ("kind", Value::String("dotEnum".to_string())),
            ("value", Value::String(value.clone())),
        ]),
        ValueExpr::OpacityOf { base, opacity } => obj(vec![
            ("kind", Value::String("opacityOf".to_string())),
            ("base", serialise_value_expr_with_token_refs(base, design)),
            (
                "opacity",
                serialise_value_expr_with_token_refs(opacity, design),
            ),
        ]),
        ValueExpr::EdgeInsets { variant, fields } => obj(vec![
            ("kind", Value::String("edgeInsets".to_string())),
            (
                "variant",
                Value::String(edge_insets_variant_str(*variant).to_string()),
            ),
            (
                "fields",
                serialise_fields(fields, |v| serialise_value_expr_with_token_refs(v, design)),
            ),
        ]),
        ValueExpr::Corner { tl, tr, br, bl } => obj(vec![
            ("kind", Value::String("corner".to_string())),
            ("tl", serialise_value_expr_with_token_refs(tl, design)),
            ("tr", serialise_value_expr_with_token_refs(tr, design)),
            ("br", serialise_value_expr_with_token_refs(br, design)),
            ("bl", serialise_value_expr_with_token_refs(bl, design)),
        ]),
        ValueExpr::Shadow {
            x,
            y,
            blur_radius,
            color,
            spread,
        } => {
            let mut entries = vec![
                ("kind", Value::String("shadow".to_string())),
                ("x", serialise_value_expr_with_token_refs(x, design)),
                ("y", serialise_value_expr_with_token_refs(y, design)),
                (
                    "blurRadius",
                    serialise_value_expr_with_token_refs(blur_radius, design),
                ),
                ("color", serialise_value_expr_with_token_refs(color, design)),
            ];
            if let Some(s) = spread {
                entries.push(("spread", serialise_value_expr_with_token_refs(s, design)));
            }
            obj(entries)
        }
        ValueExpr::IconFile { path } => obj(vec![
            ("kind", Value::String("iconRef".to_string())),
            ("source", Value::String("file".to_string())),
            ("path", serialise_value_expr_with_token_refs(path, design)),
        ]),
        ValueExpr::IconSystem { system, name } => obj(vec![
            ("kind", Value::String("iconRef".to_string())),
            ("source", Value::String("system".to_string())),
            (
                "system",
                serialise_value_expr_with_token_refs(system, design),
            ),
            ("name", serialise_value_expr_with_token_refs(name, design)),
        ]),
        ValueExpr::MediaSourceFile {
            path,
            media_kind,
            format,
        } => {
            let mut entries = vec![
                ("kind", Value::String("mediaSourceRef".to_string())),
                ("source", Value::String("file".to_string())),
                ("path", serialise_value_expr_with_token_refs(path, design)),
            ];
            if let Some(k) = media_kind {
                entries.push(("mediaKind", serialise_value_expr_with_token_refs(k, design)));
            }
            if let Some(f) = format {
                entries.push(("format", serialise_value_expr_with_token_refs(f, design)));
            }
            obj(entries)
        }
        ValueExpr::MediaSourceUrl {
            url,
            media_kind,
            format,
        } => {
            let mut entries = vec![
                ("kind", Value::String("mediaSourceRef".to_string())),
                ("source", Value::String("url".to_string())),
                ("url", serialise_value_expr_with_token_refs(url, design)),
            ];
            if let Some(k) = media_kind {
                entries.push(("mediaKind", serialise_value_expr_with_token_refs(k, design)));
            }
            if let Some(f) = format {
                entries.push(("format", serialise_value_expr_with_token_refs(f, design)));
            }
            obj(entries)
        }
        ValueExpr::Array { items } => obj(vec![
            ("kind", Value::String("array".to_string())),
            (
                "items",
                Value::Array(
                    items
                        .iter()
                        .map(|it| serialise_value_expr_with_token_refs(it, design))
                        .collect(),
                ),
            ),
        ]),
        ValueExpr::Timing {
            duration,
            ease,
            delay,
        } => {
            let mut entries = vec![
                ("kind", Value::String("timing".to_string())),
                (
                    "duration",
                    serialise_value_expr_with_token_refs(duration, design),
                ),
                (
                    "ease",
                    serialise_value_expr_with_token_refs(ease, design),
                ),
            ];
            if let Some(d) = delay {
                entries.push(("delay", serialise_value_expr_with_token_refs(d, design)));
            }
            obj(entries)
        }
        ValueExpr::Pose { props } => obj(vec![
            ("kind", Value::String("pose".to_string())),
            (
                "props",
                serialise_fields(props, |v| serialise_value_expr_with_token_refs(v, design)),
            ),
        ]),
        ValueExpr::Stagger { step, from } => {
            let mut entries = vec![
                ("kind", Value::String("stagger".to_string())),
                ("step", serialise_value_expr_with_token_refs(step, design)),
            ];
            if let Some(f) = from {
                entries.push(("from", serialise_value_expr_with_token_refs(f, design)));
            }
            obj(entries)
        }
        ValueExpr::Key { pose, at, ease } => {
            let mut entries = vec![
                ("kind", Value::String("key".to_string())),
                ("pose", serialise_value_expr_with_token_refs(pose, design)),
                ("at", serialise_value_expr_with_token_refs(at, design)),
            ];
            if let Some(e) = ease {
                entries.push(("ease", serialise_value_expr_with_token_refs(e, design)));
            }
            obj(entries)
        }
        ValueExpr::Motion {
            base,
            timing,
            pose,
            keys,
            play,
            repeat,
            stagger,
        } => {
            let mut entries = vec![("kind", Value::String("motion".to_string()))];
            if let Some(b) = base {
                entries.push(("base", serialise_value_expr_with_token_refs(b, design)));
            }
            if let Some(t) = timing {
                entries.push((
                    "timing",
                    serialise_value_expr_with_token_refs(t, design),
                ));
            }
            if let Some(p) = play {
                entries.push(("play", serialise_value_expr_with_token_refs(p, design)));
            }
            if let Some(p) = pose {
                entries.push(("pose", serialise_value_expr_with_token_refs(p, design)));
            }
            if let Some(k) = keys {
                entries.push(("keys", serialise_value_expr_with_token_refs(k, design)));
            }
            if let Some(s) = stagger {
                entries.push(("stagger", serialise_value_expr_with_token_refs(s, design)));
            }
            if let Some(r) = repeat {
                entries.push(("repeat", serialise_value_expr_with_token_refs(r, design)));
            }
            obj(entries)
        }
        ValueExpr::EaseBezier { x1, y1, x2, y2 } => obj(vec![
            ("kind", Value::String("easeBezier".to_string())),
            ("x1", serialise_value_expr_with_token_refs(x1, design)),
            ("y1", serialise_value_expr_with_token_refs(y1, design)),
            ("x2", serialise_value_expr_with_token_refs(x2, design)),
            ("y2", serialise_value_expr_with_token_refs(y2, design)),
        ]),
        ValueExpr::PresentationMotion {
            incoming,
            outgoing,
            duration,
            ease,
            delay,
            front,
            switch_at,
        } => {
            let mut entries = vec![
                ("kind", Value::String("presentationMotion".to_string())),
                (
                    "incoming",
                    serialise_value_expr_with_token_refs(incoming, design),
                ),
                (
                    "outgoing",
                    serialise_value_expr_with_token_refs(outgoing, design),
                ),
            ];
            if let Some(d) = duration {
                entries.push(("duration", serialise_value_expr_with_token_refs(d, design)));
            }
            if let Some(e) = ease {
                entries.push(("ease", serialise_value_expr_with_token_refs(e, design)));
            }
            if let Some(d) = delay {
                entries.push(("delay", serialise_value_expr_with_token_refs(d, design)));
            }
            if let Some(f) = front {
                entries.push(("front", serialise_value_expr_with_token_refs(f, design)));
            }
            if let Some(p) = switch_at {
                entries.push(("switchAt", serialise_value_expr_with_token_refs(p, design)));
            }
            obj(entries)
        }
        ValueExpr::Effect {
            effect_kind,
            radius,
            vibrancy,
        } => {
            let mut entries = vec![
                ("kind", Value::String("effect".to_string())),
                (
                    "effectKind",
                    serialise_value_expr_with_token_refs(effect_kind, design),
                ),
            ];
            if let Some(r) = radius {
                entries.push(("radius", serialise_value_expr_with_token_refs(r, design)));
            }
            if let Some(v) = vibrancy {
                entries.push(("vibrancy", serialise_value_expr_with_token_refs(v, design)));
            }
            obj(entries)
        }
        ValueExpr::VibrancyTuple {
            saturation,
            brightness,
        } => obj(vec![
            ("kind", Value::String("vibrancyTuple".to_string())),
            ("saturation", number_value(*saturation)),
            ("brightness", number_value(*brightness)),
        ]),
        ValueExpr::RampInline { direction, stops } => obj(vec![
            ("kind", Value::String("rampInline".to_string())),
            ("direction", Value::String(direction.clone())),
            (
                "stops",
                Value::Array(
                    stops
                        .iter()
                        .map(|s| serialise_value_expr_with_token_refs(s, design))
                        .collect(),
                ),
            ),
        ]),
        ValueExpr::Sizing { mode } => {
            serialise_sizing(mode, |v| serialise_value_expr_with_token_refs(v, design))
        }
        ValueExpr::Call { callee, args } => obj(vec![
            ("kind", Value::String("call".to_string())),
            ("callee", Value::String(callee_str(*callee).to_string())),
            (
                "args",
                serialise_fields(args, |v| serialise_value_expr_with_token_refs(v, design)),
            ),
        ]),
        ValueExpr::Instance { component, kwargs } => obj(vec![
            ("kind", Value::String("instance".to_string())),
            ("component", Value::String(component.clone())),
            (
                "kwargs",
                serialise_fields(kwargs, |v| serialise_value_expr_with_token_refs(v, design)),
            ),
        ]),
        ValueExpr::GradientStop { fields } => obj(vec![
            ("kind", Value::String("gradientStop".to_string())),
            (
                "fields",
                serialise_fields(fields, |v| serialise_value_expr_with_token_refs(v, design)),
            ),
        ]),
    }
}

/// Collect primitive/semantic token names referenced from a `ValueExpr` subtree
/// (authored RHS only). Rust port of `collectDeclaredTokenNamesFromValueExpr`.
pub fn collect_declared_token_names_from_value_expr(
    expr: &ValueExpr,
    design: &DesignDefinition,
    sink: &mut BTreeSet<String>,
) {
    match expr {
        ValueExpr::Ident { name } => {
            if design.primitives.contains_key(name) || design.semantics.contains_key(name) {
                sink.insert(name.clone());
            }
        }
        ValueExpr::OpacityOf { base, opacity } => {
            collect_declared_token_names_from_value_expr(base, design, sink);
            collect_declared_token_names_from_value_expr(opacity, design, sink);
        }
        ValueExpr::EdgeInsets { fields, .. } => {
            for v in fields.values() {
                collect_declared_token_names_from_value_expr(v, design, sink);
            }
        }
        ValueExpr::Corner { tl, tr, br, bl } => {
            collect_declared_token_names_from_value_expr(tl, design, sink);
            collect_declared_token_names_from_value_expr(tr, design, sink);
            collect_declared_token_names_from_value_expr(br, design, sink);
            collect_declared_token_names_from_value_expr(bl, design, sink);
        }
        ValueExpr::Shadow {
            x,
            y,
            blur_radius,
            color,
            spread,
        } => {
            collect_declared_token_names_from_value_expr(x, design, sink);
            collect_declared_token_names_from_value_expr(y, design, sink);
            collect_declared_token_names_from_value_expr(blur_radius, design, sink);
            collect_declared_token_names_from_value_expr(color, design, sink);
            if let Some(s) = spread {
                collect_declared_token_names_from_value_expr(s, design, sink);
            }
        }
        ValueExpr::IconFile { path } => {
            collect_declared_token_names_from_value_expr(path, design, sink);
        }
        ValueExpr::IconSystem { system, name } => {
            collect_declared_token_names_from_value_expr(system, design, sink);
            collect_declared_token_names_from_value_expr(name, design, sink);
        }
        ValueExpr::MediaSourceFile {
            path,
            media_kind,
            format,
        } => {
            collect_declared_token_names_from_value_expr(path, design, sink);
            if let Some(k) = media_kind {
                collect_declared_token_names_from_value_expr(k, design, sink);
            }
            if let Some(f) = format {
                collect_declared_token_names_from_value_expr(f, design, sink);
            }
        }
        ValueExpr::MediaSourceUrl {
            url,
            media_kind,
            format,
        } => {
            collect_declared_token_names_from_value_expr(url, design, sink);
            if let Some(k) = media_kind {
                collect_declared_token_names_from_value_expr(k, design, sink);
            }
            if let Some(f) = format {
                collect_declared_token_names_from_value_expr(f, design, sink);
            }
        }
        ValueExpr::Array { items } => {
            for it in items {
                collect_declared_token_names_from_value_expr(it, design, sink);
            }
        }
        ValueExpr::Timing {
            duration,
            ease,
            delay,
        } => {
            collect_declared_token_names_from_value_expr(duration, design, sink);
            collect_declared_token_names_from_value_expr(ease, design, sink);
            if let Some(d) = delay {
                collect_declared_token_names_from_value_expr(d, design, sink);
            }
        }
        ValueExpr::Pose { props } => {
            for v in props.values() {
                collect_declared_token_names_from_value_expr(v, design, sink);
            }
        }
        ValueExpr::Stagger { step, from } => {
            collect_declared_token_names_from_value_expr(step, design, sink);
            if let Some(f) = from {
                collect_declared_token_names_from_value_expr(f, design, sink);
            }
        }
        ValueExpr::Key { pose, at, ease } => {
            collect_declared_token_names_from_value_expr(pose, design, sink);
            collect_declared_token_names_from_value_expr(at, design, sink);
            if let Some(e) = ease {
                collect_declared_token_names_from_value_expr(e, design, sink);
            }
        }
        ValueExpr::Motion {
            base,
            timing,
            pose,
            keys,
            play,
            repeat,
            stagger,
        } => {
            if let Some(b) = base {
                collect_declared_token_names_from_value_expr(b, design, sink);
            }
            if let Some(t) = timing {
                collect_declared_token_names_from_value_expr(t, design, sink);
            }
            if let Some(p) = pose {
                collect_declared_token_names_from_value_expr(p, design, sink);
            }
            if let Some(k) = keys {
                collect_declared_token_names_from_value_expr(k, design, sink);
            }
            if let Some(p) = play {
                collect_declared_token_names_from_value_expr(p, design, sink);
            }
            if let Some(r) = repeat {
                collect_declared_token_names_from_value_expr(r, design, sink);
            }
            if let Some(s) = stagger {
                collect_declared_token_names_from_value_expr(s, design, sink);
            }
        }
        ValueExpr::EaseBezier { x1, y1, x2, y2 } => {
            collect_declared_token_names_from_value_expr(x1, design, sink);
            collect_declared_token_names_from_value_expr(y1, design, sink);
            collect_declared_token_names_from_value_expr(x2, design, sink);
            collect_declared_token_names_from_value_expr(y2, design, sink);
        }
        ValueExpr::PresentationMotion {
            incoming,
            outgoing,
            duration,
            ease,
            delay,
            front,
            switch_at,
        } => {
            collect_declared_token_names_from_value_expr(incoming, design, sink);
            collect_declared_token_names_from_value_expr(outgoing, design, sink);
            if let Some(d) = duration {
                collect_declared_token_names_from_value_expr(d, design, sink);
            }
            if let Some(e) = ease {
                collect_declared_token_names_from_value_expr(e, design, sink);
            }
            if let Some(d) = delay {
                collect_declared_token_names_from_value_expr(d, design, sink);
            }
            if let Some(f) = front {
                collect_declared_token_names_from_value_expr(f, design, sink);
            }
            if let Some(p) = switch_at {
                collect_declared_token_names_from_value_expr(p, design, sink);
            }
        }
        ValueExpr::Effect {
            effect_kind,
            radius,
            vibrancy,
        } => {
            collect_declared_token_names_from_value_expr(effect_kind, design, sink);
            if let Some(r) = radius {
                collect_declared_token_names_from_value_expr(r, design, sink);
            }
            if let Some(v) = vibrancy {
                collect_declared_token_names_from_value_expr(v, design, sink);
            }
        }
        ValueExpr::RampInline { stops, .. } => {
            for s in stops {
                collect_declared_token_names_from_value_expr(s, design, sink);
            }
        }
        ValueExpr::Sizing { mode } => match mode {
            SizingMode::Aspect { aspect } => {
                collect_declared_token_names_from_value_expr(aspect, design, sink);
            }
            SizingMode::Flex { flex_args } => {
                for v in flex_args.values() {
                    collect_declared_token_names_from_value_expr(v, design, sink);
                }
            }
            _ => {}
        },
        ValueExpr::Call { args, .. } => {
            for v in args.values() {
                collect_declared_token_names_from_value_expr(v, design, sink);
            }
        }
        ValueExpr::Instance { kwargs, .. } => {
            for v in kwargs.values() {
                collect_declared_token_names_from_value_expr(v, design, sink);
            }
        }
        ValueExpr::GradientStop { fields } => {
            for v in fields.values() {
                collect_declared_token_names_from_value_expr(v, design, sink);
            }
        }
        ValueExpr::Hex { .. }
        | ValueExpr::String { .. }
        | ValueExpr::Number { .. }
        | ValueExpr::Ratio { .. }
        | ValueExpr::Boolean { .. }
        | ValueExpr::Null
        | ValueExpr::DotEnum { .. }
        | ValueExpr::Condition { .. }
        | ValueExpr::VibrancyTuple { .. }
        | ValueExpr::SelfRef
        | ValueExpr::SelfMember { .. } => {}
    }
}
