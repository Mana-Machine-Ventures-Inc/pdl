import type {
  ChildEntry,
  ComponentDecl,
  ComponentParam,
  ConditionExpr,
  ExposeDecl,
  ExtendDecl,
  ExtendSection,
  FixtureBinding,
  FixtureExampleDecl,
  FixturesDecl,
  FrameBodyItem,
  IfChain,
  ImportDecl,
  InteractionHandlerItem,
  InteractionIfChain,
  ModuleAst,
  PreviewBackgroundDecl,
  PrimitiveDecl,
  RuleChainTerminalParsed,
  RulePathExpr,
  RulePathStep,
  RuleQueryParsed,
  RulesDecl,
  RulesIfChain,
  RulesStatement,
  SampleEntryDecl,
  SampleFieldDecl,
  SamplesDecl,
  SemanticDecl,
  ThemeDecl,
  TopLevelDecl,
  TypeStyleDecl,
  UsageDecl,
  UsageProp,
  ValueExpr,
  VariantDecl,
} from "./ast.js";
import { PdlError } from "./errors.js";
import { looksLikeQualifiedEnumTypeName } from "./frameProps.js";
import type { Token, TokenKind } from "./lexer.js";
import { isMotionPropName, MOTION_PROP_NAMES } from "./motionProps.js";
import { inferValueLetType } from "./paramTypes.js";
import {
  FRAME_CTOR_TO_KIND,
  frameCtorKwargsToBody,
  isFrameCtorName,
  lowerWorldABody,
  RESERVED_FRAME_CTOR_COMPONENT_NAMES,
  type FrameCtorName,
} from "./worldA.js";

export class Parser {
  private readonly tokens: Token[];
  private index = 0;
  private readonly filePath: string;
  /** Host handlers collected while parsing the current component kind body. */
  private pendingHostHandlers: { event: string; body: InteractionHandlerItem[] }[] = [];

  constructor(tokens: Token[], filePath: string) {
    this.tokens = tokens;
    this.filePath = filePath;
  }

  parseModule(): ModuleAst {
    const declarations: TopLevelDecl[] = [];
    while (!this.is("EOF")) {
      const decl = this.parseTopLevel();
      if (decl.kind === "component") {
        const name = decl.name;
        const hostHandlers = this.pendingHostHandlers;
        this.pendingHostHandlers = [];
        declarations.push(decl);
        if (hostHandlers.length > 0) {
          declarations.push({
            kind: "interaction",
            name: "default",
            component: name,
            handlers: hostHandlers,
          });
        }
        // Trailing `} emits { … }` (skipped in TS oracle).
        if (this.is("emits") && this.peekAheadKind(1) === "{") {
          this.skipInlineEmitsBlock();
        }
        if (this.is("interaction")) {
          throw this.errInteractionRemoved();
        }
      } else {
        declarations.push(decl);
      }
    }
    return { kind: "module", path: this.filePath, declarations };
  }

  private parseTopLevel(): TopLevelDecl {
    const t = this.peek();
    switch (t.kind) {
      case "import":
        return this.parseImport();
      case "previewBackground":
        return this.parsePreviewBackground();
      case "primitive":
        return this.parsePrimitive();
      case "semantic":
        return this.parseSemantic();
      case "theme":
        return this.parseTheme();
      case "typeStyle":
        return this.parseTypeStyle();
      case "variant":
        return this.parseVariant();
      case "protocol":
        return this.parseProtocol();
      case "component":
        return this.parseComponent();
      case "expose":
        return this.parseExpose();
      case "interaction":
        throw this.errInteractionRemoved();
      case "fixtures":
        return this.parseFixtures();
      case "samples":
        return this.parseSamples();
      case "usage":
        return this.parseUsage();
      case "rules":
        return this.parseRules();
      case "extend":
        return this.parseExtend();
      default:
        throw this.err(`Unexpected token ${t.kind} at top level`);
    }
  }

  private parseImport(): ImportDecl {
    this.consume("import");
    const p = this.consume("STRING");
    return { kind: "import", path: p.value };
  }

  private parsePreviewBackground(): PreviewBackgroundDecl {
    this.consume("previewBackground");
    const token = this.parseQualifiedName();
    return { kind: "previewBackground", token };
  }

  /** Dotted token paths (`color.surface.primary`) and other qualified names. */
  private parseQualifiedName(): string {
    return this.finishQualifiedName(this.consume("IDENT").value);
  }

  private finishQualifiedName(first: string): string {
    let n = first;
    while (this.is(".")) {
      this.consume(".");
      n += "." + this.consume("IDENT").value;
    }
    return n;
  }

  /** Parameter types may use keyword spellings (`Icon`, `Color`, …). */
  private consumeParamTypeName(): string {
    const t = this.peek();
    if (t.kind === "IDENT") return this.consume("IDENT").value;
    const typeKeywords: TokenKind[] = [
      "Color",
      "Opacity",
      "Distance",
      "Radius",
      "Shadow",
      "Icon",
      "MediaSource",
      "Ratio",
      "FontFamily",
      "Size",
      "Weight",
      "LineHeight",
      "LetterSpacing",
      "Sizing",
      "Duration",
      "Easing",
      "Transition",
      "Pose",
      "Stagger",
      "Motion",
      "Blur",
      "Vibrancy",
      "Ramp",
      "Background",
      "Foreground",
      "EdgeInsets",
      "CornerRadii",
      "GradientStop",
      "Media",
      "BlurStyle",
    ];
    if (typeKeywords.includes(t.kind)) {
      return this.advance().value;
    }
    throw this.err(`Expected parameter type name, got ${t.kind}`);
  }

  private consumeTokenTypeName(): string {
    const t = this.peek();
    if (t.kind === "IDENT") return this.consume("IDENT").value;
    const typeKeywords: TokenKind[] = [
      "Color",
      "Opacity",
      "Distance",
      "Radius",
      "Shadow",
      "Icon",
      "MediaSource",
      "Ratio",
      "FontFamily",
      "Size",
      "Weight",
      "LineHeight",
      "LetterSpacing",
      "Sizing",
      "Duration",
      "Easing",
      "Transition",
      "Pose",
      "Stagger",
      "Motion",
      "Blur",
      "Vibrancy",
      "Ramp",
      "Background",
      "Foreground",
      "EdgeInsets",
      "CornerRadii",
      "GradientStop",
      "Media",
      "BlurStyle",
    ];
    if (typeKeywords.includes(t.kind)) {
      return this.advance().value;
    }
    throw this.err(`Expected token type name, got ${t.kind}`);
  }

  private parsePrimitive(): PrimitiveDecl {
    this.consume("primitive");
    const name = this.parseQualifiedName();
    this.consume(":");
    const tokenType = this.consumeTokenTypeName();
    this.consume("=");
    const value = this.parseValueExpr();
    return { kind: "primitive", name, tokenType, value };
  }

  private parseSemantic(): SemanticDecl {
    this.consume("semantic");
    const name = this.parseQualifiedName();
    this.consume(":");
    const tokenType = this.consumeTokenTypeName();
    this.consume("=");
    const value = this.parseValueExpr();
    return { kind: "semantic", name, tokenType, value };
  }

  private parseTheme(): ThemeDecl {
    this.consume("theme");
    const name = this.consume("IDENT").value;
    let baseTheme: string | undefined;
    if (this.is(":")) {
      this.consume(":");
      baseTheme = this.consume("IDENT").value;
    }
    this.consume("{");
    const overrides: Record<string, ValueExpr> = {};
    while (!this.is("}")) {
      const key = this.parseQualifiedName();
      this.consume("=");
      overrides[key] = this.parseValueExpr();
    }
    this.consume("}");
    return { kind: "theme", name, baseTheme, overrides };
  }

  private parseTypeStyle(): TypeStyleDecl {
    this.consume("typeStyle");
    const name = this.consume("IDENT").value;
    this.consume("{");
    const props: Record<string, ValueExpr> = {};
    while (!this.is("}")) {
      const k = this.consume("IDENT").value;
      this.consume("=");
      props[k] = this.parseValueExpr();
    }
    this.consume("}");
    return { kind: "typeStyle", name, props };
  }

  private parseVariant(): VariantDecl {
    this.consume("variant");
    const name = this.consume("IDENT").value;
    this.consume("{");
    const cases: string[] = [];
    while (!this.is("}")) {
      this.consume("case");
      cases.push(this.consume("IDENT").value);
    }
    this.consume("}");
    return { kind: "variant", name, cases };
  }

  private parseExpose(): ExposeDecl {
    this.consume("expose");
    const component = this.consume("IDENT").value;
    this.consume("{");
    const names: string[] = [];
    while (!this.is("}")) {
      names.push(this.consume("IDENT").value);
    }
    this.consume("}");
    return { kind: "expose", component, names };
  }

  /** Skim trailing `emits { … }` after a component (oracle does not keep EmitsDecl yet). */
  private skipInlineEmitsBlock(): void {
    this.consume("emits");
    this.consume("{");
    let depth = 1;
    while (depth > 0 && !this.is("EOF")) {
      if (this.is("{")) depth += 1;
      else if (this.is("}")) depth -= 1;
      this.advance();
    }
  }

  private errInteractionRemoved(): PdlError {
    return this.err(
      "`interaction` blocks were removed; wire host channels with `[self.]<channel> = { … }` in the component kind body (§4a′ / §8)",
    );
  }

  private parseInteractionHandlerBody(): InteractionHandlerItem[] {
    const items: InteractionHandlerItem[] = [];
    while (!this.is("}")) {
      if (this.is("if")) {
        items.push({ kind: "if", chain: this.parseInteractionIfChain() });
        continue;
      }
      if (this.is("animate")) {
        this.advance();
        this.consume("=");
        items.push({ kind: "animate", value: this.parseValueExpr() });
        continue;
      }
      if (this.is("emit")) {
        this.advance();
        const name = this.consume("IDENT").value;
        const args: string[] = [];
        if (this.is("(")) {
          this.advance();
          if (!this.is(")")) {
            while (true) {
              if (this.is("self")) {
                this.advance();
                if (this.is(".")) {
                  this.advance();
                  args.push(`self.${this.consume("IDENT").value}`);
                } else {
                  args.push("self");
                }
              } else {
                args.push(this.consume("IDENT").value);
              }
              if (this.is(")")) break;
              this.consume(",");
            }
          }
          this.consume(")");
        }
        items.push({ kind: "emit", name, args });
        continue;
      }
      if (this.is("IDENT")) {
        const name = this.peek().value;
        if ((name === "from" || name === "to") && this.lookaheadKind(1) === "{") {
          throw this.err(
            `\`from { }\` / \`to { }\` were removed; write \`animate = Motion(transition: …, pose: Pose(…))\``,
          );
        }
        if ((name === "stagger" || name === "staggerFrom") && this.lookaheadKind(1) === "=") {
          throw this.err(
            `\`stagger\` / \`staggerFrom\` handler keys were removed; write \`stagger: Stagger(step: …, from: .first)\` on Motion`,
          );
        }
      }
      let param: string;
      let selfPrefixed = false;
      if (this.is("self")) {
        this.advance();
        this.consume(".");
        param = this.consume("IDENT").value;
        selfPrefixed = true;
      } else {
        param = this.consume("IDENT").value;
      }
      // Let-qualified host verb: `Input.beginEditing(draft)`
      if (
        !selfPrefixed &&
        this.is(".") &&
        this.lookaheadKind(1) === "IDENT" &&
        this.lookaheadKind(2) === "("
      ) {
        this.advance();
        const verb = this.consume("IDENT").value;
        const args = this.parseHostVerbArgs();
        items.push({ kind: "hostVerb", qualifier: param, name: verb, args });
        continue;
      }
      // `Label.content = …` — frame-prop assign; handlers only mutate params.
      if (this.is(".")) {
        this.advance();
        const prop = this.consume("IDENT").value;
        const lhs = selfPrefixed ? `self.${param}.${prop}` : `${param}.${prop}`;
        throw this.err(
          `Interaction handlers can only assign component parameters (e.g. \`interactionState = .hovered\`), not frame props like \`${lhs}\`. Put \`${param}.${prop} = …\` in the layout body / \`if\` branch instead (handlers set params; layout \`if\` updates chrome)`,
        );
      }
      // Host verb: `beginEditing(value)` / `cancelEditing()`
      if (this.is("(")) {
        const args = this.parseHostVerbArgs();
        items.push({ kind: "hostVerb", name: param, args });
        continue;
      }
      this.consume("=");
      items.push({ kind: "assign", param, value: this.parseValueExpr() });
    }
    return items;
  }

  private parseInteractionIfChain(): InteractionIfChain {
    const branches: InteractionIfChain["branches"] = [];
    this.consume("if");
    const c0 = this.parseConditionExpr();
    this.consume("{");
    const b0 = this.parseInteractionHandlerBody();
    this.consume("}");
    branches.push({ condition: c0, body: b0 });
    while (this.is("else")) {
      this.advance();
      if (this.is("if")) {
        this.advance();
        const c = this.parseConditionExpr();
        this.consume("{");
        const b = this.parseInteractionHandlerBody();
        this.consume("}");
        branches.push({ condition: c, body: b });
      } else {
        this.consume("{");
        const elseBody = this.parseInteractionHandlerBody();
        this.consume("}");
        return { branches, elseBody };
      }
    }
    return { branches };
  }

  private parseFixtures(): FixturesDecl {
    this.consume("fixtures");
    const component = this.consume("IDENT").value;
    this.consume("{");
    const examples: FixtureExampleDecl[] = [];
    while (!this.is("}")) {
      this.consume("example");
      const label = this.consume("STRING").value;
      this.consume("{");
      const bindings: FixtureBinding[] = [];
      while (!this.is("}")) {
        const pname = this.consume("IDENT").value;
        this.consume("=");
        bindings.push({ name: pname, value: this.parseValueExpr() });
      }
      this.consume("}");
      examples.push({ label, bindings });
    }
    this.consume("}");
    return { kind: "fixtures", component, examples };
  }

  /** `samples Tracks { pop_results { tracks: [TrackRow] = […] } … }` */
  private parseSamples(): SamplesDecl {
    this.consume("samples");
    const name = this.consume("IDENT").value;
    this.consume("{");
    const entries: SampleEntryDecl[] = [];
    const seenEntries = new Set<string>();
    while (!this.is("}")) {
      const entry = this.parseSampleEntry();
      if (seenEntries.has(entry.name)) {
        throw this.err(`Duplicate sample entry \`${entry.name}\` in bank \`${name}\``);
      }
      seenEntries.add(entry.name);
      entries.push(entry);
    }
    this.consume("}");
    return { kind: "samples", name, entries };
  }

  private parseSampleEntry(): SampleEntryDecl {
    const name = this.consume("IDENT").value;
    this.consume("{");
    const fields: SampleFieldDecl[] = [];
    const seenFields = new Set<string>();
    while (!this.is("}")) {
      const field = this.parseSampleField();
      if (seenFields.has(field.name)) {
        throw this.err(`Duplicate sample field \`${field.name}\` in entry \`${name}\``);
      }
      seenFields.add(field.name);
      fields.push(field);
    }
    this.consume("}");
    return { name, fields };
  }

  private parseSampleField(): SampleFieldDecl {
    const name = this.consume("IDENT").value;
    this.consume(":");
    let isArray = false;
    let typeName: string;
    if (this.is("[")) {
      this.advance();
      typeName = this.consumeParamTypeName();
      this.consume("]");
      isArray = true;
    } else {
      typeName = this.consumeParamTypeName();
    }
    this.consume("=");
    const value = this.parseValueExpr();
    return { name, typeName, ...(isArray ? { isArray: true } : {}), value };
  }

  private parseUsage(): UsageDecl {
    this.consume("usage");
    const component = this.consume("IDENT").value;
    this.consume("{");
    const props: UsageProp[] = [];
    while (!this.is("}")) {
      const key = this.consumeUsagePropKey();
      let op: UsageProp["op"] = "=";
      if (this.is("+=")) {
        this.advance();
        op = "+=";
      } else {
        this.consume("=");
      }
      const value = this.consume("STRING").value;
      props.push({ key, op, value });
    }
    this.consume("}");
    return { kind: "usage", component, props };
  }

  private parseRules(): RulesDecl {
    this.consume("rules");
    const component = this.consume("IDENT").value;
    this.consume("{");
    const statements: RulesStatement[] = [];
    while (!this.is("}")) {
      statements.push(this.parseRulesStatement());
    }
    this.consume("}");
    return { kind: "rules", component, statements };
  }

  private parseRulesStatement(): RulesStatement {
    if (this.is("if")) {
      return { kind: "if", chain: this.parseRulesIfChain() };
    }
    if (this.is("tags")) {
      this.advance();
      if (this.is("=")) {
        this.advance();
        this.consume("[");
        const tags: string[] = [];
        if (!this.is("]")) {
          while (true) {
            tags.push(this.consume("STRING").value);
            if (this.is("]")) break;
            this.consume(",");
          }
        }
        this.consume("]");
        return { kind: "tagsSet", tags };
      }
      if (this.is(".")) {
        this.advance();
        const field = this.consume("IDENT").value;
        if (field !== "add") throw this.err("Expected tags.add after tags.");
        this.consume("(");
        const tag = this.consume("STRING").value;
        this.consume(")");
        return { kind: "tagsAdd", tag };
      }
      throw this.err("Expected tags = or tags.add");
    }
    if (this.is("Rule")) {
      this.advance();
      this.consume("(");
      const strengthTok = this.consume("DOT_ENUM").value;
      this.consume(",");
      const query = this.parseRuleQueryArgument();
      let description: string | undefined;
      if (this.is(",")) {
        this.advance();
        this.consume("description");
        this.consume(":");
        description = this.consume("STRING").value;
      }
      this.consume(")");
      return { kind: "ruleLine", strength: strengthTok, query, description };
    }
    throw this.err(`Unexpected token in rules block: ${this.peek().kind}`);
  }

  private parseRulesIfChain(): RulesIfChain {
    const branches: RulesIfChain["branches"] = [];
    this.consume("if");
    const c0 = this.parseConditionExpr();
    this.consume("{");
    const b0 = this.parseRulesBody();
    this.consume("}");
    branches.push({ condition: c0, body: b0 });
    while (this.is("else")) {
      this.advance();
      if (this.is("if")) {
        this.advance();
        const c = this.parseConditionExpr();
        this.consume("{");
        const b = this.parseRulesBody();
        this.consume("}");
        branches.push({ condition: c, body: b });
      } else {
        this.consume("{");
        const elseBody = this.parseRulesBody();
        this.consume("}");
        return { branches, elseBody };
      }
    }
    return { branches };
  }

  private parseRulesBody(): RulesStatement[] {
    const out: RulesStatement[] = [];
    while (!this.is("}")) {
      out.push(this.parseRulesStatement());
    }
    return out;
  }

  private parseRuleNavAxis(): Extract<RulePathStep, { kind: "nav" }> {
    const t = this.peek();
    if (t.kind === "self") {
      this.advance();
      return { kind: "nav", axis: "self" };
    }
    if (t.kind === "IDENT") {
      const axes = new Set(["parent", "ancestors", "descendants", "siblings", "children"]);
      if (axes.has(t.value)) {
        const axis = t.value as "parent" | "ancestors" | "descendants" | "siblings" | "children";
        this.advance();
        return { kind: "nav", axis };
      }
    }
    throw this.err(`Expected rule navigator (self|parent|…), got ${t.kind}`);
  }

  private parseRulePathExpr(): RulePathExpr {
    const steps: RulePathStep[] = [];
    steps.push(this.parseRuleNavAxis());
    while (this.is(".")) {
      this.advance();
      if (this.peek().kind === "IDENT" && this.peek().value === "children") {
        this.advance();
        this.consume(".");
        const pick = this.peek();
        if (pick.kind === "IDENT" && (pick.value === "first" || pick.value === "last")) {
          this.advance();
          steps.push({ kind: "childrenPick", index: pick.value as "first" | "last" });
        } else if (pick.kind === "NUMBER") {
          steps.push({ kind: "childrenPick", index: Number(this.advance().value) });
        } else {
          throw this.err("Expected first, last, or number after children.");
        }
      } else {
        throw this.err("Invalid rule path segment");
      }
    }
    return { kind: "path", steps };
  }

  private parseRuleQueryArgument(): RuleQueryParsed {
    const save = this.index;
    let nodeEq: RuleQueryParsed | null = null;
    try {
      const left = this.parseRulePathExpr();
      if (this.is("==")) {
        this.advance();
        const right = this.parseRulePathExpr();
        nodeEq = { kind: "nodeEq", left, right };
      }
    } catch (e) {
      if (!(e instanceof PdlError)) throw e;
    }
    if (nodeEq) return nodeEq;
    this.index = save;
    const nav = this.parseRuleNavAxis();
    return this.parseRuleChainFromAxis(nav.axis, []);
  }

  /** `.count` after `where(…)` is lexed as DOT_ENUM because `)` is not an ident. */
  private takeRuleDotName(): string | null {
    if (this.is("DOT_ENUM")) {
      return this.advance().value.replace(/^\./, "");
    }
    if (!this.is(".")) return null;
    this.advance();
    if (this.is("where")) {
      this.advance();
      return "where";
    }
    if (this.is("IDENT")) return this.advance().value;
    return null;
  }

  private parseRuleChainFromAxis(
    axis: "self" | "parent" | "ancestors" | "descendants" | "siblings" | "children",
    whereTags: string[],
  ): RuleQueryParsed {
    let terminal: RuleChainTerminalParsed = { kind: "exists" };
    while (true) {
      const name = this.takeRuleDotName();
      if (name == null) break;
      if (name === "where") {
        this.consume("(");
        const tagKw = this.consume("IDENT").value;
        if (tagKw !== "tag") throw this.err('Expected tag in where(tag: "...")');
        this.consume(":");
        whereTags.push(this.consume("STRING").value);
        this.consume(")");
        continue;
      }
      if (name === "exists") {
        terminal = { kind: "exists" };
        break;
      }
      if (name === "count") {
        if (this.is(".")) {
          this.advance();
          if (this.peek().kind === "IDENT" && this.peek().value === "between") {
            this.advance();
            this.consume("(");
            const low = Number(this.consume("NUMBER").value);
            this.consume(",");
            const high = Number(this.consume("NUMBER").value);
            this.consume(")");
            terminal = { kind: "aggregateCompare", op: "between", low, high };
            break;
          }
          throw this.err("Expected count.between after count.");
        }
        const opTok = this.peek();
        if (opTok.kind === ">") {
          this.advance();
          terminal = { kind: "aggregateCompare", op: "gt", right: Number(this.consume("NUMBER").value) };
          break;
        }
        if (opTok.kind === ">=") {
          this.advance();
          terminal = { kind: "aggregateCompare", op: "gte", right: Number(this.consume("NUMBER").value) };
          break;
        }
        if (opTok.kind === "<") {
          this.advance();
          terminal = { kind: "aggregateCompare", op: "lt", right: Number(this.consume("NUMBER").value) };
          break;
        }
        if (opTok.kind === "<=") {
          this.advance();
          terminal = { kind: "aggregateCompare", op: "lte", right: Number(this.consume("NUMBER").value) };
          break;
        }
        if (opTok.kind === "==") {
          this.advance();
          terminal = { kind: "aggregateCompare", op: "eq", right: Number(this.consume("NUMBER").value) };
          break;
        }
        if (opTok.kind === "!=") {
          this.advance();
          terminal = { kind: "aggregateCompare", op: "ne", right: Number(this.consume("NUMBER").value) };
          break;
        }
        throw this.err("Expected comparison after count");
      }
      if (name === "precedes" || name === "follows" || name === "adjacentTo") {
        this.consume("(");
        this.consume("self");
        this.consume(")");
        terminal = { kind: "ordering", relation: name, ref: "self" };
        break;
      }
      throw this.err(`Unexpected rule query token ${name}`);
    }
    return { kind: "chain", axis, whereTags, terminal };
  }

  private parseExtend(): ExtendDecl {
    this.consume("extend");
    const component = this.consume("IDENT").value;
    this.consume("{");
    const sections: ExtendSection[] = [];
    while (!this.is("}")) {
      if (this.is("fixtures")) {
        this.advance();
        this.consume("{");
        const examples: FixtureExampleDecl[] = [];
        while (!this.is("}")) {
          this.consume("example");
          const label = this.consume("STRING").value;
          this.consume("{");
          const bindings: FixtureBinding[] = [];
          while (!this.is("}")) {
            const pname = this.consume("IDENT").value;
            this.consume("=");
            bindings.push({ name: pname, value: this.parseValueExpr() });
          }
          this.consume("}");
          examples.push({ label, bindings });
        }
        this.consume("}");
        sections.push({ kind: "fixtures", examples });
        continue;
      }
      if (this.is("usage")) {
        this.advance();
        this.consume("{");
        const props: UsageProp[] = [];
        while (!this.is("}")) {
          const key = this.consumeUsagePropKey();
          let op: UsageProp["op"] = "=";
          if (this.is("+=")) {
            this.advance();
            op = "+=";
          } else {
            this.consume("=");
          }
          props.push({ key, op, value: this.consume("STRING").value });
        }
        this.consume("}");
        sections.push({ kind: "usage", props });
        continue;
      }
      if (this.is("rules")) {
        this.advance();
        this.consume("{");
        const statements: RulesStatement[] = [];
        while (!this.is("}")) {
          statements.push(this.parseRulesStatement());
        }
        this.consume("}");
        sections.push({ kind: "rules", statements });
        continue;
      }
      if (this.is("expose")) {
        this.advance();
        this.consume("{");
        const names: string[] = [];
        while (!this.is("}")) {
          names.push(this.consume("IDENT").value);
        }
        this.consume("}");
        sections.push({ kind: "expose", names });
        continue;
      }
      throw this.err(`Unexpected extend section ${this.peek().kind}`);
    }
    this.consume("}");
    return { kind: "extend", component, sections };
  }

  /** `protocol Name: component { … }` or `protocol Name { host }` — body skim for load parity. */
  private parseProtocol(): import("./ast.js").ProtocolDecl {
    this.consume("protocol");
    const name = this.consume("IDENT").value;
    let componentSubject = false;
    if (this.is(":")) {
      this.advance();
      if (!this.is("component")) {
        throw this.err(
          `Protocol \`${name}\` subject must be \`component\` (write \`protocol ${name}: component { … }\`)`,
        );
      }
      this.advance();
      componentSubject = true;
    }
    this.consume("{");
    let role: "api" | "host" = "api";
    const requires: string[] = [];
    const inbound: string[] = [];
    const verbs: { name: string; params: string[] }[] = [];
    while (!this.is("}")) {
      if (this.is("host")) {
        this.advance();
        role = "host";
        continue;
      }
      if (this.is("requires")) {
        this.advance();
        requires.push(this.consume("IDENT").value);
        continue;
      }
      if (this.is("emits")) {
        this.advance();
        this.consume("{");
        while (!this.is("}")) {
          this.advance(); // skim emit signatures
        }
        this.consume("}");
        continue;
      }
      // Host inbound `pressEnd` / verb `beginEditing(value)` (after `host`)
      if (
        role === "host" &&
        this.peek().kind === "IDENT" &&
        this.peekAheadKind(1) !== ":" &&
        this.peekAheadKind(1) !== "="
      ) {
        const channel = this.consume("IDENT").value;
        if (this.is("(")) {
          this.advance();
          const params: string[] = [];
          while (!this.is(")")) {
            params.push(this.consume("IDENT").value);
            if (this.is(",")) this.advance();
            else break;
          }
          this.consume(")");
          verbs.push({ name: channel, params });
        } else {
          inbound.push(channel);
        }
        continue;
      }
      // param: name [: Type] = value
      this.consume("IDENT");
      if (this.is(":")) {
        this.advance();
        if (this.is("[")) {
          this.advance();
          this.consume("IDENT");
          this.consume("]");
        } else {
          this.consumeParamTypeName();
        }
      }
      this.consume("=");
      this.parseValueExpr();
    }
    this.consume("}");
    if (role === "host" && componentSubject) {
      throw this.err(
        `Host protocol \`${name}\` must not declare \`: component\` (write \`protocol ${name} { host }\`)`,
      );
    }
    if (role === "api" && !componentSubject) {
      throw this.err(
        `API protocol \`${name}\` must declare subject \`component\` (write \`protocol ${name}: component { … }\`)`,
      );
    }
    return { kind: "protocol", name, role, requires, inbound, verbs };
  }

  private parseComponent(): ComponentDecl {
    this.consume("component");
    const name = this.consume("IDENT").value;
    if (RESERVED_FRAME_CTOR_COMPONENT_NAMES.has(name as FrameCtorName)) {
      throw this.err(
        `Component name \`${name}\` is reserved for the World A frame constructor; rename the component`,
      );
    }
    let conformsTo: string | undefined;
    if (this.is("<")) {
      this.advance();
      conformsTo = this.consume("IDENT").value;
      this.consume(">");
    }
    this.consume("(");
    const params: ComponentParam[] = [];
    if (!this.is(")")) {
      while (true) {
        const pname = this.consume("IDENT").value;
        this.consume(":");
        let isArray = false;
        let typeName: string;
        if (this.is("[")) {
          this.advance();
          typeName = this.consumeParamTypeName();
          this.consume("]");
          isArray = true;
        } else {
          typeName = this.consumeParamTypeName();
        }
        this.consume("=");
        const default_ = this.parseValueExpr();
        params.push({
          name: pname,
          typeName,
          ...(isArray ? { isArray: true } : {}),
          defaultValue: default_,
        });
        if (this.is(")")) break;
        this.consume(",");
      }
    }
    this.consume(")");
    const rkTok = this.peek();
    if (rkTok.kind !== "IDENT" || !["layout", "text", "icon", "media"].includes(rkTok.value)) {
      throw this.err(`Expected layout|text|icon|media root kind, got ${rkTok.kind}`);
    }
    const rootKind = this.advance().value as ComponentDecl["rootKind"];
    this.pendingHostHandlers = [];
    this.consume("{");
    const body = lowerWorldABody(this.parseFrameBodyUntilClose());
    this.consume("}");
    return {
      kind: "component",
      name,
      ...(conformsTo ? { conformsTo } : {}),
      params,
      rootKind,
      body,
    };
  }

  private parseFrameBodyUntilClose(): FrameBodyItem[] {
    const items: FrameBodyItem[] = [];
    while (!this.is("}")) {
      const item = this.parseFrameBodyItem();
      if (item) items.push(item);
    }
    return items;
  }

  /** Skip a `{ … }` block already positioned at `{`, consuming the matching `}`. */
  private skipBraceBlock(): void {
    this.consume("{");
    let depth = 1;
    while (depth > 0 && !this.is("EOF")) {
      if (this.is("{")) depth += 1;
      else if (this.is("}")) depth -= 1;
      this.advance();
    }
  }

  /**
   * Skim Rust-first layout forms the TS oracle does not expand yet:
   * `ForEach(…) { … }` and emit capture `channel(…) = { … }` / legacy `on channel(…) { … }`.
   */
  private skipForEachOrEmitCapture(): boolean {
    if (this.is("on")) {
      this.advance();
      this.consume("IDENT");
      if (this.is(".")) {
        this.advance();
        this.consume("IDENT");
      }
      if (this.is("(")) {
        this.advance();
        while (!this.is(")") && !this.is("EOF")) this.advance();
        this.consume(")");
      }
      if (this.is("=")) this.advance();
      this.skipBraceBlock();
      return true;
    }
    const id = this.peek();
    if (id.kind === "IDENT" && id.value === "ForEach") {
      this.advance();
      this.consume("(");
      while (!this.is(")") && !this.is("EOF")) this.advance();
      this.consume(")");
      this.skipBraceBlock();
      return true;
    }
    if (this.looksLikeEmitCaptureAssign()) {
      this.advance(); // channel or qualifier
      if (this.is(".")) {
        this.advance();
        this.consume("IDENT");
      }
      if (this.is("(")) {
        this.advance();
        while (!this.is(")") && !this.is("EOF")) this.advance();
        this.consume(")");
      }
      this.consume("=");
      this.skipBraceBlock();
      return true;
    }
    return false;
  }

  /** Emit capture requires `(…)` so bare `pressEnd = { … }` means host inbound. */
  private looksLikeEmitCaptureAssign(): boolean {
    if (this.peek().kind !== "IDENT") return false;
    let i = 1;
    const kindAt = (n: number) => this.peekAheadKind(n);
    if (kindAt(i) === ".") {
      if (kindAt(i + 1) !== "IDENT") return false;
      i += 2;
    }
    if (kindAt(i) !== "(") return false;
    i += 1;
    let depth = 1;
    while (depth > 0) {
      const k = kindAt(i);
      if (k === "EOF") return false;
      if (k === "(") depth += 1;
      else if (k === ")") depth -= 1;
      i += 1;
    }
    return kindAt(i) === "=" && kindAt(i + 1) === "{";
  }

  private parseFrameBodyItem(): FrameBodyItem | null {
    if (this.skipForEachOrEmitCapture()) return null;
    if (this.is("let")) return this.parseLet();
    if (this.is("if")) return { kind: "if", chain: this.parseIfChain() };

    // `self.IDENT = …`:
    // - `{ … }` → host inbound handler (lifted after component)
    // - otherwise → prop on the enclosing **component root** (not a nested let)
    if (this.is("self")) {
      this.advance();
      this.consume(".");
      const field = this.consume("IDENT").value;
      this.consume("=");
      if (this.is("{")) {
        this.consume("{");
        const body = this.parseInteractionHandlerBody();
        this.consume("}");
        this.pendingHostHandlers.push({ event: field, body });
        return null;
      }
      const value = field === "hidden" ? this.parseHiddenRhs() : this.parseValueExpr();
      return { kind: "frameProp", frame: "self", name: field, value };
    }

    const id = this.peek();
    if (id.kind === "IDENT") {
      const name = id.value;
      // Bare host inbound: `pressEnd = { … }` (same as `self.pressEnd = { … }`)
      if (this.peekAheadKind(1) === "=" && this.peekAheadKind(2) === "{") {
        this.advance();
        this.consume("=");
        this.consume("{");
        const body = this.parseInteractionHandlerBody();
        this.consume("}");
        this.pendingHostHandlers.push({ event: name, body });
        return null;
      }
      this.advance();
      if (this.is(".")) {
        this.consume(".");
        const field = this.consume("IDENT").value;
        if (field === "children") {
          this.consume("=");
          const entries = this.parseChildrenRhs();
          return { kind: "children", target: { letId: name }, entries };
        }
        this.consume("=");
        const value = field === "hidden" ? this.parseHiddenRhs() : this.parseValueExpr();
        return { kind: "frameProp", frame: name, name: field, value };
      }
      if (this.is("=")) {
        this.advance();
        if (name === "children") {
          return { kind: "children", target: "root", entries: this.parseChildrenRhs() };
        }
        const value = name === "hidden" ? this.parseHiddenRhs() : this.parseValueExpr();
        return { kind: "prop", name, value };
      }
      throw this.err(`Unexpected after identifier ${name}`);
    }
    throw this.err(`Unexpected token in frame body: ${this.peek().kind}`);
  }

  private parseLet(): FrameBodyItem {
    this.consume("let");
    const id = this.consume("IDENT").value;
    if (this.is("=")) {
      this.advance();
      // World A: `let title = Text(…)` / `Layout(…)` / `Icon(…)` / `Media(…)`
      // Icon/Media are lexer keywords; Text/Layout are ordinary Idents.
      {
        const peek = this.peek();
        const ctorName = peek.value;
        const isCtorTok =
          (peek.kind === "IDENT" || peek.kind === "Icon" || peek.kind === "Media") &&
          isFrameCtorName(ctorName) &&
          this.peekAheadKind(1) === "(";
        if (isCtorTok) {
          this.advance();
          this.consume("(");
          const { props, childEntries } = this.parseFrameCtorArgs();
          this.consume(")");
          return {
            kind: "let",
            id,
            frameKind: FRAME_CTOR_TO_KIND[ctorName as FrameCtorName],
            body: frameCtorKwargsToBody(props, childEntries),
          };
        }
      }
      // `let x = Comp(…)` → instance; `let blur = Blur(…)` → value let (inferred type)
      const value = this.parseValueExpr();
      if (value.kind === "instance") {
        return {
          kind: "letInstance",
          id,
          component: value.component,
          kwargs: value.kwargs,
        };
      }
      const typeName = inferValueLetType(value);
      if (!typeName) {
        throw this.err(
          `Value let \`${id}\` requires a type annotation (\`let ${id}: Type = …\`); could not infer type from RHS`,
        );
      }
      return { kind: "letValue", id, typeName, value };
    }
    this.consume(":");
    // Classic frame let removed — World A only: `let Id = Text|Layout|Icon|Media(…)`
    // Value let: `let ramp: Ramp = Ramp(…)` (builtin / token type, value RHS)
    const t = this.peek();
    const frameKinds = new Set(["layout", "text", "icon", "media"]);
    if (t.kind === "IDENT" && frameKinds.has(t.value)) {
      const frameKind = t.value;
      const ctor =
        frameKind === "text"
          ? "Text"
          : frameKind === "layout"
            ? "Layout"
            : frameKind === "icon"
              ? "Icon"
              : "Media";
      throw this.err(
        `Classic frame let \`let ${id}: ${frameKind} = { … }\` was removed; use \`let ${id} = ${ctor}(…)\` (World A — see docs/PROPOSAL_WORLD_A_EXPRESSION_TREES.md)`,
      );
    }
    const typeName = this.consumeParamTypeName();
    this.consume("=");
    const value = this.parseValueExpr();
    return { kind: "letValue", id, typeName, value };
  }

  private parseIfChain(): IfChain {
    const branches: IfChain["branches"] = [];
    this.consume("if");
    const c0 = this.parseConditionExpr();
    this.consume("{");
    const b0 = this.parseFrameBodyUntilClose();
    this.consume("}");
    branches.push({ condition: c0, body: b0 });
    while (this.is("else")) {
      this.advance();
      if (this.is("if")) {
        this.advance();
        const c = this.parseConditionExpr();
        this.consume("{");
        const b = this.parseFrameBodyUntilClose();
        this.consume("}");
        branches.push({ condition: c, body: b });
      } else {
        this.consume("{");
        const elseBody = this.parseFrameBodyUntilClose();
        this.consume("}");
        return { branches, elseBody };
      }
    }
    return { branches };
  }

  /** RHS for `hidden =` — boolean literal, `.true` / `.false`, or a variant `if`-style condition. */
  private parseHiddenRhs(): ValueExpr {
    const t = this.peek();
    if (t.kind === "true" || t.kind === "false") {
      this.advance();
      return { kind: "boolean", value: t.kind === "true" };
    }
    if (t.kind === "DOT_ENUM" && (t.value === ".true" || t.value === ".false")) {
      this.advance();
      return { kind: "boolean", value: t.value === ".true" };
    }
    const start = this.index;
    const expr = this.parseCondOr();
    this.assertNoMixedAndOr(start, this.index);
    return { kind: "condition", expr };
  }

  private parseConditionExpr(): ConditionExpr {
    const start = this.index;
    const end = this.findConditionEnd();
    this.assertNoMixedAndOr(start, end);
    return this.parseCondOr();
  }

  private findConditionEnd(): number {
    let j = this.index;
    let depth = 0;
    while (j < this.tokens.length) {
      const k = this.tokens[j]!.kind;
      if (k === "(") depth++;
      else if (k === ")") depth--;
      else if (depth === 0 && k === "{") return j;
      j++;
    }
    throw this.err("Unterminated condition (expected `{`)");
  }

  private assertNoMixedAndOr(start: number, end: number): void {
    let depth = 0;
    let hasAnd = false;
    let hasOr = false;
    for (let j = start; j < end; j++) {
      const k = this.tokens[j]!.kind;
      if (k === "(") depth++;
      else if (k === ")") depth--;
      else if (depth === 0) {
        if (k === "&&") hasAnd = true;
        if (k === "||") hasOr = true;
      }
    }
    if (hasAnd && hasOr) {
      throw new PdlError(
        "PDL-E038",
        "Cannot mix `&&` and `||` in one condition without parentheses",
        { path: this.filePath, line: this.tokens[start]!.line, column: this.tokens[start]!.column },
      );
    }
  }

  private parseCondOr(): ConditionExpr {
    let left = this.parseCondAnd();
    while (this.is("||")) {
      this.advance();
      const right = this.parseCondAnd();
      if (left.kind === "or") left = { kind: "or", items: [...left.items, right] };
      else left = { kind: "or", items: [left, right] };
    }
    return left;
  }

  private parseCondAnd(): ConditionExpr {
    let left = this.parseCondAtom();
    while (this.is("&&")) {
      this.advance();
      const right = this.parseCondAtom();
      if (left.kind === "and") left = { kind: "and", items: [...left.items, right] };
      else left = { kind: "and", items: [left, right] };
    }
    return left;
  }

  private parseCondAtom(): ConditionExpr {
    if (this.is("(")) {
      this.advance();
      const inner = this.parseCondOr();
      this.consume(")");
      return inner;
    }
    let param: string;
    if (this.is("self")) {
      this.advance();
      this.consume(".");
      param = this.consume("IDENT").value;
    } else {
      param = this.consume("IDENT").value;
    }
    let op: "==" | "!=";
    if (this.is("==")) {
      op = "==";
      this.advance();
    } else if (this.is("!=")) {
      op = "!=";
      this.advance();
    } else {
      // Bare boolean param: `if selected { … }`
      return { kind: "truthy", param };
    }
    if (this.is("DOT_ENUM")) {
      return { kind: "cmp", param, op, rhs: this.advance().value };
    }
    if (this.is("true") || this.is("false")) {
      return { kind: "cmp", param, op, rhs: this.advance().value };
    }
    // `Tone.primary` → same as `.primary` (frame enums / user variants)
    if (
      this.is("IDENT") &&
      looksLikeQualifiedEnumTypeName(this.peek().value) &&
      this.peekAheadKind(1) === "." &&
      this.peekAheadKind(2) === "IDENT" &&
      this.peekAheadKind(3) !== "." &&
      this.peekAheadKind(3) !== "("
    ) {
      this.advance();
      this.consume(".");
      const caseName = this.consume("IDENT").value;
      return { kind: "cmp", param, op, rhs: `.${caseName}` };
    }
    if (this.is("IDENT")) {
      return { kind: "cmp", param, op, rhs: this.advance().value };
    }
    throw this.err("Expected == or != RHS in condition");
  }

  /**
   * Comparison-as-value (ForEach binds / Bool kwargs): `self.currentFilter == filter`
   * or `currentMood == .all`.
   */
  private looksLikeConditionStart(): boolean {
    const k0 = this.peek().kind;
    if (k0 === "self") {
      if (this.peekAheadKind(1) !== ".") return false;
      if (this.peekAheadKind(2) !== "IDENT") return false;
      const op = this.peekAheadKind(3);
      return op === "==" || op === "!=";
    }
    if (k0 === "IDENT") {
      const op = this.peekAheadKind(1);
      return op === "==" || op === "!=";
    }
    return false;
  }

  parseValueExpr(): ValueExpr {
    if (this.looksLikeConditionStart()) {
      const start = this.index;
      const expr = this.parseCondOr();
      this.assertNoMixedAndOr(start, this.index);
      return { kind: "condition", expr };
    }
    const lhs = this.parsePrimaryValue();
    if (this.is("@")) {
      this.advance();
      const op = this.parsePrimaryValue();
      return this.applyOpacitySugar(lhs, op);
    }
    return lhs;
  }

  /**
   * Postfix `@ Opacity` on values: colors → opacityOf; MediaLayer → opacity: arg;
   * Color(…) → wrap color:; other operands → error.
   */
  private applyOpacitySugar(lhs: ValueExpr, opacity: ValueExpr): ValueExpr {
    if (lhs.kind === "call") {
      if (lhs.callee === "MediaLayer") {
        if (lhs.args.opacity) {
          throw this.err(
            "`MediaLayer(…)` already has `opacity:`; cannot also apply postfix `@` (PDL-E020)",
          );
        }
        return { kind: "call", callee: "MediaLayer", args: { ...lhs.args, opacity } };
      }
      if (lhs.callee === "Color") {
        const color = lhs.args.color;
        if (!color) {
          throw this.err("`Color(…)` requires `color:` before postfix `@`");
        }
        return {
          kind: "call",
          callee: "Color",
          args: {
            ...lhs.args,
            color: { kind: "opacityOf", base: color, opacity },
          },
        };
      }
      throw this.err(
        `Cannot apply \`@\` opacity to \`${lhs.callee}(…)\` (not opacity-bearing; use a Color/Media layer or frame opacity)`,
      );
    }
    if (lhs.kind === "hex" || lhs.kind === "ident" || lhs.kind === "opacityOf") {
      return { kind: "opacityOf", base: lhs, opacity };
    }
    throw this.err(
      `Cannot apply \`@\` opacity to ${lhs.kind} (expected a Color, MediaLayer(…), or color token)`,
    );
  }

  /** Optional ` @ opacityExpr` after a child mount. */
  private parseOptionalChildOpacity(): ValueExpr | undefined {
    if (!this.is("@")) return undefined;
    this.advance();
    return this.parsePrimaryValue();
  }

  private parsePrimaryValue(): ValueExpr {
    const t = this.peek();
    if (t.kind === "HEX_COLOR") {
      this.advance();
      return { kind: "hex", value: t.value };
    }
    if (t.kind === "STRING") {
      this.advance();
      return { kind: "string", value: t.value };
    }
    if (t.kind === "NUMBER") {
      this.advance();
      // Ratio sugar: `16:9` → width/height (Ratio tokens / aspectRatio).
      if (this.is(":") && this.peekAheadKind(1) === "NUMBER") {
        this.advance(); // ':'
        const h = this.consume("NUMBER");
        const width = Number(t.value);
        const height = Number(h.value);
        if (!(height > 0) || !Number.isFinite(width) || !Number.isFinite(height)) {
          throw this.err("Ratio sugar `W:H` requires a positive finite height (e.g. `16:9`)");
        }
        return { kind: "ratio", width, height };
      }
      return { kind: "number", value: Number(t.value) };
    }
    if (t.kind === "true" || t.kind === "false") {
      this.advance();
      return { kind: "boolean", value: t.kind === "true" };
    }
    if (t.kind === "null") {
      this.advance();
      return { kind: "null" };
    }
    if (t.kind === "DOT_ENUM") {
      this.advance();
      const v = t.value;
      // Bare `.hug` / `.fill` stay as dotEnum so ContentMode.fill and Sizing.fill share spelling.
      // Qualified `Sizing.hug` / `Sizing.fill` still produce sizing literals below.
      if (v === ".fixed") {
        if (!this.is("(")) {
          throw this.err(
            "`.fixed` requires a Distance number argument, e.g. `.fixed(48)`",
          );
        }
        this.consume("(");
        if (!this.is("NUMBER")) {
          throw this.err(
            "`.fixed` expects a Distance number (px), e.g. `.fixed(48)`",
          );
        }
        const n = this.consume("NUMBER");
        this.consume(")");
        return { kind: "sizing", mode: "fixed", fixed: Number(n.value) };
      }
      if (v === ".flex") {
        if (!this.is("(")) {
          throw this.err(
            "`.flex` requires arguments, e.g. `.flex(min: 8, max: 120)`",
          );
        }
        this.consume("(");
        const flexArgs = this.parseFlexArgs();
        this.consume(")");
        return { kind: "sizing", mode: "flex", flexArgs };
      }
      if (v === ".aspect") {
        if (!this.is("(")) {
          throw this.err(
            "`.aspect` requires a ratio argument, e.g. `.aspect(16:9)` or `.aspect(1.5)`",
          );
        }
        this.consume("(");
        const aspect = this.parseAspectArg();
        this.consume(")");
        return { kind: "sizing", mode: "aspect", aspect };
      }
      return { kind: "dotEnum", value: v };
    }
    // Qualified sizing: `Sizing.hug` / `Sizing.fill` / `Sizing.fixed(n)` / `Sizing.flex(…)` / `Sizing.aspect(…)`
    if (t.kind === "Sizing") {
      this.advance();
      this.consume(".");
      const mode = this.consume("IDENT").value;
      if (mode === "hug") return { kind: "sizing", mode: "hug" };
      if (mode === "fill") return { kind: "sizing", mode: "fill" };
      if (mode === "fixed") {
        if (!this.is("(")) {
          throw this.err(
            "`Sizing.fixed` requires a Distance number argument, e.g. `Sizing.fixed(48)`",
          );
        }
        this.consume("(");
        if (!this.is("NUMBER")) {
          throw this.err(
            "`Sizing.fixed` expects a Distance number (px), e.g. `Sizing.fixed(48)`",
          );
        }
        const n = this.consume("NUMBER");
        this.consume(")");
        return { kind: "sizing", mode: "fixed", fixed: Number(n.value) };
      }
      if (mode === "flex") {
        if (!this.is("(")) {
          throw this.err(
            "`Sizing.flex` requires arguments, e.g. `Sizing.flex(min: 8, max: 120)`",
          );
        }
        this.consume("(");
        const flexArgs = this.parseFlexArgs();
        this.consume(")");
        return { kind: "sizing", mode: "flex", flexArgs };
      }
      if (mode === "aspect") {
        if (!this.is("(")) {
          throw this.err(
            "`Sizing.aspect` requires a ratio argument, e.g. `Sizing.aspect(16:9)`",
          );
        }
        this.consume("(");
        const aspect = this.parseAspectArg();
        this.consume(")");
        return { kind: "sizing", mode: "aspect", aspect };
      }
      throw this.err(
        `Unknown Sizing mode \`${mode}\`; expected hug, fill, fixed, flex, or aspect`,
      );
    }
    if (t.kind === "(") {
      return this.parseParenValue();
    }
    if (t.kind === "[") {
      this.advance();
      const items: ValueExpr[] = [];
      if (!this.is("]")) {
        while (true) {
          items.push(this.parseValueExpr());
          if (this.is("]")) break;
          this.consume(",");
        }
      }
      this.consume("]");
      return { kind: "array", items };
    }
    if (t.kind === "IDENT") {
      // Qualified enum: `Justify.center` / `Tone.primary` → same AST as `.center` / `.primary`
      // (Sizing.* stays on the Sizing keyword branch above.)
      if (
        looksLikeQualifiedEnumTypeName(t.value) &&
        this.peekAheadKind(1) === "." &&
        this.peekAheadKind(2) === "IDENT" &&
        this.peekAheadKind(3) !== "." &&
        this.peekAheadKind(3) !== "("
      ) {
        this.advance();
        this.consume(".");
        const caseName = this.consume("IDENT").value;
        return { kind: "dotEnum", value: `.${caseName}` };
      }
      const name = this.parseQualifiedName();
      if (this.is("(")) {
        return this.parseIdentCall(name);
      }
      return { kind: "ident", name };
    }
    const kwCallStarts: TokenKind[] = [
      "EdgeInsets",
      "Corner",
      "Shadow",
      "Icon",
      "MediaSource",
      "GradientStop",
      "Color",
      "Ramp",
      "Blur",
      "Media",
      "Vibrancy",
      "Pose",
      "Stagger",
      "Motion",
    ];
    if (kwCallStarts.includes(t.kind)) {
      const name = this.advance().value;
      if (this.is("(")) {
        return this.parseIdentCall(name);
      }
      throw this.err(`Expected ( after ${name}`);
    }
    throw this.err(`Unexpected value start ${t.kind}`);
  }

  private parseParenValue(): ValueExpr {
    this.consume("(");
    const first = this.consume("IDENT").value;
    this.consume(":");
    if (first === "duration") {
      const duration = this.parseValueExpr();
      this.consume(",");
      this.consume("IDENT");
      this.consume(":");
      const easing = this.parseValueExpr();
      let delay: ValueExpr | undefined;
      if (this.is(",")) {
        this.advance();
        const lab = this.consume("IDENT").value;
        if (lab !== "delay") throw this.err("Expected delay in transition");
        this.consume(":");
        delay = this.parseValueExpr();
      }
      this.consume(")");
      return { kind: "transition", duration, easing, delay };
    }
    if (first === "saturation") {
      throw this.err(
        "Naked `(saturation:, brightness:)` is not allowed; use `Vibrancy(saturation: …, brightness: …)`",
      );
    }
    if (first === "direction") {
      const dir = this.parseValueExpr();
      if (dir.kind !== "dotEnum") throw this.err("Ramp direction must be dot-enum");
      this.consume(",");
      const stopsLabel = this.consume("IDENT").value;
      if (stopsLabel !== "stops") throw this.err("Expected stops after direction in ramp tuple");
      this.consume(":");
      this.consume("[");
      const stops: ValueExpr[] = [];
      if (!this.is("]")) {
        while (true) {
          stops.push(this.parseValueExpr());
          if (this.is("]")) break;
          this.consume(",");
        }
      }
      this.consume("]");
      this.consume(")");
      return { kind: "rampInline", direction: dir.value, stops };
    }
    throw this.err(`Unknown tuple starting with (${first}:`);
  }

  private parseIdentCall(name: string): ValueExpr {
    this.consume("(");
    if (name === "EdgeInsets") {
      const fields = this.parseLabelledArgs();
      this.consume(")");
      const keys = Object.keys(fields);
      if (keys.includes("x") && keys.includes("y")) {
        return { kind: "edgeInsets", variant: "xy", fields };
      }
      if (
        keys.includes("top") &&
        keys.includes("right") &&
        keys.includes("bottom") &&
        keys.includes("left")
      ) {
        return { kind: "edgeInsets", variant: "trbl", fields };
      }
      throw this.err("EdgeInsets requires (x:, y:) or (top:, right:, bottom:, left:)");
    }
    if (name === "Corner") {
      const fields = this.parseLabelledArgs();
      this.consume(")");
      const tl = fields.tl;
      const tr = fields.tr;
      const br = fields.br;
      const bl = fields.bl;
      if (!tl || !tr || !br || !bl) throw this.err("Corner requires tl, tr, br, bl");
      return { kind: "corner", tl, tr, br, bl };
    }
    if (name === "Shadow") {
      const fields = this.parseLabelledArgs();
      this.consume(")");
      const x = fields.x;
      const y = fields.y;
      const blurRadius = fields.blurRadius;
      const color = fields.color;
      if (!x || !y || !blurRadius || !color) {
        throw this.err("Shadow requires x, y, blurRadius, color (optional spread)");
      }
      return {
        kind: "shadow",
        x,
        y,
        blurRadius,
        color,
        ...(fields.spread ? { spread: fields.spread } : {}),
      };
    }
    if (name === "Icon") {
      throw this.err(
        "`Icon(…)` is the World A frame constructor; asset refs use `IconRef(file: …)` or `IconRef(system: …, name: …)`",
      );
    }
    if (name === "IconRef") {
      const fields = this.parseLabelledArgs();
      this.consume(")");
      if (fields.file && !fields.system && !fields.name) {
        return { kind: "iconRef", source: "file", path: fields.file };
      }
      if (fields.system && fields.name && !fields.file) {
        return { kind: "iconRef", source: "system", system: fields.system, name: fields.name };
      }
      throw this.err(
        "IconRef requires `file: \"…\"` or `system: .sfSymbols|.materialSymbols, name: \"…\"`",
      );
    }
    if (name === "MediaSource") {
      const fields = this.parseLabelledArgs();
      this.consume(")");
      const mediaKind = fields.kind;
      const format = fields.format;
      const unknown = Object.keys(fields).filter(
        (k) => k !== "file" && k !== "url" && k !== "kind" && k !== "format",
      );
      if (unknown.length) {
        throw this.err(
          `MediaSource unknown label(s): ${unknown.join(", ")} (expected file|url, optional kind, format)`,
        );
      }
      if (fields.file && !fields.url) {
        return {
          kind: "mediaSourceRef",
          source: "file",
          path: fields.file,
          ...(mediaKind ? { mediaKind } : {}),
          ...(format ? { format } : {}),
        };
      }
      if (fields.url && !fields.file) {
        return {
          kind: "mediaSourceRef",
          source: "url",
          url: fields.url,
          ...(mediaKind ? { mediaKind } : {}),
          ...(format ? { format } : {}),
        };
      }
      throw this.err(
        'MediaSource requires `file: "…"` or `url: "https://…"` (optional `kind:`, `format:`)',
      );
    }
    if (name === "GradientStop") {
      const fields = this.parseLabelledArgs();
      this.consume(")");
      return { kind: "gradientStop", fields };
    }
    if (name === "Pose") {
      const args = this.parseLabelledArgs();
      this.consume(")");
      return this.finishPose(args);
    }
    if (name === "Stagger") {
      const args = this.parseLabelledArgs();
      this.consume(")");
      return this.finishStagger(args);
    }
    if (name === "Motion") {
      const args = this.parseLabelledArgs();
      this.consume(")");
      return this.finishMotion(args);
    }
    if (name === "Media") {
      throw this.err(
        "`Media(…)` is the World A frame constructor; layer fills use `MediaLayer(source:, contentMode: …)`",
      );
    }
    if (
      name === "Color" ||
      name === "Ramp" ||
      name === "Blur" ||
      name === "MediaLayer" ||
      name === "Vibrancy"
    ) {
      const args = this.parseLabelledArgs();
      this.consume(")");
      if (name === "Blur") {
        if ("blur" in args && !("radius" in args)) {
          throw this.err(
            "`Blur(…)` takes `radius:` (a Radius / number), not `blur:`; e.g. `Blur(radius: 16)` or `Blur(radius: blurRadiusToken)`",
          );
        }
        if (!("radius" in args)) {
          throw this.err("`Blur(…)` requires `radius:` (optional `style:`, `vibrancy:`)");
        }
        const unknown = Object.keys(args).filter(
          (k) => k !== "radius" && k !== "style" && k !== "vibrancy",
        );
        if (unknown.length) {
          throw this.err(
            `Blur unknown label(s): ${unknown.join(", ")} (expected radius, optional style, vibrancy)`,
          );
        }
      }
      if (name === "Vibrancy") {
        if ("vibrancy" in args && !("saturation" in args)) {
          throw this.err(
            "`Vibrancy(…)` takes `saturation:` and `brightness:` (e.g. `Vibrancy(saturation: 1.2, brightness: 1.05)`); bare Vibrancy tokens are layers — not `Vibrancy(vibrancy: …)`",
          );
        }
        if (!("saturation" in args) || !("brightness" in args)) {
          throw this.err("`Vibrancy(…)` requires `saturation:` and `brightness:`");
        }
        const unknown = Object.keys(args).filter(
          (k) => k !== "saturation" && k !== "brightness",
        );
        if (unknown.length) {
          throw this.err(
            `Vibrancy unknown label(s): ${unknown.join(", ")} (expected saturation, brightness)`,
          );
        }
      }
      return {
        kind: "call",
        callee: name as "Color" | "Ramp" | "Blur" | "MediaLayer" | "Vibrancy",
        args,
      };
    }
    if (isFrameCtorName(name)) {
      throw this.err(
        `\`${name}(…)\` is a World A frame constructor — use \`let id = ${name}(…)\` or mount it in \`children\`, not as a value/layer expression`,
      );
    }
    // Component instance literal: `UpsellBody()` / `ConfirmBody(title: "…")`
    const kwargs = this.parseKwArgs();
    this.consume(")");
    return { kind: "instance", component: name, kwargs };
  }

  private parseLabelledArgs(): Record<string, ValueExpr> {
    const args: Record<string, ValueExpr> = {};
    if (this.is(")")) return args;
    while (true) {
      const lab = this.consume("IDENT").value;
      this.consume(":");
      args[lab] = this.parseValueExpr();
      if (this.is(")")) break;
      this.consume(",");
    }
    return args;
  }

  private finishPose(args: Record<string, ValueExpr>): ValueExpr {
    const unknown = Object.keys(args).filter((k) => !isMotionPropName(k));
    if (unknown.length) {
      throw this.err(
        `Pose unknown label(s): ${unknown.join(", ")} (expected ${MOTION_PROP_NAMES.join(", ")})`,
      );
    }
    if (!Object.keys(args).length) {
      throw this.err("`Pose(…)` requires at least one overlay field (opacity, scale, translateY, …)");
    }
    return { kind: "pose", props: args };
  }

  private finishStagger(args: Record<string, ValueExpr>): ValueExpr {
    if (!("step" in args)) {
      throw this.err("`Stagger(…)` requires `step:` (a Duration / milliseconds)");
    }
    const unknown = Object.keys(args).filter((k) => k !== "step" && k !== "from");
    if (unknown.length) {
      throw this.err(`Stagger unknown label(s): ${unknown.join(", ")} (expected step, optional from)`);
    }
    if (args.from) {
      if (args.from.kind !== "dotEnum") {
        throw this.err("`Stagger` `from:` must be `.first` or `.last`");
      }
      const raw = args.from.value.replace(/^\./, "");
      if (raw !== "first" && raw !== "last") {
        throw this.err("`Stagger` `from:` must be `.first` or `.last`");
      }
    }
    return { kind: "stagger", step: args.step, ...(args.from ? { from: args.from } : {}) };
  }

  private finishMotion(args: Record<string, ValueExpr>): ValueExpr {
    if (!("transition" in args)) {
      throw this.err("`Motion(…)` requires `transition:` (a Transition token or tuple)");
    }
    const unknown = Object.keys(args).filter(
      (k) => k !== "transition" && k !== "pose" && k !== "stagger",
    );
    if (unknown.length) {
      throw this.err(
        `Motion unknown label(s): ${unknown.join(", ")} (expected transition, optional pose, stagger)`,
      );
    }
    return {
      kind: "motion",
      transition: args.transition,
      ...(args.pose ? { pose: args.pose } : {}),
      ...(args.stagger ? { stagger: args.stagger } : {}),
    };
  }

  /** `.aspect(…)` arg: number, `W:H` sugar, or Ratio token ident. */
  private parseAspectArg(): ValueExpr {
    if (this.is("NUMBER")) {
      const wTok = this.consume("NUMBER");
      if (this.is(":") && this.peekAheadKind(1) === "NUMBER") {
        this.advance();
        const hTok = this.consume("NUMBER");
        const width = Number(wTok.value);
        const height = Number(hTok.value);
        if (!(height > 0) || !Number.isFinite(width) || !Number.isFinite(height)) {
          throw this.err("`.aspect(W:H)` requires a positive finite height (e.g. `.aspect(16:9)`)");
        }
        return { kind: "ratio", width, height };
      }
      const n = Number(wTok.value);
      if (!(n > 0) || !Number.isFinite(n)) {
        throw this.err("`.aspect(n)` requires a positive finite ratio (width/height)");
      }
      return { kind: "number", value: n };
    }
    if (this.is("IDENT")) {
      const name = this.parseQualifiedName();
      return { kind: "ident", name };
    }
    throw this.err(
      "`.aspect` expects a positive ratio number, `W:H` sugar, or a Ratio token (e.g. `.aspect(16:9)`)",
    );
  }

  private parseFlexArgs(): Record<string, ValueExpr> {
    const args: Record<string, ValueExpr> = {};
    while (!this.is(")")) {
      const lab = this.consume("IDENT").value;
      if (lab !== "min" && lab !== "max" && lab !== "preferred") {
        throw this.err(`Unknown flex arg ${lab}`);
      }
      this.consume(":");
      args[lab] = this.parseValueExpr();
      if (this.is(")")) break;
      this.consume(",");
    }
    return args;
  }

  /** `children = […]` or bare `children = chips` / `Tracks.focus.tracks` (§4b / §4e sugar). */
  private parseChildrenRhs(): ChildEntry[] {
    if (this.is("IDENT") && this.peekAheadKind(1) !== "(") {
      const id = this.parseQualifiedName();
      const opacity = this.parseOptionalChildOpacity();
      return [{ kind: "frameRef", id, ...(opacity ? { opacity } : {}) }];
    }
    return this.parseChildrenList();
  }

  private parseChildrenList(): ChildEntry[] {
    this.consume("[");
    const out: ChildEntry[] = [];
    if (!this.is("]")) {
      while (true) {
        out.push(this.parseChildEntry());
        if (this.is("]")) break;
        this.consume(",");
      }
    }
    this.consume("]");
    return out;
  }

  private parseChildEntry(): ChildEntry {
    if (this.is("DOT_ENUM") && this.peek().value === ".spacer") {
      throw this.err("`.spacer` was renamed to `Spacer()` (zero-arg child constructor)");
    }
    const peek = this.peek();
    const id = peek.value;
    const nameTok =
      peek.kind === "IDENT" || peek.kind === "Icon" || peek.kind === "Media";
    if (nameTok) {
      if (this.peekAheadKind(1) === "(") {
        this.advance();
        this.consume("(");
        if (id === "Spacer") {
          if (!this.is(")")) {
            throw this.err("`Spacer()` takes no arguments");
          }
          this.consume(")");
          if (this.is("@")) {
            throw this.err("`Spacer()` is not opacity-bearing; cannot apply postfix `@`");
          }
          return { kind: "spacer" };
        }
        if (isFrameCtorName(id)) {
          const { props, childEntries } = this.parseFrameCtorArgs();
          this.consume(")");
          const opacity = this.parseOptionalChildOpacity();
          return {
            kind: "frameCtor",
            frameKind: FRAME_CTOR_TO_KIND[id],
            props,
            ...(childEntries ? { childEntries } : {}),
            ...(opacity ? { opacity } : {}),
          };
        }
        const kwargs = this.parseKwArgs();
        this.consume(")");
        const opacity = this.parseOptionalChildOpacity();
        return {
          kind: "instance",
          component: id,
          kwargs,
          ...(opacity ? { opacity } : {}),
        };
      }
      const frameId = this.parseQualifiedName();
      const opacity = this.parseOptionalChildOpacity();
      return { kind: "frameRef", id: frameId, ...(opacity ? { opacity } : {}) };
    }
    throw this.err("Invalid child entry");
  }

  /** Frame ctor kwargs; `children:` is a child-entry list, not a ValueExpr. */
  private parseFrameCtorArgs(): {
    props: Record<string, ValueExpr>;
    childEntries?: ChildEntry[];
  } {
    const props: Record<string, ValueExpr> = {};
    let childEntries: ChildEntry[] | undefined;
    if (this.is(")")) return { props };
    while (true) {
      const lab = this.consume("IDENT").value;
      this.consume(":");
      if (lab === "children") {
        childEntries = this.parseChildrenList();
      } else {
        props[lab] = this.parseValueExpr();
      }
      if (this.is(")")) break;
      this.consume(",");
    }
    return { props, ...(childEntries ? { childEntries } : {}) };
  }

  private peekAheadKind(n: number): TokenKind {
    return this.tokens[this.index + n]?.kind ?? "EOF";
  }

  private parseKwArgs(): Record<string, ValueExpr> {
    const kwargs: Record<string, ValueExpr> = {};
    if (this.is(")")) return kwargs;
    while (true) {
      const k = this.consume("IDENT").value;
      this.consume(":");
      kwargs[k] = this.parseValueExpr();
      if (this.is(")")) break;
      this.consume(",");
    }
    return kwargs;
  }

  private is(kind: TokenKind): boolean {
    return this.peek().kind === kind;
  }

  private peek(): Token {
    return this.tokens[this.index] ?? { kind: "EOF", value: "", line: 1, column: 1 };
  }

  private lookaheadKind(n: number): TokenKind {
    return (this.tokens[this.index + n] ?? this.tokens[this.tokens.length - 1]!).kind;
  }

  private parseHostVerbArgs(): string[] {
    this.consume("(");
    const args: string[] = [];
    if (!this.is(")")) {
      while (true) {
        if (this.is("self")) {
          this.advance();
          if (this.is(".")) {
            this.advance();
            args.push(`self.${this.consume("IDENT").value}`);
          } else {
            args.push("self");
          }
        } else {
          args.push(this.consume("IDENT").value);
        }
        if (this.is(")")) break;
        this.consume(",");
      }
    }
    this.consume(")");
    return args;
  }

  private advance(): Token {
    const t = this.peek();
    if (t.kind !== "EOF") this.index++;
    return t;
  }

  /** Usage keys are normally IDENT; `description` is also a keyword for `Rule(..., description: …)`. */
  private consumeUsagePropKey(): string {
    const t = this.peek();
    if (t.kind === "IDENT") {
      this.advance();
      return t.value;
    }
    if (t.kind === "description") {
      this.advance();
      return "description";
    }
    throw this.err(`Expected usage property key, got ${t.kind}`);
  }

  private consume(kind: TokenKind): Token {
    const t = this.peek();
    if (t.kind !== kind) {
      throw this.err(`Expected ${kind}, got ${t.kind}`);
    }
    this.advance();
    return t;
  }

  private err(msg: string): PdlError {
    const t = this.peek();
    return new PdlError("PDL-E001", msg, {
      path: this.filePath,
      line: t.line,
      column: t.column,
    });
  }
}

import { tokenize } from "./lexer.js";

export function parseModule(source: string, path: string): ModuleAst {
  const tokens = tokenize(source, path);
  const p = new Parser(tokens, path);
  return p.parseModule();
}
