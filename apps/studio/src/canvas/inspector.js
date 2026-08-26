/**
 * Canvas property inspector (frame / text props).
 */

import { canvasSession, effectiveProp, pushPending, removePendingProp } from "./session.js";
import { crossAxisWarning } from "./warnings.js";
import { formatValue } from "./rewrite.js";
import {
  validateInspectorProp,
  inspectorHasInvalid,
  inspectorPropsForKind,
} from "./validateProp.js";
import {
  editorSpecForProp,
  decodeAcceptValue,
  encodeAcceptValue,
  decodeEnumValue,
} from "./propSpec.js";

export { inspectorHasInvalid };

/**
 * @param {import('./layers.js').CanvasLayer} layer
 * @returns {'layout' | 'text' | 'icon' | 'media' | 'presenter'}
 */
function frameKindForLayer(layer) {
  if (layer.instanceOf) return "layout";
  const k = layer.kind;
  if (k === "text" || k === "icon" || k === "media" || k === "presenter") return k;
  return "layout";
}

/**
 * Flush focused inspector fields into pending (Apply before blur).
 * Skips invalid fields (they keep their red error state).
 * @param {HTMLElement | null} el
 * @param {import('./layers.js').CanvasLayer | null} layer
 * @param {Record<string, string>} activeAxes
 * @param {string | null} chosenAxis
 */
export function flushInspectorPending(el, layer, activeAxes, chosenAxis) {
  if (!el || !layer) return;
  const frameKind = frameKindForLayer(layer);
  el.querySelectorAll("[data-field]").forEach((field) => {
    commitFieldEl(/** @type {HTMLElement} */ (field), layer, frameKind, activeAxes, chosenAxis, {
      push: true,
      notify: false,
    });
  });
}

/**
 * @param {import('./layers.js').CanvasLayer | null} layer
 * @param {Record<string, string>} activeAxes
 * @param {string | null} chosenAxis
 * @param {(axis: string) => void} onChooseAxis
 * @param {() => void} onEdited
 */
export function renderInspector(el, layer, activeAxes, chosenAxis, onChooseAxis, onEdited) {
  if (!el) return;
  if (!layer) {
    el.innerHTML = `<p class="hint">Select a layer.</p>`;
    return;
  }

  const frameKind = frameKindForLayer(layer);
  const propIds = inspectorPropsForKind(frameKind);
  const axisKeys = Object.keys(activeAxes ?? {});
  const warn = crossAxisWarning(activeAxes, chosenAxis || undefined);

  const parts = [];
  parts.push(
    `<div class="canvas-insp-head"><strong>${escapeHtml(layer.label)}</strong><span class="hint">${escapeHtml(layer.kind)}${layer.instanceOf ? ` · ${escapeHtml(layer.instanceOf)}` : ""}</span></div>`,
  );

  if (warn) {
    parts.push(`<div class="canvas-warn">${escapeHtml(warn)}</div>`);
    parts.push(`<div class="canvas-axis-pick" role="group" aria-label="Own property axis">`);
    for (const ax of axisKeys) {
      parts.push(
        `<button type="button" class="seg${chosenAxis === ax ? " is-active" : ""}" data-choose-axis="${escapeAttr(ax)}">${escapeHtml(ax)}=.${escapeHtml(activeAxes[ax])}</button>`,
      );
    }
    parts.push(`</div>`);
  }

  parts.push(`<div class="canvas-insp-fields">`);
  for (const prop of propIds) {
    const raw = effectiveProp(layer.id, prop, layer.props);
    const spec = editorSpecForProp(frameKind, prop);
    parts.push(renderFieldHtml(prop, spec, raw));
  }
  parts.push(`</div>`);

  parts.push(`<div class="canvas-insp-actions">
    ${layer.id.startsWith("let:") ? `<button type="button" class="btn ghost btn-tiny" id="canvasDeleteLayer">Delete layer</button>` : `<p class="hint">Add/reorder layers in the panel on the left.</p>`}
  </div>`);

  el.innerHTML = parts.join("");

  el.querySelectorAll("[data-choose-axis]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ax = btn.getAttribute("data-choose-axis");
      if (ax) onChooseAxis(ax);
    });
  });

  el.querySelectorAll("[data-field]").forEach((field) => {
    wireField(
      /** @type {HTMLElement} */ (field),
      layer,
      frameKind,
      activeAxes,
      chosenAxis,
      onEdited,
    );
  });

  el.querySelector("#canvasDeleteLayer")?.addEventListener("click", () => {
    pushPending({ kind: "deleteLayer", target: layer.id });
    onEdited();
  });
}

/**
 * @param {string} prop
 * @param {import('./propSpec.js').PropEditorSpec} spec
 * @param {unknown} raw
 */
function renderFieldHtml(prop, spec, raw) {
  if (spec.editor === "enum" && spec.options) {
    const cur = decodeEnumValue(raw, spec.options);
    const opts = [
      `<option value="">—</option>`,
      ...spec.options.map(
        (o) =>
          `<option value="${escapeAttr(o.value)}"${o.value === cur ? " selected" : ""} title="${escapeAttr(o.meaning || "")}">${escapeHtml(o.label)}</option>`,
      ),
    ];
    return `<label class="canvas-field" data-field="${escapeAttr(prop)}" data-editor="enum">
      <span>${escapeHtml(prop)}</span>
      <select data-prop="${escapeAttr(prop)}" data-role="primary">${opts.join("")}</select>
      <span class="canvas-field-error" hidden></span>
    </label>`;
  }

  if (spec.editor === "accept" && spec.modes) {
    const decoded = decodeAcceptValue(spec.modes, raw);
    const modeOpts = [
      `<option value="">—</option>`,
      ...spec.modes.map(
        (m) =>
          `<option value="${escapeAttr(m.id)}"${m.id === decoded.modeId ? " selected" : ""} title="${escapeAttr(m.meaning || m.form)}">${escapeHtml(m.label)}</option>`,
      ),
    ];
    const mode = spec.modes.find((m) => m.id === decoded.modeId);
    const argsHtml = renderArgsHtml(prop, mode, decoded.args);
    return `<div class="canvas-field canvas-field--accept" data-field="${escapeAttr(prop)}" data-editor="accept">
      <span>${escapeHtml(prop)}</span>
      <select data-prop="${escapeAttr(prop)}" data-role="mode">${modeOpts.join("")}</select>
      <div class="canvas-field-args" data-role="args"${mode?.args?.length ? "" : " hidden"}>${argsHtml}</div>
      <span class="canvas-field-error" hidden></span>
    </div>`;
  }

  const display = formatDisplay(raw);
  return `<label class="canvas-field" data-field="${escapeAttr(prop)}" data-editor="text">
    <span>${escapeHtml(prop)}</span>
    <input type="text" data-prop="${escapeAttr(prop)}" data-role="primary" value="${escapeAttr(display)}" spellcheck="false" />
    <span class="canvas-field-error" hidden></span>
  </label>`;
}

/**
 * @param {string} prop
 * @param {import('./propSpec.js').AcceptMode | undefined} mode
 * @param {Record<string, string>} args
 */
function renderArgsHtml(prop, mode, args) {
  if (!mode?.args?.length) return "";
  return mode.args
    .map((a) => {
      const label = a.name;
      const ph =
        mode.kind === "token"
          ? "token.name"
          : a.labeled
            ? `${a.name}:`
            : a.name;
      const v = args[a.name] ?? "";
      return `<label class="canvas-arg"><span>${escapeHtml(label)}</span>
        <input type="text" data-prop="${escapeAttr(prop)}" data-arg="${escapeAttr(a.name)}" value="${escapeAttr(v)}" placeholder="${escapeAttr(ph)}" spellcheck="false" />
      </label>`;
    })
    .join("");
}

/**
 * @param {HTMLElement} field
 * @param {import('./layers.js').CanvasLayer} layer
 * @param {string} frameKind
 * @param {Record<string, string>} activeAxes
 * @param {string | null} chosenAxis
 * @param {() => void} onEdited
 */
function wireField(field, layer, frameKind, activeAxes, chosenAxis, onEdited) {
  const prop = field.getAttribute("data-field");
  if (!prop) return;
  const editor = field.getAttribute("data-editor") || "text";
  const spec = editorSpecForProp(frameKind, prop);

  const commit = (push, notify = push) => {
    commitFieldEl(field, layer, frameKind, activeAxes, chosenAxis, {
      push,
      notify,
      onEdited,
    });
  };

  if (editor === "accept") {
    const modeSel = field.querySelector('select[data-role="mode"]');
    modeSel?.addEventListener("change", () => {
      const modeId = /** @type {HTMLSelectElement} */ (modeSel).value;
      const mode = spec.modes?.find((m) => m.id === modeId);
      const argsHost = field.querySelector('[data-role="args"]');
      if (argsHost) {
        argsHost.innerHTML = renderArgsHtml(prop, mode, {});
        argsHost.hidden = !(mode && mode.args.length > 0);
        bindArgInputs(/** @type {HTMLElement} */ (argsHost), () => commit(true));
      }
      commit(true);
    });
    const argsHost = field.querySelector('[data-role="args"]');
    if (argsHost) bindArgInputs(/** @type {HTMLElement} */ (argsHost), () => commit(true));
    commit(false, false);
    return;
  }

  const primary = field.querySelector("[data-role='primary']");
  if (primary instanceof HTMLSelectElement) {
    primary.addEventListener("change", () => commit(true));
    commit(false, false);
    return;
  }

  if (primary instanceof HTMLInputElement) {
    primary.addEventListener("change", () => commit(true));
    let t = 0;
    primary.addEventListener("input", () => {
      commit(false, false);
      window.clearTimeout(t);
      t = window.setTimeout(() => commit(true), 180);
    });
    commit(false, false);
  }
}

/**
 * @param {HTMLElement} host
 * @param {() => void} onCommit
 */
function bindArgInputs(host, onCommit) {
  host.querySelectorAll("input[data-arg]").forEach((input) => {
    const elInput = /** @type {HTMLInputElement} */ (input);
    let t = 0;
    elInput.addEventListener("change", () => onCommit());
    elInput.addEventListener("input", () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => onCommit(), 180);
    });
  });
}

/**
 * Read field UI → validate → optionally pending.
 * @param {HTMLElement} field
 * @param {import('./layers.js').CanvasLayer} layer
 * @param {string} frameKind
 * @param {Record<string, string>} activeAxes
 * @param {string | null} chosenAxis
 * @param {{ push?: boolean, notify?: boolean, onEdited?: () => void }} [opts]
 */
function commitFieldEl(field, layer, frameKind, activeAxes, chosenAxis, opts = {}) {
  const prop = field.getAttribute("data-field");
  if (!prop) return;
  const editor = field.getAttribute("data-editor") || "text";
  const spec = editorSpecForProp(frameKind, prop);
  const axisKeys = Object.keys(activeAxes ?? {});

  let rawText = "";

  if (editor === "enum") {
    const sel = field.querySelector('select[data-role="primary"]');
    rawText = sel instanceof HTMLSelectElement ? sel.value : "";
  } else if (editor === "accept" && spec.modes) {
    const modeSel = field.querySelector('select[data-role="mode"]');
    const modeId = modeSel instanceof HTMLSelectElement ? modeSel.value : "";
    /** @type {Record<string, string>} */
    const args = {};
    field.querySelectorAll("input[data-arg]").forEach((input) => {
      const name = input.getAttribute("data-arg");
      if (name) args[name] = /** @type {HTMLInputElement} */ (input).value;
    });
    const composed = encodeAcceptValue(spec.modes, modeId, args);
    rawText =
      composed === undefined || composed === null
        ? ""
        : typeof composed === "string"
          ? composed
          : String(composed);
  } else {
    const input = field.querySelector('input[data-role="primary"]');
    rawText = input instanceof HTMLInputElement ? input.value : "";
  }

  const validation = validateInspectorProp(frameKind, prop, rawText);
  setFieldValidity(field, validation);

  const baked = layer.props?.[prop];
  if (!validation.ok) {
    removePendingProp(layer.id, prop, { silent: true });
    if (opts.notify) opts.onEdited?.();
    return;
  }

  const value = validation.incomplete ? undefined : validation.value;
  if (isBlankUnset(value, baked)) {
    removePendingProp(layer.id, prop, { silent: true });
    if (opts.notify) opts.onEdited?.();
    return;
  }

  if (!opts.push) return;

  const current = effectiveProp(layer.id, prop, layer.props);
  if (valuesEqual(value, current)) {
    if (opts.notify) opts.onEdited?.();
    return;
  }

  /** @type {Record<string, string>} */
  const axes = {};
  if (chosenAxis && activeAxes[chosenAxis]) {
    axes[chosenAxis] = activeAxes[chosenAxis];
  } else if (axisKeys.length === 1) {
    axes[axisKeys[0]] = activeAxes[axisKeys[0]];
  } else if (axisKeys.length > 1 && !chosenAxis) {
    Object.assign(axes, activeAxes);
  }
  pushPending(
    {
      kind: "setProp",
      target: layer.id,
      prop,
      value,
      axes,
      warning: crossAxisWarning(axes) || undefined,
    },
    { silent: true },
  );
  if (opts.notify) opts.onEdited?.();
}

/**
 * @param {HTMLElement} field
 * @param {import('./validateProp.js').PropValidation | { ok: true, value?: unknown, incomplete?: boolean } | { ok: false, message: string, expected: string }} validation
 */
function setFieldValidity(field, validation) {
  const errEl = field.querySelector(".canvas-field-error");
  const control = field.querySelector("select, input[data-role='primary'], input[data-role='mode']");
  if (!errEl) return;
  if (validation.ok) {
    field.classList.remove("is-invalid");
    control?.setAttribute("aria-invalid", "false");
    errEl.hidden = true;
    errEl.textContent = "";
    return;
  }
  field.classList.add("is-invalid");
  control?.setAttribute("aria-invalid", "true");
  errEl.hidden = false;
  errEl.textContent = `${validation.message} — expect ${validation.expected}`;
}

function formatDisplay(v) {
  if (v === undefined || v === null) return "";
  if (typeof v === "object") {
    try {
      return formatValue(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

function valuesEqual(a, b) {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (typeof a === "string" && typeof b === "string") {
    const na = a.replace(/^\./, "");
    const nb = b.replace(/^\./, "");
    if (na === nb && /^[A-Za-z_][\w]*$/.test(na)) return true;
  }
  if (typeof a === "object" || typeof b === "object") {
    try {
      return formatValue(a) === formatValue(b);
    } catch {
      return false;
    }
  }
  return String(a) === String(b);
}

/**
 * @param {unknown} value
 * @param {unknown} baked
 */
function isBlankUnset(value, baked) {
  if (baked !== undefined && baked !== null && baked !== "") return false;
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}
