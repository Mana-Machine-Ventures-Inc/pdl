//! Parse all valid fixture modules; spot-check known lexer failures.

use pdl_core::parser::parse_module_source;
use std::fs;
use std::path::{Path, PathBuf};

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .expect("repo root")
}

fn collect_pdl(dir: &Path, out: &mut Vec<PathBuf>) {
    let Ok(rd) = fs::read_dir(dir) else {
        return;
    };
    for ent in rd.flatten() {
        let p = ent.path();
        if p.is_dir() {
            // Skip intentional error fixtures for the "must parse" suite.
            if p.file_name().and_then(|s| s.to_str()) == Some("errors") {
                continue;
            }
            collect_pdl(&p, out);
        } else if p.extension().and_then(|s| s.to_str()) == Some("pdl") {
            out.push(p);
        }
    }
}

#[test]
fn parses_all_non_error_fixtures() {
    let root = repo_root().join("test-fixtures/pdl");
    let mut files = Vec::new();
    collect_pdl(&root, &mut files);
    files.sort();
    assert!(
        !files.is_empty(),
        "expected PDL fixtures under {}",
        root.display()
    );

    let mut failures = Vec::new();
    for path in &files {
        let source = fs::read_to_string(path).unwrap_or_else(|e| panic!("read {}: {e}", path.display()));
        let rel = path.strip_prefix(repo_root()).unwrap_or(path);
        let rel_str = rel.to_string_lossy();
        // Known oddball: intentionally bad sugar sample under atoms (not under errors/).
        if rel_str.contains("scalar_numeric_sugar_bad") {
            continue;
        }
        if let Err(e) = parse_module_source(&source, &rel_str) {
            failures.push(format!("{}: {}", rel_str, e.format()));
        }
    }

    if !failures.is_empty() {
        panic!(
            "{} fixture(s) failed to parse:\n{}",
            failures.len(),
            failures.join("\n")
        );
    }
}

#[test]
fn parses_golden_entry_files() {
    let root = repo_root();
    for rel in [
        "test-fixtures/pdl/atoms/design.pdl",
        "test-fixtures/pdl/molecules/design.pdl",
        "test-fixtures/pdl/integration/design.pdl",
    ] {
        let path = root.join(rel);
        let source = fs::read_to_string(&path).expect(rel);
        parse_module_source(&source, rel).unwrap_or_else(|e| panic!("{rel}: {}", e.format()));
    }
}

#[test]
fn lexer_rejects_unterminated_string_fixture() {
    let path = repo_root().join("test-fixtures/pdl/errors/e001-unterminated-string.pdl");
    let source = fs::read_to_string(&path).expect("unterminated string fixture");
    let err = parse_module_source(&source, "e001-unterminated-string.pdl").unwrap_err();
    assert_eq!(err.code, "PDL-E001");
    assert!(
        err.message.contains("Unterminated") || err.message.to_lowercase().contains("string"),
        "{}",
        err.message
    );
}

#[test]
fn parses_component_with_layout() {
    let src = r#"
component Greeting(title: String = "Hi") layout {
  let T: text = {
    content = title
  }
  children = [T]
}
"#;
    let m = parse_module_source(src, "greeting.pdl").unwrap();
    assert_eq!(m.declarations.len(), 1);
}

#[test]
fn parses_protocol_and_conformance() {
    let src = r#"
protocol ModalContent {
  title = "Modal Title"
  subtitle: String = ""
  emits {
    select(filter: FilterId)
  }
}

component UpsellBody <ModalContent>(
  cta: String = "Upgrade"
) layout {
  let T: text = { content = title }
  children = [T]
}
"#;
    let m = parse_module_source(src, "proto.pdl").unwrap();
    assert_eq!(m.declarations.len(), 2);
    match &m.declarations[0] {
        pdl_core::ast::TopLevelDecl::Protocol(p) => {
            assert_eq!(p.name, "ModalContent");
            assert_eq!(p.params.len(), 2);
            assert_eq!(p.params[0].type_name, "String");
            assert_eq!(p.emits.len(), 1);
            assert_eq!(p.emits[0].name, "select");
        }
        other => panic!("expected protocol, got {other:?}"),
    }
    match &m.declarations[1] {
        pdl_core::ast::TopLevelDecl::Component(c) => {
            assert_eq!(c.conforms_to.as_deref(), Some("ModalContent"));
            assert_eq!(c.params.len(), 1);
            assert_eq!(c.params[0].name, "cta");
        }
        other => panic!("expected component, got {other:?}"),
    }
}

#[test]
fn loads_protocol_fixture_with_effective_params() {
    use pdl_core::design::{effective_params, load_design};
    let root = repo_root();
    let entry = root.join("test-fixtures/pdl/protocols/design.pdl");
    let design = load_design(entry.to_str().unwrap()).expect("load protocols design");
    assert!(design.protocols.contains_key("ModalContent"));
    let upsell = design.components.get("UpsellBody").expect("UpsellBody");
    assert_eq!(upsell.conforms_to.as_deref(), Some("ModalContent"));
    let params = effective_params(&design, upsell).unwrap();
    let names: Vec<_> = params.iter().map(|p| p.name.as_str()).collect();
    assert_eq!(names, vec!["title", "subtitle", "cta"]);
    let confirm = design.components.get("ConfirmBody").expect("ConfirmBody");
    let cparams = effective_params(&design, confirm).unwrap();
    let cnames: Vec<_> = cparams.iter().map(|p| p.name.as_str()).collect();
    assert_eq!(cnames, vec!["title", "subtitle"]);
}

#[test]
fn parses_array_param_and_instance_literal() {
    let src = r#"
protocol ModalContent {
  title = "T"
}

component Body <ModalContent>() layout {
  let T: text = { content = title }
  children = [T]
}

component Modal(
  slots: [ModalContent] = [Body(title: "X")]
) layout {
  children = [slots]
}
"#;
    let m = parse_module_source(src, "slots.pdl").unwrap();
    let modal = m
        .declarations
        .iter()
        .find_map(|d| match d {
            pdl_core::ast::TopLevelDecl::Component(c) if c.name == "Modal" => Some(c),
            _ => None,
        })
        .unwrap();
    assert!(modal.params[0].is_array);
    assert_eq!(modal.params[0].type_name, "ModalContent");
    match &modal.params[0].default_value {
        pdl_core::ast::ValueExpr::Array { items } => match &items[0] {
            pdl_core::ast::ValueExpr::Instance { component, kwargs } => {
                assert_eq!(component, "Body");
                assert!(kwargs.contains_key("title"));
            }
            other => panic!("expected instance, got {other:?}"),
        },
        other => panic!("expected array, got {other:?}"),
    }
}

#[test]
fn parses_emits_and_inline_interaction() {
    let src = r#"
variant FilterId { case all }
protocol SubnavItem {
  filter: FilterId = .all
  emits { select(filter: FilterId) }
}
component FilterChip <SubnavItem>() layout {
  children = []
} interaction {
  on pressEnd { emit select(filter) }
}
emits FilterChip {
  select(filter: FilterId)
}
"#;
    let m = parse_module_source(src, "chip.pdl").unwrap();
    let kinds: Vec<_> = m.declarations.iter().map(|d| match d {
        pdl_core::ast::TopLevelDecl::Variant(_) => "variant",
        pdl_core::ast::TopLevelDecl::Protocol(p) => {
            assert_eq!(p.emits[0].name, "select");
            assert_eq!(p.emits[0].args[0].name, "filter");
            assert_eq!(p.emits[0].args[0].type_name, "FilterId");
            "protocol"
        }
        pdl_core::ast::TopLevelDecl::Component(_) => "component",
        pdl_core::ast::TopLevelDecl::Interaction(i) => {
            assert_eq!(i.name, "default");
            assert!(matches!(
                i.handlers[0].body[0],
                pdl_core::ast::InteractionHandlerItem::Emit { .. }
            ));
            "interaction"
        }
        pdl_core::ast::TopLevelDecl::Emits(e) => {
            assert_eq!(e.component, "FilterChip");
            "emits"
        }
        _ => "other",
    }).collect();
    assert_eq!(kinds, vec!["variant", "protocol", "component", "interaction", "emits"]);
}

#[test]
fn loads_filter_chip_with_effective_emits() {
    use pdl_core::design::{effective_emits, load_design};
    let root = repo_root();
    let entry = root.join("test-fixtures/pdl/protocols/design.pdl");
    let design = load_design(entry.to_str().unwrap()).expect("load");
    let chip = design.components.get("FilterChip").expect("FilterChip");
    let emits = effective_emits(&design, chip);
    assert_eq!(emits.len(), 1);
    assert_eq!(emits[0].name, "select");
    assert_eq!(emits[0].args[0].name, "filter");
    assert_eq!(emits[0].args[0].type_name, "FilterId");
    assert!(design.interactions.get("FilterChip").unwrap().contains_key("default"));
}

#[test]
fn parses_trailing_inline_emits_before_interaction() {
    let src = r#"
variant FilterId { case all }
component Chip(filter: FilterId = .all) layout {
  children = []
} emits {
  select(filter: FilterId)
} interaction {
  on pressEnd { emit select(filter) }
}
"#;
    let m = parse_module_source(src, "inline_emits.pdl").unwrap();
    let kinds: Vec<_> = m
        .declarations
        .iter()
        .map(|d| match d {
            pdl_core::ast::TopLevelDecl::Variant(_) => "variant",
            pdl_core::ast::TopLevelDecl::Component(_) => "component",
            pdl_core::ast::TopLevelDecl::Emits(e) => {
                assert_eq!(e.component, "Chip");
                assert_eq!(e.emits[0].name, "select");
                "emits"
            }
            pdl_core::ast::TopLevelDecl::Interaction(i) => {
                assert_eq!(i.name, "default");
                "interaction"
            }
            _ => "other",
        })
        .collect();
    assert_eq!(
        kinds,
        vec!["variant", "component", "emits", "interaction"]
    );
}

#[test]
fn parses_foreach_self_member_and_layout_on() {
    let src = r#"
variant FilterId { case all case podcasts }
component Chip(
  filter: FilterId = .all,
  selected: Boolean = false
) layout {
  if selected { }
  children = []
}
component Bar(
  currentFilter: FilterId = .all,
  chips: [Chip] = [Chip(filter: .all), Chip(filter: .podcasts)]
) layout {
  ForEach(chips) {
    selected: self.currentFilter == filter
    on select(filter_id: FilterId) {
      currentFilter = filter_id
    }
  }
}
"#;
    let m = parse_module_source(src, "foreach.pdl").unwrap();
    let bar = m
        .declarations
        .iter()
        .find_map(|d| match d {
            pdl_core::ast::TopLevelDecl::Component(c) if c.name == "Bar" => Some(c),
            _ => None,
        })
        .expect("Bar");
    match &bar.body[0] {
        pdl_core::ast::FrameBodyItem::ForEach {
            list,
            binds,
            handlers,
        } => {
            assert_eq!(list, "chips");
            assert!(
                matches!(
                    binds.get("selected"),
                    Some(pdl_core::ast::ValueExpr::Condition { expr })
                        if matches!(
                            expr,
                            pdl_core::ast::ConditionExpr::Cmp {
                                param,
                                rhs,
                                rhs_is_param: true,
                                ..
                            } if param == "currentFilter" && rhs == "filter"
                        )
                ),
                "expected selected: self.currentFilter == filter, got {:?}",
                binds.get("selected")
            );
            assert_eq!(handlers.len(), 1);
            assert_eq!(handlers[0].channel, "select");
            assert_eq!(handlers[0].payload[0].name, "filter_id");
            assert_eq!(handlers[0].body[0].param, "currentFilter");
        }
        other => panic!("expected ForEach, got {other:?}"),
    }
}

#[test]
fn rejects_expose_keyword() {
    let src = r#"
component C() layout { children = [] }
expose C { }
"#;
    let err = parse_module_source(src, "expose.pdl").unwrap_err();
    assert_eq!(err.code, "PDL-E001");
    assert!(err.message.contains("expose"));
}

#[test]
fn bakes_foreach_with_selected_bind() {
    use pdl_core::bake::build_baked_design_component;
    use pdl_core::design::load_design;
    use serde_json::{json, Map};

    let path = repo_root().join("test-fixtures/pdl/protocols/design.pdl");
    let design = load_design(path.to_str().unwrap()).expect("load protocols design");
    let mut overrides = Map::new();
    overrides.insert("currentFilter".into(), json!("podcasts"));
    let doc = build_baked_design_component(
        &design,
        "LibrarySubnav",
        None,
        &overrides,
        None,
    )
    .expect("bake LibrarySubnav");
    let children = doc["components"]["LibrarySubnav"]["root"]["children"]
        .as_array()
        .expect("children");
    assert_eq!(children.len(), 4, "ForEach should expand four chip instances");
    let mut selected_by_title = Map::new();
    for ch in children {
        let kwargs = ch["instanceKwargs"].as_object().expect("instanceKwargs");
        let title = kwargs
            .get("title")
            .and_then(|v| v.as_str())
            .expect("title");
        let selected = kwargs.get("selected").cloned().expect("selected bind");
        selected_by_title.insert(title.to_string(), selected);
        // Nested Label still present
        assert!(ch["children"][0]["props"]["content"].is_string());
    }
    assert_eq!(selected_by_title.get("All"), Some(&json!(false)));
    assert_eq!(selected_by_title.get("Podcasts"), Some(&json!(true)));
    assert_eq!(selected_by_title.get("Episodes"), Some(&json!(false)));
    assert_eq!(selected_by_title.get("Hosts"), Some(&json!(false)));
}
