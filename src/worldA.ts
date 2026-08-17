/**
 * World A expression-tree authoring — desugar to classic declare-and-mount AST.
 * See docs/PROPOSAL_WORLD_A_EXPRESSION_TREES.md.
 */

import type { ChildEntry, FrameBodyItem, ValueExpr } from "./ast.js";

export const FRAME_CTOR_NAMES = new Set(["Text", "Layout", "Icon", "Media", "Presenter"]);
export type FrameCtorName = "Text" | "Layout" | "Icon" | "Media" | "Presenter";

export const FRAME_CTOR_TO_KIND: Record<
  FrameCtorName,
  "layout" | "text" | "icon" | "media" | "presenter"
> = {
  Text: "text",
  Layout: "layout",
  Icon: "icon",
  Media: "media",
  Presenter: "presenter",
};

export function isFrameCtorName(name: string): name is FrameCtorName {
  return FRAME_CTOR_NAMES.has(name as FrameCtorName);
}

/** Reserved component names — collide with World A frame ctors. */
export const RESERVED_FRAME_CTOR_COMPONENT_NAMES = FRAME_CTOR_NAMES;

/** Build a classic frame-let body from World A ctor kwargs (`children:` handled separately). */
export function frameCtorKwargsToBody(
  args: Record<string, ValueExpr>,
  childEntries?: ChildEntry[],
): FrameBodyItem[] {
  const body: FrameBodyItem[] = [];
  for (const [name, value] of Object.entries(args)) {
    if (name === "children") continue;
    body.push({ kind: "prop", name, value });
  }
  if (childEntries && childEntries.length > 0) {
    body.push({ kind: "children", target: "root", entries: childEntries });
  }
  return body;
}

/**
 * Lower World A `frameCtor` child entries into synthetic `let` + `frameRef` mounts.
 * Nested ctors hoist before their parent so E019 order stays valid.
 */
export function lowerWorldABody(body: FrameBodyItem[]): FrameBodyItem[] {
  let auto = 0;
  const nextId = (kind: string) => `__auto_${kind}_${auto++}`;

  function lowerEntries(entries: ChildEntry[], hoist: FrameBodyItem[]): ChildEntry[] {
    return entries.map((entry) => {
      if (entry.kind !== "frameCtor") return entry;
      const nestedChildren = entry.childEntries
        ? lowerEntries(entry.childEntries, hoist)
        : undefined;
      const id = nextId(entry.frameKind);
      const letBody = frameCtorKwargsToBody(entry.props, nestedChildren);
      hoist.push({
        kind: "let",
        id,
        frameKind: entry.frameKind,
        body: lowerItems(letBody),
      });
      return {
        kind: "frameRef" as const,
        id,
        ...(entry.opacity ? { opacity: entry.opacity } : {}),
      };
    });
  }

  function lowerItems(items: FrameBodyItem[]): FrameBodyItem[] {
    const out: FrameBodyItem[] = [];
    for (const item of items) {
      if (item.kind === "children") {
        const hoist: FrameBodyItem[] = [];
        const entries = lowerEntries(item.entries, hoist);
        out.push(...hoist);
        out.push({ ...item, entries });
        continue;
      }
      if (item.kind === "let") {
        out.push({ ...item, body: lowerItems(item.body) });
        continue;
      }
      if (item.kind === "if") {
        out.push({
          kind: "if",
          chain: {
            branches: item.chain.branches.map((b) => ({
              ...b,
              body: lowerItems(b.body),
            })),
            ...(item.chain.elseBody
              ? { elseBody: lowerItems(item.chain.elseBody) }
              : {}),
          },
        });
        continue;
      }
      out.push(item);
    }
    return out;
  }

  return lowerItems(body);
}
