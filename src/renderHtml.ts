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
    // CSS Align supports stretch on flex containers in modern engines.
    stretch: "stretch",
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

type VibrancyFilter = { saturate: number; brightness: number };

type LayerOp =
  | { kind: "solid"; color: string }
  | { kind: "gradient"; css: string }
  | {
      kind: "image";
      url: string;
      objectFit?: string;
      objectPosition?: string;
      opacity?: number;
    }
  | { kind: "blur"; px: number; vibrancy?: VibrancyFilter }
  | { kind: "vibrancy"; vibrancy: VibrancyFilter };

function vibrancyFromValue(v: unknown): VibrancyFilter | undefined {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return undefined;
  const o = v as Record<string, unknown>;
  // Nested `{ kind: "vibrancy", vibrancy: { saturation, brightness } }` or bare tuple object.
  const inner =
    o.kind === "vibrancy" && o.vibrancy !== null && typeof o.vibrancy === "object"
      ? (o.vibrancy as Record<string, unknown>)
      : o;
  const sat = finiteNum(inner.saturation);
  const bri = finiteNum(inner.brightness);
  if (sat === undefined && bri === undefined) return undefined;
  return { saturate: sat ?? 1, brightness: bri ?? 1 };
}

function vibrancyBackdropFilter(v: VibrancyFilter): string {
  return `saturate(${String(v.saturate)}) brightness(${String(v.brightness)})`;
}

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

/** Maps baked `objectPosition` enum to CSS `object-position` / `background-position`. */
function objectPositionCss(pos: unknown): string | undefined {
  const raw = typeof pos === "string" ? pos : dotEnumValue(pos);
  if (!raw) return undefined;
  const m: Record<string, string> = {
    center: "center",
    top: "top",
    bottom: "bottom",
    left: "left",
    right: "right",
    topLeft: "top left",
    topRight: "top right",
    bottomLeft: "bottom left",
    bottomRight: "bottom right",
  };
  return m[raw];
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
      if (px !== undefined && px > 0) {
        const vib = vibrancyFromValue(o.vibrancy);
        out.push({ kind: "blur", px, ...(vib ? { vibrancy: vib } : {}) });
      }
      return;
    }
    if (k === "vibrancy") {
      const vib = vibrancyFromValue(o);
      if (vib) out.push({ kind: "vibrancy", vibrancy: vib });
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
        const objectPosition = objectPositionCss(o.objectPosition);
        const opacity = finiteNum(o.opacity);
        out.push({
          kind: "image",
          url: src,
          objectFit,
          ...(objectPosition ? { objectPosition } : {}),
          ...(opacity !== undefined ? { opacity } : {}),
        });
      }
      return;
    }
    if (k === "gradientStop") return;
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
    const pos = op.objectPosition ?? "center";
    const parts = [
      ...base,
      "background-color:transparent",
      `background-image:url(${JSON.stringify(op.url)})`,
      `background-position:${pos}`,
      "background-repeat:no-repeat",
      `background-size:${fit}`,
    ];
    if (op.opacity !== undefined && Number.isFinite(op.opacity)) {
      parts.push(`opacity:${String(op.opacity)}`);
    }
    return `<div style="${escapeStyleAttr(parts.join(";"))}"></div>`;
  }
  if (op.kind === "blur") {
    const parts = [`blur(${String(op.px)}px)`];
    if (op.vibrancy) parts.push(vibrancyBackdropFilter(op.vibrancy));
    const filter = parts.join(" ");
    const st = [
      ...base,
      "background:transparent",
      `backdrop-filter:${filter}`,
      `-webkit-backdrop-filter:${filter}`,
    ].join(";");
    return `<div style="${escapeStyleAttr(st)}"></div>`;
  }
  if (op.kind === "vibrancy") {
    const filter = vibrancyBackdropFilter(op.vibrancy);
    const st = [
      ...base,
      "background:transparent",
      `backdrop-filter:${filter}`,
      `-webkit-backdrop-filter:${filter}`,
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

/**
 * Baked `Shadow(…)` → CSS box-shadow layer (`x y blur spread color`).
 * Also accepts a legacy CSS string (baked HTML unit tests / transitional IR).
 */
function shadowLayerCss(shadow: unknown): string | undefined {
  if (typeof shadow === "string") {
    const s = shadow.trim();
    return s.length > 0 ? s : undefined;
  }
  if (!shadow || typeof shadow !== "object") return undefined;
  const o = shadow as Record<string, unknown>;
  if (o.kind !== "shadow") return undefined;
  const x = finiteNum(o.x);
  const y = finiteNum(o.y);
  const blur = finiteNum(o.blurRadius);
  const spread = finiteNum(o.spread) ?? 0;
  const color = typeof o.color === "string" ? o.color.trim() : "";
  if (x === undefined || y === undefined || blur === undefined || !color) return undefined;
  return `${x}px ${y}px ${blur}px ${spread}px ${color}`;
}

/**
 * Paint-only border ring + drop shadow as one `box-shadow`.
 * Borders never use CSS `border` — they must not change layout size
 * (`borderPosition` inside or outside). Ring layer is listed first so it
 * paints above the drop shadow.
 */
function dropShadowCss(props: Record<string, unknown>): string | undefined {
  return combinedBoxShadowCss(props);
}

function overflowCss(overflow: unknown): string | undefined {
  if (typeof overflow !== "string") return undefined;
  // PDL overflow: `.visible` | `.scroll` | `.clip` (no `.hidden` / `.auto`).
  // HTML preview maps `.clip` → CSS `overflow: hidden` because Chromium often fails
  // to crop with `overflow: clip` on flex-centered text shells. Native emitters may
  // use true `clip` (hard crop, not a scroll container).
  if (overflow === "clip") return "overflow:hidden";
  const m: Record<string, string> = {
    visible: "visible",
    scroll: "scroll",
  };
  const v = m[overflow];
  return v ? `overflow:${v}` : undefined;
}

/** Border ring + optional drop `shadow` → single `box-shadow` (paint-only). */
function combinedBoxShadowCss(props: Record<string, unknown>): string | undefined {
  const parts: string[] = [];
  const w = finiteNum(props.borderWidth);
  const c = props.borderColor;
  const posRaw = props.borderPosition;
  const pos =
    typeof posRaw === "string" ? posRaw : (dotEnumValue(posRaw) ?? "outside");
  if (w !== undefined && w > 0 && typeof c === "string" && c.length > 0) {
    if (pos === "inside") {
      parts.push(`inset 0 0 0 ${String(w)}px ${c}`);
    } else {
      // outside (default): outer ring; does not affect layout box size.
      parts.push(`0 0 0 ${String(w)}px ${c}`);
    }
  }
  const drop = shadowLayerCss(props.shadow);
  if (drop) parts.push(drop);
  if (parts.length === 0) return undefined;
  return `box-shadow:${parts.join(", ")}`;
}

function gridPlaceItems(align: unknown, justify: unknown): string {
  const aMap: Record<string, string> = {
    stretch: "stretch",
    center: "center",
    start: "start",
    end: "end",
    baseline: "baseline",
  };
  // Stack cells overlap in one grid area — space* cannot distribute siblings.
  // Map them to start so content anchors predictably (not stretch/center confusion).
  const jMap: Record<string, string> = {
    center: "center",
    start: "start",
    end: "end",
    stretch: "stretch",
    spaceBetween: "start",
    spaceAround: "start",
    spaceEvenly: "start",
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

function isStackDirection(direction: unknown): boolean {
  return direction === "stack" || direction === "reverseStack";
}

/** Painter’s order: `.stack` last-on-top; `.reverseStack` first-on-top. */
function stackZIndex(index: number, childCount: number, reverse: boolean): number {
  if (childCount <= 0) return 1;
  return reverse ? childCount - index : index + 1;
}

function stackCellDecls(zIndex: number): string[] {
  return ["grid-area:1 / 1 / 2 / 2", `z-index:${String(zIndex)}`, "min-width:0", "min-height:0"];
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
  opts?: { omitBackground?: boolean; omitOverflow?: boolean },
): string {
  const parts: string[] = [];
  const pad = paddingToCss(props, "padding");
  if (pad) parts.push(`padding:${pad}`);
  const mar = paddingToCss(props, "margin");
  if (mar) parts.push(`margin:${mar}`);
  parts.push(...sizingAxisDecls(props, "width"));
  parts.push(...sizingAxisDecls(props, "height"));
  const ar = finiteNum(props.aspectRatio);
  if (ar !== undefined && ar > 0) parts.push(`aspect-ratio:${String(ar)}`);
  const rad = cornerRadiusToCss(props.cornerRadius);
  if (rad) parts.push(rad);
  if (typeof props.opacity === "number" && Number.isFinite(props.opacity)) {
    parts.push(`opacity:${props.opacity}`);
  }
  if (!opts?.omitBackground) {
    const bg = backgroundCssDecl(props);
    if (bg) parts.push(bg);
  }
  // Border (inside/outside) + drop shadow — paint-only via box-shadow.
  const sh = dropShadowCss(props);
  if (sh) parts.push(sh);
  // Layered layouts apply overflow on the content scrollport so background/foreground
  // chrome stays viewport-fixed (see layout `--layers` branch).
  if (!opts?.omitOverflow) {
    const ov = overflowCss(props.overflow);
    if (ov) parts.push(ov);
  }
  return parts.join(";");
}

/** Flex / grid container only; merge with `boxMetricsStyle` for full `layout` box. */
function layoutFlexGridStyle(props: Record<string, unknown>): string {
  const isStack = isStackDirection(props.direction);
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
  // Absolute-positioned children resolve against this padding box.
  return mergeInlineStyles(layoutFlexGridStyle(props), boxMetricsStyle(props), "position:relative");
}

/** Per-frame box: container / leaf metrics + flex-item / stack-cell positioning. */
function frameBoxStyle(
  props: Record<string, unknown>,
  kind: string,
  opts: { stackChild: boolean; stackZ: number },
): string {
  const item = mergeInlineStyles(...flexItemDecls(props));
  const stack = opts.stackChild ? mergeInlineStyles(...stackCellDecls(opts.stackZ)) : "";
  if (kind === "text") {
    return mergeInlineStyles(textOwnStyle(props), item, stack);
  }
  if (kind === "icon" || kind === "media") {
    return mergeInlineStyles(boxMetricsStyle(props), item, stack);
  }
  if (kind === "layout" && layoutLayerBandsActive(props)) {
    return mergeInlineStyles(
      boxMetricsStyle(props, { omitBackground: true, omitOverflow: true }),
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

function stackChildOpts(
  parentDirection: unknown,
  index: number,
  childCount: number,
): FrameRenderOpts {
  const isStack = isStackDirection(parentDirection);
  if (!isStack) return { stackChild: false, stackZ: 0 };
  return {
    stackChild: true,
    stackZ: stackZIndex(index, childCount, parentDirection === "reverseStack"),
  };
}

function truncateStyleKind(props: Record<string, unknown>): "ellipsis" | "clip" | undefined {
  if (props.truncateStyle === "ellipsis") return "ellipsis";
  if (props.truncateStyle === "clip") return "clip";
  return undefined;
}

function textLineClamp(props: Record<string, unknown>): number | undefined {
  const lc = finiteNum(props.lineClamp);
  return lc !== undefined && lc > 0 ? lc : undefined;
}

/** True when width/height is unset or explicitly `.hug` (intrinsic size). */
function sizingAxisIsHug(props: Record<string, unknown>, axis: "width" | "height"): boolean {
  const v = props[axis];
  return v === undefined || v === null || v === "hug";
}

/**
 * Hug text must not flex-shrink below glyph width (preview used to force min-width:0).
 * Fill / fixed / truncating text may still shrink into a bounded box.
 */
function textMayShrinkBelowContent(props: Record<string, unknown>): boolean {
  if (textLineClamp(props) !== undefined) return true;
  if (truncateStyleKind(props) !== undefined) return true;
  return !sizingAxisIsHug(props, "width");
}

function textMainAxisMinDecls(props: Record<string, unknown>): string[] {
  return textMayShrinkBelowContent(props) ? ["min-width:0"] : ["min-width:min-content"];
}

/** Flex-item decls for text: hug width defaults to no shrink so siblings with `.fill` don't squash glyphs. */
function textFlexItemDecls(props: Record<string, unknown>): string[] {
  const out = flexItemDecls(props);
  if (!textMayShrinkBelowContent(props) && finiteNum(props.shrink) === undefined) {
    out.push("flex-shrink:0");
  }
  return out;
}

/** Font / color / tracking / text-align (no frame overflow, sizing, or clamp). */
function textTypographyStyle(props: Record<string, unknown>): string {
  // Do not force width:100% here — that stretches hug text to the parent and breaks
  // stack place-items centering. Width comes from textMetricsShellStyle (fill → 100%).
  const parts: string[] = [...textMainAxisMinDecls(props), "box-sizing:border-box"];
  if (typeof props.color === "string") parts.push(`color:${props.color}`);
  if (typeof props.fontSize === "number") parts.push(`font-size:${props.fontSize}px`);
  if (typeof props.fontWeight === "number") parts.push(`font-weight:${String(props.fontWeight)}`);
  if (typeof props.fontFamily === "string") parts.push(`font-family:${props.fontFamily}`);
  const lh = finiteNum(props.lineHeight);
  if (lh !== undefined) parts.push(`line-height:${String(lh)}`);
  const ls = finiteNum(props.letterSpacing);
  const fs = finiteNum(props.fontSize);
  if (ls !== undefined) {
    if (fs !== undefined) parts.push(`letter-spacing:${String(ls * fs)}px`);
    else parts.push(`letter-spacing:${String(ls)}em`);
  }
  const ta = textAlignFromJustify(props.justify);
  if (ta) parts.push(ta);
  return parts.join(";");
}

/**
 * Inner styles that enforce lineClamp. Always `overflow:hidden` so excess lines are not
 * painted — independent of frame `overflow` (which stays on the outer shell).
 */
function textClampInnerStyle(props: Record<string, unknown>): string {
  const parts: string[] = [textTypographyStyle(props), "overflow:hidden"];
  const lc = textLineClamp(props)!;
  const to = truncateStyleKind(props);
  if (to === "clip") {
    const lh = finiteNum(props.lineHeight);
    const fs = finiteNum(props.fontSize);
    const ratio = lh !== undefined && lh > 0 ? lh : 1.2;
    if (fs !== undefined) parts.push(`max-height:${fs * ratio * lc}px`);
    else parts.push(`max-height:${ratio * lc}em`);
    parts.push("text-overflow:clip");
  } else {
    // .ellipsis or unspecified with lineClamp
    parts.push(
      "display:-webkit-box",
      "-webkit-box-orient:vertical",
      `-webkit-line-clamp:${String(lc)}`,
      "text-overflow:ellipsis",
    );
  }
  return parts.join(";");
}

/**
 * Typography + optional single-line truncateStyle (no lineClamp).
 * Spec: `justify` = main (horizontal) → text-align.
 */
function textGlyphAndFlowStyle(props: Record<string, unknown>): string {
  const parts: string[] = [textTypographyStyle(props)];
  const ov = overflowCss(props.overflow);
  if (ov) parts.push(ov);
  const to = truncateStyleKind(props);
  if (to === "ellipsis") {
    parts.push("text-overflow:ellipsis", "white-space:nowrap");
    if (!ov) parts.push("overflow:hidden");
  } else if (to === "clip") {
    parts.push("text-overflow:clip");
  }
  return parts.join(";");
}

function textBoxAlignStyle(props: Record<string, unknown>): string {
  const parts: string[] = ["display:flex", "flex-direction:column"];
  const a = typeof props.align === "string" ? props.align : undefined;
  const jc: Record<string, string> = {
    start: "flex-start",
    center: "center",
    end: "flex-end",
  };
  if (a && jc[a]) parts.push(`justify-content:${jc[a]}`);
  return parts.join(";");
}

/** Padding, margin, sizing, radius, opacity (outer shell). */
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

/** Outer frame chrome when lineClamp uses an inner truncating wrapper. */
function textClampOuterStyle(props: Record<string, unknown>): string {
  return mergeInlineStyles(
    textBoxAlignStyle(props),
    textMetricsShellStyle(props),
    backgroundCssDecl(props),
    dropShadowCss(props),
    overflowCss(props.overflow),
  );
}

/** Text typography / box (no outer display — caller sets flex align shell). */
function textOwnStyle(props: Record<string, unknown>): string {
  return mergeInlineStyles(
    textGlyphAndFlowStyle(props),
    textMetricsShellStyle(props),
    backgroundCssDecl(props),
    dropShadowCss(props),
  );
}

function textInlineStyle(props: Record<string, unknown>): string {
  return mergeInlineStyles(textBoxAlignStyle(props), textOwnStyle(props));
}

type FrameRenderOpts = {
  stackChild: boolean;
  /** Absolute CSS z-index when `stackChild` (from `.stack` / `.reverseStack`). */
  stackZ: number;
  /** When true, omit data-pdl-instance-* (used for inst-state inner bodies). */
  omitInstanceAttrs?: boolean;
};

type InstanceRenderCtx = {
  nextKey: number;
  /** Prebaked non-rest trees keyed by instance key (`i0`, …) then state name. */
  stateTrees: Record<string, Record<string, BakedComponentJson>>;
};

function iconFrameStyle(props: Record<string, unknown>, opts: FrameRenderOpts): string {
  const sz = finiteNum(props.size) ?? 24;
  const col = typeof props.color === "string" && props.color.length > 0 ? props.color : "#94a3b8";
  const box = frameBoxStyle(props, "icon", opts);
  const iconBox = [
    `width:${sz}px`,
    `height:${sz}px`,
    `background-color:${col}`,
    "flex-shrink:0",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "overflow:hidden",
  ].join(";");
  return mergeInlineStyles(box, iconBox);
}

function mediaFrameStyle(props: Record<string, unknown>, opts: FrameRenderOpts): string {
  const box = frameBoxStyle(props, "media", opts);
  const ob = objectFitFromContentMode(props.contentMode);
  const op = objectPositionCss(props.objectPosition);
  const parts = [box, "max-width:100%", "display:block"];
  if (ob) parts.push(ob);
  if (op) parts.push(`object-position:${op}`);
  return mergeInlineStyles(...parts);
}

function renderFrame(
  frame: BakedFrame,
  opts: FrameRenderOpts = { stackChild: false, stackZ: 0 },
  instCtx?: InstanceRenderCtx,
): string {
  const { id, kind } = frame;
  // omitEmpty bake JSON may drop empty `props: {}` / `children: []`.
  const props = (frame.props ?? {}) as Record<string, unknown>;
  const kids = frame.children ?? [];
  const dataId = ` data-pdl-id="${escapeAttr(id)}"`;
  const wantInst = frame.instanceOf !== undefined && !opts.omitInstanceAttrs;
  const inst = wantInst ? ` data-pdl-instance-of="${escapeAttr(frame.instanceOf!)}"` : "";
  const kwargsAttr =
    wantInst && frame.instanceKwargs
      ? ` data-pdl-instance-kwargs="${escapeAttr(JSON.stringify(frame.instanceKwargs))}"`
      : "";
  const instAttrs = `${inst}${kwargsAttr}`;

  // Nested interactive instances: wrap with per-kwargs state fragments for local swap.
  if (wantInst && instCtx && frame.instanceOf) {
    const key = `i${instCtx.nextKey++}`;
    const extra = instCtx.stateTrees[key];
    if (extra && Object.keys(extra).length > 0) {
      const restInner = renderFrame(frame, { ...opts, omitInstanceAttrs: true }, instCtx);
      let blocks = `<div class="pdl-inst-state" data-pdl-state="rest">${restInner}</div>`;
      for (const [stateName, stateComp] of Object.entries(extra)) {
        const frag = renderFrame(stateComp.root, { stackChild: false, stackZ: 0 });
        blocks += `<div class="pdl-inst-state" data-pdl-state="${escapeAttr(stateName)}" hidden>${frag}</div>`;
      }
      return `<div class="pdl-instance"${inst}${kwargsAttr} data-pdl-instance-key="${escapeAttr(key)}">${blocks}</div>`;
    }
  }

  if (kind === "layout") {
    const isStack = isStackDirection(props.direction);
    const layered = layoutLayerBandsActive(props);
    if (layered) {
      // Shell holds chrome (radius, shadow, border rings, layer bands). Overflow lives on
      // `__content` so background/foreground do not scroll with children.
      const style = mergeInlineStyles(
        frameBoxStyle(props, "layout", opts),
        isStack ? "position:relative" : "",
      );
      const innerStyle = mergeInlineStyles(
        layoutFlexGridStyle(props),
        overflowCss(props.overflow),
        "flex:1 1 auto",
        "width:100%",
        "height:100%",
        "min-width:0",
        "min-height:0",
        "position:relative",
        "z-index:1",
        "border-radius:inherit",
      );
      const under = renderLayerBandHtml(flattenLayerOps(props.background), 0);
      const over = renderLayerBandHtml(flattenLayerOps(props.foreground), 2);
      const innerKids = kids
        .map((ch, i) => renderFrame(ch, stackChildOpts(props.direction, i, kids.length), instCtx))
        .join("");
      const inner = `<div class="pdl-layout__content" style="${escapeStyleAttr(innerStyle)}">${innerKids}</div>`;
      return `<div class="pdl-frame pdl-layout pdl-layout--layers"${dataId}${instAttrs} style="${escapeStyleAttr(style)}">${under}${inner}${over}</div>`;
    }
    const style = mergeInlineStyles(
      frameBoxStyle(props, "layout", opts),
      isStack ? "position:relative" : "",
    );
    const inner = kids
      .map((ch, i) => renderFrame(ch, stackChildOpts(props.direction, i, kids.length), instCtx))
      .join("");
    return `<div class="pdl-frame pdl-layout"${dataId}${instAttrs} style="${escapeStyleAttr(style)}">${inner}</div>`;
  }

  if (kind === "text") {
    const content = typeof props.content === "string" ? props.content : "";
    const editableBind =
      typeof props.editable === "string"
        ? props.editable
        : props.editable === true
          ? "value"
          : undefined;
    const itemStack = mergeInlineStyles(
      ...textFlexItemDecls(props),
      ...(opts.stackChild ? stackCellDecls(opts.stackZ) : []),
    );
    if (editableBind) {
      const style = mergeInlineStyles(
        textInlineStyle(props),
        itemStack,
        "border:none",
        "outline:none",
        "background:transparent",
        "font:inherit",
        "color:inherit",
        "width:100%",
        "box-sizing:border-box",
      );
      return `<input class="pdl-frame pdl-text pdl-text--editable" type="text"${dataId}${instAttrs} data-pdl-editable="${escapeAttr(editableBind)}" value="${escapeAttr(content)}" style="${escapeStyleAttr(style)}" />`;
    }
    const clamped = textLineClamp(props) !== undefined;
    if (textLayerBandsActive(props)) {
      // Same chrome/scroll split as layered layout: bands on the shell, overflow on inner.
      const wrapStyle = mergeInlineStyles(
        textMetricsShellStyle(props),
        dropShadowCss(props),
        textBoxAlignStyle(props),
        "position:relative",
        "vertical-align:top",
        ...textMainAxisMinDecls(props),
        itemStack,
      );
      const innerStyle = mergeInlineStyles(
        clamped ? textClampInnerStyle(props) : textGlyphAndFlowStyle(props),
        overflowCss(props.overflow),
        "position:relative",
        "z-index:1",
        "border-radius:inherit",
        "display:block",
        "width:100%",
        "height:100%",
        "box-sizing:border-box",
      );
      const under = renderLayerBandHtml(flattenLayerOps(props.background), 0);
      const over = renderLayerBandHtml(flattenLayerOps(props.foreground), 2);
      return `<span class="pdl-frame pdl-text pdl-text--layers"${dataId}${instAttrs} style="${escapeStyleAttr(wrapStyle)}">${under}<span class="pdl-text__inner" style="${escapeStyleAttr(innerStyle)}">${escapeHtml(content)}</span>${over}</span>`;
    }
    if (clamped) {
      // Outer keeps frame size / align / overflow; inner always hides excess lines.
      const outer = mergeInlineStyles(textClampOuterStyle(props), itemStack);
      const inner = textClampInnerStyle(props);
      return `<span class="pdl-frame pdl-text"${dataId}${instAttrs} style="${escapeStyleAttr(outer)}"><span class="pdl-text__clamp" style="${escapeStyleAttr(inner)}">${escapeHtml(content)}</span></span>`;
    }
    const style = mergeInlineStyles(textInlineStyle(props), itemStack);
    return `<span class="pdl-frame pdl-text"${dataId}${instAttrs} style="${escapeStyleAttr(style)}">${escapeHtml(content)}</span>`;
  }

  if (kind === "spacer") {
    const style = mergeInlineStyles(
      boxMetricsStyle(props),
      ...flexItemDecls(props),
      ...(opts.stackChild ? stackCellDecls(opts.stackZ) : []),
      "flex:1 1 auto",
      "min-height:0",
      "min-width:0",
    );
    return `<div class="pdl-frame pdl-spacer"${dataId}${instAttrs} style="${escapeStyleAttr(style)}" aria-hidden="true"></div>`;
  }

  if (kind === "icon") {
    const style = iconFrameStyle(props, opts);
    const label = typeof props.icon === "string" ? props.icon : id;
    const sz = finiteNum(props.size) ?? 24;
    const fontPx = Math.max(8, Math.min(11, Math.round(sz * 0.28)));
    const caption = `<span class="pdl-icon__name" style="color:#fff;font-size:${fontPx}px;font-weight:600;line-height:1.1;text-align:center;padding:1px;text-shadow:0 0 2px rgba(0,0,0,0.55);word-break:break-all">${escapeHtml(label)}</span>`;
    return `<div class="pdl-frame pdl-icon"${dataId}${instAttrs} style="${escapeStyleAttr(style)}" role="img" aria-label="${escapeAttr(label)}">${caption}</div>`;
  }

  if (kind === "media") {
    const src = typeof props.source === "string" ? props.source : "";
    const label = typeof props.label === "string" ? props.label : id;
    const style = mediaFrameStyle(props, opts);
    const isRasterUrl = /^https?:\/\//i.test(src) || src.startsWith("/") || src.startsWith("./");
    const layered = layoutLayerBandsActive(props);
    if (layered) {
      const wrapStyle = mergeInlineStyles(
        boxMetricsStyle(props, { omitBackground: true }),
        ...flexItemDecls(props),
        ...(opts.stackChild ? stackCellDecls(opts.stackZ) : []),
        "position:relative",
        "overflow:hidden",
        "max-width:100%",
      );
      const under = renderLayerBandHtml(flattenLayerOps(props.background), 0);
      const over = renderLayerBandHtml(flattenLayerOps(props.foreground), 2);
      const mediaInner = isRasterUrl && src.length > 0
        ? `<img class="pdl-media__img" src="${escapeAttr(src)}" alt="${escapeAttr(label)}" style="${escapeStyleAttr(mergeInlineStyles("position:relative", "z-index:1", "width:100%", "height:100%", "display:block", objectFitFromContentMode(props.contentMode), objectPositionCss(props.objectPosition) ? `object-position:${objectPositionCss(props.objectPosition)}` : undefined))}" />`
        : `<div class="pdl-media__placeholder" style="position:relative;z-index:1;width:100%;height:100%;min-height:24px" role="img" aria-label="${escapeAttr(label)}"></div>`;
      return `<div class="pdl-frame pdl-media pdl-media--layers"${dataId}${instAttrs} style="${escapeStyleAttr(wrapStyle)}">${under}${mediaInner}${over}</div>`;
    }
    if (isRasterUrl && src.length > 0) {
      return `<img class="pdl-frame pdl-media"${dataId}${instAttrs} src="${escapeAttr(src)}" alt="${escapeAttr(label)}" style="${escapeStyleAttr(style)}" />`;
    }
    return `<div class="pdl-frame pdl-media"${dataId}${instAttrs} style="${escapeStyleAttr(style)}" role="img" aria-label="${escapeAttr(label)}"></div>`;
  }

  const fallbackStyle = frameBoxStyle(props, kind, opts);
  const inner = kids
    .map((ch) => renderFrame(ch, { stackChild: false, stackZ: 0 }, instCtx))
    .join("");
  return `<div class="pdl-frame pdl-unknown" data-pdl-kind="${escapeAttr(kind)}"${dataId}${instAttrs} style="${escapeStyleAttr(fallbackStyle)}">${inner}</div>`;
}

function renderComponentBody(comp: BakedComponentJson, instCtx?: InstanceRenderCtx): string {
  return renderFrame(comp.root, { stackChild: false, stackZ: 0 }, instCtx);
}

const BASE_CSS = `
:root { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; padding: 16px; background: var(--pdl-preview-background, #f6f6f6); color: #111; }
.pdl-doc-title { font-size: 1.1rem; margin: 0 0 12px; }
.pdl-meta { font-size: 0.85rem; color: #444; margin-bottom: 20px; }
.pdl-gallery { display: flex; flex-direction: column; gap: 16px; }
.pdl-preview { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 12px 14px; }
.pdl-preview-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px 12px;
  margin: 0 0 8px;
}
.pdl-preview-title { font-size: 0.9rem; font-weight: 600; margin: 0; }
.pdl-instance { display: block; }
.pdl-inst-state[hidden] { display: none !important; }
.pdl-source-link {
  appearance: none;
  border: 0;
  background: transparent;
  padding: 0;
  margin: 0;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  color: #0b57d0;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.pdl-source-link:hover { color: #0842a0; }
.pdl-source-link:focus-visible {
  outline: 2px solid #0b57d0;
  outline-offset: 2px;
  border-radius: 2px;
}
.pdl-preview-params {
  font-size: 0.72rem;
  color: #778;
  margin: 0 0 8px;
  font-family: ui-monospace, monospace;
}
.pdl-canvas {
  /* Definite width so root width=.fill (width:100%) has a containing block.
     Keep align-items:flex-start so .hug roots still size to content (not stretch). */
  border: 1px dashed #ccc;
  border-radius: 4px;
  padding: 8px;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  height: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
/* Preview stage when the root uses height=.fill — scroll view has no intrinsic
   height, so give percentage fill a sensible containing block. */
.pdl-canvas--fill-height {
  height: 240px;
  min-height: 240px;
  overflow: auto;
}
.pdl-param-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin: 0 0 10px;
  padding: 8px 10px;
  background: #f0f2f5;
  border: 1px solid #dde;
  border-radius: 6px;
  font-size: 0.78rem;
}
.pdl-param-bar label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-weight: 500;
  color: #445;
}
.pdl-param-bar select,
.pdl-param-bar input {
  font: inherit;
  font-weight: 400;
  padding: 4px 6px;
  border: 1px solid #bbc;
  border-radius: 4px;
  min-width: 7rem;
  background: #fff;
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

function rootUsesHeightFill(comp: BakedComponentJson): boolean {
  const root = comp.root as { props?: Record<string, unknown> } | undefined;
  return root?.props?.height === "fill";
}

function wrapPdlCanvas(comp: BakedComponentJson, instCtx?: InstanceRenderCtx): string {
  const cls = rootUsesHeightFill(comp) ? "pdl-canvas pdl-canvas--fill-height" : "pdl-canvas";
  return `<div class="${cls}">${renderComponentBody(comp, instCtx)}</div>`;
}

/**
 * Render a single baked component root to an HTML fragment (no `<html>` wrapper).
 */
export function renderBakedComponentToHtmlFragment(comp: BakedComponentJson): string {
  return wrapPdlCanvas(comp);
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

export type PreviewParamControl = {
  name: string;
  typeName: string;
  /** Current value shown in the control (stringified). */
  value: string;
  /** Variant cases when type is a variant; empty → free-text input. */
  cases?: string[];
};

function renderSourceFileLink(
  componentName: string,
  source?: { path: string; line: number },
): string {
  const basen =
    source?.path && typeof source.path === "string"
      ? source.path.replace(/^.*\//, "")
      : "";
  const label =
    basen && source?.line
      ? `${basen}:${source.line}`
      : "Source file";
  const title = source?.path
    ? `${source.path}:${source.line}`
    : `Open ${componentName} definition in the editor`;
  return `<button type="button" class="pdl-source-link" data-pdl-open-source="${escapeAttr(componentName)}" title="${escapeAttr(title)}">${escapeHtml(label)}</button>`;
}

function renderParamBar(
  componentName: string,
  controls: PreviewParamControl[] | undefined,
): string {
  if (!controls || controls.length === 0) return "";
  const fields = controls
    .map((c) => {
      const id = `pdl-param-${escapeAttr(componentName)}-${escapeAttr(c.name)}`;
      if (c.cases && c.cases.length > 0) {
        const boolLike = c.typeName === "Boolean" || c.typeName === "Bool";
        const opts = c.cases
          .map((cas) => {
            const sel = String(c.value) === cas ? " selected" : "";
            const label = boolLike ? cas : `.${cas}`;
            return `<option value="${escapeAttr(cas)}"${sel}>${escapeHtml(label)}</option>`;
          })
          .join("");
        return `<label for="${id}">${escapeHtml(c.name)}<select id="${id}" data-param="${escapeAttr(c.name)}">${opts}</select></label>`;
      }
      return `<label for="${id}">${escapeHtml(c.name)}<input id="${id}" data-param="${escapeAttr(c.name)}" type="text" value="${escapeAttr(c.value)}" /></label>`;
    })
    .join("");
  return `<div class="pdl-param-bar" data-pdl-param-bar="${escapeAttr(componentName)}">${fields}</div>`;
}

/**
 * Like {@link renderBakedDesignToHtmlDocument} but never throws from individual components:
 * failed previews become error sections and are listed in `renderFailures`.
 */
export function renderBakedDesignToHtmlDocumentWithReport(
  doc: BakedDesignDocument,
  opts: {
    title?: string;
    singleComponent?: string;
    /** Limit gallery to these component names (order preserved). */
    componentNames?: string[];
    /** Enable hover/press host script (Phase 4). */
    interactiveHost?: boolean;
    /**
     * Extra bake trees per component for interaction states other than default.
     * e.g. `{ FilterChip: { hovered: <bakedComponentJson> } }`
     */
    stateTrees?: Record<string, Record<string, BakedComponentJson>>;
    /** Emit catalogue slice for host (assign/emit handlers). */
    interactionsByComponent?: Record<string, unknown>;
    /** Parent layout `on` emit captures (§4e) keyed by component name. */
    emitCapturesByComponent?: Record<string, unknown>;
    /** Per-component param controls rendered in the preview (Playground). */
    paramControlsByComponent?: Record<string, PreviewParamControl[]>;
    /** Declaration sites for "Source file" links (`path` + 1-based `line`). */
    componentSourcesByComponent?: Record<string, { path: string; line: number }>;
    /**
     * Per nested-instance interaction state trees (hovered/pressed/…), keyed by
     * document order (`i0`, `i1`, …) matching `[data-pdl-instance-key]`.
     */
    instanceStateTrees?: Record<string, Record<string, BakedComponentJson>>;
    /**
     * Resolved CSS color for document chrome (`previewBackground` token).
     * Falls back to `doc.previewBackground` when set by bake.
     */
    previewBackground?: string;
  } = {},
): { html: string; renderFailures: ComponentRenderFailure[] } {
  const title =
    opts.title ??
    `PDL preview — ${doc.provenance.entryPath.replace(/^.*\//, "")} — ${new Date(doc.generatedAt).toISOString().slice(0, 10)}`;
  const previewBgRaw =
    (typeof opts.previewBackground === "string" && opts.previewBackground.trim()) ||
    (typeof doc.previewBackground === "string" && doc.previewBackground.trim()) ||
    "";
  const previewBg =
    /^#[0-9A-Fa-f]{3,8}$/.test(previewBgRaw) || /^rgba?\([^)]+\)$/i.test(previewBgRaw)
      ? previewBgRaw
      : "";
  const previewBgDecl = previewBg
    ? `:root { --pdl-preview-background: ${previewBg}; }`
    : "";
  const allNames = Object.keys(doc.components).sort();
  const focus = opts.singleComponent;
  let list: string[];
  if (focus) {
    list = doc.components[focus] ? [focus] : [];
  } else if (opts.componentNames && opts.componentNames.length > 0) {
    list = opts.componentNames.filter((n) => doc.components[n]);
  } else {
    list = allNames;
  }
  const renderFailures: ComponentRenderFailure[] = [];
  const instCtx: InstanceRenderCtx | undefined = opts.instanceStateTrees
    ? { nextKey: 0, stateTrees: opts.instanceStateTrees }
    : undefined;

  const sections = list
    .map((name) => {
      const comp = doc.components[name]!;
      const paramsJson = escapeHtml(JSON.stringify(comp.bakedParams ?? {}));
      try {
        const body = wrapPdlCanvas(comp, instCtx);
        const stateExtra = opts.stateTrees?.[name];
        let stateBlocks = "";
        if (stateExtra) {
          for (const [stateName, stateComp] of Object.entries(stateExtra)) {
            const frag = renderBakedComponentToHtmlFragment(stateComp);
            stateBlocks += `<div class="pdl-state" data-pdl-state="${escapeAttr(stateName)}" hidden>${frag}</div>`;
          }
        }
        const restWrap = stateBlocks
          ? `<div class="pdl-state" data-pdl-state="rest">${body}</div>${stateBlocks}`
          : body;
        const hasOwnIx =
          Array.isArray(opts.interactionsByComponent?.[name]) &&
          (opts.interactionsByComponent?.[name] as unknown[]).length > 0;
        const hasCaptures =
          Array.isArray(opts.emitCapturesByComponent?.[name]) &&
          (opts.emitCapturesByComponent?.[name] as unknown[]).length > 0;
        // Nested instances (ForEach chips) carry handlers on their concrete type,
        // not on the parent — still need the interactive host attached.
        const hasNestedIx = (() => {
          if (!opts.interactionsByComponent) return false;
          const walk = (nodes: unknown): boolean => {
            if (!Array.isArray(nodes)) return false;
            for (const n of nodes) {
              if (!n || typeof n !== "object") continue;
              const rec = n as Record<string, unknown>;
              const of = rec.instanceOf;
              if (
                typeof of === "string" &&
                Array.isArray(opts.interactionsByComponent?.[of]) &&
                (opts.interactionsByComponent?.[of] as unknown[]).length > 0
              ) {
                return true;
              }
              if (walk(rec.children)) return true;
            }
            return false;
          };
          return walk(comp.root?.children ?? (comp as { children?: unknown }).children);
        })();
        const hasInteraction =
          opts.interactiveHost && (hasOwnIx || hasCaptures || hasNestedIx);
        const interactiveAttr = hasInteraction ? ` data-pdl-interactive="1"` : "";
        const paramBar = renderParamBar(name, opts.paramControlsByComponent?.[name]);
        const sourceLink = renderSourceFileLink(name, opts.componentSourcesByComponent?.[name]);
        return `<section class="pdl-preview" data-pdl-component="${escapeAttr(name)}"${interactiveAttr}><div class="pdl-preview-head"><h2 class="pdl-preview-title">${escapeHtml(name)}</h2>${sourceLink}</div>${paramBar}<p class="pdl-preview-params mono">${paramsJson}</p>${restWrap}</section>`;
      } catch (err) {
        const message = formatThrownMessage(err);
        const stack = formatThrownStack(err);
        renderFailures.push({ component: name, message, stack });
        const stackBlock =
          stack !== undefined
            ? `<details style="margin-top:8px"><summary style="cursor:pointer;font-size:0.82rem">Stack trace</summary><pre class="pdl-render-error-stack">${escapeHtml(stack)}</pre></details>`
            : "";
        const sourceLink = renderSourceFileLink(name, opts.componentSourcesByComponent?.[name]);
        return `<section class="pdl-preview pdl-preview--render-error" data-pdl-component="${escapeAttr(name)}"><span class="pdl-render-error-badge">HTML render failed</span><div class="pdl-preview-head"><h2 class="pdl-preview-title">${escapeHtml(name)}</h2>${sourceLink}</div><p class="pdl-preview-params">${paramsJson}</p><pre class="pdl-render-error-msg">${escapeHtml(message)}</pre>${stackBlock}</section>`;
      }
    })
    .join("\n");

  const meta = `entry: ${escapeHtml(doc.provenance.entryPath)} · theme: ${escapeHtml(String(doc.provenance.bakedTheme ?? "default"))} · profile: ${escapeHtml(doc.provenance.bakeProfile)}`;

  const hostScript = `<script>
(function(){
  /* Mirrors src/applyInteractionEvent.ts — interpret catalogue interaction JSON. */
  var interactions = ${JSON.stringify(opts.interactionsByComponent ?? {})};
  var emitCaptures = ${JSON.stringify(opts.emitCapturesByComponent ?? {})};
  function stripDot(v) {
    var s = String(v == null ? '' : v);
    return s.charAt(0) === '.' ? s.slice(1) : s;
  }
  function evalCond(cond, params) {
    if (!cond || typeof cond !== 'object') return false;
    if (cond.kind === 'cmp') {
      var left = params[cond.param] == null ? '' : String(params[cond.param]);
      var right = cond.rhsKind === 'param'
        ? (params[cond.rhs] == null ? '' : String(params[cond.rhs]))
        : stripDot(cond.rhs);
      return cond.op === '!=' ? left !== right : left === right;
    }
    if (cond.kind === 'and') return (cond.items || []).every(function(x){ return evalCond(x, params); });
    if (cond.kind === 'or') return (cond.items || []).some(function(x){ return evalCond(x, params); });
    if (cond.kind === 'not') return !evalCond(cond.expr, params);
    return false;
  }
  function evalAssignValue(value, params) {
    if (value == null || typeof value !== 'object') return value;
    if (value.kind === 'dotEnum') return stripDot(value.value);
    if (value.kind === 'string' || value.kind === 'number' || value.kind === 'boolean' || value.kind === 'hex') return value.value;
    if (value.kind === 'ident') {
      if (Object.prototype.hasOwnProperty.call(params, value.name)) return params[value.name];
      return value.name;
    }
    return value;
  }
  function handlersByEvent(decls) {
    var map = {};
    (decls || []).forEach(function(d){
      (d.handlers || []).forEach(function(h){
        if (h && h.event) map[h.event] = h.body || [];
      });
    });
    return map;
  }
  function runBody(body, params, emits) {
    var changed = false;
    (body || []).forEach(function(item){
      if (!item || typeof item !== 'object') return;
      if (item.kind === 'assign' && item.param) {
        var next = evalAssignValue(item.value, params);
        if (params[item.param] !== next) changed = true;
        params[item.param] = next;
        return;
      }
      if (item.kind === 'emit' && item.name) {
        emits.push({ name: item.name, args: (item.args || []).map(String) });
        return;
      }
      if (item.kind === 'if' && item.chain) {
        var matched = false;
        (item.chain.branches || []).forEach(function(br){
          if (matched) return;
          if (evalCond(br.condition, params)) {
            if (runBody(br.body || [], params, emits)) changed = true;
            matched = true;
          }
        });
        if (!matched && item.chain.elseBody) {
          if (runBody(item.chain.elseBody, params, emits)) changed = true;
        }
      }
    });
    return changed;
  }
  function applyEvent(params, decls, event) {
    var by = handlersByEvent(decls);
    if (!by[event]) return { params: Object.assign({}, params), emits: [], changed: false, handled: false };
    var next = Object.assign({}, params);
    var emits = [];
    var changed = runBody(by[event], next, emits);
    return { params: next, emits: emits, changed: changed, handled: true };
  }
  function showState(section, state) {
    var nodes = section.querySelectorAll(':scope > .pdl-state');
    if (!nodes.length) return false;
    var found = false;
    nodes.forEach(function(n){
      var match = n.getAttribute('data-pdl-state') === state;
      n.hidden = !match;
      if (match) found = true;
    });
    return found;
  }
  function readParams(section) {
    var el = section.querySelector('.pdl-preview-params');
    if (!el) return {};
    try { return JSON.parse(el.textContent || '{}'); } catch (e) { return {}; }
  }
  function writeParams(section, params) {
    var el = section.querySelector('.pdl-preview-params');
    if (el) el.textContent = JSON.stringify(params);
  }
  function applyEmitCapture(parentParams, captures, channel, emitArgNames, childParams, qualifier) {
    if (!captures || !captures.length) {
      return { params: Object.assign({}, parentParams), changed: false, handled: false };
    }
    var capture = null;
    captures.forEach(function(c){
      if (c.channel !== channel) return;
      if (qualifier && c.qualifier && c.qualifier !== qualifier) return;
      capture = c;
    });
    if (!capture) return { params: Object.assign({}, parentParams), changed: false, handled: false };
    var scope = Object.assign({}, parentParams);
    (capture.payload || []).forEach(function(p, i){
      var src = emitArgNames[i] || p.name;
      if (Object.prototype.hasOwnProperty.call(childParams, src)) scope[p.name] = childParams[src];
      else if (Object.prototype.hasOwnProperty.call(childParams, p.name)) scope[p.name] = childParams[p.name];
    });
    var next = Object.assign({}, parentParams);
    var changed = false;
    (capture.body || []).forEach(function(a){
      if (!a || !a.param) return;
      var resolved = evalAssignValue(a.value, scope);
      if (a.value && typeof a.value === 'object' && a.value.kind === 'ident') {
        var nm = String(a.value.name || '');
        if (Object.prototype.hasOwnProperty.call(scope, nm)) resolved = scope[nm];
      }
      if (next[a.param] !== resolved) changed = true;
      next[a.param] = resolved;
      scope[a.param] = resolved;
    });
    return { params: next, changed: changed, handled: true };
  }
  function postHeight() {
    try {
      var h = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      parent.postMessage({ type: 'pdl-resize', height: h }, '*');
    } catch (e) {}
  }
  if (${opts.interactiveHost ? "true" : "false"}) {
    document.querySelectorAll('section.pdl-preview[data-pdl-interactive]').forEach(function(section){
      var name = section.getAttribute('data-pdl-component');
      var decls = interactions[name] || [];
      var captures = emitCaptures[name] || [];
      var byEvent = handlersByEvent(decls);
      var liveParams = readParams(section);
      var canvas = section.querySelector('.pdl-canvas, .pdl-state');
      function inParamBar(ev) {
        return ev.target && ev.target.closest && ev.target.closest('.pdl-param-bar');
      }
      function postMsg(payload) {
        try { parent.postMessage(payload, '*'); } catch (e) {}
      }
      function dispatchSelf(event) {
        if (!byEvent[event]) return null;
        var result = applyEvent(liveParams, decls, event);
        liveParams = result.params;
        writeParams(section, liveParams);
        var stateKey = liveParams.interactionState != null ? String(liveParams.interactionState) : 'rest';
        var previewHandled = showState(section, stateKey);
        if (!previewHandled && stateKey === 'rest') previewHandled = showState(section, 'rest');
        var needRebake = false;
        if (result.emits && result.emits.length && captures.length) {
          result.emits.forEach(function(em){
            var cap = applyEmitCapture(liveParams, captures, em.name, em.args || [], liveParams, null);
            if (cap.handled && cap.changed) {
              liveParams = cap.params;
              writeParams(section, liveParams);
              needRebake = true;
            }
          });
        }
        postMsg({
          type: 'pdl-interaction',
          component: name,
          event: event,
          params: liveParams,
          emits: result.emits,
          handled: result.handled,
          changed: result.changed || needRebake,
          previewHandled: needRebake ? false : previewHandled
        });
        return result;
      }
      var instances = section.querySelectorAll('[data-pdl-instance-of]');
      if (instances.length && (captures.length || true)) {
        instances.forEach(function(node){
          var childType = node.getAttribute('data-pdl-instance-of');
          var childDecls = interactions[childType] || [];
          var childBy = handlersByEvent(childDecls);
          if (!Object.keys(childBy).length) return;
          var childParams = {};
          try { childParams = JSON.parse(node.getAttribute('data-pdl-instance-kwargs') || '{}'); } catch (e) {}
          var childLive = Object.assign({}, childParams);
          var down = false;
          node.style.cursor = 'pointer';
          function showInstState(state) {
            var nodes = node.querySelectorAll(':scope > .pdl-inst-state');
            if (!nodes.length) return false;
            var found = false;
            nodes.forEach(function(n){
              var match = n.getAttribute('data-pdl-state') === state;
              n.hidden = !match;
              if (match) found = true;
            });
            return found;
          }
          function childDispatch(event) {
            if (!childBy[event]) return;
            var result = applyEvent(childLive, childDecls, event);
            childLive = result.params;
            var needRebake = false;
            (result.emits || []).forEach(function(em){
              var cap = applyEmitCapture(liveParams, captures, em.name, em.args || [], childLive, null);
              if (cap.handled && cap.changed) {
                liveParams = cap.params;
                writeParams(section, liveParams);
                needRebake = true;
              }
            });
            // Local chrome swap for nested interactionState (hover/press).
            // Rebake cannot restore ephemeral child interactionState — parent SoT only.
            var stateKey = childLive.interactionState != null ? String(childLive.interactionState) : 'rest';
            var localHandled = showInstState(stateKey);
            if (!localHandled && stateKey === 'rest') localHandled = showInstState('rest');
            postMsg({
              type: 'pdl-interaction',
              component: name,
              event: event,
              childComponent: childType,
              params: liveParams,
              childParams: childLive,
              emits: result.emits,
              handled: result.handled,
              changed: result.changed || needRebake,
              previewHandled: needRebake ? false : true
            });
          }
          if (childBy.hoverStart || childBy.hoverEnd) {
            node.addEventListener('mouseenter', function(ev){
              if (inParamBar(ev)) return;
              if (!down) childDispatch('hoverStart');
            });
            node.addEventListener('mouseleave', function(){
              if (down) { down = false; childDispatch('pressCancel'); }
              childDispatch('hoverEnd');
            });
          }
          if (childBy.pressStart || childBy.pressEnd || childBy.pressCancel) {
            node.addEventListener('mousedown', function(ev){
              if (inParamBar(ev)) return;
              if (ev.button !== 0) return;
              ev.stopPropagation();
              down = true;
              childDispatch('pressStart');
            });
            node.addEventListener('mouseup', function(ev){
              if (inParamBar(ev)) return;
              if (!down) return;
              ev.stopPropagation();
              down = false;
              childDispatch('pressEnd');
            });
          }
        });
      }
      if (Object.keys(byEvent).length) {
        var pointerDown = false;
        if (byEvent.hoverStart || byEvent.hoverEnd) {
          section.addEventListener('mouseenter', function(ev){
            if (inParamBar(ev)) return;
            if (ev.target && ev.target.closest && ev.target.closest('[data-pdl-instance-of]')) return;
            if (!pointerDown) dispatchSelf('hoverStart');
          });
          section.addEventListener('mouseleave', function(){
            if (pointerDown) { pointerDown = false; dispatchSelf('pressCancel'); }
            dispatchSelf('hoverEnd');
          });
        }
        if (byEvent.pressStart || byEvent.pressEnd || byEvent.pressCancel) {
          section.addEventListener('mousedown', function(ev){
            if (inParamBar(ev)) return;
            if (ev.target && ev.target.closest && ev.target.closest('[data-pdl-instance-of]')) return;
            if (ev.button !== 0) return;
            pointerDown = true;
            dispatchSelf('pressStart');
          });
          section.addEventListener('mouseup', function(ev){
            if (inParamBar(ev)) return;
            if (!pointerDown) return;
            pointerDown = false;
            dispatchSelf('pressEnd');
          });
        }
        if (canvas) canvas.style.cursor = 'pointer';
      }
      // EditableText host: bind <input data-pdl-editable> → param; blur/Enter → keyboardDismissed; Esc → cancelled.
      section.querySelectorAll('input.pdl-text--editable[data-pdl-editable]').forEach(function(input){
        var bind = input.getAttribute('data-pdl-editable');
        input.addEventListener('mousedown', function(ev){ ev.stopPropagation(); });
        input.addEventListener('click', function(ev){
          ev.stopPropagation();
          if (byEvent.pressEnd) dispatchSelf('pressEnd');
          try { input.focus(); } catch (e) {}
        });
        input.addEventListener('blur', function(){
          if (bind) {
            liveParams[bind] = input.value;
            writeParams(section, liveParams);
          }
          if (byEvent.keyboardDismissed) dispatchSelf('keyboardDismissed');
        });
        input.addEventListener('keydown', function(ev){
          if (ev.key === 'Escape') {
            if (byEvent.keyboardCancelled) dispatchSelf('keyboardCancelled');
            try { input.blur(); } catch (e) {}
          } else if (ev.key === 'Enter') {
            try { input.blur(); } catch (e) {}
          }
        });
      });
    });
  }
  document.querySelectorAll('.pdl-param-bar').forEach(function(bar){
    var component = bar.getAttribute('data-pdl-param-bar');
    function emitParams() {
      var kv = {};
      bar.querySelectorAll('[data-param]').forEach(function(el){
        kv[el.getAttribute('data-param')] = el.value;
      });
      try { parent.postMessage({ type: 'pdl-param', component: component, kv: kv }, '*'); } catch (e) {}
    }
    bar.querySelectorAll('select').forEach(function(el){
      el.addEventListener('change', emitParams);
    });
    bar.querySelectorAll('input').forEach(function(el){
      el.addEventListener('change', emitParams);
      el.addEventListener('keydown', function(ev){
        if (ev.key === 'Enter') emitParams();
      });
    });
  });
  document.querySelectorAll('[data-pdl-open-source]').forEach(function(btn){
    btn.addEventListener('click', function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      var component = btn.getAttribute('data-pdl-open-source');
      if (!component) return;
      try {
        parent.postMessage({ type: 'pdl-open-source', component: component }, '*');
      } catch (e) {}
    });
  });
  postHeight();
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(postHeight).observe(document.body);
  }
  window.addEventListener('load', postHeight);
})();
</script>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${BASE_CSS}
${previewBgDecl}
.pdl-gallery.pdl-variant-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.pdl-state[hidden] { display: none !important; }
</style>
</head>
<body>
<h1 class="pdl-doc-title">${escapeHtml(title)}</h1>
<p class="pdl-meta">${meta}</p>
<div class="pdl-gallery">
${sections}
</div>
${hostScript}
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
