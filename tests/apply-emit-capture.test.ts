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

  it("ForEach: instance-let qualifier still matches list-name capture (chips)", () => {
    // Host passes data-pdl-instance-let (Root_LabChip_N); catalogue stamps ForEach list name.
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
      { filter: "podcasts", selected: false },
      "Root_LabChip_1",
    );
    expect(r.handled).toBe(true);
    expect(r.changed).toBe(true);
    expect(r.params.currentFilter).toBe("podcasts");
  });

  it("multi-ForEach: foreachList qualifier disambiguates chips vs tracks select", () => {
    const captures = [
      {
        qualifier: "chips",
        channel: "select",
        payload: [{ name: "mood_id", type: "MoodId" }],
        body: [
          {
            kind: "assign",
            param: "currentMood",
            value: { kind: "ident", name: "mood_id" },
          },
        ],
      },
      {
        qualifier: "tracks",
        channel: "select",
        payload: [{ name: "id", type: "TrackId" }],
        body: [
          {
            kind: "assign",
            param: "selectedTrack",
            value: { kind: "ident", name: "id" },
          },
        ],
      },
    ];
    const chip = applyEmitCapture(
      { currentMood: "all", selectedTrack: "none" },
      captures,
      "select",
      ["mood"],
      { mood: "drive", title: "Drive", selected: false },
      "chips", // data-pdl-foreach-list
    );
    expect(chip.handled).toBe(true);
    expect(chip.params.currentMood).toBe("drive");
    expect(chip.params.selectedTrack).toBe("none");

    const track = applyEmitCapture(
      { currentMood: "all", selectedTrack: "none" },
      captures,
      "select",
      ["trackId"],
      { trackId: "coastal", title: "Coastal Gear", selected: false },
      "tracks",
    );
    expect(track.handled).toBe(true);
    expect(track.params.selectedTrack).toBe("coastal");
    expect(track.params.currentMood).toBe("all");

    // Instance-let alone must not guess among multiple select captures.
    const miss = applyEmitCapture(
      { currentMood: "all", selectedTrack: "none" },
      captures,
      "select",
      ["trackId"],
      { trackId: "coastal" },
      "TrackList_TrackRow_2",
    );
    expect(miss.handled).toBe(false);
  });

  it("does not fall back across multiple let-qualified same-channel captures", () => {
    const captures = [
      {
        qualifier: "Edit",
        channel: "tap",
        body: [{ kind: "assign", param: "status", value: { kind: "string", value: "Edit" } }],
      },
      {
        qualifier: "Done",
        channel: "tap",
        body: [{ kind: "assign", param: "status", value: { kind: "string", value: "Done" } }],
      },
    ];
    const miss = applyEmitCapture(
      { status: "Idle" },
      captures,
      "tap",
      [],
      {},
      "Root_Edit_0",
    );
    expect(miss.handled).toBe(false);
    expect(miss.params.status).toBe("Idle");
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
