import type { ChildEntry, ConditionExpr, FrameBodyItem, IfChain, ValueExpr } from "./ast.js";
import type { ComponentDecl } from "./ast.js";
import type { DesignDefinition } from "./designModel.js";
import { PdlError } from "./errors.js";
import type { ParamEvalMeta } from "./evaluate.js";
import { evaluateValue, type EvalOptions } from "./evaluate.js";

export type CatalFrame = {
  id: string;
  kind: string;
  props: Record<string, unknown>;
  children: CatalFrame[];
};

type MutableFrame = {
  kind: string;
  props: Record<string, unknown>;
  childEntries: ChildEntry[];
};

function matchesCondition(c: ConditionExpr, paramValues: Record<string, unknown>): boolean {
  switch (c.kind) {
    case "cmp": {
      const v = paramValues[c.param];
      const rhs = c.rhs.startsWith(".") ? c.rhs.slice(1) : c.rhs;
      const vs = v === undefined ? "" : String(v);
      if (c.op === "==") return vs === rhs;
      return vs !== rhs;
    }
    case "and":
      return c.items.every((x) => matchesCondition(x, paramValues));
    case "or":
      return c.items.some((x) => matchesCondition(x, paramValues));
    default:
      return false;
  }
}

function pickIfBody(chain: IfChain, paramValues: Record<string, unknown>): FrameBodyItem[] {
  for (const br of chain.branches) {
    if (matchesCondition(br.condition, paramValues)) return br.body;
  }
  return chain.elseBody ?? [];
}

type BuildCtx = {
  design: DesignDefinition;
  tokens: Map<string, unknown>;
  paramValues: Record<string, unknown>;
  paramMeta: ParamEvalMeta;
  component: ComponentDecl;
  /** Catalogue base trees keep String/Icon/MediaSource as `__param:*__` while still binding variants for `if`. */
  useStringPlaceholders?: boolean;
  /**
   * When true, a frame property whose RHS is a bare `ident` naming a declared primitive or semantic token
   * is emitted as `__token:full.name__` instead of the resolved concrete value (Component Catalogue only).
   */
  catalogueTokenRefs?: boolean;
};

function baseEvalOpts(ctx: BuildCtx): EvalOptions {
  return {
    design: ctx.design,
    tokens: ctx.tokens,
    paramValues: ctx.paramValues,
    paramMeta: ctx.paramMeta,
    visiting: new Set(),
    useStringPlaceholders: ctx.useStringPlaceholders,
  };
}

function isDeclaredPrimitiveOrSemantic(design: DesignDefinition, name: string): boolean {
  return design.primitives.has(name) || design.semantics.has(name);
}

function evalProp(expr: ValueExpr, ctx: BuildCtx): unknown {
  if (
    ctx.catalogueTokenRefs &&
    expr.kind === "ident" &&
    isDeclaredPrimitiveOrSemantic(ctx.design, expr.name) &&
    !ctx.paramMeta.has(expr.name)
  ) {
    return `__token:${expr.name}__`;
  }
  return evaluateValue(expr, baseEvalOpts(ctx));
}

function mergeStyleProps(props: Record<string, unknown>, styleVal: unknown): void {
  if (
    styleVal !== null &&
    typeof styleVal === "object" &&
    !Array.isArray(styleVal) &&
    "__typeStyle" in styleVal
  ) {
    const o = styleVal as Record<string, unknown>;
    const name = o.__typeStyle;
    for (const [k, v] of Object.entries(o)) {
      if (k === "__typeStyle") continue;
      props[k] = v;
    }
    if (typeof name === "string") props.typeStyle = name;
  } else {
    props.style = styleVal;
  }
}

export function resolveDefaultParamValues(
  design: DesignDefinition,
  tokens: Map<string, unknown>,
  c: ComponentDecl,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const ev = (expr: ValueExpr) =>
    evaluateValue(expr, { design, tokens, visiting: new Set(), paramValues: {}, paramMeta: new Map() });
  for (const p of c.params) {
    if (design.variants.has(p.typeName)) {
      const dv = p.defaultValue;
      if (dv.kind !== "dotEnum") {
        throw new PdlError("PDL-E010", `Variant default must be dot-enum for ${p.name}`);
      }
      out[p.name] = dv.value.startsWith(".") ? dv.value.slice(1) : dv.value;
    } else {
      out[p.name] = ev(p.defaultValue);
    }
  }
  return out;
}

function buildParamMeta(c: ComponentDecl): ParamEvalMeta {
  const m: ParamEvalMeta = new Map();
  for (const p of c.params) m.set(p.name, { typeName: p.typeName });
  return m;
}

function ensureFrame(frames: Map<string, MutableFrame>, id: string, kind: string): MutableFrame {
  const ex = frames.get(id);
  if (ex) return ex;
  const f: MutableFrame = { kind, props: {}, childEntries: [] };
  frames.set(id, f);
  return f;
}

function processFrameItems(
  items: FrameBodyItem[],
  defaultTarget: string,
  frames: Map<string, MutableFrame>,
  ctx: BuildCtx,
): void {
  const rootFrame = frames.get(defaultTarget);
  if (!rootFrame) {
    throw new PdlError("PDL-E001", `Internal: frame ${defaultTarget} not initialized`);
  }
  ensureFrame(frames, defaultTarget, rootFrame.kind);

  for (const item of items) {
    switch (item.kind) {
      case "prop": {
        const f = frames.get(defaultTarget)!;
        const v = evalProp(item.value, ctx);
        if (item.name === "style") mergeStyleProps(f.props, v);
        else f.props[item.name] = v;
        break;
      }
      case "frameProp": {
        const fr = ensureFrame(frames, item.frame, frames.get(item.frame)?.kind ?? "layout");
        fr.props[item.name] = evalProp(item.value, ctx);
        break;
      }
      case "children": {
        const tid = item.target === "root" ? "Root" : item.target.letId;
        const fr = ensureFrame(frames, tid, frames.get(tid)?.kind ?? "layout");
        fr.childEntries = item.entries;
        break;
      }
      case "let": {
        ensureFrame(frames, item.id, item.frameKind);
        processFrameItems(item.body, item.id, frames, ctx);
        break;
      }
      case "letInstance": {
        const childComp = ctx.design.components.get(item.component);
        if (!childComp) {
          throw new PdlError("PDL-E006", `Unknown component ${item.component} in let instance`, {
            path: ctx.design.entryPath,
          });
        }
        const basePv = resolveDefaultParamValues(ctx.design, ctx.tokens, childComp);
        for (const [k, expr] of Object.entries(item.kwargs)) {
          basePv[k] = evaluateValue(expr, {
            design: ctx.design,
            tokens: ctx.tokens,
            visiting: new Set(),
            paramValues: ctx.paramValues,
            paramMeta: ctx.paramMeta,
          });
        }
        const subCtx: BuildCtx = {
          ...ctx,
          component: childComp,
          paramValues: basePv,
          paramMeta: buildParamMeta(childComp),
          useStringPlaceholders: ctx.useStringPlaceholders,
        };
        ensureFrame(frames, item.id, childComp.rootKind);
        processFrameItems(childComp.body, item.id, frames, subCtx);
        break;
      }
      case "if": {
        const extra = pickIfBody(item.chain, ctx.paramValues);
        processFrameItems(extra, defaultTarget, frames, ctx);
        break;
      }
      default:
        break;
    }
  }
}

export function resolveComponentTree(
  design: DesignDefinition,
  componentName: string,
  tokens: Map<string, unknown>,
  paramOverrides: Record<string, unknown> = {},
  options: { useStringPlaceholders?: boolean; catalogueTokenRefs?: boolean } = {},
): CatalFrame {
  const c = design.components.get(componentName);
  if (!c) {
    throw new PdlError("PDL-E006", `Unknown component ${componentName}`, { path: design.entryPath });
  }
  const paramValues = resolveDefaultParamValues(design, tokens, c);
  for (const [k, v] of Object.entries(paramOverrides)) {
    paramValues[k] = v;
  }
  const paramMeta = buildParamMeta(c);
  const frames = new Map<string, MutableFrame>();
  frames.set("Root", { kind: c.rootKind, props: {}, childEntries: [] });
  const ctx: BuildCtx = {
    design,
    tokens,
    paramValues,
    paramMeta,
    component: c,
    useStringPlaceholders: options.useStringPlaceholders,
    catalogueTokenRefs: options.catalogueTokenRefs,
  };
  processFrameItems(c.body, "Root", frames, ctx);
  return materialize("Root", frames, design, tokens, new Set(), options);
}

function materialize(
  id: string,
  frames: Map<string, MutableFrame>,
  design: DesignDefinition,
  tokens: Map<string, unknown>,
  visitingInst: Set<string>,
  resolveOptions: { useStringPlaceholders?: boolean },
): CatalFrame {
  const mf = frames.get(id);
  if (!mf) {
    throw new PdlError("PDL-E001", `Missing frame ${id}`);
  }
  const children: CatalFrame[] = [];
  let si = 0;
  for (const ch of mf.childEntries) {
    if (ch.kind === "spacer") {
      children.push({ id: `${id}_spacer_${si++}`, kind: "spacer", props: {}, children: [] });
      continue;
    }
    if (ch.kind === "frameRef") {
      children.push(materialize(ch.id, frames, design, tokens, visitingInst, resolveOptions));
      continue;
    }
    if (ch.kind === "instance") {
      const key = `${id}>${ch.component}`;
      if (visitingInst.has(key)) {
        throw new PdlError("PDL-E004", `Recursive component instance ${ch.component}`);
      }
      visitingInst.add(key);
      const kwOverrides: Record<string, unknown> = {};
      for (const [k, expr] of Object.entries(ch.kwargs)) {
        kwOverrides[k] = evaluateValue(expr, {
          design,
          tokens,
          visiting: new Set(),
        });
      }
      const sub = resolveComponentTree(design, ch.component, tokens, kwOverrides, resolveOptions);
      visitingInst.delete(key);
      sub.id = `${id}_${ch.component}_${si++}`;
      children.push(sub);
      continue;
    }
  }
  return { id, kind: mf.kind, props: { ...mf.props }, children };
}
