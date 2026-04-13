import type { ComponentCatalogue } from "./catalogue.js";
import type { BakedDesignDocument } from "./bakeDesign.js";
import { escapeHtml, renderBakedComponentToHtmlFragment } from "./renderHtml.js";

function prettyJson(value: unknown): string {
  try {
    return escapeHtml(JSON.stringify(value, null, 2));
  } catch {
    return escapeHtml(String(value));
  }
}

const CATALOGUE_DOC_CSS = `
:root { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; padding: 20px; background: #f4f4f5; color: #18181b; }
h1 { font-size: 1.35rem; margin: 0 0 8px; }
.pdl-doc-meta { font-size: 0.85rem; color: #52525b; margin-bottom: 28px; }
section.pdl-doc-section { margin-bottom: 36px; }
section.pdl-doc-section > h2 { font-size: 1.1rem; margin: 0 0 12px; border-bottom: 1px solid #d4d4d8; padding-bottom: 6px; }
.pdl-table-wrap { overflow-x: auto; border: 1px solid #e4e4e7; border-radius: 8px; background: #fff; }
table.pdl-data { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
table.pdl-data th, table.pdl-data td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #f4f4f5; vertical-align: top; }
table.pdl-data th { background: #fafafa; font-weight: 600; color: #3f3f46; }
table.pdl-data tr:last-child td { border-bottom: none; }
.pdl-json { margin: 0; white-space: pre-wrap; word-break: break-word; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; line-height: 1.45; color: #27272a; }
.pdl-theme-card { border: 1px solid #e4e4e7; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; background: #fff; }
.pdl-theme-card h3 { margin: 0 0 8px; font-size: 0.95rem; }
.pdl-muted { color: #71717a; font-size: 0.8rem; }
.pdl-preview-block { border: 1px solid #e4e4e7; border-radius: 8px; padding: 14px; margin-bottom: 20px; background: #fff; }
.pdl-preview-block h3 { margin: 0 0 6px; font-size: 1rem; }
.pdl-preview-block .pdl-usage { font-size: 0.8rem; color: #52525b; margin: 0 0 10px; max-width: 72ch; }
.pdl-empty-note { font-size: 0.85rem; color: #71717a; font-style: italic; }
`.trim();

function tokenTableRows(
  map: Record<string, { name: string; tokenType: string; definition: unknown }>,
): string {
  const names = Object.keys(map).sort();
  if (names.length === 0) {
    return `<p class="pdl-empty-note">No entries.</p>`;
  }
  const body = names
    .map((k) => {
      const row = map[k]!;
      return `<tr><td><code>${escapeHtml(row.name)}</code></td><td>${escapeHtml(row.tokenType)}</td><td><pre class="pdl-json">${prettyJson(row.definition)}</pre></td></tr>`;
    })
    .join("\n");
  return `<div class="pdl-table-wrap"><table class="pdl-data"><thead><tr><th>Name</th><th>Type</th><th>Definition</th></tr></thead><tbody>${body}</tbody></table></div>`;
}

function themesSection(themes: Record<string, { baseTheme: string | null; overrides: Record<string, unknown> }>): string {
  const names = Object.keys(themes).sort();
  if (names.length === 0) {
    return `<p class="pdl-empty-note">No themes.</p>`;
  }
  return names
    .map((t) => {
      const row = themes[t]!;
      const ov = Object.keys(row.overrides).sort();
      const ovRows = ov
        .map(
          (lhs) =>
            `<tr><td><code>${escapeHtml(lhs)}</code></td><td><pre class="pdl-json">${prettyJson(row.overrides[lhs])}</pre></td></tr>`,
        )
        .join("");
      const base =
        row.baseTheme === null
          ? `<span class="pdl-muted">base: (none)</span>`
          : `<span class="pdl-muted">base:</span> <code>${escapeHtml(row.baseTheme)}</code>`;
      return `<div class="pdl-theme-card"><h3>${escapeHtml(t)}</h3><p>${base}</p><div class="pdl-table-wrap"><table class="pdl-data"><thead><tr><th>Token</th><th>Override RHS</th></tr></thead><tbody>${ovRows || `<tr><td colspan="2" class="pdl-muted">No overrides</td></tr>`}</tbody></table></div></div>`;
    })
    .join("\n");
}

function typeStylesSection(typeStyles: Record<string, { name: string; props: Record<string, unknown> }>): string {
  const names = Object.keys(typeStyles).sort();
  if (names.length === 0) {
    return `<p class="pdl-empty-note">No type styles.</p>`;
  }
  return names
    .map((n) => {
      const row = typeStyles[n]!;
      return `<div class="pdl-theme-card"><h3><code>${escapeHtml(row.name)}</code></h3><pre class="pdl-json">${prettyJson(row.props)}</pre></div>`;
    })
    .join("\n");
}

function variantTypesSection(variantTypes: Record<string, { name: string; cases: string[] }>): string {
  const names = Object.keys(variantTypes).sort();
  if (names.length === 0) {
    return `<p class="pdl-empty-note">No variant types.</p>`;
  }
  const rows = names
    .map((k) => {
      const v = variantTypes[k]!;
      const cases = v.cases.map((c) => `<code>${escapeHtml(c)}</code>`).join(", ");
      return `<tr><td><code>${escapeHtml(v.name)}</code></td><td>${cases}</td></tr>`;
    })
    .join("");
  return `<div class="pdl-table-wrap"><table class="pdl-data"><thead><tr><th>Variant type</th><th>Cases</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

/**
 * Single HTML5 reference document: **token graph + type/variant tables** from **`ComponentCatalogue`**,
 * then **default-baked previews** for every component from **`baked`** (same theme / entry as used to build both).
 */
export function renderCatalogueSystemHtml(
  catalogue: ComponentCatalogue,
  baked: BakedDesignDocument,
  opts: { title?: string } = {},
): string {
  const title =
    opts.title ??
    `PDL catalogue — ${catalogue.kind} — ${catalogue.generatedAt.slice(0, 10)}`;
  const themeLine = catalogue.theme
    ? `Active tree theme: <strong>${escapeHtml(catalogue.theme)}</strong>`
    : "Active tree theme: <em>default</em> (no <code>theme</code> field on catalogue)";
  const meta = `${themeLine} · generated <code>${escapeHtml(catalogue.generatedAt)}</code> · bake profile <code>${escapeHtml(baked.provenance.bakeProfile)}</code> · entry <code>${escapeHtml(baked.provenance.entryPath)}</code>`;

  const prim = tokenTableRows(catalogue.primitives);
  const sem = tokenTableRows(catalogue.semantics);
  const th = themesSection(catalogue.themes);
  const ts = typeStylesSection(catalogue.typeStyles);
  const vt = variantTypesSection(catalogue.variantTypes);

  const compNames = Object.keys(catalogue.components).sort();
  const previews = compNames
    .map((name) => {
      const row = catalogue.components[name]!;
      const usage = row.usage?.trim() ? `<p class="pdl-usage">${escapeHtml(row.usage)}</p>` : "";
      const bakedRow = baked.components[name];
      const canvas = bakedRow
        ? renderBakedComponentToHtmlFragment(bakedRow)
        : `<p class="pdl-empty-note">No baked preview for <code>${escapeHtml(name)}</code>.</p>`;
      const params = `<p class="pdl-muted">Default params: <code>${escapeHtml(JSON.stringify(bakedRow?.bakedParams ?? {}))}</code></p>`;
      return `<div class="pdl-preview-block" id="pdl-component-${escapeHtml(name)}"><h3>${escapeHtml(name)}</h3>${usage}${params}${canvas}</div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${CATALOGUE_DOC_CSS}</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<p class="pdl-doc-meta">${meta}</p>

<section class="pdl-doc-section" id="pdl-primitives"><h2>Primitives</h2>${prim}</section>
<section class="pdl-doc-section" id="pdl-semantics"><h2>Semantics</h2>${sem}</section>
<section class="pdl-doc-section" id="pdl-themes"><h2>Themes</h2>${th}</section>
<section class="pdl-doc-section" id="pdl-typestyles"><h2>Type styles</h2>${ts}</section>
<section class="pdl-doc-section" id="pdl-varianttypes"><h2>Variant types</h2>${vt}</section>
<section class="pdl-doc-section" id="pdl-components"><h2>Components (default bake)</h2>${previews}</section>
</body>
</html>
`;
}
