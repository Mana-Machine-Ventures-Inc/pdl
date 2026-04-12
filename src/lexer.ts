/**
 * PDL lexer (full-spec.md §20).
 */
import { PdlError } from "./errors.js";

export type TokenKind =
  | "import"
  | "previewBackground"
  | "primitive"
  | "semantic"
  | "theme"
  | "typeStyle"
  | "variant"
  | "component"
  | "interaction"
  | "expose"
  | "fixtures"
  | "usage"
  | "rules"
  | "extend"
  | "let"
  | "if"
  | "else"
  | "on"
  | "for"
  | "true"
  | "false"
  | "self"
  | "case"
  | "example"
  | "Rule"
  | "description"
  | "EdgeInsets"
  | "Corner"
  | "GradientStop"
  | "Color"
  | "Opacity"
  | "Distance"
  | "Radius"
  | "Shadow"
  | "Icon"
  | "MediaSource"
  | "Ratio"
  | "FontFamily"
  | "Size"
  | "Weight"
  | "Sizing"
  | "Duration"
  | "Easing"
  | "Transition"
  | "Ramp"
  | "Blur"
  | "Media"
  | "Vibrancy"
  | "Background"
  | "Foreground"
  | "IDENT"
  | "DOT_ENUM"
  | "STRING"
  | "NUMBER"
  | "HEX_COLOR"
  | "{"
  | "}"
  | "("
  | ")"
  | "["
  | "]"
  | "="
  | "=="
  | "!="
  | ":"
  | ","
  | "+="
  | "&&"
  | "||"
  | "@"
  | ">"
  | ">="
  | "<"
  | "<="
  | "."
  | "EOF";

export interface Token {
  kind: TokenKind;
  value: string;
  line: number;
  column: number;
}

const KEYWORDS = new Map<string, TokenKind>([
  ["import", "import"],
  ["previewBackground", "previewBackground"],
  ["primitive", "primitive"],
  ["semantic", "semantic"],
  ["theme", "theme"],
  ["typeStyle", "typeStyle"],
  ["variant", "variant"],
  ["component", "component"],
  ["interaction", "interaction"],
  ["expose", "expose"],
  ["fixtures", "fixtures"],
  ["usage", "usage"],
  ["rules", "rules"],
  ["extend", "extend"],
  ["let", "let"],
  ["if", "if"],
  ["else", "else"],
  ["on", "on"],
  ["for", "for"],
  ["true", "true"],
  ["false", "false"],
  ["self", "self"],
  ["case", "case"],
  ["example", "example"],
  ["Rule", "Rule"],
  ["description", "description"],
  ["EdgeInsets", "EdgeInsets"],
  ["Corner", "Corner"],
  ["GradientStop", "GradientStop"],
  ["Color", "Color"],
  ["Opacity", "Opacity"],
  ["Distance", "Distance"],
  ["Radius", "Radius"],
  ["Shadow", "Shadow"],
  ["Icon", "Icon"],
  ["MediaSource", "MediaSource"],
  ["Ratio", "Ratio"],
  ["FontFamily", "FontFamily"],
  ["Size", "Size"],
  ["Weight", "Weight"],
  ["Sizing", "Sizing"],
  ["Duration", "Duration"],
  ["Easing", "Easing"],
  ["Transition", "Transition"],
  ["Ramp", "Ramp"],
  ["Blur", "Blur"],
  ["Media", "Media"],
  ["Vibrancy", "Vibrancy"],
  ["Background", "Background"],
  ["Foreground", "Foreground"],
]);

function isIdentStart(c: string): boolean {
  return /[A-Za-z_]/.test(c);
}

function isIdentContinue(c: string): boolean {
  return /[A-Za-z0-9_]/.test(c);
}

export function tokenize(source: string, filePath = "<input>"): Token[] {
  let i = 0;
  let line = 1;
  let column = 1;
  const tokens: Token[] = [];

  const bump = (n = 1) => {
    for (let k = 0; k < n; k++) {
      const ch = source[i + k];
      if (ch === "\n") {
        line++;
        column = 1;
      } else if (ch === "\r") {
        /* CR alone or before LF — line bump on LF */
        if (source[i + k + 1] !== "\n") {
          line++;
          column = 1;
        }
      } else {
        column++;
      }
    }
    i += n;
  };

  if (source.charCodeAt(0) === 0xfeff) {
    bump(1);
  }

  const push = (kind: TokenKind, value: string, startLine: number, startCol: number) => {
    tokens.push({ kind, value, line: startLine, column: startCol });
  };

  while (i < source.length) {
    const startLine = line;
    const startCol = column;
    const c = source[i]!;

    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      bump(1);
      continue;
    }

    if (c === "/" && source[i + 1] === "/") {
      bump(2);
      while (i < source.length && source[i] !== "\n" && source[i] !== "\r") {
        bump(1);
      }
      continue;
    }

    if (c === "#") {
      let j = i + 1;
      while (j < source.length && /[0-9A-Fa-f]/.test(source[j]!)) j++;
      const len = j - (i + 1);
      if (len !== 3 && len !== 6 && len !== 8) {
        throw new PdlError("PDL-E001", `Invalid hex color length (${len}), expected 3, 6, or 8`, {
          path: filePath,
          line: startLine,
          column: startCol,
        });
      }
      const raw = source.slice(i, j);
      push("HEX_COLOR", raw, startLine, startCol);
      bump(j - i);
      continue;
    }

    if (c === '"') {
      let j = i + 1;
      let out = "";
      while (j < source.length) {
        const ch = source[j]!;
        if (ch === '"') break;
        if (ch === "\\") {
          const esc = source[j + 1];
          if (esc === undefined) break;
          if (esc === "n") {
            out += "\n";
            j += 2;
            continue;
          }
          if (esc === "r") {
            out += "\r";
            j += 2;
            continue;
          }
          if (esc === "t") {
            out += "\t";
            j += 2;
            continue;
          }
          if (esc === "\\" || esc === '"') {
            out += esc;
            j += 2;
            continue;
          }
          if (esc === "u") {
            const hex = source.slice(j + 2, j + 6);
            if (!/^[0-9A-Fa-f]{4}$/.test(hex)) {
              throw new PdlError("PDL-E001", "Invalid \\u escape in string", {
                path: filePath,
                line,
                column: column + (j - i),
              });
            }
            out += String.fromCharCode(parseInt(hex, 16));
            j += 6;
            continue;
          }
          throw new PdlError("PDL-E001", `Invalid escape \\${esc} in string`, {
            path: filePath,
            line,
            column: column + (j - i),
          });
        }
        if (ch === "\n" || ch === "\r") {
          throw new PdlError("PDL-E001", "Unterminated string literal", {
            path: filePath,
            line: startLine,
            column: startCol,
          });
        }
        out += ch;
        j++;
      }
      if (j >= source.length || source[j] !== '"') {
        throw new PdlError("PDL-E001", "Unterminated string literal", {
          path: filePath,
          line: startLine,
          column: startCol,
        });
      }
      push("STRING", out, startLine, startCol);
      bump(j - i + 1);
      continue;
    }

    if (c === ".") {
      const prevCh = i === 0 ? " " : source[i - 1]!;
      const afterIdentOrNumber = /[A-Za-z0-9_]/.test(prevCh);
      const next = source[i + 1] ?? "";
      if (
        !afterIdentOrNumber &&
        next !== "" &&
        !/[0-9]/.test(next) &&
        /[A-Za-z_]/.test(next)
      ) {
        let j = i + 1;
        while (j < source.length && isIdentContinue(source[j]!)) j++;
        push("DOT_ENUM", source.slice(i, j), startLine, startCol);
        bump(j - i);
        continue;
      }
      push(".", ".", startLine, startCol);
      bump(1);
      continue;
    }

    if (c === "-" || (c >= "0" && c <= "9")) {
      const neg = c === "-";
      let j = i + (neg ? 1 : 0);
      if (neg && (j >= source.length || source[j]! < "0" || source[j]! > "9")) {
        throw new PdlError("PDL-E001", "Invalid number: lone minus", {
          path: filePath,
          line: startLine,
          column: startCol,
        });
      }
      const digitStart = j;
      while (j < source.length && source[j]! >= "0" && source[j]! <= "9") j++;
      if (j > digitStart && source[digitStart] === "0" && j > digitStart + 1 && source[digitStart + 1] !== ".") {
        throw new PdlError("PDL-E001", "Leading zeros not permitted in number literals", {
          path: filePath,
          line: startLine,
          column: startCol,
        });
      }
      let isDecimal = false;
      if (source[j] === ".") {
        isDecimal = true;
        j++;
        const fracStart = j;
        while (j < source.length && source[j]! >= "0" && source[j]! <= "9") j++;
        if (j === fracStart) {
          throw new PdlError("PDL-E001", "Malformed decimal literal", {
            path: filePath,
            line: startLine,
            column: startCol,
          });
        }
      }
      const raw = source.slice(i, j);
      if (!neg && !isDecimal && raw.length > 1 && raw[0] === "0") {
        throw new PdlError("PDL-E001", "Leading zeros not permitted in number literals", {
          path: filePath,
          line: startLine,
          column: startCol,
        });
      }
      push("NUMBER", raw, startLine, startCol);
      bump(j - i);
      continue;
    }

    if (isIdentStart(c)) {
      let j = i;
      while (j < source.length && isIdentContinue(source[j]!)) j++;
      const raw = source.slice(i, j);
      const kw = KEYWORDS.get(raw);
      if (kw) push(kw, raw, startLine, startCol);
      else push("IDENT", raw, startLine, startCol);
      bump(j - i);
      continue;
    }

    const two = source.slice(i, i + 2);
    if (two === "==") {
      push("==", "==", startLine, startCol);
      bump(2);
      continue;
    }
    if (two === "!=") {
      push("!=", "!=", startLine, startCol);
      bump(2);
      continue;
    }
    if (two === "+=") {
      push("+=", "+=", startLine, startCol);
      bump(2);
      continue;
    }
    if (two === "&&") {
      push("&&", "&&", startLine, startCol);
      bump(2);
      continue;
    }
    if (two === "||") {
      push("||", "||", startLine, startCol);
      bump(2);
      continue;
    }
    if (two === ">=") {
      push(">=", ">=", startLine, startCol);
      bump(2);
      continue;
    }
    if (two === "<=") {
      push("<=", "<=", startLine, startCol);
      bump(2);
      continue;
    }

    const singleMap: Record<string, TokenKind> = {
      "{": "{",
      "}": "}",
      "(": "(",
      ")": ")",
      "[": "[",
      "]": "]",
      "=": "=",
      ":": ":",
      ",": ",",
      "@": "@",
      ">": ">",
      "<": "<",
    };
    const sk = singleMap[c];
    if (sk) {
      push(sk, c, startLine, startCol);
      bump(1);
      continue;
    }

    throw new PdlError("PDL-E001", `Unexpected character ${JSON.stringify(c)}`, {
      path: filePath,
      line: startLine,
      column: startCol,
    });
  }

  push("EOF", "", line, column);
  return tokens;
}
