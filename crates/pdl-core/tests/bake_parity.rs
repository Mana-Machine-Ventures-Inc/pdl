//! Bake parity against the TypeScript oracle goldens (generated with
//! `npm run bakeSystem -- <fixture> --out tests/golden/<name>.bake.json`).

use pdl_core::bake::{build_baked_design_component, build_baked_design_system};
use pdl_core::stable_json::{stable_stringify, StableStringifyOptions};
use pdl_core::{load_design, DesignDefinition};
use serde_json::{Map, Value};
use std::fs;
use std::path::PathBuf;

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .expect("repo root")
}

fn golden_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/golden")
}

/// Load a fixture (relative to repo root) and pin the design's `entry_path` to the
/// golden's value so bake provenance compares byte-for-byte regardless of checkout.
fn load_pinned(rel_path: &str, entry_path: &str) -> DesignDefinition {
    let abs = repo_root().join(rel_path);
    let mut design =
        load_design(abs.to_str().unwrap()).unwrap_or_else(|e| panic!("{rel_path}: {}", e.format()));
    design.entry_path = entry_path.to_string();
    design
}

fn golden_volatiles(golden: &Value) -> (String, String) {
    let generated_at = golden["generatedAt"].as_str().unwrap().to_string();
    let entry_path = golden["provenance"]["entryPath"]
        .as_str()
        .unwrap()
        .to_string();
    (generated_at, entry_path)
}

/// Data-driven parity: every `<key>|<rel path>` entry in `golden/manifest.txt` must
/// bake to exactly its committed `golden/<key>.bake.json` (the TS oracle output).
#[test]
fn bake_system_matches_ts_goldens() {
    let manifest = fs::read_to_string(golden_dir().join("manifest.txt")).expect("manifest.txt");
    let mut checked = 0;
    let mut failures = Vec::new();
    for line in manifest.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let (key, rel_path) = line.split_once('|').expect("manifest line key|path");
        let golden_text = fs::read_to_string(golden_dir().join(format!("{key}.bake.json")))
            .unwrap_or_else(|_| panic!("golden for {key}"));
        let golden: Value = serde_json::from_str(&golden_text).expect("parse golden");
        let (generated_at, entry_path) = golden_volatiles(&golden);

        let design = load_pinned(rel_path, &entry_path);
        let doc = build_baked_design_system(&design, None, Some(generated_at))
            .unwrap_or_else(|e| panic!("{key} bake: {}", e.format()));
        let out = stable_stringify(&doc, StableStringifyOptions { omit_empty: true });
        if out != golden_text {
            failures.push(key.to_string());
        }
        checked += 1;
    }
    assert!(checked > 0, "no golden fixtures found");
    assert!(
        failures.is_empty(),
        "{}/{} bake goldens mismatched: {:?}",
        failures.len(),
        checked,
        failures
    );
}

#[test]
fn bakes_greeting_component_without_panic() {
    let abs = repo_root().join("test-fixtures/pdl/integration/greeting.pdl");
    let design = load_design(abs.to_str().unwrap()).expect("load greeting");
    let doc = build_baked_design_component(
        &design,
        "Greeting",
        None,
        &Map::new(),
        Some("1970-01-01T00:00:00.000Z".to_string()),
    )
    .expect("bake greeting component");

    assert_eq!(doc["schemaKind"], "bakedDesign");
    assert_eq!(doc["provenance"]["bakeProfile"], "component-explicit");
    let root = &doc["components"]["Greeting"]["root"];
    assert_eq!(root["kind"], "layout");
    assert_eq!(root["props"]["direction"], "column");
    assert_eq!(root["children"][0]["props"]["content"], "Hello");
}

#[test]
fn status_banner_variant_override_bakes() {
    let abs = repo_root().join("test-fixtures/pdl/integration/status_banner.pdl");
    let design = load_design(abs.to_str().unwrap()).expect("load status_banner");
    let mut overrides = Map::new();
    overrides.insert("tone".to_string(), Value::String("danger".to_string()));
    let doc = build_baked_design_component(
        &design,
        "StatusBanner",
        None,
        &overrides,
        Some("1970-01-01T00:00:00.000Z".to_string()),
    )
    .expect("bake status_banner danger");

    let msg = &doc["components"]["StatusBanner"]["root"]["children"][0];
    assert_eq!(msg["props"]["content"], "Immediate action required");
    assert_eq!(msg["props"]["color"], "#F43F5E");
}
