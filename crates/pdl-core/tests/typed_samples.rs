use pdl_core::bake::build_baked_design_component;
use pdl_core::stable_json::{stable_stringify, StableStringifyOptions};
use pdl_core::{build_component_catalogue, load_design};
use serde_json::{json, Map};
use std::path::PathBuf;

fn lab_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../test-fixtures/pdl/lab/samples-tracks.pdl")
}

fn track_row_count(doc: &serde_json::Value) -> usize {
    let s = serde_json::to_string(doc).unwrap();
    s.matches("\"instanceOf\":\"TrackRow\"").count()
        + s.matches("\"instanceOf\": \"TrackRow\"").count()
}

#[test]
fn loads_sample_bank_and_catalogues_empty_array() {
    let design = load_design(lab_path().to_str().unwrap()).expect("load");
    assert!(design.samples.contains_key("Tracks"));
    let doc = build_component_catalogue(&design, None, &[], Some("t".into())).expect("cat");
    let out = stable_stringify(&doc, StableStringifyOptions { omit_empty: true });
    assert!(out.contains("\"samples\""), "catalogue missing samples");
    let idx = out.find("\"empty\"").expect("empty entry");
    let window = &out[idx..idx.saturating_add(200).min(out.len())];
    assert!(
        window.contains("\"tracks\"") && window.contains("[]"),
        "omit_empty dropped empty sample tracks: {window}"
    );
}

#[test]
fn bake_mounts_focus_sample_via_mood_branch() {
    let design = load_design(lab_path().to_str().unwrap()).expect("load");
    let mut overrides = Map::new();
    overrides.insert("mood".into(), json!("focus"));
    let doc =
        build_baked_design_component(&design, "SampleShelf", None, &overrides, Some("t".into()))
            .expect("bake");
    assert_eq!(track_row_count(&doc), 1, "focus sample has one TrackRow");
    let json = serde_json::to_string(&doc).unwrap();
    assert!(json.contains("Desk"), "expected Desk from focus sample");
}

#[test]
fn bake_empty_sample_mounts_zero_rows() {
    let design = load_design(lab_path().to_str().unwrap()).expect("load");
    let mut overrides = Map::new();
    overrides.insert("mood".into(), json!("night"));
    let doc =
        build_baked_design_component(&design, "SampleShelf", None, &overrides, Some("t".into()))
            .expect("bake");
    assert_eq!(track_row_count(&doc), 0);
}

#[test]
fn unknown_sample_path_is_e041() {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../test-fixtures/pdl/errors/e041-unknown-sample-path.pdl");
    let err = load_design(path.to_str().unwrap()).expect_err("should fail");
    assert_eq!(
        err.code, "PDL-E041",
        "unexpected {} — {}",
        err.code, err.message
    );
}
