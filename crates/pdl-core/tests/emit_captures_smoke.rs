use pdl_core::catalogue::build_component_catalogue;
use pdl_core::design::load_design;
use pdl_core::stable_json::{stable_stringify, StableStringifyOptions};

#[test]
fn emit_captures_survive_catalogue_stringify() {
    let root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..");
    let entry = root.join("test-fixtures/pdl/protocols/design.pdl");
    let design = load_design(entry.to_str().unwrap()).unwrap();
    let cat = build_component_catalogue(&design, None, &[], None).unwrap();
    let row = cat.get("components").unwrap().get("LibrarySubnav").unwrap();
    eprintln!(
        "row keys before stringify: {:?}",
        row.as_object().unwrap().keys().collect::<Vec<_>>()
    );
    assert!(
        row.get("emitCaptures").is_some(),
        "raw catalogue row missing emitCaptures: {row}"
    );
    let s = stable_stringify(&cat, StableStringifyOptions { omit_empty: true });
    let v: serde_json::Value = serde_json::from_str(&s).unwrap();
    let row2 = &v["components"]["LibrarySubnav"];
    eprintln!(
        "row keys after stringify: {:?}",
        row2.as_object().unwrap().keys().collect::<Vec<_>>()
    );
    assert!(
        row2.get("emitCaptures").is_some(),
        "emitCaptures dropped by omit_empty: {row2}"
    );
}
