import { describe, expect, it } from "vitest";
import { applyEmitCapture } from "../src/applyEmitCapture.js";

describe("applyEmitCapture", () => {
  it("rebinds parent currentFilter from child emit select(filter)", () => {
    const captures = [
      {
        qualifier: "chips",
        channel: "select",
        payload: [{ name: "filter_id", type: "FilterId" }],
        body: [
          {
            kind: "assign",
            param: "currentFilter",
            value: { kind: "ident", name: "filter_id" },
          },
        ],
      },
    ];
    const r = applyEmitCapture(
      { currentFilter: "all" },
      captures,
      "select",
      ["filter"],
      { filter: "podcasts", title: "Podcasts", selected: "all" },
    );
    expect(r.handled).toBe(true);
    expect(r.changed).toBe(true);
    expect(r.params.currentFilter).toBe("podcasts");
  });

  it("collects let-qualified host verbs from emit-capture bodies", () => {
    const captures = [
      {
        qualifier: "Edit",
        channel: "tap",
        body: [
          { kind: "assign", param: "editing", value: { kind: "boolean", value: true } },
          {
            kind: "hostVerb",
            qualifier: "Input",
            name: "beginEditing",
            args: ["draft"],
          },
        ],
      },
    ];
    const r = applyEmitCapture({ editing: false, draft: "Hi" }, captures, "tap", [], {}, "Edit");
    expect(r.handled).toBe(true);
    expect(r.params.editing).toBe(true);
    expect(r.hostVerbs).toEqual([
      { qualifier: "Input", name: "beginEditing", args: ["draft"] },
    ]);
  });

  it("disambiguates multiple same-channel captures by let qualifier", () => {
    const captures = [
      {
        qualifier: "Edit",
        channel: "tap",
        body: [
          { kind: "assign", param: "editing", value: { kind: "boolean", value: true } },
          { kind: "assign", param: "status", value: { kind: "string", value: "Editing" } },
        ],
      },
      {
        qualifier: "Done",
        channel: "tap",
        body: [
          { kind: "assign", param: "editing", value: { kind: "boolean", value: false } },
          { kind: "assign", param: "status", value: { kind: "string", value: "Saved" } },
        ],
      },
      {
        qualifier: "Cancel",
        channel: "tap",
        body: [
          { kind: "assign", param: "editing", value: { kind: "boolean", value: false } },
          { kind: "assign", param: "status", value: { kind: "string", value: "Cancelled" } },
        ],
      },
    ];
    const edit = applyEmitCapture({ editing: false, status: "Idle" }, captures, "tap", [], {}, "Edit");
    expect(edit.handled).toBe(true);
    expect(edit.params.editing).toBe(true);
    expect(edit.params.status).toBe("Editing");

    const cancel = applyEmitCapture(
      { editing: true, status: "Editing" },
      captures,
      "tap",
      [],
      {},
      "Cancel",
    );
    expect(cancel.params.editing).toBe(false);
    expect(cancel.params.status).toBe("Cancelled");
  });
});
