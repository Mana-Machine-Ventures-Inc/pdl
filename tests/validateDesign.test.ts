import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PdlError } from "../src/errors.js";
import { loadDesign } from "../src/loadDesign.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fx = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl", ...p);

function expectLoadFails(code: string, file: string, msg: RegExp): void {
  try {
    loadDesign(fx(file));
  } catch (e) {
    expect(e).toBeInstanceOf(PdlError);
    expect((e as PdlError).code).toBe(code);
    expect((e as PdlError).message).toMatch(msg);
    return;
  }
  throw new Error(`expected loadDesign(${file}) to throw ${code}`);
}

describe("validateMergedDesign (if conditions)", () => {
  it("PDL-E007 when condition names an unknown parameter", () => {
    expectLoadFails("PDL-E007", "e07-if-unknown-param.pdl", /layoutMode/);
  });

  it("PDL-E010 when condition uses a non-variant parameter", () => {
    expectLoadFails("PDL-E010", "e10-if-non-variant-param.pdl", /non-variant/);
  });

  it("PDL-E010 when variant case is not declared on the parameter's variant type", () => {
    expectLoadFails("PDL-E010", "e10-if-unknown-variant-case.pdl", /bogus/);
  });

  it("PDL-E012 when `hidden` is used on a non-layout frame", () => {
    expectLoadFails("PDL-E012", "e12-hidden-on-text.pdl", /layout/);
  });
});
