import {
  bakedComponentTreesEqual,
  changedEditableSessionTypes,
  frameTreeNestsInstanceTypes,
  reconcileBakedComponentIntoCanvas,
  reconcileBakedInstanceIntoElement,
} from "@pdl/bakeReconcile.ts";
import {
  collectEditableSessionDefaults,
  renderBakedDesignToHtmlDocumentWithReport,
} from "@pdl/renderHtml.ts";
import { loadWasmBake, virtualizeSources } from "./wasm-bake.js";

const FOLLOW_POLL_MS = 750;

const packSelect = document.getElementById("packSelect");
const componentSelect = document.getElementById("componentSelect");
const statusEl = document.getElementById("status");
const errorEl = document.getElementById("error");
const frame = document.getElementById("frame");

/** @type {Array<{ id: string; label: string; entry: string; defaultComponent: string }>} */
let packs = [];
/** @type {Record<string, string>} */
let files = {};
let entry = "";
let packId = "";
let diskRoot = false;
let theme = "";
/** @type {string[]} */
let components = [];
/** @type {Record<string, Record<string, Record<string, unknown>>>} */
let fixturesByComponent = {};
/** @type {Record<string, Array<{ name: string; typeName: string; default: unknown }>>} */
let componentParams = {};
/** @type {Record<string, string[]>} */
let variantCases = {};
/** @type {Record<string, unknown>} */
let interactionsByComponent = {};
/** @type {Record<string, unknown>} */
let emitCapturesByComponent = {};
/** @type {Record<string, string>} */
let usageByComponent = {};
/** @type {Record<string, unknown>} */
let rulesByComponent = {};
let enrichReady = false;
/** @type {Record<string, unknown>} */
let kv = {};
/** @type {string | null} */
let activeFixture = null;
let follow = true;
let lastStageRev = -1;
/** @type {object | null} */
let lastBaked = null;
let previewLive = false;
let renderSeq = 0;
let applyingRemote = false;
/** @type {ReturnType<typeof setTimeout> | null} */
let pollTimer = null;
/** @type {Map<string, object>} */
const instanceBakeIrCache = new Map();
/** @type {Map<string, number>} */
const instanceResolveToken = new Map();
/** @type {Map<string, Promise<void>>} */
const instanceResolveTail = new Map();

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function showError(msg) {
  if (!errorEl) return;
  if (!msg) {
    errorEl.hidden = true;
    errorEl.textContent = "";
    return;
  }
  errorEl.hidden = false;
  errorEl.textContent = msg;
}

function syncFollowButton() {}

function fillPackSelect() {
  if (!packSelect) return;
  packSelect.replaceChildren();
  for (const p of packs) {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.label;
    packSelect.append(opt);
  }
  if (packId) packSelect.value = packId;
}

function fillComponentSelect() {
  if (!componentSelect) return;
  const prev = componentSelect.value;
  componentSelect.replaceChildren();
  for (const name of components) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    componentSelect.append(opt);
  }
  if (prev && components.includes(prev)) componentSelect.value = prev;
}

function currentComponent() {
  return componentSelect?.value || components[0] || "";
}

function leaveFollow(reason) {
  if (!follow) return;
  follow = false;
  syncFollowButton();
  if (reason) setStatus(reason);
}

async function openPack(id, preferredComponent) {
  const res = await fetch("/api/open-pack", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ packId: id }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Open pack failed");
  packId = data.pack?.id || id;
  entry = data.entry;
  files = data.files ?? {};
  diskRoot = true;
  enrichReady = false;
  await refreshEnrich();
  if (!enrichReady) throw new Error("Load failed");
  fillPackSelect();
  fillComponentSelect();
  const want =
    preferredComponent && components.includes(preferredComponent)
      ? preferredComponent
      : data.defaultComponent && components.includes(data.defaultComponent)
        ? data.defaultComponent
        : components[0] || "";
  if (componentSelect && want) componentSelect.value = want;
  kv = {};
  activeFixture = null;
}

async function ensureSources() {
  if (files && Object.keys(files).length > 0 && entry) return;
  if (packId) {
    const res = await fetch("/api/open-pack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packId }),
    });
    const data = await res.json();
    if (data.ok) {
      files = data.files ?? files;
      if (typeof data.entry === "string" && data.entry) entry = data.entry;
    }
    return;
  }
  if (!entry) return;
  const res = await fetch("/api/disk-sources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entry }),
  });
  const data = await res.json();
  if (data.ok) files = { ...(data.files ?? {}), ...files };
}

/**
 * @param {object} meta
 */
function applyLoadMeta(meta) {
  if (!meta || meta.ok === false) return false;
  if (Array.isArray(meta.components) && meta.components.length) {
    components = meta.components;
  }
  if (meta.fixturesByComponent) fixturesByComponent = meta.fixturesByComponent;
  if (meta.componentParams) componentParams = meta.componentParams;
  if (meta.variantCases) variantCases = meta.variantCases;
  interactionsByComponent = meta.interactionsByComponent ?? {};
  emitCapturesByComponent = meta.emitCapturesByComponent ?? {};
  usageByComponent = meta.usageByComponent ?? {};
  rulesByComponent = meta.rulesByComponent ?? {};
  enrichReady = true;
  return true;
}

async function refreshEnrich() {
  if (!entry) return;
  const res = await fetch("/api/load", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      diskRoot ? { entry, diskRoot: true } : { entry, files },
    ),
  });
  const meta = await res.json();
  if (!applyLoadMeta(meta) && meta?.error) {
    throw new Error(meta.error);
  }
}

async function ensureEnrich() {
  if (enrichReady) return;
  await refreshEnrich();
}

/**
 * In-Safari Rust bake. Returns bakedDesign JSON or null (caller falls back to CLI).
 * @param {string} componentName
 * @param {Record<string, unknown>} [paramBag]
 */
async function bakeComponentWasm(componentName, paramBag) {
  await ensureSources();
  if (!entry || !files || Object.keys(files).length === 0) return null;
  const wasm = await loadWasmBake();
  if (!wasm) return null;
  const { filesJson, entry: virtEntry } = virtualizeSources(files, entry);
  const bakeJson = wasm.bake_component_sources(
    filesJson,
    virtEntry,
    componentName,
    theme || undefined,
    JSON.stringify(paramBag ?? {}),
  );
  return JSON.parse(bakeJson);
}

function renderBody() {
  const component = currentComponent();
  const overrides = component ? { [component]: { ...kv } } : {};
  return {
    files: diskRoot ? undefined : files,
    diskRoot: diskRoot || undefined,
    entry,
    mode: "component",
    component,
    theme: theme || undefined,
    interactiveHost: true,
    hostChrome: "device",
    engine: "rust",
    kv,
    componentOverrides: overrides,
    activeFixturesByComponent: activeFixture ? { [component]: activeFixture } : {},
  };
}

function requestInteractiveRebind() {
  try {
    frame.contentWindow?.postMessage({ type: "pdl-rebind-interactive" }, "*");
  } catch {
    /* ignore */
  }
}

/**
 * Single-component IR patch (desktop `tryIncrementalBakeReconcile`, one card).
 * @param {Document} doc
 * @param {object} prevBake
 * @param {object} nextBake
 * @param {string} component
 */
function tryDeviceBakeReconcile(doc, prevBake, nextBake, component) {
  try {
    const nextComp = nextBake?.components?.[component];
    if (!nextComp?.root) return false;
    const section = doc.querySelector(
      `section.pdl-preview[data-pdl-component="${CSS.escape(component)}"]`,
    );
    if (!section) return false;
    const canvas =
      section.querySelector(".pdl-state:not([hidden]) .pdl-canvas") ||
      section.querySelector(".pdl-canvas");
    if (!canvas) return false;
    const prevComp = prevBake?.components?.[component];
    const typeDefaults = editableTypeDefaults();
    const editableSessionDefaults = collectEditableSessionDefaults(nextBake, typeDefaults);
    const prevEditableDefaults = collectEditableSessionDefaults(prevBake, typeDefaults);
    const changedEditableTypes = changedEditableSessionTypes(
      prevEditableDefaults,
      editableSessionDefaults,
    );
    const nestsChangedDefaults =
      changedEditableTypes.size > 0 &&
      frameTreeNestsInstanceTypes(nextComp.root, changedEditableTypes);
    if (bakedComponentTreesEqual(prevComp, nextComp) && !nestsChangedDefaults) {
      return true;
    }
    const bp =
      nextComp.bakedParams && typeof nextComp.bakedParams === "object"
        ? { ...nextComp.bakedParams }
        : undefined;
    const prevBp =
      prevComp?.bakedParams && typeof prevComp.bakedParams === "object"
        ? { ...prevComp.bakedParams }
        : undefined;
    return reconcileBakedComponentIntoCanvas(canvas, prevComp, nextComp, {
      sessionParams: bp,
      prevSessionParams: prevBp,
      instCtx: { editableSessionDefaults },
      prevInstCtx: { editableSessionDefaults: prevEditableDefaults },
    });
  } catch {
    return false;
  }
}

/**
 * @param {object} bake
 * @param {string} component
 */
function editableTypeDefaults() {
  /** @type {Record<string, Record<string, unknown>>} */
  const out = {};
  for (const [name, params] of Object.entries(componentParams ?? {})) {
    /** @type {Record<string, unknown>} */
    const bag = {};
    for (const p of Array.isArray(params) ? params : []) {
      if (!p?.name) continue;
      if (
        (p.name === "activatesOn" ||
          p.name === "isEditing" ||
          p.name === "value" ||
          p.name === "isEmpty") &&
        p.default !== undefined
      ) {
        bag[p.name] = p.default;
      }
    }
    if (Object.keys(bag).length) out[name] = bag;
  }
  return out;
}

function renderHtmlLocal(bake, component) {
  const { html, renderFailures } = renderBakedDesignToHtmlDocumentWithReport(bake, {
    title: "PDL device",
    singleComponent: component,
    interactiveHost: true,
    hostChrome: "device",
    interactionsByComponent,
    emitCapturesByComponent,
    usageByComponent,
    rulesByComponent,
    editableTypeDefaults: editableTypeDefaults(),
  });
  if (renderFailures?.length) {
    console.warn(
      "device local HTML:",
      renderFailures.map((f) => `${f.component}: ${f.message}`).join("\n"),
    );
  }
  return typeof html === "string" && html.length > 0 ? html : null;
}

function remountSrcdoc(html) {
  previewLive = false;
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      previewLive = true;
      resolve();
    };
    frame.addEventListener("load", finish, { once: true });
    frame.srcdoc = html;
    setTimeout(finish, 1500);
  });
}

/**
 * @param {{ remount?: boolean }} [opts]
 */
async function runRender(opts = {}) {
  const remount = opts.remount === true;
  const component = currentComponent();
  if (!component || !entry) {
    setStatus("Pick a pack and component");
    return;
  }
  const id = ++renderSeq;
  setStatus("Rendering…");
  showError("");
  const t0 = performance.now();
  let bake = null;
  try {
    bake = await bakeComponentWasm(component, kv);
  } catch (err) {
    console.warn("device WASM bake failed:", err);
  }
  if (id !== renderSeq) return;

  const doc = frame.contentDocument;
  const canLive =
    !remount &&
    previewLive &&
    !!bake?.components?.[component] &&
    !!lastBaked?.components?.[component] &&
    !!doc?.querySelector?.(".pdl-gallery");
  if (canLive && tryDeviceBakeReconcile(doc, lastBaked, bake, component)) {
    lastBaked = bake;
    requestInteractiveRebind();
    const ms = Math.round(performance.now() - t0);
    setStatus(`${component} · ${ms}ms · wasm · live apply`);
    return;
  }

  instanceBakeIrCache.clear();
  instanceResolveToken.clear();
  instanceResolveTail.clear();

  await ensureEnrich();
  if (id !== renderSeq) return;

  let html = null;
  if (bake) {
    try {
      html = renderHtmlLocal(bake, component);
    } catch (err) {
      console.warn("device local HTML failed:", err);
    }
  }

  let data = null;
  if (!html) {
    if (bake) {
      const res = await fetch("/api/render-from-bake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bake,
          component,
          interactiveHost: true,
          hostChrome: "device",
          kv,
          componentOverrides: { [component]: { ...kv } },
          activeFixturesByComponent: activeFixture ? { [component]: activeFixture } : {},
          entry,
          diskRoot: diskRoot || undefined,
          files: diskRoot ? undefined : files,
        }),
      });
      data = await res.json();
    } else {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(renderBody()),
      });
      data = await res.json();
    }
    if (id !== renderSeq) return;
    if (!data || !data.ok) {
      showError(data?.error || "Render failed");
      setStatus("");
      frame.removeAttribute("srcdoc");
      lastBaked = null;
      previewLive = false;
      return;
    }
    html = typeof data.html === "string" ? data.html : "";
    if (data.baked && typeof data.baked === "object") bake = data.baked;
    if (Array.isArray(data.components) && data.components.length) {
      components = data.components;
    }
    if (data.fixturesByComponent) fixturesByComponent = data.fixturesByComponent;
    if (data.componentParams) componentParams = data.componentParams;
    if (data.variantCases) variantCases = data.variantCases;
  }

  lastBaked = bake && typeof bake === "object" ? bake : null;
  fillComponentSelect();
  if (componentSelect) componentSelect.value = component;
  await remountSrcdoc(html || "");
  if (id !== renderSeq) return;
  const ms = Math.round(performance.now() - t0);
  const engineBit = bake ? " · wasm" : "";
  setStatus(`${component} · ${ms}ms${engineBit}`);
}

async function bakeChild(childComponent, childParams) {
  const key = `${childComponent}\0${JSON.stringify(childParams ?? {})}`;
  const hit = instanceBakeIrCache.get(key);
  if (hit?.root) return hit;
  let wasmBake = null;
  try {
    wasmBake = await bakeComponentWasm(childComponent, childParams);
  } catch (err) {
    console.warn("device WASM child bake failed:", err);
  }
  const wasmComp = wasmBake?.components?.[childComponent];
  if (wasmComp?.root) {
    const packed = { root: wasmComp.root, bakedParams: wasmComp.bakedParams };
    instanceBakeIrCache.set(key, packed);
    return packed;
  }
  const res = await fetch("/api/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      files: diskRoot ? undefined : files,
      diskRoot: diskRoot || undefined,
      entry,
      mode: "component",
      component: childComponent,
      theme: theme || undefined,
      bakeOnly: true,
      interactiveHost: false,
      engine: "rust",
      componentOverrides: { [childComponent]: childParams ?? {} },
    }),
  });
  const data = await res.json();
  const bakedComp = data?.ok ? data.baked?.components?.[childComponent] : null;
  if (!bakedComp?.root) return null;
  const packed = { root: bakedComp.root, bakedParams: bakedComp.bakedParams };
  instanceBakeIrCache.set(key, packed);
  return packed;
}

function instanceKey(data) {
  const owner = typeof data.component === "string" ? data.component : "";
  const instanceLet = typeof data.instanceLet === "string" ? data.instanceLet : "";
  const child = typeof data.childComponent === "string" ? data.childComponent : "";
  return instanceLet ? `${owner}::${instanceLet}` : `${owner}::__root__::${child}`;
}

async function applyInstanceResolve(data, token) {
  const doc = frame.contentDocument;
  if (!doc || !previewLive) return;
  const owner = typeof data.component === "string" ? data.component : "";
  const instanceLet = typeof data.instanceLet === "string" ? data.instanceLet : "";
  const childComponent = typeof data.childComponent === "string" ? data.childComponent : "";
  const childParams =
    data.childParams && typeof data.childParams === "object" && !Array.isArray(data.childParams)
      ? data.childParams
      : {};
  if (!childComponent) return;
  const key = instanceKey(data);
  if (instanceResolveToken.get(key) !== token) return;
  const baked = await bakeChild(childComponent, childParams);
  if (instanceResolveToken.get(key) !== token) return;
  if (!baked?.root) return;
  const section = owner
    ? doc.querySelector(`section.pdl-preview[data-pdl-component="${CSS.escape(owner)}"]`)
    : null;
  if (!instanceLet) {
    if (!section) return;
    const canvas =
      section.querySelector(".pdl-state:not([hidden]) .pdl-canvas") ||
      section.querySelector(".pdl-canvas");
    if (!canvas) return;
    const prevComp = lastBaked?.components?.[owner] ?? null;
    const nextComp = {
      ...(prevComp && typeof prevComp === "object" ? prevComp : { name: owner }),
      name: owner,
      root: baked.root,
      bakedParams: baked.bakedParams ?? childParams,
    };
    const ok = reconcileBakedComponentIntoCanvas(canvas, prevComp, nextComp, {
      sessionParams: childParams,
      prevSessionParams:
        prevComp?.bakedParams && typeof prevComp.bakedParams === "object"
          ? { ...prevComp.bakedParams }
          : undefined,
    });
    if (!ok) return;
    if (lastBaked?.components) lastBaked.components[owner] = nextComp;
    return;
  }
  const node = (section || doc).querySelector(
    `[data-pdl-instance-let="${CSS.escape(instanceLet)}"]`,
  );
  if (!node) return;
  let prevRoot = null;
  try {
    const raw = node.getAttribute("data-pdl-instance-bake");
    if (raw) prevRoot = JSON.parse(raw);
  } catch {
    prevRoot = null;
  }
  let prevKwargs;
  try {
    prevKwargs = JSON.parse(node.getAttribute("data-pdl-instance-kwargs") || "{}");
  } catch {
    prevKwargs = undefined;
  }
  if (instanceResolveToken.get(key) !== token) return;
  const ok = reconcileBakedInstanceIntoElement(node, prevRoot, baked.root, {
    sessionParams: childParams,
    prevSessionParams: prevKwargs,
  });
  if (!ok) return;
  try {
    node.setAttribute("data-pdl-instance-bake", JSON.stringify(baked.root));
    node.setAttribute("data-pdl-instance-kwargs", JSON.stringify(childParams));
  } catch {
    /* ignore */
  }
}

function queueInstanceResolve(data) {
  const key = instanceKey(data);
  const token = (instanceResolveToken.get(key) || 0) + 1;
  instanceResolveToken.set(key, token);
  const prev = instanceResolveTail.get(key) || Promise.resolve();
  const next = prev
    .then(() => applyInstanceResolve(data, token))
    .catch((err) => console.warn("device instance resolve failed:", err));
  instanceResolveTail.set(key, next);
}

function applyFixture(component, label) {
  const examples = fixturesByComponent[component];
  activeFixture = label;
  if (label && examples && typeof examples === "object" && examples[label]) {
    kv = { ...examples[label] };
  } else if (!label) {
    kv = {};
  }
  void runRender();
}

function applyParams(component, nextKv) {
  kv = { ...nextKv };
  activeFixture = null;
  if (componentSelect && component) componentSelect.value = component;
  void runRender();
}

async function applyStage(stage) {
  if (!stage || typeof stage !== "object") return;
  applyingRemote = true;
  try {
    const prevPack = packId;
    const prevEntry = entry;
    packId = typeof stage.packId === "string" ? stage.packId : packId;
    entry = typeof stage.entry === "string" ? stage.entry : entry;
    diskRoot = stage.diskRoot === true;
    files =
      stage.files && typeof stage.files === "object" && !Array.isArray(stage.files)
        ? Object.keys(stage.files).length > 0
          ? stage.files
          : files
        : files;
    if (packId !== prevPack || entry !== prevEntry) enrichReady = false;
    await ensureSources();
    await ensureEnrich();
    if (typeof stage.theme === "string") theme = stage.theme;
    if (Array.isArray(stage.components) && stage.components.length) {
      components = stage.components.map(String);
    }
    kv = stage.kv && typeof stage.kv === "object" && !Array.isArray(stage.kv) ? { ...stage.kv } : {};
    activeFixture = typeof stage.activeFixture === "string" ? stage.activeFixture : null;
    fillPackSelect();
    fillComponentSelect();
    const want = typeof stage.component === "string" ? stage.component : "";
    if (componentSelect && want && components.includes(want)) componentSelect.value = want;
    await runRender({ remount: true });
  } finally {
    applyingRemote = false;
  }
}

async function pollStage() {
  if (!follow || document.hidden) return;
  try {
    const res = await fetch("/api/stage");
    const data = await res.json();
    if (!follow) return;
    if (!data.ok || !data.stage) return;
    const rev = typeof data.rev === "number" ? data.rev : data.stage.rev;
    if (rev === lastStageRev) return;
    lastStageRev = rev;
    await applyStage(data.stage);
  } catch {
    /* ignore poll errors */
  }
}

function schedulePoll() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    void pollStage();
  }, FOLLOW_POLL_MS);
}

window.addEventListener("message", (ev) => {
  const data = ev.data;
  if (!data || typeof data !== "object") return;
  if (data.type === "pdl-fixture" && typeof data.component === "string") {
    leaveFollow("Local · fixture");
    const label =
      typeof data.label === "string" && data.label.trim() ? String(data.label) : null;
    applyFixture(data.component, label);
    return;
  }
  if (data.type === "pdl-param" && data.component && data.kv && typeof data.kv === "object") {
    leaveFollow("Local · variant");
    applyParams(String(data.component), data.kv);
    return;
  }
  if (data.type === "pdl-resolve-instance") {
    queueInstanceResolve(data);
    return;
  }
  if (data.type === "pdl-interaction") {
    const evName = typeof data.event === "string" ? data.event : "";
    const comp = typeof data.component === "string" ? data.component : currentComponent();
    if (evName) setStatus(`${comp} · ${evName}`);
    if (
      data.previewHandled !== true &&
      data.changed &&
      data.params &&
      typeof data.params === "object"
    ) {
      leaveFollow("Local · interaction");
      kv = { ...data.params };
      void runRender();
    }
  }
});

packSelect?.addEventListener("change", () => {
  if (applyingRemote) return;
  leaveFollow("Local · pack");
  void openPack(packSelect.value).then(() => runRender({ remount: true }));
});
componentSelect?.addEventListener("change", () => {
  if (applyingRemote) return;
  leaveFollow("Local · component");
  kv = {};
  activeFixture = null;
  void runRender({ remount: true });
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && follow) void pollStage();
});

void (async () => {
  try {
    const params = new URLSearchParams(location.search);
    if (params.get("follow") === "0") follow = false;
    syncFollowButton();
    setStatus("Connecting to Mac…");
    void loadWasmBake();
    const cat = await fetch("/api/catalog").then((r) => r.json());
    packs = Array.isArray(cat.packs) ? cat.packs : [];
    fillPackSelect();

    const wantPack = params.get("pack") || "";
    const wantComp = params.get("component") || "";
    if (wantPack || params.get("follow") === "0") {
      follow = false;
      syncFollowButton();
      const id = wantPack && packs.some((p) => p.id === wantPack) ? wantPack : packs[0]?.id;
      if (id) {
        await openPack(id, wantComp || undefined);
        await runRender({ remount: true });
      }
    } else {
      const staged = await fetch("/api/stage").then((r) => r.json());
      if (staged.ok && staged.stage) {
        lastStageRev = typeof staged.rev === "number" ? staged.rev : staged.stage.rev ?? 0;
        await applyStage(staged.stage);
      } else {
        follow = false;
        syncFollowButton();
        const id = packs[0]?.id;
        if (id) {
          await openPack(id);
          await runRender({ remount: true });
        }
      }
    }
    schedulePoll();
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e));
    setStatus("Could not load from this Mac");
  }
})();
