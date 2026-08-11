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

  it("funnels shell SoT through Input.began / finished / cancelled captures", () => {
    const captures = [
      {
        qualifier: "Input",
        channel: "began",
        payload: [{ name: "value", type: "String" }],
        body: [
          { kind: "assign", param: "draft", value: { kind: "ident", name: "value" } },
          { kind: "assign", param: "editing", value: { kind: "boolean", value: true } },
          {
            kind: "assign",
            param: "status",
            value: { kind: "string", value: "Editing — Done / Enter save; Cancel / Esc discard" },
          },
        ],
      },
      {
        qualifier: "Input",
        channel: "finished",
        payload: [{ name: "value", type: "String" }],
        body: [
          { kind: "assign", param: "draft", value: { kind: "ident", name: "value" } },
          { kind: "assign", param: "committed", value: { kind: "ident", name: "value" } },
          { kind: "assign", param: "editing", value: { kind: "boolean", value: false } },
          { kind: "assign", param: "status", value: { kind: "string", value: "Saved" } },
        ],
      },
      {
        qualifier: "Input",
        channel: "cancelled",
        payload: [{ name: "value", type: "String" }],
        body: [
          { kind: "assign", param: "draft", value: { kind: "ident", name: "committed" } },
          { kind: "assign", param: "editing", value: { kind: "boolean", value: false } },
          {
            kind: "assign",
            param: "status",
            value: { kind: "string", value: "Cancelled — committed text unchanged" },
          },
        ],
      },
    ];
    const began = applyEmitCapture(
      {
        committed: "Ship",
        draft: "Ship",
        editing: false,
        status: "Idle",
      },
      captures,
      "began",
      ["value"],
      { value: "Ship" },
      "Input",
    );
    expect(began.params).toMatchObject({
      draft: "Ship",
      editing: true,
      status: "Editing — Done / Enter save; Cancel / Esc discard",
    });

    const saved = applyEmitCapture(
      {
        committed: "Ship",
        draft: "Ship draft",
        editing: true,
        status: "Editing",
      },
      captures,
      "finished",
      ["value"],
      { value: "Ship EditableText" },
      "Input",
    );
    expect(saved.handled).toBe(true);
    expect(saved.params).toMatchObject({
      draft: "Ship EditableText",
      committed: "Ship EditableText",
      editing: false,
      status: "Saved",
    });

    const cancelled = applyEmitCapture(
      {
        committed: "Ship",
        draft: "Ship draft",
        editing: true,
        status: "Editing",
      },
      captures,
      "cancelled",
      ["value"],
      { value: "Ship" },
      "Input",
    );
    expect(cancelled.params).toMatchObject({
      draft: "Ship",
      committed: "Ship",
      editing: false,
      status: "Cancelled — committed text unchanged",
    });
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
