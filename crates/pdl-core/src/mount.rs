//! Evaluate a `host` profile’s `mount` body against an opaque facts bag.
//!
//! Runs **once per bake**. Soft probes (`as?`) miss to none; `??` takes the next
//! arm. The resulting param map is what `<Host>` injection reads (H2 overlay).

use std::collections::HashSet;

use serde_json::{Map, Value};

use crate::ast::*;
use crate::design::{resolve_active_host, DesignDefinition};
use crate::error::PdlError;
use crate::evaluate::{
    apply_token_overrides, evaluate_value, Eval, ParamMeta, ParamTypeMeta, ParamValues, Tokens,
};
use crate::stable_json::number_value;

/// Defaults, then `mount` against `facts` (`None` / `{}` ≡ no keys).
pub fn resolve_host_environment(
    design: &DesignDefinition,
    tokens: &mut Tokens,
    requested: Option<&str>,
    facts: Option<&Map<String, Value>>,
) -> Result<Option<Map<String, Value>>, PdlError> {
    let Some(profile) = resolve_active_host(design, requested)? else {
        return Ok(None);
    };
    let mut bag = Map::new();
    for p in &profile.params {
        bag.insert(p.name.clone(), eval_host_param_default(design, tokens, p)?);
    }
    if let Some(items) = &profile.mount {
        let empty = Map::new();
        let facts = facts.unwrap_or(&empty);
        let mut locals = Map::new();
        let mut local_meta = ParamMeta::new();
        eval_mount_items(
            design,
            tokens,
            profile,
            items,
            facts,
            &mut bag,
            &mut locals,
            &mut local_meta,
        )?;
    }
    // Facts keys that match a host param pin the bag after `mount` (Playground chrome).
    if let Some(facts) = facts {
        for p in &profile.params {
            if let Some(v) = facts.get(&p.name) {
                bag.insert(p.name.clone(), coerce_host_param_override(design, p, v)?);
            }
        }
    }
    Ok(Some(bag))
}

fn coerce_host_param_override(
    design: &DesignDefinition,
    p: &ComponentParam,
    v: &Value,
) -> Result<Value, PdlError> {
    if !p.is_array {
        if let Some(var) = design.variants.get(&p.type_name) {
            let raw = match v {
                Value::String(s) => s.trim().trim_start_matches('.').to_string(),
                _ => {
                    return Err(PdlError::new(
                        "PDL-E005",
                        format!(
                            "Host override `{0}` must be a {1} case",
                            p.name, p.type_name
                        ),
                        Some(design.entry_path.clone()),
                        None,
                        None,
                    ));
                }
            };
            if !var.cases.iter().any(|c| c == &raw) {
                return Err(PdlError::new(
                    "PDL-E005",
                    format!(
                        "Unknown {0} case `{raw}` for host param `{1}`",
                        p.type_name, p.name
                    ),
                    Some(design.entry_path.clone()),
                    None,
                    None,
                ));
            }
            return Ok(Value::String(raw));
        }
    }
    Ok(v.clone())
}

fn eval_host_param_default(
    design: &DesignDefinition,
    tokens: &mut Tokens,
    p: &ComponentParam,
) -> Result<Value, PdlError> {
    if !p.is_array && design.variants.contains_key(&p.type_name) {
        return match &p.default_value {
            ValueExpr::DotEnum { value } => Ok(Value::String(strip_dot(value).to_string())),
            _ => Err(PdlError::new(
                "PDL-E010",
                format!("Variant default must be dot-enum for {}", p.name),
                None,
                None,
                None,
            )),
        };
    }
    let empty_pv: ParamValues = Map::new();
    let empty_pm: ParamMeta = indexmap::IndexMap::new();
    let mut visiting = HashSet::new();
    let mut ev = Eval {
        design,
        tokens,
        visiting: &mut visiting,
        param_values: Some(&empty_pv),
        param_meta: Some(&empty_pm),
        use_string_placeholders: false,
    };
    evaluate_value(&p.default_value, &mut ev)
}

fn eval_mount_items(
    design: &DesignDefinition,
    tokens: &mut Tokens,
    profile: &HostDecl,
    items: &[MountItem],
    facts: &Map<String, Value>,
    bag: &mut Map<String, Value>,
    locals: &mut Map<String, Value>,
    local_meta: &mut ParamMeta,
) -> Result<(), PdlError> {
    for item in items {
        match item {
            MountItem::Let {
                name,
                type_name,
                value,
            } => {
                let v = eval_mount_expr_required(
                    design,
                    tokens,
                    profile,
                    value,
                    facts,
                    bag,
                    locals,
                    local_meta,
                    &format!("let `{name}`"),
                )?;
                locals.insert(name.clone(), v);
                local_meta.insert(
                    name.clone(),
                    ParamTypeMeta {
                        type_name: type_name.clone(),
                        is_array: false,
                    },
                );
            }
            MountItem::Assign { param, value } => {
                if !profile.params.iter().any(|p| p.name == *param) {
                    return Err(PdlError::new(
                        "PDL-E007",
                        format!("Unknown host param `{param}` in `self.{param} =`"),
                        Some(design.entry_path.clone()),
                        None,
                        None,
                    ));
                }
                let v = eval_mount_expr_required(
                    design,
                    tokens,
                    profile,
                    value,
                    facts,
                    bag,
                    locals,
                    local_meta,
                    &format!("self.{param}"),
                )?;
                bag.insert(param.clone(), v);
            }
            MountItem::UseCatalog { name } => {
                apply_use_catalog(design, tokens, name)?;
            }
            MountItem::TokenAssign { name, value } => {
                if !design.primitives.contains_key(name) && !design.semantics.contains_key(name) {
                    return Err(PdlError::new(
                        "PDL-E007",
                        format!("Unknown token `{name}` in `mount` assign"),
                        Some(design.entry_path.clone()),
                        None,
                        None,
                    ));
                }
                let v = eval_mount_expr_required(
                    design,
                    tokens,
                    profile,
                    value,
                    facts,
                    bag,
                    locals,
                    local_meta,
                    &format!("token `{name}`"),
                )?;
                tokens.insert(name.clone(), v);
            }
            MountItem::If { chain } => {
                let taken = pick_mount_if(
                    design, tokens, profile, chain, facts, bag, locals, local_meta,
                )?;
                eval_mount_items(
                    design, tokens, profile, taken, facts, bag, locals, local_meta,
                )?;
            }
        }
    }
    Ok(())
}

fn apply_use_catalog(
    design: &DesignDefinition,
    tokens: &mut Tokens,
    name: &str,
) -> Result<(), PdlError> {
    if design.themes.contains_key(name) {
        return Err(PdlError::new(
            "PDL-E049",
            format!("`{name}` is a theme, not a catalog; pass it to `--theme`"),
            Some(design.entry_path.clone()),
            None,
            None,
        ));
    }
    let Some(cat) = design.catalogs.get(name) else {
        return Err(PdlError::new(
            "PDL-E007",
            format!("Unknown catalog `{name}`"),
            Some(design.entry_path.clone()),
            None,
            None,
        ));
    };
    let overrides = cat.overrides.clone();
    let mut visiting = HashSet::new();
    apply_token_overrides(design, tokens, &mut visiting, &overrides)
}

fn pick_mount_if<'a>(
    design: &DesignDefinition,
    tokens: &mut Tokens,
    profile: &HostDecl,
    chain: &'a MountIfChain,
    facts: &Map<String, Value>,
    bag: &Map<String, Value>,
    locals: &Map<String, Value>,
    local_meta: &ParamMeta,
) -> Result<&'a [MountItem], PdlError> {
    if eval_mount_cond(
        design,
        tokens,
        profile,
        &chain.condition,
        facts,
        bag,
        locals,
        local_meta,
    )? {
        return Ok(&chain.then_items);
    }
    for (cond, body) in &chain.else_if {
        if eval_mount_cond(
            design, tokens, profile, cond, facts, bag, locals, local_meta,
        )? {
            return Ok(body);
        }
    }
    Ok(chain.else_items.as_deref().unwrap_or(&[]))
}

fn eval_mount_expr_required(
    design: &DesignDefinition,
    tokens: &mut Tokens,
    profile: &HostDecl,
    expr: &MountExpr,
    facts: &Map<String, Value>,
    bag: &Map<String, Value>,
    locals: &Map<String, Value>,
    local_meta: &ParamMeta,
    where_: &str,
) -> Result<Value, PdlError> {
    match eval_mount_expr(
        design, tokens, profile, expr, facts, bag, locals, local_meta,
    )? {
        Some(v) => Ok(v),
        None => Err(PdlError::new(
            "PDL-E048",
            format!("{where_} coalesce produced no value; add a literal fallback"),
            Some(design.entry_path.clone()),
            None,
            None,
        )),
    }
}

fn eval_mount_expr(
    design: &DesignDefinition,
    tokens: &mut Tokens,
    profile: &HostDecl,
    expr: &MountExpr,
    facts: &Map<String, Value>,
    bag: &Map<String, Value>,
    locals: &Map<String, Value>,
    local_meta: &ParamMeta,
) -> Result<Option<Value>, PdlError> {
    match expr {
        MountExpr::HostProbe {
            key,
            type_name,
            soft,
        } => match facts.get(key) {
            None if *soft => Ok(None),
            None => Err(strict_probe_err(design, key, type_name, "missing")),
            Some(raw) => match convert_fact(design, raw, type_name) {
                Some(v) => Ok(Some(v)),
                None if *soft => Ok(None),
                None => Err(strict_probe_err(design, key, type_name, "wrong type")),
            },
        },
        MountExpr::Coalesce { arms } => {
            for arm in arms {
                if let Some(v) =
                    eval_mount_expr(design, tokens, profile, arm, facts, bag, locals, local_meta)?
                {
                    return Ok(Some(v));
                }
            }
            Ok(None)
        }
        MountExpr::Value(v) => Ok(Some(eval_mount_value(
            design, tokens, profile, v, bag, locals, local_meta,
        )?)),
    }
}

fn strict_probe_err(design: &DesignDefinition, key: &str, type_name: &str, why: &str) -> PdlError {
    PdlError::new(
        "PDL-E048",
        format!("`host[\"{key}\"] as {type_name}` failed ({why})"),
        Some(design.entry_path.clone()),
        None,
        None,
    )
}

fn convert_fact(design: &DesignDefinition, raw: &Value, type_name: &str) -> Option<Value> {
    if design.variants.contains_key(type_name) {
        let s = match raw {
            Value::String(s) => strip_dot(s).to_string(),
            _ => return None,
        };
        let cases = &design.variants.get(type_name)?.cases;
        if cases.iter().any(|c| c == &s) {
            return Some(Value::String(s));
        }
        return None;
    }
    match type_name {
        "Distance" | "Number" | "Radius" | "Size" | "Weight" | "Duration" | "Opacity" | "Ratio"
        | "LineHeight" | "LetterSpacing" => match raw {
            Value::Number(n) => n.as_f64().map(number_value),
            _ => None,
        },
        "String" | "Color" | "Icon" | "FontFamily" | "MediaSource" => match raw {
            Value::String(s) => Some(Value::String(s.clone())),
            _ => None,
        },
        "Bool" | "Boolean" => match raw {
            Value::Bool(b) => Some(Value::Bool(*b)),
            _ => None,
        },
        _ => None,
    }
}

fn eval_mount_value(
    design: &DesignDefinition,
    tokens: &mut Tokens,
    profile: &HostDecl,
    expr: &ValueExpr,
    bag: &Map<String, Value>,
    locals: &Map<String, Value>,
    local_meta: &ParamMeta,
) -> Result<Value, PdlError> {
    let mut scope = bag.clone();
    for (k, v) in locals {
        scope.insert(k.clone(), v.clone());
    }
    let mut meta = host_param_meta(profile);
    for (k, t) in local_meta {
        meta.insert(k.clone(), t.clone());
    }
    let mut visiting = HashSet::new();
    let mut ev = Eval {
        design,
        tokens,
        visiting: &mut visiting,
        param_values: Some(&scope),
        param_meta: Some(&meta),
        use_string_placeholders: false,
    };
    evaluate_value(expr, &mut ev)
}

fn host_param_meta(profile: &HostDecl) -> ParamMeta {
    let mut m = ParamMeta::new();
    for p in &profile.params {
        m.insert(
            p.name.clone(),
            ParamTypeMeta {
                type_name: p.type_name.clone(),
                is_array: p.is_array,
            },
        );
    }
    m
}

fn eval_mount_cond(
    design: &DesignDefinition,
    tokens: &mut Tokens,
    profile: &HostDecl,
    cond: &MountCondition,
    facts: &Map<String, Value>,
    bag: &Map<String, Value>,
    locals: &Map<String, Value>,
    local_meta: &ParamMeta,
) -> Result<bool, PdlError> {
    match cond {
        MountCondition::And { items } => {
            for item in items {
                if !eval_mount_cond(
                    design, tokens, profile, item, facts, bag, locals, local_meta,
                )? {
                    return Ok(false);
                }
            }
            Ok(true)
        }
        MountCondition::Or { items } => {
            for item in items {
                if eval_mount_cond(
                    design, tokens, profile, item, facts, bag, locals, local_meta,
                )? {
                    return Ok(true);
                }
            }
            Ok(false)
        }
        MountCondition::Truthy { expr } => {
            let v = eval_mount_expr(
                design, tokens, profile, expr, facts, bag, locals, local_meta,
            )?;
            Ok(is_truthy(v.as_ref()))
        }
        MountCondition::Cmp { left, op, right } => {
            let l = eval_mount_expr(
                design, tokens, profile, left, facts, bag, locals, local_meta,
            )?;
            let r = eval_mount_expr(
                design, tokens, profile, right, facts, bag, locals, local_meta,
            )?;
            Ok(compare_mount(l.as_ref(), *op, r.as_ref()))
        }
    }
}

fn is_truthy(v: Option<&Value>) -> bool {
    match v {
        Some(Value::Bool(b)) => *b,
        Some(Value::Number(n)) => n.as_f64().is_some_and(|x| x != 0.0),
        Some(Value::String(s)) => !s.is_empty() && s != "false" && s != "0",
        Some(Value::Null) | None => false,
        Some(_) => true,
    }
}

fn compare_mount(left: Option<&Value>, op: MountCmpOp, right: Option<&Value>) -> bool {
    let (Some(l), Some(r)) = (left, right) else {
        return false;
    };
    if matches!(
        op,
        MountCmpOp::Lt | MountCmpOp::Le | MountCmpOp::Gt | MountCmpOp::Ge
    ) {
        let (Some(a), Some(b)) = (as_f64(l), as_f64(r)) else {
            return false;
        };
        return match op {
            MountCmpOp::Lt => a < b,
            MountCmpOp::Le => a <= b,
            MountCmpOp::Gt => a > b,
            MountCmpOp::Ge => a >= b,
            _ => false,
        };
    }
    let eq = values_eq(l, r);
    match op {
        MountCmpOp::Eq => eq,
        MountCmpOp::Ne => !eq,
        _ => false,
    }
}

fn as_f64(v: &Value) -> Option<f64> {
    match v {
        Value::Number(n) => n.as_f64(),
        Value::String(s) => s.parse().ok(),
        _ => None,
    }
}

fn values_eq(l: &Value, r: &Value) -> bool {
    if let (Some(a), Some(b)) = (as_f64(l), as_f64(r)) {
        return a == b;
    }
    match (l, r) {
        (Value::Bool(a), Value::Bool(b)) => a == b,
        (Value::String(a), Value::String(b)) => strip_dot(a) == strip_dot(b),
        (Value::String(a), other) => strip_dot(a) == js_loose(other),
        (other, Value::String(b)) => js_loose(other) == strip_dot(b),
        _ => l == r,
    }
}

fn js_loose(v: &Value) -> String {
    match v {
        Value::String(s) => strip_dot(s).to_string(),
        Value::Bool(b) => b.to_string(),
        Value::Number(n) => n.to_string(),
        Value::Null => "null".to_string(),
        other => other.to_string(),
    }
}

fn strip_dot(s: &str) -> &str {
    s.strip_prefix('.').unwrap_or(s)
}
