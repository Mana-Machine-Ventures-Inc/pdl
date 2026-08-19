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

  it("parses Animation/Pose/Stagger on host handlers", () => {
    const m = parseModule(
      `component Modal <PointerInput>() layout {
         self.appear = {
           animate = Animation(
             start: Pose(opacity: 0, scale: 0.95, translateY: 8),
             keys: [Motion(duration: 250, ease: .out, pose: .rest)],
             stagger: Stagger(step: 30, from: .last)
           )
         }
         self.dismiss = {
           animate = Animation(
             keys: [Motion(duration: 180, ease: .in, pose: Pose(opacity: 0, blur: 4))]
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
          kind: "animation",
          start: {
            kind: "pose",
            props: {
              opacity: { kind: "number", value: 0 },
              scale: { kind: "number", value: 0.95 },
              translateY: { kind: "number", value: 8 },
            },
          },
          keys: {
            kind: "array",
            items: [
              {
                kind: "motion",
                timing: {
                  kind: "timing",
                  duration: { kind: "number", value: 250 },
                  ease: { kind: "dotEnum", value: ".out" },
                },
                pose: { kind: "dotEnum", value: ".rest" },
              },
            ],
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

  it("parses frame animate on a child and on self", () => {
    const m = parseModule(
      `semantic motion.spin: Animation = Animation(
         keys: [Motion(duration: 800, ease: .linear, pose: Pose(rotate: 360))],
         repeat: .forever
       )
       component Spin(isLoading: Bool = true) layout {
         let icon = Text(content: "↻")
         children = [icon]
         if isLoading {
           icon.animate = motion.spin
           self.animate = motion.spin
         }
       }`,
      "frame-animate.pdl",
    );
    const comp = m.declarations.find((d) => d.kind === "component") as {
      kind: "component";
      body: Array<Record<string, unknown>>;
    };
    const iff = comp.body.find((it) => it.kind === "if") as {
      kind: "if";
      chain: { branches: Array<{ body: Array<Record<string, unknown>> }> };
    };
    expect(iff.chain.branches[0]!.body).toEqual([
      {
        kind: "frameProp",
        frame: "icon",
        name: "animate",
        value: { kind: "ident", name: "motion.spin" },
      },
      {
        kind: "frameProp",
        frame: "self",
        name: "animate",
        value: { kind: "ident", name: "motion.spin" },
      },
    ]);
  });

  it("parses bare frame animate on the component root", () => {
    const m = parseModule(
      `semantic motion.spin: Animation = Animation(
         keys: [Motion(duration: 800, ease: .linear, pose: Pose(rotate: 360))],
         repeat: .forever
       )
       component Spin() layout {
         children = []
         animate = motion.spin
       }`,
      "bare-frame-animate.pdl",
    );
    const comp = m.declarations.find((d) => d.kind === "component") as {
      kind: "component";
      body: Array<Record<string, unknown>>;
    };
    expect(comp.body).toContainEqual({
      kind: "prop",
      name: "animate",
      value: { kind: "ident", name: "motion.spin" },
    });
  });

  it("parses Animation(token, keys:) copy + override", () => {
    const m = parseModule(
      `semantic motion.hoverPop: Animation = Animation(
         keys: [Motion(duration: 280, ease: .out, pose: Pose(scale: 1.12))]
       )
       component Chip <PointerInput>() layout {
         children = []
         self.hoverEnd = {
           animate = Animation(
             motion.hoverPop,
             keys: [Motion(duration: 280, ease: .out, pose: .rest)]
           )
         }
       }`,
      "motion-override.pdl",
    );
    const ix = m.declarations.find((d) => d.kind === "interaction") as {
      kind: "interaction";
      handlers: Array<{ event: string; body: Array<Record<string, unknown>> }>;
    };
    const end = ix.handlers.find((h) => h.event === "hoverEnd")!;
    expect(end.body).toEqual([
      {
        kind: "animate",
        value: {
          kind: "animation",
          base: { kind: "ident", name: "motion.hoverPop" },
          keys: {
            kind: "array",
            items: [
              {
                kind: "motion",
                timing: {
                  kind: "timing",
                  duration: { kind: "number", value: 280 },
                  ease: { kind: "dotEnum", value: ".out" },
                },
                pose: { kind: "dotEnum", value: ".rest" },
              },
            ],
          },
        },
      },
    ]);
  });

  it("parses Effect and blur sugar on a frame", () => {
    const m = parseModule(
      `primitive effect.frost: Effect = Effect(.blurBehind, radius: 20)
       component Card() layout {
         let photo = Layout(width: .fill, height: 80)
         photo.blur = 8
         children = [photo]
         effect = effect.frost
       }`,
      "effect.pdl",
    );
    const prim = m.declarations.find((d) => d.kind === "primitive") as {
      kind: "primitive";
      tokenType: string;
      value: Record<string, unknown>;
    };
    expect(prim.tokenType).toBe("Effect");
    expect(prim.value).toMatchObject({
      kind: "effect",
      effectKind: { kind: "dotEnum", value: ".blurBehind" },
      radius: { kind: "number", value: 20 },
    });
    const comp = m.declarations.find((d) => d.kind === "component") as {
      kind: "component";
      body: Array<Record<string, unknown>>;
    };
    expect(comp.body).toContainEqual({
      kind: "prop",
      name: "effect",
      value: { kind: "ident", name: "effect.frost" },
    });
    expect(comp.body).toContainEqual({
      kind: "frameProp",
      frame: "photo",
      name: "blur",
      value: { kind: "number", value: 8 },
    });
  });

  it("rejects Effect as a child and Effect without radius", () => {
    expect(() =>
      parseModule(
        `component C() layout { children = [Effect(.blurSelf, radius: 8)] }`,
        "x.pdl",
      ),
    ).toThrow(/not a child/);
    expect(() =>
      parseModule(`primitive e: Effect = Effect(.blurSelf)`, "x.pdl"),
    ).toThrow(/requires `radius:`/);
  });

  it("rejects empty Pose and Motion without timing", () => {
    expect(() =>
      parseModule(`primitive p: Pose = Pose()`, "x.pdl"),
    ).toThrow(/at least one overlay field/);
    expect(() =>
      parseModule(`primitive m: Motion = Motion(pose: Pose(opacity: 0))`, "x.pdl"),
    ).toThrow(/requires `duration:` \/ `ease:`|requires `timing:`/);
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
