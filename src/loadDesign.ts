import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type {
  ComponentDecl,
  ExtendDecl,
  FixtureExampleDecl,
  ImportDecl,
  InteractionDecl,
  ModuleAst,
  PrimitiveDecl,
  RulesStatement,
  SemanticDecl,
  ThemeDecl,
  TopLevelDecl,
  TypeStyleDecl,
  UsageProp,
  VariantDecl,
} from "./ast.js";
import type { DesignDefinition, UsageKeyMap } from "./designModel.js";
import { PdlError } from "./errors.js";
import { parseModule } from "./parser.js";
import { validateMergedDesign } from "./validateDesign.js";

function isImport(d: TopLevelDecl): d is ImportDecl {
  return d.kind === "import";
}

/** `collectModules` can enqueue the same file multiple times when it is reachable via different import paths; merge each module once. */
function dedupeModulesInMergeOrder(ordered: ModuleAst[]): ModuleAst[] {
  const seen = new Set<string>();
  const out: ModuleAst[] = [];
  for (const mod of ordered) {
    const key = resolve(mod.path);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(mod);
  }
  return out;
}

function mergeUsageProps(target: UsageKeyMap, props: UsageProp[]): void {
  for (const p of props) {
    const cur = target.get(p.key);
    if (p.op === "=") {
      target.set(p.key, p.value);
    } else {
      target.set(p.key, cur !== undefined && cur.length > 0 ? `${cur} ${p.value}` : p.value);
    }
  }
}

function mergeFixtures(
  dest: Map<string, Map<string, FixtureExampleDecl>>,
  component: string,
  examples: FixtureExampleDecl[],
): void {
  let m = dest.get(component);
  if (!m) {
    m = new Map();
    dest.set(component, m);
  }
  for (const ex of examples) {
    m.set(ex.label, ex);
  }
}

function mergeRules(dest: Map<string, RulesStatement[]>, component: string, statements: RulesStatement[]): void {
  const arr = dest.get(component) ?? [];
  arr.push(...statements);
  dest.set(component, arr);
}

function mergeInteraction(
  dest: Map<string, Map<string, InteractionDecl>>,
  decl: InteractionDecl,
): void {
  let m = dest.get(decl.component);
  if (!m) {
    m = new Map();
    dest.set(decl.component, m);
  }
  m.set(decl.name, decl);
}

function applyExtend(
  entryPath: string,
  components: Map<string, ComponentDecl>,
  expose: Map<string, string[]>,
  usage: Map<string, UsageKeyMap>,
  fixtures: Map<string, Map<string, FixtureExampleDecl>>,
  rules: Map<string, RulesStatement[]>,
  ext: ExtendDecl,
): void {
  const c = ext.component;
  if (!components.has(c)) {
    throw new PdlError("PDL-E006", `extend targets unknown component \`${c}\``, { path: entryPath });
  }
  for (const sec of ext.sections) {
    switch (sec.kind) {
      case "expose":
        expose.set(c, sec.names);
        break;
      case "usage": {
        let u = usage.get(c);
        if (!u) {
          u = new Map();
          usage.set(c, u);
        }
        mergeUsageProps(u, sec.props);
        break;
      }
      case "fixtures":
        mergeFixtures(fixtures, c, sec.examples);
        break;
      case "rules":
        mergeRules(rules, c, sec.statements);
        break;
      default:
        break;
    }
  }
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
  const usage = new Map<string, UsageKeyMap>();
  const fixtures = new Map<string, Map<string, FixtureExampleDecl>>();
  const rules = new Map<string, RulesStatement[]>();
  const interactions = new Map<string, Map<string, InteractionDecl>>();
  let previewBackground: string | undefined;
  const resolvedEntry = resolve(entryPath);

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
        case "usage": {
          let u = usage.get(decl.component);
          if (!u) {
            u = new Map();
            usage.set(decl.component, u);
          }
          mergeUsageProps(u, decl.props);
          break;
        }
        case "fixtures":
          mergeFixtures(fixtures, decl.component, decl.examples);
          break;
        case "rules":
          mergeRules(rules, decl.component, decl.statements);
          break;
        case "interaction":
          mergeInteraction(interactions, decl);
          break;
        case "extend":
          applyExtend(resolvedEntry, components, expose, usage, fixtures, rules, decl);
          break;
        default:
          break;
      }
    }
  }

  return {
    entryPath: resolvedEntry,
    modulePaths: ordered.map((m) => m.path),
    previewBackground,
    primitives,
    semantics,
    themes,
    variants,
    typeStyles,
    components,
    expose,
    usage,
    fixtures,
    rules,
    interactions,
  };
}

export function loadDesign(entryPath: string): DesignDefinition {
  const ordered: ModuleAst[] = [];
  collectModules(entryPath, new Set(), ordered);
  const design = mergeDesign(entryPath, dedupeModulesInMergeOrder(ordered));
  validateMergedDesign(design);
  return design;
}
