//! Merged design model + loader.
//!
//! Rust port of `src/designModel.ts` + `src/loadDesign.ts`. Collects the import
//! closure (post-order DFS, cycle → `PDL-E002`), merges declarations (last module
//! wins on symbol clashes) and runs [`crate::validate::validate_merged_design`].

use std::collections::HashSet;
use std::path::{Component, Path, PathBuf};

use indexmap::IndexMap;

use crate::ast::*;
use crate::error::PdlError;
use crate::parser::parse_module_source;
use crate::validate::validate_merged_design;

/// Merged `usage` values per key (v1: typically `description`).
pub type UsageKeyMap = IndexMap<String, String>;

/// Fully merged design (import closure + entry), pre-resolution.
#[derive(Debug, Clone)]
pub struct DesignDefinition {
    pub entry_path: String,
    /// Post-order DFS: dependencies then dependents; last module wins on clashes.
    pub module_paths: Vec<String>,
    pub preview_background: Option<String>,
    pub primitives: IndexMap<String, PrimitiveDecl>,
    pub semantics: IndexMap<String, SemanticDecl>,
    pub themes: IndexMap<String, ThemeDecl>,
    pub variants: IndexMap<String, VariantDecl>,
    pub type_styles: IndexMap<String, TypeStyleDecl>,
    pub protocols: IndexMap<String, ProtocolDecl>,
    pub components: IndexMap<String, ComponentDecl>,
    pub expose: IndexMap<String, Vec<String>>,
    pub usage: IndexMap<String, UsageKeyMap>,
    pub fixtures: IndexMap<String, IndexMap<String, FixtureExampleDecl>>,
    pub rules: IndexMap<String, Vec<RulesStatement>>,
    pub interactions: IndexMap<String, IndexMap<String, InteractionDecl>>,
    /// Declared public emits per component (`emits C { … }` + protocol inheritance at catalogue time).
    pub emits: IndexMap<String, Vec<ProtocolEmitDecl>>,
}

/// Effective emits for a component: protocol emits ∪ component-owned emits
/// (same emit name: component declaration replaces).
pub fn effective_emits(
    design: &DesignDefinition,
    c: &ComponentDecl,
) -> Vec<ProtocolEmitDecl> {
    let mut merged: IndexMap<String, ProtocolEmitDecl> = IndexMap::new();
    if let Some(proto_name) = &c.conforms_to {
        if let Some(proto) = design.protocols.get(proto_name) {
            for e in &proto.emits {
                merged.insert(e.name.clone(), e.clone());
            }
        }
    }
    if let Some(own) = design.emits.get(&c.name) {
        for e in own {
            merged.insert(e.name.clone(), e.clone());
        }
    }
    merged.into_values().collect()
}

/// Effective parameter list for a component: protocol params ∪ own params
/// (own params with the same name replace protocol defaults / types).
pub fn effective_params(
    design: &DesignDefinition,
    c: &ComponentDecl,
) -> Result<Vec<ComponentParam>, PdlError> {
    let mut merged: IndexMap<String, ComponentParam> = IndexMap::new();
    if let Some(proto_name) = &c.conforms_to {
        let proto = design.protocols.get(proto_name).ok_or_else(|| {
            PdlError::new(
                "PDL-E006",
                format!(
                    "Component `{}` conforms to unknown protocol `{}`",
                    c.name, proto_name
                ),
                Some(design.entry_path.clone()),
                None,
                None,
            )
        })?;
        for p in &proto.params {
            merged.insert(p.name.clone(), p.clone());
        }
    }
    for p in &c.params {
        merged.insert(p.name.clone(), p.clone());
    }
    Ok(merged.into_values().collect())
}

/// Lexically normalize a path to absolute (mirrors Node `path.resolve` — no symlink resolution).
fn resolve_path(p: &str) -> PathBuf {
    let path = Path::new(p);
    let abs = if path.is_absolute() {
        path.to_path_buf()
    } else {
        std::env::current_dir()
            .unwrap_or_else(|_| PathBuf::from("/"))
            .join(path)
    };
    let mut out = PathBuf::new();
    for comp in abs.components() {
        match comp {
            Component::Prefix(_) | Component::RootDir => out.push(comp.as_os_str()),
            Component::CurDir => {}
            Component::ParentDir => {
                if !out.pop() {
                    out.push("..");
                }
            }
            Component::Normal(seg) => out.push(seg),
        }
    }
    out
}

fn path_to_string(p: &Path) -> String {
    p.to_string_lossy().into_owned()
}

fn is_import(d: &TopLevelDecl) -> Option<&ImportDecl> {
    match d {
        TopLevelDecl::Import(i) => Some(i),
        _ => None,
    }
}

/// `collect_modules` can enqueue the same file via different import paths; merge each once.
fn dedupe_modules_in_merge_order(ordered: Vec<ModuleAst>) -> Vec<ModuleAst> {
    let mut seen = HashSet::new();
    let mut out = Vec::new();
    for m in ordered {
        let key = path_to_string(&resolve_path(&m.path));
        if seen.contains(&key) {
            continue;
        }
        seen.insert(key);
        out.push(m);
    }
    out
}

fn merge_usage_props(target: &mut UsageKeyMap, props: &[UsageProp]) {
    for p in props {
        match p.op {
            UsageOp::Assign => {
                target.insert(p.key.clone(), p.value.clone());
            }
            UsageOp::Append => {
                let merged = match target.get(&p.key) {
                    Some(cur) if !cur.is_empty() => format!("{} {}", cur, p.value),
                    _ => p.value.clone(),
                };
                target.insert(p.key.clone(), merged);
            }
        }
    }
}

fn merge_fixtures(
    dest: &mut IndexMap<String, IndexMap<String, FixtureExampleDecl>>,
    component: &str,
    examples: &[FixtureExampleDecl],
) {
    let m = dest.entry(component.to_string()).or_default();
    for ex in examples {
        m.insert(ex.label.clone(), ex.clone());
    }
}

fn merge_rules(
    dest: &mut IndexMap<String, Vec<RulesStatement>>,
    component: &str,
    statements: &[RulesStatement],
) {
    let arr = dest.entry(component.to_string()).or_default();
    arr.extend(statements.iter().cloned());
}

fn merge_interaction(
    dest: &mut IndexMap<String, IndexMap<String, InteractionDecl>>,
    decl: &InteractionDecl,
) {
    let m = dest.entry(decl.component.clone()).or_default();
    m.insert(decl.name.clone(), decl.clone());
}

#[allow(clippy::too_many_arguments)]
fn apply_extend(
    entry_path: &str,
    components: &IndexMap<String, ComponentDecl>,
    _expose: &mut IndexMap<String, Vec<String>>,
    usage: &mut IndexMap<String, UsageKeyMap>,
    fixtures: &mut IndexMap<String, IndexMap<String, FixtureExampleDecl>>,
    rules: &mut IndexMap<String, Vec<RulesStatement>>,
    ext: &ExtendDecl,
) -> Result<(), PdlError> {
    let c = &ext.component;
    if !components.contains_key(c) {
        return Err(PdlError::new(
            "PDL-E006",
            format!("extend targets unknown component `{}`", c),
            Some(entry_path.to_string()),
            None,
            None,
        ));
    }
    for sec in &ext.sections {
        match sec {
            ExtendSection::Usage { props } => {
                let u = usage.entry(c.clone()).or_default();
                merge_usage_props(u, props);
            }
            ExtendSection::Fixtures { examples } => {
                merge_fixtures(fixtures, c, examples);
            }
            ExtendSection::Rules { statements } => {
                merge_rules(rules, c, statements);
            }
        }
    }
    Ok(())
}

/// In-memory `.pdl` sources keyed by absolute (or virtual-absolute) path.
/// Used by WASM / playground without touching the host filesystem.
pub type SourceMap = IndexMap<String, String>;

fn normalize_source_key(p: &str) -> String {
    path_to_string(&resolve_path(p)).replace('\\', "/")
}

fn lookup_source<'a>(sources: &'a SourceMap, abs: &str) -> Option<&'a str> {
    let key = normalize_source_key(abs);
    if let Some(s) = sources.get(&key) {
        return Some(s.as_str());
    }
    // Tolerate callers who keyed the map with unresolved / mixed separators.
    for (k, v) in sources {
        if normalize_source_key(k) == key {
            return Some(v.as_str());
        }
    }
    None
}

fn collect_modules_with(
    entry_path: &str,
    visiting: &mut HashSet<String>,
    ordered: &mut Vec<ModuleAst>,
    read: &mut dyn FnMut(&str) -> Result<String, PdlError>,
) -> Result<(), PdlError> {
    let abs = normalize_source_key(entry_path);
    if visiting.contains(&abs) {
        return Err(PdlError::new(
            "PDL-E002",
            format!("Import cycle detected at {}", entry_path),
            Some(entry_path.to_string()),
            None,
            None,
        ));
    }
    visiting.insert(abs.clone());
    let source = read(&abs)?;
    let module = parse_module_source(&source, &abs)?;
    let dir = resolve_path(&abs)
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| PathBuf::from("/"));
    for decl in &module.declarations {
        if let Some(imp) = is_import(decl) {
            let next = normalize_source_key(&path_to_string(&dir.join(&imp.path)));
            collect_modules_with(&next, visiting, ordered, read)?;
        }
    }
    visiting.remove(&abs);
    ordered.push(module);
    Ok(())
}

fn collect_modules(
    entry_path: &str,
    visiting: &mut HashSet<String>,
    ordered: &mut Vec<ModuleAst>,
) -> Result<(), PdlError> {
    let mut read = |abs: &str| {
        std::fs::read_to_string(abs).map_err(|e| {
            PdlError::new(
                "PDL-E000",
                format!("Failed to read {}: {}", abs, e),
                Some(abs.to_string()),
                None,
                None,
            )
        })
    };
    collect_modules_with(entry_path, visiting, ordered, &mut read)
}

fn collect_modules_from_map(
    entry_path: &str,
    sources: &SourceMap,
    visiting: &mut HashSet<String>,
    ordered: &mut Vec<ModuleAst>,
) -> Result<(), PdlError> {
    let mut read = |abs: &str| {
        lookup_source(sources, abs)
            .map(|s| s.to_string())
            .ok_or_else(|| {
                PdlError::new(
                    "PDL-E000",
                    format!("Missing source for {}", abs),
                    Some(abs.to_string()),
                    None,
                    None,
                )
            })
    };
    collect_modules_with(entry_path, visiting, ordered, &mut read)
}

fn merge_design(entry_path: &str, ordered: Vec<ModuleAst>) -> Result<DesignDefinition, PdlError> {
    let mut primitives = IndexMap::new();
    let mut semantics = IndexMap::new();
    let mut themes = IndexMap::new();
    let mut variants = IndexMap::new();
    let mut type_styles = IndexMap::new();
    let mut protocols = IndexMap::new();
    let mut components = IndexMap::new();
    let mut expose = IndexMap::new();
    let mut usage: IndexMap<String, UsageKeyMap> = IndexMap::new();
    let mut fixtures: IndexMap<String, IndexMap<String, FixtureExampleDecl>> = IndexMap::new();
    let mut rules: IndexMap<String, Vec<RulesStatement>> = IndexMap::new();
    let mut interactions: IndexMap<String, IndexMap<String, InteractionDecl>> = IndexMap::new();
    let mut emits: IndexMap<String, Vec<ProtocolEmitDecl>> = IndexMap::new();
    let mut preview_background: Option<String> = None;
    let resolved_entry = path_to_string(&resolve_path(entry_path));
    let module_paths: Vec<String> = ordered.iter().map(|m| m.path.clone()).collect();

    for module in &ordered {
        for decl in &module.declarations {
            match decl {
                TopLevelDecl::Import(_) => {}
                TopLevelDecl::PreviewBackground(pb) => {
                    preview_background = Some(pb.token.clone());
                }
                TopLevelDecl::Primitive(p) => {
                    primitives.insert(p.name.clone(), p.clone());
                }
                TopLevelDecl::Semantic(s) => {
                    semantics.insert(s.name.clone(), s.clone());
                }
                TopLevelDecl::Theme(t) => {
                    themes.insert(t.name.clone(), t.clone());
                }
                TopLevelDecl::Variant(v) => {
                    variants.insert(v.name.clone(), v.clone());
                }
                TopLevelDecl::TypeStyle(ts) => {
                    type_styles.insert(ts.name.clone(), ts.clone());
                }
                TopLevelDecl::Protocol(p) => {
                    protocols.insert(p.name.clone(), p.clone());
                }
                TopLevelDecl::Component(c) => {
                    components.insert(c.name.clone(), c.clone());
                }
                TopLevelDecl::Expose(e) => {
                    expose.insert(e.component.clone(), e.names.clone());
                }
                TopLevelDecl::Usage(u) => {
                    let entry = usage.entry(u.component.clone()).or_default();
                    merge_usage_props(entry, &u.props);
                }
                TopLevelDecl::Fixtures(f) => {
                    merge_fixtures(&mut fixtures, &f.component, &f.examples);
                }
                TopLevelDecl::Rules(r) => {
                    merge_rules(&mut rules, &r.component, &r.statements);
                }
                TopLevelDecl::Interaction(i) => {
                    merge_interaction(&mut interactions, i);
                }
                TopLevelDecl::Emits(e) => {
                    emits.insert(e.component.clone(), e.emits.clone());
                }
                TopLevelDecl::Extend(ext) => {
                    apply_extend(
                        &resolved_entry,
                        &components,
                        &mut expose,
                        &mut usage,
                        &mut fixtures,
                        &mut rules,
                        ext,
                    )?;
                }
            }
        }
    }

    Ok(DesignDefinition {
        entry_path: resolved_entry,
        module_paths,
        preview_background,
        primitives,
        semantics,
        themes,
        variants,
        type_styles,
        protocols,
        components,
        expose,
        usage,
        fixtures,
        rules,
        interactions,
        emits,
    })
}

/// Load, merge and validate a design starting from `entry_path`.
pub fn load_design(entry_path: &str) -> Result<DesignDefinition, PdlError> {
    let mut ordered = Vec::new();
    let mut visiting = HashSet::new();
    collect_modules(entry_path, &mut visiting, &mut ordered)?;
    let design = merge_design(entry_path, dedupe_modules_in_merge_order(ordered))?;
    validate_merged_design(&design)?;
    Ok(design)
}

/// Load from an in-memory map (WASM / portable hosts). Keys are absolute or
/// virtual-absolute paths; `entry_path` must resolve to one of them after
/// the same lexical normalization as filesystem loads.
pub fn load_design_from_sources(
    entry_path: &str,
    sources: &SourceMap,
) -> Result<DesignDefinition, PdlError> {
    let mut ordered = Vec::new();
    let mut visiting = HashSet::new();
    collect_modules_from_map(entry_path, sources, &mut visiting, &mut ordered)?;
    let design = merge_design(entry_path, dedupe_modules_in_merge_order(ordered))?;
    validate_merged_design(&design)?;
    Ok(design)
}
