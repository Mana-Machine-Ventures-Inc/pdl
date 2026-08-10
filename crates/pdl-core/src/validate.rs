//! Semantic validation of a merged design.
//!
//! Rust port of `src/validateDesign.ts`.

use std::collections::HashMap;
use std::collections::HashSet;

use crate::ast::*;
use crate::design::{effective_params, DesignDefinition};
use crate::error::PdlError;
use crate::frame_props::{validate_frame_props_in_body, validate_type_style_props};

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
            if type_name != "Boolean" && type_name != "Bool" {
                return Err(err(
                    "PDL-E010",
                    format!(
                        "Bare `if {}` requires a Boolean parameter (got type {}); use `{} == …` for variants",
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
            // Boolean compare: `selected == true` / `selected == .true`
            if type_name == "Boolean" || type_name == "Bool" {
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
                        "Boolean condition on `{}` expected `true` / `false` (or `.true` / `.false`)",
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

fn ambient_event(name: &str) -> bool {
    matches!(
        name,
        "hoverStart"
            | "hoverEnd"
            | "pressStart"
            | "pressEnd"
            | "pressCancel"
            | "focusStart"
            | "focusEnd"
            | "activate"
            | "appear"
            | "dismiss"
            | "keyboardDismissed"
            | "keyboardCancelled"
    )
}

/// Host protocol that must cover this ambient event (PointerInput / EditableText).
fn host_protocol_for_ambient(event: &str) -> Option<&'static str> {
    match event {
        "hoverStart" | "hoverEnd" | "pressStart" | "pressEnd" | "pressCancel"
        | "focusStart" | "focusEnd" | "activate" | "appear" | "dismiss" => Some("PointerInput"),
        "keyboardDismissed" | "keyboardCancelled" => Some("EditableText"),
        _ => None,
    }
}

fn host_protocol_for_verb(name: &str) -> Option<&'static str> {
    match name {
        "beginEditing" | "cancelEditing" | "commitEditing" => Some("EditableText"),
        _ => None,
    }
}

fn validate_layout_on_handler(
    design: &DesignDefinition,
    handler: &LayoutOnHandler,
    param_by_name: &HashMap<String, String>,
    array_params: &HashSet<String>,
    component_name: &str,
) -> Result<(), PdlError> {
    if ambient_event(&handler.channel) {
        return Err(err(
            "PDL-E028",
            format!(
                "Ambient host event `{}` is not allowed as a layout emit capture (component {}); use `[self.]{} = {{ … }}` in the kind body (§4a′ / §8)",
                handler.channel, component_name, handler.channel
            ),
            design,
        ));
    }
    if let Some(q) = &handler.qualifier {
        if array_params.contains(q) {
            return Err(err(
                "PDL-E036",
                format!(
                    "Cannot capture list emits as `{q}.{}(…) = {{ … }}` (component {component_name}); \
                     use `ForEach({q}) {{ item in item.{}(…) = {{ … }} }}` (§4e)",
                    handler.channel, handler.channel
                ),
                design,
            ));
        }
    }
    for a in &handler.body {
        if !param_by_name.contains_key(&a.param) {
            return Err(err(
                "PDL-E007",
                format!(
                    "Unknown parameter `{}` in layout emit capture (component {})",
                    a.param, component_name
                ),
                design,
            ));
        }
    }
    Ok(())
}

fn validate_if_conditions_in_body(
    design: &DesignDefinition,
    items: &[FrameBodyItem],
    param_by_name: &HashMap<String, String>,
    array_params: &HashSet<String>,
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
                        array_params,
                        component_name,
                    )?;
                }
                if let Some(else_body) = &chain.else_body {
                    validate_if_conditions_in_body(
                        design,
                        else_body,
                        param_by_name,
                        array_params,
                        component_name,
                    )?;
                }
            }
            FrameBodyItem::Let { body, .. } => {
                validate_if_conditions_in_body(
                    design,
                    body,
                    param_by_name,
                    array_params,
                    component_name,
                )?;
            }
            FrameBodyItem::FrameProp { frame, name, .. } => {
                if array_params.contains(frame) {
                    return Err(err(
                        "PDL-E034",
                        format!(
                            "Cannot override `{frame}.{name}` on array slot `{frame}` (component {component_name}); use `ForEach({frame}) {{ item in item.{name} = … }}` and `children = [{frame}]`"
                        ),
                        design,
                    ));
                }
            }
            FrameBodyItem::ForEach {
                list,
                handlers,
                ..
            } => {
                if !param_by_name.contains_key(list) {
                    return Err(err(
                        "PDL-E023",
                        format!(
                            "ForEach(`{}`): unknown list/slot parameter (component {})",
                            list, component_name
                        ),
                        design,
                    ));
                }
                for h in handlers {
                    validate_layout_on_handler(
                        design,
                        h,
                        param_by_name,
                        array_params,
                        component_name,
                    )?;
                }
            }
            FrameBodyItem::LayoutOn { handler } => {
                validate_layout_on_handler(
                    design,
                    handler,
                    param_by_name,
                    array_params,
                    component_name,
                )?;
            }
            _ => {}
        }
    }
    Ok(())
}

/// Collect `ForEach(list)` names and `children = […]` FrameRef ids in a body.
fn collect_foreach_and_children_mounts(
    items: &[FrameBodyItem],
    foreach_lists: &mut HashSet<String>,
    children_refs: &mut HashSet<String>,
) {
    for item in items {
        match item {
            FrameBodyItem::ForEach { list, .. } => {
                foreach_lists.insert(list.clone());
            }
            FrameBodyItem::Children { entries, .. } => {
                for e in entries {
                    if let ChildEntry::FrameRef { id } = e {
                        children_refs.insert(id.clone());
                    }
                }
            }
            FrameBodyItem::If { chain } => {
                for br in &chain.branches {
                    collect_foreach_and_children_mounts(&br.body, foreach_lists, children_refs);
                }
                if let Some(else_body) = &chain.else_body {
                    collect_foreach_and_children_mounts(else_body, foreach_lists, children_refs);
                }
            }
            FrameBodyItem::Let { body, .. } => {
                collect_foreach_and_children_mounts(body, foreach_lists, children_refs);
            }
            _ => {}
        }
    }
}

fn validate_foreach_mounts(
    design: &DesignDefinition,
    c: &ComponentDecl,
) -> Result<(), PdlError> {
    let mut foreach_lists = HashSet::new();
    let mut children_refs = HashSet::new();
    collect_foreach_and_children_mounts(&c.body, &mut foreach_lists, &mut children_refs);
    for list in foreach_lists {
        if !children_refs.contains(&list) {
            return Err(err(
                "PDL-E035",
                format!(
                    "ForEach(`{list}`) does not mount the list; add `children = {list}` or `children = […, {list}, …]` (component {})",
                    c.name
                ),
                design,
            ));
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
                    "PDL-E037",
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
    check(design.emits.keys().collect(), "emits targets")?;
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
            InteractionHandlerItem::HostVerb { name, args } => {
                if host_protocol_for_verb(name).is_none() {
                    return Err(err(
                        "PDL-E033",
                        format!(
                            "Unknown host verb `{name}` in interaction (component {component_name}); expected beginEditing / cancelEditing / commitEditing"
                        ),
                        design,
                    ));
                }
                for a in args {
                    let base = a.strip_prefix("self.").unwrap_or(a.as_str());
                    if base != "self" && !param_by_name.contains_key(base) {
                        return Err(err(
                            "PDL-E007",
                            format!(
                                "Unknown parameter `{a}` in host verb `{name}` (component {component_name})"
                            ),
                            design,
                        ));
                    }
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

fn collect_needed_host_protocols_from_body(
    items: &[InteractionHandlerItem],
    needed: &mut HashSet<&'static str>,
) {
    for it in items {
        match it {
            InteractionHandlerItem::HostVerb { name, .. } => {
                if let Some(p) = host_protocol_for_verb(name) {
                    needed.insert(p);
                }
            }
            InteractionHandlerItem::If { chain } => {
                for br in &chain.branches {
                    collect_needed_host_protocols_from_body(&br.body, needed);
                }
                if let Some(else_body) = &chain.else_body {
                    collect_needed_host_protocols_from_body(else_body, needed);
                }
            }
            _ => {}
        }
    }
}

/// Host handlers (`self.<channel> = { … }`) require an explicit host protocol.
fn validate_host_protocol_coverage(
    design: &DesignDefinition,
    component_name: &str,
) -> Result<(), PdlError> {
    let Some(m) = design.interactions.get(component_name) else {
        return Ok(());
    };
    let mut needed: HashSet<&'static str> = HashSet::new();
    let mut any_handler = false;
    for decl in m.values() {
        for h in &decl.handlers {
            any_handler = true;
            if let Some(p) = host_protocol_for_ambient(&h.event) {
                needed.insert(p);
            }
            collect_needed_host_protocols_from_body(&h.body, &mut needed);
        }
    }
    if !any_handler {
        return Ok(());
    }
    // Pointer interactions are the common case; ensure PointerInput when any ambient pointer event.
    if needed.is_empty() {
        needed.insert("PointerInput");
    }
    let c = design.components.get(component_name).unwrap();
    let hosts = crate::design::effective_host_protocols(design, c)?;
    for need in &needed {
        if !hosts.iter().any(|h| h == need) {
            return Err(err(
                "PDL-E030",
                format!(
                    "Component `{component_name}` has host handlers (`self.<channel> = {{ … }}`) that require host protocol `{need}`, but does not conform to `{need}` (use `component {component_name} <{need}>` or an API protocol with `requires {need}`)"
                ),
                design,
            ));
        }
    }
    Ok(())
}

fn validate_host_protocol_not_slot_type(
    design: &DesignDefinition,
    c: &ComponentDecl,
) -> Result<(), PdlError> {
    let params = crate::design::effective_params(design, c)?;
    for p in params {
        let type_name = p.type_name.trim_start_matches('[').trim_end_matches(']');
        if let Some(proto) = design.protocols.get(type_name) {
            if proto.role == crate::ast::ProtocolRole::Host {
                return Err(err(
                    "PDL-E031",
                    format!(
                        "Host protocol `{type_name}` cannot be used as a param/slot type on component `{}` (host protocols are runtime powers, not compositional content)",
                        c.name
                    ),
                    design,
                ));
            }
        }
    }
    Ok(())
}

/// Prelude host names may be re-stated as `protocol X { host }` for docs, but must
/// not be redefined as API protocols or given params / emits / requires.
fn validate_host_protocol_prelude(design: &DesignDefinition) -> Result<(), PdlError> {
    for &name in crate::design::HOST_PROTOCOL_PRELUDE {
        let Some(p) = design.protocols.get(name) else {
            continue;
        };
        if p.role != crate::ast::ProtocolRole::Host
            || !p.params.is_empty()
            || !p.emits.is_empty()
            || !p.requires.is_empty()
        {
            return Err(err(
                "PDL-E032",
                format!(
                    "Prelude host protocol `{name}` cannot be redefined (keep `protocol {name} {{ host }}` or omit — it is always in scope)"
                ),
                design,
            ));
        }
    }
    Ok(())
}

fn validate_protocol_requires(design: &DesignDefinition) -> Result<(), PdlError> {
    for p in design.protocols.values() {
        if p.role == crate::ast::ProtocolRole::Host && !p.requires.is_empty() {
            return Err(err(
                "PDL-E032",
                format!(
                    "Host protocol `{}` cannot use `requires` (compose host powers on API protocols instead)",
                    p.name
                ),
                design,
            ));
        }
        for dep in &p.requires {
            let Some(target) = design.protocols.get(dep) else {
                return Err(err(
                    "PDL-E022",
                    format!(
                        "Protocol `{}` requires unknown protocol `{dep}`",
                        p.name
                    ),
                    design,
                ));
            };
            if target.role != crate::ast::ProtocolRole::Host {
                return Err(err(
                    "PDL-E032",
                    format!(
                        "Protocol `{}` requires `{dep}`, but `{dep}` is not a host protocol (mark with `host` in the protocol body)",
                        p.name
                    ),
                    design,
                ));
            }
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
            if !ambient_event(&h.event) {
                return Err(err(
                    "PDL-E029",
                    format!(
                        "Declared emit channel `{}` is not a host inbound channel (component {}); capture it with layout handler assignment `{}(…) = {{ … }}` (§4e / §8)",
                        h.event, component_name, h.event
                    ),
                    design,
                ));
            }
            validate_interaction_body(design, &h.body, &param_by_name, component_name)?;
        }
    }
    validate_host_protocol_coverage(design, component_name)?;
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

fn token_type_of(design: &DesignDefinition, name: &str) -> Option<String> {
    design
        .primitives
        .get(name)
        .map(|p| p.token_type.clone())
        .or_else(|| design.semantics.get(name).map(|s| s.token_type.clone()))
}

fn validate_opacity_sides(design: &DesignDefinition, expr: &ValueExpr) -> Result<(), PdlError> {
    match expr {
        ValueExpr::OpacityOf { base, opacity } => {
            validate_opacity_sides(design, base)?;
            match opacity.as_ref() {
                ValueExpr::Number { value: n } => {
                    if *n < 0.0 || *n > 1.0 {
                        return Err(err(
                            "PDL-E005",
                            format!("Opacity side of `@` must be a number in 0…1 (got {n})"),
                            design,
                        ));
                    }
                    Ok(())
                }
                ValueExpr::Ident { name } => {
                    let Some(ref_type) = token_type_of(design, name) else {
                        return Err(err(
                            "PDL-E007",
                            format!("Unresolved identifier {name}"),
                            design,
                        ));
                    };
                    if ref_type != "Opacity" {
                        return Err(err(
                            "PDL-E005",
                            format!(
                                "Opacity side of `@` must be an Opacity token or number (got `{name}` of type {ref_type})"
                            ),
                            design,
                        ));
                    }
                    Ok(())
                }
                _ => Err(err(
                    "PDL-E005",
                    "Opacity side of `@` must be an Opacity token or number".to_string(),
                    design,
                )),
            }
        }
        ValueExpr::Array { items } => {
            for item in items {
                validate_opacity_sides(design, item)?;
            }
            Ok(())
        }
        ValueExpr::Corner { tl, tr, br, bl } => {
            validate_opacity_sides(design, tl)?;
            validate_opacity_sides(design, tr)?;
            validate_opacity_sides(design, br)?;
            validate_opacity_sides(design, bl)
        }
        ValueExpr::Shadow {
            x,
            y,
            blur_radius,
            color,
            spread,
        } => {
            validate_opacity_sides(design, x)?;
            validate_opacity_sides(design, y)?;
            validate_opacity_sides(design, blur_radius)?;
            validate_opacity_sides(design, color)?;
            if let Some(s) = spread {
                validate_opacity_sides(design, s)?;
            }
            Ok(())
        }
        ValueExpr::EdgeInsets { fields, .. } => {
            for v in fields.values() {
                validate_opacity_sides(design, v)?;
            }
            Ok(())
        }
        ValueExpr::Transition {
            duration,
            easing,
            delay,
        } => {
            validate_opacity_sides(design, duration)?;
            validate_opacity_sides(design, easing)?;
            if let Some(d) = delay {
                validate_opacity_sides(design, d)?;
            }
            Ok(())
        }
        ValueExpr::Call { args, .. } => {
            for v in args.values() {
                validate_opacity_sides(design, v)?;
            }
            Ok(())
        }
        ValueExpr::RampInline { stops, .. } => {
            for s in stops {
                validate_opacity_sides(design, s)?;
            }
            Ok(())
        }
        ValueExpr::GradientStop { fields } => {
            for v in fields.values() {
                validate_opacity_sides(design, v)?;
            }
            Ok(())
        }
        _ => Ok(()),
    }
}

fn token_rhs_expectation(token_type: &str) -> &'static str {
    match token_type {
        "Color" => "a #hex color (or color @ opacity)",
        "Opacity" => "a number in 0…1",
        "Distance" | "Radius" => "a non-negative number",
        "Shadow" => "`Shadow(x:, y:, blurRadius:, color: [, spread:])`",
        "Size" | "Weight" => "a number",
        "LineHeight" => "a positive number (unitless ratio, e.g. `1.35`)",
        "LetterSpacing" => "a number (em units, e.g. `0.01` or `-0.02`)",
        "Ratio" => "a positive number or `W:H` ratio sugar (e.g. `16:9`)",
        "Duration" | "Blur" => "a non-negative number",
        "FontFamily" | "Icon" | "MediaSource" | "Easing" => "a string",
        "Transition" => "a transition tuple `(duration: …, easing: …)`",
        "Vibrancy" => "a vibrancy tuple `(saturation: …, brightness: …)`",
        "Ramp" => "a ramp literal `(direction: …, stops: […])`",
        "Sizing" => {
            "a sizing literal (`.hug` / `Sizing.hug`, `.fill`, `.fixed(n)`, `.flex(…)`)"
        }
        "Background" | "Foreground" => "a color, layer list `[…]`, or layer constructor",
        _ => "a value compatible with the declared TokenType",
    }
}

fn value_expr_kind_name(value: &ValueExpr) -> &'static str {
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
        ValueExpr::Instance { .. } => "instance",
        ValueExpr::Transition { .. } => "transition",
        ValueExpr::VibrancyTuple { .. } => "vibrancyTuple",
        ValueExpr::RampInline { .. } => "rampInline",
        ValueExpr::Sizing { .. } => "sizing",
        ValueExpr::Call { .. } => "call",
        ValueExpr::GradientStop { .. } => "gradientStop",
    }
}

fn is_shadow_axis_token_type(token_type: &str) -> bool {
    matches!(
        token_type,
        "Distance" | "Radius" | "Size" | "Weight" | "Ratio" | "Duration" | "Blur"
    )
}

fn assert_shadow_axis_field(
    design: &DesignDefinition,
    token_name: &str,
    field: &str,
    expr: &ValueExpr,
    non_negative: bool,
) -> Result<(), PdlError> {
    match expr {
        ValueExpr::Ident { name: ref_name } => {
            let Some(ref_type) = token_type_of(design, ref_name) else {
                return Err(err(
                    "PDL-E007",
                    format!("Unresolved identifier {ref_name}"),
                    design,
                ));
            };
            if !is_shadow_axis_token_type(&ref_type) {
                return Err(err(
                    "PDL-E005",
                    format!(
                        "Shadow `{token_name}` field `{field}` must be a number or numeric token (Distance, Radius, Size, …); `{ref_name}` has type {ref_type}"
                    ),
                    design,
                ));
            }
            Ok(())
        }
        ValueExpr::Number { value: n } => {
            if non_negative && *n < 0.0 {
                return Err(err(
                    "PDL-E005",
                    format!(
                        "Shadow `{token_name}` field `{field}` must be a non-negative number"
                    ),
                    design,
                ));
            }
            Ok(())
        }
        _ => Err(err(
            "PDL-E005",
            format!(
                "Shadow `{token_name}` field `{field}` must be a number (got {})",
                value_expr_kind_name(expr)
            ),
            design,
        )),
    }
}

fn assert_shadow_color_field(
    design: &DesignDefinition,
    token_name: &str,
    expr: &ValueExpr,
) -> Result<(), PdlError> {
    match expr {
        ValueExpr::Hex { .. } | ValueExpr::OpacityOf { .. } => Ok(()),
        ValueExpr::Ident { name: ref_name } => {
            let Some(ref_type) = token_type_of(design, ref_name) else {
                return Err(err(
                    "PDL-E007",
                    format!("Unresolved identifier {ref_name}"),
                    design,
                ));
            };
            if ref_type != "Color" {
                return Err(err(
                    "PDL-E005",
                    format!(
                        "Shadow `{token_name}` field `color` must be a Color; `{ref_name}` has type {ref_type}"
                    ),
                    design,
                ));
            }
            Ok(())
        }
        _ => Err(err(
            "PDL-E005",
            format!(
                "Shadow `{token_name}` field `color` must be a Color (#hex, color @ opacity, or Color token) (got {})",
                value_expr_kind_name(expr)
            ),
            design,
        )),
    }
}

fn assert_shadow_constructor_fields(
    design: &DesignDefinition,
    token_name: &str,
    value: &ValueExpr,
) -> Result<(), PdlError> {
    let ValueExpr::Shadow {
        x,
        y,
        blur_radius,
        color,
        spread,
    } = value
    else {
        return Ok(());
    };
    assert_shadow_axis_field(design, token_name, "x", x, false)?;
    assert_shadow_axis_field(design, token_name, "y", y, false)?;
    assert_shadow_axis_field(design, token_name, "blurRadius", blur_radius, true)?;
    if let Some(s) = spread {
        assert_shadow_axis_field(design, token_name, "spread", s, false)?;
    }
    assert_shadow_color_field(design, token_name, color)
}

/// Full-spec §23.2: one gate for every TokenType RHS shape.
/// Bare `Ident` is accepted here; primitive/semantic alias rules run separately.
fn assert_token_rhs_compatible(
    design: &DesignDefinition,
    name: &str,
    token_type: &str,
    value: &ValueExpr,
) -> Result<(), PdlError> {
    if matches!(value, ValueExpr::Ident { .. }) {
        return Ok(());
    }

    if token_type == "Radius" {
        if let ValueExpr::Corner { .. } = value {
            return Err(err(
                "PDL-E005",
                format!(
                    "Token `{name}` has type Radius and must be a number (or Radius token alias on `semantic`); `Corner(…)` belongs on frame `cornerRadius`, not on tokens"
                ),
                design,
            ));
        }
    }
    if token_type == "Shadow" && !matches!(value, ValueExpr::Shadow { .. }) {
        return Err(err(
            "PDL-E005",
            format!(
                "Token `{name}` has type Shadow and must be `Shadow(x:, y:, blurRadius:, color: [, spread:])` (or a Shadow token alias on `semantic`); CSS box-shadow strings are not valid"
            ),
            design,
        ));
    }

    let ok = match token_type {
        "Color" => matches!(value, ValueExpr::Hex { .. } | ValueExpr::OpacityOf { .. }),
        "Opacity" => matches!(value, ValueExpr::Number { value: n } if *n >= 0.0 && *n <= 1.0),
        "Distance" | "Radius" => matches!(value, ValueExpr::Number { value: n } if *n >= 0.0),
        "Shadow" => matches!(value, ValueExpr::Shadow { .. }),
        "Size" | "Weight" => matches!(value, ValueExpr::Number { .. }),
        "LineHeight" => matches!(value, ValueExpr::Number { value: n } if *n > 0.0),
        "LetterSpacing" => matches!(value, ValueExpr::Number { .. }),
        "Ratio" => match value {
            ValueExpr::Number { value: n } => *n > 0.0,
            ValueExpr::Ratio { width, height } => *width > 0.0 && *height > 0.0,
            _ => false,
        },
        "Duration" | "Blur" => matches!(value, ValueExpr::Number { value: n } if *n >= 0.0),
        "FontFamily" | "Icon" | "MediaSource" | "Easing" => {
            matches!(value, ValueExpr::String { .. })
        }
        "Transition" => matches!(value, ValueExpr::Transition { .. }),
        "Vibrancy" => matches!(value, ValueExpr::VibrancyTuple { .. }),
        "Ramp" => matches!(value, ValueExpr::RampInline { .. }),
        "Sizing" => matches!(value, ValueExpr::Sizing { .. }),
        "Background" | "Foreground" => matches!(
            value,
            ValueExpr::Hex { .. }
                | ValueExpr::OpacityOf { .. }
                | ValueExpr::Array { .. }
                | ValueExpr::Call { .. }
        ),
        _ => false,
    };

    if !ok {
        let detail = match (token_type, value) {
            ("Opacity", ValueExpr::Number { .. }) => " (out of range 0…1)".to_string(),
            ("Distance" | "Radius" | "Duration" | "Blur", ValueExpr::Number { .. }) => {
                " (must be non-negative)".to_string()
            }
            _ => format!(" (got {})", value_expr_kind_name(value)),
        };
        return Err(err(
            "PDL-E005",
            format!(
                "Token `{name}` has type {token_type} and must be {}{detail}",
                token_rhs_expectation(token_type)
            ),
            design,
        ));
    }

    if token_type == "Shadow" {
        assert_shadow_constructor_fields(design, name, value)?;
    }
    if ok && (token_type == "Background" || token_type == "Foreground") {
        if let Err(e) = crate::frame_props::assert_layer_stack_value(
            design,
            value,
            &format!("Token `{name}`"),
        ) {
            // Frame props use E006; token RHS stays E005.
            if e.code == "PDL-E006" {
                return Err(err("PDL-E005", e.message, design));
            }
            return Err(e);
        }
    }
    Ok(())
}

fn validate_token_declarations(design: &DesignDefinition) -> Result<(), PdlError> {
    for (name, p) in &design.primitives {
        assert_token_rhs_compatible(design, name, &p.token_type, &p.value)?;
        if let ValueExpr::Ident { name: ref_name } = &p.value {
            let ref_type = token_type_of(design, ref_name);
            return Err(err(
                "PDL-E005",
                match ref_type {
                    Some(t) => format!(
                        "Primitive `{name}` must use a literal value (cannot reference token `{ref_name}` of type {t}); use `semantic` to alias tokens"
                    ),
                    None => format!(
                        "Primitive `{name}` must use a literal value (cannot reference `{ref_name}`); use `semantic` to alias tokens"
                    ),
                },
                design,
            ));
        }
        validate_opacity_sides(design, &p.value)?;
    }
    for (name, s) in &design.semantics {
        assert_token_rhs_compatible(design, name, &s.token_type, &s.value)?;
        if let ValueExpr::Ident { name: ref_name } = &s.value {
            let Some(ref_type) = token_type_of(design, ref_name) else {
                return Err(err(
                    "PDL-E007",
                    format!("Unresolved identifier {ref_name}"),
                    design,
                ));
            };
            if ref_type != s.token_type {
                return Err(err(
                    "PDL-E005",
                    format!(
                        "Token `{name}` has type {} but references `{ref_name}` of type {ref_type}",
                        s.token_type
                    ),
                    design,
                ));
            }
        }
        validate_opacity_sides(design, &s.value)?;
    }
    Ok(())
}

/// Semantic checks on the merged design (after parse + import merge).
pub fn validate_merged_design(design: &DesignDefinition) -> Result<(), PdlError> {
    validate_companion_symbols(design)?;
    validate_host_protocol_prelude(design)?;
    validate_protocol_requires(design)?;
    validate_token_declarations(design)?;
    validate_type_style_props(design)?;
    for c in design.components.values() {
        if let Some(proto) = &c.conforms_to {
            if !design.protocols.contains_key(proto) {
                return Err(err(
                    "PDL-E022",
                    format!(
                        "Component `{}` conforms to unknown protocol `{}`",
                        c.name, proto
                    ),
                    design,
                ));
            }
        }
        validate_host_protocol_not_slot_type(design, c)?;
        let mut seen = HashSet::new();
        collect_unique_frame_ids_from_body(&c.body, &mut seen, &c.name, design)?;
        let param_by_name = param_by_name_map(design, c)?;
        let array_params: HashSet<String> = effective_params(design, c)?
            .into_iter()
            .filter(|p| p.is_array)
            .map(|p| p.name)
            .collect();
        validate_if_conditions_in_body(
            design,
            &c.body,
            &param_by_name,
            &array_params,
            &c.name,
        )?;
        validate_foreach_mounts(design, c)?;
        let let_kinds = collect_let_frame_kinds(&c.body);
        validate_hidden_in_body(
            design,
            &c.body,
            &param_by_name,
            &c.name,
            root_kind_str(c.root_kind),
            &let_kinds,
        )?;
        validate_frame_props_in_body(
            design,
            &c.body,
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
