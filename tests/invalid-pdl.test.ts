import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildComponentCatalogue } from "../src/catalogue.js";
import { buildResolvedTokenMap } from "../src/evaluate.js";
import { PdlError } from "../src/errors.js";
import { loadDesign } from "../src/loadDesign.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const err = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl/errors", ...p);

function expectPdl(fn: () => void, code: string, message?: RegExp): void {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(PdlError);
    expect((e as PdlError).code).toBe(code);
    if (message) expect((e as PdlError).message).toMatch(message);
    return;
  }
  throw new Error(`expected PdlError ${code}`);
}

describe("invalid PDL — lexer & parser (PDL-E001)", () => {
  const cases: [string, RegExp][] = [
    ["e001-unclosed-layout.pdl", /Unexpected token in frame body|EOF/],
    ["e001-unterminated-string.pdl", /Unterminated string literal/],
    ["e001-leading-zero-number.pdl", /Leading zeros not permitted/],
    ["e001-unknown-keyword.pdl", /Unexpected token IDENT at top level|compnonent/],
    ["e001-bad-string-escape.pdl", /Invalid escape/],
    ["e001-invalid-hex.pdl", /Invalid hex color length/],
    ["e012-hidden-disallowed-string.pdl", /Expected IDENT, got STRING/],
  ];
  it.each(cases)("loadDesign(%s) → PDL-E001", (file, re) => {
    expectPdl(() => loadDesign(err(file)), "PDL-E001", re);
  });
});

describe("invalid PDL — import graph", () => {
  it("PDL-E002 on import cycle", () => {
    expectPdl(() => loadDesign(err("e002-cycle-a.pdl")), "PDL-E002", /cycle|Import cycle/i);
  });

  it("missing import file surfaces as ENOENT (not PdlError)", () => {
    try {
      loadDesign(err("e001-import-missing.pdl"));
      throw new Error("expected loadDesign to throw");
    } catch (e) {
      expect(e).not.toBeInstanceOf(PdlError);
      expect((e as NodeJS.ErrnoException).code).toBe("ENOENT");
    }
  });
});

describe("invalid PDL — condition grammar (PDL-E011)", () => {
  it("rejects mixing && and || without parentheses in layout if", () => {
    expectPdl(() => loadDesign(err("e011-mixed-and-or.pdl")), "PDL-E011", /Cannot mix `&&` and `\|\|`/);
  });

  it("rejects mixing && and || without parentheses in hidden = condition", () => {
    expectPdl(() => loadDesign(err("e011-hidden-mixed-and-or.pdl")), "PDL-E011", /Cannot mix `&&` and `\|\|`/);
  });
});

describe("invalid PDL — unknown symbols & companions (PDL-E006)", () => {
  const cases: [string, RegExp][] = [
    ["e006-usage-unknown-component.pdl", /usage references unknown component/],
    ["e006-fixtures-unknown-component.pdl", /fixtures references unknown component/],
    ["e006-rules-unknown-component.pdl", /rules references unknown component/],
    ["e006-interaction-unknown-component.pdl", /interaction targets unknown component/],
    ["e006-extend-unknown-component.pdl", /extend targets unknown component/],
  ];
  it.each(cases)("loadDesign(%s) → PDL-E006", (file, re) => {
    expectPdl(() => loadDesign(err(file)), "PDL-E006", re);
  });
});

describe("invalid PDL — parameters & identifiers (PDL-E007)", () => {
  it("unknown fixture binding name", () => {
    expectPdl(() => loadDesign(err("e007-fixture-unknown-param.pdl")), "PDL-E007", /notAParam|Unknown parameter/);
  });

  it("unknown interaction assign target", () => {
    expectPdl(() => loadDesign(err("e007-interaction-unknown-param.pdl")), "PDL-E007", /bogus/);
  });

  it("unknown parameter in rules if condition", () => {
    expectPdl(() => loadDesign(err("e007-rules-if-unknown-param.pdl")), "PDL-E007", /nope/);
  });

  it("unresolved token ident in layout (catalogue / resolve path)", () => {
    const d = loadDesign(err("e007-unresolved-token-in-layout.pdl"));
    expectPdl(() => buildComponentCatalogue(d), "PDL-E007", /Unresolved identifier|thisNameDoesNotExist/);
  });

  it("unknown component in let instance (catalogue)", () => {
    const d = loadDesign(err("e006-let-instance-unknown-component.pdl"));
    expectPdl(() => buildComponentCatalogue(d), "PDL-E006", /DefinitelyNotAComponent/);
  });
});

describe("invalid PDL — frame & hidden rules (PDL-E012)", () => {
  it("unknown frame id in frameProp.hidden", () => {
    expectPdl(() => loadDesign(err("e012-frameprop-unknown-frame.pdl")), "PDL-E012", /GhostFrame/);
  });
});

describe("invalid PDL — token graph (PDL-E004)", () => {
  it("circular primitive definitions", () => {
    const d = loadDesign(err("e004-circular-primitives.pdl"));
    expectPdl(() => buildResolvedTokenMap(d), "PDL-E004", /Circular token reference/);
  });
});

describe("invalid PDL — catalogue & theme (PDL-E005 / PDL-E010)", () => {
  it("PDL-E005 for unknown active theme name", () => {
    const d = loadDesign(err("e005-unknown-theme.pdl"));
    expectPdl(() => buildComponentCatalogue(d, { theme: "NoSuchThemeName" }), "PDL-E005", /Unknown theme/);
  });

  it("PDL-E010 when variant param default is not a dot-enum", () => {
    const d = loadDesign(err("e010-variant-default-not-enum.pdl"));
    expectPdl(() => buildComponentCatalogue(d), "PDL-E010", /dot-enum/);
  });
});

describe("invalid PDL — legacy fixtures (same validators)", () => {
  const root = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl", ...p);

  it("PDL-E007 unknown parameter in layout if (e07)", () => {
    expectPdl(() => loadDesign(root("e07-if-unknown-param.pdl")), "PDL-E007", /layoutMode/);
  });

  it("PDL-E010 non-variant parameter in if (e10)", () => {
    expectPdl(() => loadDesign(root("e10-if-non-variant-param.pdl")), "PDL-E010", /non-variant/);
  });

  it("PDL-E010 unknown variant case (e10)", () => {
    expectPdl(() => loadDesign(root("e10-if-unknown-variant-case.pdl")), "PDL-E010", /bogus/);
  });

  it("PDL-E012 hidden on text root (e12)", () => {
    expectPdl(() => loadDesign(root("e12-hidden-on-text.pdl")), "PDL-E012", /layout/);
  });
});

describe("valid merge note — duplicate top-level names last-win", () => {
  it("two components with the same name in one file: load succeeds (later declaration wins)", () => {
    const d = loadDesign(err("valid-duplicate-component-name.pdl"));
    expect(d.components.has("Dup")).toBe(true);
    expect(d.components.get("Dup")!.params).toHaveLength(1);
    expect(d.components.get("Dup")!.params[0]!.name).toBe("second");
  });
});
