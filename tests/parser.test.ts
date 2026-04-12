import { describe, expect, it } from "vitest";
import { PdlError } from "../src/errors.js";
import { parseModule } from "../src/parser.js";

describe("parser", () => {
  it("parses semantic token type keywords", () => {
    const m = parseModule(`semantic color.x: Color = #112233`, "x.pdl");
    expect(m.declarations[0]).toMatchObject({
      kind: "semantic",
      name: "color.x",
      tokenType: "Color",
    });
  });

  it("rejects mixed && and || without parens", () => {
    expect(() =>
      parseModule(
        `variant V { case a case b }
         component C(p: V = .a) layout {
           if p == .a && p == .b || p == .a { direction = .row }
         }`,
        "x.pdl",
      ),
    ).toThrow(PdlError);
  });
});
