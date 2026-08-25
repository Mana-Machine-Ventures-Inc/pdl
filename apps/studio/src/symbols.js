/**
 * Locate declarations in .pdl source for navigator → editor focus.
 */

const DECL_RE =
  /^\s*(?:component|page|screen|primitive|semantic|theme|catalog|host|typeStyle|type|variant|enum|samples|fixtures|usage|rules|protocol)\b/gm;

/**
 * @param {string} source
 * @param {string} symbolName
 * @returns {{ line: number, ch: number, kind: string } | null}
 */
export function findSymbolInSource(source, symbolName) {
  if (!source || !symbolName) return null;
  const patterns = [
    new RegExp(
      `^\\s*(component|page|screen)\\s+${escapeReg(symbolName)}\\b`,
      "m",
    ),
    new RegExp(`^\\s*fixtures\\s+${escapeReg(symbolName)}\\b`, "m"),
    new RegExp(`^\\s*samples\\s+${escapeReg(symbolName)}\\b`, "m"),
    new RegExp(
      `^\\s*(primitive|semantic)\\s+[\\w.]*${escapeReg(symbolName)}\\b`,
      "m",
    ),
  ];
  for (const re of patterns) {
    const m = re.exec(source);
    if (!m) continue;
    const before = source.slice(0, m.index);
    const line = before.split("\n").length - 1;
    return { line, ch: 0, kind: m[1] || "decl" };
  }
  return null;
}

/**
 * List top-level declaration names in a file (best-effort scrape).
 * @param {string} source
 * @returns {Array<{ kind: string, name: string, line: number }>}
 */
export function listDeclarations(source) {
  /** @type {Array<{ kind: string, name: string, line: number }>} */
  const out = [];
  const lines = String(source || "").split("\n");
  const re =
    /^\s*(component|page|screen|samples|fixtures|theme|catalog|host|typeStyle|protocol|variant|enum)\s+([A-Za-z_][\w]*)/;
  const tokenRe = /^\s*(primitive|semantic)\s+([A-Za-z_][\w.]*)/;
  lines.forEach((line, i) => {
    let m = re.exec(line);
    if (m) {
      out.push({ kind: m[1], name: m[2], line: i });
      return;
    }
    m = tokenRe.exec(line);
    if (m) out.push({ kind: m[1], name: m[2], line: i });
  });
  return out;
}

/**
 * Components declared in a file (from catalogue file map or scrape).
 * @param {string} filePath
 * @param {Record<string, string>} files
 * @param {object | null} catalogue
 */
export function symbolsInFile(filePath, files, catalogue) {
  const names = [];
  if (catalogue?.componentFiles) {
    for (const [name, path] of Object.entries(catalogue.componentFiles)) {
      if (normalizePath(path) === normalizePath(filePath) || String(path).endsWith(filePath)) {
        names.push(name);
      }
    }
  }
  if (names.length) return names;
  const decls = listDeclarations(files[filePath] || "");
  return decls.filter((d) => ["component", "page", "screen"].includes(d.kind)).map((d) => d.name);
}

function normalizePath(p) {
  return String(p || "").replace(/\\/g, "/").replace(/^\.\//, "");
}

function escapeReg(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Sample path references inside a fixture bag (JSON-ish / PDL scrape).
 * @param {unknown} bag
 * @returns {string[]}
 */
export function sampleRefsInBag(bag) {
  const text = JSON.stringify(bag ?? {});
  const refs = new Set();
  const re = /\b([A-Z][A-Za-z0-9_]*)\.[A-Za-z0-9_]+\.[A-Za-z0-9_]+\b/g;
  let m;
  while ((m = re.exec(text))) {
    refs.add(m[0]);
  }
  return [...refs];
}
