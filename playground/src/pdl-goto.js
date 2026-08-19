/**
 * Go-to-definition helpers for the Playground PDL editor.
 * Resolves components/pages/screens, tokens, typeStyles, variants, protocols, themes,
 * and `import "…"` paths from the identifier under the cursor.
 */

/**
 * @param {string} s
 */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Index every go-to-definition target in the pack (for link highlighting).
 * Omits variant `case` names — too ambiguous to style as links.
 * @param {Record<string, string>} files
 * @returns {{ symbols: Set<string>, imports: Set<string> }}
 */
export function buildGotoSymbolIndex(files) {
  /** @type {Set<string>} */
  const symbols = new Set();
  /** @type {Set<string>} */
  const imports = new Set();
  const declRe =
    /(?:^|\n)\s*(?:component|page|screen|primitive|semantic|typeStyle|variant|enum|protocol|theme|usage|fixtures)\s+([^\s:{<(]+)/g;
  const importRe = /(?:^|\n)\s*import\s+"([^"]+\.pdl)"/g;
  for (const [path, src] of Object.entries(files ?? {})) {
    if (!path.endsWith(".pdl") || typeof src !== "string") continue;
    let m;
    declRe.lastIndex = 0;
    while ((m = declRe.exec(src))) {
      const name = m[1]?.trim();
      if (name) symbols.add(name);
    }
    importRe.lastIndex = 0;
    while ((m = importRe.exec(src))) {
      imports.add(m[1]);
    }
  }
  return { symbols, imports };
}

/**
 * Identifier / import path under `pos` in a CodeMirror document.
 * @param {{ lineAt: (n: number) => { from: number; text: string }; sliceString: (a: number, b: number) => string }} doc
 * @param {number} pos
 * @returns {{ kind: "ident" | "import"; text: string; from: number; to: number } | null}
 */
export function extractAtPos(doc, pos) {
  if (pos < 0 || pos > doc.length) return null;
  const line = doc.lineAt(pos);
  const text = line.text;
  const col = Math.min(Math.max(0, pos - line.from), text.length);

  // import "path.pdl" — click anywhere on the quoted path
  const importRe = /\bimport\s+"([^"]+\.pdl)"/g;
  let m;
  while ((m = importRe.exec(text))) {
    const pathStart = line.from + m.index + m[0].indexOf('"') + 1;
    const pathEnd = pathStart + m[1].length;
    if (pos >= pathStart - 1 && pos <= pathEnd + 1) {
      return { kind: "import", text: m[1], from: pathStart, to: pathEnd };
    }
  }

  // Maximal dotted identifier: ios.color.accent.blue / IosButton / IosNavStyle
  let start = col;
  let end = col;
  const isId = (ch) => /[A-Za-z0-9_.]/.test(ch);
  while (start > 0 && isId(text[start - 1])) start -= 1;
  while (end < text.length && isId(text[end])) end += 1;
  let raw = text.slice(start, end);
  // Strip leading dots from enum cases (.small → small) and trailing dots.
  while (raw.startsWith(".")) {
    start += 1;
    raw = raw.slice(1);
  }
  while (raw.endsWith(".")) {
    end -= 1;
    raw = raw.slice(0, -1);
  }
  if (!raw || !/^[A-Za-z_]/.test(raw)) return null;
  return { kind: "ident", text: raw, from: line.from + start, to: line.from + end };
}

/**
 * Resolve an import string relative to the active file, falling back to basename match.
 * @param {string} fromPath
 * @param {string} importPath
 * @param {Record<string, string>} files
 */
export function resolveImportTarget(fromPath, importPath, files) {
  const normFrom = String(fromPath).replace(/\\/g, "/");
  const dir = normFrom.includes("/") ? normFrom.slice(0, normFrom.lastIndexOf("/")) : "";
  const joined = (dir ? `${dir}/` : "") + String(importPath).replace(/^\.\//, "");
  const parts = [];
  for (const seg of joined.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  const resolved = parts.join("/");
  if (files[resolved] !== undefined) return resolved;
  const base = String(importPath).replace(/^.*\//, "");
  const hit = Object.keys(files).find((p) => p === importPath || p.endsWith(`/${base}`) || p === base);
  return hit ?? null;
}

/**
 * @typedef {{ path: string, line: number, kind: string, name: string }} DefLoc
 */

/**
 * Search pack sources for a declaration of `name`.
 * @param {string} name
 * @param {Record<string, string>} files
 * @param {string} activePath
 * @returns {DefLoc | null}
 */
export function findDefinition(name, files, activePath) {
  if (!name) return null;

  /** @type {Array<{ kind: string, re: RegExp }>} */
  const patterns = [
    { kind: "component", re: new RegExp(`^\\s*(?:component|page|screen)\\s+${escapeRegExp(name)}\\b`) },
    { kind: "primitive", re: new RegExp(`^\\s*primitive\\s+${escapeRegExp(name)}\\b`) },
    { kind: "semantic", re: new RegExp(`^\\s*semantic\\s+${escapeRegExp(name)}\\b`) },
    { kind: "typeStyle", re: new RegExp(`^\\s*typeStyle\\s+${escapeRegExp(name)}\\b`) },
    { kind: "variant", re: new RegExp(`^\\s*(?:variant|enum)\\s+${escapeRegExp(name)}\\b`) },
    { kind: "protocol", re: new RegExp(`^\\s*protocol\\s+${escapeRegExp(name)}\\b`) },
    { kind: "theme", re: new RegExp(`^\\s*theme\\s+${escapeRegExp(name)}\\b`) },
    { kind: "usage", re: new RegExp(`^\\s*usage\\s+${escapeRegExp(name)}\\b`) },
    { kind: "fixtures", re: new RegExp(`^\\s*fixtures\\s+${escapeRegExp(name)}\\b`) },
    // Variant case as a last resort (ambiguous across variants).
    { kind: "case", re: new RegExp(`^\\s*case\\s+${escapeRegExp(name)}\\b`) },
  ];

  const paths = Object.keys(files)
    .filter((p) => p.endsWith(".pdl"))
    .sort((a, b) => {
      if (a === activePath) return -1;
      if (b === activePath) return 1;
      return a.localeCompare(b);
    });

  for (const { kind, re } of patterns) {
    for (const path of paths) {
      const content = files[path] ?? "";
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        if (re.test(lines[i] ?? "")) {
          return { path, line: i + 1, kind, name };
        }
      }
    }
  }
  return null;
}

/**
 * @param {{ kind: "ident" | "import"; text: string }} target
 * @param {Record<string, string>} files
 * @param {string} activePath
 * @returns {DefLoc | null}
 */
export function resolveGotoTarget(target, files, activePath) {
  if (target.kind === "import") {
    const path = resolveImportTarget(activePath, target.text, files);
    if (!path) return null;
    return { path, line: 1, kind: "import", name: target.text };
  }
  return findDefinition(target.text, files, activePath);
}
