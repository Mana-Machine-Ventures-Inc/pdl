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
import { isFrameEnumTypeName } from "./frameProps.js";
import type { Token, TokenKind } from "./lexer.js";

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

  private consumeFrameKindKeyword(): string {
    const t = this.peek();
    if (t.kind !== "IDENT") {
      throw this.err(`Expected frame kind layout|text|icon|media, got ${t.kind}`);
    }
    const v = t.value;
    if (v === "layout" || v === "text" || v === "icon" || v === "media") {
      this.advance();
      return v;
    }
    throw this.err(`Expected frame kind layout|text|icon|media, got IDENT ${v}`);
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
      "Blur",
      "Vibrancy",
      "Ramp",
      "Background",
      "Foreground",
    ];
    if (typeKeywords.includes(t.kind)) {
      return this.advance().value;
    }
    throw this.err(`Expected parameter type name, got ${t.kind}`);
  }

  private consumeTokenTypeName(): string {
    const t = this.peek();
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
      "Blur",
      "Vibrancy",
      "Ramp",
      "Background",
      "Foreground",
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
      if (this.is("from") || this.is("to") || this.is("stagger") || this.is("staggerFrom")) {
        throw this.err("from/to/stagger in interaction handlers are not implemented yet");
      }
      let param: string;
      if (this.is("self")) {
        this.advance();
        this.consume(".");
        param = this.consume("IDENT").value;
      } else {
        param = this.consume("IDENT").value;
      }
      // Host verb: `beginEditing(value)` / `cancelEditing()`
      if (this.is("(")) {
        this.advance();
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

  private parseRuleChainFromAxis(
    axis: "self" | "parent" | "ancestors" | "descendants" | "siblings" | "children",
    whereTags: string[],
  ): RuleQueryParsed {
    let terminal: RuleChainTerminalParsed = { kind: "exists" };
    while (this.is(".")) {
      this.advance();
      if (this.is("where")) {
        this.advance();
        this.consume("(");
        const tagKw = this.consume("IDENT").value;
        if (tagKw !== "tag") throw this.err('Expected tag in where(tag: "...")');
        this.consume(":");
        whereTags.push(this.consume("STRING").value);
        this.consume(")");
        continue;
      }
      if (this.is("IDENT") && this.peek().value === "exists") {
        this.advance();
        terminal = { kind: "exists" };
        break;
      }
      if (this.is("IDENT") && this.peek().value === "count") {
        this.advance();
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
      if (this.is("IDENT")) {
        const rel = this.peek().value;
        if (rel === "precedes" || rel === "follows" || rel === "adjacentTo") {
          this.advance();
          this.consume("(");
          this.consume("self");
          this.consume(")");
          terminal = { kind: "ordering", relation: rel, ref: "self" };
          break;
        }
      }
      throw this.err(`Unexpected rule query token ${this.peek().kind}`);
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
    return { kind: "protocol", name, role, requires };
  }

  private parseComponent(): ComponentDecl {
    this.consume("component");
    const name = this.consume("IDENT").value;
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
    const body = this.parseFrameBodyUntilClose();
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

    // Host inbound: `[self.]pressEnd = { … }` → lifted to InteractionDecl after component.
    if (this.is("self")) {
      this.advance();
      this.consume(".");
      const event = this.consume("IDENT").value;
      this.consume("=");
      this.consume("{");
      const body = this.parseInteractionHandlerBody();
      this.consume("}");
      this.pendingHostHandlers.push({ event, body });
      return null;
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
      const comp = this.consume("IDENT").value;
      this.consume("(");
      const kwargs = this.parseKwArgs();
      this.consume(")");
      return { kind: "letInstance", id, component: comp, kwargs };
    }
    this.consume(":");
    const frameKind = this.consumeFrameKindKeyword();
    this.consume("=");
    this.consume("{");
    const body = this.parseFrameBodyUntilClose();
    this.consume("}");
    return { kind: "let", id, frameKind, body };
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
    if (this.is("IDENT")) {
      return { kind: "cmp", param, op, rhs: this.advance().value };
    }
    throw this.err("Expected == or != RHS in condition");
  }

  parseValueExpr(): ValueExpr {
    const lhs = this.parsePrimaryValue();
    if (this.is("@")) {
      this.advance();
      const op = this.parsePrimaryValue();
      return { kind: "opacityOf", base: lhs, opacity: op };
    }
    return lhs;
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
    if (t.kind === "DOT_ENUM") {
      this.advance();
      const v = t.value;
      if (v === ".hug") return { kind: "sizing", mode: "hug" };
      if (v === ".fill") return { kind: "sizing", mode: "fill" };
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
      return { kind: "dotEnum", value: v };
    }
    // Qualified sizing: `Sizing.hug` / `Sizing.fill` / `Sizing.fixed(n)` / `Sizing.flex(…)`
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
      throw this.err(
        `Unknown Sizing mode \`${mode}\`; expected hug, fill, fixed, or flex`,
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
      // Qualified frame enum: `Justify.center` → same AST as `.center`
      // (Sizing.* stays on the Sizing keyword branch above.)
      if (
        isFrameEnumTypeName(t.value) &&
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
      "GradientStop",
      "Color",
      "Ramp",
      "Blur",
      "Media",
      "Vibrancy",
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
      const sat = this.parseValueExpr();
      this.consume(",");
      this.consume("IDENT");
      this.consume(":");
      const bright = this.parseValueExpr();
      this.consume(")");
      if (sat.kind !== "number" || bright.kind !== "number") {
        throw this.err("Vibrancy tuple expects numeric saturation/brightness");
      }
      return { kind: "vibrancyTuple", saturation: sat.value, brightness: bright.value };
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
    if (name === "GradientStop") {
      const fields = this.parseLabelledArgs();
      this.consume(")");
      return { kind: "gradientStop", fields };
    }
    if (name === "Color" || name === "Ramp" || name === "Blur" || name === "Media" || name === "Vibrancy") {
      const args = this.parseLabelledArgs();
      this.consume(")");
      return { kind: "call", callee: name, args };
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

  /** `children = […]` or bare `children = chips` (§4b / §4e sugar). */
  private parseChildrenRhs(): ChildEntry[] {
    if (this.is("IDENT") && this.peekAheadKind(1) !== "(") {
      const id = this.consume("IDENT").value;
      return [{ kind: "frameRef", id }];
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
      this.advance();
      return { kind: "spacer" };
    }
    if (this.is("IDENT")) {
      const id = this.peek().value;
      if (this.peekAheadKind(1) === "(") {
        this.advance();
        this.consume("(");
        const kwargs = this.parseKwArgs();
        this.consume(")");
        return { kind: "instance", component: id, kwargs };
      }
      this.advance();
      return { kind: "frameRef", id };
    }
    throw this.err("Invalid child entry");
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
