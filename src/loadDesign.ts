import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type {
  ComponentDecl,
  ImportDecl,
  ModuleAst,
  PrimitiveDecl,
  SemanticDecl,
  ThemeDecl,
  TopLevelDecl,
  TypeStyleDecl,
  VariantDecl,
} from "./ast.js";
import type { DesignDefinition } from "./designModel.js";
import { PdlError } from "./errors.js";
import { parseModule } from "./parser.js";

function isImport(d: TopLevelDecl): d is ImportDecl {
  return d.kind === "import";
}

function collectModules(
  entryPath: string,
  visiting: Set<string>,
  ordered: ModuleAst[],
): void {
  const abs = resolve(entryPath);
  if (visiting.has(abs)) {
    throw new PdlError("PDL-E002", `Import cycle detected at ${entryPath}`, { path: entryPath });
  }
  visiting.add(abs);
  const source = readFileSync(abs, "utf-8");
  const mod = parseModule(source, abs);
  for (const decl of mod.declarations) {
    if (isImport(decl)) {
      const next = join(dirname(abs), decl.path);
      collectModules(next, visiting, ordered);
    }
  }
  visiting.delete(abs);
  ordered.push(mod);
}

function mergeDesign(entryPath: string, ordered: ModuleAst[]): DesignDefinition {
  const primitives = new Map<string, PrimitiveDecl>();
  const semantics = new Map<string, SemanticDecl>();
  const themes = new Map<string, ThemeDecl>();
  const variants = new Map<string, VariantDecl>();
  const typeStyles = new Map<string, TypeStyleDecl>();
  const components = new Map<string, ComponentDecl>();
  const expose = new Map<string, string[]>();
  let previewBackground: string | undefined;

  for (const mod of ordered) {
    for (const decl of mod.declarations) {
      switch (decl.kind) {
        case "import":
          break;
        case "previewBackground":
          previewBackground = decl.token;
          break;
        case "primitive":
          primitives.set(decl.name, decl);
          break;
        case "semantic":
          semantics.set(decl.name, decl);
          break;
        case "theme":
          themes.set(decl.name, decl);
          break;
        case "variant":
          variants.set(decl.name, decl);
          break;
        case "typeStyle":
          typeStyles.set(decl.name, decl);
          break;
        case "component":
          components.set(decl.name, decl);
          break;
        case "expose":
          expose.set(decl.component, decl.names);
          break;
        default:
          break;
      }
    }
  }

  return {
    entryPath: resolve(entryPath),
    modulePaths: ordered.map((m) => m.path),
    previewBackground,
    primitives,
    semantics,
    themes,
    variants,
    typeStyles,
    components,
    expose,
  };
}

export function loadDesign(entryPath: string): DesignDefinition {
  const ordered: ModuleAst[] = [];
  collectModules(entryPath, new Set(), ordered);
  return mergeDesign(entryPath, ordered);
}
