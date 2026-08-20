//! Map(1...n) → typed list; ForEach wire; children mount.

use pdl_core::bake::build_baked_design_component;
use pdl_core::catalogue::build_component_catalogue;
use pdl_core::load_design;
use serde_json::Map;

fn repo_root() -> std::path::PathBuf {
    std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .expect("repo root")
}

fn child_kwargs(kid: &serde_json::Value) -> &serde_json::Map<String, serde_json::Value> {
    kid.get("instanceKwargs")
        .or_else(|| kid.get("params"))
        .and_then(|v| v.as_object())
        .unwrap_or_else(|| panic!("expected instanceKwargs/params on {kid}"))
}

#[test]
fn map_list_lab_bakes_page_control() {
    let entry = repo_root().join("test-fixtures/pdl/labs/map_list.pdl");
    let design = load_design(entry.to_str().unwrap()).unwrap_or_else(|e| panic!("{}", e.format()));
    let doc = build_baked_design_component(
        &design,
        "MapLabPageControl",
        None,
        &Map::new(),
        Some("1970-01-01T00:00:00.000Z".into()),
    )
    .unwrap_or_else(|e| panic!("{}", e.format()));
    let kids = doc["components"]["MapLabPageControl"]["root"]["children"]
        .as_array()
        .expect("children");
    assert_eq!(kids.len(), 3, "default numberOfPages=3");
    for (i, kid) in kids.iter().enumerate() {
        assert_eq!(kid["instanceOf"], "MapLabDot");
        let page = child_kwargs(kid)["page"].as_f64().expect("page");
        assert_eq!(page, (i + 1) as f64);
    }
    let mut overrides = Map::new();
    overrides.insert("numberOfPages".into(), serde_json::json!(5));
    overrides.insert("currentPage".into(), serde_json::json!(2));
    let five = build_baked_design_component(
        &design,
        "MapLabPageControl",
        None,
        &overrides,
        Some("1970-01-01T00:00:00.000Z".into()),
    )
    .unwrap_or_else(|e| panic!("{}", e.format()));
    let kids5 = five["components"]["MapLabPageControl"]["root"]["children"]
        .as_array()
        .expect("children");
    assert_eq!(kids5.len(), 5);
    assert_eq!(child_kwargs(&kids5[1])["selected"], true);
    assert_eq!(child_kwargs(&kids5[0])["selected"], false);
}

#[test]
fn map_list_omit_compacts() {
    let entry = repo_root().join("test-fixtures/pdl/labs/map_list.pdl");
    let design = load_design(entry.to_str().unwrap()).unwrap_or_else(|e| panic!("{}", e.format()));
    let doc = build_baked_design_component(
        &design,
        "MapLabOmit",
        None,
        &Map::new(),
        Some("1970-01-01T00:00:00.000Z".into()),
    )
    .unwrap_or_else(|e| panic!("{}", e.format()));
    let kids = doc["components"]["MapLabOmit"]["root"]["children"]
        .as_array()
        .expect("children");
    assert!(kids.is_empty(), "omitAll yields no dots");

    let mut overrides = Map::new();
    overrides.insert("omitAll".into(), serde_json::json!(false));
    let full = build_baked_design_component(
        &design,
        "MapLabOmit",
        None,
        &overrides,
        Some("1970-01-01T00:00:00.000Z".into()),
    )
    .unwrap_or_else(|e| panic!("{}", e.format()));
    let kids_full = full["components"]["MapLabOmit"]["root"]["children"]
        .as_array()
        .expect("children");
    assert_eq!(kids_full.len(), 4);
}

#[test]
fn map_list_emit_captures_in_catalogue() {
    let entry = repo_root().join("test-fixtures/pdl/labs/map_list.pdl");
    let design = load_design(entry.to_str().unwrap()).unwrap_or_else(|e| panic!("{}", e.format()));
    let cat = build_component_catalogue(&design, None, &[], None).unwrap();
    let row = &cat["components"]["MapLabPageControl"];
    let caps = row["emitCaptures"].as_array().expect("emitCaptures");
    assert!(
        caps.iter().any(|c| c["channel"] == "select"),
        "expected select capture on MapLabPageControl: {caps:?}"
    );
}

#[test]
fn ios26_page_control_map_bakes() {
    let entry = repo_root().join("test-fixtures/pdl/systems/ios26-lite/design.pdl");
    let design = load_design(entry.to_str().unwrap()).unwrap_or_else(|e| panic!("{}", e.format()));
    let mut overrides = Map::new();
    overrides.insert("numberOfPages".into(), serde_json::json!(5));
    overrides.insert("currentPage".into(), serde_json::json!(3));
    let doc = build_baked_design_component(
        &design,
        "IosPageControl",
        None,
        &overrides,
        Some("1970-01-01T00:00:00.000Z".into()),
    )
    .unwrap_or_else(|e| panic!("{}", e.format()));
    let kids = doc["components"]["IosPageControl"]["root"]["children"]
        .as_array()
        .expect("children");
    assert_eq!(kids.len(), 5);
    assert_eq!(child_kwargs(&kids[2])["selected"], true);
    assert_eq!(child_kwargs(&kids[2])["page"].as_f64().unwrap(), 3.0);
}
