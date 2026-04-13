import { PDL_KEYWORDS } from "./pdl-keywords.js";

/**
 * @param {import("@codemirror/state").EditorState} state
 * @param {number} pos
 */
function linePrefixToCursor(state, pos) {
  const line = state.doc.lineAt(pos);
  return line.text.slice(0, pos - line.from);
}

/**
 * @param {import("@codemirror/autocomplete").CompletionContext} context
 * @param {() => readonly string[]} getSymbols
 */
export function pdlCompletionSource(context, getSymbols) {
  const linePrefix = linePrefixToCursor(context.state, context.pos);
  const before = context.matchBefore(/[\w.]+$/);
  const from = before ? before.from : context.pos;
  const to = context.pos;
  const q = (before?.text ?? "").toLowerCase();

  const cornerRhs = /^\s*cornerRadius\s*=\s*[\w.]*$/i.test(linePrefix);
  const edgeRhs =
    /^\s*padding\s*=\s*[\w.]*$/i.test(linePrefix) ||
    /^\s*margin\s*=\s*[\w.]*$/i.test(linePrefix) ||
    /^\s*inset\s*=\s*[\w.]*$/i.test(linePrefix);
  const sizingRhs = /^\s*width\s*=\s*[\w.]*$/i.test(linePrefix) || /^\s*height\s*=\s*[\w.]*$/i.test(linePrefix);

  const inRhsContext = cornerRhs || edgeRhs || sizingRhs;

  if (!before && !context.explicit && !inRhsContext) return null;

  /** @type {import("@codemirror/autocomplete").Completion[]} */
  const opts = [];
  const seen = new Set();

  /**
   * @param {import("@codemirror/autocomplete").Completion | string} c
   * @param {"keyword" | "variable"} [stringType]
   */
  function add(c, stringType = "keyword") {
    const label = typeof c === "string" ? c : c.label;
    if (seen.has(label)) return;
    seen.add(label);
    if (typeof c === "string") {
      opts.push({ label: c, type: stringType });
    } else {
      opts.push(c);
    }
  }

  if (cornerRhs) {
    add({
      label: "Corner",
      displayLabel: "Corner(tl:, tr:, br:, bl:)",
      apply: "Corner(tl: 12, tr: 12, br: 12, bl: 12)",
      type: "function",
      boost: 90,
      detail: "per-corner radius literal",
      info: "Requires all four corners: tl, tr, br, bl (numbers or Radius tokens).",
    });
    for (const sym of getSymbols()) {
      if (/radius/i.test(sym)) {
        add({ label: sym, type: "variable", boost: 40 });
      }
    }
  }

  if (edgeRhs) {
    add({
      label: "EdgeInsetsXY",
      displayLabel: "EdgeInsets(x:, y:)",
      apply: "EdgeInsets(x: 12, y: 12)",
      type: "function",
      boost: 88,
      detail: "symmetric horizontal / vertical",
      info: "x → left & right; y → top & bottom.",
    });
    add({
      label: "EdgeInsetsTRBL",
      displayLabel: "EdgeInsets(top:, right:, bottom:, left:)",
      apply: "EdgeInsets(top: 12, right: 12, bottom: 12, left: 12)",
      type: "function",
      boost: 85,
      detail: "all four sides",
    });
    for (const sym of getSymbols()) {
      if (/spacing|inset|padding|margin|distance/i.test(sym)) {
        add({ label: sym, type: "variable", boost: 35 });
      }
    }
  }

  if (sizingRhs) {
    add({ label: ".hug", apply: ".hug", type: "keyword", boost: 82, detail: "sizing" });
    add({ label: ".fill", apply: ".fill", type: "keyword", boost: 82, detail: "sizing" });
    add({
      label: ".fixed",
      displayLabel: ".fixed(n)",
      apply: ".fixed(200)",
      type: "keyword",
      boost: 80,
      detail: "fixed px size",
    });
    add({
      label: ".flex",
      displayLabel: ".flex(min:, max:)",
      apply: ".flex(min: 0, max: 400)",
      type: "keyword",
      boost: 75,
      detail: "flexible bounds",
    });
  }

  for (const kw of PDL_KEYWORDS) {
    if (!q || kw.toLowerCase().startsWith(q)) add(kw, "keyword");
  }
  for (const sym of getSymbols()) {
    if (!q || sym.toLowerCase().includes(q)) {
      if (cornerRhs && /radius/i.test(sym)) continue;
      if (edgeRhs && /spacing|inset|padding|margin|distance/i.test(sym)) continue;
      add(sym, "variable");
    }
  }

  if (opts.length === 0) return null;
  opts.sort((a, b) => {
    const ba = a.boost ?? 0;
    const bb = b.boost ?? 0;
    if (bb !== ba) return bb - ba;
    return a.label.localeCompare(b.label);
  });
  return { from, to, options: opts.slice(0, 200) };
}
