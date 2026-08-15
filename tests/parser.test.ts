import { describe, expect, it } from "vitest";
import { PdlError } from "../src/errors.js";
import { parseModule } from "../src/parser.js";

describe("parser", () => {
  it("parses semantic token type keywords", () => {
    const m = parseModule(`semantic color.x: Color = #112233`, "x.pdl");
    expect(m.declarations[0]).toMatchObject({
      kind: "semantic",
      name: "color.x",
      tokenType: "Color",
    });
  });

  it("rejects mixed && and || without parens", () => {
    try {
      parseModule(
        `variant V { case a case b }
         component C(p: V = .a) layout {
           if p == .a && p == .b || p == .a { direction = .row }
         }`,
        "x.pdl",
      );
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(PdlError);
      expect((e as PdlError).code).toBe("PDL-E038");
    }
  });

  it("parses Sizing.hug as a sizing literal", () => {
    const m = parseModule(`primitive s: Sizing = Sizing.hug`, "x.pdl");
    expect(m.declarations[0]).toMatchObject({
      kind: "primitive",
      name: "s",
      tokenType: "Sizing",
      value: { kind: "sizing", mode: "hug" },
    });
  });

  it("parses bare .hug / .fill as dotEnum (shared with ContentMode.fill)", () => {
    const m = parseModule(
      `component C() media {
         width = .fill
         height = .hug
         contentMode = .fill
         source = "photo.jpg"
         children = []
       }`,
      "x.pdl",
    );
    const body = (
      m.declarations[0] as {
        body: { kind: string; name?: string; value?: unknown }[];
      }
    ).body;
    const prop = (name: string) => body.find((b) => b.kind === "prop" && b.name === name)?.value;
    expect(prop("width")).toEqual({ kind: "dotEnum", value: ".fill" });
    expect(prop("height")).toEqual({ kind: "dotEnum", value: ".hug" });
    expect(prop("contentMode")).toEqual({ kind: "dotEnum", value: ".fill" });
  });

  it("parses Spacer() in children and rejects legacy .spacer", () => {
    const m = parseModule(
      `component C() layout {
         let A = Text(content: "a")
         let B = Text(content: "b")
         children = [A, Spacer(), B]
       }`,
      "x.pdl",
    );
    const body = (
      m.declarations[0] as {
        body: { kind: string; entries?: { kind: string }[] }[];
      }
    ).body;
    const kids = body.find((b) => b.kind === "children");
    expect(kids?.entries).toEqual([
      { kind: "frameRef", id: "A" },
      { kind: "spacer" },
      { kind: "frameRef", id: "B" },
    ]);
    try {
      parseModule(`component C() layout { children = [.spacer] }`, "x.pdl");
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(PdlError);
      expect((e as PdlError).message).toMatch(/Spacer\(\)/);
    }
  });

  it("parses direction = .reverseStack", () => {
    const m = parseModule(
      `component C() layout {
         direction = .reverseStack
         children = []
       }`,
      "x.pdl",
    );
    const comp = m.declarations[0] as {
      body: { kind: string; name?: string; value?: { kind: string; value?: string } }[];
    };
    const dir = comp.body.find((b) => b.kind === "prop" && b.name === "direction");
    expect(dir?.value).toEqual({ kind: "dotEnum", value: ".reverseStack" });
  });

  it("parses TypeName.case as the same dot-enum as .case", () => {
    const m = parseModule(
      `component C() layout {
         direction = Direction.row
         justify = Justify.center
         wrap = Wrap.wrap
         overflow = Overflow.clip
         children = []
       }`,
      "x.pdl",
    );
    const comp = m.declarations[0] as {
      kind: string;
      body: { kind: string; name?: string; value?: { kind: string; value?: string } }[];
    };
    expect(comp.kind).toBe("component");
    const byName = Object.fromEntries(
      comp.body
        .filter((b) => b.kind === "prop")
        .map((b) => [b.name, b.value]),
    );
    expect(byName.direction).toEqual({ kind: "dotEnum", value: ".row" });
    expect(byName.justify).toEqual({ kind: "dotEnum", value: ".center" });
    expect(byName.wrap).toEqual({ kind: "dotEnum", value: ".wrap" });
    expect(byName.overflow).toEqual({ kind: "dotEnum", value: ".clip" });
  });

  it("rejects bare .fixed with a Distance-number hint", () => {
    expect(() => parseModule(`primitive s: Sizing = .fixed`, "x.pdl")).toThrow(
      /Distance number|\.fixed\(48\)/,
    );
  });

  it("parses W:H ratio sugar", () => {
    const m = parseModule(`primitive r: Ratio = 16:9`, "x.pdl");
    expect(m.declarations[0]).toMatchObject({
      kind: "primitive",
      name: "r",
      tokenType: "Ratio",
      value: { kind: "ratio", width: 16, height: 9 },
    });
  });

  it("parses Motion/Pose/Stagger on host handlers", () => {
    const m = parseModule(
      `component Modal <PointerInput>() layout {
         self.appear = {
           animate = Motion(
             transition: (duration: 250, easing: "ease-out"),
             pose: Pose(opacity: 0, scale: 0.95, translateY: 8),
             stagger: Stagger(step: 30, from: .last)
           )
         }
         self.dismiss = {
           animate = Motion(
             transition: (duration: 180, easing: "ease-in"),
             pose: Pose(opacity: 0, blur: 4)
           )
         }
       }`,
      "motion.pdl",
    );
    const ix = m.declarations.find((d) => d.kind === "interaction") as {
      kind: "interaction";
      handlers: Array<{ event: string; body: Array<Record<string, unknown>> }>;
    };
    const appear = ix.handlers.find((h) => h.event === "appear")!;
    expect(appear.body).toEqual([
      {
        kind: "animate",
        value: {
          kind: "motion",
          transition: {
            kind: "transition",
            duration: { kind: "number", value: 250 },
            easing: { kind: "string", value: "ease-out" },
          },
          pose: {
            kind: "pose",
            props: {
              opacity: { kind: "number", value: 0 },
              scale: { kind: "number", value: 0.95 },
              translateY: { kind: "number", value: 8 },
            },
          },
          stagger: {
            kind: "stagger",
            step: { kind: "number", value: 30 },
            from: { kind: "dotEnum", value: ".last" },
          },
        },
      },
    ]);
  });

  it("rejects removed from { } handler snapshots", () => {
    expect(() =>
      parseModule(
        `component Modal <PointerInput>() layout {
           self.appear = { from { opacity = 0 } }
         }`,
        "motion.pdl",
      ),
    ).toThrow(/from \{ \}.*removed/);
  });

  it("rejects empty Pose and Motion without transition", () => {
    expect(() =>
      parseModule(`primitive p: Pose = Pose()`, "x.pdl"),
    ).toThrow(/at least one overlay field/);
    expect(() =>
      parseModule(`primitive m: Motion = Motion(pose: Pose(opacity: 0))`, "x.pdl"),
    ).toThrow(/requires `transition:`/);
  });

  it("parses Shadow(…) constructor on tokens", () => {
    const m = parseModule(
      `primitive s: Shadow = Shadow(x: 0, y: 4, blurRadius: 12, color: #000000 @ 0.15)`,
      "x.pdl",
    );
    expect(m.declarations[0]).toMatchObject({
      kind: "primitive",
      name: "s",
      tokenType: "Shadow",
      value: {
        kind: "shadow",
        x: { kind: "number", value: 0 },
        y: { kind: "number", value: 4 },
        blurRadius: { kind: "number", value: 12 },
        color: {
          kind: "opacityOf",
          base: { kind: "hex", value: "#000000" },
          opacity: { kind: "number", value: 0.15 },
        },
      },
    });
  });
});
