/**
 * Identity-preserving preview apply — morph rebaked HTML into a live iframe
 * document instead of assigning srcdoc (avoids focus/scroll teardown).
 *
 * Keys: data-pdl-instance-let → data-pdl-id → data-pdl-state → data-pdl-instance-key
 */

/**
 * @param {Element} el
 * @returns {string | null}
 */
export function previewNodeKey(el) {
  if (!el || el.nodeType !== 1 || typeof el.getAttribute !== "function") return null;
  return (
    el.getAttribute("data-pdl-instance-let") ||
    el.getAttribute("data-pdl-id") ||
    el.getAttribute("data-pdl-state") ||
    el.getAttribute("data-pdl-instance-key") ||
    null
  );
}

/**
 * @param {Document} doc
 */
export function capturePreviewEphemerals(doc) {
  /** @type {{ scrollX: number, scrollY: number, focus?: object, sessions: Record<string, string>, overflowScroll: Array<object> }} */
  const out = {
    scrollX: doc.defaultView?.scrollX ?? 0,
    scrollY: doc.defaultView?.scrollY ?? 0,
    sessions: {},
    overflowScroll: [],
  };
  const active = doc.activeElement;
  const tag = active && /** @type {Element} */ (active).tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") {
    const input = /** @type {HTMLInputElement} */ (active);
    const inst = input.closest("[data-pdl-instance-let]");
    out.focus = {
      instanceLet: inst?.getAttribute("data-pdl-instance-let") || null,
      editable: input.getAttribute("data-pdl-editable") || null,
      id: input.getAttribute("data-pdl-id") || null,
      value: input.value,
      selectionStart: input.selectionStart,
      selectionEnd: input.selectionEnd,
    };
  }
  doc.querySelectorAll("[data-pdl-session-params]").forEach((node) => {
    const k =
      node.getAttribute("data-pdl-instance-let") ||
      node.getAttribute("data-pdl-instance-key");
    if (!k) return;
    const raw = node.getAttribute("data-pdl-session-params");
    if (raw) out.sessions[k] = raw;
  });
  doc.querySelectorAll(".pdl-layout__content, .pdl-frame").forEach((node) => {
    const el = /** @type {HTMLElement} */ (node);
    if (typeof el.scrollTop !== "number") return;
    if (el.scrollTop || el.scrollLeft) {
      out.overflowScroll.push({
        key: previewNodeKey(el),
        path: cssPath(el),
        scrollTop: el.scrollTop,
        scrollLeft: el.scrollLeft,
      });
    }
  });
  return out;
}

/**
 * @param {Element} el
 */
function cssPath(el) {
  const parts = [];
  let cur = el;
  while (cur && cur.nodeType === 1 && parts.length < 8) {
    const key = previewNodeKey(cur);
    if (key) {
      parts.unshift(`[key=${key}]`);
      break;
    }
    const parent = cur.parentElement;
    if (!parent) break;
    const idx = Array.prototype.indexOf.call(parent.children, cur);
    parts.unshift(`${cur.tagName}:nth(${idx})`);
    cur = parent;
  }
  return parts.join(">");
}

/**
 * @param {Document} doc
 * @param {ReturnType<typeof capturePreviewEphemerals>} ephem
 * @param {{ preferInstanceLet?: string | null }} [opts]
 */
export function restorePreviewEphemerals(doc, ephem, opts = {}) {
  if (!ephem) return;
  try {
    doc.defaultView?.scrollTo(ephem.scrollX ?? 0, ephem.scrollY ?? 0);
  } catch {
    /* ignore */
  }
  for (const [k, raw] of Object.entries(ephem.sessions || {})) {
    const node =
      doc.querySelector(`[data-pdl-instance-let="${cssEscape(k)}"]`) ||
      doc.querySelector(`[data-pdl-instance-key="${cssEscape(k)}"]`);
    if (node && raw) {
      // Keep live session when still editing; bake may have stale value.
      try {
        const live = JSON.parse(node.getAttribute("data-pdl-session-params") || "{}");
        const prev = JSON.parse(raw);
        // Captured session wins for in-flight edits (bake/morph may reset value).
        const merged = { ...live, ...prev };
        if (prev.isEditing === true || prev.isEditing === "true" || live.isEditing === true) {
          if (prev.value !== undefined) merged.value = prev.value;
          merged.isEditing = true;
        }
        node.setAttribute("data-pdl-session-params", JSON.stringify(merged));
      } catch {
        node.setAttribute("data-pdl-session-params", raw);
      }
    }
  }
  for (const s of ephem.overflowScroll || []) {
    let node = null;
    if (s.key) {
      node =
        doc.querySelector(`[data-pdl-instance-let="${cssEscape(s.key)}"]`) ||
        doc.querySelector(`[data-pdl-id="${cssEscape(s.key)}"]`);
    }
    if (node instanceof HTMLElement) {
      node.scrollTop = s.scrollTop ?? 0;
      node.scrollLeft = s.scrollLeft ?? 0;
    }
  }
  const focus = ephem.focus;
  if (focus) {
    const prefer = opts.preferInstanceLet || focus.instanceLet;
    let input = null;
    if (prefer) {
      const inst = doc.querySelector(`[data-pdl-instance-let="${cssEscape(prefer)}"]`);
      input =
        inst?.querySelector(
          ".pdl-inst-state:not([hidden]) input.pdl-text--editable, input.pdl-text--editable",
        ) || null;
    }
    if (!input && focus.id) {
      input = doc.querySelector(`[data-pdl-id="${cssEscape(focus.id)}"]`);
    }
    if (input && (input.tagName === "INPUT" || input.tagName === "TEXTAREA")) {
      try {
        if (typeof focus.value === "string" && documentHasFocus(doc)) {
          if (focus.instanceLet && prefer === focus.instanceLet) {
            input.value = focus.value;
          }
        }
        input.focus();
        if (
          typeof focus.selectionStart === "number" &&
          typeof focus.selectionEnd === "number" &&
          typeof input.setSelectionRange === "function"
        ) {
          input.setSelectionRange(focus.selectionStart, focus.selectionEnd);
        }
      } catch {
        /* ignore */
      }
    }
  }
}

function documentHasFocus(doc) {
  try {
    return typeof doc.hasFocus === "function" ? doc.hasFocus() : true;
  } catch {
    return true;
  }
}

function cssEscape(s) {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(s);
  return String(s).replace(/["\\]/g, "\\$&");
}

const ATTR_SYNC = [
  "class",
  "style",
  "hidden",
  "value",
  "placeholder",
  "readonly",
  "tabindex",
  "aria-disabled",
  "data-pdl-session-params",
  "data-pdl-instance-kwargs",
  "data-pdl-editable",
  "data-pdl-state",
  "data-pdl-pointer-input",
];

/**
 * @param {Element} live
 * @param {Element} next
 */
function syncAttributes(live, next) {
  for (const name of ATTR_SYNC) {
    if (name === "value" && live.tagName === "INPUT") {
      if (live === live.ownerDocument.activeElement) continue;
      const v = next.getAttribute("value");
      if (v != null && /** @type {HTMLInputElement} */ (live).value !== v) {
        /** @type {HTMLInputElement} */ (live).value = v;
      }
      continue;
    }
    if (name === "hidden") {
      if (next.hasAttribute("hidden")) live.setAttribute("hidden", "");
      else live.removeAttribute("hidden");
      continue;
    }
    if (next.hasAttribute(name)) {
      const v = next.getAttribute(name);
      if (live.getAttribute(name) !== v) live.setAttribute(name, v ?? "");
    } else if (live.hasAttribute(name) && name.startsWith("data-")) {
      // keep live session if next omitted? prefer next truth
      live.removeAttribute(name);
    } else if (live.hasAttribute(name) && (name === "style" || name === "class")) {
      live.setAttribute(name, next.getAttribute(name) ?? "");
    }
  }
  // Copy remaining data-* from next
  for (const attr of Array.from(next.attributes)) {
    if (!attr.name.startsWith("data-") && attr.name !== "style" && attr.name !== "class") {
      continue;
    }
    if (ATTR_SYNC.includes(attr.name)) continue;
    if (live.getAttribute(attr.name) !== attr.value) {
      live.setAttribute(attr.name, attr.value);
    }
  }
}

/**
 * @param {Element} liveParent
 * @param {Element} nextParent
 */
function morphChildren(liveParent, nextParent) {
  const nextKids = Array.from(nextParent.children);
  const liveKids = Array.from(liveParent.children);
  const liveByKey = new Map();
  for (const ch of liveKids) {
    const k = previewNodeKey(ch);
    if (k && !liveByKey.has(k)) liveByKey.set(k, ch);
  }
  /** @type {Element[]} */
  const result = [];
  const used = new Set();

  function takeUnkeyed(nextCh) {
    const cls = nextCh.className || "";
    return liveKids.find(
      (ch) =>
        !used.has(ch) &&
        !previewNodeKey(ch) &&
        ch.tagName === nextCh.tagName &&
        (ch.className || "") === cls,
    );
  }

  for (const nextCh of nextKids) {
    const k = previewNodeKey(nextCh);
    let liveCh = k ? liveByKey.get(k) : null;
    if (liveCh && used.has(liveCh)) liveCh = null;
    if (!liveCh && !k) liveCh = takeUnkeyed(nextCh) || null;
    if (liveCh && liveCh.tagName === nextCh.tagName) {
      used.add(liveCh);
      morphElement(liveCh, nextCh);
      result.push(liveCh);
    } else {
      result.push(liveParent.ownerDocument.importNode(nextCh, true));
    }
  }
  while (liveParent.firstChild) liveParent.removeChild(liveParent.firstChild);
  for (const node of result) liveParent.appendChild(node);
}

/**
 * @param {Element} live
 * @param {Element} next
 */
export function morphElement(live, next) {
  if (live.tagName !== next.tagName) {
    live.replaceWith(live.ownerDocument.importNode(next, true));
    return;
  }
  syncAttributes(live, next);
  // Text nodes / inputs: sync text when not an element-child structure
  if (live.tagName === "INPUT") {
    return;
  }
  const liveHasElKids = live.children.length > 0;
  const nextHasElKids = next.children.length > 0;
  if (!liveHasElKids && !nextHasElKids) {
    if (live.textContent !== next.textContent) live.textContent = next.textContent;
    return;
  }
  morphChildren(live, next);
}

/**
 * Morph preview sections from nextHtml into liveDoc. Returns true if applied.
 * @param {Document} liveDoc
 * @param {string} nextHtml
 */
export function applyPreviewHtml(liveDoc, nextHtml) {
  const parser = new liveDoc.defaultView.DOMParser();
  const nextDoc = parser.parseFromString(nextHtml, "text/html");
  const liveGallery = liveDoc.querySelector(".pdl-gallery");
  const nextGallery = nextDoc.querySelector(".pdl-gallery");
  if (!liveGallery || !nextGallery) return false;

  const liveSections = Array.from(liveDoc.querySelectorAll("section.pdl-preview[data-pdl-component]"));
  const nextSections = Array.from(nextDoc.querySelectorAll("section.pdl-preview[data-pdl-component]"));
  if (liveSections.length === 0 || liveSections.length !== nextSections.length) {
    return false;
  }

  for (let i = 0; i < liveSections.length; i++) {
    const liveSec = liveSections[i];
    const nextSec = nextSections[i];
    if (liveSec.getAttribute("data-pdl-component") !== nextSec.getAttribute("data-pdl-component")) {
      return false;
    }
    // Params JSON mirror (collapsed <details> or legacy <p>)
    const liveParams = liveSec.querySelector(".pdl-preview-params");
    const nextParams = nextSec.querySelector(".pdl-preview-params");
    if (liveParams && nextParams) {
      const json =
        nextParams.getAttribute("data-json") ||
        nextParams.querySelector(".pdl-preview-params-line")?.textContent ||
        nextParams.textContent ||
        "{}";
      liveParams.setAttribute("data-json", json);
      const liveLine = liveParams.querySelector(".pdl-preview-params-line");
      const liveFull = liveParams.querySelector(".pdl-preview-params-full");
      const nextFull = nextParams.querySelector(".pdl-preview-params-full");
      if (liveLine) liveLine.textContent = json;
      if (liveFull) {
        liveFull.textContent =
          nextFull?.textContent ||
          (() => {
            try {
              return JSON.stringify(JSON.parse(json), null, 2);
            } catch {
              return json;
            }
          })();
      }
      if (!liveLine && !liveFull) liveParams.textContent = json;
    }

    // Fixture bar (§11 scenarios) — per component, above param knobs
    const liveFix = liveSec.querySelector(".pdl-fixture-bar");
    const nextFix = nextSec.querySelector(".pdl-fixture-bar");
    if (liveFix && nextFix) morphElement(liveFix, nextFix);
    else if (!liveFix && nextFix) {
      const head = liveSec.querySelector(".pdl-preview-head");
      const imported = liveSec.ownerDocument.importNode(nextFix, true);
      if (head) head.insertAdjacentElement("afterend", imported);
      else liveSec.insertBefore(imported, liveSec.firstChild);
    } else if (liveFix && !nextFix) {
      liveFix.remove();
    }

    // Param bar values — insert when WASM/full HTML gains controls the live doc lacked
    const liveBar = liveSec.querySelector(".pdl-param-bar");
    const nextBar = nextSec.querySelector(".pdl-param-bar");
    if (liveBar && nextBar) morphElement(liveBar, nextBar);
    else if (!liveBar && nextBar) {
      const head = liveSec.querySelector(".pdl-preview-head");
      const after = liveSec.querySelector(".pdl-fixture-bar") || head;
      const imported = liveSec.ownerDocument.importNode(nextBar, true);
      if (after) after.insertAdjacentElement("afterend", imported);
      else liveSec.insertBefore(imported, liveSec.firstChild);
    }

    // State trees / canvas: morph each top-level visual root inside section
    const liveVisuals = visualRoots(liveSec);
    const nextVisuals = visualRoots(nextSec);
    if (liveVisuals.length === nextVisuals.length && liveVisuals.length > 0) {
      for (let v = 0; v < liveVisuals.length; v++) {
        morphElement(liveVisuals[v], nextVisuals[v]);
      }
    } else {
      // Replace body of section after head/params/bar
      replaceVisualRegion(liveSec, nextSec);
    }
  }
  return true;
}

/**
 * @param {Element} section
 */
function visualRoots(section) {
  const roots = [];
  for (const ch of Array.from(section.children)) {
    if (ch.classList.contains("pdl-preview-head")) continue;
    if (ch.classList.contains("pdl-preview-params")) continue;
    if (ch.classList.contains("pdl-param-bar")) continue;
    if (ch.classList.contains("pdl-fixture-bar")) continue;
    if (ch.classList.contains("pdl-source-link")) continue;
    // (details.pdl-preview-params already skipped via class above)
    roots.push(ch);
  }
  return roots;
}

/**
 * @param {Element} liveSec
 * @param {Element} nextSec
 */
function replaceVisualRegion(liveSec, nextSec) {
  const liveRoots = visualRoots(liveSec);
  const nextRoots = visualRoots(nextSec);
  for (const r of liveRoots) r.remove();
  const anchor =
    liveSec.querySelector(".pdl-param-bar") ||
    liveSec.querySelector(".pdl-fixture-bar") ||
    liveSec.querySelector(".pdl-preview-params");
  for (const r of nextRoots) {
    const imported = liveSec.ownerDocument.importNode(r, true);
    if (anchor && anchor.parentElement === liveSec) {
      anchor.insertAdjacentElement("afterend", imported);
    } else {
      liveSec.appendChild(imported);
    }
  }
}

/**
 * Ask the iframe host to attach listeners on any new nodes.
 * @param {HTMLIFrameElement} frame
 */
export function requestInteractiveRebind(frame) {
  try {
    frame.contentWindow?.postMessage({ type: "pdl-rebind-interactive" }, "*");
  } catch {
    /* ignore */
  }
}
