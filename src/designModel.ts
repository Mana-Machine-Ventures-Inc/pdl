import type {
  ComponentDecl,
  FixtureExampleDecl,
  InteractionDecl,
  PrimitiveDecl,
  RulesStatement,
  SemanticDecl,
  ThemeDecl,
  TypeStyleDecl,
  VariantDecl,
} from "./ast.js";

/** Merged `usage` / `usage { … }` string values per key (v1: typically `description`). */
export type UsageKeyMap = Map<string, string>;

/** Fully merged design (import closure + entry), pre-resolution. */
export type DesignDefinition = {
  entryPath: string;
  /** Post-order DFS: dependencies then dependents; last module wins on symbol clashes. */
  modulePaths: string[];
  previewBackground?: string;
  primitives: Map<string, PrimitiveDecl>;
  semantics: Map<string, SemanticDecl>;
  themes: Map<string, ThemeDecl>;
  variants: Map<string, VariantDecl>;
  typeStyles: Map<string, TypeStyleDecl>;
  components: Map<string, ComponentDecl>;
  /** Last `expose` block wins per component name. */
  expose: Map<string, string[]>;
  /** Per component, merged `usage` keys (last `=` wins; `+=` appends with a single space). */
  usage: Map<string, UsageKeyMap>;
  /** Per component, fixtures keyed by example label (later replaces same label). */
  fixtures: Map<string, Map<string, FixtureExampleDecl>>;
  /** Per component, ordered `rules` statements (tags, Rule lines, nested `if`). */
  rules: Map<string, RulesStatement[]>;
  /** Per component, interactions by name (later block with same name replaces). */
  interactions: Map<string, Map<string, InteractionDecl>>;
};
