//! Variant / Bool condition validation shared by `if`, `hidden`, and Bool kwargs.

use std::collections::HashMap;

use crate::ast::ConditionExpr;
use crate::design::DesignDefinition;
use crate::error::PdlError;
use crate::param_types::is_bool_param_type;

fn err(code: &str, message: String, design: &DesignDefinition) -> PdlError {
    PdlError::new(code, message, Some(design.entry_path.clone()), None, None)
}

fn strip_leading_dot(s: &str) -> &str {
    s.strip_prefix('.').unwrap_or(s)
}

/// Validate a condition against enclosing component parameter types.
pub fn validate_condition_expr(
    design: &DesignDefinition,
    expr: &ConditionExpr,
    param_by_name: &HashMap<String, String>,
    component_name: &str,
) -> Result<(), PdlError> {
    match expr {
        ConditionExpr::And { items } | ConditionExpr::Or { items } => {
            for sub in items {
                validate_condition_expr(design, sub, param_by_name, component_name)?;
            }
            Ok(())
        }
        ConditionExpr::Not { expr } => {
            validate_condition_expr(design, expr, param_by_name, component_name)
        }
        ConditionExpr::Truthy { param } => {
            let type_name = param_by_name.get(param).ok_or_else(|| {
                err(
                    "PDL-E007",
                    format!(
                        "Unknown parameter `{}` in `if` condition (component {})",
                        param, component_name
                    ),
                    design,
                )
            })?;
            if !is_bool_param_type(type_name) {
                return Err(err(
                    "PDL-E010",
                    format!(
                        "Bare `if {}` requires a Bool parameter (got type {}); use `{} == …` for variants",
                        param, type_name, param
                    ),
                    design,
                ));
            }
            Ok(())
        }
        ConditionExpr::Cmp {
            param,
            rhs,
            rhs_is_param,
            ..
        } => {
            let type_name = param_by_name.get(param).ok_or_else(|| {
                err(
                    "PDL-E007",
                    format!(
                        "Unknown parameter `{}` in `if` condition (component {})",
                        param, component_name
                    ),
                    design,
                )
            })?;
            // Bool compare: `selected == true` / `selected == .true`
            if is_bool_param_type(type_name) {
                if *rhs_is_param {
                    let rhs_ty = param_by_name.get(rhs).ok_or_else(|| {
                        err(
                            "PDL-E007",
                            format!(
                                "Unknown parameter `{}` on RHS of condition (component {})",
                                rhs, component_name
                            ),
                            design,
                        )
                    })?;
                    if rhs_ty != type_name {
                        return Err(err(
                            "PDL-E010",
                            format!(
                                "Condition compares incompatible parameter types `{}` ({}) and `{}` ({})",
                                param, type_name, rhs, rhs_ty
                            ),
                            design,
                        ));
                    }
                    return Ok(());
                }
                let rhs_stripped = strip_leading_dot(rhs);
                if rhs_stripped == "true" || rhs_stripped == "false" {
                    return Ok(());
                }
                return Err(err(
                    "PDL-E010",
                    format!(
                        "Bool condition on `{}` expected `true` / `false` (or `.true` / `.false`)",
                        param
                    ),
                    design,
                ));
            }
            let vdecl = design.variants.get(type_name).ok_or_else(|| {
                err(
                    "PDL-E010",
                    format!(
                        "Condition compares non-variant parameter `{}` (type {}); `if` conditions must use a variant-typed parameter",
                        param, type_name
                    ),
                    design,
                )
            })?;
            if *rhs_is_param {
                let rhs_ty = param_by_name.get(rhs).ok_or_else(|| {
                    err(
                        "PDL-E007",
                        format!(
                            "Unknown parameter `{}` on RHS of condition (component {})",
                            rhs, component_name
                        ),
                        design,
                    )
                })?;
                if rhs_ty != type_name {
                    return Err(err(
                        "PDL-E010",
                        format!(
                            "Condition compares incompatible parameter types `{}` ({}) and `{}` ({})",
                            param, type_name, rhs, rhs_ty
                        ),
                        design,
                    ));
                }
                return Ok(());
            }
            let rhs_stripped = strip_leading_dot(rhs);
            if !vdecl.cases.iter().any(|c| c == rhs_stripped) {
                let expected = vdecl
                    .cases
                    .iter()
                    .map(|c| format!(".{}", c))
                    .collect::<Vec<_>>()
                    .join(", ");
                return Err(err(
                    "PDL-E010",
                    format!(
                        "Unknown variant case `.{}` for parameter `{}` (variant {}); expected one of: {}",
                        rhs_stripped, param, vdecl.name, expected
                    ),
                    design,
                ));
            }
            Ok(())
        }
    }
}
