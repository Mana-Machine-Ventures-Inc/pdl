//! World A authoring surface: `Text(…)` / `Layout(…)` expression trees, the reserved
//! frame-constructor names, and `= null` as an explicit unset.

use std::path::PathBuf;

use pdl_core::ast::{ChildEntry, FrameBodyItem, TopLevelDecl, ValueExpr};
use pdl_core::design::load_design;
use pdl_core::parser::parse_module_source;
use serde_json::json;

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(|p| p.parent())
        .expect("repo root")
        .to_path_buf()
}

fn only_component(src: &str) -> pdl_core::ast::ComponentDecl {
    let m = parse_module_source(src, "t.pdl").expect("parses");
    m.declarations
        .into_iter()
        .find_map(|d| match d {
            TopLevelDecl::Component(c) => Some(c),
            _ => None,
        })
        .expect("component")
}

#[test]
fn text_constructor_becomes_a_text_frame_let() {
    let c = only_component(
        r#"
component C() layout {
  let title = Text(content: "Hi", color: #111111)
  children = [title]
}
"#,
    );
    let (id, kind, body) = c
        .body
        .iter()
        .find_map(|it| match it {
            FrameBodyItem::Let {
                id,
                frame_kind,
                body,
            } => Some((id.clone(), frame_kind.clone(), body)),
            _ => None,
        })
        .expect("let title");
    assert_eq!(id, "title");
    assert_eq!(kind, "text");
    let content = body.iter().find_map(|it| match it {
        FrameBodyItem::Prop { name, value } if name == "content" => Some(value.clone()),
        _ => None,
    });
    assert!(
        matches!(content, Some(ValueExpr::String { ref value }) if value == "Hi"),
        "{content:?}"
    );
}

#[test]
fn anonymous_constructors_in_children_desugar_to_lets() {
    let c = only_component(
        r#"
component C() layout {
  children = [Layout(direction: .row, children: [Text(content: "a")])]
}
"#,
    );
    let kinds: Vec<String> = c
        .body
        .iter()
        .filter_map(|it| match it {
            FrameBodyItem::Let { frame_kind, .. } => Some(frame_kind.clone()),
            _ => None,
        })
        .collect();
    assert!(kinds.iter().any(|k| k == "layout"), "{kinds:?}");
    assert!(kinds.iter().any(|k| k == "text"), "{kinds:?}");
    // Mounts are rewritten to plain frame refs against the synthetic lets.
    let entries = c
        .body
        .iter()
        .find_map(|it| match it {
            FrameBodyItem::Children { entries, .. } => Some(entries.clone()),
            _ => None,
        })
        .expect("children");
    assert!(
        entries
            .iter()
            .all(|e| matches!(e, ChildEntry::FrameRef { .. })),
        "{entries:?}"
    );
}

#[test]
fn asset_icon_constructor_points_at_iconref() {
    let err = parse_module_source(
        r#"primitive x: Icon = Icon(system: .sfSymbols, name: "star")"#,
        "t.pdl",
    )
    .unwrap_err();
    assert!(err.message.contains("IconRef"), "{}", err.message);
}

#[test]
fn frame_constructor_names_are_reserved_for_components() {
    // `Media` is a keyword, so it fails earlier with a token error instead.
    for name in ["Text", "Layout"] {
        let err = parse_module_source(
            &format!("component {name}() layout {{ children = [] }}"),
            "t.pdl",
        )
        .unwrap_err();
        assert!(
            err.message.contains("reserved"),
            "{name}: {}",
            err.message
        );
    }
}

#[test]
fn world_a_fixture_bakes_with_children() {
    use pdl_core::bake::build_baked_design_component;
    let path = repo_root().join("test-fixtures/pdl/atoms/world_a_text_layout.pdl");
    let design = load_design(path.to_str().unwrap()).expect("load");
    let baked = build_baked_design_component(&design, "AtomWorldA", None, &Default::default(), None)
        .expect("bake");
    let kids = baked["components"]["AtomWorldA"]["root"]["children"]
        .as_array()
        .expect("children");
    assert!(!kids.is_empty());
}

#[test]
fn null_parses_as_an_explicit_unset() {
    let c = only_component("component C() layout { borderColor = null }");
    let value = c
        .body
        .iter()
        .find_map(|it| match it {
            FrameBodyItem::Prop { name, value } if name == "borderColor" => Some(value.clone()),
            _ => None,
        })
        .expect("borderColor");
    assert!(matches!(value, ValueExpr::Null), "{value:?}");
}

#[test]
fn null_unsets_the_prop_it_follows_and_leaves_siblings() {
    use pdl_core::bake::build_baked_design_component;
    use pdl_core::evaluate::build_resolved_token_map;
    use pdl_core::resolve::{resolve_component_tree, RESOLVE_OPTIONS_LITERAL_BAKE};

    let path = repo_root().join("test-fixtures/pdl/atoms/null_unset.pdl");
    let design = load_design(path.to_str().unwrap()).expect("load");

    // Resolve keeps the sentinel so later statements can still see the unset…
    let mut tokens = build_resolved_token_map(&design, None, &[]).unwrap();
    let tree = resolve_component_tree(
        &design,
        "NullUnset",
        &mut tokens,
        &Default::default(),
        RESOLVE_OPTIONS_LITERAL_BAKE,
    )
    .expect("resolve");
    assert_eq!(tree.props.get("borderColor"), Some(&json!(null)));
    assert_eq!(tree.props.get("columnGap"), Some(&json!(4)));

    // …and bake strips it, keeping the props that were not unset.
    let baked = build_baked_design_component(&design, "NullUnset", None, &Default::default(), None)
        .expect("bake");
    let props = &baked["components"]["NullUnset"]["root"]["props"];
    assert_eq!(props["borderWidth"], json!(2));
    assert!(props.get("borderColor").is_none(), "{props}");
    assert!(props.get("gap").is_none(), "{props}");
    assert_eq!(props["columnGap"], json!(4));
}

#[test]
fn null_after_a_typestyle_clears_the_inherited_value() {
    use pdl_core::bake::build_baked_design_component;
    let path = repo_root().join("test-fixtures/pdl/atoms/null_after_typestyle.pdl");
    let design = load_design(path.to_str().unwrap()).expect("load");
    let baked =
        build_baked_design_component(&design, "NullAfterTypeStyle", None, &Default::default(), None)
            .expect("bake");
    let props = &baked["components"]["NullAfterTypeStyle"]["root"]["props"];
    assert_eq!(props["fontSize"], json!(14));
    assert!(props.get("color").is_none(), "{props}");
    // The preset name never survives bake — its fields are expanded in place.
    assert!(props.get("typeStyle").is_none(), "{props}");
}
