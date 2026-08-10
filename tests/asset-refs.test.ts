import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { coerceIconValue, coerceMediaSourceValue, isPackRelativeFilePath } from "../src/assetRefs.js";
import { buildBakedDesignComponent } from "../src/bakeDesign.js";
import { PdlError } from "../src/errors.js";
import { loadDesign } from "../src/loadDesign.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const atoms = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl/atoms", ...p);
const err = (...p: string[]) => resolve(__dirname, "../test-fixtures/pdl/errors", ...p);

describe("asset refs — path sugar", () => {
  it("accepts pack-relative paths with / or known extension", () => {
    expect(isPackRelativeFilePath("icons/star.svg")).toBe(true);
    expect(isPackRelativeFilePath("star.svg")).toBe(true);
    expect(isPackRelativeFilePath("star")).toBe(false);
    expect(isPackRelativeFilePath("/icons/star.svg")).toBe(false);
    expect(isPackRelativeFilePath("https://x/y.png")).toBe(false);
  });

  it("coerces file sugar to iconRef", () => {
    expect(coerceIconValue("icons/star.svg", "t")).toEqual({
      kind: "iconRef",
      source: "file",
      path: "icons/star.svg",
    });
  });

  it("rejects bare Icon string names", () => {
    expect(() => coerceIconValue("star", "t")).toThrow(PdlError);
  });

  it("coerces MediaSource URL and file sugar", () => {
    expect(coerceMediaSourceValue("https://example.com/a.png", "t")).toEqual({
      kind: "mediaSourceRef",
      source: "url",
      url: "https://example.com/a.png",
      mediaKind: "raster",
      format: "png",
    });
    expect(coerceMediaSourceValue("media/hero.jpg", "t")).toEqual({
      kind: "mediaSourceRef",
      source: "file",
      path: "media/hero.jpg",
      mediaKind: "raster",
      format: "jpeg",
    });
  });

  it("accepts pack-relative video extensions", () => {
    expect(isPackRelativeFilePath("clips/intro.mp4")).toBe(true);
    expect(coerceMediaSourceValue("clips/intro.webm", "t")).toMatchObject({
      mediaKind: "video",
      format: "webm",
    });
  });
});

describe("asset refs — validate / bake", () => {
  it("rejects bare Icon token RHS", () => {
    expect(() => loadDesign(err("e005-icon-bare-name.pdl"))).toThrow(/bare names|pack-relative/i);
  });

  it("rejects leading-slash Icon path", () => {
    expect(() => loadDesign(err("e005-icon-leading-slash.pdl"))).toThrow(/pack-relative|Icon/i);
  });

  it("rejects unknown Icon system", () => {
    expect(() => loadDesign(err("e006-icon-unknown-system.pdl"))).toThrow(/unknown system|sfSymbols/i);
  });

  it("bakes system Icon constructors to iconRef IR", () => {
    const design = loadDesign(atoms("icon_atoms.pdl"));
    const doc = buildBakedDesignComponent(design, { componentName: "AtomIconDefault" });
    const icon = doc.components.AtomIconDefault!.root.children[0]!.props.icon;
    expect(icon).toEqual({
      kind: "iconRef",
      source: "system",
      system: "sfSymbols",
      name: "checkmark",
    });
  });

  it("bakes pack-relative MediaSource to mediaSourceRef", () => {
    const design = loadDesign(atoms("media_atoms.pdl"));
    const doc = buildBakedDesignComponent(design, { componentName: "AtomMediaScaleDown" });
    const source = doc.components.AtomMediaScaleDown!.root.children[0]!.props.source;
    expect(source).toEqual({
      kind: "mediaSourceRef",
      source: "file",
      path: "media/local.png",
      mediaKind: "raster",
      format: "png",
    });
  });

  it("bakes explicit MediaSource kind/format on opaque URLs", () => {
    const design = loadDesign(atoms("media_atoms.pdl"));
    const doc = buildBakedDesignComponent(design, { componentName: "AtomMediaVideoKind" });
    const source = doc.components.AtomMediaVideoKind!.root.children[0]!.props.source;
    expect(source).toEqual({
      kind: "mediaSourceRef",
      source: "url",
      url: "https://cdn.example.com/abc123",
      mediaKind: "video",
      format: "mp4",
    });
  });

  it("rejects MediaSource kind/format mismatch", () => {
    expect(() => loadDesign(err("e006-media-kind-format-mismatch.pdl"))).toThrow(
      /incompatible|PDL-E006/i,
    );
  });

  it("rejects unknown MediaSource kind", () => {
    expect(() => loadDesign(err("e006-media-unknown-kind.pdl"))).toThrow(/kind|raster|PDL-E006/i);
  });
});
