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
