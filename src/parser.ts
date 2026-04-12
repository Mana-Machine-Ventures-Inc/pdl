import type {
  ChildEntry,
  ComponentDecl,
  ComponentParam,
  ConditionExpr,
  ExposeDecl,
  FrameBodyItem,
  IfChain,
  ImportDecl,
  ModuleAst,
  PreviewBackgroundDecl,
  PrimitiveDecl,
  SemanticDecl,
  ThemeDecl,
  TopLevelDecl,
  TypeStyleDecl,
  ValueExpr,
  VariantDecl,
} from "./ast.js";
import { PdlError } from "./errors.js";
import type { Token, TokenKind } from "./lexer.js";

export class Parser {
  private readonly tokens: Token[];
  private index = 0;
  private readonly filePath: string;

  constructor(tokens: Token[], filePath: string) {
    this.tokens = tokens;
    this.filePath = filePath;
  }

  parseModule(): ModuleAst {
    const declarations: TopLevelDecl[] = [];
    while (!this.is("EOF")) {
      declarations.push(this.parseTopLevel());
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
      case "component":
        return this.parseComponent();
      case "expose":
        return this.parseExpose();
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

  private parseComponent(): ComponentDecl {
    this.consume("component");
    const name = this.consume("IDENT").value;
    this.consume("(");
    const params: ComponentParam[] = [];
    if (!this.is(")")) {
      while (true) {
        const pname = this.consume("IDENT").value;
        this.consume(":");
        const typeName = this.consumeParamTypeName();
        this.consume("=");
        const default_ = this.parseValueExpr();
        params.push({ name: pname, typeName, defaultValue: default_ });
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
    this.consume("{");
    const body = this.parseFrameBodyUntilClose();
    this.consume("}");
    return { kind: "component", name, params, rootKind, body };
  }

  private parseFrameBodyUntilClose(): FrameBodyItem[] {
    const items: FrameBodyItem[] = [];
    while (!this.is("}")) {
      items.push(this.parseFrameBodyItem());
    }
    return items;
  }

  private parseFrameBodyItem(): FrameBodyItem {
    if (this.is("let")) return this.parseLet();
    if (this.is("if")) return { kind: "if", chain: this.parseIfChain() };

    const id = this.peek();
    if (id.kind === "IDENT") {
      const name = id.value;
      this.advance();
      if (this.is(".")) {
        this.consume(".");
        const field = this.consume("IDENT").value;
        if (field === "children") {
          this.consume("=");
          const entries = this.parseChildrenList();
          return { kind: "children", target: { letId: name }, entries };
        }
        this.consume("=");
        const value = field === "hidden" ? this.parseHiddenRhs() : this.parseValueExpr();
        return { kind: "frameProp", frame: name, name: field, value };
      }
      if (this.is("=")) {
        this.advance();
        if (name === "children") {
          return { kind: "children", target: "root", entries: this.parseChildrenList() };
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
        "PDL-E011",
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
    const param = this.consume("IDENT").value;
    let op: "==" | "!=";
    if (this.is("==")) {
      op = "==";
      this.advance();
    } else if (this.is("!=")) {
      op = "!=";
      this.advance();
    } else throw this.err("Expected == or != in condition");
    const rhs = this.consume("DOT_ENUM").value;
    return { kind: "cmp", param, op, rhs };
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
        this.consume("(");
        const n = this.consume("NUMBER");
        this.consume(")");
        return { kind: "sizing", mode: "fixed", fixed: Number(n.value) };
      }
      if (v === ".flex") {
        this.consume("(");
        const flexArgs = this.parseFlexArgs();
        this.consume(")");
        return { kind: "sizing", mode: "flex", flexArgs };
      }
      return { kind: "dotEnum", value: v };
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
      const name = this.parseQualifiedName();
      if (this.is("(")) {
        return this.parseIdentCall(name);
      }
      return { kind: "ident", name };
    }
    const kwCallStarts: TokenKind[] = [
      "EdgeInsets",
      "Corner",
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
    throw this.err(`Unknown call ${name}`);
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
