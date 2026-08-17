//! Icon / MediaSource ref helpers (parity with `src/assetRefs.ts`).

use serde_json::{Map, Value};

use crate::error::PdlError;

const ICON_SYSTEMS: &[&str] = &["sfSymbols", "materialSymbols"];

const MEDIA_KINDS: &[&str] = &["raster", "vector", "video"];

const MEDIA_FORMATS: &[&str] = &["webp", "jpeg", "png", "gif", "svg", "mp4", "webm", "pdf"];

const FILE_EXTS: &[&str] = &[
    ".svg", ".png", ".pdf", ".webp", ".jpg", ".jpeg", ".gif", ".mp4", ".webm",
];

fn has_known_file_ext(s: &str) -> bool {
    let lower = s.to_ascii_lowercase();
    FILE_EXTS.iter().any(|ext| lower.ends_with(ext))
}

pub fn is_pack_relative_file_path(s: &str) -> bool {
    if s.is_empty()
        || s.starts_with('/')
        || s.contains("://")
        || s.contains('\\')
        || s.contains("..")
    {
        return false;
    }
    s.contains('/') || has_known_file_ext(s)
}

pub fn is_http_url(s: &str) -> bool {
    s.starts_with("http://") || s.starts_with("https://")
}

fn strip_dot_case(raw: &str) -> &str {
    let s = raw.strip_prefix('.').unwrap_or(raw);
    s.rsplit('.').next().unwrap_or(s)
}

pub fn normalize_icon_system_name(raw: &str) -> Option<&'static str> {
    let bare = strip_dot_case(raw);
    ICON_SYSTEMS.iter().copied().find(|x| *x == bare)
}

pub fn normalize_media_kind_name(raw: &str) -> Option<&'static str> {
    let bare = strip_dot_case(raw);
    MEDIA_KINDS.iter().copied().find(|x| *x == bare)
}

pub fn normalize_media_format_name(raw: &str) -> Option<&'static str> {
    let bare = strip_dot_case(raw).to_ascii_lowercase();
    if bare == "jpg" {
        return Some("jpeg");
    }
    MEDIA_FORMATS.iter().copied().find(|x| *x == bare)
}

pub fn infer_media_format_from_address(address: &str) -> Option<&'static str> {
    let path = address.split(['?', '#']).next().unwrap_or(address);
    let ext = path.rsplit('.').next()?;
    if ext.len() == path.len() {
        return None;
    }
    match ext.to_ascii_lowercase().as_str() {
        "svg" => Some("svg"),
        "png" => Some("png"),
        "pdf" => Some("pdf"),
        "webp" => Some("webp"),
        "jpg" | "jpeg" => Some("jpeg"),
        "gif" => Some("gif"),
        "mp4" => Some("mp4"),
        "webm" => Some("webm"),
        _ => None,
    }
}

pub fn media_kind_for_format(format: &str) -> Option<&'static str> {
    match format {
        "webp" | "jpeg" | "png" | "gif" => Some("raster"),
        "svg" | "pdf" => Some("vector"),
        "mp4" | "webm" => Some("video"),
        _ => None,
    }
}

fn assert_media_kind_format_consistent(
    media_kind: Option<&str>,
    format: Option<&str>,
    entry_path: &str,
) -> Result<(), PdlError> {
    let (Some(mk), Some(fmt)) = (media_kind, format) else {
        return Ok(());
    };
    let expected = media_kind_for_format(fmt).unwrap_or("");
    if mk != expected {
        return Err(PdlError::new(
            "PDL-E006",
            format!(
                "MediaSource kind `.{mk}` is incompatible with format `.{fmt}` (expected `.{expected}`)"
            ),
            Some(entry_path.to_string()),
            None,
            None,
        ));
    }
    Ok(())
}

/// Fill missing mediaKind/format from address extension; validate consistency.
pub fn finalize_media_source_object(
    mut o: Map<String, Value>,
    entry_path: &str,
) -> Result<Value, PdlError> {
    let address = o
        .get("url")
        .or_else(|| o.get("path"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let mut format = o
        .get("format")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let mut media_kind = o
        .get("mediaKind")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    if format.is_none() {
        if let Some(inf) = infer_media_format_from_address(&address) {
            format = Some(inf.to_string());
        }
    }
    if media_kind.is_none() {
        if let Some(fmt) = format.as_deref() {
            if let Some(k) = media_kind_for_format(fmt) {
                media_kind = Some(k.to_string());
            }
        }
    }
    assert_media_kind_format_consistent(media_kind.as_deref(), format.as_deref(), entry_path)?;
    if let Some(k) = media_kind {
        o.insert("mediaKind".into(), Value::String(k));
    }
    if let Some(f) = format {
        o.insert("format".into(), Value::String(f));
    }
    Ok(Value::Object(o))
}

pub fn coerce_icon_value(value: Value, entry_path: &str) -> Result<Value, PdlError> {
    if let Value::Object(ref o) = value {
        if o.get("kind").and_then(|k| k.as_str()) == Some("iconRef") {
            if o.get("source").and_then(|s| s.as_str()) == Some("file") {
                let path = o.get("path").and_then(|p| p.as_str()).unwrap_or("");
                if !is_pack_relative_file_path(path) {
                    return Err(PdlError::new(
                        "PDL-E005",
                        format!(
                            "Icon file path must be pack-relative (e.g. `icons/star.svg`); got `{path}`"
                        ),
                        Some(entry_path.to_string()),
                        None,
                        None,
                    ));
                }
            }
            return Ok(value);
        }
    }
    if let Value::String(s) = &value {
        if !is_pack_relative_file_path(s) {
            return Err(PdlError::new(
                "PDL-E005",
                format!(
                    "Icon string must be a pack-relative file path (e.g. `icons/star.svg`); bare names like `{s}` are ambiguous — use `IconRef(system: .sfSymbols, name: \"{s}\")` or a file path"
                ),
                Some(entry_path.to_string()),
                None,
                None,
            ));
        }
        let mut o = Map::new();
        o.insert("kind".into(), Value::String("iconRef".into()));
        o.insert("source".into(), Value::String("file".into()));
        o.insert("path".into(), Value::String(s.clone()));
        return Ok(Value::Object(o));
    }
    Err(PdlError::new(
        "PDL-E005",
        "Icon value must be IconRef(file: …), IconRef(system: …, name: …), a pack-relative path string, or an Icon token",
        Some(entry_path.to_string()),
        None,
        None,
    ))
}

pub fn coerce_media_source_value(value: Value, entry_path: &str) -> Result<Value, PdlError> {
    if let Value::Object(o) = value {
        if o.get("kind").and_then(|k| k.as_str()) == Some("mediaSourceRef") {
            if o.get("source").and_then(|s| s.as_str()) == Some("file") {
                let path = o.get("path").and_then(|p| p.as_str()).unwrap_or("");
                if !is_pack_relative_file_path(path) {
                    return Err(PdlError::new(
                        "PDL-E005",
                        format!(
                            "MediaSource file path must be pack-relative (e.g. `media/hero.jpg`); got `{path}`"
                        ),
                        Some(entry_path.to_string()),
                        None,
                        None,
                    ));
                }
            }
            if o.get("source").and_then(|s| s.as_str()) == Some("url") {
                let url = o.get("url").and_then(|u| u.as_str()).unwrap_or("");
                if !is_http_url(url) {
                    return Err(PdlError::new(
                        "PDL-E005",
                        format!("MediaSource url must be http(s); got `{url}`"),
                        Some(entry_path.to_string()),
                        None,
                        None,
                    ));
                }
            }
            return finalize_media_source_object(o, entry_path);
        }
        return Err(PdlError::new(
            "PDL-E005",
            "MediaSource value must be MediaSource(file: …), MediaSource(url: …), a path/URL string, or a MediaSource token",
            Some(entry_path.to_string()),
            None,
            None,
        ));
    }
    if let Value::String(s) = &value {
        if is_http_url(s) {
            let mut o = Map::new();
            o.insert("kind".into(), Value::String("mediaSourceRef".into()));
            o.insert("source".into(), Value::String("url".into()));
            o.insert("url".into(), Value::String(s.clone()));
            return finalize_media_source_object(o, entry_path);
        }
        if is_pack_relative_file_path(s) {
            let mut o = Map::new();
            o.insert("kind".into(), Value::String("mediaSourceRef".into()));
            o.insert("source".into(), Value::String("file".into()));
            o.insert("path".into(), Value::String(s.clone()));
            return finalize_media_source_object(o, entry_path);
        }
        return Err(PdlError::new(
            "PDL-E005",
            format!(
                "MediaSource string must be an http(s) URL or pack-relative file path; got `{s}`"
            ),
            Some(entry_path.to_string()),
            None,
            None,
        ));
    }
    Err(PdlError::new(
        "PDL-E005",
        "MediaSource value must be MediaSource(file: …), MediaSource(url: …), a path/URL string, or a MediaSource token",
        Some(entry_path.to_string()),
        None,
        None,
    ))
}

/// Build evaluated mediaSourceRef JSON from address + optional author kind/format strings.
pub fn media_source_ref_json(
    source: &str,
    address_key: &str,
    address: Value,
    media_kind: Option<String>,
    format: Option<String>,
    entry_path: &str,
) -> Result<Value, PdlError> {
    let mut o = Map::new();
    o.insert("kind".into(), Value::String("mediaSourceRef".into()));
    o.insert("source".into(), Value::String(source.into()));
    o.insert(address_key.into(), address);
    if let Some(k) = media_kind {
        o.insert("mediaKind".into(), Value::String(k));
    }
    if let Some(f) = format {
        o.insert("format".into(), Value::String(f));
    }
    finalize_media_source_object(o, entry_path)
}
