import { describe, expect, it } from "vitest";
import { mergeEditableSessionParams } from "../src/renderHtml.js";

describe("mergeEditableSessionParams", () => {
  it("lets bake end the session after Done (prev isEditing must not stick)", () => {
    const merged = mergeEditableSessionParams(
      { isEditing: false, value: "saved note" },
      { isEditing: true, value: "typed draft", _editCheckpoint: "old" },
    );
    expect(merged.isEditing).toBe(false);
    expect(merged.value).toBe("saved note");
  });

  it("keeps in-flight text while still editing", () => {
    const merged = mergeEditableSessionParams(
      { isEditing: true, value: "hello" },
      { isEditing: true, value: "hello world", _editCheckpoint: "hello" },
    );
    expect(merged.isEditing).toBe(true);
    expect(merged.value).toBe("hello world");
  });

  it("prefers focused live input while editing", () => {
    const merged = mergeEditableSessionParams(
      { isEditing: true, value: "hello" },
      { isEditing: true, value: "stale" },
      "from input",
    );
    expect(merged.value).toBe("from input");
  });

  it("restores committed value on Cancel bake", () => {
    const merged = mergeEditableSessionParams(
      { isEditing: false, value: "committed" },
      { isEditing: true, value: "abandoned draft", _editCheckpoint: "committed" },
    );
    expect(merged.isEditing).toBe(false);
    expect(merged.value).toBe("committed");
  });
});
