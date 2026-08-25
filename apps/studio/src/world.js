import { state, emit } from "./state.js";
import { sampleRefsInBag } from "./symbols.js";

/**
 * @param {object} opts
 * @param {() => void} opts.onChange
 * @param {(samplePath: string) => void} [opts.onSampleClick]
 */
export function mountWorld(opts) {
  const chips = document.getElementById("worldChips");
  const samplesEl = document.getElementById("samplesUsed");
  const knobs = document.getElementById("paramKnobs");

  function currentRoot() {
    return state.previewRoot;
  }

  function renderWorld() {
    const root = currentRoot();
    const cat = state.catalogue;
    if (!root || !cat) {
      chips.innerHTML = `<span class="hint">Select a component to choose a world.</span>`;
      samplesEl.hidden = true;
      knobs.innerHTML = "";
      return;
    }

    const fixtures = cat.fixturesByComponent?.[root] ?? {};
    const labels = Object.keys(fixtures);
    const active = state.activeWorld[root] ?? null;

    if (!labels.length) {
      chips.innerHTML = `<span class="hint">No worlds (fixtures) for ${escapeHtml(root)}.</span>`;
    } else {
      chips.innerHTML = [
        `<button type="button" class="chip${!active ? " is-active" : ""}" data-world="">Default</button>`,
        ...labels.map(
          (label) =>
            `<button type="button" class="chip${active === label ? " is-active" : ""}" data-world="${escapeAttr(label)}">${escapeHtml(label)}</button>`,
        ),
      ].join("");
      chips.querySelectorAll(".chip").forEach((btn) => {
        btn.addEventListener("click", () => {
          const w = btn.getAttribute("data-world") || null;
          state.activeWorld[root] = w;
          // Apply fixture bag into ephemeral overrides (preview only).
          if (w && fixtures[w]) {
            state.paramOverrides[root] = {
              ...(state.paramOverrides[root] ?? {}),
              ...flattenScalars(fixtures[w]),
            };
          } else {
            state.paramOverrides[root] = {};
          }
          emit();
          opts.onChange();
          renderWorld();
        });
      });
    }

    const bag = active && fixtures[active] ? fixtures[active] : {};
    const refs = sampleRefsInBag(bag);
    if (refs.length) {
      samplesEl.hidden = false;
      samplesEl.innerHTML =
        `Samples used ` +
        refs
          .map(
            (r) =>
              `<button type="button" data-sample="${escapeAttr(r)}">${escapeHtml(r)}</button>`,
          )
          .join(" ");
      samplesEl.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", () => opts.onSampleClick?.(btn.getAttribute("data-sample")));
      });
    } else {
      samplesEl.hidden = true;
      samplesEl.innerHTML = "";
    }

    const params = cat.componentParams?.[root] ?? [];
    const kv = state.paramOverrides[root] ?? {};
    const knobParams = params.filter((p) => p.typeName !== "object").slice(0, 12);
    if (!knobParams.length) {
      knobs.innerHTML = `<span class="hint">Preview only — knobs are not saved until you edit a world in source.</span>`;
      return;
    }
    knobs.innerHTML =
      `<div class="hint" style="margin-bottom:6px">Preview only · not saved to world</div>` +
      knobParams
        .map((p) => {
          const cases = cat.variantCases?.[p.typeName];
          const val = kv[p.name] ?? p.default ?? "";
          if (Array.isArray(cases) && cases.length) {
            return `<label><span>${escapeHtml(p.name)}</span><select data-param="${escapeAttr(p.name)}">${cases
              .map(
                (c) =>
                  `<option value="${escapeAttr(c)}"${String(val) === c || String(val) === `.${c}` ? " selected" : ""}>${escapeHtml(c)}</option>`,
              )
              .join("")}</select></label>`;
          }
          return `<label><span>${escapeHtml(p.name)}</span><input data-param="${escapeAttr(p.name)}" value="${escapeAttr(String(val ?? ""))}" /></label>`;
        })
        .join("");

    knobs.querySelectorAll("[data-param]").forEach((el) => {
      const apply = () => {
        const name = el.getAttribute("data-param");
        if (!name) return;
        if (!state.paramOverrides[root]) state.paramOverrides[root] = {};
        let v = el.value;
        // Variant cases often need leading-dot form in bake overrides.
        const cases = cat.variantCases?.[knobParams.find((p) => p.name === name)?.typeName];
        if (Array.isArray(cases) && cases.includes(v)) v = `.${v.replace(/^\./, "")}`;
        if (v === "true") v = true;
        else if (v === "false") v = false;
        else if (v !== "" && !Number.isNaN(Number(v)) && /^-?\d+(\.\d+)?$/.test(v)) v = Number(v);
        state.paramOverrides[root][name] = v;
        opts.onChange();
      };
      el.addEventListener("change", apply);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") apply();
      });
    });
  }

  return { renderWorld };
}

function flattenScalars(bag) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(bag ?? {})) {
    if (v === null || v === undefined) continue;
    if (typeof v === "object") continue;
    out[k] = v;
  }
  return out;
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
