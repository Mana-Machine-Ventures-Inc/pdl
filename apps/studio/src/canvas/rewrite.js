/**
 * Surgical PDL rewriter for Canvas pending edits.
 * P0: unconditional props, add Text let, delete let, children list.
 * P1: axis-scoped if / else if / else chains.
 */

/**
 * @typedef {object} RewriteResult
 * @property {boolean} ok
 * @property {string} [source]
 * @property {string} [error]
 * @property {string[]} [warnings]
 */

/**
 * @param {string} source
 * @param {string} componentName
 * @param {import('./session.js').PendingEdit[]} pending
 * @param {{ chosenAxisByEdit?: Record<string, string> }} [opts]
 * @returns {RewriteResult}
 */
export function applyPendingToSource(source, componentName, pending, opts = {}) {
  if (!componentName) return { ok: false, error: "No component" };
  if (!pending?.length) return { ok: true, source, warnings: [] };

  const loc = findComponentBody(source, componentName);
  if (!loc) return { ok: false, error: `Could not find component ${componentName} body` };

  let body = source.slice(loc.bodyStart, loc.bodyEnd);
  /** @type {string[]} */
  const warnings = [];

  for (const edit of pending) {
    const chosen = opts.chosenAxisByEdit?.[edit.id];
    const axes = edit.axes && Object.keys(edit.axes).length ? edit.axes : {};
    const axisKeys = Object.keys(axes);

    if (edit.kind === "setProp" && edit.prop) {
      if (axisKeys.length > 1 && !chosen) {
        return {
          ok: false,
          error: `Ambiguous axes for ${edit.prop}: ${axisKeys.join(", ")}. Choose one axis.`,
        };
      }
      const axis = chosen || (axisKeys.length === 1 ? axisKeys[0] : null);
      const caseName = axis ? axes[axis] : null;

      if (axis && caseName) {
        const r = setPropInAxisBranch(body, edit.target, edit.prop, edit.value, axis, caseName);
        if (!r.ok) return { ok: false, error: r.error };
        body = r.body;
        if (r.warning) warnings.push(r.warning);
      } else {
        const r = setUnconditionalProp(body, edit.target, edit.prop, edit.value);
        if (!r.ok) return { ok: false, error: r.error };
        body = r.body;
        if (r.warning) warnings.push(r.warning);
      }
      continue;
    }

    if (edit.kind === "addLayer") {
      const r = addLayer(body, edit.payload ?? {});
      if (!r.ok) return { ok: false, error: r.error };
      body = r.body;
      continue;
    }

    if (edit.kind === "deleteLayer") {
      const r = deleteLetLayer(body, edit.target);
      if (!r.ok) return { ok: false, error: r.error };
      body = r.body;
      continue;
    }

    if (edit.kind === "reorderChildren") {
      const r = rewriteChildrenList(body, edit.payload?.order ?? []);
      if (!r.ok) return { ok: false, error: r.error };
      body = r.body;
      continue;
    }
  }

  const next = source.slice(0, loc.bodyStart) + body + source.slice(loc.bodyEnd);
  return { ok: true, source: next, warnings };
}

/**
 * @param {string} source
 * @param {string} name
 * @returns {{ declStart: number, bodyStart: number, bodyEnd: number, kind: string } | null}
 */
export function findComponentBody(source, name) {
  const re = new RegExp(
    `(^|\\n)([ \\t]*)(component|page|screen)\\s+${escapeReg(name)}\\b`,
    "m",
  );
  const m = re.exec(source);
  if (!m) return null;
  const declStart = m.index + (m[1] ? m[1].length : 0);
  const afterName = source.indexOf("{", declStart);
  if (afterName < 0) return null;
  // Prefer kind body: ") layout {" / ") text {"
  const kindMatch = /\)\s*(layout|text|icon|media|spacer)\s*\{/.exec(
    source.slice(declStart, afterName + 1),
  );
  let open = afterName;
  let kind = "layout";
  if (kindMatch) {
    const abs = declStart + kindMatch.index + kindMatch[0].lastIndexOf("{");
    open = abs;
    kind = kindMatch[1];
  } else {
    // Fallback: first { after params
    open = source.indexOf("{", declStart);
  }
  if (open < 0) return null;
  const bodyStart = open + 1;
  const bodyEnd = findMatchingBrace(source, open);
  if (bodyEnd < 0) return null;
  return { declStart, bodyStart, bodyEnd, kind };
}

/**
 * @param {string} s
 * @param {number} openIdx  index of '{'
 */
function findMatchingBrace(s, openIdx) {
  let depth = 0;
  let inStr = false;
  let strQ = "";
  for (let i = openIdx; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === "\\" && i + 1 < s.length) {
        i++;
        continue;
      }
      if (c === strQ) inStr = false;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = true;
      strQ = c;
      continue;
    }
    if (c === "/" && s[i + 1] === "/") {
      while (i < s.length && s[i] !== "\n") i++;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * @param {string} body
 * @param {string} target
 * @param {string} prop
 * @param {unknown} value
 */
function setUnconditionalProp(body, target, prop, value) {
  // Root `color` is not a layout prop — redirect to first text let.
  if (target === "root" && prop === "color") {
    const m = /\blet\s+([A-Za-z_][\w]*)\s*=\s*Text\b/.exec(body);
    if (m) {
      const r = setUnconditionalProp(body, `let:${m[1]}`, "color", value);
      if (r.ok) {
        return {
          ok: true,
          body: r.body,
          warning: `color on root applied to text layer ${m[1]}`,
        };
      }
    }
    return {
      ok: false,
      error: "color is a text property — select the Label layer (or use borderColor on the button).",
    };
  }
  const line = formatPropLine(prop, value);
  if (target === "root") {
    // Refuse if prop only lives inside if-chains
    const ownership = propOwnership(body, prop, null);
    if (ownership === "variant-only") {
      return {
        ok: false,
        error: `Property ${prop} is only set inside variant branches — use Canvas variant bar (P1).`,
      };
    }
    const next = upsertRootProp(body, prop, line);
    return { ok: true, body: next };
  }
  if (target.startsWith("let:")) {
    const letName = target.slice(4);
    const next = upsertLetProp(body, letName, prop, line);
    if (!next) return { ok: false, error: `Could not find let ${letName}` };
    return { ok: true, body: next };
  }
  return { ok: false, error: `Unsupported layer target ${target} for P0 rewrite` };
}

/**
 * @param {string} body
 * @param {string} target
 * @param {string} prop
 * @param {unknown} value
 * @param {string} axis
 * @param {string} caseName
 */
function setPropInAxisBranch(body, target, prop, value, axis, caseName) {
  if (target !== "root" && !target.startsWith("let:")) {
    return { ok: false, error: `Axis edits only supported on root / let layers` };
  }
  const line = formatPropLine(prop, value);
  const qualified =
    target.startsWith("let:") ? `${target.slice(4)}.${prop}` : prop;
  // Prefer writing `L.color = …` style inside branch for lets
  const assignLine =
    target.startsWith("let:") && !line.includes(".")
      ? `${target.slice(4)}.${prop} = ${formatValue(value)}`
      : line;

  // Remove unconditional assignment of this prop if present
  let next = removeUnconditionalProp(body, target, prop);

  const chain = findAxisChain(next, axis);
  if (!chain) {
    // Create new chain at end of body (before handlers)
    const block = `\n  if ${axis} == .${caseName} {\n    ${assignLine}\n  }\n`;
    next = insertBeforeHandlers(next, block);
    return { ok: true, body: next, warning: `Created new ${axis} branch for .${caseName}` };
  }

  // Ensure case arm exists
  const withArm = ensureCaseArm(next, chain, axis, caseName);
  next = withArm.body;
  const arm = findCaseArm(next, axis, caseName);
  if (!arm) return { ok: false, error: `Could not open ${axis} == .${caseName} arm` };

  const armBody = next.slice(arm.innerStart, arm.innerEnd);
  const updatedArm = upsertLineInBlock(armBody, qualifiedPropKey(target, prop), assignLine);
  next = next.slice(0, arm.innerStart) + updatedArm + next.slice(arm.innerEnd);
  return { ok: true, body: next };
}

function qualifiedPropKey(target, prop) {
  if (target.startsWith("let:")) return `${target.slice(4)}.${prop}`;
  return prop;
}

/**
 * @param {string} body
 * @param {string} prop
 * @param {string | null} letName
 * @returns {'unconditional' | 'variant-only' | 'both' | 'absent'}
 */
function propOwnership(body, prop, letName) {
  const key = letName ? `${letName}.${prop}` : prop;
  const uncond = hasUnconditionalAssign(body, key) || (!letName && hasUnconditionalAssign(body, prop));
  const inIf = new RegExp(
    `if\\s+[\\s\\S]*?\\{[^}]*\\b${escapeReg(key)}\\s*=`,
    "m",
  ).test(body);
  if (uncond && inIf) return "both";
  if (uncond) return "unconditional";
  if (inIf) return "variant-only";
  return "absent";
}

function hasUnconditionalAssign(body, key) {
  // Rough: assignment not preceded by `if` on same structural level — scan top-level lines
  const lines = body.split("\n");
  let depth = 0;
  for (const line of lines) {
    const open = (line.match(/\{/g) || []).length;
    const close = (line.match(/\}/g) || []).length;
    if (depth === 0) {
      const re = new RegExp(`^\\s*${escapeReg(key)}\\s*=`);
      if (re.test(line) && !/^\s*if\b/.test(line)) return true;
    }
    depth += open - close;
    if (depth < 0) depth = 0;
  }
  return false;
}

/**
 * @param {string} body
 * @param {string} prop
 * @param {string} line
 */
function upsertRootProp(body, prop, line) {
  const lines = body.split("\n");
  let depth = 0;
  let replaced = false;
  const out = lines.map((ln) => {
    const open = (ln.match(/\{/g) || []).length;
    const close = (ln.match(/\}/g) || []).length;
    let next = ln;
    if (depth === 0) {
      const re = new RegExp(`^(\\s*)${escapeReg(prop)}\\s*=`);
      if (re.test(ln) && !/^\s*if\b/.test(ln)) {
        const indent = (ln.match(/^(\s*)/) || ["", "  "])[1];
        next = `${indent}${line}`;
        replaced = true;
      }
    }
    depth += open - close;
    if (depth < 0) depth = 0;
    return next;
  });
  if (replaced) return out.join("\n");
  // Insert after leading blank / before first if or let
  return insertAfterLeadingProps(body, `  ${line}\n`);
}

/**
 * @param {string} body
 * @param {string} letName
 * @param {string} prop
 * @param {string} line  "prop = value" without let prefix
 */
function upsertLetProp(body, letName, prop, line) {
  const valuePart = line.includes("=") ? line.split("=").slice(1).join("=").trim() : formatValue(line);
  const full = `${letName}.${prop} = ${valuePart}`;

  const re = new RegExp(`^(\\s*)${escapeReg(letName)}\\.${escapeReg(prop)}\\s*=.*$`, "m");
  if (re.test(body)) {
    return body.replace(re, (_, indent) => `${indent}${full}`);
  }
  const letRe = new RegExp(
    `(^[ \\t]*let\\s+${escapeReg(letName)}\\s*=.*$(?:\\r?\\n)?)`,
    "m",
  );
  const m = letRe.exec(body);
  if (!m) return null;
  const insertAt = m.index + m[0].length;
  return body.slice(0, insertAt) + `  ${full}\n` + body.slice(insertAt);
}

/**
 * @param {string} body
 * @param {string} target
 * @param {string} prop
 */
function removeUnconditionalProp(body, target, prop) {
  const key = target.startsWith("let:") ? `${target.slice(4)}.${prop}` : prop;
  const lines = body.split("\n");
  let depth = 0;
  const out = [];
  for (const ln of lines) {
    const open = (ln.match(/\{/g) || []).length;
    const close = (ln.match(/\}/g) || []).length;
    let skip = false;
    if (depth === 0) {
      const re = new RegExp(`^\\s*${escapeReg(key)}\\s*=`);
      if (re.test(ln) && !/^\s*if\b/.test(ln)) skip = true;
    }
    if (!skip) out.push(ln);
    depth += open - close;
    if (depth < 0) depth = 0;
  }
  return out.join("\n");
}

/**
 * @param {string} body
 * @param {string} axis
 */
function findAxisChain(body, axis) {
  const re = new RegExp(`\\bif\\s+${escapeReg(axis)}\\s*==`);
  const m = re.exec(body);
  if (!m) return null;
  return { index: m.index };
}

/**
 * @param {string} body
 * @param {{ index: number }} chain
 * @param {string} axis
 * @param {string} caseName
 */
function ensureCaseArm(body, chain, axis, caseName) {
  if (findCaseArm(body, axis, caseName)) return { body };
  // Find end of chain (last } of if/else if/else for this axis) — append else if
  const arm = findAnyCaseArm(body, axis);
  if (!arm) {
    const block = `\n  if ${axis} == .${caseName} {\n  }\n`;
    return { body: insertBeforeHandlers(body, block) };
  }
  // Insert else if before final else, or after last else if
  const insert = ` else if ${axis} == .${caseName} {\n  }`;
  // Find chain end: from first if, walk braces until depth 0 and no else if follows
  const end = findChainEnd(body, chain.index);
  if (end < 0) return { body };
  // If ends with `else {`, insert before else
  const before = body.slice(0, end);
  const elseMatch = /else\s*\{[^}]*\}\s*$/.exec(before);
  if (elseMatch) {
    const at = end - elseMatch[0].length;
    return { body: body.slice(0, at) + insert + " " + body.slice(at) };
  }
  return { body: body.slice(0, end) + insert + body.slice(end) };
}

/**
 * @param {string} body
 * @param {string} axis
 * @param {string} caseName
 */
function findCaseArm(body, axis, caseName) {
  const patterns = [
    new RegExp(
      `if\\s+${escapeReg(axis)}\\s*==\\s*\\.${escapeReg(caseName)}\\s*\\{`,
    ),
    new RegExp(
      `else\\s+if\\s+${escapeReg(axis)}\\s*==\\s*\\.${escapeReg(caseName)}\\s*\\{`,
    ),
  ];
  for (const re of patterns) {
    const m = re.exec(body);
    if (!m) continue;
    const open = m.index + m[0].length - 1;
    const close = findMatchingBrace(body, open);
    if (close < 0) continue;
    return { innerStart: open + 1, innerEnd: close, open, close };
  }
  return null;
}

function findAnyCaseArm(body, axis) {
  const re = new RegExp(`if\\s+${escapeReg(axis)}\\s*==\\s*\\.(\\w+)\\s*\\{`);
  const m = re.exec(body);
  if (!m) return null;
  const open = m.index + m[0].length - 1;
  const close = findMatchingBrace(body, open);
  if (close < 0) return null;
  return { innerStart: open + 1, innerEnd: close };
}

function findChainEnd(body, startIdx) {
  // From `if axis`, consume if / else if / else blocks
  let i = startIdx;
  const head = /^\s*(if|else\s+if|else)\b/;
  while (i < body.length) {
    while (i < body.length && /\s/.test(body[i])) i++;
    const slice = body.slice(i);
    if (!head.test(slice) && i !== startIdx) break;
    if (i !== startIdx && !/^(else\s+if|else)\b/.test(slice)) break;
    const brace = body.indexOf("{", i);
    if (brace < 0) break;
    const close = findMatchingBrace(body, brace);
    if (close < 0) break;
    i = close + 1;
    if (/^else\b/.test(slice) && !/^else\s+if\b/.test(slice)) break;
  }
  return i;
}

/**
 * @param {string} block
 * @param {string} key  prop or Let.prop
 * @param {string} fullLine
 */
function upsertLineInBlock(block, key, fullLine) {
  const re = new RegExp(`^(\\s*)${escapeReg(key)}\\s*=.*$`, "m");
  if (re.test(block)) {
    return block.replace(re, (_, indent) => `${indent}${fullLine}`);
  }
  const trimmed = block.replace(/^\n+/, "");
  const indent = "    ";
  return `\n${indent}${fullLine}\n${trimmed}`;
}

/**
 * @param {string} body
 * @param {string} insert
 */
function insertAfterLeadingProps(body, insert) {
  const lines = body.split("\n");
  let depth = 0;
  let insertAt = 0;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const open = (ln.match(/\{/g) || []).length;
    const close = (ln.match(/\}/g) || []).length;
    if (depth === 0) {
      if (/^\s*if\b/.test(ln) || /^\s*let\b/.test(ln) || /^\s*children\s*=/.test(ln) || /^\s*self\./.test(ln)) {
        insertAt = i;
        break;
      }
      if (ln.trim()) insertAt = i + 1;
    }
    depth += open - close;
    if (depth < 0) depth = 0;
    insertAt = i + 1;
  }
  lines.splice(insertAt, 0, insert.replace(/\n$/, ""));
  return lines.join("\n");
}

function insertBeforeHandlers(body, block) {
  const m = /\n[ \t]*self\./.exec(body);
  if (m) return body.slice(0, m.index) + block + body.slice(m.index);
  return body + block;
}

/**
 * @param {string} kind  text | layout | icon | media
 * @param {string} name
 * @param {{ content?: string }} [opts]
 * @returns {string | null}
 */
export function formatLetDecl(kind, name, opts = {}) {
  const n = sanitizeLetName(name);
  if (!n) return null;
  switch (kind) {
    case "text": {
      const content = opts.content != null ? String(opts.content) : n;
      return `let ${n} = Text(content: ${JSON.stringify(content)}, fontSize: 15, fontWeight: 600)`;
    }
    case "layout":
      return `let ${n} = Layout(direction: .row, gap: 8)`;
    case "icon":
      return `let ${n} = Icon(icon: IconRef(system: .sfSymbols, name: "star"), size: 20, color: #333333)`;
    case "media":
      return `let ${n} = Media(source: "", contentMode: .cover, width: .fill, height: 120)`;
    default:
      return null;
  }
}

/**
 * @param {string} body
 * @param {{ kind?: string, name?: string, content?: string }} payload
 */
function addLayer(body, payload) {
  const kind = String(payload.kind || "text").toLowerCase();
  const name = sanitizeLetName(payload.name || "Layer");
  if (!name) return { ok: false, error: "Invalid layer name" };
  if (new RegExp(`\\blet\\s+${escapeReg(name)}\\b`).test(body)) {
    return { ok: false, error: `let ${name} already exists` };
  }
  const decl = formatLetDecl(kind, name, { content: payload.content });
  if (!decl) return { ok: false, error: `Unsupported layer kind: ${kind}` };
  const letLine = `  ${decl}\n`;
  let next = body;
  const childRe = /children\s*=\s*\[([^\]]*)\]/;
  const cm = childRe.exec(next);
  if (cm) {
    const inner = cm[1].trim();
    const items = inner
      ? inner
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    items.push(name);
    next = next.replace(childRe, `children = [${items.join(", ")}]`);
    const cidx = next.search(childRe);
    next = next.slice(0, cidx) + letLine + next.slice(cidx);
  } else {
    next = insertBeforeHandlers(next, letLine + `  children = [${name}]\n`);
  }
  return { ok: true, body: next };
}

/**
 * @param {string} body
 * @param {string} target
 */
function deleteLetLayer(body, target) {
  if (!target.startsWith("let:")) {
    return { ok: false, error: "Can only delete let layers" };
  }
  const name = target.slice(4);
  const span = findLetDeclSpan(body, name);
  let next = body;
  if (span) {
    // Drop the whole let (single- or multi-line Text(…)/Layout(…)).
    let from = span.start;
    let to = span.end;
    // Eat following newline so we don't leave a blank hole mid-body oddly — keep one nl max.
    if (next[to] === "\n") to += 1;
    next = next.slice(0, from) + next.slice(to);
  } else {
    // Fallback: single-line let
    next = next.replace(
      new RegExp(`^[ \\t]*let\\s+${escapeReg(name)}\\s*=.*\\n`, "m"),
      "",
    );
  }
  // Qualified assigns: Label.color = …
  next = next.replace(
    new RegExp(`^[ \\t]*${escapeReg(name)}\\.\\w+\\s*=.*\\n`, "gm"),
    "",
  );
  // Clean empty if/else arms left behind (optional nicety).
  next = collapseEmptyIfArms(next);
  const childRe = /children\s*=\s*\[([^\]]*)\]/;
  const cm = childRe.exec(next);
  if (cm) {
    const items = cm[1]
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && s !== name);
    next = next.replace(childRe, `children = [${items.join(", ")}]`);
  }
  return { ok: true, body: next };
}

/**
 * Span of `let Name = …` covering balanced ( ) and { } so multi-line
 * `let Label = Text(\n  content: …\n)` is removed whole.
 * @param {string} body
 * @param {string} name
 * @returns {{ start: number, end: number } | null}
 */
export function findLetDeclSpan(body, name) {
  const re = new RegExp(`^[ \\t]*let\\s+${escapeReg(name)}\\b`, "m");
  const m = re.exec(body);
  if (!m) return null;
  const start = m.index;
  let i = m.index + m[0].length;
  // Skip to '='
  while (i < body.length && body[i] !== "=") i++;
  if (i >= body.length) return null;
  i++; // past =
  while (i < body.length && /\s/.test(body[i])) i++;

  let paren = 0;
  let brace = 0;
  let seenOpen = false;
  let inStr = false;
  let strQ = "";

  for (; i < body.length; i++) {
    const c = body[i];
    if (inStr) {
      if (c === "\\" && i + 1 < body.length) {
        i++;
        continue;
      }
      if (c === strQ) inStr = false;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = true;
      strQ = c;
      continue;
    }
    if (c === "(") {
      paren++;
      seenOpen = true;
    } else if (c === ")") {
      paren = Math.max(0, paren - 1);
    } else if (c === "{") {
      brace++;
      seenOpen = true;
    } else if (c === "}") {
      brace = Math.max(0, brace - 1);
    } else if (c === "\n" && !seenOpen && paren === 0 && brace === 0) {
      // Single-line let Name = expr
      return { start, end: i };
    }

    if (seenOpen && paren === 0 && brace === 0) {
      // End of constructor / block; include through this char
      return { start, end: i + 1 };
    }
  }
  return { start, end: body.length };
}

/**
 * Remove empty `if … { }` / `else if … { }` / `else { }` arms left after deleting lets.
 * Conservative: only collapse arms whose body is whitespace-only.
 * @param {string} body
 */
function collapseEmptyIfArms(body) {
  // Multi-pass for nested empties; cheap on component bodies.
  let next = body;
  for (let n = 0; n < 4; n++) {
    const before = next;
    // else { \s* }
    next = next.replace(/\n[ \t]*else\s*\{\s*\}/g, "");
    // else if cond { \s* }
    next = next.replace(/\n[ \t]*else if\b[^{]*\{\s*\}/g, "");
    // if cond { \s* }  — only when not followed by else (handled by leaving dangling else to next pass)
    next = next.replace(/\n[ \t]*if\b[^{]*\{\s*\}(?!\s*else\b)/g, "");
    // if { } else if / else — drop empty if, keep rest starting at else
    next = next.replace(/\n[ \t]*if\b[^{]*\{\s*\}\s*(?=else\b)/g, "\n  ");
    if (next === before) break;
  }
  return next;
}

/**
 * @param {string} body
 * @param {string[]} order  let names
 */
function rewriteChildrenList(body, order) {
  const childRe = /children\s*=\s*\[([^\]]*)\]/;
  if (!childRe.test(body)) {
    return { ok: false, error: "No children = […] list to reorder" };
  }
  const list = order.filter(Boolean).join(", ");
  return { ok: true, body: body.replace(childRe, `children = [${list}]`) };
}

/**
 * @param {string} prop
 * @param {unknown} value
 */
function formatPropLine(prop, value) {
  return `${prop} = ${formatValue(value)}`;
}

/**
 * @param {unknown} value
 */
export function formatValue(value) {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") {
    const s = value.trim();
    if (s.startsWith(".") || s.startsWith("#")) {
      // `#RRGGBB @ 0.5` opacityOf
      if (/^#[0-9A-Fa-f]{3,8}\s*@\s*-?[\d.]+$/.test(s)) {
        return s.replace(/\s+/g, " ");
      }
      return s.startsWith("#") && /\s/.test(s) ? JSON.stringify(s) : s;
    }
    if (/^(true|false)$/.test(s)) return s;
    if (/^-?\d+(\.\d+)?$/.test(s)) return s;
    if (/^(EdgeInsets|Corner|Shadow|Size|Motion|Timing|Ease)\(/.test(s)) return s;
    // Token ref or token @ opacity
    if (/^[A-Za-z_][\w.]*(\s*@\s*-?[\d.]+)?$/.test(s)) {
      return s.replace(/\s*@\s*/, " @ ");
    }
    return JSON.stringify(s);
  }
  if (value && typeof value === "object") {
    // EdgeInsets-like from bake
    const o = /** @type {Record<string, unknown>} */ (value);
    if ("x" in o || "y" in o || "top" in o) {
      const parts = [];
      for (const k of ["x", "y", "top", "right", "bottom", "left"]) {
        if (o[k] != null) parts.push(`${k}: ${formatValue(o[k])}`);
      }
      return `EdgeInsets(${parts.join(", ")})`;
    }
  }
  return JSON.stringify(value);
}

function sanitizeLetName(name) {
  const cleaned = String(name).replace(/[^A-Za-z0-9_]/g, "") || "Layer";
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `L${cleaned}`;
}

function escapeReg(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Analyze which axes exist as if-chains in the body.
 * @param {string} body
 * @returns {string[]}
 */
export function listAxisChains(body) {
  const axes = new Set();
  const re = /\bif\s+([A-Za-z_][\w]*)\s*==/g;
  let m;
  while ((m = re.exec(body))) axes.add(m[1]);
  return [...axes];
}
