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

describe("invalid PDL — condition grammar (PDL-E038)", () => {
  it("rejects mixing && and || without parentheses in layout if", () => {
    expectPdl(() => loadDesign(err("e038-mixed-and-or.pdl")), "PDL-E038", /Cannot mix `&&` and `\|\|`/);
  });

  it("rejects mixing && and || without parentheses in hidden = condition", () => {
    expectPdl(() => loadDesign(err("e038-hidden-mixed-and-or.pdl")), "PDL-E038", /Cannot mix `&&` and `\|\|`/);
  });
});

describe("invalid PDL — frame property types (PDL-E006 / PDL-E011)", () => {
  it("PDL-E006 when gap is a hex color", () => {
    expectPdl(() => loadDesign(err("e006-gap-hex-color.pdl")), "PDL-E006", /gap.*number|Distance/);
  });

  it("PDL-E006 when direction is a string", () => {
    expectPdl(() => loadDesign(err("e006-direction-string.pdl")), "PDL-E006", /direction/);
  });

  it("PDL-E006 when text justify uses layout-only .stretch", () => {
    expectPdl(() => loadDesign(err("e006-text-justify-stretch.pdl")), "PDL-E006", /justify/);
  });

  it("PDL-E006 when overflow uses removed .hidden (use .clip)", () => {
    expectPdl(() => loadDesign(err("e006-overflow-hidden.pdl")), "PDL-E006", /overflow/);
  });

  it("PDL-E006 when overflow uses removed .auto (use .scroll)", () => {
    expectPdl(() => loadDesign(err("e006-overflow-auto.pdl")), "PDL-E006", /overflow/);
  });

  it("PDL-E006 when a bare Opacity token is used as a layer", () => {
    expectPdl(
      () => loadDesign(err("e006-opacity-as-layer.pdl")),
      "PDL-E006",
      /Opacity|color @/,
    );
  });

  it("PDL-E011 for unknown property on layout", () => {
    expectPdl(
      () => loadDesign(err("e011-unknown-prop-on-layout.pdl")),
      "PDL-E011",
      /unknown property `content` on `layout`/,
    );
  });

  it("PDL-E011 for unknown property on typeStyle", () => {
    expectPdl(
      () => loadDesign(err("e011-typestyle-unknown-prop.pdl")),
      "PDL-E011",
      /typeStyle.*gap|unknown property `gap`/,
    );
  });
});

describe("invalid PDL — unknown symbols & companions (PDL-E037 / PDL-E016)", () => {
  const cases: [string, string, RegExp][] = [
    ["e037-usage-unknown-component.pdl", "PDL-E037", /usage references unknown component/],
    ["e037-fixtures-unknown-component.pdl", "PDL-E037", /fixtures references unknown component/],
    ["e037-rules-unknown-component.pdl", "PDL-E037", /rules references unknown component/],
    ["e016-extend-unknown-component.pdl", "PDL-E016", /extend targets unknown component/],
  ];
  it.each(cases)("loadDesign(%s) → %s", (file, code, re) => {
    expectPdl(() => loadDesign(err(file)), code, re);
  });
});

describe("invalid PDL — removed interaction keyword (PDL-E001)", () => {
  it("rejects interaction blocks", () => {
    expectPdl(
      () => loadDesign(err("e037-interaction-unknown-component.pdl")),
      "PDL-E001",
      /interaction.*removed|self\.<channel>/,
    );
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
    const d = loadDesign(err("e037-let-instance-unknown-component.pdl"));
    expectPdl(() => buildComponentCatalogue(d), "PDL-E037", /DefinitelyNotAComponent/);
  });
});

describe("invalid PDL — frame & hidden rules (PDL-E012)", () => {
  it("unknown frame id in frameProp.hidden", () => {
    expectPdl(() => loadDesign(err("e012-frameprop-unknown-frame.pdl")), "PDL-E012", /GhostFrame/);
  });
});

describe("invalid PDL — token graph (PDL-E004)", () => {
  it("circular semantic definitions", () => {
    const d = loadDesign(err("e004-circular-primitives.pdl"));
    expectPdl(() => buildResolvedTokenMap(d), "PDL-E004", /Circular token reference/);
  });
});

describe("invalid PDL — catalogue & theme (PDL-E005 / PDL-E010)", () => {
  it("PDL-E005 when a primitive aliases another token", () => {
    expectPdl(
      () => loadDesign(err("e005-primitive-token-ref.pdl")),
      "PDL-E005",
      /Primitive `shield4` must use a literal value.*`red`.*Color/,
    );
  });

  it("PDL-E005 when a semantic aliases a token of the wrong type", () => {
    expectPdl(
      () => loadDesign(err("e005-semantic-type-mismatch.pdl")),
      "PDL-E005",
      /type Opacity but references `red` of type Color/,
    );
  });

  it("PDL-E005 when Radius token uses Corner(…)", () => {
    expectPdl(
      () => loadDesign(err("e005-radius-corner-on-token.pdl")),
      "PDL-E005",
      /Radius.*Corner|Corner.*cornerRadius/,
    );
  });

  it("PDL-E005 when Distance token uses a string", () => {
    expectPdl(
      () => loadDesign(err("e005-distance-string.pdl")),
      "PDL-E005",
      /Distance.*non-negative number/,
    );
  });

  it("PDL-E005 when Shadow token uses a CSS string", () => {
    expectPdl(
      () => loadDesign(err("e005-shadow-string.pdl")),
      "PDL-E005",
      /Shadow.*Shadow\(|CSS box-shadow/,
    );
  });

  it("PDL-E005 when Icon token uses a bare name", () => {
    expectPdl(
      () => loadDesign(err("e005-icon-bare-name.pdl")),
      "PDL-E005",
      /bare names|pack-relative|Icon/,
    );
  });

  it("PDL-E005 when Icon token path has a leading slash", () => {
    expectPdl(
      () => loadDesign(err("e005-icon-leading-slash.pdl")),
      "PDL-E005",
      /pack-relative|Icon/,
    );
  });

  it("PDL-E006 when Icon system is unknown", () => {
    expectPdl(
      () => loadDesign(err("e006-icon-unknown-system.pdl")),
      "PDL-E006",
      /unknown system|sfSymbols|materialSymbols/,
    );
  });

  it("PDL-E006 when aspectRatio conflicts with both axes closed", () => {
    expectPdl(
      () => loadDesign(err("e006-aspect-overconstrained.pdl")),
      "PDL-E006",
      /aspectRatio.*conflicts|both `width` and `height`/,
    );
  });

  it("PDL-E005 when Shadow axis is a string", () => {
    expectPdl(
      () => loadDesign(err("e005-shadow-axis-string.pdl")),
      "PDL-E005",
      /Shadow.*field `x`.*number/,
    );
  });

  it("PDL-E005 when Shadow axis references a Color token", () => {
    expectPdl(
      () => loadDesign(err("e005-shadow-axis-color-token.pdl")),
      "PDL-E005",
      /Shadow.*field `x`.*numeric token|`red` has type Color/,
    );
  });

  it("PDL-E005 when color @ opacity literal is out of range", () => {
    expectPdl(
      () => loadDesign(err("e005-opacity-of-out-of-range.pdl")),
      "PDL-E005",
      /Opacity side of `@`.*0…1|got 1\.5/,
    );
  });

  it("PDL-E005 when FontFamily token uses a number", () => {
    expectPdl(
      () => loadDesign(err("e005-fontfamily-number.pdl")),
      "PDL-E005",
      /FontFamily.*string/,
    );
  });

  it("PDL-E005 when FontFamily token uses a hex color", () => {
    expectPdl(
      () => loadDesign(err("e005-fontfamily-hex.pdl")),
      "PDL-E005",
      /FontFamily.*string/,
    );
  });

  it("PDL-E005 when Size token uses a string", () => {
    expectPdl(() => loadDesign(err("e005-size-string.pdl")), "PDL-E005", /Size.*number/);
  });

  it("PDL-E005 when LineHeight token uses a string", () => {
    expectPdl(() => loadDesign(err("e005-lineheight-string.pdl")), "PDL-E005", /LineHeight/);
  });

  it("PDL-E005 when LineHeight token is zero", () => {
    expectPdl(() => loadDesign(err("e005-lineheight-zero.pdl")), "PDL-E005", /LineHeight/);
  });

  it("PDL-E005 when LetterSpacing token uses a string", () => {
    expectPdl(
      () => loadDesign(err("e005-letterspacing-string.pdl")),
      "PDL-E005",
      /LetterSpacing/,
    );
  });

  it("PDL-E005 when Sizing token uses a string", () => {
    expectPdl(
      () => loadDesign(err("e005-sizing-string.pdl")),
      "PDL-E005",
      /Sizing.*sizing literal|got string/,
    );
  });

  it("PDL-E005 when Color token uses a number", () => {
    expectPdl(() => loadDesign(err("e005-color-number.pdl")), "PDL-E005", /Color.*hex|Color.*color/);
  });

  it("PDL-E005 when token RHS is null", () => {
    expectPdl(() => loadDesign(err("e005-token-null.pdl")), "PDL-E005", /null.*frame properties|got null/);
  });

  it("PDL-E005 when Opacity token uses a string", () => {
    expectPdl(() => loadDesign(err("e005-opacity-string.pdl")), "PDL-E005", /Opacity.*0…1|Opacity.*number/);
  });

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
    expectPdl(() => loadDesign(root("errors", "legacy", "e07-if-unknown-param.pdl")), "PDL-E007", /layoutMode/);
  });

  it("PDL-E010 non-variant parameter in if (e10)", () => {
    expectPdl(() => loadDesign(root("errors", "legacy", "e10-if-non-variant-param.pdl")), "PDL-E010", /non-variant/);
  });

  it("PDL-E010 unknown variant case (e10)", () => {
    expectPdl(() => loadDesign(root("errors", "legacy", "e10-if-unknown-variant-case.pdl")), "PDL-E010", /bogus/);
  });

  it("PDL-E012 hidden on text root (e12)", () => {
    expectPdl(() => loadDesign(root("errors", "legacy", "e12-hidden-on-text.pdl")), "PDL-E012", /layout/);
  });
});

describe("PDL-E003 duplicate token names", () => {
  it("same-file primitive redeclaration", () => {
    expectPdl(
      () => loadDesign(err("e003-duplicate-token.pdl")),
      "PDL-E003",
      /Invalid redeclaration of token `color\.dup`/,
    );
  });

  it("primitive vs semantic same name", () => {
    expectPdl(
      () => loadDesign(err("e003-duplicate-token-cross-kind.pdl")),
      "PDL-E003",
      /Invalid redeclaration of token `color\.clash`/,
    );
  });

  it("import chain redeclaration", () => {
    expectPdl(
      () => loadDesign(err("e003-duplicate-token-import.pdl")),
      "PDL-E003",
      /Invalid redeclaration of token `color\.shared`/,
    );
  });
});

describe("valid merge note — duplicate component names last-win", () => {
  it("two components with the same name in one file: load succeeds (later declaration wins)", () => {
    const d = loadDesign(err("valid-duplicate-component-name.pdl"));
    expect(d.components.has("Dup")).toBe(true);
    expect(d.components.get("Dup")!.params).toHaveLength(1);
    expect(d.components.get("Dup")!.params[0]!.name).toBe("second");
  });
});
