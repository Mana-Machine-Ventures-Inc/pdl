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
fn enum_is_surface_alias_for_variant() {
    let src = r#"
enum FilterId {
  case all
  case podcasts
}

variant Tone {
  case primary
  case secondary
}

component Chip(
  filter: FilterId = .all,
  tone: Tone = .primary
) layout {
  children = []
}
"#;
    let m = parse_module_source(src, "enum_alias.pdl").expect("parse");
    assert_eq!(m.declarations.len(), 3);
    match &m.declarations[0] {
        pdl_core::ast::TopLevelDecl::Variant(v) => {
            assert_eq!(v.name, "FilterId");
            assert_eq!(v.cases, vec!["all".to_string(), "podcasts".to_string()]);
        }
        other => panic!("expected Variant AST for enum keyword, got {other:?}"),
    }
    match &m.declarations[1] {
        pdl_core::ast::TopLevelDecl::Variant(v) => assert_eq!(v.name, "Tone"),
        other => panic!("expected Variant AST, got {other:?}"),
    }
}

#[test]
fn parses_protocol_and_conformance() {
    let src = r#"
protocol ModalContent: component {
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
protocol ModalContent: component {
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
fn parses_emits_and_host_handler_assignment() {
    let src = r#"
variant FilterId { case all }
protocol PointerInput { host }
protocol SubnavItem: component {
  requires PointerInput
  filter: FilterId = .all
  emits { select(filter: FilterId) }
}
component FilterChip <SubnavItem>() layout {
  children = []
  self.pressEnd = { emit select(filter) }
}
emits FilterChip {
  select(filter: FilterId)
}
"#;
    let m = parse_module_source(src, "chip.pdl").unwrap();
    let kinds: Vec<_> = m.declarations.iter().map(|d| match d {
        pdl_core::ast::TopLevelDecl::Variant(_) => "variant",
        pdl_core::ast::TopLevelDecl::Protocol(p) => {
            if p.name == "SubnavItem" {
                assert_eq!(p.emits[0].name, "select");
                assert_eq!(p.emits[0].args[0].name, "filter");
                assert_eq!(p.emits[0].args[0].type_name, "FilterId");
                assert!(p.requires.iter().any(|r| r == "PointerInput"));
            } else if p.name == "PointerInput" {
                assert_eq!(p.role, pdl_core::ast::ProtocolRole::Host);
            }
            "protocol"
        }
        pdl_core::ast::TopLevelDecl::Component(_) => "component",
        pdl_core::ast::TopLevelDecl::Interaction(i) => {
            assert_eq!(i.name, "default");
            assert_eq!(i.handlers[0].event, "pressEnd");
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
    assert_eq!(
        kinds,
        vec![
            "variant",
            "protocol",
            "protocol",
            "component",
            "interaction",
            "emits"
        ]
    );
}

#[test]
fn host_handler_without_host_protocol_is_e030() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
component Bare() layout {
  children = []
  self.hoverStart = { }
}
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E030");
    assert!(err.message.contains("PointerInput"), "{}", err.message);
}

#[test]
fn host_protocol_prelude_needs_no_import() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/ok.pdl".to_string(),
        r#"
component Chip <PointerInput>() layout {
  children = []
  self.hoverStart = { }
}
"#
        .to_string(),
    );
    let design = load_design_from_sources("/v/ok.pdl", &sources).expect("prelude load");
    assert!(design.protocols.contains_key("PointerInput"));
    assert!(design.protocols.contains_key("EditableText"));
    assert_eq!(
        design.protocols["PointerInput"].role,
        pdl_core::ast::ProtocolRole::Host
    );
}

#[test]
fn bare_host_handler_equals_self_qualified() {
    let bare = r#"
component Chip <PointerInput>() layout {
  children = []
  pressEnd = { }
}
"#;
    let qualified = r#"
component Chip <PointerInput>() layout {
  children = []
  self.pressEnd = { }
}
"#;
    let m_bare = parse_module_source(bare, "bare.pdl").unwrap();
    let m_qual = parse_module_source(qualified, "qual.pdl").unwrap();
    let h_bare = m_bare
        .declarations
        .iter()
        .find_map(|d| match d {
            pdl_core::ast::TopLevelDecl::Interaction(i) => Some(i),
            _ => None,
        })
        .expect("bare interaction");
    let h_qual = m_qual
        .declarations
        .iter()
        .find_map(|d| match d {
            pdl_core::ast::TopLevelDecl::Interaction(i) => Some(i),
            _ => None,
        })
        .expect("qual interaction");
    assert_eq!(h_bare.handlers[0].event, "pressEnd");
    assert_eq!(h_qual.handlers[0].event, "pressEnd");
}

#[test]
fn interaction_keyword_is_rejected() {
    let src = r#"
component Chip <PointerInput>() layout {
  children = []
} interaction {
  on hoverStart { }
}
"#;
    let err = parse_module_source(src, "bad-interaction.pdl").unwrap_err();
    assert_eq!(err.code, "PDL-E001");
    assert!(
        err.message.contains("interaction") && err.message.contains("self."),
        "unexpected message: {}",
        err.message
    );
}

#[test]
fn host_protocol_as_slot_type_is_e031() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
protocol PointerInput { host }
component Bad(items: [PointerInput] = []) layout {
  children = []
}
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E031");
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
fn parses_trailing_inline_emits_with_host_handlers() {
    let src = r#"
variant FilterId { case all }
component Chip <PointerInput>(filter: FilterId = .all) layout {
  children = []
  self.pressEnd = { emit select(filter) }
} emits {
  select(filter: FilterId)
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
                assert_eq!(i.handlers[0].event, "pressEnd");
                "interaction"
            }
            _ => "other",
        })
        .collect();
    assert_eq!(
        kinds,
        vec!["variant", "component", "interaction", "emits"]
    );
}

#[test]
fn rejects_foreach_without_item_binder() {
    let src = r#"
variant FilterId { case all }
component Chip(filter: FilterId = .all) layout { children = [] }
component Bar(
  currentFilter: FilterId = .all,
  chips: [Chip] = [Chip(filter: .all)]
) layout {
  ForEach(chips) {
    selected = self.currentFilter == filter
  }
  children = chips
}
"#;
    let err = parse_module_source(src, "foreach-no-binder.pdl").unwrap_err();
    assert_eq!(err.code, "PDL-E001");
    assert!(
        err.message.contains("item binder") || err.message.contains("Expected In"),
        "unexpected message: {}",
        err.message
    );
}

#[test]
fn rejects_layout_on_keyword_for_emit_capture() {
    let src = r#"
variant FilterId { case all }
component Chip(filter: FilterId = .all) layout { children = [] }
component Bar(
  currentFilter: FilterId = .all,
  chips: [Chip] = [Chip(filter: .all)]
) layout {
  ForEach(chips) { chip in
    on select(filter_id: FilterId) {
      currentFilter = filter_id
    }
  }
  children = chips
}
"#;
    let err = parse_module_source(src, "legacy-on.pdl").unwrap_err();
    assert_eq!(err.code, "PDL-E001");
    assert!(
        err.message.contains("Layout `on` is not allowed"),
        "unexpected message: {}",
        err.message
    );
}

#[test]
fn parses_foreach_self_member_and_emit_capture_assign() {
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
  ForEach(chips) { chip in
    chip.selected = self.currentFilter == filter
    chip.select(filter_id: FilterId) = {
      currentFilter = filter_id
    }
  }
  children = chips
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
            item,
            binds,
            handlers,
        } => {
            assert_eq!(list, "chips");
            assert_eq!(item, "chip");
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
                "expected chip.selected = self.currentFilter == filter, got {:?}",
                binds.get("selected")
            );
            assert_eq!(handlers.len(), 1);
            assert_eq!(handlers[0].channel, "select");
            assert!(handlers[0].qualifier.is_none());
            assert_eq!(handlers[0].payload[0].name, "filter_id");
            assert_eq!(handlers[0].body[0].param, "currentFilter");
        }
        other => panic!("expected ForEach, got {other:?}"),
    }
    match &bar.body[1] {
        pdl_core::ast::FrameBodyItem::Children { entries, .. } => {
            assert_eq!(entries.len(), 1);
            assert!(
                matches!(
                    &entries[0],
                    pdl_core::ast::ChildEntry::FrameRef { id } if id == "chips"
                ),
                "expected bare children = chips → [FrameRef(chips)], got {entries:?}"
            );
        }
        other => panic!("expected children = chips, got {other:?}"),
    }
}

#[test]
fn rejects_api_protocol_without_component_subject() {
    let src = r#"
protocol ModalContent {
  title = ""
}
"#;
    let err = parse_module_source(src, "no-subject.pdl").unwrap_err();
    assert_eq!(err.code, "PDL-E001");
    assert!(
        err.message.contains(": component") || err.message.contains("subject"),
        "unexpected: {}",
        err.message
    );
}

#[test]
fn list_param_emit_capture_is_e036() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
variant FilterId { case all }
protocol Item: component {
  filter: FilterId = .all
  emits { select(filter: FilterId) }
}
component Chip <Item>() layout { children = [] }
component Host(
  currentFilter: FilterId = .all,
  chips: [Item] = [Chip()]
) layout {
  children = chips
  chips.select(filter_id: FilterId) = {
    currentFilter = filter_id
  }
}
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E036");
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

#[test]
fn bakes_single_slot_dotted_overrides() {
    use pdl_core::bake::build_baked_design_component;
    use pdl_core::design::load_design;
    use serde_json::Map;

    let path = repo_root().join("test-fixtures/pdl/systems/airbnb-lite/design.pdl");
    let design = load_design(path.to_str().unwrap()).expect("load airbnb-lite");
    let doc = build_baked_design_component(&design, "AbnButton", None, &Map::new(), None)
        .expect("bake AbnButton");
    let children = doc["components"]["AbnButton"]["root"]["children"]
        .as_array()
        .expect("children");
    assert!(children.len() >= 2, "expected Label + simple slot");
    let simple = children
        .iter()
        .find(|c| c["instanceOf"].as_str() == Some("SimpleChip"))
        .expect("SimpleChip instance (not phantom frame)");
    assert_eq!(
        simple["props"]["content"].as_str(),
        Some("Override content"),
        "simple.content frame override"
    );
    // padding = 50 coerces to uniform EdgeInsets
    assert!(
        simple["props"]["padding"].is_object() || simple["props"]["padding"].as_f64() == Some(50.0),
        "simple.padding frame override, got {:?}",
        simple["props"]["padding"]
    );
}

#[test]
fn foreach_without_children_is_e035() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
protocol Item: component { title = "" }
component Chip <Item>() layout { children = [] }
component Host(
  chips: [Item] = [Chip()]
) layout {
  ForEach(chips) { chip in
    chip.title = "X"
  }
}
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E035");
}
