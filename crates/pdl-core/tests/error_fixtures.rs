//! Table-driven diagnostics over every fixture in `test-fixtures/pdl/errors`.
//!
//! Each fixture is named for the code it must raise (`e006-…` → `PDL-E006`); the
//! `OVERRIDES` table lists the handful whose real code differs from their filename,
//! and `MESSAGES` pins the wording a fixture exists to prove.
//!
//! Every fixture runs the whole pipeline — load, token map, catalogue, resolve, bake —
//! and the first diagnostic wins, so it does not matter which stage a fixture trips.
//!
//! Adding a fixture under `errors/` therefore adds a diagnostics assertion for free;
//! a fixture that stops failing, or fails with a new code, breaks this test.

use std::fs;
use std::path::{Path, PathBuf};

use serde_json::Map;

use pdl_core::bake::build_baked_design_component_with_host;
use pdl_core::catalogue::build_component_catalogue;
use pdl_core::design::{load_design, DesignDefinition};
use pdl_core::evaluate::build_resolved_token_map;
use pdl_core::resolve::{resolve_component_tree, RESOLVE_OPTIONS_LITERAL_BAKE};
use pdl_core::PdlError;

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(|p| p.parent())
        .expect("repo root")
        .to_path_buf()
}

/// Fixtures that are imported by another fixture, so they are valid on their own.
const INCLUDE_ONLY: &[&str] = &["e002-cycle-b.pdl", "e003-duplicate-token-import-base.pdl"];

/// Fixtures that need an input this table cannot supply (a `--host` name, a missing
/// file), so a named test drives them instead.
const DRIVEN_ELSEWHERE: &[(&str, &str)] = &[
    ("e001-import-missing.pdl", "missing_import_is_an_io_error"),
    ("e046-unknown-host.pdl", "unknown_host_profile_is_e046"),
];

/// Fixtures whose code is not the one in their filename. The filename records the
/// author's intent; the value records what the compiler actually reports today.
const OVERRIDES: &[(&str, &str)] = &[
    // `hidden = "yes"` dies in the parser before the `hidden` validator runs.
    ("e012-hidden-disallowed-string.pdl", "PDL-E001"),
    // `interaction { … }` is a removed keyword — parse error, not unknown component.
    ("e037-interaction-unknown-component.pdl", "PDL-E001"),
    // A variant default that is a string literal is a type mismatch.
    ("e010-variant-default-not-enum.pdl", "PDL-E040"),
    // Malformed Motion / Animation shapes are caught while parsing the call, so they
    // read as syntax errors even though the fixtures were filed under the value code.
    ("e005-motion-empty-keys.pdl", "PDL-E001"),
    ("e005-motion-override-pose-and-keys.pdl", "PDL-E001"),
    ("e005-motion-repeat-without-path.pdl", "PDL-E001"),
    ("e005-motion-stagger-without-pose.pdl", "PDL-E001"),
    // `Media(opacity:) @ op` is rejected by the mount-sugar parser.
    ("e020-media-double-opacity.pdl", "PDL-E001"),
];

/// Wording each fixture exists to prove. Substrings, matched case-sensitively.
const MESSAGES: &[(&str, &[&str])] = &[
    ("e001-bad-string-escape.pdl", &["Invalid escape"]),
    ("e001-classic-frame-let.pdl", &["Classic frame let", "World A"]),
    ("e001-invalid-hex.pdl", &["Invalid hex color"]),
    ("e001-leading-zero-number.pdl", &["Leading zeros"]),
    ("e001-unterminated-string.pdl", &["Unterminated string"]),
    (
        "e001-handler-frame-prop-assign.pdl",
        &[
            "Interaction handlers can only assign component parameters",
            "Label.content",
        ],
    ),
    ("e001-blur-vibrancy-naked-tuple.pdl", &["Vibrancy(saturation"]),
    ("e001-vibrancy-naked-tuple-token.pdl", &["Vibrancy(saturation"]),
    ("e002-cycle-a.pdl", &["cycle"]),
    ("e003-duplicate-token.pdl", &["color.dup"]),
    ("e003-duplicate-token-cross-kind.pdl", &["color.clash"]),
    ("e003-duplicate-token-import.pdl", &["color.shared"]),
    ("e004-circular-primitives.pdl", &["Circular token reference"]),
    ("e005-blur-number-token.pdl", &["Blur(radius"]),
    ("e005-distance-string.pdl", &["Distance"]),
    ("e005-fontfamily-hex.pdl", &["FontFamily"]),
    ("e005-fontfamily-number.pdl", &["FontFamily"]),
    ("e005-icon-bare-name.pdl", &["Icon"]),
    ("e005-icon-leading-slash.pdl", &["Icon"]),
    ("e005-letterspacing-string.pdl", &["LetterSpacing"]),
    ("e005-lineheight-string.pdl", &["LineHeight"]),
    ("e005-lineheight-zero.pdl", &["LineHeight"]),
    ("e005-opacity-of-out-of-range.pdl", &["@"]),
    ("e005-primitive-token-ref.pdl", &["literal value"]),
    ("e005-semantic-type-mismatch.pdl", &["Opacity", "Color"]),
    ("e005-shadow-axis-color-token.pdl", &["Shadow", "x"]),
    ("e005-shadow-axis-string.pdl", &["Shadow", "x"]),
    ("e005-size-string.pdl", &["Size"]),
    ("e005-sizing-string.pdl", &["Sizing"]),
    ("e005-unknown-theme.pdl", &["Unknown theme"]),
    ("e006-aspect-overconstrained.pdl", &["aspectRatio"]),
    ("e006-direction-string.pdl", &["direction"]),
    ("e006-gap-hex-color.pdl", &["gap"]),
    ("e006-icon-unknown-system.pdl", &["system"]),
    ("e006-opacity-as-layer.pdl", &["Opacity"]),
    ("e006-overflow-auto.pdl", &["overflow"]),
    ("e006-overflow-hidden.pdl", &["overflow"]),
    ("e006-text-justify-stretch.pdl", &["justify"]),
    (
        "e011-unknown-prop-on-layout.pdl",
        &["unknown property `content` on `layout`"],
    ),
    ("e011-typestyle-unknown-prop.pdl", &["gap"]),
    ("e007-fixture-unknown-param.pdl", &["notAParam"]),
    ("e007-interaction-unknown-param.pdl", &["bogus"]),
    ("e007-rules-if-unknown-param.pdl", &["nope"]),
    (
        "e007-unresolved-token-in-layout.pdl",
        &["thisNameDoesNotExist"],
    ),
    ("e012-frameprop-unknown-frame.pdl", &["GhostFrame"]),
    ("e016-extend-unknown-component.pdl", &["extend"]),
    ("e019-children-before-let.pdl", &["Title"]),
    ("e019-frameprop-before-let.pdl", &["Title"]),
    ("e037-let-instance-unknown-component.pdl", &["DefinitelyNotAComponent"]),
    ("e037-usage-unknown-component.pdl", &["usage"]),
    ("e037-fixtures-unknown-component.pdl", &["fixtures"]),
    ("e037-rules-unknown-component.pdl", &["rules"]),
    ("e038-mixed-and-or.pdl", &["Cannot mix"]),
    ("e038-hidden-mixed-and-or.pdl", &["Cannot mix"]),
    ("e039-boolean-spelling.pdl", &["Boolean", "Bool"]),
    ("e039-unknown-param-type.pdl", &["Boo"]),
    ("e040-blur-vibrancy-dot-enum.pdl", &["Vibrancy"]),
    ("e040-blur-vibrancy-number.pdl", &["Vibrancy"]),
    ("e040-let-instance-bool-to-string.pdl", &["selected"]),
    ("e040-let-instance-wrong-type.pdl", &["tone"]),
    ("e042-duplicate-mount.pdl", &["button"]),
    ("e07-if-unknown-param.pdl", &["layoutMode"]),
    ("e10-if-non-variant-param.pdl", &["non-variant"]),
    ("e10-if-unknown-variant-case.pdl", &["bogus"]),
    ("e12-hidden-on-text.pdl", &["layout"]),
];

/// Fixtures that only fail once a named theme is active.
fn theme_for(name: &str) -> Option<&'static str> {
    match name {
        "e005-unknown-theme.pdl" => Some("NoSuchThemeName"),
        _ => None,
    }
}

/// `e006-…` / `e10-…` → `PDL-E006` / `PDL-E010`.
fn expected_code(name: &str) -> Option<String> {
    if let Some((_, code)) = OVERRIDES.iter().find(|(f, _)| *f == name) {
        return Some((*code).to_string());
    }
    let digits: String = name
        .strip_prefix('e')?
        .chars()
        .take_while(|c| c.is_ascii_digit())
        .collect();
    if digits.is_empty() {
        return None;
    }
    Some(format!("PDL-E{:0>3}", digits))
}

/// Component names in declaration order, so the first diagnostic is stable.
fn component_names(design: &DesignDefinition) -> Vec<String> {
    design.components.values().map(|c| c.name.clone()).collect()
}

/// Run the fixture through the whole pipeline and return the first diagnostic.
fn diagnose(path: &Path, theme: Option<&str>) -> Result<PdlError, String> {
    let entry = path.to_str().expect("utf-8 path");
    let design = match load_design(entry) {
        Err(e) => return Ok(e),
        Ok(d) => d,
    };
    let mut tokens = match build_resolved_token_map(&design, theme, &[]) {
        Err(e) => return Ok(e),
        Ok(t) => t,
    };
    if let Err(e) = build_component_catalogue(&design, theme, &[], Some("t".to_string())) {
        return Ok(e);
    }
    for name in component_names(&design) {
        if let Err(e) = resolve_component_tree(
            &design,
            &name,
            &mut tokens,
            &Default::default(),
            RESOLVE_OPTIONS_LITERAL_BAKE,
        ) {
            return Ok(e);
        }
    }
    for name in component_names(&design) {
        if let Err(e) = build_baked_design_component_with_host(
            &design,
            &name,
            theme,
            &Map::new(),
            None,
            None,
            None,
        ) {
            return Ok(e);
        }
    }
    Err("load, token map, catalogue, resolve and bake all succeeded".to_string())
}

fn collect_fixtures(dir: &Path, out: &mut Vec<PathBuf>) {
    let entries = fs::read_dir(dir).unwrap_or_else(|e| panic!("read {}: {e}", dir.display()));
    for entry in entries.flatten() {
        let p = entry.path();
        if p.is_dir() {
            collect_fixtures(&p, out);
        } else if p.extension().is_some_and(|e| e == "pdl") {
            out.push(p);
        }
    }
}

#[test]
fn every_error_fixture_raises_its_code() {
    let root = repo_root().join("test-fixtures/pdl/errors");
    let mut files = Vec::new();
    collect_fixtures(&root, &mut files);
    files.sort();
    assert!(files.len() > 100, "expected the full errors/ corpus");

    let mut failures = Vec::new();
    let mut checked = 0usize;
    for path in &files {
        let name = path.file_name().unwrap().to_string_lossy().to_string();
        if INCLUDE_ONLY.contains(&name.as_str()) || name.starts_with("valid-") {
            continue;
        }
        if DRIVEN_ELSEWHERE.iter().any(|(f, _)| *f == name) {
            continue;
        }
        let Some(want) = expected_code(&name) else {
            failures.push(format!("{name}: filename does not encode a PDL error code"));
            continue;
        };
        checked += 1;
        match diagnose(path, theme_for(&name)) {
            Err(why) => failures.push(format!("{name}: {why} (expected {want})")),
            Ok(err) => {
                if err.code != want {
                    failures.push(format!("{name}: got {} want {want}", err.code));
                    continue;
                }
                if let Some((_, needles)) = MESSAGES.iter().find(|(f, _)| *f == name) {
                    for needle in *needles {
                        if !err.message.contains(needle) {
                            failures.push(format!(
                                "{name}: message missing `{needle}`: {}",
                                err.message
                            ));
                        }
                    }
                }
            }
        }
    }

    assert!(
        failures.is_empty(),
        "{} of {checked} error fixture(s) misbehaved:\n{}",
        failures.len(),
        failures.join("\n")
    );
}

#[test]
fn missing_import_is_an_io_error() {
    let path = repo_root().join("test-fixtures/pdl/errors/e001-import-missing.pdl");
    let err = load_design(path.to_str().unwrap()).unwrap_err();
    // Not a language diagnostic: the file the import names is simply not there, so it
    // carries the I/O sentinel code rather than a PDL-E0xx from a validator.
    assert_eq!(err.code, "PDL-E000");
    assert!(
        err.message.contains("Failed to read") && err.message.contains("No such file"),
        "{}",
        err.message
    );
}

#[test]
fn duplicate_component_name_takes_the_last_declaration() {
    let path = repo_root().join("test-fixtures/pdl/errors/valid-duplicate-component-name.pdl");
    let design = load_design(path.to_str().unwrap()).expect("loads");
    let dup = design.components.get("Dup").expect("Dup");
    assert_eq!(dup.params.len(), 1);
    assert_eq!(dup.params[0].name, "second");
}
