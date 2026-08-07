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
        _ => Value::Null,
    }
}

fn scalar_kind(expr: &ValueExpr) -> &'static str {
    match expr {
        ValueExpr::Hex { .. } => "hex",
        ValueExpr::String { .. } => "string",
        ValueExpr::Number { .. } => "number",
        ValueExpr::Boolean { .. } => "boolean",
        _ => "unknown",
    }
}

fn sizing_mode_str(mode: &SizingMode) -> &'static str {
    match mode {
        SizingMode::Hug => "hug",
        SizingMode::Fill => "fill",
        SizingMode::Fixed { .. } => "fixed",
        SizingMode::Flex { .. } => "flex",
    }
}

fn callee_str(callee: CallCallee) -> &'static str {
    match callee {
        CallCallee::Color => "Color",
        CallCallee::Ramp => "Ramp",
        CallCallee::Blur => "Blur",
        CallCallee::Media => "Media",
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
        ValueExpr::Array { items } => obj(vec![
            ("kind", Value::String("array".to_string())),
            (
                "items",
                Value::Array(items.iter().map(serialise_value_expr).collect()),
            ),
        ]),
        ValueExpr::Transition {
            duration,
            easing,
            delay,
        } => {
            let mut entries = vec![
                ("kind", Value::String("transition".to_string())),
                ("duration", serialise_value_expr(duration)),
                ("easing", serialise_value_expr(easing)),
            ];
            if let Some(d) = delay {
                entries.push(("delay", serialise_value_expr(d)));
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
        ValueExpr::Transition {
            duration,
            easing,
            delay,
        } => {
            let mut entries = vec![
                ("kind", Value::String("transition".to_string())),
                (
                    "duration",
                    serialise_value_expr_with_token_refs(duration, design),
                ),
                (
                    "easing",
                    serialise_value_expr_with_token_refs(easing, design),
                ),
            ];
            if let Some(d) = delay {
                entries.push(("delay", serialise_value_expr_with_token_refs(d, design)));
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
        ValueExpr::Array { items } => {
            for it in items {
                collect_declared_token_names_from_value_expr(it, design, sink);
            }
        }
        ValueExpr::Transition {
            duration,
            easing,
            delay,
        } => {
            collect_declared_token_names_from_value_expr(duration, design, sink);
            collect_declared_token_names_from_value_expr(easing, design, sink);
            if let Some(d) = delay {
                collect_declared_token_names_from_value_expr(d, design, sink);
            }
        }
        ValueExpr::RampInline { stops, .. } => {
            for s in stops {
                collect_declared_token_names_from_value_expr(s, design, sink);
            }
        }
        ValueExpr::Sizing { mode } => {
            if let SizingMode::Flex { flex_args } = mode {
                for v in flex_args.values() {
                    collect_declared_token_names_from_value_expr(v, design, sink);
                }
            }
        }
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
        | ValueExpr::Boolean { .. }
        | ValueExpr::DotEnum { .. }
        | ValueExpr::Condition { .. }
        | ValueExpr::VibrancyTuple { .. }
        | ValueExpr::SelfRef
        | ValueExpr::SelfMember { .. } => {}
    }
}
