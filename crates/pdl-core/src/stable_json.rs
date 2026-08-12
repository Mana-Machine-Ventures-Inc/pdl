//! Deterministic JSON serialization for golden compares.
//!
//! Rust port of `src/stableJson.ts`. Produces `JSON.stringify(sortDeep(v), null, 2) + "\n"`
//! with an optional `omitEmpty` pass that mirrors the TypeScript `omitEmptyDeep` used by
//! the `resolve` / `catalogue` / `bake` CLI paths.

use serde_json::{Map, Value};

/// Options controlling [`stable_stringify`].
#[derive(Debug, Clone, Copy, Default)]
pub struct StableStringifyOptions {
    /// Drop object keys whose value is an empty array/object (and empty strings outside `props`).
    pub omit_empty: bool,
}

/// Context threaded through [`omit_empty_deep`], matching the TS `OmitEmptyCtx`.
#[derive(Debug, Clone, Copy)]
struct OmitEmptyCtx {
    strip_empty_strings_outside_props: bool,
    inside_props: bool,
    /// Under catalogue `fixtures` — keep explicit empty arrays (filtered catalogs).
    inside_fixtures: bool,
}

/// Deterministic `JSON.stringify` (sorted object keys, 2-space indent, trailing newline).
pub fn stable_stringify(value: &Value, opts: StableStringifyOptions) -> String {
    let owned;
    let v: &Value = if opts.omit_empty {
        owned = omit_empty_deep(
            value,
            Some(OmitEmptyCtx {
                strip_empty_strings_outside_props: true,
                inside_props: false,
                inside_fixtures: false,
            }),
        )
        .unwrap_or(Value::Null);
        &owned
    } else {
        value
    };
    let sorted = sort_deep(v);
    let mut out = String::new();
    write_pretty(&sorted, 0, &mut out);
    out.push('\n');
    out
}

fn is_empty_container(v: &Value) -> bool {
    match v {
        Value::Array(a) => a.is_empty(),
        Value::Object(o) => o.is_empty(),
        _ => false,
    }
}

/// Remove empty arrays/objects (and empty strings outside `props`). Returns `None` when the
/// value itself should be dropped (only meaningful for object property values in the caller).
fn omit_empty_deep(value: &Value, ctx: Option<OmitEmptyCtx>) -> Option<Value> {
    let effective = ctx.unwrap_or(OmitEmptyCtx {
        strip_empty_strings_outside_props: false,
        inside_props: false,
        inside_fixtures: false,
    });
    let strip_strings = effective.strip_empty_strings_outside_props;
    let inside_props = effective.inside_props;
    let inside_fixtures = effective.inside_fixtures;

    match value {
        Value::Array(arr) => {
            // Elements are never dropped, even when empty containers.
            let mapped = arr
                .iter()
                .map(|el| omit_empty_deep(el, Some(effective)).unwrap_or(Value::Null))
                .collect();
            Some(Value::Array(mapped))
        }
        Value::Object(obj) => {
            let mut out = Map::new();
            for (k, v) in obj {
                let child_inside_props = inside_props || k == "props";
                let child_inside_fixtures = inside_fixtures || k == "fixtures";
                let next_ctx = Some(OmitEmptyCtx {
                    strip_empty_strings_outside_props: effective.strip_empty_strings_outside_props,
                    inside_props: child_inside_props,
                    inside_fixtures: child_inside_fixtures,
                });
                let ev = omit_empty_deep(v, next_ctx).unwrap_or(Value::Null);
                if strip_strings {
                    if let Value::String(s) = &ev {
                        if s.is_empty() && !child_inside_props {
                            continue;
                        }
                    }
                }
                if is_empty_container(&ev) {
                    // Keep explicit `[]` under fixtures (empty filtered catalogs).
                    let keep_empty_fixture_array =
                        child_inside_fixtures && matches!(&ev, Value::Array(a) if a.is_empty());
                    if !keep_empty_fixture_array {
                        continue;
                    }
                }
                out.insert(k.clone(), ev);
            }
            Some(Value::Object(out))
        }
        other => Some(other.clone()),
    }
}

fn sort_deep(v: &Value) -> Value {
    match v {
        Value::Array(a) => Value::Array(a.iter().map(sort_deep).collect()),
        Value::Object(o) => {
            let mut keys: Vec<&String> = o.keys().collect();
            keys.sort();
            let mut out = Map::new();
            for k in keys {
                out.insert(k.clone(), sort_deep(&o[k]));
            }
            Value::Object(out)
        }
        other => other.clone(),
    }
}

fn write_indent(depth: usize, out: &mut String) {
    for _ in 0..depth {
        out.push_str("  ");
    }
}

/// Emit `value` in the same shape as `JSON.stringify(value, null, 2)` (assuming keys already sorted).
fn write_pretty(value: &Value, depth: usize, out: &mut String) {
    match value {
        Value::Null => out.push_str("null"),
        Value::Bool(b) => out.push_str(if *b { "true" } else { "false" }),
        Value::Number(n) => out.push_str(&n.to_string()),
        Value::String(s) => write_json_string(s, out),
        Value::Array(a) => {
            if a.is_empty() {
                out.push_str("[]");
                return;
            }
            out.push_str("[\n");
            for (i, el) in a.iter().enumerate() {
                write_indent(depth + 1, out);
                write_pretty(el, depth + 1, out);
                if i + 1 < a.len() {
                    out.push(',');
                }
                out.push('\n');
            }
            write_indent(depth, out);
            out.push(']');
        }
        Value::Object(o) => {
            if o.is_empty() {
                out.push_str("{}");
                return;
            }
            out.push_str("{\n");
            let len = o.len();
            for (i, (k, v)) in o.iter().enumerate() {
                write_indent(depth + 1, out);
                write_json_string(k, out);
                out.push_str(": ");
                write_pretty(v, depth + 1, out);
                if i + 1 < len {
                    out.push(',');
                }
                out.push('\n');
            }
            write_indent(depth, out);
            out.push('}');
        }
    }
}

/// Escape a string the way `JSON.stringify` does.
fn write_json_string(s: &str, out: &mut String) {
    out.push('"');
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            '\u{08}' => out.push_str("\\b"),
            '\u{0c}' => out.push_str("\\f"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out.push('"');
}

/// Build a `serde_json::Number` matching JavaScript number formatting: integral finite values
/// serialize without a decimal point (`16`, not `16.0`).
pub fn number_value(n: f64) -> Value {
    if n.is_finite() && n.fract() == 0.0 && n >= i64::MIN as f64 && n <= i64::MAX as f64 {
        Value::Number((n as i64).into())
    } else {
        serde_json::Number::from_f64(n)
            .map(Value::Number)
            .unwrap_or(Value::Null)
    }
}

#[cfg(test)]
mod fixture_empty_tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn keeps_empty_array_under_fixtures() {
        let v = json!({
            "components": {
                "PlaylistComposer": {
                    "fixtures": {
                        "Empty": { "tracks": [], "status": "x" }
                    },
                    "children": []
                }
            }
        });
        let s = stable_stringify(&v, StableStringifyOptions { omit_empty: true });
        assert!(s.contains("\"tracks\": []") || s.contains("\"tracks\":[]"), "got: {s}");
    }
}
