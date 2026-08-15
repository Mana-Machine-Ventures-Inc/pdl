/**
 * Nested TitleField must see activatesOn=.press and share Rename's shell session.
 * Catalogue type defaults are required: bake instance kwargs omit activatesOn,
 * and the host used to invent `.focus` (keyboard without Title.began).
 */
import { spawnSync } from "node:child_process";
import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { renderBakedDesignToHtmlDocumentWithReport } from "../src/renderHtml.js";

const ENTRY = "test-fixtures/pdl/systems/playlist-composer-lite/design.pdl";

function catalogue() {
  const cat = spawnSync("cargo", ["run", "-q", "-p", "pdl-cli", "--", "catalogue", ENTRY], {
    encoding: "utf8",
  });
  if (cat.status !== 0) throw new Error(cat.stderr || "catalogue failed");
  return JSON.parse(cat.stdout) as {
    components: Record<
      string,
      { interactions?: unknown; emitCaptures?: unknown; defaultParams?: Record<string, unknown> }
    >;
  };
}

function bakeComposer(overrides: string[] = []) {
  const r = spawnSync(
    "cargo",
    ["run", "-q", "-p", "pdl-cli", "--", "bakeComponent", ENTRY, "PlaylistComposer", ...overrides],
    { encoding: "utf8" },
  );
  if (r.status !== 0) throw new Error(r.stderr || "bake failed");
  return JSON.parse(r.stdout);
}

function editableTypeDefaults(cat: ReturnType<typeof catalogue>) {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [name, c] of Object.entries(cat.components || {})) {
    if (c.defaultParams && typeof c.defaultParams === "object") {
      out[name] = { ...c.defaultParams };
    }
  }
  return out;
}

async function mountInteractive(bake: unknown) {
  const cat = catalogue();
  const interactionsByComponent: Record<string, unknown> = {};
  const emitCapturesByComponent: Record<string, unknown> = {};
  for (const [name, c] of Object.entries(cat.components || {})) {
    if (c.interactions) interactionsByComponent[name] = c.interactions;
    if (c.emitCaptures) emitCapturesByComponent[name] = c.emitCaptures;
  }
  const { html } = renderBakedDesignToHtmlDocumentWithReport(bake as never, {
    title: "t",
    singleComponent: "PlaylistComposer",
    interactiveHost: true,
    interactionsByComponent: interactionsByComponent as never,
    emitCapturesByComponent: emitCapturesByComponent as never,
    editableTypeDefaults: editableTypeDefaults(cat),
  });
  const window = new Window({ url: "http://localhost/" });
  const messages: object[] = [];
  window.parent = {
    postMessage(payload: object) {
      messages.push(payload);
    },
  } as never;
  const document = window.document;
  document.write(html);
  document.close();
  document.querySelectorAll("[data-pdl-listening]").forEach((n) => {
    n.removeAttribute("data-pdl-listening");
  });
  for (const s of [...document.querySelectorAll("script")]) {
    window.eval(s.textContent || "");
  }
  await new Promise((r) => setTimeout(r, 20));
  return { window, document, html, messages };
}

describe("PlaylistComposer title field session", () => {
  it("seeds TitleField activatesOn=.press from catalogue defaults (not invented .focus)", async () => {
    const bake = bakeComposer(["editingTitle=false"]);
    const { document, html } = await mountInteractive(bake);
    const input = document.querySelector(
      '[data-pdl-instance-let="Title"]',
    ) as HTMLInputElement | null;
    expect(input).toBeTruthy();
    const session = JSON.parse(input!.getAttribute("data-pdl-session-params") || "{}");
    expect(String(session.activatesOn).replace(/^\./, "")).toBe("press");
    expect(html).toContain("beginFromPress");
    expect(html).toContain("suppressBlurForOpen");
  });

  it("paints TitleField readonly until the press session begins", async () => {
    const bake = bakeComposer(["editingTitle=false"]);
    const { document } = await mountInteractive(bake);
    const title = document.querySelector('[data-pdl-instance-let="Title"]') as HTMLInputElement | null;
    expect(title).toBeTruthy();
    expect(title!.hasAttribute("readonly")).toBe(true);
  });

  it("Rename (Edit.tap) still opens the shell session", async () => {
    const bake = bakeComposer(["editingTitle=false"]);
    const { window, document, messages } = await mountInteractive(bake);
    const edit = document.querySelector('[data-pdl-instance-let="Edit"]');
    expect(edit).toBeTruthy();
    edit!.dispatchEvent(new window.MouseEvent("mousedown", { button: 0, bubbles: true }));
    edit!.dispatchEvent(new window.MouseEvent("mouseup", { button: 0, bubbles: true }));
    await new Promise((r) => setTimeout(r, 40));

    const ix = messages.find(
      (m) =>
        (m as { type?: string }).type === "pdl-interaction" &&
        (m as { previewHandled?: boolean }).previewHandled === false &&
        (m as { params?: { editingTitle?: boolean } }).params?.editingTitle === true,
    );
    expect(ix).toBeTruthy();
  });
});
