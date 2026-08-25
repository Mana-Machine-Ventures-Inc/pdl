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
  const modeGroup = document.getElementById("worldMode");

  modeGroup?.querySelectorAll("[data-world-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-world-mode");
      state.worldMode = mode === "params" ? "params" : "fixtures";
      emit();
      renderWorld();
    });
  });

  function currentRoot() {
    return state.previewRoot;
  }

  function syncModeChrome(hasFixtures, hasParams) {
    if (!modeGroup) return;
    const showToggle = hasFixtures && hasParams;
    modeGroup.hidden = !showToggle;
    if (!showToggle) {
      if (hasParams && !hasFixtures) state.worldMode = "params";
      else if (hasFixtures && !hasParams) state.worldMode = "fixtures";
    }
    modeGroup.querySelectorAll("[data-world-mode]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-world-mode") === state.worldMode);
    });
  }

  function renderWorld() {
    const root = currentRoot();
    const cat = state.catalogue;
    if (!root || !cat || state.selectedKind !== "component") {
      if (modeGroup) modeGroup.hidden = true;
      chips.innerHTML = `<span class="hint">Select a component to choose a world.</span>`;
      samplesEl.hidden = true;
      knobs.innerHTML = "";
      return;
    }

    const fixtures = cat.fixturesByComponent?.[root] ?? {};
    const labels = Object.keys(fixtures);
    const active = state.activeWorld[root] ?? null;
    const params = cat.componentParams?.[root] ?? [];
    const knobParams = params.filter((p) => p.typeName !== "object").slice(0, 12);
    const hasFixtures = labels.length > 0;
    const hasParams = knobParams.length > 0;
    syncModeChrome(hasFixtures, hasParams);

    const showFixtures = state.worldMode === "fixtures" || !hasParams;
    const showParams = state.worldMode === "params" || !hasFixtures;

    if (!showFixtures) {
      chips.innerHTML = "";
      samplesEl.hidden = true;
      samplesEl.innerHTML = "";
    } else if (!hasFixtures) {
      chips.innerHTML = `<span class="hint">No fixtures for ${escapeHtml(root)}. Switch to Params to edit knobs.</span>`;
      samplesEl.hidden = true;
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
          state.worldMode = "fixtures";
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
    }

    if (!showParams) {
      knobs.innerHTML = "";
      return;
    }

    const kv = state.paramOverrides[root] ?? {};
    if (!knobParams.length) {
      knobs.innerHTML = `<span class="hint">No editable params on this component.</span>`;
      return;
    }
    knobs.innerHTML =
      `<div class="hint" style="margin-bottom:6px">Param knobs · preview only (clears active fixture)</div>` +
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
        // Editing knobs leaves fixture mode — same as Playground iframe param bar.
        state.activeWorld[root] = null;
        state.worldMode = "params";
        if (!state.paramOverrides[root]) state.paramOverrides[root] = {};
        let v = el.value;
        const cases = cat.variantCases?.[knobParams.find((p) => p.name === name)?.typeName];
        if (Array.isArray(cases) && cases.includes(v)) v = `.${v.replace(/^\./, "")}`;
        if (v === "true") v = true;
        else if (v === "false") v = false;
        else if (v !== "" && !Number.isNaN(Number(v)) && /^-?\d+(\.\d+)?$/.test(v)) v = Number(v);
        state.paramOverrides[root][name] = v;
        opts.onChange();
        renderWorld();
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
