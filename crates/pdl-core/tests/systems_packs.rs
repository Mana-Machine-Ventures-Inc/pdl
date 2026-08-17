//! CI bake of `systems/*-lite` veracity packs (Playground Phase P2).

use pdl_core::bake::{build_baked_design_component, build_baked_design_system};
use pdl_core::{load_design, load_design_from_sources, SourceMap};
use serde_json::Map;
use std::fs;
use std::path::{Path, PathBuf};

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .expect("repo root")
}

fn collect_pdl_sources(dir: &Path, out: &mut SourceMap) {
    for entry in fs::read_dir(dir).expect("read_dir") {
        let entry = entry.expect("dirent");
        let path = entry.path();
        if path.is_dir() {
            collect_pdl_sources(&path, out);
        } else if path.extension().and_then(|e| e.to_str()) == Some("pdl") {
            let abs = path
                .canonicalize()
                .expect("canonicalize")
                .to_string_lossy()
                .replace('\\', "/");
            let text = fs::read_to_string(&path).expect("read pdl");
            out.insert(abs, text);
        }
    }
}

#[test]
fn airbnb_lite_bakes_from_disk() {
    let entry = repo_root().join("test-fixtures/pdl/systems/airbnb-lite/design.pdl");
    let design = load_design(entry.to_str().unwrap()).unwrap_or_else(|e| panic!("{}", e.format()));
    assert!(
        design.components.contains_key("AbnFormActionsDemo"),
        "expected AbnFormActionsDemo"
    );
    let sys = build_baked_design_system(&design, None, Some("1970-01-01T00:00:00.000Z".into()))
        .unwrap_or_else(|e| panic!("{}", e.format()));
    assert!(sys["components"]["AbnButton"].is_object());
    let one = build_baked_design_component(
        &design,
        "AbnFormActionsDemo",
        None,
        &Map::new(),
        Some("1970-01-01T00:00:00.000Z".into()),
    )
    .unwrap_or_else(|e| panic!("{}", e.format()));
    let root = &one["components"]["AbnFormActionsDemo"]["root"];
    let kids = root["children"].as_array().expect("children");
    assert!(kids.len() >= 2, "form actions should have Cancel + Save");
}

#[test]
fn airbnb_lite_bakes_from_source_map() {
    let pack_dir = repo_root().join("test-fixtures/pdl/systems/airbnb-lite");
    let entry = pack_dir
        .join("design.pdl")
        .canonicalize()
        .unwrap()
        .to_string_lossy()
        .replace('\\', "/");
    let mut sources = SourceMap::new();
    collect_pdl_sources(&pack_dir, &mut sources);
    // Packs may import shared host protocols outside the pack directory.
    collect_pdl_sources(&repo_root().join("test-fixtures/pdl/stdlib"), &mut sources);
    assert!(
        sources.len() >= 5,
        "expected pack modules, got {}",
        sources.len()
    );
    let design =
        load_design_from_sources(&entry, &sources).unwrap_or_else(|e| panic!("{}", e.format()));
    let doc = build_baked_design_component(
        &design,
        "AbnButtonRowDemo",
        None,
        &Map::new(),
        Some("1970-01-01T00:00:00.000Z".into()),
    )
    .unwrap_or_else(|e| panic!("{}", e.format()));
    assert!(doc["components"]["AbnButtonRowDemo"]["root"].is_object());
}
