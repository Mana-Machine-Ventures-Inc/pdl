//! Portable PDL core — lex, parse, merge, validate, bake.
//!
//! Skeleton only (implementation plan step A0). Public API will grow behind
//! stable bake/catalogue JSON contracts shared with the TypeScript oracle.

/// Schema version string carried by catalogue / bake / manifest documents.
/// Keep in sync with `docs/full-spec.md` until a version bump is declared.
pub const SCHEMA_VERSION: &str = "1.0.0-beta";

/// Crate/semver label for tooling (not the PDL document schemaVersion).
pub fn crate_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn schema_version_is_beta() {
        assert_eq!(SCHEMA_VERSION, "1.0.0-beta");
    }

    #[test]
    fn crate_version_is_nonzero() {
        assert!(!crate_version().is_empty());
    }
}
