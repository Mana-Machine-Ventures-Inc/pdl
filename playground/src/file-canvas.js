/**
 * Resolve what the Playground canvas should show for the active .pdl file.
 * Components declared in the file win; import-only files expand imports (recursive).
 */

/**
 * @param {string} source
 * @returns {string[]}
 */
export function extractComponentNames(source) {
  const names = [];
  const re = /(?:^|\n)\s*component\s+([A-Za-z_][A-Za-z0-9_]*)/g;
  let m;
  while ((m = re.exec(source))) names.push(m[1]);
  return names;
}

/**
 * @param {string} source
 * @returns {string[]}
 */
export function extractImportPaths(source) {
  const paths = [];
  const re = /(?:^|\n)\s*import\s+"([^"]+\.pdl)"/g;
  let m;
  while ((m = re.exec(source))) paths.push(m[1]);
  return paths;
}

/**
 * @param {string} source
 * @returns {{ primitives: string[], semantics: string[], themes: string[], variants: string[], typeStyles: string[] }}
 */
export function extractTokenDecls(source) {
  /** @param {string} kw */
  const names = (kw) => {
    const out = [];
    const re = new RegExp(`(?:^|\\n)\\s*${kw}\\s+([^\\s:{]+)`, "g");
    let m;
    while ((m = re.exec(source))) out.push(m[1]);
    return out;
  };
  return {
    primitives: names("primitive"),
    semantics: names("semantic"),
    themes: names("theme"),
    // `enum` is a surface alias for `variant` (same closed-set decls).
    variants: [...names("variant"), ...names("enum")],
    typeStyles: names("typeStyle"),
  };
}

/**
 * @param {string} fromPath repo-relative or workspace-relative
 * @param {string} importPath relative import string
 */
export function resolveImportPath(fromPath, importPath) {
  const norm = fromPath.replace(/\\/g, "/");
  const dir = norm.includes("/") ? norm.slice(0, norm.lastIndexOf("/")) : "";
  const joined = (dir ? `${dir}/` : "") + importPath.replace(/^\.\//, "");
  const parts = [];
  for (const seg of joined.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return parts.join("/");
}

/**
 * @typedef {object} CanvasTarget
 * @property {'components' | 'tokens' | 'empty'} kind
 * @property {string[]} componentNames
 * @property {string[]} visitedFiles
 * @property {ReturnType<typeof extractTokenDecls>} tokens
 * @property {string} [primaryComponent] First component for fixtures/params
 */

/**
 * @param {string} activePath
 * @param {Record<string, string>} files
 * @param {Set<string>} [seen]
 * @returns {CanvasTarget}
 */
export function resolveCanvasTarget(activePath, files, seen = new Set()) {
  const key = activePath.replace(/\\/g, "/");
  if (seen.has(key)) {
    return {
      kind: "empty",
      componentNames: [],
      visitedFiles: [...seen],
      tokens: emptyTokens(),
    };
  }
  seen.add(key);
  const source = files[key] ?? files[activePath] ?? "";
  const comps = extractComponentNames(source);
  const tokens = extractTokenDecls(source);
  const imports = extractImportPaths(source);

  if (comps.length > 0) {
    return {
      kind: "components",
      componentNames: comps,
      visitedFiles: [...seen],
      tokens,
      primaryComponent: comps[0],
    };
  }

  if (imports.length > 0) {
    /** @type {string[]} */
    const names = [];
    let mergedTokens = emptyTokens();
    for (const imp of imports) {
      const resolved = resolveImportPath(key, imp);
      const child = resolveCanvasTarget(resolved, files, seen);
      for (const n of child.componentNames) {
        if (!names.includes(n)) names.push(n);
      }
      mergedTokens = mergeTokens(mergedTokens, child.tokens);
    }
    mergedTokens = mergeTokens(mergedTokens, tokens);
    if (names.length > 0) {
      return {
        kind: "components",
        componentNames: names,
        visitedFiles: [...seen],
        tokens: mergedTokens,
        primaryComponent: names[0],
      };
    }
    const hasTokens = tokenCount(mergedTokens) > 0;
    return {
      kind: hasTokens ? "tokens" : "empty",
      componentNames: [],
      visitedFiles: [...seen],
      tokens: mergedTokens,
    };
  }

  const hasTokens = tokenCount(tokens) > 0;
  return {
    kind: hasTokens ? "tokens" : "empty",
    componentNames: [],
    visitedFiles: [...seen],
    tokens,
  };
}

function emptyTokens() {
  return { primitives: [], semantics: [], themes: [], variants: [], typeStyles: [] };
}

/** @param {ReturnType<typeof extractTokenDecls>} a @param {ReturnType<typeof extractTokenDecls>} b */
function mergeTokens(a, b) {
  /** @param {string[]} x @param {string[]} y */
  const u = (x, y) => [...new Set([...x, ...y])];
  return {
    primitives: u(a.primitives, b.primitives),
    semantics: u(a.semantics, b.semantics),
    themes: u(a.themes, b.themes),
    variants: u(a.variants, b.variants),
    typeStyles: u(a.typeStyles, b.typeStyles),
  };
}

/** @param {ReturnType<typeof extractTokenDecls>} t */
function tokenCount(t) {
  return (
    t.primitives.length +
    t.semantics.length +
    t.themes.length +
    t.variants.length +
    t.typeStyles.length
  );
}

/**
 * @param {string} source
 * @returns {boolean}
 */
export function fileHasPreviewableDecls(source) {
  return extractComponentNames(source).length > 0 || tokenCount(extractTokenDecls(source)) > 0;
}

/**
 * Import closure from an entry module (relative paths as stored in `files`).
 * @param {string} entry
 * @param {Record<string, string>} files
 * @returns {Set<string>}
 */
export function collectImportClosure(entry, files) {
  /** @type {Set<string>} */
  const out = new Set();
  /** @param {string} path */
  function walk(path) {
    const key = path.replace(/\\/g, "/");
    if (out.has(key)) return;
    const source = files[key] ?? files[path];
    if (source === undefined) return;
    out.add(key);
    for (const imp of extractImportPaths(source)) {
      walk(resolveImportPath(key, imp));
    }
  }
  walk(entry);
  return out;
}

/**
 * Workspace `.pdl` files with decls that are outside the entry import graph.
 * @param {Record<string, string>} files
 * @param {string} entry
 * @returns {string[]}
 */
export function unreachableWorkspaceModules(files, entry) {
  if (!entry) return [];
  const closure = collectImportClosure(entry, files);
  /** @type {string[]} */
  const orphans = [];
  for (const [path, source] of Object.entries(files)) {
    const key = path.replace(/\\/g, "/");
    if (!key.endsWith(".pdl")) continue;
    if (closure.has(key)) continue;
    if (!fileHasPreviewableDecls(source)) continue;
    orphans.push(key);
  }
  orphans.sort();
  return orphans;
}

/**
 * Suggest an import string from entry → orphan (same-dir basename when possible).
 * @param {string} entry
 * @param {string} orphanPath
 */
export function importHintFromEntry(entry, orphanPath) {
  const ent = entry.replace(/\\/g, "/");
  const orphan = orphanPath.replace(/\\/g, "/");
  const dir = ent.includes("/") ? ent.slice(0, ent.lastIndexOf("/") + 1) : "";
  if (dir && orphan.startsWith(dir)) return orphan.slice(dir.length);
  return orphan.includes("/") ? orphan.slice(orphan.lastIndexOf("/") + 1) : orphan;
}

/**
 * @param {string} orphanPath
 * @param {string} entry
 * @returns {{ code: string; message: string }}
 */
export function formatUnreachableModuleWarning(orphanPath, entry) {
  const short = orphanPath.replace(/\\/g, "/").split("/").pop() ?? orphanPath;
  const hint = importHintFromEntry(entry, orphanPath);
  const entryShort = entry.replace(/\\/g, "/").split("/").pop() ?? entry;
  return {
    code: "PLAYGROUND-W001",
    message: `${short} is not imported from entry ${entryShort} — declarations here won’t appear in that design’s catalogue until you \`import "${hint}"\`.`,
  };
}

/**
 * @param {Record<string, string>} files
 * @param {string} componentName
 * @returns {string[]}
 */
export function findFilesDeclaringComponent(files, componentName) {
  if (!componentName) return [];
  /** @type {string[]} */
  const hits = [];
  for (const [path, source] of Object.entries(files)) {
    if (!path.replace(/\\/g, "/").endsWith(".pdl")) continue;
    if (extractComponentNames(source).includes(componentName)) {
      hits.push(path.replace(/\\/g, "/"));
    }
  }
  hits.sort();
  return hits;
}

/**
 * Whether `source` declares `component Name`.
 * @param {string} source
 * @param {string} componentName
 */
export function sourceDeclaresComponent(source, componentName) {
  return Boolean(componentName) && extractComponentNames(source).includes(componentName);
}

/**
 * Augment PDL-E037 / "Unknown component" when the name exists in an unimported file.
 * @param {string} message
 * @param {Record<string, string>} files
 * @param {string} entry Bake/analyze entry used when the error was produced
 * @returns {string}
 */
export function augmentUnknownComponentMessage(message, files, entry) {
  const text = String(message ?? "");
  if (!/Unknown component/i.test(text) && !/PDL-E037/.test(text)) return text;
  const m = text.match(/Unknown component\s+`?([A-Za-z_][A-Za-z0-9_]*)`?/);
  if (!m) return text;
  const name = m[1];
  const closure = entry ? collectImportClosure(entry, files) : new Set();
  const found = findFilesDeclaringComponent(files, name).filter((p) => !closure.has(p));
  if (found.length === 0) return text;
  const locs = found.map((p) => `\`${p}\``).join(", ");
  const hint = importHintFromEntry(entry || "design.pdl", found[0]);
  const entryLabel = entry ? `\`${entry.replace(/\\/g, "/")}\`` : "the entry";
  const base = text.trim().replace(/\s+$/, "");
  return `${base} Found in ${locs} (not in import graph of ${entryLabel}). Add \`import "${hint}"\` to the entry, or open that file to preview it alone.`;
}

/**
 * Cartesian product of variant axes. Caps at `max` combinations.
 * @param {Array<{ name: string, cases: string[] }>} axes
 * @param {number} [max]
 */
export function variantCombinations(axes, max = 16) {
  if (axes.length === 0) return [{ labels: {}, kv: {} }];
  /** @type {Array<{ labels: Record<string, string>, kv: Record<string, string> }>} */
  let out = [{ labels: {}, kv: {} }];
  for (const axis of axes) {
    /** @type {typeof out} */
    const next = [];
    for (const prev of out) {
      for (const c of axis.cases) {
        next.push({
          labels: { ...prev.labels, [axis.name]: c },
          kv: { ...prev.kv, [axis.name]: c },
        });
        if (next.length >= max) return next;
      }
    }
    out = next;
  }
  return out;
}
