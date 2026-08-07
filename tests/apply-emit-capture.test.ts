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
});
