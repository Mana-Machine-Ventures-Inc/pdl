import { describe, expect, it } from "vitest";
import { omitEmptyDeep, stableStringify } from "../src/stableJson.js";

describe("omitEmptyDeep", () => {
  it("drops object keys whose values are empty arrays or objects", () => {
    expect(
      omitEmptyDeep({
        a: 1,
        children: [],
        props: {},
        nested: { x: [], y: { z: {} } },
      }),
    ).toEqual({
      a: 1,
    });
  });

  it("keeps empty array/object elements inside arrays", () => {
    expect(omitEmptyDeep({ items: [{}, [], { id: 1 }] })).toEqual({
      items: [{}, [], { id: 1 }],
    });
  });

  it("keeps explicit empty arrays under fixtures", () => {
    expect(
      omitEmptyDeep({
        components: {
          Composer: {
            fixtures: {
              Empty: { tracks: [], status: "none" },
            },
            children: [],
          },
        },
      }),
    ).toEqual({
      components: {
        Composer: {
          fixtures: {
            Empty: { tracks: [], status: "none" },
          },
        },
      },
    });
  });
});

describe("stableStringify omitEmpty", () => {
  it("omits empty keys then sorts for deterministic output", () => {
    const s = stableStringify(
      { z: [], b: 2, a: { nested: {} } },
      { omitEmpty: true },
    );
    expect(s).toBe(
      `{
  "b": 2
}
`,
    );
  });

  it("omits empty strings outside props but keeps them inside props", () => {
    const s = stableStringify(
      {
        usage: "",
        root: { kind: "layout", props: { content: "" } },
      },
      { omitEmpty: true },
    );
    expect(s).toBe(
      `{
  "root": {
    "kind": "layout",
    "props": {
      "content": ""
    }
  }
}
`,
    );
  });
});
