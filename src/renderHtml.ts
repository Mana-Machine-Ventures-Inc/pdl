import type { BakedComponentJson, BakedDesignDocument, BakedFrame } from "./bakeDesign.js";

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(text: string): string {
  return escapeHtml(text);
}

/** Allow double-quoted HTML `style=""` without breaking on `"` inside generated CSS values (e.g. `font-family`). */
function escapeStyleAttr(css: string): string {
  return css.replace(/\\/g, "\\\\").replace(/"/g, "'");
}

function isPlainPadding(
  v: unknown,
): v is { top?: number; bottom?: number; left?: number; right?: number } {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** `padding` / `margin` style from baked EdgeInsets-like objects. */
function paddingToCss(p: Record<string, unknown>, key: "padding" | "margin"): string | undefined {
  const v = p[key];
  if (!isPlainPadding(v)) return undefined;
  const { top = 0, right = 0, bottom = 0, left = 0 } = v;
  if (top === 0 && right === 0 && bottom === 0 && left === 0) return undefined;
  return `${top}px ${right}px ${bottom}px ${left}px`;
}

function flexAlignItems(align: unknown): string | undefined {
  if (typeof align !== "string") return undefined;
  const m: Record<string, string> = {
    stretch: "stretch",
    center: "center",
    start: "flex-start",
    end: "flex-end",
    baseline: "baseline",
  };
  return m[align];
}

function flexJustifyContent(justify: unknown): string | undefined {
  if (typeof justify !== "string") return undefined;
  const m: Record<string, string> = {
    center: "center",
    start: "flex-start",
    end: "flex-end",
    spaceBetween: "space-between",
    spaceAround: "space-around",
    spaceEvenly: "space-evenly",
    stretch: "flex-start",
  };
  return m[justify];
}

function flexDirectionCss(direction: unknown): string | undefined {
  if (direction === "row") return "row";
  if (direction === "column") return "column";
  if (direction === "rowReverse") return "row-reverse";
  if (direction === "columnReverse") return "column-reverse";
  return undefined;
}

function flexWrap(wrap: unknown): string | undefined {
  if (wrap === "wrap") return "wrap";
  if (wrap === "nowrap") return "nowrap";
  return undefined;
}

function finiteNum(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return undefined;
}

/** First solid color string in a scalar, layer list, or nested structure (blur/ramp shells skipped). */
function firstColorFromFill(value: unknown): string | undefined {
  if (typeof value === "string" && (value.startsWith("#") || value.startsWith("rgb"))) {
    return value;
  }
  if (Array.isArray(value)) {
    for (const el of value) {
      const c = firstColorFromFill(el);
      if (c) return c;
    }
    return undefined;
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const o = value as Record<string, unknown>;
    const k = o.kind;
    if (k === "blur" || k === "ramp" || k === "media" || k === "gradientStop") return undefined;
  }
  return undefined;
}

type LayerOp =
  | { kind: "solid"; color: string }
  | { kind: "gradient"; css: string }
  | { kind: "image"; url: string; objectFit?: string; opacity?: number }
  | { kind: "blur"; px: number };

function dotEnumValue(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (v !== null && typeof v === "object" && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    if (o.kind === "dotEnum" && typeof o.value === "string") return o.value;
  }
  return undefined;
}

function parseHexRgba(s: string): { r: number; g: number; b: number; a: number } | undefined {
  if (typeof s !== "string" || !s.startsWith("#")) return undefined;
  const h = s.slice(1);
  const expand = (x: string) => x + x;
  if (h.length === 3) {
    const r = parseInt(expand(h[0]!), 16);
    const g = parseInt(expand(h[1]!), 16);
    const b = parseInt(expand(h[2]!), 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return undefined;
    return { r, g, b, a: 1 };
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return undefined;
    return { r, g, b, a: 1 };
  }
  if (h.length === 8) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const ai = parseInt(h.slice(6, 8), 16);
    if ([r, g, b, ai].some((n) => Number.isNaN(n))) return undefined;
    return { r, g, b, a: ai / 255 };
  }
  return undefined;
}

function rgbaCssFromHex(hex: string, opacityMul: number): string | undefined {
  const p = parseHexRgba(hex);
  if (!p) return undefined;
  const a = Math.max(0, Math.min(1, p.a * opacityMul));
  return `rgba(${String(p.r)},${String(p.g)},${String(p.b)},${a.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")})`;
}

function rampToLinearGradientCss(ramp: Record<string, unknown>): string | undefined {
  const dirRaw = ramp.direction;
  const dir = dotEnumValue(dirRaw) ?? (typeof dirRaw === "string" ? dirRaw : undefined);
  const stopsRaw = ramp.stops;
  const stops: unknown[] = Array.isArray(stopsRaw) ? stopsRaw : [];

  const dirCss: Record<string, string> = {
    topToBottom: "to bottom",
    bottomToTop: "to top",
    leftToRight: "to right",
    rightToLeft: "to left",
  };
  if (dir === "radial") {
    const parts: string[] = [];
    for (const s of stops) {
      const css = gradientStopToCss(s, true);
      if (css) parts.push(css);
    }
    if (parts.length === 0) return undefined;
    return `radial-gradient(circle, ${parts.join(", ")})`;
  }
  const lin = dir && dirCss[dir] ? dirCss[dir]! : "to bottom";
  const parts: string[] = [];
  for (const s of stops) {
    const css = gradientStopToCss(s, false);
    if (css) parts.push(css);
  }
  if (parts.length === 0) return undefined;
  return `linear-gradient(${lin}, ${parts.join(", ")})`;
}

function gradientStopToCss(stop: unknown, radial: boolean): string | undefined {
  if (stop === null || typeof stop !== "object" || Array.isArray(stop)) return undefined;
  const o = stop as Record<string, unknown>;
  const pos = finiteNum(o.position);
  const op = finiteNum(o.opacity) ?? 1;
  const col = typeof o.color === "string" ? o.color : undefined;
  const posStr =
    pos !== undefined ? `${String(Math.max(0, Math.min(1, pos)) * 100)}%` : radial ? "50%" : undefined;
  if (!col || !col.startsWith("#")) {
    if (posStr !== undefined && (op !== 1 || o.opacity !== undefined)) {
      return `rgba(0,0,0,${String(op)}) ${posStr}`;
    }
    return undefined;
  }
  const rgba = rgbaCssFromHex(col, op);
  if (!rgba) return undefined;
  return posStr !== undefined ? `${rgba} ${posStr}` : rgba;
}

function isResolvableImageUrl(src: string): boolean {
  return /^https?:\/\//i.test(src) || src.startsWith("/") || src.startsWith("./");
}

/** Maps baked `contentMode` to `background-size` for layer images. */
function backgroundSizeFromContentMode(mode: unknown): string | undefined {
  if (typeof mode !== "string") return undefined;
  const m: Record<string, string> = {
    cover: "cover",
    contain: "contain",
    fill: "100% 100%",
    scaleDown: "contain",
  };
  return m[mode];
}

function flattenLayerOps(fill: unknown): LayerOp[] {
  const out: LayerOp[] = [];

  const walk = (v: unknown) => {
    if (v === undefined || v === null) return;
    if (typeof v === "string") {
      if (v.startsWith("#") || v.startsWith("rgb")) {
        out.push({ kind: "solid", color: v });
      }
      return;
    }
    if (Array.isArray(v)) {
      for (const el of v) walk(el);
      return;
    }
    if (typeof v !== "object") return;
    const o = v as Record<string, unknown>;
    const k = o.kind;
    if (k === "blur") {
      const px = finiteNum(o.blur);
      if (px !== undefined && px > 0) out.push({ kind: "blur", px });
      return;
    }
    if (k === "ramp") {
      const css = rampToLinearGradientCss(o);
      if (css) out.push({ kind: "gradient", css });
      return;
    }
    if (k === "media") {
      const src = typeof o.source === "string" ? o.source : "";
      if (src.length > 0 && isResolvableImageUrl(src)) {
        const objectFit = backgroundSizeFromContentMode(o.contentMode) ?? "cover";
        const opacity = finiteNum(o.opacity);
        out.push({
          kind: "image",
          url: src,
          objectFit,
          ...(opacity !== undefined ? { opacity } : {}),
        });
      }
      return;
    }
    if (k === "gradientStop" || k === "vibrancy") return;
  };

  walk(fill);
  return out;
}

function layerStackWrapperStyle(z: number): string {
  return [
    "position:absolute",
    "inset:0",
    "border-radius:inherit",
    "overflow:hidden",
    "pointer-events:none",
    `z-index:${String(z)}`,
  ].join(";");
}

function renderLayerOpDiv(op: LayerOp, index: number): string {
  const z = index + 1;
  const base = ["position:absolute", "inset:0", `z-index:${String(z)}`];
  if (op.kind === "solid") {
    const st = [...base, `background:${op.color}`].join(";");
    return `<div style="${escapeStyleAttr(st)}"></div>`;
  }
  if (op.kind === "gradient") {
    const st = [...base, `background:${op.css}`].join(";");
    return `<div style="${escapeStyleAttr(st)}"></div>`;
  }
  if (op.kind === "image") {
    const fit = op.objectFit ?? "cover";
    const parts = [
      ...base,
      "background-color:transparent",
      `background-image:url(${JSON.stringify(op.url)})`,
      "background-position:center",
      "background-repeat:no-repeat",
      `background-size:${fit}`,
    ];
    if (op.opacity !== undefined && Number.isFinite(op.opacity)) {
      parts.push(`opacity:${String(op.opacity)}`);
    }
    return `<div style="${escapeStyleAttr(parts.join(";"))}"></div>`;
  }
  if (op.kind === "blur") {
    const px = op.px;
    const st = [
      ...base,
      "background:transparent",
      `backdrop-filter:blur(${String(px)}px)`,
      `-webkit-backdrop-filter:blur(${String(px)}px)`,
    ].join(";");
    return `<div style="${escapeStyleAttr(st)}"></div>`;
  }
  return "";
}

function renderLayerBandHtml(ops: LayerOp[], zBand: number): string {
  if (ops.length === 0) return "";
  const inner = ops.map((op, i) => renderLayerOpDiv(op, i)).join("");
  const wrap = mergeInlineStyles(layerStackWrapperStyle(zBand), "isolation:isolate");
  return `<div class="pdl-layer-band" style="${escapeStyleAttr(wrap)}">${inner}</div>`;
}

function layoutLayerBandsActive(props: Record<string, unknown>): boolean {
  return flattenLayerOps(props.background).length > 0 || flattenLayerOps(props.foreground).length > 0;
}

function textLayerBandsActive(props: Record<string, unknown>): boolean {
  return flattenLayerOps(props.background).length > 0 || flattenLayerOps(props.foreground).length > 0;
}

function backgroundCssDecl(props: Record<string, unknown>): string | undefined {
  const bg = props.background;
  if (typeof bg === "string" && bg.length > 0) return `background:${bg}`;
  const c = firstColorFromFill(bg);
  if (c) return `background:${c}`;
  return undefined;
}

/** Drop shadow only (foreground tints render in the overlay band). */
function dropShadowCss(props: Record<string, unknown>): string | undefined {
  if (typeof props.shadow === "string" && props.shadow.trim().length > 0) {
    return `box-shadow:${props.shadow.trim()}`;
  }
  return undefined;
}

function overflowCss(overflow: unknown): string | undefined {
  if (typeof overflow !== "string") return undefined;
  const m: Record<string, string> = {
    visible: "visible",
    hidden: "hidden",
    scroll: "scroll",
    auto: "auto",
    clip: "clip",
  };
  const v = m[overflow];
  return v ? `overflow:${v}` : undefined;
}

function borderCss(props: Record<string, unknown>): string | undefined {
  const w = finiteNum(props.borderWidth);
  const c = props.borderColor;
  if (w !== undefined && w > 0 && typeof c === "string" && c.length > 0) {
    return `border:${w}px solid ${c}`;
  }
  return undefined;
}

function gridPlaceItems(align: unknown, justify: unknown): string {
  const aMap: Record<string, string> = {
    stretch: "stretch",
    center: "center",
    start: "start",
    end: "end",
    baseline: "baseline",
  };
  const jMap: Record<string, string> = {
    center: "center",
    start: "start",
    end: "end",
    stretch: "stretch",
    spaceBetween: "stretch",
    spaceAround: "center",
    spaceEvenly: "center",
  };
  const a = typeof align === "string" && aMap[align] ? aMap[align]! : "start";
  const j = typeof justify === "string" && jMap[justify] ? jMap[justify]! : "start";
  return `place-items:${a} ${j}`;
}

/** Sizing for one axis: returns `width:…` / `min-width:…` style fragments (no `border-radius` etc.). */
function sizingAxisDecls(props: Record<string, unknown>, axis: "width" | "height"): string[] {
  const v = props[axis];
  const dim = axis === "width" ? "width" : "height";
  const minD = axis === "width" ? "min-width" : "min-height";
  const maxD = axis === "width" ? "max-width" : "max-height";
  if (v === "fill") return [`${dim}:100%`];
  if (v === "hug") return [`${dim}:auto`];
  if (typeof v === "number" && Number.isFinite(v)) return [`${dim}:${v}px`];
  if (v !== null && typeof v === "object" && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    if ("fixed" in o) {
      const n = finiteNum(o.fixed);
      if (n !== undefined) return [`${dim}:${n}px`];
    }
    if ("flex" in o) {
      const flex = o.flex;
      if (flex !== null && typeof flex === "object" && !Array.isArray(flex)) {
        const fx = flex as Record<string, unknown>;
        const out: string[] = [];
        const mi = finiteNum(fx.min);
        const ma = finiteNum(fx.max);
        const pref = finiteNum(fx.preferred);
        if (mi !== undefined) out.push(`${minD}:${mi}px`);
        if (ma !== undefined) out.push(`${maxD}:${ma}px`);
        if (pref !== undefined) out.push(`${dim}:${pref}px`);
        else out.push(`${dim}:auto`);
        out.push("flex:1 1 auto");
        return out;
      }
    }
  }
  return [];
}

function flexItemDecls(props: Record<string, unknown>): string[] {
  const out: string[] = [];
  const as = props.alignSelf;
  if (typeof as === "string") {
    const m: Record<string, string> = {
      start: "flex-start",
      center: "center",
      end: "flex-end",
      stretch: "stretch",
      auto: "auto",
    };
    const css = m[as];
    if (css) out.push(`align-self:${css}`);
  }
  const g = finiteNum(props.grow);
  if (g !== undefined) out.push(`flex-grow:${String(g)}`);
  const s = finiteNum(props.shrink);
  if (s !== undefined) out.push(`flex-shrink:${String(s)}`);
  if (props.position === "absolute") {
    out.push("position:absolute");
    const inset = props.inset;
    if (inset !== null && typeof inset === "object" && !Array.isArray(inset)) {
      const o = inset as Record<string, unknown>;
      const t = finiteNum(o.top) ?? 0;
      const r = finiteNum(o.right) ?? 0;
      const b = finiteNum(o.bottom) ?? 0;
      const l = finiteNum(o.left) ?? 0;
      out.push(`top:${t}px`, `right:${r}px`, `bottom:${b}px`, `left:${l}px`);
    }
  }
  return out;
}

function stackCellDecls(stackIndex: number): string[] {
  return ["grid-area:1 / 1 / 2 / 2", `z-index:${String(stackIndex + 1)}`, "min-width:0", "min-height:0"];
}

function textAlignFromJustify(justify: unknown): string | undefined {
  if (typeof justify !== "string") return undefined;
  const m: Record<string, string> = {
    start: "start",
    center: "center",
    end: "end",
  };
  const v = m[justify];
  return v ? `text-align:${v}` : undefined;
}

function objectFitFromContentMode(mode: unknown): string | undefined {
  if (typeof mode !== "string") return undefined;
  const m: Record<string, string> = {
    cover: "cover",
    contain: "contain",
    fill: "fill",
    scaleDown: "scale-down",
  };
  const v = m[mode];
  return v ? `object-fit:${v}` : undefined;
}

/**
 * Baked `cornerRadius`: uniform number, or `{ tl, tr, br, bl }` from `Corner(…)` (CSS order matches PDL).
 */
function cornerRadiusToCss(cornerRadius: unknown): string | undefined {
  if (typeof cornerRadius === "number" && Number.isFinite(cornerRadius)) {
    if (cornerRadius === 0) return undefined;
    return `border-radius:${cornerRadius}px`;
  }
  if (cornerRadius !== null && typeof cornerRadius === "object" && !Array.isArray(cornerRadius)) {
    const o = cornerRadius as Record<string, unknown>;
    const px = (k: string): number => {
      const v = o[k];
      return typeof v === "number" && Number.isFinite(v) ? v : 0;
    };
    const tl = px("tl");
    const tr = px("tr");
    const br = px("br");
    const bl = px("bl");
    if (tl === 0 && tr === 0 && br === 0 && bl === 0) return undefined;
    return `border-radius:${tl}px ${tr}px ${br}px ${bl}px`;
  }
  return undefined;
}

function mergeInlineStyles(...chunks: (string | undefined)[]): string {
  const parts: string[] = [];
  for (const ch of chunks) {
    if (!ch) continue;
    for (const p of ch.split(";")) {
      const t = p.trim();
      if (t) parts.push(t);
    }
  }
  return parts.join(";");
}

/** Padding, margin, sizing, radius, opacity, flat background / shadow / border / overflow (no flex/grid). */
function boxMetricsStyle(
  props: Record<string, unknown>,
  opts?: { omitBackground?: boolean },
): string {
  const parts: string[] = [];
  const pad = paddingToCss(props, "padding");
  if (pad) parts.push(`padding:${pad}`);
  const mar = paddingToCss(props, "margin");
  if (mar) parts.push(`margin:${mar}`);
  parts.push(...sizingAxisDecls(props, "width"));
  parts.push(...sizingAxisDecls(props, "height"));
  const rad = cornerRadiusToCss(props.cornerRadius);
  if (rad) parts.push(rad);
  if (typeof props.opacity === "number" && Number.isFinite(props.opacity)) {
    parts.push(`opacity:${props.opacity}`);
  }
  if (!opts?.omitBackground) {
    const bg = backgroundCssDecl(props);
    if (bg) parts.push(bg);
  }
  const sh = dropShadowCss(props);
  if (sh) parts.push(sh);
  const bd = borderCss(props);
  if (bd) parts.push(bd);
  const ov = overflowCss(props.overflow);
  if (ov) parts.push(ov);
  return parts.join(";");
}

/** Flex / grid container only; merge with `boxMetricsStyle` for full `layout` box. */
function layoutFlexGridStyle(props: Record<string, unknown>): string {
  const isStack = props.direction === "stack";
  const parts: string[] = [];
  if (isStack) {
    parts.push("display:grid");
    parts.push("grid-template-columns:minmax(0,1fr)");
    parts.push("grid-template-rows:minmax(0,1fr)");
    parts.push("min-width:0");
    parts.push("min-height:0");
    parts.push(gridPlaceItems(props.align, props.justify));
  } else {
    parts.push("display:flex", "min-width:0", "min-height:0");
    const fd = flexDirectionCss(props.direction);
    if (fd) parts.push(`flex-direction:${fd}`);
    const ai = flexAlignItems(props.align);
    if (ai) parts.push(`align-items:${ai}`);
    const jc = flexJustifyContent(props.justify);
    if (jc) parts.push(`justify-content:${jc}`);
    const fw = flexWrap(props.wrap);
    if (fw) parts.push(`flex-wrap:${fw}`);
    if (typeof props.gap === "number" && Number.isFinite(props.gap)) {
      parts.push(`gap:${props.gap}px`);
    }
    if (typeof props.columnGap === "number" && Number.isFinite(props.columnGap)) {
      parts.push(`column-gap:${props.columnGap}px`);
    }
    if (typeof props.rowGap === "number" && Number.isFinite(props.rowGap)) {
      parts.push(`row-gap:${props.rowGap}px`);
    }
  }
  return parts.join(";");
}

function layoutContainerStyle(props: Record<string, unknown>): string {
  return mergeInlineStyles(layoutFlexGridStyle(props), boxMetricsStyle(props));
}

/** Per-frame box: container / leaf metrics + flex-item / stack-cell positioning. */
function frameBoxStyle(
  props: Record<string, unknown>,
  kind: string,
  opts: { stackChild: boolean; stackIndex: number },
): string {
  const item = mergeInlineStyles(...flexItemDecls(props));
  const stack = opts.stackChild ? mergeInlineStyles(...stackCellDecls(opts.stackIndex)) : "";
  if (kind === "text") {
    return mergeInlineStyles(textOwnStyle(props), item, stack);
  }
  if (kind === "icon" || kind === "media") {
    return mergeInlineStyles(boxMetricsStyle(props), item, stack);
  }
  if (kind === "layout" && layoutLayerBandsActive(props)) {
    return mergeInlineStyles(
      boxMetricsStyle(props, { omitBackground: true }),
      "display:flex",
      "flex-direction:column",
      "position:relative",
      "min-width:0",
      "min-height:0",
      item,
      stack,
    );
  }
  return mergeInlineStyles(layoutContainerStyle(props), item, stack);
}

/** Typography, spacing, sizing, alignment, overflow (no fill layers or shadow). */
function textGlyphAndFlowStyle(props: Record<string, unknown>): string {
  const parts: string[] = ["min-width:0"];
  if (typeof props.color === "string") parts.push(`color:${props.color}`);
  if (typeof props.fontSize === "number") parts.push(`font-size:${props.fontSize}px`);
  if (typeof props.fontWeight === "number") parts.push(`font-weight:${String(props.fontWeight)}`);
  if (typeof props.fontFamily === "string") parts.push(`font-family:${props.fontFamily}`);
  const lh = finiteNum(props.lineHeight);
  if (lh !== undefined) {
    parts.push(`line-height:${String(lh)}`);
  }
  const ls = finiteNum(props.letterSpacing);
  const fs = finiteNum(props.fontSize);
  if (ls !== undefined) {
    if (fs !== undefined) parts.push(`letter-spacing:${String(ls * fs)}px`);
    else parts.push(`letter-spacing:${String(ls)}em`);
  }
  const ta = textAlignFromJustify(props.justify);
  if (ta) parts.push(ta);
  const ai = flexAlignItems(props.align);
  if (ai) parts.push(`align-self:${ai}`);
  const ov = overflowCss(props.overflow);
  if (ov) parts.push(ov);
  const lc = finiteNum(props.lineClamp);
  if (lc !== undefined && lc > 0) {
    parts.push("-webkit-box-orient:vertical");
    parts.push(`-webkit-line-clamp:${String(lc)}`);
    parts.push("overflow:hidden");
  }
  if (props.textOverflow === "ellipsis") {
    parts.push("text-overflow:ellipsis");
  }
  return parts.join(";");
}

/** Padding, margin, sizing, radius, opacity (used as outer shell when text uses layer bands). */
function textMetricsShellStyle(props: Record<string, unknown>): string {
  const parts: string[] = [];
  const tpad = paddingToCss(props, "padding");
  if (tpad) parts.push(`padding:${tpad}`);
  const tmar = paddingToCss(props, "margin");
  if (tmar) parts.push(`margin:${tmar}`);
  parts.push(...sizingAxisDecls(props, "width"));
  parts.push(...sizingAxisDecls(props, "height"));
  const tcr = cornerRadiusToCss(props.cornerRadius);
  if (tcr) parts.push(tcr);
  if (typeof props.opacity === "number" && Number.isFinite(props.opacity)) {
    parts.push(`opacity:${props.opacity}`);
  }
  return parts.join(";");
}

/** Text typography / box (no `display` — caller sets display for clamp vs block). */
function textOwnStyle(props: Record<string, unknown>): string {
  return mergeInlineStyles(
    textGlyphAndFlowStyle(props),
    textMetricsShellStyle(props),
    backgroundCssDecl(props),
    dropShadowCss(props),
  );
}

function textInlineStyle(props: Record<string, unknown>): string {
  const lc = finiteNum(props.lineClamp);
  const display =
    lc !== undefined && lc > 0 ? "display:-webkit-box" : "display:block";
  return mergeInlineStyles(display, textOwnStyle(props));
}

type FrameRenderOpts = { stackChild: boolean; stackIndex: number };

function iconFrameStyle(props: Record<string, unknown>, opts: FrameRenderOpts): string {
  const sz = finiteNum(props.size) ?? 24;
  const col = typeof props.color === "string" && props.color.length > 0 ? props.color : "#94a3b8";
  const box = frameBoxStyle(props, "icon", opts);
  const iconBox = `width:${sz}px;height:${sz}px;background-color:${col};flex-shrink:0`;
  return mergeInlineStyles(box, iconBox);
}

function mediaFrameStyle(props: Record<string, unknown>, opts: FrameRenderOpts): string {
  const box = frameBoxStyle(props, "media", opts);
  const ob = objectFitFromContentMode(props.contentMode);
  return ob ? mergeInlineStyles(box, "max-width:100%", ob) : mergeInlineStyles(box, "max-width:100%");
}

function renderFrame(frame: BakedFrame, opts: FrameRenderOpts = { stackChild: false, stackIndex: 0 }): string {
  const { id, kind, props, children } = frame;
  const kids = children ?? [];
  const dataId = ` data-pdl-id="${escapeAttr(id)}"`;
  const inst =
    frame.instanceOf !== undefined ? ` data-pdl-instance-of="${escapeAttr(frame.instanceOf)}"` : "";

  if (kind === "layout") {
    const isStack = props.direction === "stack";
    const layered = layoutLayerBandsActive(props);
    if (layered) {
      const style = mergeInlineStyles(
        frameBoxStyle(props, "layout", opts),
        isStack ? "position:relative" : "",
      );
      const innerStyle = mergeInlineStyles(
        layoutFlexGridStyle(props),
        "flex:1 1 auto",
        "width:100%",
        "min-width:0",
        "min-height:0",
        "position:relative",
        "z-index:1",
      );
      const under = renderLayerBandHtml(flattenLayerOps(props.background), 0);
      const over = renderLayerBandHtml(flattenLayerOps(props.foreground), 2);
      const innerKids = kids
        .map((ch, i) => renderFrame(ch, { stackChild: isStack, stackIndex: i }))
        .join("");
      const inner = `<div class="pdl-layout__content" style="${escapeStyleAttr(innerStyle)}">${innerKids}</div>`;
      return `<div class="pdl-frame pdl-layout pdl-layout--layers"${dataId}${inst} style="${escapeStyleAttr(style)}">${under}${inner}${over}</div>`;
    }
    const style = mergeInlineStyles(
      frameBoxStyle(props, "layout", opts),
      isStack ? "position:relative" : "",
    );
    const inner = kids
      .map((ch, i) => renderFrame(ch, { stackChild: isStack, stackIndex: i }))
      .join("");
    return `<div class="pdl-frame pdl-layout"${dataId}${inst} style="${escapeStyleAttr(style)}">${inner}</div>`;
  }

  if (kind === "text") {
    const content = typeof props.content === "string" ? props.content : "";
    if (textLayerBandsActive(props)) {
      const wrapStyle = mergeInlineStyles(
        textMetricsShellStyle(props),
        dropShadowCss(props),
        "display:inline-block",
        "position:relative",
        "vertical-align:top",
        "min-width:0",
        mergeInlineStyles(...flexItemDecls(props)),
        ...(opts.stackChild ? stackCellDecls(opts.stackIndex) : []),
      );
      const lc = finiteNum(props.lineClamp);
      const display =
        lc !== undefined && lc > 0 ? "display:-webkit-box" : "display:block";
      const innerStyle = mergeInlineStyles(display, textGlyphAndFlowStyle(props), "position:relative", "z-index:1");
      const under = renderLayerBandHtml(flattenLayerOps(props.background), 0);
      const over = renderLayerBandHtml(flattenLayerOps(props.foreground), 2);
      return `<span class="pdl-frame pdl-text pdl-text--layers"${dataId}${inst} style="${escapeStyleAttr(wrapStyle)}">${under}<span class="pdl-text__inner" style="${escapeStyleAttr(innerStyle)}">${escapeHtml(content)}</span>${over}</span>`;
    }
    const style = mergeInlineStyles(textInlineStyle(props), ...flexItemDecls(props), ...(opts.stackChild ? stackCellDecls(opts.stackIndex) : []));
    return `<span class="pdl-frame pdl-text"${dataId}${inst} style="${escapeStyleAttr(style)}">${escapeHtml(content)}</span>`;
  }

  if (kind === "spacer") {
    const style = mergeInlineStyles(
      boxMetricsStyle(props),
      ...flexItemDecls(props),
      ...(opts.stackChild ? stackCellDecls(opts.stackIndex) : []),
      "flex:1 1 auto",
      "min-height:0",
      "min-width:0",
    );
    return `<div class="pdl-frame pdl-spacer"${dataId}${inst} style="${escapeStyleAttr(style)}" aria-hidden="true"></div>`;
  }

  if (kind === "icon") {
    const style = iconFrameStyle(props, opts);
    const label = typeof props.icon === "string" ? props.icon : id;
    return `<div class="pdl-frame pdl-icon"${dataId}${inst} style="${escapeStyleAttr(style)}" role="img" aria-label="${escapeAttr(label)}"></div>`;
  }

  if (kind === "media") {
    const src = typeof props.source === "string" ? props.source : "";
    const label = typeof props.label === "string" ? props.label : id;
    const style = mediaFrameStyle(props, opts);
    const isRasterUrl = /^https?:\/\//i.test(src) || src.startsWith("/") || src.startsWith("./");
    if (isRasterUrl && src.length > 0) {
      return `<img class="pdl-frame pdl-media"${dataId}${inst} src="${escapeAttr(src)}" alt="${escapeAttr(label)}" style="${escapeStyleAttr(style)}" />`;
    }
    return `<div class="pdl-frame pdl-media"${dataId}${inst} style="${escapeStyleAttr(style)}" role="img" aria-label="${escapeAttr(label)}"></div>`;
  }

  const fallbackStyle = frameBoxStyle(props, kind, opts);
  const inner = kids.map((ch, i) => renderFrame(ch, { stackChild: false, stackIndex: i })).join("");
  return `<div class="pdl-frame pdl-unknown" data-pdl-kind="${escapeAttr(kind)}"${dataId}${inst} style="${escapeStyleAttr(fallbackStyle)}">${inner}</div>`;
}

function renderComponentBody(comp: BakedComponentJson): string {
  return renderFrame(comp.root, { stackChild: false, stackIndex: 0 });
}

const BASE_CSS = `
:root { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; padding: 16px; background: #f6f6f6; color: #111; }
.pdl-doc-title { font-size: 1.1rem; margin: 0 0 12px; }
.pdl-meta { font-size: 0.85rem; color: #444; margin-bottom: 20px; }
.pdl-gallery { display: flex; flex-direction: column; gap: 24px; }
.pdl-preview { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 16px; }
.pdl-preview-title { font-size: 0.95rem; font-weight: 600; margin: 0 0 12px; }
.pdl-preview-params { font-size: 0.8rem; color: #555; margin: -8px 0 12px; font-family: ui-monospace, monospace; }
.pdl-canvas {
  border: 1px dashed #ccc;
  border-radius: 4px;
  padding: 8px;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  height: 400pt;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.pdl-preview--render-error {
  border-color: #e57373;
  background: #fff8f7;
}
.pdl-preview--render-error .pdl-preview-title { color: #b71c1c; }
.pdl-render-error-badge {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #fff;
  background: #c62828;
  padding: 2px 8px;
  border-radius: 4px;
  margin-bottom: 8px;
}
.pdl-render-error-msg {
  margin: 0 0 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.78rem;
  white-space: pre-wrap;
  word-break: break-word;
  color: #3e2723;
}
.pdl-render-error-stack {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.7rem;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow: auto;
  color: #444;
}
`.trim();

/**
 * Render a single baked component root to an HTML fragment (no `<html>` wrapper).
 */
export function renderBakedComponentToHtmlFragment(comp: BakedComponentJson): string {
  return `<div class="pdl-canvas">${renderComponentBody(comp)}</div>`;
}

export type ComponentRenderFailure = {
  component: string;
  message: string;
  stack?: string;
};

function formatThrownMessage(err: unknown): string {
  if (err !== null && typeof err === "object" && typeof (err as { format?: unknown }).format === "function") {
    return String((err as { format: () => string }).format());
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

function formatThrownStack(err: unknown): string | undefined {
  return err instanceof Error && typeof err.stack === "string" ? err.stack : undefined;
}

/**
 * Like {@link renderBakedDesignToHtmlDocument} but never throws from individual components:
 * failed previews become error sections and are listed in `renderFailures`.
 */
export function renderBakedDesignToHtmlDocumentWithReport(
  doc: BakedDesignDocument,
  opts: { title?: string; singleComponent?: string } = {},
): { html: string; renderFailures: ComponentRenderFailure[] } {
  const title =
    opts.title ??
    `PDL preview — ${doc.provenance.entryPath.replace(/^.*\//, "")} — ${new Date(doc.generatedAt).toISOString().slice(0, 10)}`;
  const names = Object.keys(doc.components).sort();
  const focus = opts.singleComponent;
  const list = focus ? (doc.components[focus] ? [focus] : []) : names;
  const renderFailures: ComponentRenderFailure[] = [];

  const sections = list
    .map((name) => {
      const comp = doc.components[name]!;
      const paramsJson = escapeHtml(JSON.stringify(comp.bakedParams));
      try {
        const body = renderBakedComponentToHtmlFragment(comp);
        return `<section class="pdl-preview" data-pdl-component="${escapeAttr(name)}"><h2 class="pdl-preview-title">${escapeHtml(name)}</h2><p class="pdl-preview-params">${paramsJson}</p>${body}</section>`;
      } catch (err) {
        const message = formatThrownMessage(err);
        const stack = formatThrownStack(err);
        renderFailures.push({ component: name, message, stack });
        const stackBlock =
          stack !== undefined
            ? `<details style="margin-top:8px"><summary style="cursor:pointer;font-size:0.82rem">Stack trace</summary><pre class="pdl-render-error-stack">${escapeHtml(stack)}</pre></details>`
            : "";
        return `<section class="pdl-preview pdl-preview--render-error" data-pdl-component="${escapeAttr(name)}"><span class="pdl-render-error-badge">HTML render failed</span><h2 class="pdl-preview-title">${escapeHtml(name)}</h2><p class="pdl-preview-params">${paramsJson}</p><pre class="pdl-render-error-msg">${escapeHtml(message)}</pre>${stackBlock}</section>`;
      }
    })
    .join("\n");

  const meta = `entry: ${escapeHtml(doc.provenance.entryPath)} · theme: ${escapeHtml(String(doc.provenance.bakedTheme ?? "default"))} · profile: ${escapeHtml(doc.provenance.bakeProfile)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${BASE_CSS}</style>
</head>
<body>
<h1 class="pdl-doc-title">${escapeHtml(title)}</h1>
<p class="pdl-meta">${meta}</p>
<div class="pdl-gallery">
${sections}
</div>
</body>
</html>
`;
  return { html, renderFailures };
}

/**
 * Full HTML5 document for reference / Studio iframe: includes reset CSS and one or more previews.
 * Throws if any component fails to render (see {@link renderBakedDesignToHtmlDocumentWithReport} for partial output).
 */
export function renderBakedDesignToHtmlDocument(
  doc: BakedDesignDocument,
  opts: { title?: string; singleComponent?: string } = {},
): string {
  const { html, renderFailures } = renderBakedDesignToHtmlDocumentWithReport(doc, opts);
  if (renderFailures.length > 0) {
    const lines = renderFailures.map((f) => `${f.component}: ${f.message}`);
    throw new Error(lines.join("\n"));
  }
  return html;
}
