use pdl_core::stable_json::{stable_stringify, StableStringifyOptions};
use pdl_core::{build_component_catalogue, load_design};
use std::path::PathBuf;

#[test]
fn empty_fixture_keeps_tracks_array() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..");
    let path = root.join("test-fixtures/pdl/systems/playlist-composer-lite/design.pdl");
    let design = load_design(path.to_str().unwrap()).expect("load");
    let doc = build_component_catalogue(&design, None, &[], Some("t".into())).expect("cat");
    let raw = serde_json::to_string_pretty(&doc).unwrap();
    assert!(
        raw.contains("\"Empty · no matches\""),
        "fixture missing in raw catalogue"
    );
    // Find tracks near Empty fixture in raw (pre-omit)
    let idx = raw.find("Empty · no matches").expect("label");
    let window = &raw[idx..idx.saturating_add(400).min(raw.len())];
    eprintln!("RAW WINDOW:\n{window}");
    assert!(window.contains("tracks"), "raw catalogue missing tracks near Empty: {window}");

    let out = stable_stringify(&doc, StableStringifyOptions { omit_empty: true });
    let idx2 = out.find("Empty · no matches").expect("label after omit");
    let window2 = &out[idx2..idx2.saturating_add(400).min(out.len())];
    eprintln!("OMIT WINDOW:\n{window2}");
    assert!(
        window2.contains("\"tracks\""),
        "omit_empty dropped tracks: {window2}"
    );
}
