//! Small parser-surface checks: mount sugar, direction enums, and the removed
//! handler-snapshot / motion spellings that still need a migration hint.

use pdl_core::ast::{ChildEntry, FrameBodyItem, TopLevelDecl, ValueExpr};
use pdl_core::parser::parse_module_source;

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

fn prop(c: &pdl_core::ast::ComponentDecl, name: &str) -> Option<ValueExpr> {
    c.body.iter().find_map(|it| match it {
        FrameBodyItem::Prop { name: n, value } if n == name => Some(value.clone()),
        _ => None,
    })
}

#[test]
fn negative_scalar_sugar_is_not_an_edge_inset() {
    use pdl_core::design::load_design;
    let root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(|p| p.parent())
        .expect("repo root")
        .join("test-fixtures/pdl/atoms/scalar_numeric_sugar_bad.pdl");
    // Lives outside `errors/` because it is the counter-example for uniform-inset sugar.
    let err = load_design(root.to_str().unwrap()).unwrap_err();
    assert_eq!(err.code, "PDL-E006");
    assert!(err.message.contains("padding"), "{}", err.message);
}

#[test]
fn spacer_mounts_between_frame_refs() {
    let c = only_component(
        r#"
component C() layout {
  let A = Text(content: "a")
  let B = Text(content: "b")
  children = [A, Spacer(), B]
}
"#,
    );
    let entries = c
        .body
        .iter()
        .find_map(|it| match it {
            FrameBodyItem::Children { entries, .. } => Some(entries.clone()),
            _ => None,
        })
        .expect("children");
    assert!(
        matches!(
            entries.as_slice(),
            [
                ChildEntry::FrameRef { id: a, .. },
                ChildEntry::Spacer,
                ChildEntry::FrameRef { id: b, .. }
            ] if a == "A" && b == "B"
        ),
        "{entries:?}"
    );
}

#[test]
fn legacy_dot_spacer_points_at_the_constructor() {
    let err = parse_module_source("component C() layout { children = [.spacer] }", "t.pdl")
        .unwrap_err();
    assert!(err.message.contains("Spacer()"), "{}", err.message);
}

#[test]
fn direction_accepts_reverse_stack() {
    let c = only_component(
        r#"
component C() layout {
  direction = .reverseStack
  children = []
}
"#,
    );
    assert!(
        matches!(prop(&c, "direction"), Some(ValueExpr::DotEnum { ref value }) if value == ".reverseStack"),
        "{:?}",
        prop(&c, "direction")
    );
}

#[test]
fn removed_handler_snapshots_point_at_animate() {
    let err = parse_module_source(
        r#"
component C <PointerInput>() layout {
  children = []
  self.pressEnd = {
    from { opacity = 1 }
  }
}
"#,
        "t.pdl",
    )
    .unwrap_err();
    assert!(
        err.message.contains("from { }") && err.message.contains("removed"),
        "{}",
        err.message
    );
}

#[test]
fn motion_and_pose_need_content() {
    let empty_pose = parse_module_source(
        r#"
component C <PointerInput>() layout {
  children = []
  self.pressEnd = { animate = Motion(duration: 100, ease: .out, pose: Pose()) }
}
"#,
        "t.pdl",
    )
    .unwrap_err();
    assert!(
        empty_pose.message.contains("overlay field"),
        "{}",
        empty_pose.message
    );

    let no_timing = parse_module_source(
        r#"
component C <PointerInput>() layout {
  children = []
  self.pressEnd = { animate = Motion(pose: Pose(opacity: 0.5)) }
}
"#,
        "t.pdl",
    )
    .unwrap_err();
    assert!(
        no_timing.message.contains("duration") || no_timing.message.contains("timing"),
        "{}",
        no_timing.message
    );
}

#[test]
fn emit_capture_list_animate_parses() {
    use pdl_core::ast::{FrameBodyItem, LayoutOnBodyItem, TopLevelDecl};

    let m = parse_module_source(
        r#"
component Dot <PointerInput>(page: Number = 1) layout {
  children = []
  self.pressEnd = { emit select(page) }
} emits { select(page: Number) }

component Control(currentPage: Number = 1) layout {
  let dots: [Dot] = Map(1...3) { i in Dot(page: i) }
  ForEach(dots) { dot in
    dot.select(page: Number) = {
      dots.animate = [ Pose(scale: 0.85), .rest ]
      animate = Motion(duration: 500, ease: .linear)
      currentPage = page
    }
  }
  children = dots
}
"#,
        "t.pdl",
    )
    .expect("parses");
    let c = m
        .declarations
        .into_iter()
        .find_map(|d| match d {
            TopLevelDecl::Component(c) if c.name == "Control" => Some(c),
            _ => None,
        })
        .expect("Control");
    let foreach = c
        .body
        .iter()
        .find_map(|it| match it {
            FrameBodyItem::ForEach { body, .. } => Some(body),
            _ => None,
        })
        .expect("ForEach");
    let handlers = pdl_core::ast::foreach_layout_handlers(foreach);
    let h = handlers.first().expect("capture");
    let list = h.body.iter().find_map(|it| match it {
        LayoutOnBodyItem::Animate {
            target: Some(t),
            ..
        } => Some(t.as_str()),
        _ => None,
    });
    let bare = h.body.iter().any(|it| {
        matches!(it, LayoutOnBodyItem::Animate { target: None, .. })
    });
    assert_eq!(list, Some("dots"));
    assert!(bare);
}

#[test]
fn emit_capture_single_let_animate_is_rejected() {
    use pdl_core::design::load_design;

    let manifest = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let root = manifest
        .parent()
        .and_then(|p| p.parent())
        .expect("repo root");
    let dir = root.join("target/test-tmp-list-animate");
    let _ = std::fs::create_dir_all(&dir);
    let path = dir.join("single-let-capture-animate.pdl");
    std::fs::write(
        &path,
        r#"
component Dot(page: Number = 1) layout {
  let knob = Layout()
  children = [knob]
} emits { select(page: Number) }

component Control(currentPage: Number = 1) layout {
  let row = Dot(page: 1)
  row.select(page: Number) = {
    knob.animate = [ Pose(scale: 0.9), .rest ]
    currentPage = page
  }
  children = [row]
}
"#,
    )
    .expect("write");
    let err = load_design(path.to_str().unwrap()).unwrap_err();
    assert_eq!(err.code, "PDL-E007", "{}", err.message);
    assert!(
        err.message.contains("list") || err.message.contains("Map let"),
        "{}",
        err.message
    );
}
