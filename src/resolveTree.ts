import type { ChildEntry, FrameBodyItem, IfChain, ValueExpr } from "./ast.js";
import type { ComponentDecl } from "./ast.js";
import type { DesignDefinition } from "./designModel.js";
import { PdlError } from "./errors.js";
import type { ParamEvalMeta } from "./evaluate.js";
import { evaluateCondition, evaluateValue, type EvalOptions } from "./evaluate.js";
import { coerceFramePropValue } from "./frameNumericSugar.js";

export type CatalFrame = {
  id: string;
  kind: string;
  props: Record<string, unknown>;
  children: CatalFrame[];
  /** When this frame is the root of an inlined **`Other()`** / instance child, the source component name. */
  instanceOf?: string;
  /** Evaluated **`kwargs`** from the callsite (empty object when none). */
  instanceKwargs?: Record<string, unknown>;
};

export function isHiddenFrame(f: CatalFrame): boolean {
  return f.props.hidden === true;
}

/** Drop frames with **`props.hidden === true`** from emitted **`children`** lists (recursive). */
export function pruneHiddenChildrenTree(f: CatalFrame): CatalFrame {
  return {
    id: f.id,
    kind: f.kind,
    props: { ...f.props },
    children: f.children.filter((ch) => !isHiddenFrame(ch)).map((ch) => pruneHiddenChildrenTree(ch)),
    ...(f.instanceOf !== undefined ? { instanceOf: f.instanceOf } : {}),
    ...(f.instanceKwargs !== undefined ? { instanceKwargs: { ...f.instanceKwargs } } : {}),
  };
}

type MutableFrame = {
  kind: string;
  props: Record<string, unknown>;
  childEntries: ChildEntry[];
  /** Set for **`letInstance`** roots and read in **`materialize`**. */
  instanceOf?: string;
  instanceKwargs?: Record<string, unknown>;
};

function pickIfBody(chain: IfChain, paramValues: Record<string, unknown>): FrameBodyItem[] {
  for (const br of chain.branches) {
    if (evaluateCondition(br.condition, paramValues)) return br.body;
  }
  return chain.elseBody ?? [];
}

type BuildCtx = {
  design: DesignDefinition;
  tokens: Map<string, unknown>;
  paramValues: Record<string, unknown>;
  paramMeta: ParamEvalMeta;
  component: ComponentDecl;
  /** Catalogue base trees keep String/Icon/MediaSource as `param:name` while still binding variants for `if`. */
  useStringPlaceholders?: boolean;
  /**
   * When true, a frame property whose RHS is a bare `ident` naming a declared primitive or semantic token
   * is emitted as `primitive:full.name` or `semantic:full.name` instead of the resolved concrete value (catalogue only).
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

function evalProp(expr: ValueExpr, ctx: BuildCtx): unknown {
  if (ctx.catalogueTokenRefs && expr.kind === "ident" && !ctx.paramMeta.has(expr.name)) {
    if (ctx.design.primitives.has(expr.name)) return `primitive:${expr.name}`;
    if (ctx.design.semantics.has(expr.name)) return `semantic:${expr.name}`;
  }
  return evaluateValue(expr, baseEvalOpts(ctx));
}

function evalHiddenExpr(value: ValueExpr, ctx: BuildCtx): boolean {
  if (value.kind === "condition") return evaluateCondition(value.expr, ctx.paramValues);
  if (value.kind === "boolean") return value.value;
  if (value.kind === "dotEnum") {
    const raw = value.value.startsWith(".") ? value.value.slice(1) : value.value;
    if (raw === "true" || raw === "false") return raw === "true";
  }
  const v = evaluateValue(value, baseEvalOpts(ctx));
  if (typeof v === "boolean") return v;
  throw new PdlError("PDL-E003", "`hidden` must be true, false, .true/.false, or a variant condition", {
    path: ctx.design.entryPath,
  });
}

function applyHiddenProp(target: MutableFrame, value: ValueExpr, ctx: BuildCtx): void {
  const hidden = evalHiddenExpr(value, ctx);
  if (hidden) target.props.hidden = true;
  else delete target.props.hidden;
}

function mergeStyleProps(
  props: Record<string, unknown>,
  styleVal: unknown,
  entryPath: string,
  catalogueTokenRefs?: boolean,
): void {
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
      props[k] = coerceFramePropValue(k, v, entryPath);
    }
    if (typeof name === "string") {
      props.typeStyle = catalogueTokenRefs ? `typeStyle:${name}` : name;
    }
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
        if (item.name === "hidden") {
          applyHiddenProp(f, item.value, ctx);
          break;
        }
        const v = evalProp(item.value, ctx);
        if (item.name === "style") mergeStyleProps(f.props, v, ctx.design.entryPath, ctx.catalogueTokenRefs);
        else f.props[item.name] = coerceFramePropValue(item.name, v, ctx.design.entryPath);
        break;
      }
      case "frameProp": {
        const fr = ensureFrame(frames, item.frame, frames.get(item.frame)?.kind ?? "layout");
        if (item.name === "hidden") {
          applyHiddenProp(fr, item.value, ctx);
          break;
        }
        const pv = evalProp(item.value, ctx);
        fr.props[item.name] = coerceFramePropValue(item.name, pv, ctx.design.entryPath);
        break;
      }
      case "children": {
        // Bare `children = […]` parses as target `"root"`; that means the frame whose body we
        // are processing (`defaultTarget`), not always the component root id `"Root"`.
        const tid = item.target === "root" ? defaultTarget : item.target.letId;
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
        const kwExplicit: Record<string, unknown> = {};
        for (const [k, expr] of Object.entries(item.kwargs)) {
          const ev = evaluateValue(expr, {
            design: ctx.design,
            tokens: ctx.tokens,
            visiting: new Set(),
            paramValues: ctx.paramValues,
            paramMeta: ctx.paramMeta,
          });
          basePv[k] = ev;
          kwExplicit[k] = ev;
        }
        const subCtx: BuildCtx = {
          ...ctx,
          component: childComp,
          paramValues: basePv,
          paramMeta: buildParamMeta(childComp),
          useStringPlaceholders: ctx.useStringPlaceholders,
        };
        const inst = ensureFrame(frames, item.id, childComp.rootKind);
        inst.instanceOf = item.component;
        inst.instanceKwargs = kwExplicit;
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
      sub.instanceOf = ch.component;
      sub.instanceKwargs = { ...kwOverrides };
      children.push(sub);
      continue;
    }
  }
  return {
    id,
    kind: mf.kind,
    props: { ...mf.props },
    children,
    ...(mf.instanceOf !== undefined
      ? {
          instanceOf: mf.instanceOf,
          instanceKwargs: { ...(mf.instanceKwargs ?? {}) },
        }
      : {}),
  };
}

/** **Graph** outputs (`componentCatalogue`, `resolvedComponent` trees): token pointer strings + `param:` placeholders. */
export const RESOLVE_OPTIONS_GRAPH_CATALOGUE = {
  useStringPlaceholders: true,
  catalogueTokenRefs: true,
} as const;

/** **Bake** and any consumer that needs fully evaluated literals on frames. */
export const RESOLVE_OPTIONS_LITERAL_BAKE = {
  useStringPlaceholders: false,
  catalogueTokenRefs: false,
} as const;
