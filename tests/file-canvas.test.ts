import { describe, expect, it } from "vitest";
import {
  augmentUnknownComponentMessage,
  collectImportClosure,
  findFilesDeclaringComponent,
  formatUnreachableModuleWarning,
  importHintFromEntry,
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
