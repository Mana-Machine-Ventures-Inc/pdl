//! Type-check parameter bindings (defaults, instance kwargs, fixtures).

use std::collections::HashMap;

use indexmap::IndexMap;

use crate::ast::*;
use crate::conditions::validate_condition_expr;
use crate::design::{effective_params, DesignDefinition};
use crate::error::PdlError;
use crate::frame_props::{
    assert_blur_call_compatible, assert_effect_value, assert_vibrancy_call_compatible,
};
use crate::param_types::{
    host_enum_cases, is_bool_param_type, is_host_enum_type, unwrap_param_type_name,
};

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

fn strip_dot(s: &str) -> &str {
    s.strip_prefix('.').unwrap_or(s)
}

fn value_kind_label(value: &ValueExpr) -> String {
    match value {
        ValueExpr::Ident { name } => format!("identifier `{name}`"),
        ValueExpr::SelfMember { name } => format!("identifier `self.{name}`"),
        ValueExpr::DotEnum { value } => format!("`{value}`"),
        ValueExpr::String { .. } => "string literal".to_string(),
        ValueExpr::Number { .. } => "number literal".to_string(),
        ValueExpr::Boolean { value } => format!("boolean `{value}`"),
        ValueExpr::Hex { .. } => "color literal".to_string(),
        ValueExpr::Ratio { .. } => "ratio literal".to_string(),
        ValueExpr::Instance { component, .. } => format!("instance `{component}(…)`"),
        ValueExpr::Array { .. } => "array".to_string(),
        ValueExpr::Call { callee, .. } => format!("{callee:?}(…)"),
        ValueExpr::IconFile { .. } | ValueExpr::IconSystem { .. } => "IconRef(…)".to_string(),
        ValueExpr::MediaSourceFile { .. } | ValueExpr::MediaSourceUrl { .. } => {
            "MediaSource(…)".to_string()
        }
        ValueExpr::Sizing { .. } => "sizing literal".to_string(),
        ValueExpr::Shadow { .. } => "Shadow(…)".to_string(),
        other => format!("{other:?}"),
    }
}

/// Assert a value is type-compatible with a declared parameter type
/// (defaults, instance kwargs, fixtures).
pub fn assert_param_value_compatible(
    design: &DesignDefinition,
    expected_type_name: &str,
    value: &ValueExpr,
    caller_params: &HashMap<String, String>,
    where_: &str,
) -> Result<(), PdlError> {
    let expected = crate::number_bounds::resolve_param_type_name(design, expected_type_name);
    let expected = expected.as_str();

    if let ValueExpr::Ident { name } = value {
        if let Some(caller_ty) = caller_params.get(name) {
            let got = crate::number_bounds::resolve_param_type_name(design, caller_ty);
            if got != expected {
                return Err(err(
                    "PDL-E040",
                    format!(
                        "Type mismatch {where_}: parameter `{name}` has type {got}, expected {expected}"
                    ),
                    design,
                ));
            }
            return Ok(());
        }
        if let Some(tok_ty) = token_type_of(design, name) {
            if tok_ty != expected {
                return Err(err(
                    "PDL-E040",
                    format!(
                        "Type mismatch {where_}: token `{name}` has type {tok_ty}, expected {expected}"
                    ),
                    design,
                ));
            }
            return Ok(());
        }
        if crate::samples::split_sample_path(name).is_some() {
            let field = crate::samples::lookup_sample_field(design, name)?;
            let got = unwrap_param_type_name(&field.type_name);
            if got != expected {
                return Err(err(
                    "PDL-E040",
                    format!(
                        "Type mismatch {where_}: sample `{name}` has type {got}, expected {expected}"
                    ),
                    design,
                ));
            }
            return Ok(());
        }
        return Err(err(
            "PDL-E007",
            format!("Unresolved identifier `{name}` {where_}"),
            design,
        ));
    }

    if let ValueExpr::SelfMember { name } = value {
        if let Some(caller_ty) = caller_params.get(name) {
            let got = unwrap_param_type_name(caller_ty);
            if got != expected {
                return Err(err(
                    "PDL-E040",
                    format!(
                        "Type mismatch {where_}: parameter `{name}` has type {got}, expected {expected}"
                    ),
                    design,
                ));
            }
            return Ok(());
        }
        return Err(err(
            "PDL-E007",
            format!("Unresolved identifier `self.{name}` {where_}"),
            design,
        ));
    }

    let mismatch = || {
        err(
            "PDL-E040",
            format!(
                "Type mismatch {where_}: got {}, expected {expected}",
                value_kind_label(value)
            ),
            design,
        )
    };

    if expected == "String" || expected == "FontFamily" {
        return if matches!(value, ValueExpr::String { .. }) {
            Ok(())
        } else {
            Err(mismatch())
        };
    }
    if is_bool_param_type(expected) {
        return match value {
            ValueExpr::Boolean { .. } => Ok(()),
            ValueExpr::DotEnum { value } if value == ".true" || value == ".false" => Ok(()),
            // Call-site / ForEach equality: `selected: currentFilter == .all`
            ValueExpr::Condition { expr } => {
                validate_condition_expr(design, expr, caller_params, where_)?;
                Ok(())
            }
            ValueExpr::Not { expr } => assert_param_value_compatible(
                design,
                expected,
                expr,
                caller_params,
                where_,
            ),
            _ => Err(mismatch()),
        };
    }
    if matches!(
        expected,
        "Number"
            | "Size"
            | "Weight"
            | "Duration"
            | "Opacity"
            | "Distance"
            | "Radius"
            | "LineHeight"
            | "LetterSpacing"
    ) {
        return if matches!(value, ValueExpr::Number { .. }) {
            Ok(())
        } else {
            Err(mismatch())
        };
    }
    if expected == "Ratio" {
        return if matches!(value, ValueExpr::Number { .. } | ValueExpr::Ratio { .. }) {
            Ok(())
        } else {
            Err(mismatch())
        };
    }
    if expected == "Color" {
        return match value {
            ValueExpr::Hex { .. } | ValueExpr::OpacityOf { .. } => Ok(()),
            ValueExpr::Call {
                callee: CallCallee::Color,
                ..
            } => Ok(()),
            _ => Err(mismatch()),
        };
    }
    if expected == "Icon" {
        return match value {
            ValueExpr::IconFile { .. }
            | ValueExpr::IconSystem { .. }
            | ValueExpr::String { .. } => Ok(()),
            _ => Err(mismatch()),
        };
    }
    if expected == "MediaSource" {
        return match value {
            ValueExpr::MediaSourceFile { .. }
            | ValueExpr::MediaSourceUrl { .. }
            | ValueExpr::String { .. } => Ok(()),
            _ => Err(mismatch()),
        };
    }
    if expected == "Shadow" {
        return if matches!(value, ValueExpr::Shadow { .. }) {
            Ok(())
        } else {
            Err(mismatch())
        };
    }
    if expected == "Sizing" {
        return match value {
            ValueExpr::Sizing { .. } | ValueExpr::Number { .. } => Ok(()),
            ValueExpr::DotEnum { value } => {
                let c = strip_dot(value);
                if c == "hug" || c == "fill" {
                    Ok(())
                } else {
                    Err(mismatch())
                }
            }
            _ => Err(mismatch()),
        };
    }
    if expected == "Ramp" {
        return match value {
            ValueExpr::Call {
                callee: CallCallee::Ramp,
                ..
            }
            | ValueExpr::RampInline { .. } => Ok(()),
            _ => Err(mismatch()),
        };
    }
    if expected == "Blur" {
        return match value {
            ValueExpr::Call {
                callee: CallCallee::Blur,
                args,
            } => assert_blur_call_compatible(design, args, where_),
            _ => Err(mismatch()),
        };
    }
    if expected == "Vibrancy" {
        return match value {
            ValueExpr::Call {
                callee: CallCallee::Vibrancy,
                args,
            } => assert_vibrancy_call_compatible(design, args, where_),
            ValueExpr::VibrancyTuple { .. } => Err(err(
                "PDL-E040",
                format!(
                    "Type mismatch {where_}: naked `(saturation:, brightness:)` is not a Vibrancy value; use `Vibrancy(saturation:, brightness:)`"
                ),
                design,
            )),
            _ => Err(mismatch()),
        };
    }
    if expected == "Media" {
        return match value {
            ValueExpr::Call {
                callee: CallCallee::MediaLayer,
                ..
            } => Ok(()),
            _ => Err(mismatch()),
        };
    }
    if expected == "EdgeInsets" {
        return if matches!(
            value,
            ValueExpr::EdgeInsets { .. } | ValueExpr::Number { .. }
        ) {
            Ok(())
        } else {
            Err(mismatch())
        };
    }
    if expected == "CornerRadii" {
        return if matches!(value, ValueExpr::Corner { .. }) {
            Ok(())
        } else {
            Err(mismatch())
        };
    }
    if expected == "GradientStop" {
        return if matches!(value, ValueExpr::GradientStop { .. }) {
            Ok(())
        } else {
            Err(mismatch())
        };
    }
    if expected == "Ease" {
        return match value {
            ValueExpr::DotEnum { .. } | ValueExpr::String { .. } => Ok(()),
            _ => Err(mismatch()),
        };
    }
    if expected == "Timing" {
        return if matches!(value, ValueExpr::Timing { .. }) {
            Ok(())
        } else {
            Err(mismatch())
        };
    }
    if expected == "Pose" {
        return if matches!(value, ValueExpr::Pose { .. }) {
            Ok(())
        } else {
            Err(mismatch())
        };
    }
    if expected == "Stagger" {
        return if matches!(value, ValueExpr::Stagger { .. }) {
            Ok(())
        } else {
            Err(mismatch())
        };
    }
    if expected == "Motion" {
        return if matches!(value, ValueExpr::Motion { .. }) {
            Ok(())
        } else {
            Err(mismatch())
        };
    }
    if expected == "Animation" {
        return if matches!(value, ValueExpr::Animation { .. }) {
            Ok(())
        } else {
            Err(mismatch())
        };
    }
    if expected == "Effect" {
        return match value {
            ValueExpr::Effect { .. } => assert_effect_value(design, value, where_),
            ValueExpr::Call {
                callee: CallCallee::Blur,
                args,
            } => assert_blur_call_compatible(design, args, where_),
            _ => Err(mismatch()),
        };
    }

    if is_host_enum_type(expected) {
        let cases = host_enum_cases(expected).unwrap();
        return match value {
            ValueExpr::DotEnum { value } => {
                let case_name = strip_dot(value);
                if cases.iter().any(|c| *c == case_name) {
                    Ok(())
                } else {
                    Err(err(
                        "PDL-E040",
                        format!(
                            "Type mismatch {where_}: unknown case `.{case_name}` for {expected} (expected one of: {})",
                            cases
                                .iter()
                                .map(|c| format!(".{c}"))
                                .collect::<Vec<_>>()
                                .join(", ")
                        ),
                        design,
                    ))
                }
            }
            _ => Err(mismatch()),
        };
    }

    if let Some(vdecl) = design.variants.get(expected) {
        return match value {
            ValueExpr::DotEnum { value } => {
                let case_name = strip_dot(value);
                if vdecl.cases.iter().any(|c| c == case_name) {
                    Ok(())
                } else {
                    Err(err(
                        "PDL-E040",
                        format!(
                            "Type mismatch {where_}: unknown case `.{case_name}` for variant {expected} (expected one of: {})",
                            vdecl
                                .cases
                                .iter()
                                .map(|c| format!(".{c}"))
                                .collect::<Vec<_>>()
                                .join(", ")
                        ),
                        design,
                    ))
                }
            }
            _ => Err(mismatch()),
        };
    }

    if design.components.contains_key(expected) {
        return match value {
            ValueExpr::Instance { component, .. } if component == expected => Ok(()),
            ValueExpr::Array { .. } => Ok(()),
            ValueExpr::Null => Ok(()),
            _ => Err(mismatch()),
        };
    }
    if design.protocols.contains_key(expected) {
        return match value {
            ValueExpr::Instance { component, .. }
                if component == expected
                    || crate::pack::component_satisfies_bound(design, component, expected) =>
            {
                Ok(())
            }
            ValueExpr::Array { .. } => Ok(()),
            ValueExpr::Null => Ok(()),
            _ => Err(mismatch()),
        };
    }

    // Array / structured slot defaults — light touch for v1.
    if matches!(
        value,
        ValueExpr::Instance { .. } | ValueExpr::Array { .. } | ValueExpr::Null
    ) {
        return Ok(());
    }

    Err(mismatch())
}

fn assert_instance_kwargs(
    design: &DesignDefinition,
    target: &ComponentDecl,
    kwargs: &IndexMap<String, ValueExpr>,
    caller_params: &HashMap<String, String>,
    where_: &str,
) -> Result<(), PdlError> {
    let params = effective_params(design, target)?;
    let pmap: HashMap<&str, &ComponentParam> =
        params.iter().map(|p| (p.name.as_str(), p)).collect();
    for (name, value) in kwargs {
        let Some(p) = pmap.get(name.as_str()) else {
            return Err(err(
                "PDL-E007",
                format!(
                    "Unknown parameter `{name}` {where_} (component {})",
                    target.name
                ),
                design,
            ));
        };
        assert_param_value_compatible(
            design,
            &p.type_name,
            value,
            caller_params,
            &format!("{where_} argument `{name}`"),
        )?;
    }
    Ok(())
}

fn walk_child_entries(
    design: &DesignDefinition,
    entries: &[ChildEntry],
    caller_params: &HashMap<String, String>,
    where_: &str,
) -> Result<(), PdlError> {
    for e in entries {
        match e {
            ChildEntry::Instance {
                component,
                kwargs,
                opacity: _,
            } => {
                let Some(target) = design.components.get(component) else {
                    return Err(err(
                        "PDL-E037",
                        format!("Unknown component `{component}` {where_}"),
                        design,
                    ));
                };
                assert_instance_kwargs(
                    design,
                    target,
                    kwargs,
                    caller_params,
                    &format!("in {where_} instance `{component}`"),
                )?;
            }
            ChildEntry::FrameCtor {
                props,
                child_entries,
                ..
            } => {
                for v in props.values() {
                    if let ValueExpr::Condition { expr } = v {
                        crate::conditions::validate_condition_expr(
                            design,
                            expr,
                            caller_params,
                            where_,
                        )?;
                    }
                }
                if let Some(cs) = child_entries {
                    walk_child_entries(design, cs, caller_params, where_)?;
                }
            }
            ChildEntry::Repeat {
                binder,
                body,
                count: _,
                begin: _,
            } => {
                if caller_params.contains_key(binder) {
                    return Err(err(
                        "PDL-E060",
                        format!(
                            "Repeat binder `{binder}` shadows enclosing parameter `{binder}` {where_}"
                        ),
                        design,
                    ));
                }
                let mut scoped = caller_params.clone();
                scoped.insert(binder.clone(), "Number".to_string());
                walk_repeat_body(design, body, &scoped, binder, where_)?;
            }
            _ => {}
        }
    }
    Ok(())
}

fn walk_repeat_body(
    design: &DesignDefinition,
    body: &[crate::ast::RepeatBodyItem],
    caller_params: &HashMap<String, String>,
    binder: &str,
    where_: &str,
) -> Result<(), PdlError> {
    use crate::ast::RepeatBodyItem;
    for item in body {
        match item {
            RepeatBodyItem::Entry(entry) => {
                walk_child_entries(design, std::slice::from_ref(entry), caller_params, where_)?;
            }
            RepeatBodyItem::If {
                branches,
                else_body,
            } => {
                for br in branches {
                    crate::conditions::validate_condition_expr(
                        design,
                        &br.condition,
                        caller_params,
                        where_,
                    )?;
                    walk_repeat_body(design, &br.body, caller_params, binder, where_)?;
                }
                if let Some(else_body) = else_body {
                    walk_repeat_body(design, else_body, caller_params, binder, where_)?;
                }
            }
        }
    }
    Ok(())
}

pub fn validate_param_bindings_in_body(
    design: &DesignDefinition,
    items: &[FrameBodyItem],
    caller_params: &HashMap<String, String>,
    component_name: &str,
) -> Result<(), PdlError> {
    for item in items {
        match item {
            FrameBodyItem::LetInstance {
                id,
                component,
                kwargs,
            } => {
                let Some(target) = design.components.get(component) else {
                    return Err(err(
                        "PDL-E037",
                        format!(
                            "Unknown component `{component}` in `let {id}` (component {component_name})"
                        ),
                        design,
                    ));
                };
                assert_instance_kwargs(
                    design,
                    target,
                    kwargs,
                    caller_params,
                    &format!("in `let {id} = {component}(…)` (component {component_name})"),
                )?;
            }
            FrameBodyItem::Children { entries, .. } => {
                walk_child_entries(
                    design,
                    entries,
                    caller_params,
                    &format!("children of {component_name}"),
                )?;
            }
            FrameBodyItem::LetRepeat {
                id,
                binder,
                body,
                count: _,
                begin: _,
            } => {
                if caller_params.contains_key(binder) {
                    return Err(err(
                        "PDL-E060",
                        format!(
                            "Repeat binder `{binder}` shadows enclosing parameter `{binder}` \
                             in `let {id}` (component {component_name})"
                        ),
                        design,
                    ));
                }
                let mut scoped = caller_params.clone();
                scoped.insert(binder.clone(), "Number".to_string());
                walk_repeat_body(
                    design,
                    body,
                    &scoped,
                    binder,
                    &format!("in `let {id} = Repeat(…)` (component {component_name})"),
                )?;
            }
            FrameBodyItem::Let { body, .. } => {
                validate_param_bindings_in_body(design, body, caller_params, component_name)?;
            }
            FrameBodyItem::If { chain } => {
                for br in &chain.branches {
                    validate_param_bindings_in_body(
                        design,
                        &br.body,
                        caller_params,
                        component_name,
                    )?;
                }
                if let Some(else_body) = &chain.else_body {
                    validate_param_bindings_in_body(
                        design,
                        else_body,
                        caller_params,
                        component_name,
                    )?;
                }
            }
            _ => {}
        }
    }
    Ok(())
}

pub fn validate_component_param_defaults(design: &DesignDefinition) -> Result<(), PdlError> {
    for c in design.components.values() {
        let params = effective_params(design, c)?;
        let caller: HashMap<String, String> = params
            .iter()
            .map(|p| (p.name.clone(), p.type_name.clone()))
            .collect();
        for p in &params {
            assert_param_value_compatible(
                design,
                &p.type_name,
                &p.default_value,
                &caller,
                &format!("for default of `{}.{}`", c.name, p.name),
            )?;
            if let Some(bounds) = crate::number_bounds::effective_number_bounds(design, p) {
                if let ValueExpr::Number { value } = &p.default_value {
                    crate::number_bounds::assert_number_in_bounds(
                        design,
                        &bounds,
                        *value,
                        &format!("default of `{}.{}`", c.name, p.name),
                    )?;
                }
            }
        }
    }
    Ok(())
}
