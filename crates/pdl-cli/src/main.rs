//! PDL Rust CLI — bake / graph / catalogue / resolve (JSON).
//!
//! Mirrors `src/cli.ts` command shapes for the JSON toolchain paths so CI can
//! dual-run TypeScript vs Rust. HTML and manifest remain on the TS CLI.

use std::env;
use std::fs;
use std::path::PathBuf;
use std::process;

use pdl_core::bake::{build_baked_design_component, build_baked_design_system};
use pdl_core::catalogue::build_component_catalogue;
use pdl_core::design::load_design;
use pdl_core::evaluate::build_resolved_token_map;
use pdl_core::pack::{
    bake_injection_pack, load_injection_pack_file, validate_injection_pack,
};
use pdl_core::resolve::{resolve_component_tree, RESOLVE_OPTIONS_LITERAL_BAKE};
use pdl_core::resolve_bundle::build_resolved_component_document;
use pdl_core::stable_json::{stable_stringify, StableStringifyOptions};
use serde_json::{Map, Number, Value};

fn usage() -> ! {
    eprintln!(
        "PDL toolchain (Rust)

Usage:
  pdl graphSystem <entry.pdl> [--out <file.json>]
  pdl graphComponent <entry.pdl> <ComponentName> [--theme <ThemeName>] [--out <file.json>] [key=value ...]
  pdl bakeSystem <entry.pdl> [--theme <ThemeName>] [--out <file.json>]
  pdl bakeComponent <entry.pdl> <ComponentName> [--theme <ThemeName>] [--out <file.json>] [key=value ...]
  pdl bakePack <entry.pdl> <pack.json> [--out <file.json>]
  pdl validatePack <entry.pdl> <pack.json> [--out <file.json>]
  pdl catalogue <entry.pdl> [--theme <ThemeName>] [--out <file.json>]
  pdl resolve <entry.pdl> <ComponentName> [--tree-only] [--theme <ThemeName>] [key=value ...]

HTML (renderHtml / renderCatalogueHtml) and manifest remain on the TypeScript CLI.

Options:
  --theme <name>   Primary theme for token resolution
  --out <path>     Write JSON to file instead of stdout
"
    );
    process::exit(1);
}

fn die(err: impl std::fmt::Display) -> ! {
    eprintln!("{err}");
    process::exit(1);
}

fn resolve_entry(path: &str) -> String {
    let p = PathBuf::from(path);
    let abs = if p.is_absolute() {
        p
    } else {
        env::current_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
            .join(p)
    };
    abs.to_string_lossy().into_owned()
}

fn parse_key_values(args: &[String]) -> Result<Map<String, Value>, String> {
    let mut out = Map::new();
    for a in args {
        let eq = a
            .find('=')
            .filter(|&i| i > 0)
            .ok_or_else(|| format!("Bad param {a}, expected key=value"))?;
        let k = &a[..eq];
        let v = &a[eq + 1..];
        let value = if looks_like_number(v) {
            Value::Number(
                v.parse::<f64>()
                    .ok()
                    .and_then(Number::from_f64)
                    .ok_or_else(|| format!("Bad number in param {a}"))?,
            )
        } else if v == "true" {
            Value::Bool(true)
        } else if v == "false" {
            Value::Bool(false)
        } else if let Some(rest) = v.strip_prefix('.') {
            Value::String(rest.to_string())
        } else {
            Value::String(v.to_string())
        };
        out.insert(k.to_string(), value);
    }
    Ok(out)
}

fn looks_like_number(v: &str) -> bool {
    let bytes = v.as_bytes();
    if bytes.is_empty() {
        return false;
    }
    let mut i = 0;
    if bytes[0] == b'-' {
        i = 1;
        if bytes.len() == 1 {
            return false;
        }
    }
    let mut saw_digit = false;
    let mut saw_dot = false;
    while i < bytes.len() {
        match bytes[i] {
            b'0'..=b'9' => saw_digit = true,
            b'.' if !saw_dot => saw_dot = true,
            _ => return false,
        }
        i += 1;
    }
    saw_digit
}

struct ThemeOutKv {
    theme: Option<String>,
    out_path: Option<String>,
    kv_parts: Vec<String>,
}

fn parse_theme_out_and_kv(rest: &[String]) -> ThemeOutKv {
    let mut kv_parts = Vec::new();
    let mut theme = None;
    let mut out_path = None;
    let mut i = 0;
    while i < rest.len() {
        let a = &rest[i];
        if a == "--theme" {
            i += 1;
            let t = rest.get(i).filter(|s| !s.starts_with('-'));
            let Some(t) = t else {
                usage();
            };
            theme = Some(t.clone());
        } else if a == "--out" {
            i += 1;
            let p = rest.get(i).filter(|s| !s.starts_with('-'));
            let Some(p) = p else {
                usage();
            };
            out_path = Some(p.clone());
        } else {
            kv_parts.push(a.clone());
        }
        i += 1;
    }
    ThemeOutKv {
        theme,
        out_path,
        kv_parts,
    }
}

fn write_json(out_path: Option<&str>, s: &str) -> Result<(), std::io::Error> {
    match out_path {
        Some(p) => fs::write(p, s),
        None => {
            print!("{s}");
            Ok(())
        }
    }
}

fn omit_empty() -> StableStringifyOptions {
    StableStringifyOptions { omit_empty: true }
}

fn main() {
    let argv: Vec<String> = env::args().skip(1).collect();
    if argv.len() < 2 {
        usage();
    }
    let cmd = argv[0].as_str();
    let entry = resolve_entry(&argv[1]);

    if let Err(e) = run(cmd, &entry, &argv) {
        die(e);
    }
}

fn run(cmd: &str, entry: &str, argv: &[String]) -> Result<(), String> {
    match cmd {
        "graphSystem" => {
            let rest = &argv[2..];
            for a in rest {
                if a == "--theme" {
                    return Err(
                        "graphSystem accepts only the entry file and optional --out (no --theme)."
                            .into(),
                    );
                }
            }
            let mut out_path = None;
            let mut i = 0;
            while i < rest.len() {
                if rest[i] == "--out" {
                    i += 1;
                    let p = rest.get(i).filter(|s| !s.starts_with('-'));
                    let Some(p) = p else {
                        usage();
                    };
                    out_path = Some(p.clone());
                } else {
                    usage();
                }
                i += 1;
            }
            let design = load_design(entry).map_err(|e| e.format())?;
            let cat = build_component_catalogue(&design, None, &[], None).map_err(|e| e.format())?;
            let s = stable_stringify(&cat, omit_empty());
            write_json(out_path.as_deref(), &s).map_err(|e| e.to_string())?;
            Ok(())
        }
        "graphComponent" => {
            let comp = argv.get(2).cloned().unwrap_or_else(|| usage());
            let ThemeOutKv {
                theme,
                out_path,
                kv_parts,
            } = parse_theme_out_and_kv(&argv[3..]);
            let kv = parse_key_values(&kv_parts)?;
            let design = load_design(entry).map_err(|e| e.format())?;
            let bundle = build_resolved_component_document(
                &design,
                &comp,
                &kv,
                theme.as_deref(),
                &[],
                None,
            )
            .map_err(|e| e.format())?;
            let s = stable_stringify(&bundle, omit_empty());
            write_json(out_path.as_deref(), &s).map_err(|e| e.to_string())?;
            Ok(())
        }
        "bakeSystem" => {
            let ThemeOutKv {
                theme,
                out_path,
                kv_parts,
            } = parse_theme_out_and_kv(&argv[2..]);
            if !kv_parts.is_empty() {
                usage();
            }
            let design = load_design(entry).map_err(|e| e.format())?;
            let baked =
                build_baked_design_system(&design, theme.as_deref(), None).map_err(|e| e.format())?;
            let s = stable_stringify(&baked, omit_empty());
            write_json(out_path.as_deref(), &s).map_err(|e| e.to_string())?;
            Ok(())
        }
        "bakeComponent" => {
            let comp = argv.get(2).cloned().unwrap_or_else(|| usage());
            let ThemeOutKv {
                theme,
                out_path,
                kv_parts,
            } = parse_theme_out_and_kv(&argv[3..]);
            let kv = parse_key_values(&kv_parts)?;
            let design = load_design(entry).map_err(|e| e.format())?;
            let baked = build_baked_design_component(
                &design,
                &comp,
                theme.as_deref(),
                &kv,
                None,
            )
            .map_err(|e| e.format())?;
            let s = stable_stringify(&baked, omit_empty());
            write_json(out_path.as_deref(), &s).map_err(|e| e.to_string())?;
            Ok(())
        }
        "bakePack" | "validatePack" => {
            let pack_path = argv.get(2).cloned().unwrap_or_else(|| usage());
            let ThemeOutKv {
                theme: unexpected_theme,
                out_path,
                kv_parts,
            } = parse_theme_out_and_kv(&argv[3..]);
            if unexpected_theme.is_some() || !kv_parts.is_empty() {
                usage();
            }
            let design = load_design(entry).map_err(|e| e.format())?;
            let raw = load_injection_pack_file(&pack_path).map_err(|e| e.format())?;
            if cmd == "validatePack" {
                let v = validate_injection_pack(&design, &raw).map_err(|e| e.format())?;
                for w in &v.warnings {
                    eprintln!("warning: {}", w.format());
                }
                let mut report = Map::new();
                report.insert("ok".into(), Value::Bool(true));
                report.insert(
                    "component".into(),
                    Value::String(v.pack.component.clone()),
                );
                report.insert(
                    "warnings".into(),
                    Value::Array(
                        v.warnings
                            .iter()
                            .map(|w| {
                                let mut o = Map::new();
                                o.insert("path".into(), Value::String(w.path.clone()));
                                o.insert("message".into(), Value::String(w.message.clone()));
                                Value::Object(o)
                            })
                            .collect(),
                    ),
                );
                let s = stable_stringify(&Value::Object(report), omit_empty());
                write_json(out_path.as_deref(), &s).map_err(|e| e.to_string())?;
            } else {
                let baked = bake_injection_pack(&design, &raw, None).map_err(|e| e.format())?;
                for w in &baked.warnings {
                    eprintln!("warning: {}", w.format());
                }
                let s = stable_stringify(&baked.document, omit_empty());
                write_json(out_path.as_deref(), &s).map_err(|e| e.to_string())?;
            }
            Ok(())
        }
        "catalogue" => {
            let ThemeOutKv {
                theme,
                out_path,
                kv_parts,
            } = parse_theme_out_and_kv(&argv[2..]);
            if !kv_parts.is_empty() {
                usage();
            }
            let design = load_design(entry).map_err(|e| e.format())?;
            let cat = build_component_catalogue(&design, theme.as_deref(), &[], None)
                .map_err(|e| e.format())?;
            let s = stable_stringify(&cat, omit_empty());
            write_json(out_path.as_deref(), &s).map_err(|e| e.to_string())?;
            Ok(())
        }
        "resolve" => {
            let comp = argv.get(2).cloned().unwrap_or_else(|| usage());
            let raw = &argv[3..];
            let mut tree_only = false;
            let mut theme = None;
            let mut kv_parts = Vec::new();
            let mut i = 0;
            while i < raw.len() {
                let a = &raw[i];
                if a == "--tree-only" {
                    tree_only = true;
                } else if a == "--theme" {
                    i += 1;
                    let t = raw.get(i).filter(|s| !s.starts_with('-'));
                    let Some(t) = t else {
                        usage();
                    };
                    theme = Some(t.clone());
                } else if a == "--out" {
                    return Err(
                        "resolve writes to stdout only (no --out); use graphComponent --out".into(),
                    );
                } else {
                    kv_parts.push(a.clone());
                }
                i += 1;
            }
            let kv = parse_key_values(&kv_parts)?;
            let design = load_design(entry).map_err(|e| e.format())?;
            if tree_only {
                let mut token_map = build_resolved_token_map(&design, theme.as_deref(), &[])
                    .map_err(|e| e.format())?;
                // Match TS `resolveComponentTree` default options (literal bake).
                let tree = resolve_component_tree(
                    &design,
                    &comp,
                    &mut token_map,
                    &kv,
                    RESOLVE_OPTIONS_LITERAL_BAKE,
                )
                .map_err(|e| e.format())?;
                let s = stable_stringify(&tree.to_value(), omit_empty());
                write_json(None, &s).map_err(|e| e.to_string())?;
            } else {
                let bundle = build_resolved_component_document(
                    &design,
                    &comp,
                    &kv,
                    theme.as_deref(),
                    &[],
                    None,
                )
                .map_err(|e| e.format())?;
                let s = stable_stringify(&bundle, omit_empty());
                write_json(None, &s).map_err(|e| e.to_string())?;
            }
            Ok(())
        }
        "renderHtml" | "renderCatalogueHtml" | "manifest" => Err(format!(
            "{cmd} is not implemented in the Rust CLI yet; use the TypeScript CLI (`npm run {cmd}`)."
        )),
        _ => usage(),
    }
}
