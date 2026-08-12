//! Typed sample banks (`samples Tracks { … }`) — lookup helpers for validate / evaluate / resolve.

use crate::ast::{SampleEntryDecl, SampleFieldDecl, SamplesDecl};
use crate::design::DesignDefinition;
use crate::error::PdlError;

/// Split `Bank.entry.field` into three segments. Longer/shorter dotted paths return `None`.
pub fn split_sample_path(path: &str) -> Option<(&str, &str, &str)> {
    let mut parts = path.split('.');
    let bank = parts.next()?;
    let entry = parts.next()?;
    let field = parts.next()?;
    if bank.is_empty() || entry.is_empty() || field.is_empty() {
        return None;
    }
    if parts.next().is_some() {
        return None;
    }
    Some((bank, entry, field))
}

pub fn sample_bank<'a>(design: &'a DesignDefinition, bank: &str) -> Option<&'a SamplesDecl> {
    design.samples.get(bank)
}

pub fn sample_entry<'a>(
    design: &'a DesignDefinition,
    bank: &str,
    entry: &str,
) -> Option<&'a SampleEntryDecl> {
    sample_bank(design, bank)?
        .entries
        .iter()
        .find(|e| e.name == entry)
}

pub fn sample_field<'a>(
    design: &'a DesignDefinition,
    bank: &str,
    entry: &str,
    field: &str,
) -> Option<&'a SampleFieldDecl> {
    sample_entry(design, bank, entry)?
        .fields
        .iter()
        .find(|f| f.name == field)
}

/// Resolve `Bank.entry.field` to the field decl, or a stable **PDL-E041** error.
pub fn lookup_sample_field<'a>(
    design: &'a DesignDefinition,
    path: &str,
) -> Result<&'a SampleFieldDecl, PdlError> {
    let Some((bank, entry, field)) = split_sample_path(path) else {
        return Err(PdlError::new(
            "PDL-E041",
            format!("Invalid sample path `{path}` (expected Bank.entry.field)"),
            Some(design.entry_path.clone()),
            None,
            None,
        ));
    };
    if sample_bank(design, bank).is_none() {
        return Err(PdlError::new(
            "PDL-E041",
            format!("Unknown sample bank `{bank}` (path `{path}`)"),
            Some(design.entry_path.clone()),
            None,
            None,
        ));
    }
    if sample_entry(design, bank, entry).is_none() {
        return Err(PdlError::new(
            "PDL-E041",
            format!("Unknown sample entry `{bank}.{entry}` (path `{path}`)"),
            Some(design.entry_path.clone()),
            None,
            None,
        ));
    }
    sample_field(design, bank, entry, field).ok_or_else(|| {
        PdlError::new(
            "PDL-E041",
            format!("Unknown sample field `{path}`"),
            Some(design.entry_path.clone()),
            None,
            None,
        )
    })
}

/// True when `path` is a three-segment path naming a known sample field.
pub fn is_known_sample_path(design: &DesignDefinition, path: &str) -> bool {
    match split_sample_path(path) {
        Some((bank, entry, field)) => sample_field(design, bank, entry, field).is_some(),
        None => false,
    }
}
