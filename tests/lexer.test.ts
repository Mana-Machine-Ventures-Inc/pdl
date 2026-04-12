import { describe, expect, it } from "vitest";
import { tokenize } from "../src/lexer.js";

describe("lexer", () => {
  it("tokenizes keywords, hex, strings, and dot-enums", () => {
    const toks = tokenize(`primitive color.a: Color = #ABC\ncomponent X() layout { direction = .row }`, "t.pdl");
    const kinds = toks.map((t) => t.kind).filter((k) => k !== "EOF");
    expect(kinds).toContain("primitive");
    expect(kinds).toContain("Color");
    expect(kinds).toContain("HEX_COLOR");
    expect(kinds).toContain("component");
    expect(toks.some((t) => t.kind === "IDENT" && t.value === "layout")).toBe(true);
    expect(toks.some((t) => t.kind === "DOT_ENUM" && t.value === ".row")).toBe(true);
  });

  it("rejects leading zeros in integers", () => {
    expect(() => tokenize("primitive n: Distance = 007", "t.pdl")).toThrow();
  });

  it("lexes member access as IDENT . IDENT", () => {
    const toks = tokenize(`Row.children = [A]`, "t.pdl");
    const kinds = toks.map((t) => t.kind).filter((k) => k !== "EOF");
    expect(kinds).toEqual(
      expect.arrayContaining(["IDENT", ".", "IDENT", "=", "[", "IDENT", "]"]),
    );
  });
});
