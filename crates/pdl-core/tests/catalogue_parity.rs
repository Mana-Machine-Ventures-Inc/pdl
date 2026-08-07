//! Catalogue / resolved-component parity against the TypeScript oracle goldens.
//!
//! Catalogue goldens were generated with
//! `node dist/cli.js graphSystem <fixture> --out tests/golden/<key>.catalogue.json`
//! and resolved-component goldens with
//! `node dist/cli.js graphComponent <fixture> <Component> --out tests/golden/<key>.<Component>.resolved.json`.
//!
//! Volatile fields (`generatedAt`, absolute `entryPath`) are pinned to the golden's
//! value the same way `bake_parity.rs` does, so output compares byte-for-byte.

use pdl_core::stable_json::{stable_stringify, StableStringifyOptions};
use pdl_core::{
    build_component_catalogue, build_resolved_component_document, load_design, DesignDefinition,
};
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

fn load_design_at(rel_path: &str) -> DesignDefinition {
    let abs = repo_root().join(rel_path);
    load_design(abs.to_str().unwrap()).unwrap_or_else(|e| panic!("{rel_path}: {}", e.format()))
}

/// Data-driven catalogue parity: every `<key>|<rel path>` in `golden/manifest.txt`
/// must serialise to exactly its committed `golden/<key>.catalogue.json`.
///
/// Set `UPDATE_GOLDENS=1` to rewrite mismatched catalogue goldens (preserving volatiles).
#[test]
fn catalogue_matches_ts_goldens() {
    let update = std::env::var("UPDATE_GOLDENS").ok().as_deref() == Some("1");
    let manifest = fs::read_to_string(golden_dir().join("manifest.txt")).expect("manifest.txt");
    let mut checked = 0;
    let mut failures = Vec::new();
    for line in manifest.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let (key, rel_path) = line.split_once('|').expect("manifest line key|path");
        let golden_path = golden_dir().join(format!("{key}.catalogue.json"));
        let golden_text = match fs::read_to_string(&golden_path) {
            Ok(t) => t,
            Err(_) => continue, // no catalogue golden for this key
        };
        let golden: Value = serde_json::from_str(&golden_text).expect("parse catalogue golden");
        let generated_at = golden["generatedAt"].as_str().unwrap().to_string();

        let design = load_design_at(rel_path);
        let doc = build_component_catalogue(&design, None, &[], Some(generated_at))
            .unwrap_or_else(|e| panic!("{key} catalogue: {}", e.format()));
        let out = stable_stringify(&doc, StableStringifyOptions { omit_empty: true });
        if out != golden_text {
            if update {
                fs::write(&golden_path, &out).expect("write catalogue golden");
            } else {
                failures.push(key.to_string());
            }
        }
        checked += 1;
    }
    assert!(checked > 0, "no catalogue goldens found");
    assert!(
        failures.is_empty(),
        "{}/{} catalogue goldens mismatched: {:?}",
        failures.len(),
        checked,
        failures
    );
}

/// Explicit resolved-component parity for a spread of components (placeholder tree,
/// variants, token refs, structural embeds).
#[test]
fn resolved_component_matches_ts_goldens() {
    let cases: &[(&str, &str, &str)] = &[
        (
            "integration_greeting_pdl.Greeting.resolved.json",
            "test-fixtures/pdl/integration/greeting.pdl",
            "Greeting",
        ),
        (
            "integration_empty_layout_shell_pdl.EmptyLayoutShell.resolved.json",
            "test-fixtures/pdl/integration/empty_layout_shell.pdl",
            "EmptyLayoutShell",
        ),
        (
            "integration_status_banner_pdl.StatusBanner.resolved.json",
            "test-fixtures/pdl/integration/status_banner.pdl",
            "StatusBanner",
        ),
        (
            "molecules_m_04_button_variant_matrix_pdl.MoleculeMatrixButton.resolved.json",
            "test-fixtures/pdl/molecules/m_04_button_variant_matrix.pdl",
            "MoleculeMatrixButton",
        ),
    ];

    let mut failures = Vec::new();
    for (golden_file, rel_path, component) in cases {
        let golden_text = fs::read_to_string(golden_dir().join(golden_file))
            .unwrap_or_else(|_| panic!("golden {golden_file}"));
        let golden: Value = serde_json::from_str(&golden_text).expect("parse resolved golden");
        let generated_at = golden["generatedAt"].as_str().unwrap().to_string();
        let entry_path = golden["entryPath"].as_str().unwrap().to_string();

        let mut design = load_design_at(rel_path);
        design.entry_path = entry_path;
        let doc = build_resolved_component_document(
            &design,
            component,
            &Map::new(),
            None,
            &[],
            Some(generated_at),
        )
        .unwrap_or_else(|e| panic!("{component} resolve: {}", e.format()));
        let out = stable_stringify(&doc, StableStringifyOptions { omit_empty: true });
        if out != golden_text {
            failures.push(golden_file.to_string());
        }
    }
    assert!(
        failures.is_empty(),
        "resolved-component goldens mismatched: {:?}",
        failures
    );
}

#[test]
fn protocols_design_catalogue_golden() {
    let golden_text =
        fs::read_to_string(golden_dir().join("protocols_design_pdl.catalogue.json")).unwrap();
    let golden: Value = serde_json::from_str(&golden_text).unwrap();
    let generated_at = golden["generatedAt"].as_str().unwrap().to_string();
    let design = load_design_at("test-fixtures/pdl/protocols/design.pdl");
    let doc = build_component_catalogue(&design, None, &[], Some(generated_at)).unwrap();
    let out = stable_stringify(&doc, StableStringifyOptions { omit_empty: true });
    assert_eq!(out, golden_text, "protocols catalogue golden mismatch");
}
