//! Semantic invariants for LetInstance frame-id scoping.
//!
//! Golden bake/catalogue parity can encode a shared-nested-id bug (sibling instances
//! clobbering each other's `let L` / `let Lab` props). These tests assert behaviour
//! that goldens alone cannot safely define.

use pdl_core::bake::build_baked_design_component;
use pdl_core::catalogue::build_component_catalogue;
use pdl_core::{load_design, DesignDefinition};
use serde_json::{Map, Value};
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .expect("repo root")
}

fn load_fixture(rel: &str) -> DesignDefinition {
    let abs = repo_root().join(rel);
    load_design(abs.to_str().unwrap()).unwrap_or_else(|e| panic!("{rel}: {}", e.format()))
}

fn bake_component(design: &DesignDefinition, name: &str) -> Value {
    build_baked_design_component(
        design,
        name,
        None,
        &Map::new(),
        Some("1970-01-01T00:00:00.000Z".to_string()),
    )
    .unwrap_or_else(|e| panic!("bake {name}: {}", e.format()))
}

fn root_of<'a>(doc: &'a Value, component: &str) -> &'a Value {
    &doc["components"][component]["root"]
}

fn collect_frame_ids(frame: &Value, out: &mut Vec<String>) {
    if let Some(id) = frame.get("id").and_then(|v| v.as_str()) {
        out.push(id.to_string());
    }
    if let Some(children) = frame.get("children").and_then(|v| v.as_array()) {
        for ch in children {
            collect_frame_ids(ch, out);
        }
    }
}

fn assert_unique_frame_ids(root: &Value, context: &str) {
    let mut ids = Vec::new();
    collect_frame_ids(root, &mut ids);
    let mut seen = HashSet::new();
    for id in &ids {
        assert!(
            seen.insert(id.clone()),
            "{context}: duplicate frame id `{id}` (instance nesting collision?)"
        );
    }
}

fn nested_text_contents(frame: &Value, out: &mut Vec<String>) {
    if frame.get("kind").and_then(|v| v.as_str()) == Some("text") {
        if let Some(c) = frame.pointer("/props/content").and_then(|v| v.as_str()) {
            out.push(c.to_string());
        }
    }
    if let Some(children) = frame.get("children").and_then(|v| v.as_array()) {
        for ch in children {
            nested_text_contents(ch, out);
        }
    }
}

fn walk_instances<'a>(frame: &'a Value, out: &mut Vec<&'a Value>) {
    if frame.get("instanceOf").is_some() {
        out.push(frame);
    }
    if let Some(children) = frame.get("children").and_then(|v| v.as_array()) {
        for ch in children {
            walk_instances(ch, out);
        }
    }
}

/// Every mounted instance with a string `label` kwarg must expose that label on a nested text frame.
fn assert_instance_labels_reach_nested_text(root: &Value, context: &str) {
    let mut instances = Vec::new();
    walk_instances(root, &mut instances);
    assert!(
        !instances.is_empty(),
        "{context}: expected at least one component instance"
    );
    for inst in instances {
        let Some(label) = inst
            .pointer("/instanceKwargs/label")
            .and_then(|v| v.as_str())
        else {
            continue;
        };
        let mut texts = Vec::new();
        nested_text_contents(inst, &mut texts);
        assert!(
            texts.iter().any(|t| t == label),
            "{context}: instance `{}` kwargs.label={label:?} but nested text contents were {texts:?}",
            inst["id"].as_str().unwrap_or("?")
        );
    }
}

fn child_by_id<'a>(parent: &'a Value, id: &str) -> &'a Value {
    parent["children"]
        .as_array()
        .unwrap()
        .iter()
        .find(|c| c["id"] == id)
        .unwrap_or_else(|| panic!("missing child id `{id}` under {}", parent["id"]))
}

#[test]
fn sibling_text_buttons_keep_distinct_labels() {
    let design = load_fixture("test-fixtures/pdl/molecules/m_02_buttons_basic.pdl");
    let doc = bake_component(&design, "MoleculeButtonRowDemo");
    let root = root_of(&doc, "MoleculeButtonRowDemo");
    assert_unique_frame_ids(root, "MoleculeButtonRowDemo");
    assert_instance_labels_reach_nested_text(root, "MoleculeButtonRowDemo");

    let expected = [
        ("A", "Primary sm"),
        ("B", "Secondary lg"),
        ("C", "Ghost sm"),
    ];
    for (id, label) in expected {
        let btn = child_by_id(root, id);
        assert_eq!(btn["instanceKwargs"]["label"], label);
        assert_eq!(btn["children"][0]["id"], format!("{id}__L"));
        assert_eq!(btn["children"][0]["props"]["content"], label);
    }
}

#[test]
fn sibling_form_instances_keep_distinct_nested_labels() {
    let design = load_fixture("test-fixtures/pdl/molecules/m_10_form_group.pdl");
    let doc = bake_component(&design, "MoleculeFormColumnDemo");
    let root = root_of(&doc, "MoleculeFormColumnDemo");
    assert_unique_frame_ids(root, "MoleculeFormColumnDemo");
    assert_instance_labels_reach_nested_text(root, "MoleculeFormColumnDemo");

    let f0 = child_by_id(root, "F0");
    let f1 = child_by_id(root, "F1");
    assert_eq!(f0["children"][0]["id"], "F0__Lab");
    assert_eq!(f1["children"][0]["id"], "F1__Lab");
    assert_eq!(f0["children"][0]["props"]["content"], "Workspace");
    assert_eq!(f1["children"][0]["props"]["content"], "Role");

    let actions = child_by_id(root, "Actions");
    let cancel = child_by_id(actions, "Cancel");
    let save = child_by_id(actions, "Save");
    assert_eq!(cancel["instanceKwargs"]["label"], "Cancel");
    assert_eq!(save["instanceKwargs"]["label"], "Save");
    assert_eq!(cancel["children"][0]["props"]["content"], "Cancel");
    assert_eq!(save["children"][0]["props"]["content"], "Save");
}

#[test]
fn nested_let_instances_keep_scoped_ids_and_titles() {
    // Card → Actions → Primary/Secondary is two levels of LetInstance nesting.
    let design = load_fixture("test-fixtures/pdl/molecules/m_05_card.pdl");
    let doc = bake_component(&design, "MoleculeCardGridDemo");
    let root = root_of(&doc, "MoleculeCardGridDemo");
    assert_unique_frame_ids(root, "MoleculeCardGridDemo");
    assert_instance_labels_reach_nested_text(root, "MoleculeCardGridDemo");

    let c1 = child_by_id(root, "C1");
    let c2 = child_by_id(root, "C2");
    assert_eq!(c1["instanceKwargs"]["title"], "With media");
    assert_eq!(c2["instanceKwargs"]["title"], "No media");

    // Title text is a nested let on the card template — must be scoped per instance.
    let c1_title = c1["children"]
        .as_array()
        .unwrap()
        .iter()
        .find(|c| c["id"] == "C1__Title")
        .expect("C1__Title");
    let c2_title = c2["children"]
        .as_array()
        .unwrap()
        .iter()
        .find(|c| c["id"] == "C2__Title")
        .expect("C2__Title");
    assert_eq!(c1_title["props"]["content"], "With media");
    assert_eq!(c2_title["props"]["content"], "No media");

    // Rust scopes nested let-instances with the full path (`C1__Actions__Primary`);
    // TS catalogue flattening may omit the middle `Actions` segment.
    let c1_primary = c1["children"]
        .as_array()
        .unwrap()
        .iter()
        .find(|c| c["id"] == "C1__Actions")
        .expect("C1__Actions")["children"]
        .as_array()
        .unwrap()
        .iter()
        .find(|c| c["id"] == "C1__Primary" || c["id"] == "C1__Actions__Primary")
        .expect("C1__Primary");
    let c2_primary = c2["children"]
        .as_array()
        .unwrap()
        .iter()
        .find(|c| c["id"] == "C2__Actions")
        .expect("C2__Actions")["children"]
        .as_array()
        .unwrap()
        .iter()
        .find(|c| c["id"] == "C2__Primary" || c["id"] == "C2__Actions__Primary")
        .expect("C2__Primary");
    let c1_label = c1_primary["children"][0]["id"].as_str().unwrap();
    let c2_label = c2_primary["children"][0]["id"].as_str().unwrap();
    assert!(
        c1_label.ends_with("__L") || c1_label.ends_with("__Primary__L"),
        "unexpected primary label id {c1_label}"
    );
    assert!(
        c2_label.ends_with("__L") || c2_label.ends_with("__Primary__L"),
        "unexpected primary label id {c2_label}"
    );
    assert_eq!(c1_primary["children"][0]["props"]["content"], "Open");
    assert_eq!(c2_primary["children"][0]["props"]["content"], "Open");
}

#[test]
fn catalogue_registry_keeps_scoped_ids_for_sibling_instances() {
    let design = load_fixture("test-fixtures/pdl/molecules/m_10_form_group.pdl");
    let cat =
        build_component_catalogue(&design, None, &[], Some("1970-01-01T00:00:00.000Z".into()))
            .expect("catalogue");
    let row = &cat["components"]["MoleculeFormColumnDemo"];
    let nodes = row["childNodes"].as_object().expect("childNodes");

    for key in ["Cancel__L", "Save__L", "F0__Lab", "F1__Lab"] {
        assert!(
            nodes.contains_key(key),
            "catalogue childNodes missing scoped id `{key}`; keys={:?}",
            nodes.keys().collect::<Vec<_>>()
        );
    }
    // Nested `let Val` inside `let Box` — Rust path-scopes as `F0__Box__Val`;
    // TS may flatten to `F0__Val`.
    assert!(
        nodes.contains_key("F0__Val") || nodes.contains_key("F0__Box__Val"),
        "catalogue childNodes missing scoped Val id; keys={:?}",
        nodes.keys().collect::<Vec<_>>()
    );
    assert!(
        nodes.contains_key("F1__Val") || nodes.contains_key("F1__Box__Val"),
        "catalogue childNodes missing scoped Val id; keys={:?}",
        nodes.keys().collect::<Vec<_>>()
    );
    // Pre-fix collision symptom: a bare shared `L` / `Lab` registry entry.
    assert!(
        !nodes.contains_key("L"),
        "catalogue must not register unscoped nested id `L` for multi-instance demos"
    );
    assert!(
        !nodes.contains_key("Lab"),
        "catalogue must not register unscoped nested id `Lab` for multi-instance demos"
    );

    // Graph catalogue uses param placeholders; uniqueness of keys is the invariant.
    let mut id_to_keys: HashMap<&str, Vec<&str>> = HashMap::new();
    for (k, v) in nodes {
        let id = v["id"].as_str().unwrap_or("");
        id_to_keys.entry(id).or_default().push(k.as_str());
    }
    for (id, keys) in id_to_keys {
        assert_eq!(
            keys.len(),
            1,
            "catalogue childNodes id `{id}` registered under multiple keys: {keys:?}"
        );
    }
}

#[test]
fn airbnb_lite_form_actions_keep_distinct_labels() {
    let design = load_fixture("test-fixtures/pdl/systems/airbnb-lite/design.pdl");
    let doc = bake_component(&design, "AbnFormActionsDemo");
    let root = root_of(&doc, "AbnFormActionsDemo");
    assert_unique_frame_ids(root, "AbnFormActionsDemo");
    assert_instance_labels_reach_nested_text(root, "AbnFormActionsDemo");
    let actions = child_by_id(root, "Actions");
    assert_eq!(
        child_by_id(actions, "Cancel")["children"][0]["props"]["content"],
        "Cancel"
    );
    assert_eq!(
        child_by_id(actions, "Save")["children"][0]["props"]["content"],
        "Save"
    );
}

#[test]
fn catalogue_button_row_scopes_nested_label_frames() {
    let design = load_fixture("test-fixtures/pdl/molecules/m_02_buttons_basic.pdl");
    let cat =
        build_component_catalogue(&design, None, &[], Some("1970-01-01T00:00:00.000Z".into()))
            .expect("catalogue");
    let nodes = cat["components"]["MoleculeButtonRowDemo"]["childNodes"]
        .as_object()
        .expect("childNodes");
    for key in ["A__L", "B__L", "C__L"] {
        assert!(nodes.contains_key(key), "missing {key}");
    }
    assert!(!nodes.contains_key("L"));
}
