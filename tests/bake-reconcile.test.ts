/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from "vitest";
import {
  bakedComponentTreesEqual,
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

  it("patches layered Blur foreground without remounting children", () => {
    const child = textFrame("Label", "Hi");
    const prev: BakedFrame = {
      id: "LabLayers",
      kind: "layout",
      props: {
        width: 240,
        height: 240,
        background: ["#FFFFFF"],
        foreground: { kind: "blur", radius: 12 },
        direction: "vertical",
      },
      children: [child],
    };
    const next: BakedFrame = {
      ...prev,
      props: {
        ...prev.props,
        foreground: { kind: "blur", radius: 48 },
      },
    };
    const html = renderFrameForReconcile(prev, { stackChild: false, stackZ: 0 });
    document.body.innerHTML = html;
    const el = document.body.firstElementChild!;
    const labelBefore = el.querySelector('[data-pdl-id="Label"]')!;
    expect(el.querySelectorAll(":scope > .pdl-layer-band").length).toBeGreaterThan(0);
    expect(patchFrameProps(el, prev, next)).toBe("patched");
    expect(el.querySelector('[data-pdl-id="Label"]')).toBe(labelBefore);
    const over = Array.from(el.querySelectorAll(":scope > .pdl-layer-band")).pop()!;
    expect(over.innerHTML).toContain("blur(48px)");
  });

  it("keeps the solid fill node and defers color when data-pdl-transition is armed", async () => {
    const prev: BakedFrame = {
      id: "Chip",
      kind: "layout",
      props: { background: "#2563EB", width: 80, height: 32 },
      children: [],
    };
    const next: BakedFrame = {
      ...prev,
      props: { ...prev.props, background: "#1D4ED8" },
    };
    document.body.innerHTML = renderFrameForReconcile(prev, { stackChild: false, stackZ: 0 });
    const el = document.body.firstElementChild!;
    el.setAttribute("data-pdl-transition", "background-color 200ms ease-out");
    const band = el.querySelector(":scope > .pdl-layer-band")!;
    const solid = band.querySelector(":scope > div")!;
    expect(patchFrameProps(el, prev, next)).toBe("patched");
    expect(el.querySelector(":scope > .pdl-layer-band")).toBe(band);
    expect(solid.getAttribute("style") ?? "").toContain("#2563EB");
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    expect(solid.getAttribute("style") ?? "").toContain("#1D4ED8");
  });

  it("keeps a gesture-promoted press-hit <input> when the bake flips to editing", () => {
    const defaults = {
      SearchField: { isEditing: false, value: "", activatesOn: "press" },
    };
    const prev: BakedFrame = {
      id: "Search",
      kind: "text",
      props: { content: "Search tracks…", editable: "value", background: "#eee" },
      children: [],
      instanceOf: "SearchField",
      instanceKwargs: { isEditing: false, value: "", activatesOn: "press" },
    };
    const next: BakedFrame = {
      ...prev,
      props: { ...prev.props, background: "#000", content: "" },
      instanceKwargs: { isEditing: true, value: "", activatesOn: "press" },
    };
    const html = renderFrameForReconcile(
      prev,
      { stackChild: false, stackZ: 0 },
      { nextKey: 0, stateTrees: {}, editableSessionDefaults: defaults },
    );
    document.body.innerHTML = html;
    const span = document.body.firstElementChild!;
    expect(span.hasAttribute("data-pdl-press-activate")).toBe(true);
    const input = document.createElement("input");
    input.type = "text";
    input.className = "pdl-frame pdl-text pdl-text--editable";
    for (const a of Array.from(span.attributes)) {
      if (a.name === "data-pdl-press-activate" || a.name === "role" || a.name === "tabindex") {
        continue;
      }
      input.setAttribute(a.name, a.value);
    }
    span.replaceWith(input);
    expect(
      patchFrameProps(
        input,
        prev,
        next,
        { stackChild: false, stackZ: 0 },
        { editableSessionDefaults: { SearchField: { ...defaults.SearchField, isEditing: true } } },
        { editableSessionDefaults: defaults },
      ),
    ).toBe("patched");
    expect(input.isConnected).toBe(true);
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

  it("skips DOM work when bake IR is equal", () => {
    const root = layoutRoot("Root", [textFrame("Status", "Idle")]);
    const canvas = mountCanvas(root);
    const before = canvas.innerHTML;
    const status = canvas.querySelector('[data-pdl-id="Status"]')!;
    const comp: BakedComponentJson = {
      name: "NoteEditor",
      rootKind: "layout",
      bakedParams: { editing: false },
      root,
    };
    expect(bakedComponentTreesEqual(comp, { ...comp, root: structuredClone(root) })).toBe(true);
    expect(reconcileBakedComponentIntoCanvas(canvas, comp, structuredClone(comp), {})).toBe(true);
    expect(canvas.querySelector('[data-pdl-id="Status"]')).toBe(status);
    expect(canvas.innerHTML).toBe(before);
  });

  it("leaves sibling canvas nodes alone when only one child list entry changes", () => {
    const prevRoot = layoutRoot("Root", [
      textFrame("A", "one"),
      textFrame("B", "two"),
    ]);
    const nextRoot = layoutRoot("Root", [
      textFrame("A", "one"),
      textFrame("B", "changed"),
    ]);
    const canvas = mountCanvas(prevRoot);
    const aBefore = canvas.querySelector('[data-pdl-id="A"]')!;
    const bBefore = canvas.querySelector('[data-pdl-id="B"]')!;
    expect(
      reconcileBakedComponentIntoCanvas(
        canvas,
        { name: "X", rootKind: "layout", root: prevRoot },
        { name: "X", rootKind: "layout", root: nextRoot },
        {},
      ),
    ).toBe(true);
    expect(canvas.querySelector('[data-pdl-id="A"]')).toBe(aBefore);
    expect(canvas.querySelector('[data-pdl-id="B"]')).toBe(bBefore);
    expect(bBefore.textContent?.trim()).toBe("changed");
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

  it("ends Input session on Done bake (does not keep prev isEditing:true)", () => {
    const editableDefaults = {
      NoteField: { isEditing: false, value: "", activatesOn: "focus" },
    };
    const prevInput: BakedFrame = {
      id: "Input",
      kind: "text",
      props: { content: "Title", editable: "value" },
      children: [],
      instanceOf: "NoteField",
      instanceKwargs: { isEditing: true, value: "hello" },
    };
    const nextInput: BakedFrame = {
      ...prevInput,
      instanceKwargs: { isEditing: false, value: "hello saved" },
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
    const inputEl = canvas.querySelector('[data-pdl-instance-let="Input"]')!;
    inputEl.setAttribute(
      "data-pdl-session-params",
      JSON.stringify({
        isEditing: true,
        value: "hello typed",
        _editCheckpoint: "hello",
      }),
    );

    expect(
      reconcileBakedComponentIntoCanvas(
        canvas,
        { name: "NoteEditor", rootKind: "layout", root: prevRoot },
        { name: "NoteEditor", rootKind: "layout", root: nextRoot },
        { instCtx: { editableSessionDefaults: editableDefaults } },
      ),
    ).toBe(true);

    const session = JSON.parse(
      canvas.querySelector('[data-pdl-instance-let="Input"]')!.getAttribute("data-pdl-session-params") ||
        "{}",
    );
    expect(session.isEditing).toBe(false);
    expect(session.value).toBe("hello saved");
  });

  it("remounts Input when NoteField activatesOn flips none↔press (equal IR)", () => {
    const inputFrame: BakedFrame = {
      id: "Input",
      kind: "text",
      props: { content: "Title", editable: "value" },
      children: [],
      instanceOf: "NoteField",
      // Bake omits activatesOn from kwargs — it lives on the type default.
      instanceKwargs: { isEditing: false, value: "hello" },
    };
    const root = layoutRoot("Root", [inputFrame]);
    const prevDefaults = {
      NoteField: { isEditing: false, value: "", activatesOn: "none" },
    };
    const nextDefaults = {
      NoteField: { isEditing: false, value: "", activatesOn: "press" },
    };
    const html = renderFrameForReconcile(
      root,
      { stackChild: false, stackZ: 0 },
      { nextKey: 0, stateTrees: {}, editableSessionDefaults: prevDefaults },
    );
    document.body.innerHTML = `<div class="pdl-canvas">${html}</div>`;
    const canvas = document.querySelector(".pdl-canvas")!;
    // .none + !editing → inert text, not <input>
    expect(canvas.querySelector("input.pdl-text--editable")).toBeFalsy();
    expect(canvas.querySelector('[data-pdl-instance-let="Input"]')).toBeTruthy();

    const comp: BakedComponentJson = {
      name: "NoteEditor",
      rootKind: "layout",
      root,
    };
    expect(
      reconcileBakedComponentIntoCanvas(canvas, comp, structuredClone(comp), {
        instCtx: { editableSessionDefaults: nextDefaults },
        prevInstCtx: { editableSessionDefaults: prevDefaults },
      }),
    ).toBe(true);

    expect(canvas.querySelector("input.pdl-text--editable")).toBeFalsy();
    expect(canvas.querySelector("[data-pdl-press-activate]")).toBeTruthy();
  });
});

describe("presenter cover overlay", () => {
  function page(id: string, name: string): BakedFrame {
    return {
      id,
      kind: "layout",
      instanceOf: name,
      props: { direction: "vertical", width: "fill", height: "fill" },
      children: [],
    };
  }

  function presenter(children: BakedFrame[], cover?: string): BakedFrame {
    return {
      id: "hole",
      kind: "presenter",
      props: {
        width: "fill",
        height: "fill",
        ...(cover ? { cover } : {}),
      },
      children,
    };
  }

  it("wraps the cover on incremental apply so it overlays the stack top", () => {
    const episode = page("episode", "Episode");
    const settings = page("settings", "Settings");
    const prevRoot = presenter([episode]);
    const nextRoot = presenter([episode, settings], "Settings");
    const prevComp: BakedComponentJson = { name: "Phone", rootKind: "presenter", root: prevRoot };
    const nextComp: BakedComponentJson = { name: "Phone", rootKind: "presenter", root: nextRoot };

    const canvas = mountCanvas(prevRoot);
    const hole = canvas.querySelector(".pdl-presenter")!;
    expect(hole.querySelector(".pdl-presenter__cover")).toBeFalsy();
    expect(hole.querySelector('[data-pdl-instance-of="Episode"]')).toBeTruthy();

    expect(reconcileBakedComponentIntoCanvas(canvas, prevComp, nextComp, {})).toBe(true);

    const cover = hole.querySelector(":scope > .pdl-presenter__cover");
    expect(cover).toBeTruthy();
    expect(cover!.querySelector('[data-pdl-instance-of="Settings"]')).toBeTruthy();
    expect(hole.querySelector(':scope > [data-pdl-instance-of="Episode"]')).toBeTruthy();
    expect(hole.querySelector(':scope > [data-pdl-instance-of="Settings"]')).toBeFalsy();
    expect(hole.getAttribute("style") ?? "").toContain("display:grid");
  });

  it("keeps a pair-clip outgoing snapshot when the stack child is patched", () => {
    const home = page("home", "Home");
    const episode = page("episode", "Episode");
    const prevRoot = presenter([home]);
    const nextRoot = presenter([episode]);
    const prevComp: BakedComponentJson = { name: "Phone", rootKind: "presenter", root: prevRoot };
    const nextComp: BakedComponentJson = { name: "Phone", rootKind: "presenter", root: nextRoot };

    const canvas = mountCanvas(prevRoot);
    const hole = canvas.querySelector(".pdl-presenter")!;
    const live = hole.firstElementChild!;
    const clip = live.cloneNode(true) as HTMLElement;
    clip.setAttribute("data-pdl-presenter-clip", "outgoing");
    hole.append(clip);

    expect(reconcileBakedComponentIntoCanvas(canvas, prevComp, nextComp, {})).toBe(true);
    expect(hole.querySelector('[data-pdl-presenter-clip="outgoing"]')).toBe(clip);
    expect(hole.querySelector('[data-pdl-instance-of="Episode"]')).toBeTruthy();
  });
});
