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

  it("treats enum as a surface alias for the variant keyword", () => {
    const toks = tokenize(`enum FilterId { case all }\nvariant Tone { case primary }`, "t.pdl");
    const keywords = toks.filter((t) => t.kind === "variant");
    expect(keywords).toHaveLength(2);
    expect(keywords.every((t) => t.kind === "variant")).toBe(true);
  });

  it("skips /* */ block comments", () => {
    const toks = tokenize(
      `/*\n  ForEach(chips) { chip in\n    chip.title = "A"\n  }\n  */\nprimitive color.a: Color = #ABC`,
      "t.pdl",
    );
    expect(toks[0]?.kind).toBe("primitive");
    expect(toks.some((t) => t.value === "ForEach")).toBe(false);
  });

  it("rejects unterminated block comments", () => {
    expect(() => tokenize("/* still open\nprimitive x: Color = #000", "t.pdl")).toThrow(
      /Unterminated block comment/,
    );
  });
});
