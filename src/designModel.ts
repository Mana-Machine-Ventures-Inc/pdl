import type {
  ComponentDecl,
  PrimitiveDecl,
  SemanticDecl,
  ThemeDecl,
  TypeStyleDecl,
  VariantDecl,
} from "./ast.js";

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
};
