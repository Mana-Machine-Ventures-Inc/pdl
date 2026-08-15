/**
 * @vitest-environment happy-dom
 *
 * Instance resolve: bake(child, kwargs) → IR-patch [data-pdl-instance-let].
 * Nested chrome must not require dual-bake siblings.
 */
import { spawnSync } from "node:child_process";
import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { reconcileBakedInstanceIntoElement } from "../src/bakeReconcile.js";
import type { BakedFrame } from "../src/bakeDesign.js";
import {
  renderBakedDesignToHtmlDocumentWithReport,
  renderFrameForReconcile,
} from "../src/renderHtml.js";

function layoutBtn(bg: string, label: string): BakedFrame {
  return {
    id: "Root",
    kind: "layout",
    props: {
      direction: "row",
      background: bg,
      padding: { top: 8, right: 14, bottom: 8, left: 14 },
      cornerRadius: 6,
    },
    children: [
      {
        id: "L",
        kind: "text",
        props: { content: label, fontSize: 13 },
        children: [],
      },
    ],
  };
}

describe("reconcileBakedInstanceIntoElement", () => {
  it("patches paint-only kwargs (background) without dual-bake", () => {
    const idle = layoutBtn("#2563EB", "Edit");
    const hover = layoutBtn("#FFFFFF", "Edit");
    const html = renderFrameForReconcile(idle, {
      stackChild: false,
      stackZ: 0,
      omitInstanceAttrs: true,
    });
    document.body.innerHTML = `<div class="pdl-instance" data-pdl-instance-let="Edit" data-pdl-instance-of="EditorBtn" data-pdl-instance-kwargs='{"state":"idle"}'>${html}</div>`;
    const wrap = document.querySelector("[data-pdl-instance-let=Edit]")!;
    expect(
      reconcileBakedInstanceIntoElement(wrap, idle, hover, {
        sessionParams: { state: "hovering", label: "Edit" },
        prevSessionParams: { state: "idle", label: "Edit" },
      }),
    ).toBe(true);
    // Hex backgrounds paint via `.pdl-layer-band`, not flat `background:` on the shell.
    const afterHtml = wrap.innerHTML;
    expect(afterHtml).toMatch(/#FFFFFF|#fff/i);
    expect(afterHtml).not.toMatch(/#2563EB/i);
    expect(wrap.getAttribute("data-pdl-instance-kwargs")).toContain("hovering");
    expect(wrap.querySelectorAll(":scope > .pdl-inst-state").length).toBe(0);
  });

  it("preserves mount element identity so pointer listeners survive hoverStart", () => {
    const idle = layoutBtn("#2563EB", "Edit");
    const hover = layoutBtn("#FFFFFF", "Edit");
    // Nested EditorBtn without dual-bake: listening attrs live on the paint root.
    document.body.innerHTML = renderFrameForReconcile(idle, {
      stackChild: false,
      stackZ: 0,
      omitInstanceAttrs: true,
    });
    const wrap = document.body.firstElementChild!;
    wrap.setAttribute("data-pdl-instance-let", "Edit");
    wrap.setAttribute("data-pdl-instance-of", "EditorBtn");
    wrap.setAttribute("data-pdl-listening", "1");
    wrap.setAttribute("data-pdl-instance-kwargs", '{"state":"idle"}');

    // First resolve (no prev IR) used to replaceWith — that dropped mouseleave.
    expect(
      reconcileBakedInstanceIntoElement(wrap, null, hover, {
        sessionParams: { state: "hovering" },
      }),
    ).toBe(true);
    expect(document.querySelector("[data-pdl-instance-let=Edit]")).toBe(wrap);
    expect(wrap.getAttribute("data-pdl-listening")).toBe("1");

    expect(
      reconcileBakedInstanceIntoElement(wrap, hover, idle, {
        sessionParams: { state: "idle" },
        prevSessionParams: { state: "hovering" },
      }),
    ).toBe(true);
    expect(document.querySelector("[data-pdl-instance-let=Edit]")).toBe(wrap);
  });

  it("flattens dual-bake siblings then patches the single tree", () => {
    const idle = layoutBtn("#2563EB", "Edit");
    const hover = layoutBtn("#FFFFFF", "Edit");
    const idleHtml = renderFrameForReconcile(idle, {
      stackChild: false,
      stackZ: 0,
      omitInstanceAttrs: true,
    });
    const hoverHtml = renderFrameForReconcile(hover, {
      stackChild: false,
      stackZ: 0,
      omitInstanceAttrs: true,
    });
    document.body.innerHTML = `
      <div class="pdl-instance" data-pdl-instance-let="Edit" data-pdl-instance-of="EditorBtn">
        <div class="pdl-inst-state" data-pdl-state="rest">${idleHtml}</div>
        <div class="pdl-inst-state" data-pdl-state="hovering" hidden>${hoverHtml}</div>
      </div>`;
    const wrap = document.querySelector("[data-pdl-instance-let=Edit]")!;
    expect(wrap.querySelectorAll(":scope > .pdl-inst-state").length).toBe(2);
    expect(
      reconcileBakedInstanceIntoElement(wrap, idle, hover, {
        sessionParams: { state: "hovering" },
      }),
    ).toBe(true);
    expect(wrap.querySelectorAll(":scope > .pdl-inst-state").length).toBe(0);
    expect(wrap.innerHTML).toMatch(/#FFFFFF|#fff/i);
    expect(wrap.innerHTML).not.toMatch(/#2563EB/i);
  });
});

function catalogueLab() {
  const cat = spawnSync(
    "cargo",
    [
      "run",
      "-q",
      "-p",
      "pdl-cli",
      "--",
      "catalogue",
      "test-fixtures/pdl/playground/lab_editable_text.pdl",
    ],
    { encoding: "utf8" },
  );
  if (cat.status !== 0) throw new Error(cat.stderr || "catalogue failed");
  return JSON.parse(cat.stdout) as {
    components: Record<string, { interactions?: unknown; emitCaptures?: unknown }>;
  };
}

function bakeComponent(name: string, overrides: string[] = []) {
  const r = spawnSync(
    "cargo",
    [
      "run",
      "-q",
      "-p",
      "pdl-cli",
      "--",
      "bakeComponent",
      "test-fixtures/pdl/playground/lab_editable_text.pdl",
      name,
      ...overrides,
    ],
    { encoding: "utf8" },
  );
  if (r.status !== 0) throw new Error(r.stderr || "bake failed");
  return JSON.parse(r.stdout);
}

async function mountInteractive(bake: unknown, component: string) {
  const catalogue = catalogueLab();
  const interactionsByComponent: Record<string, unknown> = {};
  const emitCapturesByComponent: Record<string, unknown> = {};
  for (const [name, c] of Object.entries(catalogue.components || {})) {
    if (c.interactions) interactionsByComponent[name] = c.interactions;
    if (c.emitCaptures) emitCapturesByComponent[name] = c.emitCaptures;
  }
  const { html } = renderBakedDesignToHtmlDocumentWithReport(bake as never, {
    title: "t",
    singleComponent: component,
    interactiveHost: true,
    interactionsByComponent: interactionsByComponent as never,
    emitCapturesByComponent: emitCapturesByComponent as never,
    // No dual-bake — instance resolve must own chrome.
  });
  expect(html).toContain("requestInstanceResolve");
  expect(html).not.toContain('class="pdl-inst-state"');

  const window = new Window({ url: "http://localhost/" });
  const document = window.document;
  document.write(html);
  document.close();

  /** @type {object[]} */
  const messages: object[] = [];
  window.parent = {
    postMessage(payload: object) {
      messages.push(payload);
    },
  } as never;

  for (const s of [...document.querySelectorAll("script")]) {
    window.eval(s.textContent || "");
  }
  await new Promise((r) => setTimeout(r, 20));
  return { window, document, html, messages };
}

describe("host posts pdl-resolve-instance", () => {
  it("EditorBtn hover (no dual-bake) requests instance resolve with hovering kwargs", async () => {
    const bake = bakeComponent("NoteEditor", ["editing=false"]);
    const { document, messages } = await mountInteractive(bake, "NoteEditor");
    const edit = document.querySelector('[data-pdl-instance-let="Edit"]')!;
    expect(edit).toBeTruthy();
    expect(edit.querySelector(":scope > .pdl-inst-state")).toBeNull();

    edit.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));

    const resolveMsgs = messages.filter(
      (m) => (m as { type?: string }).type === "pdl-resolve-instance",
    );
    expect(resolveMsgs.length).toBeGreaterThan(0);
    const hover = resolveMsgs.find(
      (m) => (m as { reason?: string }).reason === "hoverStart",
    ) as {
      childComponent: string;
      instanceLet: string;
      childParams: Record<string, unknown>;
    };
    expect(hover).toBeTruthy();
    expect(hover.childComponent).toBe("EditorBtn");
    expect(hover.instanceLet).toBe("Edit");
    expect(String(hover.childParams.state)).toMatch(/hovering/);

    const interactions = messages.filter(
      (m) => (m as { type?: string }).type === "pdl-interaction",
    ) as Array<{ previewHandled?: boolean; event?: string }>;
    const hoverIx = interactions.find((m) => m.event === "hoverStart");
    expect(hoverIx?.previewHandled).toBe(true);
  });

  it("after hoverStart paint adopt, mouseleave still posts hoverEnd", async () => {
    const bake = bakeComponent("NoteEditor", ["editing=false"]);
    const editorBake = bakeComponent("EditorBtn", ["state=hovering", "label=Edit"]);
    const { document, messages } = await mountInteractive(bake, "NoteEditor");
    const edit = document.querySelector('[data-pdl-instance-let="Edit"]')!;

    edit.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));

    // Simulate playground instance-resolve paint (must keep the same node).
    const hoverRoot = editorBake.components.EditorBtn.root as BakedFrame;
    expect(
      reconcileBakedInstanceIntoElement(edit, null, hoverRoot, {
        sessionParams: { state: "hovering", label: "Edit", tone: "primary" },
      }),
    ).toBe(true);
    expect(document.querySelector('[data-pdl-instance-let="Edit"]')).toBe(edit);

    messages.length = 0;
    edit.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));

    const end = messages.find(
      (m) =>
        (m as { type?: string }).type === "pdl-resolve-instance" &&
        (m as { reason?: string }).reason === "hoverEnd",
    ) as { childParams?: { state?: string } } | undefined;
    expect(end).toBeTruthy();
    expect(String(end?.childParams?.state)).toMatch(/idle/);
  });

  it("EditorBtn press also resolve-messages without parent rebake", async () => {
    const bake = bakeComponent("NoteEditor", ["editing=false"]);
    const { document, messages } = await mountInteractive(bake, "NoteEditor");
    const edit = document.querySelector('[data-pdl-instance-let="Edit"]')!;
    edit.dispatchEvent(new MouseEvent("mousedown", { button: 0, bubbles: true }));
    edit.dispatchEvent(new MouseEvent("mouseup", { button: 0, bubbles: true }));
    await new Promise((r) => setTimeout(r, 30));

    const resolveReasons = messages
      .filter((m) => (m as { type?: string }).type === "pdl-resolve-instance")
      .map((m) => (m as { reason?: string }).reason);
    // pressEnd may emit tap → beginEditing on Input; at least one resolve for Edit or Input
    expect(resolveReasons.length).toBeGreaterThan(0);

    const began = messages.find(
      (m) =>
        (m as { type?: string }).type === "pdl-interaction" &&
        ((m as { event?: string }).event === "pressEnd" ||
          (m as { event?: string }).event === "beginEditing"),
    ) as { previewHandled?: boolean; params?: { editing?: boolean } } | undefined;

    // Edit.tap → Input.beginEditing emits began → parent editing=true → rebake.
    const parentNeed =
      began &&
      (began.previewHandled === false || began.params?.editing === true);
    expect(parentNeed || resolveReasons.includes("beginEditing")).toBeTruthy();
  });

  it("NoteEditor Edit rebakes parent shell and resolves Input", async () => {
    const bake = bakeComponent("NoteEditor", ["editing=false"]);
    const { document, messages } = await mountInteractive(bake, "NoteEditor");
    const edit = document.querySelector('[data-pdl-instance-let="Edit"]')!;
    edit.dispatchEvent(new MouseEvent("mousedown", { button: 0, bubbles: true }));
    edit.dispatchEvent(new MouseEvent("mouseup", { button: 0, bubbles: true }));
    await new Promise((r) => setTimeout(r, 40));

    const inputResolve = messages.find(
      (m) =>
        (m as { type?: string }).type === "pdl-resolve-instance" &&
        (m as { childComponent?: string }).childComponent === "NoteField",
    ) as { childParams?: { isEditing?: boolean }; reason?: string } | undefined;
    expect(inputResolve).toBeTruthy();
    expect(inputResolve?.childParams?.isEditing).toBe(true);

    const parentIx = messages.find(
      (m) =>
        (m as { type?: string }).type === "pdl-interaction" &&
        (m as { previewHandled?: boolean }).previewHandled === false &&
        (m as { params?: { editing?: boolean } }).params?.editing === true,
    );
    expect(parentIx).toBeTruthy();
  });

  it("EditorBtn pointer events resolve like mouse press", async () => {
    const bake = bakeComponent("NoteEditor", ["editing=false"]);
    const { window, document, messages } = await mountInteractive(bake, "NoteEditor");
    const edit = document.querySelector('[data-pdl-instance-let="Edit"]')!;
    const PointerEventCtor = window.PointerEvent;
    if (typeof PointerEventCtor !== "function") return;
    edit.dispatchEvent(
      new PointerEventCtor("pointerdown", {
        button: 0,
        pointerId: 1,
        pointerType: "touch",
        bubbles: true,
      }),
    );
    edit.dispatchEvent(
      new PointerEventCtor("pointerup", {
        button: 0,
        pointerId: 1,
        pointerType: "touch",
        bubbles: true,
      }),
    );
    await new Promise((r) => setTimeout(r, 30));
    const resolveReasons = messages
      .filter((m) => (m as { type?: string }).type === "pdl-resolve-instance")
      .map((m) => (m as { reason?: string }).reason);
    expect(resolveReasons.length).toBeGreaterThan(0);
  });
});
