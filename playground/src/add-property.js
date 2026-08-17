/**
 * Teaching helper: insert common frame properties into PDL at the cursor.
 */

/** @typedef {'layout' | 'text' | 'icon' | 'media' | 'presenter' | 'unknown'} FrameKind */

/** @type {Record<FrameKind, Array<{ id: string, label: string, snippet: string }>>} */
export const PROPERTIES_BY_KIND = {
  layout: [
    { id: "direction", label: "direction", snippet: "direction = .row" },
    { id: "align", label: "align", snippet: "align = .center" },
    { id: "justify", label: "justify", snippet: "justify = .start" },
    { id: "gap", label: "gap", snippet: "gap = 8" },
    { id: "padding", label: "padding", snippet: "padding = EdgeInsets(x: 12, y: 8)" },
    { id: "cornerRadius", label: "cornerRadius", snippet: "cornerRadius = 8" },
    { id: "background", label: "background", snippet: "background = #EEEEEE" },
    { id: "borderWidth", label: "borderWidth", snippet: "borderWidth = 1" },
    { id: "borderColor", label: "borderColor", snippet: "borderColor = #CCCCCC" },
    { id: "width", label: "width", snippet: "width = .hug" },
    { id: "height", label: "height", snippet: "height = .hug" },
    { id: "wrap", label: "wrap", snippet: "wrap = .nowrap" },
    { id: "opacity", label: "opacity", snippet: "opacity = 1" },
  ],
  text: [
    { id: "content", label: "content", snippet: 'content = "Label"' },
    { id: "color", label: "color", snippet: "color = #111111" },
    { id: "fontSize", label: "fontSize", snippet: "fontSize = 15" },
    { id: "fontWeight", label: "fontWeight", snippet: "fontWeight = 600" },
    { id: "style", label: "style (typeStyle)", snippet: "style = Body" },
    { id: "opacity", label: "opacity", snippet: "opacity = 1" },
  ],
  icon: [
    { id: "size", label: "size", snippet: "size = 24" },
    { id: "color", label: "color", snippet: "color = #111111" },
  ],
  media: [
    { id: "source", label: "source", snippet: 'source = ""' },
    { id: "width", label: "width", snippet: "width = .fill" },
    { id: "height", label: "height", snippet: "height = 120" },
  ],
  presenter: [
    { id: "width", label: "width", snippet: "width = .fill" },
    { id: "height", label: "height", snippet: "height = .fill" },
    { id: "padding", label: "padding", snippet: "padding = EdgeInsets(x: 12, y: 8)" },
    { id: "align", label: "align", snippet: "align = .center" },
    { id: "justify", label: "justify", snippet: "justify = .start" },
    { id: "overflow", label: "overflow", snippet: "overflow = .hidden" },
    { id: "background", label: "background", snippet: "background = #EEEEEE" },
    { id: "cornerRadius", label: "cornerRadius", snippet: "cornerRadius = 8" },
  ],
  unknown: [
    { id: "direction", label: "direction (layout)", snippet: "direction = .column" },
    { id: "content", label: "content (text)", snippet: 'content = ""' },
    { id: "gap", label: "gap", snippet: "gap = 8" },
    { id: "padding", label: "padding", snippet: "padding = EdgeInsets(x: 12, y: 8)" },
  ],
};

/**
 * Infer frame kind from source around cursor offset.
 * @param {string} doc
 * @param {number} pos
 * @returns {FrameKind}
 */
export function inferFrameKindAt(doc, pos) {
  const before = doc.slice(0, pos);
  // Nearest open block: look at last unmatched `{` context keywords
  const layoutIdx = Math.max(
    before.lastIndexOf(") layout {"),
    before.lastIndexOf(" layout {"),
    before.lastIndexOf(": layout = {"),
    before.lastIndexOf(": layout={"),
  );
  const textIdx = Math.max(
    before.lastIndexOf(") text {"),
    before.lastIndexOf(": text = {"),
    before.lastIndexOf(": text={"),
    before.lastIndexOf(" let "),
  );
  const iconIdx = Math.max(before.lastIndexOf(": icon = {"), before.lastIndexOf(") icon {"));
  const mediaIdx = Math.max(before.lastIndexOf(": media = {"), before.lastIndexOf(") media {"));
  const presenterIdx = before.lastIndexOf("Presenter(");

  // Prefer explicit kind markers closest to cursor
  const candidates = [
    { kind: /** @type {FrameKind} */ ("layout"), i: layoutIdx },
    { kind: /** @type {FrameKind} */ ("icon"), i: iconIdx },
    { kind: /** @type {FrameKind} */ ("media"), i: mediaIdx },
    { kind: /** @type {FrameKind} */ ("presenter"), i: presenterIdx },
  ];
  // text: check `let Name: text = {` near cursor
  const textLet = /let\s+\w+\s*:\s*text\s*=\s*\{[^}]*$/s.test(before.slice(-200));
  if (textLet) return "text";
  const layoutLet = /let\s+\w+\s*:\s*layout\s*=\s*\{[^}]*$/s.test(before.slice(-200));
  if (layoutLet) return "layout";

  candidates.sort((a, b) => b.i - a.i);
  if (candidates[0].i >= 0) return candidates[0].kind;

  if (/component\s+\w+[^{]*\blayout\s*\{[^}]*$/s.test(before)) return "layout";
  if (/component\s+\w+[^{]*\btext\s*\{[^}]*$/s.test(before)) return "text";

  void textIdx;
  return "unknown";
}

/**
 * Build a CodeMirror-friendly insert: newline + indent + snippet.
 * @param {string} doc
 * @param {number} pos
 * @param {string} snippet
 */
export function formatPropertyInsert(doc, pos, snippet) {
  const lineStart = doc.lastIndexOf("\n", pos - 1) + 1;
  const line = doc.slice(lineStart, pos);
  const indentMatch = line.match(/^\s*/);
  const indent = indentMatch ? indentMatch[0] : "  ";
  // If cursor mid-line with content, insert on next line
  const atLineStart = line.trim().length === 0;
  if (atLineStart) {
    return { from: lineStart, to: pos, insert: `${indent}${snippet}\n` };
  }
  return { from: pos, to: pos, insert: `\n${indent}${snippet}` };
}
