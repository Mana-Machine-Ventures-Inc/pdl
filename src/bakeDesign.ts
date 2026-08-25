/**
 * The `bakedDesign` JSON contract, as produced by `pdl bakeSystem` / `bakeComponent` /
 * `bakePack` in the Rust compiler and consumed by the host (renderHtml, bakeReconcile,
 * evaluateRules). Types only — nothing here parses or bakes PDL.
 */

/** One frame in a baked tree. Every prop value is already literal. */
export type BakedFrame = {
  id: string;
  kind: string;
  props: Record<string, unknown>;
  children: BakedFrame[];
  /** Source component name when this frame is the root of an inlined instance child. */
  instanceOf?: string;
  /** Evaluated call-site `kwargs` for that instance. */
  instanceKwargs?: Record<string, unknown>;
  /**
   * Owning ForEach / list param name when the instance came from a list (`chips`,
   * `tracks`). Hosts match catalogue emit captures against this.
   */
  foreachList?: string;
};

export type BakedComponentJson = {
  name: string;
  rootKind: string;
  /** Omitted when empty under omitEmpty. */
  bakedParams?: Record<string, unknown>;
  root: BakedFrame;
};

export type BakedDesignDocument = {
  schemaKind: "bakedDesign";
  schemaVersion: string;
  generatedAt: string;
  provenance: {
    entryPath: string;
    bakedTheme: string | null;
    /** `system-defaults` | `component-explicit` | `injection-pack` | future profiles */
    bakeProfile: string;
  };
  /**
   * Resolved CSS color for `previewBackground` (when declared), after theme apply.
   * Omitted when unset or unresolvable.
   */
  previewBackground?: string;
  components: Record<string, BakedComponentJson>;
};

/** Frames with `props.hidden === true` are not painted. */
export function isHiddenFrame(f: BakedFrame): boolean {
  return f.props.hidden === true;
}
