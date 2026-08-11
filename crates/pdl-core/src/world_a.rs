//! World A expression-tree authoring — desugar to classic declare-and-mount AST.
//! See `docs/PROPOSAL_WORLD_A_EXPRESSION_TREES.md`.
//!
//! Rust port of `src/worldA.ts`.

use indexmap::IndexMap;

use crate::ast::{ChildEntry, FrameBodyItem, ValueExpr};

pub const FRAME_CTOR_NAMES: &[&str] = &["Text", "Layout", "Icon", "Media"];

/// Reserved component names — collide with World A frame ctors.
pub const RESERVED_FRAME_CTOR_COMPONENT_NAMES: &[&str] = FRAME_CTOR_NAMES;

pub fn is_frame_ctor_name(name: &str) -> bool {
    FRAME_CTOR_NAMES.contains(&name)
}

/// Map World A ctor spelling → classic frame kind keyword.
pub fn frame_ctor_to_kind(name: &str) -> Option<&'static str> {
    match name {
        "Text" => Some("text"),
        "Layout" => Some("layout"),
        "Icon" => Some("icon"),
        "Media" => Some("media"),
        _ => None,
    }
}

/// Build a classic frame-let body from World A ctor kwargs (`children:` handled separately).
pub fn frame_ctor_kwargs_to_body(
    args: &IndexMap<String, ValueExpr>,
    child_entries: Option<Vec<ChildEntry>>,
) -> Vec<FrameBodyItem> {
    let mut body: Vec<FrameBodyItem> = Vec::new();
    for (name, value) in args {
        if name == "children" {
            continue;
        }
        body.push(FrameBodyItem::Prop {
            name: name.clone(),
            value: value.clone(),
        });
    }
    if let Some(entries) = child_entries {
        if !entries.is_empty() {
            body.push(FrameBodyItem::Children {
                target: crate::ast::ChildrenTarget::Root,
                entries,
            });
        }
    }
    body
}

/// Lower World A `frameCtor` child entries into synthetic `let` + `frameRef` mounts.
/// Nested ctors hoist before their parent so E019 order stays valid.
pub fn lower_world_a_body(body: Vec<FrameBodyItem>) -> Vec<FrameBodyItem> {
    let mut auto = 0usize;
    lower_items(body, &mut auto)
}

fn next_id(kind: &str, auto: &mut usize) -> String {
    let id = format!("__auto_{kind}_{auto}");
    *auto += 1;
    id
}

fn lower_entries(
    entries: Vec<ChildEntry>,
    hoist: &mut Vec<FrameBodyItem>,
    auto: &mut usize,
) -> Vec<ChildEntry> {
    entries
        .into_iter()
        .map(|entry| match entry {
            ChildEntry::FrameCtor {
                frame_kind,
                props,
                child_entries,
                opacity,
            } => {
                let nested_children = child_entries.map(|ce| lower_entries(ce, hoist, auto));
                let id = next_id(&frame_kind, auto);
                let let_body = frame_ctor_kwargs_to_body(&props, nested_children);
                hoist.push(FrameBodyItem::Let {
                    id: id.clone(),
                    frame_kind,
                    body: lower_items(let_body, auto),
                });
                ChildEntry::FrameRef { id, opacity }
            }
            other => other,
        })
        .collect()
}

fn lower_items(items: Vec<FrameBodyItem>, auto: &mut usize) -> Vec<FrameBodyItem> {
    let mut out: Vec<FrameBodyItem> = Vec::new();
    for item in items {
        match item {
            FrameBodyItem::Children { target, entries } => {
                let mut hoist: Vec<FrameBodyItem> = Vec::new();
                let entries = lower_entries(entries, &mut hoist, auto);
                out.extend(hoist);
                out.push(FrameBodyItem::Children { target, entries });
            }
            FrameBodyItem::Let {
                id,
                frame_kind,
                body,
            } => {
                out.push(FrameBodyItem::Let {
                    id,
                    frame_kind,
                    body: lower_items(body, auto),
                });
            }
            FrameBodyItem::If { chain } => {
                let mut chain = chain;
                chain.branches = chain
                    .branches
                    .into_iter()
                    .map(|mut b| {
                        b.body = lower_items(b.body, auto);
                        b
                    })
                    .collect();
                if let Some(else_body) = chain.else_body {
                    chain.else_body = Some(lower_items(else_body, auto));
                }
                out.push(FrameBodyItem::If { chain });
            }
            other => out.push(other),
        }
    }
    out
}
