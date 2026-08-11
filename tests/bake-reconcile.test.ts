import { describe, expect, it } from "vitest";
import { frameReconcileKey } from "../src/bakeReconcile.js";
import type { BakedFrame } from "../src/bakeDesign.js";

describe("bakeReconcile", () => {
  it("keys nested instances by let id", () => {
    const f: BakedFrame = {
      id: "Input",
      kind: "text",
      props: {},
      children: [],
      instanceOf: "NoteField",
      instanceKwargs: { isEditing: true },
    };
    expect(frameReconcileKey(f)).toBe("let:Input");
  });

  it("keys plain frames by id", () => {
    const f: BakedFrame = {
      id: "Status",
      kind: "text",
      props: { content: "Hi" },
      children: [],
    };
    expect(frameReconcileKey(f)).toBe("id:Status");
  });
});
