import { describe, expect, it } from "vitest";
import {
  augmentUnknownComponentMessage,
  collectImportClosure,
  extractComponentNames,
  extractComponentRoles,
  findFilesDeclaringComponent,
  formatUnreachableModuleWarning,
  importHintFromEntry,
  resolveCanvasTarget,
  sourceDeclaresComponent,
  unreachableWorkspaceModules,
} from "../playground/src/file-canvas.js";

describe("file-canvas orphan module helpers", () => {
  const files = {
    "design.pdl": `import "tokens.pdl"\ncomponent Host() layout { children = [] }\n`,
    "tokens.pdl": `primitive brand: Color = #F00\n`,
    "buttons.pdl": `component SecondButton() layout { children = [] }\n`,
    "empty.pdl": `// comments only\n`,
  };

  it("sourceDeclaresComponent detects component decls", () => {
    expect(sourceDeclaresComponent(files["buttons.pdl"]!, "SecondButton")).toBe(true);
    expect(sourceDeclaresComponent(files["buttons.pdl"]!, "Host")).toBe(false);
  });

  it("resolveCanvasTarget paints every component, page, and screen in the file", () => {
    const src = `component EpisodeRow() layout { children = [] }\npage Home() layout { children = [] }\nscreen Phone() layout { children = [] }\n`;
    expect(extractComponentNames(src)).toEqual(["EpisodeRow", "Home", "Phone"]);
    const canvas = resolveCanvasTarget("n5_cover.pdl", { "n5_cover.pdl": src });
    expect(canvas.componentNames).toEqual(["EpisodeRow", "Home", "Phone"]);
    expect(canvas.primaryComponent).toBe("EpisodeRow");
  });

  it("extractComponentRoles tags page and screen decls", () => {
    const src = `component EpisodeRow() layout { children = [] }\npage Home() layout { children = [] }\nscreen Phone() layout { children = [] }\n`;
    expect(extractComponentRoles(src)).toEqual({ Home: "page", Phone: "screen" });
  });

  it("sourceDeclaresComponent treats page and screen as component kinds", () => {
    const src = `page Home() layout { children = [] }\nscreen Phone() layout { children = [] }\n`;
    expect(sourceDeclaresComponent(src, "Home")).toBe(true);
    expect(sourceDeclaresComponent(src, "Phone")).toBe(true);
  });

  it("unreachableWorkspaceModules skips sibling labs that share decl names", () => {
    const labs = {
      "n2_capture.pdl": `component EpisodeRow() layout { children = [] }\npage Home() layout { children = [] }\nscreen Phone() layout { children = [] }\n`,
      "n5_cover.pdl": `component EpisodeRow() layout { children = [] }\npage Home() layout { children = [] }\nscreen Phone() layout { children = [] }\n`,
    };
    expect(unreachableWorkspaceModules(labs, "n2_capture.pdl")).toEqual([]);
  });

  it("unreachableWorkspaceModules skips numbered sibling labs even without shared names", () => {
    const labs = {
      "test-fixtures/pdl/lab/nav/n1_propagation.pdl": `component Chip() layout { children = [] }\n`,
      "test-fixtures/pdl/lab/nav/n5_cover.pdl": `screen Phone() layout { children = [] }\n`,
      "test-fixtures/pdl/lab/nav/n0_roles.pdl": `component Button() layout { children = [] }\n`,
    };
    expect(
      unreachableWorkspaceModules(labs, "test-fixtures/pdl/lab/nav/n5_cover.pdl"),
    ).toEqual([]);
  });

  it("collectImportClosure follows imports from entry", () => {
    const closure = collectImportClosure("design.pdl", files);
    expect([...closure].sort()).toEqual(["design.pdl", "tokens.pdl"]);
  });

  it("unreachableWorkspaceModules lists decl files outside the entry graph", () => {
    expect(unreachableWorkspaceModules(files, "design.pdl")).toEqual(["buttons.pdl"]);
  });

  it("importHintFromEntry prefers same-dir basename", () => {
    expect(importHintFromEntry("design.pdl", "buttons.pdl")).toBe("buttons.pdl");
    expect(importHintFromEntry("pack/design.pdl", "pack/buttons.pdl")).toBe("buttons.pdl");
  });

  it("formatUnreachableModuleWarning uses PLAYGROUND-W001", () => {
    const w = formatUnreachableModuleWarning("buttons.pdl", "design.pdl");
    expect(w.code).toBe("PLAYGROUND-W001");
    expect(w.message).toMatch(/buttons\.pdl/);
    expect(w.message).toMatch(/import "buttons\.pdl"/);
  });

  it("findFilesDeclaringComponent locates orphans", () => {
    expect(findFilesDeclaringComponent(files, "SecondButton")).toEqual(["buttons.pdl"]);
  });

  it("augmentUnknownComponentMessage explains unimported decls", () => {
    const msg = augmentUnknownComponentMessage(
      "PDL-E037: Unknown component SecondButton",
      files,
      "design.pdl",
    );
    expect(msg).toMatch(/Found in `buttons\.pdl`/);
    expect(msg).toMatch(/not in import graph/);
    expect(msg).toMatch(/import "buttons\.pdl"/);
  });

  it("augmentUnknownComponentMessage is a no-op when name is truly missing", () => {
    const raw = "PDL-E037: Unknown component NoSuchThing";
    expect(augmentUnknownComponentMessage(raw, files, "design.pdl")).toBe(raw);
  });
});
