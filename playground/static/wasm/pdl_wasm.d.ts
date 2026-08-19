/* tslint:disable */
/* eslint-disable */

/**
 * List component names after merge/validate (sorted).
 */
export function analyze_sources(files_json: string, entry: string): string;

/**
 * Apply presenter verbs to a pin bag. `pinsJson` / `opsJson` → next `pinsJson`.
 */
export function apply_presenter_pins(pins_json: string, ops_json: string): string;

/**
 * Bake one component; returns bake-document JSON string.
 */
export function bake_component_sources(files_json: string, entry: string, component: string, theme?: string | null, kv_json?: string | null, host?: string | null, host_facts_json?: string | null, pins_json?: string | null): string;

/**
 * Bake all components (system defaults).
 */
export function bake_system_sources(files_json: string, entry: string, theme?: string | null, host?: string | null, host_facts_json?: string | null): string;

/**
 * Bake a variant-matrix gallery in one load.
 *
 * `cells_json` is a JSON array of `{ "component": "Name", "label": "Name · …", "kv": {…} }`.
 * Design sources are parsed **once**; each cell resolves against that design.
 * Optional `pins_by_component_json` is `{ "Name": <pins bag>, … }` for screen cells.
 */
export function bake_variant_matrix_sources(files_json: string, entry: string, cells_json: string, theme?: string | null, host?: string | null, host_facts_json?: string | null, pins_by_component_json?: string | null): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly analyze_sources: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly apply_presenter_pins: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly bake_component_sources: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number) => [number, number, number, number];
    readonly bake_system_sources: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => [number, number, number, number];
    readonly bake_variant_matrix_sources: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number) => [number, number, number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
