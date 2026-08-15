import {
  iconRefLabel,
  isEvaluatedIconRef,
  isEvaluatedMediaSourceRef,
  isPackRelativeFilePath,
} from "./assetRefs.js";
import type { BakedComponentJson, BakedDesignDocument, BakedFrame } from "./bakeDesign.js";
import {
  companionPreviewFromCatalogue,
  companionPreviewFromDesign,
  evaluateRulesForPreview,
  evaluateRulesOnComponent,
  ruleMarksFromViolations,
  type CompanionPreview,
  type RuleSeverity,
  type RuleViolation,
  type RulesPreviewJson,
} from "./evaluateRules.js";

export {
  companionPreviewFromCatalogue,
  companionPreviewFromDesign,
  evaluateRulesForPreview,
  evaluateRulesOnComponent,
  type CompanionPreview,
  type RuleViolation,
  type RulesPreviewJson,
};

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

/** Baked `source` → href for `<img>` (url / pack-relative file). */
function mediaSourceHref(source: unknown): string {
  if (typeof source === "string") return source;
  if (isEvaluatedMediaSourceRef(source)) {
    return source.source === "url" ? source.url : source.path;
  }
  return "";
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

/**
 * Media / layer image content position from `justify` (horizontal) + `align` (vertical).
 * Same start/center/end cases as text; maps to CSS `object-position` / `background-position`.
 */
function mediaContentPositionCss(justify: unknown, align: unknown): string | undefined {
  const axis = (v: unknown, start: string, end: string): string | undefined => {
    const raw = typeof v === "string" ? v : dotEnumValue(v);
    if (!raw) return undefined;
    if (raw === "start") return start;
    if (raw === "center") return "center";
    if (raw === "end") return end;
    return undefined;
  };
  const x = axis(justify, "left", "right");
  const y = axis(align, "top", "bottom");
  if (!x && !y) return undefined;
  const xx = x ?? "center";
  const yy = y ?? "center";
  if (xx === "center" && yy === "center") return "center";
  return `${xx} ${yy}`;
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
      const px = finiteNum(o.radius) ?? finiteNum(o.blur);
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
        const objectPosition = mediaContentPositionCss(o.justify, o.align);
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
 * Shell chrome: **outside** border ring + drop `shadow` as one `box-shadow`.
 * Borders never use CSS `border` — they must not change layout size.
 * Inside borders are a separate overlay (see `insideBorderOverlayHtml`) so layer
 * bands / children cannot paint over them.
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

function borderPositionOf(props: Record<string, unknown>): "inside" | "outside" {
  const posRaw = props.borderPosition;
  const pos =
    typeof posRaw === "string" ? posRaw : (dotEnumValue(posRaw) ?? "outside");
  return pos === "inside" ? "inside" : "outside";
}

/** Paint-only outside ring + optional drop `shadow` on the frame shell. */
function combinedBoxShadowCss(props: Record<string, unknown>): string | undefined {
  const parts: string[] = [];
  const w = finiteNum(props.borderWidth);
  const c = props.borderColor;
  if (
    borderPositionOf(props) === "outside" &&
    w !== undefined &&
    w > 0 &&
    typeof c === "string" &&
    c.length > 0
  ) {
    // outside (default): outer ring; does not affect layout box size.
    parts.push(`0 0 0 ${String(w)}px ${c}`);
  }
  const drop = shadowLayerCss(props.shadow);
  if (drop) parts.push(drop);
  if (parts.length === 0) return undefined;
  return `box-shadow:${parts.join(", ")}`;
}

/**
 * Inside border as chrome overlay above background / children / foreground
 * (typical §14 stack: … → children → foreground → border → shadow).
 * Parent must be `position:relative` (see `withInsideBorderOverlay`).
 */
function insideBorderOverlayHtml(props: Record<string, unknown>): string {
  const w = finiteNum(props.borderWidth);
  const c = props.borderColor;
  if (
    borderPositionOf(props) !== "inside" ||
    w === undefined ||
    !(w > 0) ||
    typeof c !== "string" ||
    c.length === 0
  ) {
    return "";
  }
  const st = [
    "position:absolute",
    "inset:0",
    "border-radius:inherit",
    "pointer-events:none",
    "z-index:3",
    `box-shadow:inset 0 0 0 ${String(w)}px ${c}`,
  ].join(";");
  return `<div class="pdl-border-inside" style="${escapeStyleAttr(st)}" aria-hidden="true"></div>`;
}

/** Ensure positioning context, then append inside-border overlay HTML. */
function withInsideBorderOverlay(
  shellStyle: string,
  props: Record<string, unknown>,
  innerHtml: string,
): { style: string; html: string } {
  const overlay = insideBorderOverlayHtml(props);
  if (!overlay) return { style: shellStyle, html: innerHtml };
  const style = /(?:^|;)position\s*:/.test(shellStyle)
    ? shellStyle
    : mergeInlineStyles(shellStyle, "position:relative");
  return { style, html: `${innerHtml}${overlay}` };
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

/** Resolved `{ aspect: n }` on width or height → CSS aspect-ratio (W/H). */
function aspectRatioFromSizingAxes(props: Record<string, unknown>): number | undefined {
  for (const axis of ["width", "height"] as const) {
    const v = props[axis];
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      const n = finiteNum((v as { aspect?: unknown }).aspect);
      if (n !== undefined && n > 0) return n;
    }
  }
  return undefined;
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
    if ("aspect" in o) {
      // Derived from the cross-axis via CSS `aspect-ratio` (set at box level).
      return [`${dim}:auto`];
    }
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
  const ar = finiteNum(props.aspectRatio) ?? aspectRatioFromSizingAxes(props);
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
  parentOpts?: FrameRenderOpts,
): FrameRenderOpts {
  const isStack = isStackDirection(parentDirection);
  const inherited: Partial<FrameRenderOpts> = {
    sessionParams: parentOpts?.sessionParams,
    instancePath: parentOpts?.instancePath,
    isTreeRoot: false,
  };
  if (!isStack) return { stackChild: false, stackZ: 0, ...inherited };
  return {
    stackChild: true,
    stackZ: stackZIndex(index, childCount, parentDirection === "reverseStack"),
    ...inherited,
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

export type FrameRenderOpts = {
  stackChild: boolean;
  /** Absolute CSS z-index when `stackChild` (from `.stack` / `.reverseStack`). */
  stackZ: number;
  /** When true, omit data-pdl-instance-* (used for inst-state inner bodies). */
  omitInstanceAttrs?: boolean;
  /**
   * Enclosing component baked params (EditableText `activatesOn` / `isEditing`).
   * Propagated for root text fields so `.none` can render as non-interactive text.
   */
  sessionParams?: Record<string, unknown>;
  /** Instance-tree path for rule marks (`Component` or `Component/letId`). */
  instancePath?: string;
  /** True only for the previewed component root frame. */
  isTreeRoot?: boolean;
};

function textFieldActivationMode(
  params: Record<string, unknown> | undefined,
): "focus" | "press" | "none" {
  const raw = params?.activatesOn;
  const s = raw == null ? "focus" : String(raw).replace(/^\./, "");
  if (s === "press" || s === "none" || s === "focus") return s;
  return "focus";
}

function sessionParamIsEditing(params: Record<string, unknown> | undefined): boolean {
  return params?.isEditing === true || params?.isEditing === "true";
}

/**
 * Editable `<input>`s used to always append `color:inherit`, which overrode baked
 * `color` and made dark-theme fields paint black. Only inherit when authors omit color.
 */
function editableInputColorOverride(
  props: Record<string, unknown>,
): string | undefined {
  if (typeof props.color === "string" && props.color.trim() !== "") return undefined;
  return "color:inherit";
}

/**
 * Strip UA input chrome without clobbering baked fill / type. Trailing
 * `background:transparent` and `font:inherit` used to win over SearchField
 * `#000` and PcBody (shorthand `font` resets size/weight/family/line-height).
 */
function editableInputHostDecls(props: Record<string, unknown>): string[] {
  const decls = [
    "border:none",
    "outline:none",
    "width:100%",
    "box-sizing:border-box",
  ];
  const color = editableInputColorOverride(props);
  if (color) decls.push(color);
  if (!backgroundCssDecl(props)) decls.push("background:transparent");
  return decls;
}

export type InstanceRenderCtx = {
  nextKey: number;
  /** Prebaked non-rest trees keyed by instance key (`i0`, …) then state name. */
  stateTrees: Record<string, Record<string, BakedComponentJson>>;
  /**
   * Per-instance chrome SoT param (`interactionState`, or author `state`, …)
   * used by the host to swap `data-pdl-state` fragments on hover/press.
   */
  chromeStateParams?: Readonly<Record<string, string>>;
  /** Component types that declare PointerInput host channels (hover/press). */
  pointerInputTypes?: ReadonlySet<string>;
  /** EditableText baked defaults by component type (`isEditing`, `value`, …). */
  editableSessionDefaults?: Readonly<Record<string, Record<string, unknown>>>;
  /** Rule-violation marks keyed by instance path. */
  ruleMarks?: Readonly<Record<string, RuleSeverity>>;
};

function frameLooksEditableSession(params: Record<string, unknown> | null | undefined): boolean {
  if (!params) return false;
  return (
    Object.prototype.hasOwnProperty.call(params, "isEditing") ||
    Object.prototype.hasOwnProperty.call(params, "activatesOn")
  );
}

function seedEditableSessionDefault(
  out: Record<string, Record<string, unknown>>,
  typeName: string,
  params: Record<string, unknown>,
): void {
  if (!frameLooksEditableSession(params)) return;
  if (out[typeName]) return;
  // Type-level seed only — instance kwargs overlay per frame at paint time.
  out[typeName] = {
    value: "",
    isEditing: false,
    activatesOn: params.activatesOn ?? "focus",
  };
}

/**
 * EditableText session defaults by component type. Includes nested `instanceOf`
 * targets (e.g. NoteField inside NoteEditor) — bakeComponent of the parent alone
 * omits child types from `doc.components`, which previously skipped session attrs
 * and left instance lets on the bare `<input>`.
 */
export function collectEditableSessionDefaults(
  doc: Pick<BakedDesignDocument, "components"> | { components?: BakedDesignDocument["components"] },
  typeDefaults?: Record<string, Record<string, unknown>>,
): Record<string, Record<string, unknown>> {
  return editableSessionDefaultsFromDoc(doc as BakedDesignDocument, typeDefaults);
}

function editableSessionDefaultsFromDoc(
  doc: BakedDesignDocument,
  typeDefaults?: Record<string, Record<string, unknown>>,
): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [name, bag] of Object.entries(typeDefaults ?? {})) {
    if (!bag || typeof bag !== "object" || Array.isArray(bag)) continue;
    out[name] = {
      value: "",
      isEditing: false,
      activatesOn: "focus",
      ...bag,
    };
  }
  for (const [name, comp] of Object.entries(doc.components ?? {})) {
    const bp = (comp.bakedParams ?? {}) as Record<string, unknown>;
    if (frameLooksEditableSession(bp)) {
      // omitEmpty bake JSON drops `value: ""` — restore so inputs don't seed from placeholder content.
      out[name] = {
        value: "",
        ...bp,
      };
      if (out[name].value == null) out[name].value = "";
    }
    const walk = (frame: BakedFrame | null | undefined): void => {
      if (!frame) return;
      if (frame.instanceOf && frame.instanceKwargs) {
        seedEditableSessionDefault(out, frame.instanceOf, frame.instanceKwargs as Record<string, unknown>);
      }
      for (const ch of frame.children ?? []) walk(ch);
    };
    walk(comp.root);
  }
  return out;
}

/** Live editable `<input>` — the instance node may *be* the input (no wrapper). */
function liveEditableInputEl(root: Element | null | undefined): HTMLInputElement | null {
  if (!root) return null;
  if (root.matches?.("input.pdl-text--editable")) return root as HTMLInputElement;
  return root.querySelector(
    ".pdl-inst-state:not([hidden]) input.pdl-text--editable, :scope > input.pdl-text--editable, input.pdl-text--editable",
  ) as HTMLInputElement | null;
}

/** True when catalogue interaction decls include hover/press host channels. */
function declsHavePointerInput(decls: unknown): boolean {
  if (!Array.isArray(decls)) return false;
  for (const d of decls) {
    if (!d || typeof d !== "object") continue;
    const handlers = (d as { handlers?: unknown }).handlers;
    if (!Array.isArray(handlers)) continue;
    for (const h of handlers) {
      if (!h || typeof h !== "object") continue;
      const event = (h as { event?: unknown }).event;
      if (
        event === "hoverStart" ||
        event === "hoverEnd" ||
        event === "pressStart" ||
        event === "pressEnd" ||
        event === "pressCancel"
      ) {
        return true;
      }
    }
  }
  return false;
}

function pointerInputTypesFromInteractions(
  interactionsByComponent: Record<string, unknown> | undefined,
): Set<string> {
  const out = new Set<string>();
  if (!interactionsByComponent) return out;
  for (const [name, decls] of Object.entries(interactionsByComponent)) {
    if (declsHavePointerInput(decls)) out.add(name);
  }
  return out;
}

function iconFrameStyle(props: Record<string, unknown>, opts: FrameRenderOpts): string {
  const sz = finiteNum(props.size) ?? 24;
  const col = typeof props.color === "string" && props.color.length > 0 ? props.color : "#94a3b8";
  const box = frameBoxStyle(props, "icon", opts);
  // `size` is the square glyph default for any axis not set via `width` / `height`.
  // Do not overwrite explicit sizing (e.g. width=24 height=48).
  const sizeFallback: string[] = [];
  if (props.width === undefined || props.width === null) sizeFallback.push(`width:${sz}px`);
  if (props.height === undefined || props.height === null) sizeFallback.push(`height:${sz}px`);
  const iconBox = [
    ...sizeFallback,
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
  const op = mediaContentPositionCss(props.justify, props.align);
  const parts = [box, "max-width:100%", "display:block"];
  if (ob) parts.push(ob);
  if (op) parts.push(`object-position:${op}`);
  return mergeInlineStyles(...parts);
}

/**
 * Public entry for bake-IR reconcile mounts (same paint path as document HTML).
 * @internal previewApply / bakeReconcile
 */
export function renderFrameForReconcile(
  frame: BakedFrame,
  opts: FrameRenderOpts = { stackChild: false, stackZ: 0 },
  instCtx?: InstanceRenderCtx,
): string {
  return renderFrame(frame, opts, instCtx);
}

export type PatchFrameResult = "patched" | "needsRemount";

function deepEqualJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function editableBindOf(props: Record<string, unknown>): string | undefined {
  if (typeof props.editable === "string") return props.editable;
  if (props.editable === true) return "value";
  return undefined;
}

/** Structural paint mode — changes here require remount (tag / child chrome shape). */
function framePaintStructureKey(
  frame: BakedFrame,
  opts: FrameRenderOpts,
  instCtx?: InstanceRenderCtx,
): string {
  const props = (frame.props ?? {}) as Record<string, unknown>;
  const kind = frame.kind;
  if (kind === "layout") {
    return `layout:${layoutLayerBandsActive(props) ? "layers" : "flat"}:${isStackDirection(props.direction) ? "stack" : "flex"}`;
  }
  if (kind === "text") {
    const bind = editableBindOf(props);
    let session = opts.sessionParams;
    if (
      frame.instanceOf &&
      instCtx?.editableSessionDefaults?.[frame.instanceOf] &&
      !opts.omitInstanceAttrs
    ) {
      session = {
        ...instCtx.editableSessionDefaults[frame.instanceOf],
        ...(frame.instanceKwargs ?? {}),
      };
    }
    const act = textFieldActivationMode(session);
    const editing = sessionParamIsEditing(session);
    const suppress =
      Boolean(bind) &&
      ((act === "none" && !editing) || (act === "press" && !editing));
    const mode = bind && !suppress ? "input" : act === "press" && !editing ? "press-hit" : textLayerBandsActive(props) ? "layers" : textLineClamp(props) !== undefined ? "clamp" : "plain";
    return `text:${mode}`;
  }
  if (kind === "media") {
    const src = mediaSourceHref(props.source);
    const mediaKind =
      isEvaluatedMediaSourceRef(props.source) && props.source.mediaKind
        ? props.source.mediaKind
        : "image";
    const hasSrc =
      src.length > 0 &&
      (/^https?:\/\//i.test(src) ||
        src.startsWith("/") ||
        src.startsWith("./") ||
        isPackRelativeFilePath(src));
    const layered = layoutLayerBandsActive(props);
    const tag = !hasSrc ? "placeholder" : mediaKind === "video" ? "video" : "img";
    const wrap = !layered && hasSrc && insideBorderOverlayHtml(props) ? "wrap" : "bare";
    return `media:${layered ? "layers" : "flat"}:${tag}:${wrap}`;
  }
  if (kind === "icon") {
    const iconVal = props.icon;
    const fileSrc =
      isEvaluatedIconRef(iconVal) && iconVal.source === "file"
        ? iconVal.path
        : typeof iconVal === "string" && isPackRelativeFilePath(iconVal)
          ? iconVal
          : "";
    const isFile = Boolean(fileSrc && /\.(svg|png|webp|jpg|jpeg|gif)$/i.test(fileSrc));
    const wrap = isFile && insideBorderOverlayHtml(props) ? "wrap" : isFile ? "img" : "swatch";
    return `icon:${wrap}`;
  }
  return `${kind}:default`;
}

function computeShellStyleForPatch(
  frame: BakedFrame,
  opts: FrameRenderOpts,
): string | null {
  const props = (frame.props ?? {}) as Record<string, unknown>;
  const kind = frame.kind;
  if (kind === "layout") {
    return mergeInlineStyles(
      frameBoxStyle(props, "layout", opts),
      isStackDirection(props.direction) ? "position:relative" : "",
    );
  }
  if (kind === "text") {
    const bind = editableBindOf(props);
    const suppress =
      Boolean(bind) &&
      textFieldActivationMode(opts.sessionParams) === "none" &&
      !sessionParamIsEditing(opts.sessionParams);
    if (bind && !suppress) {
      return mergeInlineStyles(
        textInlineStyle(props),
        ...textFlexItemDecls(props),
        ...(opts.stackChild ? stackCellDecls(opts.stackZ) : []),
        ...editableInputHostDecls(props),
      );
    }
    if (textLayerBandsActive(props)) {
      return mergeInlineStyles(
        textMetricsShellStyle(props),
        dropShadowCss(props),
        textBoxAlignStyle(props),
        "position:relative",
        "vertical-align:top",
        ...textMainAxisMinDecls(props),
        ...textFlexItemDecls(props),
        ...(opts.stackChild ? stackCellDecls(opts.stackZ) : []),
      );
    }
    if (textLineClamp(props) !== undefined) {
      return mergeInlineStyles(
        textClampOuterStyle(props),
        ...textFlexItemDecls(props),
        ...(opts.stackChild ? stackCellDecls(opts.stackZ) : []),
      );
    }
    return mergeInlineStyles(
      textInlineStyle(props),
      ...textFlexItemDecls(props),
      ...(opts.stackChild ? stackCellDecls(opts.stackZ) : []),
    );
  }
  if (kind === "spacer") {
    return mergeInlineStyles(
      boxMetricsStyle(props),
      ...flexItemDecls(props),
      ...(opts.stackChild ? stackCellDecls(opts.stackZ) : []),
      "flex:1 1 auto",
      "min-height:0",
      "min-width:0",
    );
  }
  if (kind === "icon") {
    return iconFrameStyle(props, opts);
  }
  if (kind === "media") {
    if (layoutLayerBandsActive(props)) {
      return mergeInlineStyles(
        boxMetricsStyle(props, { omitBackground: true }),
        ...flexItemDecls(props),
        ...(opts.stackChild ? stackCellDecls(opts.stackZ) : []),
        "position:relative",
        "overflow:hidden",
        "max-width:100%",
      );
    }
    return mediaFrameStyle(props, opts);
  }
  return frameBoxStyle(props, kind, opts);
}

function syncInsideBorderOverlay(el: Element, props: Record<string, unknown>): void {
  const want = insideBorderOverlayHtml(props);
  const existing = el.querySelector(":scope > .pdl-border-inside");
  if (!want) {
    existing?.remove();
    return;
  }
  if (!/(?:^|;)position\s*:/.test(el.getAttribute("style") || "")) {
    const st = el.getAttribute("style") || "";
    el.setAttribute("style", st ? `${st};position:relative` : "position:relative");
  }
  if (existing) {
    const w = finiteNum(props.borderWidth);
    const c = props.borderColor;
    if (w !== undefined && typeof c === "string") {
      (existing as HTMLElement).style.boxShadow = `inset 0 0 0 ${String(w)}px ${c}`;
    }
    return;
  }
  const wrap = el.ownerDocument.createElement("div");
  wrap.innerHTML = want;
  const node = wrap.firstElementChild;
  if (node) el.appendChild(node);
}

function patchTextContentLive(el: Element, content: string): void {
  const inner =
    el.querySelector(":scope > .pdl-text__inner") ||
    el.querySelector(":scope > .pdl-text__clamp") ||
    null;
  if (inner) {
    inner.textContent = content;
    return;
  }
  if (el.children.length === 0) {
    el.textContent = content;
    return;
  }
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 3) node.parentNode?.removeChild(node);
  }
  // Prefer text before chrome overlays (e.g. inside border).
  const overlay = el.querySelector(":scope > .pdl-border-inside");
  const textNode = el.ownerDocument.createTextNode(content);
  if (overlay) el.insertBefore(textNode, overlay);
  else el.appendChild(textNode);
}

/**
 * Merge bake/SoT session params with a live EditableText session bag.
 * Bake wins for session end (`isEditing: false`); while still editing, keep
 * in-flight text from the focused input or previous bag.
 */
export function mergeEditableSessionParams(
  next: Record<string, unknown>,
  prev: Record<string, unknown> | null | undefined,
  liveValue?: string | null,
): Record<string, unknown> {
  if (!prev) return { ...next };
  // Bake/SoT must win on finish/cancel — previous `{ ...next, ...prev }` left
  // isEditing:true stuck after Done/Cancel and could discard the committed value.
  const merged: Record<string, unknown> = { ...prev, ...next };
  const nextEditing = next.isEditing === true || next.isEditing === "true";
  if (nextEditing) {
    merged.isEditing = true;
    if (liveValue != null) merged.value = liveValue;
    else if (prev.value !== undefined) merged.value = prev.value;
  } else if (next.isEditing === false || next.isEditing === "false") {
    merged.isEditing = false;
    if (next.value !== undefined) merged.value = next.value;
  }
  return merged;
}

function mergeSessionAttrs(
  el: Element,
  nextSession: Record<string, unknown> | null,
  nextKwargs: Record<string, unknown> | undefined,
): void {
  if (nextKwargs) {
    el.setAttribute("data-pdl-instance-kwargs", JSON.stringify(nextKwargs));
  } else if (el.hasAttribute("data-pdl-instance-kwargs")) {
    el.removeAttribute("data-pdl-instance-kwargs");
  }
  if (!nextSession) return;
  const raw = el.getAttribute("data-pdl-session-params");
  let merged: Record<string, unknown> = { ...nextSession };
  if (raw) {
    try {
      const prev = JSON.parse(raw) as Record<string, unknown>;
      const liveInput = liveEditableInputEl(el);
      const doc = el.ownerDocument;
      const liveValue =
        liveInput && doc?.activeElement === liveInput ? liveInput.value : null;
      merged = mergeEditableSessionParams(nextSession, prev, liveValue);
    } catch {
      merged = { ...nextSession };
    }
  }
  el.setAttribute("data-pdl-session-params", JSON.stringify(merged));
  const input = liveEditableInputEl(el);
  if (input && typeof merged.value === "string") {
    const doc = el.ownerDocument;
    if (doc?.activeElement !== input) input.value = merged.value;
  }
}

/**
 * Patch a live DOM node from previous/next bake frames (shared with mount paint mapping).
 * Returns `needsRemount` when tag/structure cannot be updated in place.
 */
export function patchFrameProps(
  el: Element,
  prev: BakedFrame,
  next: BakedFrame,
  opts: FrameRenderOpts = { stackChild: false, stackZ: 0 },
  instCtx?: InstanceRenderCtx,
  /** Prior EditableText defaults / session — required so activatesOn none↔press remounts. */
  prevInstCtx?: InstanceRenderCtx,
  prevOpts?: FrameRenderOpts,
): PatchFrameResult {
  if (prev.kind !== next.kind || prev.instanceOf !== next.instanceOf) return "needsRemount";
  // Prev key must use prior session defaults; sharing `instCtx` made none→press look unchanged.
  const prevPaintOpts = prevOpts ?? opts;
  const prevPaintCtx = prevInstCtx ?? instCtx;
  if (
    framePaintStructureKey(prev, prevPaintOpts, prevPaintCtx) !==
    framePaintStructureKey(next, opts, instCtx)
  ) {
    return "needsRemount";
  }

  let frameOpts = opts;
  let nextSession: Record<string, unknown> | null = null;
  if (next.instanceOf && instCtx?.editableSessionDefaults?.[next.instanceOf] && !opts.omitInstanceAttrs) {
    nextSession = {
      ...instCtx.editableSessionDefaults[next.instanceOf],
      ...(next.instanceKwargs ?? {}),
    };
    frameOpts = { ...opts, sessionParams: nextSession };
  } else if (opts.sessionParams) {
    nextSession = { ...opts.sessionParams, ...(next.instanceKwargs ?? {}) };
    frameOpts = { ...opts, sessionParams: nextSession };
  }

  const shell = computeShellStyleForPatch(next, frameOpts);
  if (shell != null) {
    const style =
      borderPositionOf((next.props ?? {}) as Record<string, unknown>) === "inside" &&
      !/(?:^|;)position\s*:/.test(shell)
        ? mergeInlineStyles(shell, "position:relative")
        : shell;
    const pendingTransition = el.getAttribute("data-pdl-transition");
    const withMotion =
      pendingTransition && pendingTransition !== "none"
        ? mergeInlineStyles(style, `transition:${pendingTransition}`, "transform-origin:center")
        : style;
    // Transition + paint props in one `style` write do not interpolate. Arm
    // `transition` on the current look, then apply the bake on the next frame.
    if (pendingTransition && pendingTransition !== "none") {
      const cur = el.getAttribute("style") ?? "";
      if (!/(?:^|;)\s*transition\s*:/.test(cur)) {
        el.setAttribute(
          "style",
          mergeInlineStyles(cur, `transition:${pendingTransition}`, "transform-origin:center"),
        );
      }
      const target = el;
      requestAnimationFrame(() => {
        if (!target.isConnected) return;
        target.setAttribute("style", withMotion);
      });
    } else {
      el.setAttribute("style", withMotion);
    }
  }

  const nextProps = (next.props ?? {}) as Record<string, unknown>;
  syncInsideBorderOverlay(el, nextProps);

  if (next.kind === "text" && el.tagName === "INPUT") {
    const input = el as HTMLInputElement;
    const content = typeof nextProps.content === "string" ? nextProps.content : "";
    const session = frameOpts.sessionParams;
    const hasSessionValue =
      session != null && Object.prototype.hasOwnProperty.call(session, "value");
    const sessionVal = hasSessionValue ? String(session!.value ?? "") : content;
    const editing = sessionParamIsEditing(session);
    if (el.ownerDocument?.activeElement !== input) {
      if (input.value !== sessionVal) input.value = sessionVal;
    }
    if (hasSessionValue && !editing && sessionVal === "" && content !== "") {
      input.placeholder = content;
    } else if (!editing) {
      input.removeAttribute("placeholder");
    }
    const pressLocked =
      textFieldActivationMode(session) === "press" && !editing;
    input.readOnly = pressLocked || (textFieldActivationMode(session) === "none" && !editing);
    if (pressLocked) input.setAttribute("readonly", "");
    else input.removeAttribute("readonly");
  } else if (next.kind === "text") {
    const prevProps = (prev.props ?? {}) as Record<string, unknown>;
    const prevContent = typeof prevProps.content === "string" ? prevProps.content : "";
    const nextContent = typeof nextProps.content === "string" ? nextProps.content : "";
    if (prevContent !== nextContent) patchTextContentLive(el, nextContent);
  }

  if (next.kind === "media" || next.kind === "icon") {
    const mediaEl =
      (el.matches("img,video") ? el : null) ||
      el.querySelector(":scope > .pdl-media__img, :scope > .pdl-icon__img, :scope img, :scope video");
    if (mediaEl && next.kind === "media") {
      const src = mediaSourceHref(nextProps.source);
      if (src && mediaEl.getAttribute("src") !== src) mediaEl.setAttribute("src", src);
    }
    if (mediaEl && next.kind === "icon") {
      const iconVal = nextProps.icon;
      const fileSrc =
        isEvaluatedIconRef(iconVal) && iconVal.source === "file"
          ? iconVal.path
          : typeof iconVal === "string"
            ? iconVal
            : "";
      if (fileSrc && mediaEl.getAttribute("src") !== fileSrc) mediaEl.setAttribute("src", fileSrc);
    }
  }

  // Instance attrs on wrapper (or self when not dual-wrapped).
  const attrTarget =
    el.classList.contains("pdl-instance") || el.hasAttribute("data-pdl-instance-of")
      ? el
      : el.closest("[data-pdl-instance-of]") &&
          el.closest("[data-pdl-instance-of]")?.getAttribute("data-pdl-instance-let") === next.id
        ? el.closest("[data-pdl-instance-of]")!
        : el;
  if (next.instanceOf && attrTarget.hasAttribute("data-pdl-instance-of")) {
    mergeSessionAttrs(attrTarget, nextSession, next.instanceKwargs);
  } else if (
    next.instanceOf &&
    el.hasAttribute("data-pdl-instance-of")
  ) {
    mergeSessionAttrs(el, nextSession, next.instanceKwargs);
  } else if (!deepEqualJson(prev.instanceKwargs, next.instanceKwargs) && el.hasAttribute("data-pdl-instance-kwargs")) {
    mergeSessionAttrs(el, nextSession, next.instanceKwargs);
  }

  // Layered layout/text: keep content scrollport + background/foreground bands in sync.
  // Blur/ramp/media fills live in `.pdl-layer-band` siblings — not on shell style.
  if (
    (next.kind === "layout" || next.kind === "text" || next.kind === "media") &&
    (layoutLayerBandsActive(nextProps) || layoutLayerBandsActive((prev.props ?? {}) as Record<string, unknown>))
  ) {
    const prevProps = (prev.props ?? {}) as Record<string, unknown>;
    if (
      !deepEqualJson(prevProps.background, nextProps.background) ||
      !deepEqualJson(prevProps.foreground, nextProps.foreground)
    ) {
      const fgChanged = !deepEqualJson(prevProps.foreground, nextProps.foreground);
      if (fgChanged || !tryPatchSolidLayerBackground(el, nextProps)) {
        syncLayerBands(el, nextProps);
      }
    }
    if (next.kind === "layout" && layoutLayerBandsActive(nextProps)) {
      const content = el.querySelector(":scope > .pdl-layout__content");
      if (content) {
        const innerStyle = mergeInlineStyles(
          layoutFlexGridStyle(nextProps),
          overflowCss(nextProps.overflow),
          "flex:1 1 auto",
          "width:100%",
          "height:100%",
          "min-width:0",
          "min-height:0",
          "position:relative",
          "z-index:1",
          "border-radius:inherit",
        );
        content.setAttribute("style", innerStyle);
      }
    }
  }

  return "patched";
}

/**
 * Replace `.pdl-layer-band` under/over chrome without remounting children / media.
 * Order: under band → content/inner → over band → optional inside border.
 */
/** In-place solid fill so `data-pdl-transition` can interpolate hover colors. */
function tryPatchSolidLayerBackground(el: Element, props: Record<string, unknown>): boolean {
  const nextOps = flattenLayerOps(props.background);
  if (nextOps.length !== 1 || nextOps[0]!.kind !== "solid") return false;
  const band = el.querySelector(":scope > .pdl-layer-band");
  const solid = band?.querySelector(":scope > div");
  if (!band || !solid) return false;
  const color = nextOps[0]!.color;
  const pending = el.getAttribute("data-pdl-transition");
  const apply = () => {
    const st = ["position:absolute", "inset:0", "z-index:1", `background:${color}`];
    if (pending && pending !== "none") {
      st.push(`transition:${pending}`, "transform-origin:center");
    }
    solid.setAttribute("style", st.join(";"));
  };
  if (pending && pending !== "none") {
    const cur = solid.getAttribute("style") ?? "";
    if (!/(?:^|;)\s*transition\s*:/.test(cur)) {
      solid.setAttribute(
        "style",
        mergeInlineStyles(cur, `transition:${pending}`, "transform-origin:center"),
      );
    }
    requestAnimationFrame(() => {
      if (solid.isConnected) apply();
    });
  } else {
    apply();
  }
  return true;
}

function syncLayerBands(el: Element, props: Record<string, unknown>): void {
  const doc = el.ownerDocument;
  if (!doc) return;
  const underHtml = renderLayerBandHtml(flattenLayerOps(props.background), 0);
  const overHtml = renderLayerBandHtml(flattenLayerOps(props.foreground), 2);

  for (const band of Array.from(el.querySelectorAll(":scope > .pdl-layer-band"))) {
    band.remove();
  }

  const content =
    el.querySelector(":scope > .pdl-layout__content") ||
    el.querySelector(":scope > .pdl-text__inner") ||
    el.querySelector(":scope > .pdl-media__img") ||
    el.querySelector(":scope > .pdl-media__placeholder");
  const border = el.querySelector(":scope > .pdl-border-inside");

  const mount = (html: string, before: Element | null) => {
    if (!html) return;
    const wrap = doc.createElement("div");
    wrap.innerHTML = html.trim();
    const node = wrap.firstElementChild;
    if (!node) return;
    if (before) el.insertBefore(node, before);
    else el.appendChild(node);
  };

  if (content) {
    mount(underHtml, content);
    mount(overHtml, border);
  } else {
    mount(underHtml, border);
    mount(overHtml, border);
  }
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
  const isTreeRoot = opts.isTreeRoot === true;
  const instancePath = isTreeRoot
    ? (opts.instancePath ?? id)
    : frame.instanceOf
      ? `${opts.instancePath ?? ""}/${id}`.replace(/^\//, "")
      : (opts.instancePath ?? id);
  const ruleMark =
    (isTreeRoot || frame.instanceOf) && instCtx?.ruleMarks
      ? instCtx.ruleMarks[instancePath]
      : undefined;
  const ruleAttr = ruleMark ? ` data-pdl-rule="${escapeAttr(ruleMark)}"` : "";
  const dataId = ` data-pdl-id="${escapeAttr(id)}"${ruleAttr}`;
  const wantInst = frame.instanceOf !== undefined && !opts.omitInstanceAttrs;
  const inst = wantInst ? ` data-pdl-instance-of="${escapeAttr(frame.instanceOf!)}"` : "";
  const kwargsAttr =
    wantInst && frame.instanceKwargs
      ? ` data-pdl-instance-kwargs="${escapeAttr(JSON.stringify(frame.instanceKwargs))}"`
      : "";
  const pointerAttr =
    wantInst &&
    frame.instanceOf &&
    instCtx?.pointerInputTypes?.has(frame.instanceOf)
      ? ` data-pdl-pointer-input="1"`
      : "";
  // Nested EditableText: seed session bag from type defaults ∪ kwargs.
  let frameOpts: FrameRenderOpts = {
    ...opts,
    isTreeRoot: false,
    instancePath: isTreeRoot || frame.instanceOf ? instancePath : opts.instancePath,
  };
  let sessionAttr = "";
  if (wantInst && frame.instanceOf && instCtx?.editableSessionDefaults?.[frame.instanceOf]) {
    const childSession: Record<string, unknown> = {
      ...instCtx.editableSessionDefaults[frame.instanceOf],
      ...(frame.instanceKwargs ?? {}),
    };
    frameOpts = { ...frameOpts, sessionParams: childSession };
    sessionAttr = ` data-pdl-session-params="${escapeAttr(JSON.stringify(childSession))}"`;
  }
  const letAttr = wantInst && id ? ` data-pdl-instance-let="${escapeAttr(id)}"` : "";
  const foreachList =
    wantInst && typeof (frame as { foreachList?: unknown }).foreachList === "string"
      ? String((frame as { foreachList?: string }).foreachList)
      : "";
  const foreachAttr = foreachList
    ? ` data-pdl-foreach-list="${escapeAttr(foreachList)}"`
    : "";
  const instAttrs = `${inst}${kwargsAttr}${pointerAttr}${sessionAttr}${letAttr}${foreachAttr}`;

  // Legacy dual-bake wrap (only when a caller still supplies instanceStateTrees).
  // Playground no longer generates these — nested chrome uses instance resolve.
  if (
    wantInst &&
    instCtx &&
    frame.instanceOf &&
    instCtx.stateTrees &&
    Object.keys(instCtx.stateTrees).length > 0
  ) {
    const key = `i${instCtx.nextKey++}`;
    const extra = instCtx.stateTrees[key];
    if (extra && Object.keys(extra).length > 0) {
      const restInner = renderFrame(
        frame,
        { ...frameOpts, omitInstanceAttrs: true },
        instCtx,
      );
      let blocks = `<div class="pdl-inst-state" data-pdl-state="rest">${restInner}</div>`;
      for (const [stateName, stateComp] of Object.entries(extra)) {
        if (!stateComp?.root) continue;
        const frag = renderFrame(stateComp.root, {
          stackChild: false,
          stackZ: 0,
          sessionParams: frameOpts.sessionParams,
        });
        blocks += `<div class="pdl-inst-state" data-pdl-state="${escapeAttr(stateName)}" hidden>${frag}</div>`;
      }
      const chromeParam = instCtx.chromeStateParams?.[key] || "interactionState";
      const chromeAttr = ` data-pdl-chrome-state-param="${escapeAttr(chromeParam)}"`;
      return `<div class="pdl-instance"${inst}${kwargsAttr}${pointerAttr}${sessionAttr}${letAttr}${foreachAttr}${chromeAttr} data-pdl-instance-key="${escapeAttr(key)}">${blocks}</div>`;
    }
  }

  if (kind === "layout") {
    const isStack = isStackDirection(props.direction);
    const layered = layoutLayerBandsActive(props);
    if (layered) {
      // Shell holds chrome (radius, outside border, drop shadow, layer bands).
      // Inside border is an overlay above bands/content. Overflow lives on
      // `__content` so background/foreground do not scroll with children.
      const shellStyle = mergeInlineStyles(
        frameBoxStyle(props, "layout", frameOpts),
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
        .map((ch, i) =>
          renderFrame(ch, stackChildOpts(props.direction, i, kids.length, frameOpts), instCtx),
        )
        .join("");
      const inner = `<div class="pdl-layout__content" style="${escapeStyleAttr(innerStyle)}">${innerKids}</div>`;
      const { style, html } = withInsideBorderOverlay(shellStyle, props, `${under}${inner}${over}`);
      return `<div class="pdl-frame pdl-layout pdl-layout--layers"${dataId}${instAttrs} style="${escapeStyleAttr(style)}">${html}</div>`;
    }
    const shellStyle = mergeInlineStyles(
      frameBoxStyle(props, "layout", frameOpts),
      isStack ? "position:relative" : "",
    );
    const inner = kids
      .map((ch, i) =>
        renderFrame(ch, stackChildOpts(props.direction, i, kids.length, frameOpts), instCtx),
      )
      .join("");
    const { style, html } = withInsideBorderOverlay(shellStyle, props, inner);
    return `<div class="pdl-frame pdl-layout"${dataId}${instAttrs} style="${escapeStyleAttr(style)}">${html}</div>`;
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
      ...(frameOpts.stackChild ? stackCellDecls(frameOpts.stackZ) : []),
    );
    // activatesOn=.none and not editing → paint as inert text (not an <input>).
    // .press idle is a clickable hit target, not a readonly input — iOS would
    // otherwise open the keyboard without Title.began / Search.began.
    const activation = textFieldActivationMode(frameOpts.sessionParams);
    const editingNow = sessionParamIsEditing(frameOpts.sessionParams);
    const suppressEditableHitTarget =
      Boolean(editableBind) && activation === "none" && !editingNow;
    const pressIdle = Boolean(editableBind) && activation === "press" && !editingNow;
    const hasSessionValue =
      frameOpts.sessionParams != null &&
      Object.prototype.hasOwnProperty.call(frameOpts.sessionParams, "value");
    const sessionVal = hasSessionValue
      ? String(frameOpts.sessionParams!.value ?? "")
      : content;
    if (pressIdle) {
      const display = sessionVal !== "" ? sessionVal : content;
      const style = mergeInlineStyles(
        textInlineStyle(props),
        itemStack,
        "cursor:pointer",
        "user-select:none",
        "box-sizing:border-box",
      );
      return `<span class="pdl-frame pdl-text pdl-text--press-hit" role="textbox" tabindex="0"${dataId}${instAttrs} data-pdl-editable="${escapeAttr(String(editableBind))}" data-pdl-press-activate="1" style="${escapeStyleAttr(style)}">${escapeHtml(display)}</span>`;
    }
    if (editableBind && !suppressEditableHitTarget) {
      // Session `value` is the input buffer; baked `content` is presentation
      // (placeholder / mask). Never seed the DOM value from placeholder copy.
      const placeholderAttr =
        hasSessionValue && !editingNow && sessionVal === "" && content !== ""
          ? ` placeholder="${escapeAttr(content)}"`
          : "";
      const style = mergeInlineStyles(
        textInlineStyle(props),
        itemStack,
        ...editableInputHostDecls(props),
      );
      return `<input class="pdl-frame pdl-text pdl-text--editable" type="text"${dataId}${instAttrs} data-pdl-editable="${escapeAttr(editableBind)}" value="${escapeAttr(sessionVal)}"${placeholderAttr} style="${escapeStyleAttr(style)}" />`;
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
      const body = `${under}<span class="pdl-text__inner" style="${escapeStyleAttr(innerStyle)}">${escapeHtml(content)}</span>${over}`;
      const { style, html } = withInsideBorderOverlay(wrapStyle, props, body);
      return `<span class="pdl-frame pdl-text pdl-text--layers"${dataId}${instAttrs} style="${escapeStyleAttr(style)}">${html}</span>`;
    }
    if (clamped) {
      // Outer keeps frame size / align / overflow; inner always hides excess lines.
      const outer = mergeInlineStyles(textClampOuterStyle(props), itemStack);
      const inner = textClampInnerStyle(props);
      const body = `<span class="pdl-text__clamp" style="${escapeStyleAttr(inner)}">${escapeHtml(content)}</span>`;
      const { style, html } = withInsideBorderOverlay(outer, props, body);
      return `<span class="pdl-frame pdl-text"${dataId}${instAttrs} style="${escapeStyleAttr(style)}">${html}</span>`;
    }
    const shellStyle = mergeInlineStyles(textInlineStyle(props), itemStack);
    const { style, html } = withInsideBorderOverlay(shellStyle, props, escapeHtml(content));
    return `<span class="pdl-frame pdl-text"${dataId}${instAttrs} style="${escapeStyleAttr(style)}">${html}</span>`;
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
    const iconVal = props.icon;
    const label = isEvaluatedIconRef(iconVal)
      ? iconRefLabel(iconVal)
      : typeof iconVal === "string"
        ? iconVal
        : id;
    const sz = finiteNum(props.size) ?? 24;
    const fontPx = Math.max(8, Math.min(11, Math.round(sz * 0.28)));
    // Pack-relative file icons: try <img>; system icons stay swatch + label (host maps SF/Material).
    const fileSrc =
      isEvaluatedIconRef(iconVal) && iconVal.source === "file"
        ? iconVal.path
        : typeof iconVal === "string" && isPackRelativeFilePath(iconVal)
          ? iconVal
          : "";
    if (fileSrc && /\.(svg|png|webp|jpg|jpeg|gif)$/i.test(fileSrc)) {
      const imgStyle = mergeInlineStyles(
        style,
        "background-color:transparent",
        "padding:0",
        "object-fit:contain",
      );
      // <img> cannot host an inside-border overlay child; wrap when needed.
      const overlay = insideBorderOverlayHtml(props);
      if (overlay) {
        const { style: wrapStyle, html } = withInsideBorderOverlay(
          mergeInlineStyles(imgStyle, "display:inline-block"),
          props,
          `<img class="pdl-icon__img" src="${escapeAttr(fileSrc)}" alt="${escapeAttr(label)}" style="display:block;width:100%;height:100%;object-fit:contain;border:none" />`,
        );
        return `<div class="pdl-frame pdl-icon pdl-icon--file"${dataId}${instAttrs} style="${escapeStyleAttr(wrapStyle)}">${html}</div>`;
      }
      return `<img class="pdl-frame pdl-icon pdl-icon--file"${dataId}${instAttrs} src="${escapeAttr(fileSrc)}" alt="${escapeAttr(label)}" style="${escapeStyleAttr(imgStyle)}" />`;
    }
    const sysHint =
      isEvaluatedIconRef(iconVal) && iconVal.source === "system"
        ? ` data-pdl-icon-system="${escapeAttr(iconVal.system)}" data-pdl-icon-name="${escapeAttr(iconVal.name)}"`
        : "";
    const caption = `<span class="pdl-icon__name" style="color:#fff;font-size:${fontPx}px;font-weight:600;line-height:1.1;text-align:center;padding:1px;text-shadow:0 0 2px rgba(0,0,0,0.55);word-break:break-all">${escapeHtml(label)}</span>`;
    const { style: iconStyle, html: iconHtml } = withInsideBorderOverlay(style, props, caption);
    return `<div class="pdl-frame pdl-icon"${dataId}${instAttrs}${sysHint} style="${escapeStyleAttr(iconStyle)}" role="img" aria-label="${escapeAttr(label)}">${iconHtml}</div>`;
  }

  if (kind === "media") {
    const src = mediaSourceHref(props.source);
    const label = typeof props.label === "string" ? props.label : id;
    const style = mediaFrameStyle(props, opts);
    const mediaKind =
      isEvaluatedMediaSourceRef(props.source) && props.source.mediaKind
        ? props.source.mediaKind
        : undefined;
    const isAddress =
      /^https?:\/\//i.test(src) ||
      src.startsWith("/") ||
      src.startsWith("./") ||
      isPackRelativeFilePath(src);
    const hasSrc = isAddress && src.length > 0;
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
      const innerStyle = mergeInlineStyles(
        "position:relative",
        "z-index:1",
        "width:100%",
        "height:100%",
        "display:block",
        objectFitFromContentMode(props.contentMode),
        (() => {
          const pos = mediaContentPositionCss(props.justify, props.align);
          return pos ? `object-position:${pos}` : undefined;
        })(),
      );
      let mediaInner: string;
      if (!hasSrc) {
        mediaInner = `<div class="pdl-media__placeholder" style="${escapeStyleAttr(innerStyle)};min-height:24px" role="img" aria-label="${escapeAttr(label)}"></div>`;
      } else if (mediaKind === "video") {
        mediaInner = `<video class="pdl-media__img" src="${escapeAttr(src)}" style="${escapeStyleAttr(innerStyle)}" playsinline muted loop aria-label="${escapeAttr(label)}"></video>`;
      } else {
        mediaInner = `<img class="pdl-media__img" src="${escapeAttr(src)}" alt="${escapeAttr(label)}" style="${escapeStyleAttr(innerStyle)}" />`;
      }
      const { style: mediaStyle, html } = withInsideBorderOverlay(
        wrapStyle,
        props,
        `${under}${mediaInner}${over}`,
      );
      return `<div class="pdl-frame pdl-media pdl-media--layers"${dataId}${instAttrs} style="${escapeStyleAttr(mediaStyle)}">${html}</div>`;
    }
    if (hasSrc && mediaKind === "video") {
      const overlay = insideBorderOverlayHtml(props);
      if (overlay) {
        const { style: wrapStyle, html } = withInsideBorderOverlay(
          mergeInlineStyles(style, "display:inline-block"),
          props,
          `<video class="pdl-media__img" src="${escapeAttr(src)}" style="display:block;width:100%;height:100%;border:none" playsinline muted loop aria-label="${escapeAttr(label)}"></video>`,
        );
        return `<div class="pdl-frame pdl-media"${dataId}${instAttrs} style="${escapeStyleAttr(wrapStyle)}">${html}</div>`;
      }
      return `<video class="pdl-frame pdl-media"${dataId}${instAttrs} src="${escapeAttr(src)}" style="${escapeStyleAttr(style)}" playsinline muted loop aria-label="${escapeAttr(label)}"></video>`;
    }
    if (hasSrc) {
      const overlay = insideBorderOverlayHtml(props);
      if (overlay) {
        const { style: wrapStyle, html } = withInsideBorderOverlay(
          mergeInlineStyles(style, "display:inline-block"),
          props,
          `<img class="pdl-media__img" src="${escapeAttr(src)}" alt="${escapeAttr(label)}" style="display:block;width:100%;height:100%;border:none" />`,
        );
        return `<div class="pdl-frame pdl-media"${dataId}${instAttrs} style="${escapeStyleAttr(wrapStyle)}">${html}</div>`;
      }
      return `<img class="pdl-frame pdl-media"${dataId}${instAttrs} src="${escapeAttr(src)}" alt="${escapeAttr(label)}" style="${escapeStyleAttr(style)}" />`;
    }
    const { style: mediaStyle, html: mediaHtml } = withInsideBorderOverlay(style, props, "");
    return `<div class="pdl-frame pdl-media"${dataId}${instAttrs} style="${escapeStyleAttr(mediaStyle)}" role="img" aria-label="${escapeAttr(label)}">${mediaHtml}</div>`;
  }

  const fallbackStyle = frameBoxStyle(props, kind, frameOpts);
  const inner = kids
    .map((ch) =>
      renderFrame(
        ch,
        { stackChild: false, stackZ: 0, sessionParams: frameOpts.sessionParams },
        instCtx,
      ),
    )
    .join("");
  return `<div class="pdl-frame pdl-unknown" data-pdl-kind="${escapeAttr(kind)}"${dataId}${instAttrs} style="${escapeStyleAttr(fallbackStyle)}">${inner}</div>`;
}

function renderComponentBody(comp: BakedComponentJson, instCtx?: InstanceRenderCtx): string {
  const bp = { ...((comp.bakedParams ?? {}) as Record<string, unknown>) };
  if (
    (Object.prototype.hasOwnProperty.call(bp, "isEditing") ||
      Object.prototype.hasOwnProperty.call(bp, "activatesOn")) &&
    bp.value == null
  ) {
    bp.value = "";
  }
  return renderFrame(
    comp.root,
    {
      stackChild: false,
      stackZ: 0,
      sessionParams: bp,
      isTreeRoot: true,
      instancePath: comp.name,
    },
    instCtx,
  );
}

const BASE_CSS = `
:root { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; padding: 16px; background: var(--pdl-preview-background, #f6f6f6); color: #111; }
html:has(body.pdl-device-stage),
body.pdl-device-stage {
  height: 100%;
  min-height: 100%;
  padding: 0;
  margin: 0;
  overflow: hidden;
}
body.pdl-device-stage .pdl-doc-title,
body.pdl-device-stage .pdl-meta,
body.pdl-device-stage .pdl-source-link,
body.pdl-device-stage .pdl-preview-params,
body.pdl-device-stage .pdl-preview-head,
body.pdl-device-stage .pdl-usage,
body.pdl-device-stage .pdl-rule-list,
body.pdl-device-stage .pdl-fixture-bar,
body.pdl-device-stage .pdl-param-bar {
  display: none !important;
}
body.pdl-device-stage .pdl-gallery {
  display: flex;
  gap: 0;
  height: 100%;
  min-height: 100%;
}
body.pdl-device-stage .pdl-preview {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 0;
  padding: 24px;
  margin: 0;
  min-height: 100%;
  height: 100%;
  box-sizing: border-box;
  background: transparent;
}
body.pdl-device-stage .pdl-motion-bar {
  display: flex;
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  margin: 0;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
  justify-content: center;
  background: transparent;
  border: none;
}
body.pdl-device-stage .pdl-motion-replay {
  min-height: 44px;
  padding: 10px 18px;
  font-size: 16px;
  border-radius: 10px;
}
body.pdl-device-stage .pdl-canvas {
  border: none;
  border-radius: 0;
  padding: 0;
  width: max-content;
  max-width: 100%;
  height: auto;
  max-height: 100%;
}
body.pdl-device-stage .pdl-canvas--fill-width {
  width: 100%;
  max-width: 100%;
  align-self: stretch;
}
body.pdl-device-stage .pdl-canvas--fill-height {
  height: 100%;
  min-height: 0;
  max-height: 100%;
  align-self: stretch;
  overflow: auto;
}
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
.pdl-usage { font-size: 0.8rem; color: #52525b; margin: 0 0 10px; max-width: 72ch; line-height: 1.4; }
.pdl-rule-list { list-style: none; margin: 0 0 10px; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.pdl-rule {
  font-size: 0.78rem;
  line-height: 1.35;
  padding: 7px 9px;
  border-radius: 5px;
  border: 1px solid;
}
.pdl-rule--error { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
.pdl-rule--warn { background: #fff7ed; border-color: #fed7aa; color: #9a3412; }
.pdl-rule-strength { font-weight: 650; text-transform: uppercase; letter-spacing: 0.02em; font-size: 0.68rem; }
.pdl-rule-where { color: inherit; opacity: 0.75; }
[data-pdl-rule="error"] { outline: 2px solid #dc2626; outline-offset: 2px; }
[data-pdl-rule="warn"] { outline: 2px solid #ea580c; outline-offset: 2px; }
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
  margin: 0 0 8px;
  font-size: 0.72rem;
  color: #778;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.pdl-preview-params > summary {
  cursor: pointer;
  list-style: none;
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}
.pdl-preview-params > summary::-webkit-details-marker { display: none; }
.pdl-preview-params > summary::before {
  content: "▸";
  flex: 0 0 auto;
  color: #99a;
  font-size: 0.7rem;
}
.pdl-preview-params[open] > summary::before { content: "▾"; }
.pdl-preview-params-line {
  flex: 1 1 auto;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pdl-preview-params-hint {
  flex: 0 0 auto;
  font-size: 0.68rem;
  color: #99a;
  font-family: system-ui, sans-serif;
}
.pdl-preview-params[open] .pdl-preview-params-hint { visibility: hidden; }
.pdl-preview-params-full {
  margin: 6px 0 0;
  padding: 8px 10px;
  background: #f4f6f8;
  border: 1px solid #e2e6eb;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.72rem;
  color: #556;
  max-height: 220px;
  overflow: auto;
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
/* PointerInput host — hand cursor over the interactive preview stage / nested instances. */
.pdl-preview[data-pdl-interactive] .pdl-canvas,
.pdl-instance[data-pdl-pointer-input] {
  cursor: pointer;
  touch-action: manipulation;
}
.pdl-text--editable::placeholder { opacity: 1; color: inherit; }
.pdl-text--editable {
  cursor: text;
}
/* Preview stage when the root uses height=.fill — scroll view has no intrinsic
   height, so give percentage fill a sensible containing block. */
.pdl-canvas--fill-height {
  height: 240px;
  min-height: 240px;
  overflow: auto;
}
.pdl-param-bar,
.pdl-fixture-bar {
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
.pdl-fixture-bar {
  background: #f4f7fb;
  border-color: #d0dae8;
}
.pdl-motion-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin: 0 0 10px;
  padding: 8px 10px;
  background: #f7f4fb;
  border: 1px solid #ddd0e8;
  border-radius: 6px;
}
.pdl-motion-replay {
  font: inherit;
  font-size: 0.78rem;
  font-weight: 500;
  padding: 4px 10px;
  border: 1px solid #b9a8cc;
  border-radius: 4px;
  background: #fff;
  color: #445;
  cursor: pointer;
}
.pdl-frame,
.pdl-instance {
  transform-origin: center;
}
.pdl-param-bar label,
.pdl-fixture-bar label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-weight: 500;
  color: #445;
}
.pdl-param-bar select,
.pdl-param-bar input,
.pdl-fixture-bar select {
  font: inherit;
  font-weight: 400;
  padding: 4px 6px;
  border: 1px solid #bbc;
  border-radius: 4px;
  min-width: 7rem;
  background: #fff;
}
.pdl-fixture-bar select {
  min-width: 11rem;
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

function rootUsesWidthFill(comp: BakedComponentJson): boolean {
  const root = comp.root as { props?: Record<string, unknown> } | undefined;
  return root?.props?.width === "fill";
}

function wrapPdlCanvas(comp: BakedComponentJson, instCtx?: InstanceRenderCtx): string {
  const bits = ["pdl-canvas"];
  if (rootUsesWidthFill(comp)) bits.push("pdl-canvas--fill-width");
  if (rootUsesHeightFill(comp)) bits.push("pdl-canvas--fill-height");
  return `<div class="${bits.join(" ")}">${renderComponentBody(comp, instCtx)}</div>`;
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
        const boolLike = c.typeName === "Bool" || c.typeName === "Boolean";
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

/** §11 scenario fixture picker — per component, next to param knobs. */
function renderFixtureBar(
  componentName: string,
  spec: { labels: string[]; active?: string | null } | undefined,
): string {
  if (!spec?.labels?.length) return "";
  const id = `pdl-fixture-${escapeAttr(componentName)}`;
  const active = spec.active && spec.labels.includes(spec.active) ? spec.active : "";
  const opts = [
    `<option value=""${active === "" ? " selected" : ""}>— Defaults —</option>`,
    ...spec.labels.map((label) => {
      const sel = label === active ? " selected" : "";
      return `<option value="${escapeAttr(label)}"${sel}>${escapeHtml(label)}</option>`;
    }),
  ].join("");
  return `<div class="pdl-fixture-bar" data-pdl-fixture-bar="${escapeAttr(componentName)}"><label for="${id}">Fixture<select id="${id}" data-pdl-fixture>${opts}</select></label></div>`;
}

function catalogueDeclsHaveMotionPlayback(decls: unknown): boolean {
  if (!Array.isArray(decls)) return false;
  for (const d of decls) {
    if (!d || typeof d !== "object") continue;
    const handlers = (d as { handlers?: unknown[] }).handlers;
    if (!Array.isArray(handlers)) continue;
    for (const h of handlers) {
      if (!h || typeof h !== "object") continue;
      const rec = h as { event?: string; motion?: { from?: unknown; to?: unknown } };
      if (rec.event === "appear" || rec.event === "dismiss") return true;
      if (rec.motion && (rec.motion.from || rec.motion.to)) return true;
    }
  }
  return false;
}

function renderMotionReplayBar(componentName: string, show: boolean): string {
  if (!show) return "";
  return `<div class="pdl-motion-bar" data-pdl-motion-bar="${escapeAttr(componentName)}"><button type="button" class="pdl-motion-replay" data-pdl-motion-replay="${escapeAttr(componentName)}">Replay motion</button></div>`;
}

function renderUsageBlock(text: string | undefined): string {
  const t = text?.trim();
  if (!t) return "";
  return `<p class="pdl-usage">${escapeHtml(t)}</p>`;
}

function strengthLabel(strength: string): string {
  if (strength === "must") return "Must";
  if (strength === "mustNot") return "Must not";
  if (strength === "shouldNot") return "Should not";
  return "Should";
}

function renderRuleList(violations: RuleViolation[], rootComponent: string): string {
  if (!violations.length) return "";
  const items = violations
    .map((v) => {
      const tone = v.severity === "error" ? "error" : "warn";
      const where =
        v.instancePath === rootComponent || v.instancePath === v.component
          ? ""
          : ` <span class="pdl-rule-where">on ${escapeHtml(v.instancePath)}</span>`;
      return `<li class="pdl-rule pdl-rule--${tone}"><span class="pdl-rule-strength">${escapeHtml(strengthLabel(v.strength))}</span> — ${escapeHtml(v.message)}${where}</li>`;
    })
    .join("");
  return `<ul class="pdl-rule-list" data-pdl-rules="${violations.length}">${items}</ul>`;
}

/** Compact one-line JSON + expandable pretty block for preview param bags. */
function renderParamsBlock(bakedParams: unknown): string {
  const compact = JSON.stringify(bakedParams ?? {});
  const pretty = JSON.stringify(bakedParams ?? {}, null, 2);
  return `<details class="pdl-preview-params" data-json="${escapeAttr(compact)}"><summary><span class="pdl-preview-params-line">${escapeHtml(compact)}</span><span class="pdl-preview-params-hint">Expand</span></summary><pre class="pdl-preview-params-full">${escapeHtml(pretty)}</pre></details>`;
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
    /** `device` hides lab chrome and enlarges fixture/variant/replay hit targets. */
    hostChrome?: "lab" | "device";
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
    /** Per-component §11 fixture selectors (labels + active scenario). */
    fixtureControlsByComponent?: Record<
      string,
      { labels: string[]; active?: string | null }
    >;
    /** Declaration sites for "Source file" links (`path` + 1-based `line`). */
    componentSourcesByComponent?: Record<string, { path: string; line: number }>;
    /**
     * Per nested-instance interaction state trees (hovered/pressed/…), keyed by
     * document order (`i0`, `i1`, …) matching `[data-pdl-instance-key]`.
     */
    instanceStateTrees?: Record<string, Record<string, BakedComponentJson>>;
    /** Parallel to `instanceStateTrees`: which param drives chrome (`state`, `interactionState`, …). */
    instanceChromeStateParams?: Record<string, string>;
    /** Per top-level component chrome SoT param (when `stateTrees` are present). */
    componentChromeStateParams?: Record<string, string>;
    /**
     * Resolved CSS color for document chrome (`previewBackground` token).
     * Falls back to `doc.previewBackground` when set by bake.
     */
    previewBackground?: string;
    /** `usage.description` keyed by component name. */
    usageByComponent?: Record<string, string>;
    /** Flattened `rules` (tag ops + Rule lines) keyed by component name. */
    rulesByComponent?: Record<string, RulesPreviewJson>;
    /**
     * Catalogue type defaults for EditableText (`activatesOn`, …). Nested
     * instance kwargs omit these; without them the host invents `.focus`.
     */
    editableTypeDefaults?: Record<string, Record<string, unknown>>;
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
  const pointerInputTypes = pointerInputTypesFromInteractions(opts.interactionsByComponent);
  const editableSessionDefaults = editableSessionDefaultsFromDoc(doc, opts.editableTypeDefaults);
  const rulesByComponent = opts.rulesByComponent ?? {};
  const usageByComponent = opts.usageByComponent ?? {};
  const instCtx: InstanceRenderCtx | undefined =
    opts.instanceStateTrees ||
    pointerInputTypes.size > 0 ||
    Object.keys(editableSessionDefaults).length > 0 ||
    Object.keys(rulesByComponent).length > 0
      ? {
          nextKey: 0,
          stateTrees: opts.instanceStateTrees ?? {},
          chromeStateParams: opts.instanceChromeStateParams,
          pointerInputTypes,
          editableSessionDefaults,
        }
      : undefined;

  const sections = list
    .map((name) => {
      const comp = doc.components[name]!;
      const paramsBlock = renderParamsBlock(comp.bakedParams ?? {});
      try {
        const violations = evaluateRulesForPreview(comp, rulesByComponent);
        const ruleMarks = ruleMarksFromViolations(violations);
        const sectionInstCtx: InstanceRenderCtx | undefined =
          instCtx || Object.keys(ruleMarks).length > 0
            ? {
                nextKey: 0,
                stateTrees: instCtx?.stateTrees ?? {},
                chromeStateParams: instCtx?.chromeStateParams,
                pointerInputTypes: instCtx?.pointerInputTypes,
                editableSessionDefaults: instCtx?.editableSessionDefaults,
                ruleMarks,
              }
            : undefined;
        const body = wrapPdlCanvas(comp, sectionInstCtx);
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
        // EditableText injects isEditing / activatesOn even with zero author handlers.
        // Without this, the native <input> still accepts typing but the session host
        // never attaches — isEditing stays false and layout chrome never updates.
        const hasEditableTextSession = (() => {
          const bp = (comp.bakedParams ?? {}) as Record<string, unknown>;
          if (frameLooksEditableSession(bp)) return true;
          const walk = (nodes: unknown): boolean => {
            if (!Array.isArray(nodes)) return false;
            for (const n of nodes) {
              if (!n || typeof n !== "object") continue;
              const rec = n as Record<string, unknown>;
              const of = rec.instanceOf;
              if (typeof of === "string") {
                const nestedBp = (doc.components[of]?.bakedParams ?? {}) as Record<
                  string,
                  unknown
                >;
                if (frameLooksEditableSession(nestedBp)) return true;
                // Parent-only bake (e.g. NoteEditor) omits NoteField from doc.components —
                // detect EditableText via instance kwargs on the nested frame.
                if (
                  frameLooksEditableSession(
                    (rec.instanceKwargs ?? {}) as Record<string, unknown>,
                  )
                ) {
                  return true;
                }
              }
              if (walk(rec.children)) return true;
            }
            return false;
          };
          return walk(comp.root?.children ?? (comp as { children?: unknown }).children);
        })();
        const hasInteraction =
          opts.interactiveHost &&
          (hasOwnIx || hasCaptures || hasNestedIx || hasEditableTextSession);
        const interactiveAttr = hasInteraction ? ` data-pdl-interactive="1"` : "";
        const chromeParamName = opts.componentChromeStateParams?.[name];
        const chromeAttr =
          stateExtra && chromeParamName
            ? ` data-pdl-chrome-state-param="${escapeAttr(chromeParamName)}"`
            : stateExtra
              ? ` data-pdl-chrome-state-param="interactionState"`
              : "";
        const fixtureBar = renderFixtureBar(name, opts.fixtureControlsByComponent?.[name]);
        const paramBar = renderParamBar(name, opts.paramControlsByComponent?.[name]);
        const hasMotionPlayback =
          catalogueDeclsHaveMotionPlayback(opts.interactionsByComponent?.[name]) ||
          (() => {
            const walk = (nodes: unknown): boolean => {
              if (!Array.isArray(nodes)) return false;
              for (const n of nodes) {
                if (!n || typeof n !== "object") continue;
                const rec = n as { instanceOf?: string; children?: unknown };
                if (
                  typeof rec.instanceOf === "string" &&
                  catalogueDeclsHaveMotionPlayback(opts.interactionsByComponent?.[rec.instanceOf])
                ) {
                  return true;
                }
                if (walk(rec.children)) return true;
              }
              return false;
            };
            return walk(comp.root?.children ?? (comp as { children?: unknown }).children);
          })();
        const motionBar = renderMotionReplayBar(name, hasMotionPlayback);
        const motionAttr = hasMotionPlayback ? ` data-pdl-motion="1"` : "";
        const sourceLink = renderSourceFileLink(name, opts.componentSourcesByComponent?.[name]);
        const usageBlock = renderUsageBlock(usageByComponent[name]);
        const ruleBlock = renderRuleList(violations, name);
        return `<section class="pdl-preview" data-pdl-component="${escapeAttr(name)}"${interactiveAttr}${chromeAttr}${motionAttr}><div class="pdl-preview-head"><h2 class="pdl-preview-title">${escapeHtml(name)}</h2>${sourceLink}</div>${usageBlock}${ruleBlock}${fixtureBar}${paramBar}${motionBar}${paramsBlock}${restWrap}</section>`;
      } catch (err) {
        const message = formatThrownMessage(err);
        const stack = formatThrownStack(err);
        renderFailures.push({ component: name, message, stack });
        const stackBlock =
          stack !== undefined
            ? `<details style="margin-top:8px"><summary style="cursor:pointer;font-size:0.82rem">Stack trace</summary><pre class="pdl-render-error-stack">${escapeHtml(stack)}</pre></details>`
            : "";
        const sourceLink = renderSourceFileLink(name, opts.componentSourcesByComponent?.[name]);
        return `<section class="pdl-preview pdl-preview--render-error" data-pdl-component="${escapeAttr(name)}"><span class="pdl-render-error-badge">HTML render failed</span><div class="pdl-preview-head"><h2 class="pdl-preview-title">${escapeHtml(name)}</h2>${sourceLink}</div>${paramsBlock}<pre class="pdl-render-error-msg">${escapeHtml(message)}</pre>${stackBlock}</section>`;
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
    if (cond.kind === 'truthy') {
      var tv = params[cond.param];
      if (typeof tv === 'boolean') return tv;
      var ts = tv == null ? '' : String(tv);
      return ts === 'true' || ts === '1';
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
  function numberish(v) {
    if (typeof v === 'number' && isFinite(v)) return v;
    if (v && typeof v === 'object') {
      if (typeof v.value === 'number' && isFinite(v.value)) return v.value;
    }
    return undefined;
  }
  function snapshotFromProps(props) {
    var snap = {};
    if (!props || typeof props !== 'object') return snap;
    ['opacity','scale','scaleX','scaleY','translateX','translateY','blur'].forEach(function(k){
      var n = numberish(props[k]);
      if (n != null) snap[k] = n;
    });
    return snap;
  }
  function motionFromHandler(h) {
    var m = (h && h.motion && typeof h.motion === 'object') ? Object.assign({}, h.motion) : {};
    if ((m.pose && Object.keys(m.pose).length) || (m.from && Object.keys(m.from).length) || (m.to && Object.keys(m.to).length) || m.transition) {
      return m;
    }
    function transitionFromValue(v) {
      if (!v || typeof v !== 'object') return null;
      var inner = v.transition || v;
      var dur = numberish(inner.duration);
      var delay = numberish(inner.delay);
      var easing = typeof inner.easing === 'string' ? inner.easing : (inner.easing && inner.easing.value);
      if (dur == null) return null;
      return { duration: dur, easing: easing || 'linear', delay: delay || 0 };
    }
    function poseFromValue(v) {
      if (!v || typeof v !== 'object') return null;
      var props = v.props || v;
      var snap = snapshotFromProps(props);
      return Object.keys(snap).length ? snap : null;
    }
    function staggerFromValue(v) {
      if (!v || typeof v !== 'object') return null;
      var step = numberish(v.step != null ? v.step : v.ms);
      var from = typeof v.from === 'string' ? v.from.replace(/^\\./, '') : (v.staggerFrom || (v.from && v.from.value));
      if (from && typeof from === 'string') from = from.replace(/^\\./, '');
      var out = {};
      if (step != null) out.stagger = step;
      if (from === 'first' || from === 'last') out.staggerFrom = from;
      return Object.keys(out).length ? out : null;
    }
    (h && h.body || []).forEach(function(item){
      if (!item || typeof item !== 'object') return;
      if (item.kind !== 'animate') return;
      var v = item.value || {};
      if (v.kind === 'motion') {
        var t = transitionFromValue(v.transition);
        if (t) m.transition = t;
        var pose = poseFromValue(v.pose);
        if (pose) m.pose = pose;
        var st = staggerFromValue(v.stagger);
        if (st) { if (st.stagger != null) m.stagger = st.stagger; if (st.staggerFrom) m.staggerFrom = st.staggerFrom; }
      } else {
        var t2 = transitionFromValue(v);
        if (t2) m.transition = t2;
      }
    });
    return m;
  }
  function motionByEvent(decls) {
    var map = {};
    (decls || []).forEach(function(d){
      (d.handlers || []).forEach(function(h){
        if (h && h.event) map[h.event] = motionFromHandler(h);
      });
    });
    return map;
  }
  function prefersReducedMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
  }
  function snapshotCss(snap, restOpacity) {
    snap = snap || {};
    var tx = snap.translateX != null ? snap.translateX : 0;
    var ty = snap.translateY != null ? snap.translateY : 0;
    var sx = snap.scaleX != null ? snap.scaleX : (snap.scale != null ? snap.scale : 1);
    var sy = snap.scaleY != null ? snap.scaleY : (snap.scale != null ? snap.scale : 1);
    var op = snap.opacity != null ? snap.opacity : restOpacity;
    var blur = snap.blur != null ? snap.blur : 0;
    return {
      transform: 'translate(' + tx + 'px, ' + ty + 'px) scale(' + sx + ', ' + sy + ')',
      opacity: String(op),
      filter: blur > 0 ? ('blur(' + blur + 'px)') : 'none'
    };
  }
  function identitySnap(restOpacity) {
    return { opacity: restOpacity, scale: 1, scaleX: 1, scaleY: 1, translateX: 0, translateY: 0, blur: 0 };
  }
  function implicitTransitionCss(t) {
    if (!t || !(t.duration > 0)) return 'none';
    var delay = t.delay > 0 ? (' ' + t.delay + 'ms') : '';
    var props = ['opacity','background-color','border-color','box-shadow','color','transform','filter'];
    return props.map(function(p){ return p + ' ' + t.duration + 'ms ' + (t.easing || 'linear') + delay; }).join(', ');
  }
  function applyImplicitTransition(el, spec) {
    if (!el || !spec || !spec.transition) return;
    if (prefersReducedMotion()) return;
    var css = implicitTransitionCss(spec.transition);
    if (css === 'none') return;
    el.setAttribute('data-pdl-transition', css);
    try {
      el.style.transition = css;
      el.style.transformOrigin = 'center';
    } catch (e) {}
  }
  function isMotionChild(c) {
    if (!c || c.nodeType !== 1) return false;
    if (c.hidden || c.getAttribute('hidden') != null) return false;
    if (c.classList && (c.classList.contains('pdl-border-inside') || c.classList.contains('pdl-layer-band'))) return false;
    return (c.classList && (c.classList.contains('pdl-frame') || c.classList.contains('pdl-instance'))) ||
      c.hasAttribute('data-pdl-instance-of');
  }
  function directMotionChildren(el) {
    var out = [];
    if (!el) return out;
    var parent = (el.querySelector && el.querySelector(':scope > .pdl-layout__content')) || el;
    if (!parent || !parent.children) return out;
    for (var i = 0; i < parent.children.length; i++) {
      if (isMotionChild(parent.children[i])) out.push(parent.children[i]);
    }
    return out;
  }
  function motionRootEl(section) {
    var canvas = section.querySelector('.pdl-state:not([hidden]) .pdl-canvas, .pdl-canvas');
    if (!canvas) canvas = section.querySelector('.pdl-state:not([hidden])');
    if (!canvas) return null;
    return canvas.querySelector(':scope > .pdl-frame, :scope > .pdl-instance') || canvas.firstElementChild;
  }
  function playMotionOnEl(el, spec, mode) {
    if (!el || !spec || typeof el.animate !== 'function') return null;
    try {
      if (el.getAnimations) el.getAnimations().forEach(function(x){ x.cancel(); });
    } catch (e) {}
    // Rest pose is identity, not the current overlay (dismiss fill would make
    // appear tween back to opacity 0).
    var rest = 1;
    var ident = identitySnap(rest);
    var from = ident;
    var to = ident;
    var pose = spec.pose || (mode === 'appear' ? spec.from : spec.to);
    if (!pose) return null;
    if (mode === 'appear') {
      from = Object.assign({}, ident, pose);
    } else if (mode === 'dismiss') {
      to = Object.assign({}, ident, pose);
    } else {
      return null;
    }
    var t = spec.transition || { duration: 0, easing: 'linear', delay: 0 };
    var reduced = prefersReducedMotion();
    var duration = (reduced || !(t.duration > 0)) ? 0 : t.duration;
    var delay = reduced ? 0 : (t.delay || 0);
    var a = snapshotCss(from, rest);
    var b = snapshotCss(to, rest);
    return el.animate(
      [{ transform: a.transform, opacity: a.opacity, filter: a.filter }, { transform: b.transform, opacity: b.opacity, filter: b.filter }],
      { duration: duration, easing: t.easing || 'linear', delay: delay, fill: 'forwards' }
    );
  }
  function playMotionTree(el, spec, mode) {
    if (!el || !spec) return null;
    var step = spec.stagger || 0;
    var kids = step > 0 ? directMotionChildren(el) : [];
    if (step > 0 && kids.length) {
      var last = null;
      var n = kids.length;
      for (var i = 0; i < n; i++) {
        var idx = spec.staggerFrom === 'last' ? n - 1 - i : i;
        var childSpec = Object.assign({}, spec, {
          transition: Object.assign({}, spec.transition || {}, {
            delay: ((spec.transition && spec.transition.delay) || 0) + idx * step
          })
        });
        last = playMotionOnEl(kids[i], childSpec, mode) || last;
      }
      return last;
    }
    return playMotionOnEl(el, spec, mode);
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
      if (item.kind === 'hostVerb' && item.name) {
        if (item.qualifier) return; // nested target — HTML session host below
        var args = (item.args || []).map(String);
        if (item.name === 'beginEditing') {
          var seedName = (args[0] || 'value').replace(/^self\./, '');
          var seed = Object.prototype.hasOwnProperty.call(params, seedName)
            ? String(params[seedName] == null ? '' : params[seedName])
            : '';
          params._editCheckpoint = String(params.value == null ? seed : params.value);
          params.value = seed;
          params.isEditing = true;
          params.isEmpty = seed.length === 0;
          changed = true;
        } else if (item.name === 'finishEditing' || item.name === 'commitEditing') {
          params.isEditing = false;
          params.isEmpty = String(params.value == null ? '' : params.value).length === 0;
          changed = true;
        } else if (item.name === 'cancelEditing') {
          if (params._editCheckpoint !== undefined) params.value = params._editCheckpoint;
          params.isEditing = false;
          params.isEmpty = String(params.value == null ? '' : params.value).length === 0;
          changed = true;
        }
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
    var raw = el.getAttribute('data-json');
    if (!raw) {
      var line = el.querySelector('.pdl-preview-params-line');
      raw = (line && line.textContent) || el.textContent || '{}';
    }
    try { return JSON.parse(raw || '{}'); } catch (e) { return {}; }
  }
  function writeParams(section, params) {
    var el = section.querySelector('.pdl-preview-params');
    if (!el) return;
    var compact = JSON.stringify(params);
    var pretty = JSON.stringify(params, null, 2);
    el.setAttribute('data-json', compact);
    var line = el.querySelector('.pdl-preview-params-line');
    var full = el.querySelector('.pdl-preview-params-full');
    if (line) line.textContent = compact;
    if (full) full.textContent = pretty;
    if (!line && !full) el.textContent = compact;
  }
  // onHostVerb(hv, nextParams) → { params, changed, localChrome } when provided (ordered body exec).
  function findEmitCapture(captures, channel, wantQual) {
    var channelCaps = [];
    for (var i = 0; i < captures.length; i++) {
      var c0 = captures[i];
      if (c0 && c0.channel === channel) channelCaps.push(c0);
    }
    if (!channelCaps.length) return null;
    if (!wantQual) return channelCaps[channelCaps.length - 1];
    for (var j = 0; j < channelCaps.length; j++) {
      if ((channelCaps[j].qualifier || null) === wantQual) return channelCaps[j];
    }
    // ForEach without data-pdl-foreach-list: sole list capture still works (LabBar).
    // Multi-list shells pass foreachList so exact match hits chips/tracks.
    if (channelCaps.length === 1) return channelCaps[0];
    return null;
  }
  function applyEmitCapture(parentParams, captures, channel, emitArgNames, childParams, qualifier, onHostVerb) {
    if (!captures || !captures.length) {
      return { params: Object.assign({}, parentParams), changed: false, handled: false, localChrome: false };
    }
    var wantQual = qualifier != null && String(qualifier).length ? String(qualifier) : null;
    var capture = findEmitCapture(captures, channel, wantQual);
    if (!capture) return { params: Object.assign({}, parentParams), changed: false, handled: false, localChrome: false };
    var scope = Object.assign({}, parentParams);
    (capture.payload || []).forEach(function(p, i){
      var src = emitArgNames[i] || p.name;
      if (Object.prototype.hasOwnProperty.call(childParams, src)) scope[p.name] = childParams[src];
      else if (Object.prototype.hasOwnProperty.call(childParams, p.name)) scope[p.name] = childParams[p.name];
    });
    var next = Object.assign({}, parentParams);
    var changed = false;
    var localChrome = false;
    (capture.body || []).forEach(function(a){
      if (!a) return;
      if (a.kind === 'hostVerb' && a.name) {
        var hv = {
          qualifier: a.qualifier || null,
          name: a.name,
          args: (a.args || []).map(String)
        };
        if (typeof onHostVerb === 'function') {
          var vr = onHostVerb(hv, next);
          next = vr.params;
          scope = Object.assign(scope, next);
          if (vr.changed) changed = true;
          if (vr.localChrome) localChrome = true;
        } else {
          changed = true;
        }
        return;
      }
      if (!a.param) return;
      var resolved = evalAssignValue(a.value, scope);
      if (a.value && typeof a.value === 'object' && a.value.kind === 'ident') {
        var nm = String(a.value.name || '');
        if (Object.prototype.hasOwnProperty.call(scope, nm)) resolved = scope[nm];
      }
      if (next[a.param] !== resolved) changed = true;
      next[a.param] = resolved;
      scope[a.param] = resolved;
    });
    return { params: next, changed: changed, handled: true, localChrome: localChrome };
  }
  function showInstEditingChrome(instNode, on) {
    if (!instNode) return false;
    var nodes = instNode.querySelectorAll(':scope > .pdl-inst-state');
    if (!nodes.length) return false;
    var want = on ? 'editing' : 'rest';
    var found = false;
    nodes.forEach(function(n){
      var match = n.getAttribute('data-pdl-state') === want;
      n.hidden = !match;
      if (match) found = true;
    });
    if (on && !found) {
      nodes.forEach(function(n){
        n.hidden = n.getAttribute('data-pdl-state') !== 'rest';
      });
    }
    return found;
  }
  // Instance let may be the <input> itself (no wrapper) — querySelector misses self.
  function liveEditableInput(root) {
    if (!root) return null;
    if (root.matches && root.matches('input.pdl-text--editable')) return root;
    return root.querySelector(
      '.pdl-inst-state:not([hidden]) input.pdl-text--editable, :scope > input.pdl-text--editable, input.pdl-text--editable'
    );
  }
  /** Ask playground to bake(childType, kwargs) and IR-patch this instance mount. */
  function requestInstanceResolve(opts) {
    if (!opts || !opts.childComponent) return;
    try {
      parent.postMessage({
        type: 'pdl-resolve-instance',
        component: opts.component || '',
        instanceLet: opts.instanceLet || '',
        childComponent: opts.childComponent,
        childParams: opts.childParams || {},
        reason: opts.reason || ''
      }, '*');
    } catch (e) {}
  }
  function runQualifiedHostVerb(section, parentParams, parentCaptures, hv) {
    var q = hv.qualifier;
    if (!q) return { parentParams: parentParams, changed: false, localChrome: false };
    var node = section.querySelector('[data-pdl-instance-let="' + q + '"]');
    if (!node) return { parentParams: parentParams, changed: false, localChrome: false };
    var bag = {};
    var kw = {};
    try { kw = JSON.parse(node.getAttribute('data-pdl-instance-kwargs') || '{}'); } catch (e) { kw = {}; }
    try { bag = JSON.parse(node.getAttribute('data-pdl-session-params') || '{}'); } catch (e) { bag = {}; }
    // Live session bag wins over bake kwargs (typed text must not be wiped).
    bag = Object.assign({}, kw, bag);
    var childType = node.getAttribute('data-pdl-instance-of') || '';
    var childDecls = interactions[childType] || [];
    var childBy = handlersByEvent(childDecls);
    var vname = hv.name;
    var vargs = hv.args || [];
    var changed = false;
    var localChrome = false;
    var skipEagerFocus = false;
    if (vname === 'beginEditing') {
      var seedName = (vargs[0] || 'value').replace(/^self\./, '');
      var seed = Object.prototype.hasOwnProperty.call(parentParams, seedName)
        ? String(parentParams[seedName] == null ? '' : parentParams[seedName])
        : String(bag.value == null ? '' : bag.value);
      bag._editCheckpoint = seed;
      bag.value = seed;
      bag.isEditing = true;
      bag.isEmpty = seed.length === 0;
      changed = true;
      localChrome = showInstEditingChrome(node, true);
      // Same as finish/cancel: verb delivers session inbound so parent emit captures run
      // (e.g. Input.began → editing = true).
      if (childBy.editingBegan) {
        var br = applyEvent(bag, childDecls, 'editingBegan');
        bag = br.params;
        (br.emits || []).forEach(function(em){
          var capB = applyEmitCapture(parentParams, parentCaptures, em.name, em.args || [], bag, q);
          if (capB.handled && capB.changed) {
            parentParams = capB.params;
            changed = true;
            // Parent shell will rebake — don't focus a node about to be torn down.
            skipEagerFocus = true;
          }
        });
      }
    } else if (vname === 'finishEditing' || vname === 'commitEditing') {
      // Done/Cancel buttons finish via host verb — not input blur. Sync live
      // DOM text into the session bag first (finishSession does this for Enter).
      var finishVis = liveEditableInput(node);
      if (finishVis && typeof finishVis.value === 'string') {
        bag.value = finishVis.value;
      }
      bag.isEditing = false;
      bag.isEmpty = String(bag.value == null ? '' : bag.value).length === 0;
      changed = true;
      localChrome = showInstEditingChrome(node, false);
      if (childBy.editingFinished) {
        var fr = applyEvent(bag, childDecls, 'editingFinished');
        bag = fr.params;
        (fr.emits || []).forEach(function(em){
          var cap = applyEmitCapture(parentParams, parentCaptures, em.name, em.args || [], bag, q);
          if (cap.handled && cap.changed) {
            parentParams = cap.params;
            changed = true;
          }
        });
      }
    } else if (vname === 'cancelEditing') {
      if (bag._editCheckpoint !== undefined) bag.value = bag._editCheckpoint;
      bag.isEditing = false;
      bag.isEmpty = String(bag.value == null ? '' : bag.value).length === 0;
      changed = true;
      localChrome = showInstEditingChrome(node, false);
      if (childBy.editingCancelled) {
        var cr = applyEvent(bag, childDecls, 'editingCancelled');
        bag = cr.params;
        (cr.emits || []).forEach(function(em){
          var cap2 = applyEmitCapture(parentParams, parentCaptures, em.name, em.args || [], bag, q);
          if (cap2.handled && cap2.changed) {
            parentParams = cap2.params;
            changed = true;
          }
        });
      }
    }
    node.setAttribute('data-pdl-session-params', JSON.stringify(bag));
    try {
      node.setAttribute('data-pdl-instance-kwargs', JSON.stringify(bag));
    } catch (e) {}
    var vis = liveEditableInput(node);
    if (vis) {
      try { vis.value = String(bag.value == null ? '' : bag.value); } catch (e) {}
      if (!skipEagerFocus && (bag.isEditing === true || bag.isEditing === 'true')) {
        try { vis.focus(); } catch (e) {}
      }
    }
    if (changed && childType) {
      requestInstanceResolve({
        component: section.getAttribute('data-pdl-component') || '',
        instanceLet: q,
        childComponent: childType,
        childParams: bag,
        reason: vname
      });
      localChrome = true;
    }
    return { parentParams: parentParams, changed: changed, localChrome: localChrome };
  }
  function postHeight() {
    try {
      var h = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      parent.postMessage({ type: 'pdl-resize', height: h }, '*');
    } catch (e) {}
  }
  function bindPress(el, handlers) {
    var ignore = handlers.ignore;
    var stop = handlers.stop === true;
    var suppressMouse = 0;
    function blocked(ev) {
      return ignore && ignore(ev);
    }
    function fromPointer(ev) {
      return ev.type.indexOf('pointer') === 0;
    }
    function mouseAfterPointer(ev) {
      return ev.type.indexOf('mouse') === 0 && (Date.now() - suppressMouse) < 700;
    }
    function start(ev) {
      if (blocked(ev) || mouseAfterPointer(ev)) return;
      if (ev.type === 'mousedown' && ev.button !== 0) return;
      if (fromPointer(ev) && ev.pointerType === 'mouse' && ev.button !== 0) return;
      if (fromPointer(ev)) {
        suppressMouse = Date.now();
        try { if (el.setPointerCapture && ev.pointerId != null) el.setPointerCapture(ev.pointerId); } catch (e) {}
      }
      if (stop) ev.stopPropagation();
      handlers.onStart(ev);
    }
    function end(ev) {
      if (blocked(ev) || mouseAfterPointer(ev)) return;
      if (fromPointer(ev)) suppressMouse = Date.now();
      if (stop) ev.stopPropagation();
      handlers.onEnd(ev);
    }
    function cancel() {
      handlers.onCancel();
    }
    el.addEventListener('pointerdown', start);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', cancel);
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', end);
  }
  function bindInteractiveHost() {
  if (!${opts.interactiveHost ? "true" : "false"}) return;
  document.querySelectorAll('section.pdl-preview[data-pdl-interactive]').forEach(function(section){
      var name = section.getAttribute('data-pdl-component');
      var decls = interactions[name] || [];
      var captures = emitCaptures[name] || [];
      var byEvent = handlersByEvent(decls);
      var liveParams = readParams(section);
      var canvas = section.querySelector('.pdl-canvas, .pdl-state');
      function inParamBar(ev) {
        return (
          ev.target &&
          ev.target.closest &&
          (ev.target.closest('.pdl-param-bar') || ev.target.closest('.pdl-fixture-bar') || ev.target.closest('.pdl-motion-bar'))
        );
      }
      function postMsg(payload) {
        try { parent.postMessage(payload, '*'); } catch (e) {}
      }
      var byMotion = motionByEvent(decls);
      function dispatchSelf(event) {
        if (!byEvent[event] && !byMotion[event]) return null;
        liveParams = readParams(section);
        var mspec = byMotion[event];
        var implicit = !!(mspec && mspec.transition && event !== 'appear' && event !== 'dismiss');
        if (implicit) {
          applyImplicitTransition(motionRootEl(section) || canvas, mspec);
        }
        if (event === 'appear' || event === 'dismiss') {
          var rootEl = motionRootEl(section);
          var anim = playMotionTree(rootEl, mspec, event);
          if (event === 'dismiss' && rootEl && anim && anim.finished) {
            anim.finished.then(function(){
              rootEl.setAttribute('data-pdl-dismissed', '1');
              rootEl.style.visibility = 'hidden';
            }).catch(function(){});
          }
        }
        if (!byEvent[event]) return { params: liveParams, emits: [], changed: false, handled: true };
        var result = applyEvent(liveParams, decls, event);
        liveParams = result.params;
        writeParams(section, liveParams);
        var chromeParam = section.getAttribute('data-pdl-chrome-state-param') || 'interactionState';
        var stateKey =
          liveParams[chromeParam] != null
            ? String(liveParams[chromeParam])
            : liveParams.interactionState != null
              ? String(liveParams.interactionState)
              : 'rest';
        // Implicit animate = needs an in-place style patch (IR), not a state-tree swap.
        var previewHandled = implicit ? false : showState(section, stateKey);
        if (!previewHandled && !implicit) previewHandled = showState(section, 'rest');
        if (implicit && result.changed) {
          // Patch this section only — do not rebake the component type (that
          // would paint every other instance of the same type in the gallery).
          requestInstanceResolve({
            component: name,
            instanceLet: '',
            childComponent: name,
            childParams: liveParams,
            reason: event
          });
          previewHandled = true;
        }
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
          if (node.getAttribute('data-pdl-listening') === '1') return;
          // EditableText owns press-hit / input listeners below. SearchField and
          // TitleField only declare editingBegan/Finished — claiming listening
          // here bound no press handler and made the editable host skip them.
          if (
            node.hasAttribute('data-pdl-editable') ||
            node.hasAttribute('data-pdl-press-activate') ||
            (node.matches && node.matches('input.pdl-text--editable'))
          ) {
            return;
          }
          var childType = node.getAttribute('data-pdl-instance-of');
          var childDecls = interactions[childType] || [];
          var childBy = handlersByEvent(childDecls);
          if (!Object.keys(childBy).length) return;
          var hasPointer =
            childBy.hoverStart || childBy.hoverEnd ||
            childBy.pressStart || childBy.pressEnd || childBy.pressCancel;
          if (!hasPointer) return;
          node.setAttribute('data-pdl-listening', '1');
          // Prefer ForEach list name (catalogue emitCapture qualifier) over synthetic instance-let.
          var foreachList = node.getAttribute('data-pdl-foreach-list') || null;
          var childQualifier = foreachList || node.getAttribute('data-pdl-instance-let') || null;
          var instanceLet = node.getAttribute('data-pdl-instance-let') || null;
          var childParams = {};
          try { childParams = JSON.parse(node.getAttribute('data-pdl-instance-kwargs') || '{}'); } catch (e) {}
          var childLive = Object.assign({}, childParams);
          var down = false;
          node.style.cursor = 'pointer';
          var childMotion = motionByEvent(childDecls);
          function childDispatch(event) {
            if (!childBy[event] && !childMotion[event]) return;
            liveParams = readParams(section);
            var childSpec = childMotion[event];
            if (childSpec && childSpec.transition && event !== 'appear' && event !== 'dismiss') {
              applyImplicitTransition(node, childSpec);
            }
            if (event === 'appear' || event === 'dismiss') {
              var childAnim = playMotionTree(node, childSpec, event);
              if (event === 'dismiss' && childAnim && childAnim.finished) {
                childAnim.finished.then(function(){
                  node.setAttribute('data-pdl-dismissed', '1');
                  node.style.visibility = 'hidden';
                }).catch(function(){});
              }
            }
            if (!childBy[event]) return;
            // Re-sync from DOM — parent rebake / reconcile may have refreshed
            // ForEach-derived params (selected) on this mount.
            try {
              childLive = Object.assign(
                {},
                JSON.parse(node.getAttribute('data-pdl-instance-kwargs') || '{}')
              );
            } catch (e) {}
            var result = applyEvent(childLive, childDecls, event);
            childLive = result.params;
            var needRebake = false;
            var localVerbChrome = false;
            (result.emits || []).forEach(function(em){
              var cap = applyEmitCapture(
                liveParams,
                captures,
                em.name,
                em.args || [],
                childLive,
                childQualifier,
                function(hv, parentBag){
                  var vr = runQualifiedHostVerb(section, parentBag, captures, hv);
                  if (vr.localChrome) localVerbChrome = true;
                  return { params: vr.parentParams, changed: vr.changed, localChrome: vr.localChrome };
                }
              );
              if (cap.handled && cap.changed) {
                liveParams = cap.params;
                writeParams(section, liveParams);
                needRebake = true;
              }
              if (cap.localChrome) localVerbChrome = true;
            });
            // Nested chrome: instance-resolve (bake child + IR patch).
            // Skip when parent SoT changed — rebake owns presentation (ForEach
            // selected). A resolve with pre-emit kwargs would clobber the accent
            // ring after click (selected:false + hover → grey border).
            var localHandled = localVerbChrome;
            if ((result.changed || localVerbChrome) && !needRebake) {
              try {
                node.setAttribute('data-pdl-instance-kwargs', JSON.stringify(childLive));
              } catch (e) {}
              requestInstanceResolve({
                component: name,
                instanceLet: instanceLet || '',
                childComponent: childType,
                childParams: childLive,
                reason: event
              });
              localHandled = true;
            }
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
              // Parent rebake only when emit capture changed parent SoT.
              previewHandled: needRebake ? false : localHandled
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
            bindPress(node, {
              ignore: inParamBar,
              stop: true,
              onStart: function(){
                down = true;
                childDispatch('pressStart');
              },
              onEnd: function(){
                if (!down) return;
                down = false;
                childDispatch('pressEnd');
              },
              onCancel: function(){
                if (!down) return;
                down = false;
                childDispatch('pressCancel');
              }
            });
          }
        });
      }
      if (Object.keys(byEvent).length && section.getAttribute('data-pdl-root-listening') !== '1') {
        section.setAttribute('data-pdl-root-listening', '1');
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
          bindPress(section, {
            ignore: function(ev){
              if (inParamBar(ev)) return true;
              return !!(ev.target && ev.target.closest && ev.target.closest('[data-pdl-instance-of]'));
            },
            onStart: function(){
              pointerDown = true;
              dispatchSelf('pressStart');
            },
            onEnd: function(){
              if (!pointerDown) return;
              pointerDown = false;
              dispatchSelf('pressEnd');
            },
            onCancel: function(){
              if (!pointerDown) return;
              pointerDown = false;
              dispatchSelf('pressCancel');
            }
          });
        }
        // Only PointerInput hit targets get the pointer cursor — not EditableText alone.
        if (
          canvas &&
          (byEvent.hoverStart || byEvent.hoverEnd || byEvent.pressStart || byEvent.pressEnd || byEvent.pressCancel)
        ) {
          canvas.style.cursor = 'pointer';
        }
      }
      // EditableText host: activatesOn (.focus|.press|.none); blur/Enter finish; Esc cancel.
      // Nested instances own a child session bag (data-pdl-session-params); parent SoT via emits.
      // Note: activatesOn=.none + !isEditing renders as inert text (no <input>) at bake time.
      section.querySelectorAll('input.pdl-text--editable[data-pdl-editable], [data-pdl-press-activate]').forEach(function(el){
        if (el.getAttribute('data-pdl-listening') === '1') return;
        var input = el.tagName === 'INPUT' ? el : null;
        var bind = el.getAttribute('data-pdl-editable') || 'value';
        var instNode = el.closest('[data-pdl-instance-of]') || (el.hasAttribute('data-pdl-instance-of') ? el : null);
        var childType = instNode ? (instNode.getAttribute('data-pdl-instance-of') || '') : '';
        var childDecls = childType ? (interactions[childType] || []) : [];
        var childBy = handlersByEvent(childDecls);
        var childQualifier = instNode
          ? (instNode.getAttribute('data-pdl-instance-let') || null)
          : null;
        var sessionParams = null;
        if (instNode) {
          try {
            sessionParams = JSON.parse(instNode.getAttribute('data-pdl-session-params') || '{}');
          } catch (e) { sessionParams = {}; }
          try {
            var kw0 = JSON.parse(instNode.getAttribute('data-pdl-instance-kwargs') || '{}');
            // Live session wins over bake kwargs (same as runQualifiedHostVerb).
            sessionParams = Object.assign({}, kw0, sessionParams || {});
          } catch (e) {}
        }
        var nested = Boolean(instNode && (
          Object.prototype.hasOwnProperty.call(sessionParams || {}, 'isEditing') ||
          Object.prototype.hasOwnProperty.call(sessionParams || {}, 'activatesOn') ||
          childBy.editingFinished ||
          childBy.editingCancelled ||
          childBy.editingBegan
        ));
        var childBag = nested ? (sessionParams || {}) : null;
        var eventBy = nested ? childBy : byEvent;
        function bag() {
          if (!nested || !instNode) return liveParams;
          // Re-read after IR reconcile updates activatesOn / isEditing on the attribute
          // (listeners stay bound via data-pdl-listening and would otherwise keep a stale bag).
          try {
            var liveBag = JSON.parse(instNode.getAttribute('data-pdl-session-params') || '{}');
            var kwLive = JSON.parse(instNode.getAttribute('data-pdl-instance-kwargs') || '{}');
            childBag = Object.assign({}, kwLive, liveBag);
          } catch (e) {}
          return childBag;
        }
        var hasEditableSession =
          Object.prototype.hasOwnProperty.call(bag(), 'isEditing') ||
          Object.prototype.hasOwnProperty.call(bag(), 'activatesOn') ||
          eventBy.editingFinished ||
          eventBy.editingCancelled ||
          eventBy.keyboardDismissed ||
          eventBy.keyboardCancelled ||
          nested;
        function activationMode() {
          var raw = bag().activatesOn;
          var s = raw == null ? 'focus' : String(raw).replace(/^\./, '');
          if (s === 'press' || s === 'none' || s === 'focus') return s;
          return 'focus';
        }
        function isEditingNow() {
          var b = bag();
          return b.isEditing === true || b.isEditing === 'true';
        }
        function persistBag() {
          if (nested && instNode) {
            instNode.setAttribute('data-pdl-session-params', JSON.stringify(childBag));
          } else {
            writeParams(section, liveParams);
          }
        }
        function showInstEditing(on) {
          if (!instNode) return false;
          var nodes = instNode.querySelectorAll(':scope > .pdl-inst-state');
          if (!nodes.length) return false;
          var want = on ? 'editing' : 'rest';
          var found = false;
          nodes.forEach(function(n){
            var match = n.getAttribute('data-pdl-state') === want;
            n.hidden = !match;
            if (match) found = true;
          });
          if (on && !found) {
            // Fall back to rest if no prebaked editing tree.
            nodes.forEach(function(n){
              n.hidden = n.getAttribute('data-pdl-state') !== 'rest';
            });
          }
          return found;
        }
        function syncHitTarget() {
          if (!input) return;
          var mode = activationMode();
          var editing = isEditingNow();
          // .none: fully inert until program begins. .press idle is a hit target, not this input.
          var blocked = mode === 'none' && !editing;
          var readOnly = !editing && mode === 'none';
          input.readOnly = readOnly;
          input.tabIndex = blocked ? -1 : 0;
          input.style.pointerEvents = blocked ? 'none' : '';
          input.style.cursor = blocked ? 'default' : '';
          input.style.userSelect = readOnly ? 'none' : '';
          if (blocked) input.setAttribute('aria-disabled', 'true');
          else input.removeAttribute('aria-disabled');
        }
        function dispatchNested(event) {
          if (!eventBy[event]) return { emits: [], changed: false, handled: false, needRebake: false };
          liveParams = readParams(section);
          var result = applyEvent(childBag, childDecls, event);
          childBag = result.params;
          persistBag();
          var needRebake = false;
          (result.emits || []).forEach(function(em){
            var cap = applyEmitCapture(liveParams, captures, em.name, em.args || [], childBag, childQualifier);
            if (cap.handled && cap.changed) {
              liveParams = cap.params;
              writeParams(section, liveParams);
              needRebake = true;
            }
          });
          return { emits: result.emits, changed: result.changed || needRebake, handled: result.handled, needRebake: needRebake };
        }
        var ignoreBlurUntil = 0;
        var ignoreNextBlurCommit = false;
        function suppressBlurForOpen() {
          // LAN / WASM rebake is often >500ms; the first blur is the remount, not Done.
          ignoreBlurUntil = Date.now() + 2500;
          ignoreNextBlurCommit = true;
        }
        function beginSession(from) {
          if (!hasEditableSession) return { started: false, skipFocus: false };
          if (isEditingNow()) return { started: false, skipFocus: false };
          var mode = activationMode();
          if (mode === 'none') return { started: false, skipFocus: false };
          if (mode === 'press' && from === 'focus') return { started: false, skipFocus: false };
          var b = bag();
          var seed = String(b.value == null ? '' : b.value);
          b._editCheckpoint = seed;
          b.value = seed;
          b.isEditing = true;
          b.isEmpty = seed.length === 0;
          persistBag();
          syncHitTarget();
          var localChrome = nested ? showInstEditing(true) : false;
          if (nested) {
            var beginEmits = [];
            var beginNeedRebake = false;
            if (eventBy.pressEnd) {
              var pr = dispatchNested('pressEnd');
              beginEmits = pr.emits || [];
              beginNeedRebake = Boolean(pr.needRebake);
            } else if (eventBy.editingBegan) {
              var brn = dispatchNested('editingBegan');
              beginEmits = brn.emits || [];
              beginNeedRebake = Boolean(brn.needRebake);
            }
            // Nested field chrome via instance resolve; parent rebake only if SoT changed.
            requestInstanceResolve({
              component: name,
              instanceLet: childQualifier || '',
              childComponent: childType,
              childParams: childBag,
              reason: 'beginEditing'
            });
            postMsg({
              type: 'pdl-interaction',
              component: name,
              event: 'beginEditing',
              childComponent: childType,
              params: liveParams,
              childParams: childBag,
              emits: beginEmits,
              handled: true,
              changed: true,
              previewHandled: beginNeedRebake ? false : true
            });
            // Parent rebake (Title.began → editingTitle) replaces/reconciles this
            // input. Don't focus or blur-commit across that turn — same as Rename.
            if (beginNeedRebake) suppressBlurForOpen();
            return { started: true, skipFocus: beginNeedRebake };
          }
          // Root EditableText: if-isEditing chrome is bake-time. Always rebake —
          // dispatchSelf would mark previewHandled via dual-bake rest and leave
          // idle border/placeholder while params.isEditing is already true.
          liveParams = readParams(section);
          var rootBeginEmits = [];
          if (byEvent.editingBegan) {
            var rootBr = applyEvent(liveParams, decls, 'editingBegan');
            liveParams = rootBr.params;
            rootBeginEmits = rootBr.emits || [];
            writeParams(section, liveParams);
          } else if (byEvent.pressEnd) {
            var rootPr = applyEvent(liveParams, decls, 'pressEnd');
            liveParams = rootPr.params;
            rootBeginEmits = rootPr.emits || [];
            writeParams(section, liveParams);
          }
          postMsg({
            type: 'pdl-interaction',
            component: name,
            event: 'beginEditing',
            params: liveParams,
            emits: rootBeginEmits,
            handled: true,
            changed: true,
            previewHandled: false
          });
          suppressBlurForOpen();
          return { started: true, skipFocus: true };
        }
        function finishSession(kind) {
          // kind: 'finished' | 'cancelled'
          var b = bag();
          if (kind === 'cancelled' && b._editCheckpoint !== undefined) {
            b.value = b._editCheckpoint;
            input.value = String(b.value);
          } else {
            b[bind] = input.value;
            b.value = input.value;
          }
          b.isEmpty = String(b.value == null ? '' : b.value).length === 0;
          b.isEditing = false;
          persistBag();
          syncHitTarget();
          if (nested) showInstEditing(false);
          var evName = kind === 'cancelled' ? 'editingCancelled' : 'editingFinished';
          var alias = kind === 'cancelled' ? 'keyboardCancelled' : 'keyboardDismissed';
          if (nested) {
            var nr = { emits: [], changed: false, needRebake: false, handled: false };
            if (eventBy[evName]) nr = dispatchNested(evName);
            else if (eventBy[alias]) nr = dispatchNested(alias);
            requestInstanceResolve({
              component: name,
              instanceLet: childQualifier || '',
              childComponent: childType,
              childParams: childBag,
              reason: evName
            });
            postMsg({
              type: 'pdl-interaction',
              component: name,
              event: evName,
              childComponent: childType,
              params: liveParams,
              childParams: childBag,
              emits: nr.emits || [],
              handled: true,
              changed: true,
              previewHandled: nr.needRebake ? false : true
            });
            return;
          }
          // Root EditableText: restore idle if-isEditing / placeholder via rebake.
          liveParams = readParams(section);
          var rootEndEmits = [];
          if (eventBy[evName]) {
            var rootEnd = applyEvent(liveParams, decls, evName);
            liveParams = rootEnd.params;
            rootEndEmits = rootEnd.emits || [];
            writeParams(section, liveParams);
          } else if (eventBy[alias]) {
            var rootAlias = applyEvent(liveParams, decls, alias);
            liveParams = rootAlias.params;
            rootEndEmits = rootAlias.emits || [];
            writeParams(section, liveParams);
          }
          postMsg({
            type: 'pdl-interaction',
            component: name,
            event: evName,
            params: liveParams,
            emits: rootEndEmits,
            handled: true,
            changed: true,
            previewHandled: false
          });
        }
        syncHitTarget();
        function focusSessionInput() {
          var target = input;
          if (instNode) {
            var visible = liveEditableInput(instNode);
            if (visible) target = visible;
          }
          try {
            target.value = String(bag().value == null ? '' : bag().value);
            target.focus();
            var len = target.value.length;
            if (typeof target.setSelectionRange === 'function') target.setSelectionRange(len, len);
          } catch (e) {}
        }
        var pressArmed = 0;
        function beginFromPress(ev) {
          if (ev && ev.type && ev.type.indexOf('mouse') === 0 && (Date.now() - pressArmed) < 700) return;
          if (ev && ev.type && ev.type.indexOf('pointer') === 0) pressArmed = Date.now();
          if (activationMode() === 'none' && !isEditingNow()) {
            if (ev && ev.preventDefault) ev.preventDefault();
            return;
          }
          var wasEditing = isEditingNow();
          var r = beginSession('press');
          if (r.skipFocus || (wasEditing && Date.now() < ignoreBlurUntil)) return;
          if (r.started || isEditingNow()) focusSessionInput();
        }
        el.addEventListener('pointerdown', function(ev){
          ev.stopPropagation();
          if (ev.pointerType === 'mouse' && ev.button !== 0) return;
          beginFromPress(ev);
        });
        el.addEventListener('mousedown', function(ev){
          ev.stopPropagation();
          if (activationMode() === 'none' && !isEditingNow()) {
            ev.preventDefault();
          }
          if (ev.button !== 0) return;
          beginFromPress(ev);
        });
        el.addEventListener('click', function(ev){
          ev.stopPropagation();
          if (activationMode() === 'none' && !isEditingNow()) {
            ev.preventDefault();
            return;
          }
          beginFromPress(ev);
        });
        if (input) {
        input.addEventListener('focus', function(){
          if (activationMode() === 'none' && !isEditingNow()) {
            try { input.blur(); } catch (e) {}
            syncHitTarget();
            return;
          }
          // .press: iOS srcdoc often focuses the field without pointerdown.
          if (activationMode() === 'press') {
            beginFromPress({ type: 'focus' });
            syncHitTarget();
            return;
          }
          beginSession('focus');
          syncHitTarget();
        });
        input.addEventListener('input', function(){
          if (input.readOnly) return;
          var b = bag();
          b[bind] = input.value;
          b.value = input.value;
          b.isEmpty = input.value.length === 0;
          persistBag();
        });
        input.addEventListener('blur', function(ev){
          // Defer: Playground rebake replaces iframe srcdoc in the same turn as
          // Edit/began. A sync blur-commit was finishing the new session and
          // snapping parent editing back to false. After teardown, the input
          // is disconnected and we no-op.
          var blurSt = input.closest('.pdl-inst-state');
          setTimeout(function(){
            if (!input.isConnected) return;
            if (ignoreNextBlurCommit) {
              ignoreNextBlurCommit = false;
              return;
            }
            if (Date.now() < ignoreBlurUntil) return;
            if (!isEditingNow()) {
              syncHitTarget();
              return;
            }
            if (nested && instNode) {
              var active = document.activeElement;
              if (active && instNode.contains(active)) return;
              if (blurSt && blurSt.hidden) return;
            }
            if (document.activeElement === input) return;
            finishSession('finished');
          }, 0);
        });
        input.addEventListener('keydown', function(ev){
          if (ev.key === 'Escape') {
            finishSession('cancelled');
            try { input.blur(); } catch (e) {}
          } else if (ev.key === 'Enter') {
            try { input.blur(); } catch (e) {}
          }
        });
        }
        // isEditing=true (param bar / fixture) ⇒ first responder: accept keystrokes.
        if (input && hasEditableSession && isEditingNow()) {
          var hiddenState = input.closest('.pdl-inst-state[hidden]');
          if (hiddenState) {
            // Listeners still attach on prebaked editing trees; only the visible leaf autofocuses.
          } else {
            var b0 = bag();
            if (b0._editCheckpoint === undefined) {
              b0._editCheckpoint = String(b0.value == null ? '' : b0.value);
              persistBag();
            }
            if (nested) showInstEditing(true);
            syncHitTarget();
            requestAnimationFrame(function(){ focusSessionInput(); });
          }
        }
        el.setAttribute('data-pdl-listening', '1');
      });
      if (byMotion.appear && byMotion.appear.from) {
        requestAnimationFrame(function(){
          playMotionTree(motionRootEl(section), byMotion.appear, 'appear');
        });
      }
      section.querySelectorAll('[data-pdl-instance-of]').forEach(function(node){
        var nestedType = node.getAttribute('data-pdl-instance-of');
        var nestedMotion = motionByEvent(interactions[nestedType] || []);
        if (nestedMotion.appear && nestedMotion.appear.from) {
          requestAnimationFrame(function(){
            playMotionTree(node, nestedMotion.appear, 'appear');
          });
        }
      });
      var replayBtn = section.querySelector('[data-pdl-motion-replay]');
      if (replayBtn && replayBtn.getAttribute('data-pdl-listening') !== '1') {
        replayBtn.setAttribute('data-pdl-listening', '1');
        replayBtn.addEventListener('click', function(ev){
          ev.preventDefault();
          ev.stopPropagation();
          var root = motionRootEl(section);
          if (!root) return;
          root.style.visibility = '';
          root.removeAttribute('data-pdl-dismissed');
          function replayNode(target, spec) {
            if (!target || !spec) return null;
            target.style.visibility = '';
            target.removeAttribute('data-pdl-dismissed');
            function appearOne() {
              target.style.visibility = '';
              playMotionTree(target, spec.appear || spec, 'appear');
            }
            if (spec.dismiss && spec.dismiss.to) {
              var a = playMotionTree(target, spec.dismiss, 'dismiss');
              if (a && a.finished) a.finished.then(appearOne).catch(appearOne);
              else appearOne();
              return a;
            }
            appearOne();
            return null;
          }
          replayNode(root, byMotion);
          section.querySelectorAll('[data-pdl-instance-of]').forEach(function(node){
            var nestedType = node.getAttribute('data-pdl-instance-of');
            var nestedMotion = motionByEvent(interactions[nestedType] || []);
            if (nestedMotion.appear || nestedMotion.dismiss) replayNode(node, nestedMotion);
          });
        });
      }
    });
  }
  function bindChromeControls() {
    document.querySelectorAll('.pdl-param-bar').forEach(function(bar){
      if (bar.getAttribute('data-pdl-listening') === '1') return;
      bar.setAttribute('data-pdl-listening', '1');
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
    document.querySelectorAll('.pdl-fixture-bar').forEach(function(bar){
      if (bar.getAttribute('data-pdl-listening') === '1') return;
      bar.setAttribute('data-pdl-listening', '1');
      var component = bar.getAttribute('data-pdl-fixture-bar');
      var sel = bar.querySelector('select[data-pdl-fixture]');
      if (!sel || !component) return;
      sel.addEventListener('change', function(){
        var label = sel.value ? String(sel.value) : null;
        try {
          parent.postMessage({ type: 'pdl-fixture', component: component, label: label }, '*');
        } catch (e) {}
      });
    });
    document.querySelectorAll('[data-pdl-open-source]').forEach(function(btn){
      if (btn.getAttribute('data-pdl-listening') === '1') return;
      btn.setAttribute('data-pdl-listening', '1');
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
  }
  bindInteractiveHost();
  bindChromeControls();
  window.addEventListener('message', function(ev){
    if (!ev || !ev.data || ev.data.type !== 'pdl-rebind-interactive') return;
    bindInteractiveHost();
    bindChromeControls();
    postHeight();
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
<body${opts.hostChrome === "device" ? ' class="pdl-device-stage"' : ""}>
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
  opts: {
    title?: string;
    singleComponent?: string;
    componentNames?: string[];
    interactiveHost?: boolean;
    hostChrome?: "lab" | "device";
    usageByComponent?: Record<string, string>;
    rulesByComponent?: Record<string, RulesPreviewJson>;
    interactionsByComponent?: Record<string, unknown>;
    emitCapturesByComponent?: Record<string, unknown>;
  } = {},
): string {
  const { html, renderFailures } = renderBakedDesignToHtmlDocumentWithReport(doc, opts);
  if (renderFailures.length > 0) {
    const lines = renderFailures.map((f) => `${f.component}: ${f.message}`);
    throw new Error(lines.join("\n"));
  }
  return html;
}
