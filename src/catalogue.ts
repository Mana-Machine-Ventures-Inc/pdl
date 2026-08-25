/**
 * The `componentCatalogue` JSON contract, as produced by `pdl catalogue` in the Rust
 * compiler and consumed by the host (preview companions, interaction wiring, the
 * catalogue HTML page). Types only — nothing here parses or resolves PDL.
 *
 * Fields marked "omitted when empty" follow the stable-JSON omitEmpty policy, so
 * readers must treat absence and empty as the same thing.
 */
import type { BakedFrame } from "./bakeDesign.js";
import {
  PDL_JSON_SCHEMA_VERSION,
  type GraphThemeEntry,
  type GraphTokenRow,
  type GraphTypeStyleEntry,
} from "./graphJson.js";
import type { RuleDefJson } from "./rulesJson.js";

export {
  PDL_JSON_SCHEMA_VERSION,
  type GraphThemeEntry,
  type GraphTokenRow,
  type GraphTypeStyleEntry,
};

export type CatalogueVariantEntry = {
  /** Full snapshot of every variant-typed parameter for this permutation. */
  params: Record<string, string>;
  affectedFrames: string[];
  /** Non-structural property deltas keyed by stable `frameId`. */
  changes: { frameId: string; prop: string; value: unknown }[];
  structuralChange?: boolean;
  /** Full child map when this permutation's hierarchy differs from the default. */
  childHierarchy?: Record<string, string[]>;
};

/** Component root shell: `kind` plus resolved `props` for the default param tuple. */
export type CatalogueComponentRoot = {
  kind: string;
  props: Record<string, unknown>;
};

/** One ordered `tags.set` / `tags.add` operation, with the branch it sits under. */
export type CatalogueTagOp = {
  kind: "set" | "add";
  /** Present for `add`. */
  tag?: string;
  /** Present for `set`. */
  tags?: string[];
  /** Serialised condition when the op came from a `rules` `if` branch. */
  when?: unknown;
};

export type CatalogueComponent = {
  name: string;
  params: {
    name: string;
    type: string;
    default: unknown;
    /** PDL `variant` type name when `type` is `"variant"`; cases live on `variantTypes`. */
    variantTypeName?: string;
  }[];
  /** Absent means every param is exposed. */
  expose?: string[];
  /** Primary human-readable line from merged `usage.description`. */
  usage: string;
  /** All merged `usage` keys, including unknown keys preserved per spec. */
  usageByKey?: Record<string, string>;
  /** Named fixture → resolved param map for preview / codegen. */
  fixtures?: Record<string, Record<string, unknown>>;
  /**
   * Merged `rules`. `tags` is the unconditional set for readers that only want labels;
   * `tagOps` carries the ordered ops with their `when` conditions.
   */
  rules?: {
    tags: string[];
    tagOps?: CatalogueTagOp[];
    rules: Array<RuleDefJson & { when?: unknown }>;
  };
  /** Preview-time interaction handlers (serialised value-expression shapes). */
  interactions?: unknown[];
  /** Captures for emits raised by child instances (`dot.select(page) = { … }`). */
  emitCaptures?: unknown[];
  root: CatalogueComponentRoot;
  /** Stringified default binding for every component param. */
  defaultParams: Record<string, string>;
  /** Node registry: every frame id in any resolution except `Root`, id → shell. */
  childNodes: Record<string, BakedFrame>;
  /** Default resolution adjacency: frame id → ordered visible child ids, incl. `Root`. */
  childHierarchy: Record<string, string[]>;
  /** Other components reachable via `letInstance` / instance children. */
  requiredComponents?: string[];
  variants: CatalogueVariantEntry[];
};

/** Declared `variant` types in the merged design. */
export type CatalogueVariantTypeDef = {
  name: string;
  cases: string[];
};

/** @see {@link GraphTokenRow} */
export type CataloguePrimitiveEntry = GraphTokenRow;

/** @see {@link GraphTokenRow} */
export type CatalogueSemanticEntry = GraphTokenRow;

/** @see {@link GraphThemeEntry} */
export type CatalogueThemeEntry = GraphThemeEntry;

/** @see {@link GraphTypeStyleEntry} */
export type CatalogueTypeStyleEntry = GraphTypeStyleEntry;

export type ComponentCatalogue = {
  kind: "componentCatalogue";
  schemaVersion: string;
  generatedAt: string;
  /** Present only when built with `--theme`: the active theme for tree resolution. */
  theme?: string;
  primitives?: Record<string, CataloguePrimitiveEntry>;
  semantics?: Record<string, CatalogueSemanticEntry>;
  themes?: Record<string, CatalogueThemeEntry>;
  typeStyles?: Record<string, CatalogueTypeStyleEntry>;
  variantTypes?: Record<string, CatalogueVariantTypeDef>;
  components: Record<string, CatalogueComponent>;
  /** Evaluated typed sample banks (`samples Tracks { … }`), when present. */
  samples?: Record<string, Record<string, Record<string, unknown>>>;
};
