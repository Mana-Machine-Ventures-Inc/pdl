use pdl_core::bake::build_baked_design_component;
use pdl_core::load_design;
use serde_json::{json, Map};
use std::path::PathBuf;

fn playlist_design() -> pdl_core::DesignDefinition {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..");
    let path = root.join("test-fixtures/pdl/systems/playlist-composer-lite/design.pdl");
    load_design(path.to_str().unwrap()).expect("load playlist-composer-lite")
}

fn track_row_count(doc: &serde_json::Value) -> usize {
    let s = serde_json::to_string(doc).unwrap();
    s.matches("\"instanceOf\":\"TrackRow\"").count()
        + s.matches("\"instanceOf\": \"TrackRow\"").count()
}

#[test]
fn fixture_empty_tracks_bakes_zero_rows() {
    let design = playlist_design();
    let mut overrides = Map::new();
    overrides.insert("tracks".into(), json!([]));
    overrides.insert("status".into(), json!("empty"));
    let doc = build_baked_design_component(&design, "PlaylistComposer", None, &overrides, Some("t".into()))
        .expect("bake");
    assert_eq!(track_row_count(&doc), 0, "expected no TrackRow instances");
}

#[test]
fn fixture_focus_tracks_bakes_two_rows() {
    let design = playlist_design();
    let tracks = json!([
      {"component":"TrackRow","params":{"title":"Desk Lamp","artist":"Static Grove","trackId":"desk","mood":"focus"}},
      {"component":"TrackRow","params":{"title":"Quiet Percent","artist":"Marble Room","trackId":"quiet","mood":"focus"}}
    ]);
    let mut overrides = Map::new();
    overrides.insert("tracks".into(), tracks);
    overrides.insert("currentMood".into(), json!("focus"));
    let doc = build_baked_design_component(&design, "PlaylistComposer", None, &overrides, Some("t".into()))
        .expect("bake");
    assert_eq!(track_row_count(&doc), 2, "expected 2 TrackRow instances");
}

#[test]
fn mood_focus_mounts_tracks_focus_sample() {
    let design = playlist_design();
    let mut overrides = Map::new();
    overrides.insert("currentMood".into(), json!("focus"));
    let doc = build_baked_design_component(&design, "PlaylistComposer", None, &overrides, Some("t".into()))
        .expect("bake");
    assert_eq!(
        track_row_count(&doc),
        2,
        "Tracks.focus.tracks should mount two rows"
    );
}
