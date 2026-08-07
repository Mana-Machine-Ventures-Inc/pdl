/**
 * Optional WASM bake (pdl-wasm). Loads lazily; returns null if artifacts missing.
 */

/** @type {Promise<{ analyze_sources: Function; bake_component_sources: Function; bake_system_sources: Function } | null> | null} */
let wasmPromise = null;

export function virtualizeSources(files, entry) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const [rel, text] of Object.entries(files ?? {})) {
    const key = `/v/${String(rel).replace(/^\/+/, "").replace(/\\/g, "/")}`;
    out[key] = text;
  }
  const entryKey = `/v/${String(entry).replace(/^\/+/, "").replace(/\\/g, "/")}`;
  return { filesJson: JSON.stringify(out), entry: entryKey };
}

export function loadWasmBake() {
  if (!wasmPromise) {
    wasmPromise = (async () => {
      try {
        const mod = await import("/wasm/pdl_wasm.js");
        await mod.default();
        return {
          analyze_sources: mod.analyze_sources,
          bake_component_sources: mod.bake_component_sources,
          bake_system_sources: mod.bake_system_sources,
        };
      } catch (e) {
        console.warn("WASM bake unavailable:", e);
        return null;
      }
    })();
  }
  return wasmPromise;
}
