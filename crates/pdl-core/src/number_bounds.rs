//! Number param bounds + Repeat ceilings (`docs/PROPOSAL_REPEAT_NUMBER_BOUNDS.md`).

use serde_json::Value;

use crate::ast::{ComponentParam, NumberBounds};
use crate::design::DesignDefinition;
use crate::error::PdlError;
use crate::param_types::unwrap_param_type_name;

/// Hard cap on a single `Repeat(count:)` (proposal Q2).
pub const REPEAT_COUNT_CEILING: u32 = 32;
/// Hard cap on the product of nested `Repeat` counts in one expansion (proposal Q3).
pub const REPEAT_PRODUCT_CEILING: u32 = 64;

pub fn is_number_like_type(design: &DesignDefinition, type_name: &str) -> bool {
    let name = unwrap_param_type_name(type_name);
    if name == "Number"
        || name == "Size"
        || name == "Weight"
        || name == "Duration"
        || name == "Opacity"
        || name == "Distance"
        || name == "Radius"
        || name == "LineHeight"
        || name == "LetterSpacing"
    {
        return true;
    }
    design
        .type_aliases
        .get(name)
        .map(|a| a.base == "Number")
        .unwrap_or(false)
}

/// Resolve declared type name through `type Alias = Number(…)`.
pub fn resolve_param_type_name(design: &DesignDefinition, type_name: &str) -> String {
    let name = unwrap_param_type_name(type_name);
    if let Some(alias) = design.type_aliases.get(name) {
        return alias.base.clone();
    }
    name.to_string()
}

pub fn effective_number_bounds(
    design: &DesignDefinition,
    param: &ComponentParam,
) -> Option<NumberBounds> {
    if let Some(b) = &param.number_bounds {
        return Some(b.clone());
    }
    design
        .type_aliases
        .get(unwrap_param_type_name(&param.type_name))
        .and_then(|a| a.number_bounds.clone())
}

pub fn value_as_f64(v: &Value) -> Option<f64> {
    match v {
        Value::Number(n) => n.as_f64(),
        Value::String(s) => s.parse().ok(),
        _ => None,
    }
}

pub fn assert_number_in_bounds(
    design: &DesignDefinition,
    bounds: &NumberBounds,
    value: f64,
    where_: &str,
) -> Result<(), PdlError> {
    if let Some(min) = bounds.min {
        if value < min {
            return Err(PdlError::new(
                "PDL-E057",
                format!("{where_}: value {value} is below min {min}"),
                Some(design.entry_path.clone()),
                None,
                None,
            ));
        }
    }
    if let Some(max) = bounds.max {
        if value > max {
            return Err(PdlError::new(
                "PDL-E057",
                format!("{where_}: value {value} is above max {max}"),
                Some(design.entry_path.clone()),
                None,
                None,
            ));
        }
    }
    Ok(())
}

pub fn assert_repeat_count(design: &DesignDefinition, count: f64, where_: &str) -> Result<u32, PdlError> {
    if !count.is_finite() {
        return Err(PdlError::new(
            "PDL-E058",
            format!("{where_}: Repeat count must be a finite number"),
            Some(design.entry_path.clone()),
            None,
            None,
        ));
    }
    if count.fract() != 0.0 {
        return Err(PdlError::new(
            "PDL-E058",
            format!("{where_}: Repeat count must be an integer (got {count})"),
            Some(design.entry_path.clone()),
            None,
            None,
        ));
    }
    if count < 1.0 {
        return Err(PdlError::new(
            "PDL-E058",
            format!("{where_}: Repeat count must be ≥ 1 (got {count})"),
            Some(design.entry_path.clone()),
            None,
            None,
        ));
    }
    if count > f64::from(REPEAT_COUNT_CEILING) {
        return Err(PdlError::new(
            "PDL-E058",
            format!(
                "{where_}: Repeat count {count} exceeds language ceiling {REPEAT_COUNT_CEILING}"
            ),
            Some(design.entry_path.clone()),
            None,
            None,
        ));
    }
    Ok(count as u32)
}
