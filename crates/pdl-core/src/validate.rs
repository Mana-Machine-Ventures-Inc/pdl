//! Semantic validation of a merged design.
//!
//! Rust port of `src/validateDesign.ts`.

use std::collections::HashMap;
use std::collections::HashSet;

use crate::asset_refs::{is_http_url, is_pack_relative_file_path, normalize_icon_system_name};
use crate::ast::*;
use crate::conditions::validate_condition_expr;
use crate::design::{effective_emits, effective_params, resolve_active_host, DesignDefinition};
use crate::error::PdlError;
use crate::frame_props::{validate_frame_props_in_body, validate_type_style_props};
use crate::motion::is_motion_prop_name;
use crate::param_bindings::{
    assert_param_value_compatible, validate_component_param_defaults,
    validate_param_bindings_in_body,
};
use crate::param_types::{is_builtin_param_type, unwrap_param_type_name};

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
                let root_fk = design.components.get(component_name).map(|c| {
                    match c.root_kind {
                        RootKind::Layout => "layout",
                        RootKind::Text => "text",
                        RootKind::Icon => "icon",
                        RootKind::Media => "media",
                    }
                    .to_string()
                });
                let fk = if frame == "self" {
                    root_fk
                } else {
                    let_kinds.get(frame).cloned()
                };
                let fk = fk.ok_or_else(|| {
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
            | "editingBegan"
            | "editingFinished"
            | "editingCancelled"
            // Migration aliases
            | "keyboardDismissed"
            | "keyboardCancelled"
    )
}

/// Host protocol that must cover this ambient event (PointerInput / EditableText).
fn host_protocol_for_ambient(event: &str) -> Option<&'static str> {
    match event {
        "hoverStart" | "hoverEnd" | "pressStart" | "pressEnd" | "pressCancel" | "focusStart"
        | "focusEnd" | "activate" | "appear" | "dismiss" => Some("PointerInput"),
        "editingBegan" | "editingFinished" | "editingCancelled" | "keyboardDismissed"
        | "keyboardCancelled" => Some("EditableText"),
        _ => None,
    }
}

fn host_protocol_for_verb(name: &str) -> Option<&'static str> {
    match name {
        "beginEditing" | "finishEditing" | "cancelEditing" | "commitEditing" => {
            Some("EditableText")
        }
        _ => None,
    }
}

fn validate_layout_on_handler(
    design: &DesignDefinition,
    handler: &LayoutOnHandler,
    param_by_name: &HashMap<String, String>,
    array_params: &HashSet<String>,
    component_name: &str,
    // ForEach binder captures store `qualifier: None` (catalogue uses the list name).
    foreach_binder: bool,
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
        if design.protocols.contains_key(q) {
            return Err(err(
                "PDL-E052",
                format!(
                    "Ancestor capture is a bare channel (`{}(…) = {{ … }}`); \
                     `{q}.{}` treats protocol `{q}` like a child let (component {component_name})",
                    handler.channel, handler.channel
                ),
                design,
            ));
        }
        if q == "presenter" || q == "Presenter" {
            return Err(err(
                "PDL-E052",
                format!(
                    "`{q}.{}` is not ancestor capture (component {component_name}); \
                     the presenter is a hole. Write `{}(…) = {{ … }}` on the ancestor",
                    handler.channel, handler.channel
                ),
                design,
            ));
        }
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
    } else if !foreach_binder {
        let Some(sig) = ancestors_emit_sig(design, &handler.channel) else {
            return Err(err(
                "PDL-E024",
                format!(
                    "Bare `{}(…) =` is ancestor capture; `{}` is not an `.ancestors` emit \
                     (component {component_name})",
                    handler.channel, handler.channel
                ),
                design,
            ));
        };
        if let Some(proto) = ancestors_emit_protocol(design, &handler.channel) {
            let listed = design
                .components
                .get(component_name)
                .map(|c| c.conforms_to.iter().any(|p| p == proto))
                .unwrap_or(false);
            if !listed {
                return Err(err(
                    "PDL-E024",
                    format!(
                        "Bare `{}(…) =` requires `<{proto}>` on `{component_name}` \
                         (receive / ancestor sink)",
                        handler.channel
                    ),
                    design,
                ));
            }
        }
        if !emit_payloads_match_by_position(&handler.payload, &sig.args) {
            return Err(err(
                "PDL-E027",
                format!(
                    "Ancestor capture `{}(…)` payload does not match the `.ancestors` signature \
                     (component {component_name})",
                    handler.channel
                ),
                design,
            ));
        }
    }
    for item in &handler.body {
        match item {
            crate::ast::LayoutOnBodyItem::Assign(a) => {
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
            crate::ast::LayoutOnBodyItem::HostVerb {
                qualifier,
                name,
                args,
            } => {
                validate_host_verb_call(
                    design,
                    component_name,
                    qualifier.as_deref(),
                    name,
                    args,
                    param_by_name,
                )?;
            }
            crate::ast::LayoutOnBodyItem::PresenterVerb {
                qualifier,
                verb,
                page,
                style,
                move_spec,
                dismiss_move,
            } => {
                validate_presenter_verb(
                    design,
                    component_name,
                    qualifier,
                    *verb,
                    page.as_ref(),
                    style.as_deref(),
                    move_spec.as_ref(),
                    dismiss_move.as_ref(),
                )?;
            }
        }
    }
    Ok(())
}

/// Resolve `let Input = NoteField(…)` → component name `NoteField`.
fn let_instance_component<'a>(
    design: &'a DesignDefinition,
    owner: &str,
    let_id: &str,
) -> Option<&'a str> {
    let c = design.components.get(owner)?;
    fn walk<'a>(items: &'a [crate::ast::FrameBodyItem], let_id: &str) -> Option<&'a str> {
        for item in items {
            match item {
                crate::ast::FrameBodyItem::LetInstance { id, component, .. } if id == let_id => {
                    return Some(component.as_str());
                }
                crate::ast::FrameBodyItem::Let { body, .. } => {
                    if let Some(c) = walk(body, let_id) {
                        return Some(c);
                    }
                }
                crate::ast::FrameBodyItem::If { chain } => {
                    for br in &chain.branches {
                        if let Some(c) = walk(&br.body, let_id) {
                            return Some(c);
                        }
                    }
                    if let Some(else_body) = &chain.else_body {
                        if let Some(c) = walk(else_body, let_id) {
                            return Some(c);
                        }
                    }
                }
                crate::ast::FrameBodyItem::ForEach { body, .. } => {
                    if let Some(c) = walk(body, let_id) {
                        return Some(c);
                    }
                }
                _ => {}
            }
        }
        None
    }
    walk(&c.body, let_id)
}

fn validate_host_verb_call(
    design: &DesignDefinition,
    component_name: &str,
    qualifier: Option<&str>,
    name: &str,
    args: &[String],
    param_by_name: &HashMap<String, String>,
) -> Result<(), PdlError> {
    if host_protocol_for_verb(name).is_none() {
        return Err(err(
            "PDL-E033",
            format!(
                "Unknown host verb `{name}` in interaction (component {component_name}); expected beginEditing / finishEditing / cancelEditing (commitEditing alias)"
            ),
            design,
        ));
    }
    for a in args {
        let base = a.strip_prefix("self.").unwrap_or(a);
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
    if let Some(q) = qualifier {
        let Some(child_comp) = let_instance_component(design, component_name, q) else {
            return Err(err(
                "PDL-E012",
                format!(
                    "Unknown let `{q}` in host verb `{q}.{name}(…)` (component {component_name})"
                ),
                design,
            ));
        };
        let Some(child) = design.components.get(child_comp) else {
            return Err(err(
                "PDL-E037",
                format!(
                    "Unknown component `{child_comp}` for let `{q}` in host verb `{q}.{name}(…)` (component {component_name})"
                ),
                design,
            ));
        };
        let need = host_protocol_for_verb(name).unwrap();
        let hosts = crate::design::effective_host_protocols(design, child)?;
        if !hosts.iter().any(|h| h == need) {
            return Err(err(
                "PDL-E030",
                format!(
                    "Host verb `{q}.{name}(…)` requires `{child_comp}` to conform to `{need}` (component {component_name})"
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
            FrameBodyItem::ForEach { list, body, .. } => {
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
                for h in crate::ast::foreach_layout_handlers(body) {
                    validate_layout_on_handler(
                        design,
                        h,
                        param_by_name,
                        array_params,
                        component_name,
                        true,
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
                    false,
                )?;
            }
            _ => {}
        }
    }
    Ok(())
}

/// List name from a kwarg RHS used as a mount forward (`chips` / `[chips]`).
fn list_ident_from_mount_expr(expr: &crate::ast::ValueExpr) -> Option<&str> {
    match expr {
        crate::ast::ValueExpr::Ident { name } => Some(name.as_str()),
        crate::ast::ValueExpr::Array { items } if items.len() == 1 => {
            if let crate::ast::ValueExpr::Ident { name } = &items[0] {
                Some(name.as_str())
            } else {
                None
            }
        }
        _ => None,
    }
}

fn collect_list_idents_from_kwargs(
    kwargs: &indexmap::IndexMap<String, crate::ast::ValueExpr>,
    children_refs: &mut HashSet<String>,
) {
    for expr in kwargs.values() {
        if let Some(name) = list_ident_from_mount_expr(expr) {
            children_refs.insert(name.to_string());
            if let Some((_, _, field)) = crate::samples::split_sample_path(name) {
                children_refs.insert(field.to_string());
            }
        }
        // `children: [Tracks.focus.tracks, …]`
        if let crate::ast::ValueExpr::Array { items } = expr {
            for it in items {
                if let crate::ast::ValueExpr::Ident { name } = it {
                    children_refs.insert(name.clone());
                    if let Some((_, _, field)) = crate::samples::split_sample_path(name) {
                        children_refs.insert(field.to_string());
                    }
                }
            }
        }
    }
}

fn validate_samples(design: &DesignDefinition) -> Result<(), PdlError> {
    for bank in design.samples.values() {
        if design.components.contains_key(&bank.name) {
            return Err(err(
                "PDL-E041",
                format!(
                    "Sample bank `{}` collides with component name `{}`",
                    bank.name, bank.name
                ),
                design,
            ));
        }
        for entry in &bank.entries {
            let mut field_caller: HashMap<String, String> = HashMap::new();
            for f in &entry.fields {
                field_caller.insert(f.name.clone(), f.type_name.clone());
            }
            for f in &entry.fields {
                if !crate::param_types::is_builtin_param_type(&f.type_name)
                    && !design.variants.contains_key(&f.type_name)
                    && !design.components.contains_key(&f.type_name)
                    && !design.protocols.contains_key(&f.type_name)
                {
                    return Err(err(
                        "PDL-E039",
                        format!(
                            "Unknown type `{}` on sample `{}.{}.{}`",
                            f.type_name, bank.name, entry.name, f.name
                        ),
                        design,
                    ));
                }
                assert_param_value_compatible(
                    design,
                    &f.type_name,
                    &f.value,
                    &field_caller,
                    &format!("for sample field `{}.{}.{}`", bank.name, entry.name, f.name),
                )?;
            }
        }
    }
    Ok(())
}

/// Collect `ForEach(list)` names and mount sites (`children = [list]` or
/// forwarded via `Child(children: list)` / `Child(children: [list])`).
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
                    match e {
                        ChildEntry::FrameRef { id, .. } => {
                            children_refs.insert(id.clone());
                            // Sample mount `Tracks.focus.tracks` counts as mounting field `tracks`
                            // for ForEach(tracks) / PDL-E035.
                            if let Some((_, _, field)) = crate::samples::split_sample_path(id) {
                                children_refs.insert(field.to_string());
                            }
                        }
                        ChildEntry::Instance { kwargs, .. } => {
                            collect_list_idents_from_kwargs(kwargs, children_refs);
                        }
                        _ => {}
                    }
                }
            }
            FrameBodyItem::LetInstance { kwargs, .. } => {
                collect_list_idents_from_kwargs(kwargs, children_refs);
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

fn duplicate_mount_error(design: &DesignDefinition, id: &str, component_name: &str) -> PdlError {
    err(
        "PDL-E042",
        format!(
            "Frame `{id}` is mounted more than once in component {component_name} — a `let` is one object; write two lets or a list"
        ),
        design,
    )
}

/// A frame `let` / `letInstance` may appear at most once in any single `children` list.
fn validate_unique_frame_mounts_in_body(
    design: &DesignDefinition,
    items: &[FrameBodyItem],
    frame_lets: &HashSet<String>,
    component_name: &str,
) -> Result<(), PdlError> {
    for it in items {
        match it {
            FrameBodyItem::Children { entries, .. } => {
                let mut seen = HashSet::new();
                for e in entries {
                    if let ChildEntry::FrameRef { id, .. } = e {
                        if frame_lets.contains(id) && !seen.insert(id.clone()) {
                            return Err(duplicate_mount_error(design, id, component_name));
                        }
                    }
                }
            }
            FrameBodyItem::Let { body, .. } => {
                validate_unique_frame_mounts_in_body(design, body, frame_lets, component_name)?;
            }
            FrameBodyItem::If { chain } => {
                for br in &chain.branches {
                    validate_unique_frame_mounts_in_body(
                        design,
                        &br.body,
                        frame_lets,
                        component_name,
                    )?;
                }
                if let Some(else_body) = &chain.else_body {
                    validate_unique_frame_mounts_in_body(
                        design,
                        else_body,
                        frame_lets,
                        component_name,
                    )?;
                }
            }
            _ => {}
        }
    }
    Ok(())
}

fn validate_unique_frame_mounts(
    design: &DesignDefinition,
    c: &ComponentDecl,
    frame_lets: &HashSet<String>,
) -> Result<(), PdlError> {
    validate_unique_frame_mounts_in_body(design, &c.body, frame_lets, &c.name)
}

fn validate_foreach_mounts(design: &DesignDefinition, c: &ComponentDecl) -> Result<(), PdlError> {
    let mut foreach_lists = HashSet::new();
    let mut children_refs = HashSet::new();
    collect_foreach_and_children_mounts(&c.body, &mut foreach_lists, &mut children_refs);
    for list in foreach_lists {
        if !children_refs.contains(&list) {
            return Err(err(
                "PDL-E035",
                format!(
                    "ForEach(`{list}`) does not mount the list; add `children = {list}`, `children = […, {list}, …]`, or pass `{list}` into a child list param (component {})",
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

fn validate_let_values_in_body(
    design: &DesignDefinition,
    items: &[FrameBodyItem],
    frame_ids: &HashSet<String>,
    value_ids: &mut HashSet<String>,
    caller_params: &HashMap<String, String>,
    component_name: &str,
) -> Result<(), PdlError> {
    for it in items {
        match it {
            FrameBodyItem::LetValue {
                id,
                type_name,
                value,
            } => {
                if frame_ids.contains(id) || value_ids.contains(id) {
                    return Err(err(
                        "PDL-E021",
                        format!(
                            "Duplicate id `{id}` in component {component_name} (`let` / `letInstance` / value `let` names must be unique across the whole component body)"
                        ),
                        design,
                    ));
                }
                value_ids.insert(id.clone());
                if !is_builtin_param_type(type_name) && !design.variants.contains_key(type_name) {
                    return Err(err(
                        "PDL-E039",
                        format!(
                            "Unknown value-let type `{type_name}` in component {component_name}"
                        ),
                        design,
                    ));
                }
                assert_param_value_compatible(
                    design,
                    type_name,
                    value,
                    caller_params,
                    &format!("for value let `{id}` (component {component_name})"),
                )?;
            }
            FrameBodyItem::Let { body, .. } => {
                validate_let_values_in_body(
                    design,
                    body,
                    frame_ids,
                    value_ids,
                    caller_params,
                    component_name,
                )?;
            }
            FrameBodyItem::If { chain } => {
                for br in &chain.branches {
                    validate_let_values_in_body(
                        design,
                        &br.body,
                        frame_ids,
                        value_ids,
                        caller_params,
                        component_name,
                    )?;
                }
                if let Some(else_body) = &chain.else_body {
                    validate_let_values_in_body(
                        design,
                        else_body,
                        frame_ids,
                        value_ids,
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

/// § Forward visibility / PDL-E019: `let` / `letInstance` must appear earlier in source
/// order than any `children` frame-id ref or `FrameId.prop` that names it.
/// Component params (including slots) may appear without a prior `let`.
/// Ids that are never declared in the component are left to other validators (e.g. PDL-E012).
fn forward_ref_error(
    design: &DesignDefinition,
    id: &str,
    context: &str,
    component_name: &str,
) -> PdlError {
    err(
        "PDL-E019",
        format!(
            "Frame `{id}` is referenced {context} before it is declared with `let` (component {component_name}) — declare frames before assigning `children` or `FrameId.prop`"
        ),
        design,
    )
}

fn assert_forward_frame_visibility(
    design: &DesignDefinition,
    items: &[FrameBodyItem],
    declared: &mut HashSet<String>,
    all_frame_ids: &HashSet<String>,
    param_names: &HashSet<String>,
    component_name: &str,
) -> Result<(), PdlError> {
    for it in items {
        match it {
            FrameBodyItem::Children { target, entries } => {
                if let ChildrenTarget::Let { let_id } = target {
                    if !declared.contains(let_id)
                        && !param_names.contains(let_id)
                        && all_frame_ids.contains(let_id)
                    {
                        return Err(forward_ref_error(
                            design,
                            let_id,
                            &format!("as `{let_id}.children`"),
                            component_name,
                        ));
                    }
                }
                for entry in entries {
                    if let ChildEntry::FrameRef { id, .. } = entry {
                        if !declared.contains(id)
                            && !param_names.contains(id)
                            && all_frame_ids.contains(id)
                        {
                            return Err(forward_ref_error(
                                design,
                                id,
                                "in a children list",
                                component_name,
                            ));
                        }
                    }
                }
            }
            FrameBodyItem::FrameProp { frame, name, .. } => {
                // `self.prop` targets the enclosing component root — not a `let` id.
                if frame != "self"
                    && !declared.contains(frame)
                    && !param_names.contains(frame)
                    && all_frame_ids.contains(frame)
                {
                    return Err(forward_ref_error(
                        design,
                        frame,
                        &format!("in `{frame}.{name}`"),
                        component_name,
                    ));
                }
            }
            FrameBodyItem::Let { id, body, .. } => {
                declared.insert(id.clone());
                assert_forward_frame_visibility(
                    design,
                    body,
                    declared,
                    all_frame_ids,
                    param_names,
                    component_name,
                )?;
            }
            FrameBodyItem::LetInstance { id, .. } => {
                declared.insert(id.clone());
            }
            FrameBodyItem::If { chain } => {
                for br in &chain.branches {
                    assert_forward_frame_visibility(
                        design,
                        &br.body,
                        declared,
                        all_frame_ids,
                        param_names,
                        component_name,
                    )?;
                }
                if let Some(else_body) = &chain.else_body {
                    assert_forward_frame_visibility(
                        design,
                        else_body,
                        declared,
                        all_frame_ids,
                        param_names,
                        component_name,
                    )?;
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
    let params = effective_params(design, c)?;
    let pmap: HashMap<&str, &crate::ast::ComponentParam> =
        params.iter().map(|p| (p.name.as_str(), p)).collect();
    let caller_params: HashMap<String, String> = params
        .iter()
        .map(|p| (p.name.clone(), p.type_name.clone()))
        .collect();
    let Some(fm) = design.fixtures.get(component_name) else {
        return Ok(());
    };
    for ex in fm.values() {
        if let Some(name) = ex.host.as_deref() {
            resolve_active_host(design, Some(name))?;
        }
        if let Some(name) = ex.theme.as_deref() {
            if design.catalogs.contains_key(name) {
                return Err(err(
                    "PDL-E049",
                    format!(
                        "`{name}` is a catalog, not a theme; fixture \"{}\" cannot set theme to a catalog",
                        ex.label
                    ),
                    design,
                ));
            }
            if !design.themes.contains_key(name) {
                return Err(err(
                    "PDL-E005",
                    format!("Unknown theme `{name}` in fixture \"{}\"", ex.label),
                    design,
                ));
            }
        }
        if let Some(raw) = ex.host_facts.as_deref() {
            match serde_json::from_str::<serde_json::Value>(raw) {
                Ok(serde_json::Value::Object(_)) => {}
                Ok(_) => {
                    return Err(err(
                        "PDL-E050",
                        format!(
                            "hostFacts in fixture \"{}\" must be a JSON object",
                            ex.label
                        ),
                        design,
                    ));
                }
                Err(e) => {
                    return Err(err(
                        "PDL-E050",
                        format!(
                            "hostFacts in fixture \"{}\" is not valid JSON: {e}",
                            ex.label
                        ),
                        design,
                    ));
                }
            }
        }
        let mut presenters = HashSet::new();
        presenter_lets_in_body(&c.body, &mut presenters);
        for b in &ex.bindings {
            if let Some((let_id, field)) = b.name.split_once('.') {
                if presenters.contains(let_id) {
                    if field == "cover" {
                        validate_presenter_cover_pin(
                            design,
                            component_name,
                            &ex.label,
                            let_id,
                            &b.value,
                        )?;
                        continue;
                    }
                    return Err(err(
                        "PDL-E055",
                        format!(
                            "Fixture \"{}\" unknown presenter field `{field}` \
                             (use `{let_id}` for the stack or `{let_id}.cover`)",
                            ex.label
                        ),
                        design,
                    ));
                }
            }
            if presenters.contains(&b.name) {
                validate_presenter_stack_pin(design, component_name, &ex.label, &b.name, &b.value)?;
                continue;
            }
            let Some(p) = pmap.get(b.name.as_str()) else {
                return Err(err(
                    "PDL-E007",
                    format!(
                        "Unknown parameter `{}` in fixture \"{}\" (component {})",
                        b.name, ex.label, component_name
                    ),
                    design,
                ));
            };
            assert_param_value_compatible(
                design,
                &p.type_name,
                &b.value,
                &caller_params,
                &format!(
                    "in fixture \"{}\" for `{}.{}`",
                    ex.label, component_name, b.name
                ),
            )?;
        }
    }
    Ok(())
}

fn play_name(value: &ValueExpr) -> Option<&str> {
    match value {
        ValueExpr::DotEnum { value } => Some(value.trim_start_matches('.')),
        _ => None,
    }
}

fn presentation_motion_ident_name(name: &str) -> &str {
    name.strip_suffix(".reversed").unwrap_or(name)
}

fn validate_presentation_motion_value(
    design: &DesignDefinition,
    value: &ValueExpr,
    where_: &str,
    component_name: &str,
) -> Result<(), PdlError> {
    match value {
        ValueExpr::PresentationMotion { switch_at, .. } => {
            if let Some(p) = switch_at {
                validate_switch_at_ms(design, p, &format!("{where_} switchAt"))?;
            }
            Ok(())
        }
        ValueExpr::Ident { name } => {
            let base = presentation_motion_ident_name(name);
            match token_type_of(design, base).as_deref() {
                Some("PresentationMotion") => Ok(()),
                Some(t) => Err(err(
                    "PDL-E005",
                    format!("{where_} must be a PresentationMotion (got {t}) in {component_name}"),
                    design,
                )),
                None => Err(err(
                    "PDL-E005",
                    format!(
                        "{where_} must be a PresentationMotion (unknown `{base}`) in {component_name}"
                    ),
                    design,
                )),
            }
        }
        _ => Err(err(
            "PDL-E005",
            format!("{where_} must be a PresentationMotion in {component_name}"),
            design,
        )),
    }
}

fn bezier_coord(
    design: &DesignDefinition,
    value: &ValueExpr,
    label: &str,
    where_: &str,
) -> Result<f64, PdlError> {
    match value {
        ValueExpr::Number { value: n } if n.is_finite() => Ok(*n),
        _ => Err(err(
            "PDL-E005",
            format!("{where_}: Ease.bezier {label} must be a number"),
            design,
        )),
    }
}

fn validate_ease_bezier(
    design: &DesignDefinition,
    x1: &ValueExpr,
    y1: &ValueExpr,
    x2: &ValueExpr,
    y2: &ValueExpr,
    where_: &str,
) -> Result<(), PdlError> {
    let x1 = bezier_coord(design, x1, "x1", where_)?;
    bezier_coord(design, y1, "y1", where_)?;
    let x2 = bezier_coord(design, x2, "x2", where_)?;
    bezier_coord(design, y2, "y2", where_)?;
    if !(0.0..=1.0).contains(&x1) {
        return Err(err(
            "PDL-E005",
            format!("{where_}: Ease.bezier x1 must be 0…1 (got {x1})"),
            design,
        ));
    }
    if !(0.0..=1.0).contains(&x2) {
        return Err(err(
            "PDL-E005",
            format!("{where_}: Ease.bezier x2 must be 0…1 (got {x2})"),
            design,
        ));
    }
    Ok(())
}

fn validate_switch_at_ms(
    design: &DesignDefinition,
    value: &ValueExpr,
    where_: &str,
) -> Result<(), PdlError> {
    let ValueExpr::Number { value: n } = value else {
        return Ok(());
    };
    if !n.is_finite() || *n < 0.0 {
        return Err(err(
            "PDL-E005",
            format!("{where_} must be a non-negative Duration in milliseconds"),
            design,
        ));
    }
    if *n > 0.0 && *n < 1.0 {
        return Err(err(
            "PDL-E005",
            format!("{where_} is milliseconds, not 0…1 (got {n})"),
            design,
        ));
    }
    Ok(())
}

fn validate_ease_value(
    design: &DesignDefinition,
    value: &ValueExpr,
    where_: &str,
) -> Result<(), PdlError> {
    match value {
        ValueExpr::EaseBezier { x1, y1, x2, y2 } => {
            validate_ease_bezier(design, x1, y1, x2, y2, where_)
        }
        ValueExpr::DotEnum { value } => {
            let raw = value.trim_start_matches('.');
            if raw == "linear" || raw == "in" || raw == "out" {
                Ok(())
            } else {
                Err(err(
                    "PDL-E005",
                    format!(
                        "{where_} must be `.linear`, `.in`, `.out`, or `Ease.bezier(x1, y1, x2, y2)`"
                    ),
                    design,
                ))
            }
        }
        ValueExpr::Ident { name } => match token_type_of(design, name).as_deref() {
            Some("Ease") => Ok(()),
            Some(t) => Err(err(
                "PDL-E005",
                format!("{where_} must be an Ease (got {t})"),
                design,
            )),
            None => Err(err(
                "PDL-E005",
                format!("{where_} must be an Ease (unknown `{name}`)"),
                design,
            )),
        },
        ValueExpr::String { .. } => Err(err(
            "PDL-E005",
            format!(
                "{where_} must be `.linear`, `.in`, `.out`, or `Ease.bezier(x1, y1, x2, y2)` — not a CSS string"
            ),
            design,
        )),
        _ => Err(err(
            "PDL-E005",
            format!(
                "{where_} must be `.linear`, `.in`, `.out`, or `Ease.bezier(x1, y1, x2, y2)`"
            ),
            design,
        )),
    }
}

fn validate_transition_value(
    design: &DesignDefinition,
    value: &ValueExpr,
    where_: &str,
) -> Result<(), PdlError> {
    match value {
        ValueExpr::Timing { ease, .. } => validate_ease_value(design, ease, where_),
        ValueExpr::Ident { name } => match token_type_of(design, name).as_deref() {
            Some("Timing") => Ok(()),
            Some(t) => Err(err(
                "PDL-E005",
                format!("{where_} must be a Timing (got {t})"),
                design,
            )),
            None => Err(err(
                "PDL-E005",
                format!("{where_} must be a Timing token or `Timing(…)` (unknown `{name}`)"),
                design,
            )),
        },
        _ => Err(err(
            "PDL-E005",
            format!("{where_} must be a Timing token or `Timing(duration:, ease: [, delay:])`"),
            design,
        )),
    }
}

fn validate_pose_value(
    design: &DesignDefinition,
    value: &ValueExpr,
    component_name: &str,
) -> Result<(), PdlError> {
    match value {
        ValueExpr::Ident { name } => match token_type_of(design, name).as_deref() {
            Some("Pose") => Ok(()),
            Some(t) => Err(err(
                "PDL-E005",
                format!("Motion `pose:` must be a Pose (got {t}) in {component_name}"),
                design,
            )),
            None => Err(err(
                "PDL-E005",
                format!("Motion `pose:` must be a Pose (unknown `{name}`) in {component_name}"),
                design,
            )),
        },
        ValueExpr::Pose { props } => {
            for (key, field) in props {
                if !is_motion_prop_name(key) {
                    continue;
                }
                match field {
                    ValueExpr::Number { value: n } => {
                        if (key == "opacity" || key == "originX" || key == "originY")
                            && (*n < 0.0 || *n > 1.0)
                        {
                            return Err(err(
                                "PDL-E005",
                                format!(
                                    "Pose `{key}` must be a number in 0…1 (got {n}) in {component_name}"
                                ),
                                design,
                            ));
                        }
                    }
                    ValueExpr::Ident { .. } => {}
                    _ => {
                        return Err(err(
                            "PDL-E005",
                            format!("Pose `{key}` must be a number in {component_name}"),
                            design,
                        ));
                    }
                }
            }
            Ok(())
        }
        _ => Err(err(
            "PDL-E005",
            format!("Motion `pose:` must be `Pose(…)` or a Pose token in {component_name}"),
            design,
        )),
    }
}

fn validate_stagger_value(
    design: &DesignDefinition,
    value: &ValueExpr,
    component_name: &str,
) -> Result<(), PdlError> {
    match value {
        ValueExpr::Ident { name } => match token_type_of(design, name).as_deref() {
            Some("Stagger") => Ok(()),
            Some(t) => Err(err(
                "PDL-E005",
                format!("Motion `stagger:` must be a Stagger (got {t}) in {component_name}"),
                design,
            )),
            None => Err(err(
                "PDL-E005",
                format!(
                    "Motion `stagger:` must be a Stagger (unknown `{name}`) in {component_name}"
                ),
                design,
            )),
        },
        ValueExpr::Stagger { step, .. } => match step.as_ref() {
            ValueExpr::Number { value: n } if *n < 0.0 => Err(err(
                "PDL-E005",
                format!("Stagger `step:` must be a non-negative Duration in {component_name}"),
                design,
            )),
            ValueExpr::Number { .. } => Ok(()),
            ValueExpr::Ident { name } => match token_type_of(design, name).as_deref() {
                Some(t) if t != "Duration" => Err(err(
                    "PDL-E005",
                    format!("Stagger `step:` must be a Duration (got {t}) in {component_name}"),
                    design,
                )),
                _ => Ok(()),
            },
            _ => Err(err(
                "PDL-E005",
                format!("Stagger `step:` must be a Duration / milliseconds in {component_name}"),
                design,
            )),
        },
        _ => Err(err(
            "PDL-E005",
            format!(
                "Motion `stagger:` must be `Stagger(…)` or a Stagger token in {component_name}"
            ),
            design,
        )),
    }
}

fn validate_keys_value(
    design: &DesignDefinition,
    value: &ValueExpr,
    component_name: &str,
) -> Result<(), PdlError> {
    let ValueExpr::Array { items } = value else {
        return Err(err(
            "PDL-E005",
            format!("Motion `keys:` must be a non-empty list of Key in {component_name}"),
            design,
        ));
    };
    if items.is_empty() {
        return Err(err(
            "PDL-E005",
            format!("Motion `keys:` must be a non-empty list of Key in {component_name}"),
            design,
        ));
    }
    for item in items {
        let ValueExpr::Key { pose, at, ease } = item else {
            return Err(err(
                "PDL-E005",
                format!("Motion `keys:` entries must be `Key(…)` in {component_name}"),
                design,
            ));
        };
        let rest = matches!(
            pose.as_ref(),
            ValueExpr::DotEnum { value } if value.trim_start_matches('.') == "rest"
        );
        if !rest {
            validate_pose_value(design, pose, component_name)?;
        }
        if let ValueExpr::Number { value } = at.as_ref() {
            if *value < 0.0 || *value > 1.0 {
                return Err(err(
                    "PDL-E005",
                    format!("Key `at:` must be 0…1 (got {value}) in {component_name}"),
                    design,
                ));
            }
        }
        if let Some(e) = ease {
            validate_ease_value(design, e, &format!("Key `ease:` in {component_name}"))?;
        }
    }
    Ok(())
}

fn motion_field_is_pose(design: &DesignDefinition, value: &ValueExpr) -> bool {
    match value {
        ValueExpr::Pose { .. } => true,
        ValueExpr::Ident { name } => token_type_of(design, name).as_deref() == Some("Pose"),
        _ => false,
    }
}

fn motion_field_is_stagger(design: &DesignDefinition, value: &ValueExpr) -> bool {
    match value {
        ValueExpr::Stagger { .. } => true,
        ValueExpr::Ident { name } => token_type_of(design, name).as_deref() == Some("Stagger"),
        _ => false,
    }
}

struct MotionFields<'a> {
    pose: Option<&'a ValueExpr>,
    keys: Option<&'a ValueExpr>,
    play: Option<&'a ValueExpr>,
    repeat: Option<&'a ValueExpr>,
    stagger: Option<&'a ValueExpr>,
}

fn motion_token_value<'a>(design: &'a DesignDefinition, name: &str) -> Option<&'a ValueExpr> {
    design
        .semantics
        .get(name)
        .map(|s| &s.value)
        .or_else(|| design.primitives.get(name).map(|p| &p.value))
}

fn flatten_motion_fields<'a>(
    design: &'a DesignDefinition,
    value: &'a ValueExpr,
    depth: u8,
) -> MotionFields<'a> {
    if depth > 8 {
        return MotionFields {
            pose: None,
            keys: None,
            play: None,
            repeat: None,
            stagger: None,
        };
    }
    match value {
        ValueExpr::Ident { name } => motion_token_value(design, name)
            .map(|inner| flatten_motion_fields(design, inner, depth + 1))
            .unwrap_or(MotionFields {
                pose: None,
                keys: None,
                play: None,
                repeat: None,
                stagger: None,
            }),
        ValueExpr::Motion {
            base,
            pose,
            keys,
            play,
            repeat,
            stagger,
            ..
        } => {
            let from_base = base
                .as_ref()
                .map(|b| flatten_motion_fields(design, b, depth + 1));
            MotionFields {
                pose: pose.as_deref().or(from_base.as_ref().and_then(|b| b.pose)),
                keys: keys.as_deref().or(from_base.as_ref().and_then(|b| b.keys)),
                play: play.as_deref().or(from_base.as_ref().and_then(|b| b.play)),
                repeat: repeat
                    .as_deref()
                    .or(from_base.as_ref().and_then(|b| b.repeat)),
                stagger: stagger
                    .as_deref()
                    .or(from_base.as_ref().and_then(|b| b.stagger)),
            }
        }
        _ => MotionFields {
            pose: None,
            keys: None,
            play: None,
            repeat: None,
            stagger: None,
        },
    }
}

fn validate_motion_base(
    design: &DesignDefinition,
    base: &ValueExpr,
    component_name: &str,
) -> Result<(), PdlError> {
    match base {
        ValueExpr::Ident { name } => match token_type_of(design, name).as_deref() {
            Some("Motion") => Ok(()),
            Some(t) => Err(err(
                "PDL-E005",
                format!("Motion copy base must be a Motion token (got {t}) in {component_name}"),
                design,
            )),
            None => Err(err(
                "PDL-E005",
                format!(
                    "Motion copy base must be a Motion token in {component_name} (unknown `{name}`)"
                ),
                design,
            )),
        },
        ValueExpr::Motion { .. } => validate_animate_motion(design, base, component_name, ""),
        _ => Err(err(
            "PDL-E005",
            format!("Motion copy base must be a Motion token in {component_name}"),
            design,
        )),
    }
}

fn validate_animate_motion(
    design: &DesignDefinition,
    value: &ValueExpr,
    component_name: &str,
    _event: &str,
) -> Result<(), PdlError> {
    match value {
        ValueExpr::Timing { ease, .. } => {
            validate_ease_value(design, ease, &format!("`animate =` Timing in {component_name}"))
        }
        ValueExpr::Ident { name } => match token_type_of(design, name).as_deref() {
            Some("Timing") | Some("Motion") => Ok(()),
            Some(t) => Err(err(
                "PDL-E005",
                format!("`animate =` must be a Motion or Timing (got {t}) in {component_name}"),
                design,
            )),
            None => Err(err(
                "PDL-E005",
                format!(
                    "`animate =` must be a Motion or Timing in {component_name} (unknown `{name}`)"
                ),
                design,
            )),
        },
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
                validate_motion_base(design, b, component_name)?;
            }
            if let Some(t) = timing {
                validate_transition_value(
                    design,
                    t,
                    &format!("Motion `timing:` in {component_name}"),
                )?;
            } else if base.is_none() {
                return Err(err(
                    "PDL-E005",
                    format!("Motion requires `timing:` in {component_name}"),
                    design,
                ));
            }
            if let Some(p) = pose {
                validate_pose_value(design, p, component_name)?;
            }
            if let Some(k) = keys {
                validate_keys_value(design, k, component_name)?;
            }
            if let Some(p) = play {
                let name = play_name(p);
                if name != Some("toRest") && name != Some("toPose") && name != Some("loop") {
                    return Err(err(
                        "PDL-E005",
                        format!(
                            "Motion `play:` must be `.toRest`, `.toPose`, or `.loop` in {component_name}"
                        ),
                        design,
                    ));
                }
            }
            if let Some(r) = repeat {
                match r.as_ref() {
                    ValueExpr::Number { value } if value.fract() == 0.0 && *value >= 1.0 => {}
                    ValueExpr::Ident { .. } => {}
                    ValueExpr::Number { value } => {
                        return Err(err(
                            "PDL-E005",
                            format!(
                                "Motion `repeat:` must be an integer ≥ 1 (got {value}) in {component_name}"
                            ),
                            design,
                        ));
                    }
                    _ => {
                        return Err(err(
                            "PDL-E005",
                            format!("Motion `repeat:` must be a finite count in {component_name}"),
                            design,
                        ));
                    }
                }
            }
            if let Some(s) = stagger {
                validate_stagger_value(design, s, component_name)?;
            }
            let flat = flatten_motion_fields(design, value, 0);
            let has_pose = flat.pose.is_some_and(|p| motion_field_is_pose(design, p));
            let has_keys = flat.keys.is_some();
            let has_path = has_pose || has_keys;
            let has_stagger = flat
                .stagger
                .is_some_and(|s| motion_field_is_stagger(design, s));
            if has_pose && has_keys {
                return Err(err(
                    "PDL-E005",
                    format!("Motion cannot take both `pose:` and `keys:` in {component_name}"),
                    design,
                ));
            }
            if has_stagger && !has_path {
                return Err(err(
                    "PDL-E005",
                    format!("Motion `stagger:` requires `pose:` or `keys:` in {component_name}"),
                    design,
                ));
            }
            if flat.play.and_then(play_name) == Some("loop") && flat.repeat.is_some() {
                return Err(err(
                    "PDL-E005",
                    format!(
                        "Motion `play: .loop` is forever — do not set `repeat:` in {component_name}"
                    ),
                    design,
                ));
            }
            if flat.repeat.is_some() && !has_path {
                return Err(err(
                    "PDL-E005",
                    format!("Motion `repeat:` requires `pose:` or `keys:` in {component_name}"),
                    design,
                ));
            }
            Ok(())
        }
        _ => Err(err(
            "PDL-E005",
            format!(
                "`animate =` must be `Motion(…)` or a Transition token/tuple in {component_name}"
            ),
            design,
        )),
    }
}

fn validate_blur_effect_conflict_in_body(
    design: &DesignDefinition,
    items: &[FrameBodyItem],
    component_name: &str,
) -> Result<(), PdlError> {
    let mut seen: HashMap<String, HashSet<String>> = HashMap::new();
    for item in items {
        match item {
            FrameBodyItem::Prop { name, value } | FrameBodyItem::FrameProp { name, value, .. }
                if name == "blur" || name == "effect" =>
            {
                if matches!(value, ValueExpr::Null) {
                    continue;
                }
                let target = match item {
                    FrameBodyItem::FrameProp { frame, .. } => frame.as_str(),
                    _ => "self",
                };
                let set = seen.entry(target.to_string()).or_default();
                set.insert(name.clone());
                if set.contains("blur") && set.contains("effect") {
                    return Err(err(
                        "PDL-E005",
                        format!(
                            "`blur =` and `effect =` are the same slot — use one in {component_name}"
                        ),
                        design,
                    ));
                }
            }
            FrameBodyItem::Let { body, .. } | FrameBodyItem::ForEach { body, .. } => {
                validate_blur_effect_conflict_in_body(design, body, component_name)?;
            }
            FrameBodyItem::If { chain } => {
                for br in &chain.branches {
                    validate_blur_effect_conflict_in_body(design, &br.body, component_name)?;
                }
                if let Some(else_body) = &chain.else_body {
                    validate_blur_effect_conflict_in_body(design, else_body, component_name)?;
                }
            }
            _ => {}
        }
    }
    Ok(())
}

fn validate_frame_animate_in_body(
    design: &DesignDefinition,
    items: &[FrameBodyItem],
    component_name: &str,
) -> Result<(), PdlError> {
    for item in items {
        match item {
            FrameBodyItem::Prop { name, value } | FrameBodyItem::FrameProp { name, value, .. }
                if name == "animate" =>
            {
                validate_animate_motion(design, value, component_name, "frame")?;
            }
            FrameBodyItem::Let { body, .. } | FrameBodyItem::ForEach { body, .. } => {
                validate_frame_animate_in_body(design, body, component_name)?;
            }
            FrameBodyItem::If { chain } => {
                for br in &chain.branches {
                    validate_frame_animate_in_body(design, &br.body, component_name)?;
                }
                if let Some(else_body) = &chain.else_body {
                    validate_frame_animate_in_body(design, else_body, component_name)?;
                }
            }
            _ => {}
        }
    }
    Ok(())
}

fn validate_interaction_body(
    design: &DesignDefinition,
    items: &[InteractionHandlerItem],
    param_by_name: &HashMap<String, String>,
    component_name: &str,
    event: &str,
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
            InteractionHandlerItem::Animate { value } => {
                validate_animate_motion(design, value, component_name, event)?;
            }
            InteractionHandlerItem::HostVerb {
                qualifier,
                name,
                args,
            } => {
                validate_host_verb_call(
                    design,
                    component_name,
                    qualifier.as_deref(),
                    name,
                    args,
                    param_by_name,
                )?;
            }
            InteractionHandlerItem::If { chain } => {
                for br in &chain.branches {
                    validate_condition_expr(design, &br.condition, param_by_name, component_name)?;
                    validate_interaction_body(
                        design,
                        &br.body,
                        param_by_name,
                        component_name,
                        event,
                    )?;
                }
                if let Some(else_body) = &chain.else_body {
                    validate_interaction_body(
                        design,
                        else_body,
                        param_by_name,
                        component_name,
                        event,
                    )?;
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
            InteractionHandlerItem::HostVerb {
                qualifier, name, ..
            } => {
                // Bare verbs require this component's host protocol; let-qualified
                // verbs are validated against the target let (see validate_host_verb_call).
                if qualifier.is_none() {
                    if let Some(p) = host_protocol_for_verb(name) {
                        needed.insert(p);
                    }
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

/// Every `host` profile in the design must share param names and types (defaults may differ).
fn validate_host_profile_shapes(design: &DesignDefinition) -> Result<(), PdlError> {
    if design.hosts.len() < 2 {
        return Ok(());
    }
    let mut names: Vec<&str> = design.hosts.keys().map(|s| s.as_str()).collect();
    names.sort();
    let first_name = names[0];
    let first = &design.hosts[first_name];
    let first_shape: HashSet<(String, String, bool)> = first
        .params
        .iter()
        .map(|p| (p.name.clone(), p.type_name.clone(), p.is_array))
        .collect();
    for other_name in &names[1..] {
        let other = &design.hosts[*other_name];
        let other_shape: HashSet<(String, String, bool)> = other
            .params
            .iter()
            .map(|p| (p.name.clone(), p.type_name.clone(), p.is_array))
            .collect();
        if first_shape != other_shape {
            return Err(err(
                "PDL-E045",
                format!(
                    "Host profiles `{first_name}` and `{other_name}` must share the same param names and types (defaults may differ)"
                ),
                design,
            ));
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
                    "Prelude host protocol `{name}` cannot be redefined as an API protocol \
                     (keep `protocol {name} {{ host … }}` / stdlib `host_protocols.pdl`, or omit — it is always in scope)"
                ),
                design,
            ));
        }
    }
    Ok(())
}

/// Prelude `Page` is an API protocol. Restate as `protocol Page: component { }`; not `{ host }`.
fn validate_page_protocol_prelude(design: &DesignDefinition) -> Result<(), PdlError> {
    let Some(p) = design.protocols.get(crate::design::PAGE_PROTOCOL_PRELUDE) else {
        return Ok(());
    };
    if p.role != crate::ast::ProtocolRole::Api {
        return Err(err(
            "PDL-E032",
            "Prelude `Page` cannot be redefined as a host protocol \
             (keep `protocol Page: component { }` / stdlib `page_protocols.pdl`, or omit — it is always in scope)"
                .into(),
            design,
        ));
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
                    format!("Protocol `{}` requires unknown protocol `{dep}`", p.name),
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
            validate_interaction_body(design, &h.body, &param_by_name, component_name, &h.event)?;
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
    if let Some(base) = name.strip_suffix(".reversed") {
        let t = design
            .primitives
            .get(base)
            .map(|p| p.token_type.clone())
            .or_else(|| design.semantics.get(base).map(|s| s.token_type.clone()));
        return t.filter(|ty| ty == "PresentationMotion");
    }
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
        ValueExpr::Timing {
            duration,
            ease,
            delay,
        } => {
            validate_opacity_sides(design, duration)?;
            validate_opacity_sides(design, ease)?;
            if let Some(d) = delay {
                validate_opacity_sides(design, d)?;
            }
            Ok(())
        }
        ValueExpr::Pose { props } => {
            for v in props.values() {
                validate_opacity_sides(design, v)?;
            }
            Ok(())
        }
        ValueExpr::Stagger { step, from } => {
            validate_opacity_sides(design, step)?;
            if let Some(f) = from {
                validate_opacity_sides(design, f)?;
            }
            Ok(())
        }
        ValueExpr::Key { pose, at, ease } => {
            validate_opacity_sides(design, pose)?;
            validate_opacity_sides(design, at)?;
            if let Some(e) = ease {
                validate_opacity_sides(design, e)?;
            }
            Ok(())
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
                validate_opacity_sides(design, b)?;
            }
            if let Some(t) = timing {
                validate_opacity_sides(design, t)?;
            }
            if let Some(p) = pose {
                validate_opacity_sides(design, p)?;
            }
            if let Some(k) = keys {
                validate_opacity_sides(design, k)?;
            }
            if let Some(p) = play {
                validate_opacity_sides(design, p)?;
            }
            if let Some(r) = repeat {
                validate_opacity_sides(design, r)?;
            }
            if let Some(s) = stagger {
                validate_opacity_sides(design, s)?;
            }
            Ok(())
        }
        ValueExpr::Effect {
            effect_kind,
            radius,
            vibrancy,
        } => {
            validate_opacity_sides(design, effect_kind)?;
            if let Some(r) = radius {
                validate_opacity_sides(design, r)?;
            }
            if let Some(v) = vibrancy {
                validate_opacity_sides(design, v)?;
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
        "Duration" => "a non-negative number",
        "Blur" => {
            "`Blur(radius: … [, style:] [, vibrancy:])` (radius is a Radius / number — not a bare number token)"
        }
        "FontFamily" => "a string",
        "Ease" => "`.linear`, `.in`, `.out`, or `Ease.bezier(x1, y1, x2, y2)`",
        "Icon" => {
            "`IconRef(file: \"…\")`, `IconRef(system: .sfSymbols|.materialSymbols, name: \"…\")`, or a pack-relative path string"
        }
        "MediaSource" => {
            "`MediaSource(file: \"…\" [, kind:, format:])`, `MediaSource(url: \"…\" [, kind:, format:])`, an http(s) URL, or a pack-relative path string"
        }
        "Timing" => "`Timing(duration:, ease: [, delay:])`",
        "Pose" => "`Pose(opacity:, scale:, …)`",
        "Stagger" => "`Stagger(step: … [, from: .first|.last])`",
        "Motion" => {
            "`Motion(timing: … [, play:] [, pose:] [, keys:] [, stagger:] [, repeat:])`, `Motion(token, field:)`, or a Timing"
        }
        "PresentationMotion" => {
            "`PresentationMotion(incoming:, outgoing: [, duration:] [, ease:] [, delay:] [, front:] [, switchAt:])`"
        }
        "Effect" => {
            "`Effect(.blurSelf | .blurBehind, radius: [, vibrancy:])` (`.glass` is not implemented yet)"
        }
        "Vibrancy" => "`Vibrancy(saturation: …, brightness: …)`",
        "Ramp" => "a ramp literal `(direction: …, stops: […])` or `Ramp(…)`",
        "Sizing" => {
            "a sizing literal (`.hug` / `Sizing.hug`, `.fill`, `.fixed(n)`, `.flex(…)`, `.aspect(16:9)`)"
        }
        "Background" | "Foreground" => "a color, layer list `[…]`, or layer constructor",
        "EdgeInsets" => "`EdgeInsets(x:, y:)` or `EdgeInsets(top:, right:, bottom:, left:)`",
        "CornerRadii" => "`Corner(tl:, tr:, br:, bl:)`",
        "GradientStop" => "`GradientStop(…)`",
        "Media" => "`MediaLayer(source:, contentMode: …)`",
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
        ValueExpr::Instance { .. } => "instance",
        ValueExpr::Timing { .. } => "timing",
        ValueExpr::Pose { .. } => "pose",
        ValueExpr::Stagger { .. } => "stagger",
        ValueExpr::Key { .. } => "key",
        ValueExpr::Motion { .. } => "motion",
        ValueExpr::Effect { .. } => "effect",
        ValueExpr::VibrancyTuple { .. } => "vibrancyTuple",
        ValueExpr::RampInline { .. } => "rampInline",
        ValueExpr::Sizing { .. } => "sizing",
        ValueExpr::Call { .. } => "call",
        ValueExpr::GradientStop { .. } => "gradientStop",
        ValueExpr::EaseBezier { .. } => "easeBezier",
        ValueExpr::PresentationMotion { .. } => "presentationMotion",
    }
}

fn is_shadow_axis_token_type(token_type: &str) -> bool {
    matches!(
        token_type,
        "Distance" | "Radius" | "Size" | "Weight" | "Ratio" | "Duration"
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
                    format!("Shadow `{token_name}` field `{field}` must be a non-negative number"),
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

fn assert_icon_ref_fields(
    design: &DesignDefinition,
    token_name: &str,
    value: &ValueExpr,
) -> Result<(), PdlError> {
    match value {
        ValueExpr::IconFile { path } => match path.as_ref() {
            ValueExpr::String { value: s } if is_pack_relative_file_path(s) => Ok(()),
            ValueExpr::String { value: s } => {
                let hint = if s.starts_with('/') {
                    " — no leading `/` (pack-relative, not site root)"
                } else {
                    ""
                };
                Err(err(
                    "PDL-E005",
                    format!(
                        "Icon `{token_name}` file path must be pack-relative (e.g. `icons/star.svg`); got `{s}`{hint}"
                    ),
                    design,
                ))
            }
            _ => Err(err(
                "PDL-E005",
                format!(
                    "Icon `{token_name}` file path must be a pack-relative string (e.g. `icons/star.svg`)"
                ),
                design,
            )),
        },
        ValueExpr::IconSystem { system, name } => {
            match name.as_ref() {
                ValueExpr::String { value: s } if !s.is_empty() => {}
                _ => {
                    return Err(err(
                        "PDL-E005",
                        format!("Icon `{token_name}` system ref requires a non-empty name string"),
                        design,
                    ));
                }
            }
            let sys_raw = match system.as_ref() {
                ValueExpr::DotEnum { value } => value.as_str(),
                ValueExpr::Ident { name } => name.as_str(),
                ValueExpr::String { value } => value.as_str(),
                _ => "",
            };
            if normalize_icon_system_name(sys_raw).is_none() {
                return Err(err(
                    "PDL-E006",
                    format!(
                        "Icon `{token_name}` unknown system (expected .sfSymbols or .materialSymbols)"
                    ),
                    design,
                ));
            }
            Ok(())
        }
        _ => Ok(()),
    }
}

fn assert_media_source_meta(
    design: &DesignDefinition,
    token_name: &str,
    media_kind: &Option<Box<ValueExpr>>,
    format: &Option<Box<ValueExpr>>,
) -> Result<(), PdlError> {
    use crate::asset_refs::{
        media_kind_for_format, normalize_media_format_name, normalize_media_kind_name,
    };
    let mk = if let Some(k) = media_kind {
        let raw = match k.as_ref() {
            ValueExpr::DotEnum { value } | ValueExpr::Ident { name: value } => value.as_str(),
            _ => {
                return Err(err(
                    "PDL-E006",
                    format!("MediaSource `{token_name}` kind must be .raster, .vector, or .video"),
                    design,
                ))
            }
        };
        let Some(n) = normalize_media_kind_name(raw) else {
            return Err(err(
                "PDL-E006",
                format!(
                    "MediaSource `{token_name}` unknown kind `{raw}` (expected .raster, .vector, or .video)"
                ),
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
                        "MediaSource `{token_name}` format must be a closed case (.webp|.jpeg|.png|.gif|.svg|.mp4|.webm|.pdf)"
                    ),
                    design,
                ))
            }
        };
        let Some(n) = normalize_media_format_name(raw) else {
            return Err(err(
                "PDL-E006",
                format!("MediaSource `{token_name}` unknown format `{raw}`"),
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
                format!(
                    "MediaSource `{token_name}` kind `.{mk}` is incompatible with format `.{fmt}` (expected `.{expected}`)"
                ),
                design,
            ));
        }
    }
    Ok(())
}

fn assert_media_source_ref_fields(
    design: &DesignDefinition,
    token_name: &str,
    value: &ValueExpr,
) -> Result<(), PdlError> {
    match value {
        ValueExpr::MediaSourceFile {
            path,
            media_kind,
            format,
        } => {
            assert_media_source_meta(design, token_name, media_kind, format)?;
            match path.as_ref() {
                ValueExpr::String { value: s } if is_pack_relative_file_path(s) => Ok(()),
                _ => Err(err(
                    "PDL-E005",
                    format!(
                        "MediaSource `{token_name}` file path must be a pack-relative string (e.g. `media/hero.jpg`)"
                    ),
                    design,
                )),
            }
        }
        ValueExpr::MediaSourceUrl {
            url,
            media_kind,
            format,
        } => {
            assert_media_source_meta(design, token_name, media_kind, format)?;
            match url.as_ref() {
                ValueExpr::String { value: s } if is_http_url(s) => Ok(()),
                _ => Err(err(
                    "PDL-E005",
                    format!("MediaSource `{token_name}` url must be an http(s) string"),
                    design,
                )),
            }
        }
        _ => Ok(()),
    }
}

/// One gate for every TokenType RHS shape (`shared/frame-props.json`).
/// Bare `Ident` is accepted here; primitive/semantic alias rules run separately.
fn assert_token_rhs_compatible(
    design: &DesignDefinition,
    name: &str,
    token_type: &str,
    value: &ValueExpr,
) -> Result<(), PdlError> {
    if matches!(value, ValueExpr::Null) {
        return Err(err(
            "PDL-E005",
            format!(
                "Token `{name}` has type {token_type} and must be {} (got null); `null` unsets frame properties, not token values",
                token_rhs_expectation(token_type)
            ),
            design,
        ));
    }
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
        "Duration" => matches!(value, ValueExpr::Number { value: n } if *n >= 0.0),
        "Blur" => matches!(
            value,
            ValueExpr::Call {
                callee: CallCallee::Blur,
                ..
            }
        ),
        "FontFamily" => matches!(value, ValueExpr::String { .. }),
        "Ease" => match value {
            ValueExpr::EaseBezier { .. } => true,
            ValueExpr::DotEnum { value } => {
                let raw = value.trim_start_matches('.');
                raw == "linear" || raw == "in" || raw == "out"
            }
            _ => false,
        },
        "Icon" => match value {
            ValueExpr::IconFile { .. } | ValueExpr::IconSystem { .. } => true,
            ValueExpr::String { value: s } => is_pack_relative_file_path(s),
            _ => false,
        },
        "MediaSource" => match value {
            ValueExpr::MediaSourceFile { .. } | ValueExpr::MediaSourceUrl { .. } => true,
            ValueExpr::String { value: s } => is_http_url(s) || is_pack_relative_file_path(s),
            _ => false,
        },
        "Timing" => matches!(value, ValueExpr::Timing { .. }),
        "Pose" => matches!(value, ValueExpr::Pose { .. }),
        "Stagger" => matches!(value, ValueExpr::Stagger { .. }),
        "Motion" => matches!(
            value,
            ValueExpr::Motion { .. } | ValueExpr::Timing { .. }
        ),
        "PresentationMotion" => matches!(value, ValueExpr::PresentationMotion { .. }),
        "Effect" => matches!(
            value,
            ValueExpr::Effect { .. }
                | ValueExpr::Call {
                    callee: CallCallee::Blur,
                    ..
                }
        ),
        "Vibrancy" => matches!(
            value,
            ValueExpr::Call {
                callee: CallCallee::Vibrancy,
                ..
            }
        ),
        "Ramp" => matches!(
            value,
            ValueExpr::RampInline { .. }
                | ValueExpr::Call {
                    callee: CallCallee::Ramp,
                    ..
                }
        ),
        "Sizing" => match value {
            ValueExpr::Sizing { .. } => true,
            // Bare `.hug` / `.fill` parse as DotEnum (same spelling as ContentMode.fill).
            ValueExpr::DotEnum { value: v } => {
                let c = v.strip_prefix('.').unwrap_or(v.as_str());
                c == "hug" || c == "fill"
            }
            _ => false,
        },
        "Background" | "Foreground" => matches!(
            value,
            ValueExpr::Hex { .. }
                | ValueExpr::OpacityOf { .. }
                | ValueExpr::Array { .. }
                | ValueExpr::Call { .. }
        ),
        "EdgeInsets" => matches!(value, ValueExpr::EdgeInsets { .. }),
        "CornerRadii" => matches!(value, ValueExpr::Corner { .. }),
        "GradientStop" => matches!(value, ValueExpr::GradientStop { .. }),
        "Media" => matches!(
            value,
            ValueExpr::Call {
                callee: CallCallee::MediaLayer,
                ..
            }
        ),
        other => {
            use crate::param_types::host_enum_cases;
            if let Some(cases) = host_enum_cases(other) {
                match value {
                    ValueExpr::DotEnum { value: v } => {
                        let c = v.strip_prefix('.').unwrap_or(v.as_str());
                        cases.iter().any(|x| *x == c)
                    }
                    _ => false,
                }
            } else {
                false
            }
        }
    };

    if !ok {
        let detail = match (token_type, value) {
            ("Opacity", ValueExpr::Number { .. }) => " (out of range 0…1)".to_string(),
            ("Blur", ValueExpr::Number { .. }) => {
                " (use `Blur(radius: n)` — Blur is the layer object; radius amounts use Radius)"
                    .to_string()
            }
            ("Distance" | "Radius" | "Duration", ValueExpr::Number { .. }) => {
                " (must be non-negative)".to_string()
            }
            ("Icon", ValueExpr::String { value: s }) if s.starts_with('/') => {
                format!(
                    " (got `{s}` — pack-relative Icon paths must not start with `/`; use `icons/star.svg`)"
                )
            }
            ("Icon", ValueExpr::String { value: s }) if !is_pack_relative_file_path(s) => {
                format!(
                    " (got `{s}` — bare names are ambiguous; use `IconRef(system: .sfSymbols, name: \"…\")` or a pack path like `icons/star.svg`)"
                )
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
    if token_type == "Ease" {
        validate_ease_value(design, value, &format!("Token `{name}`"))?;
    }
    if token_type == "Motion" {
        if let ValueExpr::Motion { .. } = value {
            validate_animate_motion(design, value, name, "")?;
        }
        if let ValueExpr::Timing { ease, .. } = value {
            validate_ease_value(design, ease, &format!("Token `{name}`"))?;
        }
    }
    if token_type == "Timing" {
        if let ValueExpr::Timing { ease, .. } = value {
            validate_ease_value(design, ease, &format!("Token `{name}`"))?;
        }
    }
    if token_type == "PresentationMotion" {
        if let ValueExpr::PresentationMotion {
            ease,
            switch_at,
            ..
        } = value
        {
            if let Some(e) = ease {
                validate_ease_value(design, e, &format!("Token `{name}` ease"))?;
            }
            if let Some(p) = switch_at {
                validate_switch_at_ms(design, p, &format!("Token `{name}` switchAt"))?;
            }
        }
    }
    if token_type == "Effect" {
        if let ValueExpr::Effect { .. } = value {
            if let Err(e) =
                crate::frame_props::assert_effect_value(design, value, &format!("Token `{name}`"))
            {
                if e.code == "PDL-E040" || e.code == "PDL-E020" {
                    return Err(err("PDL-E005", e.message, design));
                }
                return Err(e);
            }
        }
        if let ValueExpr::Call {
            callee: CallCallee::Blur,
            args,
        } = value
        {
            if let Err(e) = crate::frame_props::assert_blur_call_compatible(
                design,
                args,
                &format!("Token `{name}`"),
            ) {
                if e.code == "PDL-E040" || e.code == "PDL-E020" {
                    return Err(err("PDL-E005", e.message, design));
                }
                return Err(e);
            }
        }
    }
    if token_type == "Blur" {
        if let ValueExpr::Call {
            callee: CallCallee::Blur,
            args,
        } = value
        {
            if let Err(e) = crate::frame_props::assert_blur_call_compatible(
                design,
                args,
                &format!("Token `{name}`"),
            ) {
                if e.code == "PDL-E040" || e.code == "PDL-E020" {
                    return Err(err("PDL-E005", e.message, design));
                }
                return Err(e);
            }
        }
    }
    if token_type == "Vibrancy" {
        if let ValueExpr::Call {
            callee: CallCallee::Vibrancy,
            args,
        } = value
        {
            if let Err(e) = crate::frame_props::assert_vibrancy_call_compatible(
                design,
                args,
                &format!("Token `{name}`"),
            ) {
                if e.code == "PDL-E040" || e.code == "PDL-E020" {
                    return Err(err("PDL-E005", e.message, design));
                }
                return Err(e);
            }
        }
        if matches!(value, ValueExpr::VibrancyTuple { .. }) {
            return Err(err(
                "PDL-E005",
                format!(
                    "Token `{name}` has type Vibrancy and must be `Vibrancy(saturation: …, brightness: …)` — naked `(saturation:, brightness:)` tuples are not typed Vibrancy values"
                ),
                design,
            ));
        }
    }
    if token_type == "Icon"
        && matches!(
            value,
            ValueExpr::IconFile { .. } | ValueExpr::IconSystem { .. }
        )
    {
        assert_icon_ref_fields(design, name, value)?;
    }
    if token_type == "MediaSource"
        && matches!(
            value,
            ValueExpr::MediaSourceFile { .. } | ValueExpr::MediaSourceUrl { .. }
        )
    {
        assert_media_source_ref_fields(design, name, value)?;
    }
    if ok && (token_type == "Background" || token_type == "Foreground") {
        if let Err(e) =
            crate::frame_props::assert_layer_stack_value(design, value, &format!("Token `{name}`"))
        {
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

fn unknown_param_type_message(type_name: &str, where_: &str) -> String {
    if type_name == "Boolean" {
        format!("Unknown parameter type `Boolean` {where_}; use `Bool`")
    } else {
        format!(
            "Unknown parameter type `{type_name}` {where_} (expected a built-in type, declared variant, API protocol, or component)"
        )
    }
}

fn assert_known_param_type(
    design: &DesignDefinition,
    type_name: &str,
    where_: &str,
) -> Result<(), PdlError> {
    let name = unwrap_param_type_name(type_name);
    if is_builtin_param_type(name)
        || design.variants.contains_key(name)
        || design.components.contains_key(name)
    {
        return Ok(());
    }
    if design.protocols.contains_key(name) {
        // Host protocols as param/slot types are **PDL-E031** (checked separately).
        return Ok(());
    }
    Err(err(
        "PDL-E039",
        unknown_param_type_message(name, where_),
        design,
    ))
}

fn validate_param_types(design: &DesignDefinition) -> Result<(), PdlError> {
    for c in design.components.values() {
        for p in &c.params {
            assert_known_param_type(
                design,
                &p.type_name,
                &format!("on component `{}` parameter `{}`", c.name, p.name),
            )?;
        }
    }
    for h in design.hosts.values() {
        for p in &h.params {
            assert_known_param_type(
                design,
                &p.type_name,
                &format!("on host `{}` parameter `{}`", h.name, p.name),
            )?;
        }
    }
    for p in design.protocols.values() {
        for param in &p.params {
            assert_known_param_type(
                design,
                &param.type_name,
                &format!("on protocol `{}` parameter `{}`", p.name, param.name),
            )?;
        }
        for emit in &p.emits {
            for arg in &emit.args {
                assert_known_param_type(
                    design,
                    &arg.type_name,
                    &format!(
                        "on protocol `{}` emit `{}` argument `{}`",
                        p.name, emit.name, arg.name
                    ),
                )?;
            }
        }
    }
    for (comp, emits) in &design.emits {
        for emit in emits {
            for arg in &emit.args {
                assert_known_param_type(
                    design,
                    &arg.type_name,
                    &format!(
                        "on component `{comp}` emit `{}` argument `{}`",
                        emit.name, arg.name
                    ),
                )?;
            }
        }
    }
    Ok(())
}

fn presenter_lets_in_body(body: &[FrameBodyItem], out: &mut HashSet<String>) {
    for item in body {
        match item {
            FrameBodyItem::Let {
                id,
                frame_kind,
                body,
                ..
            } => {
                if frame_kind == "presenter" {
                    out.insert(id.clone());
                }
                presenter_lets_in_body(body, out);
            }
            FrameBodyItem::If { chain } => {
                for br in &chain.branches {
                    presenter_lets_in_body(&br.body, out);
                }
                if let Some(else_body) = &chain.else_body {
                    presenter_lets_in_body(else_body, out);
                }
            }
            _ => {}
        }
    }
}

fn child_entry_must_be_page(
    design: &DesignDefinition,
    owner: &str,
    entry: &ChildEntry,
    where_: &str,
) -> Result<(), PdlError> {
    let component = match entry {
        ChildEntry::FrameRef { id, .. } => {
            if let Some(c) = let_instance_component(design, owner, id) {
                c.to_string()
            } else if let Some(c) = design.components.get(owner) {
                let params = effective_params(design, c).unwrap_or_default();
                if let Some(p) = params.iter().find(|p| p.name == *id) {
                    if p.type_name == crate::design::PAGE_PROTOCOL_PRELUDE
                        || crate::pack::component_satisfies_bound(design, &p.type_name, "Page")
                    {
                        return Ok(());
                    }
                    return Err(err(
                        "PDL-E040",
                        format!(
                            "Presenter `root` {where_} (`{id}`) is `{ty}`, expected `Page`",
                            ty = p.type_name
                        ),
                        design,
                    ));
                } else {
                    return Err(err(
                        "PDL-E054",
                        format!(
                            "Presenter `root` {where_} names unknown let or param `{id}` (component {owner})"
                        ),
                        design,
                    ));
                }
            } else {
                return Err(err(
                    "PDL-E054",
                    format!("Presenter `root` {where_} names unknown let `{id}`"),
                    design,
                ));
            }
        }
        ChildEntry::Instance { component, .. } => component.clone(),
        _ => {
            return Err(err(
                "PDL-E054",
                format!("Presenter `root` {where_} must be a page let or page instance"),
                design,
            ));
        }
    };
    if crate::pack::component_satisfies_bound(design, &component, "Page") {
        Ok(())
    } else {
        Err(err(
            "PDL-E040",
            format!("Presenter `root` {where_} is `{component}`, which does not satisfy `Page`"),
            design,
        ))
    }
}

fn validate_presenter_lets(design: &DesignDefinition, c: &ComponentDecl) -> Result<(), PdlError> {
    fn walk(
        design: &DesignDefinition,
        owner: &str,
        body: &[FrameBodyItem],
    ) -> Result<(), PdlError> {
        for item in body {
            match item {
                FrameBodyItem::Let {
                    id,
                    frame_kind,
                    body,
                } if frame_kind == "presenter" => {
                    let entries: Vec<&ChildEntry> = body
                        .iter()
                        .filter_map(|i| match i {
                            FrameBodyItem::Children { entries, .. } => Some(entries),
                            _ => None,
                        })
                        .flatten()
                        .collect();
                    if entries.is_empty() {
                        return Err(err(
                            "PDL-E054",
                            format!(
                                "`Presenter()` requires `root:` (component {owner}, let `{id}`)"
                            ),
                            design,
                        ));
                    }
                    if entries.len() > 1 {
                        return Err(err(
                            "PDL-E054",
                            format!("Presenter `{id}` paints one child (component {owner})"),
                            design,
                        ));
                    }
                    child_entry_must_be_page(design, owner, entries[0], &format!("on `{id}`"))?;
                    walk(design, owner, body)?;
                }
                FrameBodyItem::Let { body, .. } => walk(design, owner, body)?,
                FrameBodyItem::If { chain } => {
                    for br in &chain.branches {
                        walk(design, owner, &br.body)?;
                    }
                    if let Some(else_body) = &chain.else_body {
                        walk(design, owner, else_body)?;
                    }
                }
                _ => {}
            }
        }
        Ok(())
    }
    walk(design, &c.name, &c.body)
}

fn validate_presenter_stack_pin(
    design: &DesignDefinition,
    component_name: &str,
    label: &str,
    let_id: &str,
    value: &ValueExpr,
) -> Result<(), PdlError> {
    let items: Vec<&ValueExpr> = match value {
        ValueExpr::Array { items } if !items.is_empty() => items.iter().collect(),
        ValueExpr::Instance { .. } | ValueExpr::Ident { .. } => vec![value],
        _ => {
            return Err(err(
                "PDL-E054",
                format!(
                    "Fixture \"{label}\" `{let_id}` must be a page stack \
                     (`{let_id} = [Home(), Episode()]`) (component {component_name})"
                ),
                design,
            ));
        }
    };
    for it in items {
        match it {
            ValueExpr::Instance { component, .. } => {
                if !crate::pack::component_satisfies_bound(design, component, "Page") {
                    return Err(err(
                        "PDL-E040",
                        format!(
                            "Fixture \"{label}\" `{let_id}` stack entry `{component}` \
                             does not satisfy `Page`"
                        ),
                        design,
                    ));
                }
            }
            ValueExpr::Ident { name } => {
                if let Some(comp) = let_instance_component(design, component_name, name) {
                    if !crate::pack::component_satisfies_bound(design, comp, "Page") {
                        return Err(err(
                            "PDL-E040",
                            format!(
                                "Fixture \"{label}\" `{let_id}` stack entry `{name}` \
                                 is `{comp}`, which does not satisfy `Page`"
                            ),
                            design,
                        ));
                    }
                } else {
                    return Err(err(
                        "PDL-E054",
                        format!(
                            "Fixture \"{label}\" `{let_id}` stack entry `{name}` \
                             is not a page let (component {component_name})"
                        ),
                        design,
                    ));
                }
            }
            _ => {
                return Err(err(
                    "PDL-E054",
                    format!("Fixture \"{label}\" `{let_id}` stack entries must be page instances"),
                    design,
                ));
            }
        }
    }
    Ok(())
}

fn validate_presenter_cover_pin(
    design: &DesignDefinition,
    component_name: &str,
    label: &str,
    let_id: &str,
    value: &ValueExpr,
) -> Result<(), PdlError> {
    match value {
        ValueExpr::Instance { component, .. } => {
            if crate::pack::component_satisfies_bound(design, component, "Page") {
                Ok(())
            } else {
                Err(err(
                    "PDL-E040",
                    format!(
                        "Fixture \"{label}\" `{let_id}.cover` is `{component}`, \
                         which does not satisfy `Page`"
                    ),
                    design,
                ))
            }
        }
        ValueExpr::Ident { name } => {
            if let Some(comp) = let_instance_component(design, component_name, name) {
                if crate::pack::component_satisfies_bound(design, comp, "Page") {
                    Ok(())
                } else {
                    Err(err(
                        "PDL-E040",
                        format!(
                            "Fixture \"{label}\" `{let_id}.cover` `{name}` is `{comp}`, \
                             which does not satisfy `Page`"
                        ),
                        design,
                    ))
                }
            } else {
                Err(err(
                    "PDL-E054",
                    format!(
                        "Fixture \"{label}\" `{let_id}.cover` `{name}` is not a page let \
                         (component {component_name})"
                    ),
                    design,
                ))
            }
        }
        _ => Err(err(
            "PDL-E054",
            format!(
                "Fixture \"{label}\" `{let_id}.cover` must be a page instance \
                 (component {component_name})"
            ),
            design,
        )),
    }
}

fn validate_presenter_verb(
    design: &DesignDefinition,
    component_name: &str,
    qualifier: &str,
    verb: PresenterVerb,
    page: Option<&ValueExpr>,
    style: Option<&str>,
    move_spec: Option<&ValueExpr>,
    dismiss_move: Option<&ValueExpr>,
) -> Result<(), PdlError> {
    let Some(c) = design.components.get(component_name) else {
        return Ok(());
    };
    let mut presenters = HashSet::new();
    presenter_lets_in_body(&c.body, &mut presenters);
    if !presenters.contains(qualifier) {
        return Err(err(
            "PDL-E055",
            format!(
                "`{qualifier}.{}` needs a `let {qualifier} = Presenter(root: …)` \
                 (component {component_name})",
                verb.as_str()
            ),
            design,
        ));
    }
    if !matches!(verb, PresenterVerb::Present) && style.is_some() {
        return Err(err(
            "PDL-E055",
            format!(
                "`{qualifier}.{}` does not take `style:` (component {component_name})",
                verb.as_str()
            ),
            design,
        ));
    }
    if matches!(verb, PresenterVerb::Replace | PresenterVerb::Pop | PresenterVerb::Dismiss)
        && (move_spec.is_some() || dismiss_move.is_some())
    {
        return Err(err(
            "PDL-E055",
            format!(
                "`{qualifier}.{}` does not take `move:` / `dismissMove:` (component {component_name})",
                verb.as_str()
            ),
            design,
        ));
    }
    if let Some(m) = move_spec {
        validate_presentation_motion_value(
            design,
            m,
            &format!("`{qualifier}.{}` `move:`", verb.as_str()),
            component_name,
        )?;
    }
    if let Some(m) = dismiss_move {
        validate_presentation_motion_value(
            design,
            m,
            &format!("`{qualifier}.{}` `dismissMove:`", verb.as_str()),
            component_name,
        )?;
    }
    match verb {
        PresenterVerb::Dismiss => {
            if page.is_some() {
                return Err(err(
                    "PDL-E055",
                    format!("`{qualifier}.dismiss` takes no page (component {component_name})"),
                    design,
                ));
            }
            return Ok(());
        }
        PresenterVerb::Pop => {
            if page.is_some() {
                return Err(err(
                    "PDL-E055",
                    format!("`{qualifier}.pop` takes no page (component {component_name})"),
                    design,
                ));
            }
            return Ok(());
        }
        PresenterVerb::Present => match style {
            Some("cover") => {}
            Some(other) => {
                return Err(err(
                    "PDL-E055",
                    format!(
                        "`{qualifier}.present` style `.{other}` is not legal yet; use `.cover` \
                         (component {component_name})"
                    ),
                    design,
                ));
            }
            None => {
                return Err(err(
                    "PDL-E055",
                    format!(
                        "`{qualifier}.present` needs `style: .cover` (component {component_name})"
                    ),
                    design,
                ));
            }
        },
        PresenterVerb::Replace | PresenterVerb::Push => {}
    }
    let Some(page) = page else {
        return Err(err(
            "PDL-E055",
            format!(
                "`{qualifier}.{}` needs a page instance (component {component_name})",
                verb.as_str()
            ),
            design,
        ));
    };
    match page {
        ValueExpr::Instance { component, .. } => {
            if crate::pack::component_satisfies_bound(design, component, "Page") {
                Ok(())
            } else {
                Err(err(
                    "PDL-E040",
                    format!(
                        "`{qualifier}.{}({component}(…))` does not satisfy `Page` \
                         (component {component_name})",
                        verb.as_str()
                    ),
                    design,
                ))
            }
        }
        ValueExpr::Ident { name } => {
            if let Some(comp) = let_instance_component(design, component_name, name) {
                if crate::pack::component_satisfies_bound(design, comp, "Page") {
                    Ok(())
                } else {
                    Err(err(
                        "PDL-E040",
                        format!(
                            "`{qualifier}.{}({name})` is `{comp}`, which does not satisfy `Page`",
                            verb.as_str()
                        ),
                        design,
                    ))
                }
            } else {
                Err(err(
                    "PDL-E055",
                    format!(
                        "`{qualifier}.{}({name})` names an unknown let (component {component_name})",
                        verb.as_str()
                    ),
                    design,
                ))
            }
        }
        _ => Err(err(
            "PDL-E055",
            format!(
                "`{qualifier}.{}` needs a page instance (component {component_name})",
                verb.as_str()
            ),
            design,
        )),
    }
}

fn emit_payloads_match_by_position(got: &[EmitArgDecl], expected: &[EmitArgDecl]) -> bool {
    got.len() == expected.len()
        && got
            .iter()
            .zip(expected)
            .all(|(g, e)| g.type_name == e.type_name)
}

/// Protocol that declares this `.ancestors` channel, if any.
fn ancestors_emit_protocol<'a>(design: &'a DesignDefinition, channel: &str) -> Option<&'a str> {
    for p in design.protocols.values() {
        if p.emits
            .iter()
            .any(|e| e.name == channel && e.propagation == EmitPropagation::Ancestors)
        {
            return Some(p.name.as_str());
        }
    }
    None
}

/// `.ancestors` emit signature by channel name (protocol block or component-owned emits).
fn ancestors_emit_sig<'a>(
    design: &'a DesignDefinition,
    channel: &str,
) -> Option<&'a ProtocolEmitDecl> {
    for p in design.protocols.values() {
        if let Some(e) = p
            .emits
            .iter()
            .find(|e| e.name == channel && e.propagation == EmitPropagation::Ancestors)
        {
            return Some(e);
        }
    }
    for owns in design.emits.values() {
        if let Some(e) = owns
            .iter()
            .find(|e| e.name == channel && e.propagation == EmitPropagation::Ancestors)
        {
            return Some(e);
        }
    }
    None
}

fn collect_instances_from_value(value: &ValueExpr, out: &mut HashSet<String>) {
    match value {
        ValueExpr::Instance { component, kwargs } => {
            out.insert(component.clone());
            for v in kwargs.values() {
                collect_instances_from_value(v, out);
            }
        }
        ValueExpr::Array { items } => {
            for v in items {
                collect_instances_from_value(v, out);
            }
        }
        ValueExpr::Call { args, .. } => {
            for v in args.values() {
                collect_instances_from_value(v, out);
            }
        }
        ValueExpr::OpacityOf { base, opacity } => {
            collect_instances_from_value(base, out);
            collect_instances_from_value(opacity, out);
        }
        _ => {}
    }
}

fn collect_instances_from_child_entry(entry: &ChildEntry, out: &mut HashSet<String>) {
    match entry {
        ChildEntry::Instance {
            component, kwargs, ..
        } => {
            out.insert(component.clone());
            for v in kwargs.values() {
                collect_instances_from_value(v, out);
            }
        }
        ChildEntry::FrameCtor { child_entries, .. } => {
            if let Some(cs) = child_entries {
                for c in cs {
                    collect_instances_from_child_entry(c, out);
                }
            }
        }
        _ => {}
    }
}

fn collect_mounted_component_types(body: &[FrameBodyItem], out: &mut HashSet<String>) {
    for item in body {
        match item {
            FrameBodyItem::LetInstance {
                component, kwargs, ..
            } => {
                out.insert(component.clone());
                for v in kwargs.values() {
                    collect_instances_from_value(v, out);
                }
            }
            FrameBodyItem::Children { entries, .. } => {
                for e in entries {
                    collect_instances_from_child_entry(e, out);
                }
            }
            FrameBodyItem::Let { body, .. } | FrameBodyItem::ForEach { body, .. } => {
                collect_mounted_component_types(body, out);
            }
            FrameBodyItem::If { chain } => {
                for br in &chain.branches {
                    collect_mounted_component_types(&br.body, out);
                }
                if let Some(else_body) = &chain.else_body {
                    collect_mounted_component_types(else_body, out);
                }
            }
            FrameBodyItem::Prop { value, .. }
            | FrameBodyItem::FrameProp { value, .. }
            | FrameBodyItem::LetValue { value, .. } => {
                collect_instances_from_value(value, out);
            }
            FrameBodyItem::LayoutOn { handler } => {
                for item in &handler.body {
                    if let LayoutOnBodyItem::PresenterVerb {
                        page: Some(value), ..
                    } = item
                    {
                        collect_instances_from_value(value, out);
                    }
                }
            }
            _ => {}
        }
    }
}

fn collect_bare_ancestor_channels(body: &[FrameBodyItem], out: &mut HashSet<String>) {
    for item in body {
        match item {
            FrameBodyItem::LayoutOn { handler } if handler.qualifier.is_none() => {
                out.insert(handler.channel.clone());
            }
            FrameBodyItem::Let { body, .. } => collect_bare_ancestor_channels(body, out),
            FrameBodyItem::If { chain } => {
                for br in &chain.branches {
                    collect_bare_ancestor_channels(&br.body, out);
                }
                if let Some(else_body) = &chain.else_body {
                    collect_bare_ancestor_channels(else_body, out);
                }
            }
            // ForEach binder captures are not ancestor captures.
            _ => {}
        }
    }
}

/// Immediate parents that mount `child` (let instance, children instance, or param default).
fn mount_parents<'a>(design: &'a DesignDefinition) -> HashMap<String, Vec<&'a str>> {
    let mut parents: HashMap<String, Vec<&str>> = HashMap::new();
    for c in design.components.values() {
        let mut mounted = HashSet::new();
        collect_mounted_component_types(&c.body, &mut mounted);
        if let Ok(params) = effective_params(design, c) {
            for p in params {
                collect_instances_from_value(&p.default_value, &mut mounted);
            }
        }
        for child in mounted {
            parents.entry(child).or_default().push(c.name.as_str());
        }
    }
    parents
}

fn ancestor_path_handles(
    design: &DesignDefinition,
    start: &str,
    channel: &str,
    proto_name: Option<&str>,
    parents: &HashMap<String, Vec<&str>>,
    visiting: &HashSet<String>,
) -> bool {
    if visiting.contains(start) {
        return true;
    }
    let Some(c) = design.components.get(start) else {
        return false;
    };
    let mut bare = HashSet::new();
    collect_bare_ancestor_channels(&c.body, &mut bare);
    let opted_in = match proto_name {
        Some(p) => c.conforms_to.iter().any(|n| n == p),
        None => true,
    };
    if opted_in && bare.contains(channel) {
        return true;
    }
    match parents.get(start) {
        Some(list) if !list.is_empty() => {
            let mut next = visiting.clone();
            next.insert(start.to_string());
            list.iter()
                .all(|p| ancestor_path_handles(design, p, channel, proto_name, parents, &next))
        }
        _ => false,
    }
}

/// Mounted `.ancestors` emits must hit a bare `channel(…) =` before a root.
fn validate_ancestors_emit_delivery(design: &DesignDefinition) -> Result<(), PdlError> {
    let parents = mount_parents(design);
    for c in design.components.values() {
        let mut mounted = HashSet::new();
        collect_mounted_component_types(&c.body, &mut mounted);
        if let Ok(params) = effective_params(design, c) {
            for p in params {
                collect_instances_from_value(&p.default_value, &mut mounted);
            }
        }
        for child_name in mounted {
            let Some(child) = design.components.get(&child_name) else {
                continue;
            };
            for e in effective_emits(design, child) {
                if e.propagation != EmitPropagation::Ancestors {
                    continue;
                }
                let proto = ancestors_emit_protocol(design, &e.name);
                if !ancestor_path_handles(
                    design,
                    &c.name,
                    &e.name,
                    proto,
                    &parents,
                    &HashSet::new(),
                ) {
                    let hint = match proto {
                        Some(p) => format!(
                            "no ancestor both lists `<{p}>` and writes `{}(…) =`",
                            e.name
                        ),
                        None => format!("no bare `{}(…) =` on an ancestor", e.name),
                    };
                    return Err(err(
                        "PDL-E053",
                        format!(
                            "`.ancestors` emit `{}` from `{child_name}` is unhandled through `{}` \
                             ({hint})",
                            e.name, c.name
                        ),
                        design,
                    ));
                }
            }
        }
    }
    Ok(())
}

/// `<>` receives host inbound and ancestor-sink APIs. `emits <P>` sends.
fn validate_protocol_stance(design: &DesignDefinition, c: &ComponentDecl) -> Result<(), PdlError> {
    for proto in &c.conforms_to {
        let Some(p) = design.protocols.get(proto) else {
            return Err(err(
                "PDL-E022",
                format!(
                    "Component `{}` conforms to unknown protocol `{}`",
                    c.name, proto
                ),
                design,
            ));
        };
        if c.emits_protocols.iter().any(|e| e == proto) {
            return Err(err(
                "PDL-E044",
                format!(
                    "Protocol `{proto}` cannot be both received (`<>`) and sent (`emits <>`) \
                     on `{}`",
                    c.name
                ),
                design,
            ));
        }
        if p.role == ProtocolRole::Api && !crate::design::protocol_has_ancestors_emit(p) {
            return Err(err(
                "PDL-E044",
                format!(
                    "Protocol `{proto}` on `{}` is a send/slot contract — write \
                     `emits <{proto}>`. `<>` receives host inbound or ancestor-sink protocols",
                    c.name
                ),
                design,
            ));
        }
    }
    for proto in &c.emits_protocols {
        let Some(p) = design.protocols.get(proto) else {
            return Err(err(
                "PDL-E022",
                format!("Component `{}` emits unknown protocol `{}`", c.name, proto),
                design,
            ));
        };
        if p.role == ProtocolRole::Host {
            return Err(err(
                "PDL-E044",
                format!(
                    "Host protocol `{proto}` on `{}` is received with `<{proto}>`, \
                     not `emits <{proto}>`",
                    c.name
                ),
                design,
            ));
        }
    }
    Ok(())
}

/// A receive ancestor-sink protocol must have a bare handler for each of its channels.
fn validate_sink_handlers(design: &DesignDefinition, c: &ComponentDecl) -> Result<(), PdlError> {
    let mut bare = HashSet::new();
    collect_bare_ancestor_channels(&c.body, &mut bare);
    for proto in &c.conforms_to {
        let Some(p) = design.protocols.get(proto) else {
            continue;
        };
        if p.role != ProtocolRole::Api || !crate::design::protocol_has_ancestors_emit(p) {
            continue;
        }
        for e in &p.emits {
            if e.propagation != EmitPropagation::Ancestors {
                continue;
            }
            if !bare.contains(&e.name) {
                return Err(err(
                    "PDL-E056",
                    format!(
                        "Component `{}` lists `<{proto}>` but has no bare `{}(…) =` handler",
                        c.name, e.name
                    ),
                    design,
                ));
            }
        }
    }
    Ok(())
}

/// Semantic checks on the merged design (after parse + import merge).
pub fn validate_merged_design(design: &DesignDefinition) -> Result<(), PdlError> {
    validate_companion_symbols(design)?;
    validate_host_protocol_prelude(design)?;
    validate_page_protocol_prelude(design)?;
    validate_host_profile_shapes(design)?;
    validate_protocol_requires(design)?;
    validate_token_declarations(design)?;
    validate_type_style_props(design)?;
    validate_param_types(design)?;
    validate_samples(design)?;
    validate_component_param_defaults(design)?;
    for c in design.components.values() {
        validate_protocol_stance(design, c)?;
        validate_sink_handlers(design, c)?;
        validate_host_protocol_not_slot_type(design, c)?;
        let mut all_frame_ids = HashSet::new();
        collect_unique_frame_ids_from_body(&c.body, &mut all_frame_ids, &c.name, design)?;
        let param_by_name = param_by_name_map(design, c)?;
        let caller_params: HashMap<String, String> = effective_params(design, c)?
            .into_iter()
            .map(|p| (p.name.clone(), p.type_name.clone()))
            .collect();
        let mut value_ids = HashSet::new();
        validate_let_values_in_body(
            design,
            &c.body,
            &all_frame_ids,
            &mut value_ids,
            &caller_params,
            &c.name,
        )?;
        let param_names: HashSet<String> = effective_params(design, c)?
            .into_iter()
            .map(|p| p.name)
            .collect();
        let mut declared = HashSet::new();
        assert_forward_frame_visibility(
            design,
            &c.body,
            &mut declared,
            &all_frame_ids,
            &param_names,
            &c.name,
        )?;
        let array_params: HashSet<String> = effective_params(design, c)?
            .into_iter()
            .filter(|p| p.is_array)
            .map(|p| p.name)
            .collect();
        validate_if_conditions_in_body(design, &c.body, &param_by_name, &array_params, &c.name)?;
        validate_foreach_mounts(design, c)?;
        validate_unique_frame_mounts(design, c, &all_frame_ids)?;
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
        validate_frame_animate_in_body(design, &c.body, &c.name)?;
        validate_blur_effect_conflict_in_body(design, &c.body, &c.name)?;
        let caller_params: HashMap<String, String> = effective_params(design, c)?
            .into_iter()
            .map(|p| (p.name, p.type_name))
            .collect();
        validate_param_bindings_in_body(design, &c.body, &caller_params, &c.name)?;
        validate_fixtures_for_component(design, &c.name)?;
        validate_interactions_for_component(design, &c.name)?;
        validate_rules_for_component(design, &c.name)?;
        validate_presenter_lets(design, c)?;
    }
    validate_ancestors_emit_delivery(design)?;
    Ok(())
}
