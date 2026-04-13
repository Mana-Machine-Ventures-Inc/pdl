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

function flexDirection(direction: unknown): string | undefined {
  if (direction === "column") return "column";
  if (direction === "row") return "row";
  return undefined;
}

function flexWrap(wrap: unknown): string | undefined {
  if (wrap === "wrap") return "wrap";
  if (wrap === "nowrap") return "nowrap";
  return undefined;
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

function sizingWidthHeight(props: Record<string, unknown>, axis: "width" | "height"): string | undefined {
  const v = props[axis];
  if (v === "fill") return axis === "width" ? "100%" : "100%";
  if (v === "hug") return "auto";
  if (typeof v === "number" && Number.isFinite(v)) return `${v}px`;
  if (v !== null && typeof v === "object" && !Array.isArray(v)) {
    const fixed = (v as { fixed?: unknown }).fixed;
    if (typeof fixed === "number" && Number.isFinite(fixed)) return `${fixed}px`;
  }
  return undefined;
}

function layoutInlineStyle(props: Record<string, unknown>): string {
  const parts: string[] = ["display:flex", "min-width:0", "min-height:0"];
  const fd = flexDirection(props.direction);
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
  const pad = paddingToCss(props, "padding");
  if (pad) parts.push(`padding:${pad}`);
  const mar = paddingToCss(props, "margin");
  if (mar) parts.push(`margin:${mar}`);
  const w = sizingWidthHeight(props, "width");
  if (w) parts.push(`width:${w}`);
  const h = sizingWidthHeight(props, "height");
  if (h) parts.push(`height:${h}`);
  const rad = cornerRadiusToCss(props.cornerRadius);
  if (rad) parts.push(rad);
  if (typeof props.opacity === "number" && Number.isFinite(props.opacity)) {
    parts.push(`opacity:${props.opacity}`);
  }
  if (typeof props.background === "string" && props.background.length > 0) {
    parts.push(`background:${props.background}`);
  }
  return parts.join(";");
}

function textInlineStyle(props: Record<string, unknown>): string {
  const parts: string[] = ["display:block", "min-width:0"];
  if (typeof props.color === "string") parts.push(`color:${props.color}`);
  if (typeof props.fontSize === "number") parts.push(`font-size:${props.fontSize}px`);
  if (typeof props.fontWeight === "number") parts.push(`font-weight:${String(props.fontWeight)}`);
  if (typeof props.fontFamily === "string") parts.push(`font-family:${props.fontFamily}`);
  const tpad = paddingToCss(props, "padding");
  if (tpad) parts.push(`padding:${tpad}`);
  const tmar = paddingToCss(props, "margin");
  if (tmar) parts.push(`margin:${tmar}`);
  const tw = sizingWidthHeight(props, "width");
  if (tw) parts.push(`width:${tw}`);
  const th = sizingWidthHeight(props, "height");
  if (th) parts.push(`height:${th}`);
  const tcr = cornerRadiusToCss(props.cornerRadius);
  if (tcr) parts.push(tcr);
  return parts.join(";");
}

function renderFrame(frame: BakedFrame): string {
  const { id, kind, props, children } = frame;
  const kids = children ?? [];
  const dataId = ` data-pdl-id="${escapeAttr(id)}"`;
  const inst =
    frame.instanceOf !== undefined ? ` data-pdl-instance-of="${escapeAttr(frame.instanceOf)}"` : "";

  if (kind === "layout") {
    const style = layoutInlineStyle(props);
    const inner = kids.map(renderFrame).join("");
    return `<div class="pdl-frame pdl-layout"${dataId}${inst} style="${escapeStyleAttr(style)}">${inner}</div>`;
  }

  if (kind === "text") {
    const content = typeof props.content === "string" ? props.content : "";
    const style = textInlineStyle(props);
    return `<span class="pdl-frame pdl-text"${dataId}${inst} style="${escapeStyleAttr(style)}">${escapeHtml(content)}</span>`;
  }

  if (kind === "spacer") {
    const style = layoutInlineStyle(props);
    return `<div class="pdl-frame pdl-spacer"${dataId}${inst} style="${escapeStyleAttr(style)}" aria-hidden="true"></div>`;
  }

  if (kind === "icon" || kind === "media") {
    const style = layoutInlineStyle(props);
    const label = typeof props.label === "string" ? props.label : id;
    return `<div class="pdl-frame pdl-${kind}"${dataId}${inst} style="${escapeStyleAttr(style)}" role="img" aria-label="${escapeAttr(label)}"></div>`;
  }

  const fallbackStyle = layoutInlineStyle(props);
  const inner = kids.map(renderFrame).join("");
  return `<div class="pdl-frame pdl-unknown" data-pdl-kind="${escapeAttr(kind)}"${dataId}${inst} style="${escapeStyleAttr(fallbackStyle)}">${inner}</div>`;
}

function renderComponentBody(comp: BakedComponentJson): string {
  return renderFrame(comp.root);
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
`.trim();

/**
 * Render a single baked component root to an HTML fragment (no `<html>` wrapper).
 */
export function renderBakedComponentToHtmlFragment(comp: BakedComponentJson): string {
  return `<div class="pdl-canvas">${renderComponentBody(comp)}</div>`;
}

/**
 * Full HTML5 document for reference / Studio iframe: includes reset CSS and one or more previews.
 */
export function renderBakedDesignToHtmlDocument(
  doc: BakedDesignDocument,
  opts: { title?: string; singleComponent?: string } = {},
): string {
  const title =
    opts.title ??
    `PDL preview — ${doc.provenance.entryPath.replace(/^.*\//, "")} — ${new Date(doc.generatedAt).toISOString().slice(0, 10)}`;
  const names = Object.keys(doc.components).sort();
  const focus = opts.singleComponent;
  const list = focus ? (doc.components[focus] ? [focus] : []) : names;
  const sections = list
    .map((name) => {
      const comp = doc.components[name]!;
      const paramsJson = escapeHtml(JSON.stringify(comp.bakedParams));
      const body = renderBakedComponentToHtmlFragment(comp);
      return `<section class="pdl-preview" data-pdl-component="${escapeAttr(name)}"><h2 class="pdl-preview-title">${escapeHtml(name)}</h2><p class="pdl-preview-params">${paramsJson}</p>${body}</section>`;
    })
    .join("\n");

  const meta = `entry: ${escapeHtml(doc.provenance.entryPath)} · theme: ${escapeHtml(String(doc.provenance.bakedTheme ?? "default"))} · profile: ${escapeHtml(doc.provenance.bakeProfile)}`;

  return `<!DOCTYPE html>
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
}
