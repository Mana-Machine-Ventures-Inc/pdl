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
  let T = Text(content: title)
  children = [T]
}
"#;
    let m = parse_module_source(src, "greeting.pdl").unwrap();
    assert_eq!(m.declarations.len(), 1);
}

#[test]
fn rejects_classic_frame_let() {
    let path = repo_root().join("test-fixtures/pdl/errors/e001-classic-frame-let.pdl");
    let source = fs::read_to_string(&path).expect("classic frame let fixture");
    let err = parse_module_source(&source, "e001-classic-frame-let.pdl").unwrap_err();
    assert_eq!(err.code, "PDL-E001");
    assert!(
        err.message.contains("Classic frame let") && err.message.contains("World A"),
        "{}",
        err.message
    );
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
  let T = Text(content: title)
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
  let T = Text(content: title)
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
fn parses_motion_from_to_stagger_on_host_handlers() {
    let src = r#"
component Modal <PointerInput>() layout {
  children = []
  self.appear = {
    animate = (duration: 250, easing: "ease-out")
    from { opacity = 0 scale = 0.95 translateY = 8 }
    stagger = 30
    staggerFrom = .last
  }
  self.dismiss = {
    to { opacity = 0 }
  }
}
"#;
    let m = parse_module_source(src, "motion.pdl").unwrap();
    let ix = m
        .declarations
        .iter()
        .find_map(|d| match d {
            pdl_core::ast::TopLevelDecl::Interaction(i) => Some(i),
            _ => None,
        })
        .expect("interaction");
    let appear = ix.handlers.iter().find(|h| h.event == "appear").unwrap();
    assert!(appear.body.iter().any(|it| matches!(
        it,
        pdl_core::ast::InteractionHandlerItem::From { .. }
    )));
    assert!(appear.body.iter().any(|it| matches!(
        it,
        pdl_core::ast::InteractionHandlerItem::Stagger { ms } if (*ms - 30.0).abs() < f64::EPSILON
    )));
    assert!(appear.body.iter().any(|it| matches!(
        it,
        pdl_core::ast::InteractionHandlerItem::StaggerFrom { value } if value == "last"
    )));
    let dismiss = ix.handlers.iter().find(|h| h.event == "dismiss").unwrap();
    assert!(dismiss.body.iter().any(|it| matches!(
        it,
        pdl_core::ast::InteractionHandlerItem::To { .. }
    )));
}

#[test]
fn motion_lab_catalogue_evaluates_snapshots() {
    use pdl_core::{build_component_catalogue, load_design};
    let path = repo_root().join("test-fixtures/pdl/lab/motion/design.pdl");
    let design = load_design(path.to_str().unwrap()).expect("load motion lab");
    let cat = build_component_catalogue(&design, None, &[], Some("2026-01-01T00:00:00.000Z".into()))
        .expect("catalogue");
    let appear = &cat["components"]["MotionModal"]["interactions"][0]["handlers"][0];
    assert_eq!(appear["event"], "appear");
    assert_eq!(appear["motion"]["from"]["opacity"], 0.0);
    assert_eq!(appear["motion"]["from"]["scale"], 0.95);
    assert_eq!(appear["motion"]["from"]["translateY"], 8.0);
    assert_eq!(appear["motion"]["transition"]["duration"], 250.0);
    let list = &cat["components"]["MotionStaggerList"]["interactions"][0]["handlers"][0];
    assert_eq!(list["motion"]["stagger"], 40.0);
    assert_eq!(list["motion"]["staggerFrom"], "first");
}

#[test]
fn self_prop_assigns_component_root_not_intermediate_let() {
    use pdl_core::design::load_design;
    use pdl_core::evaluate::build_resolved_token_map;
    use pdl_core::resolve::{resolve_component_tree, RESOLVE_OPTIONS_LITERAL_BAKE};
    use serde_json::Value;

    let entry = repo_root().join("test-fixtures/pdl/atoms/self_root_prop.pdl");
    let design = load_design(entry.to_str().unwrap()).expect("load");
    let mut tokens = build_resolved_token_map(&design, None, &[]).unwrap();
    let root = resolve_component_tree(
        &design,
        "AtomSelfRootProp",
        &mut tokens,
        &Default::default(),
        RESOLVE_OPTIONS_LITERAL_BAKE,
    )
    .expect("resolve");
    assert_eq!(
        root.props.get("background"),
        Some(&Value::String("#FFFFFF".into())),
        "self.background → component root"
    );
    let b = root
        .children
        .iter()
        .find(|c| c.id == "b")
        .expect("let b");
    assert_eq!(
        b.props.get("background"),
        Some(&Value::String("#AAAAAA".into())),
        "b.background from nested c"
    );
    let c = b.children.iter().find(|ch| ch.id == "c").expect("let c");
    assert_eq!(
        c.props.get("background"),
        Some(&Value::String("#111111".into())),
        "bare background on c"
    );
}

#[test]
fn rejects_unknown_param_type_boo() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
component Bad(selected: Boo = false) layout { }
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E039");
    assert!(err.message.contains("Boo"), "{}", err.message);
}

#[test]
fn rejects_boolean_param_type_spelling() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
component Bad(selected: Boolean = false) layout { }
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E039");
    assert!(
        err.message.contains("Boolean") && err.message.contains("Bool"),
        "{}",
        err.message
    );
}

#[test]
fn rejects_let_instance_kwarg_wrong_variant_type() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
variant Tone {
  case primary
  case secondary
}

component LabCard(title: String = "Card") layout {
  children = []
}

component Host(tone: Tone = .primary) layout {
  let Card = LabCard(title: tone)
  children = [Card]
}
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E040");
    assert!(
        err.message.contains("tone") && err.message.contains("Tone") && err.message.contains("String"),
        "{}",
        err.message
    );
}

#[test]
fn rejects_let_instance_kwarg_bool_to_string() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
component LabCard(title: String = "Card") layout {
  children = []
}

component Host(selected: Bool = false) layout {
  let Card = LabCard(title: selected)
  children = [Card]
}
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E040");
    assert!(
        err.message.contains("selected")
            && err.message.contains("Bool")
            && err.message.contains("String"),
        "{}",
        err.message
    );
}

#[test]
fn accepts_call_site_bool_equality_kwarg_and_bakes() {
    use pdl_core::bake::build_baked_design_component;
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    use serde_json::{json, Map};

    let mut sources = SourceMap::new();
    sources.insert(
        "/v/ok.pdl".to_string(),
        r#"
variant FilterId {
  case all
  case podcasts
}

component FilterChip(
  title: String = "All",
  filter: FilterId = .all,
  selected: Bool = false
) layout {
  if selected {
    background = #111111
  } else {
    background = #EEEEEE
  }
  let Label = Text(content: title)
  children = [Label]
}

component FilterBar(currentFilter: FilterId = .all) layout {
  direction = .row
  let All = FilterChip(
    title: "All",
    filter: .all,
    selected: currentFilter == .all
  )
  let Podcasts = FilterChip(
    title: "Podcasts",
    filter: .podcasts,
    selected: currentFilter == .podcasts
  )
  children = [All, Podcasts]
}
"#
        .to_string(),
    );
    let design = load_design_from_sources("/v/ok.pdl", &sources).expect("load");
    let mut overrides = Map::new();
    overrides.insert("currentFilter".to_string(), json!("podcasts"));
    let doc = build_baked_design_component(
        &design,
        "FilterBar",
        None,
        &overrides,
        Some("1970-01-01T00:00:00.000Z".to_string()),
    )
    .expect("bake");
    let root = &doc["components"]["FilterBar"]["root"];
    let children = root["children"].as_array().expect("children");
    assert_eq!(children.len(), 2);
    assert_eq!(children[0]["props"]["background"], "#EEEEEE");
    assert_eq!(children[1]["props"]["background"], "#111111");
}

#[test]
fn rejects_blur_vibrancy_number_and_dot_enum() {
    use pdl_core::design::load_design;
    for name in [
        "e040-blur-vibrancy-number.pdl",
        "e040-blur-vibrancy-dot-enum.pdl",
    ] {
        let entry = repo_root().join("test-fixtures/pdl/errors").join(name);
        let err = load_design(entry.to_str().unwrap()).unwrap_err();
        assert_eq!(err.code, "PDL-E040", "{name}: {}", err.message);
        assert!(
            err.message.contains("vibrancy:") && err.message.contains("Vibrancy"),
            "{name}: {}",
            err.message
        );
    }
}

#[test]
fn rejects_handler_frame_prop_assign() {
    use pdl_core::design::load_design;
    let entry = repo_root().join("test-fixtures/pdl/errors/e001-handler-frame-prop-assign.pdl");
    let err = load_design(entry.to_str().unwrap()).unwrap_err();
    assert_eq!(err.code, "PDL-E001");
    assert!(
        err.message.contains("Interaction handlers can only assign component parameters")
            && err.message.contains("Label.content")
            && err.message.contains("layout body"),
        "{}",
        err.message
    );
}

#[test]
fn rejects_naked_vibrancy_tuple() {
    use pdl_core::design::load_design;
    for name in [
        "e001-blur-vibrancy-naked-tuple.pdl",
        "e001-vibrancy-naked-tuple-token.pdl",
    ] {
        let entry = repo_root().join("test-fixtures/pdl/errors").join(name);
        let err = load_design(entry.to_str().unwrap()).unwrap_err();
        assert_eq!(err.code, "PDL-E001", "{name}: {}", err.message);
        assert!(
            err.message.contains("Naked")
                && err.message.contains("saturation")
                && err.message.contains("Vibrancy(saturation"),
            "{name}: {}",
            err.message
        );
    }
}

#[test]
fn blur_vibrancy_ctor_loads() {
    use pdl_core::design::load_design;
    let entry = repo_root().join("test-fixtures/pdl/atoms/blur_vibrancy_ctor.pdl");
    load_design(entry.to_str().unwrap()).expect("typed Vibrancy(…) on Blur.vibrancy");
}

#[test]
fn let_value_ramp_bakes_into_background() {
    use pdl_core::bake::build_baked_design_component;
    use pdl_core::design::load_design;
    use serde_json::Map;
    let entry = repo_root().join("test-fixtures/pdl/atoms/let_value_ramp.pdl");
    let design = load_design(entry.to_str().unwrap()).expect("load");
    let baked =
        build_baked_design_component(&design, "AtomLetValueRamp", None, &Map::new(), None)
            .expect("bake");
    let kind = baked
        .pointer("/components/AtomLetValueRamp/root/props/background/0/kind")
        .and_then(|v| v.as_str());
    assert_eq!(kind, Some("ramp"));
}

#[test]
fn let_value_blur_object_and_bare_token_layer() {
    use pdl_core::bake::build_baked_design_component;
    use pdl_core::design::load_design;
    use serde_json::Map;
    let entry = repo_root().join("test-fixtures/pdl/atoms/let_value_named_types.pdl");
    let design = load_design(entry.to_str().unwrap()).expect("load");
    let baked = build_baked_design_component(
        &design,
        "AtomLetValueNamedTypes",
        None,
        &Map::new(),
        None,
    )
    .expect("bake");
    let radius = baked
        .pointer("/components/AtomLetValueNamedTypes/root/props/background/0/radius")
        .and_then(|v| v.as_f64());
    assert_eq!(radius, Some(10.0));

    let mol = repo_root().join("test-fixtures/pdl/molecules/m_07_layer_stacks.pdl");
    let design = load_design(mol.to_str().unwrap()).expect("load m07");
    let baked = build_baked_design_component(
        &design,
        "MoleculeLayerInlineSandwich",
        None,
        &Map::new(),
        None,
    )
    .expect("bake m07");
    let s = baked.to_string();
    assert!(s.contains("\"kind\":\"blur\"") || s.contains("\"kind\": \"blur\""));
    assert!(s.contains("\"radius\":6") || s.contains("\"radius\": 6"));
}

#[test]
fn child_mount_at_opacity_applies_on_bake() {
    use pdl_core::bake::build_baked_design_component;
    use pdl_core::design::load_design;
    use serde_json::Map;
    let root = repo_root();
    let entry = root.join("test-fixtures/pdl/atoms/child_opacity_at.pdl");
    let design = load_design(entry.to_str().unwrap()).expect("load");
    let baked = build_baked_design_component(&design, "LabLayers", None, &Map::new(), None)
        .expect("bake");
    let opacity = baked
        .pointer("/components/LabLayers/root/children/0/props/opacity")
        .and_then(|v| v.as_f64());
    assert_eq!(opacity, Some(0.5), "expected Pic @ 0.5 → child opacity");
}

#[test]
fn rejects_spacer_at_opacity() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
component Bad() layout {
  let A = Text(content: "a")
  children = [Spacer() @ 0.5, A]
}
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert!(
        err.message.contains("Spacer()") && err.message.to_lowercase().contains("opacity"),
        "{}",
        err.message
    );
}

#[test]
fn rejects_media_double_opacity_at() {
    use pdl_core::design::load_design;
    let root = repo_root();
    let entry = root.join("test-fixtures/pdl/errors/e020-media-double-opacity.pdl");
    let err = load_design(entry.to_str().unwrap()).unwrap_err();
    assert!(
        err.message.contains("opacity:") || err.code == "PDL-E001",
        "{}: {}",
        err.code,
        err.message
    );
}

#[test]
fn rejects_variant_param_default_string_literal() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
variant Mode {
  case a
  case b
}

component BadDefault(mode: Mode = "a") layout {
  children = []
}
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E040");
    assert!(err.message.contains("Mode") || err.message.contains("string"), "{}", err.message);
}

#[test]
fn distance_token_rejects_string() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
primitive distance4: Distance = "a"
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E005");
    assert!(
        err.message.contains("Distance") && err.message.contains("non-negative number"),
        "{}",
        err.message
    );
}

#[test]
fn opacity_of_rejects_out_of_range_literal() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
primitive bad: Shadow = Shadow(x: 6, y: 6, blurRadius: 12, spread: 0, color: #000000 @ 1.5)
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E005");
    assert!(
        err.message.contains("0…1") && err.message.contains("1.5"),
        "{}",
        err.message
    );
}

#[test]
fn shadow_token_rejects_color_token_axis() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
primitive red: Color = #FF0000
primitive bad: Shadow = Shadow(x: red, y: 1.5, blurRadius: 3, spread: 0, color: #000000 @ 0.35)
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E005");
    assert!(
        err.message.contains("field `x`")
            && err.message.contains("red")
            && err.message.contains("Color"),
        "{}",
        err.message
    );
}

#[test]
fn shadow_token_rejects_string_axis() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
primitive bad: Shadow = Shadow(x: "a", y: 1.5, blurRadius: 3, spread: 0, color: #000000 @ 0.35)
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E005");
    assert!(
        err.message.contains("field `x`") && err.message.contains("number"),
        "{}",
        err.message
    );
}

#[test]
fn shadow_token_rejects_css_string() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
primitive bad: Shadow = "0 2px 8px rgba(0,0,0,0.12)"
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E005");
    assert!(
        err.message.contains("Shadow") && err.message.contains("CSS box-shadow"),
        "{}",
        err.message
    );
}

#[test]
fn radius_token_rejects_corner_literal() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
primitive bad: Radius = Corner(tl: 1, tr: 1, br: 1, bl: 1)
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E005");
    assert!(
        err.message.contains("Corner") && err.message.contains("cornerRadius"),
        "{}",
        err.message
    );
}

#[test]
fn fontfamily_token_rejects_number() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
primitive bad: FontFamily = 2
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E005");
    assert!(
        err.message.contains("FontFamily") && err.message.contains("string"),
        "{}",
        err.message
    );
}

#[test]
fn fontfamily_token_rejects_hex() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
primitive bad: FontFamily = #FF0000
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E005");
    assert!(
        err.message.contains("FontFamily") && err.message.contains("string"),
        "{}",
        err.message
    );
}

#[test]
fn bare_fixed_sizing_mentions_distance_number() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
primitive s: Sizing = .fixed
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E001");
    assert!(
        err.message.contains("Distance number") && err.message.contains(".fixed"),
        "{}",
        err.message
    );
}

#[test]
fn parses_qualified_sizing_hug() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/ok.pdl".to_string(),
        r#"
primitive s: Sizing = Sizing.hug
"#
        .to_string(),
    );
    let d = load_design_from_sources("/v/ok.pdl", &sources).expect("load");
    let p = d.primitives.get("s").expect("primitive s");
    assert_eq!(p.token_type, "Sizing");
    assert!(matches!(
        p.value,
        pdl_core::ast::ValueExpr::Sizing {
            mode: pdl_core::ast::SizingMode::Hug
        }
    ));
}

#[test]
fn parses_qualified_frame_enums() {
    use pdl_core::ast::{FrameBodyItem, TopLevelDecl, ValueExpr};
    use pdl_core::parser::parse_module_source;
    let src = r#"
component C() layout {
  direction = Direction.row
  justify = Justify.center
  wrap = Wrap.wrap
  overflow = Overflow.clip
  children = []
}
"#;
    let m = parse_module_source(src, "x.pdl").expect("parse");
    let TopLevelDecl::Component(c) = &m.declarations[0] else {
        panic!("expected component");
    };
    let mut found = 0;
    for item in &c.body {
        let FrameBodyItem::Prop { name, value } = item else {
            continue;
        };
        match (name.as_str(), value) {
            ("direction", ValueExpr::DotEnum { value }) => {
                assert_eq!(value, ".row");
                found += 1;
            }
            ("justify", ValueExpr::DotEnum { value }) => {
                assert_eq!(value, ".center");
                found += 1;
            }
            ("wrap", ValueExpr::DotEnum { value }) => {
                assert_eq!(value, ".wrap");
                found += 1;
            }
            ("overflow", ValueExpr::DotEnum { value }) => {
                assert_eq!(value, ".clip");
                found += 1;
            }
            _ => {}
        }
    }
    assert_eq!(found, 4, "expected four qualified enums");
}

#[test]
fn sizing_token_rejects_string() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
primitive bad: Sizing = ".hug"
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E005");
    assert!(
        err.message.contains("Sizing") && err.message.contains("string"),
        "{}",
        err.message
    );
}

#[test]
fn lineheight_token_rejects_string() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
primitive bad: LineHeight = "1.35"
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E005");
    assert!(err.message.contains("LineHeight"), "{}", err.message);
}

#[test]
fn letterspacing_token_rejects_string() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
primitive bad: LetterSpacing = "0.01"
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E005");
    assert!(err.message.contains("LetterSpacing"), "{}", err.message);
}

#[test]
fn size_token_rejects_string() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
primitive bad: Size = "16"
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E005");
    assert!(
        err.message.contains("Size") && err.message.contains("number"),
        "{}",
        err.message
    );
}

#[test]
fn color_token_rejects_number() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
primitive bad: Color = 12
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E005");
    assert!(
        err.message.contains("Color") && err.message.contains("hex"),
        "{}",
        err.message
    );
}

#[test]
fn opacity_token_rejects_string() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
primitive bad: Opacity = "0.5"
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E005");
    assert!(
        err.message.contains("Opacity") && err.message.contains("0…1"),
        "{}",
        err.message
    );
}

#[test]
fn primitive_token_alias_is_e005() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
primitive red: Color = #FF0000
primitive shield4: Opacity = red
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E005");
    assert!(
        err.message.contains("Primitive `shield4` must use a literal value"),
        "{}",
        err.message
    );
    assert!(err.message.contains("Color"), "{}", err.message);
}

#[test]
fn duplicate_token_name_is_e003() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/dup.pdl".to_string(),
        r#"
primitive color.dup: Color = #FF0000
primitive color.dup: Color = #00FF00
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/dup.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E003");
    assert!(
        err.message.contains("Invalid redeclaration of token `color.dup`"),
        "{}",
        err.message
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
fn stdlib_host_protocols_file_parses_inbound_and_verbs() {
    use pdl_core::design::load_design;
    let path = repo_root().join("test-fixtures/pdl/stdlib/host_protocols.pdl");
    let design = load_design(path.to_str().unwrap()).expect("load stdlib host_protocols");
    let ptr = design.protocols.get("PointerInput").expect("PointerInput");
    assert_eq!(ptr.role, pdl_core::ast::ProtocolRole::Host);
    assert!(ptr.inbound.iter().any(|c| c == "pressEnd"));
    assert!(ptr.inbound.iter().any(|c| c == "hoverStart"));
    assert_eq!(ptr.inbound.len(), 10);
    assert!(ptr.verbs.is_empty());
    let edit = design.protocols.get("EditableText").expect("EditableText");
    assert!(edit.inbound.iter().any(|c| c == "editingFinished"));
    assert!(edit.inbound.iter().any(|c| c == "editingCancelled"));
    assert!(edit.inbound.iter().any(|c| c == "keyboardDismissed")); // alias
    assert!(
        edit.verbs
            .iter()
            .any(|v| v.name == "beginEditing" && v.params == ["startingValue"]),
        "beginEditing(startingValue): {:?}",
        edit.verbs
    );
    assert!(edit.verbs.iter().any(|v| v.name == "finishEditing" && v.params.is_empty()));
    assert!(edit.verbs.iter().any(|v| v.name == "cancelEditing" && v.params.is_empty()));
    assert!(edit.verbs.iter().any(|v| v.name == "commitEditing" && v.params.is_empty()));
}

#[test]
fn editable_text_injects_value_and_facts() {
    use pdl_core::design::{effective_params, load_design_from_sources};
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/field.pdl".to_string(),
        r#"
protocol FormField: component {
  requires EditableText
  requires PointerInput
  placeholder: String = ""
}
component SearchField <FormField>(placeholder: String = "Search") text {
  content = placeholder
  if isEditing {
    content = value
  }
  self.pressEnd = { beginEditing(value) }
  self.editingFinished = { finishEditing() }
}
"#
        .to_string(),
    );
    let design = load_design_from_sources("/v/field.pdl", &sources).expect("load");
    let c = design.components.get("SearchField").expect("SearchField");
    let params = effective_params(&design, c).expect("params");
    let names: Vec<&str> = params.iter().map(|p| p.name.as_str()).collect();
    assert!(names.contains(&"value"), "{names:?}");
    assert!(names.contains(&"isEditing"), "{names:?}");
    assert!(names.contains(&"isEmpty"), "{names:?}");
    assert!(names.contains(&"isOverLimit"), "{names:?}");
    assert!(names.contains(&"placeholder"), "{names:?}");
    assert!(names.contains(&"activatesOn"), "{names:?}");
    assert!(
        design.variants.contains_key("TextFieldActivation"),
        "prelude TextFieldActivation"
    );
}

#[test]
fn parses_let_qualified_host_verbs_in_emit_capture() {
    use pdl_core::ast::LayoutOnBodyItem;
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/note.pdl".to_string(),
        r#"
component Btn <PointerInput>() layout {
  children = []
  pressEnd = { emit tap() }
} emits { tap() }

component Field <EditableText>(
  activatesOn: TextFieldActivation = .press
) text {
  content = value
  editingBegan = {
    emit began(value)
  }
  editingFinished = {
    finishEditing()
    emit finished(value)
  }
  editingCancelled = {
    cancelEditing()
    emit cancelled(value)
  }
} emits {
  began(value: String)
  finished(value: String)
  cancelled(value: String)
}

component Editor(draft: String = "", editing: Bool = false, committed: String = "") layout {
  let Input = Field(value: draft, isEditing: editing)
  let Edit = Btn()
  let Done = Btn()
  let Cancel = Btn()
  children = [Input, Edit, Done, Cancel]
  Edit.tap() = {
    Input.beginEditing(committed)
  }
  Done.tap() = {
    Input.finishEditing()
  }
  Cancel.tap() = {
    Input.cancelEditing()
  }
  Input.began(value: String) = {
    draft = value
    editing = true
  }
  Input.finished(value: String) = {
    draft = value
    committed = value
    editing = false
  }
  Input.cancelled(value: String) = {
    draft = committed
    editing = false
  }
}
"#
        .to_string(),
    );
    let design = load_design_from_sources("/v/note.pdl", &sources).expect("load");
    let editor = design.components.get("Editor").expect("Editor");
    let captures: Vec<_> = editor
        .body
        .iter()
        .filter_map(|i| match i {
            pdl_core::ast::FrameBodyItem::LayoutOn { handler } => Some(handler),
            _ => None,
        })
        .collect();
    assert!(captures.len() >= 3, "expected Edit/Done/Cancel captures, got {}", captures.len());
    let edit = captures
        .iter()
        .find(|h| h.qualifier.as_deref() == Some("Edit"))
        .expect("Edit.tap");
    assert!(
        edit.body.iter().any(|b| matches!(
            b,
            LayoutOnBodyItem::HostVerb {
                qualifier: Some(q),
                name,
                ..
            } if q == "Input" && name == "beginEditing"
        )),
        "body: {:?}",
        edit.body
    );
}

#[test]
fn editable_text_is_empty_true_clears_stale_value() {
    use pdl_core::bake::build_baked_design_component;
    use pdl_core::design::load_design_from_sources;
    use pdl_core::evaluate::build_resolved_token_map;
    use pdl_core::resolve::{resolve_component_tree, RESOLVE_OPTIONS_LITERAL_BAKE};
    use pdl_core::SourceMap;
    use serde_json::{Map, Value};
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/empty.pdl".to_string(),
        r#"
component MyTextField <EditableText>() text {
  content = value
  if isEditing {
    content = value
  } else if isEmpty {
    content = "Type here…"
  }
}
"#
        .to_string(),
    );
    let design = load_design_from_sources("/v/empty.pdl", &sources).expect("load");
    let mut tokens = build_resolved_token_map(&design, None, &[]).expect("tokens");

    // Non-empty value alone: default isEmpty=true must NOT wipe value.
    let mut value_only = Map::new();
    value_only.insert("value".into(), Value::String("Hello".into()));
    let tree_hello = resolve_component_tree(
        &design,
        "MyTextField",
        &mut tokens,
        &value_only,
        RESOLVE_OPTIONS_LITERAL_BAKE,
    )
    .expect("resolve value-only");
    assert_eq!(
        tree_hello.props.get("content").and_then(|v| v.as_str()),
        Some("Hello"),
        "tree props: {:?}",
        tree_hello.props
    );

    // Explicit isEmpty=true clears stale value so placeholder chrome wins.
    let mut overrides = Map::new();
    overrides.insert("value".into(), Value::String("Hello".into()));
    overrides.insert("isEmpty".into(), Value::Bool(true));
    let tree = resolve_component_tree(
        &design,
        "MyTextField",
        &mut tokens,
        &overrides,
        RESOLVE_OPTIONS_LITERAL_BAKE,
    )
    .expect("resolve");
    let content = tree
        .props
        .get("content")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    assert_eq!(content, "Type here…", "tree props: {:?}", tree.props);

    let baked = build_baked_design_component(&design, "MyTextField", None, &overrides, None)
        .expect("bake");
    let bp = &baked["components"]["MyTextField"]["bakedParams"];
    assert_eq!(bp["isEmpty"], Value::Bool(true));
    assert_eq!(bp["value"], Value::String("".into()), "bakedParams: {bp:?}");
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
  selected: Bool = false
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
            body,
        } => {
            assert_eq!(list, "chips");
            assert_eq!(item, "chip");
            assert!(
                matches!(
                    &body[0],
                    pdl_core::ast::FrameBodyItem::FrameProp {
                        frame,
                        name,
                        value: pdl_core::ast::ValueExpr::Condition { expr },
                    } if frame == "chip"
                        && name == "selected"
                        && matches!(
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
                &body[0]
            );
            let handlers = pdl_core::ast::foreach_layout_handlers(body);
            assert_eq!(handlers.len(), 1);
            assert_eq!(handlers[0].channel, "select");
            assert!(handlers[0].qualifier.is_none());
            assert_eq!(handlers[0].payload[0].name, "filter_id");
            match &handlers[0].body[0] {
                pdl_core::ast::LayoutOnBodyItem::Assign(a) => {
                    assert_eq!(a.param, "currentFilter");
                }
                other => panic!("expected assign, got {other:?}"),
            }
        }
        other => panic!("expected ForEach, got {other:?}"),
    }
    match &bar.body[1] {
        pdl_core::ast::FrameBodyItem::Children { entries, .. } => {
            assert_eq!(entries.len(), 1);
            assert!(
                matches!(
                    &entries[0],
                    pdl_core::ast::ChildEntry::FrameRef { id, .. } if id == "chips"
                ),
                "expected bare children = chips → [FrameRef(chips)], got {entries:?}"
            );
        }
        other => panic!("expected children = chips, got {other:?}"),
    }
}

#[test]
fn parses_foreach_if_else_overrides() {
    let src = r#"
variant FilterId { case all case podcasts }
component Chip(
  filter: FilterId = .all,
  selected: Bool = false
) layout {
  children = []
}
component Bar(
  currentFilter: FilterId = .all,
  chips: [Chip] = [Chip(filter: .all), Chip(filter: .podcasts)]
) layout {
  ForEach(chips) { chip in
    if self.currentFilter == filter {
      chip.selected = true
    } else {
      chip.selected = false
    }
    chip.select(filter_id: FilterId) = {
      currentFilter = filter_id
    }
  }
  children = chips
}
"#;
    let m = parse_module_source(src, "foreach-if.pdl").unwrap();
    let bar = m
        .declarations
        .iter()
        .find_map(|d| match d {
            pdl_core::ast::TopLevelDecl::Component(c) if c.name == "Bar" => Some(c),
            _ => None,
        })
        .expect("Bar");
    match &bar.body[0] {
        pdl_core::ast::FrameBodyItem::ForEach { body, .. } => {
            assert!(
                matches!(&body[0], pdl_core::ast::FrameBodyItem::If { .. }),
                "expected if in ForEach body, got {:?}",
                &body[0]
            );
            let handlers = pdl_core::ast::foreach_layout_handlers(body);
            assert_eq!(handlers.len(), 1);
            assert_eq!(handlers[0].channel, "select");
        }
        other => panic!("expected ForEach, got {other:?}"),
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
fn bakes_foreach_if_else_selected_bind() {
    use pdl_core::bake::build_baked_design_component;
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    use serde_json::{json, Map};

    let mut sources = SourceMap::new();
    sources.insert(
        "/v/foreach-if.pdl".to_string(),
        r#"
variant FilterId { case all case podcasts }
component Chip(
  filter: FilterId = .all,
  selected: Bool = false,
  title: String = ""
) layout {
  children = []
}
component Bar(
  currentFilter: FilterId = .all,
  chips: [Chip] = [
    Chip(filter: .all, title: "All"),
    Chip(filter: .podcasts, title: "Podcasts")
  ]
) layout {
  ForEach(chips) { chip in
    if self.currentFilter == filter {
      chip.selected = true
    } else {
      chip.selected = false
    }
  }
  children = chips
}
"#
        .to_string(),
    );
    let design = load_design_from_sources("/v/foreach-if.pdl", &sources).expect("load");
    let mut overrides = Map::new();
    overrides.insert("currentFilter".into(), json!("podcasts"));
    let doc = build_baked_design_component(&design, "Bar", None, &overrides, None).expect("bake");
    let children = doc["components"]["Bar"]["root"]["children"]
        .as_array()
        .expect("children");
    assert_eq!(children.len(), 2);
    let mut selected_by_title = Map::new();
    for ch in children {
        let kwargs = ch["instanceKwargs"].as_object().expect("instanceKwargs");
        let title = kwargs.get("title").and_then(|v| v.as_str()).expect("title");
        let selected = kwargs.get("selected").cloned().expect("selected");
        selected_by_title.insert(title.to_string(), selected);
    }
    assert_eq!(selected_by_title.get("All"), Some(&json!(false)));
    assert_eq!(selected_by_title.get("Podcasts"), Some(&json!(true)));
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

#[test]
fn foreach_forwarded_through_child_list_mount() {
    use pdl_core::bake::build_baked_design_component;
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    use serde_json::Map;
    let entry = repo_root().join("test-fixtures/pdl/protocols/foreach_cross_component.pdl");
    let src = fs::read_to_string(&entry).expect("fixture");
    let mut sources = SourceMap::new();
    let entry_s = entry.to_string_lossy().replace('\\', "/");
    sources.insert(entry_s.clone(), src);
    let design = load_design_from_sources(&entry_s, &sources).expect("load");
    let doc = build_baked_design_component(
        &design,
        "CrossShell",
        None,
        &Map::new(),
        Some("1970-01-01T00:00:00.000Z".to_string()),
    )
    .expect("bake");
    let root = &doc["components"]["CrossShell"]["root"];
    let mut stamps = Vec::new();
    let mut selected = Vec::new();
    fn walk(f: &serde_json::Value, stamps: &mut Vec<String>, selected: &mut Vec<(String, bool)>) {
        if let Some(list) = f.get("foreachList").and_then(|v| v.as_str()) {
            stamps.push(list.to_string());
        }
        if f.get("instanceOf").and_then(|v| v.as_str()) == Some("CrossChipView") {
            let kw = f.get("instanceKwargs").and_then(|v| v.as_object());
            let mood = kw
                .and_then(|m| m.get("mood"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let sel = kw
                .and_then(|m| m.get("selected"))
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            selected.push((mood, sel));
        }
        if let Some(ch) = f.get("children").and_then(|v| v.as_array()) {
            for c in ch {
                walk(c, stamps, selected);
            }
        }
    }
    walk(root, &mut stamps, &mut selected);
    assert_eq!(stamps, vec!["chips".to_string(), "chips".to_string()]);
    assert!(
        selected.contains(&("all".to_string(), true)),
        "expected All selected via parent ForEach overlay, got {selected:?}"
    );
    assert!(
        selected.contains(&("focus".to_string(), false)),
        "expected Focus unselected, got {selected:?}"
    );
}

#[test]
fn parses_ratio_wh_sugar() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/ok.pdl".to_string(),
        r#"
primitive r: Ratio = 16:9
primitive s: Ratio = 4:3
primitive t: Ratio = 1
"#
        .to_string(),
    );
    let d = load_design_from_sources("/v/ok.pdl", &sources).unwrap();
    match &d.primitives.get("r").unwrap().value {
        pdl_core::ast::ValueExpr::Ratio { width, height } => {
            assert_eq!(*width, 16.0);
            assert_eq!(*height, 9.0);
        }
        other => panic!("expected Ratio sugar, got {other:?}"),
    }
    match &d.primitives.get("s").unwrap().value {
        pdl_core::ast::ValueExpr::Ratio { width, height } => {
            assert_eq!(*width, 4.0);
            assert_eq!(*height, 3.0);
        }
        other => panic!("expected 4:3, got {other:?}"),
    }
    match &d.primitives.get("t").unwrap().value {
        pdl_core::ast::ValueExpr::Number { value } => assert_eq!(*value, 1.0),
        other => panic!("expected bare number, got {other:?}"),
    }
}

#[test]
fn ratio_wh_sugar_evaluates_to_width_over_height() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::evaluate::build_resolved_token_map;
    use pdl_core::SourceMap;
    use serde_json::Value;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/ok.pdl".to_string(),
        r#"
primitive r: Ratio = 16:9
semantic hero: Ratio = r
"#
        .to_string(),
    );
    let d = load_design_from_sources("/v/ok.pdl", &sources).unwrap();
    let map = build_resolved_token_map(&d, None, &[]).unwrap();
    let v = match map.get("r").unwrap() {
        Value::Number(n) => n.as_f64().unwrap(),
        other => panic!("expected number, got {other}"),
    };
    assert!((v - 16.0 / 9.0).abs() < 1e-12, "got {v}");
    let h = match map.get("hero").unwrap() {
        Value::Number(n) => n.as_f64().unwrap(),
        other => panic!("expected number, got {other}"),
    };
    assert!((h - 16.0 / 9.0).abs() < 1e-12, "got {h}");
}

#[test]
fn ratio_zero_height_is_e001() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
primitive bad: Ratio = 16:0
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E001");
    assert!(
        err.message.contains("positive") || err.message.contains("16:9"),
        "{}",
        err.message
    );
}

#[test]
fn ratio_string_rhs_is_e005() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
primitive bad: Ratio = "16:9"
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E005");
}

#[test]
fn gap_rejects_ratio_sugar_e006() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
component Bad() layout {
  gap = 16:9
}
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E006");
    assert!(err.message.contains("gap"), "{}", err.message);
}

#[test]
fn aspect_ratio_accepts_wh_sugar_on_media() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/ok.pdl".to_string(),
        r#"
component M() media {
  source = "https://example.com/a.png"
  aspectRatio = 16:9
}
"#
        .to_string(),
    );
    let d = load_design_from_sources("/v/ok.pdl", &sources).unwrap();
    assert!(d.components.contains_key("M"));
}

#[test]
fn loads_ratio_wh_sugar_fixture() {
    let root = repo_root().join("test-fixtures/pdl/atoms/ratio_wh_sugar.pdl");
    let src = fs::read_to_string(&root).expect("ratio_wh_sugar.pdl");
    parse_module_source(&src, root.to_str().unwrap()).expect("parse ratio_wh_sugar");
    use pdl_core::design::load_design;
    let d = load_design(root.to_str().unwrap()).expect("load ratio_wh_sugar");
    match &d.primitives.get("ratio.video").unwrap().value {
        pdl_core::ast::ValueExpr::Ratio { width, height } => {
            assert_eq!((*width, *height), (16.0, 9.0));
        }
        other => panic!("expected 16:9, got {other:?}"),
    }
}

#[test]
fn frame_gap_rejects_hex_color() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
component BadGap() layout {
  gap = #FF0000
}
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E006");
    assert!(err.message.contains("gap"), "{}", err.message);
}

#[test]
fn later_gap_clears_column_and_row_gap() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::bake::build_baked_design_component;
    use pdl_core::SourceMap;
    use serde_json::Map;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/ok.pdl".to_string(),
        r#"
component GapReset() layout {
  direction = .row
  wrap = .wrap
  columnGap = 12
  rowGap = 64
  gap = 8
  children = []
}
"#
        .to_string(),
    );
    let design = load_design_from_sources("/v/ok.pdl", &sources).expect("load");
    let doc = build_baked_design_component(&design, "GapReset", None, &Map::new(), None)
        .expect("bake");
    let props = &doc["components"]["GapReset"]["root"]["props"];
    assert_eq!(props["gap"], 8);
    assert!(props.get("columnGap").is_none(), "{props:?}");
    assert!(props.get("rowGap").is_none(), "{props:?}");
}

#[test]
fn bare_opacity_token_as_layer_is_e006() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
primitive shield2: Opacity = 0.5
component Bad() layout {
  foreground = [shield2]
  children = []
}
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E006");
    assert!(
        err.message.contains("Opacity") && err.message.contains("color @"),
        "{}",
        err.message
    );
}

#[test]
fn frame_unknown_prop_is_e011() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
component BadProp() layout {
  content = "not on layout"
}
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E011");
    assert!(err.message.contains("content"), "{}", err.message);
}

#[test]
fn mixed_condition_operators_is_e038() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
variant V { case a case b }
component C(p: V = .a) layout {
  if p == .a && p == .b || p == .a { direction = .row }
}
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E038");
}

#[test]
fn typestyle_unknown_prop_is_e011() {
    use pdl_core::design::load_design_from_sources;
    use pdl_core::SourceMap;
    let mut sources = SourceMap::new();
    sources.insert(
        "/v/bad.pdl".to_string(),
        r#"
typeStyle Body {
  gap = 8
}
"#
        .to_string(),
    );
    let err = load_design_from_sources("/v/bad.pdl", &sources).unwrap_err();
    assert_eq!(err.code, "PDL-E011");
    assert!(err.message.contains("gap"), "{}", err.message);
}
