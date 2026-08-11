#!/usr/bin/env node
/**
 * Codemod classic `let Id: kind = { … }` → World A `let Id = Text|Layout|Icon|Media(…)`.
 * Rewrites component bodies by re-printing from the lowered AST (classic lets stay as lets).
 *
 * Usage: node scripts/codemod-world-a.mjs [path…]
 * Default: test-fixtures/pdl
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// Prefer compiled dist if present; else register ts via vitest/tsx path — use dynamic import of src through vitest's loader.
async function loadParser() {
  try {
    return await import("../dist/parser.js");
  } catch {
    // Run via: npx tsx scripts/codemod-world-a.mjs
    return await import("../src/parser.ts");
  }
}

const KIND_TO_CTOR = { text: "Text", layout: "Layout", icon: "Icon", media: "Media" };

function printValue(v, indent = 0) {
  if (!v || typeof v !== "object") return String(v);
  switch (v.kind) {
    case "string":
      return JSON.stringify(v.value);
    case "number":
      return String(v.value);
    case "boolean":
      return v.value ? "true" : "false";
    case "hex":
      return v.value;
    case "null":
      return "null";
    case "ident":
      return v.name;
    case "dotEnum":
      return v.value.startsWith(".") ? v.value : `.${v.value}`;
    case "ratio":
      return `${v.width}:${v.height}`;
    case "opacityOf":
      return `${printValue(v.base)} @ ${printValue(v.opacity)}`;
    case "array":
      return `[${v.items.map((i) => printValue(i, indent)).join(", ")}]`;
    case "call": {
      const args = Object.entries(v.args)
        .map(([k, val]) => `${k}: ${printValue(val, indent)}`)
        .join(", ");
      return `${v.callee}(${args})`;
    }
    case "instance": {
      const args = Object.entries(v.kwargs)
        .map(([k, val]) => `${k}: ${printValue(val, indent)}`)
        .join(", ");
      return `${v.component}(${args})`;
    }
    case "edgeInsets": {
      const args = Object.entries(v.fields)
        .map(([k, val]) => `${k}: ${printValue(val)}`)
        .join(", ");
      return `EdgeInsets(${args})`;
    }
    case "corner":
      return `Corner(tl: ${printValue(v.tl)}, tr: ${printValue(v.tr)}, br: ${printValue(v.br)}, bl: ${printValue(v.bl)})`;
    case "shadow": {
      const parts = [
        `x: ${printValue(v.x)}`,
        `y: ${printValue(v.y)}`,
        `blurRadius: ${printValue(v.blurRadius)}`,
        `color: ${printValue(v.color)}`,
      ];
      if (v.spread) parts.push(`spread: ${printValue(v.spread)}`);
      return `Shadow(${parts.join(", ")})`;
    }
    case "iconRef":
      if (v.source === "file") return `IconRef(file: ${printValue(v.path)})`;
      return `IconRef(system: ${printValue(v.system)}, name: ${printValue(v.name)})`;
    case "mediaSourceRef":
      if (v.source === "file") {
        const extra = [];
        if (v.mediaKind) extra.push(`kind: ${printValue(v.mediaKind)}`);
        if (v.format) extra.push(`format: ${printValue(v.format)}`);
        return `MediaSource(file: ${printValue(v.path)}${extra.length ? ", " + extra.join(", ") : ""})`;
      }
      {
        const extra = [];
        if (v.mediaKind) extra.push(`kind: ${printValue(v.mediaKind)}`);
        if (v.format) extra.push(`format: ${printValue(v.format)}`);
        return `MediaSource(url: ${printValue(v.url)}${extra.length ? ", " + extra.join(", ") : ""})`;
      }
    case "sizing":
      if (v.mode === "hug") return ".hug";
      if (v.mode === "fill") return ".fill";
      if (v.mode === "fixed") return `.fixed(${v.fixed})`;
      if (v.mode === "aspect") return `.aspect(${printValue(v.aspect)})`;
      if (v.mode === "flex") {
        const args = Object.entries(v.flexArgs || {})
          .map(([k, val]) => `${k}: ${printValue(val)}`)
          .join(", ");
        return `.flex(${args})`;
      }
      return ".hug";
    case "gradientStop": {
      const args = Object.entries(v.fields)
        .map(([k, val]) => `${k}: ${printValue(val)}`)
        .join(", ");
      return `GradientStop(${args})`;
    }
    case "transition": {
      const parts = [`duration: ${printValue(v.duration)}`, `easing: ${printValue(v.easing)}`];
      if (v.delay) parts.push(`delay: ${printValue(v.delay)}`);
      return `(${parts.join(", ")})`;
    }
    case "rampInline": {
      const stops = v.stops.map((s) => printValue(s)).join(", ");
      return `(direction: ${v.direction.startsWith(".") ? v.direction : "." + v.direction}, stops: [${stops}])`;
    }
    case "selfMember":
      return `self.${v.name}`;
    default:
      return `/*unhandled:${v.kind}*/`;
  }
}

function printChildEntry(e) {
  if (e.kind === "spacer") return "Spacer()";
  if (e.kind === "frameRef") {
    return e.opacity ? `${e.id} @ ${printValue(e.opacity)}` : e.id;
  }
  if (e.kind === "instance") {
    const args = Object.entries(e.kwargs)
      .map(([k, val]) => `${k}: ${printValue(val)}`)
      .join(", ");
    const base = `${e.component}(${args})`;
    return e.opacity ? `${base} @ ${printValue(e.opacity)}` : base;
  }
  return "/*child*/";
}

function printFrameCtorFromLet(id, frameKind, body, indent) {
  const ctor = KIND_TO_CTOR[frameKind] || "Layout";
  const pad = "  ".repeat(indent);
  const props = [];
  let childEntries = null;
  for (const item of body) {
    if (item.kind === "prop") props.push(`${item.name}: ${printValue(item.value)}`);
    else if (item.kind === "children" && item.target === "root") childEntries = item.entries;
  }
  // Nested lets / if / frameProp → keep classic brace form (caller handles)
  const complex = body.some(
    (i) =>
      i.kind === "let" ||
      i.kind === "letInstance" ||
      i.kind === "letValue" ||
      i.kind === "if" ||
      i.kind === "frameProp" ||
      (i.kind === "children" && itemTargetIsLet(i)),
  );
  if (complex) return null;
  if (childEntries) {
    props.push(`children: [${childEntries.map(printChildEntry).join(", ")}]`);
  }
  if (props.length === 0) return `${pad}let ${id} = ${ctor}()`;
  if (props.length <= 2 && !childEntries) {
    return `${pad}let ${id} = ${ctor}(${props.join(", ")})`;
  }
  return `${pad}let ${id} = ${ctor}(\n${props.map((p) => pad + "  " + p).join(",\n")}\n${pad})`;
}

function itemTargetIsLet(i) {
  return i.target !== "root";
}

function printBodyItems(items, indent) {
  const pad = "  ".repeat(indent);
  const lines = [];
  for (const item of items) {
    if (item.kind === "prop") {
      lines.push(`${pad}${item.name} = ${printValue(item.value)}`);
    } else if (item.kind === "frameProp") {
      lines.push(`${pad}${item.frame}.${item.name} = ${printValue(item.value)}`);
    } else if (item.kind === "children") {
      const lhs =
        item.target === "root" ? "children" : `${item.target.letId}.children`;
      lines.push(`${pad}${lhs} = [${item.entries.map(printChildEntry).join(", ")}]`);
    } else if (item.kind === "let") {
      const wa = printFrameCtorFromLet(item.id, item.frameKind, item.body, indent);
      if (wa) {
        lines.push(wa);
      } else {
        // Hoist nested lets first as World A when possible, then parent classic/WA
        const nested = item.body.filter((b) => b.kind === "let" || b.kind === "letInstance");
        const rest = item.body.filter((b) => b.kind !== "let" && b.kind !== "letInstance");
        for (const n of nested) {
          if (n.kind === "let") {
            const inner = printFrameCtorFromLet(n.id, n.frameKind, n.body, indent);
            if (inner) lines.push(inner);
            else {
              lines.push(`${pad}let ${n.id}: ${n.frameKind} = {`);
              lines.push(...printBodyItems(n.body, indent + 1));
              lines.push(`${pad}}`);
            }
          } else if (n.kind === "letInstance") {
            const args = Object.entries(n.kwargs)
              .map(([k, val]) => `${k}: ${printValue(val)}`)
              .join(", ");
            lines.push(`${pad}let ${n.id} = ${n.component}(${args})`);
          }
        }
        const wa2 = printFrameCtorFromLet(item.id, item.frameKind, rest, indent);
        if (wa2) lines.push(wa2);
        else {
          lines.push(`${pad}let ${item.id}: ${item.frameKind} = {`);
          lines.push(...printBodyItems(rest, indent + 1));
          lines.push(`${pad}}`);
        }
      }
    } else if (item.kind === "letInstance") {
      const args = Object.entries(item.kwargs)
        .map(([k, val]) => `${k}: ${printValue(val)}`)
        .join(", ");
      lines.push(`${pad}let ${item.id} = ${item.component}(${args})`);
    } else if (item.kind === "letValue") {
      lines.push(`${pad}let ${item.id}: ${item.typeName} = ${printValue(item.value)}`);
    } else if (item.kind === "if") {
      // Preserve if structure; rewrite bodies
      item.chain.branches.forEach((b, idx) => {
        const kw = idx === 0 ? "if" : "else if";
        lines.push(`${pad}${kw} ${printCondition(b.condition)} {`);
        lines.push(...printBodyItems(b.body, indent + 1));
        lines.push(`${pad}}`);
      });
      if (item.chain.elseBody) {
        lines.push(`${pad}else {`);
        lines.push(...printBodyItems(item.chain.elseBody, indent + 1));
        lines.push(`${pad}}`);
      }
    }
  }
  return lines;
}

function printCondition(c) {
  if (c.kind === "cmp") return `${c.param} ${c.op} ${c.rhs}`;
  if (c.kind === "truthy") return c.param;
  if (c.kind === "and") return c.items.map(printCondition).join(" && ");
  if (c.kind === "or") return c.items.map(printCondition).join(" || ");
  return "true";
}

function walkPdlFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkPdlFiles(p, out);
    else if (name.endsWith(".pdl")) out.push(p);
  }
  return out;
}

async function main() {
  const { parseModule } = await loadParser();
  const roots = process.argv.slice(2);
  const files =
    roots.length > 0
      ? roots
      : walkPdlFiles(join(process.cwd(), "test-fixtures/pdl"));

  let changed = 0;
  for (const file of files) {
    if (file.includes("/errors/")) continue; // keep error fixtures as-authored
    const src = readFileSync(file, "utf8");
    if (!/let\s+\w+\s*:\s*(text|layout|icon|media)\s*=/.test(src)) continue;
    let mod;
    try {
      mod = parseModule(src, file);
    } catch (e) {
      console.warn("skip (parse fail)", relative(process.cwd(), file), e.message);
      continue;
    }
    // Only rewrite files that are a single component or simple — splice component bodies
    const components = mod.declarations.filter((d) => d.kind === "component");
    if (components.length === 0) continue;

    let next = src;
    for (const c of components) {
      // Find `component Name … rootKind {` and matching close — fragile; rewrite whole file if one component
      if (components.length !== 1 && !src.includes(`component ${c.name}`)) continue;
    }

    if (components.length === 1) {
      const c = components[0];
      const bodyLines = printBodyItems(c.body, 1);
      const conf = c.conformsTo ? ` <${c.conformsTo}>` : "";
      const params = c.params
        .map((p) => {
          const t = p.isArray ? `[${p.typeName}]` : p.typeName;
          return `${p.name}: ${t} = ${printValue(p.defaultValue)}`;
        })
        .join(",\n  ");
      const paramBlock = c.params.length ? `(\n  ${params}\n)` : "()";
      // Preserve preamble (imports / tokens) before first component
      const idx = src.search(/component\s+\w+/);
      const preamble = idx >= 0 ? src.slice(0, idx) : "";
      // Preserve trailing emits / companions after component — drop for safety if complex
      const after = src.slice(src.lastIndexOf("}") + 1);
      next =
        preamble +
        `component ${c.name}${conf}${paramBlock} ${c.rootKind} {\n` +
        bodyLines.join("\n") +
        `\n}` +
        after;
    } else {
      console.warn("skip multi-component", relative(process.cwd(), file));
      continue;
    }

    if (next !== src) {
      writeFileSync(file, next);
      changed++;
      console.log("rewrote", relative(process.cwd(), file));
    }
  }
  console.log(`done: ${changed} files`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
