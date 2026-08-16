//! Portable PDL core — lex, parse, merge, validate, bake.
//!
//! Skeleton only (implementation plan step A0). Public API will grow behind
//! stable bake/catalogue JSON contracts shared with the TypeScript oracle.

pub mod asset_refs;
pub mod ast;
pub mod bake;
pub mod catalogue;
pub mod conditions;
pub mod design;
pub mod error;
pub mod evaluate;
pub mod frame_props;
pub mod graph_serialize;
pub mod interaction;
pub mod lexer;
pub mod motion;
pub mod mount;
pub mod pack;
pub mod param_bindings;
pub mod param_types;
pub mod parser;
pub mod resolve;
pub mod resolve_bundle;
pub mod rules_json;
pub mod samples;
pub mod stable_json;
pub mod validate;
pub mod world_a;

pub use catalogue::{build_catalogue_component_row, build_component_catalogue};
pub use design::{
    component_reads_host, effective_emits, effective_host_protocols, effective_params,
    host_profile_for_shape, host_protocols_for_protocol, inject_editable_text_prelude_variants,
    inject_host_protocol_prelude, is_host_protocol_prelude, load_design, load_design_from_sources,
    resolve_active_host, DesignDefinition, SourceMap, HOST_PROTOCOL_PRELUDE,
    TEXT_FIELD_ACTIVATION_VARIANT,
};
pub use error::PdlError;
pub use interaction::{
    apply_emit_capture, apply_interaction_event, find_emit_capture, ApplyInteractionResult,
};
pub use pack::{
    bake_injection_pack, load_injection_pack_file, validate_injection_pack, PackBakeResult,
    PackValidation, PackWarning,
};
pub use resolve_bundle::build_resolved_component_document;
pub use stable_json::{stable_stringify, StableStringifyOptions};

/// Schema version string carried by catalogue / bake / manifest documents.
/// Pre-release: plain 1.0.0 lineage (see IMPLEMENTATION_PLAN Q5). Keep aligned with
/// `shared/schema/*.json` when the wire contract is updated.
pub const SCHEMA_VERSION: &str = "1.0.0";

/// Crate/semver label for tooling (not the PDL document schemaVersion).
pub fn crate_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn schema_version_is_v1() {
        assert_eq!(SCHEMA_VERSION, "1.0.0");
    }

    #[test]
    fn crate_version_is_nonzero() {
        assert!(!crate_version().is_empty());
    }
}
