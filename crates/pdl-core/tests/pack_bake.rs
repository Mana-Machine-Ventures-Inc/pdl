//! Injection pack validate + bake (B3).

use pdl_core::load_design;
use pdl_core::pack::{bake_injection_pack, load_injection_pack_file, validate_injection_pack};
use pdl_core::stable_json::{stable_stringify, StableStringifyOptions};
use serde_json::Value;
use std::path::PathBuf;

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .expect("repo root")
}

fn load_protocols() -> pdl_core::DesignDefinition {
    let abs = repo_root().join("test-fixtures/pdl/protocols/design.pdl");
    load_design(abs.to_str().unwrap()).expect("load protocols")
}

#[test]
fn validates_and_bakes_confirm_pack() {
    let design = load_protocols();
    let pack_path = repo_root().join("test-fixtures/pdl/protocols/packs/modal_confirm.json");
    let raw = load_injection_pack_file(pack_path.to_str().unwrap()).unwrap();
    let v = validate_injection_pack(&design, &raw).unwrap();
    assert!(v.warnings.is_empty());
    assert_eq!(v.pack.component, "Modal");

    let baked =
        bake_injection_pack(&design, &raw, Some("2026-08-06T00:00:00.000Z".into())).unwrap();
    assert!(baked.warnings.is_empty());
    let modal = &baked.document["components"]["Modal"];
    assert_eq!(modal["bakedParams"]["chromeTitle"], "Confirm");
    let children = modal["root"]["children"].as_array().unwrap();
    assert_eq!(children[0]["props"]["content"], "Confirm");
    assert_eq!(children[1]["instanceOf"], "ConfirmBody");
    assert_eq!(
        children[1]["children"][0]["props"]["content"],
        "Delete project?"
    );
    assert_eq!(
        baked.document["provenance"]["bakeProfile"],
        "injection-pack"
    );
}

#[test]
fn soft_skips_bad_slot_items() {
    let design = load_protocols();
    let pack_path = repo_root().join("test-fixtures/pdl/protocols/packs/modal_soft_skip.json");
    let raw = load_injection_pack_file(pack_path.to_str().unwrap()).unwrap();
    let v = validate_injection_pack(&design, &raw).unwrap();
    assert_eq!(v.warnings.len(), 1);
    assert!(v.warnings[0].message.contains("NotAComponent"));
    let slots = v.param_overrides["slots"].as_array().unwrap();
    assert_eq!(slots.len(), 1);
    assert_eq!(slots[0]["component"], "UpsellBody");

    let baked = bake_injection_pack(&design, &raw, None).unwrap();
    let children = baked.document["components"]["Modal"]["root"]["children"]
        .as_array()
        .unwrap();
    assert_eq!(children.len(), 2); // Header + UpsellBody
    assert_eq!(children[1]["instanceOf"], "UpsellBody");
}

#[test]
fn hard_errors_unknown_root_param() {
    let design = load_protocols();
    let pack_path = repo_root().join("test-fixtures/pdl/protocols/packs/modal_bad_param.json");
    let raw = load_injection_pack_file(pack_path.to_str().unwrap()).unwrap();
    let err = validate_injection_pack(&design, &raw).unwrap_err();
    assert_eq!(err.code, "PDL-E007");
    assert!(err.message.contains("noSuchParam"));
}

#[test]
fn confirm_pack_matches_golden() {
    let design = {
        let abs = repo_root().join("test-fixtures/pdl/protocols/design.pdl");
        let mut d = load_design(abs.to_str().unwrap()).unwrap();
        d.entry_path = "test-fixtures/pdl/protocols/design.pdl".into();
        d
    };
    let pack_path = repo_root().join("test-fixtures/pdl/protocols/packs/modal_confirm.json");
    let raw = load_injection_pack_file(pack_path.to_str().unwrap()).unwrap();
    let baked =
        bake_injection_pack(&design, &raw, Some("2026-08-06T00:00:00.000Z".into())).unwrap();
    let out = stable_stringify(&baked.document, StableStringifyOptions { omit_empty: true });
    let golden = std::fs::read_to_string(
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("tests/golden/protocols_modal_confirm.pack.bake.json"),
    )
    .expect("pack golden");
    assert_eq!(out, golden);
}

#[test]
fn reject_bad_schema_version() {
    let design = load_protocols();
    let raw: Value = serde_json::json!({
        "schemaVersion": "9.9.9",
        "component": "Modal",
        "params": {}
    });
    let err = validate_injection_pack(&design, &raw).unwrap_err();
    assert_eq!(err.code, "PDL-E020");
}
