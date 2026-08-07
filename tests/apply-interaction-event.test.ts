import { describe, expect, it } from "vitest";
import {
  applyInteractionEvent,
  mergeInteractionHandlersByEvent,
} from "../src/applyInteractionEvent.js";

const buttonInteractions = [
  {
    name: "default",
    component: "AbnButton",
    handlers: [
      {
        event: "hoverStart",
        body: [
          {
            kind: "assign",
            param: "interactionState",
            value: { kind: "dotEnum", value: ".hovered" },
          },
        ],
      },
      {
        event: "hoverEnd",
        body: [
          {
            kind: "assign",
            param: "interactionState",
            value: { kind: "dotEnum", value: ".rest" },
          },
        ],
      },
      {
        event: "pressStart",
        body: [
          {
            kind: "assign",
            param: "interactionState",
            value: { kind: "dotEnum", value: ".pressed" },
          },
        ],
      },
      {
        event: "pressEnd",
        body: [
          {
            kind: "assign",
            param: "interactionState",
            value: { kind: "dotEnum", value: ".hovered" },
          },
        ],
      },
      {
        event: "pressCancel",
        body: [
          {
            kind: "assign",
            param: "interactionState",
            value: { kind: "dotEnum", value: ".rest" },
          },
        ],
      },
    ],
  },
];

describe("applyInteractionEvent", () => {
  it("runs the classic pointer cycle from catalogue JSON", () => {
    let params = { label: "Reserve", interactionState: "rest" };
    params = applyInteractionEvent(params, buttonInteractions, "hoverStart").params;
    expect(params.interactionState).toBe("hovered");
    params = applyInteractionEvent(params, buttonInteractions, "pressStart").params;
    expect(params.interactionState).toBe("pressed");
    params = applyInteractionEvent(params, buttonInteractions, "pressEnd").params;
    expect(params.interactionState).toBe("hovered");
    params = applyInteractionEvent(params, buttonInteractions, "hoverEnd").params;
    expect(params.interactionState).toBe("rest");
  });

  it("returns handled:false for unknown events", () => {
    const r = applyInteractionEvent(
      { interactionState: "rest" },
      buttonInteractions,
      "appear",
    );
    expect(r.handled).toBe(false);
    expect(r.changed).toBe(false);
    expect(r.params.interactionState).toBe("rest");
  });

  it("last-wins when two decls define the same event", () => {
    const merged = mergeInteractionHandlersByEvent([
      {
        handlers: [
          {
            event: "hoverStart",
            body: [
              {
                kind: "assign",
                param: "interactionState",
                value: { kind: "dotEnum", value: ".hovered" },
              },
            ],
          },
        ],
      },
      {
        handlers: [
          {
            event: "hoverStart",
            body: [
              {
                kind: "assign",
                param: "interactionState",
                value: { kind: "dotEnum", value: ".pressed" },
              },
            ],
          },
        ],
      },
    ]);
    const r = applyInteractionEvent({ interactionState: "rest" }, [
      { handlers: [{ event: "hoverStart", body: merged.hoverStart }] },
    ], "hoverStart");
    expect(r.params.interactionState).toBe("pressed");
  });

  it("collects emit statements", () => {
    const r = applyInteractionEvent(
      { interactionState: "rest" },
      [
        {
          handlers: [
            {
              event: "pressEnd",
              body: [
                { kind: "emit", name: "select", args: ["filter"] },
                {
                  kind: "assign",
                  param: "interactionState",
                  value: { kind: "dotEnum", value: ".hovered" },
                },
              ],
            },
          ],
        },
      ],
      "pressEnd",
    );
    expect(r.emits).toEqual([{ name: "select", args: ["filter"] }]);
    expect(r.params.interactionState).toBe("hovered");
  });
});
