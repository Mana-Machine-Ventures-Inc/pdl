/**
 * NoteEditor Done/Cancel must commit/discard the live typed value.
 * Regression: when Input is a bare <input> (no wrapper), querySelector missed self
 * and finishEditing emitted the stale kwargs draft.
 */
import { spawnSync } from "node:child_process";
import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { renderBakedDesignToHtmlDocumentWithReport } from "../src/renderHtml.js";

function catalogueLab() {
  const cat = spawnSync(
    "cargo",
    ["run", "-q", "-p", "pdl-cli", "--", "catalogue", "test-fixtures/pdl/playground/lab_editable_text.pdl"],
    { encoding: "utf8" },
  );
  if (cat.status !== 0) throw new Error(cat.stderr || "catalogue failed");
  return JSON.parse(cat.stdout) as {
    components: Record<
      string,
      { interactions?: unknown; emitCaptures?: unknown }
    >;
  };
}

function bakeNoteEditor(overrides: string[]) {
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
      "NoteEditor",
      ...overrides,
    ],
    { encoding: "utf8" },
  );
  if (r.status !== 0) throw new Error(r.stderr || "bake failed");
  return JSON.parse(r.stdout);
}

async function mountInteractive(bake: unknown) {
  const catalogue = catalogueLab();
  const interactionsByComponent: Record<string, unknown> = {};
  const emitCapturesByComponent: Record<string, unknown> = {};
  for (const [name, c] of Object.entries(catalogue.components || {})) {
    if (c.interactions) interactionsByComponent[name] = c.interactions;
    if (c.emitCaptures) emitCapturesByComponent[name] = c.emitCaptures;
  }
  const { html } = renderBakedDesignToHtmlDocumentWithReport(bake as never, {
    title: "t",
    singleComponent: "NoteEditor",
    interactiveHost: true,
    interactionsByComponent: interactionsByComponent as never,
    emitCapturesByComponent: emitCapturesByComponent as never,
  });
  const window = new Window({ url: "http://localhost/" });
  const document = window.document;
  document.write(html);
  document.close();
  for (const s of [...document.querySelectorAll("script")]) {
    window.eval(s.textContent || "");
  }
  await new Promise((r) => setTimeout(r, 20));
  return { window, document, html };
}

describe("NoteEditor Done/Cancel host", () => {
  it("Done saves the live typed value (not stale draft kwargs)", async () => {
    const bake = bakeNoteEditor([
      "editing=true",
      "draft=hello typed",
      "committed=Ship EditableText",
      "status=Editing",
    ]);
    const { window, document, html } = await mountInteractive(bake);
    expect(html).toContain("liveEditableInput");
    expect(html).toMatch(/data-pdl-instance-let="Input"/);
    // Nested NoteField should get a session bag even when NoteField is absent from bake.components.
    expect(html).toContain("data-pdl-session-params");

    const section = document.querySelector("section.pdl-preview")!;
    const params = () => {
      const el = section.querySelector(".pdl-preview-params")!;
      const raw =
        el.getAttribute("data-json") ||
        el.querySelector(".pdl-preview-params-line")?.textContent ||
        el.textContent ||
        "{}";
      return JSON.parse(raw);
    };
    const input =
      (document.querySelector(
        "[data-pdl-instance-let=Input] input.pdl-text--editable",
      ) as HTMLInputElement | null) ||
      (document.querySelector(
        "input.pdl-text--editable[data-pdl-instance-let=Input], input.pdl-text--editable",
      ) as HTMLInputElement);

    expect(params().editing).toBe(true);
    input.focus();
    input.value = "NEW NOTE VALUE";
    input.dispatchEvent(new window.Event("input", { bubbles: true }));

    const done = document.querySelector("[data-pdl-instance-let=Done]")!;
    done.dispatchEvent(new window.MouseEvent("mousedown", { button: 0, bubbles: true }));
    done.dispatchEvent(new window.MouseEvent("mouseup", { button: 0, bubbles: true }));
    await new Promise((r) => setTimeout(r, 30));

    const after = params();
    expect(after.editing).toBe(false);
    expect(after.committed).toBe("NEW NOTE VALUE");
    expect(after.draft).toBe("NEW NOTE VALUE");
    expect(after.status).toBe("Saved");
  });

  it("Cancel restores committed and discards typed draft", async () => {
    const bake = bakeNoteEditor([
      "editing=true",
      "draft=hello typed",
      "committed=Ship EditableText",
      "status=Editing",
    ]);
    const { window, document } = await mountInteractive(bake);
    const section = document.querySelector("section.pdl-preview")!;
    const params = () => {
      const el = section.querySelector(".pdl-preview-params")!;
      const raw =
        el.getAttribute("data-json") ||
        el.querySelector(".pdl-preview-params-line")?.textContent ||
        el.textContent ||
        "{}";
      return JSON.parse(raw);
    };
    const input = document.querySelector("input.pdl-text--editable") as HTMLInputElement;
    input.focus();
    input.value = "ABANDON ME";
    input.dispatchEvent(new window.Event("input", { bubbles: true }));

    const cancel = document.querySelector("[data-pdl-instance-let=Cancel]")!;
    cancel.dispatchEvent(new window.MouseEvent("mousedown", { button: 0, bubbles: true }));
    cancel.dispatchEvent(new window.MouseEvent("mouseup", { button: 0, bubbles: true }));
    await new Promise((r) => setTimeout(r, 30));

    const after = params();
    expect(after.editing).toBe(false);
    expect(after.committed).toBe("Ship EditableText");
    expect(after.draft).toBe("Ship EditableText");
    expect(String(after.status)).toMatch(/Cancelled/);
  });
});
