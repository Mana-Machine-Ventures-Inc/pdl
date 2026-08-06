//! Semantic validation of a merged design.
//!
//! Rust port of `src/validateDesign.ts`.

use std::collections::HashMap;
use std::collections::HashSet;

use crate::ast::*;
use crate::design::{effective_params, DesignDefinition};
use crate::error::PdlError;

fn root_kind_str(k: RootKind) -> &'static str {
    match k {
        RootKind::Layout => "layout",
        RootKind::Text => "text",
        RootKind::Icon => "icon",
        RootKind::Media => "media",
    }
}

fn strip_leading_dot(s: &str) -> &str {
    s.strip_prefix('.').unwrap_or(s)
}

fn err(code: &str, message: String, design: &DesignDefinition) -> PdlError {
    PdlError::new(code, message, Some(design.entry_path.clone()), None, None)
}

fn validate_condition_expr(
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
        ConditionExpr::Cmp { param, rhs, .. } => {
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

fn collect_let_frame_kinds(items: &[FrameBodyItem]) -> HashMap<String, String> {
    let mut m = HashMap::new();
    fn walk(body: &[FrameBodyItem], m: &mut HashMap<String, String>) {
        for it in body {
            match it {
                FrameBodyItem::Let {
                    id,
                    frame_kind,
                    body,
                } => {
                    m.insert(id.clone(), frame_kind.clone());
                    walk(body, m);
                }
                FrameBodyItem::If { chain } => {
                    for br in &chain.branches {
                        walk(&br.body, m);
                    }
                    if let Some(else_body) = &chain.else_body {
                        walk(else_body, m);
                    }
                }
                _ => {}
            }
        }
    }
    walk(items, &mut m);
    m
}

fn assert_valid_hidden_rhs(
    value: &ValueExpr,
    component_name: &str,
    design: &DesignDefinition,
) -> Result<(), PdlError> {
    match value {
        ValueExpr::Boolean { .. } | ValueExpr::Condition { .. } => return Ok(()),
        ValueExpr::DotEnum { value } => {
            let raw = strip_leading_dot(value);
            if raw == "true" || raw == "false" {
                return Ok(());
            }
        }
        _ => {}
    }
    Err(err(
        "PDL-E012",
        format!(
            "`hidden` on component {} must be true, false, .true, .false, or a variant condition (like `mode == .case`)",
            component_name
        ),
        design,
    ))
}

fn validate_hidden_in_body(
    design: &DesignDefinition,
    items: &[FrameBodyItem],
    param_by_name: &HashMap<String, String>,
    component_name: &str,
    current_frame_kind: &str,
    let_kinds: &HashMap<String, String>,
) -> Result<(), PdlError> {
    for item in items {
        match item {
            FrameBodyItem::Prop { name, value } if name == "hidden" => {
                if current_frame_kind != "layout" {
                    return Err(err(
                        "PDL-E012",
                        format!(
                            "`hidden` is only valid on `layout` frames (component {}, current frame kind `{}`)",
                            component_name, current_frame_kind
                        ),
                        design,
                    ));
                }
                assert_valid_hidden_rhs(value, component_name, design)?;
                if let ValueExpr::Condition { expr } = value {
                    validate_condition_expr(design, expr, param_by_name, component_name)?;
                }
            }
            FrameBodyItem::FrameProp { frame, name, value } if name == "hidden" => {
                let fk = let_kinds.get(frame).ok_or_else(|| {
                    err(
                        "PDL-E012",
                        format!(
                            "Unknown frame `{}` in `{}.hidden` (component {})",
                            frame, frame, component_name
                        ),
                        design,
                    )
                })?;
                if fk != "layout" {
                    return Err(err(
                        "PDL-E012",
                        format!(
                            "`hidden` is only valid on `layout` frames; `{}` is `{}` (component {})",
                            frame, fk, component_name
                        ),
                        design,
                    ));
                }
                assert_valid_hidden_rhs(value, component_name, design)?;
                if let ValueExpr::Condition { expr } = value {
                    validate_condition_expr(design, expr, param_by_name, component_name)?;
                }
            }
            _ => {}
        }
        match item {
            FrameBodyItem::Let {
                frame_kind, body, ..
            } => {
                validate_hidden_in_body(
                    design,
                    body,
                    param_by_name,
                    component_name,
                    frame_kind,
                    let_kinds,
                )?;
            }
            FrameBodyItem::If { chain } => {
                for br in &chain.branches {
                    validate_hidden_in_body(
                        design,
                        &br.body,
                        param_by_name,
                        component_name,
                        current_frame_kind,
                        let_kinds,
                    )?;
                }
                if let Some(else_body) = &chain.else_body {
                    validate_hidden_in_body(
                        design,
                        else_body,
                        param_by_name,
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

fn validate_if_conditions_in_body(
    design: &DesignDefinition,
    items: &[FrameBodyItem],
    param_by_name: &HashMap<String, String>,
    component_name: &str,
) -> Result<(), PdlError> {
    for item in items {
        match item {
            FrameBodyItem::If { chain } => {
                for br in &chain.branches {
                    validate_condition_expr(design, &br.condition, param_by_name, component_name)?;
                    validate_if_conditions_in_body(
                        design,
                        &br.body,
                        param_by_name,
                        component_name,
                    )?;
                }
                if let Some(else_body) = &chain.else_body {
                    validate_if_conditions_in_body(
                        design,
                        else_body,
                        param_by_name,
                        component_name,
                    )?;
                }
            }
            FrameBodyItem::Let { body, .. } => {
                validate_if_conditions_in_body(design, body, param_by_name, component_name)?;
            }
            _ => {}
        }
    }
    Ok(())
}

fn collect_unique_frame_ids_from_body(
    items: &[FrameBodyItem],
    seen: &mut HashSet<String>,
    component_name: &str,
    design: &DesignDefinition,
) -> Result<(), PdlError> {
    let dup = |id: &str| {
        err(
            "PDL-E021",
            format!(
                "Duplicate frame id `{}` in component {} (`let` / `letInstance` names must be unique across the whole component body, including all `if` branches)",
                id, component_name
            ),
            design,
        )
    };
    for it in items {
        match it {
            FrameBodyItem::Let { id, body, .. } => {
                if seen.contains(id) {
                    return Err(dup(id));
                }
                seen.insert(id.clone());
                collect_unique_frame_ids_from_body(body, seen, component_name, design)?;
            }
            FrameBodyItem::LetInstance { id, .. } => {
                if seen.contains(id) {
                    return Err(dup(id));
                }
                seen.insert(id.clone());
            }
            FrameBodyItem::If { chain } => {
                for br in &chain.branches {
                    collect_unique_frame_ids_from_body(&br.body, seen, component_name, design)?;
                }
                if let Some(else_body) = &chain.else_body {
                    collect_unique_frame_ids_from_body(else_body, seen, component_name, design)?;
                }
            }
            _ => {}
        }
    }
    Ok(())
}

fn validate_companion_symbols(design: &DesignDefinition) -> Result<(), PdlError> {
    let check = |names: Vec<&String>, what: &str| -> Result<(), PdlError> {
        for name in names {
            if !design.components.contains_key(name) {
                return Err(err(
                    "PDL-E006",
                    format!("{} unknown component `{}`", what, name),
                    design,
                ));
            }
        }
        Ok(())
    };
    check(design.usage.keys().collect(), "usage references")?;
    check(design.fixtures.keys().collect(), "fixtures references")?;
    check(design.rules.keys().collect(), "rules references")?;
    check(design.interactions.keys().collect(), "interaction targets")?;
    Ok(())
}

fn validate_fixtures_for_component(
    design: &DesignDefinition,
    component_name: &str,
) -> Result<(), PdlError> {
    let Some(c) = design.components.get(component_name) else {
        return Ok(());
    };
    let pmap: HashSet<String> = effective_params(design, c)?
        .into_iter()
        .map(|p| p.name)
        .collect();
    let Some(fm) = design.fixtures.get(component_name) else {
        return Ok(());
    };
    for ex in fm.values() {
        for b in &ex.bindings {
            if !pmap.contains(&b.name) {
                return Err(err(
                    "PDL-E007",
                    format!(
                        "Unknown parameter `{}` in fixture \"{}\" (component {})",
                        b.name, ex.label, component_name
                    ),
                    design,
                ));
            }
        }
    }
    Ok(())
}

fn validate_interaction_body(
    design: &DesignDefinition,
    items: &[InteractionHandlerItem],
    param_by_name: &HashMap<String, String>,
    component_name: &str,
) -> Result<(), PdlError> {
    for it in items {
        match it {
            InteractionHandlerItem::Assign { param, .. } => {
                if !param_by_name.contains_key(param) {
                    return Err(err(
                        "PDL-E007",
                        format!(
                            "Unknown parameter `{}` in interaction (component {})",
                            param, component_name
                        ),
                        design,
                    ));
                }
            }
            InteractionHandlerItem::If { chain } => {
                for br in &chain.branches {
                    validate_condition_expr(design, &br.condition, param_by_name, component_name)?;
                    validate_interaction_body(design, &br.body, param_by_name, component_name)?;
                }
                if let Some(else_body) = &chain.else_body {
                    validate_interaction_body(design, else_body, param_by_name, component_name)?;
                }
            }
            _ => {}
        }
    }
    Ok(())
}

fn param_by_name_map(
    design: &DesignDefinition,
    c: &ComponentDecl,
) -> Result<HashMap<String, String>, PdlError> {
    Ok(effective_params(design, c)?
        .into_iter()
        .map(|p| (p.name, p.type_name))
        .collect())
}

fn validate_interactions_for_component(
    design: &DesignDefinition,
    component_name: &str,
) -> Result<(), PdlError> {
    let Some(m) = design.interactions.get(component_name) else {
        return Ok(());
    };
    let c = design.components.get(component_name).unwrap();
    let param_by_name = param_by_name_map(design, c)?;
    for decl in m.values() {
        for h in &decl.handlers {
            validate_interaction_body(design, &h.body, &param_by_name, component_name)?;
        }
    }
    Ok(())
}

fn validate_rules_statements(
    design: &DesignDefinition,
    statements: &[RulesStatement],
    param_by_name: &HashMap<String, String>,
    component_name: &str,
) -> Result<(), PdlError> {
    for st in statements {
        if let RulesStatement::If { chain } = st {
            for br in &chain.branches {
                validate_condition_expr(design, &br.condition, param_by_name, component_name)?;
                validate_rules_statements(design, &br.body, param_by_name, component_name)?;
            }
            if let Some(else_body) = &chain.else_body {
                validate_rules_statements(design, else_body, param_by_name, component_name)?;
            }
        }
    }
    Ok(())
}

fn validate_rules_for_component(
    design: &DesignDefinition,
    component_name: &str,
) -> Result<(), PdlError> {
    let Some(stmts) = design.rules.get(component_name) else {
        return Ok(());
    };
    if stmts.is_empty() {
        return Ok(());
    }
    let c = design.components.get(component_name).unwrap();
    let param_by_name = param_by_name_map(design, c)?;
    validate_rules_statements(design, stmts, &param_by_name, component_name)
}

/// Semantic checks on the merged design (after parse + import merge).
pub fn validate_merged_design(design: &DesignDefinition) -> Result<(), PdlError> {
    validate_companion_symbols(design)?;
    for c in design.components.values() {
        if let Some(proto) = &c.conforms_to {
            if !design.protocols.contains_key(proto) {
                return Err(err(
                    "PDL-E006",
                    format!(
                        "Component `{}` conforms to unknown protocol `{}`",
                        c.name, proto
                    ),
                    design,
                ));
            }
        }
        let mut seen = HashSet::new();
        collect_unique_frame_ids_from_body(&c.body, &mut seen, &c.name, design)?;
        let param_by_name = param_by_name_map(design, c)?;
        validate_if_conditions_in_body(design, &c.body, &param_by_name, &c.name)?;
        let let_kinds = collect_let_frame_kinds(&c.body);
        validate_hidden_in_body(
            design,
            &c.body,
            &param_by_name,
            &c.name,
            root_kind_str(c.root_kind),
            &let_kinds,
        )?;
        validate_fixtures_for_component(design, &c.name)?;
        validate_interactions_for_component(design, &c.name)?;
        validate_rules_for_component(design, &c.name)?;
    }
    Ok(())
}
