/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from "vitest";
import {
  frameReconcileKey,
  reconcileBakedComponentIntoCanvas,
} from "../src/bakeReconcile.js";
import type { BakedComponentJson, BakedFrame } from "../src/bakeDesign.js";
import { patchFrameProps, renderFrameForReconcile } from "../src/renderHtml.js";

function textFrame(id: string, content: string, extra?: Partial<BakedFrame>): BakedFrame {
  return {
    id,
    kind: "text",
    props: { content },
    children: [],
    ...extra,
  };
}

function layoutRoot(id: string, children: BakedFrame[]): BakedFrame {
  return {
    id,
    kind: "layout",
    props: { direction: "vertical", gap: 8 },
    children,
  };
}

function mountCanvas(root: BakedFrame): HTMLElement {
  const html = renderFrameForReconcile(root, { stackChild: false, stackZ: 0 });
  document.body.innerHTML = `<div class="pdl-canvas">${html}</div>`;
  return document.querySelector(".pdl-canvas") as HTMLElement;
}

describe("bakeReconcile keys", () => {
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

describe("patchFrameProps", () => {
  it("patches text content in place", () => {
    const prev = textFrame("Status", "Idle");
    const next = textFrame("Status", "Saved");
    const html = renderFrameForReconcile(prev, { stackChild: false, stackZ: 0 });
    document.body.innerHTML = html;
    const el = document.body.firstElementChild!;
    expect(patchFrameProps(el, prev, next)).toBe("patched");
    expect(el.textContent?.trim()).toBe("Saved");
  });

  it("remounts when kind changes", () => {
    const prev = textFrame("X", "hi");
    const next: BakedFrame = {
      id: "X",
      kind: "layout",
      props: { direction: "vertical" },
      children: [],
    };
    const html = renderFrameForReconcile(prev, { stackChild: false, stackZ: 0 });
    document.body.innerHTML = html;
    const el = document.body.firstElementChild!;
    expect(patchFrameProps(el, prev, next)).toBe("needsRemount");
  });
});

describe("reconcileBakedComponentIntoCanvas NoteEditor-shaped", () => {
  it("swaps Edit for Cancel/Done while preserving Status identity", () => {
    const prevRoot = layoutRoot("Root", [
      textFrame("Edit", "Edit", { instanceOf: "Button", instanceKwargs: {} }),
      textFrame("Status", "Idle"),
    ]);
    const nextRoot = layoutRoot("Root", [
      textFrame("Cancel", "Cancel", { instanceOf: "Button", instanceKwargs: {} }),
      textFrame("Done", "Done", { instanceOf: "Button", instanceKwargs: {} }),
      textFrame("Status", "Editing"),
    ]);
    const canvas = mountCanvas(prevRoot);
    const statusBefore = canvas.querySelector('[data-pdl-instance-let="Status"], [data-pdl-id="Status"]');
    // Status is not an instance — keyed by id
    const statusEl = canvas.querySelector('[data-pdl-id="Status"]')!;
    expect(statusEl).toBeTruthy();

    const prevComp: BakedComponentJson = {
      name: "NoteEditor",
      rootKind: "layout",
      bakedParams: { editing: false },
      root: prevRoot,
    };
    const nextComp: BakedComponentJson = {
      name: "NoteEditor",
      rootKind: "layout",
      bakedParams: { editing: true },
      root: nextRoot,
    };

    expect(reconcileBakedComponentIntoCanvas(canvas, prevComp, nextComp, {})).toBe(true);
    expect(canvas.querySelector('[data-pdl-instance-let="Edit"]')).toBeFalsy();
    expect(canvas.querySelector('[data-pdl-instance-let="Cancel"]')).toBeTruthy();
    expect(canvas.querySelector('[data-pdl-instance-let="Done"]')).toBeTruthy();
    const statusAfter = canvas.querySelector('[data-pdl-id="Status"]')!;
    expect(statusAfter).toBe(statusEl);
    expect(statusAfter.textContent?.trim()).toBe("Editing");
    expect(statusBefore).toBeTruthy();
  });

  it("keeps Input instance-let when isEditing kwargs change (patch, not remount)", () => {
    const editableDefaults = {
      NoteField: { isEditing: false, value: "", activatesOn: "focus" },
    };
    const prevInput: BakedFrame = {
      id: "Input",
      kind: "text",
      props: { content: "Title", editable: "value" },
      children: [],
      instanceOf: "NoteField",
      instanceKwargs: { isEditing: false, value: "hello" },
    };
    const nextInput: BakedFrame = {
      ...prevInput,
      instanceKwargs: { isEditing: true, value: "hello" },
    };
    const prevRoot = layoutRoot("Root", [prevInput]);
    const nextRoot = layoutRoot("Root", [nextInput]);

    const html = renderFrameForReconcile(
      prevRoot,
      { stackChild: false, stackZ: 0 },
      {
        nextKey: 0,
        stateTrees: {},
        editableSessionDefaults: editableDefaults,
      },
    );
    document.body.innerHTML = `<div class="pdl-canvas">${html}</div>`;
    const canvas = document.querySelector(".pdl-canvas")!;
    const inputBefore = canvas.querySelector('[data-pdl-instance-let="Input"]')!;
    expect(inputBefore).toBeTruthy();

    const prevComp: BakedComponentJson = {
      name: "NoteEditor",
      rootKind: "layout",
      root: prevRoot,
    };
    const nextComp: BakedComponentJson = {
      name: "NoteEditor",
      rootKind: "layout",
      root: nextRoot,
    };

    expect(
      reconcileBakedComponentIntoCanvas(canvas, prevComp, nextComp, {
        instCtx: { editableSessionDefaults: editableDefaults },
      }),
    ).toBe(true);

    const inputAfter = canvas.querySelector('[data-pdl-instance-let="Input"]')!;
    expect(inputAfter).toBe(inputBefore);
    const kwargs = JSON.parse(inputAfter.getAttribute("data-pdl-instance-kwargs") || "{}");
    expect(kwargs.isEditing).toBe(true);
  });
});
