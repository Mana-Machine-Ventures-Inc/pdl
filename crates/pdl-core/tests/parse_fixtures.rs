//! Parse all valid fixture modules; spot-check known lexer failures.

use pdl_core::parser::parse_module_source;
use std::fs;
use std::path::{Path, PathBuf};

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .expect("repo root")
}

fn collect_pdl(dir: &Path, out: &mut Vec<PathBuf>) {
    let Ok(rd) = fs::read_dir(dir) else {
        return;
    };
    for ent in rd.flatten() {
        let p = ent.path();
        if p.is_dir() {
            // Skip intentional error fixtures for the "must parse" suite.
            if p.file_name().and_then(|s| s.to_str()) == Some("errors") {
                continue;
            }
            collect_pdl(&p, out);
        } else if p.extension().and_then(|s| s.to_str()) == Some("pdl") {
            out.push(p);
        }
    }
}

#[test]
fn parses_all_non_error_fixtures() {
    let root = repo_root().join("test-fixtures/pdl");
    let mut files = Vec::new();
    collect_pdl(&root, &mut files);
    files.sort();
    assert!(
        !files.is_empty(),
        "expected PDL fixtures under {}",
        root.display()
    );

    let mut failures = Vec::new();
    for path in &files {
        let source = fs::read_to_string(path).unwrap_or_else(|e| panic!("read {}: {e}", path.display()));
        let rel = path.strip_prefix(repo_root()).unwrap_or(path);
        let rel_str = rel.to_string_lossy();
        // Known oddball: intentionally bad sugar sample under atoms (not under errors/).
        if rel_str.contains("scalar_numeric_sugar_bad") {
            continue;
        }
        if let Err(e) = parse_module_source(&source, &rel_str) {
            failures.push(format!("{}: {}", rel_str, e.format()));
        }
    }

    if !failures.is_empty() {
        panic!(
            "{} fixture(s) failed to parse:\n{}",
            failures.len(),
            failures.join("\n")
        );
    }
}

#[test]
fn parses_golden_entry_files() {
    let root = repo_root();
    for rel in [
        "test-fixtures/pdl/atoms/design.pdl",
        "test-fixtures/pdl/molecules/design.pdl",
        "test-fixtures/pdl/integration/design.pdl",
    ] {
        let path = root.join(rel);
        let source = fs::read_to_string(&path).expect(rel);
        parse_module_source(&source, rel).unwrap_or_else(|e| panic!("{rel}: {}", e.format()));
    }
}

#[test]
fn lexer_rejects_unterminated_string_fixture() {
    let path = repo_root().join("test-fixtures/pdl/errors/e001-unterminated-string.pdl");
    let source = fs::read_to_string(&path).expect("unterminated string fixture");
    let err = parse_module_source(&source, "e001-unterminated-string.pdl").unwrap_err();
    assert_eq!(err.code, "PDL-E001");
    assert!(
        err.message.contains("Unterminated") || err.message.to_lowercase().contains("string"),
        "{}",
        err.message
    );
}

#[test]
fn parses_component_with_layout() {
    let src = r#"
component Greeting(title: String = "Hi") layout {
  let T: text = {
    content = title
  }
  children = [T]
}
"#;
    let m = parse_module_source(src, "greeting.pdl").unwrap();
    assert_eq!(m.declarations.len(), 1);
}
